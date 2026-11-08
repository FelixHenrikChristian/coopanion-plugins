import {validateProfile,validateAgainstPack,selectVariant,availableOptions} from './profile.js';

/** Compatibility rendering hook, restricted to the native outfit rows. */
export function createWardrobeControls({load,onChange,onError}){
 let provider={enabled:false,profiles:[]},request=0;
 return{
  async refresh(){
   const epoch=++request;
   try{const next=await load();if(epoch!==request)return;provider={enabled:next.enabled===true,profiles:(next.profiles??[]).map(validateProfile)};}
   catch(error){if(epoch!==request)return;provider={enabled:false,profiles:[]};onError?.(error);}
   onChange();
  },
  render({pack,skin,after,apply,language='zh'}){
   if(!provider.enabled||pack.id==='coo')return false;
   const profile=provider.profiles.find(p=>p.figure===pack.id);if(!profile)return false;
   try{validateAgainstPack(profile,pack);}catch(error){onError?.(error);return false;}
   const outfit=profile.outfits.find(o=>o.variants.some(v=>v.scheme===skin.scheme))??profile.outfits[0];
   const active=outfit.variants.find(v=>v.scheme===skin.scheme)??selectVariant(outfit);
   const doc=after.ownerDocument,el=(tag,cls,text)=>{const e=doc.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
   let cursor=after;
   function row(id,label,choices){
    const title=el('div','row-label pack-axis',label),slot=el('div','slot pack-axis'),list=el('div','opts');title.id='wardrobe-'+id;slot.setAttribute('role','group');slot.setAttribute('aria-labelledby',title.id);
    for(const choice of choices){
     const button=el('button','opt wide');button.type='button';button.setAttribute('aria-pressed',String(choice.selected));button.disabled=!!choice.disabled;
     if(choice.disabled)button.title=language==='en'?'No complete resources for this combination':'此搭配暂无完整资源';
     if(choice.image||choice.thumb){const image=el('img','');image.alt='';image.src=choice.image??pack.base+choice.thumb;button.append(image);}
     button.append(el('span','',choice.label));button.addEventListener('click',()=>{if(!button.disabled)apply({...skin,scheme:choice.scheme},true);});list.append(button);
    }
    slot.append(list);cursor.after(title,slot);cursor=slot;
   }
   const thumb=scheme=>{
    const preset=pack.presets?.find(p=>p.id===scheme),parts=scheme.split('-');
    return [...pack.axes].reverse().map((a,j)=>a.options.find(o=>o.id===(preset?.pick[a.id]??parts[pack.axes.length-1-j]))?.thumb).find(Boolean)??pack.thumb;
   };
   row('outfit',language==='en'?'Outfit':'服装',profile.outfits.map(o=>{const v=o.id===outfit.id?active:selectVariant(o);return{label:o.label,selected:o.id===outfit.id,image:o.thumbnail,thumb:thumb(v.scheme),scheme:v.scheme};}));
   for(const control of outfit.controls){const valid=new Set(availableOptions(outfit,active.pick,control.id).map(o=>o.id));
    row(control.id,control.label,control.options.map(option=>({label:option.label,image:option.thumbnail,selected:active.pick[control.id]===option.id,disabled:!valid.has(option.id),scheme:valid.has(option.id)?selectVariant(outfit,{...active.pick,[control.id]:option.id}).scheme:skin.scheme})));
   }
   return true;
  }
 };
}

