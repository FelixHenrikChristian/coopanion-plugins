# Appearance ownership and lifecycle · `src/bridge.js`, `src/store.js`, `src/index.js`

Wardrobe Studio reads a local desktop-pet HTTP service at a configurable loopback origin. Runtime requests use only `/api/figures`, `/api/state` and `/api/skin`. The state response is reduced to appearance data before it is returned by the extension. The extension opens no listening service in production and makes no internet request. The optional development preview listens on loopback and uses fictional data.

## What changes

Importing a profile writes `wardrobe-studio/profiles.json` under the extension's supplied data directory. Applying a combination uses the desktop pet's standard appearance API; this changes its selected figure/scheme as an ordinary wardrobe selection does. It never edits the original figure manifest, assets, code, other extensions or the application.

Before the first change, a write-ahead lease saves the previous figure/scheme and intended change to `wardrobe-studio/lease.json`. Subsequent changes owned by this extension retain that original restoration target. Requests are serialized. Other skin preferences are read afresh and preserved.

## Stop, disable and uninstall

The Restore button and World `stop()` compare the current figure/scheme with the last appearance owned by the extension. If they still match, only the original figure/scheme are restored. A different appearance chosen elsewhere is preserved. The result is verified through the desktop service.

The standard uninstall sequence is: Restore, disable the World, then uninstall it from World extensions. Normal stopping also attempts restoration. The resulting figure remains a standard installed pack with no dependency on this extension. Cortico may retain the extension's own configuration and local profiles; they do not alter original figure data.

If the process is forcibly killed, the desktop service is unavailable during shutdown, or the previous figure has been removed, automatic restoration cannot be guaranteed. The lease remains for recovery on the next activation, and restoration problems are reported in the panel and shutdown verification. Restore while the desktop service is available before uninstalling. Retained schemes are existing valid schemes, so removing the extension does not make the original figure unloadable.

The desktop API has no compare-and-swap contract. Ownership is checked immediately before restoration, but simultaneous writes from another client cannot be made atomic by an external extension. Avoid changing the same appearance from two panels at the same instant.

The extension stores neither full desktop state nor conversation content. It does not read user media, references, secrets or screen contents. The authoring guide uses generic text and a wholly fictional example.
