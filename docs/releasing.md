# 独立发布 / Independent releases

每个插件分别维护 package.json 的版本。仓库根包为 private，禁止发布根包或把所有插件捆绑成一个运行时插件。

1. 明确本次发布哪个插件，更新它自己的版本和 CHANGELOG。
2. 执行根目录的 describe、check、test 和 pack:check。
3. 执行 `npm run pack:all`，检查 dist 内的真实归档内容。不要上传部署配置、个人资源、密钥、日志或运行库。
4. GitHub 标签使用 `wardrobe-studio-v<版本>` 或 `capture-guard-v<版本>`；GitHub Release 附件仅包含选中插件。
5. npm 如需发布，单独执行，例如 `npm publish --workspace=cortico-world-capture-guard --access public`。必须先得到发布指令，并具备对应 npm 权限。不得重发已存在的版本。
6. 如需市场收录，按 Coopanion 当时的规则单独同步。不能把 GitHub Release 当作市场已经上架的证明。

包名保持不变。新版本的 repository.directory 指向本仓库的对应 packages 子目录。旧 npm 版本的元数据和原仓库继续保留，避免破坏现有安装。

旧装扮仓库是否增加迁移公告、归档或调整 npm 的可信发布来源，须在新分发渠道验证后单独处理；本次目录整合不自动执行这些操作。

Each plugin is versioned and released independently. Validate the source and exact archives first. GitHub releases, npm publication, market synchronization, old-repository archival and trusted-publisher changes are separate actions; do not assume one authorizes all the others.
