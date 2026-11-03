# Wardrobe Studio development

Keep this repository free of deployment data, personal character media, conversation exports, credentials, machine-specific paths and private project examples. Use wholly fictional examples. Runtime data belongs outside the repository.

Run `npm run describe`, `npm run check`, `npm test` and `npm run pack:check` before a release. Review the exact package archive and Git history. Use isolated temporary deployments and loopback fixture servers for tests; do not change a person's running Coopanion or its figure files to verify a patch.

Preserve the World API 6 panel contract. Write panel DOM only inside the panel root, clean up listeners on unmount, and scope panel styles to `.ws-root`. The explicitly requested native integration is a separate, opt-in compatibility adapter: checksum-gated native outfit rows only, write-ahead backups and conditional rollback. Never patch unrelated pages, weaken CSP, modify figure assets, or silently enable the adapter in another deployment. Test against disposable fixtures before an authorized live installation.

Keep UI and documentation available in Chinese and English. Tool descriptions are English. Bundled bilingual documents are the guide's content source; `src/guide.js` loads only its fixed package documents so the panel, tools and published manual agree. Record actual acceptance evidence separately from guidance.

Commit only explicit paths. Publishing, opening a market synchronization issue and changing a running deployment require the person's instructions. Keep the runtime free of model downloads, media generation jobs and arbitrary file/command access.
