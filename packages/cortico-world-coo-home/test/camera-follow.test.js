import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCameraFollow} from '../../../scenes/amane-mart/src/camera-follow.js';
import {createHomeView} from '../../../scenes/amane-mart/src/home-view.js';

function setup(){
  const camera=new THREE.PerspectiveCamera(24,1,.1,220);camera.position.set(25,20,25);
  const controls={target:new THREE.Vector3(0,1,0),enablePan:true,enableDamping:true,minDistance:4.2,maxDistance:80,
    update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);},addEventListener(){},removeEventListener(){}};
  let changes=0;const follow=createCameraFollow({camera,controls,onChange:()=>changes++});
  return {camera,controls,follow,changes:()=>changes};
}
const offset=f=>f.camera.position.clone().sub(f.controls.target);

test('first follow locks a nearby target without changing the observation direction',()=>{
  const f=setup(),direction=offset(f).normalize();const state=f.follow.setTarget([2,.3,8]);
  assert.equal(state.active,true);assert.equal(state.panEnabled,false);
  assert.deepEqual(state.position,[2,.3,8]);assert.deepEqual(state.target,[2,.8999999999999999,8]);
  assert(Math.abs(state.distance-12)<1e-10);assert(offset(f).normalize().distanceTo(direction)<1e-10);
  assert.equal(f.controls.enableDamping,true);
  const count=f.changes();f.follow.setTarget([2,.3,8]);assert.equal(f.changes(),count,'Stationary follow must not invalidate scene reflections every frame');
});

test('moving targets preserve user rotation and zoom; release does not restore an old pose',()=>{
  const f=setup();f.follow.setTarget([2,.3,8]);
  const userOffset=new THREE.Vector3(-3,4,2);f.camera.position.copy(f.controls.target).add(userOffset);
  f.follow.setTarget([4,.6,9]);assert(offset(f).distanceTo(userOffset)<1e-10);
  const pose={eye:f.camera.position.toArray(),target:f.controls.target.toArray()};
  f.follow.setTarget(null);assert.equal(f.follow.getState().active,false);assert.equal(f.controls.enablePan,true);
  assert.deepEqual(f.camera.position.toArray(),pose.eye);assert.deepEqual(f.controls.target.toArray(),pose.target);
  f.follow.setTarget(null);assert.deepEqual(f.camera.position.toArray(),pose.eye);
});

test('follow restores the previous pan setting and rejects malformed positions',()=>{
  const f=setup();f.controls.enablePan=false;f.follow.setTarget([0,0,0]);f.follow.dispose();assert.equal(f.controls.enablePan,false);
  for(const point of [undefined,[1,2],[1,2,NaN]])assert.throws(()=>f.follow.setTarget(point),TypeError);
  assert.equal(f.follow.getState().active,false);
});

test('all wall modes leave the current camera unchanged, while explicit Home still works',()=>{
  const f=setup(),name={},step={},button={dataset:{},querySelector:selector=>selector==='.view-name'?name:step,addEventListener(){},setAttribute(){}};
  const wall=new THREE.Group(),roof=new THREE.Group();
  const view=createHomeView({camera:f.camera,controls:f.controls,shell:{walls:[{a:[0,0],b:[2,0],object:wall}],roof:[roof]},button,items:[],onChange(){},finishAssembly(){},reducedMotion:true});
  const pose={eye:f.camera.position.toArray(),target:f.controls.target.toArray()};
  for(const mode of ['walls','cutaway','open','exterior','open']){
    view.setMode(mode);view.update();assert.deepEqual(f.camera.position.toArray(),pose.eye);assert.deepEqual(f.controls.target.toArray(),pose.target);
  }
  assert.equal(view.home(),true);assert.notDeepEqual(f.camera.position.toArray(),pose.eye);view.dispose();
});
