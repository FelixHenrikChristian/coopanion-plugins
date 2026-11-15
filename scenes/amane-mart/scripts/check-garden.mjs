import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeKit,batchStage} from '../src/kit.js';
import {growKitchenBed} from '../src/residential-garden.js';
import {createPlotVisuals} from '../src/plot-visuals.js';
import {getNavigationData} from '../src/navigation-data.js';

// This fixture needs only the kit's unused halo canvas, not a GPU or user assets.
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const scene=new THREE.Scene(),stages=[],kit=makeKit(scene,stages);
const plots=getNavigationData().items.filter(item=>item.room==='garden');
const beds=plots.map((item,index)=>{
  const bed=kit.group(item.id,0);bed.position.set(5.37+index%4*2,.16,10.12+Math.floor(index/4)*4.23);
  Object.assign(bed.userData,{cropId:item.cropId,preserveBatch:true});
  const soil=new THREE.Group();soil.userData={preserveBatch:true,cropRole:'soil'};bed.add(soil);
  kit.box(soil,0,.214,0,1.33,.03,3.01,'#665848');
  for(const x of [-.32,.32])kit.box(soil,x,.237,0,.37,.032,2.93,'#72624b');
  growKitchenBed(kit,bed,item.cropId,index);batchStage(bed);
  return {id:item.id,cropId:item.cropId,object:bed};
});
const roles=role=>{const result=[];scene.traverse(o=>{if(o.userData.cropRole===role)result.push(o);});return result;};
const mature=new Map(roles('plants').map(mesh=>[mesh,mesh.instanceMatrix.array.slice()]));
const fixed=new Map(roles('supports').map(mesh=>[mesh,mesh.instanceMatrix.array.slice()]));
const resources=()=>{const geometry=new Set(),materials=new Set();let objects=0;scene.traverse(o=>{objects++;if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});return {objects,geometries:geometry.size,materials:materials.size};};
for(const mesh of roles('plants')){
  assert.equal(mesh.userData.growthRoots.length,mesh.count);
  assert(mesh.userData.growthRoots.every(root=>Array.isArray(root)&&root.length===3&&root.every(Number.isFinite)));
}
const visuals=createPlotVisuals(beds),initial=visuals.getPlotVisuals();
const originalResources=resources(),soilOriginal=roles('soil').map(g=>g.children.map(m=>m.material.color.toArray()));
function snapshot(stage,growth=0,wetness=0){return {plots:plots.map(p=>({id:p.id,cropId:p.cropId,stage,growth,wetness}))};}
function fixedUnchanged(visible=true){for(const [mesh,matrices] of fixed){assert.equal(mesh.visible,visible);assert.deepEqual(mesh.instanceMatrix.array,matrices);}}
for(let cycle=0;cycle<40;cycle++){
  visuals.setPlotVisuals(snapshot('empty'));assert(roles('plants').every(m=>!m.visible));assert(roles('seed').every(m=>!m.visible));fixedUnchanged(false);
  visuals.setPlotVisuals(snapshot('seeded'));assert(roles('plants').every(m=>!m.visible));assert(roles('seed').every(m=>m.visible));fixedUnchanged();
  visuals.setPlotVisuals(snapshot('seedling',.15,1));assert(roles('plants').some(m=>m.visible));assert(roles('plants').filter(m=>m.userData.cropFruit).every(m=>!m.visible));
  for(const mesh of roles('plants').filter(m=>m.visible))assert(mesh.instanceMatrix.array.every(Number.isFinite));
  visuals.setPlotVisuals(snapshot('growing',.65,.5));assert(roles('plants').every(m=>m.visible));fixedUnchanged();
  visuals.setPlotVisuals(initial);for(const [mesh,matrices] of mature){assert(mesh.visible);assert.deepEqual(mesh.instanceMatrix.array,matrices);}
}
assert.deepEqual(resources(),originalResources,'State transitions must reuse scene resources');
assert.deepEqual(roles('soil').map(g=>g.children.map(m=>m.material.color.toArray())),soilOriginal);
const revision=visuals.getRevision();visuals.setPlotVisuals(initial);assert.equal(visuals.getRevision(),revision);
const before=visuals.getPlotVisuals();
for(const invalid of [
  {plots:[{...before.plots[0],stage:'empty'},{...before.plots[1],growth:NaN}]},
  {plots:[{...before.plots[0],cropId:'unknown'}]},
  {plots:[{...before.plots[0],wetness:1.1}]},
  {plots:[before.plots[0],before.plots[0]]}
]){assert.throws(()=>visuals.setPlotVisuals(invalid));assert.deepEqual(visuals.getPlotVisuals(),before);}
const detached=visuals.getPlotVisuals();detached.plots[0].stage='empty';assert.equal(visuals.getPlotVisuals().plots[0].stage,'ripe');
// All 64 bed/crop combinations reuse the original geometry and materials.
for(const crop of plots){
  visuals.setPlotVisuals({plots:plots.map(plot=>({id:plot.id,cropId:crop.cropId,stage:'ripe',growth:1,wetness:0}))});
  assert(visuals.getPlotVisuals().plots.every(plot=>plot.cropId===crop.cropId));
  for(const bed of beds){
    const shown=[];bed.object.traverse(part=>{if(part.userData.cropRole==='plants'&&part.visible)shown.push(part);});
    assert(shown.length);assert(shown.every(mesh=>mesh.name.startsWith(crop.cropId+' ')));
    assert(shown.every(mesh=>mesh.instanceMatrix.array.every(Number.isFinite)));
  }
}
const cached=resources();assert.equal(cached.geometries,originalResources.geometries);assert.equal(cached.materials,originalResources.materials);
for(let repeat=0;repeat<8;repeat++)for(const crop of plots)visuals.setPlotVisuals({plots:plots.map(plot=>({id:plot.id,cropId:crop.cropId,stage:'growing',growth:.6,wetness:.5}))});
assert.deepEqual(resources(),cached,'Crop switches must reuse bounded cached instances');
visuals.setPlotVisuals({plots:plots.map(plot=>({id:plot.id,cropId:null,stage:'empty',growth:0,wetness:0}))});
assert(roles('plants').every(mesh=>!mesh.visible));assert(roles('supports').every(mesh=>!mesh.visible));
assert(beds.every(bed=>bed.object.parent===scene),'Empty beds retain their registered scene objects');
for(const plot of plots)assert.equal(plot.actions.find(a=>a.id==='播种')?.canonicalId,'sow');
console.log(JSON.stringify({plots:plots.length,plantMeshes:mature.size,supportMeshes:fixed.size,cycles:40,...originalResources}));
