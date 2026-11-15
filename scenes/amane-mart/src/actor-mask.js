import * as THREE from 'three';
import {projectActorBillboard} from './actor-projection.js';

// The actor remains inside an independent, sandboxed DOM renderer. This pass
// supplies only the scene's occlusion; it never reads or stores actor pixels.
export function createActorMask({scene,camera,renderer,getViewport,isDisposed}) {
  const doc=renderer.domElement.ownerDocument;
  const output=doc.createElement('canvas'),context=output.getContext('2d');
  const material=new THREE.ShaderMaterial({
    uniforms:{actorDepth:{value:1},actorFootY:{value:0},actorDepthSlope:{value:0}},side:THREE.DoubleSide,
    depthTest:true,depthWrite:true,blending:THREE.NoBlending,toneMapped:false,
    vertexShader:`void main(){
      vec4 p=vec4(position,1.0);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p;
      #endif
      gl_Position=projectionMatrix*modelViewMatrix*p;
    }`,
    fragmentShader:`uniform float actorDepth;
      uniform float actorFootY;
      uniform float actorDepthSlope;
      void main(){
        float depthAtY=actorDepth+(gl_FragCoord.y-actorFootY)*actorDepthSlope;
        float visible=step(depthAtY-0.000006,gl_FragCoord.z);
        gl_FragColor=vec4(vec3(visible),visible);
      }`
  });
  const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false,samples:0});
  target.texture.colorSpace=THREE.NoColorSpace;
  let dead=false,pending=null,released=false;
  function release(){
    if(released)return;released=true;
    material.dispose();target.dispose();output.width=output.height=1;
  }
  function skip(object){
    if(object.isReflector||object.isPoints||object.isLine||object.isSprite)return true;
    if(!object.isMesh)return false;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    return materials.some(m=>m&&(m.depthTest===false||m.blending===THREE.AdditiveBlending||
      m.transparent&&(m.opacity<.95||m.depthWrite===false)));
  }
  async function capture({rect,worldPoint,worldHeight,facing='world'}){
    const viewport=getViewport();
    if(!rect||![rect.x,rect.y,rect.width,rect.height,...(worldPoint??[])].every(Number.isFinite)||worldPoint?.length!==3)
      throw new TypeError('An actor mask requires a finite local CSS rectangle and world point');
    if(worldHeight!==undefined&&(!Number.isFinite(worldHeight)||worldHeight<0))throw new TypeError('Actor height must be finite and nonnegative');
    if(facing!=='world'&&facing!=='camera')throw new TypeError('Actor facing must be world or camera');
    if(rect.width<=0||rect.height<=0||viewport.width<=0||viewport.height<=0||
      rect.x+rect.width<=0||rect.y+rect.height<=0||rect.x>=viewport.width||rect.y>=viewport.height)return null;
    camera.updateMatrixWorld(true);
    const projected=new THREE.Vector3(...worldPoint).project(camera);
    if(projected.z<-1||projected.z>1)return null;
    material.uniforms.actorDepth.value=(projected.z+1)*.5;
    const scale=Math.min(renderer.getPixelRatio(),512/Math.max(rect.width,rect.height));
    const width=Math.max(1,Math.ceil(rect.width*scale)),height=Math.max(1,Math.ceil(rect.height*scale));
    const toLocalY=p=>(rect.y+rect.height-(1-p.y)*viewport.height*.5)*height/rect.height;
    const footY=toLocalY(projected);
    material.uniforms.actorFootY.value=footY;
    material.uniforms.actorDepthSlope.value=0;
    // The image always faces the camera, but its body still occupies vertical
    // space above the feet. Map that depth range over the billboard's stable
    // screen height, so a top view neither flattens it under tables nor divides
    // by the vanishing projection of the world's vertical axis.
    if(worldHeight>0){
      const top=new THREE.Vector3(worldPoint[0],worldPoint[1]+worldHeight,worldPoint[2]).project(camera);
      const deltaY=facing==='camera'
        ?projectActorBillboard(camera,viewport,worldPoint,worldHeight).pixelHeight*height/rect.height
        :toLocalY(top)-footY;
      if(Math.abs(deltaY)>1e-5)material.uniforms.actorDepthSlope.value=(top.z-projected.z)*.5/deltaY;
    }
    target.setSize(width,height);
    const localCamera=camera.clone();
    localCamera.layers.set(0); // The painted, depth-free night sky is on layer 1.
    localCamera.setViewOffset(viewport.width,viewport.height,rect.x,rect.y,rect.width,rect.height);
    localCamera.updateMatrixWorld(true);
    const saved={
      target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),
      scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),
      color:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),
      autoClear:renderer.autoClear,shadow:renderer.shadowMap.enabled,
      shadowDirty:renderer.shadowMap.needsUpdate,xr:renderer.xr.enabled,
      override:scene.overrideMaterial,background:scene.background
    };
    const hidden=[];
    scene.traverse(object=>{if(object.visible&&skip(object)){hidden.push(object);object.visible=false;}});
    const pixels=new Uint8Array(width*height*4);
    let read;
    try{
      scene.overrideMaterial=material;scene.background=null;
      renderer.shadowMap.enabled=false;renderer.xr.enabled=false;
      renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setScissorTest(false);
      renderer.setViewport(0,0,width,height);renderer.setClearColor(0xffffff,1);
      renderer.clear(true,true,true);renderer.render(scene,localCamera);
      read=renderer.readRenderTargetPixelsAsync(target,0,0,width,height,pixels);
    }finally{
      hidden.forEach(object=>{object.visible=true;});
      scene.overrideMaterial=saved.override;scene.background=saved.background;
      renderer.shadowMap.enabled=saved.shadow;renderer.shadowMap.needsUpdate=saved.shadowDirty;
      renderer.xr.enabled=saved.xr;renderer.autoClear=saved.autoClear;
      renderer.setRenderTarget(saved.target);renderer.setViewport(saved.viewport);
      renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);
      renderer.setClearColor(saved.color,saved.alpha);
    }
    try{await read;}catch(error){if(dead||isDisposed())return null;throw error;}
    if(dead||isDisposed())return null;
    output.width=width;output.height=height;
    const data=context.createImageData(width,height),rowBytes=width*4;
    for(let y=0;y<height;y++)data.data.set(pixels.subarray((height-1-y)*rowBytes,(height-y)*rowBytes),y*rowBytes);
    context.putImageData(data,0,0);
    return {url:output.toDataURL('image/png'),width:rect.width,height:rect.height,pixelWidth:width,pixelHeight:height};
  }
  return {
    render(args){
      if(dead||isDisposed()||pending)return Promise.resolve(null);
      pending=capture(args).finally(()=>{pending=null;if(dead)release();});
      return pending;
    },
    dispose(){
      dead=true;if(!pending)release();
      return pending?.then(()=>{},()=>{})??Promise.resolve();
    }
  };
}
