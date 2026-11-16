import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CROP_CATALOG,createGarden,applyGardenAction,advanceGarden,inventorySnapshot} from '../../src/garden.js';

const packageRoot=fileURLToPath(new URL('../..',import.meta.url)),repo=resolve(packageRoot,'../..');
let moduleName=process.env.COO_HOME_PLAYWRIGHT_MODULE??'playwright';
if(moduleName!=='playwright')moduleName=pathToFileURL((await stat(moduleName)).isDirectory()?join(moduleName,'index.mjs'):moduleName).href;
const {chromium}=await import(moduleName),layout=JSON.parse(await readFile(join(packageRoot,'data/home-layout.json'),'utf8')),garden=createGarden(layout);
const empty={inventory:inventorySnapshot(garden)};let now=1000;
for(const [i,crop] of CROP_CATALOG.entries()){
  const plot=garden.plots[i];applyGardenAction(garden,plot.id,'sow',now,plot.cycle,crop.id);applyGardenAction(garden,plot.id,'water',now+1,plot.cycle);
  now+=crop.durationMs+2;advanceGarden(garden,now);applyGardenAction(garden,plot.id,'harvest',now,plot.cycle);
}
const populated={inventory:inventorySnapshot(garden)},fixtureData=JSON.stringify({empty,populated}).replaceAll('<','\\u003c');
const shell=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/src/panel.css"><style>html,body{margin:0;height:100%}[hidden]{display:none!important}.coo-home-root{width:100vw;height:100vh}</style><main class="coo-home-root" id="root"><button data-testid="home-backpack">背包</button><button id="outside">外部按钮</button></main><script type="module">import {createBackpackPanel} from '/src/backpack-panel.js';const fixtures=${fixtureData},root=document.querySelector('main'),controller=new AbortController();const panel=createBackpackPanel({root,signal:controller.signal}),trigger=root.querySelector('button');trigger.onclick=()=>panel.show(trigger);window.fixture={fixtures,panel,controller,root,create:createBackpackPanel};panel.receive(fixtures.empty);window.ready=true;</script>`;
const allowed=new Set(['backpack-panel.js','ui-icons.js','panel.css']);
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end(shell);return;}
  const name=path.startsWith('/src/')?path.slice(5):'';if(!allowed.has(name)){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',name.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(join(packageRoot,'src',name)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.COO_HOME_BROWSER?{executablePath:process.env.COO_HOME_BROWSER}:{})});
try{
  const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
  const toggle=page.getByTestId('home-backpack'),dialog=page.getByTestId('home-backpack-dialog'),close=page.getByTestId('home-backpack-close');
  assert.equal(await dialog.isVisible(),false);await toggle.click();assert.equal(await dialog.isVisible(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.getByTestId('home-backpack-empty').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack-close');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack-shop');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack-close');
  await page.evaluate(()=>fixture.panel.receive(fixture.fixtures.populated));
  assert.equal(await page.getByTestId('home-backpack-item').count(),8);assert.equal(await page.getByTestId('home-backpack-empty').isVisible(),false);
  for(const item of populated.inventory.items){const card=page.locator(`[data-testid="home-backpack-item"][data-crop-id="${item.cropId}"]`);assert.equal(await card.getAttribute('data-quantity'),String(item.quantity));assert.ok((await card.textContent()).includes(`${item.quantity} ${item.unit}`));}
  assert.equal(await page.locator('[data-testid=home-backpack-item] svg').count(),8);
  assert.equal(new Set(await page.locator('[data-testid=home-backpack-item] svg').evaluateAll(nodes=>nodes.map(node=>node.innerHTML))).size,8);
  await page.evaluate(()=>{window.firstCard=document.querySelector('[data-testid=home-backpack-item]');fixture.panel.receive(structuredClone(fixture.fixtures.populated));});
  assert.equal(await page.evaluate(()=>window.firstCard===document.querySelector('[data-testid=home-backpack-item]')),true,'Unchanged snapshots should not rebuild the grid');
  if(process.argv.includes('--screenshot')){const output=join(repo,'scratch/coo-home-backpack');await mkdir(output,{recursive:true});await page.screenshot({path:join(output,'backpack-filled.png')});}
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack');
  await page.evaluate(()=>{const state=structuredClone(fixture.fixtures.populated);state.inventory.items[0].quantity=24;fixture.panel.receive(state);});await toggle.click();assert.equal(await page.locator('[data-crop-id="spring-onion"]').getAttribute('data-quantity'),'24');
  await close.click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack');
  await toggle.click();await page.locator('.coo-home-backpack-overlay').dispatchEvent('click');assert.equal(await dialog.isVisible(),false);
  await page.evaluate(()=>fixture.panel.receive(fixture.fixtures.empty));await toggle.click();assert.equal(await page.getByTestId('home-backpack-empty').isVisible(),true);assert.equal(await page.getByTestId('home-backpack-item').count(),0);
  await page.evaluate(()=>{fixture.controller.abort();fixture.panel.dispose();fixture.panel.show();fixture.panel.receive(fixture.fixtures.populated);});assert.equal(await page.getByTestId('home-backpack-dialog').count(),0);
  for(let i=0;i<3;i++){await page.evaluate(()=>{const controller=new AbortController(),p=fixture.create({root:fixture.root,signal:controller.signal});p.receive(fixture.fixtures.populated);p.show();controller.abort();p.dispose();});assert.equal(await page.getByTestId('home-backpack-dialog').count(),0);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({backpackBrowser:'passed',empty:true,eightCropIcons:true,liveQuantities:true,stableGrid:true,escapeAndFocus:true,abortAndRemount:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
