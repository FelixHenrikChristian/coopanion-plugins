import {readFile,writeFile,rename,realpath,unlink,mkdir} from 'node:fs/promises';
import {join,dirname,basename,isAbsolute} from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {NativeFeed} from './native-feed.js';
export const SUPPORTED_DRESS_SHA256='b594171051e90e4f368c635b4fd008405f6e41e6dfd3dbd907fdbffa767fbe9f';
export const SUPPORTED_DRESS_SHA256S=Object.freeze([SUPPORTED_DRESS_SHA256,'87919223e6d26bdbcfc8bff7f1f51e5c5f52b51ceafd45a72b4f0f5b780b30af']);
const hash=data=>createHash('sha256').update(data).digest('hex');
const MAIN='dress.js',FILES=['wardrobe-studio-controls.js','wardrobe-studio-profile.js','wardrobe-studio-native.js'];
const readMaybe=async file=>{try{return await readFile(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
async function atomic(file,bytes){const tmp=file+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,bytes,{flag:'wx',mode:0o600});await rename(tmp,file);}finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
export function patchDress(source){
  const edits=[
    ["import { ICONS, themeButton } from './ui.js';","import { ICONS, themeButton } from './ui.js';\nimport {nativeWardrobe as wardrobe} from './wardrobe-studio-native.js';"],
    ['  const picks = picksOf(pack, skin.scheme);','  if (wardrobe.render({pack,skin,after:box,apply,language:language()})) return;\n  const picks = picksOf(pack, skin.scheme);'],
    ['void ready.then(() => { connect(); apply(skin, false); });',"wardrobe.onChange(() => render());\nvoid ready.then(() => { connect(); apply(skin, false); });"]
  ];
  for(const [before,after] of edits){if(source.split(before).length!==2)throw Error('Unsupported native wardrobe source anchors');source=source.replace(before,after);}return source;
}
/** Explicit opt-in compatibility adapter, not an official World API hook. */
export class NativeAdapter{
  constructor({webDir,store,origin,port=17891,snapshot}){this.webDir=webDir;this.store=store;this.origin=origin;this.port=port;this.snapshot=snapshot;this.status={state:'off'};}
  async readRecord(){const bytes=await readMaybe(join(this.store.root,'native-adapter.json'));return bytes?JSON.parse(bytes):null;}
  async saveRecord(record){await mkdir(this.store.root,{recursive:true});await atomic(join(this.store.root,'native-adapter.json'),JSON.stringify(record,null,2)+'\n');}
  async archiveRecord(record){
    const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n'),directory=join(this.store.root,'native-adapter-history');await mkdir(directory,{recursive:true});
    const filename=join(directory,hash(bytes)+'.json');
    try{await writeFile(filename,bytes,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST'||hash(await readFile(filename))!==hash(bytes))throw error;}
  }
  verifyOriginal(bytes){if(!SUPPORTED_DRESS_SHA256S.includes(hash(bytes)))throw Error('Unsupported dress.js checksum; native integration left off');}
  async start(){
    if(!isAbsolute(this.webDir))throw Error('Native web directory must be an explicit absolute path');
    const web=await realpath(this.webDir),meta=JSON.parse(await readFile(join(dirname(web),'package.json'),'utf8'));
    if(basename(web)!=='web'||meta.name!=='cortico-world-desktop-pet'||meta.version!=='0.2.0')throw Error('Unsupported desktop-pet package; native integration left off');
    this.web=web;let record=await this.readRecord();
    if(record){if(record.web!==web)throw Error('Restore the previous native adapter before changing its directory');await this.restoreFiles(record);}
    const original=await readFile(join(web,MAIN));this.verifyOriginal(original);
    const token=record?.token??randomBytes(32).toString('hex');
    this.feed=new NativeFeed({origin:this.origin,token,port:this.port,snapshot:this.snapshot});await this.feed.start();
    try{
      const controls=(await readFile(new URL('../web/native-controls.js',import.meta.url),'utf8')).replace("'./profile.js'","'./wardrobe-studio-profile.js'");
      const client=(await readFile(new URL('../web/native-client.js',import.meta.url),'utf8')).replace("'./native-controls.js'","'./wardrobe-studio-controls.js'").replace('__WARDROBE_SOCKET__',`ws://127.0.0.1:${this.feed.port}/wardrobe-view?key=${token}`);
      const payloads={[MAIN]:Buffer.from(patchDress(original.toString('utf8'))),[FILES[0]]:Buffer.from(controls),[FILES[1]]:await readFile(new URL('./profile.js',import.meta.url)),[FILES[2]]:Buffer.from(client)};
      for(const name of FILES)if(await readMaybe(join(web,name)))throw Error('Native adapter helper filename already exists');
      record={contract:1,web,token,original:original.toString('base64'),originalHash:hash(original),patchedHash:hash(payloads[MAIN]),files:Object.fromEntries(FILES.map(name=>[name,hash(payloads[name])]))};
      // Write-ahead recovery record precedes every application-file mutation.
      await this.saveRecord(record);
      for(const name of FILES)await atomic(join(web,name),payloads[name]);
      if(hash(await readFile(join(web,MAIN)))!==record.originalHash)throw Error('Native page changed during installation');
      await atomic(join(web,MAIN),payloads[MAIN]);this.status={state:'active',compatibility:'desktop-pet 0.2.0 / verified dress.js',hostHash:record.originalHash,port:this.feed.port};
    }catch(error){await this.feed.stop();if(record)await this.restoreFiles(record);throw error;}
  }
  async restoreFiles(record){
    if(record.web!==await realpath(this.webDir)||record.contract!==1||hash(Buffer.from(record.original,'base64'))!==record.originalHash)throw Error('Invalid native adapter backup');
    this.verifyOriginal(Buffer.from(record.original,'base64'));
    const file=join(record.web,MAIN),current=await readFile(file),currentHash=hash(current);
    let hostUpdated=false;
    if(currentHash!==record.patchedHash&&currentHash!==record.originalHash){
      try{this.verifyOriginal(current);hostUpdated=true;}catch{throw Error('Native page changed externally; automatic rollback refused');}
    }
    const helpers=[];
    for(const name of FILES){const bytes=await readMaybe(join(record.web,name));if(bytes&&hash(bytes)!==record.files[name])throw Error('Native helper changed externally; automatic deletion refused');if(bytes)helpers.push(name);}
    if(hostUpdated)await this.archiveRecord(record);
    if(currentHash===record.patchedHash)await atomic(file,Buffer.from(record.original,'base64'));
    for(const name of helpers)await unlink(join(record.web,name));
    return{hostUpdated};
  }
  async stop(){await this.feed?.stop();const record=await this.readRecord();if(record)await this.restoreFiles(record);this.status={state:'off',restored:true};}
  broadcast(){this.feed?.broadcast();}
}
