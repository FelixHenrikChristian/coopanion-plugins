import {validateAgainstPack} from './profile.js';
export function localBase(raw){
  const u=new URL(raw);
  if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Desktop pet address must be a loopback HTTP origin');
  return u.origin;
}
export class PetBridge{
  constructor(base){this.base=localBase(base);}
  async request(path,body){
    const response=await fetch(this.base+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(2500),redirect:'error'});
    if(!response.ok)throw Error(`Desktop pet HTTP ${response.status}`);
    const text=await response.text();if(text.length>4*1024*1024)throw Error('Desktop pet response too large');return JSON.parse(text);
  }
  async packs(){const packs=await this.request('/api/figures');if(!Array.isArray(packs))throw Error('Invalid figure list');return packs;}
  async skin(){const r=await this.request('/api/state');if(!r.skin||typeof r.skin.figure!=='string'||typeof r.skin.scheme!=='string')throw Error('Invalid desktop appearance');return r.skin;}
  async set(skin){const r=await this.request('/api/skin',{skin});if(r.ok===false)throw Error('Desktop pet rejected appearance');}
  async validate(profile){validateAgainstPack(profile,(await this.packs()).find(p=>p.id===profile.figure));}
}
const appearance=s=>({figure:s.figure,scheme:s.scheme});
const same=(a,b)=>a?.figure===b?.figure&&a?.scheme===b?.scheme;
/** A write-ahead lease restores only the appearance still owned by this World. */
export class AppearanceLease{
  constructor(bridge,store){this.bridge=bridge;this.store=store;}
  async apply(figure,scheme){
    const current=await this.bridge.skin();let lease=await this.store.read('lease.json',null);
    if(!lease||(!same(current,lease.applied)&&!same(current,lease.pending)))lease={before:appearance(current),applied:appearance(current)};
    if(same(current,{figure,scheme}))return{changed:false,...appearance(current)};
    lease.pending={figure,scheme};await this.store.write('lease.json',lease);
    await this.bridge.set({...current,figure,scheme});
    const after=await this.bridge.skin();
    if(!same(after,lease.pending))throw Error('Appearance changed elsewhere before verification');
    lease.applied=lease.pending;delete lease.pending;await this.store.write('lease.json',lease);
    return{changed:true,...appearance(after)};
  }
  async restore(){
    const lease=await this.store.read('lease.json',null);if(!lease)return{status:'unchanged'};
    const current=await this.bridge.skin();
    if(!same(current,lease.applied)&&!same(current,lease.pending)){
      await this.store.write('lease.json',null);return{status:'external-change-preserved'};
    }
    if(!same(current,lease.before)){
      const pack=(await this.bridge.packs()).find(p=>p.id===lease.before.figure);
      if(!pack)throw Error('Previous figure is missing; restore it before clearing the appearance lease');
      await this.bridge.set({...current,...lease.before});
      if(!same(await this.bridge.skin(),lease.before))throw Error('Appearance restoration could not be verified');
    }
    await this.store.write('lease.json',null);return{status:'restored',...lease.before};
  }
}
