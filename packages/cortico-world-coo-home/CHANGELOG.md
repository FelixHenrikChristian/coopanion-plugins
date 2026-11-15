# Changes

## 0.4.0 — first public release

- Align seated and lying figures to each furniture support surface using the visible artwork bounds; keep a small clearance and preserve foreground occlusion.
- Use concrete activity labels such as looking at the computer, switching on the television and opening the wardrobe.
- Highlight the hovered interactive object with a local outline, without adding a full-screen rendering pass.
- Replace custom settings screens with native Coopanion Configuration and Environment Prompt pages, including live template variables; keep the prompt out of the desktop conversation.
- Add a harvest backpack with eight crop icons and persistent quantities derived from completed harvests. No selling, shopping or cooking economy yet.
- Publish illustrated documentation and fresh authorized Lulu activity screenshots, with the neighborhood panorama first.
- Retain the approved scene, independent home chat, crop selection, camera follow and lightweight offline life.

## 0.4.0-alpha.6 — home controls and reliable garden plans

- Separate Home, Settings and Environment into native World pages; keep configurable environment text private to home conversation and AI planning.
- Send chat with Enter, insert a newline with Shift + Enter, and preserve input-method composition.
- Refresh controls with lightweight DOM and SVG components, without blur filters or additional rendering loops.
- Make mouse commands interrupt current work and remaining plans; remove the manual queue checkbox while retaining ordered tasks for conversational plans.
- Handle nullable optional arguments in strict Responses tool calls, keep unknown or invalid arguments rejected, and declare the compatible strict schema on the wire.
- Add bounded, durable `gardenPlan` requests for sowing and first watering across up to eight beds. Skip occupied or already growing crops, preserve idempotent receipts, and distinguish accepted plans from completed work.
- Record fixed harvest quantities per crop in save format 4. Preserve older planting progress and harvest counts without inventing historical quantities.
- Open crop inspection in a separate, live details dialog without starting an activity; include growth times, expected yields and recorded harvests.
- Add camera follow for the home character and preserve the current camera when switching wall visibility. Keep the approved scene artwork.

## 0.4.0-alpha.5 — object actions and selectable crops

- Keep the figure's projected size stable across viewing angles while preserving zoom and furniture occlusion.
- Place separate action bubbles beside the selected object, following the camera and avoiding viewport edges.
- Start new gardens with eight empty beds; choose any existing crop with its growth time, then change crops after harvest. Preserve real planting progress when migrating old saves.
- Reuse the existing crop models, trellises and labels in each bed without changing the neighborhood's design.
- Fix immediate rejection by OpenAI Responses-compatible services: local chat receipt IDs are no longer sent as provider message IDs. Existing conversations continue without clearing history.
- Classify provider HTTP failures safely and verify requests through the official Responses adapter against an isolated strict endpoint.

## 0.4.0-alpha.4 — conversation, voice and desktop bridge

- Add independent, persistent home conversation using the host's selected provider, model specification, read-only personality and native SDK authentication.
- Execute validated home tools through cancellable bounded model turns; preserve accepted tasks and let newer user commands supersede stale chat actions.
- Add optional AI plans with durable request budgets and manual priority; keep local daily routines available without model calls.
- Expose the `coo_home` tool to desktop conversation and send deduplicated garden summaries with cooldown and separate wake-up limits.
- Follow current voice settings and declared audio through a restricted local proxy. Own the audio context, stop when hidden and dispose on unmount.
- Add a collapsible conversation/settings panel while preserving the approved scene and existing character assets.

## 0.4.0-alpha.3 — gardening milestone

- Add sowing, watering, growth and harvesting to the eight existing plots, with 30–90 minute crop cycles and no economy or withering.
- Preserve the mature garden on first use and migrate earlier household saves without clearing life progress.
- Complete garden effects only after arrival and activity; validate queued actions against their planting cycle and reject duplicate harvests.
- Continue growth in the background and on offline catch-up; pause freezes both life and crop progress.
- Keep beds, trellises and the original mature plants intact. Update existing plant instances and soil wetness without rebuilding the scene.
- Show plot stages, available actions and harvest totals in the existing interaction menu. Local autonomy can water sown plots; sowing and harvesting remain explicit choices.

Independent conversation, voice, optional AI planning and selected desktop reports remain later milestones.

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
