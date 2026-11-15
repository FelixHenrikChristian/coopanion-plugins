import {HomeStore} from './storage.js';

export const ENVIRONMENT_MAX_LENGTH=8000;
export const DEFAULT_ENVIRONMENT=`这里是 coo 家园，一处雨夜中的日式街角。便利店和茶房透出温暖的灯光，街道对面是可以生活的小屋与八块菜畦。小屋中可以休息、阅读、用餐、洗漱和使用家具。
家园角色与桌面角色是独立的生活实例。这里的聊天、活动与种植进度单独保存；家园内的动作不会移动或改变桌面角色。交流时可以自然、温暖地回应，也可以根据使用者的意思安排一项家园活动。
八块菜畦起初为空田，每块都可选择现有八种作物。播种后第一次浇水才开始生长，约 30–90 分钟成熟，无需反复看管，不会枯萎。家园暂停时生长暂停，关闭页面后仍会轻量推进。
安排活动前使用 coo_home 查看目录和状态。任务已接受、排队、到达与完成是不同阶段；只有工具确认完成后才描述为已经完成。使用者的手动操作优先。`;

const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function error(code,message){return Object.assign(Error(message),{code});}
function textValue(value){
  if(typeof value!=='string'||value.length>ENVIRONMENT_MAX_LENGTH||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||!value.isWellFormed())throw error('HOME_ENV_INPUT',`环境说明需为不超过 ${ENVIRONMENT_MAX_LENGTH} 字符的普通文本。`);
  return value.replace(/\r\n?/g,'\n');
}
export function normalizePreferences(raw){
  if(plain(raw)&&Number.isInteger(raw.version)&&raw.version>1)throw error('HOME_SAVE_UNSUPPORTED','家园环境说明来自较新的版本，原文件已保留。');
  if(!plain(raw)||raw.version!==1||!Number.isSafeInteger(raw.revision)||raw.revision<0||!Number.isFinite(raw.updatedAt)||raw.updatedAt<0)throw Error('Invalid home environment save.');
  let text;try{text=textValue(raw.text);}catch{throw Error('Invalid home environment text.');}
  return{version:1,revision:raw.revision,text,updatedAt:raw.updatedAt};
}

// This document belongs only to the independent home model context. It is
// deliberately not a World role=envPrompt, which would affect the main session.
export class HomePreferences{
  constructor({dataDir,store,clock=()=>Date.now(),onChange=()=>{}}={}){
    this.store=store??new HomeStore(dataDir,{name:'preferences',limit:64*1024});this.clock=clock;this.onChange=onChange;
    this.state={version:1,revision:0,text:DEFAULT_ENVIRONMENT,updatedAt:clock()};this.tail=Promise.resolve();this.started=false;this.available=false;this.storageError=null;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  start(){return this.serial(async()=>{
    if(this.started)return this.snapshot();
    try{
      const saved=await this.store.load(normalizePreferences);
      this.state=saved??{version:1,revision:0,text:DEFAULT_ENVIRONMENT,updatedAt:this.clock()};
      if(!saved)await this.store.save(this.state);
      this.available=true;this.storageError=null;
    }catch{
      this.available=false;this.storageError='家园环境说明暂时无法读取或保存，原文件已保留；独立聊天与 AI 计划暂不可用。';
    }
    this.started=true;return this.snapshot();
  });}
  snapshot(){return{...this.state,defaultText:DEFAULT_ENVIRONMENT,maxLength:ENVIRONMENT_MAX_LENGTH,isDefault:this.state.text===DEFAULT_ENVIRONMENT,storage:{ok:this.available&&!this.storageError,editable:this.available,message:this.storageError}};}
  text(){
    if(!this.started||!this.available)throw error('HOME_ENV_STORAGE',this.storageError??'请先启用家园。');
    return this.state.text;
  }
  save(input){return this.change(input,false);}
  reset(input){return this.change(input,true);}
  change(input,reset){return this.serial(async()=>{
    if(!this.started||!this.available)throw error('HOME_ENV_STORAGE',this.storageError??'请先启用家园。');
    const keys=reset?['revision']:['text','revision'];
    if(!plain(input)||Object.keys(input).some(key=>!keys.includes(key))||!Number.isSafeInteger(input.revision)||input.revision<0)throw error('HOME_ENV_INPUT','环境说明的保存请求无效。');
    if(input.revision!==this.state.revision)throw error('HOME_ENV_CONFLICT','环境说明已在另一页面更新，请重新载入后再保存。');
    const text=reset?DEFAULT_ENVIRONMENT:textValue(input.text),next={version:1,revision:this.state.revision+1,text,updatedAt:this.clock()};
    try{await this.store.save(next);}catch{
      this.storageError='家园环境说明未能保存，当前生效内容保持不变。请检查可用磁盘空间后重试。';this.onChange();throw error('HOME_ENV_STORAGE',this.storageError);
    }
    this.state=next;this.storageError=null;this.onChange();return this.snapshot();
  });}
  async stop(){this.started=false;await this.tail;this.started=false;await this.store.flush?.();}
}
