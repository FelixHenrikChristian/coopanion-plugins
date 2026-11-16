// Semantic stations measured from the approved shops. No renderer or host imports.
export const commerceInventory=[
  {id:'shop.entrance',room:'shop',building:'shop',label:'雨音便利店',actions:['visit','shop','sell'],anchor:[.525,1.45,.62],approach:[.525,.339,-.15]},
  {id:'shop.counter',room:'shop',building:'shop',label:'便利店收银台',actions:['buy','sell','visit'],anchor:[1.31,1.265,-1.78],approach:[.54,.339,-1.78]},
  {id:'shop.snacks',room:'shop',building:'shop',label:'零食与点心货架',actions:['shop'],anchor:[-2.77,1.22,-1.08],approach:[-2.65,.339,-1.75]},
  {id:'shop.drinks',room:'shop',building:'shop',label:'冷藏饮料柜',actions:['shop'],anchor:[.52,1.48,-4.03],approach:[.22,.339,-3.34]},
  {id:'teahouse.menu',room:'teahouse',building:'teahouse',label:'灯乃庭茶房',actions:['orderTea','visit'],anchor:[-8.94,1.256,-.09],approach:[-7.34,.5235,-.34]},
  {id:'teahouse.cushion.front',room:'teahouse',building:'teahouse',label:'茶房窗边坐垫',actions:['sit','orderTea'],anchor:[-7.64,.6175,-1.06],approach:[-7.39,.5235,-.76]},
  {id:'teahouse.cushion.back',room:'teahouse',building:'teahouse',label:'茶房里侧坐垫',actions:['sit','orderTea'],anchor:[-7.64,.6175,-2.33],approach:[-7.53,.5235,-2.79]}
];
export function registerCommerceItem(register,id,object){
  const item=commerceInventory.find(item=>item.id===id);if(!item)throw Error('Unknown commerce station');
  object.userData.preserveBatch=true;object.name=id;
  register?.({...structuredClone(item),object});return object;
}
const rect=(id,x0,z0,x1,z1,y,extra={})=>({id,polygon:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y,...extra});
export const commerceWalkable=[
  rect('shop-floor',-4.88,-4.62,2.08,.55,.339),
  rect('shop-threshold',-.34,.515,1.39,.735,.3725,{maxStep:.20}),
  rect('shop-doormat',-.24,.735,1.30,1.26,.211),
  rect('tea-upper-step',-7.795,.65,-6.745,1.045,.4775,{maxStep:.16}),
  rect('tea-stone-step',-7.795,1.045,-6.745,1.395,.3335,{maxStep:.16}),
  rect('tea-floor',-10.05,-3.95,-6.62,.735,.5235),
  rect('crossing-north-ramp',-3,1.98,.60,2.55,.18,{ramp:{axis:1,start:1.98,end:2.55,from:.18,to:.037}}),
  rect('crossing-south-ramp',-2.85,6.15,.40,6.80,.035,{ramp:{axis:1,start:6.15,end:6.80,from:.035,to:.18}}),
  rect('marked-crossing',-2.85,2.55,.40,6.15,.023),
  rect('shops-front-pavement',-10.34,.735,2.85,2.55,.18),
  rect('home-crossing-pavement',-2.85,6.80,1.94,7.25,.18)
];
const solid=(id,minX,minZ,maxX,maxZ)=>({id,minX,minZ,maxX,maxZ});
export const commerceBlockers=[
  solid('shop-back-wall',-5.02,-4.78,2.23,-4.62),solid('shop-west-wall',-5.02,-4.78,-4.87,.62),
  solid('shop-east-glazing',2.075,-4.78,2.23,.62),
  solid('shop-front-west',-5.02,.49,-.34,.64),solid('shop-front-east',1.39,.49,2.23,.64),
  solid('shop-refrigerators',-4.815,-4.62,1.835,-3.72),
  solid('shop-aisle-front',-4.095,-1.40,-1.445,-.73),solid('shop-aisle-middle',-2.45,-2.79,-.41,-2.10),
  solid('shop-aisle-west',-4.88,-3.805,-4.22,-.955),solid('shop-magazines',-4.84,-.32,-3.56,.45),
  solid('shop-bread-case',-1.445,-.31,-.635,.25),solid('shop-checkout',.89,-2.95,1.74,-1.05),
  solid('tea-back-wall',-10.16,-4.08,-6.51,-3.94),solid('tea-west-wall',-10.16,-4.08,-10.04,.80),
  solid('tea-east-wall',-6.63,-4.08,-6.51,.80),solid('tea-front-counter-wall',-10.16,.665,-7.715,.81),
  solid('tea-front-east-wall',-6.927,.665,-6.51,.81),solid('tea-counter',-10.0,-.40,-7.90,.24),
  solid('tea-storage',-9.94,-2.33,-8.32,-1.94),solid('tea-low-table',-8.16,-2.10,-7.12,-1.32),
  solid('shop-vending-machine',-4.97,.64,-3.73,1.61),
  // Follow the angled bicycle's narrow rear wheel, not the basket's full width
  // over its entire length: the real passage between its rear and rail is open.
  solid('shop-bicycle-rear',-3.52,1.63,-2.90,1.82),solid('shop-bicycle-frame',-2.90,1.65,-2.36,1.94),
  solid('shop-bicycle-front',-2.36,1.70,-1.55,2.10),
  solid('shop-front-rail',-4.76,2.32,-3.38,2.43),
  {id:'tea-gas-lamp',circle:{x:-8.30,z:1.77,radius:.12}},
  {id:'tea-pole',circle:{x:-10.18,z:1.47,radius:.151}},
  {id:'tea-basin',circle:{x:-9.93,z:1.13,radius:.24}},
  {id:'tea-entry-plant',circle:{x:-6.67,z:1.33,radius:.20}}
];
export function buildingAt(position){
  if(!position)return null;const [x,,z]=position;
  if(x>=-5.03&&x<=2.25&&z>=-4.80&&z<=.80)return 'shop';
  if(x>=-10.2&&x<=-6.50&&z>=-4.10&&z<=1.04)return 'teahouse';
  if(x>=-9.2&&x<=3.2&&z>=7.65&&z<=17.05)return 'home';
  return null;
}
