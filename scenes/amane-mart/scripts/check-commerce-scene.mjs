import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {getNavigationData,getActionSlots} from '../src/navigation-data.js';
import {createNavigationQuery} from '../src/navigation-query.js';
import {HomeNavigation} from '../../../packages/cortico-world-coo-home/src/navigation.js';

// Runs from source in an isolated browser. Never rebuilds a release or touches
// a user's deployed World state; images go to an ignored scratch directory.
const require=createRequire(import.meta.url),{chromium}=require(process.env.COO_HOME_PLAYWRIGHT_MODULE||'playwright');
const output=resolve(process.env.COO_HOME_ARTIFACTS||fileURLToPath(new URL('../../../scratch/coo-home-commerce-scene/',import.meta.url)));
await mkdir(output,{recursive:true});
const data=getNavigationData(),navigation=new HomeNavigation(data),query=createNavigationQuery(data);
const report={routes:{},browser:{},errors:[]};
for(const id of ['shop.counter','shop.snacks','shop.drinks','teahouse.menu','teahouse.cushion.front','teahouse.cushion.back']){
  const route=navigation.route(data.spawn,data.items.find(i=>i.id===id).position);
  assert(route.points.some(p=>p[2]>2.55&&p[2]<6.15),'Must walk across the existing crossing');
  for(const p of route.points){assert(query.isWalkable(p[0],p[2]));assert(Math.abs(query.surfaceAt(p[0],p[2]).y-p[1])<1e-6);}
  for(let i=1;i<route.points.length;i++)assert(query.segmentWalkable(route.points[i-1],route.points[i]));
  report.routes[id]={distance:route.distance,points:route.points};
}
const result=await build({stdin:{contents:`import {createNeighborhood} from './scene.js';import * as THREE from 'three';
  window.scene=createNeighborhood({root:document.querySelector('main'),reducedMotion:true,autoStart:false});
  scene.finishAssembly();scene.update(0);
  window.probeSupport=(id,point)=>{const object=scene.getObject(id);object.updateWorldMatrix(true,true);const ray=new THREE.Raycaster(new THREE.Vector3(point[0],point[1]+.02,point[2]),new THREE.Vector3(0,-1,0));return ray.intersectObject(object,true).map(h=>h.point.toArray());};
  window.probeLights=()=>{let root=scene.getObject('shop.counter');while(root.parent)root=root.parent;const result=[];root.traverse(o=>{if(o.isPointLight)result.push({power:o.intensity,position:o.position.toArray()});});return result;};
  window.ready=true;`,resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),loader:'js'},bundle:true,format:'esm',target:'es2022',write:false});
const html='<!doctype html><html><head><meta charset="utf-8"><style>html,body,main{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body><main></main><script type="module" src="/scene.js"></script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/scene.js'?'text/javascript':'text/html');res.end(req.url==='/scene.js'?result.outputFiles[0].text:html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.COO_HOME_BROWSER?{executablePath:process.env.COO_HOME_BROWSER}:{}),args:process.argv.includes('--software')?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready,null,{timeout:150000});
  assert.equal(await page.evaluate(()=>scene.listItems().length),47);
  report.browser.initial=await page.evaluate(()=>scene.getRendererInfo());
  const pose={eye:[9,7,18],target:[-1.3,1.1,-1.8]};
  await page.evaluate(pose=>{scene.setCameraPose(pose);scene.setActorPosition([.54,.339,-1.78]);scene.setView('cutaway');scene.update(100);},pose);
  report.browser.shop=await page.evaluate(()=>({state:scene.getBuildingState(),lights:probeLights()}));
  assert.equal(report.browser.shop.state.active,'shop');assert.equal(report.browser.shop.state.buildings.shop.visibleRoofs,0);
  assert.equal(report.browser.shop.state.buildings.home.visibleRoofs,report.browser.shop.state.buildings.home.roofs);
  assert(report.browser.shop.lights.filter(l=>l.position[0]>-5&&l.position[0]<2&&l.position[2]<.6&&l.position[2]>-4.7).every(l=>l.power>0));
  await page.screenshot({path:join(output,'shop-low.png')});
  await page.evaluate(()=>{scene.setCameraPose({eye:[-.4,18,7],target:[-1.3,.8,-1.8]});scene.update(200);});
  await page.screenshot({path:join(output,'shop-high.png')});
  const before=await page.evaluate(()=>scene.getCameraPose());
  for(const mode of ['exterior','walls','open','cutaway']){
    const state=await page.evaluate(mode=>{scene.setView(mode);scene.update(300);return scene.getBuildingState();},mode);
    const after=await page.evaluate(()=>scene.getCameraPose());
    assert([...after.eye,...after.target].every((v,i)=>Math.abs(v-[...before.eye,...before.target][i])<1e-9),'Wall modes cannot move the camera');
    for(const b of Object.values(state.buildings)){
      if(mode==='exterior'){assert.equal(b.visibleWalls,b.walls);assert.equal(b.visibleRoofs,b.roofs);}
      if(mode==='walls'){assert.equal(b.visibleWalls,b.walls);assert.equal(b.visibleRoofs,0);}
      if(mode==='open'){assert.equal(b.visibleWalls,0);assert.equal(b.visibleRoofs,0);}
    }
  }
  for(const id of ['teahouse.cushion.front','teahouse.cushion.back']){
    const slot=getActionSlots(id).find(a=>a.id==='orderTea');
    const hits=await page.evaluate(({id,p})=>probeSupport(id,p),{id,p:slot.pose.anchor});
    assert(hits.length);assert(Math.abs(hits[0][1]-slot.pose.support.position[1])<1e-6,'Tea support must match actual cushion top');
    assert(slot.pose.position[1]>hits[0][1]);
  }
  await page.evaluate(()=>{scene.setActorPosition([-7.64,.6475,-1.06]);scene.setCameraPose({eye:[-3.9,8,10],target:[-8.2,.8,-1.5]});scene.update(400);});
  report.browser.tea=await page.evaluate(()=>({state:scene.getBuildingState(),lights:probeLights()}));
  assert.equal(report.browser.tea.state.active,'teahouse');assert.equal(report.browser.tea.state.buildings.teahouse.visibleRoofs,0);
  assert.equal(report.browser.tea.state.buildings.shop.visibleRoofs,report.browser.tea.state.buildings.shop.roofs);
  assert(report.browser.tea.lights.filter(l=>l.position[0]<-6.5&&l.position[2]<.8).every(l=>l.power>0));
  await page.screenshot({path:join(output,'tea-cutaway.png')});
  report.browser.door=await page.evaluate(()=>{scene.setActorPosition([.525,.211,1.05]);for(let i=0;i<24;i++)scene.update(450+i*50);const open=scene.getBuildingState().door;scene.setActorPosition([.95,.327,9.45]);for(let i=0;i<24;i++)scene.update(1700+i*50);return{open,closed:scene.getBuildingState().door};});
  assert.equal(report.browser.door.open.open,1);assert.equal(report.browser.door.closed.open,0);
  const frames=await page.evaluate(()=>scene.getRendererInfo().frames);await new Promise(r=>setTimeout(r,100));
  assert.equal(await page.evaluate(()=>scene.getRendererInfo().frames),frames,'Stopped scene cannot run a separate door animation loop');
  await page.evaluate(()=>{scene.setView('exterior');scene.setCameraPose({eye:[35,30,42],target:[3.325,2.35,3.9]});scene.update(3000);});
  await page.screenshot({path:join(output,'world-exterior.png')});
  report.browser.final=await page.evaluate(()=>scene.getRendererInfo());
  assert.deepEqual(report.errors,[]);await page.evaluate(()=>scene.dispose());
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,routes:Object.keys(report.routes).length,checks:'47 targets, existing crossing, supports, four wall modes, no camera movement, lights, automatic doors, stopped lifecycle',errors:report.errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
