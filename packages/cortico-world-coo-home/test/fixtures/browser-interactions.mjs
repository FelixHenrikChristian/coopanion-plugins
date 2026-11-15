import assert from 'node:assert/strict';

// Real scene geometry, real life actions and a deliberately offset neutral body.
export async function verifyBrowserInteractions({fixture,page,shot,markerPixels,report}){
  const paint=async(n=6)=>page.evaluate(async n=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);},n);
  const probe=async()=>page.evaluate(()=>{
    const p=window.__homeHarness.panel,actor=p.actor.getState(),host=document.querySelector('.coo-home-actor:not([hidden])');
    const l=window.__homeHarness.metrics.roleFrames.at(-1)?.layout,projected=p.scene.project(actor.placement.position);
    const scale=host?parseFloat(host.style.height)/512:0;
    return{actor,lower:host&&l?parseFloat(host.style.top)+(l.box.y+l.box.h)*scale:null,projected,layout:l};
  });
  await page.evaluate(()=>window.__homeHarness.panel.scene.setView('open'));
  fixture.setAppearance('fixture-rest');
  await page.waitForFunction(()=>window.__homeHarness.panel.actor.getCapabilities().words.includes('sleep'));
  const seats=[['living.sofa','sit'],['living.rug','sit'],['dining.dining','eat'],['study.desk','desk'],['bathroom.toilet','toilet'],['engawa.chair','sit'],['bedroom.bed','sleep'],['bathroom.shower','bath']];
  report.checks.resting=[];
  for(const [id,actionId] of seats){
    const command=await fixture.invoke('command',[{itemId:id,actionId}]);
    await fixture.advanceTo(command.life.current.arrivalAt+20);
    await page.waitForFunction(id=>{
      const p=window.__homeHarness.panel,s=p.getLifeState();return s.current?.itemId===id&&s.current.phase==='acting'&&p.actor.getState().placement.alignment==='support'&&Math.hypot(...p.actor.getState().placement.position.map((n,i)=>n-s.current.pose.position[i]))<1e-6;
    },id);
    const expected=await page.evaluate(id=>{
      const p=window.__homeHarness.panel,pose=p.getLifeState().current.pose;
      const hits=window.__homeSupportProbe(p.scene,id,pose.support.position);
      return{pose,hits:hits.slice(0,3)};
    },id);
    assert(expected.hits.length>0,`${id} support misses actual furniture`);
    assert(Math.abs(expected.hits[0].point[1]-expected.pose.support.position[1])<.018,`${id} support does not match modeled surface: ${JSON.stringify(expected)}`);
    const views=[];
    for(const [angle,azimuth] of [[48,15],[78,195]]){
      await page.evaluate(({angle,azimuth})=>{
        const p=window.__homeHarness.panel,foot=p.actor.getState().placement.position,r=9,a=angle*Math.PI/180,t=azimuth*Math.PI/180;
        p.scene.setCameraPose({eye:[foot[0]+r*Math.cos(a)*Math.cos(t),foot[1]+r*Math.sin(a),foot[2]+r*Math.cos(a)*Math.sin(t)],target:foot});
      },{angle,azimuth});
      await paint(12);await page.waitForFunction(()=>window.__homeHarness.panel.actor.getState().maskReady);
      const state=await probe();assert.equal(state.actor.placement.alignment,'support');
      assert(Math.abs(state.lower-state.projected.y)<.7,`${id}: visible bound not aligned to support`);
      assert.equal(state.layout.box.y+state.layout.box.h-state.layout.y,14,'Offset fixture was not exercised');
      const pixels=await markerPixels(await shot(`support-${id.replaceAll('.','-')}-${angle}`));
      assert(pixels>60,`${id} disappeared at ${angle} degrees: ${pixels}`);
      views.push({angle,pixels,lowerError:state.lower-state.projected.y,word:state.actor.word});
    }
    report.checks.resting.push({id,supportY:expected.pose.support.position[1],geometryY:expected.hits[0].point[1],views});
  }
  // Unsupported sleeping is explicitly a standing floor fallback, never a body on the mattress.
  fixture.setAppearance('fixture-round');
  await page.waitForFunction(()=>!window.__homeHarness.panel.actor.getCapabilities().words.includes('sleep'));
  const bed=await fixture.invoke('command',[{itemId:'bedroom.bed',actionId:'sleep'}]);
  await fixture.advanceTo(bed.life.current.arrivalAt+20);
  await page.waitForFunction(()=>{const p=window.__homeHarness.panel;return p.getLifeState().current?.itemId==='bedroom.bed'&&p.actor.getState().placement.alignment==='feet'&&p.actor.getState().word==='stand';});
  assert.equal((await probe()).actor.placement.position[1],.41);
  report.checks.unsupportedSleep='ground fallback';

  const id='study.desk';
  await page.evaluate(id=>{const s=window.__homeHarness.panel.scene,p=s.getItem(id).anchor;s.setCameraPose({eye:[p[0]+1,p[1]+5,p[2]-5],target:p});},id);
  await paint(16);
  const target=await page.evaluate(id=>{
    const s=window.__homeHarness.panel.scene,p=s.project(s.getItem(id).anchor),box=s.canvas.getBoundingClientRect();
    for(const dy of [0,-20,20,-40,40,-60,60])for(const dx of [0,-20,20,-40,40,-60,60])if(s.pickSurface(p.x+dx,p.y+dy)?.itemId===id)return{x:box.left+p.x+dx,y:box.top+p.y+dy};return null;
  },id);
  assert(target,'Desk must offer a real raycast target');
  await page.mouse.move(target.x,target.y);
  await page.waitForFunction(id=>window.__homeHarness.panel.scene.getHoverState().itemId===id,id);
  await paint(8);await shot('hover-desk');
  const before=await page.evaluate(()=>({hover:window.__homeHarness.panel.scene.getHoverState(),renderer:window.__homeHarness.panel.scene.getRendererInfo()}));
  assert.equal(before.hover.drawCalls,1);assert(before.hover.vertices>0);
  await page.waitForTimeout(450);
  const idle=await page.evaluate(()=>window.__homeHarness.panel.scene.getHoverState());
  assert.equal(idle.picks,before.hover.picks,'Stationary hover must not keep raycasting');
  await page.evaluate(()=>window.__homeHarness.panel.scene.setView('exterior'));
  await page.waitForFunction(()=>window.__homeHarness.panel.scene.getHoverState().itemId===null);
  await page.evaluate(()=>window.__homeHarness.panel.scene.setView('open'));
  await page.waitForFunction(id=>window.__homeHarness.panel.scene.getHoverState().itemId===id,id);
  await page.mouse.down();await paint();assert.equal(await page.evaluate(()=>window.__homeHarness.panel.scene.getHoverState().itemId),null);
  await page.mouse.up();await page.mouse.move(1,1);await paint();
  const memory=await page.evaluate(async()=>{
    const s=window.__homeHarness.panel.scene,ids=['study.desk','living.sofa','bedroom.bed','bathroom.shower'];
    s.setHoveredItem(null);await new Promise(requestAnimationFrame);const baseline=s.getRendererInfo();
    for(let i=0;i<24;i++){s.setHoveredItem(ids[i%ids.length]);await new Promise(requestAnimationFrame);}
    s.setHoveredItem(null);await new Promise(requestAnimationFrame);return{baseline,after:s.getRendererInfo(),hover:s.getHoverState()};
  });
  assert.equal(memory.after.geometries,memory.baseline.geometries,'Hover geometry leaked');
  assert.equal(memory.after.textures,memory.baseline.textures,'Hover must not allocate screen targets');
  assert.equal(memory.hover.drawCalls,0);
  report.checks.hover={...before.hover,idleRaycasts:idle.picks-before.hover.picks,geometryDelta:memory.after.geometries-memory.baseline.geometries,textureDelta:memory.after.textures-memory.baseline.textures};
}
