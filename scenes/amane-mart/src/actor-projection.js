import * as THREE from 'three';

export function projectWorldPoint(camera,viewport,worldPoint){
  camera.updateMatrixWorld(true);
  const p=new THREE.Vector3(...worldPoint).project(camera);
  return {x:(p.x+1)*viewport.width/2,y:(1-p.y)*viewport.height/2,depth:p.z,ndcDepth:p.z,
    visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1,viewport:{...viewport}};
}

// A DOM figure is a camera-facing plane, not a world-vertical segment. Using
// camera up preserves its world size even when looking straight down at it.
export function projectActorBillboard(camera,viewport,worldPoint,worldHeight){
  if(!Array.isArray(worldPoint)||worldPoint.length!==3||!worldPoint.every(Number.isFinite)||!Number.isFinite(worldHeight)||worldHeight<0)
    throw new TypeError('A billboard requires a finite world position and nonnegative height');
  const foot=projectWorldPoint(camera,viewport,worldPoint);
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1).normalize();
  const topWorld=new THREE.Vector3(...worldPoint).addScaledVector(up,worldHeight);
  const top=projectWorldPoint(camera,viewport,topWorld.toArray());
  return {foot,top,pixelHeight:Math.abs(foot.y-top.y)};
}
