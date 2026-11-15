import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {projectActorBillboard,projectWorldPoint} from '../../../scenes/amane-mart/src/actor-projection.js';

const viewport={width:1280,height:900},foot=[2,.327,7],height=1.25;
function cameraAt(elevation,distance=30){
  const camera=new THREE.PerspectiveCamera(24,viewport.width/viewport.height,.1,220),radians=elevation*Math.PI/180;
  camera.position.set(foot[0],foot[1]+distance*Math.sin(radians),foot[2]+distance*Math.cos(radians));
  camera.lookAt(...foot);camera.updateMatrixWorld(true);return camera;
}

test('camera-facing figure keeps its height throughout the elevation gradient, including the zenith',()=>{
  const values=[0,15,30,45,60,75,85,89,89.99,90].map(angle=>{
    const camera=cameraAt(angle),billboard=projectActorBillboard(camera,viewport,foot,height);
    assert(billboard.foot.visible);assert(Math.abs(billboard.top.x-billboard.foot.x)<1e-8);
    assert(Math.abs(billboard.top.depth-billboard.foot.depth)<1e-10,'Sizing endpoints must lie in the image plane');
    return billboard.pixelHeight;
  });
  assert(values.every(value=>value>80));assert(Math.max(...values)/Math.min(...values)<1.00001);
  const camera=cameraAt(89.99),a=projectWorldPoint(camera,viewport,foot),b=projectWorldPoint(camera,viewport,[foot[0],foot[1]+height,foot[2]]);
  assert(Math.hypot(a.x-b.x,a.y-b.y)<.1,'This camera angle exercises the original collapsed vertical projection');
});

test('billboard size retains perspective, camera zoom and viewport scaling',()=>{
  const measure=(camera,view=viewport)=>projectActorBillboard(camera,view,foot,height).pixelHeight;
  assert(Math.abs(measure(cameraAt(89.99,15))/measure(cameraAt(89.99,30))-2)<1e-9);
  const camera=cameraAt(65);const before=measure(camera);camera.zoom=1.5;camera.updateProjectionMatrix();
  assert(Math.abs(measure(camera)/before-1.5)<1e-9);
  assert(Math.abs(measure(camera,{width:640,height:450})/measure(camera)-.5)<1e-9);
});

test('billboard projection follows camera roll and rejects invalid dimensions',()=>{
  const camera=cameraAt(80);camera.rotateZ(.3);camera.updateMatrixWorld(true);
  const result=projectActorBillboard(camera,viewport,foot,height);
  assert(Math.abs(result.foot.x-result.top.x)<1e-8);assert(result.pixelHeight>80);
  for(const bad of [NaN,-1,Infinity])assert.throws(()=>projectActorBillboard(camera,viewport,foot,bad),TypeError);
  assert.throws(()=>projectActorBillboard(camera,viewport,[0,NaN,0],height),TypeError);
});
