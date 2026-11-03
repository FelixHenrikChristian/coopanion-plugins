import {foxSvg} from './fox-art.js';
/** An idle-only interface fixture, not a generated/accepted animation pack. */
export function createFoxBody(base,{scheme,host}){
 const element=document.createElement('div');element.style.cssText='position:absolute;width:128px;height:148px;transform-origin:center bottom';host.root.append(element);
 let x=host.start?.x??host.bounds().W/2,time=0,current=scheme;
 const draw=()=>{element.innerHTML=foxSvg(current);const s=element.querySelector('svg');s.style.width='100%';s.style.height='100%';};draw();
 return{
  words:[],step(dt){time+=dt;const b=host.bounds();element.style.left=(x-64)+'px';element.style.top=(b.floorY-148)+'px';element.style.transform=`translateY(${Math.sin(time*2)*1.1}px)`;},
  layout(){const y=host.bounds().floorY;return{x,y,facing:1,mode:'idle',busy:false,moving:false,pressing:false,cursor:'',box:{x:x-64,y:y-148,w:128,h:148},hit:[],bubble:{x,y:y-150},side:{x:x+64,y:y-80,reach:0}};},
  do(){},set(){},resize(){},cue(){},pointer(){},place(next){x=next;},setScheme(next){current=next;draw();},dispose(){element.remove();}
 };
}
