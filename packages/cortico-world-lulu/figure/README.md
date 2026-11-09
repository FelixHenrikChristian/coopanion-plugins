# Figure runtime

`figure.js` 是角色包使用的 API 2 运行代码。它从同目录的 `data.js` 读取外观、连续帧和表情映射；使用主机提供的 Kit 保持原生行走、碰撞和事件行为。坐下与起身采用角色自己的连续帧，表情分别使用站姿和坐定姿态的原始身体。

角色媒体及生成的 `data.js`、`figure.json` 作为独立 GitHub Release 角色 ZIP 提供。此目录保留可审查的运行代码，不含个人媒体或服务器工作流。World 插件从 Release 安装完整角色包；npm 包只包含 World 插件。
