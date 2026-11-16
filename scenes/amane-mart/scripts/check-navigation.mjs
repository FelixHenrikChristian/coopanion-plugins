import assert from 'node:assert/strict';
import {getNavigationData,getActionSlots} from '../src/navigation-data.js';
import {createNavigationQuery} from '../src/navigation-query.js';
const data=getNavigationData(),query=createNavigationQuery(data);
assert.equal(data.items.length,47);assert.equal(data.items.filter(i=>i.room==='garden').length,8);
assert.equal(new Set(data.items.map(i=>i.id)).size,47);
const nodes=new Map(data.navigation.nodes.map(n=>[n.id,n])),adj=new Map([...nodes.keys()].map(id=>[id,[]]));
for(const n of nodes.values())assert(query.locate(n.position),'Invalid station '+n.id);
for(const edge of data.navigation.edges){
  assert(query.segmentWalkable(nodes.get(edge.from).position,nodes.get(edge.to).position),'Blocked segment '+edge.from+' / '+edge.to);
  adj.get(edge.from).push(edge.to);adj.get(edge.to).push(edge.from);
}
const seen=new Set(['spawn']),queue=['spawn'];
for(let i=0;i<queue.length;i++)for(const id of adj.get(queue[i]))if(!seen.has(id)){seen.add(id);queue.push(id);}
let actions=0;
for(const item of data.items){
  assert(seen.has('item:'+item.id),'Unreachable item '+item.id);
  for(const slot of getActionSlots(item.id)){
    actions++;
    assert(query.locate(slot.stance.position),'Blocked approach '+slot.slotId);
    assert(query.locate(slot.fallback.position),'Blocked fallback '+slot.slotId);
    assert(['standing','seated','lying'].includes(slot.pose.kind));
    assert.equal(slot.pose.position.length,3);assert(slot.pose.position.every(Number.isFinite));
    assert.equal(slot.stance.facing.length,2);
  }
}
const copy=getNavigationData();copy.items[0].position[0]=999;
assert.notEqual(getNavigationData().items[0].position[0],999);
assert.equal(query.locate([-5.31,.41,14.8]),null,'Wardrobe must stay solid');
assert.equal(query.locate([5.37,.16,10.12]),null,'Planting bed must stay solid');
assert(query.isWalkable(8.37,10.1),'Narrow allotment aisle must remain connected');
assert.equal(query.locate([9,.2,-2]),null,'Record shop must remain closed');
assert.equal(query.locate([14,.2,1]),null,'Laundry must remain closed');
assert.equal(query.locate([2,.023,4]),null,'Road crossing must remain inside the existing zebra crossing');
for(const id of ['teahouse.cushion.front','teahouse.cushion.back']){
  for(const slot of getActionSlots(id)){
    assert.equal(slot.pose.kind,'seated');assert.equal(slot.pose.support.position[1],.6175);
    assert.equal(slot.pose.support.clearance,.03);
  }
}
// Any path to a commercial station must use the existing road crossing. The
// disconnected closed shop footprints have no walkable region or graph node.
for(const node of nodes.values())if(node.position[2]>2.55&&node.position[2]<6.15){
  assert(node.position[0]>=-2.85&&node.position[0]<=.40,'Route left the marked crossing');
}
console.log(JSON.stringify({items:data.items.length,actions,nodes:nodes.size,edges:data.navigation.edges.length,reachable:seen.size}));
