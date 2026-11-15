import assert from 'node:assert/strict';
import {getNavigationData,getActionSlots} from '../src/navigation-data.js';
import {createNavigationQuery} from '../src/navigation-query.js';
const data=getNavigationData(),query=createNavigationQuery(data);
assert.equal(data.items.length,40);assert.equal(data.items.filter(i=>i.room==='garden').length,8);
assert.equal(new Set(data.items.map(i=>i.id)).size,40);
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
console.log(JSON.stringify({items:data.items.length,actions,nodes:nodes.size,edges:data.navigation.edges.length,reachable:seen.size}));
