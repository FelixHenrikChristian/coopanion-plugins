/** A profile groups existing schemes. It never changes a figure manifest. */
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function need(ok,message){if(!ok)throw new Error(message);}
function id(v){need(typeof v==='string'&&ID.test(v),'Invalid identifier');return v;}
function label(v){need(typeof v==='string'&&v.trim().length>0&&v.length<=120,'Invalid label');return v.trim();}
function unique(items,key){need(new Set(items.map(key)).size===items.length,'Duplicate identifier');}
export function validateProfile(input){
  need(plain(input)&&input.schema===1,'Expected wardrobe profile schema 1');
  need(new TextEncoder().encode(JSON.stringify(input)).byteLength<=65536,'Profile exceeds 64 KiB');
  const p={schema:1,id:id(input.id),figure:id(input.figure),label:label(input.label),outfits:[]};
  need(p.figure!=='coo','Coo uses its own accessory contract; use its native wardrobe');
  need(Array.isArray(input.outfits)&&input.outfits.length>0&&input.outfits.length<=32,'Expected 1–32 outfits');
  for(const raw of input.outfits){
    need(plain(raw),'Invalid outfit');
    const o={id:id(raw.id),label:label(raw.label),controls:[],variants:[]};
    need(Array.isArray(raw.controls)&&raw.controls.length<=12,'Expected up to 12 controls');
    for(const rawControl of raw.controls){
      need(plain(rawControl),'Invalid control');
      const c={id:id(rawControl.id),label:label(rawControl.label),options:[]};
      need(Array.isArray(rawControl.options)&&rawControl.options.length>0&&rawControl.options.length<=24,'Expected 1–24 options');
      c.options=rawControl.options.map(v=>({id:id(v.id),label:label(v.label)}));unique(c.options,x=>x.id);
      c.default=rawControl.default??c.options[0].id;
      need(c.options.some(v=>v.id===c.default),'Unknown default option');
      o.controls.push(c);
    }
    unique(o.controls,x=>x.id);
    need(Array.isArray(raw.variants)&&raw.variants.length>0&&raw.variants.length<=512,'Expected 1–512 variants');
    for(const rawVariant of raw.variants){
      need(plain(rawVariant)&&plain(rawVariant.pick),'Invalid variant');
      need(typeof rawVariant.scheme==='string'&&/^[a-z0-9-]{1,256}$/.test(rawVariant.scheme),'Invalid scheme');
      need(Object.keys(rawVariant.pick).length===o.controls.length,'Variant must specify exactly its outfit controls');
      const pick=Object.fromEntries(o.controls.map(c=>{
        need(c.options.some(v=>v.id===rawVariant.pick[c.id]),'Unknown variant option');return[c.id,rawVariant.pick[c.id]];
      }));
      o.variants.push({pick,scheme:rawVariant.scheme});
    }
    unique(o.variants,v=>JSON.stringify(v.pick));
    for(const c of o.controls)for(const v of c.options)need(o.variants.some(x=>x.pick[c.id]===v.id),'Option has no renderable variant');
    p.outfits.push(o);
  }
  unique(p.outfits,x=>x.id);return p;
}
export function isScheme(pack,scheme){
  if(pack.presets?.some(p=>p.id===scheme))return true;
  const parts=scheme.split('-');
  return Array.isArray(pack.axes)&&parts.length===pack.axes.length&&pack.axes.every((a,i)=>a.options?.some(v=>v.id===parts[i]));
}
export function validateAgainstPack(profile,pack){
  need(pack?.id===profile.figure,'Profile figure is not installed');
  for(const o of profile.outfits)for(const v of o.variants)need(isScheme(pack,v.scheme),`Scheme is not available: ${v.scheme}`);
}
export function outfitOf(profile,outfitId){const o=profile.outfits.find(o=>o.id===outfitId);need(o,'Unknown outfit');return o;}
export function selectVariant(outfit,pick={}){
  need(plain(pick),'Invalid choice');
  need(Object.keys(pick).every(k=>outfit.controls.some(c=>c.id===k)),'Control does not belong to this outfit');
  for(const[k,v]of Object.entries(pick))need(outfit.controls.find(c=>c.id===k).options.some(o=>o.id===v),'Unknown option');
  const candidates=outfit.variants.filter(v=>Object.entries(pick).every(([k,x])=>v.pick[k]===x));
  need(candidates.length,'This combination has no animation resources');
  return [...candidates].sort((a,b)=>score(b)-score(a))[0];
  function score(v){return outfit.controls.filter(c=>v.pick[c.id]===c.default).length;}
}
export function availableOptions(outfit,pick,controlId){
  return outfit.controls.find(c=>c.id===controlId).options.filter(option=>outfit.variants.some(v=>v.pick[controlId]===option.id&&Object.entries(pick).every(([k,x])=>k===controlId||v.pick[k]===x)));
}
