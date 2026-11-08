# Changelog

## 0.4.0

- Add an opt-in native wardrobe compatibility adapter for the checksum-verified desktop-pet 0.2.0 page: outfits followed by outfit-specific controls.
- Keep standard native appearance persistence, Coo/unconfigured figures, preview and import/removal flows.
- Back up before patching; restore on normal stop, recover interrupted installation and refuse overwriting external changes.
- Use an origin/token-checked, read-only loopback feed without weakening CSP or modifying figure resources.
- Document supported versions, explicit configuration, uninstall/recovery and the distinction from an official host API.
- Refresh bilingual project documentation and make the GitHub README English by default.

## 0.3.0

- Default to Chinese with a shared, persistent Chinese/English panel selector; preserve pending choices and JSON drafts when switching.
- Add a detailed bilingual manual with reference/motion prompts, raw video gates, temporal matting steps, figure runtime requirements and import troubleshooting.
- Add full field tables, complete fictional profiles and a downloadable JSON Schema.
- Add read-only configuration checks, local installed-ID inspection and example/manual downloads in the panel.
- Enforce the profile limit in UTF-8 bytes, including pasted input.

## 0.2.3

- Follow the host theme with a dotted preview stage, compact outfit cards and horizontal option rows.
- Show read-only thumbnails from the selected local figure pack, with origin/path and size restrictions.
- Add isolated preview-asset security tests and responsive layout verification.

## 0.1.1

- Set an explicit root width for flex-based World panel hosts.
- Verify the packaged panel against the actual Core extension service.

## 0.1.0

- Separate wardrobe panel with outfit-specific options mapped to existing figure schemes.
- Local profiles, validated resource combinations and write-ahead appearance recovery.
- Staged continuous-animation authoring guidance for people and agents.
- Fictional preview and isolated lifecycle tests, without runtime package dependencies.
