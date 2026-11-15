# Changes

## 0.4.0-alpha.2 — household life milestone

- Add independent household tasks, collision-aware walking, furniture menus, manual priority, queues and local autonomous routines.
- Save progress atomically in a dedicated directory, recover interrupted writes, and refuse to overwrite newer or corrupt saves.
- Continue simplified background activity and bounded offline catch-up without rendering or model calls.
- Control the TV, laptop, bedside light and washer indicators through explicit scene state.
- Animate movement with existing Figure motions, keep sandbox feet anchored to the world path, and use safe ground fallbacks for unavailable seated poses.
- Correct upright character depth occlusion and calibrate supported seating heights without changing the approved neighborhood artwork.

Gardening, independent conversation, voice and selected desktop reports remain later milestones.

## 0.4.0-alpha.1 — foundation milestone

- Start a new implementation using the approved Amane neighborhood source imported with its published history.
- Separate the World page lifecycle from standalone HTML, and isolate the home's Figure API 2 instance from the original desktop pet.
- Add read-only selected-appearance observation and local depth-mask composition.
- Limit visible World rendering to 60 FPS without lowering resolution; stop rendering while hidden.
- Verify with neutral fixtures in both the browser and an isolated official Coopanion Core, console and Figure API frame.
- Keep all installed character data and private media outside source and release artifacts.

This is a development milestone, not a claim that household simulation, gardening, model integration or desktop reports are complete.
