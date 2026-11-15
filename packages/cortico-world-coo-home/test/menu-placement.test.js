import test from 'node:test';
import assert from 'node:assert/strict';
import {interactionPlacement} from '../src/life-panel.js';

test('object actions stay within a narrow or full-screen viewport at all edges',()=>{
  for(const [width,height] of [[360,420],[900,600],[2560,1440]])for(const count of [1,2,3,4,6])for(const x of [0,width/2,width])for(const y of [0,height/2,height]){
    const p=interactionPlacement({x,y,width,height,count,details:true});
    for(const b of p.buttons){assert.ok(p.x+b.x-p.pillWidth/2>=0);assert.ok(p.x+b.x+p.pillWidth/2<=width);assert.ok(p.y+b.y-18>=0);assert.ok(p.y+b.y+18<=height);}
    assert.ok(p.y+p.titleY>=36);assert.ok(p.y+p.footerY+78<=height);
  }
});

test('unclipped menus follow their furniture rather than a viewport corner',()=>{
  const a=interactionPlacement({x:700,y:420,width:1440,height:900,count:4});
  const b=interactionPlacement({x:600,y:350,width:1440,height:900,count:4});
  assert.equal(b.x-a.x,-100);assert.equal(b.y-a.y,-70);
});
