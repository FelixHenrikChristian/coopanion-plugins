import test from 'node:test';
import assert from 'node:assert/strict';
import {CooHomeWorld,DESCRIBE} from '../src/index.js';

const copy=structuredClone;
function fixture(){
  let now=Date.UTC(2030,0,1),saved=null,fail=false,pending=null;
  const memory=()=>{let value=null;return{load:async validate=>value?validate(copy(value)):null,save:async next=>{value=copy(next);},flush:async()=>{}};};
  const storage={recovery:'new',load:async validate=>saved?validate(copy(saved)):null,save:async value=>{if(pending)await pending.promise;if(fail)throw Error('Neutral disk failure');saved=copy(value);},flush:async()=>{}};
  const world=new CooHomeWorld({botDir:'neutral-commerce-fixture'},{clock:()=>now,storage,chatStorage:memory(),brainStorage:memory(),preferencesStorage:memory(),bridgeFactory:()=>({start:async()=>{},stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})}),modelFactory:()=>({run:async()=>{throw Error('Unexpected model request');},close:async()=>true})});
  const invoke=(method,args=[])=>world.webUi().invoke('home',method,args);
  return{world,invoke,now:()=>now,setNow:value=>{now=value;},saved:()=>copy(saved),fail:value=>{fail=value;},hold(){let release;const promise=new Promise(resolve=>{release=resolve;});pending={promise,release};},release(){const value=pending;pending=null;value?.release();},async start(){await world.start();clearInterval(world.timer);await invoke('settings',[{autonomy:false}]);},async finish(){now=world.life.state.current.endsAt+1;return world.tick();}};
}
const strict=fields=>({...Object.fromEntries(Object.keys(DESCRIBE.tools[0].parameters.properties).map(key=>[key,null])),...fields});
const quantity=(world,id)=>world.status().life.inventory.items.find(item=>item.id===id)?.quantity??0;

test('checkout state stays private until its atomic save succeeds; failure rolls back and retry settles once',async()=>{
  const f=fixture();await f.start();try{
    const catalog=await f.invoke('catalog'),milk=catalog.economy.items.find(item=>item.id==='food-milk');
    const request={kind:'buy',lines:[{itemId:milk.id,quantity:2}],requestId:`${f.now()}:save-fixture`};
    const accepted=await f.invoke('commerce',[request]);assert.equal(accepted.commerce.accepted,true);
    assert.equal(f.world.status().life.wallet.balance,100);assert.equal(f.world.status().life.wallet.reserved,milk.buyPrice*2);assert.equal(quantity(f.world,milk.id),0);
    assert.equal(f.world.life.state.current.itemId,'shop.counter');assert.ok(f.world.life.state.current.destination[2]<6.85,'Checkout must be across the street inside the shop');
    f.setNow(f.world.life.state.current.endsAt+1);f.hold();f.fail(true);
    const ticking=f.world.tick();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(f.world.saveBusy,true);assert.equal(f.world.status().life.wallet.balance,100);assert.equal(f.world.homeView().wallet.balance,100);assert.equal(quantity(f.world,milk.id),0);
    f.release();await assert.rejects(ticking,/保存/);assert.equal(f.world.status().life.wallet.balance,100);assert.equal(quantity(f.world,milk.id),0);
    f.fail(false);await f.world.tick();assert.equal(f.world.status().life.wallet.balance,100-milk.buyPrice*2);assert.equal(quantity(f.world,milk.id),2);
    const duplicate=await f.invoke('commerce',[request]);assert.equal(duplicate.commerce.duplicate,true);assert.equal(quantity(f.world,milk.id),2);
    await f.world.stop();await f.start();assert.equal(quantity(f.world,milk.id),2);assert.equal(f.world.status().life.wallet.balance,100-milk.buyPrice*2);
  }finally{f.release();f.fail(false);await f.world.stop();}
});

test('parallel UI retries reserve one order and cancellation releases it without changing wallet or stock',async()=>{
  const f=fixture();await f.start();try{
    const request={kind:'buy',lines:[{itemId:'seed-daikon',quantity:2}],requestId:`${f.now()}:retry-fixture`};
    const responses=await Promise.all([f.invoke('commerce',[request]),f.invoke('commerce',[request])]);
    assert.equal(responses[0].commerce.taskId,responses[1].commerce.taskId);assert.equal(responses[1].commerce.duplicate,true);
    assert.equal(f.world.status().life.wallet.reserved,16);await f.invoke('cancel');
    assert.equal(f.world.status().life.wallet.balance,100);assert.equal(f.world.status().life.wallet.reserved,0);assert.equal(quantity(f.world,'seed-daikon'),0);
    const late=await f.invoke('commerce',[request]);assert.equal(late.commerce.duplicate,true);assert.equal(f.world.life.state.current,null);
    const invalid=await f.invoke('commerce',[{...request,lines:[{itemId:'seed-daikon',quantity:3}]}]);assert.equal(invalid.commerce.ok,false);
  }finally{await f.world.stop();}
});

test('strict nullable commerce tools use backend prices and reject autonomous spending',async()=>{
  const f=fixture();await f.start();try{
    const call=strict({operation:'commerce',kind:'tea',lines:[{itemId:'tea-sencha',quantity:1}],seatId:'teahouse.cushion.back'});
    const before=f.world.life.export();
    const automatic=await f.world.runTool(call,{}, {source:'autonomous',active:{valid:()=>true,controller:new AbortController(),acted:false}});
    assert.equal(automatic.failed,true);assert.deepEqual(f.world.life.export(),before);
    const result=JSON.parse((await f.world.tools()[0].handler(call,{callId:'neutral-tea-tool',round:1})).text);assert.equal(result.accepted,true);
    assert.equal(f.world.life.state.current.itemId,'teahouse.cushion.back');assert.equal(f.world.status().life.wallet.balance,100);
    await f.finish();const after=f.world.status().life.wallet.balance;
    const repeated=JSON.parse((await f.world.tools()[0].handler(call,{callId:'neutral-tea-tool',round:1})).text);assert.equal(repeated.duplicate,true);assert.equal(repeated.transactionStatus,'completed');assert.equal(f.world.status().life.wallet.balance,after);
    await f.world.tools()[0].handler(call,{callId:'neutral-cancelled-tea',round:1});await f.invoke('cancel');
    const cancelled=JSON.parse((await f.world.tools()[0].handler(call,{callId:'neutral-cancelled-tea',round:1})).text);assert.equal(cancelled.transactionStatus,'cancelled');assert.equal(f.world.status().life.wallet.balance,after);
    const forged=await f.world.tools()[0].handler({...call,price:0},{callId:'neutral-bad-price'});assert.equal(forged.failed,true);
  }finally{await f.world.stop();}
});

test('explicit sale followed by queued shopping can spend the sale proceeds only after both visits complete',async()=>{
  const f=fixture();await f.start();try{
    await f.invoke('command',[{itemId:'plot-1',actionId:'sow',cropId:'spring-onion'}]);await f.finish();
    await f.invoke('command',[{itemId:'plot-1',actionId:'water'}]);await f.finish();
    f.setNow(f.world.life.state.garden.plots[0].readyAt+1);await f.world.tick();
    await f.invoke('command',[{itemId:'plot-1',actionId:'harvest'}]);await f.finish();assert.equal(quantity(f.world,'spring-onion'),12);
    const sell=await f.invoke('commerce',[{kind:'sell',lines:[{itemId:'spring-onion',quantity:12}],requestId:`${f.now()}:crop-sale`}]);assert.equal(sell.commerce.total,24);
    const buy=await f.invoke('commerce',[{kind:'buy',lines:[{itemId:'seed-eggplant',quantity:3}],requestId:`${f.now()}:after-sale`,enqueue:true}]);assert.equal(buy.commerce.accepted,true);
    assert.equal(f.world.status().life.wallet.balance,100);assert.equal(quantity(f.world,'spring-onion'),12);
    await f.finish();assert.equal(f.world.status().life.wallet.balance,124);assert.equal(quantity(f.world,'spring-onion'),0);
    await f.finish();assert.equal(f.world.status().life.wallet.balance,4);assert.equal(quantity(f.world,'seed-eggplant'),3);
  }finally{await f.world.stop();}
});

test('a failed final save during World shutdown cannot expose or lose a completed order',async()=>{
  const f=fixture();await f.start();try{
    const request={kind:'buy',lines:[{itemId:'food-milk',quantity:1}],requestId:`${f.now()}:shutdown-order`};
    await f.invoke('commerce',[request]);f.setNow(f.world.life.state.current.endsAt+1);f.fail(true);
    await assert.rejects(f.world.stop(),/保存/);
    assert.equal(f.world.status().life.wallet.balance,100);assert.equal(quantity(f.world,'food-milk'),0);
    f.fail(false);await f.start();assert.equal(f.world.status().life.wallet.balance,90);assert.equal(quantity(f.world,'food-milk'),1);
    const again=await f.invoke('commerce',[request]);assert.equal(again.commerce.transactionStatus,'completed');assert.equal(quantity(f.world,'food-milk'),1);
  }finally{f.fail(false);await f.world.stop();}
});
