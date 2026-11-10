# Appearance ownership and lifecycle · `src/bridge.js`, `src/store.js`, `src/index.js`

Wardrobe Studio reads a local desktop-pet HTTP service at a configurable loopback origin. Runtime requests use `/api/figures`, `/api/state`, `/api/skin` and read-only thumbnail assets declared by installed packs. Thumbnail URLs must remain within the same loopback origin and pack asset directory; redirects are rejected, image MIME types are restricted and responses are limited to 2 MiB. The state response is reduced to appearance data before it is returned by the extension. The extension makes no internet request. When explicitly enabled, the [native compatibility adapter](native-integration.md) opens a read-only, origin/token-checked loopback WebSocket feed; otherwise no listening production service is opened.

## What changes

Importing a profile writes `wardrobe-studio/profiles.json` under the extension's supplied data directory. Applying a combination uses the desktop pet's standard appearance API; this changes its selected figure/scheme as an ordinary wardrobe selection does. Figure manifests and animation assets are never edited. The optional native adapter writes a backup and temporarily patches only the documented native page files; it is not an official host hook.

The extension defaults to Chinese independently of the host language. Its Chinese/English selector stores only `{language}` in its own `wardrobe-studio/preferences.json`, shared by both panels and retained across restart. It does not change the host language, profiles or appearance. Imported names remain user-provided text. Switching panel language preserves the pending outfit selection and JSON draft.

Before the first change, a write-ahead lease saves the previous figure/scheme and intended change to `wardrobe-studio/lease.json`. Subsequent changes owned by this extension retain that original restoration target. Requests are serialized. Other skin preferences are read afresh and preserved.

## Stop, disable and uninstall

The Restore button and World `stop()` compare the current figure/scheme with the last appearance owned by the extension. If they still match, only the original figure/scheme are restored. A different appearance chosen elsewhere is preserved. The result is verified through the desktop service.

The standard uninstall sequence is: Restore, disable the World, then uninstall it from World extensions. Normal stopping also attempts restoration. The resulting figure remains a standard installed pack with no dependency on this extension. Cortico may retain the extension's own configuration and local profiles; they do not alter original figure data.

In native compatibility mode, ordinary native selections are not leased by this extension: they remain selected after stopping. The adapter closes its feed and conditionally restores its owned page files on stop. Verify rollback before uninstalling. Forced termination, external page edits and host upgrades require the recovery procedure in the native integration guide; unknown files are never overwritten automatically.

If the process is forcibly killed, the desktop service is unavailable during shutdown, or the previous figure has been removed, automatic restoration cannot be guaranteed. The lease remains for recovery on the next activation, and restoration problems are reported in the panel and shutdown verification. Restore while the desktop service is available before uninstalling. Retained schemes are existing valid schemes, so removing the extension does not make the original figure unloadable.

The desktop API has no compare-and-swap contract. Ownership is checked immediately before restoration, but simultaneous writes from another client cannot be made atomic by an external extension. Avoid changing the same appearance from two panels at the same instant.

The extension stores neither full desktop state nor conversation content. It reads only the installed pack thumbnail selected for panel display; it does not scan user media, references, secrets or screen contents. The authoring guide uses generic text and the authorized public Lulu example.
