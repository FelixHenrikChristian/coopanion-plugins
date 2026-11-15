# 雨音マート场景迁入记录

原仓库：[amane-mart](https://github.com/FelixHenrikChristian/amane-mart)。迁入位置：[`scenes/amane-mart`](../scenes/amane-mart)。

首次迁入提交为 `36169898e34ae2d1c4be9e278b07a0a951d9ef8d`。它的第一父节点是插件仓库原主线 `7132a67f1ba99a27ec8e7be895f21e0068c82546`，第二父节点是已批准场景 `a078f0a286875181360bdee363cb830fe7044a1d`，未 squash 或改写正式场景的 9 个历史提交。

导入提交仅新增该目录内 33 个文件。原场景根树与导入子树均为 `fc7532ed8d9363c5b6bd572f2e8d2204fd4ee1b9`，证明首次迁入内容完全相同，包含源码、独立 HTML、全景图、室内图及交互说明。

验收确认原主线所有 9 个 SHA 均可从迁入提交追溯；历史场景预览均不含人物。导入不包含开发机配置、缓存、依赖目录或私人角色素材。

后续家园开发以此目录为场景源码。插件从该源码构建，独立 HTML 仍由场景原构建命令输出。迁入没有改动或归档原 GitHub 仓库，也没有发布 npm 包。

查看原历史：

```sh
git log --graph --oneline 3616989
git log --oneline a078f0a
git rev-parse 3616989:scenes/amane-mart
```
