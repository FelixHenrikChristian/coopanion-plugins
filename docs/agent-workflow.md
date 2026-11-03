# Character and outfit authoring · `src/guide.js`

This guide supplies a staged production workflow. Wardrobe Studio itself does not generate images or videos, install packages, download models, run a cloud job or inspect conversations. An agent uses tools explicitly made available by the person doing the work.

## 1. Define the deliverable

Read the target figure API and vocabulary. Inventory existing animation and generation tools. Agree character identity, style, proportions, camera and intended on-screen size. Define each outfit's own controls and the complete combinations with animation resources. Use a fictional character or references the person is entitled to use.

Create a private project with a source manifest, environment/install inventory, generation recipes, raw clips, playback reviews, alpha sequences and a staged runtime package. Keep public extension code separate. Model weights and caches remain in their tool directories; record their locations privately instead of copying them into every project.

## 2. Approve complete dressed references

Approve a complete character reference for every legal outfit combination. Keep the same identity, proportions, camera, outlines and material rendering. Check both front and directional views when actions require them. Light fabrics need an identifiable boundary. Accessories and repeated marks must have a consistent orientation and perspective. Use a plain white background if it gives stable generation and cleaner character appearance.

For the fictional Moss Fox, a trail outfit can have cape colour and footwear; a rain outfit can have hood position and raincoat colour; a stargazer outfit can have a visor position. These groups belong to different outfits.

## 3. Validate one continuous action

Use the full dressed reference plus an action video. The action reference specifies action type, direction and rhythm. Natural changes in trajectories and cloth motion are acceptable. Use continuous video generation for the complete moving outfit. Pilot one short action and review it before expanding the action list.

Reuse an already validated accelerated recipe. A working SCAIL-2 configuration uses 8 steps, CFG=1, shift=1 and a compatible acceleration LoRA at strength=1. Keep the exact model and node versions with the recipe. For each new action, allow at most three targeted accelerated versions, then at most two original non-accelerated 20-step versions; consider 40 steps after diagnosing remaining problems. Restore the full CFG/shift/LoRA configuration when changing recipes. Every new action starts with its fast recipe; accepted footage remains reusable regardless of its step count.

Keep retries purposeful: record the visible defect and change the prompt, seed or input that addresses it. Mark unresolved actions separately and continue other actions within the agreed compute budget.

## 4. Gate on complete video playback

Watch each complete raw video at normal and half speed. For loops, watch at least three consecutive cycles at both speeds. Check identity, outfit, proportions, limb connections, occlusion, missing body/fabric, flicker, abnormal colour regions, stable camera/background and natural start/end states. Assess at intended display size, with a larger view available for diagnosing visible problems.

A review record contains source SHA256, resolution, frame rate, frame count, version, parameters, elapsed generation time, both playback checks, loop checks where relevant, a concrete observation and pass/fail. A still or automated score cannot fill the playback fields. Obtain user review when required by the task before expanding production.

## 5. Propagate reviewed transparency locally

After raw footage passes, form and visually inspect a first-frame object mask. A compact local workflow uses SAM2 tiny for the initial proposal, explicit positive/negative corrections and GrabCut on that mask, then MatAnyone2 for temporal alpha propagation. Preserve the original RGB.

Inspect enclosed background gaps around limbs independently from light garments. White material must remain opaque. Where playback reveals a specific missing garment area, correct alpha inside the verified source boundary. Preserve the preceding alpha/version so the correction is reversible.

Composite the entire clip against dark and saturated backgrounds and repeat normal, half-speed and loop reviews. Save lossless RGBA output plus compact review videos. Avoid accumulating multiple complete uncompressed frame caches. Downloading or installing large new tools requires the person's agreement.

## 6. Integrate motion and declared expressions

Give each clip a fixed whole-character uniform coordinate transform and stable ground anchor. Connect side-facing locomotion to actual horizontal translation. Validate left/right facing, long/short movements, entry, stopping, neutral recovery, turns, jump landing, sit/rise and outfit switches.

Declare expression support per pose. Moving video keeps its source-native face unless a temporal face method has separately passed playback review. Standing and seated holds can use features from their own pose with measured fixed anchors. Review every declared expression for every outfit and supported pose. The acceptance manifest records missing coverage instead of treating registration as visual approval.

## 7. Package and verify

Validate self-contained script/image imports under the real figure sandbox and its content policy. Verify files and transferred raw footage by SHA256. Stage and validate a package before switching it into use; keep an intact previous version and prior appearance settings. Check the actual runtime rather than only standalone media.

For this wardrobe extension, create a local profile mapping existing complete schemes. Figure files remain unchanged. The profile is not included in the public extension release.

## 8. Publish generic tooling

Publish reviewed source, generic documentation and wholly fictional demonstrations. Inspect the exact npm archive and the repository history. Exclude private character/outfit names, reference sources, user images/videos, local paths, machine names, account details, credentials, cloud addresses, chat exports, generation logs and personal profiles. Keep only a private note linking production evidence to the generalized workflow.

The authoring guide is guidance, not evidence that a generated asset has passed any gate. The production record must contain the actual observations.
