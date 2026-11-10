# Release package · `package.json`, `scripts/check-package.mjs`

This is an independent third-party World, not an official Coopanion component. Its package declares World API 6 and the `cortico-world` discovery keyword. It has no runtime npm dependencies or install scripts. Node.js 22 or newer is required. The `experimental` tag reflects the limited compatibility test matrix of the initial release.

## Prepare

```sh
npm run describe
npm run check
npm test
npm run pack:check
npm pack --ignore-scripts
```

Review the exact archive content, the authorized Lulu preview screenshots, and the Git history before publication. Runtime deployment profiles belong outside this repository. Add the chosen public repository, homepage, issue URL and publisher attribution to `package.json` before publishing. Follow the project's chosen license and review asset rights.

For an upstream checkout with the official tooling available, also run `pnpm check:extension <package-directory>` and compare the exported description. This package's local checks verify its interface shape and behavior; they do not claim to replace the official checker or a real host installation test.

## GitHub and npm

Create a public repository containing only this clean source tree, with no private production history. Publish the npm package after signing in to the intended npm account and completing its required authentication. Never put a token in source, logs or an issue.

The World can first be installed from a local folder or Git source in Coopanion's manual extension installer. Installing/activating a new World normally requires restarting the Core process; coordinate that with the person using the running application.

## Market

The [extension documentation](https://github.com/Pal-AI-Lab/Cortico/blob/main/docs/extensions.md) describes npm keyword discovery. The [official index](https://github.com/Pal-AI-Lab/cortico-extensions) supplies market metadata separately. After npm publication, a `[sync] cortico-world-wardrobe-studio` issue can request immediate index synchronization. Creating that issue is a separate public action, to perform only when requested. Certification is a separate maintainer decision; publishing a package does not certify it.

Declared tags: `apps`, `requires-extension`, `experimental`. The wardrobe requires the desktop-pet service; authoring guidance can be read without a running pet. The extension does not download or run generation models. Official-product badges are assigned by maintainers.
