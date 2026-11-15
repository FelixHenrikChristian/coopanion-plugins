import * as THREE from 'three';

// The bedrooms and hall share a finished floor elevation. The oak skin ends
// at the bedroom partition, where the padded rush mats meet the threshold.
export function layHomeFloor(k,parent) {
  const left=-9,back=8.30,width=12,depth=7.80,unit=128;
  const canvas=document.createElement('canvas');
  canvas.width=width*unit;canvas.height=Math.ceil(depth*unit);
  const c=canvas.getContext('2d');
  c.scale(unit,unit);c.translate(-left,-back);
  let seed=17321;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function rect(x,z,w,h,color){c.fillStyle=color;c.fillRect(x,z,w,h)}
  function region(x0,z0,x1,z1){c.beginPath();c.rect(x0,z0,x1-x0,z1-z0);c.clip()}

  function planks(x0,z0,x1,z1,palette) {
    c.save();region(x0,z0,x1,z1);rect(x0,z0,x1-x0,z1-z0,'#927a62');
    const rows=Math.ceil((z1-z0)/.215),pitch=(z1-z0)/rows;
    for(let j=0;j<rows;j++){
      const z=z0+j*pitch;
      for(let x=x0-(j%4)*.53;x<x1;){
        const w=1.59+.78*random(),h=pitch-.011;
        rect(x+.005,z+.005,w-.012,h,palette[Math.floor(random()*palette.length)]);
        rect(x+.009,z+.008,w-.021,.009,'rgba(255,237,206,.18)');
        // The long, slightly wavering lines follow the grain within each board.
        for(let i=0;i<4;i++){
          const y=z+.024+random()*(h-.049),begin=x+.035+random()*.15,end=x+w-.048-random()*.23;
          c.beginPath();c.moveTo(begin,y);c.bezierCurveTo(begin+w*.25,y+.018,begin+w*.5,y-.021,end,y+.005);
          c.strokeStyle=i%2?'rgba(117,77,56,.19)':'rgba(248,222,182,.30)';
          c.lineWidth=.006+random()*.003;c.stroke();
        }
        x+=w;
      }
    }
    c.restore();
  }
  const oak=['#c6a47e','#c8a682','#d1b38e','#c9ab86','#c3a17d','#ceb08b'];
  planks(-9,8.30,-1.1,12.60,oak);
  planks(-1.1,10.09,3,12.60,oak);
  planks(-4.95,12.60,-1.10,16.10,['#bf9f7b','#c6a882','#bfa07e','#caab85','#c3a380']);

  const sections=[[-9,8.30,-1.1,12.60],[-1.1,10.09,3,12.60],[-4.95,12.60,-1.1,16.10]];
  const xyz=[],uv=[],y=.410;
  for(const [x0,z0,x1,z1] of sections){
    k.box(parent,(x0+x1)/2,.362,(z0+z1)/2,x1-x0,.092,z1-z0,'#ac8d6c');
    for(const [x,z] of [[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]]){
      xyz.push(x,y,z);uv.push((x-left)/width,1-(z-back)*unit/canvas.height);
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
  const floor=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,roughness:.80,metalness:.01}));
  floor.name='Oak floors · living, kitchen and passage';floor.receiveShadow=true;parent.add(floor);
  buildStudyFloor(k,parent);
  buildSleepingRoom(k,parent);
}

// One fitted length of sakiori over a recessed underlay. It belongs to the
// floor assembly and continues beneath the desk, shelves and sliding-door jambs.
function buildStudyFloor(k,parent){
  const w=2.10,d=3.50,x=-.05,z=14.35,top=.410,thickness=.014;
  const underlay=k.box(parent,x,.359,z,w,.074,d,'#867660');
  underlay.name='Study subfloor';
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=1000;
  const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  c.fillStyle='#c2a278';c.fillRect(0,0,W,H);
  for(let i=0;i<H;i+=3){
    const wave=Math.sin(i*.037)+Math.cos(i*.093)*.7;
    c.fillStyle=wave>0?'rgba(241,221,182,.28)':'rgba(123,94,72,.18)';
    c.fillRect(0,i,W,1);
  }
  // The indigo bands run right through both jambs, like the ends of a loom roll.
  for(const end of [0,1]){
    const band=(offset,h,col)=>{c.fillStyle=col;c.fillRect(0,end?H-offset-h:offset,W,h);};
    for(const [y,h,col] of [[18,3,'#967458'],[27,3,'#eee0bd'],[42,8,'#b87960'],[60,4,'#52696c'],
      [72,36,'#637b7a'],[111,4,'#c4c4aa'],[120,3,'#576e70'],[132,3,'#aa805e']])band(y,h,col);
    const cy=end?H-90:90;
    c.lineWidth=2;c.strokeStyle='#d7c8a5';
    for(let xx=-12;xx<W+18;xx+=22){
      c.beginPath();c.moveTo(xx-7,cy);c.lineTo(xx,cy-4);c.lineTo(xx+7,cy);c.lineTo(xx,cy+4);c.closePath();c.stroke();
    }
  }
  for(let j=0;j<W;j+=4){
    c.fillStyle=j%8?'rgba(255,241,210,.18)':'rgba(85,67,55,.11)';c.fillRect(j,0,1,H);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const cloth=new THREE.MeshStandardMaterial({map:tex,roughness:.99,metalness:0});
  const edge=k.mat('#a38c6d',{roughness:.98});
  const geo=new THREE.BoxGeometry(w,thickness,d);
  const carpet=new THREE.Mesh(geo,[edge,edge,cloth,edge,edge,edge]);
  carpet.name='Study fitted sakiori';carpet.position.set(x,top-thickness/2,z);
  carpet.receiveShadow=true;parent.add(carpet);
}

// This is one continuous, neutral sample of fine woven fibres. Physical face
// colours live on the geometry, so even the coarsest mip or a grazing ray
// cannot mix dark binding into the pale rushes or the compressed short ends.
function tatamiMaterial(){
  const size=128,tau=Math.PI*2;
  const albedo=new Uint8Array(size*size),relief=new Uint8Array(size*size);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(z+.5)/size;
    const drift=.095*Math.sin(tau*v)+.028*Math.sin(tau*(3*v+u));
    const ridge=Math.cos(tau*(u*8+drift));
    const broad=Math.sin(tau*(2*u-v))*.60+Math.sin(tau*(3*u+v))*.40;
    const cross=Math.cos(tau*(7*v+.02*Math.sin(tau*2*u)));
    const n=z*size+x;
    const stitch=Math.max(0,cross)**5*(.5+.5*Math.sin(tau*(u*4+v*3.5))**2);
    albedo[n]=Math.round(232+11*ridge+4.5*broad-9*stitch);
    relief[n]=Math.round(128+25*ridge+4*broad+8*stitch);
  }
  function repeat(bytes,monochrome){
    // RGB channel conversion is required for a colour map; bump only reads R.
    const data=monochrome?bytes:new Uint8Array(size*size*4);
    if(!monochrome){for(let i=0;i<bytes.length;i++)data.set([bytes[i],bytes[i],bytes[i],255],i*4);}
    const t=new THREE.DataTexture(data,size,size,monochrome?THREE.RedFormat:THREE.RGBAFormat);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
    t.anisotropy=4;t.generateMipmaps=true;t.needsUpdate=true;
    if(!monochrome)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  }
  const mat=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,map:repeat(albedo,false),bumpMap:repeat(relief,true),
    bumpScale:.00028,roughness:.94,metalness:0
  });
  mat.name='Igusa rush, cotton heri and pressed straw';
  return mat;
}

// A fitted igusa mat, local X along its long axis and Z along its short
// axis. Long bindings follow the broad face over the bevel and down the side.
// Short ends reveal the pressed fibre and a slim dark fold of bottom paper.
function makeMat(length,width,shade,phase){
  const positions=[],colors=[],texcoords=[],patches=[];
  const halfL=length/2,halfW=width/2,thick=.050,roll=.0030,lip=.0025,binding=.032,foot=.0009;
  const dyes=['#d1c49a','#66746a','#b4a381','#8f8978'].map(c=>new THREE.Color(c));
  const light=new THREE.Color(),normal=new THREE.Vector3();
  const v1=new THREE.Vector3(),v2=new THREE.Vector3();
  function quad(a,b,c,d,slot,axis,desired,gain=1){
    v1.fromArray(b).sub(v2.fromArray(a));v2.fromArray(c).sub(new THREE.Vector3(...a));normal.crossVectors(v1,v2);
    const verts=normal.dot(desired)>=0?[a,b,c,a,c,d]:[a,c,b,a,d,c];
    const dye=dyes[slot];
    light.setRGB(dye.r*shade[0]*gain,dye.g*shade[1]*gain,dye.b*shade[2]*gain);
    for(const p of verts){
      positions.push(...p);patches.push(slot);colors.push(light.r,light.g,light.b);
      const [x,y,z]=p;
      // The rush face has a fine crosswise rib. The edge core uses the same
      // neutral sample running horizontally in shallow compressed layers.
      if(slot===2)texcoords.push(y/.092+phase,z/.22);
      else if(slot===3)texcoords.push((y+x)/.16+phase,z/.18);
      else if(axis==='floor')texcoords.push(x/(slot===1?.060:.088)+phase,z/.134+phase*.37);
      else if(axis==='long')texcoords.push(x/.036+phase,(y+z)/.090);
      else texcoords.push(z/.052+phase,(y+x)/.090);
    }
  }
  const up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
  const topL=halfL-roll,topW=halfW-roll;
  const zs=(w)=>[-w,-halfW+binding,halfW-binding,w];
  const upper=zs(topW),full=zs(halfW),bottom=zs(halfW-foot);
  for(let i=0;i<3;i++){
    const patch=i===1?0:1;
    quad([-topL,thick,upper[i]],[-topL,thick,upper[i+1]],[topL,thick,upper[i+1]],[topL,thick,upper[i]],patch,'floor',up);
    for(const end of [-1,1]){
      const toward=new THREE.Vector3(end,0,0),x=end*halfL,xt=end*topL;
      quad([xt,thick,upper[i]],[xt,thick,upper[i+1]],[x,thick-lip,full[i+1]],[x,thick-lip,full[i]],patch,'end',toward);
      const shortType=i===1?2:1;
      quad([x,thick-lip,full[i]],[x,thick-lip,full[i+1]],[x,.009,full[i+1]],[x,.009,full[i]],shortType,'end',toward);
      quad([x,.009,full[i]],[x,.009,full[i+1]],[x,.003,full[i+1]],[x,.003,full[i]],i===1?3:1,'end',toward);
      quad([x,.003,full[i]],[x,.003,full[i+1]],[end*(halfL-foot),0,bottom[i+1]],[end*(halfL-foot),0,bottom[i]],3,'end',toward);
    }
  }
  for(const end of [-1,1]){
    const z=end*halfW,zt=end*topW,zb=end*(halfW-foot),toward=new THREE.Vector3(0,0,end);
    quad([-topL,thick,zt],[topL,thick,zt],[halfL,thick-lip,z],[-halfL,thick-lip,z],1,'long',toward);
    quad([-halfL,thick-lip,z],[halfL,thick-lip,z],[halfL,.004,z],[-halfL,.004,z],1,'long',toward);
    quad([-halfL,.004,z],[halfL,.004,z],[halfL-foot,0,zb],[-halfL+foot,0,zb],3,'long',toward);
  }
  quad([-halfL+foot,0,-halfW+foot],[halfL-foot,0,-halfW+foot],[halfL-foot,0,halfW-foot],[-halfL+foot,0,halfW-foot],3,'floor',down);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(texcoords,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('fabricPatch',new THREE.Float32BufferAttribute(patches,1));
  g.computeVertexNormals();g.computeBoundingBox();return g;
}

function buildSleepingRoom(k,parent){
  const x0=-9,z0=12.60,width=4.05,depth=3.50,base=.360;
  const room=new THREE.Group();room.name='Bedroom tatami';parent.add(room);
  const backing=k.box(room,x0+width/2,.342,z0+depth/2,width,.036,depth,'#857758');
  backing.name='Tatami fitted subfloor';
  // The brown deck closes all hairline joints while the tops stay exactly
  // level with the adjoining corridor and the two sliding-door thresholds.
  const layouts=[[0,0,2,1],[2,0,2,1],[0,1,1,2],[1,1,2,1],
    [3,1,1,2],[1,2,2,1],[0,3,2,1],[2,3,2,1]];
  const tones=[[1,.977,.925],[.98,1,.978],[.91,.971,.91],[1,.965,.915],
    [.90,.967,.895],[1,.993,.945],[.95,.983,.925],[1,.962,.91]];
  const mat=tatamiMaterial(),seam=.002;
  layouts.forEach(([col,row,cols,rows],i)=>{
    const w=cols*width/4,d=rows*depth/4,across=w>d;
    const pad=new THREE.Mesh(makeMat((across?w:d)-seam,(across?d:w)-seam,tones[i],i*.213),mat);
    pad.name='Tatami mat '+String(i+1).padStart(2,'0');pad.geometry.name=pad.name+' · pressed fibre and heri';
    pad.position.set(x0+(col+cols/2)*width/4,base,z0+(row+rows/2)*depth/4);
    pad.rotation.y=across?0:Math.PI/2;pad.receiveShadow=pad.castShadow=true;room.add(pad);
  });
}
