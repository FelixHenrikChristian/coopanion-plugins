/* SPDX-License-Identifier: AGPL-3.0-or-later */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const HOST_ENV='CORTICO_DESKTOP_PET_HOST';
export function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
export function atomicJson(file,value){
  const temp=file+'.'+process.pid+'.'+randomUUID()+'.tmp';
  fs.mkdirSync(path.dirname(file),{recursive:true});
  try{fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);}
  finally{try{fs.unlinkSync(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
function linkRuntimeFile(from,to){
  fs.mkdirSync(path.dirname(to),{recursive:true});
  const src=fs.statSync(from),dst=fs.existsSync(to)?fs.statSync(to):null;
  if(dst&&src.size===dst.size&&src.mtimeMs===dst.mtimeMs)return;
  if(dst)fs.unlinkSync(to);
  try{fs.linkSync(from,to);}catch(e){if(!['EXDEV','EPERM','EACCES','ENOTSUP'].includes(e.code))throw e;fs.copyFileSync(from,to);fs.utimesSync(to,src.atime,src.mtime);}
}
export function prepareRuntime(dataDir,original){
  if(process.platform!=='win32')throw Error('截图隐身目前仅支持 Windows。');
  let argv;try{argv=JSON.parse(original);}catch{throw Error('未找到 Coopanion 提供的桌宠窗口宿主。');}
  if(!Array.isArray(argv)||!argv.length||argv.some(s=>typeof s!=='string'))throw Error('桌宠窗口命令无效。');
  const program=path.dirname(argv[0]),appRoot=path.join(program,'resources','app');
  const meta=readJson(path.join(appRoot,'package.json'));
  if(meta?.name!=='coopanion'||!argv.includes('--pet-host'))throw Error('当前版本只支持 Coopanion 自带的 Windows 窗口宿主。');
  const hostFile=path.join(appRoot,'node_modules','cortico-world-desktop-pet','host','electron-main.cjs');
  if(!fs.existsSync(hostFile))throw Error('找不到桌宠窗口模块。');
  const dir=path.resolve(dataDir,'capture-guard'),runtime=path.join(dir,'runtime');
  const ownApp=path.join(runtime,'resources','app');
  fs.mkdirSync(ownApp,{recursive:true});
  // Runtime binaries are linked read-only by convention, never edited. All app/renderer source stays untouched.
  for(const e of fs.readdirSync(program,{withFileTypes:true})){
    if(e.isFile()&&(e.name===path.basename(argv[0])||/\.(dll|bin|dat|pak|json)$/i.test(e.name)))linkRuntimeFile(path.join(program,e.name),path.join(runtime,e.name));
  }
  for(const e of fs.readdirSync(path.join(program,'locales'),{withFileTypes:true})){
    if(e.isFile()&&e.name.endsWith('.pak'))linkRuntimeFile(path.join(program,'locales',e.name),path.join(runtime,'locales',e.name));
  }
  for(const name of ['window-main.cjs','host-bridge.cjs','screenshot-keys.cjs']){
    fs.copyFileSync(fileURLToPath(new URL('./'+name,import.meta.url)),path.join(ownApp,name));
  }
  atomicJson(path.join(ownApp,'package.json'),{name:'coopanion-capture-guard-host',version:'1.1.0',main:'window-main.cjs',productName:'Coopanion'});
  const control=path.join(dir,'control.json'),status=path.join(dir,'status.json');
  atomicJson(path.join(dir,'host.json'),{hostFile,appRoot,profile:path.join(dir,'profile'),control,status});
  const args=argv.slice(1).filter(a=>a!=='--pet-host');
  return{dir,control,status,original,command:JSON.stringify([path.join(runtime,path.basename(argv[0])),...args,'--capture-host='+path.join(dir,'host.json')])};
}
