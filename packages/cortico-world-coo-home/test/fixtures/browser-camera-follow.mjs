import assert from 'node:assert/strict';

export async function verifyBrowserCameraFollow({fixture,page,shot,report}){
  const canvas=page.locator('[data-testid="home-scene"] canvas').first(),button=page.getByTestId('home-follow'),result={};
  const settle=()=>page.waitForTimeout(850);
  const state=()=>page.evaluate(()=>{const p=window.__homeHarness.panel,actor=p.actor.getState();return{follow:p.scene.getFollowState(),pose:p.scene.getCameraPose(),foot:actor.placement.position,framing:p.scene.projectBillboard(actor.placement.position,actor.placement.height)};});
  const difference=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
  await fixture.invoke('settings',[{autonomy:false}]);await fixture.invoke('resume',[]);
  const task=await fixture.invoke('walk',[{position:[5,.18,7.05]}]);await fixture.advanceTo(task.life.current.endsAt+20);
  await page.waitForFunction(()=>Math.hypot(...window.__homeHarness.panel.actor.getState().placement.position.map((n,i)=>n-[5,.18,7.05][i]))<.02);
  await page.evaluate(()=>{const p=window.__homeHarness.panel;p.scene.setView('open');p.scene.setCameraPose({eye:[19,14,24],target:[0,1,5]});});
  await button.click();await page.waitForFunction(()=>document.querySelector('[data-testid="home-follow"]')?.getAttribute('aria-pressed')==='true');
  await settle();const first=await state();
  assert(first.follow.active&&!first.follow.panEnabled);assert(first.follow.distance>=8&&first.follow.distance<=12.0001);
  assert(difference(first.follow.target,first.foot.map((n,i)=>n+(i===1?.6:0)))<1e-5);
  assert(first.framing.foot.visible&&first.framing.top.visible&&first.framing.top.y>24&&first.framing.foot.y<first.framing.foot.viewport.height-24,'Initial follow framing clips the figure');
  result.initialDistance=first.follow.distance;
  async function drag(button,dx,dy){
    const box=await canvas.boundingBox(),x=box.x+box.width*.7,y=box.y+box.height*.4;
    await page.mouse.move(x,y);await page.mouse.down({button});await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up({button});await settle();
  }
  await drag('left',95,25);const rotated=await state();
  assert(difference(rotated.pose.eye,first.pose.eye)>.5,'Left dragging did not orbit');
  assert(difference(rotated.follow.target,first.follow.target)<1e-5,'Rotation drifted away from the followed target');
  await page.mouse.wheel(0,400);await settle();const zoomed=await state();
  assert(zoomed.follow.distance>rotated.follow.distance*1.04,'Wheel zoom was reset while following');
  await drag('right',75,30);const panBlocked=await state();
  assert(difference(panBlocked.follow.target,zoomed.follow.target)<1e-5,'Panning broke the follow lock');
  result.orbitAndZoom={rotated:true,zoomedDistance:zoomed.follow.distance,panBlocked:true};
  await fixture.invoke('walk',[{position:[6.2,.18,7.05]}]);
  const samples=await page.evaluate(async()=>{
    const samples=[],start=performance.now();
    while(performance.now()-start<1000){
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const p=window.__homeHarness.panel,pose=p.scene.getCameraPose(),foot=p.actor.getState().placement.position;
      samples.push({foot,focusError:Math.hypot(...pose.target.map((n,i)=>n-foot[i]-(i===1?.6:0))),offset:pose.eye.map((n,i)=>n-pose.target[i])});
    }
    return samples;
  });
  assert(samples.length>5);assert(difference(samples.at(-1).foot,samples[0].foot)>.25,'The neutral figure did not walk during the follow test');
  assert(Math.max(...samples.map(row=>row.focusError))<.025,'The camera focus fell behind the moving figure');
  assert(Math.max(...samples.map(row=>difference(row.offset,samples[0].offset)))<.025,'Following reset the user orbit or zoom');
  result.walking={samples:samples.length,distance:difference(samples.at(-1).foot,samples[0].foot),maxFocusError:Math.max(...samples.map(row=>row.focusError))};
  await fixture.advance(2000);await settle();
  result.translation=await page.evaluate(()=>{
    const p=window.__homeHarness.panel,s=p.scene,before=s.getCameraPose(),foot=p.actor.getState().placement.position;
    s.setFollowTarget([foot[0]+.8,foot[1]+.1,foot[2]+.4]);const after=s.getCameraPose();s.setFollowTarget(foot);
    const a=before.eye.map((n,i)=>n-before.target[i]),b=after.eye.map((n,i)=>n-after.target[i]);
    return{offsetError:Math.hypot(...a.map((n,i)=>n-b[i])),movement:after.target.map((n,i)=>n-before.target[i])};
  });
  assert(result.translation.offsetError<1e-8);assert(difference(result.translation.movement,[.8,.1,.4])<1e-8);
  const viewport=page.viewportSize(),beforeResize=await state();
  await page.setViewportSize({width:1010,height:780});await settle();const resized=await state();
  assert(Math.abs(beforeResize.follow.distance-resized.follow.distance)<.01,'Resize reset the follow zoom');
  await page.setViewportSize(viewport);await settle();
  const wallPose=(await state()).pose;
  for(const mode of ['exterior','walls','cutaway','open']){
    await page.evaluate(mode=>window.__homeHarness.panel.scene.setView(mode),mode);await settle();const next=await state();
    assert(next.follow.active);assert(difference(next.pose.eye,wallPose.eye)<.01&&difference(next.pose.target,wallPose.target)<.01,`Changing to ${mode} moved the camera`);
  }
  result.wallModesKeepPose=true;await shot('camera-follow-locked');
  const beforeRelease=await state();await button.click();await settle();const released=await state();
  assert(difference(beforeRelease.pose.eye,released.pose.eye)<.01&&difference(beforeRelease.pose.target,released.pose.target)<.01);
  assert(!released.follow.active&&released.follow.panEnabled);assert.equal(await button.getAttribute('aria-pressed'),'false');
  await drag('right',75,30);const free=await state();assert(difference(free.pose.target,released.pose.target)>.1,'Free panning was not restored');
  result.releaseKeepsPoseAndRestoresPan=true;
  await button.click();
  await canvas.press('Home');await settle();assert.equal((await state()).follow.active,false,'Home must release the lock');
  assert.equal(await button.getAttribute('aria-pressed'),'false');
  result.homeReleases=true;report.checks??={};report.checks.cameraFollow=result;return result;
}
