import * as THREE from 'three';

export function semanticGroup(parent,name){
  const group=new THREE.Group();group.name=name;group.userData.preserveBatch=true;parent.add(group);return group;
}

// Split existing batches by wall face without changing any geometry, finishes or
// instance transforms. Each finish remains instanced inside its semantic face.
export function splitShellStage(stage,faces,classify){
  const children=[...stage.children],groups=Object.fromEntries(Object.keys(faces).map(key=>[key,semanticGroup(stage,stage.name+' / '+key)]));
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  for(const object of children){
    if(object.isInstancedMesh){
      const buckets=new Map();
      for(let i=0;i<object.count;i++){
        object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
        const key=classify(position,object);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);
      }
      for(const [key,indices] of buckets){
        const mesh=new THREE.InstancedMesh(object.geometry,object.material,indices.length),color=new THREE.Color();
        indices.forEach((index,i)=>{object.getMatrixAt(index,matrix);mesh.setMatrixAt(i,matrix);if(object.instanceColor){object.getColorAt(index,color);mesh.setColorAt(i,color);}});
        mesh.castShadow=object.castShadow;mesh.receiveShadow=object.receiveShadow;mesh.computeBoundingSphere();groups[key].add(mesh);
      }
      stage.remove(object);object.dispose();
    }else groups[classify(object.position,object)].add(object);
  }
  return Object.entries(groups).map(([key,object])=>({object,outer:true,...faces[key]}));
}

export function rectangleFaces(left,right,back,front){
  return {back:{a:[left,back],b:[right,back],outward:[0,-1]},left:{a:[left,back],b:[left,front],outward:[-1,0]},
    right:{a:[right,back],b:[right,front],outward:[1,0]},front:{a:[left,front],b:[right,front],outward:[0,1]}};
}
