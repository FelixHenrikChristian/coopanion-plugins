import {AppearanceBridge,disconnected} from './appearance.js';

export const DESCRIBE=Object.freeze({tools:[],events:[]});

export class CooHomeWorld{
  id='coo-home';
  constructor(ctx,{bridgeFactory=options=>new AppearanceBridge(options)}={}){
    this.ctx=ctx;this.bridgeFactory=bridgeFactory;this.bridge=null;
    this.clients=new Set();this.started=false;this.tail=Promise.resolve();
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  start(){return this.serial(async()=>{
    if(this.started)return;
    this.started=true;
    this.bridge=this.bridgeFactory({botDir:this.ctx.botDir,onChange:()=>this.broadcast()});
    try{await this.bridge.start();}catch{
      await this.bridge.stop();this.bridge=null;this.started=false;
      throw Error('The home appearance connection could not start.');
    }
  });}
  stop(){return this.serial(async()=>{
    this.started=false;
    try{await this.bridge?.stop();}finally{
      this.bridge=null;this.broadcast();
      for(const socket of this.clients){try{socket.close('Home World stopped.');}catch{}}
      this.clients.clear();
    }
  });}
  status(){return{phase:'foundation',appearance:this.bridge?.snapshot()??disconnected('家园尚未连接桌宠服务。')};}
  broadcast(){
    const text=JSON.stringify(this.status());
    for(const socket of this.clients){
      if(!socket.open){this.clients.delete(socket);continue;}
      try{socket.send(text);}catch{this.clients.delete(socket);try{socket.close('Home stream unavailable.');}catch{}}
    }
  }
  tools(){return [];}
  envPromptVars(){return null;}
  webUi(language='zh'){
    const zh=language!=='en';
    return{label:zh?'coo家园':'Coo Home',panels:[{id:'home',title:zh?'家园':'Home'}],
      invoke:async(panel,method,args=[])=>{
        if(panel!=='home'||method!=='status'||!Array.isArray(args)||args.length)throw Error('Unsupported home request.');
        return this.status();
      },
      stream:(panel,socket)=>{
        if(panel!=='home'||!this.started){socket.close('Home stream unavailable.');return;}
        this.clients.add(socket);socket.onClose(()=>this.clients.delete(socket));
        try{socket.send(JSON.stringify(this.status()));}catch{this.clients.delete(socket);socket.close('Home stream unavailable.');}
      }
    };
  }
  shutdownVerification(){return[{key:'appearance-watcher',label:'Home appearance watcher',status:this.started?'still-live':'verified-ended',detail:this.started?'Home watcher is active.':'Home watcher and panel streams are closed.',manualAction:this.started?'Disable the Home World.':''}];}
}

export default{id:'coo-home',label:'coo家园',defaults:()=>({enabled:false}),create:ctx=>new CooHomeWorld(ctx),describe:DESCRIBE};
