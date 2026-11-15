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
  layer.innerHTML=`<aside class="coo-home-menu" hidden><div class="coo-home-menu-head"><strong></strong><button type="button" data-testid="home-menu-close" aria-label="关闭动作菜单">×</button></div><div class="coo-home-actions"></div><label class="coo-home-enqueue"><input type="checkbox" data-testid="home-enqueue">排在当前任务之后</label></aside>
    <div class="coo-home-controls"><div class="coo-home-activity" data-testid="home-activity" role="status">正在读取家园进度…</div><div class="coo-home-needs" data-testid="home-needs"></div><div class="coo-home-save" data-testid="home-save-warning" role="status" hidden></div><div class="coo-home-controls-row"><button type="button" data-testid="home-pause">暂停生活</button><button type="button" data-testid="home-cancel" disabled>取消任务</button><label><input type="checkbox" data-testid="home-autonomy">自主生活</label></div></div>`;
  root.append(layer);
  const menu=layer.querySelector('.coo-home-menu'),actions=layer.querySelector('.coo-home-actions');
  const pauseButton=layer.querySelector('[data-testid=home-pause]'),cancelButton=layer.querySelector('[data-testid=home-cancel]');
  const autonomy=layer.querySelector('[data-testid=home-autonomy]'),activity=layer.querySelector('[data-testid=home-activity]');
  let life=null,receivedAt=0,lastPresence=null,lastVisualKey=null,lastRecent=null,catalog=new Map(),selected=null,requestBusy=false;
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
  }
  async function invoke(method,args=[]){
    if(requestBusy||signal.aborted)return;
    requestBusy=true;actions.querySelectorAll('button').forEach(button=>{button.disabled=true;});
    try{const state=await ctx.invoke(method,args);receive(state);return state;}
    catch{feedback(life?.storage?.ok===false?'指令未保存，请检查可用磁盘空间后重试。':'指令未执行，请选可到达的物件或地面重试。');}
    finally{requestBusy=false;if(!signal.aborted)actions.querySelectorAll('button').forEach(button=>{button.disabled=false;});}
  }
  function selectItem(value){
    if(!value)return;selected=value.id;menu.hidden=false;menu.dataset.itemId=value.id;
    menu.querySelector('strong').textContent=value.label;actions.replaceChildren();
    const entry=catalog.get(value.id);
    if(!entry){const text=document.createElement('span');text.textContent='正在读取可用动作…';actions.append(text);return;}
    for(const action of entry.actions){
      const button=document.createElement('button');button.type='button';button.dataset.testid='home-action';
      button.dataset.itemId=entry.id;button.dataset.actionId=action.id;button.textContent=action.label;
      if(action.description)button.title=action.description;
      button.addEventListener('click',async()=>{
        const enqueue=layer.querySelector('[data-testid=home-enqueue]').checked;
        const state=await invoke('command',[{itemId:entry.id,actionId:action.id,enqueue}]);
        if(state){menu.hidden=true;feedback(enqueue?'已加入待办队列。':'已收到，准备过去。');}
      },{signal});actions.append(button);
    }
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
