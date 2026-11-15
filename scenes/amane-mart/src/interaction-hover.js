import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// One depth-tested inverted hull for the hovered item. No full-screen targets,
// and no idle raycasts: pointer/camera changes merely request one bounded pick.
export function createInteractionHover({canvas,camera,getObject,pickSurface,getViewport,signal}){
  const material=new THREE.ShaderMaterial({
    uniforms:{viewport:{value:new THREE.Vector2(1,1)},width:{value:2},tint:{value:new THREE.Color('#ffe0a6')}},
    side:THREE.BackSide,depthTest:true,depthWrite:false,toneMapped:false,
    vertexShader:`uniform vec2 viewport;uniform float width;
      void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        vec2 n=(projectionMatrix*vec4(normalMatrix*normal,0.0)).xy;
        if(length(n)>0.00001)p.xy+=normalize(n)*width*2.0/viewport*p.w;
        gl_Position=p;}`,
    fragmentShader:`uniform vec3 tint;void main(){gl_FragColor=vec4(tint,1.0);
      #include <colorspace_fragment>
    }`
  });
  let selected=null,outline=null,pointer=null,dirty=false,lastPick=-Infinity,dead=false,builds=0,picks=0;
  camera.layers.enable(2);
  function clear(){if(outline){outline.removeFromParent();outline.geometry.dispose();outline=null;}selected=null;canvas.style.cursor='';}
  function build(object){
    object.updateWorldMatrix(true,true);const inverse=object.matrixWorld.clone().invert(),parts=[];let vertices=0;
    object.traverseVisible(mesh=>{
      if(!mesh.isMesh||mesh.userData.interactionOutline||!mesh.geometry?.attributes.position)return;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      if(materials.every(m=>m?.transparent&&m.opacity<.35||m?.depthTest===false||m?.blending===THREE.AdditiveBlending))return;
      const count=mesh.isInstancedMesh?mesh.count:1;
      for(let i=0;i<count;i++){
        const size=mesh.geometry.index?.count??mesh.geometry.attributes.position.count;
        if(vertices+size>180000)break;
        const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
        for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);
        if(!geometry.attributes.normal)geometry.computeVertexNormals();
        const matrix=inverse.clone().multiply(mesh.matrixWorld);
        if(mesh.isInstancedMesh){const instance=new THREE.Matrix4();mesh.getMatrixAt(i,instance);matrix.multiply(instance);}
        geometry.applyMatrix4(matrix);parts.push(geometry);vertices+=size;
      }
    });
    const merged=parts.length?mergeGeometries(parts):null;parts.forEach(part=>part.dispose());return merged;
  }
  function set(id){
    if(dead||id===selected)return getState();
    clear();if(id===null||id===undefined)return getState();
    const object=getObject(id);if(!object)throw new RangeError('Unknown interactive item');
    const geometry=build(object);if(!geometry)return getState();
    outline=new THREE.Mesh(geometry,material);outline.name='Interaction outline';outline.userData.interactionOutline=true;
    outline.layers.set(2);outline.renderOrder=999;outline.frustumCulled=false;object.add(outline);selected=id;builds++;canvas.style.cursor='pointer';return getState();
  }
  function invalidate(){if(pointer)dirty=true;}
  function refresh(){if(selected){const id=selected;clear();set(id);}}
  function update(stamp){
    if(dead)return;const viewport=getViewport();material.uniforms.viewport.value.set(Math.max(1,viewport.width),Math.max(1,viewport.height));
    if(!dirty||!pointer||stamp-lastPick<80)return;dirty=false;lastPick=stamp;picks++;
    const rect=canvas.getBoundingClientRect(),hit=pickSurface(pointer.x-rect.left,pointer.y-rect.top);set(hit?.itemId??null);
  }
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||event.buttons){pointer=null;dirty=false;clear();return;}
    pointer={x:event.clientX,y:event.clientY};dirty=true;
  },{signal});
  for(const name of ['pointerleave','pointerdown','pointercancel'])canvas.addEventListener(name,()=>{pointer=null;dirty=false;clear();},{signal});
  function getState(){return{itemId:selected,drawCalls:outline?1:0,vertices:outline?.geometry.attributes.position.count??0,builds,picks};}
  return{set,update,invalidate,refresh,getState,dispose(){if(dead)return;dead=true;clear();material.dispose();camera.layers.disable(2);}};
}
