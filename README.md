# Coopanion Plugins

Coopanion 插件统一源码仓库。每个插件仍是独立的 World 扩展，可以分别安装、启用、停用和更新。

[English](README.en.md)

| 插件 | 包名 | 源码版本 | 用途 |
| --- | --- | --- | --- |
| [装扮工作室](packages/cortico-world-wardrobe-studio) | `cortico-world-wardrobe-studio` | 0.5.2 | 按服装显示搭配选项，并提供连续动画角色制作指南 |
| [截图隐身](packages/cortico-world-capture-guard) | `cortico-world-capture-guard` | 1.1.1 | 默认截图不含桌宠，提供 NVIDIA 即时重放兼容模式 |
| [噜噜](packages/cortico-world-lulu) | `cortico-world-lulu` | 0.1.2 | 独立的水豚噜噜桌宠衣橱，可摘下包包，并可导入装扮工作室 |

源码版本不等于 npm 或市场已发布版本。只有实际发布的版本才会出现在对应分发渠道。

## 安装

选择你需要的单个插件，查看它自己的 README。安装一个插件不要求安装另一个。

GitHub Release 使用独立标签：`wardrobe-studio-v0.4.1`、`capture-guard-v1.1.0`、`lulu-v0.1.2`。每个 Release 只提供相应插件的包；仓库根目录不是可安装插件。

## 目录

```text
packages/
  cortico-world-wardrobe-studio/
  cortico-world-capture-guard/
  cortico-world-lulu/
scripts/                       统一检查与打包
docs/                          发布和迁移说明
```

以后新增插件，只需增加一个包目录、清单及对应的测试；不必再建立独立仓库。

## 开发与检查

需要 Node.js 22.10 或以上版本及 npm。这些运行时插件都没有 npm 运行依赖。

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run describe
npm run check
npm test
npm run pack:check
npm run pack:all
```

也可分别运行，例如 `npm test --workspace=cortico-world-wardrobe-studio`。

产物在 `dist/`，不进入 Git。打包不会发布到 npm，也不会修改正在运行的 Coopanion。

## 迁移与发布

装扮工作室的原 Git 历史、3 个旧标签、3 个历史 Release（含 4 个附件）和未处理 Issue 已迁入本仓库。后续源码和问题统一在这里维护。已安装的插件与已发布 npm 包文件保持原样；旧 npm 版本中的仓库地址不会自动更新。详见 [迁移记录](docs/wardrobe-migration.md)。

本机 0.4.1 的缩略图修订一并迁入。截图隐身 1.1.0 从本地验证源码迁入，不包含部署配置、个人角色、日志、运行库或密钥。

各插件分别维护版本、许可证和发布记录。发布到 GitHub、npm 与同步市场是三个独立步骤，参见 [发布说明](docs/releasing.md)。

本仓库不是 Coopanion 官方插件集合。上游：[Pal-AI-Lab/Coopanion](https://github.com/Pal-AI-Lab/Coopanion)。许可证见 [LICENSES.md](LICENSES.md)。
