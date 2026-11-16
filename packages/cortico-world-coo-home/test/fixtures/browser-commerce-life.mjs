import assert from 'node:assert/strict';
import {getNavigationData} from '../../../../scenes/amane-mart/src/navigation-data.js';
import {createNavigationQuery} from '../../../../scenes/amane-mart/src/navigation-query.js';

// Real World and scene integration. Only the clock is accelerated; currency,
// stock, actor routes, poses and transactions come from production code.
export async function verifyBrowserCommerce({fixture,page,root,canvas,view,painted,shot,markerPixels}){
  const geometry=createNavigationQuery(getNavigationData());
  const snapshot=()=>fixture.snapshot().life;
  const quantity=(id,state=snapshot())=>state.inventory.items.find(item=>item.id===id)?.quantity??0;
  async function sync(state){await page.waitForFunction(({revision,now})=>{const life=window.__homeHarness.panel.getLifeState();return life?.revision>=revision&&life.now>=now;},{revision:state.life.revision,now:state.life.now});await painted(4);return state;}
  async function invoke(method,args=[]){return sync(await fixture.invoke(method,args));}
  async function until(time){return sync(time>snapshot().now+100?await fixture.advanceTo(time+10):await fixture.advance(110));}
  async function finish(){const task=snapshot().current;assert.ok(task);await until(task.endsAt);assert.ok(snapshot().recent.some(event=>event.id===task.id&&event.outcome==='completed'));return task;}
  async function clickItem(id,canonical){
    await view(id==='shop.entrance'?'exterior':'open');
    await page.evaluate(id=>{const s=window.__homeHarness.panel.scene,p=s.getItem(id).anchor;s.setCameraPose({eye:[p[0]+(id==='shop.entrance'?1.5:3),p[1]+(id==='shop.entrance'?1.2:4),p[2]+5],target:p});},id);await painted(5);
    const point=await page.evaluate(id=>{const s=window.__homeHarness.panel.scene,p=s.project(s.getItem(id).anchor);for(const dx of [0,-8,8,-20,20,-40,40,-60,60])for(const dy of [0,-8,8,-20,20,-40,40,-60,60]){const x=p.x+dx,y=p.y+dy;if(s.pickSurface(x,y)?.itemId===id)return{x,y};}return null;},id);
    if(!point)await shot(`commerce-unreachable-${id.replaceAll('.','-')}`);assert.ok(point,`Commerce target is not clickable: ${id}`);const before=snapshot().current?.id;
    await canvas.click({position:point});const action=root.locator(`[data-testid=home-action][data-item-id="${id}"][data-canonical="${canonical}"]`);await action.waitFor({state:'visible'});assert.equal(snapshot().current?.id,before,'Menu selection must not start an activity');await action.click();
    await root.getByTestId('home-commerce-dialog').waitFor({state:'visible'});assert.equal(snapshot().current?.id,before,'Opening commerce must not start an activity');
  }
  const product=id=>root.locator(`[data-testid=home-commerce-item][data-item-id="${id}"]`);
  async function setCount(id,count){const input=product(id).locator('input');await input.fill(String(count));await input.dispatchEvent('change');}
  async function confirm(itemId){const oldId=snapshot().current?.id;await root.getByTestId('home-commerce-submit').click();await page.waitForFunction(({itemId,oldId})=>{const task=window.__homeHarness.panel.getLifeState()?.current;return task?.itemId===itemId&&task.id!==oldId;},{itemId,oldId});await root.getByTestId('home-commerce-dialog').waitFor({state:'hidden'});return snapshot().current;}
  function checkRoute(task){assert.ok(task.route.length>1);for(let i=1;i<task.route.length;i++)assert.ok(geometry.segmentWalkable(task.route[i-1].position,task.route[i].position),'Commerce walking route crosses an obstacle');}
  async function inside(task,building,name){
    await until(task.arrivalAt);assert.equal(snapshot().current?.id,task.id);assert.equal(snapshot().current.phase,'acting');
    await view('cutaway');await page.evaluate(building=>{const s=window.__homeHarness.panel.scene;s.setCameraPose(building==='shop'?{eye:[4.8,6,5.2],target:[-.8,.8,-1.8]}:{eye:[-3.8,5.5,3.4],target:[-7.8,.8,-1.65]});},building);await painted(6);
    const state=await page.evaluate(()=>({actor:window.__homeHarness.panel.actor.getState(),building:window.__homeHarness.panel.scene.getBuildingState()}));
    assert.equal(state.building.active,building);assert.equal(state.building.buildings[building].visibleRoofs,0);
    const p=state.actor.placement.position;assert.ok(building==='shop'?p[0]>-4.9&&p[0]<2.1&&p[2]<.55:p[0]>-10.05&&p[0]<-6.6&&p[2]<.735,'Actor never entered the building');
    const bytes=await shot(name);if(markerPixels)assert.ok(await markerPixels(bytes)>12,`Actor invisible inside ${building}`);return state;
  }
  await invoke('settings',[{autonomy:false}]);await invoke('cancel');
  // Produce saleable stock without injecting inventory. The last plot is unused
  // by the garden UI suite and the free crop provides a repeatable fresh start.
  const plotId=snapshot().garden.plots.find(plot=>plot.id==='plot-8'&&plot.stage==='empty')?.id??snapshot().garden.plots.find(plot=>plot.stage==='empty')?.id;assert.ok(plotId);
  await invoke('command',[{itemId:plotId,actionId:'sow',cropId:'spring-onion'}]);await finish();await invoke('command',[{itemId:plotId,actionId:'water'}]);await finish();await until(snapshot().garden.plots.find(plot=>plot.id===plotId).readyAt);await invoke('command',[{itemId:plotId,actionId:'harvest'}]);await finish();
  const startedWith=snapshot().wallet.balance,cropBefore=quantity('spring-onion');assert.ok(cropBefore>=12);

  await clickItem('shop.entrance','sell');await setCount('spring-onion',12);await shot('commerce-sell-dialog');
  const sale=await confirm('shop.counter');checkRoute(sale);assert.equal(snapshot().wallet.balance,startedWith);assert.equal(quantity('spring-onion'),cropBefore);
  assert.ok(sale.route.some(point=>point.position[2]>6)&&sale.route.some(point=>point.position[2]<.55),'Sale did not route from home across the street into the store');
  const firstPosition=await page.evaluate(()=>window.__homeHarness.panel.actor.getState().placement.position);await until(sale.startedAt+(sale.arrivalAt-sale.startedAt)*.45);const walking=await page.evaluate(()=>window.__homeHarness.panel.actor.getState().placement.position);assert.ok(Math.hypot(walking[0]-firstPosition[0],walking[2]-firstPosition[2])>.5,'Visible actor did not move during the shop journey');
  await inside(sale,'shop','commerce-selling-at-counter');assert.equal(snapshot().wallet.balance,startedWith);assert.equal(quantity('spring-onion'),cropBefore);await until(sale.endsAt);
  assert.equal(snapshot().wallet.balance,startedWith+24);assert.equal(quantity('spring-onion'),cropBefore-12);

  await clickItem('shop.counter','buy');await setCount('seed-daikon',1);await setCount('food-milk',2);await setCount('food-senbei',1);await shot('commerce-shopping-dialog');
  const moneyBefore=snapshot().wallet.balance,milkBefore=quantity('food-milk'),seedBefore=quantity('seed-daikon'),purchase=await confirm('shop.counter');
  assert.equal(snapshot().wallet.balance,moneyBefore);assert.equal(quantity('food-milk'),milkBefore);assert.equal(snapshot().wallet.reserved,38);await inside(purchase,'shop','commerce-buying-at-counter');assert.equal(snapshot().wallet.balance,moneyBefore);await until(purchase.endsAt);
  assert.equal(snapshot().wallet.balance,moneyBefore-38);assert.equal(quantity('food-milk'),milkBefore+2);assert.equal(quantity('seed-daikon'),seedBefore+1);assert.equal(snapshot().wallet.reserved,0);
  assert.equal(await root.getByTestId('home-wallet').locator('strong').textContent(),(moneyBefore-38).toLocaleString('zh-CN'));

  // Accepted orders can be cancelled without spending; this uses the normal
  // life control, not a direct state reset or a commerce-specific shortcut.
  await clickItem('shop.counter','buy');await setCount('seed-daikon',1);const cancelled=await confirm('shop.counter');await root.getByTestId('home-cancel').click();await page.waitForFunction(()=>!window.__homeHarness.panel.getLifeState().current);
  assert.equal(snapshot().wallet.balance,moneyBefore-38);assert.equal(quantity('seed-daikon'),seedBefore+1);assert.equal(snapshot().wallet.reserved,0);assert.ok(snapshot().recent.some(event=>event.id===cancelled.id&&event.outcome!=='completed'));

  await clickItem('teahouse.cushion.front','orderTea');await product('tea-sencha').getByTestId('home-commerce-choose').click();await shot('commerce-tea-dialog');
  const teaMoney=snapshot().wallet.balance,tea=await confirm('teahouse.cushion.front');checkRoute(tea);assert.equal(snapshot().wallet.balance,teaMoney);
  const teaState=await inside(tea,'teahouse','commerce-tea-on-cushion');assert.equal(teaState.actor.word,'sit');assert.ok(teaState.actor.placement.position[1]>=.62,'Seated actor sinks into the tea cushion');assert.equal(snapshot().wallet.balance,teaMoney);await until(tea.endsAt);assert.equal(snapshot().wallet.balance,teaMoney-20);

  await root.getByTestId('home-backpack').click();await root.locator('[data-testid=home-backpack-category][data-category=food]').click();await shot('commerce-food-backpack');
  const milk=quantity('food-milk');await root.locator('[data-testid=home-backpack-use][data-item-id=food-milk]').click();await page.waitForFunction(()=>window.__homeHarness.panel.getLifeState().current?.actionId==='consume');const consume=snapshot().current;assert.equal(consume.itemId,'dining.dining');checkRoute(consume);assert.equal(quantity('food-milk'),milk);
  await until(consume.arrivalAt);assert.equal(quantity('food-milk'),milk);await page.evaluate(()=>window.__homeHarness.panel.scene.setCameraPose({eye:[-2,10,15],target:[-6,.8,10.1]}));await view('cutaway');await painted(6);await shot('commerce-drinking-at-home');await until(consume.endsAt);assert.equal(quantity('food-milk'),milk-1);
  const save=await fixture.readSave();assert.equal(save.economy.balance,snapshot().wallet.balance);assert.equal(save.economy.stock['food-milk'],milk-1);
  const kinds=snapshot().transactions.map(row=>row.kind);for(const kind of ['buy','sell','tea','consume'])assert.ok(kinds.includes(kind));
  return{realWorld:true,realRoutes:true,realHarvestForSale:true,storeEntered:true,shopCounterSettlement:true,teaCushionSeated:true,homeConsumption:true,acceptedOrdersDoNotSettle:true,cancelReleasesReservation:true,persistedInventory:true,balance:snapshot().wallet.balance};
}
