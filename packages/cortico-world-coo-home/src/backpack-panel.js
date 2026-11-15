import {icon} from './ui-icons.js';

const crops={
  'spring-onion':'<path fill="#f2ead5" d="m21 24 6 2-4 17c-1 4-6 3-5-1Z"/><path fill="#73a56a" d="m21 26-4-20 4-1 4 21Zm4 0 4-22 4 1-4 22Zm3 1 9-18 4 2-10 18Z"/>',
  daikon:'<path fill="#eee7ce" d="M16 19c-1 12 3 21 10 26 7-6 10-16 8-26Z"/><path fill="#72a36a" d="M24 21C12 19 9 12 12 7c9 0 13 6 13 14Zm2 0C22 10 27 5 31 4c5 5 3 12-5 17Zm2 0c2-9 8-11 13-9-1 7-5 10-13 9Z"/>',
  carrot:'<path fill="#e99a55" d="M15 18c3-5 12-4 17 1 2 3-5 17-18 27-3-17-3-24 1-28Z"/><path fill="#77a86b" d="m23 19-5-13 5-2 3 14 5-14 5 3-8 13 12-6 2 5-14 5Z"/><path d="m14 27 6 2m-7 6 4 1" fill="none" stroke="#c77d44" stroke-width="2"/>',
  cabbage:'<circle cx="26" cy="28" r="17" fill="#9bbd81"/><path d="M27 12C15 18 14 29 26 44M13 19c10 0 22 10 24 19M11 31c12-7 21-6 31-1M30 13c6 7 6 16-2 25" fill="none" stroke="#648b64" stroke-width="2"/>',
  cucumber:'<path d="M37 11C26 14 30 28 14 39" fill="none" stroke="#507e57" stroke-width="15" stroke-linecap="round"/><path d="M38 9C28 13 31 27 17 37" fill="none" stroke="#8eae69" stroke-width="3" stroke-linecap="round"/><g fill="#b1c28a"><circle cx="29" cy="23" r="1"/><circle cx="23" cy="30" r="1"/><circle cx="17" cy="35" r="1"/></g>',
  tomato:'<path fill="#db7c66" d="M26 15C6 8 4 36 19 43c5 2 10 2 15 0 16-8 10-33-8-28Z"/><path fill="#6f9765" d="m26 7 3 9 11-3-8 8 4 5-10-4-10 4 5-7-9-6 11 3Z"/><path d="M15 23c-3 4-3 8-1 12" stroke="#efb29a" stroke-width="3" stroke-linecap="round" fill="none"/>',
  eggplant:'<path fill="#8b729b" d="M32 13c12 7 11 20 0 29-9 7-22 1-20-8 1-7 12-7 13-17Z"/><path fill="#7ea070" d="m30 6 5 4-1 4 7 6-9-1-6 7-1-8-5-2 9-4Z"/><path d="M33 26c1 6-3 11-7 12" stroke="#b49dbf" stroke-width="3" stroke-linecap="round" fill="none"/>',
  pepper:'<path fill="#d6a665" d="M26 17C14 8 5 25 13 38c3 7 8 4 13 6 6-2 10 1 14-6 7-14-2-30-14-21Z"/><path fill="#7b9e68" d="M24 19c-1-7 0-11 6-14l4 4c-5 1-7 4-6 10Z"/><path d="M20 20c-5 8-4 16 0 21m11-21c5 8 4 16 0 21" stroke="#b98755" stroke-width="2" fill="none"/>',
};
const cropIcon=id=>`<svg viewBox="0 0 52 52" aria-hidden="true">${crops[id]??''}</svg>`;

export function createBackpackPanel({root,signal}){
  const controller=new AbortController(),events={signal:controller.signal};
  const overlay=document.createElement('div');overlay.className='coo-home-backpack-overlay';overlay.hidden=true;
  overlay.innerHTML=`<section class="coo-home-backpack-dialog" role="dialog" aria-modal="true" aria-label="背包" data-testid="home-backpack-dialog"><header><div><span class="coo-eyebrow">LITTLE HARVESTS</span><h2>背包</h2></div><button type="button" class="coo-icon-button" data-testid="home-backpack-close" aria-label="关闭背包">${icon('close')}</button></header><p class="coo-home-backpack-summary" role="status"></p><div class="coo-home-backpack-empty" data-testid="home-backpack-empty">${icon('harvest')}<h3>背包还是空的</h3><p>采收成熟蔬菜后，会自动放进这里。</p></div><ul class="coo-home-backpack-grid" data-testid="home-backpack-items" aria-label="已收获的蔬菜"></ul><p class="coo-home-backpack-note">先把收获好好收起来。售卖、购物和烹饪暂未开放。</p></section>`;
  root.append(overlay);
  const closeButton=overlay.querySelector('button'),summary=overlay.querySelector('.coo-home-backpack-summary'),empty=overlay.querySelector('.coo-home-backpack-empty'),grid=overlay.querySelector('ul');
  let inventory=null,returnFocus=null,opener=null,rendered=null,disposed=false;
  function paint(){
    if(disposed||overlay.hidden)return;
    const items=inventory?.items??[],key=JSON.stringify(inventory);if(key===rendered)return;rendered=key;
    summary.textContent=inventory?`${items.length} 种蔬菜`:'正在读取背包…';
    empty.hidden=!inventory||items.length>0;grid.hidden=!inventory||items.length===0;grid.replaceChildren();
    for(const item of items){
      const card=document.createElement('li');card.className='coo-home-backpack-card';card.dataset.testid='home-backpack-item';card.dataset.cropId=item.cropId;card.dataset.quantity=String(item.quantity);
      const symbol=document.createElement('span');symbol.className='coo-home-backpack-icon';symbol.innerHTML=cropIcon(item.cropId);
      const name=document.createElement('strong');name.textContent=item.label;
      const quantity=document.createElement('span');quantity.className='coo-home-backpack-quantity';quantity.textContent=`${item.quantity} ${item.unit}`;
      card.append(symbol,name,quantity);grid.append(card);
    }
  }
  function show(button){if(disposed)return;if(overlay.hidden){returnFocus=button??document.activeElement;opener=button??root.querySelector('[data-testid=home-backpack]');}opener?.setAttribute('aria-expanded','true');overlay.hidden=false;paint();closeButton.focus();}
  function close(){
    if(disposed||overlay.hidden)return;overlay.hidden=true;opener?.setAttribute('aria-expanded','false');opener=null;
    const fallback=root.querySelector('[data-testid=home-backpack]')??root.querySelector('[data-testid=home-follow]');
    const target=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:fallback;target?.focus();returnFocus=null;
  }
  closeButton.addEventListener('click',close,events);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();},events);
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){event.preventDefault();closeButton.focus();}
  },events);
  function dispose(){if(disposed)return;disposed=true;opener?.setAttribute('aria-expanded','false');controller.abort();signal?.removeEventListener('abort',dispose);overlay.remove();inventory=null;returnFocus=null;opener=null;}
  signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted)dispose();
  return{show,close,receive(life){if(disposed)return;inventory=life?.inventory??null;paint();},get open(){return !disposed&&!overlay.hidden;},dispose};
}
