/** Still-only Lulu UI fixture. Full animations are supplied by the independent figure release. */
export function createLuluPreviewBody(base,{scheme,host}){
 const element=document.createElement('img');element.alt='Lulu wardrobe preview';element.style.cssText='position:absolute;width:128px;height:192px;object-fit:contain;transform-origin:center bottom';host.root.append(element);
 let x=host.start?.x??host.bounds().W/2,time=0;
 const select=next=>{if(!['bag','plain','sleep','dino'].includes(next))throw Error('Unknown Lulu preview');element.src=new URL('thumbs/'+next+'.png',base).href;};select(scheme||'bag');
 return{
  words:[],step(dt){time+=dt;const b=host.bounds();element.style.left=(x-64)+'px';element.style.top=(b.floorY-192)+'px';element.style.transform=`scaleY(${1+Math.sin(time*2)*.004})`;},
  layout(){const y=host.bounds().floorY;return{x,y,facing:1,mode:'idle',busy:false,moving:false,pressing:false,cursor:'',box:{x:x-64,y:y-192,w:128,h:192},hit:[],bubble:{x,y:y-194},side:{x:x+64,y:y-80,reach:0}};},
  do(){},set(){},resize(){},cue(){},pointer(){},place(next){x=next;},setScheme:select,dispose(){element.remove();}
 };
}
