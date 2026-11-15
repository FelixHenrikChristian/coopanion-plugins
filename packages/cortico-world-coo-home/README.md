# coo家园

Coopanion World API 6 插件。使用雨音マート的雨夜街区，给当前选择的角色提供独立家园。

当前源码版本 `0.4.0-alpha.1` 为基础接入阶段，尚未发布到 npm 或市场。场景挂载、独立角色、只读换角和家具遮挡已通过隔离验收。生活、种植、家园聊天和桌面转达将在后续阶段接入；本版本不声明这些行为已经实现。

## 场景与角色

场景只在仓库的 [`scenes/amane-mart`](../../scenes/amane-mart) 维护，插件构建时打包同一套源码。原先可离线打开的 HTML 继续保留。页面支持旋转、缩放、平移、全屏和四种墙面显示模式。

家园通过只读观察连接跟随宿主当前选中的形象和服装。每个页面创建独立的官方 Figure API 2 沙箱实例，不移动原桌宠、不修改原桌宠外观。角色在三维位置上以二维方式显示，前景家具通过深度蒙版遮挡角色。角色的可用动作由包自身声明决定，缺失动作采用已有动作替代，不附带新角色素材。

宿主需启用桌宠 World，并使用它的本机服务。插件从宿主配置中的服务端口及官方有限回退范围发现服务，不提供扫描任意网络的功能。端口设为 `0` 时，由于宿主没有跨 World 随机端口发现接口，暂无法自动连接；默认端口或固定端口可用。无法连接时仍可浏览街区。

可见家园页面最高绘制 60 帧/秒，角色最高 30 帧/秒。隐藏时停止绘制，保持场景原分辨率和材质。

## 隐私

角色的标识、名称、描述、服装、图像和声音都是本机运行数据。插件包不包含这些数据，也不把它们写进公开示例、诊断日志或截图。角色模块始终运行在宿主沙箱内。测试只使用程序生成的中性图形。

## 开发

在仓库根目录安装依赖后运行：

```sh
npm run build --workspace=cortico-world-coo-home
npm run describe --workspace=cortico-world-coo-home
npm run check --workspace=cortico-world-coo-home
npm test --workspace=cortico-world-coo-home
npm run pack:check --workspace=cortico-world-coo-home
```

浏览器与宿主验收使用隔离的临时部署；运行测试不修改正在使用的 Coopanion。开发依赖不随插件安装，前端包含本地构建好的场景和 Three.js，不从 CDN 下载。

实施范围和阶段见 [开发路线](../../docs/coo-home-plan.md)。测试证据与当前限制见 [基础接入验收](../../docs/coo-home-foundation.md)。原场景历史见 [迁移记录](../../docs/amane-scene-migration.md)。
