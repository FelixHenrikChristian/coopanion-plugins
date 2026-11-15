import {createNeighborhood} from '../../../scenes/amane-mart/src/scene.js';
import {createFigureLayer} from './figure.js';
import {createLifePanel} from './life-panel.js';

export async function mount(ctx){
  const abort=new AbortController(),signal=abort.signal;
  const stop=()=>dispose();ctx.signal.addEventListener('abort',stop,{once:true});
  const root=document.createElement('section');root.className='coo-home-root';root.dataset.testid='coo-home-root';
  root.innerHTML='<div class="coo-home-stage" data-testid="home-scene"></div><div class="coo-home-toolbar"><span class="coo-home-title">coo家园</span><span class="coo-home-status" role="status" data-testid="home-status">正在打开街区…</span><button type="button" data-testid="home-fullscreen" title="全屏查看">全屏</button></div><div class="coo-home-item" hidden></div>';
  ctx.root.append(root);
  const stage=root.querySelector('.coo-home-stage'),status=root.querySelector('[role=status]'),item=root.querySelector('.coo-home-item');
  const notice=text=>{if(!signal.aborted)status.textContent=text;};
  const frameMs=1000/60;
  let frameHandle=null,stream=null,disposed=false,disposal=null,elapsed=0,renderBudget=frameMs,lastVisible=false,hideItem=null;
  let scene=null,actor=null,lifePanel=null;
  function feedback(text){if(signal.aborted)return;item.textContent=text;item.hidden=false;clearTimeout(hideItem);hideItem=setTimeout(()=>{item.hidden=true;},3500);}
  function dispose(){
    if(disposed)return disposal;disposed=true;abort.abort();
    ctx.signal.removeEventListener('abort',stop);clearTimeout(hideItem);
    stream?.dispose();frameHandle?.dispose();lifePanel?.dispose();actor?.dispose();
    disposal=Promise.resolve(scene?.dispose());root.remove();
    return disposal;
  }
  try{
    scene=createNeighborhood({root:stage,autoStart:false,onItem(value){lifePanel?.selectItem(value);}});
    root.dataset.itemCount=String(scene.listItems().length);
    actor=createFigureLayer({root:stage,scene,signal,onStatus:notice});
    lifePanel=createLifePanel({root,scene,actor,ctx,signal,send:text=>stream?.send(text),feedback});
    const button=root.querySelector('[data-testid=home-fullscreen]');
    button.addEventListener('click',async()=>{
      try {if(document.fullscreenElement===root)await document.exitFullscreen();else await root.requestFullscreen();}
      catch {notice('此窗口暂不支持全屏，请放大窗口查看。');}
    },{signal});
    document.addEventListener('fullscreenchange',()=>{button.textContent=document.fullscreenElement===root?'退出全屏':'全屏';scene.resize();},{signal});
    let received=0;
    function receive(text){
      try {const value=JSON.parse(text);received++;if(value?.appearance)actor.setAppearance(value.appearance);lifePanel.receive(value);}
      catch {notice('家园连接正在恢复…');}
    }
    // Subscribe before fetching the current snapshot so the initial selection
    // and subsequent selections arrive through the same appearance contract.
    const isVisible=()=>!document.hidden&&stage.clientWidth>0&&stage.clientHeight>0;
    document.addEventListener('visibilitychange',()=>lifePanel.presence(isVisible()),{signal});
    stream=ctx.stream({message:receive,open(){lifePanel.presence(isVisible(),true);},close(willRetry){if(willRetry)notice('连接暂时中断，正在重连…');}});
    frameHandle=ctx.frame(dt=>{
      if(signal.aborted)return false;
      const visible=isVisible();lifePanel.presence(visible);
      if(!visible){lastVisible=false;return;}
      const step=lastVisible?Math.min(100,Math.max(0,Number.isFinite(dt)?dt:0)):0;
      elapsed+=step;renderBudget=Math.min(100,renderBudget+step);lastVisible=true;
      if(renderBudget<frameMs)return;
      renderBudget%=frameMs;
      const stamp=performance.now();scene.update(elapsed);lifePanel.update(stamp);actor.update(stamp);
    });
    const revision=received;
    try {
      const state=await ctx.invoke('status');
      if(!signal.aborted&&received===revision){if(state.appearance)actor.setAppearance(state.appearance);lifePanel.receive(state);}
    }catch {notice('场景已打开，角色连接暂不可用。');}
    return {dispose,scene,actor,getLifeState:()=>lifePanel.getState()};
  }catch(error){dispose();throw error;}
}
