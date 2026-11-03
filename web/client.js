const WORDS={
 zh:{title:'衣橱',intro:'选择服装后，只显示对应的搭配选项。',refresh:'刷新',restore:'恢复原外观',profile:'形象',noProfiles:'还没有导入衣橱配置。可在下方导入 JSON；原有形象包保持不变。',outfit:'服装',options:'搭配选项',apply:'应用装扮',applying:'正在应用…',applied:'已应用',current:'当前外观',preview:'搭配预览',local:'所有配置只保存在本机',connected:'桌宠已连接',offline:'桌宠未连接',importTitle:'导入衣橱配置',importHelp:'导入分组和装扮 ID 映射，不包含图片、视频或生成模型。',import:'导入配置',file:'选择 JSON 文件',remove:'移除本地配置',guide:'角色制作指导',guideIntro:'从角色参考到连续动画和桌宠验收。点击阶段查看执行要求。',demo:'虚构示例 · 演示服务',ready:'配置已载入，点击应用后切换。',restored:'恢复结果',loading:'正在读取衣橱…',error:'操作未完成',emptyOptions:'这套服装没有额外配置项。',invalid:'请检查 JSON 配置。',back:'返回衣橱',pending:'未应用的选择'},
 en:{title:'Wardrobe',intro:'Choose an outfit, then configure the options that belong to it.',refresh:'Refresh',restore:'Restore previous appearance',profile:'Figure',noProfiles:'Import a wardrobe JSON below. Existing figure files remain unchanged.',outfit:'Outfit',options:'Outfit options',apply:'Apply to desktop pet',applying:'Applying…',applied:'Applied',current:'Current appearance',preview:'Combination preview',local:'Profiles stay on this device',connected:'Desktop pet connected',offline:'Desktop pet offline',importTitle:'Import wardrobe profile',importHelp:'Import outfit groups and existing scheme mappings, without media or models.',import:'Import profile',file:'Choose JSON file',remove:'Remove local profile',guide:'Authoring guide',guideIntro:'From character reference to reviewed continuous animation and runtime integration.',demo:'Fictional example · demo service',ready:'Choice loaded. Apply to switch appearance.',restored:'Restoration result',loading:'Loading wardrobe…',error:'Action incomplete',emptyOptions:'This outfit has no additional controls.',invalid:'Check the wardrobe JSON.',back:'Back to wardrobe',pending:'Unapplied choice'}
};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function inline(target,text){for(const part of text.split(/(`[^`]+`)/g))target.append(part.startsWith('`')&&part.endsWith('`')?el('code',part.slice(1,-1)):document.createTextNode(part));}
/** Small text-only Markdown renderer. Never accepts HTML or remote assets. */
function renderDocument(target,text){
 const lines=text.replace(/\r/g,'').split('\n');
 for(let i=0;i<lines.length;){
  const line=lines[i];if(!line.trim()){i++;continue;}
  if(line.startsWith('```')){const code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;const pre=el('pre');pre.append(el('code',code.join('\n')));target.append(pre);continue;}
  if(/^#{1,4} /.test(line)){const heading=el('h3');inline(heading,line.replace(/^#+ /,''));target.append(heading);i++;continue;}
  if(line.startsWith('|')&&/^\|[\s:|\-]+\|\s*$/.test(lines[i+1]??'')){
   const wrap=el('div',undefined,'ws-table-wrap'),table=el('table'),cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
   const header=el('tr');for(const x of cells(line)){const c=el('th');inline(c,x);header.append(c);}table.append(header);i+=2;
   while(i<lines.length&&lines[i].startsWith('|')){const row=el('tr');for(const x of cells(lines[i++])){const c=el('td');inline(c,x);row.append(c);}table.append(row);}wrap.append(table);target.append(wrap);continue;
  }
  if(/^\d+\. /.test(line)||/^- /.test(line)){const ordered=/^\d/.test(line),list=el(ordered?'ol':'ul');while(i<lines.length&&(ordered?/^\d+\. /:/^- /).test(lines[i])){const item=el('li');inline(item,lines[i++].replace(/^(\d+\.|-) /,''));list.append(item);}target.append(list);continue;}
  const p=el('p'),paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,4} |```|\||\d+\. |- )/.test(lines[i]))paragraph.push(lines[i++]);inline(p,paragraph.join(' '));target.append(p);
 }
}
function download(root,name,text,mime='application/json'){
 const url=URL.createObjectURL(new Blob([text],{type:mime})),a=el('a');a.href=url;a.download=name;root.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function helperWords(language){return language==='zh'||language==='zh-Hant'?{format:'格式说明',example:'下载虚构示例',schema:'下载 JSON Schema',check:'校验配置',checked:'配置结构与已安装 ID 校验通过',scope:'此结果不代表动作或表情已经验收。',catalog:'查看本机装扮 ID',manual:'下载完整制作指南',intro:'先完成并安装角色资源包，再导入衣橱分组。下方包含输入／输出、提示词、验收步骤和完整 JSON 格式。',local:'下面是本机角色元数据，包含个人角色时不要公开导出。'}:{format:'Format reference',example:'Download fictional example',schema:'Download JSON Schema',check:'Check configuration',checked:'Structure and installed IDs are valid',scope:'This does not approve animation or expression coverage.',catalog:'Installed figure/scheme IDs',manual:'Download complete manual',intro:'Create and install a working figure pack first, then import wardrobe groups. Stages include inputs/outputs, prompts, acceptance steps and the complete JSON format.',local:'These are local character metadata. Do not publish exports containing personal characters.'};}
function mountWardrobeView(ctx,initial={}){
 const t=WORDS[ctx.language==='zh'||ctx.language==='zh-Hant'?'zh':'en'],h=helperWords(ctx.language),root=ctx.root;
 root.classList.add('ws-root');let data=null,selectedProfile=initial.selectedProfile??null,selectedOutfit=initial.selectedOutfit??null,pick={...initial.pick},busy=false,renderEvents=new AbortController(),imageEpoch=0;
 const imageUrls=new Set(),thumbnails=new Map();
 ctx.signal.addEventListener('abort',()=>renderEvents.abort(),{once:true});
 const header=el('div',undefined,'ws-header'),title=el('div');title.append(el('h2',t.title),el('p',t.intro));
 const tools=el('div',undefined,'ws-tools'),refresh=el('button',t.refresh),restore=el('button',t.restore);tools.append(refresh,restore);header.append(title,tools);
 const message=el('p',t.loading,'ws-message');message.setAttribute('role','status');
 const grid=el('div',undefined,'ws-settings'),left=el('section',undefined,'ws-wardrobe-rows'),middle=el('section',undefined,'ws-controls'),right=el('section',undefined,'ws-preview');
 const profileRow=el('div',undefined,'ws-setting-row'),profileLabel=el('label',t.profile,'ws-row-label'),profileSelect=el('select');profileSelect.setAttribute('aria-label',t.profile);profileLabel.append(profileSelect);profileRow.append(profileLabel);
 const outfitRow=el('div',undefined,'ws-setting-row'),outfitLabel=el('span',t.outfit,'ws-row-label'),outfits=el('div',undefined,'ws-outfits');outfitRow.append(outfitLabel,outfits);left.append(profileRow,outfitRow);
 const options=el('div',undefined,'ws-options'),apply=el('button',t.apply,'ws-primary'),applyRow=el('div',undefined,'ws-apply-row');applyRow.append(apply,message);middle.append(options,applyRow);
 const current=el('span',undefined,'ws-current'),preview=el('div',undefined,'ws-character'),choice=el('span',undefined,'ws-stage-choice'),connection=el('span',undefined,'ws-connection'),stageFooter=el('div',undefined,'ws-stage-footer');preview.setAttribute('aria-label',t.preview);stageFooter.append(current,connection);right.append(preview,choice,stageFooter);
 grid.append(left,middle);
 const details=el('details',undefined,'ws-import'),summary=el('summary',t.importTitle),editor=el('textarea');editor.setAttribute('aria-label','Wardrobe JSON');editor.spellcheck=false;editor.value=initial.editor??'';details.open=initial.importOpen??false;
 const file=el('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label',t.file);
 const importer=el('button',t.import),remove=el('button',t.remove),checker=el('button',h.check),format=el('button',h.format),example=el('button',h.example),schema=el('button',h.schema),help=el('div',undefined,'ws-doc-content'),helpTools=el('div',undefined,'ws-help-tools');help.hidden=true;
 const catalog=el('details',undefined,'ws-catalog'),catalogText=el('pre'),importMessage=el('p');importMessage.setAttribute('role','status');catalog.append(el('summary',h.catalog),el('p',h.local),catalogText);
 helpTools.append(format,example,schema);details.append(summary,el('p',t.importHelp),helpTools,help,catalog,file,editor,checker,importer,remove,importMessage);
 root.replaceChildren(header,right,grid,details);
 function on(node,type,fn){node.addEventListener(type,fn,{signal:ctx.signal});}
 function onRendered(node,type,fn){node.addEventListener(type,fn,{signal:renderEvents.signal});}
 function profile(){return data?.profiles.find(p=>p.id===selectedProfile);}
 function outfit(){return profile()?.outfits.find(o=>o.id===selectedOutfit);}
 function variant(){return outfit()?.variants.find(v=>Object.entries(pick).every(([k,x])=>v.pick[k]===x));}
 function releaseImages(){imageEpoch++;for(const url of imageUrls)URL.revokeObjectURL(url);imageUrls.clear();}
 function drawCharacter(target,p,o,v){
   if(data.demo){target.replaceChildren(fictionalFox(v?.scheme));return;}
   target.replaceChildren(el('span','◇','ws-hanger'));
   if(!v||typeof ctx.invokeBinary!=='function'){target.title=t.preview+' · unavailable';return;}
   const epoch=imageEpoch,key=p.figure+'/'+v.scheme;let request=thumbnails.get(key);
   if(!request){request=ctx.invokeBinary('thumbnail',[{profile:p.id,outfit:o.id,pick:v.pick}]);thumbnails.set(key,request);if(thumbnails.size>16)thumbnails.delete(thumbnails.keys().next().value);}
   void request.then(blob=>{if(ctx.signal.aborted||epoch!==imageEpoch)return;const url=URL.createObjectURL(blob);imageUrls.add(url);const img=el('img');img.alt=p.label+' · '+o.label;img.src=url;target.replaceChildren(img);}).catch(error=>{thumbnails.delete(key);target.title=t.preview+' · '+error.message;console.warn('Wardrobe preview unavailable:',error.message);});
 }
 function setBusy(value){busy=value;if(ctx.languageSelect)ctx.languageSelect.disabled=value;refresh.disabled=restore.disabled=importer.disabled=checker.disabled=remove.disabled=profileSelect.disabled=value;apply.disabled=value||!variant()||!data?.connected;apply.textContent=value?t.applying:t.apply;for(const b of outfits.querySelectorAll('button'))b.disabled=value;for(const b of options.querySelectorAll('button'))b.disabled=value||b.dataset.valid==='false';}
 function chooseOutfit(o){message.textContent=t.ready;selectedOutfit=o.id;const defaults=Object.fromEntries(o.controls.map(c=>[c.id,c.default??c.options[0].id]));pick=(o.variants.find(v=>Object.entries(defaults).every(([k,x])=>v.pick[k]===x))??o.variants[0]).pick;pick={...pick};render();}
 function render(){
   if(!data)return;
   renderEvents.abort();renderEvents=new AbortController();releaseImages();
   profileSelect.replaceChildren(...data.profiles.map(p=>{const op=el('option',p.label);op.value=p.id;return op;}));profileSelect.value=selectedProfile??'';
   outfits.replaceChildren();const p=profile();
   if(!p){message.textContent=t.noProfiles;options.replaceChildren();preview.replaceChildren();choice.textContent='';current.textContent=data.current?`${data.current.figure} / ${data.current.scheme}`:'—';apply.disabled=true;return;}
   for(const o of p.outfits){const b=el('button',undefined,'ws-outfit'),portrait=el('span',undefined,'ws-outfit-portrait');b.append(portrait,el('span',o.label,'ws-outfit-name'));b.setAttribute('aria-label',o.label);b.setAttribute('aria-pressed',String(o.id===selectedOutfit));drawCharacter(portrait,p,o,o.id===selectedOutfit?variant():o.variants[0]);onRendered(b,'click',()=>chooseOutfit(o));outfits.append(b);}
   options.replaceChildren();const o=outfit();
   if(o)for(const c of o.controls){
     const field=el('fieldset'),legend=el('legend',c.label),row=el('div',undefined,'ws-choice-row');field.append(legend,row);
     for(const option of c.options){const b=el('button',option.label);b.setAttribute('aria-pressed',String(pick[c.id]===option.id));
       b.dataset.valid=String(o.variants.some(v=>v.pick[c.id]===option.id&&Object.entries(pick).every(([k,x])=>k===c.id||v.pick[k]===x)));b.disabled=busy||b.dataset.valid==='false';
       onRendered(b,'click',()=>{pick={...pick,[c.id]:option.id};message.textContent=t.ready;render();});row.append(b);
     }options.append(field);
   }
   if(o?.controls.length===0)options.append(el('p',t.emptyOptions));
   const v=variant(),activeProfile=data.profiles.find(p=>p.figure===data.current?.figure),activeOutfit=activeProfile?.outfits.find(o=>o.variants.some(v=>v.scheme===data.current?.scheme));
   current.textContent=activeProfile&&activeOutfit?`${activeProfile.label} / ${activeOutfit.label}`:'—';
   choice.textContent=v?o.label+' · '+o.controls.map(c=>c.options.find(x=>x.id===pick[c.id]).label).join(' · '):'';
   connection.textContent=data.demo?t.demo:data.connected?t.connected:t.offline;connection.dataset.online=String(data.connected);
   drawCharacter(preview,p,o,v);
   setBusy(busy);
 }
 async function action(fn){setBusy(true);try{await fn();}catch(e){message.textContent=importMessage.textContent=`${t.error}: ${e.message}`;}finally{setBusy(false);}}
 async function load(){data=await ctx.invoke('state');if(ctx.signal.aborted)return;
   catalogText.textContent=JSON.stringify({connected:data.connected,error:data.error,current:data.current,packs:data.packs},null,2);
   if(!profile()){selectedProfile=data.profiles[0]?.id??null;selectedOutfit=null;}
   const p=profile();if(p&&!outfit()){
     const active=data.current?.figure===p.figure?p.outfits.find(o=>o.variants.some(v=>v.scheme===data.current?.scheme)):null;const o=active??p.outfits[0];
     selectedOutfit=o.id;pick={...(o.variants.find(v=>v.scheme===data.current?.scheme)??o.variants[0]).pick};
   }
   message.textContent=data.error??t.ready;render();
 }
 on(refresh,'click',()=>action(load));
 on(profileSelect,'change',()=>{selectedProfile=profileSelect.value;chooseOutfit(profile().outfits[0]);});
 on(apply,'click',()=>action(async()=>{await ctx.invoke('choose',[{profile:selectedProfile,outfit:selectedOutfit,pick}]);await load();message.textContent=`${t.applied}: ${outfit().label}`;}));
 on(restore,'click',()=>action(async()=>{const result=await ctx.invoke('restore');await load();message.textContent=`${t.restored}: ${result.status}`;}));
 on(file,'change',async()=>{if(file.files[0]){if(file.files[0].size>65536){message.textContent=t.invalid;return;}editor.value=await file.files[0].text();}});
 on(format,'click',()=>action(async()=>{if(!help.childNodes.length){for(const stage of await ctx.invoke('read',['profile']))renderDocument(help,stage.text);}help.hidden=!help.hidden;}));
 on(example,'click',()=>action(async()=>download(root,'wardrobe-example.json',JSON.stringify(await ctx.invoke('example'),null,2)+'\n')));
 on(schema,'click',()=>action(async()=>download(root,'wardrobe-profile.schema.json',JSON.stringify(await ctx.invoke('schema'),null,2)+'\n')));
 const parseEditor=()=>JSON.parse(editor.value.replace(/^\uFEFF/,''));
 on(checker,'click',()=>action(async()=>{const result=await ctx.invoke('check',[parseEditor()]);message.textContent=importMessage.textContent=`${h.checked} (${result.outfits} / ${result.variants}). ${h.scope}`;}));
 on(importer,'click',()=>action(async()=>{const imported=await ctx.invoke('import',[parseEditor()]);selectedProfile=imported.id;selectedOutfit=null;await load();importMessage.textContent=`${t.import}: ${imported.label}`;}));
 on(remove,'click',()=>action(async()=>{if(selectedProfile){await ctx.invoke('remove',[selectedProfile]);selectedProfile=selectedOutfit=null;await load();}}));
 void action(load);return{snapshot(){return{selectedProfile,selectedOutfit,pick:{...pick},editor:editor.value,importOpen:details.open};},dispose(){renderEvents.abort();releaseImages();thumbnails.clear();root.classList.remove('ws-root');}};
}
/** The bundled demo is an original procedural fox; no user media is bundled. */
function fictionalFox(scheme=''){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 260 300');svg.setAttribute('aria-label','Fictional Moss Fox wardrobe example');svg.setAttribute('role','img');
 const rain=scheme.startsWith('rain'),space=scheme.startsWith('stargazer'),coat=rain?(scheme.endsWith('teal')?'#63aaa2':'#e3bc58'):space?'#b7c8da':scheme.includes('sand')?'#bd9970':'#75ad8e';
 svg.innerHTML=`<ellipse cx="130" cy="277" rx="65" ry="11" fill="#182f2b" opacity=".13"/><path d="M165 212q81-66 65-1-10 47-67 25" fill="#d98150" stroke="#31483f" stroke-width="4"/><path d="M216 190q24 27-9 43l-16-21Z" fill="#fff4dc"/><path d="M93 218 87 274h28l15-34 15 34h28l-6-56Z" fill="#cc7546" stroke="#31483f" stroke-width="4"/><path d="m87 256-8 19q16 12 37 1l1-20m28 0-1 19q21 13 38 0l-10-19" fill="${scheme.endsWith('boots')?'#485c51':'#e6aa72'}" stroke="#31483f" stroke-width="4"/><path d="M91 155q-21 23-21 65l25-3 0 22h72v-22l25 3q-1-46-23-65Z" fill="${coat}" stroke="#31483f" stroke-width="4"/><path d="M79 93 70 27l47 33m64 33 9-66-47 33" fill="#d98150" stroke="#31483f" stroke-width="4"/><path d="m82 71-3-26 23 21m76 5 3-26-23 21" fill="#f4cca7"/><path d="M69 96q4-45 61-45t61 45q9 43-25 63l-36 19-36-19Q60 141 69 96Z" fill="#e7a06c" stroke="#31483f" stroke-width="4"/><path d="m73 112 51 22q8 5 13 0l50-22q0 36-57 57-55-20-57-57" fill="#fff2db"/><ellipse cx="102" cy="106" rx="8" ry="11" fill="#31483f"/><ellipse cx="158" cy="106" rx="8" ry="11" fill="#31483f"/><circle cx="104" cy="102" r="3" fill="white"/><circle cx="160" cy="102" r="3" fill="white"/><path d="m122 129 8 6 8-6q-8-5-16 0m8 6v9m-10-1q10 8 20 0" fill="none" stroke="#31483f" stroke-width="3" stroke-linecap="round"/><path d="m96 158 34 27 34-27m-34 27v53" fill="none" stroke="#31483f" stroke-width="3"/><circle cx="130" cy="188" r="6" fill="#f5de95" stroke="#31483f" stroke-width="2"/>${rain&&scheme.includes('up')?`<path d="M60 107Q48 39 130 36q82 3 70 71l-16-13q-3-41-54-41T76 94Z" fill="${coat}" stroke="#31483f" stroke-width="4"/>`:''}${space?`<path d="M78 ${scheme.endsWith('lowered')?'91':'62'}h104v30H78Z" rx="10" fill="#75b9cb" opacity=".7" stroke="#31483f" stroke-width="3"/>`:''}`;
 return svg;
}
function mountGuideView(ctx,initial={}){
 const t=WORDS[ctx.language==='zh'||ctx.language==='zh-Hant'?'zh':'en'],h=helperWords(ctx.language),root=ctx.root;root.classList.add('ws-root');root.replaceChildren(el('h2',t.guide),el('p',h.intro));
 const toolbar=el('div',undefined,'ws-help-tools'),manual=el('button',h.manual),example=el('button',h.example),schema=el('button',h.schema),nav=el('nav',undefined,'ws-guide-nav'),status=el('p');status.setAttribute('role','status');toolbar.append(manual,example,schema);root.append(toolbar,status,nav);
 const catalog=el('details',undefined,'ws-catalog'),catalogPre=el('pre');catalog.append(el('summary',h.catalog),el('p',h.local),catalogPre);root.append(catalog);
 const on=(n,type,fn)=>n.addEventListener(type,fn,{signal:ctx.signal});let all=[];
 on(catalog,'toggle',()=>{if(catalog.open)void ctx.invoke('catalog').then(value=>{if(!ctx.signal.aborted)catalogPre.textContent=JSON.stringify(value,null,2);}).catch(e=>{if(!ctx.signal.aborted)catalogPre.textContent=e.message;});});
 on(manual,'click',()=>download(root,'wardrobe-authoring-manual.md',all.map(s=>'# '+s.title+'\n\n'+s.text).join('\n\n'),'text/markdown'));
 on(example,'click',()=>void ctx.invoke('example').then(value=>{if(!ctx.signal.aborted)download(root,'wardrobe-example.json',JSON.stringify(value,null,2)+'\n');}).catch(e=>{status.textContent=e.message;}));
 on(schema,'click',()=>void ctx.invoke('schema').then(value=>{if(!ctx.signal.aborted)download(root,'wardrobe-profile.schema.json',JSON.stringify(value,null,2)+'\n');}).catch(e=>{status.textContent=e.message;}));
 manual.disabled=true;
 void ctx.invoke('read',['all']).then(stages=>{if(ctx.signal.aborted)return;all=stages;manual.disabled=false;for(const stage of stages){const d=el('details',undefined,'ws-guide'),content=el('div',undefined,'ws-doc-content'),jump=el('button',stage.title??stage.stage);d.dataset.stage=stage.stage;d.open=initial.openStages?.includes(stage.stage)??false;d.append(el('summary',stage.title??stage.stage),content);renderDocument(content,stage.text);on(jump,'click',()=>{d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'});});nav.append(jump);root.append(d);}}).catch(e=>{if(!ctx.signal.aborted)status.textContent=e.message;});
 return{snapshot(){return{openStages:[...root.querySelectorAll('.ws-guide[open]')].map(d=>d.dataset.stage)};},dispose(){root.classList.remove('ws-root');}};
}
/** One extension-owned language preference shared by both panels, independent of host language. */
function mountLocalized(ctx,mount){
 let view=null,controller=null,disposed=false,selection=0;const previousLang=ctx.root.getAttribute('lang');
 function render(language,state){
  controller?.abort();view?.dispose();controller=new AbortController();ctx.root.lang=language;
  const select=el('select',undefined,'ws-language');select.setAttribute('aria-label','界面语言 / Interface language');
  for(const [id,label] of [['zh','中文'],['en','English']]){const option=el('option',label);option.value=id;select.append(option);}select.value=language;
  const local={...ctx,language,signal:controller.signal,languageSelect:select,invoke:(method,args=[])=>ctx.invoke(method,method==='read'?[args[0]??'all',language]:args)};
  view=mount(local,state);(ctx.root.querySelector('.ws-tools')??ctx.root.querySelector('.ws-help-tools')).append(select);
  select.addEventListener('change',async()=>{
   const next=select.value,snapshot=view.snapshot?.(),epoch=++selection;select.disabled=true;
   try{await ctx.invoke('setLanguage',[next]);if(disposed||ctx.signal.aborted||epoch!==selection)return;render(next,snapshot);await ctx.refresh?.();}
   catch(error){if(disposed||ctx.signal.aborted||epoch!==selection)return;select.value=language;select.disabled=false;const status=ctx.root.querySelector('[role="status"]');if(status)status.textContent=error.message;}
  },{signal:controller.signal});
 }
 ctx.root.classList.add('ws-root');ctx.root.replaceChildren(el('p','正在读取语言设置…'));
 void ctx.invoke('locale').then(value=>{if(!disposed&&!ctx.signal.aborted)render(value.language==='en'?'en':'zh');}).catch(error=>{if(!disposed&&!ctx.signal.aborted){render('zh');const status=ctx.root.querySelector('[role="status"]');if(status)status.textContent=error.message;}});
 const dispose=()=>{if(disposed)return;disposed=true;controller?.abort();view?.dispose();ctx.root.classList.remove('ws-root');if(previousLang===null)ctx.root.removeAttribute('lang');else ctx.root.setAttribute('lang',previousLang);};
 ctx.signal.addEventListener('abort',dispose,{once:true});return{dispose};
}
export const mountWardrobe=ctx=>mountLocalized(ctx,mountWardrobeView);
export const mountGuide=ctx=>mountLocalized(ctx,mountGuideView);
export default {panels:{wardrobe:{mount:mountWardrobe},guide:{mount:mountGuide}}};
