import * as T from 'three';
import { furnish } from './models.js';
import { rooms, furniture, roomAt, walkable, distance } from './layout.js';
import { position, phase, verbs } from './life.js';
import { mountFigure } from './figure.js';

export function createScene(
  ctx,
  { stage, canvas, status, hint, visit, inspect },
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new T.Scene(),
    model = furnish(scene),
    cam = new T.PerspectiveCamera(31, 1, 0.1, 110),
    ray = new T.Raycaster();
  ray.layers.set(1);
  const figure = mountFigure(ctx, stage, status);
  const shadow = new T.Mesh(
    new T.CircleGeometry(0.35, 30),
    new T.MeshBasicMaterial({
      color: '#4b504b',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  const outline = new T.Mesh(
    new T.RingGeometry(0.37, 0.43, 40),
    new T.MeshBasicMaterial({
      color: '#ffcf79',
      depthTest: false,
      transparent: true,
      opacity: 0.92,
    }),
  );
  outline.rotation.x = -Math.PI / 2;
  outline.renderOrder = 5;
  scene.add(outline);
  outline.visible = false;
  let state,
    focus = 'living',
    yaw = 0.56,
    pitch = 0.44,
    wantedYaw = 0.56,
    wantedPitch = 0.44,
    zoom = 1,
    follow = false,
    viewW = 0,
    viewH = 0,
    half = 8;
  const aim = new T.Vector3(-2.8, 0.85, 1.32);
  let drag = null,
    carry = null,
    dir = 1,
    prevScreen = null,
    lastFrame = 0,
    previousPose,
    stationShift = 0;
  let desiredAim = aim.clone(),
    scaleTarget,
    resizeDirty = true;
  const xy = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  function fit(w, h) {
    return Math.max(h / 2, w / (2 * (viewW / viewH)));
  }
  function frameCamera() {
    if (resizeDirty) {
      viewW = canvas.clientWidth;
      viewH = canvas.clientHeight;
      if (!viewW || !viewH) return;
      renderer.setSize(viewW, viewH, false);
      resizeDirty = false;
    }
    const active =
      follow && state ? roomAt(position(state, Date.now())) : focus;
    if (active && rooms[active]) {
      const r = rooms[active];
      desiredAim.set(
        r.center[0],
        active === 'street' ? 1.02 : active === 'living' ? 0.89 : 0.7,
        r.center[1],
      );
      scaleTarget =
        active === 'street'
          ? fit(12.4, 6.15)
          : fit(r.size * 1.62, r.size * 0.99);
    } else {
      desiredAim.set(1.4, 0.49, -1.42);
      scaleTarget = fit(19.6, 14.1);
    }
    if (!lastFrame) {
      aim.copy(desiredAim);
      half = scaleTarget / zoom;
    }
    aim.lerp(desiredAim, 0.17);
    half = T.MathUtils.lerp(half, scaleTarget / zoom, 0.18);
    yaw = T.MathUtils.lerp(yaw, wantedYaw, 0.18);
    pitch = T.MathUtils.lerp(pitch, wantedPitch, 0.18);
    const ratio = viewW / viewH;
    cam.aspect = ratio;
    const span = half / Math.tan(T.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(
      aim.x + span * Math.sin(yaw) * Math.cos(pitch),
      aim.y + span * Math.sin(pitch),
      aim.z + span * Math.cos(yaw) * Math.cos(pitch),
    );
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
  const resize = new ResizeObserver(() => {
    resizeDirty = true;
  });
  resize.observe(canvas);
  const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function pick(e, dropping = false) {
    const [x, y] = xy(e);
    ray.setFromCamera(
      new T.Vector2((2 * x) / viewW - 1, 1 - (2 * y) / viewH),
      cam,
    );
    const p = ray.ray.intersectPlane(plane, new T.Vector3());
    if (!p) return {};
    const point = [p.x, p.z],
      hit = ray.intersectObjects(scene.children, true).find((h) => {
        if (h.object === outline || h.object === shadow || !h.object.isMesh)
          return false;
        for (let m = h.object; m; m = m.parent) if (!m.visible) return false;
        return true;
      });
    let station;
    for (let m = hit?.object; m && !station; m = m.parent)
      station = m.userData.target;
    if (dropping && !station) {
      const near = Object.entries(furniture)
        .filter(([, s]) => roomAt(point) === s.room)
        .sort(
          (a, b) => distance(point, a[1].point) - distance(point, b[1].point),
        )[0];
      if (near && distance(point, near[1].point) < 1.07) station = near[0];
    }
    return { point, station, valid: !!station || walkable(point) };
  }
  function clearPointer() {
    drag = null;
    carry = null;
    outline.visible = false;
    canvas.style.cursor = 'grab';
    hint('');
  }
  const opt = { signal: ctx.signal };
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || drag || !state) return;
      const [x, y] = xy(e);
      drag = {
        id: e.pointerId,
        x,
        y,
        yaw,
        pitch,
        actor: figure.hit(x, y),
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
    },
    opt,
  );
  canvas.addEventListener(
    'pointermove',
    (e) => {
      const [x, y] = xy(e);
      if (!drag) {
        canvas.style.cursor = figure.hit(x, y)
          ? 'grab'
          : pick(e).station
            ? 'pointer'
            : 'grab';
        return;
      }
      if (e.pointerId !== drag.id) return;
      const dx = x - drag.x,
        dy = y - drag.y;
      if (Math.hypot(dx, dy) < 4 && !drag.moved) return;
      drag.moved = true;
      if (!drag.actor) {
        wantedYaw = T.MathUtils.clamp(drag.yaw - dx * 0.006, -0.93, 0.99);
        wantedPitch = T.MathUtils.clamp(drag.pitch + dy * 0.004, 0.34, 0.95);
        return;
      }
      const k = pick(e, true);
      carry = { x, y, k };
      canvas.style.cursor = 'grabbing';
      const target = k.station ? furniture[k.station].point : k.point;
      if (target) {
        outline.visible = !!k.valid;
        outline.position.set(target[0], 0.11, target[1]);
      }
      hint(
        k.station
          ? '松手 · ' + furniture[k.station].label
          : k.valid
            ? '松手 · 放到这里'
            : '请放到空地或家具旁',
      );
    },
    opt,
  );
  canvas.addEventListener(
    'pointerup',
    (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const actor = drag.actor,
        moved = drag.moved,
        k = pick(e, actor && moved);
      clearPointer();
      if (!moved && actor) {
        inspect('coo');
        return;
      }
      if (moved && !actor) return;
      if (!k.valid) {
        hint('那里走不到，请选空地或家具。');
        return;
      }
      if (k.station && !moved) {
        inspect(k.station);
        return;
      }
      visit(
        k.station
          ? { target: k.station, carry: actor && moved }
          : { target: 'walk', point: k.point, carry: actor && moved },
      );
    },
    opt,
  );
  canvas.addEventListener('pointercancel', clearPointer, opt);
  canvas.addEventListener(
    'lostpointercapture',
    () => {
      if (drag) clearPointer();
    },
    opt,
  );
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoom = T.MathUtils.clamp(zoom * Math.exp(-e.deltaY * 0.003), 0.68, 2.5);
    },
    { signal: ctx.signal, passive: false },
  );
  function project(x, y, z) {
    const p = new T.Vector3(x, y, z).project(cam);
    return [((p.x + 1) * viewW) / 2, ((1 - p.y) * viewH) / 2];
  }
  const visibilityRay = new T.Raycaster();
  visibilityRay.layers.set(1);
  function unobstructed(point) {
    visibilityRay.setFromCamera(
      new T.Vector2(...point.clone().project(cam).toArray().slice(0, 2)),
      cam,
    );
    const length = visibilityRay.ray.origin.distanceTo(point);
    visibilityRay.far = Math.max(0, length - 0.1);
    return !visibilityRay.intersectObjects(model.solids, false).length;
  }
  function render(ms) {
    if (!state || document.hidden) return;
    const now = Date.now();
    if (now - lastFrame < 33) return;
    const dt = Math.min(0.09, ms / 1000);
    frameCamera();
    if (!viewW || !viewH) return;
    const s = state,
      where = position(s, now),
      mode = phase(s, now),
      target = s.trip?.target ?? s.station;
    const resting = ['tv', 'sofa', 'bed', 'bath', 'table'].includes(mode);
    const poseKey = resting ? mode + target : 'standing';
    if (poseKey !== previousPose) {
      stationShift = 0;
      previousPose = poseKey;
    }
    stationShift = Math.min(1, stationShift + 0.1);
    const dx =
      target === 'tv' || target === 'sofa'
        ? [-3.58, 0.53, 2.27]
        : target === 'bed'
          ? [3.82, 0.68, -2.11]
          : target === 'bath'
            ? [4.34, 0.49, 2.39]
            : target === 'table'
              ? [-3.58, 0.42, -5.27]
              : null;
    const x =
        resting && dx
          ? T.MathUtils.lerp(where[0], dx[0], stationShift)
          : where[0],
      z =
        resting && dx
          ? T.MathUtils.lerp(where[1], dx[2], stationShift)
          : where[1],
      y = resting && dx ? dx[1] * stationShift : 0.04;
    const at = project(x, y, z),
      cap = project(x, y + 1.17, z);
    const pix = Math.abs(at[1] - cap[1]) / Math.max(0.55, Math.cos(pitch));
    if (
      mode === 'walking' &&
      prevScreen &&
      Math.abs(at[0] - prevScreen[0]) > 0.08
    )
      dir = at[0] > prevScreen[0] ? 1 : -1;
    prevScreen = at;
    shadow.position.set(x, 0.032, z);
    shadow.visible = !carry && y < 0.15;
    let fraction = 1;
    if (
      at[0] < -pix ||
      at[0] > viewW + pix ||
      at[1] < -pix ||
      at[1] > viewH + pix
    )
      fraction = 0;
    else if (!carry) {
      if (!unobstructed(new T.Vector3(x, y + 1.37, z))) fraction = 0;
      else if (!unobstructed(new T.Vector3(x, y + 0.3, z))) fraction = 0.68;
    }
    figure.draw(
      carry ? carry.x : at[0],
      carry ? carry.y + pix * 0.5 : at[1],
      pix,
      carry ? 'carried' : mode,
      dir,
      carry ? 1 : fraction,
      dt,
    );
    model.update(s, now, focus === 'street' && !follow, aim);
    renderer.render(scene, cam);
    lastFrame = now;
  }
  ctx.frame(render);
  ctx.own({
    dispose() {
      resize.disconnect();
      model.dispose();
      for (const m of [shadow, outline]) {
        m.geometry.dispose();
        m.material.dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
    },
  });
  return {
    state(s) {
      state = s;
      renderer.shadowMap.needsUpdate = true;
    },
    focus(id) {
      focus = id;
      follow = id === 'follow';
      wantedPitch = id === 'street' ? 0.32 : id === 'living' ? 0.44 : 0.57;
      wantedYaw = id === 'street' ? 0.44 : 0.56;
      zoom = 1;
      renderer.shadowMap.needsUpdate = true;
    },
    zoom(by) {
      zoom = T.MathUtils.clamp(zoom * by, 0.68, 2.5);
    },
    reset() {
      zoom = 1;
      wantedYaw = focus === 'street' ? 0.44 : 0.56;
      wantedPitch =
        focus === 'street' ? 0.32 : focus === 'living' ? 0.44 : 0.57;
    },
    video: (v) => model.video(v),
    retry: figure.refresh,
    animations: figure.animations,
    animate: figure.animate,
  };
}
