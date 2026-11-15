import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildGround} from './ground.js';
import {buildStore} from './store.js';
import {buildProps} from './props.js';
import {makeKit,batchStage} from './kit.js';
import {makeWeather} from './weather.js';
import {addFinishing} from './finishing.js';
import {buildTeahouse} from './teahouse.js';
import {buildGarden} from './garden.js';
import {makeNightSky} from './night.js';
import {NEIGHBORHOOD as VILLAGE} from './layout.js';
import {buildHomeShell} from './home-shell.js';
import {buildHomeFurniture} from './home-furniture.js';
import {buildHomeGrounds} from './home-grounds.js';
import {buildStationRow} from './station-row.js';
import {createHomeView,makeHomeRegistry} from './home-view.js';

import {mountSceneUI} from './scene-ui.js';
import {disposeSceneResources} from './scene-resources.js';
import {createActorMask} from './actor-mask.js';
import {getNavigationData,getActionSlots} from './navigation-data.js';
import {createNavigationQuery} from './navigation-query.js';
import {createPlotVisuals} from './plot-visuals.js';

export function createNeighborhood({root,onItem=()=>{},onView=()=>{},reducedMotion,autoStart=true}={}){
if(!root?.appendChild)throw new TypeError('A scene root element is required');
const ownerWindow=root.ownerDocument.defaultView;
reducedMotion??=ownerWindow.matchMedia('(prefers-reduced-motion: reduce)').matches;
const {container,canvas,button}=mountSceneUI(root);
const abort=new ownerWindow.AbortController(),signal=abort.signal;
const viewport={width:0,height:0};let disposed=false,running=false,disposal=null;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setClearColor(0x142134,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.90;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
const scene=new THREE.Scene();
const stages=[];
const kit=makeKit(scene,stages);
const roadStage=buildGround(kit);
buildStore(kit);
buildProps(kit);
addFinishing(kit);
buildTeahouse(kit);
buildGarden(kit);
const registry=makeHomeRegistry();
const plotBeds=buildHomeGrounds(kit,registry.register);
buildStationRow(kit);
const shell=buildHomeShell(kit);
const furnitureVisuals=buildHomeFurniture(kit,registry.register);
const navigationQuery=createNavigationQuery(getNavigationData());
const roomLights=kit.group('雨庭 · 室内灯',1.9);
// Local pools from the reading lamp, bedside paper lamp, dining pendant and service area.
for(const [x,y,z,power,reach,color] of [
  [-8.68,1.75,10.69,4.6,4.9,0xffc894],
  [-6.83,1.26,13.45,3.5,4.0,0xffc88e],
  [-3.24,2.27,9.52,6.8,5.7,0xffdaa1],
  [-.39,2.35,14.73,6.8,5.7,0xffdfb0]
]){
  const light=new THREE.PointLight(color,power,reach,2);
  if(x===-6.83)light.userData.furniturePowerId='bedroom.bedside';
  light.position.set(x,y,z);roomLights.add(light);
}
makeNightSky(scene);

const sky=new THREE.HemisphereLight(0xa1b7eb,0x483347,.61);
const moon=new THREE.DirectionalLight(0x97b4ec,1.06);
moon.position.set(-8,16,3);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);
moon.position.set(-14,31,10);moon.target.position.set(1,0,4);scene.add(moon.target);
Object.assign(moon.shadow.camera,{near:1,far:74,left:-23,right:23,top:23,bottom:-23});
moon.shadow.camera.updateProjectionMatrix();moon.shadow.normalBias=.022;moon.shadow.bias=-.00028;
const fill=new THREE.DirectionalLight(0xc0a9c9,.17);fill.position.set(-7.5,7.2,10);
const rim=new THREE.DirectionalLight(0x718fc9,.78);rim.position.set(9,7,-7);
scene.add(sky,moon,fill,rim);

for(const s of stages){
  batchStage(s.g);
  if(s.g.name.startsWith('Store ·'))s.g.traverse(o=>{
    if(o.isInstancedMesh&&/canopy|roof|walls|foundation|equipment/.test(s.g.name)&&o.material.isMeshStandardMaterial)o.castShadow=true;
  });
  s.origin=s.g.position.clone();
  s.duration=s.start===0?1.35:1.18;
}
const plotVisuals=createPlotVisuals(plotBeds);
// The number of point lights is a compile-time constant in Three's standard
// material. Keep the emitters registered and follow a socket on each fixture;
// taking off a roof or assembling a new layer only changes light uniforms.
const fixtureLights=[];
for(const {g} of stages){
  const fixtures=[];g.traverse(o=>{if(o.isPointLight)fixtures.push(o);});
  for(const light of fixtures){
    const socket=new THREE.Object3D(),owner=light.parent;
    socket.position.copy(light.position);owner.add(socket);
    fixtureLights.push({light,socket,power:light.intensity});
    scene.add(light);
  }
}
let lightsDirty=true;
function syncFixtureLights(){
  for(const {light,socket,power} of fixtureLights){
    socket.getWorldPosition(light.position);
    let holder=socket;
    while(holder&&holder.visible)holder=holder.parent;
    light.intensity=holder||!furnitureVisuals.isPowered(light.userData.furniturePowerId)?0:power;
  }
  lightsDirty=false;
}
syncFixtureLights();
const camera=new THREE.PerspectiveCamera(24,1,.10,220);
camera.layers.enable(1);
const look=new THREE.Vector3(VILLAGE.centerX,2.35,VILLAGE.centerZ);
const viewDir=new THREE.Vector3(16.8,11.7,15.4).normalize();
camera.position.copy(look).addScaledVector(viewDir,38);
const controls=new OrbitControls(camera,canvas);
controls.target.copy(look);controls.enableDamping=true;controls.dampingFactor=.085;
controls.minDistance=4.2;controls.maxDistance=80;
controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI/2-.075;
controls.rotateSpeed=.63;controls.panSpeed=.76;controls.zoomSpeed=.85;
controls.screenSpacePanning=true;controls.update();
const boundsPoints=[];
for(const x of [VILLAGE.left,VILLAGE.right])for(const z of [VILLAGE.back,VILLAGE.front])for(const y of [-1,.20])boundsPoints.push(new THREE.Vector3(x,y,z));
for(const [x,z,h] of [[-10.18,1.47,6.48],[-10.18,-7.59,6.60],[.80,-9.40,5.98],[2.51,1.02,3.90],[-10.42,6.81,6.21],[4.24,6.80,5.61]])boundsPoints.push(new THREE.Vector3(x,h,z));
for(const [x,z] of [[7.61,-9.78],[15.13,-9.78],[7.61,-4.54],[15.13,-4.54]])boundsPoints.push(new THREE.Vector3(x,7.48,z));
function fittedDistance(aspect) {
  const horizontal=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),viewDir).normalize();
  const vertical=new THREE.Vector3().crossVectors(viewDir,horizontal);
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
  return Math.max(...boundsPoints.map(p=>{
    const d=p.clone().sub(look),z=d.dot(viewDir);
    return z+Math.max(Math.abs(d.dot(horizontal))/(tan*aspect*.95),Math.abs(d.dot(vertical))/(tan*.95));
  }));
}
const weather=makeWeather(scene,renderer,camera,roadStage);
let finishOnRequest=false;
const homeView=createHomeView({camera,controls,shell,button,onView,reducedMotion,signal,items:registry.items(),finishAssembly(){finishOnRequest=true;},onChange(mode){
  lightsDirty=true;renderer.shadowMap.needsUpdate=true;weather.setHomeOpen(mode!=='exterior');weather.invalidate();
}});
const catalog=registry.connect(canvas,camera,scene,homeView,{onItem,signal});
const onControlChange=()=>weather.invalidate();
controls.addEventListener('change',onControlChange);
const onControlStart=()=>canvas.classList.add('moving');
controls.addEventListener('start',onControlStart);
const onControlEnd=()=>canvas.classList.remove('moving');
controls.addEventListener('end',onControlEnd);
let previousFit=0;
function resize(){
  if(disposed)return;
  const rect=container.getBoundingClientRect(),w=rect.width,h=rect.height;
  viewport.width=w;viewport.height=h;
  if(w<=0||h<=0)return;
  renderer.setPixelRatio(Math.min(ownerWindow.devicePixelRatio||1,1.75));
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const distance=fittedDistance(camera.aspect);
  const factor=previousFit?distance/previousFit:distance/camera.position.distanceTo(controls.target);
  camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
  controls.maxDistance=Math.max(80,distance*2.3);previousFit=distance;
  controls.update();weather.invalidate();
}
const observer=new ownerWindow.ResizeObserver(resize);
observer.observe(container);
ownerWindow.addEventListener('resize',resize,{signal});
resize();

// A broad soft contact shadow anchors the bevel to the matte studio backdrop.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=512;
const shadowCtx=shadowCanvas.getContext('2d');
shadowCtx.shadowColor='rgba(0,0,0,1)';shadowCtx.shadowBlur=25;
shadowCtx.fillStyle='rgba(0,0,0,.95)';shadowCtx.fillRect(93,93,326,326);
const shadowSpan=VILLAGE.size*(512/326);
const foot=new THREE.Mesh(new THREE.PlaneGeometry(shadowSpan,shadowSpan),new THREE.MeshBasicMaterial({
  map:new THREE.CanvasTexture(shadowCanvas),color:0x02040b,transparent:true,opacity:.5,depthWrite:false,toneMapped:false
}));
foot.rotation.x=-Math.PI/2;foot.position.set(VILLAGE.centerX+.10,-1.03,VILLAGE.centerZ+.13);foot.renderOrder=-4;scene.add(foot);
const isReduced=reducedMotion;
const maxDuration=Math.max(...stages.map(s=>s.start*1.43+s.duration))+.1;
let began=0, ready=false, lastShadow=-1, animatingPrev=true;
let weatherTime=0, frameCount=0, lastFrame=0;
function assembly(time){
  lightsDirty=true;
  for(const s of stages){
    const t=THREE.MathUtils.clamp((time-s.start*1.43)/s.duration,0,1);
    const ease=1-Math.pow(1-t,3.15);
    s.g.userData.assemblyVisible=t>0;
    s.g.visible=t>0&&s.g.userData.homeVisible!==false;
    s.g.position.copy(s.origin);
    if(s.start===0){
      s.g.scale.set(1,.15+.85*ease,1);
      s.g.position.y-=.78*(1-ease);
    } else {
      const travel=s.start<.6?.44:s.start>2.6?1.15:.77;
      s.g.position.y+=travel*(1-ease);
      s.g.scale.set(1,.86+.14*ease,1);
    }
  }
}
function update(stamp=ownerWindow.performance.now()){
  if(disposed||viewport.width<=0||viewport.height<=0)return;
  if(!ready){began=stamp;ready=true;}
  const elapsed=(stamp-began)/1000;
  const t=isReduced||finishOnRequest?maxDuration:elapsed;
  const animating=t<maxDuration;
  if(animating||animatingPrev)assembly(t+.01);
  if((animating&&t-lastShadow>.15)||animating!==animatingPrev||lastShadow<0){
    renderer.shadowMap.needsUpdate=true;lastShadow=t;
  }
  if(animatingPrev&&!animating)weather.invalidate();
  animatingPrev=animating;
  const dt=lastFrame?Math.min((stamp-lastFrame)/1000,.05):0;
  lastFrame=stamp;weatherTime+=dt;
  furnitureVisuals.update(weatherTime,isReduced);
  controls.update();homeView.update();
  if(lightsDirty)syncFixtureLights();
  weather.update(weatherTime,isReduced?.55:THREE.MathUtils.smoothstep(t,1.4,5.4),animating);
  renderer.render(scene,camera);
  frameCount++;
  if(!animating)canvas.dataset.assembled='true';
  canvas.dataset.frames=frameCount;
}

// Compile shaders against the finished scene before starting the entrance.
// The first visible frame therefore belongs to the base even on a cold device.
renderer.compile(scene,camera);
assembly(.01);

canvas.addEventListener('keydown',e=>{
  const offset=camera.position.clone().sub(controls.target);
  const sphere=new THREE.Spherical().setFromVector3(offset);
  switch(e.key){
    case 'ArrowLeft':sphere.theta-=.11;break;
    case 'ArrowRight':sphere.theta+=.11;break;
    case 'ArrowUp':sphere.phi=Math.max(controls.minPolarAngle,sphere.phi-.07);break;
    case 'ArrowDown':sphere.phi=Math.min(controls.maxPolarAngle,sphere.phi+.07);break;
    case '+':case '=':sphere.radius=Math.max(controls.minDistance,sphere.radius*.88);break;
    case '-':sphere.radius=Math.min(controls.maxDistance,sphere.radius/.88);break;
    case 'Home':
      if(!homeView.home()){controls.target.copy(look);camera.position.copy(look).addScaledVector(viewDir,previousFit);controls.update();}
      e.preventDefault();return;
    default:return;
  }
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere));
  controls.update();e.preventDefault();
},{signal});

const mask=createActorMask({scene,camera,renderer,getViewport:()=>viewport,isDisposed:()=>disposed});
function project(worldPoint){
  if(disposed)return null;
  camera.updateMatrixWorld(true);
  const p=new THREE.Vector3(...worldPoint).project(camera);
  return {x:(p.x+1)*viewport.width/2,y:(1-p.y)*viewport.height/2,depth:p.z,ndcDepth:p.z,
    visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1,viewport:{...viewport}};
}
function getCameraPose(){return {eye:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov};}
function setCameraPose(pose){
  if(disposed)return;
  if(!pose||!Array.isArray(pose.eye)||!Array.isArray(pose.target)||pose.eye.length!==3||pose.target.length!==3||![...pose.eye,...pose.target].every(Number.isFinite))throw new TypeError('Invalid camera pose');
  homeView.cancelTravel();camera.position.fromArray(pose.eye);controls.target.fromArray(pose.target);
  controls.update();weather.invalidate();
}
function getRendererInfo(){
  return {frames:frameCount,running,disposed,viewport:{...viewport},
    calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
    geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
    programs:renderer.info.programs?.length??0,pixelRatio:renderer.getPixelRatio()};
}
function start(){if(disposed||running)return;running=true;lastFrame=0;renderer.setAnimationLoop(update);}
function stop(){if(!running)return;running=false;renderer.setAnimationLoop(null);lastFrame=0;}
function pickSurface(x,y){
  if(disposed||viewport.width<=0||viewport.height<=0)return null;
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(2*x/viewport.width-1,1-2*y/viewport.height),camera);
  const candidates=[];scene.traverseVisible(o=>{if(o.isMesh&&o.layers.test(camera.layers)&&!o.isReflector)candidates.push(o);});
  for(const hit of ray.intersectObjects(candidates,false)){
    const m=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
    if(m?.transparent&&(m.opacity<.35||m.blending===THREE.AdditiveBlending))continue;
    return {point:hit.point.toArray(),normal:hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).toArray()??null,itemId:registry.idFor(hit.object)};
  }
  return null;
}
function pickWalkable(x,y){
  if(disposed||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>viewport.width||y>viewport.height)return null;
  const hit=pickSurface(x,y);
  if(!hit||hit.itemId||!hit.normal||hit.normal[1]<.8)return null;
  const destination=navigationQuery.locate(hit.point);
  // Ignore tables, rooftops and other horizontal surfaces above the navigable floor.
  return destination&&Math.abs(destination.position[1]-hit.point[1])<.075?destination:null;
}
function setFurnitureVisuals(snapshot){
  if(disposed)return null;
  const result=furnitureVisuals.setFurnitureVisuals(snapshot);
  lightsDirty=true;weather.invalidate();return result;
}
function setPlotVisuals(snapshot){
  if(disposed)return null;
  const revision=plotVisuals.getRevision(),result=plotVisuals.setPlotVisuals(snapshot);
  if(revision!==plotVisuals.getRevision()){renderer.shadowMap.needsUpdate=true;weather.invalidate();}
  return result;
}
function dispose(){
  if(disposed)return disposal;
  stop();disposed=true;abort.abort();observer.disconnect();
  controls.removeEventListener('change',onControlChange);controls.removeEventListener('start',onControlStart);controls.removeEventListener('end',onControlEnd);
  homeView.dispose();controls.dispose();const drained=mask.dispose();
  disposeSceneResources(scene,weather);registry.dispose();
  for(const stage of stages)stage.g.clear();
  stages.length=0;fixtureLights.length=0;shell.walls.length=0;shell.roof.length=0;
  scene.clear();container.remove();
  disposal=drained.then(()=>{renderer.dispose();renderer.forceContextLoss();});
  return disposal;
}
if(autoStart)start();
return Object.freeze({
  ...catalog,canvas,element:container,setView(mode){if(!disposed)homeView.setMode(mode);},getView:homeView.getMode,
  project,getCameraPose,setCameraPose,getRendererInfo,pickSurface,pickWalkable,
  getNavigationData,getActionSlots,setFurnitureVisuals,getFurnitureVisuals:furnitureVisuals.getFurnitureVisuals,
  setPlotVisuals,getPlotVisuals:plotVisuals.getPlotVisuals,
  update,start,stop,resize,dispose,renderActorMask:mask.render,
  finishAssembly(){finishOnRequest=true;}
});

}
