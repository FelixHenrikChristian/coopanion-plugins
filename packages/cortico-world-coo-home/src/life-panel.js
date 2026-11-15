import {icon} from './ui-icons.js';
import {createGardenPanel} from './garden-panel.js';
// Paths carry host timestamps. Drawing never determines task completion.
function routePose(route,now,fallback){
  if(!route?.length)return {position:fallback,facing:null,moving:false};
  for(let index=1;index<route.length;index++){
    const a=route[index-1],b=route[index];if(now>b.at)continue;
    const t=Math.max(0,Math.min(1,(now-a.at)/Math.max(1,b.at-a.at)));
    const facing=b.position.map((value,i)=>value-a.position[i]);
    return {position:a.position.map((value,i)=>value+facing[i]*t),facing,moving:t<1};
  }
  return {position:route.at(-1).position,facing:null,moving:false};
}

// Keep detached action bubbles near their world anchor, with room for the
// toolbar and viewport edges. Coordinates remain in panel CSS pixels.
export function interactionPlacement({x,y,width,height,count,details=false}){
  const pillWidth=Math.max(90,Math.min(148,(width-56)/2));
  const rows=Math.max(1,Math.ceil(count/2)),first=-(rows-1)*23;
  const buttons=Array.from({length:count},(_,i)=>({x:i===count-1&&count%2?0:(i%2?1:-1)*(pillWidth/2+14),y:first+Math.floor(i/2)*46}));
  if(count%2)buttons.at(-1).y+=count===1?-30:10;
  const titleY=first-48,footerY=Math.max(...buttons.map(p=>p.y),0)+34;
  const half=Math.max(pillWidth+14,Math.min(150,(width-24)/2)),bottom=footerY+(details?78:28);
  const clamp=(v,a,b)=>Math.max(a,Math.min(Math.max(a,b),v));
  return {x:clamp(x,half+12,width-half-12),y:clamp(y,56-titleY,height-bottom-16),pillWidth,titleY,footerY,buttons};
}

export function createLifePanel({root,scene,actor,ctx,signal,send,feedback}){
  const layer=document.createElement('div');layer.className='coo-home-life';
  layer.innerHTML=`<div class="coo-home-menu" role="group" aria-label="物件交互选项" hidden><svg class="coo-home-menu-link" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg><span class="coo-home-menu-anchor" aria-hidden="true"></span><div class="coo-home-menu-head"><strong></strong><button type="button" data-testid="home-menu-close" aria-label="关闭动作菜单">${icon('close')}</button></div><div class="coo-home-actions"></div></div>
    <section class="coo-home-controls" aria-label="家园生活状态"><div class="coo-life-heading"><div class="coo-life-emblem">${icon('home')}</div><div><span class="coo-eyebrow">此刻的生活</span><div class="coo-home-activity" data-testid="home-activity" role="status">正在读取进度…</div></div><button type="button" class="coo-icon-button" data-testid="home-cancel" aria-label="取消当前任务与计划" title="取消当前任务与计划" disabled>${icon('close')}</button></div><div class="coo-home-needs" data-testid="home-needs"></div><div class="coo-home-save" data-testid="home-save-warning" role="status" hidden></div><footer class="coo-home-controls-row"><button type="button" data-testid="home-pause">${icon('pause')}<span>暂停生活</span></button><label class="coo-life-autonomy"><input type="checkbox" data-testid="home-autonomy"><i></i>自主生活</label><span class="coo-plan-count"></span></footer></section>`;
  root.append(layer);
  const menu=layer.querySelector('.coo-home-menu'),actions=layer.querySelector('.coo-home-actions');
  const pauseButton=layer.querySelector('[data-testid=home-pause]'),cancelButton=layer.querySelector('[data-testid=home-cancel]');
  const autonomy=layer.querySelector('[data-testid=home-autonomy]'),activity=layer.querySelector('[data-testid=home-activity]');
  const needs=layer.querySelector('.coo-home-needs'),needNodes=new Map();
  for(const [key,label,glyph] of [['energy','精力','moon'],['hunger','饱腹','bowl'],['hygiene','整洁','drop'],['comfort','舒适','heart']]){
    const cell=document.createElement('div');cell.className='coo-need';cell.dataset.need=key;cell.innerHTML=`<span class="coo-need-icon">${icon(glyph)}</span><div><span class="coo-need-label">${label}</span><div class="coo-need-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><i></i></div></div><strong></strong>`;needs.append(cell);needNodes.set(key,cell);
  }
  const garden=createGardenPanel({root,signal,onSow:(entry,action,cropId)=>command(entry,action,cropId)});
  let life=null,receivedAt=0,lastPresence=null,lastVisualKey=null,lastGardenKey=null,lastRecent=null,catalog=new Map(),selected=null,requestBusy=false,menuRevision=0;
  function positionMenu(){
    if(menu.hidden||!selected)return;
    const anchor=scene.getItem(selected)?.anchor,point=anchor&&scene.project(anchor);
    if(!point?.visible){menu.style.visibility='hidden';return;}
    menu.style.visibility='';
    const box=interactionPlacement({...point,width:root.clientWidth,height:root.clientHeight,count:actions.children.length});
    menu.style.left=`${box.x}px`;menu.style.top=`${box.y}px`;
    menu.style.setProperty('--action-width',`${box.pillWidth}px`);
    menu.querySelector('.coo-home-menu-head').style.top=`${box.titleY}px`;
    [...actions.children].forEach((button,i)=>{const p=box.buttons[i];if(p){button.style.left=`${p.x}px`;button.style.top=`${p.y}px`;}});
    const dx=point.x-box.x,dy=point.y-box.y;
    menu.querySelector('.coo-home-menu-anchor').style.transform=`translate(${dx}px,${dy}px) translate(-50%,-50%) rotate(45deg)`;
    const line=menu.querySelector('line');line.setAttribute('x2',String(dx));line.setAttribute('y2',String(dy));
  }
  function closeMenu(){menuRevision++;menu.hidden=true;selected=null;}
  function refreshMenu(){
    const plot=life?.garden?.plots.find(value=>value.id===selected);
    actions.querySelectorAll('button').forEach(button=>{
      const unavailable=plot?.actions?.[button.dataset.canonical]===false;
      button.disabled=requestBusy||!!unavailable;button.title=unavailable?'当前菜地状态暂不支持此动作。':(button.dataset.description??'');
    });positionMenu();
  }
  function receive(state){
    if(signal.aborted||!state?.life)return;
    const next=state.life;
    if(life&&(next.revision<life.revision||next.revision===life.revision&&next.now<life.now))return;
    const hadState=!!life;life=next;receivedAt=performance.now();garden.receive(life);
    const recent=life.recent?.at(-1),recentKey=recent?`${recent.id}:${recent.outcome}`:null;
    if(hadState&&recentKey&&recentKey!==lastRecent&&recent.outcome==='completed'){
      const entry=catalog.get(recent.itemId),action=entry?.actions.find(value=>value.id===recent.actionId);
      feedback(entry?`${entry.label} · ${action?.label??'活动'}已完成`:'已走到目的地。');
    }
    if(hadState&&recentKey&&recentKey!==lastRecent&&recent.outcome==='cancelled'&&recent.reason)feedback(recent.reason);
    lastRecent=recentKey;
    root.dataset.lifeRevision=String(life.revision);root.dataset.lifePhase=life.current?.phase??'idle';
    const current=life.current;
    activity.textContent=life.paused?'生活已暂停':current?`${current.phase==='walking'?'正在前往':'正在'} · ${current.label}`:life.autonomy?'在家中休息，稍后继续日常活动':'自由休息中';
    pauseButton.innerHTML=`${icon(life.paused?'play':'pause')}<span>${life.paused?'继续生活':'暂停生活'}</span>`;cancelButton.disabled=!current&&!life.queue?.length;
    autonomy.checked=!!life.autonomy;
    const saveWarning=layer.querySelector('.coo-home-save');saveWarning.hidden=life.storage?.ok!==false;
    saveWarning.textContent=life.storage?.ok===false?'进度暂时无法保存，请检查可用磁盘空间。':'';
    for(const [key,cell] of needNodes){
      const value=Math.round(Math.max(0,Math.min(100,life.needs?.[key]??0)));
      cell.querySelector('strong').textContent=value;cell.dataset.level=value<30?'low':value<60?'medium':'high';
      cell.querySelector('[role=meter]').setAttribute('aria-valuenow',String(value));cell.querySelector('i').style.width=`${value}%`;
    }
    layer.querySelector('.coo-plan-count').textContent=life.queue?.length?`计划余下 ${life.queue.length} 步`:'';
    const visuals={};
    for(const id of ['living.tv','study.laptop','bedroom.bedside','genkan.washer']){
      const value=life.items?.[id];if(!value)continue;
      visuals[id]={power:value.on!==false,...(id==='genkan.washer'?{running:!!value.active&&value.effect==='laundry'}:{})};
    }
    const visualKey=JSON.stringify(visuals);
    if(visualKey!==lastVisualKey){scene.setFurnitureVisuals?.(visuals);lastVisualKey=visualKey;}
    if(life.garden){
      // Growth is slow; update existing meshes only when a visible amount changes.
      const plots=life.garden.plots.map(({id,cropId,stage,growth,wetness})=>({id,cropId,stage,growth:Math.round(growth*100)/100,wetness:Math.round(wetness*100)/100}));
      const gardenKey=JSON.stringify(plots);
      if(gardenKey!==lastGardenKey){scene.setPlotVisuals?.(plots);lastGardenKey=gardenKey;}
    }
    refreshMenu();
  }
  async function invoke(method,args=[]){
    if(requestBusy||signal.aborted)return;
    requestBusy=true;actions.querySelectorAll('button').forEach(button=>{button.disabled=true;});
    try{const state=await ctx.invoke(method,args);receive(state);return state;}
    catch{feedback(life?.storage?.ok===false?'指令未保存，请检查可用磁盘空间后重试。':method==='command'&&args[0]?.itemId?.startsWith('plot-')?'菜畦状态或任务已变化，请查看当前进度后重试。':'指令未执行，请选可到达的物件或地面重试。');}
    finally{requestBusy=false;if(!signal.aborted)refreshMenu();}
  }
  async function command(entry,action,cropId){
    const revision=menuRevision;
    const state=await invoke('command',[{itemId:entry.id,actionId:action.id,enqueue:false,...(cropId?{cropId}:{})}]);
    if(state){
      const queued=state.life?.queue?.some(task=>task.itemId===entry.id&&task.actionId===action.id);
      if(revision===menuRevision)closeMenu();feedback(queued?'已加入待办队列。':'已收到，准备过去。');
    }
    return state;
  }
  function selectItem(value){
    if(!value)return;menuRevision++;garden.close();selected=value.id;menu.hidden=false;menu.dataset.itemId=value.id;
    menu.querySelector('strong').textContent=value.id.startsWith('plot-')?`菜畦 ${value.id.slice(5)}`:value.label;actions.replaceChildren();
    const entry=catalog.get(value.id);
    if(!entry){const text=document.createElement('span');text.textContent='正在读取可用动作…';actions.append(text);refreshMenu();return;}
    for(const action of entry.actions){
      const button=document.createElement('button');button.type='button';button.dataset.testid='home-action';
      button.dataset.itemId=entry.id;button.dataset.actionId=action.id;button.textContent=action.label;
      button.dataset.canonical=action.canonical??action.canonicalId??action.id;button.dataset.description=action.description??'';
      button.addEventListener('click',()=>{
        if(entry.id.startsWith('plot-')&&['look','view','inspect','查看'].includes(button.dataset.canonical)){closeMenu();garden.showDetails(entry.id,button);return;}
        if(button.dataset.canonical==='sow'){closeMenu();garden.chooseCrop(entry,action,button);return;}
        void command(entry,action);
      },{signal});actions.append(button);
    }
    refreshMenu();
  }
  function update(stamp){
    positionMenu();
    if(!life)return;
    const now=life.now+(life.paused?0:Math.max(0,stamp-receivedAt)),current=life.current;
    let position=life.position,word='stand',facing=null,alignment='feet';
    if(current?.phase==='walking'){
      if(!life.paused){const route=routePose(current.route,now,position);position=route.position;facing=route.facing;word=route.moving?'walk':'stand';}
    }else if(current?.phase==='acting'){
      const slot=current.pose??{},caps=actor.getCapabilities();
      const requested=current.word??slot.word??(slot.kind==='seated'?'sit':['sleeping','lying'].includes(slot.kind)?'sleep':'stand');
      const supported=caps.words.includes(requested),bodyPose=['seated','sleeping','lying'].includes(slot.kind);
      const fallback=(Array.isArray(current.fallback)?current.fallback:current.fallback?.position)??slot.fallback?.position??current.approach??position;
      position=bodyPose&&!supported?fallback:(slot.position??slot.feet??position);
      if(slot.support&&(!bodyPose||supported))alignment='support';
      word=supported?requested:(caps.words.includes('look')?'look':'stand');facing=current.facing??slot.facing??null;
      if(bodyPose&&!supported&&!life.paused)activity.textContent=`${catalog.get(current.itemId)?.label??'家具'}旁休息 · 使用已有动作`;
    }
    if(facing?.length===2)facing=[facing[0],0,facing[1]];
    if(Array.isArray(position))actor.setPlacement({position,word,worldFacing:facing,alignment});
  }
  function presence(visible,force=false){
    if(!force&&visible===lastPresence)return;lastPresence=visible;
    try{send(JSON.stringify({type:'presence',visible}));}catch{}
  }
  layer.querySelector('[data-testid=home-menu-close]').addEventListener('click',closeMenu,{signal});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden&&!garden.open){event.preventDefault();event.stopPropagation();closeMenu();}},{signal});
  pauseButton.addEventListener('click',()=>invoke(life?.paused?'resume':'pause'),{signal});
  cancelButton.addEventListener('click',()=>invoke('cancel'),{signal});
  autonomy.addEventListener('change',()=>invoke('settings',[{autonomy:autonomy.checked}]),{signal});
  let down=null;const pointers=new Set();
  scene.canvas.addEventListener('pointerdown',event=>{pointers.add(event.pointerId);down=pointers.size===1&&event.button===0?{x:event.clientX,y:event.clientY,id:event.pointerId}:null;},{signal});
  scene.canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);down=null;},{signal});
  scene.canvas.addEventListener('pointerup',event=>{
    pointers.delete(event.pointerId);const start=down;down=null;
    if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
    const rect=scene.canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    const surface=scene.pickSurface(x,y);if(surface?.itemId)return;closeMenu();if(!surface||surface.normal?.[1]<.8)return;
    const target=scene.pickWalkable?.(x,y),position=target?.position??target?.point;
    if(!position)return;void invoke('walk',[{position}]);
  },{signal});
  void ctx.invoke('catalog').then(result=>{
    if(signal.aborted)return;catalog=new Map(result.items.map(entry=>[entry.id,entry]));
    if(selected)selectItem(scene.getItem(selected));
  }).catch(()=>{if(!signal.aborted)feedback('暂时无法读取家具动作，请重新打开家园。');});
  return {receive,selectItem,update,presence,getState:()=>life?structuredClone(life):null,dispose(){garden.dispose();layer.remove();}};
}
