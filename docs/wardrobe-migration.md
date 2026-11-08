# 装扮工作室历史迁移 / Wardrobe history migration

核验日期：2026-11-09（北京时间）。

原仓库：`FelixHenrikChristian/cortico-world-wardrobe-studio`。当前维护仓库：`FelixHenrikChristian/coopanion-plugins`。

原主分支提交 `43dd314372684f3a8964a8def5795269a630d137` 是总仓库主分支的祖先，全部 Git 历史保留。旧 `v*` 标签仅属于装扮工作室；今后的新标签继续使用带插件名的约定。

| 历史版本 | 原始附件数 | 新位置 |
| --- | --- | --- |
| v0.2.3 | 1 | [Release](https://github.com/FelixHenrikChristian/coopanion-plugins/releases/tag/v0.2.3) |
| v0.3.0 | 1 | [Release](https://github.com/FelixHenrikChristian/coopanion-plugins/releases/tag/v0.3.0) |
| v0.4.0 | 2 | [Release](https://github.com/FelixHenrikChristian/coopanion-plugins/releases/tag/v0.4.0) |

## 附件完整性

源附件下载后与 GitHub 提供的 SHA-256 比较，迁入后再下载逐字节核对。全部一致。

| 附件 | SHA-256 |
| --- | --- |
| `cortico-world-wardrobe-studio-0.2.3.tgz` | `c77242a3e47d890892cb08d1580abb55a6f7e96537398fdb8e68d1b6febcf32e` |
| `cortico-world-wardrobe-studio-0.3.0.tgz` | `383f21bee5a57229f5fa00cfdea55963f2ec4546e123230bfa816293e4edc8a6` |
| `cortico-world-wardrobe-studio-0.4.0.sha256` | `ba7014e40a5b1fcf88b2e8e5fbd4fd51eca407db3172bb8b626383069320e0dd` |
| `cortico-world-wardrobe-studio-0.4.0.tgz` | `c3bf961bccb54c4393619bf3e387e65d74a5b6de6ab1792a0440a501633e3e95` |

## 问题与其他内容

原有未处理 Issue 已通过 GitHub 原生转移保留正文、作者、创建时间、状态和评论：
- [原 Issue #1 → 总仓库 #1](https://github.com/FelixHenrikChristian/coopanion-plugins/issues/1)

没有待迁移的 Pull Request、已初始化 Wiki、里程碑、额外协作者、仓库 Secrets 或 Variables。

已安装插件、部署配置及已发布 npm 包文件不在本次迁移中改动。历史 npm 版本的仓库 URL 无法随源码迁移自动改写，请使用总仓库作为后续源码和问题入口。

All historical assets were verified by SHA-256 against the originals and downloaded again after upload. The original Git history and unresolved issue are preserved. Existing installations and published package bytes are unchanged.
