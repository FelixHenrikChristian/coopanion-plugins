import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CROP_CATALOG} from '../../src/garden.js';
import {economyCatalog} from '../../src/economy.js';

// Synthetic, in-memory UI fixture. It never imports a user profile or connects
// to the running host, and no fake settlements are written to game storage.
const packageRoot=fileURLToPath(new URL('../..',import.meta.url)),repo=resolve(packageRoot,'../..');
let moduleName=process.env.COO_HOME_PLAYWRIGHT_MODULE??'playwright';
if(moduleName!=='playwright')moduleName=pathToFileURL((await stat(moduleName)).isDirectory()?join(moduleName,'index.mjs'):moduleName).href;
const {chromium}=await import(moduleName),economy=economyCatalog();
const inventory=(id,quantity,reserved=0)=>{const item=economy.items.find(item=>item.id===id);return {...item,quantity,reserved,available:quantity-reserved};};
const data=JSON.stringify({catalog:{economy,crops:CROP_CATALOG},life:{now:1_800_000_000_000,wallet:{balance:100,reserved:80,available:20},inventory:{items:[inventory('spring-onion',12,4),inventory('carrot',4),inventory('seed-daikon',2,2),inventory('food-milk',2,1),inventory('food-senbei',1)],kindCount:5},garden:{crops:CROP_CATALOG,plots:[]}}}).replaceAll('<','\\u003c');
const shell=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/src/panel.css"><style>html,body{margin:0;height:100%}.coo-home-root{height:100vh;border-radius:0;background:radial-gradient(ellipse at 30% 100%,#46536d,#0c1322 72%)}.fixture-controls{position:absolute;top:14px;left:20px;display:flex;gap:10px}.fixture-controls button{border:0;border-radius:12px;padding:10px}</style><main class="coo-home-root"><div class="fixture-controls"><button data-testid="home-backpack">背包</button><button data-testid="home-follow">跟随角色</button></div></main><script type="module">
import {createCommercePanel} from '/src/commerce-panel.js';import {createBackpackPanel} from '/src/backpack-panel.js';import {createGardenPanel} from '/src/garden-panel.js';
const data=${data},root=document.querySelector('main'),controller=new AbortController();
const f=window.fixture={...data,root,controller,calls:[],feedback:[],uses:[],shopCalls:0,sowCalls:[],mode:'accepted',create:createCommercePanel};
const receive=life=>{f.life=life;f.panel.receive(life);f.backpack.receive(life);f.garden.receive(life);};
const accepted=()=>({phase:'life',life:structuredClone(f.life),commerce:{ok:true,accepted:true,taskId:'fixture-task'}});
const ctx={invoke:async(method,args)=>{f.calls.push({method,args:structuredClone(args)});if(f.mode==='unknown')throw Error('Synthetic lost response');if(f.mode==='business')return {phase:'life',life:structuredClone(f.life),commerce:{ok:false,error:'这笔订单未被接受，请调整数量。'}};if(f.mode==='pending')return await new Promise(resolve=>{f.finish=()=>resolve(accepted());});return accepted();}};
f.panel=createCommercePanel({root,ctx,signal:controller.signal,feedback:message=>f.feedback.push(message),onState:state=>receive(state.life)});
f.backpack=createBackpackPanel({root,signal:controller.signal,onUse:(item,button)=>{f.uses.push(item.id);f.backpack.close();if(f.panel.show('consume',{button,itemId:item.id}))void f.panel.submit();},onShop:button=>{f.shopCalls++;f.panel.show('buy',{button});}});
f.garden=createGardenPanel({root,signal:controller.signal,onSow:async(entry,action,cropId)=>{f.sowCalls.push({entry,action,cropId});return true;},onShop:button=>{f.shopCalls++;f.panel.show('buy',{button,category:'seed'});}});
f.panel.setCatalog(data.catalog);f.backpack.setCatalog(data.catalog.economy);f.garden.setCatalog(data.catalog);receive(f.life);f.receive=receive;
root.querySelector('[data-testid=home-backpack]').onclick=event=>f.backpack.show(event.currentTarget);window.ready=true;
</script>`;
const allowed=new Set(['commerce-panel.js','backpack-panel.js','garden-panel.js','ui-icons.js','panel.css']);
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end(shell);return;}const name=path.startsWith('/src/')?path.slice(5):'';if(!allowed.has(name)){res.writeHead(404);res.end();return;}res.setHeader('content-type',name.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(join(packageRoot,'src',name)));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.COO_HOME_BROWSER?{executablePath:process.env.COO_HOME_BROWSER}:{})});
try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
  const dialog=page.getByTestId('home-commerce-dialog'),submit=page.getByTestId('home-commerce-submit'),close=page.getByTestId('home-commerce-close'),item=id=>page.locator(`[data-testid=home-commerce-item][data-item-id="${id}"]`),input=id=>item(id).locator('input');
  const show=(kind,options={})=>page.evaluate(({kind,options})=>fixture.panel.show(kind,{button:document.querySelector('[data-testid=home-backpack]'),...options}),{kind,options});
  const quantity=async(id,count)=>{await input(id).fill(String(count));await input(id).dispatchEvent('change');};
  const filter=id=>page.locator(`[data-testid=home-commerce-filter][data-filter="${id}"]`).click();
  const shot=async name=>{if(!process.argv.includes('--screenshot'))return;const output=join(repo,'scratch/coo-home-commerce');await mkdir(output,{recursive:true});await page.screenshot({path:join(output,`${name}.png`)});};

  await show('buy',{category:'seed'});assert.equal(await dialog.isVisible(),true);assert.equal(await page.getByTestId('home-commerce-item').count(),8);
  assert.equal(await input('seed-spring-onion').isDisabled(),true);assert.match(await item('seed-spring-onion').textContent(),/永久免费/);
  await quantity('seed-daikon',2);assert.equal(await submit.isDisabled(),false);assert.match(await submit.textContent(),/16 金币/);
  await filter('drink');assert.equal(await page.getByTestId('home-commerce-item').count(),4);await quantity('food-milk',2);
  assert.match(await submit.textContent(),/36 金币/);assert.equal(await submit.isDisabled(),false,'Replacement orders release current reservations');
  await quantity('food-milk',99);assert.equal(await submit.isDisabled(),true);assert.match(await page.getByTestId('home-commerce-status').textContent(),/金币不足/);await quantity('food-milk',2);
  await shot('shop-drinks');await page.evaluate(()=>fixture.mode='pending');await submit.click();await submit.dispatchEvent('click');
  assert.equal(await page.evaluate(()=>fixture.calls.length),1);assert.equal(await submit.isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>fixture.calls[0].args[0].lines),[{itemId:'seed-daikon',quantity:2},{itemId:'food-milk',quantity:2}]);
  assert.match(await page.evaluate(()=>fixture.calls[0].args[0].requestId),/^1800000000000:[\w-]+$/);
  await close.click();assert.equal(await dialog.isVisible(),false);await page.evaluate(()=>fixture.finish());await page.waitForFunction(()=>!fixture.panel.getState().busy);
  assert.equal(await page.evaluate(()=>fixture.life.wallet.balance),100,'Acceptance must not deduct currency');
  assert.equal(await page.evaluate(()=>fixture.life.inventory.items.find(item=>item.id==='food-milk').quantity),2);

  await page.evaluate(()=>fixture.mode='unknown');await show('buy',{category:'seed'});await quantity('seed-daikon',1);await submit.click();await page.waitForFunction(()=>!fixture.panel.getState().busy);
  const uncertain=await page.evaluate(()=>fixture.calls.at(-1));assert.match(await submit.textContent(),/重试同一订单/);assert.equal(await input('seed-daikon').isDisabled(),true);
  await close.click();await page.getByTestId('home-backpack').click();await page.locator('[data-testid=home-backpack-use][data-item-id=food-milk]').click();assert.equal(await page.evaluate(()=>fixture.calls.length),2,'A food button must not silently retry an unresolved shopping order');await close.click();await show('tea',{seatId:'teahouse.cushion.back'});assert.equal(await dialog.getAttribute('data-kind'),'buy','An unresolved receipt cannot silently become another order');
  await page.evaluate(()=>fixture.mode='accepted');await submit.click();await page.waitForFunction(()=>!fixture.panel.open);
  assert.deepEqual(await page.evaluate(()=>fixture.calls.at(-1)),uncertain,'Retry must reuse the original id and complete payload');

  await show('buy',{category:'snack'});await quantity('food-senbei',1);await page.evaluate(()=>fixture.mode='business');await submit.click();await page.waitForFunction(()=>!fixture.panel.getState().busy);
  assert.equal(await input('food-senbei').isDisabled(),false);assert.equal(await page.evaluate(()=>fixture.panel.getState().pending),null);assert.match(await page.getByTestId('home-commerce-status').textContent(),/未被接受/);
  await close.click();await page.evaluate(()=>fixture.mode='accepted');

  await show('sell');await page.getByTestId('home-commerce-all').click();assert.equal(await input('spring-onion').inputValue(),'12');assert.equal(await input('carrot').inputValue(),'4');assert.match(await submit.textContent(),/44 金币/);
  await shot('sell-crops');await submit.click();await page.waitForFunction(()=>!fixture.panel.open);assert.equal(await page.evaluate(()=>fixture.calls.at(-1).args[0].kind),'sell');
  await show('tea',{seatId:'teahouse.cushion.back'});assert.equal(await page.getByTestId('home-commerce-item').count(),3);await item('tea-hojicha').getByTestId('home-commerce-choose').click();assert.match(await submit.textContent(),/26 金币/);await shot('teahouse-menu');await submit.click();await page.waitForFunction(()=>!fixture.panel.open);
  assert.deepEqual(await page.evaluate(()=>({lines:fixture.calls.at(-1).args[0].lines,seatId:fixture.calls.at(-1).args[0].seatId})),{lines:[{itemId:'tea-hojicha',quantity:1}],seatId:'teahouse.cushion.back'});

  await page.getByTestId('home-backpack').click();assert.equal(await page.getByTestId('home-backpack-item').count(),5);
  await page.locator('[data-testid=home-backpack-category][data-category=food]').click();assert.equal(await page.getByTestId('home-backpack-item').count(),2);assert.equal(await page.locator('[data-testid=home-backpack-use][data-item-id=food-milk]').textContent(),'饮用');await shot('backpack-food');
  await page.locator('[data-testid=home-backpack-use][data-item-id=food-milk]').click();await page.waitForFunction(()=>!fixture.panel.open);
  assert.deepEqual(await page.evaluate(()=>({kind:fixture.calls.at(-1).args[0].kind,lines:fixture.calls.at(-1).args[0].lines})),{kind:'consume',lines:[{itemId:'food-milk',quantity:1}]});
  // External settlement snapshots are the sole source of displayed balances/stock.
  await page.evaluate(()=>{const state=structuredClone(fixture.life);state.wallet={balance:64,reserved:0,available:64};state.inventory.items.find(item=>item.id==='food-milk').quantity=1;state.inventory.items.find(item=>item.id==='food-milk').available=1;state.inventory.items.find(item=>item.id==='food-milk').reserved=0;fixture.receive(state);});
  await show('consume',{itemId:'food-milk'});assert.match(await item('food-milk').textContent(),/1 瓶/);assert.equal(await page.getByTestId('home-commerce-wallet').locator('strong').textContent(),'64');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-commerce-submit');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-commerce-close');await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.testid),'home-backpack');

  await page.evaluate(()=>fixture.garden.chooseCrop({id:'plot-1'},'sow',document.querySelector('[data-testid=home-backpack]')));
  assert.equal(await page.getByTestId('home-crop-option').count(),8);assert.equal(await page.locator('[data-crop-id=tomato]').isDisabled(),true);assert.equal(await page.locator('[data-crop-id=spring-onion]').isDisabled(),false);assert.equal(await page.locator('[data-crop-id=daikon]').isDisabled(),false,'Replacing another sowing task may use its reserved seed');
  await page.locator('[data-crop-id=daikon]').click();await page.waitForFunction(()=>fixture.sowCalls.length===1);assert.equal(await page.evaluate(()=>fixture.sowCalls[0].cropId),'daikon');
  await page.evaluate(()=>fixture.garden.chooseCrop({id:'plot-2'},'sow',document.querySelector('[data-testid=home-backpack]')));await page.getByTestId('home-seed-shop').click();assert.equal(await dialog.getAttribute('data-kind'),'buy');assert.equal(await page.getByTestId('home-commerce-item').count(),8);
  await page.setViewportSize({width:390,height:820});await quantity('seed-daikon',1);await shot('shop-mobile');
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=820,'Narrow dialog stays within viewport');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>{fixture.controller.abort();fixture.panel.dispose();fixture.backpack.dispose();fixture.garden.dispose();fixture.panel.show('buy');fixture.panel.setCatalog(fixture.catalog);});assert.equal(await page.getByTestId('home-commerce-dialog').count(),0);assert.equal(await page.getByTestId('home-backpack-dialog').count(),0);assert.equal(await page.getByTestId('home-garden-dialog').count(),0);
  for(let i=0;i<3;i++){await page.evaluate(()=>{const controller=new AbortController(),p=fixture.create({root:fixture.root,ctx:{invoke:async()=>({})},signal:controller.signal});p.setCatalog(fixture.catalog);p.receive(fixture.life);p.show('buy');controller.abort();p.dispose();});assert.equal(await page.getByTestId('home-commerce-dialog').count(),0);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({commerceBrowser:'passed',catalogCategories:true,freeSeed:true,manualReplacement:true,amountChecks:true,submitOnce:true,idempotentRetry:true,businessFailure:true,realSnapshotOnly:true,sellAll:true,teaSeat:true,backpackConsume:true,seedStocks:true,keyboardAndNarrow:true,abortAndRemount:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
