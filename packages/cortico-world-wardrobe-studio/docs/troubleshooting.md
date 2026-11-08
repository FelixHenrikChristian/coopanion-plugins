# Troubleshooting

## Panel cannot load an old client.js after upgrade

If the error names an old versioned extension URL but Core has a newer loaded package, an already open settings page may retain the old provider manifest. The old asset URL correctly returns 404 after upgrade; this does not by itself indicate corrupt profiles or missing figure media.

1. In a browser, reload the complete Core page, not only the panel's own Refresh button.
2. In the native app, close the settings window and reopen Settings from the tray or pet menu. This recreates the page; closing this window leaves Core and the desktop pet running. Reopening the application executable may only show the pet, so use its actual Settings command.
3. If it persists, check the installed/loaded package version in World extensions, service connectivity and availability of its current client asset. Record the old/new URLs and error, without publishing personal configuration.

The extension cannot execute its own repair button when its JavaScript module has not loaded. Do not delete profiles, rewrite the host, or clear all application data to resolve a stale page. The native Ctrl+R shortcut may not reload the embedded page.

## Pet offline / image preview missing

Check the configured loopback desktop service and restart this World after changing its address. Preview images must be declared by the selected installed pack, remain within its asset directory, and be valid supported images below 2 MiB. Missing previews do not create missing animation assets.

## Imported mapping passes but animation is incomplete

Profile validation checks syntax, option references and installed scheme IDs, not the runtime's complete clip/expression coverage or visual quality. Finish the figure pack and its normal/half-speed playback checks. Importing JSON alone cannot repair a body or invent a new outfit.

## Restore cannot finish

Keep the desktop service and previous figure available, then use Restore. Normal disable restores only the appearance still owned by this extension and preserves an outside selection. Forced shutdown or unavailable services can defer recovery to the next activation. Verify restoration before uninstalling; do not manually erase the recovery journal as a first step.
