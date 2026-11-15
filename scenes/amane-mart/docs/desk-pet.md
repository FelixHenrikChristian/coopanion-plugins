# 小屋与桌宠的交互接口

当前「雨庭レジデンス」有 **40 处已登记的可点击识别点**，包括住宅家具 32 处（含缘侧 2 处）和菜畦 8 处。点击可见物件会向页面派发 `amane:home-item` 事件，提供物件 ID、名称、预留动作和坐标。

当前场景中的家具交互完成到点击识别和接口接入阶段。代码中尚无 `amane:home-item` 的消费监听器，因此点击后没有内置的家具状态变化、动作菜单、高亮反馈或角色动作。下表的 `actions` 是预留动作标识，动作执行仍需要桌宠宿主实现。

| 当前状态 | 核实结果 |
| --- | --- |
| 点击识别 | 40 处登记点都通过射线拾取派发同一种物件事件。一个物件组内的不同可见零件会归到同一 ID。 |
| 家具动作效果 | 0 项已内置。坐下、睡觉、换装、做饭、开柜等标识目前保存在目录中。 |
| 电视和电脑 | 各显示一张建模时绘制的固定电影风格插画，分别为蓝调时刻与午夜配色。点击尚不会切换画面、开关屏幕或播放视频。 |
| 菜田 | 8 种作物在建模时生成固定网格。浇水、采收、生长阶段和作物存档尚待接入。 |
| 其他街景物件 | 便利店陈设、茶屋陈设、街边自行车、自贩机、路灯等尚未登记物件 ID，点击它们不会派发住宅物件事件。 |
| 已有的可见交互 | 场景旋转、平移、缩放，小屋四种视图切换，以及入场组装和天气动画。 |

## 按房间统计

| 分区 | `room` | 登记点数 |
| --- | --- | --- |
| 客厅 | `living` | 7 |
| 卧室 | `bedroom` | 4 |
| 餐厅 | `dining` | 2 |
| 厨房 | `kitchen` | 5 |
| 玄关与家政区 | `genkan` | 4 |
| 走廊 | `corridor` | 2 |
| 书房 | `study` | 3 |
| 浴室 | `bathroom` | 3 |
| 缘侧 | `engawa` | 2 |
| **住宅家具小计** | | **32** |
| 菜田 | `garden` | 8 |
| **合计** | | **40** |

## 完整物件清单

下列中文描述解释预留动作的用途，括号内保留接口原始标识。每次点击返回物件的完整 `actions` 数组，宿主需要自行选择并执行其中的动作。

### 客厅 · 7 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `living.sofa` | 榉木扶手双人沙发 | 坐下（`sit`）、小睡（`nap`）、看电视（`tv`）、使用手机（`phone`） |
| `living.rug` | 棉织暖桌敷垫 | 坐下（`sit`）、休息（`rest`） |
| `living.coffeeTable` | 被炉与煎茶 | 喝茶饮水（`drink`）、阅读（`read`） |
| `living.console` | 双面桦木影音柜 | 查看（`inspect`） |
| `living.tv` | 独立电视机 | 看电视（`tv`）、开关（`toggle`） |
| `living.shelf` | 唱片与窗边文库 | 阅读（`read`） |
| `living.water` | 玻璃饮水机 | 饮水（`drink`） |

### 卧室 · 4 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `bedroom.bed` | 桦木床与棉绗被 | 睡觉（`sleep`）、小睡（`nap`） |
| `bedroom.bedside` | 床头文库与纸灯 | 阅读（`read`）、开关灯（`toggle`） |
| `bedroom.wardrobe` | 杉木推拉衣柜 | 换装（`dress`）、打开（`open`） |
| `bedroom.window` | 窗边一枝花 | 观赏（`look`）、休息（`rest`） |

### 餐厅 · 2 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `dining.dining` | 四人橡木餐桌 | 坐下（`sit`）、用餐（`eat`）、饮水（`drink`） |
| `dining.teaCabinet` | 篱木茶水柜 | 沏茶（`tea`）、查看（`inspect`） |

### 厨房 · 5 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `kitchen.fridge` | 双门冰箱 | 打开（`open`）、进食（`eat`）、吃零食（`snack`） |
| `kitchen.sink` | 不锈钢洗涤台 | 清洗（`wash`）、饮水（`drink`） |
| `kitchen.stove` | 双口灶与汤锅 | 做饭（`cook`）、加热（`heat`） |
| `kitchen.pantry` | 调味料架 | 查看（`inspect`） |
| `kitchen.prepCart` | 木质备菜推车 | 查看（`inspect`）、备菜做饭（`cook`） |

### 玄关与家政区 · 4 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `genkan.shoe` | 玄关鞋柜 | 更换穿着（`dress`）、打开（`open`） |
| `genkan.slippers` | 待客布拖鞋 | 穿上（`wear`） |
| `genkan.umbrella` | 伞篓 | 取用（`take`）、收纳（`store`） |
| `genkan.washer` | 家政洗衣机 | 洗衣（`laundry`）、打开（`open`） |

### 走廊 · 2 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `corridor.gallery` | 走廊边柜与南天插花 | 观赏（`look`） |
| `corridor.ficus` | 窗边的伞叶榕 | 浇水（`water`）、观赏（`look`） |

### 书房 · 3 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `study.desk` | 窗边的绘图与刻印书桌 | 书桌活动（`desk`）、阅读（`read`）、绘画（`draw`） |
| `study.laptop` | 便携电脑 | 书桌活动（`desk`）、打字（`type`）、开关（`toggle`） |
| `study.books` | 书斋的书与杂志 | 阅读（`read`） |

### 浴室 · 3 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `bathroom.shower` | 嵌入式浴缸与花洒 | 淋浴（`shower`）、泡澡（`bath`） |
| `bathroom.sink` | 洗手盆 | 清洗（`wash`）、刷牙（`brush`） |
| `bathroom.toilet` | 坐便器 | 如厕（`toilet`） |

### 缘侧 · 2 处

| ID | 名称 | 预留动作 |
| --- | --- | --- |
| `engawa.chair` | 缘侧坐垫 | 坐下（`sit`）、休息（`rest`） |
| `engawa.plant` | 廊下的山茶 | 浇水（`water`）、观赏（`look`） |

### 菜田 · 8 畦

菜畦的三个动作标识本身使用中文。`plotId` 从 0 开始，物件 ID 从 `plot-1` 开始。

| ID | 名称 | `plotId` | `cropId` | 预留动作 |
| --- | --- | --- | --- | --- |
| `plot-1` | 番茄种植床 | 0 | `tomato` | `查看`、`浇水`、`采收` |
| `plot-2` | 茄子种植床 | 1 | `eggplant` | `查看`、`浇水`、`采收` |
| `plot-3` | 黄瓜种植床 | 2 | `cucumber` | `查看`、`浇水`、`采收` |
| `plot-4` | 甜椒种植床 | 3 | `pepper` | `查看`、`浇水`、`采收` |
| `plot-5` | 卷心菜种植床 | 4 | `cabbage` | `查看`、`浇水`、`采收` |
| `plot-6` | 白萝卜种植床 | 5 | `daikon` | `查看`、`浇水`、`采收` |
| `plot-7` | 胡萝卜种植床 | 6 | `carrot` | `查看`、`浇水`、`采收` |
| `plot-8` | 小葱种植床 | 7 | `spring-onion` | `查看`、`浇水`、`采收` |

## 桌宠接入接口

页面加载后，同一页面内的桌宠代码可通过 `window.amaneHome` 访问家具与菜畦。

| 调用 | 用途 |
| --- | --- |
| `listItems()` | 读取全屋家具和菜畦目录，返回可序列化的数据。 |
| `getItem(id)` | 读取名称、房间、动作、交互点和走近位置。 |
| `getObject(id)` | 获取对应的 Three.js 对象组，供宿主更新材质或接入动画；ID 不存在时返回 `null`。 |
| `getView()` | 读取当前的小屋显示状态。 |
| `setView(mode)` | `exterior` 显示完整外观，`walls` 收起屋顶并保留全部墙面，`cutaway` 随视角剖墙，`open` 收起屋顶和全部墙面。 |

例如，读取完整目录并统计房间中的登记点：

```js
const home = window.amaneHome;
const items = home.listItems();
console.table(items.map(({ id, room, label, actions }) => ({
  id, room, label, actions: actions.join(' / ')
})));
console.log('住宅家具', items.filter(item => item.room !== 'garden').length);
console.log('菜畦', items.filter(item => item.room === 'garden').length);
```

电视和电脑的屏幕对象均保留名称，宿主可以取得它们再接入画面更新逻辑：

```js
const tv = window.amaneHome.getObject('living.tv');
const tvScreen = tv.getObjectByName('tv-screen');
const laptop = window.amaneHome.getObject('study.laptop');
const laptopScreen = laptop.getObjectByName('laptop-screen');
```

点击可见物件时，页面向 `window` 派发 `amane:home-item`。单指轻点和鼠标左键点击可以触发；指针移动超过 5 个 CSS 像素或同时出现多指时会取消点击。完整屋顶、实墙和其他不透明物件会挡住对背后家具的拾取。切换至自动剖墙或无墙俯览后，更便于选择屋内家具。

```js
window.addEventListener('amane:home-item', ({ detail }) => {
  const { id, label, room, actions, approach, anchor } = detail;
  console.log('点中了', id, label, room, actions, approach, anchor);
  // 在此接入宿主自己的动作选择、走近和角色行为。
});
```

`anchor` 与 `approach` 都是 `[x, y, z]` 世界坐标数组，单位为米，`y` 表示高度。`anchor` 指向物件的交互位置，`approach` 给出靠近物件的站立位置。住宅室内的常用地面高度为 `0.41`，玄关低台为 `0.327`，缘侧为 `0.437`，菜田通道为 `0.16`。这些坐标在登记时记录，按入场组装完成后的摆放使用。宿主移动家具后，需要同步维护自己的坐标；当前目录不会自动重算。

`actions` 是宿主可绑定的动作标识。移动、寻路、角色动画和作物存档由桌宠宿主实现。`approach` 仅提供走近位置，寻路和碰撞处理需要宿主接入。与参考模板有对应关系的家具附带 `templateSpot`（原始房间和位置），菜畦附带从 0 到 7 的 `plotId` 与作物标识 `cropId`。

视图切换已实现屋顶和墙面的显隐、相机移动，并派发 `amane:home-view`。其 `detail.mode` 为当前状态，可以直接通过 `window.amaneHome.setView('cutaway')` 切换到自动剖墙，通过 `window.amaneHome.getView()` 读取状态。

本清单核对了当前家具登记、菜畦登记、射线拾取及事件实现。屏幕插画与作物均在构建阶段生成，逐帧循环更新相机、视图、组装、灯光和天气。对应实现可查看 [home-furniture.js](../src/home-furniture.js)、[home-grounds.js](../src/home-grounds.js)、[home-view.js](../src/home-view.js)、[residential-garden.js](../src/residential-garden.js) 和 [main.js](../src/main.js)。

房间分区、家具交互点和八畦菜田参考了[大肥鱼房子模板](https://github.com/sh2234113/feiyu-room-template/tree/201a4ecad48e7e77cfdd6422fb8f55a77a7b9f5f)。住宅、家具、作物和材质在本项目中绘制与建模。
