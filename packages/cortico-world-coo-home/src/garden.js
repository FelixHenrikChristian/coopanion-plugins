// Household-only planting state. No money, decay, model calls or figure data.
export const CROP_MINUTES=Object.freeze({'spring-onion':30,daikon:45,carrot:45,cabbage:60,cucumber:60,tomato:75,eggplant:75,pepper:90});
const STAGES=new Set(['empty','seeded','seedling','growing','ripe']);
const MUTATIONS=new Set(['sow','water','harvest']);
const WET_MS=30*60_000,MAX_EVENTS=64;
const clone=structuredClone,finite=Number.isFinite,integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=1e9;
const cropDuration=id=>CROP_MINUTES[id]*60_000;
const stageError=message=>{const error=Error(message);error.code='GARDEN_STAGE';return error;};
const knownPlots=layout=>{
  const plots=layout.items.filter(item=>item.id.startsWith('plot-'));
  if(plots.length!==8||plots.some(item=>!CROP_MINUTES[item.cropId]))throw Error('Garden crop layout is unavailable.');
  return plots;
};

export function createGarden(layout){
  return{plots:knownPlots(layout).map(item=>({id:item.id,cropId:item.cropId,stage:'ripe',cycle:0,harvests:0,plantedAt:null,wateredAt:null,growthStartedAt:null,readyAt:null,lastHarvestAt:null})),events:[],nextCareAt:0};
}

export function normalizeGarden(raw,layout,offset=0){
  if(!raw||!Array.isArray(raw.plots)||raw.plots.length!==8||!Array.isArray(raw.events)||!finite(raw.nextCareAt))throw Error('Invalid garden save.');
  const ids=new Set(raw.plots.map(plot=>plot?.id));if(ids.size!==8)throw Error('Duplicate garden plots.');
  const stamp=value=>value===null?null:finite(value)?value+offset:(()=>{throw Error('Invalid garden clock.');})();
  const plots=knownPlots(layout).map(item=>{
    const source=raw.plots.find(plot=>plot.id===item.id);
    if(!source||source.cropId!==item.cropId||!STAGES.has(source.stage)||!integer(source.cycle)||!integer(source.harvests)||source.harvests>source.cycle+1)throw Error('Invalid garden crop state.');
    if(source.harvests!==(source.stage==='empty'?source.cycle+1:source.cycle))throw Error('Invalid garden harvest count.');
    const plot={id:item.id,cropId:item.cropId,stage:source.stage,cycle:source.cycle,harvests:source.harvests};
    for(const key of ['plantedAt','wateredAt','growthStartedAt','readyAt','lastHarvestAt'])plot[key]=stamp(source[key]??null);
    if(plot.stage==='empty'&&['plantedAt','wateredAt','growthStartedAt','readyAt'].some(key=>plot[key]!==null))throw Error('Invalid empty plot.');
    if(plot.stage==='seeded'&&(plot.cycle===0||plot.plantedAt===null||plot.growthStartedAt!==null||plot.wateredAt!==null||plot.readyAt!==null))throw Error('Invalid unwatered plot.');
    const growing=['seedling','growing'].includes(plot.stage),initial=plot.stage==='ripe'&&plot.cycle===0&&plot.growthStartedAt===null;
    if(growing||(plot.stage==='ripe'&&!initial)){
      if(['plantedAt','wateredAt','growthStartedAt','readyAt'].some(key=>plot[key]===null)||plot.growthStartedAt<plot.plantedAt||plot.wateredAt<plot.growthStartedAt||Math.abs(plot.readyAt-plot.growthStartedAt-cropDuration(plot.cropId))>1)throw Error('Invalid growing plot clock.');
    }
    return plot;
  });
  const eventIds=new Set(),events=[];
  for(const value of raw.events.slice(-MAX_EVENTS)){
    const plot=plots.find(plot=>plot.id===value?.plotId);
    if(!plot||!['ripe','harvest'].includes(value.kind)||!integer(value.cycle)||value.cycle>plot.cycle||!finite(value.at))throw Error('Invalid garden event.');
    const id=`garden:${plot.id}:${value.cycle}:${value.kind}`;
    if(value.id!==id||eventIds.has(id))throw Error('Invalid garden event identifier.');
    eventIds.add(id);events.push({id,kind:value.kind,plotId:plot.id,cropId:plot.cropId,cycle:value.cycle,at:value.at+offset});
  }
  return{plots,events,nextCareAt:raw.nextCareAt===0?0:raw.nextCareAt+offset};
}

function emit(garden,plot,kind,time){
  const id=`garden:${plot.id}:${plot.cycle}:${kind}`;if(garden.events.some(event=>event.id===id))return;
  garden.events.push({id,kind,plotId:plot.id,cropId:plot.cropId,cycle:plot.cycle,at:time});garden.events=garden.events.slice(-MAX_EVENTS);
}

export function advanceGarden(garden,time){
  for(const plot of garden.plots){
    if(!['seedling','growing'].includes(plot.stage))continue;
    if(time>=plot.readyAt){plot.stage='ripe';emit(garden,plot,'ripe',plot.readyAt);}
    else plot.stage=(time-plot.growthStartedAt)/cropDuration(plot.cropId)<.35?'seedling':'growing';
  }
}

export function gardenSnapshot(garden,time){
  const plots=garden.plots.map(plot=>{
    const durationMs=cropDuration(plot.cropId),growing=['seedling','growing'].includes(plot.stage);
    const growth=plot.stage==='ripe'?1:growing?Math.max(0,Math.min(1,(time-plot.growthStartedAt)/durationMs)):0;
    return{...clone(plot),durationMs,growth,wetness:plot.wateredAt===null?0:Math.max(0,Math.min(1,1-(time-plot.wateredAt)/WET_MS)),
      remainingMs:plot.stage==='seeded'?durationMs:growing?Math.max(0,plot.readyAt-time):0,needsFirstWater:plot.stage==='seeded',
      actions:{sow:plot.stage==='empty',water:plot.stage!=='empty',harvest:plot.stage==='ripe'}};
  });
  return{plots,totalHarvests:plots.reduce((sum,plot)=>sum+plot.harvests,0),events:clone(garden.events)};
}

export function validateGardenAction(garden,plotId,action,cycle=null){
  const plot=garden.plots.find(plot=>plot.id===plotId);if(!plot)throw stageError('找不到这块菜畦。');
  if(!MUTATIONS.has(action))return plot;
  if(cycle!==null&&plot.cycle!==cycle)throw stageError('菜畦已进入新的种植周期，这个旧任务已取消。');
  if(action==='sow'&&plot.stage!=='empty')throw stageError('请先采收这块菜畦，再播种。');
  if(action==='water'&&plot.stage==='empty')throw stageError('这块菜畦还没有播种。');
  if(action==='harvest'&&plot.stage!=='ripe')throw stageError(plot.stage==='empty'?'这块菜畦已经采收，不能重复采收。':'作物尚未成熟，请稍后采收。');
  return plot;
}

export function applyGardenAction(garden,plotId,action,time,cycle){
  advanceGarden(garden,time);const plot=validateGardenAction(garden,plotId,action,cycle);
  if(action==='sow'){
    plot.cycle++;plot.stage='seeded';plot.plantedAt=time;plot.wateredAt=null;plot.growthStartedAt=null;plot.readyAt=null;
  }else if(action==='water'){
    plot.wateredAt=time;
    if(plot.stage==='seeded'){plot.stage='seedling';plot.growthStartedAt=time;plot.readyAt=time+cropDuration(plot.cropId);}
  }else if(action==='harvest'){
    plot.harvests++;plot.lastHarvestAt=time;emit(garden,plot,'harvest',time);plot.stage='empty';plot.plantedAt=null;plot.wateredAt=null;plot.growthStartedAt=null;plot.readyAt=null;
  }
  return plot;
}

export function shiftGarden(garden,duration){
  for(const plot of garden.plots)for(const key of ['plantedAt','wateredAt','growthStartedAt','readyAt'])if(plot[key]!==null)plot[key]+=duration;
  if(garden.nextCareAt!==0)garden.nextCareAt+=duration;
}

export function nextGardenCare(garden,time){
  if(time<garden.nextCareAt)return null;
  const plot=garden.plots.find(plot=>plot.stage==='seeded');if(!plot)return null;
  garden.nextCareAt=time+5*60_000;return plot.id;
}
