import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

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
        q.x+=.0014*sin(p.y*17.+noise(p*3.)*3.+clock*1.2)+.008*(row-.5);
        q.y+=.004*(noise(p*vec2(4.,20.)+clock*.12)-.5);
        vec3 rgb=texture2D(tDiffuse,q).rgb*.5;
        rgb+=texture2D(tDiffuse,q+vec2(.002,.0008)).rgb*.25;
        rgb+=texture2D(tDiffuse,q-vec2(.002,.0008)).rgb*.25;
        float luma=dot(rgb,vec3(.23,.61,.16));
        float coverage=.08+.68*smoothstep(.37,.92,water);
        float alpha=coverage*smoothstep(.004,.3,luma)*(.66+.23*row);
        gl_FragColor=vec4(rgb*vec3(.88,.89,1.),alpha*.67);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  const mirror=new Reflector(new THREE.PlaneGeometry(13.95,13.95),{
    textureWidth:768, textureHeight:640, multisample:0, clipBias:.002, shader
  });
  mirror.material.transparent=true; mirror.material.depthWrite=false;
  mirror.position.y=.009; mirror.rotation.x=-Math.PI/2;
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
  const drops=310, coords=[], offsets=[], velocities=[], extent=[];
  for(let i=0;i<drops;i++){
    const x=random()*13.6-6.8,z=random()*13.6-6.8;
    const y=random()*7.8, speed=4+random()*2.5, length=.09+random()*.16;
    for(let n=0;n<2;n++){
      coords.push(x,y,z); offsets.push(n);velocities.push(speed);extent.push(length);
    }
  }
  const rainGeo=new THREE.BufferGeometry();
  rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  for(const [name,data] of [['endPt',offsets],['velocity',velocities],['extent',extent]])rainGeo.setAttribute(name,new THREE.Float32BufferAttribute(data,1));
  const rainUniforms={clock:{value:0},intensity:{value:0}};
  const rain=new THREE.LineSegments(rainGeo,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:rainUniforms,
    vertexShader:`
      attribute float endPt,velocity,extent;uniform float clock;varying float a;
      void main(){vec3 p=position;float y=mod(p.y-clock*velocity,7.8);
        p.x+=(7.8-y)*.067;p.z-=(7.8-y)*.019;p.y=y;
        float indoors=step(-4.97,p.x)*step(p.x,2.2)*step(-4.75,p.z)*step(p.z,.8);
        a=smoothstep(0.,.45,y)*(1.-smoothstep(6.9,7.8,y))*(1.-indoors*(1.-step(4.1,y)));
        p+=vec3(-.067,1.,.019)*endPt*extent;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
    `,
    fragmentShader:`varying float a;uniform float intensity;void main(){
      gl_FragColor=vec4(.55,.76,.92,a*intensity*.27);
      #include <colorspace_fragment>
    }`
  }));
  rain.frustumCulled=false;rain.renderOrder=4;scene.add(rain);
  const rippleVerts=[], delays=[], centers=[];
  for(let i=0;i<62;i++){
    let x,z;do{x=random()*13.5-6.75;z=random()*13.5-6.75;}while(x<3.43&&z<2.72);
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
  }};
}
