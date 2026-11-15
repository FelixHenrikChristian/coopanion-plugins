import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {startFixtureServer} from './fixtures/server.mjs';
import {verifyBrowserProjection} from './fixtures/browser-projection.mjs';
import {verifyBrowserCameraFollow} from './fixtures/browser-camera-follow.mjs';
import {verifyBrowserInteractions} from './fixtures/browser-interactions.mjs';
import {getNavigationData} from '../../../scenes/amane-mart/src/navigation-data.js';

const require=createRequire(import.meta.url),{chromium}=require(process.env.COO_HOME_PLAYWRIGHT_MODULE||'playwright');
const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await mkdtemp(join(tmpdir(),'coo-projection-'));
const output=resolve(process.env.COO_HOME_ARTIFACTS||join(packageRoot,'../../scratch/coo-home-projection'));
await mkdir(output,{recursive:true});
let fixture,browser;
const report={fixture:'neutral Figure API 2',checks:{},errors:[]};
try{
  // Compile into an isolated temporary file, without changing release artifacts.
  const bundlePath=join(temporary,'panel.js');
  await build({stdin:{contents:`export {mount} from './src/panel.js';
    import * as THREE from 'three';
    globalThis.__homeSupportProbe=(scene,id,p)=>{
      const object=scene.getObject(id);object.updateWorldMatrix(true,true);
      const ray=new THREE.Raycaster(new THREE.Vector3(p[0],p[1]+.02,p[2]),new THREE.Vector3(0,-1,0));
      const meshes=[];object.traverseVisible(o=>{if(o.isMesh&&!o.userData.interactionOutline)meshes.push(o);});
      return ray.intersectObjects(meshes,false).map(h=>({point:h.point.toArray(),name:h.object.name}));
    };`,resolveDir:packageRoot,loader:'js'},outfile:bundlePath,bundle:true,format:'esm',target:'es2022'});
  fixture=await startFixtureServer({bundlePath,stylePath:join(packageRoot,'src/panel.css'),worldOptions:{layout:getNavigationData()}});
  await fixture.invoke('settings',[{autonomy:false}]);
  browser=await chromium.launch({headless:true,...(process.env.COO_HOME_BROWSER?{executablePath:process.env.COO_HOME_BROWSER}:{}),args:process.argv.includes('--software')?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['http:','https:'].includes(url.protocol)&&![fixture.hostOrigin,fixture.petOrigin].includes(url.origin)?route.abort():route.continue();
  });
  await page.goto(fixture.hostOrigin);
  await page.waitForFunction(()=>window.__homeHarness?.panel?.actor.getState().maskReady&&document.querySelector('canvas')?.dataset.assembled==='true',null,{timeout:150000});
  const shot=name=>page.locator('[data-testid="coo-home-root"]').screenshot({path:join(output,`${name}.png`)});
  async function markerPixels(bytes){
    return page.evaluate(async base64=>{
      const image=await createImageBitmap(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/png'}));
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();
      const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let count=0;
      for(let i=0;i<data.length;i+=4)if(Math.abs(data[i]-239)<12&&Math.abs(data[i+1]-59)<12&&Math.abs(data[i+2]-157)<12&&data[i+3]>240)count++;
      return count;
    },bytes.toString('base64'));
  }
  if(process.argv.includes('--interactions'))await verifyBrowserInteractions({fixture,page,shot,markerPixels,report});
  else if(process.argv.includes('--camera-follow'))await verifyBrowserCameraFollow({fixture,page,shot,report});
  else await verifyBrowserProjection({fixture,page,shot,markerPixels,report});
  await page.evaluate(()=>window.__homeHarness.unmount());
  assert.equal(await page.locator('[data-testid="home-figure"]').count(),0);
  assert.deepEqual(report.errors,[]);
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{
  await browser?.close();await fixture?.dispose();
  assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert(basename(temporary).startsWith('coo-projection-'));
  await rm(temporary,{recursive:true,force:true,maxRetries:4,retryDelay:100});
}
