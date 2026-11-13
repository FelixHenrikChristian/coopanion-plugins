import * as THREE from 'three';

function proofSheet(variant) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=336;
  const c=canvas.getContext('2d');
  c.fillStyle='#eee4c9';c.fillRect(0,0,256,336);
  c.save();c.beginPath();c.rect(16,17,224,273);c.clip();
  c.fillStyle=['#536e88','#dba18a','#91aba2'][variant];c.fillRect(16,17,224,273);
  c.fillStyle=['#e1bd88','#f2d9ac','#f3dfb4'][variant];
  c.beginPath();c.arc(variant===1?84:180,variant===2?93:85,31,0,Math.PI*2);c.fill();
  if(variant===2){
    c.strokeStyle='#574e48';c.lineWidth=7;c.beginPath();c.moveTo(12,282);c.bezierCurveTo(89,239,87,137,186,99);c.stroke();
    for(let i=0;i<12;i++){
      const x=69+i*9,y=230-i*11;
      c.fillStyle=i%3?'#406a61':'#587f6a';
      c.beginPath();c.ellipse(x+(i%2?13:-11),y,20,7,i%2?-.6:.65,0,Math.PI*2);c.fill();
    }
  }else{
    c.fillStyle=variant?'#716e7a':'#394e67';
    c.beginPath();c.moveTo(10,200);c.lineTo(71,157);c.lineTo(119,186);c.lineTo(174,146);c.lineTo(248,183);c.lineTo(248,295);c.lineTo(10,295);c.fill();
    for(let i=0;i<6;i++){
      const x=8+i*42,y=202+Math.cos(i*1.4)*13;
      c.fillStyle=variant?'#485e69':'#31475b';c.fillRect(x,y,40,94);
      c.fillStyle='#e4c390';c.fillRect(x+8,y+12,6,12);c.fillRect(x+20,y+12,6,12);
      c.fillStyle='#243d50';c.fillRect(x-3,y-3,46,6);
    }
    c.lineWidth=2;c.strokeStyle='#c8d3c6';
    for(let i=0;i<27;i++){const x=(i*43)%236,y=(i*29)%196;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+13);c.stroke();}
  }
  c.restore();
  c.fillStyle='#756957';c.font='14px "Yu Mincho",serif';c.fillText(['夕立','灯る窓','青葉'][variant],18,317);
  c.fillStyle='#ab5e4c';c.fillRect(216,300,15,16);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  // Soft reflected light from the desk and the paper window lifts the inks
  // on this east-facing partition; preserve the colour of the printed sheet.
  return new THREE.MeshStandardMaterial({map,roughness:.98,metalness:0,emissive:'#ffe2b1',emissiveMap:map,emissiveIntensity:.24});
}

export function dressStudyWalls(k,rear,west) {
  // Two open shoji leaves flank the desk window. The glass centre still looks
  // into the rain; all rails and lights stay with the wall during cutaways.
  k.box(rear,1.032,2.655,-.114,1.99,.073,.128,'#846246');
  k.box(rear,1.032,.853,-.153,1.99,.058,.246,'#ad875e');
  for(const x of [.386,1.685]){
    k.box(rear,x,1.751,-.114,.457,1.716,.029,'#decdb0',{emissive:'#ecc998',intensity:.29});
    for(const dx of [-.225,.225])k.box(rear,x+dx,1.751,-.151,.033,1.739,.049,'#967356');
    k.box(rear,x,1.751,-.151,.018,1.739,.034,'#b1926d');
    for(const y of [.91,1.261,1.611,1.961,2.31,2.597])k.box(rear,x,y,-.153,.454,.022,.043,'#a27e5c');
  }
  // The west partition's negative local Z faces the study (+world X).
  k.box(west,1.75,1.736,-.054,3.494,2.524,.010,'#d5bfa0',{roughness:.97,emissive:'#d4ac7b',intensity:.12});
  k.box(west,1.75,.489,-.071,3.494,.109,.030,'#a88662');
  k.box(west,1.86,2.266,-.093,2.56,.083,.09,'#815f47');
  const cord=[];
  for(let i=0;i<=10;i++){
    const t=i/10;
    cord.push([.63+2.46*t,2.237-.105*4*t*(1-t),-.164]);
  }
  k.line(west,cord,'#bc9869',.006);
  for(let i=0;i<3;i++){
    const x=1.04+i*.79,t=(x-.63)/2.46;
    const y=2.237-.105*4*t*(1-t);
    const print=new THREE.Group();print.position.set(x,y-.302,-.147);print.rotation.z=[-.025,.018,-.035][i];west.add(print);
    k.box(print,0,0,0,.43,.585,.017,'#e0cfad');
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.423,.577),proofSheet(i));
    face.position.z=-.010;face.rotation.y=Math.PI;print.add(face);
    for(const dx of [-.131,.131])k.box(print,dx,.285,-.026,.032,.078,.037,'#a6825c');
  }
}
