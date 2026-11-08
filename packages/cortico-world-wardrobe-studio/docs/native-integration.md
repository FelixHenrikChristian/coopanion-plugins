# Native wardrobe compatibility · 0.4

This is an **experimental, explicit opt-in compatibility patch**, disabled by default. It is not an official Coopanion World slot. The separate wardrobe and authoring guide remain available without it.

## Behaviour

For a figure with an imported profile, the native wardrobe shows outfits followed by the selected outfit's own controls. Missing combinations are disabled. Unconfigured figures and Coo retain their native controls. Preview, import, removal and theme stay with the original page.

Native selections use the ordinary desktop-pet appearance API and remain selected when the extension is disabled. The separate panel's Apply button retains its own appearance lease/restoration behaviour. Do not operate both simultaneously.

## Supported host

Only the reviewed `cortico-world-desktop-pet@0.2.0` shipped with Coopanion 0.2.17, **and** this exact `web/dress.js` SHA-256, are supported:

```text
b594171051e90e4f368c635b4fd008405f6e41e6dfd3dbd907fdbffa767fbe9f
```

Matching the version number alone is insufficient. Unknown checksums are refused without patching.

## Enable

1. Install 0.4.0, restart Core as required and retain/import your local wardrobe profile.
2. In Wardrobe Studio → Configuration, enter the absolute **web directory of the installed desktop-pet package**, not a figure directory. The extension does not scan the disk.
3. Enable **Native wardrobe compatibility patch**. The loopback port defaults to `17891`; choose another 1024–65535 port if occupied. Save and restart this World.
4. Check its native compatibility status lamp, then reopen the native wardrobe page to clear old module instances.
5. Check outfit/part changes, missing combinations and unchanged controls on other figures.

Before changing the directory or port, disable the World and verify rollback. Then edit configuration, reactivate and reopen the native page. Do not move or overwrite the application installation while the adapter runs.

## Files and connection

The extension writes a private write-ahead backup under its own `wardrobe-studio/native-adapter.json` before changing application files. Do not publish that record. Only three checked locations in `web/dress.js` and three `wardrobe-studio-*.js` helper modules are affected. No figure manifests, animation assets or other application files are modified.

A read-only WebSocket server binds only to `127.0.0.1`. It sends profile metadata and language, verifies the exact desktop-page Origin plus a random token, and provides no commands, filesystem or appearance-writing RPCs. All HTTP requests return 404. CSP is not weakened; no internet scripts, dependencies or models are downloaded. Disconnection restores native rows; an abnormal stale connection has a roughly 6.5-second watchdog.

## Disable, uninstall and recovery

Normal stopping closes the feed, restores the original page only when its checksum still matches the owned patch, and removes only matching owned helpers. Stopping is idempotent. Reopen the native page to confirm the original layout before uninstalling.

A forced process termination can leave the disk patch installed. Loaded pages fall back when the feed goes offline, and the next activation first recovers the previous patch. Disable normally and verify restoration before removing extension files.

If Core cannot start, quit Coopanion first and use your existing Node.js to run the recovery tool inside the installed extension package:

```sh
node src/native-restore.js --data-dir "<World dataDir>" --web-dir "<desktop-pet/web>"
```

The data directory is the parent containing `wardrobe-studio`, not that subdirectory itself. The tool uses the private backup and refuses to overwrite externally changed pages or delete modified helpers. Preserve recovery records after a host upgrade and inspect the new official files before repairing; never overwrite an unknown new version with the old backup. Disable compatibility to continue using the separate panel.

## Verification boundary

Disposable tests cover rollback, repeated stopping, crash recovery, external changes, filename collisions and feed origin/token checks. Real-window acceptance is performed only with permission. Compatibility can break after a host update; this adapter does not claim a general official host hook.
