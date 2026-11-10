# 独立发布 / Independent releases

每个插件分别维护 package.json 的版本。仓库根包为 private，禁止发布根包或把所有插件捆绑成一个运行时插件。

仓库所有者已授权：后续维护中，相关插件的修改确认有效、检查通过后，可直接发布 GitHub Release、npm 并请求官方市场同步，无需逐次确认。各渠道仍须分别完成并核验结果。

该长期偏好适用于三个包：`cortico-world-wardrobe-studio`、`cortico-world-capture-guard` 和 `cortico-world-lulu`。有更新时完成对应渠道的发布，不以 Git 推送代替 npm 发布。npm 登录及需要的浏览器认证由所有者亲自完成：启动标准 `npm login --auth-type=web` 后交给本人操作，登录成功并核对账号后继续发布。不要索取聊天中的密码、令牌或验证码，也不要将凭证写入仓库。

1. 明确本次发布哪个插件，更新它自己的版本和 CHANGELOG。
2. 执行根目录的 describe、check、test 和 pack:check。
3. 执行 `npm run pack:all`，检查 dist 内的真实归档内容。不要上传部署配置、个人资源、密钥、日志或运行库。
4. GitHub 标签使用 `wardrobe-studio-v<版本>`、`capture-guard-v<版本>` 或 `lulu-v<版本>`；GitHub Release 附件仅包含选中插件。
5. npm 发布已验收的确切 TGZ，例如 `npm publish ./dist/cortico-world-capture-guard-<版本>.tgz --access public --registry=https://registry.npmjs.org`。发布前核对账号、权限和 registry 版本；已存在且相同的版本跳过，不得重发。发布后核对版本、dist-tag 和实际归档完整性。需要认证时等待所有者完成，不谎称已发布。
6. 如需市场收录，按 Coopanion 当时的规则单独同步。不能把 GitHub Release 当作市场已经上架的证明。

包名保持不变。新版本的 repository.directory 指向本仓库的对应 packages 子目录。旧 npm 版本的元数据和原仓库继续保留，避免破坏现有安装。

所有者的本机安装优先使用已核验的 npm 发布版：先发布并核验，再通过宿主安装器安装确切版本，检查运行中的版本及文件与发布归档一致。不要把开发目录的 `link:` 当作正式安装来源；迁移前备份并保留已有角色、衣橱和配置。

旧装扮仓库的历史版本和 Issue 已完成迁移，记录见 [迁移明细](wardrobe-migration.md)。删除旧仓库属于单独的明确授权操作；必须先保留全部 Git 引用、发行附件和问题，并逐项核验。旧 npm 版本元数据不会被改写；新版本继续使用总仓库地址。

Each plugin is versioned and released independently. Validate the source and exact archives first. GitHub releases, npm publication, market synchronization, old-repository archival and trusted-publisher changes are separate actions; do not assume one authorizes all the others.

The owner has granted standing authorization for verified maintenance releases of the affected plugins to GitHub Releases and npm, including official market synchronization requests. Confirm effectiveness and pass all required checks before publishing, then verify each channel separately.

This applies to Wardrobe Studio, Capture Guard and Lulu. The owner handles npm login/browser authentication personally; initiate the normal web login flow and continue after checking the authenticated account. Publish the exact inspected tarball, verify registry versions/tags/integrity, and distinguish pending channels from completed ones. Keep credentials out of chat and source.
