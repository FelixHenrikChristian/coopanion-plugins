# Make your own character and outfits

This manual is displayed in the extension too. All examples use the wholly fictional Moss Fox. The extension supplies instructions, local profile validation and appearance selection. Image/video generation, matting and figure runtime authoring use separate tools chosen by you.

## [plan] 1. Plan the deliverable and tools

Two deliverables are needed: a working figure pack containing animations, and a wardrobe profile grouping existing schemes. A wardrobe JSON is not a figure pack. Importing it cannot install media or generate an outfit.

1. For an existing character, inventory its figure.json, runtime entry, scheme IDs and motion vocabulary. Add reviewed resources to a private copy. For a new character, first build and test a figure API 2 pack, then group its outfits.
2. Define identity, silhouette, outlines, proportions, camera, intended display size and each outfit's own controls. Moss Fox Trail has cape and footwear; Stargazer has only a visor. List only combinations you intend to produce.
3. Make an action matrix per complete combination: one-shots, loops, directional walk/run, seated holds and declared expressions. Base it on the actual runtime; there is no universal required action count.
4. Inventory available image/video tools, matting tools, GPU memory and disk. Reuse tested environments. Get agreement before downloading large models or changing environments. Privately record package/model versions, locations, disk changes and rollback.
5. Pilot one combination and one short action. Pass raw playback, transparency and actual runtime gates before expanding production.

Recommended private layout (a convention, not an import format):

```text
character-project/
  project.json                 identity, outfit/action matrix, versions
  references/<scheme>/v001.png
  recipes/<scheme>/<action>/v001.json
  raw/<scheme>/<action>/v001.webm
  reviews/<scheme>/<action>/v001.json
  alpha/<scheme>/<action>/v001/000000.png
  staged-figure/               manifest, runtime and reviewed assets
  wardrobe.json               mapping imported by this extension
```

Keep originals and accepted versions. Avoid duplicate complete uncompressed frame caches. Keep personal production projects outside public extension repositories.

## [reference] 2. Approve complete dressed references

Input: approved identity/style references and a complete outfit design. Output: one complete dressed image for every legal combination, plus directional references when needed.

1. Keep a PNG reference master. A portrait canvas such as 768 × 1152 is a starting point, not an extension requirement; match your video workflow. Include all hair, hands and feet with breathing room.
2. Keep camera height, framing, proportions, outlines and shading consistent across combinations. Use a neutral standing pose. Use plain white when it gives clean generation; no floor shadows, captions, watermarks or ground lines.
3. Confirm face/hair identity, limb connections, garment silhouette, accessories and repeated mark orientation. Light fabric needs a visible drawn boundary; distinguish white material from white background. Front/side views must describe the same design.
4. Approve the entire dressed character before animation. Record its version and SHA256. Never replace the approved reference with an old experiment.

Adapt this reference-image prompt:

```text
The same fictional Moss Fox as the approved identity reference: orange fur,
cream muzzle, clean dark cartoon outlines, simple shaded colours and stable
head/body proportions. Wearing the approved leaf-green trail cape and brown
walking boots, with the same cartoon rendering as the character. Full body,
neutral relaxed standing pose, hands and feet visible, fixed eye-level camera,
centered portrait framing, plain white background, no floor shadow or text.
```

Use a clean single complete character as the identity input and a separate motion video for action. A multi-pose collage is unsuitable unless the workflow explicitly supports it.

## [video] 3. Generate one continuous action

Inputs: approved complete outfit image, motion reference and a saved compatible workflow. Output: one continuous raw action video retaining its original image stream and timing.

1. Prepare a fixed-camera motion clip with one whole visible character, clear action/facing/rhythm and a plain white background. Trim irrelevant lead-in/out while retaining the complete action. Match duration, fps and frame count to the actual workflow; do not remove landing or return to idle.
2. In a tested SCAIL-2 workflow, connect the complete dressed image to the character/reference-image input and the motion clip to the action-driving input. Check actual node labels and input previews in the installed version. Save the complete API workflow and pin node/model versions; there is no universally portable node-workflow JSON.
3. With a compatible already validated accelerated recipe, start at 8 steps, CFG=1, shift=1 and compatible acceleration LoRA strength=1. This is a starting recipe, not a guarantee that arbitrary weights are compatible. Do not silently install missing models.
4. Per new action: at most three targeted accelerated versions; then up to two original non-accelerated 20-step versions; consider 40 only after diagnosis. Restore the complete CFG/shift/LoRA recipe when switching. Each new action starts fast. Keep accepted 20/40-step footage.
5. Reference motion specifies type, facing and rhythm. Allow natural trajectory, occlusion and cloth differences. Generate the complete dressed moving subject continuously. Do not construct the outfit body using independent frame images, texture swaps, optical-flow transport or simple stretching.

Adapt this motion prompt:

```text
The same fully dressed Moss Fox throughout: same face, fur, cape, boots,
clean cartoon outlines and proportions. Perform one friendly wave following
the reference rhythm: neutral standing, raise one forearm, wave naturally,
lower the arm and settle back into the same neutral stance. Fixed camera
and scale, full body visible, plain white background. Cape follows the
shoulder naturally; hands stay intact and connected to the arms.
```

Record workflow, model/LoRA hashes, prompts, reference hashes, seed, steps, CFG, shift, size, fps, frame count, elapsed time and retry reason. 512 × 768 at 24 fps is a workflow choice, not a wardrobe-import rule. Follow the actual model's frame-count constraints.

## [review] 4. Accept complete raw playback

1. Watch each entire clip at normal and half speed. For loops, play at least three consecutive cycles at each speed. Use intended pet size first and a larger diagnostic view when needed.
2. Check identity, outfit design/colour, proportions, connected hands/feet, occlusion, intact body/fabric, flicker, abnormal colour patches, stable camera/background and natural start/end. A wave returns to its intended idle; a jump includes landing; walking has the correct facing.
3. Write concrete pass/fail observations for both speeds and loop joins. A still, contact sheet or automatic score cannot fill playback fields. Unwatched clips remain pending.
4. Diagnose before retrying: check identity/motion inputs, masks when used, node compatibility and prompts, then adjust the relevant cause or seed within the retry budget. Keep difficult actions separately pending rather than substituting the wrong motion.

Example private review record (a project convention, not an extension schema):

```json
{
  "scheme": "trailleafboots",
  "action": "wave",
  "version": "v001",
  "sourceSha256": "<actual 64-hex SHA256>",
  "width": 512,
  "height": 768,
  "fps": 24,
  "frameCount": 73,
  "loop": false,
  "normalSpeed": {"result": "pending", "observation": ""},
  "halfSpeed": {"result": "pending", "observation": ""},
  "loopJoin": {"result": "not-applicable", "observation": "one-shot"},
  "decision": "pending"
}
```

Read metadata from the actual file; do not copy the example values. Hash-check transfers. Preserve accepted raw originals at their original resolution, rate and complete duration before making alpha assets.

## [matte] 5. Propagate transparency locally

Input: accepted raw video. Output: temporally stable alpha retaining original character RGB, plus complete playback proof on contrasting backgrounds.

1. Decode at source presentation times. A confirmed constant-rate clip must not gain invented or resampled frames. For variable-rate sources, preserve timestamps or deliberately convert to a documented constant rate and recheck motion.
2. For clean near-white cartoon footage, first try border-connected white-background removal, then classify enclosed light regions separately. Use a compact video model such as SAM2 tiny only as a rough identity/protection prior, not the final ink outline. See the bundled [white-background recipe](white-background-matting.md) and optional offline helper.
3. Protect light material as foreground and mark enclosed limb gaps as background. Foreground locks must not overrule a confirmed background gap. Dark outlines help connectivity but compression, antialiasing or motion blur can open them; inspect leakage warnings and ambiguous components. Threshold values are starting parameters, not universal constants.
4. Use the same settings and source canvas throughout the clip; do not repaint or redraw the subject independently on each frame. A deterministic per-frame key is not a temporal-consistency guarantee. Where connectivity is unreliable, correct protection/background masks at appropriate keyframes and propagate them with an existing verified video tool. Do not average unregistered moving alpha masks, which can create ghost limbs.
5. Preserve original opaque RGB and original drawn ink. Only the narrow mixed edge may need white-spill unmixing. Do not routinely repair a bad mask with synthetic thick strokes, global sharpening, blur or garment recolouring. Recheck raw versus alpha composited onto white to locate processing damage.
6. Save lossless RGBA PNG, or lossless WebP only when the target runtime is verified to decode it, on the same canvas with consistent numbering, frame count and timing metadata. Use a consistent alpha convention, normally straight alpha. JPEG cannot store transparency. Do not auto-crop or recenter every frame independently.
7. Play the complete composite against dark grey, saturated purple/green and checkerboard backgrounds at normal and half speed, plus loop joins. Inspect background islands, missing fabric, halos, edge flicker, limb gaps and position stability. A first mask/contact sheet is insufficient.

Optional extraction command for a confirmed constant-rate source; FFmpeg is a separate prerequisite. Create the destination directory first:

```sh
ffmpeg -i raw.webm -fps_mode passthrough frames/%06d.png
```

This only extracts RGB; it does not remove backgrounds. Keep one working frame cache and accepted RGBA masters rather than duplicating full sequences for every preview.

## [runtime] 6. Build a working figure pack

RGBA frames and wardrobe JSON do not animate by themselves. Adapt an existing compatible body's documented clip map in a private copy, or implement and test the installed figure API for a new character.

The figure API 2 factory contract is:

```text
exportedFactory(base, { model, scheme, kit, loadImage, asset, host })
  -> body with required step(dt), layout(), do(word)
```

The host loads figure.json entry and invokes its named export, supplying an asset resolver and drawing root. Declare only actually implemented words. Walking additionally needs the host's walk/stop, layout and event behaviour; drawing methods alone do not implement locomotion. Check current figure-frame.js and kit/body.js contracts for a new runtime.

Directory and manifest scaffold, not a finished animated body:

```text
forest-fox/
  figure.json
  figure.js             implements/export createFoxBody
  model.json            your runtime's clip map, if used
  thumbs/trail.png
  thumbs/rain.png
  clips/<scheme>/<action>/000000.png
```

```json
{
  "manifest": 2,
  "api": 2,
  "id": "forest-fox",
  "version": "1.0.0",
  "name": {"en": "Moss Fox", "zh": "苔星狐"},
  "about": {"en": "A fictional cartoon forest fox.", "zh": "虚构的森林狐狸。"},
  "entry": "figure.js",
  "export": "createFoxBody",
  "model": "model.json",
  "thumb": "thumbs/trail.png",
  "axes": [{
    "id": "appearance",
    "name": {"en": "Appearance", "zh": "完整外观"},
    "options": [
      {"id": "trailleafboots", "name": {"en": "Trail"}, "thumb": "thumbs/trail.png"},
      {"id": "rainupgold", "name": {"en": "Rain"}, "thumb": "thumbs/rain.png"}
    ]
  }],
  "vocab": [],
  "can": {"walk": false}
}
```

The scaffold deliberately declares no completed actions. Add real vocab and walk capabilities after implementation. model.json is runtime-specific data, not a universal host video-manifest format. MP4/WebM playback is not guaranteed by the sandbox: check its CSP/asset policy or use image assets with a tested compatible runtime. Keep modules/assets in the pack; avoid external CDNs.

Apply one fixed whole-character uniform transform per clip and a consistent floor anchor. Connect side-facing walk/run to actual horizontal translation. Check both directions, short/long movement, entry/stopping, turning, landing, sit/rise and outfit switches. Never auto-crop or recenter individual frames.

Measure the accepted original character's visible height and foot baseline at the intended host scale; do not equate canvas height with character size. Calibrate the new neutral state against those measurements. Preserve intended jump displacement rather than normalizing every frame. If the stock idle breathing transform is removed by a custom renderer, implement one connected, foot-anchored replacement with the original amplitude/rhythm; do not apply breathing twice or over already-moving footage.

Moving clips retain native faces unless a separately verified temporal face method is available. Idle/seated expressions require pose-specific measured anchors and review of every declared expression. Registering names is not proof of visual coverage.

Store pose-local face rectangles, landmark/matrix conventions, eye/mouth selections and occlusion limits with the source hash. If only alpha changes and the raw source/coordinates are identical, reuse verified expression geometry instead of re-detecting it independently. Rebuild clean bases from the newly matted body and transfer only the approved facial editing region; do not paste an old full-body base or bring its dirty alpha back. Check expression switches, small display scale and moving face attachment in playback.

Install the staged figure with the host importer and verify it in the actual pet. It must appear in the local figure list and play each intended scheme before you import the wardrobe mapping in the JSON format section.

## [release] 7. Import, organize and hand off

1. Keep approved references, complete workflows, raw sources, hashes, generation time/cost and actual playback observations. Keep failed versions compact with defect/retry reasons.
2. Verify the staged figure in the actual sandbox before replacing an installed copy. Preserve the old pack and appearance settings; use a reversible staged installation. Never silently rewrite built-in packs.
3. Create schema=1 wardrobe JSON. figure is the installed pack ID; each variant points to an existing scheme. Check configuration before Import. This checks structure/IDs, not visual approval or complete animation coverage.
4. Test each outfit's controls, supported combinations, Apply, outside native choices, Restore, disable and reactivation. Before uninstalling, Restore and verify while the pet service is available.
5. Hand off accepted raw/alpha assets, working figure pack, local wardrobe JSON, coverage matrix and rollback note. Keep personal references/profiles outside public extension repositories.
6. Public releases contain generic code/docs and wholly fictional examples. Audit the exact npm archive and Git history for private character/outfit names, media, machine paths, credentials, cloud addresses and chats. SHA256-check transfers. Guidance describes requirements; production observations establish acceptance.
