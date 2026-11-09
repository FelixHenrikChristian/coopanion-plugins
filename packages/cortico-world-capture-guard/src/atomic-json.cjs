/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const RETRY_DELAYS=Object.freeze([10,20,40,80,120,160]);
const transient=e=>['EPERM','EACCES','EBUSY'].includes(e?.code);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pauseSync=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);

async function writeJson(file,value,{rename=fs.promises.rename,retryDelays=RETRY_DELAYS,delay=pause}={}){
 const temp=file+'.'+process.pid+'.'+randomUUID()+'.tmp';
 await fs.promises.mkdir(path.dirname(file),{recursive:true});
 try{
  await fs.promises.writeFile(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  for(let attempt=0;;attempt++)try{await rename(temp,file);break;}catch(e){
   if(!transient(e)||attempt>=retryDelays.length)throw e;
   await delay(retryDelays[attempt]);
  }
 }finally{
  // A failed cleanup must not mask the rename error or turn a successful
  // replacement into an apparent sync failure. The previous destination is never removed.
  try{await fs.promises.unlink(temp);}catch{}
 }
}

function writeJsonSync(file,value,{rename=fs.renameSync,retryDelays=RETRY_DELAYS,delay=pauseSync}={}){
 const temp=file+'.'+process.pid+'.'+randomUUID()+'.tmp';
 fs.mkdirSync(path.dirname(file),{recursive:true});
 try{
  fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  for(let attempt=0;;attempt++)try{rename(temp,file);break;}catch(e){
   if(!transient(e)||attempt>=retryDelays.length)throw e;
   delay(retryDelays[attempt]);
  }
 }finally{try{fs.unlinkSync(temp);}catch{}}
}

function createLatestWriter(file,{write=writeJson,onError=()=>{}}={}){
 let queued=null,pending=null;
 function drain(){
  if(pending||queued===null)return;
  const value=queued;queued=null;
  pending=Promise.resolve().then(()=>write(file,value)).catch(e=>{try{onError(e);}catch{}}).finally(()=>{pending=null;drain();});
 }
 return{
  publish(value){queued=value;drain();},
  async flush(){while(pending||queued!==null){drain();await pending;}}
 };
}
module.exports={writeJson,writeJsonSync,createLatestWriter};
