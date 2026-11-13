import * as THREE from 'three';

// A wall-fixed oak swing arm supports a paper and bent-veneer dining shade.
// Its entire assembly follows the wall through each cutaway mode.
export function buildDiningPendant(k, wall) {
  const x=2.14, z=-1.37;
  k.box(wall,x,2.706,-.099,.142,.386,.078,'#755942');
  k.box(wall,x,2.821,-.738,.055,.051,1.312,'#ae8962');
  k.line(wall,[[x,2.61,-.148],[x,2.796,-.723]],'#826c4e',.017);
  k.line(wall,[[x,2.816,-.12],[x,2.852,-.41],[x,2.848,-1.316],[x,2.811,z],[x,2.521,z]],'#465153',.008);
  const profile=[[.071,-.141],[.219,-.129],[.369,-.063],[.423,.013],[.411,.054],[.332,.113],[.176,.166],[.059,.180]];
  const paper=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),32),
    k.mat('#ffe5bd',{emissive:'#ffcc95',intensity:.67,roughness:.98}));
  paper.position.set(x,2.32,z);wall.add(paper);
  const vertices=[],indices=[];
  // Broad curving staves carry the silhouette, not a dense mesh of tiny ribs.
  for(let j=0;j<12;j++){
    const offset=vertices.length/3;
    for(let i=0;i<profile.length;i++){
      const [radius,dy]=profile[i],theta=j*Math.PI/6+i*.030;
      for(const side of [-1,1]){
        const angle=theta+side*(.042+.011*Math.sin(i*Math.PI/7));
        vertices.push((radius+.006)*Math.cos(angle),dy,(radius+.006)*Math.sin(angle));
      }
      if(i<profile.length-1){const a=offset+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  const ribs=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#af885d',roughness:.75,side:THREE.DoubleSide}));ribs.position.copy(paper.position);wall.add(ribs);
  for(const [r,y] of [[.222,-.129],[.425,.012],[.178,.166]]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.004,5,28),k.mat('#a88965'));
    ring.rotation.x=Math.PI/2;ring.position.set(x,2.32+y,z);wall.add(ring);
  }
  k.cyl(wall,x,2.512,z,.049,.060,.036,'#977c57',{segments:20});
  k.cyl(wall,x,2.180,z,.069,.064,.009,'#fff0cc',{segments:24,emissive:'#ffce9b',intensity:.71});
}
