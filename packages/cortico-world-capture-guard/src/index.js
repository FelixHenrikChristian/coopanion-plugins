/* SPDX-License-Identifier: AGPL-3.0-or-later */
import {randomUUID} from 'node:crypto';
import {HOST_ENV,prepareRuntime,readJson,atomicJson} from './runtime.js';
import screenshotKeys from './screenshot-keys.cjs';
export const DEFAULTS=Object.freeze({enabled:false,includeInCapture:false,resetOnStart:true,autoReturnSeconds:0,nvidiaCompatibility:true,screenshotHideSeconds:10,screenshotHotkeys:screenshotKeys.DEFAULT_KEYS});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const alive=pid=>{if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch{return false;}};
export class CaptureGuardWorld{
  id='capture-guard';
  constructor(ctx){
    this.ctx=ctx;this.active=false;this.session=randomUUID();this.problem=null;this.ended=true;
    // All World definitions are constructed before Core starts their windows.
    // This installs only the documented process command override, never patches app files.
    if(ctx.cfg.enabled)this.prepare();
  }
  prepare(){
    if(this.runtime){
      const current=process.env[HOST_ENV];
      if(current!==this.runtime.original&&current!==this.runtime.command)throw Error('桌宠宿主命令已被其他插件接管。');
      process.env[HOST_ENV]=this.runtime.command;
      return;
    }
    const previous=process.env[HOST_ENV];
    this.runtime=prepareRuntime(this.ctx.dataDir,previous);
    process.env[HOST_ENV]=this.runtime.command;
  }
  envPromptVars(){return null;}
  tools(){return[];}
  publish(force=false){
    if(!this.runtime)return;
    const include=this.active&&this.ctx.cfg.includeInCapture===true;
    const seconds=Number(this.ctx.cfg.autoReturnSeconds)||0;
    const captureSignature=JSON.stringify([include,seconds]);
    if(captureSignature!==this.captureSignature){this.captureSignature=captureSignature;this.expiresAt=include&&seconds>0?Date.now()+Math.min(3600,seconds)*1000:null;}
    const nvidiaCompatibility=this.ctx.cfg.nvidiaCompatibility!==false;
    const screenshotHideSeconds=this.ctx.cfg.screenshotHideSeconds??10;
    const screenshotHotkeys=this.ctx.cfg.screenshotHotkeys??screenshotKeys.DEFAULT_KEYS;
    const signature=JSON.stringify([include,seconds,nvidiaCompatibility,screenshotHideSeconds,screenshotHotkeys]);
    if(signature!==this.signature){this.signature=signature;this.requestId=randomUUID();}
    if(include&&this.expiresAt&&this.expiresAt<=Date.now()){
      this.ctx.persist({includeInCapture:false});this.signature=null;return this.publish(true);
    }
    if(!force&&signature===this.lastSignature&&Date.now()-this.lastWrite<1000)return;
    atomicJson(this.runtime.control,{session:this.session,id:this.requestId,ownerPid:process.pid,enabled:this.active,include,expiresAt:this.expiresAt??null,leaseUntil:this.active?Date.now()+5000:0,nvidiaCompatibility,screenshotHideSeconds,screenshotHotkeys});
    this.lastSignature=signature;this.lastWrite=Date.now();
  }
  async start(host){
    this.host=host;
    try{
      this.prepare();this.active=true;this.ended=false;
      if(this.ctx.cfg.resetOnStart!==false&&this.ctx.cfg.includeInCapture)this.ctx.persist({includeInCapture:false});
      this.publish(true);
      this.timer=setInterval(()=>{try{this.publish();}catch(e){this.problem=e.message;host.log?.warn?.('截图隐身配置同步失败：'+e.message);}},150);this.timer.unref();
    }catch(e){this.releaseEnv();throw e;}
  }
  releaseEnv(){if(this.runtime&&process.env[HOST_ENV]===this.runtime.command){if(this.runtime.original===undefined)delete process.env[HOST_ENV];else process.env[HOST_ENV]=this.runtime.original;}}
  async stop(){
    this.active=false;clearInterval(this.timer);this.publish(true);this.releaseEnv();
    this.ended=false;
    for(let i=0;i<15;i++){
      const s=readJson(this.runtime?.status??'');
      if(!s?.running||!alive(s.pid)||s.session!==this.session||(!s.enabled&&s.affinity===0&&!s.error)){this.ended=true;break;}
      await wait(100);
    }
  }
  webUi(language='zh'){
    const zh=language==='zh'||language==='zh-Hant',s=this.runtime?readJson(this.runtime.status):null;
    const connected=!!s?.running&&alive(s.pid)&&s.session===this.session;
    const pending=connected&&s.requestId!==this.requestId;
    const error=this.problem??(connected?s.error:null);
    const hint=error??(!this.active?'插件未启用':!connected?'等待窗口连接；首次启用请完整重启一次 Coopanion':pending?'正在应用配置':s.screenshotHide?(s.temporarilyHidden?'截图中：桌宠暂时隐藏，稍后自动恢复':'NVIDIA 兼容：截图快捷键触发时临时隐藏桌宠'):s.protected?'系统排除：可能阻止 NVIDIA 桌面录制':'允许截取桌宠');
    return{label:zh?'截图隐身':'Capture Guard',lamps:[{label:zh?'截图排除':'Capture exclusion',state:error?'error':!this.active?'offline':connected&&!pending?'online':'loading',hint}],config:[{
      id:'world:capture-guard',owner:'world:capture-guard',schema:{type:'object',title:zh?'截图设置':'Capture settings',properties:{
        'worlds.capture-guard.includeInCapture':{type:'boolean',title:zh?'允许截图包含桌宠':'Include pet in screen captures',description:zh?'默认关闭。需要截取桌宠时打开，完成后关闭；保存后自动生效。':'Off by default. Turn on to capture the pet. Applies after saving.','x-hot':true},
        'worlds.capture-guard.nvidiaCompatibility':{type:'boolean',title:zh?'兼容 NVIDIA 即时重放':'NVIDIA Instant Replay compatibility',description:zh?'默认开启：按截图快捷键时短暂隐藏桌宠，不启用会阻止 NVIDIA 的窗口保护。录屏中平时会显示桌宠。关闭后使用常驻系统排除，可能导致 NVIDIA 停止录制。':'On: briefly hide the pet on screenshot shortcuts, without protected-window flags. The pet normally appears in recordings. Off: system exclusion may stop NVIDIA recording.','x-hot':true},
        'worlds.capture-guard.screenshotHideSeconds':{type:'integer',minimum:1,maximum:120,title:zh?'截图时暂时隐藏（秒）':'Temporarily hide during screenshots (seconds)',description:zh?'仅兼容模式使用，默认 10 秒；按 Esc 或 Enter 会提前恢复。已手动隐藏的桌宠不会被自动显示。':'Compatibility mode only. Default 10 seconds; Escape or Enter restores sooner.','x-hot':true},
        'worlds.capture-guard.screenshotHotkeys':{type:'string',minLength:1,maxLength:512,title:zh?'截图快捷键':'Screenshot shortcuts',description:zh?'逗号分隔。默认包含系统截图、微信/QQ、PixPin、Snipaste 和 NVIDIA 截图常用键；如你修改了截图工具的按键，可在此调整。鼠标点菜单发起的截图不触发临时隐藏。':'Comma-separated shortcuts. Adjust to match your screenshot apps. Starting a capture from an app menu does not trigger hiding.','x-hot':true},
        'worlds.capture-guard.resetOnStart':{type:'boolean',title:zh?'启动时恢复截图隐藏':'Exclude pet when this plugin starts',description:zh?'默认开启。完整启动或重启本插件时，自动关闭“允许截图包含桌宠”。':'Reset inclusion when the plugin starts.','x-hot':true},
        'worlds.capture-guard.autoReturnSeconds':{type:'integer',minimum:0,maximum:3600,title:zh?'允许截取后自动恢复（秒）':'Automatically exclude again after (seconds)',description:zh?'0 表示手动切回；例如填 60，开启允许截取后一分钟自动恢复隐藏。':'0 means manual. For example, 60 excludes again after one minute.','x-hot':true}
      }}
    }]};
  }
  shutdownVerification(){return[{key:'capture-window',label:'截图排除',status:this.ended?'verified-ended':'unknown',detail:this.ended?'已释放窗口排除与宿主命令接管':'窗口恢复尚未确认',manualAction:this.ended?'':'完整退出并重新打开 Coopanion。'}];}
}
export default{id:'capture-guard',label:'截图隐身',defaults:()=>({...DEFAULTS}),create:ctx=>new CaptureGuardWorld(ctx),describe:{tools:[],events:[]}};
