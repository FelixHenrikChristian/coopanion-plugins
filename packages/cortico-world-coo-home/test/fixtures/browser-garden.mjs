import assert from 'node:assert/strict';

export async function verifyBrowserGarden({fixture,page,root,canvas,view,painted,shot}){
  const id='plot-1',states=[];
  await fixture.invoke('settings',[{autonomy:false}]);await fixture.invoke('cancel');await view('open');
  await page.evaluate(id=>{const s=window.__homeHarness.panel.scene,p=s.getItem(id).anchor;s.setCameraPose({eye:[p[0]+3.4,p[1]+5,p[2]+4],target:p});},id);
  await painted(8);
  async function sync(state){
    await page.waitForFunction(({revision,now})=>{const s=window.__homeHarness.panel.getLifeState();return s?.revision>=revision&&s.now>=now;},{revision:state.life.revision,now:state.life.now});
    await painted(4);return state;
  }
  async function select(){
    const point=await page.evaluate(id=>{const s=window.__homeHarness.panel.scene,p=s.project(s.getItem(id).anchor);for(const dx of [0,-10,10,-25,25,-45,45])for(const dy of [0,10,-10,25,-25,45,-45]){const x=p.x+dx,y=p.y+dy;if(s.pickSurface(x,y)?.itemId===id)return{x,y};}return null;},id);
    assert.ok(point,'The empty bed must remain clickable');await canvas.click({position:point});await root.getByTestId('home-plot-details').waitFor({state:'visible'});
  }
  const action=name=>root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="${name}"]`);
  const plot=()=>fixture.snapshot().life.garden.plots.find(p=>p.id===id);
  async function metrics(){return page.evaluate(id=>{const s=window.__homeHarness.panel.scene,roles={};s.getObject(id).traverse(part=>{const role=part.userData.cropRole;if(role){roles[role]??=[];roles[role].push({visible:part.visible,instances:Array.from(part.instanceMatrix?.array??[])});}});return{roles,state:s.getPlotVisuals().plots.find(p=>p.id===id)};},id);}
  async function record(stage){
    await sync(fixture.snapshot());await select();const detail=root.getByTestId('home-plot-details');assert.equal(await detail.getAttribute('data-stage'),stage);
    const m=await metrics();assert.equal(m.state.stage,stage);assert.equal(m.state.cropId,plot().cropId);
    for(const canonical of ['sow','water','harvest'])assert.equal(await action(canonical).isDisabled(),!plot().actions[canonical]);
    states.push(structuredClone(fixture.snapshot().life.garden));await shot(`garden-${stage}`);return m;
  }
  async function finish(){const task=fixture.snapshot().life.current;assert.ok(task);await sync(await fixture.advanceTo(task.endsAt+10));}
  async function act(name,cropId){
    await select();const before=plot().stage;await action(name).click();
    if(name==='sow'){await root.getByTestId('home-crop-dialog').waitFor({state:'visible'});await root.locator(`[data-testid="home-crop-option"][data-crop-id="${cropId}"]`).click();}
    await page.waitForFunction(id=>window.__homeHarness.panel.getLifeState()?.current?.itemId===id,id);assert.equal(plot().stage,before);await finish();
  }
  assert.equal(plot().stage,'empty');assert.equal(plot().cropId,null);await record('empty');
  const empty=await metrics();assert.ok((empty.roles.plants??[]).every(m=>!m.visible));
  const bounds=await root.boundingBox();
  const menuBefore=await root.locator('.coo-home-menu').evaluate(e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top),background:getComputedStyle(e).backgroundColor}));
  assert.equal(menuBefore.background,'rgba(0, 0, 0, 0)','Actions should not be one opaque panel');
  for(const button of await root.getByTestId('home-action').all()){const b=await button.boundingBox();assert.ok(b.x>=bounds.x&&b.x+b.width<=bounds.x+bounds.width&&b.y>=bounds.y&&b.y+b.height<=bounds.y+bounds.height,'Action clipped by viewport');}
  await shot('plot-context-actions');
  await page.evaluate(()=>{const s=window.__homeHarness.panel.scene,p=s.getCameraPose();s.setCameraPose({eye:p.eye.map((v,i)=>v+(i===0?1:0)),target:p.target.map((v,i)=>v+(i===0?1:0))});});await painted(6);
  const moved=await root.locator('.coo-home-menu').evaluate(e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)}));
  assert.ok(Math.hypot(moved.x-menuBefore.x,moved.y-menuBefore.y)>10,'Action bubbles did not follow the object while panning');
  await action('sow').click();await root.getByTestId('home-crop-dialog').waitFor({state:'visible'});
  assert.equal(await root.getByTestId('home-crop-option').count(),8);assert.equal(fixture.snapshot().life.current,null,'Opening the chooser started a task');
  const options=await root.getByTestId('home-crop-option').allTextContents();assert.ok(options.some(s=>s.includes('30 分钟'))&&options.some(s=>s.includes('90 分钟')));
  await shot('crop-chooser');await root.getByTestId('home-crop-close').click();assert.equal(fixture.snapshot().life.current,null);
  await action('sow').click();
  await page.route('**/invoke',route=>{const value=route.request().postDataJSON();assert.equal(value.args[0].cropId,'carrot');return route.fulfill({status:409,contentType:'application/json',body:'{"error":"Synthetic conflict"}'});},{times:1});
  await root.locator('[data-testid="home-crop-option"][data-crop-id="carrot"]').click();
  await page.waitForFunction(()=>document.querySelector('.coo-home-crop-status')?.textContent.includes('未能安排'));assert.equal(plot().stage,'empty');await root.getByTestId('home-crop-close').click();
  await act('sow','carrot');await record('seeded');assert.equal(plot().cropId,'carrot');assert.equal(plot().durationMs,45*60_000);
  await act('water');const seedling=await record('seedling'),growingPlot=plot();
  await sync(await fixture.advanceTo(growingPlot.growthStartedAt+growingPlot.durationMs*.6));const growing=await record('growing');assert.notDeepEqual(growing.roles.plants,seedling.roles.plants);
  await sync(await fixture.advanceTo(growingPlot.readyAt+10));await record('ripe');
  await root.getByTestId('home-enqueue').check();await action('harvest').click();
  await page.waitForFunction(id=>window.__homeHarness.panel.getLifeState()?.current?.itemId===id,id);await select();await action('sow').click();
  await root.locator('[data-testid="home-crop-option"][data-crop-id="pepper"]').click();
  await page.waitForFunction(()=>window.__homeHarness.panel.getLifeState().queue.length===1);assert.equal(fixture.snapshot().life.queue[0].cropId,'pepper');
  const first=fixture.snapshot().life.current;await sync(await fixture.advanceTo(first.endsAt+10));assert.equal(plot().stage,'empty');await finish();
  await select();await root.getByTestId('home-enqueue').uncheck();await record('seeded');assert.equal(plot().cropId,'pepper');assert.equal(plot().harvests,1);
  await act('water');await sync(await fixture.advanceTo(plot().readyAt+10));await record('ripe');await shot('garden-switched-pepper');
  await fixture.invoke('pause');
  const resources=await page.evaluate(async states=>{const s=window.__homeHarness.panel.scene,step=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));for(const state of states){s.setPlotVisuals(state);await step();}const before=s.getRendererInfo();for(let i=0;i<12;i++)for(const state of states){s.setPlotVisuals(state);await step();}const after=s.getRendererInfo();s.setPlotVisuals(window.__homeHarness.panel.getLifeState().garden);return{before,after};},states);
  for(const k of ['geometries','textures','programs'])assert.equal(resources.before[k],resources.after[k],`Crop switching leaks ${k}`);
  await fixture.invoke('resume');await page.keyboard.press('Escape');
  assert.equal(await root.locator('.coo-home-menu').isVisible(),false);
  return{initialEmpty:true,allEightChoices:true,minutesShown:true,cancelDoesNotSow:true,transportFailureSafe:true,objectAnchored:true,choices:['carrot','pepper'],queuedCropPreserved:true,stages:['empty','seeded','seedling','growing','ripe'],cycles:12,resources:resources.after};
}
