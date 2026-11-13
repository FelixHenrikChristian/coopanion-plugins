# 小屋与桌宠的交互接口

此页针对包含「雨庭レジデンス」的单文件场景。页面加载后，同一页面内的桌宠代码可通过 `window.amaneHome` 访问家具与菜畦。交互坐标使用场景的世界坐标，单位为米，第二个分量是高度。

| 调用 | 用途 |
| --- | --- |
| `listItems()` | 读取全屋家具和菜畦目录，返回可序列化的数据。 |
| `getItem(id)` | 读取名称、房间、动作、交互点和走近位置。 |
| `getObject(id)` | 获取对应的 Three.js 对象组，可更新自己的材质或动画。 |
| `getView()` | 读取当前的小屋显示状态。 |
| `setView(mode)` | `exterior` 为完整外观，`cutaway` 为自动剖墙，`open` 为无墙视图。 |

例如，取得可换画面的电视屏幕：

```js
const tv = window.amaneHome.getObject('living.tv');
const screen = tv.getObjectByName('tv-screen');
```

点击可见物件时，页面向 `window` 派发 `amane:home-item`。拖动视角不会触发该事件，完整屋顶和实墙会挡住对背后家具的点击。

```js
window.addEventListener('amane:home-item', ({ detail }) => {
  const { id, room, actions, approach, anchor } = detail;
  // 宿主可先让角色走到 approach，再到 anchor 执行所选动作。
});
```

`actions` 是宿主可绑定的动作标识。移动、寻路、角色动画和作物存档由桌宠宿主实现。与参考模板有对应关系的家具附带 `templateSpot`（原始房间和位置），菜畦附带从 0 到 7 的 `plotId` 与作物标识 `cropId`。视图变化另有 `amane:home-view` 事件，其 `detail.mode` 为当前状态。

房间分区、家具交互点和八畦菜田参考了[大肥鱼房子模板](https://github.com/sh2234113/feiyu-room-template/tree/201a4ecad48e7e77cfdd6422fb8f55a77a7b9f5f)。住宅、家具、作物和材质在本项目中绘制与建模。
