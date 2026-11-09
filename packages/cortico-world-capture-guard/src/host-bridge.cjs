/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const fs=require('node:fs');
const {app}=require('electron');
const {DEFAULT_KEYS,parseHotkeys,installScreenshotKeys}=require('./screenshot-keys.cjs');
const {createLatestWriter}=require('./atomic-json.cjs');
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function live(pid){try{process.kill(pid,0);return true;}catch{return false;}}
function desired(c,now=Date.now()){
  const enabled=!!c&&c.enabled===true&&Number.isInteger(c.ownerPid)&&live(c.ownerPid)&&Number.isFinite(c.leaseUntil)&&c.leaseUntil>now;
  const include=enabled&&c.include===true&&(!Number.isFinite(c.expiresAt)||c.expiresAt>now);
  const compatible=c?.nvidiaCompatibility!==false;
  return{enabled,include,compatible,protected:enabled&&!include&&!compatible,screenshotHide:enabled&&!include&&compatible};
}
function attach(win,descriptor,koffi){
  const user32=koffi.load('user32.dll');
  const get=user32.func('int __stdcall GetWindowDisplayAffinity(void *hwnd, void *affinity)');
  const flush=koffi.load('dwmapi.dll').func('int __stdcall DwmFlush()');
  let current=null,stopped=false,stopKeys=null,keySignature=null,hookError=null,lastControl=null;
  let lastStatus=null;
  const statusWriter=createLatestWriter(descriptor.status,{onError:e=>{current=null;console.warn('[capture-guard] status:',e.message);}});
  let restoreTimer=null,temporarilyHidden=false,hideUntil=0,internal=false;
  const originalHide=win.hide,originalShow=win.show,originalShowInactive=win.showInactive;
  const cancelRestore=()=>{clearTimeout(restoreTimer);restoreTimer=null;temporarilyHidden=false;hideUntil=0;};
  // A manual hide/show takes precedence over the temporary screenshot lease.
  const externalHide=function(...args){if(!internal)cancelRestore();return originalHide.apply(win,args);};
  const externalShow=function(...args){if(!internal)cancelRestore();return originalShow.apply(win,args);};
  const externalShowInactive=function(...args){if(!internal)cancelRestore();return originalShowInactive.apply(win,args);};
  win.hide=externalHide;win.show=externalShow;win.showInactive=externalShowInactive;
  function restore(){
    if(!temporarilyHidden)return;
    cancelRestore();
    if(!stopped&&!win.isDestroyed()){
      internal=true;try{originalShowInactive.call(win);if(win.isAlwaysOnTop())win.moveTop();}finally{internal=false;}
      setImmediate(()=>update(true));
    }
  }
  function hideForScreenshot(){
    if(stopped||!desired(lastControl).screenshotHide||win.isDestroyed())return;
    if(!temporarilyHidden&&!win.isVisible())return;
    temporarilyHidden=true;
    const seconds=Math.min(120,Math.max(1,Number(lastControl?.screenshotHideSeconds)||10));
    hideUntil=Date.now()+seconds*1000;
    clearTimeout(restoreTimer);
    internal=true;try{originalHide.call(win);flush();}finally{internal=false;}
    restoreTimer=setTimeout(restore,seconds*1000);restoreTimer.unref();
    setImmediate(()=>update(true));
  }
  function done(){if(temporarilyHidden){clearTimeout(restoreTimer);restoreTimer=setTimeout(restore,250);restoreTimer.unref();}}
  function affinity(){const b=win.getNativeWindowHandle(),out=Buffer.alloc(4);if(!get(b.length===8?b.readBigUInt64LE():b.readUInt32LE(),out))throw Error('Windows 未返回截图排除状态');return out.readUInt32LE();}
  function update(force=false){
    if(stopped||win.isDestroyed())return;
    const c=read(descriptor.control)??lastControl,want=desired(c);lastControl=c;
    const keys=c?.screenshotHotkeys??DEFAULT_KEYS;
    const wantedKeys=want.screenshotHide?keys:null;
    if(wantedKeys!==keySignature){
      stopKeys?.();stopKeys=null;hookError=null;keySignature=wantedKeys;
      if(wantedKeys!==null)try{stopKeys=installScreenshotKeys(koffi,parseHotkeys(wantedKeys),hideForScreenshot,done);}catch(e){hookError=e.message;}
    }
    if(!want.screenshotHide&&temporarilyHidden)restore();
    const key=JSON.stringify([want,c?.id,temporarilyHidden,hookError]);
    if(!force&&key===current)return;
    let value=null,error=hookError;
    try{win.setContentProtection(want.protected);value=affinity();if(value!==(want.protected?0x11:0))throw Error('Windows 截图排除设置未生效 ('+value+')');}
    catch(e){error=e.message;}
    lastStatus={pid:process.pid,ownerPid:c?.ownerPid,session:c?.session,requestId:c?.id,running:true,...want,temporarilyHidden,hideUntil,shortcutListener:!!stopKeys,affinity:value,error,updatedAt:Date.now()};
    statusWriter.publish(lastStatus);
    current=key;
  }
  update(true);
  const onShow=()=>update(true);
  win.on('ready-to-show',onShow);win.on('show',onShow);
  const timer=setInterval(()=>update(),100);timer.unref();
  function close(){
    if(stopped)return;
    restore();stopped=true;clearInterval(timer);cancelRestore();stopKeys?.();stopKeys=null;
    win.removeListener('ready-to-show',onShow);win.removeListener('show',onShow);
    if(win.hide===externalHide)win.hide=originalHide;
    if(win.show===externalShow)win.show=originalShow;
    if(win.showInactive===externalShowInactive)win.showInactive=originalShowInactive;
    if(!win.isDestroyed())try{win.setContentProtection(false);}catch{}
    if(lastStatus)statusWriter.publish({...lastStatus,running:false,enabled:false,protected:false,shortcutListener:false,affinity:0,updatedAt:Date.now()});
  }
  win.once('closed',close);app.once('will-quit',close);
  return{update,close,hideForScreenshot};
}
module.exports={attach,desired};
