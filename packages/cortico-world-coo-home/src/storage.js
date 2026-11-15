import {mkdir,readFile,copyFile,rename,open,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const LIMIT=1024*1024;
function saveError(code,message){const error=Error(message);error.code=code;return error;}
async function replace(source,target){
  for(let attempt=0;;attempt++){
    try{return await rename(source,target);}catch(error){
      if(attempt>=4||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;
      await new Promise(resolve=>setTimeout(resolve,25*2**attempt));
    }
  }
}
export class HomeStore{
  constructor(dataDir,{name='state',limit=LIMIT}={}){
    if(typeof dataDir!=='string'||!dataDir)throw Error('Home storage requires a deployment data directory.');
    if(!/^[a-z][a-z-]{0,24}$/.test(name)||!Number.isInteger(limit)||limit<1024||limit>8*LIMIT)throw Error('Invalid home store options.');
    this.name=name;this.limit=limit;this.directory=join(resolve(dataDir),'coo-home');this.tail=Promise.resolve();this.recovery='new';this.blocked=null;
  }
  async load(validate){
    this.blocked=null;let chosen=null,invalid=false;
    for(const [name,recovery] of [[`${this.name}.json`,'normal'],[`${this.name}.pending.json`,'pending'],[`${this.name}.backup.json`,'backup']]){
      try{
        const file=join(this.directory,name);if((await stat(file)).size>this.limit)throw saveError('HOME_SAVE_LIMIT','家园存档超出当前版本可读取的大小。进度文件已保留，请使用兼容版本恢复。');
        const raw=JSON.parse(await readFile(file,'utf8')),state=validate(raw);
        // Inspect every candidate before choosing one: a newer interrupted
        // write or backup must not be overwritten by a downgraded plugin.
        chosen??={state,recovery:raw.version===state.version?recovery:'migrated'};
      }catch(error){
        if(error.code==='ENOENT')continue;
        if(['HOME_SAVE_UNSUPPORTED','HOME_SAVE_LIMIT'].includes(error.code)){this.blocked=error;throw error;}
        if(error.code){this.blocked=saveError('HOME_SAVE_UNAVAILABLE','暂时无法读取家园存档。请检查文件访问权限；进度文件已保留。');throw this.blocked;}
        invalid=true;
      }
    }
    if(chosen){this.recovery=chosen.recovery;return chosen.state;}
    if(invalid){this.blocked=saveError('HOME_SAVE_CORRUPT','家园存档与恢复副本均无法读取。进度文件已保留，请先恢复有效备份后再启用家园。');throw this.blocked;}
    this.recovery='new';
    return null;
  }
  save(value){
    if(this.blocked)return Promise.reject(this.blocked);
    const encoded=JSON.stringify(value);if(Buffer.byteLength(encoded)>this.limit)return Promise.reject(Error('Home save is too large.'));
    const action=async()=>{
      if(this.blocked)throw this.blocked;
      await mkdir(this.directory,{recursive:true});
      const temporary=join(this.directory,`${this.name}.pending.json`),file=join(this.directory,`${this.name}.json`),backup=join(this.directory,`${this.name}.backup.json`);
      const handle=await open(temporary,'w');try{await handle.writeFile(encoded);await handle.sync();}finally{await handle.close();}
      // Keep the previous committed save available if an interrupted replace
      // leaves an incomplete primary. The pending file is already fsynced.
      try{await copyFile(file,backup);}catch(error){if(error.code!=='ENOENT')throw error;}
      await replace(temporary,file);this.recovery='normal';
    };
    const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;
  }
  async flush(){await this.tail;}
}
