# Wardrobe Studio development

Keep this repository free of deployment data, personal character media, conversation exports, credentials, machine-specific paths and private project examples. The owner-authorized Lulu wardrobe profile and four approved preview stills are public examples. Other private material remains outside this repository. Runtime data belongs outside the repository.

Run `npm run describe`, `npm run check`, `npm test` and `npm run pack:check` before a release. Review the exact package archive and Git history. Use isolated temporary deployments and loopback fixture servers for tests; do not change a person's running Coopanion or its figure files to verify a patch.

Preserve the World API 6 panel contract. Write panel DOM only inside the panel root, clean up listeners on unmount, and scope panel styles to `.ws-root`. The owner chose the independent-panel-only design in 0.6.0. Never restore host-page patching, native adapters, helper injection or host directory/port settings. Use the documented loopback appearance API; keep all file writes in the extension data namespace.

Keep UI and documentation available in Chinese and English. Tool descriptions are English. Bundled bilingual documents are the guide's content source; `src/guide.js` loads only its fixed package documents so the panel, tools and published manual agree. Record actual acceptance evidence separately from guidance.

Commit only explicit paths. Publishing, opening a market synchronization issue and changing a running deployment require the person's instructions. Keep the runtime free of model downloads, media generation jobs and arbitrary file/command access.
