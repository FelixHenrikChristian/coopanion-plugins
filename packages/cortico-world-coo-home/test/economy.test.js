import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HomeLife,normalizeLifeState} from '../src/life.js';
import {CROP_CATALOG} from '../src/garden.js';
import {ECONOMY_CATALOG,quoteCommerce,ECONOMY_LIMIT} from '../src/economy.js';

const layout=JSON.parse(readFileSync(new URL('../data/home-layout.json',import.meta.url),'utf8'));
// Economy unit tests reuse a known reachable room point; scene/host checks use
// the actual shop entrance, crosswalk, counter and tea cushions.
function action(item,id){const base=structuredClone(item.actions[0]);return{...base,id,canonicalId:id,label:id};}
const table=layout.items.find(item=>item.id==='dining.dining');
if(!table.actions.some(row=>row.id==='consume'))table.actions.push(action(table,'consume'));
if(!layout.items.some(item=>item.id==='shop.counter'))layout.items.push({...structuredClone(table),id:'shop.counter',label:'便利店收银台',room:'shop',actions:[action(table,'buy'),action(table,'sell')]});
for(const id of ['teahouse.cushion.front','teahouse.cushion.back'])if(!layout.items.some(item=>item.id===id))layout.items.push({...structuredClone(table),id,label:'茶房坐垫',room:'teahouse',actions:[action(table,'orderTea'),action(table,'sit')]});
function fixture(state){
  let now=state?.updatedAt??Date.UTC(2030,0,1),serial=0;const life=new HomeLife({layout,state,clock:()=>now});life.settings({autonomy:false});
  return{life,now:()=>now,set(value,{offline=false}={}){now=value;life.advance(now,{offline});},id(){return`${now}:fixture-${++serial}`;},finish(){assert.ok(life.state.current);now=life.state.current.endsAt+1;life.advance(now);},trade(kind,itemId,quantity=1,extra={}){return life.commerce({kind,lines:[{itemId,quantity}],requestId:this.id(),...extra});}};
}
function harvest(f,cropId='spring-onion',plotId='plot-1'){
  f.life.command({itemId:plotId,actionId:'sow',cropId});f.finish();f.life.command({itemId:plotId,actionId:'water'});f.finish();f.set(f.life.snapshot().garden.plots.find(plot=>plot.id===plotId).readyAt);f.life.command({itemId:plotId,actionId:'harvest'});f.finish();
}
const amount=(f,id)=>f.life.snapshot().inventory.items.find(item=>item.id===id)?.quantity??0;

test('initial coins, free onions and paid seed prices have increasing per-bed net returns',()=>{
  const f=fixture();assert.equal(f.life.state.version,5);assert.deepEqual(f.life.snapshot().wallet,{balance:100,reserved:0,available:100});assert.deepEqual(f.life.snapshot().inventory,{items:[],kindCount:0});
  assert.deepEqual(CROP_CATALOG.map(c=>c.seedPrice),[0,8,12,18,24,32,40,50]);
  const profits=CROP_CATALOG.map(c=>c.yieldCount*c.sellPrice-c.seedPrice);assert.deepEqual(profits,[24,40,48,66,76,100,104,130]);
  assert.ok(profits.every((value,index)=>!index||value>profits[index-1]));assert.equal(ECONOMY_CATALOG.filter(i=>i.category==='food').length,10);
  assert.throws(()=>f.trade('buy','seed-spring-onion'),/无限免费/);assert.throws(()=>f.life.command({itemId:'plot-1',actionId:'sow',cropId:'carrot'}),/种子包数量不足/);
  harvest(f);assert.equal(amount(f,'spring-onion'),12);assert.equal(f.life.state.economy.balance,100);
});

test('sales, shopping and eating settle only after completion and preserve lifetime harvests',()=>{
  const f=fixture();harvest(f);const requestId=f.id(),input={kind:'sell',lines:[{itemId:'spring-onion',quantity:6}],requestId};
  const receipt=f.life.commerce(input);assert.equal(receipt.total,12);assert.equal(amount(f,'spring-onion'),12);assert.equal(f.life.state.economy.balance,100);
  assert.deepEqual(f.life.snapshot().inventory.items[0],{id:'spring-onion',category:'crop',cropId:'spring-onion',label:'小葱',quantity:12,reserved:6,available:6,unit:'束',usable:false});
  f.finish();assert.equal(amount(f,'spring-onion'),6);assert.equal(f.life.state.economy.balance,112);assert.equal(f.life.state.garden.plots[0].harvestedByCrop['spring-onion'],12);
  f.trade('buy','food-milk',2);assert.deepEqual(f.life.snapshot().wallet,{balance:112,reserved:20,available:92});assert.equal(amount(f,'food-milk'),0);f.finish();assert.equal(amount(f,'food-milk'),2);assert.equal(f.life.state.economy.balance,92);
  f.life.state.needs.hunger=10;f.trade('consume','food-milk');assert.equal(amount(f,'food-milk'),2);f.finish();assert.equal(amount(f,'food-milk'),1);assert.ok(f.life.state.needs.hunger>20);
  assert.equal(f.life.snapshot().transactions.length,3);assert.deepEqual(f.life.snapshot().transactions.map(t=>t.coinDelta),[12,-20,0]);
});

test('duplicate requests cannot charge twice, change quantities or restart cancelled work',()=>{
  const f=fixture(),requestId=f.id(),input={kind:'buy',lines:[{itemId:'food-milk',quantity:2}],requestId},first=f.life.commerce(input),counter=f.life.state.counter;
  assert.equal(f.life.commerce(input).duplicate,true);assert.equal(f.life.state.counter,counter);assert.throws(()=>f.life.commerce({...input,lines:[{itemId:'food-milk',quantity:1}]}),/同一笔交易/);
  f.finish();const retry=f.life.commerce(input);assert.equal(retry.taskId,first.taskId);assert.equal(retry.transactionStatus,'completed');assert.equal(f.life.state.current,null);assert.equal(f.life.state.economy.balance,80);assert.equal(amount(f,'food-milk'),2);
  const second={kind:'buy',lines:[{itemId:'seed-carrot',quantity:2}],requestId:f.id()};f.life.commerce(second);f.life.cancel();assert.equal(f.life.snapshot().wallet.reserved,0);assert.equal(f.life.commerce(second).transactionStatus,'cancelled');assert.equal(f.life.state.current,null);
});

test('replacing a reservation releases it; rejected orders preserve the current task',()=>{
  const f=fixture();f.trade('buy','seed-pepper',2);const first=f.life.state.current.id;
  assert.throws(()=>f.trade('buy','seed-pepper',3),/金币不足/);assert.equal(f.life.state.current.id,first);assert.equal(f.life.snapshot().wallet.available,0);
  f.trade('buy','food-milk',2);assert.equal(f.life.snapshot().wallet.reserved,20);assert.equal(f.life.state.economy.requests[0].status,'cancelled');
  f.life.command({itemId:'living.sofa',actionId:'sit'});assert.equal(f.life.snapshot().wallet.reserved,0);assert.equal(f.life.state.economy.balance,100);assert.equal(amount(f,'food-milk'),0);
});

test('queued sale funds a later buy and bought seed supplies a later garden plan',()=>{
  const f=fixture();harvest(f);f.life.state.economy.balance=0;
  f.trade('sell','spring-onion',12);f.trade('buy','seed-carrot',1,{enqueue:true});f.life.gardenPlan({plotIds:['plot-2'],cropId:'carrot',enqueue:true});
  assert.equal(f.life.state.economy.balance,0);assert.equal(amount(f,'seed-carrot'),0);assert.equal(f.life.state.queue.length,3);
  f.finish();assert.equal(f.life.state.economy.balance,24);f.finish();assert.equal(f.life.state.economy.balance,12);assert.equal(amount(f,'seed-carrot'),1);f.finish();assert.equal(amount(f,'seed-carrot'),0);f.finish();assert.equal(f.life.snapshot().garden.plots[1].stage,'seedling');
});

test('failed predecessor never credits coins and dependent purchase is cancelled',()=>{
  const f=fixture();harvest(f);f.life.state.economy.balance=0;f.trade('sell','spring-onion',12);f.trade('buy','food-milk',1,{enqueue:true});
  delete f.life.state.economy.stock['spring-onion'];f.finish();assert.equal(f.life.state.economy.balance,0);assert.equal(amount(f,'food-milk'),0);assert.equal(f.life.state.current,null);assert.ok(f.life.state.economy.requests.every(row=>row.status==='cancelled'));
});

test('paid seed is reserved by each bed, used once on completion and returned when cancelled',()=>{
  const f=fixture();f.trade('buy','seed-carrot',2);f.finish();f.life.gardenPlan({plotIds:['plot-1','plot-2'],cropId:'carrot'});
  const seed=f.life.snapshot().inventory.items.find(i=>i.id==='seed-carrot');assert.equal(seed.quantity,2);assert.equal(seed.reserved,2);assert.equal(seed.available,0);
  f.finish();assert.equal(amount(f,'seed-carrot'),1);f.life.cancel();assert.equal(f.life.snapshot().inventory.items.find(i=>i.id==='seed-carrot').reserved,0);assert.equal(f.life.snapshot().garden.plots[0].stage,'seeded');assert.equal(f.life.snapshot().garden.plots[1].stage,'empty');
});

test('tea uses the chosen cushion and only a completed visit costs coins and restores comfort',()=>{
  const f=fixture();f.life.state.needs.comfort=10;f.trade('tea','tea-matcha',1,{seatId:'teahouse.cushion.back'});assert.equal(f.life.state.current.itemId,'teahouse.cushion.back');assert.equal(f.life.state.current.durationMs,65_000);assert.equal(f.life.snapshot().wallet.reserved,36);
  f.life.cancel();assert.equal(f.life.state.economy.balance,100);assert.equal(f.life.snapshot().wallet.reserved,0);
  f.trade('tea','tea-sencha');f.finish();assert.equal(f.life.state.economy.balance,80);assert.ok(f.life.state.needs.comfort>30);assert.equal(f.life.snapshot().inventory.kindCount,0);
});

test('saved pending orders, pause, offline completion and repeated restart preserve exact settlement',()=>{
  const f=fixture();const input={kind:'buy',lines:[{itemId:'food-bento',quantity:2}],requestId:f.id()};f.life.commerce(input);f.life.pause();const saved=f.life.export();
  const restored=fixture(saved);restored.set(saved.updatedAt+3*60*60_000,{offline:true});assert.equal(restored.life.state.economy.balance,100);assert.equal(amount(restored,'food-bento'),0);restored.life.resume();restored.finish();assert.equal(restored.life.state.economy.balance,44);assert.equal(amount(restored,'food-bento'),2);
  const again=fixture(restored.life.export());again.set(again.now()+4*60*60_000,{offline:true});assert.equal(again.life.state.economy.balance,44);assert.equal(amount(again,'food-bento'),2);assert.equal(again.life.commerce(input).transactionStatus,'completed');
});

test('format 4 known harvests migrate once without clearing crop progress or repeating initial coins',()=>{
  const f=fixture();harvest(f);const old=f.life.export();old.version=4;delete old.economy;
  const migrated=fixture(old);assert.equal(amount(migrated,'spring-onion'),12);assert.equal(migrated.life.state.economy.balance,100);migrated.trade('sell','spring-onion',6);migrated.finish();
  const again=fixture(migrated.life.export());assert.equal(amount(again,'spring-onion'),6);assert.equal(again.life.state.economy.balance,112);assert.equal(again.life.state.garden.plots[0].harvestedByCrop['spring-onion'],12);
  const ancient=structuredClone(old);ancient.version=3;delete ancient.garden.plots[0].harvestedByCrop;for(const plot of ancient.garden.plots)delete plot.harvestedByCrop;assert.equal(fixture(ancient).life.snapshot().inventory.kindCount,0);
});

test('old accepted paid crop sowing gets one task-bound exemption and never grants reusable seeds',()=>{
  const f=fixture();f.life.state.economy.stock['seed-carrot']=2;f.life.gardenPlan({plotIds:['plot-1','plot-2'],cropId:'carrot'});const old=f.life.export();old.version=4;delete old.economy;for(const task of [old.current,...old.queue])delete task.seedItemId;
  const migrated=fixture(old);assert.equal(migrated.life.state.current.legacySeedExempt,true);assert.equal(amount(migrated,'seed-carrot'),0);migrated.finish();assert.equal(migrated.life.snapshot().garden.plots[0].stage,'seeded');
  const again=fixture(migrated.life.export());while(again.life.state.current)again.finish();assert.equal(again.life.snapshot().garden.plots[1].stage,'seedling');assert.equal(amount(again,'seed-carrot'),0);assert.throws(()=>again.life.command({itemId:'plot-3',actionId:'sow',cropId:'carrot'}),/数量不足/);
});

test('paid goods cannot be acquired or consumed through plain or autonomous actions',()=>{
  const f=fixture();for(const [itemId,actionId] of [['shop.counter','buy'],['shop.counter','sell'],['teahouse.cushion.front','orderTea'],['dining.dining','consume']])assert.throws(()=>f.life.command({itemId,actionId}),/选择具体商品/);
  f.life.settings({autonomy:true});f.set(f.now()+1000);for(const [itemId,actionId,cropId] of [['shop.counter','buy'],['dining.dining','consume'],['plot-1','sow','carrot']])assert.throws(()=>f.life.autonomous({itemId,actionId,cropId}),/不会购买|手动任务优先/);
  const before=structuredClone(f.life.state.economy);f.set(f.now()+7*24*60*60_000,{offline:true});assert.deepEqual(f.life.state.economy,before);
});

test('server catalog rejects price injection, unknown products, excessive totals and expired replay',()=>{
  const f=fixture();assert.throws(()=>quoteCommerce({kind:'buy',lines:[{itemId:'food-milk',quantity:1,unitPrice:0}]}),/商品或数量无效/);assert.throws(()=>f.trade('sell','food-milk'),/不支持/);assert.throws(()=>f.trade('buy','food-unknown'),/目录/);assert.throws(()=>f.trade('buy','food-milk',100),/数量无效/);assert.throws(()=>f.trade('sell','pepper',ECONOMY_LIMIT),/金额过大/);
  const input={kind:'buy',lines:[{itemId:'food-milk',quantity:1}],requestId:f.id()};f.life.commerce(input);f.finish();f.set(f.now()+3*24*60*60_000);f.trade('buy','food-milk');f.finish();assert.throws(()=>f.life.commerce(input),/已过期/);
  const saved=f.life.export();saved.economy.balance=-1;assert.throws(()=>normalizeLifeState(saved,layout,f.now()));
});

test('sell all supports more than 99 crops without selling reserved purchases or changing history',()=>{
  const f=fixture();f.life.state.economy.stock.carrot=120;f.trade('sell','carrot',120);assert.equal(f.life.snapshot().inventory.items.find(i=>i.id==='carrot').reserved,120);f.finish();assert.equal(amount(f,'carrot'),0);assert.equal(f.life.state.economy.balance,700);
  const saved=f.life.export(),again=fixture(saved);assert.equal(again.life.state.economy.balance,700);assert.equal(amount(again,'carrot'),0);assert.equal(again.life.snapshot().transactions[0].lines[0].quantity,120);
});

test('saved reservations reject orphaned receipts, altered quotes and impossible stock',()=>{
  const f=fixture();f.trade('buy','food-milk',2);const saved=f.life.export();
  const altered=structuredClone(saved);altered.current.commerce.quote.total=0;assert.throws(()=>normalizeLifeState(altered,layout,f.now()),/prices/);
  const orphan=structuredClone(saved);orphan.current=null;assert.throws(()=>normalizeLifeState(orphan,layout,f.now()),/Orphaned/);
  const missing=structuredClone(saved);missing.economy.requests=[];assert.throws(()=>normalizeLifeState(missing,layout,f.now()),/reservation/);
  const poor=structuredClone(saved);poor.economy.balance=1;assert.throws(()=>normalizeLifeState(poor,layout,f.now()),/reservations/);
  const future=structuredClone(saved);future.version=6;assert.throws(()=>normalizeLifeState(future,layout,f.now()),error=>error.code==='HOME_SAVE_UNSUPPORTED');
});
