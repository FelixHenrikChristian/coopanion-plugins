import {Bridge,localBase,downloadRelease} from './bridge.js';
import {FIGURE,SCHEMES,PROFILE,DESCRIBE} from './catalog.js';
import release from './release.json' with {type:'json'};
export class LuluWorld{
  id='lulu';
  constructor(ctx){this.ctx=ctx;this.bridge=new Bridge(ctx.cfg.desktopPetUrl);this.controller=new AbortController();this.busy=false;this.active=false;}
  async start(){if(this.controller.signal.aborted)this.controller=new AbortController();this.active=true;}
  async stop(){this.active=false;this.controller.abort();}
  envPromptVars(){return null;}
  tools(){return[];}
  async state(){let current=null,installed=false,error=null;try{installed=(await this.bridge.packs()).some(p=>p.id===FIGURE);current=await this.bridge.skin();}catch(e){error=e.message;}return{installed,current,error,busy:this.busy,schemes:SCHEMES,releaseVersion:release.version};}
  async install(){if(!this.active)throw Error('请先启用噜噜插件');if(this.busy)throw Error('正在安装，请稍候');this.busy=true;try{if((await this.bridge.packs()).some(p=>p.id===FIGURE))return{installed:false,reason:'already-installed'};const bytes=await downloadRelease(release,this.controller.signal);this.controller.signal.throwIfAborted();return await this.bridge.install(bytes,FIGURE,this.controller.signal);}finally{this.busy=false;}}
  async choose(scheme){if(!this.active)throw Error('请先启用噜噜插件');if(!Object.hasOwn(SCHEMES,scheme))throw Error('未知装扮');if(!(await this.bridge.packs()).some(p=>p.id===FIGURE))throw Error('请先安装噜噜角色包');return this.bridge.choose(FIGURE,scheme);}
  webUi(){return{label:'噜噜',panels:[{id:'lulu',title:'噜噜的衣橱'}],invoke:async(panel,method,args=[])=>{if(panel!=='lulu')throw Error('未知面板');if(method==='state')return this.state();if(method==='install')return this.install();if(method==='choose')return this.choose(args[0]);if(method==='profile')return PROFILE;throw Error('未知操作');},config:[{id:'world:lulu',owner:'world:lulu',schema:{type:'object',title:'噜噜',properties:{'worlds.lulu.desktopPetUrl':{type:'string',title:'本机桌宠地址','x-hot':false}}}}]};}
  shutdownVerification(){return[{key:'lulu',label:'Lulu',status:'verified-ended',detail:'Installer stopped; chosen outfit remains selected.'}];}
}
export default{id:'lulu',label:'噜噜',defaults:()=>({enabled:false,desktopPetUrl:'http://127.0.0.1:7797'}),preflight:ctx=>{localBase(ctx.cfg.desktopPetUrl);},create:ctx=>new LuluWorld(ctx),describe:DESCRIBE};
