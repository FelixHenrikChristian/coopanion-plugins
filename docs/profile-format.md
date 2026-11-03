# Wardrobe profile schema 1 · `src/profile.js`

A wardrobe profile groups **existing** schemes from one installed figure pack. Importing one does not alter `figure.json`, image/video files, or the figure's code.

See [the fictional Moss Fox example](../examples/forest-fox.profile.json). A minimal outfit is:

```json
{
  "schema": 1,
  "id": "forest-fox-wardrobe",
  "figure": "forest-fox",
  "label": "Moss Fox",
  "outfits": [{
    "id": "stargazer",
    "label": "Stargazer suit",
    "controls": [{
      "id": "visor",
      "label": "Visor",
      "default": "raised",
      "options": [
        { "id": "raised", "label": "Raised" },
        { "id": "lowered", "label": "Lowered" }
      ]
    }],
    "variants": [
      { "pick": { "visor": "raised" }, "scheme": "stargazerraised" },
      { "pick": { "visor": "lowered" }, "scheme": "stargazerlowered" }
    ]
  }]
}
```

`figure` is the installed pack ID, not its displayed name. Each outfit owns its `controls`; switching outfits replaces the controls shown. IDs may repeat in different outfits. Every `variant.pick` must specify exactly the controls of its own outfit. Multiple controls can map to one complete, already rendered scheme. An outfit with no extra controls uses `"controls": []` and one variant with `"pick": {}`.

For a pack with one axis, `scheme` is an option ID. For multiple axes, it is the chosen options joined in manifest axis order with `-`; a declared preset ID is accepted too. All schemes are checked against the running desktop pet's figure list both at import and at apply. Coo's own accessory-specific skin format is excluded; use its native wardrobe.

A partial matrix is valid. If a complete combination has no variant, it cannot be applied and its incompatible option is disabled. The extension never synthesizes clothing by combining media. Add reviewed resources to the figure pack before adding their mappings.

Limits: 64 KiB per imported profile, 32 outfits per profile, 12 controls per outfit, 24 options per control and 512 variants per outfit. Duplicate outfit IDs, duplicate control IDs within an outfit, duplicate pick combinations and unknown option values are rejected. Profiles are local deployment data and must stay outside a public source repository.
