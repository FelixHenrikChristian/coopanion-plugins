import {Store} from './store.js';
import {PetBridge,AppearanceLease,localBase} from './bridge.js';
import {validateProfile,validateAgainstPack,outfitOf,selectVariant} from './profile.js';
import {authoringGuide} from './guide.js';
import {TOOL_SPECS,DESCRIBE} from './tools.js';
import profileExample from '../examples/lulu.profile.json' with {type:'json'};
import profileSchema from '../docs/wardrobe-profile.schema.json' with {type:'json'};
export const DEFAULTS=Object.freeze({enabled:false,desktopPetUrl:'http://127.0.0.1:7797'});
const appearance=s=>({figure:s.figure,scheme:s.scheme});
export class WardrobeWorld{
  id='wardrobe-studio';
  constructor(ctx){this.ctx=ctx;this.store=new Store(ctx.dataDir);this.bridge=new PetBridge(ctx.cfg.desktopPetUrl);this.lease=new AppearanceLease(this.bridge,this.store);this.profiles=[];this.language='zh';this.tail=Promise.resolve();this.started=false;this.error=null;this.restoration=null;}
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  async start(host){
    this.host=host;this.profiles=(await this.store.read('profiles.json',[])).map(validateProfile);this.language=(await this.store.read('preferences.json',{}))?.language==='en'?'en':'zh';this.started=true;
    try{this.restoration=await this.lease.restore();}catch(e){this.error=String(e.message);}
  }
  async stop(){
    this.started=false;
    await this.serial(async()=>{try{this.restoration=await this.lease.restore();this.error=null;}catch(e){this.error=String(e.message);this.host?.log?.warn?.('Wardrobe appearance restoration requires attention');}});
  }
  envPromptVars(){return null;}
  tools(){return TOOL_SPECS.map(spec=>({...spec,handler:async args=>{
    try{let value;
      if(spec.name==='wardrobe_list')value=await this.state();
      if(spec.name==='wardrobe_choose')value=await this.choose(args);
      if(spec.name==='wardrobe_restore')value=await this.restore();
      if(spec.name==='wardrobe_authoring_guide')value=authoringGuide(args.stage??'all',this.language);
      return{text:JSON.stringify(value)};
    }catch(e){return{text:String(e.message),failed:true};}
  }}));}
  async state(){
    let packs=[],current=null,connectionError=null;
    try{packs=(await this.bridge.packs()).filter(p=>p.id!=='coo').map(p=>({id:p.id,name:p.name,axes:p.axes,presets:p.presets??[]}));current=appearance(await this.bridge.skin());}catch(e){connectionError=String(e.message);}
    return{profiles:this.profiles,packs,current,desktopPetUrl:this.bridge.base,connected:!connectionError,error:connectionError??this.error,lease:await this.store.read('lease.json',null),restoration:this.restoration};
  }
  async importProfile(raw){return this.serial(async()=>{
    if(!this.started)throw Error('Wardrobe World is not active');
    const profile=validateProfile(raw);await this.bridge.validate(profile);
    const next=this.profiles.filter(p=>p.id!==profile.id);next.push(profile);await this.store.write('profiles.json',next);this.profiles=next;return profile;
  });}
  async checkProfile(raw){
    const p=validateProfile(raw);await this.bridge.validate(p);
    return{valid:true,id:p.id,figure:p.figure,outfits:p.outfits.length,variants:p.outfits.reduce((n,o)=>n+o.variants.length,0),scope:'structure-and-installed-ids-only'};
  }
  async setLanguage(language){return this.serial(async()=>{
    if(!this.started)throw Error('Wardrobe World is not active');
    if(!['zh','en'].includes(language))throw Error('Unsupported wardrobe language');
    await this.store.write('preferences.json',{language});this.language=language;return{language};
  });}
  async removeProfile(id){return this.serial(async()=>{
    if(!this.started)throw Error('Wardrobe World is not active');
    const next=this.profiles.filter(p=>p.id!==id);await this.store.write('profiles.json',next);this.profiles=next;return{removed:id};
  });}
  async choose({profile:id,outfit,pick={}}){return this.serial(async()=>{
    if(!this.started)throw Error('Wardrobe World is not active');
    if(this.error)throw Error('Restore the previous appearance before applying another choice: '+this.error);
    const profile=this.profiles.find(p=>p.id===id);if(!profile)throw Error('Unknown local wardrobe profile');
    const variant=selectVariant(outfitOf(profile,outfit),pick);
    validateAgainstPack(profile,(await this.bridge.packs()).find(p=>p.id===profile.figure));
    return{...await this.lease.apply(profile.figure,variant.scheme),profile:id,outfit,pick:variant.pick};
  });}
  async restore(){return this.serial(async()=>{const result=await this.lease.restore();this.error=null;this.restoration=result;return result;});}
  async thumbnail({profile:id,outfit,pick={}}){
    const profile=this.profiles.find(p=>p.id===id);if(!profile)throw Error('Unknown local wardrobe profile');
    const variant=selectVariant(outfitOf(profile,outfit),pick),pack=(await this.bridge.packs()).find(p=>p.id===profile.figure);
    validateAgainstPack(profile,pack);return this.bridge.thumbnail(pack,variant.scheme);
  }
  webUi(language='zh'){
    const zh=this.language!=='en';
    return{label:zh?'装扮工作室':'Wardrobe Studio',panels:[{id:'wardrobe',title:zh?'衣橱':'Wardrobe'},{id:'guide',title:zh?'角色制作指导':'Authoring guide'}],
      lamps:[{label:zh?'外观恢复':'Appearance restoration',state:this.error?'error':'online',hint:this.error??(zh?'角色包文件保持不变':'Figure pack files remain unchanged')}],
      invoke:async(panel,method,args)=>{
        if((panel==='guide'||panel==='wardrobe')&&method==='locale')return{language:this.language};
        if((panel==='guide'||panel==='wardrobe')&&method==='setLanguage')return this.setLanguage(args[0]);
        if((panel==='guide'||panel==='wardrobe')&&method==='read')return authoringGuide(args[0]??'all',['zh','en'].includes(args[1])?args[1]:this.language);
        if((panel==='guide'||panel==='wardrobe')&&method==='example')return profileExample;
        if((panel==='guide'||panel==='wardrobe')&&method==='schema')return profileSchema;
        if(panel==='guide'&&method==='catalog'){const s=await this.state();return{connected:s.connected,error:s.error,current:s.current,packs:s.packs};}
        if(panel!=='wardrobe')throw Error('Unknown panel');
        if(method==='state')return this.state();
        if(method==='import')return this.importProfile(args[0]);
        if(method==='check')return this.checkProfile(args[0]);
        if(method==='remove')return this.removeProfile(args[0]);
        if(method==='choose')return this.choose(args[0]);
        if(method==='thumbnail')return this.thumbnail(args[0]);
        if(method==='restore')return this.restore();
        throw Error('Unknown wardrobe method');
      },
      config:[{id:'world:wardrobe-studio',owner:'world:wardrobe-studio',schema:{type:'object',title:zh?'本机桌宠':'Local desktop pet',properties:{'worlds.wardrobe-studio.desktopPetUrl':{type:'string',title:zh?'本机桌宠地址':'Local desktop pet address',description:zh?'修改后重启此 World。只接受本机 HTTP 地址。':'Restart this World after changing the loopback HTTP origin.','x-hot':false}}}}]
    };
  }
  shutdownVerification(){return[{key:'appearance',label:'Wardrobe appearance',status:this.error?'unknown':'verified-ended',detail:this.error??this.restoration?.status??'unchanged',manualAction:this.error?'Enable Wardrobe Studio and use Restore after the desktop pet is available.':''}];}
}
export default {id:'wardrobe-studio',label:'Wardrobe Studio',defaults:()=>({...DEFAULTS}),preflight:ctx=>{localBase(ctx.cfg.desktopPetUrl);},create:ctx=>new WardrobeWorld(ctx),describe:DESCRIBE};
