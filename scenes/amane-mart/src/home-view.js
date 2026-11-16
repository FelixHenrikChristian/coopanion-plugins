import * as THREE from 'three';

const views=['exterior','walls','cutaway','open'];
const titles={exterior:'完整外观',walls:'全部墙面',cutaway:'自动剖墙',open:'无墙俯览'};
const focus=new THREE.Vector3(-3,.55,12.2);
const roomSpans=[
  [-9,-4.95,8.3,11.45],[-4.95,-1.1,8.3,11.45],[-1.1,3,8.3,11.45],
  [-9,-4.95,12.6,16.1],[-4.95,-1.1,12.6,16.1],[-1.1,1,12.6,16.1],[1,3,12.6,16.1],
  [-9,3,11.45,12.6]
];

function blocksSight(wall,eye,target){
  // Intersection of the eye-to-object ray with the horizontal footprint of
  // this wall. Only cut it if that crossing is below the wall head.
  const [ax,az]=wall.a,[bx,bz]=wall.b, wx=bx-ax,wz=bz-az;
  const dx=target[0]-eye.x,dz=target[2]-eye.z,det=dx*wz-dz*wx;
  if(Math.abs(det)<.0001)return false;
  const rx=ax-eye.x,rz=az-eye.z;
  const t=(rx*wz-rz*wx)/det, along=(rx*dz-rz*dx)/det;
  if(t<=0||t>=.997||along<.008||along>.992)return false;
  const y=eye.y+t*(target[1]-eye.y);
  return y>.38&&y<3.04;
}

export function createHomeView({camera,controls,shell,commercialShells=[],button,items,onChange,onView=()=>{},finishAssembly,reducedMotion=false,signal}){
  const name=button.querySelector('.view-name'),step=button.querySelector('.view-step');
  Object.assign(button.dataset,{wallCount:shell.walls.length,roofCount:shell.roof.length});
  const samples=items.filter(item=>item.room!=='garden'&&!item.building).map(i=>i.anchor);
  for(const [x0,x1,z0,z1] of roomSpans){
    for(const u of [.28,.72])for(const v of [.28,.72])samples.push([x0+(x1-x0)*u,.75,z0+(z1-z0)*v]);
  }
  let mode='exterior',activeBuilding='home',updated=true,lastEye=new THREE.Vector3(Infinity,0,0);
  let travel=null;
  function visibleWalls(){
    let changed=false;
    for(const current of [{...shell,id:'home'},...commercialShells]){
    const effectiveMode=mode==='cutaway'&&current.id!==activeBuilding?'exterior':mode;
    for(const wall of current.walls){
      let show=effectiveMode==='exterior'||effectiveMode==='walls';
      if(effectiveMode==='cutaway'){
        if(wall.outer&&wall.outward){
          const mx=(wall.a[0]+wall.b[0])/2,mz=(wall.a[1]+wall.b[1])/2;
          show=(camera.position.x-mx)*wall.outward[0]+(camera.position.z-mz)*wall.outward[1]<=0;
        }else show=!samples.some(sample=>blocksSight(wall,camera.position,sample));
      }
      if(wall.object.userData.homeVisible!==show)changed=true;
      wall.object.userData.homeVisible=show;
      wall.object.visible=show&&(wall.object.userData.assemblyVisible??true);
    }
    for(const roof of current.roof){
      const show=effectiveMode==='exterior';
      if(roof.userData.homeVisible!==show)changed=true;
      roof.userData.homeVisible=show;roof.visible=show&&(roof.userData.assemblyVisible??true);
    }
    }
    if(changed){
      button.dataset.visibleWalls=shell.walls.filter(w=>w.object.userData.homeVisible).length;
      button.dataset.visibleRoofs=shell.roof.filter(r=>r.userData.homeVisible).length;
    }
    if(changed)onChange(mode);
  }
  function internalPose(){
    const distance=Math.max(21.5,14.7/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect*.93),12.7/(2*Math.tan(camera.fov*Math.PI/360)*.91));
    const direction=new THREE.Vector3(.43,1.38,1).normalize();
    return {eye:focus.clone().addScaledVector(direction,distance),target:focus.clone()};
  }
  function goTo(pose){
    if(reducedMotion){
      travel=null;camera.position.copy(pose.eye);controls.target.copy(pose.target);controls.update();return;
    }
    travel={fromEye:camera.position.clone(),fromTarget:controls.target.clone(),...pose,start:performance.now()};
  }
  function setMode(next){
    if(!views.includes(next))throw new RangeError('Unknown home view');
    if(next===mode)return;
    travel=null;finishAssembly();
    mode=next;updated=true;
    const i=views.indexOf(mode);
    name.textContent=titles[mode];step.textContent=(i+1)+' / '+views.length;
    button.dataset.mode=mode;
    const description='建筑视图：'+titles[mode]+'。切换至'+titles[views[(i+1)%views.length]];
    button.setAttribute('aria-label',description);button.title=description;
    visibleWalls();
    onView({mode});
  }
  button.addEventListener('click',()=>setMode(views[(views.indexOf(mode)+1)%views.length]),{signal});
  const cancelTravel=()=>{travel=null;};
  controls.addEventListener('start',cancelTravel);
  function update(){
    if(travel){
      const t=Math.min(1,(performance.now()-travel.start)/720),ease=t*t*(3-2*t);
      camera.position.lerpVectors(travel.fromEye,travel.eye,ease);
      controls.target.lerpVectors(travel.fromTarget,travel.target,ease);
      controls.update();
      if(t>=1)travel=null;
    }
    if(updated||mode==='cutaway'&&lastEye.distanceToSquared(camera.position)>.00001){
      visibleWalls();lastEye.copy(camera.position);updated=false;
    }
  }
  function home(){
    if(mode==='exterior')return false;
    goTo(internalPose());return true;
  }
  function setActiveBuilding(id){
    const next=id??'home';if(!['home',...commercialShells.map(s=>s.id)].includes(next))throw new RangeError('Unknown active building');
    if(next!==activeBuilding){activeBuilding=next;updated=true;visibleWalls();}
  }
  function getBuildingState(){return {active:activeBuilding,mode,buildings:Object.fromEntries([{...shell,id:'home'},...commercialShells].map(s=>[s.id,{walls:s.walls.length,visibleWalls:s.walls.filter(w=>w.object.userData.homeVisible!==false).length,roofs:s.roof.length,visibleRoofs:s.roof.filter(r=>r.userData.homeVisible!==false).length}]))};}
  return {setMode,update,home,setActiveBuilding,getBuildingState,getMode:()=>mode,cancelTravel,dispose(){travel=null;controls.removeEventListener('start',cancelTravel);}};
}

export function makeHomeRegistry(){
  const byId=new Map();let objects=new WeakMap();
  function register(item){
    if(!item.id||byId.has(item.id))throw Error('Duplicate or missing home item id: '+item.id);
    const {object,id}=item;object.userData.preserveBatch=true;object.userData.homeId=id;
    byId.set(id,item);objects.set(object,item);
  }
  const describe=item=>({
    id:item.id,room:item.room,label:item.label,actions:[...item.actions],...(item.building?{building:item.building}:{}),
    anchor:[...item.anchor],approach:[...item.approach],
    ...(item.object.userData.templateSpot?{templateSpot:{...item.object.userData.templateSpot}}:{}),
    ...(Number.isInteger(item.object.userData.plotId)?{plotId:item.object.userData.plotId}:{}),
    ...(item.object.userData.cropId?{cropId:item.object.userData.cropId}:{})
  });
  function connect(canvas,camera,scene,view,{onItem=()=>{},signal}={}){
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
    let down=null;
    const active=new Set();
    canvas.addEventListener('pointerdown',e=>{
      active.add(e.pointerId);
      if(active.size===1&&e.button===0)down=[e.clientX,e.clientY,e.pointerId];else down=null;
    },{signal});
    canvas.addEventListener('pointercancel',e=>{active.delete(e.pointerId);down=null;},{signal});
    canvas.addEventListener('pointermove',e=>{
      if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)down=null;
    },{signal});
    canvas.addEventListener('pointerup',e=>{
      active.delete(e.pointerId);
      if(!down||down[2]!==e.pointerId)return;
      down=null;
      const rect=canvas.getBoundingClientRect();
      pointer.set(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
      ray.setFromCamera(pointer,camera);
      const candidates=[];
      scene.traverseVisible(o=>{if(o.isMesh&&o.layers.test(camera.layers)&&!o.userData.interactionOutline)candidates.push(o);});
      for(const hit of ray.intersectObjects(candidates,false)){
        // Transparent glass permits inspection; opaque walls and the roof stop picking.
        if(hit.object.material?.transparent&&(hit.object.material.opacity<.35||hit.object.material.blending===THREE.AdditiveBlending))continue;
        for(let o=hit.object;o;o=o.parent){
          const item=objects.get(o);
          if(item){
            onItem(describe(item));
            return;
          }
        }
        return;
      }
    },{signal});
    return Object.freeze({
      listItems:()=>[...byId.values()].map(describe),
      getItem:id=>byId.has(id)?describe(byId.get(id)):null,
      getObject:id=>byId.get(id)?.object??null
    });
  }
  return {register,items:()=>[...byId.values()],connect,
    idFor(object){for(let o=object;o;o=o.parent){const item=objects.get(o);if(item)return item.id;}return null;},
    dispose(){byId.clear();objects=new WeakMap();}
  };
}
