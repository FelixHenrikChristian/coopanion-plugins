# Wardrobe JSON schema 1

## What this file does

A profile groups existing schemes from one installed figure. It contains no animation data or file paths and cannot generate clothing; small embedded preview images are optional. The figure pack must already be installed and playable. Coo's separate accessory contract uses the native wardrobe.

Save UTF-8 JSON, preferably without a BOM, with double quotes and no comments/trailing commas. File import accepts a single profile object, not an array or ZIP. The file and its compact serialized UTF-8 JSON must each be at most 65,536 bytes. Pasted content is checked by the same server-side schema. Unrecognized metadata is discarded, not executed or stored.

## Root fields

| Field | Required | Rule |
| --- | --- | --- |
| schema | yes | Integer 1; this is wardrobe schema, not figure manifest/API version. |
| id | yes | Local profile ID, 1–64 characters, regex below. Reimporting the same ID replaces that profile, without merging. |
| figure | yes | Exact installed figure pack ID; not its displayed name, path or URL. coo is excluded. |
| label | yes | Nonblank display string, at most 120 UTF-16 code units; surrounding whitespace is trimmed. |
| outfits | yes | Array of 1–32 outfits, with unique IDs. One profile refers to one figure only. |

All profile/outfit/control/option IDs follow `^[a-z0-9][a-z0-9-]{0,63}$`: lowercase ASCII letters, digits and hyphens, beginning with a letter/digit. Labels can contain Chinese and other text. Machine IDs and displayed labels are different things.

## Outfit, control and variant fields

| Object | Field | Rule |
| --- | --- | --- |
| outfit | id, label | Required; ID unique within this profile; same ID/label rules as above. |
| outfit | controls | Required array, 0–12; only this outfit's controls are shown. |
| outfit | variants | Required array, 1–512; explicitly list the complete supported combinations. |
| outfit / option | thumbnail | Optional `data:image/png;base64,…` or `data:image/webp;base64,…`, at most 12 KiB decoded per image. The whole profile remains limited to 64 KiB. Remote URLs, SVG and paths are rejected. |
| control | id, label | Required; ID unique within this outfit, may repeat in another outfit. |
| control | default | Optional option ID; defaults to the first option; must exist in options. |
| control | options | Required array, 1–24; each option has required id and label, IDs unique within this control. |
| variant | pick | Required object; exactly one key per control of its outfit, with that control's valid option ID. No missing/foreign keys. |
| variant | scheme | Required string, 1–256 characters matching `^[a-z0-9-]{1,256}$`; must resolve in the installed pack. |

Duplicate pick combinations are rejected. Every declared option must occur in at least one variant. Different picks may point at the same existing scheme; this does not create additional visual differences.

Each control's default is valid individually. If their combined defaults do not exist in a partial matrix, the panel initially falls back to the first variant. Do not rely on unavailable defaults to imply new media. Controls=[] uses exactly one variant with pick={}.

Capture previews from real resources. Normalize full-outfit character height, foot baseline and padding; crop option previews to the relevant area. Transparent WebP around 64–72 pixels helps control size. Options without thumbnails remain text-only; outfits can still use installed thumbnails. Profiles with personal thumbnails contain personal media and should not be published.

## Find the real figure and scheme IDs

In the import area, open Installed figure/scheme IDs. It reads the running desktop pet's figure list and displays pack IDs, axes/options, presets and the current scheme. These are local data; do not publish the export with personal profiles.

Scheme resolution follows the figure manifest:

1. One axis: scheme is its option ID, for example bag.
2. Multiple axes: join option IDs with `-` in the manifest's axis order. For hypothetical axes hat then bag, choosing on and off gives on-off. Reversing the order is wrong. Axis option IDs obey the host's own rules; use the actual declared IDs, not wardrobe labels.
3. An existing preset ID is accepted directly. Do not invent a new ID in the profile and expect an image filename to be found.

For example: profile id=lulu-wardrobe, figure=lulu-capybara, outfit=orange, pick={bag:on}, scheme=bag. These IDs have different roles. Bag off maps to plain; sleep and dino have no extra controls.

## Complete small example

The default Lulu example matches the released lulu-capybara pack: bag, plain, sleep and dino. Install the [Lulu figure pack](https://github.com/FelixHenrikChristian/coopanion-plugins/releases/tag/lulu-v0.1.0) first; importing JSON does not install animations. The downloadable example is the same complete three-outfit, four-scheme profile shown here.

```json
{
  "schema": 1,
  "id": "lulu-wardrobe",
  "figure": "lulu-capybara",
  "label": "噜噜的衣橱",
  "outfits": [
    {
      "id": "orange",
      "label": "橘子噜噜",
      "controls": [
        {
          "id": "bag",
          "label": "小鸟包包",
          "options": [
            {
              "id": "on",
              "label": "戴上"
            },
            {
              "id": "off",
              "label": "摘下"
            }
          ],
          "default": "on"
        }
      ],
      "variants": [
        {
          "pick": {
            "bag": "on"
          },
          "scheme": "bag"
        },
        {
          "pick": {
            "bag": "off"
          },
          "scheme": "plain"
        }
      ]
    },
    {
      "id": "sleep",
      "label": "睡衣噜噜",
      "controls": [],
      "variants": [
        {
          "pick": {},
          "scheme": "sleep"
        }
      ]
    },
    {
      "id": "dino",
      "label": "纸箱恐龙噜噜",
      "controls": [],
      "variants": [
        {
          "pick": {},
          "scheme": "dino"
        }
      ]
    }
  ]
}
```

No extra controls:

```json
{"id":"festival","label":"Festival","controls":[],"variants":[{"pick":{},"scheme":"festivalgold"}]}
```

This is one outfit object inside outfits, not a standalone profile.

## Partial combinations

For an outfit with multiple controls, omit combinations whose animation resources do not exist; the UI disables choices that cannot complete the current selection. Each declared option must still occur in at least one valid variant. Lulu's orange outfit has one bag control and both on/off variants are available. No new outfit is synthesized from remaining media.

## Check and import

1. Install/test your actual figure pack first; make the desktop pet service available.
2. Download the Lulu example. For the released Lulu pack, keep its IDs unchanged. For another character, replace figure and all scheme IDs with real installed ones and change the groups/labels to your own design.
3. Choose the JSON file or paste its complete object. Click Check configuration. This performs no writes or appearance changes. It validates the structure, option matrix and current pack/scheme existence.
4. Fix reported errors, then Import. A same-ID local profile is replaced. Import alone does not change the pet's appearance. Select an outfit/options and Apply separately.
5. Check every intended combination in the actual runtime. Restore before disabling/uninstalling if the extension owns an appearance. Remove local profile only removes the grouping, not its installed media.

The bundled wardrobe-profile.schema.json supports editor validation. Cross-field uniqueness, option references, byte limits and installed scheme existence also require the extension's runtime check; JSON Schema alone cannot establish those. Profile check success is not animation playback acceptance.

## Common errors

| Message | Fix |
| --- | --- |
| Expected wardrobe profile schema 1 | Use one object and schema:1, not figure.json or a profile array. |
| Invalid identifier / Invalid label | Check ID pattern, length and nonblank labels. |
| Profile exceeds 64 KiB | Remove embedded media/large metadata or split into separate profiles. |
| Duplicate identifier | Remove duplicate IDs, or duplicate pick combinations. |
| Variant must specify exactly its outfit controls | Give pick exactly this outfit's control keys. |
| Unknown variant option / Unknown default option | Use option IDs, not displayed labels; check spelling. |
| Option has no renderable variant | Add an existing complete scheme mapping or remove that option. |
| Profile figure is not installed | Install the pack first and use its real ID. |
| Scheme is not available | Correct the preset/axis option order or install the missing reviewed scheme. |
| Desktop pet HTTP / connection error | Check the local service address and that the desktop-pet World is active. |

Keep personal profiles, media and installed-ID exports outside the public extension source. Import does not edit the original figure manifest or assets.
