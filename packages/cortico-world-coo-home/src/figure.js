// A second sandboxed Figure API 2 instance. Only this iframe receives commands.
// No installed figure module, label, image or identifier is included in the package.
const W=512,H=512,FLOOR=448,UNIT=256;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const fallbackWords={sleep:['sleep','sit','stand'],sit:['sit','stand'],walk:['walk','stand'],run:['run','walk','stand']};

export function createFigureLayer({root,scene,signal,onStatus=()=>{}}){
  let active=null,pending=null,generation=0,disposed=false,frameCount=0;
  let placement={position:[.95,.327,9.25],height:1.25,word:'stand',facing:1};
  let requestedKey=null,lastTick=0,lastMask=0,maskBusy=false,maskSerial=0;
  const layer=document.createElement('div');layer.className='coo-home-figure-layer';root.append(layer);
  const cancel=()=>dispose();signal?.addEventListener('abort',cancel,{once:true});
  function post(instance,message){instance?.frame.contentWindow?.postMessage(message,'*');}
  function remove(instance){
    if(!instance)return;
    clearTimeout(instance.timeout);instance.host.remove();
  }
  function create(descriptor){
    const host=document.createElement('div');host.className='coo-home-actor';host.hidden=true;
    const shadow=document.createElement('div');shadow.className='coo-home-contact';host.append(shadow);
    const frame=document.createElement('iframe');frame.title='家园角色';frame.dataset.testid='home-figure';
    frame.dataset.generation=String(++generation);frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.width=String(W);frame.height=String(H);
    const instance={host,frame,shadow,descriptor,initialized:false,ready:false,waiting:false,words:[],layout:null,word:null,maskReady:false};
    frame.src=descriptor.frameUrl;host.append(frame);layer.append(host);
    instance.timeout=setTimeout(()=>{
      if(pending===instance){remove(pending);pending=null;requestedKey=null;onStatus('当前角色暂时无法加载，可重新选择角色后重试。');}
    },22000);
    return instance;
  }
  function initialize(instance){
    if(instance.initialized)return;instance.initialized=true;
    const d=instance.descriptor;
    post(instance,{t:'init',entry:d.entry,export:d.exportName,base:d.baseUrl,model:d.model,
      scheme:d.scheme,start:{x:W/2,y:FLOOR,facing:placement.facing,enter:false,skin:d.skin},
      theme:'dark',language:'zh',bounds:{W,H,floorY:FLOOR,S:1}});
  }
  function selectWord(instance){
    const preferred=fallbackWords[placement.word]??[placement.word,'stand'];
    return preferred.find(w=>instance.words.includes(w))??null;
  }
  function applyPose(instance){
    const word=selectWord(instance);
    post(instance,{t:'place',x:W/2,y:FLOOR,facing:placement.facing});
    if(word&&word!==instance.word){post(instance,{t:'do',word});instance.word=word;}
  }
  function message(event){
    if(disposed)return;
    const instance=[pending,active].find(i=>i&&event.source===i.frame.contentWindow);
    if(!instance||!event.data||typeof event.data!=='object')return;
    const m=event.data;
    if(m.t==='loaded')initialize(instance);
    else if(m.t==='ready'){
      instance.ready=true;
      instance.words=(Array.isArray(m.words)?m.words:instance.descriptor.words??[])
        .filter(w=>typeof w==='string'&&w.length<80).slice(0,256);
      // Household navigation owns this instance's position. The pack may still
      // animate a requested pose, but its desktop roaming must not compete.
      post(instance,{t:'set',state:{roam:'off'}});
      applyPose(instance);post(instance,{t:'tick',dt:0,draw:true});instance.waiting=true;
    }else if(m.t==='frame'&&instance.ready){
      instance.waiting=false;frameCount++;
      const l=m.layout??{},box=l.box??{};
      instance.layout={x:Math.max(0,Math.min(W,finite(l.x,W/2))),y:Math.max(0,Math.min(H,finite(l.y,FLOOR))),
        box:{x:finite(box.x),y:finite(box.y),w:Math.max(0,Math.min(W,finite(box.w,UNIT))),h:Math.max(0,Math.min(H,finite(box.h,UNIT)))}};
      if(pending===instance){
        remove(active);active=instance;pending=null;clearTimeout(instance.timeout);
        maskSerial++;lastMask=0;onStatus('已跟随当前角色');
      }
    }else if(m.t==='error'){
      // Pack error text may contain private module paths; never forward it.
      if(pending===instance){remove(pending);pending=null;requestedKey=null;}
      else {remove(active);active=null;requestedKey=null;maskSerial++;}
      onStatus('当前角色无法显示；场景仍可浏览。');
    }
  }
  window.addEventListener('message',message);
  function setAppearance(appearance){
    if(disposed)return;
    const d=appearance?.descriptor;
    if(!appearance?.connected||!d){
      remove(pending);remove(active);pending=null;active=null;requestedKey=null;maskSerial++;
      onStatus('启用桌宠后，家园会自动跟随当前角色。');return;
    }
    if(requestedKey===d.key)return;
    requestedKey=d.key;remove(pending);pending=create(d);onStatus('正在连接当前角色…');
  }
  function update(stamp){
    if(disposed||signal?.aborted)return;
    const i=active;if(!i)return;
    const foot=scene.project(placement.position);
    const top=scene.project([placement.position[0],placement.position[1]+placement.height,placement.position[2]]);
    const scale=Math.max(.025,Math.min(3,Math.hypot(foot.x-top.x,foot.y-top.y)/UNIT));
    const x=foot.x-W/2*scale,y=foot.y-FLOOR*scale,width=W*scale,height=H*scale;
    Object.assign(i.host.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
    i.frame.style.transform=`scale(${scale})`;
    i.shadow.style.cssText=`left:${W/2*scale}px;top:${FLOOR*scale}px;width:${UNIT*scale*.48}px;height:${UNIT*scale*.10}px;`;
    i.host.hidden=!foot.visible||!i.maskReady;
    if(stamp-lastTick>=1000/30&&!i.waiting){
      const dt=lastTick?Math.min(.08,(stamp-lastTick)/1000):0;lastTick=stamp;
      applyPose(i);post(i,{t:'tick',dt,draw:foot.visible});i.waiting=true;
    }
    if(foot.visible&&!maskBusy&&stamp-lastMask>=80){
      lastMask=stamp;maskBusy=true;const serial=maskSerial;
      Promise.resolve(scene.renderActorMask({rect:{x,y,width,height},worldPoint:placement.position})).then(mask=>{
        if(!mask||disposed||serial!==maskSerial||i!==active)return;
        i.host.style.maskImage=`url("${mask.url}")`;i.host.style.webkitMaskImage=`url("${mask.url}")`;
        i.maskReady=true;
      }).catch(()=>{if(!disposed&&i===active){i.maskReady=false;onStatus('角色遮挡暂不可用；正在保留场景显示。');}})
        .finally(()=>{maskBusy=false;});
    }
  }
  function setPlacement(next){
    if(next.position){if(next.position.length!==3||!next.position.every(Number.isFinite))throw Error('Invalid actor position');placement.position=[...next.position];}
    if(Number.isFinite(next.height))placement.height=Math.max(.3,Math.min(2.4,next.height));
    if(typeof next.word==='string')placement.word=next.word;
    if(next.facing===1||next.facing===-1)placement.facing=next.facing;
    lastMask=0;if(active)applyPose(active);
  }
  function dispose(){
    if(disposed)return;disposed=true;maskSerial++;
    signal?.removeEventListener('abort',cancel);window.removeEventListener('message',message);
    remove(pending);remove(active);pending=null;active=null;layer.remove();
  }
  return {setAppearance,setPlacement,update,dispose,getState:()=>({ready:!!active?.ready,loading:!!pending,
    maskReady:!!active?.maskReady,frames:frameCount,generation,word:active?.word??null,placement:structuredClone(placement),disposed})};
}
