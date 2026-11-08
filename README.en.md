# Coopanion Plugins

One repository for independently installable Coopanion World extensions.

[简体中文](README.md)

| Plugin | Package | Source version |
| --- | --- | --- |
| [Wardrobe Studio](packages/cortico-world-wardrobe-studio) | `cortico-world-wardrobe-studio` | 0.4.1 |
| [Capture Guard](packages/cortico-world-capture-guard) | `cortico-world-capture-guard` | 1.1.0 |

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

Wardrobe Studio's Git history is preserved. Its existing repository, releases and installed packages are retained. The local 0.4.1 thumbnail changes are included. Capture Guard is imported from locally verified source without deployment data, logs, credentials, personal media or runtime binaries.

Future changes are maintained here. GitHub release tags are plugin-specific, for example `wardrobe-studio-v0.4.1` and `capture-guard-v1.1.0`. GitHub releases, npm publication and market synchronization remain separate actions. See [release instructions](docs/releasing.md) and [licenses](LICENSES.md).
