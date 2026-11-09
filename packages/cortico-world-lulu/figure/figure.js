const svgNS='http://www.w3.org/2000/svg';
const clipWords=new Set(['wave','bow','jump','hop','spin','dance','shiver','flap','dizzy']);
export async function createLuluBody(base,{scheme,kit,host,loadImage}){
  const {data}=await import(new URL('./data.js',base));
  let disposed=false,revision=0,error=null,state,body;
  let mounted=null,canvas=null,ctx=null,foreign=null,action=null,pending=null,pendingReady=false,queuedWalk=null,actionTime=0;
  let seated=false,lastSit=0,sitIndex=0,lastDt=0,activeRender=null;
  async function loadClip(owner,name){
    if(owner.cache.has(name))return owner.cache.get(name);
    if(owner.loading.has(name))return owner.loading.get(name);
    const spec=owner.catalog.clips[name];if(!spec)throw Error('Missing clip: '+name);
    const promise=(async()=>{
      const images=new Array(spec.frames.length);let next=0;
      await Promise.all(Array.from({length:4},async()=>{while(next<images.length){const i=next++;images[i]=await loadImage(new URL(spec.frames[i],base));}}));
      if(disposed)throw Error('Lulu was disposed');
      const clip={...spec,images};owner.cache.set(name,clip);
      while(owner.cache.size>5){const oldest=[...owner.cache.keys()].find(k=>k!==name&&k!==action&&k!=='sit'&&k!=='walk'&&k!=='run');if(!oldest)break;owner.cache.delete(oldest);}
      return clip;
    })();owner.loading.set(name,promise);
    try{return await promise;}finally{if(owner.loading.get(name)===promise)owner.loading.delete(name);}
  }
  async function prepare(id){
    const catalog=data[id];if(!catalog)throw Error('Unknown Lulu outfit: '+id);
    const owner={id,catalog,cache:new Map(),loading:new Map(),faces:{},seatedFaces:{}};
    const loadFaces=async(spec,target)=>{await Promise.all(Object.entries(spec??{}).map(async([word,path])=>{target[word]=await loadImage(new URL(path,base));}));};
    await Promise.all([loadFaces(catalog.expressions,owner.faces),loadFaces(catalog.seatedExpressions,owner.seatedFaces),...['walk','run','sit'].filter(k=>catalog.clips[k]).map(k=>loadClip(owner,k))]);
    return owner;
  }
  state=await prepare(scheme||'bag');
  function cancel(){revision++;action=pending=null;pendingReady=false;actionTime=0;if(queuedWalk){host.emit('interrupted',{walkId:queuedWalk.id,by:'command'});queuedWalk=null;}}
  const figure={get extent(){return activeRender?.extent??[32,14,224,256];},hits:[[128,95,75],[128,204,55]],colors:{z:'#d69542'},
    groupTilt(mode,tilt,lean){return action?0:tilt+lean;},
    draw(group,face,frame){
      if(mounted!==group){
        group.textContent='';foreign=document.createElementNS(svgNS,'foreignObject');
        for(const[k,v]of Object.entries({x:-62,y:-98,width:380,height:380}))foreign.setAttribute(k,v);
        canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;canvas.style.cssText='display:block;width:100%;height:100%';ctx=canvas.getContext('2d');foreign.append(canvas);group.append(foreign);mounted=group;
      }
      const owner=state,faceName=frame.face;
      const animated=!!action||['walk','run'].includes(frame.mode)||frame.sit>.01&&frame.sit<.99||sitIndex>0&&(!seated||sitIndex<(owner.cache.get('sit')?.hold??22));
      const br=Math.sin(frame.t*(frame.mode==='sleep'?1.7:2.4));
      foreign.setAttribute('transform',animated?`translate(128 256) scale(${1/(1-.009*br)} ${1/(1+.016*br)}) translate(-128 -256)`:'');
      let image=owner.faces[faceName]??owner.faces.neutral;activeRender=null;
      if(frame.blink>.65&&owner.faces.blink)image=owner.faces.blink;
      if(['drag','air'].includes(frame.mode)&&action)cancel();
      if(action&&owner.cache.has(action)){
        const clip=owner.cache.get(action);activeRender=clip.render;image=clip.images[Math.min(clip.images.length-1,Math.floor(actionTime*clip.fps))];
      }else if(['walk','run'].includes(frame.mode)&&owner.cache.has(frame.mode)){
        const clip=owner.cache.get(frame.mode),elapsed=frame.modeT*clip.fps;activeRender=clip.render;
        const start=clip.loopStart??0,end=clip.loopEnd??clip.images.length;
        const index=elapsed<end?Math.floor(elapsed):start+Math.floor((elapsed-start)%(end-start));
        image=clip.images[Math.min(index,clip.images.length-1)];
      }else if((frame.sit>.01||sitIndex>0||['sit','sleep'].includes(frame.mode))&&owner.cache.has('sit')){
        const clip=owner.cache.get('sit'),hold=clip.hold??Math.floor(clip.images.length*.5),rise=clip.riseStart??Math.floor(clip.images.length*.7);
        image=clip.images[Math.max(0,Math.min(Math.floor(sitIndex),clip.images.length-1))];activeRender=clip.render;
        if(seated&&sitIndex>=hold){const key=frame.mode==='sleep'?'sleep':frame.blink>.65?'blink':faceName;image=owner.seatedFaces[key]??image;}
      }
      if(!action&&frame.mode==='sleep'&&owner.faces.sleep&&!owner.cache.has('sit'))image=owner.faces.sleep;
      lastSit=frame.sit;
      ctx.clearRect(0,0,1024,1024);if(image){const r=activeRender??{scale:1,offsetX:0,offsetY:0};ctx.drawImage(image,256+r.offsetX,256+r.offsetY,512*r.scale,768*r.scale);}
    }
  };
  body=kit.createBody(host,{figure,roam:state.catalog.pilot?'off':'free'});
  const originalDo=body.do.bind(body),originalStep=body.step.bind(body),originalLayout=body.layout.bind(body),originalWalk=body.walk.bind(body),originalStopWalk=body.stopWalk.bind(body),originalDispose=body.dispose.bind(body);
  body.do=word=>{
    if(word==='stand'){cancel();seated=false;return originalDo(word);}
    if(!clipWords.has(word)){if(['sit','sleep','walk','run','turn','look'].includes(word)){cancel();seated=['sit','sleep'].includes(word);if(['walk','run'].includes(word)&&(sitIndex>0||lastSit>.01)){if(!originalDo('stand'))return false;queuedWalk={word,id:0};return true;}}return originalDo(word);}
    if(!state.catalog.clips[word]||action||pending||disposed)return false;
    if(!originalDo('stand'))return false;seated=false;
    const owner=state,token=revision;pending=word;pendingReady=false;body.set({hold:10});
    loadClip(owner,word).then(()=>{if(!disposed&&owner===state&&token===revision&&pending===word)pendingReady=true;}).catch(reason=>{if(owner===state&&token===revision){error=String(reason);pending=null;host.emit('done',{word,failed:true});}});
    return true;
  };
  body.step=(dt,draw=true)=>{
    if(disposed)return;
    lastDt=Math.max(0,Math.min(dt,.1));
    seated=['sit','sleep'].includes(originalLayout().mode);
    const sitClip=state.cache.get('sit');
    if(sitClip){const hold=sitClip.hold??22,rise=sitClip.riseStart??28;if(seated){if(sitIndex>=rise)sitIndex=hold;sitIndex=Math.min(hold,sitIndex+Math.max(0,dt)*sitClip.fps);}else if(sitIndex>0){if(sitIndex<rise)sitIndex=rise;sitIndex+=Math.max(0,dt)*sitClip.fps;if(sitIndex>=sitClip.images.length-1)sitIndex=0;}}
    if(queuedWalk&&sitIndex===0){const next=queuedWalk;queuedWalk=null;if(next.word)originalDo(next.word);else originalWalk(next.x,next.run,next.id);}
    if(pending&&pendingReady&&sitIndex===0){action=pending;pending=null;pendingReady=false;actionTime=0;}
    if(action){actionTime+=Math.max(0,dt);body.set({hold:.5});}
    else if(pending)body.set({hold:.5});
    originalStep(dt,draw);
    if(action){const clip=state.cache.get(action);if(clip&&actionTime>=clip.images.length/clip.fps){const word=action;action=null;actionTime=0;host.emit('done',{word});}}
  };
  body.walk=(x,run,id)=>{cancel();if(sitIndex>0||['sit','sleep'].includes(originalLayout().mode)){if(!originalDo('stand'))return false;seated=false;queuedWalk={x,run,id};return true;}return originalWalk(x,run,id);};
  body.stopWalk=id=>{if(queuedWalk&&queuedWalk.id===id){queuedWalk=null;host.emit('interrupted',{walkId:id,by:'stop'});return;}return originalStopWalk(id);};
  body.stop=()=>{cancel();queuedWalk=null;seated=false;return originalDo('stand');};
  body.layout=()=>{const layout=originalLayout();return{...layout,moving:layout.moving||!!action||!!pending||!!queuedWalk||sitIndex>0&&(!seated||sitIndex<(state.cache.get('sit')?.hold??22)),busy:layout.busy||!!queuedWalk,loadingAssets:state.loading.size>0,wardrobeError:error,appearance:state.id};};
  let schemeRequest=0;
  body.setScheme=async next=>{
    if(!data[next])throw Error('Unknown Lulu outfit: '+next);
    const request=++schemeRequest;if(next===state.id)return;
    try{const prepared=await prepare(next);if(disposed||request!==schemeRequest)return;cancel();state=prepared;lastSit=0;sitIndex=0;seated=false;error=null;}
    catch(reason){if(request===schemeRequest)error=String(reason);throw reason;}
  };
  body.dispose=()=>{disposed=true;schemeRequest++;cancel();state.cache.clear();state.faces={};state.seatedFaces={};originalDispose();};
  if(state.catalog.pilot)body.words=[...Object.keys(state.catalog.expressions).filter(k=>!['blink','sleep'].includes(k)),...Object.keys(state.catalog.clips)];
  return body;
}
