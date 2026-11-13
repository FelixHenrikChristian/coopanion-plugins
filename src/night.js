import * as THREE from 'three';

// A painted band of distant city light under a low rain ceiling. The
// horizon follows the view direction while the lower field holds the model.
export function makeNightSky(scene) {
  const uniforms={viewRotation:{value:new THREE.Matrix3()}, viewScale:{value:new THREE.Vector2()}};
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
    uniforms,depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:`varying vec2 screen;
      void main(){screen=position.xy;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader:`
      uniform mat3 viewRotation;
      uniform vec2 viewScale;
      varying vec2 screen;
      float hash(vec2 p){
        vec3 q=fract(vec3(p.xyx)*.1031);
        q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);
      }
      float cloud(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                   mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main(){
        vec3 ray=normalize(viewRotation*vec3(screen*viewScale,-1.));
        vec2 az=normalize(ray.xz+vec2(.0001));
        float band=exp(-pow((ray.y+.286)/.084,2.));
        float dome=exp(-pow((ray.y+.255)/.21,2.));
        vec2 sampleAt=az*2.8+vec2(ray.y*1.9,ray.y*9.);
        float clouds=.65*cloud(sampleAt)+.35*cloud(sampleAt*2.7+1.7);
        float warm=.5+.5*dot(az,normalize(vec2(-.9,-.15)));
        vec3 haze=mix(vec3(.116,.174,.261),vec3(.183,.165,.239),warm);
        vec3 rgb=vec3(.007,.011,.029)+vec3(.018,.027,.056)*dome;
        rgb+=haze*band*(.69+.24*clouds);
        rgb+=vec3(.022,.017,.032)*(clouds-.45)*dome;
        rgb*=1.-.24*smoothstep(.48,1.53,length(screen*vec2(.91,.78)));
        rgb+=(hash(gl_FragCoord.xy)-.5)/255.;
        gl_FragColor=vec4(rgb,1.);
      }`
  }));
  sky.frustumCulled=false;sky.renderOrder=-100;sky.layers.set(1);
  sky.onBeforeRender=(_renderer,_scene,camera)=>{
    uniforms.viewRotation.value.setFromMatrix4(camera.matrixWorld);
    const m=camera.projectionMatrix.elements;
    uniforms.viewScale.value.set(1/m[0],1/m[5]);
  };
  scene.add(sky);
}
