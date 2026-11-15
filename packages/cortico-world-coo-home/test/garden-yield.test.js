import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGarden,CROP_CATALOG,applyGardenAction,gardenSnapshot,advanceGarden,normalizeGarden} from '../src/garden.js';
import {plotInformation} from '../src/garden-panel.js';
const layout=JSON.parse(readFileSync(new URL('../data/home-layout.json',import.meta.url),'utf8'));

test('each crop yields its stated fixed quantity only after harvesting; changing crops retains separate totals',()=>{
  const garden=createGarden(layout);let now=1000;
  for(const crop of CROP_CATALOG){
    const plot=garden.plots[0];applyGardenAction(garden,plot.id,'sow',now,plot.cycle,crop.id);applyGardenAction(garden,plot.id,'water',now+100,plot.cycle);
    let snapshot=gardenSnapshot(garden,now+100).plots[0];assert.equal(snapshot.expectedYieldCount,crop.yieldCount);assert.equal(snapshot.yieldUnit,crop.yieldUnit);assert.equal(snapshot.harvestedByCrop[crop.id],undefined);
    now+=crop.durationMs+200;advanceGarden(garden,now);applyGardenAction(garden,plot.id,'harvest',now,plot.cycle);
    assert.equal(plot.harvestedByCrop[crop.id],crop.yieldCount);assert.equal(plot.stage,'empty');assert.equal(plot.cropId,null);
    assert.throws(()=>applyGardenAction(garden,plot.id,'harvest',now,plot.cycle));
  }
  assert.equal(garden.plots[0].harvests,8);assert.equal(Object.keys(garden.plots[0].harvestedByCrop).length,8);
  assert.deepEqual(normalizeGarden(garden,layout),garden);
});

test('old saves keep harvest counts without inventing historical produce; malformed new quantities reject',()=>{
  const old=createGarden(layout);for(const p of old.plots)delete p.harvestedByCrop;
  old.plots[0].cycle=3;old.plots[0].harvests=3;
  const upgraded=normalizeGarden(old,layout,0,{quantitiesKnown:false});assert.equal(upgraded.plots[0].harvests,3);assert.deepEqual(upgraded.plots[0].harvestedByCrop,{});
  upgraded.plots[0].harvestedByCrop={carrot:13};assert.throws(()=>normalizeGarden(upgraded,layout));
});

test('plot details show actual growth, yield, pause and waiting-for-water semantics',()=>{
  const garden=createGarden(layout),p=garden.plots[0];
  assert.equal(plotInformation(gardenSnapshot(garden,1000).plots[0],1000).title,'等待一粒种子');
  applyGardenAction(garden,p.id,'sow',1000,0,'spring-onion');
  let detail=plotInformation(gardenSnapshot(garden,2000).plots[0],2000);assert.ok(detail.fields.some(([k,v])=>k==='距离成熟'&&v==='首次浇水后计时'));
  applyGardenAction(garden,p.id,'water',2000,1);detail=plotInformation(gardenSnapshot(garden,602000).plots[0],602000);
  assert.ok(detail.fields.some(([k,v])=>k==='预计收获'&&v==='12 束 小葱'));assert.ok(detail.fields.some(([k,v])=>k==='已生长'&&v==='10 分钟'));
  detail=plotInformation(gardenSnapshot(garden,602000).plots[0],602000+3600000,true);assert.ok(detail.fields.some(([k,v])=>k==='已生长'&&v==='10 分钟'));assert.ok(detail.fields.some(([k,v])=>k==='预计成熟时间'&&v==='恢复生活后顺延'));
});
