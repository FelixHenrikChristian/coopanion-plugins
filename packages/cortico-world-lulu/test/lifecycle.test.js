import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LuluWorld} from '../src/index.js';
test('reenabling uses a fresh installer signal and does not switch the running pet',async()=>{
 const world=new LuluWorld({cfg:{desktopPetUrl:'http://localhost:7797'}});
 const first=world.controller.signal;await world.start();await world.stop();assert.equal(first.aborted,true);
 await world.start();assert.notEqual(world.controller.signal,first);assert.equal(world.controller.signal.aborted,false);assert.equal(world.active,true);await world.stop();
});
