import {icon} from './ui-icons.js';
import {inventoryArt} from './backpack-panel.js';

const labels={buy:'便利店 · 选购',sell:'便利店 · 出售农作物',tea:'灯乃庭 · 今日茶单',consume:'享用背包食品'};
const actions={buy:'前往结账',sell:'前往出售',tea:'前往品茶',consume:'安排享用'};
const gainsText=gains=>Object.entries(gains??{}).filter(([,n])=>n>0).map(([key,n])=>`${{energy:'精力',hunger:'饱腹',comfort:'舒适',hygiene:'整洁'}[key]??key} +${n}`).join(' · ');
const money=value=>Math.max(0,Number.isSafeInteger(value)?value:0).toLocaleString('zh-CN');

// A single receipt stays attached to an unresolved request, even if its dialog
// closes. A retry cannot turn a lost response into a second purchase.
export function createCommercePanel({root,ctx,signal,feedback=()=>{},onState=()=>{}}){
  const controller=new AbortController(),events={signal:controller.signal};
  const overlay=document.createElement('div');overlay.className='coo-commerce-overlay';overlay.hidden=true;
  overlay.innerHTML=`<section class="coo-commerce-dialog" role="dialog" aria-modal="true" aria-label="便利店" data-testid="home-commerce-dialog"><header><div><span class="coo-eyebrow">A SMALL TREAT FOR TODAY</span><h2></h2></div><button type="button" class="coo-icon-button" data-testid="home-commerce-close" aria-label="关闭购物窗口">${icon('close')}</button></header><div class="coo-commerce-intro"><p></p><span class="coo-wallet" data-testid="home-commerce-wallet">${icon('coin')}<strong>—</strong><span>金币</span></span></div><nav class="coo-inventory-tabs" aria-label="商品分类" data-testid="home-commerce-tabs"></nav><div class="coo-commerce-list" data-testid="home-commerce-list"></div><footer><div class="coo-commerce-summary"><div><span data-commerce-count>尚未选择</span><strong data-commerce-total>0 金币</strong></div><button type="button" class="coo-text-button" data-testid="home-commerce-all" hidden>选择全部农作物</button></div><p class="coo-commerce-status" role="status" data-testid="home-commerce-status"></p><button type="button" class="coo-commerce-submit" data-testid="home-commerce-submit" disabled></button><small class="coo-commerce-help">完成活动后才结算；关闭窗口不会取消已安排的行程。</small></footer></section>`;
  root.append(overlay);
  const dialog=overlay.querySelector('section'),title=overlay.querySelector('h2'),intro=overlay.querySelector('.coo-commerce-intro p'),wallet=overlay.querySelector('[data-testid=home-commerce-wallet]'),tabs=overlay.querySelector('nav'),list=overlay.querySelector('.coo-commerce-list'),status=overlay.querySelector('.coo-commerce-status'),submit=overlay.querySelector('[data-testid=home-commerce-submit]'),allButton=overlay.querySelector('[data-testid=home-commerce-all]'),closeButton=overlay.querySelector('[data-testid=home-commerce-close]');
  let economy=null,crops=[],life=null,kind='buy',filter='all',seatId=null,returnFocus=null,busy=false,disposed=false,attempt=null,rows=new Map(),selection=new Map(),knownInventoryIds='';
  const stock=id=>life?.inventory?.items?.find(item=>(item.id??item.cropId)===id);
  // These are explicit replacement commands: accepting one releases the current
  // task's reservations. Show the held amount, but allow all owned stock.
  const available=id=>stock(id)?.quantity??0;
  const price=item=>kind==='sell'?item.sellPrice??0:kind==='consume'?0:item.buyPrice??0;
  function source(){return(economy?.items??[]).filter(item=>kind==='buy'?(item.category==='seed'||item.category==='food')&&(filter==='all'||item.subcategory===filter||item.category===filter):kind==='sell'?item.category==='crop'&&(available(item.id)>0||selection.has(item.id)):kind==='tea'?item.category==='tea':item.category==='food'&&item.usable&&(available(item.id)>0||selection.has(item.id)));}
  function setQuantity(item,quantity){
    if(busy||attempt)return;
    if(kind==='tea'||kind==='consume')selection.clear();
    const maximum=kind==='sell'?available(item.id):kind==='tea'||kind==='consume'?1:99;
    const count=Math.max(0,Math.min(maximum,Number.isFinite(quantity)?Math.floor(quantity):0));
    if(count)selection.set(item.id,count);else selection.delete(item.id);
    status.textContent='';refresh();
  }
  function details(item){
    if(item.category==='seed'){
      const crop=crops.find(c=>c.id===item.cropId);
      return `${item.free?'永久免费，无需购买':`拥有 ${available(item.id)} 包 · 一包种一整畦`}${crop?` · ${crop.growMinutes} 分钟成熟` :''}`;
    }
    if(kind==='sell')return `可售 ${available(item.id)} ${item.unit}${stock(item.id)?.reserved?` · 已预留 ${stock(item.id).reserved}`:''}`;
    const effects=gainsText(item.gains),duration=item.durationMs?`${Math.round(item.durationMs/1000)} 秒`:'';
    return [effects,duration,kind==='consume'?`可用 ${available(item.id)} ${item.unit}`:null].filter(Boolean).join(' · ');
  }
  function drawTabs(){
    tabs.replaceChildren();tabs.hidden=kind!=='buy';
    if(kind!=='buy')return;
    for(const [id,label] of [['all','全部'],['seed','种子'],['snack','零食'],['drink','饮料'],['meal','简食']]){
      const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.filter=id;button.dataset.testid='home-commerce-filter';button.setAttribute('aria-pressed',String(filter===id));
      button.addEventListener('click',()=>{if(busy||attempt)return;filter=id;drawTabs();drawList();},events);tabs.append(button);
    }
  }
  function drawList(){
    list.replaceChildren();rows.clear();
    for(const item of source()){
      const row=document.createElement('article');row.className='coo-commerce-product';row.dataset.itemId=item.id;row.dataset.testid='home-commerce-item';
      const art=document.createElement('span');art.className='coo-commerce-art';art.innerHTML=inventoryArt(item);
      const text=document.createElement('div');text.className='coo-commerce-product-copy';const name=document.createElement('strong');name.textContent=item.label;const detail=document.createElement('small');detail.textContent=details(item);text.append(name,detail);
      const cost=document.createElement('span');cost.className='coo-commerce-price';cost.textContent=item.free?'免费':kind==='consume'?`${available(item.id)} ${item.unit}`:`${money(price(item))} 金币 / ${item.unit}`;
      row.append(art,text,cost);
      const controls=document.createElement('div');controls.className='coo-commerce-quantity';
      if(kind==='tea'||kind==='consume'){
        const choose=document.createElement('button');choose.type='button';choose.textContent='选择';choose.dataset.testid='home-commerce-choose';choose.setAttribute('aria-label',`选择${item.label}`);choose.addEventListener('click',()=>setQuantity(item,selection.get(item.id)?0:1),events);controls.append(choose);
      }else{
        const minus=document.createElement('button');minus.type='button';minus.innerHTML=icon('minus');minus.setAttribute('aria-label',`减少${item.label}`);
        const input=document.createElement('input');input.type='number';input.inputMode='numeric';input.min='0';input.max=String(kind==='sell'?available(item.id):99);input.step='1';input.value=String(selection.get(item.id)??0);input.setAttribute('aria-label',`${item.label}数量`);input.dataset.testid='home-commerce-quantity';
        const plus=document.createElement('button');plus.type='button';plus.innerHTML=icon('plus');plus.setAttribute('aria-label',`增加${item.label}`);
        minus.addEventListener('click',()=>setQuantity(item,(selection.get(item.id)??0)-1),events);plus.addEventListener('click',()=>setQuantity(item,(selection.get(item.id)??0)+1),events);input.addEventListener('change',()=>setQuantity(item,Number(input.value)),events);controls.append(minus,input,plus);
      }
      row.append(controls);list.append(row);rows.set(item.id,{item,row,detail,cost,controls});
    }
    if(!rows.size){const empty=document.createElement('p');empty.className='coo-commerce-empty';empty.textContent=!economy?'正在读取商品目录…':kind==='sell'?'背包里暂时没有可出售的农作物。':kind==='consume'?'还没有可享用的食品，去便利店选一份吧。':'暂时没有可选商品。';list.append(empty);}
    refresh();
  }
  function refresh(){
    if(disposed||overlay.hidden)return;
    const funds=life?.wallet?.balance??0;
    wallet.querySelector('strong').textContent=life?.wallet?money(funds):'—';wallet.title=`余额 ${funds} 金币${life?.wallet?.reserved?`；当前行程预留 ${life.wallet.reserved} 金币，确认新订单将替换当前任务` :''}`;
    let total=0,count=0,invalid=!life||!economy;
    for(const [id,quantity] of selection){const item=economy?.items.find(item=>item.id===id);if(!item){invalid=true;continue;}total+=price(item)*quantity;count+=quantity;if((kind==='sell'||kind==='consume')&&quantity>available(id))invalid=true;}
    if((kind==='buy'||kind==='tea')&&total>funds)invalid=true;
    for(const {item,row,detail,cost,controls} of rows.values()){
      const quantity=selection.get(item.id)??0;row.dataset.selected=String(quantity>0);detail.textContent=details(item);
      if(kind==='consume')cost.textContent=`${available(item.id)} ${item.unit}`;
      const input=controls.querySelector('input');if(input)input.value=String(quantity);
      for(const control of controls.children)control.disabled=busy||!!attempt||!!item.free;
      if(kind==='tea'||kind==='consume'){const button=controls.firstChild;button.textContent=quantity?'已选择':'选择';button.setAttribute('aria-pressed',String(quantity>0));if(kind==='consume'&&available(item.id)<1)button.disabled=true;}
      else{controls.firstChild.disabled||=quantity<=0;controls.lastChild.disabled||=quantity>=(kind==='sell'?available(item.id):99);}
    }
    for(const button of tabs.children)button.disabled=busy||!!attempt;
    allButton.hidden=kind!=='sell';allButton.disabled=busy||!!attempt||!rows.size;
    overlay.querySelector('[data-commerce-count]').textContent=count?`已选 ${selection.size} 种 · ${count} 件`:'尚未选择';
    overlay.querySelector('[data-commerce-total]').textContent=kind==='consume'?`使用 ${count} 份食品`:`${kind==='sell'?'预计收入':'合计'} ${money(total)} 金币`;
    submit.disabled=busy||(!attempt&&(!count||invalid));
    submit.textContent=busy?'正在安排…':attempt?'重试同一订单':`${actions[kind]}${count&&kind!=='consume'?` · ${kind==='sell'?'+':''}${money(total)} 金币`:''}`;
    if(!busy&&!attempt&&count&&invalid&&!status.textContent)status.textContent=(kind==='buy'||kind==='tea')&&total>funds?'金币不足，请减少数量或先出售农作物。':'库存有变化，请重新选择数量。';
  }
  function show(next,{button,category='all',itemId=null,seatId:seat=null}={}){
    if(disposed)return false;
    returnFocus=button??document.activeElement;
    if(!attempt&&!busy){kind=next;filter=category;seatId=seat;selection.clear();if(itemId)selection.set(itemId,1);status.textContent='';}
    overlay.hidden=false;title.textContent=labels[kind];dialog.setAttribute('aria-label',labels[kind]);dialog.dataset.kind=kind;
    intro.textContent={buy:'选好一份日常的小确幸，coo 会走进便利店，在收银台完成购买。',sell:'把自己的收成带到便利店。到柜台完成出售后，金币才会入账。',tea:'沿雨夜街道走进灯乃庭，在坐垫上慢慢喝完一盏茶。',consume:'从背包选一份食品，coo 会到家中餐桌享用。'}[kind];
    drawTabs();drawList();closeButton.focus();return !attempt&&!busy;
  }
  function close(){if(disposed||overlay.hidden)return;overlay.hidden=true;const fallback=root.querySelector('[data-testid=home-backpack]')??root.querySelector('[data-testid=home-follow]');(returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:fallback)?.focus();returnFocus=null;}
  async function submitOrder(){
    if(disposed||busy||submit.disabled)return;
    if(!attempt)attempt={kind,lines:[...selection].map(([itemId,quantity])=>({itemId,quantity})),requestId:`${Math.floor(life?.now??Date.now())}:${crypto.randomUUID()}`,enqueue:false,...(seatId&&kind==='tea'?{seatId}:{})};
    busy=true;status.textContent=kind==='consume'?'正在安排享用…':'正在安排到店行程…';refresh();
    try{
      const value=await ctx.invoke('commerce',[structuredClone(attempt)]);if(disposed)return;
      if(value?.life)onState(value);
      if(value?.commerce?.ok===false){attempt=null;status.textContent=value.commerce.error??'这次订单未被接受，请调整后重试。';return;}
      if(!value?.commerce?.accepted&&!value?.commerce?.duplicate)throw Error('Unconfirmed commerce receipt');
      const acceptedKind=attempt.kind;attempt=null;selection.clear();close();
      feedback(value.commerce.transactionStatus==='cancelled'?'原订单已经取消，未重复安排；现在可以重新选择。':value.commerce.transactionStatus==='completed'?'这笔订单已经完成，未重复结算。':{buy:'已安排购物，coo 会到便利店收银台结账。',sell:'已安排出售，到账后会更新金币和背包。',tea:'已安排品茶，coo 会走到灯乃庭的坐垫。',consume:'已安排享用，完成后扣除一份食品。'}[acceptedKind]);
    }catch{if(!disposed)status.textContent='提交结果暂未确认，请重试同一订单；不会重复结算。';}
    finally{busy=false;if(!disposed)refresh();}
  }
  submit.addEventListener('click',()=>void submitOrder(),events);closeButton.addEventListener('click',close,events);
  allButton.addEventListener('click',()=>{if(busy||attempt)return;selection=new Map(source().filter(item=>available(item.id)>0).map(item=>[item.id,available(item.id)]));status.textContent='';refresh();},events);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();},events);
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>node.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  },events);
  function receive(value){if(disposed||!value)return;life=value;const ids=(life.inventory?.items??[]).map(item=>item.id??item.cropId).join('|');if(!overlay.hidden&&['sell','consume'].includes(kind)&&ids!==knownInventoryIds)drawList();knownInventoryIds=ids;refresh();}
  function dispose(){if(disposed)return;disposed=true;controller.abort();signal?.removeEventListener('abort',dispose);overlay.remove();rows.clear();selection.clear();life=null;economy=null;attempt=null;returnFocus=null;}
  signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted)dispose();
  return{show,close,receive,submit:submitOrder,setCatalog(value){if(disposed)return;economy=value?.economy??null;crops=value?.crops??[];if(!overlay.hidden){drawTabs();drawList();}},get open(){return !disposed&&!overlay.hidden;},getState:()=>({open:!disposed&&!overlay.hidden,kind,busy,pending:attempt?structuredClone(attempt):null}),dispose};
}
