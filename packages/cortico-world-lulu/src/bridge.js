import {createHash} from 'node:crypto';
export function localBase(raw){
  const u=new URL(raw);
  if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('桌宠地址必须是本机 HTTP 根地址');
  return u.origin;
}
export class Bridge{
  constructor(base,{fetcher=fetch}={}){this.base=localBase(base);this.fetcher=fetcher;}
  async request(path,{body,type='application/json',signal}={}){
    const response=await this.fetcher(this.base+path,{method:body===undefined?'GET':'POST',body:body===undefined?undefined:type==='application/json'?JSON.stringify(body):body,headers:body===undefined?{}:{'Content-Type':type},redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)});
    if(!response.ok)throw Error(`桌宠接口错误 ${response.status}`);
    const text=await response.text();if(text.length>4*1024*1024)throw Error('桌宠返回数据过大');
    const value=JSON.parse(text);if(value?.ok===false)throw Error(value.error??'桌宠拒绝了操作');return value;
  }
  async packs(){const list=await this.request('/api/figures');if(!Array.isArray(list))throw Error('形象列表格式错误');return list;}
  async skin(){const state=await this.request('/api/state');if(!state.skin)throw Error('未找到当前形象');return state.skin;}
  async choose(figure,scheme){const current=await this.skin();await this.request('/api/skin',{body:{skin:{...current,figure,scheme}}});const actual=await this.skin();if(actual.figure!==figure||actual.scheme!==scheme)throw Error('形象切换未能确认');return actual;}
  async install(bytes,figure,signal){
    if((await this.packs()).some(p=>p.id===figure))return{installed:false,reason:'already-installed'};
    const stage=await this.request('/api/figures/import',{body:bytes,type:'application/zip',signal});
    const pack=stage.packs?.find(p=>p.id===figure);
    if(!pack||pack.installed||stage.problems?.length)throw Error('角色包预检未通过；未覆盖任何现有角色');
    if(typeof stage.token!=='string'||typeof pack.dir!=='string')throw Error('角色包预检结果无效');
    signal?.throwIfAborted();
    await this.request('/api/figures/import/install',{body:{token:stage.token,dirs:[pack.dir],replace:[]},signal});
    if(!(await this.packs()).some(p=>p.id===figure))throw Error('角色包安装未能确认');return{installed:true};
  }
}
const RELEASE_ROOT='https://github.com/FelixHenrikChristian/coopanion-plugins/releases/download/';
function allowedDownload(raw,initial=false){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('无效的角色包下载地址');if(initial?!u.href.startsWith(RELEASE_ROOT):!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname))throw Error('角色包下载来源不受支持');return u;}
export async function downloadRelease(meta,signal,fetcher=fetch){
  if(!meta.url||!/^[a-f0-9]{64}$/.test(meta.sha256??'')||!Number.isSafeInteger(meta.bytes)||meta.bytes<=0||meta.bytes>384*1024*1024)throw Error('此版本尚未附带经过验收的角色包');
  let url=allowedDownload(meta.url,true),response;
  for(let i=0;i<6;i++){
    response=await fetcher(url,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(180000)])});
    if(![301,302,303,307,308].includes(response.status))break;
    const next=response.headers.get('location');await response.body?.cancel();if(!next)throw Error('下载重定向无效');url=allowedDownload(new URL(next,url));
  }
  if(!response?.ok||!response.body)throw Error(`角色包下载失败 ${response?.status}`);
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.byteLength;if(size>meta.bytes)throw Error('角色包大小超出记录');chunks.push(Buffer.from(chunk));}
  const bytes=Buffer.concat(chunks);
  if(size!==meta.bytes||createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('角色包校验失败；未安装');
  return bytes;
}
