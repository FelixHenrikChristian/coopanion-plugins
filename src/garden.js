import * as THREE from 'three';

// A small, clipped garden behind the tea room. Each cloud of leaves is built
// around the tip of a real branch and shares the light and shadow of the street.
export function buildGarden(k) {
  const timber=k.group('Rear gardens · trunks and stone edging',1.46);
  const leafStage=k.group('Rear gardens · pruned pine and camellias',2.48);
  let seed=91331;
  function rand(){seed=Math.imul(seed,1664525)+1013904223>>>0;return seed/4294967296;}
  const needles=[], petals=[], rocks=[];
  const bark='#614e50';
  function limb(parent,start,end,width,taper,color) {
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),axis=b.clone().sub(a);
    const p=a.lerp(b,.5);
    const branch=k.cyl(parent,p.x,p.y,p.z,taper,width,axis.length(),color,{segments:8,roughness:.92});
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
  }
  const green=['#386259','#477669','#527967','#537568','#335a59','#648371'];
  function canopy(tip,rx,ry,rz) {
    for(let n=0;n<17;n++){
      const a=n*2.39996, r=Math.sqrt((n+.25)/17);
      const radial=1.08-r*.20;
      const x=tip[0]+Math.cos(a)*rx*r, z=tip[2]+Math.sin(a)*rz*r;
      const y=tip[1]+ry*(1-r*r)+rand()*.08;
      const size=.36+rand()*.25;
      needles.push([x,y,z,rx*size*radial,ry*(.56+rand()*.5),rz*size,green[Math.floor(rand()*green.length)]]);
    }
  }
  function tree(x,z,scale,angle){
    function point(px,py,pz){
      return [x+scale*(px*Math.cos(angle)+pz*Math.sin(angle)),.19+scale*py,z+scale*(-px*Math.sin(angle)+pz*Math.cos(angle))];
    }
    const trunk=[[0,0,0],[.19,1.16,-.12],[-.12,2.08,.06],[.12,3.02,-.08],[.08,3.9,0],[.26,4.72,.05]];
    for(let i=1;i<trunk.length;i++)limb(timber,point(...trunk[i-1]),point(...trunk[i]),scale*(.235-i*.029),scale*(.211-i*.029),bark);
    const arms=[
      [1,-1.03,1.87,.23,.67,.32,.63], [2,1.02,2.49,.22,.82,.40,.65],
      [2,-.43,2.77,-.65,.76,.34,.63], [3,-.81,3.48,.18,.86,.42,.67],
      [3,.68,3.54,-.39,.72,.43,.69], [4,.46,4.19,.22,.71,.45,.58],
      [5,.18,4.83,.02,.62,.31,.56]
    ];
    for(const [joint,tx,ty,tz,rx,ry,rz] of arms){
      const from=point(...trunk[joint]),end=point(tx,ty,tz);
      const elbow=point(tx*.68,Math.min(ty-.28,trunk[joint][1]+.21),tz*.78);
      limb(timber,from,elbow,.09*scale,.055*scale,bark);
      limb(timber,elbow,end,.056*scale,.023*scale,'#665954');
      canopy(end,rx*scale,ry*scale,rz*scale);
    }
  }
  tree(-8.68,-5.71,1.14,-.22);
  tree(-1.86,-7.31,.81,1.45);
  const shrubs=[[-9.86,-6.21,.67],[-7.92,-6.63,.78],[-8.1,-7.43,.67],[-9.37,-4.52,.53],
               [-4.31,-7.35,.72],[-3.29,-7.85,.74],[.05,-7.63,.61],[1.41,-7.81,.57]];
  for(const [x,z,s] of shrubs){
    canopy([x,.26+s*.22,z],s,s*.51,s*.71);
    for(let j=0;j<3;j++){
      const a=rand()*Math.PI*2;
      if(rand()>.52) petals.push([x+Math.cos(a)*s*.68,.39+s*.35,z+Math.sin(a)*s*.52,.055,.042,.052,'#be737a']);
    }
  }
  for(const [x,z,s] of [[-9.86,-5.1,.43],[-9.39,-5.3,.28],[-7.16,-5.9,.49],[-7.41,-5.57,.29],[-3.81,-7.45,.43],[.57,-7.17,.28]]){
    rocks.push([x,.19+s*.33,z,s,s*.59,s*.69,'#798385']);
  }
  function instances(parent,items,geometry,roughness){
    const m=new THREE.MeshStandardMaterial({roughness,flatShading:true});
    const inst=new THREE.InstancedMesh(geometry,m,items.length);
    const pose=new THREE.Object3D(), color=new THREE.Color();
    items.forEach(([x,y,z,w,h,d,c],i)=>{
      pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.rotation.set(rand()*.14,rand()*Math.PI,rand()*.10);
      pose.updateMatrix();inst.setMatrixAt(i,pose.matrix);inst.setColorAt(i,color.set(c));
    });
    inst.receiveShadow=true;inst.castShadow=true;inst.computeBoundingSphere();parent.add(inst);
  }
  instances(leafStage,needles,new THREE.IcosahedronGeometry(1,1),.93);
  instances(leafStage,petals,new THREE.DodecahedronGeometry(1),.86);
  instances(timber,rocks,new THREE.DodecahedronGeometry(1),.69);
}
