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

export function createLifePanel({root,scene,actor,ctx,signal,send,feedback}){
  const layer=document.createElement('div');layer.className='coo-home-life';
  layer.innerHTML=`<aside class="coo-home-menu" hidden><div class="coo-home-menu-head"><strong></strong><button type="button" data-testid="home-menu-close" aria-label="关闭动作菜单">×</button></div><div class="coo-home-plot-details" data-testid="home-plot-details" hidden></div><div class="coo-home-actions"></div><label class="coo-home-enqueue"><input type="checkbox" data-testid="home-enqueue">排在当前任务之后</label></aside>
    <div class="coo-home-controls"><div class="coo-home-activity" data-testid="home-activity" role="status">正在读取家园进度…</div><div class="coo-home-needs" data-testid="home-needs"></div><div class="coo-home-save" data-testid="home-save-warning" role="status" hidden></div><div class="coo-home-controls-row"><button type="button" data-testid="home-pause">暂停生活</button><button type="button" data-testid="home-cancel" disabled>取消任务</button><label><input type="checkbox" data-testid="home-autonomy">自主生活</label></div></div>`;
  root.append(layer);
  const menu=layer.querySelector('.coo-home-menu'),actions=layer.querySelector('.coo-home-actions');
  const pauseButton=layer.querySelector('[data-testid=home-pause]'),cancelButton=layer.querySelector('[data-testid=home-cancel]');
  const autonomy=layer.querySelector('[data-testid=home-autonomy]'),activity=layer.querySelector('[data-testid=home-activity]');
  const plotDetails=layer.querySelector('[data-testid=home-plot-details]'),enqueueInput=layer.querySelector('[data-testid=home-enqueue]');
  let life=null,receivedAt=0,lastPresence=null,lastVisualKey=null,lastGardenKey=null,lastRecent=null,catalog=new Map(),selected=null,requestBusy=false;
  function refreshMenu(){
    const plot=life?.garden?.plots.find(value=>value.id===selected);
    plotDetails.hidden=!plot;
    if(plot){
      const stages={empty:'等待播种',seeded:'已播种 · 等待首次浇水',seedling:'幼苗',growing:'生长中',ripe:'已成熟 · 可以采收'};
      plotDetails.dataset.plotId=plot.id;plotDetails.dataset.stage=plot.stage;plotDetails.dataset.growth=String(plot.growth);
      const remaining=plot.needsFirstWater?`浇水后约 ${Math.ceil(plot.durationMs/60000)} 分钟成熟`:['seedling','growing'].includes(plot.stage)?`${Math.floor(plot.growth*100)}% · 约 ${Math.max(1,Math.ceil(plot.remainingMs/60000))} 分钟后成熟`:'';
      plotDetails.textContent=[stages[plot.stage],remaining,`累计采收 ${plot.harvests} 次`].filter(Boolean).join(' ｜ ');
    }
    const queued=enqueueInput.checked&&life?.current?.source==='manual';
    actions.querySelectorAll('button').forEach(button=>{
      const unavailable=plot?.actions?.[button.dataset.canonical]===false;
      button.disabled=requestBusy||!!(unavailable&&!queued);
      button.title=unavailable?(queued?'开始任务时按菜畦的实际状态执行。':'当前菜畦状态暂不支持此动作。'):(button.dataset.description??'');
    });
  }
  function receive(state){
    if(signal.aborted||!state?.life)return;
    const next=state.life;
    if(life&&(next.revision<life.revision||next.revision===life.revision&&next.now<life.now))return;
    const hadState=!!life;life=next;receivedAt=performance.now();
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
    pauseButton.textContent=life.paused?'继续生活':'暂停生活';cancelButton.disabled=!current&&!life.queue?.length;
    autonomy.checked=!!life.autonomy;
    const saveWarning=layer.querySelector('.coo-home-save');saveWarning.hidden=life.storage?.ok!==false;
    saveWarning.textContent=life.storage?.ok===false?'进度暂时无法保存，请检查可用磁盘空间。':'';
    const labels={energy:'精力',hunger:'饱腹',hygiene:'整洁',comfort:'舒适'};
    layer.querySelector('.coo-home-needs').textContent=Object.entries(labels).filter(([key])=>Number.isFinite(life.needs?.[key])).map(([key,label])=>`${label} ${Math.round(life.needs[key])}`).join(' · ');
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
  function selectItem(value){
    if(!value)return;selected=value.id;menu.hidden=false;menu.dataset.itemId=value.id;
    menu.querySelector('strong').textContent=value.label;actions.replaceChildren();
    const entry=catalog.get(value.id);
    if(!entry){const text=document.createElement('span');text.textContent='正在读取可用动作…';actions.append(text);refreshMenu();return;}
    for(const action of entry.actions){
      const button=document.createElement('button');button.type='button';button.dataset.testid='home-action';
      button.dataset.itemId=entry.id;button.dataset.actionId=action.id;button.textContent=action.label;
      button.dataset.canonical=action.canonical??action.canonicalId??action.id;button.dataset.description=action.description??'';
      button.addEventListener('click',async()=>{
        const enqueue=layer.querySelector('[data-testid=home-enqueue]').checked;
        const state=await invoke('command',[{itemId:entry.id,actionId:action.id,enqueue}]);
        if(state){
          const queued=state.life?.queue?.some(task=>task.itemId===entry.id&&task.actionId===action.id);
          menu.hidden=true;feedback(queued?'已加入待办队列。':'已收到，准备过去。');
        }
      },{signal});actions.append(button);
    }
    refreshMenu();
  }
  function update(stamp){
    if(!life)return;
    const now=life.now+(life.paused?0:Math.max(0,stamp-receivedAt)),current=life.current;
    let position=life.position,word='stand',facing=null;
    if(current?.phase==='walking'){
      if(!life.paused){const route=routePose(current.route,now,position);position=route.position;facing=route.facing;word=route.moving?'walk':'stand';}
    }else if(current?.phase==='acting'){
      const slot=current.pose??{},caps=actor.getCapabilities();
      const requested=current.word??slot.word??(slot.kind==='seated'?'sit':['sleeping','lying'].includes(slot.kind)?'sleep':'stand');
      const supported=caps.words.includes(requested),bodyPose=['seated','sleeping','lying'].includes(slot.kind);
      const fallback=(Array.isArray(current.fallback)?current.fallback:current.fallback?.position)??slot.fallback?.position??current.approach??position;
      position=bodyPose&&!supported?fallback:(slot.position??slot.feet??position);
      word=supported?requested:(caps.words.includes('look')?'look':'stand');facing=current.facing??slot.facing??null;
      if(bodyPose&&!supported&&!life.paused)activity.textContent=`${catalog.get(current.itemId)?.label??'家具'}旁休息 · 使用已有动作`;
    }
    if(facing?.length===2)facing=[facing[0],0,facing[1]];
    if(Array.isArray(position))actor.setPlacement({position,word,worldFacing:facing});
  }
  function presence(visible,force=false){
    if(!force&&visible===lastPresence)return;lastPresence=visible;
    try{send(JSON.stringify({type:'presence',visible}));}catch{}
  }
  layer.querySelector('[data-testid=home-menu-close]').addEventListener('click',()=>{menu.hidden=true;},{signal});
  enqueueInput.addEventListener('change',refreshMenu,{signal});
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
    const surface=scene.pickSurface(x,y);if(!surface||surface.itemId||surface.normal?.[1]<.8)return;
    const target=scene.pickWalkable?.(x,y),position=target?.position??target?.point;
    if(!position)return;menu.hidden=true;void invoke('walk',[{position}]);
  },{signal});
  void ctx.invoke('catalog').then(result=>{
    if(signal.aborted)return;catalog=new Map(result.items.map(entry=>[entry.id,entry]));
    if(selected)selectItem(scene.getItem(selected));
  }).catch(()=>{if(!signal.aborted)feedback('暂时无法读取家具动作，请重新打开家园。');});
  return {receive,selectItem,update,presence,getState:()=>life?structuredClone(life):null,dispose(){layer.remove();}};
}
