// Native World panels: no scene, frame loop, figure or audio instances here.
function page(ctx,id,title,note){
  const document=ctx.root.ownerDocument,root=document.createElement('section');root.className='coo-settings-page';root.dataset.testid=id;
  const heading=document.createElement('h2'),intro=document.createElement('p');heading.textContent=title;intro.className='coo-settings-note';intro.textContent=note;root.append(heading,intro);ctx.root.append(root);
  const abort=new AbortController(),signal=abort.signal;let disposed=false,stream=null,guard=null;
  function dispose(){if(disposed)return;disposed=true;abort.abort();ctx.signal.removeEventListener('abort',dispose);stream?.dispose();guard?.dispose();root.remove();}
  ctx.signal.addEventListener('abort',dispose,{once:true});if(ctx.signal.aborted)dispose();
  return{root,signal,dispose,byId:id=>root.querySelector(`[data-testid="${id}"]`),guard(fn){guard=ctx.guardLeave?.(fn);},subscribe(receive,onClose){
    if(signal.aborted)return;
    stream=ctx.stream({message(text){if(signal.aborted)return;try{receive(JSON.parse(text));}catch{}},close(retry){if(!signal.aborted)onClose?.(retry);}});
  }};
}

export async function mountSettings(ctx){
  const p=page(ctx,'home-settings-page','家园配置','设置独立家园的生活节奏与消息转达。修改后在本页保存。'),{root,signal,byId}=p;
  root.insertAdjacentHTML('beforeend',`<section class="coo-settings-card"><h3>日常生活</h3>
    <form class="coo-settings-form" data-testid="home-life-settings"><fieldset disabled>
      <label class="coo-field coo-field-toggle"><input type="checkbox" data-testid="home-autonomy-enabled">自主生活</label>
      <p class="coo-settings-note">开启后按本地规则休息、用餐、阅读和照料已播种的菜畦，不调用模型。关闭页面后继续轻量推进，手动指令始终优先。</p>
      <div class="coo-settings-actions"><button type="submit" data-testid="home-life-save">保存生活设置</button></div>
    </fieldset></form><p class="coo-settings-status" role="status" data-testid="home-life-settings-status">正在读取生活设置…</p>
  </section><section class="coo-settings-card"><h3>AI 自主计划与桌面转达</h3>
    <form class="coo-settings-form" data-testid="home-ai-settings"><fieldset disabled>
      <label class="coo-field coo-field-toggle"><input type="checkbox" data-testid="home-ai-enabled">AI 自主计划（允许后台调用模型）</label>
      <p class="coo-settings-note">需同时开启自主生活。AI 会在空闲时安排一项活动，也可选择种植与采收；鼠标和聊天指令优先。关闭 AI 后，本地规则生活仍可继续。</p>
      <label class="coo-field">计划间隔（分钟）<input type="number" min="5" max="1440" step="1" data-testid="home-ai-interval" required></label>
      <label class="coo-field">家园自主请求上限／天<input type="number" min="0" max="100" step="1" data-testid="home-ai-calls" required></label>
      <p class="coo-settings-note">每次模型请求都会计入，包括工具调用后的续轮。手动家园聊天不占这一额度，费用遵循当前模型服务。</p>
      <label class="coo-field coo-field-toggle"><input type="checkbox" data-testid="home-desktop-reports">向桌面转达重要家园活动</label>
      <label class="coo-field">主动汇报上限／天<input type="number" min="0" max="24" step="1" data-testid="home-report-limit" required></label>
      <p class="coo-settings-note">重要消息至少间隔 15 分钟汇总一次。关闭家园页面且未开启 AI 时，只等待桌宠下次对话带出；其他情况下可主动唤醒桌面主会话。主动汇报额度用完后仍可随下次对话带出。桌面后续模型请求由宿主管理，不计入家园自主请求额度。</p>
      <div class="coo-settings-actions"><button type="submit" data-testid="home-brain-save">保存 AI 与转达设置</button></div>
    </fieldset></form><p class="coo-settings-usage" data-testid="home-brain-usage"></p><p class="coo-settings-status" role="status" data-testid="home-brain-status">正在读取 AI 设置…</p>
  </section>`);
  const lifeForm=byId('home-life-settings'),brainForm=byId('home-ai-settings'),lifeFields=lifeForm.querySelector('fieldset'),brainFields=brainForm.querySelector('fieldset');
  const lifeStatus=byId('home-life-settings-status'),brainStatus=byId('home-brain-status');
  let life=null,brain=null,lifeDirty=false,brainDirty=false,lifePending=false,brainPending=false;
  function receive(value){
    if(signal.aborted)return;
    if(value?.life&&(!life||value.life.revision>=life.revision)){life=value.life;if(!lifeDirty&&!lifePending)byId('home-autonomy-enabled').checked=!!life.autonomy;lifeFields.disabled=lifePending;
      if(life.storage?.ok===false)lifeStatus.textContent=life.storage.message??'生活设置暂时无法保存。';else if(!lifeDirty&&!lifePending)lifeStatus.textContent=life.autonomy?'自主生活已开启。':'自主生活已关闭，仍可手动安排活动。';}
    if(value?.brain&&(!brain||value.brain.revision>=brain.revision)){
      brain=value.brain;const s=brain.settings,u=brain.usage??{};
      if(!brainDirty&&!brainPending){byId('home-ai-enabled').checked=!!s.aiEnabled;byId('home-desktop-reports').checked=!!s.desktopReports;byId('home-ai-interval').value=s.intervalMinutes;byId('home-ai-calls').value=s.dailyCalls;byId('home-report-limit').value=s.dailyReports;}
      brainFields.disabled=brainPending;byId('home-brain-usage').textContent=`${u.day??'当前记录日'} · 自主请求 ${u.calls??0} / ${s.dailyCalls} · 主动汇报 ${u.reports??0} / ${s.dailyReports}`;
      if(brain.storage?.ok===false)brainStatus.textContent=brain.storage.message??'AI 设置暂时无法保存。';
      else if(!brainDirty&&!brainPending)brainStatus.textContent=!s.aiEnabled?'AI 自主计划未开启。':brain.job?.status==='running'?'正在安排活动，手动指令随时优先。':life&&!life.autonomy?'AI 已开启；开启自主生活后才会安排计划。':'AI 自主计划已开启，会在空闲时安排活动。';
    }
  }
  p.guard(()=>lifeDirty||brainDirty||lifePending||brainPending?'家园配置尚未保存，是否离开此页？':null);
  lifeForm.addEventListener('input',()=>{lifeDirty=true;lifeStatus.textContent='有尚未保存的生活设置。';},{signal});
  brainForm.addEventListener('input',()=>{brainDirty=true;brainStatus.textContent='有尚未保存的 AI 与转达设置。';},{signal});
  lifeForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!life||lifePending)return;lifePending=true;lifeFields.disabled=true;lifeStatus.textContent='正在保存…';
    try{const value=await ctx.invoke('settings',[{autonomy:byId('home-autonomy-enabled').checked}]);if(signal.aborted)return;lifeDirty=false;lifePending=false;receive(value);lifeStatus.textContent='生活设置已保存。';}
    catch{if(!signal.aborted)lifeStatus.textContent='生活设置未保存，请检查连接与可用磁盘空间后重试。';}
    finally{lifePending=false;if(!signal.aborted)lifeFields.disabled=!life;}
  },{signal});
  brainForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!brain||brainPending||!brainForm.reportValidity())return;
    const settings={aiEnabled:byId('home-ai-enabled').checked,desktopReports:byId('home-desktop-reports').checked,intervalMinutes:Number(byId('home-ai-interval').value),dailyCalls:Number(byId('home-ai-calls').value),dailyReports:Number(byId('home-report-limit').value)};
    brainPending=true;brainFields.disabled=true;brainStatus.textContent='正在保存…';
    try{const value=await ctx.invoke('brainSettings',[settings]);if(signal.aborted)return;brainDirty=false;brainPending=false;receive(value);brainStatus.textContent='AI 与转达设置已保存。';}
    catch{if(!signal.aborted)brainStatus.textContent='设置未保存，请检查输入、连接与可用磁盘空间后重试。';}
    finally{brainPending=false;if(!signal.aborted)brainFields.disabled=!brain;}
  },{signal});
  try{p.subscribe(receive,retry=>{if(retry){lifeStatus.textContent='连接中断，正在恢复…';brainStatus.textContent='连接中断，正在恢复…';}});receive(await ctx.invoke('status'));}
  catch{if(!signal.aborted){lifeStatus.textContent='暂时无法读取配置，请重新打开此页。';brainStatus.textContent='暂时无法读取配置，请重新打开此页。';}}
  return{dispose:p.dispose,getState:()=>({life,brain})};
}

export async function mountEnvironment(ctx){
  const p=page(ctx,'home-environment-page','家园环境提示词','描述家园的环境、生活方式和交流背景，仅用于家园独立聊天与可选 AI 自主计划。'),{root,signal,byId}=p;
  root.insertAdjacentHTML('beforeend',`<section class="coo-settings-card"><h3>环境说明</h3>
    <p class="coo-settings-note">保存后从下一次家园请求开始生效。这里不会改写桌面人格、桌面对话或角色外观，也不会授予额外工具权限。</p>
    <form class="coo-settings-form" data-testid="home-environment-form"><label class="coo-field">家园环境文本<textarea class="coo-environment-input" data-testid="home-environment-input" rows="16" maxlength="8000" spellcheck="false" disabled></textarea></label>
      <p class="coo-environment-count" data-testid="home-environment-count">0 / 8000</p>
      <div class="coo-settings-actions"><button type="submit" data-testid="home-environment-save" disabled>保存环境说明</button><button type="button" data-testid="home-environment-reset" disabled>恢复默认并保存</button><button type="button" data-testid="home-environment-reload">重新载入</button></div>
    </form><p class="coo-settings-status" role="status" data-testid="home-environment-status">正在读取环境说明…</p>
  </section>`);
  const input=byId('home-environment-input'),save=byId('home-environment-save'),reset=byId('home-environment-reset'),reload=byId('home-environment-reload'),status=byId('home-environment-status'),count=byId('home-environment-count');
  let environment=null,baseRevision=null,dirty=false,pending=false;
  function paint(){const unavailable=!environment||environment.storage?.editable===false;input.disabled=pending||unavailable;save.disabled=pending||unavailable||!dirty;reset.disabled=pending||unavailable;reload.disabled=pending;count.textContent=`${input.value.length} / ${environment?.maxLength??8000}`;}
  function receive(value,{force=false}={}){
    if(signal.aborted)return;const next=value?.environment;if(!next||environment&&next.revision<environment.revision)return;
    environment=next;if(force||!dirty&&!pending){input.value=next.text;input.maxLength=next.maxLength;baseRevision=next.revision;dirty=false;}
    if(next.storage?.ok===false)status.textContent=next.storage.message??'环境说明暂时不可用，原文件已保留。';
    else if(dirty&&next.revision!==baseRevision)status.textContent='环境说明已在另一页面更新。当前草稿保留，请先重新载入最新内容。';
    else if(!dirty&&!pending)status.textContent=next.isDefault?'正在使用默认环境说明。':'正在使用已保存的自定义环境说明。';
    paint();
  }
  p.guard(()=>dirty||pending?'家园环境说明尚未保存，是否离开此页？':null);
  input.addEventListener('input',()=>{dirty=input.value!==environment?.text;status.textContent=dirty?'有尚未保存的环境说明。':'内容与已保存版本一致。';paint();},{signal});
  async function persist(method){
    if(pending||!environment||environment.storage?.editable===false)return;
    const args={revision:baseRevision,...(method==='environmentSave'?{text:input.value}:{})};pending=true;paint();status.textContent='正在保存…';
    try{const value=await ctx.invoke(method,[args]);if(signal.aborted)return;pending=false;receive(value,{force:true});status.textContent=method==='environmentReset'?'已恢复默认环境说明。':'环境说明已保存，将从下一次家园请求开始生效。';}
    catch{if(!signal.aborted)status.textContent='环境说明未保存。若另一页面已更新，请重新载入；也请检查连接与可用磁盘空间。';}
    finally{pending=false;if(!signal.aborted)paint();}
  }
  byId('home-environment-form').addEventListener('submit',event=>{event.preventDefault();if(!save.disabled)void persist('environmentSave');},{signal});
  reset.addEventListener('click',()=>void persist('environmentReset'),{signal});
  reload.addEventListener('click',async()=>{
    if(dirty&&!root.ownerDocument.defaultView.confirm('重新载入将放弃本页尚未保存的修改，继续吗？'))return;
    pending=true;paint();
    try{const value=await ctx.invoke('environmentGet');pending=false;receive(value,{force:true});}
    catch{if(!signal.aborted)status.textContent='暂时无法载入环境说明，当前草稿已保留。';}
    finally{pending=false;if(!signal.aborted)paint();}
  },{signal});
  try{p.subscribe(receive,retry=>{if(retry)status.textContent='连接中断，草稿保留，正在恢复…';});receive(await ctx.invoke('environmentGet'));}
  catch{if(!signal.aborted)status.textContent='暂时无法读取环境说明，请点重新载入。';}
  return{dispose:p.dispose,getState:()=>environment?structuredClone(environment):null};
}
