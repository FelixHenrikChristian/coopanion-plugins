const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function mountLulu(ctx){
  const root=el('div');root.className='lulu-panel';ctx.root.replaceChildren(root);
  const title=el('h2','噜噜的衣橱'),intro=el('p','给噜噜换件衣服，也可以摘下小鸟包包。'),status=el('p','正在连接桌宠…');status.setAttribute('role','status');
  const install=el('button','安装噜噜角色包'),refresh=el('button','刷新'),row=el('div'),choices=el('div'),profile=el('button','导出装扮工作室配置');row.className='lulu-actions';choices.className='lulu-choices';row.append(install,refresh);root.replaceChildren(title,intro,row,status,choices,profile);
  let busy=false,installed=false;
  function setBusy(value){busy=value;for(const b of root.querySelectorAll('button'))b.disabled=value;for(const b of choices.querySelectorAll('button'))b.disabled=value||!installed;install.disabled=value||installed;}
  async function load(){const s=await ctx.invoke('state');if(ctx.signal.aborted)return;installed=s.installed;status.textContent=s.error??(installed?'噜噜已安装，选择一件装扮吧。':'先安装角色包，再选择装扮。');choices.replaceChildren();for(const[id,label]of Object.entries(s.schemes)){const button=el('button',label);button.disabled=busy||!installed;button.setAttribute('aria-pressed',String(s.current?.figure==='lulu-capybara'&&s.current.scheme===id));button.addEventListener('click',()=>action(async()=>{await ctx.invoke('choose',[id]);await load();status.textContent='已换上：'+label;}),{signal:ctx.signal});choices.append(button);}setBusy(busy);}
  async function action(fn){if(busy)return;setBusy(true);try{await fn();}catch(e){if(!ctx.signal.aborted)status.textContent=e.message;}finally{if(!ctx.signal.aborted)setBusy(false);}}
  install.addEventListener('click',()=>action(async()=>{status.textContent='正在下载并校验角色包…';await ctx.invoke('install');await load();}),{signal:ctx.signal});
  refresh.addEventListener('click',()=>action(load),{signal:ctx.signal});
  profile.addEventListener('click',()=>action(async()=>{const p=await ctx.invoke('profile');if(ctx.signal.aborted)return;const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=el('a');a.download='lulu-wardrobe.profile.json';a.href=url;root.append(a);a.click();a.remove();URL.revokeObjectURL(url);status.textContent='在装扮工作室的“导入配置”中选择刚下载的文件。';}),{signal:ctx.signal});
  void action(load);return{dispose(){root.remove();}};
}
export default{panels:{lulu:{mount:mountLulu}}};
