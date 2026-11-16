import {CROP_CATALOG} from './garden.js';

export const INITIAL_COINS=100;
export const ECONOMY_LIMIT=1_000_000_000;
const DAY=24*60*60*1000,MAX_RECEIPTS=2048,MAX_TRANSACTIONS=48;
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=ECONOMY_LIMIT;
const clone=structuredClone;
export function commerceError(message){return Object.assign(Error(message),{code:'HOME_COMMERCE'});}
const food=(id,label,subcategory,buyPrice,unit,gains,durationMs=22_000)=>({id:`food-${id}`,category:'food',subcategory,label,buyPrice,unit,gains,durationMs,usable:true});
export const ECONOMY_CATALOG=Object.freeze([
  ...CROP_CATALOG.map(crop=>({id:crop.id,category:'crop',cropId:crop.id,label:crop.label,unit:crop.yieldUnit,sellPrice:crop.sellPrice,usable:false})),
  ...CROP_CATALOG.map(crop=>({id:`seed-${crop.id}`,category:'seed',subcategory:'seed',cropId:crop.id,label:`${crop.label}种子包`,unit:'包',buyPrice:crop.seedPrice,free:crop.seedPrice===0,usable:false,plotsPerPack:1})),
  food('riceball','海苔饭团','meal',12,'个',{hunger:25,comfort:4},28_000),
  food('bento','日式便当','meal',28,'份',{hunger:50,comfort:10},40_000),
  food('milk','瓶装牛奶','drink',10,'瓶',{hunger:12,energy:5,comfort:5}),
  food('orange-juice','橙汁','drink',12,'瓶',{hunger:8,energy:3,comfort:10}),
  food('soda','波子汽水','drink',14,'瓶',{hunger:5,comfort:14}),
  food('coffee','罐装咖啡','drink',16,'罐',{energy:18,comfort:6}),
  food('senbei','酱油仙贝','snack',10,'包',{hunger:12,comfort:8}),
  food('dorayaki','铜锣烧','snack',16,'个',{hunger:20,comfort:12}),
  food('pudding','焦糖布丁','snack',18,'杯',{hunger:15,comfort:18}),
  food('chocolate','巧克力','snack',14,'块',{hunger:12,energy:8,comfort:10}),
  {id:'tea-sencha',category:'tea',label:'煎茶',unit:'壶',buyPrice:20,gains:{comfort:24,energy:5},durationMs:45_000,usable:false},
  {id:'tea-hojicha',category:'tea',label:'焙茶',unit:'壶',buyPrice:26,gains:{comfort:30,energy:8},durationMs:55_000,usable:false},
  {id:'tea-matcha',category:'tea',label:'抹茶与和菓子',unit:'份',buyPrice:36,gains:{comfort:36,hunger:15,energy:10},durationMs:65_000,usable:false}
].map(item=>Object.freeze({...item,...(item.gains?{gains:Object.freeze(item.gains)}:{})})));
const ITEMS=new Map(ECONOMY_CATALOG.map(item=>[item.id,item]));
export const economyItem=id=>ITEMS.get(id)??null;
export const economyCatalog=()=>({currency:'金币',initialCoins:INITIAL_COINS,items:clone(ECONOMY_CATALOG)});

export function createEconomy(garden){
  const stock={};
  for(const crop of CROP_CATALOG){const count=garden.plots.reduce((sum,plot)=>sum+(plot.harvestedByCrop[crop.id]??0),0);if(!integer(count))throw Error('Legacy crop quantity exceeds the inventory limit.');if(count)stock[crop.id]=count;}
  return{version:1,balance:INITIAL_COINS,stock,requests:[],transactions:[]};
}

export function quoteCommerce({kind,lines,seatId}={}){
  if(!['buy','sell','tea','consume'].includes(kind)||!Array.isArray(lines)||lines.length<1||lines.length>20)throw commerceError('请选择有效的交易和商品。');
  if(['tea','consume'].includes(kind)&&(lines.length!==1||lines[0]?.quantity!==1))throw commerceError('品茶或食用每次请选择一份。');
  if(kind!=='tea'&&seatId!==undefined&&seatId!==null)throw commerceError('只有品茶可以选择茶座。');
  if(kind==='tea'&&!['teahouse.cushion.front','teahouse.cushion.back',undefined,null].includes(seatId))throw commerceError('请选择茶房里的坐垫。');
  const ids=new Set(),rows=[];let total=0;
  for(const row of lines){
    if(!plain(row)||Object.keys(row).some(key=>!['itemId','quantity'].includes(key))||typeof row.itemId!=='string'||!integer(row.quantity)||row.quantity<1||row.quantity>(kind==='sell'?ECONOMY_LIMIT:99)||ids.has(row.itemId))throw commerceError('商品或数量无效，请重新选择。');
    const item=ITEMS.get(row.itemId);if(!item)throw commerceError('这件商品不在当前目录中。');ids.add(item.id);
    const allowed=kind==='buy'?['seed','food']:kind==='sell'?['crop']:kind==='tea'?['tea']:['food'];
    if(!allowed.includes(item.category))throw commerceError('这件物品不支持所选操作。');
    if(kind==='buy'&&item.free)throw commerceError('小葱种子无限免费，在空田中直接播种即可。');
    const unitPrice=kind==='sell'?item.sellPrice:kind==='consume'?0:item.buyPrice;
    total+=unitPrice*row.quantity;if(!integer(total))throw commerceError('本次交易金额过大，请减少数量。');
    rows.push({itemId:item.id,quantity:row.quantity,unitPrice});
  }
  rows.sort((a,b)=>a.itemId.localeCompare(b.itemId));
  return{version:1,kind,lines:rows,total,...(kind==='tea'?{seatId:seatId??'teahouse.cushion.front'}:{})};
}
export function normalizeQuote(raw){
  if(!plain(raw)||raw.version!==1)throw Error('Invalid saved commerce quote.');
  let expected;try{expected=quoteCommerce({kind:raw.kind,lines:raw.lines?.map(row=>({itemId:row.itemId,quantity:row.quantity})),seatId:raw.seatId});}catch{throw Error('Invalid saved commerce quote.');}
  if(JSON.stringify(raw)!==JSON.stringify(expected))throw Error('Invalid saved commerce prices.');
  return expected;
}
export const quoteFingerprint=quote=>JSON.stringify(quote);
export function requestStamp(requestId){
  if(typeof requestId!=='string'||!/^\d{1,16}:[A-Za-z0-9_-]{8,128}$/.test(requestId))throw commerceError('交易编号无效，请重新打开交易窗口。');
  const stamp=Number(requestId.slice(0,requestId.indexOf(':')));if(!Number.isSafeInteger(stamp))throw commerceError('交易编号无效。');return stamp;
}
export function existingCommerce(economy,requestId,fingerprint,now){
  const stamp=requestStamp(requestId),record=economy.requests.find(row=>row.requestId===requestId);
  if(record){if(record.fingerprint!==fingerprint)throw commerceError('同一笔交易不能更换商品，请重新提交。');return commerceReceipt(record,true);}
  if(stamp<now-DAY||stamp>now+5*60_000)throw commerceError('这份交易请求已过期，请重新打开交易窗口。');
  return null;
}
export function commerceReceipt(record,duplicate=false){return{ok:true,accepted:true,outcome:record.queued?'queued':'accepted',taskId:record.taskId,transactionId:record.transactionId,kind:record.kind,total:record.total,transactionStatus:record.status,...(duplicate?{duplicate:true}:{})};}

export function reservations(tasks){
  let coins=0;const stock={};
  for(const task of tasks.filter(Boolean)){
    const quote=task.commerce?.quote;
    if(quote){
      if(['buy','tea'].includes(quote.kind))coins+=quote.total;
      if(['sell','consume'].includes(quote.kind))for(const row of quote.lines)stock[row.itemId]=(stock[row.itemId]??0)+row.quantity;
    }
    if(task.seedItemId&&!task.legacySeedExempt)stock[task.seedItemId]=(stock[task.seedItemId]??0)+1;
  }
  return{coins,stock};
}
export function assertResources(economy,tasks){
  // Forecast in execution order: a queued sale can fund a later purchase, and
  // bought seeds can supply later sowing. Actual settlement validates again.
  let balance=economy.balance;const stock={...economy.stock};
  const use=(id,count)=>{if((stock[id]??0)<count)throw commerceError(`${ITEMS.get(id)?.label??'物品'}数量不足，请先购买或减少数量。`);stock[id]-=count;};
  for(const task of tasks.filter(Boolean)){
    const quote=task.commerce?.quote;
    if(quote){
      if(['buy','tea'].includes(quote.kind)){if(balance<quote.total)throw commerceError(`金币不足，这笔交易需要 ${quote.total} 金币。`);balance-=quote.total;}
      if(['sell','consume'].includes(quote.kind))for(const row of quote.lines)use(row.itemId,row.quantity);
      if(quote.kind==='sell')balance+=quote.total;
      if(quote.kind==='buy')for(const row of quote.lines){stock[row.itemId]=(stock[row.itemId]??0)+row.quantity;if(!integer(stock[row.itemId]))throw commerceError('库存数量超出限制，请减少数量。');}
      if(!integer(balance))throw commerceError('金币余额超出限制，请减少数量。');
    }
    if(task.seedItemId&&!task.legacySeedExempt)use(task.seedItemId,1);
  }
  return reservations(tasks);
}
export function economySnapshot(economy,tasks){
  const held=reservations(tasks),items=ECONOMY_CATALOG.filter(item=>item.category!=='tea'&&(economy.stock[item.id]??0)>0).map(item=>({id:item.id,category:item.category,...(item.cropId?{cropId:item.cropId}:{}),label:item.label,quantity:economy.stock[item.id],reserved:Math.min(economy.stock[item.id],held.stock[item.id]??0),available:Math.max(0,economy.stock[item.id]-(held.stock[item.id]??0)),unit:item.unit,usable:item.usable}));
  return{wallet:{balance:economy.balance,reserved:Math.min(economy.balance,held.coins),available:Math.max(0,economy.balance-held.coins)},inventory:{items,kindCount:items.length},transactions:clone(economy.transactions)};
}
export function acceptCommerce(economy,{requestId,quote,taskId,time,queued}){
  economy.requests=economy.requests.filter(row=>row.status==='pending'||row.acceptedAt>time-2*DAY);
  if(economy.requests.length>=MAX_RECEIPTS)throw commerceError('待核对的交易较多，请稍后再试。');
  const record={requestId,fingerprint:quoteFingerprint(quote),taskId,transactionId:`trade-${taskId.slice(5)}`,kind:quote.kind,total:quote.total,acceptedAt:time,queued:!!queued,status:'pending'};
  economy.requests.push(record);return commerceReceipt(record);
}
export function cancelCommerce(economy,task,time){
  if(!task.commerce)return;
  const record=economy.requests.find(row=>row.requestId===task.commerce.requestId);if(record?.status==='pending'){record.status='cancelled';record.settledAt=time;}
}
function changeStock(economy,id,delta){
  const count=(economy.stock[id]??0)+delta;if(!integer(count))throw commerceError('库存数量超出限制，本次操作没有完成。');
  if(count)economy.stock[id]=count;else delete economy.stock[id];
}
export function addHarvest(economy,cropId,quantity){changeStock(economy,cropId,quantity);}
export function useSeed(economy,task){if(task.seedItemId&&!task.legacySeedExempt)changeStock(economy,task.seedItemId,-1);}
export function settleCommerce(economy,task,time){
  const {quote,requestId}=task.commerce,record=economy.requests.find(row=>row.requestId===requestId);
  if(!record||record.taskId!==task.id||record.status!=='pending')throw commerceError('这笔交易已经结束，不能重复结算。');
  const delta=quote.kind==='sell'?quote.total:['buy','tea'].includes(quote.kind)?-quote.total:0;
  if(!integer(economy.balance+delta))throw commerceError('金币余额不足或超出限制，本次交易没有完成。');
  const next=clone(economy);
  if(['buy','sell','consume'].includes(quote.kind))for(const line of quote.lines)changeStock(next,line.itemId,line.quantity*(quote.kind==='buy'?1:-1));
  next.balance+=delta;
  const nextRecord=next.requests.find(row=>row.requestId===requestId);nextRecord.status='completed';nextRecord.settledAt=time;
  next.transactions.push({id:record.transactionId,taskId:task.id,kind:quote.kind,at:time,coinDelta:delta,total:quote.total,lines:quote.lines.map(row=>({itemId:row.itemId,label:ITEMS.get(row.itemId).label,quantity:row.quantity,unit:ITEMS.get(row.itemId).unit,unitPrice:row.unitPrice})),balance:next.balance});
  next.transactions=next.transactions.slice(-MAX_TRANSACTIONS);Object.assign(economy,next);
  return ['tea','consume'].includes(quote.kind)?clone(ITEMS.get(quote.lines[0].itemId).gains):{};
}

export function normalizeEconomy(raw,tasks,offset=0){
  if(!plain(raw)||raw.version!==1||!integer(raw.balance)||!plain(raw.stock)||!Array.isArray(raw.requests)||raw.requests.length>MAX_RECEIPTS||!Array.isArray(raw.transactions)||raw.transactions.length>MAX_TRANSACTIONS)throw Error('Invalid economy save.');
  const stock={};for(const [id,count] of Object.entries(raw.stock)){const item=ITEMS.get(id);if(!item||item.category==='tea'||item.free||!integer(count)||count===0)throw Error('Invalid inventory quantity.');stock[id]=count;}
  const ids=new Set(),taskIds=new Set();
  const requests=raw.requests.map(row=>{
    if(!plain(row))throw Error('Invalid transaction receipt.');try{requestStamp(row.requestId);}catch{throw Error('Invalid transaction identifier.');}
    if(ids.has(row.requestId)||taskIds.has(row.taskId)||typeof row.fingerprint!=='string'||row.fingerprint.length>3000||!/^task-\d+$/.test(row.taskId)||row.transactionId!==`trade-${row.taskId.slice(5)}`||!['buy','sell','tea','consume'].includes(row.kind)||!integer(row.total)||!Number.isFinite(row.acceptedAt)||typeof row.queued!=='boolean'||!['pending','completed','cancelled'].includes(row.status))throw Error('Invalid transaction receipt.');
    ids.add(row.requestId);taskIds.add(row.taskId);
    if(row.status!=='pending'&&!Number.isFinite(row.settledAt))throw Error('Invalid settlement clock.');
    return{requestId:row.requestId,fingerprint:row.fingerprint,taskId:row.taskId,transactionId:row.transactionId,kind:row.kind,total:row.total,acceptedAt:row.acceptedAt+offset,queued:row.queued,status:row.status,...(row.status!=='pending'?{settledAt:row.settledAt+offset}:{})};
  });
  for(const task of tasks.filter(Boolean))if(task.commerce){
    const record=requests.find(row=>row.requestId===task.commerce.requestId);
    if(task.source!=='manual'||!record||record.status!=='pending'||record.taskId!==task.id||record.fingerprint!==quoteFingerprint(task.commerce.quote)||record.kind!==task.commerce.quote.kind||record.total!==task.commerce.quote.total)throw Error('Saved commerce task has no matching reservation.');
  }
  for(const record of requests.filter(row=>row.status==='pending'))if(!tasks.some(task=>task?.id===record.taskId&&task.commerce?.requestId===record.requestId))throw Error('Orphaned saved transaction.');
  const historyIds=new Set(),transactions=raw.transactions.map(row=>{
    if(!plain(row)||!/^trade-\d+$/.test(row.id)||row.id!==`trade-${String(row.taskId).slice(5)}`||!['buy','sell','tea','consume'].includes(row.kind)||!Number.isFinite(row.at)||!Number.isSafeInteger(row.coinDelta)||Math.abs(row.coinDelta)>ECONOMY_LIMIT||!integer(row.total)||!integer(row.balance)||!Array.isArray(row.lines)||row.lines.length<1||row.lines.length>20)throw Error('Invalid transaction history.');
    if(historyIds.has(row.id))throw Error('Duplicate transaction history.');historyIds.add(row.id);
    const lines=row.lines.map(line=>{const item=ITEMS.get(line.itemId);if(!item||!integer(line.quantity)||line.quantity<1||!integer(line.unitPrice))throw Error('Invalid transaction history item.');return{itemId:item.id,label:item.label,quantity:line.quantity,unit:item.unit,unitPrice:line.unitPrice};});
    if(lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice,0)!==row.total||row.coinDelta!==(row.kind==='sell'?row.total:['buy','tea'].includes(row.kind)?-row.total:0))throw Error('Invalid historical transaction amount.');
    return{id:row.id,taskId:row.taskId,kind:row.kind,at:row.at+offset,coinDelta:row.coinDelta,total:row.total,lines,balance:row.balance};
  });
  const result={version:1,balance:raw.balance,stock,requests,transactions};try{assertResources(result,tasks);}catch{throw Error('Invalid saved resource reservations.');}return result;
}
