import {createWardrobeControls} from './native-controls.js';
let snapshot={enabled:false,profiles:[]},changed=()=>{},socket,retry,watchdog,closed=false,last='';
export const nativeWardrobe=createWardrobeControls({load:async()=>snapshot,onChange:()=>changed()});
nativeWardrobe.onChange=fn=>{changed=fn;};
const render=nativeWardrobe.render;
nativeWardrobe.render=args=>render({...args,language:snapshot.language??'zh'});
function accept(next){
  snapshot=next;const value=JSON.stringify(next);
  if(value!==last){last=value;void nativeWardrobe.refresh();}
}
function offline(){clearTimeout(watchdog);accept({enabled:false,profiles:[]});}
function connect(){
  if(closed)return;
  socket=new WebSocket('__WARDROBE_SOCKET__');
  socket.onmessage=e=>{
    try{if(typeof e.data!=='string'||e.data.length>1024*1024)throw Error('Invalid provider frame');const next=JSON.parse(e.data);if(next.contract!==1||next.enabled!==true||!Array.isArray(next.profiles))throw Error('Invalid provider');accept(next);clearTimeout(watchdog);watchdog=setTimeout(()=>{offline();socket.close();},6500);}catch{offline();socket.close();}
  };
  socket.onerror=()=>socket.close();
  socket.onclose=()=>{offline();if(!closed)retry=setTimeout(connect,2000);};
}
connect();
addEventListener('pagehide',()=>{closed=true;clearTimeout(retry);clearTimeout(watchdog);socket?.close();},{once:true});
