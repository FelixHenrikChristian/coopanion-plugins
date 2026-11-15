import assert from 'node:assert/strict';

// Shared by the dedicated projection test and the complete neutral World run.
export async function verifyBrowserProjection({fixture,page,shot,markerPixels,report}){
  const result={angles:[],zoom:[],occlusion:{},seats:{}};
  const painted=()=>page.waitForTimeout(450);
  async function walk(position){
    const state=await fixture.invoke('walk',[{position}]);await fixture.advanceTo(state.life.current.endsAt+20);
    await page.waitForFunction(p=>{
      const actual=window.__homeHarness.panel.actor.getState().placement.position;
      return Math.hypot(...actual.map((n,i)=>n-p[i]))<.02;
    },position);await painted();
  }
  async function view(mode){await page.evaluate(mode=>window.__homeHarness.panel.scene.setView(mode),mode);await painted();}
  async function camera(angle,distance){
    await page.evaluate(({angle,distance})=>{
      const p=window.__homeHarness.panel,foot=p.actor.getState().placement.position,r=angle*Math.PI/180;
      p.scene.setCameraPose({eye:[foot[0],foot[1]+distance*Math.sin(r),foot[2]+distance*Math.cos(r)],target:foot});
    },{angle,distance});await painted();
    return page.evaluate(()=>{
      const p=window.__homeHarness.panel,actor=p.actor.getState(),host=document.querySelector('.coo-home-actor');
      return{...p.scene.projectBillboard(actor.placement.position,actor.placement.height),cssHeight:parseFloat(host.style.height)/2,hidden:host.hidden};
    });
  }
  const marker=async name=>markerPixels(await shot(`projection-${name}`));
  await fixture.invoke('settings',[{autonomy:false}]);
  await fixture.invoke('resume',[]);
  await walk([5,.18,7.05]);await view('open');
  for(const angle of [35,50,65,75,85.3]){
    const projection=await camera(angle,14),pixels=await marker(`elevation-${angle}`);
    assert(!projection.hidden);assert(Math.abs(projection.cssHeight-projection.pixelHeight)<.01);
    assert(pixels>80,`The grounded figure disappeared at elevation ${angle}`);
    result.angles.push({angle,height:projection.cssHeight,pixels});
  }
  const sizes=result.angles.map(row=>row.height);assert(Math.max(...sizes)/Math.min(...sizes)<1.01);
  for(const distance of [28,14,7]){
    const projection=await camera(85.3,distance);assert(!projection.hidden);
    result.zoom.push({distance,height:projection.cssHeight,pixels:await marker(`zoom-${distance}`)});
  }
  assert(Math.abs(result.zoom[1].height/result.zoom[0].height-2)<.02);
  assert(Math.abs(result.zoom[2].height/result.zoom[1].height-2)<.02);
  await walk([-3,.41,12]);await camera(85.3,14);await view('exterior');
  result.occlusion.roof=await marker('roof-hidden');assert(result.occlusion.roof<6,'Figure leaked through the opaque roof');
  await view('open');result.occlusion.open=await marker('roof-removed');assert(result.occlusion.open>80,'Floor incorrectly hides the camera-facing figure');
  for(const [itemId,actionId] of [['living.sofa','sit'],['study.desk','desk'],['dining.dining','sit'],['bathroom.toilet','toilet'],['engawa.chair','sit']]){
    const state=await fixture.invoke('command',[{itemId,actionId}]);await fixture.advanceTo(state.life.current.arrivalAt+20);
    await page.waitForFunction(itemId=>{
      const p=window.__homeHarness.panel,task=p.getLifeState().current,actor=p.actor.getState();
      return task?.itemId===itemId&&task.phase==='acting'&&actor.word==='sit'&&Math.hypot(...actor.placement.position.map((n,i)=>n-task.pose.position[i]))<.02;
    },itemId);await camera(65,10);
    const pixels=await marker(`seated-${itemId}`);assert(pixels>20,`Seated figure disappeared at ${itemId}`);result.seats[itemId]=pixels;
  }
  report.checks??={};report.checks.projection=result;return result;
}
