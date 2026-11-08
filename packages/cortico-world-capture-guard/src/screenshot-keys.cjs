/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const DEFAULT_KEYS='PrintScreen,Win+Shift+S,Ctrl+Alt+A,Alt+A,Ctrl+1,F1,Alt+F1';
const hookTypes=new WeakMap();
const modifiers=new Map([['CTRL','ctrl'],['CONTROL','ctrl'],['ALT','alt'],['SHIFT','shift'],['WIN','win'],['WINDOWS','win'],['META','win']]);
function parseHotkeys(text=DEFAULT_KEYS){
  const results=[];
  for(const raw of String(text).split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)){
    const item={ctrl:false,alt:false,shift:false,win:false,vk:null};
    for(const token of raw.toUpperCase().split('+').map(s=>s.trim())){
      if(modifiers.has(token)){item[modifiers.get(token)]=true;continue;}
      let vk;
      if(/^[A-Z0-9]$/.test(token))vk=token.charCodeAt(0);
      else if(/^F([1-9]|1[0-9]|2[0-4])$/.test(token))vk=111+Number(token.slice(1));
      else if(['PRINTSCREEN','PRTSC','SNAPSHOT'].includes(token))vk=0x2c;
      else throw Error('无法识别截图快捷键：'+raw);
      if(item.vk!==null)throw Error('截图快捷键只能包含一个普通按键：'+raw);
      item.vk=vk;
    }
    if(item.vk===null)throw Error('截图快捷键缺少普通按键：'+raw);
    results.push(item);
  }
  if(!results.length)throw Error('请至少配置一个截图快捷键。');
  if(results.length>32)throw Error('截图快捷键最多支持 32 个。');
  return results;
}
function matches(key,pressed){
  const has=(...keys)=>keys.some(v=>pressed.has(v));
  return key.ctrl===has(0x11,0xa2,0xa3)&&key.alt===has(0x12,0xa4,0xa5)&&key.shift===has(0x10,0xa0,0xa1)&&key.win===has(0x5b,0x5c);
}
function installScreenshotKeys(koffi,keys,onScreenshot,onDone=()=>{}){
  const user32=koffi.load('user32.dll'),kernel32=koffi.load('kernel32.dll');
  let Hook=hookTypes.get(koffi);
  if(!Hook){Hook=koffi.proto('intptr_t __stdcall CaptureGuardKeyboardHook(int code, uintptr_t message, void *data)');hookTypes.set(koffi,Hook);}
  const install=user32.func('SetWindowsHookExW','void *',['int',koffi.pointer(Hook),'void *','uint32_t']);
  const next=user32.func('intptr_t __stdcall CallNextHookEx(void *hook, int code, uintptr_t message, void *data)');
  const remove=user32.func('int __stdcall UnhookWindowsHookEx(void *hook)');
  const keyState=user32.func('int16_t __stdcall GetAsyncKeyState(int vk)');
  const getModule=kernel32.func('void * __stdcall GetModuleHandleW(void *name)');
  const peek=user32.func('int __stdcall PeekMessageW(void *message, void *hwnd, uint32_t min, uint32_t max, uint32_t remove)');
  const pressed=new Set();
  const tracked=new Set([0x10,0x11,0x12,0xa0,0xa1,0xa2,0xa3,0xa4,0xa5,0x5b,0x5c,...keys.map(key=>key.vk)]);
  for(const vk of [0xa0,0xa1,0xa2,0xa3,0xa4,0xa5,0x5b,0x5c])if(keyState(vk)&0x8000)pressed.add(vk);
  let handle=null,closed=false;
  const callback=koffi.register((code,message,data)=>{
    if(code===0&&!closed){
      try{
        const vk=koffi.decode(data,'uint32_t'),kind=Number(message),down=kind===0x100||kind===0x104;
        if(down&&tracked.has(vk)){
          const repeated=pressed.has(vk);pressed.add(vk);
          // Only the configured chords are inspected; no text is retained or emitted.
          if(!repeated&&keys.some(key=>key.vk===vk&&matches(key,pressed)))onScreenshot();
        }else if(down&&(vk===0x1b||vk===0x0d))onDone();
        else if(kind===0x101||kind===0x105)pressed.delete(vk);
      }catch(e){console.warn('[capture-guard] screenshot key:',e.message);}
    }
    // Observe the existing shortcut. Never reserve it, suppress it, or synthesize another key.
    return next(handle,code,message,data);
  },koffi.pointer(Hook));
  try{handle=install(13,callback,getModule(null),0);if(!handle)throw Error('无法监听截图快捷键');}
  catch(e){koffi.unregister(callback);throw e;}
  // Low-level hooks are delivered as sent messages. Pump those without removing
  // any queued Chromium messages, including while Electron's Node loop is idle.
  const message=Buffer.alloc(64),pump=setInterval(()=>peek(message,null,0,0,0),8);pump.unref();
  return()=>{if(closed)return;closed=true;clearInterval(pump);remove(handle);koffi.unregister(callback);pressed.clear();};
}
module.exports={DEFAULT_KEYS,parseHotkeys,matches,installScreenshotKeys};
