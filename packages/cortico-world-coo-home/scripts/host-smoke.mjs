// Optional integration check against an installed, unmodified Coopanion Core.
// It creates its own deployment, extensions and synthetic figure packages.
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {join,resolve,basename,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {installFixtureProvider,fixtureConstitution} from '../test/fixtures/provider-control.mjs';
import {verifyHostChat} from '../test/fixtures/host-chat.mjs';
import {verifyHostBrowserChat} from '../test/fixtures/host-browser-chat.mjs';
import {neutralWave} from '../test/fixtures/audio.mjs';
import {verifyHostChatReport,prepareHostGardenReport} from '../test/fixtures/host-chat-report.mjs';

const app=process.env.COOPANION_APP_ROOT;
if(!app)throw Error('Set COOPANION_APP_ROOT to an installed Coopanion resources/app directory.');
const root=fileURLToPath(new URL('..',import.meta.url));
const temporary=await mkdtemp(join(tmpdir(),'coo-home-host-'));
const deployment=join(temporary,'home','companion'),extensions=join(temporary,'extensions'),figures=join(temporary,'figures');
const sockets=new Set();let child,browser,logs='',exited=false;
const report={fixture:'isolated Coopanion Core and generated Figure API 2 packages',checks:{}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label,timeout=20_000){const end=Date.now()+timeout;for(;;){const value=await fn();if(value)return value;if(Date.now()>end)throw Error(`Timed out: ${label}`);await pause(100);}}
async function freePort(){const server=createServer();await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});const port=server.address().port;await new Promise(ok=>server.close(ok));return port;}
async function json(origin,path,body){
  if(path.endsWith('/panels/home/status'))body??={args:[]};
  const response=await fetch(origin+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json',origin}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10_000)});
  assert.equal(response.status,200,`HTTP ${path}`);return response.json();
}
function stream(url){const socket=new WebSocket(url);socket.values=[];socket.addEventListener('message',event=>{try{socket.values.push(JSON.parse(event.data));}catch{}});sockets.add(socket);return socket;}
const figureCode=`export function createFixture(base,{host,scheme}){
 const canvas=document.createElement('canvas');host.root.append(canvas);let selected=scheme;
 const layout=()=>{const b=host.bounds(),h=230*b.S,w=120*b.S,x=host.start.x,y=b.floorY;return{x,y,facing:1,mode:'stand',busy:false,moving:false,pressing:false,cursor:'',box:{x:x-w/2,y:y-h,w,h},hit:[{x,y:y-h/2,r:w/2}],bubble:{x,y:y-h},side:{x:x+w/2,y:y-h/2,reach:0}};};
 return {words:['stand','walk'],step(dt,draw){if(!draw)return;const b=host.bounds(),p=layout().box;canvas.width=b.W;canvas.height=b.H;const c=canvas.getContext('2d');c.fillStyle=selected==='stripe'?'#f4bb79':'#70c4c4';c.fillRect(p.x,p.y,p.w,p.h);},layout,do(){},setScheme(value){selected=value;},resize(){},place(x){host.start.x=x;},dispose(){canvas.remove();}};
}`;
const kitFigureCode=`export function createFixture(base,{host,scheme,kit}){
 let selected=scheme;
 return kit.createBody(host,{figure:{extent:[64,26,192,256],hits:[[128,140,64]],
 draw(group,face,frame){
   group.classList.add('fixture-body');group.dataset.mode=frame.mode;
   group.dataset.stride=JSON.stringify(frame.legs);
   if(!group.firstChild)group.innerHTML='<path class="fixture-legs" fill="none" stroke="#273c56" stroke-width="12" stroke-linecap="round"/><rect x="70" y="80" width="116" height="120" rx="20"/><circle cx="128" cy="53" r="37" fill="#df5e9c"/>';
   group.querySelector('rect').setAttribute('fill',selected==='stripe'?'#f4bb79':'#70c4c4');
   group.querySelector('path').setAttribute('d',frame.legs.map(leg=>'M '+leg[0]+' '+leg[1]+' L '+leg[2]+' '+leg[3]).join(' '));
 },
 setScheme(value){selected=value;}}});
}`;

try{
  await mkdir(deployment,{recursive:true});await mkdir(join(extensions,'node_modules'),{recursive:true});
  const provider=await installFixtureProvider({extensions,home:join(temporary,'home')});
  await symlink(root,join(extensions,'node_modules','cortico-world-coo-home'),process.platform==='win32'?'junction':'dir');
  await writeFile(join(extensions,'package.json'),JSON.stringify({private:true,dependencies:{'cortico-world-coo-home':`file:${root}`,[provider.moduleName]:'0.0.0'}}));
  await mkdir(join(deployment,'workspace'),{recursive:true});
  await writeFile(join(deployment,'workspace','CONSTITUTION.md'),fixtureConstitution+'\n');
  for(const id of ['fixture-round','fixture-kite']){
    const directory=join(figures,id);await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'figure.json'),JSON.stringify({manifest:2,api:2,id,name:{en:'Neutral test figure',zh:'中性测试图形'},about:{en:'Generated geometric integration fixture',zh:'程序生成的几何测试素材'},entry:'fixture.js',export:'createFixture',axes:[{id:'style',name:{en:'Style'},options:[{id:'plain',name:{en:'Plain'}},{id:'stripe',name:{en:'Stripe'}}]}],presets:[{id:'plain',pick:{style:'plain'}},{id:'stripe',pick:{style:'stripe'}}],vocab:[{id:'stand',kind:'motion',names:{en:[]},about:{en:'Rest'},seconds:1},{id:'walk',kind:'motion',names:{en:[]},about:{en:'Move'},seconds:1}],sounds:{'neutral-tone':{kind:'talk',file:'neutral-tone.wav',volume:.1,repeat:'restart'}},voice:{pitch:1},can:{walk:true}}));
    await writeFile(join(directory,'fixture.js'),id==='fixture-kite'?kitFigureCode:figureCode);
    await writeFile(join(directory,'neutral-tone.wav'),neutralWave());
  }
  const port=await freePort(),petOrigin=`http://127.0.0.1:${port}`;
  await writeFile(join(deployment,'config.json'),JSON.stringify({activeProvider:'fixture-model',language:'zh',web:{host:'127.0.0.1',port:0},companion:{telemetry:false,autoUpdate:false},worlds:{'coo-home':{enabled:true},'desktop-pet':{enabled:true,port,sound:true,sounds:{volume:25},speech:{enabled:false},window:{enabled:false},skin:{figure:'fixture-round',scheme:'plain'}}}}));
  if(process.argv.includes('--report-only'))await prepareHostGardenReport(deployment);
  const version=JSON.parse(await readFile(join(app,'package.json'),'utf8')).version;
  const bootstrap=join(temporary,'bootstrap.mjs');
  await writeFile(bootstrap,`const originalFetch=globalThis.fetch;globalThis.fetch=(input,init)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('External network blocked by integration fixture');return originalFetch(input,init);};await import(${JSON.stringify(pathToFileURL(join(app,'core','boot.ts')).href)});`);
  child=fork(bootstrap,[],{cwd:app,execArgv:['--import','tsx'],env:{...process.env,CORTICO_HOME:join(temporary,'home'),CORTICO_EXTENSIONS_DIR:extensions,COOPANION_PACK_ROOTS:figures,CORTICO_START_PAUSED:'1',COOPANION_VERSION:version,COOPANION_SYSTEM_PROXY:'0'},silent:true});
  child.stdout.on('data',chunk=>{logs=(logs+chunk).slice(-20_000);});child.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-20_000);});child.once('exit',()=>{exited=true;});
  const ready=await new Promise((ok,bad)=>{
    const timer=setTimeout(()=>bad(Error('Isolated host did not become ready.')),30_000);
    child.on('message',value=>{if(value.type==='companion:ready'){clearTimeout(timer);ok(value);}});
    child.once('exit',()=>{clearTimeout(timer);bad(Error('Isolated host exited before ready.'));});
  });
  const origin=`http://127.0.0.1:${ready.port}`,statusPath='/api/webui/providers/world%3Acoo-home/panels/home/status';
  const manifest=await json(origin,'/api/webui/manifest');
  const declaration=manifest.providers?.find(p=>p.id==='world:coo-home');
  assert.ok(declaration,'Home page appears in official WebUI manifest');
  const initial=await until(async()=>{const value=await json(origin,statusPath);return value.appearance?.connected&&value;},'initial appearance');
  assert.equal(initial.phase,'life');assert.equal(initial.appearance.descriptor.skin.figure,'fixture-round');
  assert.equal(initial.life.version,4);
  assert.equal(initial.life.garden.plots.length,8);
  assert.ok(initial.life.garden.plots.filter(plot=>!process.argv.includes('--report-only')||plot.id!=='plot-8').every(plot=>plot.stage==='empty'&&plot.cropId===null));
  if(process.argv.includes('--report-only'))assert.equal(initial.life.garden.plots[7].stage,'ripe','Report fixture crop was sown and watered by the real engine');
  assert.equal(initial.appearance.descriptor.scheme,'plain');assert.ok(initial.appearance.descriptor.frameUrl.startsWith(petOrigin));
  report.checks.discovery='Official fixed-port desktop-pet service and real catalog';
  const feed=stream(origin.replace('http:','ws:')+'/ws/providers/world%3Acoo-home/panels/home');
  await until(()=>feed.values.some(v=>v.appearance?.connected),'World stream initial state');
  // This socket represents an original pet only inside this temporary fixture.
  // It establishes that the plugin watcher never replaces that connection.
  const original=stream(petOrigin.replace('http:','ws:')+'/socket?role=pet&host=tab');
  await until(()=>original.values.some(v=>v.t==='init'),'fixture original connection');
  const unchanged=JSON.parse(await readFile(join(deployment,'config.json'),'utf8'));
  await pause(400);assert.equal(original.readyState,WebSocket.OPEN);
  assert.deepEqual(JSON.parse(await readFile(join(deployment,'config.json'),'utf8')).worlds['desktop-pet'].skin,unchanged.worlds['desktop-pet'].skin);
  report.checks.isolation='Existing fixture pet remains connected and its skin is unchanged';
  for(const [figure,scheme] of [['fixture-kite','plain'],['fixture-kite','stripe']]){
    await json(petOrigin,'/api/skin',{skin:{figure,scheme}});
    await until(()=>feed.values.some(v=>v.appearance?.descriptor?.skin.figure===figure&&v.appearance.descriptor.scheme===scheme),'watcher appearance switch');
    const state=await json(origin,statusPath);assert.equal(state.appearance.descriptor.skin.figure,figure);assert.equal(state.appearance.descriptor.scheme,scheme);
    assert.equal(original.readyState,WebSocket.OPEN);
  }
  report.checks.watcher='Official preference broadcasts follow both figure and outfit changes';
  const frame=await fetch(initial.appearance.descriptor.frameUrl);assert.equal(frame.status,200);assert.match(frame.headers.get('content-security-policy'),/sandbox allow-scripts/);
  report.checks.frame='Official sandboxed Figure API endpoint';
  const invoke=(method,args=[])=>json(origin,statusPath.replace(/status$/,method),{args});
  const invokePanel=(panel,method,args=[])=>json(origin,`/api/webui/providers/world%3Acoo-home/panels/${panel}/${method}`,{args});
  await invoke('settings',[{autonomy:false}]);
  await invoke('cancel');
  if(process.argv.includes('--report-only'))report.checks.desktopReport=await verifyHostChatReport({provider,invoke,json,origin,feed,original,until});
  else report.checks.chat=await verifyHostChat({provider,invoke,json,origin,stream,until,pause,original,configFile:join(deployment,'config.json')});
  if(!process.argv.includes('--report-only')&&process.env.COO_HOME_PLAYWRIGHT_MODULE&&process.env.COO_HOME_BROWSER){
    const require=createRequire(import.meta.url),{chromium}=require(process.env.COO_HOME_PLAYWRIGHT_MODULE);
    browser=await chromium.launch({executablePath:process.env.COO_HOME_BROWSER,headless:true,args:process.argv.includes('--software')?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.grantPermissions(['local-network-access'],{origin});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')logs+='\nBrowser: '+message.text();});
    await page.addInitScript(()=>{
      const NativeAudioContext=globalThis.AudioContext;
      window.__neutralAudio={contexts:[],started:0,active:new Set()};
      if(NativeAudioContext)globalThis.AudioContext=class extends NativeAudioContext{
        constructor(...args){super(...args);window.__neutralAudio.contexts.push(this);}
        createBufferSource(){
          const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);
          source.start=(...args)=>{const value=start(...args);window.__neutralAudio.started++;window.__neutralAudio.active.add(source);return value;};
          source.stop=(...args)=>{try{return stop(...args);}finally{window.__neutralAudio.active.delete(source);}};
          source.addEventListener('ended',()=>window.__neutralAudio.active.delete(source));return source;
        }
      };
      window.__neutralFrames=[];
      addEventListener('message',event=>{
        if(event.data?.t==='error')console.error('Figure fixture:',event.data.message);
        if(event.data?.t==='frame'&&event.source===document.querySelector('.coo-home-root iframe')?.contentWindow){window.__neutralFrames.push(event.data.layout);if(window.__neutralFrames.length>50)window.__neutralFrames.shift();}
      });
    });
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(![origin,petOrigin].includes(url.origin))return route.abort();
      if(url.origin===origin&&url.pathname.startsWith('/coopanion/')){
        const file=url.pathname.slice('/coopanion/'.length)||'index.html';
        if(!['index.html','index.js','styles.css','index.css'].includes(file))return route.abort();
        return route.fulfill({path:join(app,'build','console',file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
      }
      return route.continue();
    });
    await page.goto(origin+'/coopanion/',{waitUntil:'load'});
    const advanced=page.getByText(/^(高级模式|进入高级模式|切换高级模式|Advanced mode)$/).first();if(await advanced.isVisible())await advanced.click();
    await page.getByText('coo家园',{exact:true}).first().click({timeout:15_000});
    await page.getByTestId('coo-home-root').waitFor();
    await until(async()=>await page.getByTestId('home-status').innerText()==='已跟随当前角色','official figure frame render').catch(async error=>{logs+='\nHome status: '+await page.getByTestId('home-status').innerText();logs+='\nPage errors: '+JSON.stringify(errors);throw error;});
    assert.equal(await page.locator('.coo-home-root iframe').count(),1);
    await until(async()=>await page.evaluate(()=>window.__neutralFrames.length>=8),'official kit frames');
    const layouts=await page.evaluate(()=>window.__neutralFrames);
    assert.ok(layouts.every(value=>Math.abs(value.x-256)<.01),'The household anchor remains fixed with the official body kit');
    await page.locator('.coo-home-actor').waitFor({state:'visible',timeout:60_000});
    await page.evaluate(()=>{window.__neutralFrames=[];});
    const walking=await invoke('walk',[{position:[-7,.414,16.54]}]);
    assert.equal(walking.life.current.phase,'walking');
    await until(async()=>await page.evaluate(()=>{
      const frames=window.__neutralFrames;
      return frames.some(frame=>frame.moving)&&Math.max(...frames.map(frame=>frame.x))-Math.min(...frames.map(frame=>frame.x))>20;
    }),'official kit continuous walking',20_000);
    const strides=new Set(),anchorErrors=[],screenFeet=[];
    for(let i=0;i<12;i++){
      strides.add(await page.frameLocator('.coo-home-root iframe').locator('.fixture-body').getAttribute('data-stride'));
      const point=await page.evaluate(()=>{
        const frame=document.querySelector('.coo-home-root iframe'),layout=window.__neutralFrames.at(-1);
        const host=frame.parentElement.getBoundingClientRect(),shadow=frame.parentElement.querySelector('.coo-home-contact').getBoundingClientRect();
        // Official kit bodies on a fixed floor omit layout.y; this Figure
        // sandbox uses the panel's documented 448 px floor in a 512 px frame.
        const localY=Number.isFinite(layout.y)?layout.y:448;
        const p=new DOMMatrix(getComputedStyle(frame).transform).transformPoint(new DOMPoint(layout.x,localY));
        const x=host.left+p.x,y=host.top+p.y;
        return{x,y,local:[layout.x,layout.y],shadow:[shadow.left+shadow.width/2,shadow.top+shadow.height/2],error:Math.hypot(x-(shadow.left+shadow.width/2),y-(shadow.top+shadow.height/2))};
      });
      anchorErrors.push(point.error);screenFeet.push(point);await pause(80);
    }
    assert.ok(strides.size>2,'The official kit did not animate its legs; distinct strides='+strides.size);
    assert.ok(Math.max(...anchorErrors)<4,'Official body local walking escaped its projected household anchor: '+JSON.stringify(screenFeet));
    assert.ok(Math.hypot(screenFeet.at(-1).x-screenFeet[0].x,screenFeet.at(-1).y-screenFeet[0].y)>2,'World route did not advance the visible anchor');
    await invoke('pause');
    await pause(150);
    const held=await json(origin,statusPath);await pause(300);assert.deepEqual((await json(origin,statusPath)).life.position,held.life.position);
    await invoke('resume');await invoke('cancel');
    assert.deepEqual(errors,[],'Official host browser has no page errors');
    report.checks.browser='Official console and Figure frame: continuous kit walking, animated legs, compensated household anchor, pause/resume';
    report.checks.anchor={samples:anchorErrors.length,maxErrorPixels:Math.max(...anchorErrors)};
    const openPanel=async id=>{
      const panel=declaration.panels.find(value=>value.id===id);assert.ok(panel,`Official manifest has ${id} panel`);
      await page.locator('.providertabs').getByRole('button',{name:panel.title,exact:true}).click();
      await page.getByTestId(id==='home'?'coo-home-root':`home-${id}-page`).waitFor();
    };
    report.checks.chatBrowser=await verifyHostBrowserChat({page,provider,invoke,invokePanel,openPanel,until});
  }
  await json(origin,'/api/worlds/activation',{id:'desktop-pet',enabled:false});
  await until(()=>feed.values.findLast(value=>value.appearance)?.appearance.connected===false,'disconnect event');
  await json(origin,'/api/worlds/activation',{id:'desktop-pet',enabled:true});
  await until(()=>feed.values.findLast(value=>value.appearance)?.appearance.connected===true,'automatic reconnect');
  report.checks.reconnect='Desktop-pet stop/start recovers automatically';
  const pending=await invoke('command',[{itemId:'plot-1',actionId:'sow',cropId:'carrot'}]);
  assert.equal(pending.life.current.source,'manual');
  assert.equal(pending.life.garden.plots.find(plot=>plot.id==='plot-1').stage,'empty','Accepting a sowing task must not immediately plant the crop');
  await provider.plan({id:'world-stop',steps:[{text:'This stopped World reply must not be saved.',delayMs:10000}]});
  await invoke('chatSend',[{text:'NEUTRAL_WORLD_STOP',clientId:'neutral-world-stop'}]);
  await until(async()=>(await provider.audit()).some(row=>row.kind==='request'&&row.plan==='world-stop'),'in-flight chat before World stop');
  await json(origin,'/api/worlds/activation',{id:'coo-home',enabled:false});
  await until(async()=>(await provider.audit()).some(row=>row.kind==='cancelled'&&row.requestId.startsWith('world-stop')),'World stop cancels its model request');
  await until(()=>feed.readyState===WebSocket.CLOSED,'home stream disposal');
  await json(origin,'/api/worlds/activation',{id:'coo-home',enabled:true});
  await until(async()=>{const value=await json(origin,statusPath);return value.appearance?.connected;},'home reenable');
  const restored=await json(origin,statusPath);
  assert.equal(restored.life.current.id,pending.life.current.id,'Home did not restore the persisted in-progress activity');
  assert.equal(restored.life.autonomy,false);
  assert.equal(restored.life.version,4);
  assert.equal(restored.life.garden.plots.find(plot=>plot.id==='plot-1').stage,'empty');
  assert.equal(restored.life.current.cropId,'carrot');
  assert.ok(!restored.chat.messages.some(message=>message.text.includes('must not be saved')));
  if(report.checks.desktopReport){
    const events=await json(origin,'/api/events?source=coo-home&limit=1000&archive=1');
    assert.equal(events.events.filter(event=>event.senderKey===report.checks.desktopReport.senderKey).length,1,'Restart redelivered an official garden report');
    report.checks.desktopReport.restartDidNotDuplicate=true;
  }
  report.checks.garden='Eight empty plots loaded; a schema-4 sowing task and selected crop remain pending through a real World stop/start';
  report.checks.lifecycle='Disable closes the panel stream; reenable restores the saved independent home task and appearance watcher';
  console.log(JSON.stringify(report,null,2));
}catch(error){
  // Logs belong only to this generated deployment; never read the live app logs.
  if(process.env.COO_HOME_DEBUG==='1')console.error(logs);
  throw error;
}finally{
  await browser?.close();for(const socket of sockets)try{socket.close();}catch{}
  if(child&&!exited){child.send({type:'companion:shutdown'});for(let i=0;i<80&&!exited;i++)await pause(100);if(!exited)child.kill();}
  assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('coo-home-host-'));
  await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
