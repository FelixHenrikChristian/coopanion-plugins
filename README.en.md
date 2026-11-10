# Coopanion Plugins

One repository for independently installable Coopanion World extensions.

[简体中文](README.md)

| Plugin | Package | Source version |
| --- | --- | --- |
| [Wardrobe Studio](packages/cortico-world-wardrobe-studio) | `cortico-world-wardrobe-studio` | 0.6.0 |
| [Capture Guard](packages/cortico-world-capture-guard) | `cortico-world-capture-guard` | 1.1.1 |
| [Lulu](packages/cortico-world-lulu) | `cortico-world-lulu` | 0.1.2 |

Each plugin keeps its own version, installation, configuration and license. Installing one does not install the others. Source versions are not claims that the same versions have been published to npm or the extension market.

Use Node.js 22.10+ and npm:

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run describe
npm run check
npm test
npm run pack:check
npm run pack:all
```

Artifacts are written to dist/. Packaging does not publish or modify a running installation. Use an individual plugin's README for installation instructions.

Wardrobe Studio's Git history, three legacy tags, three historical releases with four original assets, and its unresolved issue are preserved here. Existing installations and published npm package files are unchanged; historical registry metadata still contains its original repository URL. See [migration details](docs/wardrobe-migration.md). The local 0.4.1 thumbnail changes are included. Capture Guard is imported from locally verified source without deployment data, logs, credentials, personal media or runtime binaries.

Future changes are maintained here. GitHub release tags are plugin-specific, for example `wardrobe-studio-v0.4.1`, `capture-guard-v1.1.0` and `lulu-v0.1.2`. GitHub releases, npm publication and market synchronization remain separate actions. See [release instructions](docs/releasing.md) and [licenses](LICENSES.md).
