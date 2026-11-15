import * as THREE from 'three';

// Translation follows the household; OrbitControls continues to own the view
// direction and zoom. There is no saved pose to jump back to on release.
export function createCameraFollow({camera,controls,onChange=()=>{}}){
  let position=null,previousPan=true;
  const focusOffset=new THREE.Vector3(0,.6,0);
  function setTarget(next){
    if(next===null){
      if(position){position=null;controls.enablePan=previousPan;onChange();}
      return getState();
    }
    if(!Array.isArray(next)||next.length!==3||!next.every(Number.isFinite))throw new TypeError('A follow target requires a finite world position');
    const target=new THREE.Vector3(...next).add(focusOffset);
    if(position&&target.distanceToSquared(controls.target)<1e-12){position=[...next];return getState();}
    if(!position){
      previousPan=controls.enablePan;
      // Finish any preceding pan/rotation inertia once. A lingering pan delta
      // must not pull the focus away after panning is disabled.
      const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
      const offset=camera.position.clone().sub(controls.target);
      if(offset.lengthSq()<1e-8)offset.set(0,1,1);
      const distance=THREE.MathUtils.clamp(offset.length(),Math.max(8,controls.minDistance??0),Math.min(12,controls.maxDistance??Infinity));
      camera.position.copy(target).add(offset.setLength(distance));controls.target.copy(target);
      controls.enablePan=false;controls.update();
    }else{
      camera.position.add(target.clone().sub(controls.target));controls.target.copy(target);
    }
    position=[...next];onChange();return getState();
  }
  function getState(){return{active:position!==null,position:position?[...position]:null,target:controls.target.toArray(),distance:camera.position.distanceTo(controls.target),panEnabled:controls.enablePan};}
  return {setTarget,getState,dispose(){setTarget(null);}};
}
