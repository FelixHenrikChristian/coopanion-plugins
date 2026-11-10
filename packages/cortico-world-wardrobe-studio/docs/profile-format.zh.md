# 衣橱 JSON schema 1 完整说明

## 这个文件的作用

把一个已安装形象的已有完整装扮分组显示，不包含动画或文件路径，也不会生成衣服。可选内嵌小型缩略图。形象包必须先安装并能正常播放。Coo 的配件契约不同，继续使用原生装扮页。

使用 UTF-8 JSON，建议无 BOM；双引号，不允许注释、尾随逗号。文件中只能有一个配置对象，不能是数组或 ZIP。导入文件本身和紧凑序列化后的 UTF-8 JSON 各不得超过 65,536 字节。粘贴内容也经过服务端检查。未识别的元数据会被丢弃，不执行、不保存。

## 顶层字段

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| schema | 是 | 整数 1；这是衣橱格式版本，不是 figure manifest／API 版本。 |
| id | 是 | 本机配置 ID，1–64 字符，遵循下方规则；重新导入同 ID 会替换该配置，不合并。 |
| figure | 是 | 已安装角色包的真实 ID，不是显示名称、目录或网址；不支持 coo。 |
| label | 是 | 非空显示文字，最多 120 个 UTF-16 code unit，导入会去掉两端空白。 |
| outfits | 是 | 1–32 套服装，id 不重复；一份配置仅对应一个 figure。 |

配置、服装、配置项、选项的所有 id 均匹配 `^[a-z0-9][a-z0-9-]{0,63}$`：仅小写英文字母、数字、短横线，以字母或数字开头。label 可以用中文，机器 ID 和显示文字不是一回事。

## 服装、配置项、搭配字段

| 所属对象 | 字段 | 规则 |
| --- | --- | --- |
| outfit | id、label | 必填；ID 在当前配置中唯一，字符／长度规则同上。 |
| outfit | controls | 必填数组，0–12 项；只显示这套服装自己的配置项。 |
| outfit | variants | 必填数组，1–512 个；明确列出实际支持的完整组合。 |
| outfit / option | thumbnail | 可选 `data:image/png;base64,…` 或 `data:image/webp;base64,…`。解码后每图不超过 12 KiB，整份配置仍不得超过 64 KiB。不接受远程 URL、SVG 或文件路径。 |
| control | id、label | 必填；ID 在当前服装中唯一，可以在另一套服装里重复。 |
| control | default | 可选，填本配置项已有 option ID；省略时用第一个选项。 |
| control | options | 必填，1–24 个；各选项必填 id、label，ID 在本配置项内唯一。 |
| variant | pick | 必填对象，键恰好是本服装全部 control ID，值为各自合法 option ID，不能缺键／加其他键。 |
| variant | scheme | 必填字符串，1–256 字符，匹配 `^[a-z0-9-]{1,256}$`，并且能在已安装角色包中找到。 |

同一服装不能有重复 pick 组合。每个声明选项至少在一个 variant 中出现。不同 pick 可以指向同一个已有 scheme，但不会凭空产生新的视觉差异。

default 必须分别有效。如果部分组合矩阵中没有“所有 default 合起来”的组合，面板初选回退到第一个 variant，不会生成缺失素材。没有额外选项时用 controls=[] 和一个 pick={} 的 variant。

缩略图建议从真实资源取图，服装卡片统一人物高度、脚底基线与留白，部件选项裁取对应区域。用约 64–72 像素的透明 WebP 控制体积。未提供 option.thumbnail 时保持文字选项；服装缩略图仍可回退到已安装资源。缩略图属于个人素材，含此字段的衣橱 JSON 不应公开上传。

## 如何找到真实 ID

在导入区域展开“查看本机装扮 ID”，读取运行中的桌宠形象列表，查看 figure ID、axes／options、presets 和当前 scheme。它们是本机数据，包含个人角色时不要公开导出。

scheme 按形象 manifest 解析：

1. 单配置轴：直接填 option ID，例如 bag。
2. 多配置轴：按 manifest 中 axes 的顺序，用短横线连接 option ID。通用多轴示意：axes 先 hat 后 bag，on 和 off 对应 on-off，反过来就错。宿主的轴选项有自己的 ID 限制，必须使用真实声明值，不能填衣橱显示文字。
3. 已声明的 preset ID 也可直接填写。不要在衣橱里新造一个 ID，就期待插件自动找到同名图片。

例如配置 id=lulu-wardrobe，figure=lulu-capybara，outfit=orange，pick={bag:on}，scheme=bag。摘下包包映射到 plain；睡衣 sleep 和纸箱恐龙 dino 没有额外控制项。各层 ID 的含义不同。

## 可复制的完整小示例

默认噜噜示例对应已发布 lulu-capybara 的 bag、plain、sleep、dino 四个外观。先安装[噜噜角色包](https://github.com/FelixHenrikChristian/coopanion-plugins/releases/tag/lulu-v0.1.0)，再导入 JSON。下载按钮与此处提供同一份三套服装、四个完整外观配置；JSON 本身不包含动画。

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

无额外选项的服装可以写成：

```json
{"id":"festival","label":"节庆装","controls":[],"variants":[{"pick":{},"scheme":"festivalgold"}]}
```

上面只是一项 outfit，要放在 outfits 数组中，不是单独可导入的配置。

## 不完整组合的处理

一套服装有多个配置项时，没有动画资源的组合可以不列出；面板会禁用无法完成当前搭配的选项。每个已声明选项仍须至少出现在一个有效 variant 中。噜噜橘子装只有一个包包控制项，戴上与摘下两个组合均可用。插件不会自动组合剩余图片造出缺失服装。

## 校验与导入步骤

1. 先安装并验收真正的形象包，保持桌宠服务可用。
2. 下载噜噜示例。使用已发布噜噜角色包时，保留其 ID 即可；用于其他角色时，把 figure 和所有 scheme 改为本机真实值，再按自己的服装设计修改分组／显示文字。
3. 选择 JSON 文件或粘贴完整对象，点“校验配置”。它不会保存配置或修改外观，只检查结构、选项矩阵以及本机 figure／scheme 是否存在。
4. 修复报错后点“导入配置”。同 ID 会替换原分组；导入本身不会换装，需要另选搭配并点“应用装扮”。
5. 在真正桌宠中检查全部有效组合。扩展接管过外观时，停用／卸载前先恢复。移除本地配置只删除衣橱分组，不卸载角色素材。

可下载的 wardrobe-profile.schema.json 可用于编辑器辅助检查。跨字段唯一性、选项引用、字节上限和本机 scheme 存在性还需要运行时校验，JSON Schema 不能单独证明这些。校验成功不等于动画播放已经通过。

## 常见报错

| 报错 | 处理 |
| --- | --- |
| Expected wardrobe profile schema 1 | 使用一个对象和 schema:1，不要导入 figure.json 或数组。 |
| Invalid identifier / Invalid label | 检查 ID 字符／长度和非空显示文字。 |
| Profile exceeds 64 KiB | 移除嵌入图片／大段元数据，或拆成不同配置。 |
| Duplicate identifier | 删除重复 ID 或重复 pick 组合。 |
| Variant must specify exactly its outfit controls | pick 恰好填写本服装的全部 control ID。 |
| Unknown variant option / Unknown default option | 填 option ID 而非显示文字，检查拼写。 |
| Option has no renderable variant | 补已有完整 scheme 映射，或删除无资源选项。 |
| Profile figure is not installed | 先安装角色包，figure 填真实 ID。 |
| Scheme is not available | 核对 preset、轴顺序，或先安装缺少的已验收装扮。 |
| Desktop pet HTTP / 连接错误 | 检查本机服务地址和桌宠 World 是否运行。 |

个人配置、素材和本机 ID 导出不放进公开扩展源码。导入不会改写原角色 manifest 或图片／视频。
