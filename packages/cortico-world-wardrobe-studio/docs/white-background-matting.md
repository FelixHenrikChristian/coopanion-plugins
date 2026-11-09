# White-background cartoon matting

This is an offline authoring recipe, not a new World capability. It assumes an already accepted continuous video on a nearly uniform white background, visible drawn boundaries and a reviewed rough foreground prior. It is unsuitable as a universal key for arbitrary footage.

## Decision order

1. Decode original frames without resizing, cropping, recentering or losing presentation times. Work from raw RGB, not an earlier sharpened or repainted cutout.
2. Identify near-white candidates by brightness **and** channel spread. Starting values in the helper are minimum channel235 and maximum channel spread18, on uint8 RGB. Inspect your actual source before adjusting. Use four-connected white regions to avoid diagonal corner leaks.
3. Remove white components that touch the image border. Check their overlap with the old foreground core: a large overlap may mean a broken drawn boundary, a poor old mask, or light material connected to outside. It is a warning, not proof of either interpretation.
4. Inspect enclosed white components separately. Keep verified cream fur, light fabric and highlights; remove verified holes between limbs and the body. A rough video mask is one clue, not ground truth. The helper keeps intermediate-overlap components for review instead of blindly deleting them.
5. For a verified leak, supply a positive protection mask that blocks the exterior flood, or background marks selecting a genuinely empty enclosed near-white region. Positive/negative masks must match the original canvas and must not overlap. Do not expand a protection mask across an actual background gap. Propagate corrected masks with the chosen video tool, not independent image generation.
6. Keep original opaque pixels unchanged. Only a narrow neutral antialias fringe adjacent to an actual dark boundary uses analytical white-background unmixing. Do not add replacement strokes or apply a whole-body foreground-colour solver by default.
7. Save alpha with exact source geometry/timing; retain the original raw file, settings, helper hash, corrections and output hashes. A colour key does not guarantee temporal consistency. Watch the result before proceeding.

## Optional helper

`docs/tools/matte_connected_white.py` contains a deterministic NumPy/OpenCV implementation and a single-frame command-line entry point. It does not install dependencies, access the network, scan a deployment or run from the World process. Review its source and run it in a project-local environment with NumPy, OpenCV and Pillow; use an existing environment first. Record any additional install and rollback. No model weights are needed by this helper; generating a rough prior is a separate step.

```sh
python docs/tools/matte_connected_white.py --image raw/000000.png --prior masks/000000.png --output alpha/v002/000000.png --report reviews/000000.json
```

For corrections, additionally supply `--protect corrections/keep.png` and/or `--background corrections/remove.png`. These are grayscale masks: zero means unmarked, nonzero means the selected correction. RGB input and all masks must have identical width/height. The prior is uint8 grayscale,0 background to255 foreground. Output is a new lossless RGBA PNG in straight-alpha convention. Existing destinations and source overwrites are refused. The helper does not handle video decoding, source fps, timestamps or playback review for you. In Python, `remove_white_background` returns RGBA, diagnostics and a colour-coded inspection image for a caller-controlled video pipeline.

Diagnostics distinguish exterior white, enclosed background, protected white, ambiguous areas and exterior/old-core disagreement. Large or garment-adjacent warnings require inspection/correction. Small warning counts do not prove visual quality. No universal warning threshold certifies an action.

## Required playback gate

Use one source clock to compare **raw / previous matte / new matte** at matching frames. Play every complete action at normal and half speed. Test actual loop subsequences and their joins for at least three cycles at each rate, not just the full file wrap. Check dark, light, saturated and checkerboard backgrounds. Also recompose onto white to compare the original ink and light material. Opaque RGB can remain identical even while a wrong alpha deletes fabric, so check both channels.

Review fingers, face-adjacent gaps, folds, revealed interior spaces, foot contours and start/stop transitions. Avoid fixing flicker by averaging unregistered moving masks; that can smear hands and fabric. Correct the source of changing region decisions or a bad protection prior first. Mark unseen or unresolved clips pending; contact sheets, hashes and metrics are diagnostic, not playback acceptance.

## Efficient handoff

Pilot one short action before batch work. Preserve accepted raw videos, previous accepted outputs and a compact version/retry record. Use one working frame cache and bounded workers; do not repeatedly download models, regenerate accepted footage or save every diagnostic frame. Keep personal assets/configurations outside this package. Validate frame counts, dimensions, fps/timing, hashes, original visible scale, foot baseline, expression alpha and runtime transitions before a reversible installation.
