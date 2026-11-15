import {icon} from './ui-icons.js';
// The panel owns presentation only. Conversation and simulation live in the World.
export function createChatPanel({root,ctx,signal,feedback,onReply=()=>{}}){
  const toggle=document.createElement('button');toggle.type='button';toggle.dataset.testid='home-chat-toggle';toggle.className='coo-tool-button';toggle.innerHTML=`${icon('chat')}<span>家园对话</span>`;toggle.setAttribute('aria-expanded','false');
  root.querySelector('.coo-home-toolbar-actions').insertBefore(toggle,root.querySelector('[data-testid=home-fullscreen]'));
  const drawer=document.createElement('aside');drawer.className='coo-home-chat';drawer.dataset.testid='home-chat-panel';drawer.hidden=true;
  drawer.innerHTML=`<header class="coo-home-chat-head"><div><span class="coo-eyebrow">A LITTLE COMPANY</span><h2>家园对话</h2></div><button type="button" class="coo-icon-button" data-testid="home-chat-close" aria-label="关闭家园对话">${icon('close')}</button></header><p class="coo-home-chat-note">说说今天，也可以一起安排家里的小事。</p>
    <div class="coo-home-chat-log" data-testid="home-chat-log" role="log" aria-label="家园聊天记录"></div><div class="coo-home-chat-partial" data-testid="home-chat-partial" hidden></div><div class="coo-home-chat-status" data-testid="home-chat-status" role="status">正在读取家园对话…</div>
    <form class="coo-home-chat-form"><textarea data-testid="home-chat-input" aria-label="对家园角色说话" maxlength="2000" rows="2" placeholder="今天想一起做点什么？"></textarea><div class="coo-home-chat-actions"><span>Enter 发送 · Shift + Enter 换行</span><button type="button" data-testid="home-chat-cancel" hidden>停止回复</button><button type="submit" data-testid="home-chat-send" aria-label="发送">${icon('send')}</button></div></form><footer class="coo-home-chat-footer"><span>独立的家园记忆</span><button type="button" data-testid="home-chat-clear">清空记录</button></footer>`;
  root.append(drawer);
  const byId=id=>drawer.querySelector(`[data-testid="${id}"]`);
  const log=byId('home-chat-log'),input=byId('home-chat-input'),send=byId('home-chat-send'),cancel=byId('home-chat-cancel'),clear=byId('home-chat-clear'),status=byId('home-chat-status'),partial=byId('home-chat-partial');
  let chat=null,brain=null,initialized=false,seenMessages=new Set(),messageKey='',pendingSend=false;
  function setOpen(open){drawer.hidden=!open;root.classList.toggle('coo-chat-open',open);toggle.setAttribute('aria-expanded',String(open));if(open){input.focus();log.scrollTop=log.scrollHeight;}}
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
  function receive(value){
    if(signal.aborted)return;
    const next=value?.chat;
    if(next&&(!chat||next.revision>=chat.revision)){
      const messages=Array.isArray(next.messages)?next.messages:[];
      const newReplies=initialized?messages.filter(m=>m.role==='assistant'&&!seenMessages.has(m.id)):[];
      chat=next;initialized=true;seenMessages=new Set(messages.map(m=>m.id));
      let stickToEnd=false;const key=JSON.stringify(messages);
      if(key!==messageKey){
        const atEnd=log.scrollHeight-log.clientHeight-log.scrollTop<60;
        log.replaceChildren();
        for(const m of messages){
          const node=document.createElement('div');node.className=`coo-home-chat-message ${m.role==='user'?'from-user':'from-home'}`;
          node.dataset.messageId=m.id;node.dataset.role=m.role;const label=document.createElement('span');label.textContent=m.role==='user'?'你':'家园';
          const body=document.createElement('p');body.textContent=m.text;node.append(label,body);log.append(node);
        }
        if(!messages.length){const empty=document.createElement('p');empty.className='coo-home-chat-empty';empty.textContent='可以聊聊天，也可以说“去喝杯茶”或“给播好的菜浇水”。';log.append(empty);}
        stickToEnd=atEnd;
        messageKey=key;
      }
      paintChat();if(stickToEnd)log.scrollTop=log.scrollHeight;
      for(const reply of newReplies)onReply(reply.text,{utteranceId:reply.id});
    }
    if(value?.brain&&(!brain||value.brain.revision>=brain.revision)){brain=value.brain;}
  }
  async function invoke(method,args=[]){
    const value=await ctx.invoke(method,args);if(!signal.aborted)receive(value);return value;
  }
  input.addEventListener('input',paintChat,{signal});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();if(!send.disabled)drawer.querySelector('.coo-home-chat-form').requestSubmit();}},{signal});
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
  paintChat();
  return {receive,getChatState:()=>chat?structuredClone(chat):null,getBrainState:()=>brain?structuredClone(brain):null,dispose(){root.classList.remove('coo-chat-open');toggle.remove();drawer.remove();}};
}
