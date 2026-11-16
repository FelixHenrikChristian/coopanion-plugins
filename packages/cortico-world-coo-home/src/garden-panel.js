import {icon} from './ui-icons.js';

const stageNames={empty:'空田',seeded:'等待首次浇水',seedling:'幼苗期',growing:'生长中',ripe:'可采收'};
const duration=ms=>{const minutes=Math.floor(Math.max(0,ms)/60000);return minutes>=60?`${Math.floor(minutes/60)} 小时 ${minutes%60} 分钟`:`${minutes} 分钟`;};
const time=value=>Number.isFinite(value)?new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'尚未开始';

export function plotInformation(plot,now,paused=false){
  const growing=plot.growthStartedAt!==null&&plot.growthStartedAt!==undefined;
  return{
    title:plot.cropLabel??'等待一粒种子',stage:stageNames[plot.stage],
    progress:Math.round(plot.growth*100),
    fields:[['预计收获',plot.cropId?`${plot.expectedYieldCount} ${plot.yieldUnit} ${plot.cropLabel}`:'选择作物后显示'],
      ['已生长',growing?duration(Math.round(plot.durationMs*plot.growth)):'尚未开始'],
      ['完整生长周期',plot.cropId?duration(plot.durationMs):'30–90 分钟'],
      ['距离成熟',plot.stage==='ripe'?'已成熟':plot.stage==='empty'?'尚未播种':plot.needsFirstWater?'首次浇水后计时':`${paused?'已暂停 · ':''}${duration(Math.ceil(plot.remainingMs/60000)*60000)}`],
      ['播种时间',time(plot.plantedAt)],['预计成熟时间',plot.stage==='empty'||plot.needsFirstWater?'首次浇水后确定':paused&&plot.stage!=='ripe'?'恢复生活后顺延':time(plot.readyAt)]],
    note:plot.stage==='empty'?'每块田都可以选择任意一种作物，采收后可换种。':plot.needsFirstWater?'种子已经播下，完成第一次浇水后才开始生长。':paused?'生活已暂停，生长进度保持不变。':'首次浇水后自然生长；无需反复照料，不会枯萎。',
  };
}

export function createGardenPanel({root,signal,onSow,onShop=()=>{}}){
  const overlay=document.createElement('div');overlay.className='coo-home-garden-overlay';overlay.hidden=true;
  overlay.innerHTML=`<section class="coo-home-garden-dialog" role="dialog" aria-modal="true" aria-label="菜园" data-testid="home-garden-dialog"><header><div><span class="coo-eyebrow">THE GARDEN</span><h2></h2></div><button type="button" class="coo-icon-button" data-testid="home-garden-close" aria-label="关闭菜园窗口">${icon('close')}</button></header><div class="coo-home-plot-inspect" data-testid="home-plot-details" hidden><div class="coo-plot-hero">${icon('leaf')}<div><span data-plot-stage></span><h3></h3></div><strong data-plot-progress></strong></div><div class="coo-plot-progress"><i></i></div><dl class="coo-plot-facts"></dl><p class="coo-plot-note"></p><div class="coo-plot-history"></div></div><div class="coo-home-crop-choice" data-testid="home-crop-dialog" hidden><p class="coo-home-crop-note">一包种子种一整畦；小葱一直免费。播种完成后消耗种子，首次浇水开始生长。</p><div class="coo-home-crop-list"></div><button type="button" class="coo-text-button coo-seed-shop" data-testid="home-seed-shop">去便利店买种子</button></div><p class="coo-home-crop-status" role="status"></p></section>`;
  root.append(overlay);
  const dialog=overlay.querySelector('section'),title=overlay.querySelector('h2'),inspect=overlay.querySelector('.coo-home-plot-inspect'),choice=overlay.querySelector('.coo-home-crop-choice'),list=overlay.querySelector('.coo-home-crop-list'),status=overlay.querySelector('.coo-home-crop-status');
  let selected=null,life=null,returnFocus=null,request=null,busy=false,generation=0,economy=null;
  function open(kind,id,button){generation++;selected=id;returnFocus=button;overlay.hidden=false;inspect.hidden=kind!=='inspect';choice.hidden=kind!=='choose';title.textContent=`菜畦 ${id.slice(5)} · ${kind==='inspect'?'生长记录':'选择作物'}`;dialog.setAttribute('aria-label',title.textContent);status.textContent='';overlay.querySelector('button').focus();}
  function close(){generation++;overlay.hidden=true;selected=null;request=null;if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus();else root.querySelector('[data-testid=home-follow]')?.focus();returnFocus=null;}
  function paint(){
    if(overlay.hidden)return;
    if(!choice.hidden){paintChoices();return;}
    if(inspect.hidden)return;
    const plot=life?.garden?.plots.find(p=>p.id===selected);if(!plot)return;
    const info=plotInformation(plot,life.now,life.paused);
    Object.assign(inspect.dataset,{plotId:plot.id,stage:plot.stage,growth:String(plot.growth)});
    inspect.querySelector('[data-plot-stage]').textContent=info.stage;inspect.querySelector('h3').textContent=info.title;
    inspect.querySelector('[data-plot-progress]').textContent=`${info.progress}%`;inspect.querySelector('.coo-plot-progress i').style.width=`${info.progress}%`;
    const facts=inspect.querySelector('dl');facts.replaceChildren();
    for(const [label,value] of info.fields){const cell=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;cell.append(dt,dd);facts.append(cell);}
    inspect.querySelector('.coo-plot-note').textContent=info.note;
    const crops=life.garden.crops??[],history=Object.entries(plot.harvestedByCrop??{}).filter(([,count])=>count>0).map(([id,count])=>{const c=crops.find(c=>c.id===id);return `${c?.label??id} ${count}${c?.yieldUnit??''}`;});
    inspect.querySelector('.coo-plot-history').textContent=`累计采收 ${plot.harvests} 次${history.length?` · ${history.join('、')}`:' · 本版开始记录收获数量'}`;
  }
  function showDetails(id,button){open('inspect',id,button);paint();}
  function paintChoices(){
    for(const option of list.children){
      const crop=life?.garden?.crops.find(c=>c.id===option.dataset.cropId);if(!crop)continue;
      const seed=economy?.items.find(item=>item.category==='seed'&&item.cropId===crop.id),stock=life?.inventory?.items.find(item=>item.id===seed?.id),count=stock?.quantity??0;
      // Before the economy catalog is ready, only the universally free crop is actionable.
      const free=seed?.free===true||crop.id==='spring-onion';
      option.disabled=busy||(!free&&count<1);option.title=free?'永久免费，可以直接播种':count>0?'播种成功消耗一包种子':'种子不足，请先到便利店购买';
      option.querySelector('[data-crop-stock]').textContent=free?'免费种子 · 无限':`拥有 ${count} 包${seed?` · ${seed.buyPrice} 金币/包`:''}`;
    }
  }
  function chooseCrop(entry,action,button){
    open('choose',entry.id,button);request={entry,action};list.replaceChildren();
    for(const crop of life?.garden?.crops??[]){
      const option=document.createElement('button');option.type='button';option.dataset.testid='home-crop-option';option.dataset.cropId=crop.id;
      const symbol=document.createElement('span');symbol.className='coo-crop-symbol';symbol.innerHTML=icon('leaf');
      const name=document.createElement('strong');name.textContent=crop.label;
      const details=document.createElement('span');details.textContent=`${crop.growMinutes} 分钟 · ${crop.yieldCount} ${crop.yieldUnit}`;
      const stock=document.createElement('small');stock.dataset.cropStock='';
      option.append(symbol,name,details,stock);option.addEventListener('click',async()=>{
        if(busy||!request)return;busy=true;const current=generation,pending=request;status.textContent='正在安排播种…';for(const b of list.children)b.disabled=true;
        try{const done=await onSow(pending.entry,pending.action,crop.id);if(current===generation){if(done)close();else status.textContent='未能安排播种，请检查菜地状态后重试。';}}
        finally{busy=false;if(current===generation)paintChoices();}
      },{signal});list.append(option);
    }
    paintChoices();if(!list.children.length)status.textContent='作物目录暂不可用，请稍后重试。';
  }
  overlay.querySelector('[data-testid=home-seed-shop]').addEventListener('click',event=>{close();onShop(event.currentTarget);},{signal});
  overlay.querySelector('[data-testid=home-garden-close]').addEventListener('click',close,{signal});
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();},{signal});
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled)')].filter(e=>e.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  },{signal});
  return{showDetails,chooseCrop,close,setCatalog(value){economy=value?.economy??null;paint();},receive(value){life=value;paint();},get open(){return !overlay.hidden;},dispose(){overlay.remove();}};
}
