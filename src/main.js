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

const canvas=document.querySelector('canvas');
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
buildHomeGrounds(kit,registry.register);
buildStationRow(kit);
const shell=buildHomeShell(kit);
buildHomeFurniture(kit,registry.register);
const roomLights=kit.group('雨庭 · 室内灯',1.9);
for(const [x,z,power,color] of [[-6.65,10.15,10.5,0xffcb91],[-6.75,14.65,9.4,0xffd6a5],[-2.52,13.8,12,0xffddb0],[1.25,11.86,8.6,0xffe4bb]]){
  const light=new THREE.PointLight(color,power,7.1,2);
  light.position.set(x,2.82,z);roomLights.add(light);
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
for(const [x,z,h] of [[-10.18,1.47,6.48],[-10.18,-7.59,6.60],[.80,-9.40,5.98],[2.51,1.02,3.90]])boundsPoints.push(new THREE.Vector3(x,h,z));
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
const homeView=createHomeView({camera,controls,shell,items:registry.items(),finishAssembly(){finishOnRequest=true;},onChange(){
  renderer.shadowMap.needsUpdate=true;weather.invalidate();
}});
registry.connect(canvas,camera,scene,homeView);
controls.addEventListener('change',()=>weather.invalidate());
controls.addEventListener('start',()=>canvas.classList.add('moving'));
controls.addEventListener('end',()=>canvas.classList.remove('moving'));
let previousFit=0;
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const distance=fittedDistance(camera.aspect);
  const factor=previousFit?distance/previousFit:distance/camera.position.distanceTo(controls.target);
  camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
  controls.maxDistance=Math.max(80,distance*2.3);previousFit=distance;
  controls.update();weather.invalidate();
}
resize();window.addEventListener('resize',resize);

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
const isReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const maxDuration=Math.max(...stages.map(s=>s.start*1.43+s.duration))+.1;
let began=0, ready=false, lastShadow=-1, animatingPrev=true;
let weatherTime=0, frameCount=0, lastFrame=0;
function assembly(time){
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
function frame(stamp){
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
  controls.update();homeView.update();weather.update(weatherTime,isReduced?.55:THREE.MathUtils.smoothstep(t,1.4,5.4),animating);
  renderer.render(scene,camera);
  frameCount++;
  if(!animating)canvas.dataset.assembled='true';
  canvas.dataset.frames=frameCount;
}

// Compile shaders against the finished scene before starting the entrance.
// The first visible frame therefore belongs to the base even on a cold device.
renderer.compile(scene,camera);
assembly(.01);
renderer.setAnimationLoop(frame);
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
});
