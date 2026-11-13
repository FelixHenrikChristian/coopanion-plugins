import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function makeKit(scene, stages) {
  const materials = new Map(), cylinders = new Map();
  const cube = new THREE.BoxGeometry();
  function group(name, start) {
    const g = new THREE.Group();
    g.name = name;
    scene.add(g);
    stages.push({g,start});
    return g;
  }
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness:opts.roughness ?? .72, metalness:opts.metalness ?? .06,
      emissive:opts.emissive ?? 0, emissiveIntensity:opts.intensity ?? 1,
      transparent:opts.opacity != null && opts.opacity < 1, opacity:opts.opacity ?? 1,
      depthWrite:opts.opacity == null || opts.opacity >= 1
    }));
    return materials.get(key);
  }
  function put(parent,geometry,x,y,z,sx,sy,sz,color,opts) {
    const mesh = new THREE.Mesh(geometry,mat(color,opts));
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    mesh.receiveShadow = true;
    mesh.castShadow = sx + sy + sz > .7 && !mesh.material.transparent;
    parent.add(mesh);
    return mesh;
  }
  function box(parent,x,y,z,w,h,d,color,opts={}) {
    return put(parent,cube,x,y,z,w,h,d,color,opts);
  }
  function cyl(parent,x,y,z,rt,rb,h,color,opts={}) {
    const radius = Math.max(rt,rb,.001);
    const key = [rt/radius,rb/radius,opts.segments||16].join(':');
    if(!cylinders.has(key)) cylinders.set(key,new THREE.CylinderGeometry(rt/radius,rb/radius,1,opts.segments||16));
    return put(parent,cylinders.get(key),x,y,z,radius,h,radius,color,opts);
  }
  function line(parent,points,color,r=.025) {
    const container = new THREE.Group();
    parent.add(container);
    for(let i=1;i<points.length;i++) {
      const a = new THREE.Vector3(...points[i-1]), b = new THREE.Vector3(...points[i]);
      const delta = b.clone().sub(a), mid = a.clone().lerp(b,.5);
      const obj = cyl(container,mid.x,mid.y,mid.z,r,r,delta.length(),color,{segments:8});
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    }
    return container;
  }
  function label(parent,text,x,y,z,w,h,opts={}) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1536,Math.max(80,Math.round(128*w/h))); canvas.height=128;
    const c=canvas.getContext('2d');
    if(opts.bg) {c.fillStyle=opts.bg;c.fillRect(0,0,canvas.width,128);}
    c.fillStyle=opts.color??'#f6ebc5';
    c.font=opts.font??'bold 94px "Yu Gothic", "Microsoft YaHei", sans-serif';
    c.textBaseline='middle'; c.textAlign='center';
    c.fillText(text,canvas.width/2,67,canvas.width*.96);
    const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
    mesh.position.set(x,y,z); mesh.rotation.y=opts.rotateY??0; parent.add(mesh);
    return mesh;
  }
  const halo=document.createElement('canvas');halo.width=halo.height=128;
  const ctx=halo.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,.9)');gradient.addColorStop(.1,'rgba(255,255,255,.47)');
  gradient.addColorStop(.4,'rgba(255,255,255,.13)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const haloMap=new THREE.CanvasTexture(halo);
  function glow(parent,x,y,z,color,size,opacity=.25) {
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:haloMap,color,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    s.scale.set(size,size,1);s.position.set(x,y,z);parent.add(s);return s;
  }
  return {THREE,group,box,cyl,label,mat,line,glow};
}

// Merge rigid parts with equal surface properties. Vertex colours retain all of
// the individually painted parts while the entire assembly moves as one piece.
export function batchStage(g) {
  g.updateWorldMatrix(true,true);
  const inverse = g.matrixWorld.clone().invert();
  const batches = new Map();
  const gather=o=>{
    if(o!==g&&o.userData.preserveBatch){
      batchStage(o);
      return;
    }
    for(const child of o.children)gather(child);
    const m=o.material;
    if(!o.isMesh || o.isInstancedMesh || !m?.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.emissiveMap || !o.geometry.attributes.normal) return;
    const key=[m.roughness,m.metalness,m.emissive.getHex(),m.emissiveIntensity,m.side,o.castShadow,o.receiveShadow].join('/');
    if(!batches.has(key)) batches.set(key,[]);
    batches.get(key).push(o);
  };
  gather(g);
  for(const batch of batches.values()) {
    if(batch.length<2) continue;
    const originals=batch.map(o=>{
      const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      for(const a of Object.keys(geo.attributes)) if(a!=='position'&&a!=='normal')geo.deleteAttribute(a);
      const n=geo.attributes.position.count, color=new Float32Array(n*3), c=o.material.color;
      for(let i=0;i<color.length;i+=3){ color[i]=c.r;color[i+1]=c.g;color[i+2]=c.b; }
      geo.setAttribute('color',new THREE.BufferAttribute(color,3));
      return geo;
    });
    const combined=mergeGeometries(originals);
    originals.forEach(x=>x.dispose());
    if(!combined)continue;
    const first=batch[0], m=first.material.clone();m.color.set(0xffffff);m.vertexColors=true;
    const whole=new THREE.Mesh(combined,m);
    whole.castShadow=first.castShadow;whole.receiveShadow=first.receiveShadow;
    batch.forEach(o=>o.removeFromParent());g.add(whole);
  }
}
