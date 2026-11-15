import * as THREE from 'three';

const stages=new Set(['empty','seeded','seedling','growing','ripe']);
const unit=value=>Number.isFinite(value)&&value>=0&&value<=1;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);

// Plants and soil are allocated once. The host owns time, watering and harvests.
// Capture after rigid batching so the soil's unique material stays independent.
export function createPlotVisuals(beds){
  const state=new Map(),targets=new Map();let revision=0;
  for(const {id,cropId,object} of beds){
    state.set(id,{id,cropId,stage:'ripe',growth:1,wetness:0});
    const plants=[],soil=[],seeds=[];
    object.traverse(part=>{
      if(part.userData.cropRole==='plants'){
        part.computeBoundingBox();
        for(const root of part.userData.growthRoots)part.boundingBox.expandByPoint(new THREE.Vector3(...root));
        part.boundingBox.getBoundingSphere(part.boundingSphere);
        plants.push({mesh:part,matrices:part.instanceMatrix.array.slice(),roots:part.userData.growthRoots});
      }else if(part.userData.cropRole==='soil'){
        part.traverse(mesh=>{if(mesh.material)soil.push({material:mesh.material,color:mesh.material.color.clone(),roughness:mesh.material.roughness});});
      }else if(part.userData.cropRole==='seed')seeds.push(part);
    });
    targets.set(id,{plants,soil,seeds,key:'ripe:1:0'});
    object.userData.plotVisual={stage:'ripe',growth:1,wetness:0};
  }
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  function appearance(s){
    // Quantize small progress changes to avoid rebuilding static shadows at each
    // status tick. Every crop keeps its own roots, independent of its neighbours.
    const scale=s.stage==='ripe'?1:s.stage==='seedling'
      ?.20+.16*Math.min(1,s.growth/.25)
      :.40+.52*Math.max(0,Math.min(1,(s.growth-.25)/.75));
    return {scale:Math.round(scale*48)/48,wetness:Math.round(s.wetness*20)/20};
  }
  function apply(id,s){
    const target=targets.get(id),view=appearance(s);
    const key=[s.stage,view.scale,view.wetness].join(':');
    if(key===target.key)return;
    target.key=key;revision++;
    for(const {mesh,matrices,roots} of target.plants){
      mesh.visible=!['empty','seeded'].includes(s.stage)&&(!mesh.userData.cropFruit||['growing','ripe'].includes(s.stage));
      if(s.stage==='ripe')mesh.instanceMatrix.array.set(matrices);
      else if(mesh.visible){
        for(let i=0;i<mesh.count;i++){
          matrix.fromArray(matrices,i*16);
          point.setFromMatrixPosition(matrix);
          const root=roots[i];
          for(const n of [0,1,2,4,5,6,8,9,10])matrix.elements[n]*=view.scale;
          matrix.setPosition(root[0]+(point.x-root[0])*view.scale,root[1]+(point.y-root[1])*view.scale,root[2]+(point.z-root[2])*view.scale);
          mesh.setMatrixAt(i,matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate=true;
      // Bounds include the mature plants and their soil roots for all stages.
    }
    for(const seed of target.seeds)seed.visible=s.stage==='seeded';
    for(const {material,color,roughness} of target.soil){
      material.color.copy(color).multiplyScalar(1-.22*view.wetness);
      material.roughness=roughness-.16*view.wetness;
    }
  }
  function getPlotVisuals(){return {plots:[...state.values()].map(s=>({...s}))};}
  function setPlotVisuals(snapshot){
    const list=Array.isArray(snapshot)?snapshot:snapshot?.plots;
    if(!Array.isArray(list))throw new TypeError('Plot visuals require a plots array');
    const updates=new Map();
    for(const input of list){
      if(!plain(input)||!state.has(input.id)||updates.has(input.id))throw new TypeError('Unknown or repeated plot ID');
      const current=state.get(input.id);
      if(input.cropId!==undefined&&input.cropId!==current.cropId)throw new TypeError('Plot crop type cannot change');
      if(!stages.has(input.stage)||!unit(input.growth)||!unit(input.wetness))throw new TypeError('Invalid plot visual state');
      updates.set(input.id,{id:input.id,cropId:current.cropId,stage:input.stage,growth:input.growth,wetness:input.wetness});
    }
    for(const [id,next] of updates){
      state.set(id,next);apply(id,next);
      const bed=beds.find(b=>b.id===id);bed.object.userData.plotVisual={stage:next.stage,growth:next.growth,wetness:next.wetness};
    }
    return getPlotVisuals();
  }
  return Object.freeze({setPlotVisuals,getPlotVisuals,getRevision:()=>revision});
}
