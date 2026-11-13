import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { SITE } from './layout.js';

// A low-resolution reflected view is only refreshed when the model or camera
// moves. Rain still disturbs its surface while the camera is at rest.
export function makeWeather(scene, renderer, camera, stageFloor) {
  const vertex = Reflector.ReflectorShader.vertexShader
    .replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 pavement;')
    .replace('vUv = textureMatrix', 'pavement = position.xy; vUv = textureMatrix');
  const shader = {
    uniforms:{...Reflector.ReflectorShader.uniforms, clock:{value:0}},
    vertexShader:vertex,
    fragmentShader:`
      uniform sampler2D tDiffuse;
      uniform float clock;
      varying vec4 vUv; varying vec2 pavement;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
      }
      void main(){
        vec2 p=pavement, q=vUv.xy/vUv.w;
        float row=noise(vec2(p.x*2.2,p.y*51.+.52*clock));
        float water=noise(p*vec2(.73,1.45))+noise(p*vec2(1.35,10.))*.27;
        q.x+=.0009*sin(p.y*15.+noise(p*3.)*3.+clock*1.2)+.0033*(row-.5);
        q.y+=.0016*(noise(p*vec2(4.,20.)+clock*.12)-.5);
        vec3 rgb=texture2D(tDiffuse,q).rgb*.5;
        rgb+=texture2D(tDiffuse,q+vec2(.002,.0008)).rgb*.25;
        rgb+=texture2D(tDiffuse,q-vec2(.002,.0008)).rgb*.25;
        float luma=dot(rgb,vec3(.23,.61,.16));
        float coverage=.19+.72*smoothstep(.23,.94,water);
        float alpha=coverage*smoothstep(.004,.3,luma)*(.66+.23*row);
        gl_FragColor=vec4(rgb*vec3(.94,.93,1.),alpha*.80);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  const mirror=new Reflector(new THREE.PlaneGeometry(SITE.size-.08,SITE.size-.08),{
    textureWidth:896, textureHeight:640, multisample:0, clipBias:.002, shader
  });
  mirror.material.transparent=true; mirror.material.depthWrite=false;
  mirror.position.set(SITE.centerX,.009,SITE.centerZ); mirror.rotation.x=-Math.PI/2;
  mirror.renderOrder=1;stageFloor.add(mirror);
  const capture=mirror.onBeforeRender;
  let changing=true, lastCapture=-100, elapsed=0;
  mirror.onBeforeRender=function(...args) {
    if(!changing || elapsed-lastCapture<.085) return;
    capture.apply(this,args);
    changing=false;lastCapture=elapsed;
  };

  let seed=4125;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const drops=Math.round(SITE.size**2*2.69), coords=[], velocities=[], extent=[];
  for(let i=0;i<drops;i++){
    coords.push(SITE.left+.15+random()*(SITE.size-.60),random()*9.6,SITE.back+.22+random()*(SITE.size-.55));
    velocities.push(4.3+random()*2.7);extent.push(.11+random()*.14);
  }
  const rainGeo=new THREE.BufferGeometry();
  rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  for(const [name,data] of [['velocity',velocities],['extent',extent]])rainGeo.setAttribute(name,new THREE.Float32BufferAttribute(data,1));
  const rainUniforms={clock:{value:0},intensity:{value:0},pixelFocal:{value:900}};
  const rain=new THREE.Points(rainGeo,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:rainUniforms,
    vertexShader:`
      attribute float velocity,extent;
      uniform float clock,pixelFocal;varying float a,lit,screenSize;
      void main(){vec3 p=position;float y=mod(p.y-clock*velocity,9.6);
        p.x+=(9.6-y)*.028;p.z-=(9.6-y)*.012;p.y=y;
        float shop=step(-5.16,p.x)*step(p.x,2.53)*step(-4.93,p.z)*step(p.z,1.06);
        float tea=step(-10.5,p.x)*step(p.x,-6.27)*step(-4.4,p.z)*step(p.z,1.17);
        float roofHeight=max(3.82*shop,tea*(3.83-abs(p.x+8.33)*.52));
        a=smoothstep(roofHeight,roofHeight+.25,y)*(1.-smoothstep(8.,9.6,y));
        float lamp=length(p-vec3(-8.35,2.65,1.78)), corner=length(p-vec3(3.87,3.85,1.4));
        lit=max(1.-smoothstep(.45,3.25,lamp),1.-smoothstep(.4,2.6,corner));
        vec4 mv=modelViewMatrix*vec4(p,1.);
        screenSize=clamp(extent*pixelFocal/max(1.,-mv.z),2.0,18.);
        gl_PointSize=screenSize;gl_Position=projectionMatrix*mv;}
    `,
    fragmentShader:`varying float a,lit,screenSize;uniform float intensity;void main(){
      vec2 uv=gl_PointCoord-.5;
      float width=max(.075,1.0/screenSize);
      float streak=exp(-pow((uv.x+uv.y*.11)/width,2.))*(1.-smoothstep(.13,.52,abs(uv.y)));
      gl_FragColor=vec4(mix(vec3(.48,.62,.84),vec3(1.,.75,.43),lit),a*intensity*(.30+.38*lit)*streak);
      #include <colorspace_fragment>
    }`
  }));
  rain.frustumCulled=false;rain.renderOrder=4;scene.add(rain);
  const rippleVerts=[], delays=[], centers=[];
  const roadArea=SITE.size**2-(SITE.sideCurb-SITE.left)*(SITE.frontCurb-SITE.back);
  for(let i=0;i<Math.round(roadArea*.52);i++){
    let x,z;
    do{
      x=SITE.left+.25+random()*(SITE.size-.50);
      z=SITE.back+.25+random()*(SITE.size-.55);
    }while(x<SITE.sideCurb+.08&&z<SITE.frontCurb+.17);
    const delay=random()*3;
    for(let j=0;j<16;j++) for(const a of [j,j+1]) {
      const theta=a*Math.PI/8; rippleVerts.push(Math.cos(theta),0,Math.sin(theta));delays.push(delay);centers.push(x,z);
    }
  }
  const rippleGeo=new THREE.BufferGeometry();
  rippleGeo.setAttribute('position',new THREE.Float32BufferAttribute(rippleVerts,3));
  rippleGeo.setAttribute('delay',new THREE.Float32BufferAttribute(delays,1));
  rippleGeo.setAttribute('center',new THREE.Float32BufferAttribute(centers,2));
  const ripple=new THREE.LineSegments(rippleGeo,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:rainUniforms,
    vertexShader:`attribute float delay; attribute vec2 center;uniform float clock;varying float a;
      void main(){float f=fract((clock+delay)/2.24);a=(1.-smoothstep(.03,.45,f))*smoothstep(0.,.04,f);
        vec3 p=vec3(center.x,.032,center.y)+position*(.018+f*.38);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying float a;uniform float intensity;void main(){
      gl_FragColor=vec4(.56,.72,.81,a*intensity*.34);
      #include <colorspace_fragment>
    }`
  }));
  ripple.frustumCulled=false;ripple.renderOrder=3;scene.add(ripple);
  return {invalidate(){changing=true;},update(time,active,animating){
    elapsed=time;mirror.material.uniforms.clock.value=time;
    if(animating)changing=true;
    rainUniforms.clock.value=time;rainUniforms.intensity.value=active;
    rainUniforms.pixelFocal.value=renderer.domElement.height*camera.projectionMatrix.elements[5]*.5;
  }};
}
