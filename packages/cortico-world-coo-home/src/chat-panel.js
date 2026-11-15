// The panel owns presentation only. Conversation and simulation live in the World.
export function createChatPanel({root,ctx,signal,feedback,onReply=()=>{}}){
  const toggle=document.createElement('button');toggle.type='button';toggle.dataset.testid='home-chat-toggle';toggle.textContent='家园对话';toggle.setAttribute('aria-expanded','false');
  root.querySelector('.coo-home-toolbar').insertBefore(toggle,root.querySelector('[data-testid=home-fullscreen]'));
  const drawer=document.createElement('aside');drawer.className='coo-home-chat';drawer.dataset.testid='home-chat-panel';drawer.hidden=true;
  drawer.innerHTML=`<div class="coo-home-chat-head"><strong>家园对话</strong><button type="button" data-testid="home-chat-close" aria-label="关闭家园对话">×</button></div>
    <p class="coo-home-chat-note">沿用当前模型与人格；这里的聊天和生活进度独立保存。</p>
    <div class="coo-home-chat-log" data-testid="home-chat-log" role="log" aria-label="家园聊天记录"></div>
    <div class="coo-home-chat-partial" data-testid="home-chat-partial" hidden></div>
    <div class="coo-home-chat-status" data-testid="home-chat-status" role="status">正在读取家园对话…</div>
    <form class="coo-home-chat-form"><textarea data-testid="home-chat-input" aria-label="对家园角色说话" maxlength="2000" rows="2" placeholder="聊聊天，或告诉我想在家里做什么…"></textarea><div class="coo-home-chat-actions"><button type="submit" data-testid="home-chat-send">发送</button><button type="button" data-testid="home-chat-cancel" hidden>停止回复</button><button type="button" data-testid="home-chat-clear">清空记录</button></div></form>
    <details data-testid="home-brain-settings"><summary>自主计划与桌面汇报</summary><form class="coo-home-brain-form">
      <label><input type="checkbox" data-testid="home-ai-enabled">AI 自主计划（允许后台调用模型）</label>
      <p>需同时开启生活面板的“自主生活”。AI 会偶尔安排活动，也可选择播种、浇水或采收；鼠标和聊天指令优先。关闭 AI 后仍按本地规则生活。</p>
      <label>计划间隔（分钟）<input type="number" min="5" max="1440" step="1" value="30" data-testid="home-ai-interval" required></label>
      <label>家园自主请求上限／天<input type="number" min="0" max="100" step="1" value="12" data-testid="home-ai-calls" required></label>
      <label><input type="checkbox" data-testid="home-desktop-reports" checked>向桌面转达重要家园活动</label>
      <label>主动汇报上限／天<input type="number" min="0" max="24" step="1" value="4" data-testid="home-report-limit" required></label>
      <p>关闭页面且未开启 AI 时，消息只等待桌宠下次对话带出。主动汇报会唤醒桌面主会话；它的后续模型请求由宿主管理，不计入家园自主请求上限。手动聊天也不受这一上限限制，用量遵循当前模型服务。</p>
      <div class="coo-home-brain-usage" data-testid="home-brain-usage"></div><div class="coo-home-brain-usage" data-testid="home-brain-status" role="status"></div><button type="submit" data-testid="home-brain-save" disabled>保存设置</button>
    </form></details>`;
  root.append(drawer);
  const byId=id=>drawer.querySelector(`[data-testid="${id}"]`);
  const log=byId('home-chat-log'),input=byId('home-chat-input'),send=byId('home-chat-send'),cancel=byId('home-chat-cancel'),clear=byId('home-chat-clear'),status=byId('home-chat-status'),partial=byId('home-chat-partial');
  const settingsForm=drawer.querySelector('.coo-home-brain-form'),save=byId('home-brain-save');
  let chat=null,brain=null,initialized=false,seenMessages=new Set(),messageKey='',pendingSend=false,pendingSettings=false,settingsDirty=false;
  function setOpen(open){drawer.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus();}
  toggle.addEventListener('click',()=>setOpen(drawer.hidden),{signal});
  byId('home-chat-close').addEventListener('click',()=>setOpen(false),{signal});
  drawer.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);toggle.focus();event.stopPropagation();}},{signal});
  function paintChat(){
    const running=chat?.job?.status==='running',storageFailed=chat?.storage?.ok===false;
    send.disabled=pendingSend||running||!input.value.trim();
    cancel.hidden=!running;cancel.disabled=pendingSend;
    clear.disabled=pendingSend||running||!chat?.messages?.length;
    const error=chat?.job?.status==='error'&&typeof chat.job.error==='string'?chat.job.error.slice(0,500):null;
    status.textContent=storageFailed?(chat.storage.message??'聊天记录暂时无法保存，请检查可用磁盘空间后重试。'):pendingSend?'正在发送…':running?'正在回应；已经安排的家园活动会继续。':error??(chat?.job?.status==='cancelled'?'回复已停止；已经接受的活动可在生活面板取消。':chat?'家园聊天独立于桌面对话。':'正在读取家园对话…');
    const draft=running&&typeof chat.job.partialText==='string'?chat.job.partialText:'';
    partial.hidden=!draft;partial.textContent=draft;
  }
  function paintBrain(){
    if(!brain)return;
    const s=brain.settings;
    if(!settingsDirty){
      byId('home-ai-enabled').checked=!!s.aiEnabled;byId('home-desktop-reports').checked=!!s.desktopReports;
      byId('home-ai-interval').value=s.intervalMinutes;byId('home-ai-calls').value=s.dailyCalls;byId('home-report-limit').value=s.dailyReports;
    }
    save.disabled=pendingSettings;
    const u=brain.usage??{};
    byId('home-brain-usage').textContent=brain.storage?.ok===false?'设置与额度暂时无法保存，请检查可用磁盘空间。':`${u.day??'今日'} · 自主请求 ${u.calls??0} / ${s.dailyCalls} · 主动汇报 ${u.reports??0} / ${s.dailyReports}`;
    const when=Number.isFinite(brain.nextPlanAt)?new Date(brain.nextPlanAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):null;
    byId('home-brain-status').textContent=!s.aiEnabled?'AI 计划未开启，本地规则生活仍可继续。':brain.job?.status==='running'?'正在安排活动，手动指令随时优先。':brain.job?.status==='error'&&typeof brain.job.error==='string'?brain.job.error.slice(0,500):`下一次计划会在空闲时进行${when?`（最早 ${when}）`:''}。`;
  }
  function receive(value){
    if(signal.aborted)return;
    const next=value?.chat;
    if(next&&(!chat||next.revision>=chat.revision)){
      const messages=Array.isArray(next.messages)?next.messages:[];
      const newReplies=initialized?messages.filter(m=>m.role==='assistant'&&!seenMessages.has(m.id)):[];
      chat=next;initialized=true;seenMessages=new Set(messages.map(m=>m.id));
      const key=JSON.stringify(messages);
      if(key!==messageKey){
        const atEnd=log.scrollHeight-log.clientHeight-log.scrollTop<60;
        log.replaceChildren();
        for(const m of messages){
          const node=document.createElement('div');node.className=`coo-home-chat-message ${m.role==='user'?'from-user':'from-home'}`;
          node.dataset.messageId=m.id;node.dataset.role=m.role;const label=document.createElement('span');label.textContent=m.role==='user'?'你':'家园';
          const body=document.createElement('p');body.textContent=m.text;node.append(label,body);log.append(node);
        }
        if(!messages.length){const empty=document.createElement('p');empty.className='coo-home-chat-empty';empty.textContent='可以聊聊天，也可以说“去喝杯茶”或“给播好的菜浇水”。';log.append(empty);}
        if(atEnd)log.scrollTop=log.scrollHeight;
        messageKey=key;
      }
      paintChat();
      for(const reply of newReplies)onReply(reply.text,{utteranceId:reply.id});
    }
    if(value?.brain&&(!brain||value.brain.revision>=brain.revision)){brain=value.brain;paintBrain();}
  }
  async function invoke(method,args=[]){
    const value=await ctx.invoke(method,args);if(!signal.aborted)receive(value);return value;
  }
  input.addEventListener('input',paintChat,{signal});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();if(!send.disabled)drawer.querySelector('.coo-home-chat-form').requestSubmit();}},{signal});
  drawer.querySelector('.coo-home-chat-form').addEventListener('submit',async event=>{
    event.preventDefault();const text=input.value.trim();if(!text||pendingSend||chat?.job?.status==='running')return;
    pendingSend=true;paintChat();
    try{await invoke('chatSend',[{text,clientId:crypto.randomUUID()}]);if(!signal.aborted&&input.value.trim()===text)input.value='';}
    catch{if(!signal.aborted)feedback('暂时无法发送家园对话，请检查模型配置或连接后重试。');}
    finally{pendingSend=false;if(!signal.aborted)paintChat();}
  },{signal});
  cancel.addEventListener('click',async()=>{try{await invoke('chatCancel',[{jobId:chat?.job?.id}]);}catch{if(!signal.aborted)feedback('暂时无法停止回复，请稍后重试。');}},{signal});
  clear.addEventListener('click',async()=>{
    if(!globalThis.confirm('清空家园聊天记录？家具、菜园进度和桌面聊天都会保留。'))return;
    try{await invoke('chatClear');}catch{if(!signal.aborted)feedback('聊天记录未清空，请稍后重试。');}
  },{signal});
  settingsForm.addEventListener('input',()=>{settingsDirty=true;},{signal});
  settingsForm.addEventListener('submit',async event=>{
    event.preventDefault();if(pendingSettings||!brain||!settingsForm.reportValidity())return;
    const settings={aiEnabled:byId('home-ai-enabled').checked,desktopReports:byId('home-desktop-reports').checked,intervalMinutes:Number(byId('home-ai-interval').value),dailyCalls:Number(byId('home-ai-calls').value),dailyReports:Number(byId('home-report-limit').value)};
    pendingSettings=true;paintBrain();
    try{await invoke('brainSettings',[settings]);settingsDirty=false;if(!signal.aborted){paintBrain();feedback('自主计划与汇报设置已保存。');}}
    catch{if(!signal.aborted)feedback('设置未保存，请检查输入与可用磁盘空间后重试。');}
    finally{pendingSettings=false;if(!signal.aborted)paintBrain();}
  },{signal});
  paintChat();
  return {receive,getChatState:()=>chat?structuredClone(chat):null,getBrainState:()=>brain?structuredClone(brain):null,dispose(){toggle.remove();drawer.remove();}};
}
