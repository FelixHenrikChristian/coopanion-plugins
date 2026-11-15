import {footprints} from './navigation-footprints.js';
import {inventory} from './navigation-inventory.js';
import {navigation} from './navigation-graph.js';

// Coordinates are world metres, +Y up; +Z points away from the residential street.
// This module is deliberately independent of Three.js and browser globals.
const rect=(id,x0,z0,x1,z1,y)=>({id,polygon:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y});
const walkable=[
  rect('entry-landing',-.245,7.67,2.185,8.30,.314),
  rect('entry-step',.185,7.502,1.775,7.698,.2515),
  rect('genkan-low',-1.1,8.30,3,10.09,.327),
  rect('living-dining',-9,8.30,-1.1,11.45,.41),
  rect('genkan-upper',-1.1,10.09,3,11.45,.41),
  rect('corridor',-9,11.45,3,12.60,.41),
  rect('bedroom',-9,12.60,-4.95,16.1,.41),
  rect('kitchen',-4.95,12.60,-1.1,16.1,.41),
  rect('study',-1.1,12.60,1,16.1,.41),
  rect('bathroom',1,12.60,3,16.1,.41),
  rect('engawa',-8.52,16.1,-1.98,17.0225,.414),
  rect('sidewalk',.17,6.85,9.4,7.25,.18),
  rect('front-yard',.17,7.25,12.7,8.3,.16),
  rect('allotment',3,8.3,12.7,16.5,.16)
];
const adjusted={
  'living.sofa':[-7.8,.41,10.95],
  'bedroom.window':[-6.7,.41,15.6],
  'kitchen.fridge':[-2.25,.41,15.03],
  'corridor.ficus':[-8.10,.41,11.72],
  'engawa.chair':[-7,.414,16.54],
  'engawa.plant':[-3.28,.414,16.53]
};
const labels={sit:'坐下',nap:'小睡',tv:'看电视',phone:'看手机',rest:'休息',drink:'饮水',read:'阅读',
inspect:'查看',toggle:'开关',sleep:'睡觉',dress:'整理穿着',open:'打开',look:'观赏',eat:'用餐',tea:'沏茶',
snack:'吃点心',wash:'清洗',cook:'做饭',heat:'加热',wear:'换拖鞋',take:'取用',store:'收纳',laundry:'洗衣',
water:'浇水',desk:'看电脑',draw:'绘画',type:'打字',shower:'淋浴',bath:'泡澡',brush:'刷牙',toilet:'如厕'};
const itemLabels={
  'living.tv':{toggle:'开关电视'},'bedroom.bedside':{toggle:'开关纸灯'},
  'study.laptop':{desk:'看电脑',type:'键盘打字',toggle:'开关电脑'},
  'living.coffeeTable':{drink:'喝茶'},
  'bedroom.wardrobe':{dress:'整理衣装',open:'整理衣柜'},'kitchen.fridge':{open:'查看冰箱'},
  'genkan.shoe':{dress:'整理鞋履',open:'整理鞋柜'},'genkan.umbrella':{take:'取伞',store:'收伞'},
  'genkan.washer':{open:'检查洗衣机'},'living.console':{inspect:'看看柜上小物'},
  'living.shelf':{read:'翻阅杂志'},'living.water':{drink:'接水饮用'},'bedroom.window':{look:'赏花',rest:'窗边休息'},
  'dining.teaCabinet':{inspect:'看看茶具'},'kitchen.sink':{wash:'洗杯子',drink:'接水饮用'},
  'kitchen.stove':{heat:'热饭'},'kitchen.pantry':{inspect:'查看食材'},
  'kitchen.prepCart':{inspect:'看看备餐台',cook:'准备食材'},'corridor.gallery':{look:'欣赏挂画'},
  'corridor.ficus':{look:'看看绿植'},'bathroom.sink':{wash:'洗手'},'engawa.plant':{look:'赏花'}
};
const byId=new Map(inventory.map(i=>[i.id,i]));
// The Figure protocol has a body bound, not a universal hip bone. Rest its
// lower visible bound just above each real support; never subtract guessed legs.
// These are display placements, separate from the walkable approach points.
const seats={
  'living.sofa':{anchor:[-8.33,.889,10.06],clearance:.045,facing:[1,0]},
  'living.rug':{anchor:[-6.50,.434,10.13],clearance:.025,facing:[-1,0]},
  'dining.dining':{anchor:[-2.838,.921,10.448],clearance:.045,facing:[0,-1]},
  'study.desk':{anchor:[.016,.921,14.945],clearance:.045,facing:[0,1]},
  'bathroom.toilet':{anchor:[1.46,.886,13.57],clearance:.035,facing:[1,0]},
  'engawa.chair':{anchor:[-7.73,.6525,16.552],clearance:.035,facing:[0,1]}
};
const approach=i=>[...(adjusted[i.id]??i.approach)];
function facing(from,target){
  const dx=target[0]-from[0],dz=target[2]-from[2],d=Math.hypot(dx,dz);
  return d>1e-6?[dx/d,dz/d]:[0,1];
}
function actionSlot(item,id){
  let station=item;
  if(item.id==='living.tv'&&id==='tv')station=byId.get('living.sofa');
  if(item.id==='study.laptop'&&['desk','type'].includes(id))station=byId.get('study.desk');
  if(item.id==='living.coffeeTable')station=byId.get('living.rug');
  const position=approach(station),target=[...item.anchor];let face=facing(position,target);
  let kind='standing',anchorKind='feet',anchor=[...position],feet=[...position],support=null;
  if(station.id==='bedroom.bed'){
    kind='lying';anchorKind='support';anchor=[-7.93,1.067,14.71];support={position:[...anchor],clearance:.05};
  }else if(station.id==='bathroom.shower'){
    kind=id==='bath'?'seated':'standing';anchorKind='support';anchor=[2.05,.8835,15.42];support={position:[...anchor],clearance:.035};
  }else if(seats[station.id]){
    const seat=seats[station.id];kind='seated';anchorKind='support';anchor=[...seat.anchor];
    support={position:[...anchor],clearance:seat.clearance};face=[...seat.facing];
  }
  if(support)feet=[anchor[0],anchor[1]+support.clearance,anchor[2]];
  return {id,label:itemLabels[item.id]?.[id]??labels[id]??id,slotId:item.id+':'+id,
    ...(item.room==='garden'?{canonicalId:({'查看':'inspect','浇水':'water','采收':'harvest','播种':'sow'})[id]}:{}),
    stance:{position,facing:face},target,
    occupancyGroup:station.id,pose:{kind,position:feet,anchor,anchorKind,referenceHeight:1.25,...(support?{support}: {})},
    fallback:{kind:'standing',position:[...position],facing:[...face]}
  };
}
const items=inventory.map(item=>({id:item.id,room:item.room,label:item.label,position:approach(item),
  actions:(item.room==='garden'?[...item.actions,'播种']:item.actions).map(id=>actionSlot(item,id)),...(item.cropId?{cropId:item.cropId,plotId:item.plotId}:{})}));
const layout={schemaVersion:1,layoutVersion:1,units:'metres',upAxis:'y',
  defaultFurnitureState:{'living.tv':{on:true},'study.laptop':{on:true},'bedroom.bedside':{on:true},'genkan.washer':{on:true,active:false}},
  spawn:[.95,.327,9.45],bounds:{minX:-9.2,maxX:12.8,minZ:6.85,maxZ:17.1},
  agent:{radius:.18,clearance:.02,height:1.55,maxStep:.14},
  cellSize:.05,gridOrigin:[.02,0],walkable,blockers:[...footprints,
    {id:'entry-mailbox',minX:2.04,maxX:2.44,minZ:7.47,maxZ:7.60},
    {id:'entry-wall-lamp',minX:2.535,maxX:2.765,minZ:7.448,maxZ:7.659},
    {id:'residential-street-pole',circle:{x:4.24,z:6.80,radius:.185}},
    {id:'parked-garden-gate',minX:9.295,maxX:10.205,minZ:7.723,maxZ:7.765},
    {id:'garden-hydrangea-west',circle:{x:7.78,z:7.88,radius:.2321}},
    {id:'garden-hydrangea-east',circle:{x:9.61,z:7.91,radius:.2011}}
  ],items,navigation};
export function getNavigationData(){return structuredClone(layout);}
export function getActionSlots(id){return structuredClone(items.find(i=>i.id===id)?.actions??[]);}
