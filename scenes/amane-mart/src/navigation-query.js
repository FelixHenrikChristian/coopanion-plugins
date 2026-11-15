// Pure geometry queries shared by the scene, navigation compiler and host tests.
export function createNavigationQuery(layout) {
  const radius=layout.agent.radius+layout.agent.clearance;
  const bins=new Map(),cell=.5,key=(x,z)=>x+','+z;
  for(const b of layout.blockers){
    const c=b.circle,loX=c?c.x-c.radius:b.minX,hiX=c?c.x+c.radius:b.maxX;
    const loZ=c?c.z-c.radius:b.minZ,hiZ=c?c.z+c.radius:b.maxZ;
    for(let x=Math.floor(loX/cell);x<=Math.floor(hiX/cell);x++)for(let z=Math.floor(loZ/cell);z<=Math.floor(hiZ/cell);z++){
      const id=key(x,z);if(!bins.has(id))bins.set(id,[]);bins.get(id).push(b);
    }
  }
  function inside(x,z,polygon){
    let yes=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [ax,az]=polygon[i],[bx,bz]=polygon[j];
      const cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
      if(Math.abs(cross)<1e-8&&x>=Math.min(ax,bx)-1e-8&&x<=Math.max(ax,bx)+1e-8&&z>=Math.min(az,bz)-1e-8&&z<=Math.max(az,bz)+1e-8)return true;
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)yes=!yes;
    }
    return yes;
  }
  function surfaceAt(x,z){
    // Earlier regions override underlying courtyard paving (stairs and floor levels).
    return layout.walkable.find(s=>inside(x,z,s.polygon))??null;
  }
  function isWalkable(x,z,r=radius){
    if(!Number.isFinite(x)||!Number.isFinite(z)||!surfaceAt(x,z))return false;
    for(let i=0;i<16;i++){const a=i*Math.PI/8;if(!surfaceAt(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;}
    const visited=new Set();
    for(let ix=Math.floor((x-r)/cell);ix<=Math.floor((x+r)/cell);ix++)for(let iz=Math.floor((z-r)/cell);iz<=Math.floor((z+r)/cell);iz++){
      for(const b of bins.get(key(ix,iz))??[]){
        if(visited.has(b))continue;visited.add(b);
        if(b.circle){if(Math.hypot(x-b.circle.x,z-b.circle.z)<r+b.circle.radius-1e-7)return false;}
        else if(Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ))<r-1e-7)return false;
      }
    }
    return true;
  }
  function locate(point){
    const x=point?.[0],z=point?.[2];
    if(!isWalkable(x,z))return null;
    const s=surfaceAt(x,z);return {position:[x,s.y,z],surfaceId:s.id};
  }
  function segmentWalkable(a,b){
    const dx=b[0]-a[0],dz=b[2]-a[2],length2=dx*dx+dz*dz;
    const pointDistance=(x,z)=>{
      const t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/length2)):0;
      return Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);
    };
    // Exact capsule-versus-solid rejection protects even a tangent corner that
    // could lie between floor-height samples. Keep floor sampling for steps.
    for(const solid of layout.blockers){
      if(solid.circle){
        const c=solid.circle;if(pointDistance(c.x,c.z)<radius+c.radius-1e-7)return false;
      }else{
        const {minX,maxX,minZ,maxZ}=solid;
        if(Math.max(a[0],b[0])+radius<minX||Math.min(a[0],b[0])-radius>maxX||Math.max(a[2],b[2])+radius<minZ||Math.min(a[2],b[2])-radius>maxZ)continue;
        let t0=0,t1=1;
        for(const [origin,delta,lo,hi] of [[a[0],dx,minX,maxX],[a[2],dz,minZ,maxZ]]){
          if(Math.abs(delta)<1e-12){if(origin<lo||origin>hi){t0=2;break;}}
          else{const u=(lo-origin)/delta,v=(hi-origin)/delta;t0=Math.max(t0,Math.min(u,v));t1=Math.min(t1,Math.max(u,v));}
        }
        if(t0<=t1)return false;
        const distance=Math.min(...[a,b].map(p=>Math.hypot(Math.max(minX-p[0],0,p[0]-maxX),Math.max(minZ-p[2],0,p[2]-maxZ))),
          pointDistance(minX,minZ),pointDistance(minX,maxZ),pointDistance(maxX,minZ),pointDistance(maxX,maxZ));
        if(distance<radius-1e-7)return false;
      }
    }
    const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.025));
    let previous=null;
    for(let i=0;i<=n;i++){
      const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;
      if(!isWalkable(x,z))return false;
      const y=surfaceAt(x,z).y;
      if(previous!==null&&Math.abs(y-previous)>layout.agent.maxStep+1e-6)return false;
      previous=y;
    }
    return true;
  }
  return Object.freeze({surfaceAt,isWalkable,locate,segmentWalkable});
}
