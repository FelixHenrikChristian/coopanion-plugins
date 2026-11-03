import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** All persistent writes stay inside this World's namespace. */
export class Store{
  constructor(dataDir){this.root=join(dataDir,'wardrobe-studio');}
  async read(name,fallback){try{return JSON.parse(await readFile(join(this.root,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
  async write(name,value){
    if(!['profiles.json','lease.json','preferences.json'].includes(name))throw Error('Unknown store file');
    await mkdir(this.root,{recursive:true});const target=join(this.root,name),tmp=join(this.root,`.${name}.${randomUUID()}.tmp`);
    await writeFile(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(tmp,target);
  }
}
