import {HomeStore} from './storage.js';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {mkdir,open,rename,unlink,link} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const ENVIRONMENT_MAX_LENGTH=8000;
const LEGACY_ENVIRONMENT=`这里是 coo 家园，一处雨夜中的日式街角。便利店和茶房透出温暖的灯光，街道对面是可以生活的小屋与八块菜畦。小屋中可以休息、阅读、用餐、洗漱和使用家具。
家园角色与桌面角色是独立的生活实例。这里的聊天、活动与种植进度单独保存；家园内的动作不会移动或改变桌面角色。交流时可以自然、温暖地回应，也可以根据使用者的意思安排一项家园活动。
八块菜畦起初为空田，每块都可选择现有八种作物。播种后第一次浇水才开始生长，约 30–90 分钟成熟，无需反复看管，不会枯萎。家园暂停时生长暂停，关闭页面后仍会轻量推进。
安排活动前使用 coo_home 查看目录和状态。任务已接受、排队、到达与完成是不同阶段；只有工具确认完成后才描述为已经完成。使用者的手动操作优先。`;
const templatePath=fileURLToPath(new URL('../prompts/HOME_ENVIRONMENT.md',import.meta.url));
export const DEFAULT_ENVIRONMENT=readFileSync(templatePath,'utf8').trim();
export const HOME_PROMPT_KEY='worlds.coo-home.environment';
export const HOME_PROMPT_VARS=Object.freeze([
  {name:'home.activity',description:'家园当前正在进行的活动；不包含桌面动作或家园聊天。'},
  {name:'home.needs',description:'家园的精力、饱腹、整洁和舒适状态。'},
  {name:'home.garden',description:'八块菜畦的作物和生长阶段。',multiline:true},
  {name:'home.inventory',description:'家园背包中已经采收的作物数量。',multiline:true}
]);
export function homePromptDocument(dataDir,language='zh'){
  if(typeof dataDir!=='string'||!dataDir)return null;
  const deploymentPath=join(dataDir,'coo-home','ENVIRONMENT.md'),en=language==='en';
  // Omitting role is intentional: native editing and variable previews work,
  // while Core's main-session prefix ignores this private home document.
  return{key:HOME_PROMPT_KEY,title:en?'Environment prompt':'环境提示词',description:en?'Only used by independent home chat and optional AI plans. Maximum 8000 characters. Changes apply to the next home request.':'仅用于独立家园聊天与可选 AI 计划，不加入桌面主会话。最多 8000 字符；保存后从下一次家园请求生效。',path:existsSync(deploymentPath)?deploymentPath:templatePath,deploymentPath,vars:structuredClone(HOME_PROMPT_VARS)};
}
export function renderHomeTemplate(text,values={}){
  // The documented Cortico template syntax, without expressions or evaluation.
  return text.replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g,(token,key,fallback)=>Object.hasOwn(values,key)?values[key]||fallback?.trim()||'':token);
}
async function writeTemplate(file,text,exclusive=false){
  await mkdir(dirname(file),{recursive:true});const pending=`${file}.tmp-${randomUUID()}`;
  try{
    const handle=await open(pending,'wx');try{await handle.writeFile(text,'utf8');await handle.sync();}finally{await handle.close();}
    if(exclusive){try{await link(pending,file);}catch(error){if(error.code!=='EEXIST')throw error;}}
    else for(let attempt=0;;attempt++){try{await rename(pending,file);break;}catch(error){if(attempt>=4||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;await new Promise(resolve=>setTimeout(resolve,25*2**attempt));}}
  }finally{try{await unlink(pending);}catch(error){if(error.code!=='ENOENT')throw error;}}
}

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
  constructor({dataDir,store,clock=()=>Date.now(),onChange=()=>{},native=!!dataDir&&!store}={}){
    this.store=store??new HomeStore(dataDir,{name:'preferences',limit:64*1024});this.clock=clock;this.onChange=onChange;
    this.nativePath=native?join(dataDir,'coo-home','ENVIRONMENT.md'):null;
    this.migrationStore=native?new HomeStore(dataDir,{name:'preferences-native',limit:1024}):null;
    this.state={version:1,revision:0,text:DEFAULT_ENVIRONMENT,updatedAt:clock()};this.tail=Promise.resolve();this.started=false;this.available=false;this.storageError=null;this.nativeReady=false;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  start(){return this.serial(async()=>{
    if(this.started)return this.snapshot();
    this.nativeReady=false;
    try{
      const saved=await this.store.load(normalizePreferences);
      this.state=saved??{version:1,revision:0,text:DEFAULT_ENVIRONMENT,updatedAt:this.clock()};
      if(this.nativePath){
        const migrated=await this.migrationStore.load(raw=>{if(raw?.version>1)throw error('HOME_SAVE_UNSUPPORTED','家园环境说明来自较新的版本，原文件已保留。');if(raw?.version!==1||raw.migrated!==true)throw Error('Invalid environment migration marker');return{version:1,migrated:true};});
        if(!migrated){if(saved&&saved.text!==LEGACY_ENVIRONMENT&&saved.text!==DEFAULT_ENVIRONMENT)await writeTemplate(this.nativePath,saved.text,true);await this.migrationStore.save({version:1,migrated:true});}
        this.nativeReady=true;this.readNative();
      }else if(!saved)await this.store.save(this.state);
      this.available=true;this.storageError=null;
    }catch{
      this.available=false;this.storageError='家园环境说明暂时无法读取或保存，原文件已保留；独立聊天与 AI 计划暂不可用。';
    }
    this.started=true;return this.snapshot();
  });}
  readNative(){
    if(!this.nativePath)return;
    let text=DEFAULT_ENVIRONMENT;
    try{if(statSync(this.nativePath).size>64*1024)throw Error('Environment template too large');text=textValue(readFileSync(this.nativePath,'utf8').replace(/^\uFEFF/,''));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(text!==this.state.text)this.state={...this.state,text,revision:this.state.revision+1,updatedAt:this.clock()};
  }
  recoverNative(){
    if(!this.nativeReady)return;
    try{this.readNative();this.available=true;this.storageError=null;}catch{this.available=false;this.storageError='家园环境模板无法读取或超过 8000 字符，请在环境提示词页修正后重试；原文件已保留。';}
  }
  snapshot(){if(this.started&&!this.available&&this.nativeReady)this.recoverNative();return{...this.state,defaultText:DEFAULT_ENVIRONMENT,maxLength:ENVIRONMENT_MAX_LENGTH,isDefault:this.state.text===DEFAULT_ENVIRONMENT,storage:{ok:this.available&&!this.storageError,editable:this.available,message:this.storageError}};}
  text(values={}){
    if(this.started&&this.nativeReady)this.recoverNative();
    if(!this.started||!this.available)throw error('HOME_ENV_STORAGE',this.storageError??'请先启用家园。');
    return renderHomeTemplate(this.state.text,values);
  }
  save(input){return this.change(input,false);}
  reset(input){return this.change(input,true);}
  change(input,reset){return this.serial(async()=>{
    if(!this.started||!this.available)throw error('HOME_ENV_STORAGE',this.storageError??'请先启用家园。');
    const keys=reset?['revision']:['text','revision'];
    if(!plain(input)||Object.keys(input).some(key=>!keys.includes(key))||!Number.isSafeInteger(input.revision)||input.revision<0)throw error('HOME_ENV_INPUT','环境说明的保存请求无效。');
    this.readNative();if(input.revision!==this.state.revision)throw error('HOME_ENV_CONFLICT','环境说明已在另一页面更新，请重新载入后再保存。');
    const text=reset?DEFAULT_ENVIRONMENT:textValue(input.text),next={version:1,revision:this.state.revision+1,text,updatedAt:this.clock()};
    try{if(this.nativePath){if(reset){try{await unlink(this.nativePath);}catch(error){if(error.code!=='ENOENT')throw error;}}else await writeTemplate(this.nativePath,text);}else await this.store.save(next);}catch{
      this.storageError='家园环境说明未能保存，当前生效内容保持不变。请检查可用磁盘空间后重试。';this.onChange();throw error('HOME_ENV_STORAGE',this.storageError);
    }
    this.state=next;this.storageError=null;this.onChange();return this.snapshot();
  });}
  async stop(){this.started=false;await this.tail;this.started=false;await this.store.flush?.();}
}
