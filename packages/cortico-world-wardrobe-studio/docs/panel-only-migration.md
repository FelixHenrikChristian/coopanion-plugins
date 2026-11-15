# 独立面板版迁移 / Independent-panel migration

## 中文

0.6.0 删除了原生装扮页补丁及所有相关开关、辅助服务、恢复脚本和原型。独立衣橱、噜噜示例、制作指南、本机内部外观接口及外观恢复机制保留。原生装扮页继续使用宿主自带控件。

**升级前必须先处理旧版本。** 新版不包含旧补丁的恢复代码，也不会读写宿主程序目录。

1. 备份扩展自己的衣橱配置、外观恢复记录及旧版补丁备份。
2. 保持桌宠服务可用，在旧版工作室点击“恢复原外观”，然后正常停用旧版。旧版停用会根据已有备份和校验值还原它拥有的页面与辅助文件。
3. 确认原生页补丁还原成功。如果报告页面被外部修改或还原失败，先保留备份，按旧版本对应的恢复说明处理；不要直接删除旧安装目录或用未知文件覆盖宿主。
4. 安装 0.6.0 或更新版本、按宿主提示重启 Core，再启用。原有衣橱配置使用相同命名空间，仍可继续使用。旧的三个兼容配置项不会再生效。
5. 打开“装扮工作室 → 衣橱”，检查原配置、服装及部件；制作指南仍在同一个扩展中。角色包和动画素材不需要重新生成。

[官方维护者已确认 0.6.0 解封](https://github.com/Pal-AI-Lab/cortico-extensions/issues/853#issuecomment-6832234773)，索引 PR #898 已合并。刷新市场可重新查找本包。换装接口属于桌宠内部接口，不保证跨宿主版本稳定。

## English

Version 0.6.0 removes native-page patching, every compatibility setting, helper/feed, recovery utility and prototype. Independent wardrobe panels, the Lulu example, authoring guidance, the internal loopback appearance endpoints and appearance restoration remain available. The native dressing page uses the host's own controls.

**Recover the old version before upgrading.** The new package contains no legacy host-file recovery code and never reads or writes a host program directory.

1. Back up the extension's profiles, appearance lease and old adapter recovery record.
2. Keep the desktop service available. Use Restore in the old panel, then normally disable that old World. Its existing ownership and checksum checks restore its own page changes and helper files.
3. Verify rollback. If old recovery reports externally changed files or fails, preserve the backup and follow that version's recovery instructions before removing it. Do not overwrite unknown host files.
4. Install 0.6.0 or newer, restart Core when requested, and enable it. Existing profiles keep their namespace. Legacy compatibility settings have no effect.
5. Verify the imported profiles, outfit controls and authoring guide. No character or animation regeneration is required.

[Maintainers confirmed reinstatement of 0.6.0](https://github.com/Pal-AI-Lab/cortico-extensions/issues/853#issuecomment-6832234773) after merging index PR #898. Refresh the market to find this package. The desktop-pet appearance endpoints are internal and may change across host versions.
