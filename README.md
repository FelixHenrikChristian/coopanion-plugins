# Wardrobe Studio · a Cortico World extension

Choose an outfit in a separate wardrobe panel, then configure only the options that belong to it. A local profile maps complete combinations to existing figure schemes. The original Coopanion wardrobe page and figure files remain unchanged.

[中文说明](README_zh.md)

![Wholly fictional wardrobe example](assets/wardrobe.png)

The fictional Moss Fox demonstrates three different groups: trail outfits expose cape and footwear, rain outfits expose hood and raincoat colour, and stargazer outfits expose a visor. Combinations without animation resources cannot be applied.

## Use

1. Install this folder using the manual World extension installer. Restart the Core process as requested and enable Wardrobe Studio. Verify it with isolated data before adopting it in a running deployment.
2. Keep the desktop-pet World available. The default service origin is `http://127.0.0.1:7797`; change it in the extension configuration and restart this World if necessary.
3. Import a local wardrobe JSON, choose an outfit and options, then Apply. See the [profile format](docs/profile-format.md) and the fictional example.
4. Before uninstalling, use Restore previous appearance, verify success, disable the World and uninstall it. Normal stopping also attempts restoration. External appearance changes are preserved. See [lifecycle and recovery](docs/lifecycle.md).

Every mapped combination must already have complete figure resources. The extension does not combine images into new clothing or fill missing motion. Coo's separate accessory contract continues to use its native wardrobe.

## Authoring guide

The guide panel and agent tool cover complete dressed references, continuous action video, normal/half-speed and loop acceptance, temporal local matting, declared pose/expression support, runtime integration and versioned releases. The [full workflow](docs/agent-workflow.md) uses generic practices and a fictional example.

Tools: `wardrobe_list`, `wardrobe_choose`, `wardrobe_restore`, `wardrobe_authoring_guide`. Guidance returns instructions; it does not install tools, download models, run generation or read conversations.

## Data and compatibility

The extension stores profiles and appearance recovery records only under its own `wardrobe-studio/` directory. Applying an outfit changes the selected figure/scheme through the desktop pet's appearance API. Other preferences are preserved. Application code, original figure files and other extensions are not edited.

Normal stop restores the appearance still owned by this extension. Forced termination, an unavailable desktop service or removal of the old figure can require recovery on the next activation; unconditional restoration cannot be promised in those cases. All selected schemes are existing valid schemes, so the original figure does not depend on this extension after removal.

This initial release is experimental: World API 6, figure manifest/API 2, Node.js ≥22, no runtime npm dependencies. Configuration changes, applying appearances, disable restoration and reactivation were checked in a real Core host. The separate panel does not change native fixed-axis layout. See the [verification scope](docs/verification.md) and [publishing guide](docs/publishing.md).

## Develop

```sh
npm test
npm run check
npm run preview
```

The preview uses an isolated temporary deployment and fictional data. The package contains source, guidance and fictional examples, without private character media or generation models.

MIT License. Independent third-party extension; not an official Coopanion or Pal AI Lab component.
