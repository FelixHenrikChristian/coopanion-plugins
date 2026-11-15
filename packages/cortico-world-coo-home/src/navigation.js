import {createNavigationQuery} from '../data/navigation-query.js';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const key=p=>p.map(v=>Math.round(v*1e5)).join(',');

/** A fixed, precompiled scene graph; background activities never scan geometry. */
export class HomeNavigation{
  constructor(layout){
    if(!layout||!Array.isArray(layout.items)||!Array.isArray(layout.navigation?.nodes)||!Array.isArray(layout.navigation?.edges))throw Error('Home navigation data is unavailable.');
    this.layout=layout;this.query=createNavigationQuery(layout);this.nodes=layout.navigation.nodes;
    if(this.nodes.length>256)throw Error('Home navigation graph exceeds its limit.');
    this.indices=new Map(this.nodes.map((n,i)=>[n.id,i]));this.exact=new Map(this.nodes.map((n,i)=>[key(n.position),i]));this.links=new Map();this.segments=new Map();
    const n=this.nodes.length;this.cost=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));this.next=Array.from({length:n},()=>Array(n).fill(-1));
    for(const edge of layout.navigation.edges){
      const a=this.indices.get(edge.from),b=this.indices.get(edge.to);if(a===undefined||b===undefined)throw Error('Invalid home navigation edge.');
      const cost=distance(this.nodes[a].position,this.nodes[b].position);this.cost[a][b]=this.cost[b][a]=cost;this.next[a][b]=b;this.next[b][a]=a;
      const segment=this.heightProfile(this.nodes[a].position,this.nodes[b].position);this.segments.set(`${a}:${b}`,segment);this.segments.set(`${b}:${a}`,segment.toReversed());
    }
    for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(this.cost[i][k]+this.cost[k][j]<this.cost[i][j]){this.cost[i][j]=this.cost[i][k]+this.cost[k][j];this.next[i][j]=this.next[i][k];}
    for(const point of [layout.spawn,...layout.items.flatMap(item=>[item.position,...item.actions.map(a=>a.stance?.position).filter(Boolean)])])this.prepare(point);
  }
  ground(value){
    if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw Error('请选择可以行走的地面。');
    return this.query.locate(value)?.position??null;
  }
  visible(a,b){return this.query.segmentWalkable(a,b);}
  heightProfile(a,b){
    const points=[[...a]],steps=Math.max(1,Math.ceil(distance(a,b)/.025));let previous=[...a];
    for(let i=1;i<=steps;i++){
      const t=i/steps,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=this.query.surfaceAt(x,z)?.y??b[1],point=[x,y,z];
      if(Math.abs(y-previous[1])>1e-6){points.push(previous,point);}previous=point;
    }
    points.push([...b]);return points.filter((p,i)=>!i||distance(p,points[i-1])>1e-8||p[1]!==points[i-1][1]);
  }
  prepare(position){
    const positionKey=key(position);if(this.links.has(positionKey))return this.links.get(positionKey);
    const at=this.exact.get(positionKey);if(at!==undefined){const result=[{index:at,cost:0,points:[[...position]]}];this.links.set(positionKey,result);return result;}
    const result=[];
    for(const candidate of this.nodes.map((node,index)=>({node,index,cost:distance(position,node.position)})).sort((a,b)=>a.cost-b.cost)){
      if(this.visible(position,candidate.node.position))result.push({index:candidate.index,cost:candidate.cost,points:this.heightProfile(position,candidate.node.position)});if(result.length===6)break;
    }
    this.links.set(positionKey,result);return result;
  }
  preparedRoute(from,to){
    const starts=this.links.get(key(from)),goals=this.links.get(key(to));if(!starts?.length||!goals?.length)throw Error('这里没有已准备的可通行路线。');
    let best=null,bestCost=Infinity;
    for(const start of starts)for(const goal of goals){const cost=start.cost+this.cost[start.index][goal.index]+goal.cost;if(cost<bestCost){best={start,goal};bestCost=cost;}}
    if(!best)throw Error('这里没有可通行的路线。');
    const points=[...best.start.points];let at=best.start.index,steps=0;
    while(at!==best.goal.index&&steps++<this.nodes.length){const next=this.next[at][best.goal.index];if(next<0)throw Error('这里没有可通行的路线。');points.push(...this.segments.get(`${at}:${next}`));at=next;}
    points.push(...best.goal.points.toReversed());const unique=points.filter((p,i)=>!i||distance(p,points[i-1])>1e-8||p[1]!==points[i-1][1]);
    return{points:unique.map(p=>[...p]),distance:bestCost};
  }
  route(from,to){
    const start=this.ground(from),goal=this.ground(to);if(!start||!goal)throw Error('这里没有可通行的路线。');
    this.prepare(start);this.prepare(goal);
    if(this.visible(start,goal))return{points:this.heightProfile(start,goal),distance:distance(start,goal)};
    return this.preparedRoute(start,goal);
  }
}

export function timedRoute(route,start,speed=1.05){
  let time=start;return route.points.map((position,i)=>{
    if(i)time+=distance(route.points[i-1],position)/speed*1000;
    return{position:[...position],at:Math.round(time)};
  });
}

export function routePosition(route,time){
  if(!route?.length)return null;
  for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i];if(time>b.at)continue;
    const ratio=Math.max(0,Math.min(1,(time-a.at)/Math.max(1,b.at-a.at)));
    return a.position.map((v,j)=>v+(b.position[j]-v)*ratio);
  }
  return [...route.at(-1).position];
}
