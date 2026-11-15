import test from 'node:test';
import assert from 'node:assert/strict';
import {actorFrameAnchor} from '../src/figure.js';
import {getNavigationData} from '../../../scenes/amane-mart/src/navigation-data.js';

test('resting figures use their visible lower centre, independent of the pack feet convention',()=>{
  const layout={x:250,y:448,box:{x:173,y:270,w:180,h:192}};
  assert.deepEqual(actorFrameAnchor(layout,{alignment:'support'}),{x:263,y:462});
  assert.deepEqual(actorFrameAnchor(layout,{alignment:'support',mirrored:true}),{x:249,y:462});
  assert.deepEqual(actorFrameAnchor(layout),{x:250,y:448},'Walking must retain the native feet');
  assert.deepEqual(actorFrameAnchor({x:250,y:448,box:{w:0,h:0}},{alignment:'support'}),{x:250,y:448});
});

test('resting placements retain per-furniture support and a bounded clearance; approaches remain on the floor',()=>{
  const items=getNavigationData().items;
  for(const [id,height] of Object.entries({'living.sofa':.889,'living.rug':.434,'dining.dining':.921,'study.desk':.921,'bathroom.toilet':.886,'engawa.chair':.6525,'bedroom.bed':1.067,'bathroom.shower':.8835})){
    const item=items.find(i=>i.id===id);
    for(const action of item.actions){
      assert.equal(action.pose.anchorKind,'support',id);
      assert.equal(action.pose.support.position[1],height,id);
      const gap=action.pose.position[1]-height;assert(gap>=.02&&gap<=.055,id);
      assert(action.fallback.position[1]<=.414,id+' fallback must remain walkable');
    }
  }
  for(const [id,action,station] of [['study.laptop','desk','study.desk'],['living.tv','tv','living.sofa'],['living.coffeeTable','drink','living.rug']]){
    assert.deepEqual(items.find(i=>i.id===id).actions.find(a=>a.id===action).pose,items.find(i=>i.id===station).actions[0].pose);
  }
});

test('activity labels describe the item-specific action without changing stable IDs',()=>{
  const items=getNavigationData().items;
  const label=(id,action)=>items.find(i=>i.id===id).actions.find(a=>a.id===action).label;
  assert.equal(label('study.desk','desk'),'看电脑');
  assert.equal(label('kitchen.prepCart','cook'),'准备食材');
  assert.equal(label('living.tv','toggle'),'开关电视');
  assert.equal(label('genkan.umbrella','take'),'取伞');
  assert.equal(label('kitchen.fridge','open'),'查看冰箱');
  assert(!items.flatMap(i=>i.actions).some(a=>a.label==='书桌活动'));
});
