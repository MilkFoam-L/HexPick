# HexPick 插件编写指南

一个插件就是这个目录下的一个文件夹，里面至少有一个 `plugin.json`。保存文件后 HexPick 会自动重新加载。

```
plugins/
  my-plugin/
    plugin.json     必需：规则 + 内容
    card.html       可选：自定义卡片模板
    style.css       可选：自定义样式（只作用于本插件的卡片）
    assets/         可选：图片
    sounds/         可选：音效
```

## 最简插件

```json
{
  "name": "今天谁分享",
  "items": ["张三", "李四", "王五"]
}
```

## 完整字段

```json
{
  "id": "food",
  "name": "今天吃什么",
  "icon": "🍜",
  "description": "插件说明",
  "layout": "augment",
  "template": "card.html",
  "style": "style.css",
  "rules": {
    "screens": 1,
    "drawCount": 3,
    "rerollsPerCard": 1,
    "rarityWeights": { "silver": 50, "gold": 45, "prismatic": 5 },
    "goldenRerollChance": 0.15,
    "removeAfterPick": false,
    "pickTimer": 0,
    "noRepeat": "session"
  },
  "theme": {
    "labels": { "silver": "白银", "gold": "黄金", "prismatic": "棱彩" },
    "colors": { "silver": "#c9d4df", "gold": "#f2c45a", "prismatic": "#c69bff", "accent": "#0ac8b9", "text": "#cdd6e0" },
    "font": "'Songti SC', serif",
    "backgroundImage": "abyss",
    "sounds": { "silver": "sounds/a.mp3", "gold": "sounds/b.mp3", "prismatic": "sounds/c.mp3", "pick": "sounds/pick.mp3" }
  },
  "items": [
    {
      "id": "hotpot",
      "title": "火锅",
      "description": "获得 <gold>100% 幸福感</gold>",
      "icon": "🍲",
      "image": "assets/hotpot.png",
      "rarity": "prismatic",
      "weight": 2,
      "tags": ["辣", "多人"],
      "data": { "price": 120, "where": "楼下" }
    }
  ]
}
```

## 规则（rules）

和海克斯大乱斗一致：

| 字段 | 默认 | 说明 |
|---|---|---|
| `screens` | 4 | 一局几次选择（游戏里 3/7/11/15 级各一次） |
| `drawCount` | 3 | 每次给几张卡，1~5 |
| `rerollsPerCard` | 1 | 每张卡能刷新几次，刷新出同品质 |
| `rarityWeights` | 50/45/5 | 每次选择掷品质的权重，三张卡同品质 |
| `goldenRerollChance` | 0.15 | 白银/黄金轮出现“金色刷新”的概率，刷新时升一档 |
| `noRepeat` | `session` | 本局出现过的不再出现；`none` 只排除已选中的 |
| `removeAfterPick` | false | 选中的条目跨局移除，直到在浮层里点“重置已选” |
| `pickTimer` | 0 | 倒计时秒数，到时随机选一张；0 关闭 |

第 1、2 次选择不会都是白银。条目写了 `rarity` 就固定品质，只在对应品质轮出现；不写则跟随本轮品质。

## 图标

- emoji 或短文本：`"icon": "🍲"`
- 插件目录里的图片：`"icon": "assets/hotpot.png"`
- 海克斯大乱斗原版强化图标：`"icon": "lol:adamant"`。可用名称见应用内 `game/icons/index.json`。

## 描述标签

| 标签 | 效果 |
|---|---|
| `<gold>…</gold>` | 金色数值 |
| `<keyword>…</keyword>` | 关键词 |
| `<ap>` `<ad>` `<heal>` `<shield>` `<true>` | 法强、攻击、治疗、护盾、真实伤害配色 |
| `<b>` `<i>` `<br>` | 粗体、斜体、换行 |
| `<color value="#ff5577">…</color>` | 任意颜色 |

## 排版

`layout` 可选内置三种，卡面都使用游戏原版卡片：

- `augment`：游戏原样，图标 + 名称 + 描述
- `portrait`：大头像，适合点名；没有图片时自动生成首字头像
- `text`：大字，适合投屏

需要完全自定义时写 `card.html` 和 `style.css`。模板语法：

| 写法 | 含义 |
|---|---|
| `{{title}}` | 转义输出 |
| `{{{description}}}` | 按描述标签渲染 |
| `{{data.price}}` | 自定义字段 |
| `{{#data.price}}…{{/data.price}}` | 有值才显示 |
| `{{^data.price}}…{{/data.price}}` | 没值才显示 |

可用变量：`id` `title` `description` `icon` `iconUrl` `image` `tags` `rarity` `rarityLabel` `golden` `index` `plugin.name` `plugin.id` `data.*`。
模板外层元素带有 `card rarity-<品质>` 类名，可在 CSS 里按品质写样式。参考示例插件 `weekend/`。

## 安全限制

插件只能包含数据、HTML 模板和 CSS，不能执行脚本。模板中的脚本、iframe、事件属性和外部链接会被移除，
图片和音效只能读取插件自己目录里的文件。
