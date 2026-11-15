# Embedding the neighborhood

`src/scene.js` exports `createNeighborhood(options)`. It mounts only inside the
supplied root, with scoped styles and its own camera, controls and GPU resources.
The ordinary `amane-mart.html` still uses the same scene through `src/main.js`.

```js
import { createNeighborhood } from './src/scene.js';

const scene = createNeighborhood({
  root: viewportElement, // The host supplies a nonzero width and height.
  autoStart: false,
  onItem(item) { /* Send the stable item ID to the home runtime. */ },
  onView({ mode }) { /* Persist the view preference if desired. */ }
});

// Use one loop: the host's frame loop or scene.start(), not both.
const frame = context.frame(() => scene.update(performance.now()));
context.own({ dispose() { frame.dispose(); return scene.dispose(); } });
```

`reducedMotion` defaults to the browser preference. When true, the assembly is
finished on the first frame, while the final scene and all four views remain.
`autoStart` defaults to true. Embedded scenes do not install a global API or
dispatch global events; the standalone adapter provides `window.amaneHome` and
the existing `amane:home-item` / `amane:home-view` events.

| Method or property | Contract |
| --- | --- |
| `element`, `canvas` | The scene-owned container and WebGL canvas. |
| `listItems()`, `getItem(id)` | Serializable copies of the furniture/plot registry. |
| `getObject(id)` | A local Three.js object for visual integration; never send it over a host message bridge. |
| `getView()`, `setView(mode)` | `exterior`, `walls`, `cutaway`, or `open`. |
| `finishAssembly()` | Finish the entrance animation on the next update. |
| `project([x,y,z])` | `{x,y,depth,ndcDepth,visible,viewport}`. The first two values are local CSS pixels; depth is NDC in `[-1,1]`. `ndcDepth` is an alias. |
| `getCameraPose()` | `{eye:[x,y,z], target:[x,y,z], fov}`. |
| `setCameraPose({eye,target})` | Change the camera and cancel an in-progress view transition. |
| `pickSurface(x,y)` | Local CSS coordinates to `{point,normal,itemId}` or null. This is visual picking, not navigation collision data. |
| `getRendererInfo()` | Frame count, loop state, viewport, pixel ratio and renderer resource/draw counts. |
| `update(timestamp)` | Advance and render one frame, with a monotonic timestamp in milliseconds. |
| `start()`, `stop()` | Start/stop the scene's own loop. Repeated calls are harmless. |
| `resize()` | Measure the container. A ResizeObserver also does this automatically; zero-size containers do not draw. |
| `dispose()` | Idempotently stop, detach and release the instance. Returns a promise that waits for any outstanding mask readback before releasing the renderer. |

## Actor occlusion

The scene does not access a character renderer's pixels. A host can position an
independent DOM character above the canvas, then apply this scene-only alpha
mask to its wrapper:

```js
const mask = await scene.renderActorMask({
  rect: { x, y, width, height }, // Character rectangle in local CSS pixels.
  worldPoint: [worldX, floorY, worldZ], // Character's world feet anchor.
  worldHeight: 1.25 // Same nominal height used to project the Figure iframe.
});
if (mask) {
  wrapper.style.maskImage = `url("${mask.url}")`;
  wrapper.style.maskSize = '100% 100%';
  wrapper.style.maskRepeat = 'no-repeat';
}
```

The result is `{url,width,height,pixelWidth,pixelHeight}`. `url` is a PNG data URL
whose alpha is one in visible areas and zero behind opaque scene geometry.
Width and height retain the input CSS size; pixel dimensions describe the mask
image. Sampling is capped at 512 pixels on the longer edge.

Only one asynchronous GPU readback runs per scene. A concurrent request returns
null, as do offscreen/empty requests and results that finish after disposal.
Keep the previous mask while a newer request is in flight. Refresh when the
actor, camera, cutaway or nearby geometry changes rather than on every frame.

When `worldHeight` is supplied, the pass projects the feet and head and interpolates
depth along screen Y. A seated head is therefore not incorrectly hidden using
the deeper feet depth. Omitting height retains the legacy constant-depth pass.
It excludes the
painted sky, rain, additive effects, water reflection and translucent glass.
Opaque furniture, walls and railing geometry occlude the character; removing a
wall in a cutaway also removes its visual occlusion. The mask is a rendering
aid and must not be used as a collision or pathfinding map.

Glass tinting, reflections of DOM characters and transparent refractive layers
are not synthesized by this pass. They require separate visual treatment if a
host needs those effects.

## Navigation and furniture state

`getNavigationData()` returns a fresh serializable contract with schema/layout
versions, metre coordinates, floor polygons, solid footprints, 40 destinations
and a verified undirected graph. Import the same function from
`src/navigation-data.js` in a Node build; it has no DOM or Three.js dependency.
`node scripts/export-navigation.mjs` writes JSON to stdout (or a supplied output
filename). `scripts/compile-navigation.mjs` rebuilds the graph after spatial edits;
`scripts/check-navigation.mjs` checks every destination and action approach.

The measured footprints and semantic inventory are maintained separately from
rendered meshes. Moving fixed walls or furniture requires updating
`navigation-footprints.js` and the corresponding inventory/action stations before
recompiling the graph. The graph compiler does not remeasure the rendered model.

The physical radius is 0.18 m plus 0.02 m clearance. The 0.445 m planting-bed
aisles require the documented grid phase if a host rebuilds a raster search.
The supplied 82-node graph avoids ongoing grid searches. The pure
`createNavigationQuery(layout)` helper provides `locate`, `surfaceAt`,
`isWalkable` and `segmentWalkable`; use the same circular obstacle inflation.
Walk heights follow the selected floor surface, including the entrance steps.
Cutaway visibility never alters these obstacles. Leaves are visual occluders;
pots and bed frames are physical obstacles. Street shops are outside this map.

`getActionSlots(itemId)` returns the action-specific ground approach, facing
vector `[x,z]`, target and occupancy group. `pose.position` is the character's
feet point; `pose.anchor` is separately labelled as feet, seat or body. The host
must require a compatible existing Figure action before using a seated/lying
pose. Otherwise use `fallback.position` on clear ground. Screen targets must
never become character positions. The legacy catalogue and its old approach
values remain unchanged; the navigation contract contains calibrated stations.
Seat feet placements are calibrated against real cushion tops for a nominal
1.25 m Figure (also recorded as `pose.referenceHeight`). Figure API 2 does not
expose a universal hip joint, so individual packages with very different seated
proportions may need host-side placement refinement.

`pickWalkable(x,y)` accepts scene-local CSS pixels and returns
`{position:[x,y,z],surfaceId}` or null. It rejects furniture, walls, rooftops,
off-canvas positions and floor points without sufficient physical clearance.

`setFurnitureVisuals({ 'living.tv': {power:false} })` applies an idempotent patch.
Supported IDs are `living.tv`, `study.laptop`, `bedroom.bedside` and
`genkan.washer`; each accepts boolean `power`, and the washer also accepts
boolean `running`. Powering off the washer clears running. Unknown fields/IDs
are rejected atomically. `getFurnitureVisuals()` returns a detached snapshot.
The host-state defaults use `on/active` in `defaultFurnitureState`; map these
to `power/running` before applying visual state. With no host state supplied,
the standalone page retains its original lit screens, warm lamp and mature
garden. Task effects, saved progress and plant growth are not owned by these APIs.
