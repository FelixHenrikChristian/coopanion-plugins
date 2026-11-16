import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HomeLife} from '../src/life.js';
import {CROP_CATALOG} from '../src/garden.js';

const layout=JSON.parse(readFileSync(new URL('../data/home-layout.json',import.meta.url),'utf8'));
function fixture(state){
  let now=Date.UTC(2030,0,1);const life=new HomeLife({layout,state,clock:()=>now});life.settings({autonomy:false});
  return{life,setTime(value){now=value;life.advance(now);},finish(){now=life.state.current.endsAt;life.advance(now);}};
}
function ready(f,itemId,cropId){
  // Growth/backpack tests supply a seed fixture; economy.test.js verifies buying it.
  if(cropId!=='spring-onion')f.life.state.economy.stock[`seed-${cropId}`]=(f.life.state.economy.stock[`seed-${cropId}`]??0)+1;
  f.life.command({itemId,actionId:'sow',cropId});f.finish();f.life.command({itemId,actionId:'water'});f.finish();f.setTime(f.life.snapshot().garden.plots.find(plot=>plot.id===itemId).readyAt);
}
const cropEntry=(crop,quantity)=>({id:crop.id,category:'crop',cropId:crop.id,label:crop.label,quantity,reserved:0,available:quantity,unit:crop.yieldUnit,usable:false});

test('a new backpack is empty while the separate spendable stock starts with no mixed-unit total',()=>{
  const f=fixture();assert.deepEqual(f.life.snapshot().inventory,{items:[],kindCount:0});
  assert.equal(f.life.export().version,5);assert.equal(Object.hasOwn(f.life.state,'inventory'),false);assert.deepEqual(f.life.export().economy.stock,{});
  assert.equal(Object.hasOwn(f.life.snapshot().inventory,'total'),false);
});

test('only completed harvests enter the backpack; cancellation, rejected repeats and restore do not duplicate them',()=>{
  const f=fixture();ready(f,'plot-1','spring-onion');
  assert.equal(f.life.snapshot().inventory.kindCount,0);f.life.command({itemId:'plot-1',actionId:'harvest'});
  assert.equal(f.life.snapshot().inventory.kindCount,0);f.life.cancel();assert.equal(f.life.snapshot().inventory.kindCount,0);
  f.life.command({itemId:'plot-1',actionId:'harvest'});f.finish();
  const expected={items:[cropEntry(CROP_CATALOG[0],12)],kindCount:1};
  assert.deepEqual(f.life.snapshot().inventory,expected);
  assert.throws(()=>f.life.command({itemId:'plot-1',actionId:'harvest'}));assert.deepEqual(f.life.snapshot().inventory,expected);
  const saved=f.life.export(),restored=new HomeLife({layout,state:saved,clock:()=>saved.updatedAt});assert.deepEqual(restored.snapshot().inventory,expected);
  assert.equal(Object.hasOwn(saved,'inventory'),false);
});

test('all eight crops aggregate across beds and planting cycles while retaining each unit and immutable snapshots',()=>{
  const f=fixture();
  for(let i=0;i<CROP_CATALOG.length;i++){const crop=CROP_CATALOG[i],itemId=`plot-${i+1}`;ready(f,itemId,crop.id);f.life.command({itemId,actionId:'harvest'});f.finish();}
  ready(f,'plot-8','spring-onion');f.life.command({itemId:'plot-8',actionId:'harvest'});f.finish();
  const inventory=f.life.snapshot().inventory;assert.equal(inventory.kindCount,8);
  assert.deepEqual(inventory.items,CROP_CATALOG.map(crop=>cropEntry(crop,crop.yieldCount*(crop.id==='spring-onion'?2:1))));
  inventory.items[0].quantity=0;inventory.items[0].label='Changed view';inventory.items.pop();
  assert.equal(f.life.snapshot().inventory.items[0].quantity,24);assert.equal(f.life.snapshot().inventory.items[0].label,'小葱');assert.equal(f.life.snapshot().inventory.kindCount,8);
  const saved=f.life.export(),restored=new HomeLife({layout,state:saved,clock:()=>saved.updatedAt});assert.deepEqual(restored.snapshot().inventory,f.life.snapshot().inventory);
});

test('old harvest counts never become invented inventory and future harvests still appear',()=>{
  const initial=fixture().life.export();initial.version=3;
  for(const plot of initial.garden.plots)delete plot.harvestedByCrop;
  initial.garden.plots[0].cycle=5;initial.garden.plots[0].harvests=5;
  const f=fixture(initial);assert.equal(f.life.snapshot().garden.plots[0].harvests,5);assert.equal(f.life.snapshot().inventory.kindCount,0);
  ready(f,'plot-1','carrot');f.life.command({itemId:'plot-1',actionId:'harvest'});f.finish();
  assert.equal(f.life.snapshot().garden.plots[0].harvests,6);
  assert.deepEqual(f.life.snapshot().inventory,{items:[cropEntry(CROP_CATALOG.find(c=>c.id==='carrot'),12)],kindCount:1});
});
