# Capture Guard

**Personal local use only; public releases discontinued.** Version 1.1.1 is market-blocked for taking over the pet host and replacing window methods at runtime; see the [maintainer notice](https://github.com/FelixHenrikChristian/coopanion-plugins/issues/2). Source is retained for local maintenance, the package is private, and no further public releases, market synchronization or appeal are planned. The native capability or supported interface request is tracked in [Coopanion #723](https://github.com/Pal-AI-Lab/Coopanion/issues/723).

Independent World API 6 extension for Coopanion on Windows. All settings live on this plugin's configuration page. It does not add tray items, native settings controls or model tools.

By default, NVIDIA Instant Replay compatibility is enabled. The pet stays visible normally. A configured screenshot shortcut temporarily hides its window, with a default 10-second timeout; Escape or Enter restores it sooner. A pet already hidden by the user is not shown automatically.

Known limitations: WeChat Alt+A can capture before the window hides, so exclusion is not guaranteed on every capture. A separate DDA-only fixture still appeared in WeChat captures and conflicted with NVIDIA Instant Replay in the tested environment. That experiment was not integrated into this plugin. The online lamp confirms the host connection, configuration acknowledgement and native property readback; it does not prove successful exclusion from every screenshot.

**Normal recordings include the pet in compatibility mode.** This mode never enables a capture-protection flag, avoiding the window protection that can make NVIDIA desktop recording stop. Actual NVIDIA recording must still be tested in the installed environment; the plugin does not enable recording or restart a stopped replay buffer.

Open **World extensions → Capture Guard → Configuration → Include pet in screen captures** to deliberately capture the pet. Turn it off afterward.

Default screenshot chords: PrintScreen, Win+Shift+S, Ctrl+Alt+A, Alt+A, Ctrl+1, F1 and Alt+F1. Change the comma-separated list to match your screenshot tools. Starting a screenshot from an application's mouse menu does not trigger temporary hiding.

If NVIDIA compatibility is disabled, the plugin uses continuous Windows capture exclusion. This keeps the pet visible on the desktop while omitting it from standard captures, but can stop NVIDIA desktop recording.

## Installation

The following instructions are retained for personal local installation. This implementation is not market-compatible; historical public versions are archives.

Extract this package and double-click `install-local.cmd`, then enter the folder containing Coopanion.exe. The installer reuses Coopanion's bundled Node runtime, registers this local World package and backs up the extension manifest and deployment configuration. Restart the Core process once to load the plugin. You can also run `node install-local.cjs <installation-directory> [deployment-id]`.

Use the normal extension manager to enable, disable or remove it; disable it before removal.

## Implementation and verification

It rewrites CORTICO_DESKTOP_PET_HOST in the Core process, launches the original runPetHost through its own entry point, and replaces the window's hide, show and showInactive methods. It does not rewrite installed application source files, but it changes host behavior at runtime and falls under the market's host-modification rule. Runtime files are hard-linked on the same volume or copied across volumes, and never modified through the links.

Native window tests covered temporary hiding before capture, restoration, manual hiding, capture inclusion, listener cleanup and zero protection flags in compatible mode. Injected global-key testing was limited by foreground activation failures. The portable tests exercise shortcut parsing, configuration ownership and isolated lifecycle control files. These are not claims that every version of NVIDIA, WeChat, QQ, Snipaste or PixPin has been tested.

[Coopanion](https://github.com/Pal-AI-Lab/Coopanion) · [Electron capture protection](https://www.electronjs.org/docs/latest/api/browser-window#winsetcontentprotectionenable-macos-windows). License: AGPL-3.0-or-later.
