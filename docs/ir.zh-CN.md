---
summary: 'IR v5：deck 字段、内容页必填 kind、页面字段、组件、资产、叙事 pacing、品牌、页脚标记，以及选型字段的严格删除'
read_when:
  - 编写或验证裸 IR 文件
  - 某个字段、页面 kind、组件或版本被拒绝
  - 在裸 IR 与 deck 项目之间选择
  - 确认哪些语义字段会进入渲染
  - 选择 chart_type，或编写堆叠柱、百分比堆叠柱、柱线组合图
  - 加页码、保密标识或其他页脚标记
---

# IR v5

IR 是 pptwise 的类型化语义输入。版本 5 描述 deck 说什么、绑定哪个主题，以及每张页面由哪些组件填充。它不保存脸的选择或随机状态。

```json
{
  "version": "5",
  "filename": "hello.pptx",
  "narrative": "general",
  "theme": { "id": "brief" },
  "meta": { "organization": "Acme", "date": "2026-08-30" },
  "assets": { "images": {} },
  "slides": [
    {
      "type": "cover",
      "heading": "Hello pptwise",
      "subheading": "A native editable deck"
    },
    {
      "type": "content",
      "kind": "points",
      "heading": "Why it works",
      "components": [
        {
          "type": "bullets",
          "items": ["Semantic input", "Theme-menu lookup", "Editable PowerPoint output"]
        }
      ]
    },
    { "type": "ending", "heading": "Thanks" }
  ]
}
```

应查询当前安装的 schema，不要盲目复制示例：

```bash
pptwise schema > ir.schema.json
pptwise validate deck.json
```

## 顶层字段

| field | 结构 | 含义 |
| --- | --- | --- |
| `version` | `"5"` | 唯一接受的 IR 版本。省略时按 v5 处理。 |
| `filename` | string | 输出文件名，默认 `presentation`。 |
| `narrative` | 预设字符串或部分三轴 | 论证、节奏与受众决定。 |
| `theme` | object | 只绑定主题 id：`{ "id": "acme" }`。必填，绑定工作区主题、已装内容包的主题或出厂预设。改颜色用 `pptwise theme fork`。品牌配置写在主题文件上。 |
| `meta` | object | 机构、作者、日期、版本、保密级别、法定密级、联系信息、版权与动画。 |
| `assets` | object | `assets.images` 下的命名图片来源。 |
| `brand` | object | Deck logo 的资产 id 与角落位置。 |
| `branding` | enum | logo 出现在哪里：`full`、`cover-only` 或 `minimal`。省略等于 `cover-only`。 |
| `footer` | object | 页码以及页面角落的其他小标记。省略就什么都不印。见[页脚标记](#页脚标记)。 |
| `slides` | array | 有序页面。 |

根对象是严格结构，未知字段会让验证失败。

## 页型与页面字段

四种页型是 `cover`、`chapter`、`content` 与 `ending`。省略 `type` 时按 content 处理，因此仍然必须填写 `kind`。

通用页面字段包括：

- `id`，可选的稳定页面标识
- `placeholder: true`，通常由未完成的 deck 项目产生
- `heading` 与 `subheading`
- `kicker`，标题上方的一行短标签（封面上的场合、结尾页要人拍板的事），只有声明了位置的脸才画，别的脸上 validate 直接拒绝并点名是哪张脸
- `tag`，和标题放在一起的一枚小标签，说明整页依据的是什么（`text`，可选的 `evidence` 按来源性质上色，比如「RCT · NEJM 2025」写 `trial`）。和 `kicker` 一样，只有声明了位置的脸才画
- `fields`，一到四行公文抬头，每行一个 `label`、一个 `value`、可选的 `note`（备忘录封面的致、发、日期、事由，结尾决定下的签发、抄送），以及 `stamp`，盖在页上的一枚印章（`text`，可选的 `date`）。和 `kicker` 一样，只有声明了位置的脸才画
- `components`
- `background`
- `decor`，一个受控的局部装饰原语
- `image_side`，支持该偏好的脸可读取 `left` 或 `right`
- `footnote`
- `notes`，导出为原生演讲者备注

只有内容页携带 `kind`，边界页不携带。边界页组件只有在主题菜单绑定的脸声明兼容槽位时才会渲染，边界页的 `footnote` 也只有在这张脸声明会画它时才会渲染（比如结尾页页脚的免责句）。输出前会按实际脸验证内容。

## 内容页 kind

每张内容页必须且只能有一个 kind。kind 命名页面的语义动作，永远不从组件反推。

| kind | 何时使用 | 最近边界 |
| --- | --- | --- |
| `points` | 论证按不可调换的顺序推进。 | 可换序并列项属于 `list`。 |
| `list` | 并列条目可以换序。 | 有顺序的论证属于 `points`。 |
| `comparison` | 方案或维度需要直接对照。 | 方向属于 `process`，包含属于 `hierarchy`。 |
| `process` | 步骤、时间或闭环具有方向。 | 没有运动关系的有序论点属于 `points`。 |
| `data` | 一组数字、图表或表格是主角。 | 一个数字承担整页时用 `fact`。 |
| `photo` | 图像本身就是内容。 | 展品为断言服务时用 `evidence`。 |
| `statement` | 作者自己的立论需要占据整页。 | 有外部归属的话属于 `quote`。 |
| `quote` | 页面中心是他人或外部来源的话。 | 作者自己的立论属于 `statement`。 |
| `fact` | 一个数字就是全部信息。 | 要读出结构的一组数字属于 `data`。 |
| `evidence` | 一个断言配一件支持它的展品。 | 独立存在的图像属于 `photo`。 |
| `hierarchy` | 页面表达包含、层级或组成关系。 | 先后属于 `process`，并排对照属于 `comparison`。 |

已绑定主题可以只提供词表子集。请求菜单外 kind 会硬报错，并列出可用讲法。

## 不存在的字段

IR v5 没有 `seed`、`layout`、`beat` 或 `arrangement`，也不接受这些字段的别名。`theme` 只有 `{ id }`，没有 `theme.style` 或 `theme.brand` 覆盖。

- Spec 选择 `kind`。
- 主题菜单把 kind 映射到一张脸。
- 脸根据填入的组件自适应几何。
- 渲染无需保存随机状态也能保持确定性。
- 改颜色用 `pptwise theme fork`。品牌配置写在主题文件上。

旧 IR 版本与退役字段会被拒绝，并说明当前格式要求。没有迁移命令，应把源输入重写为 v5。

## 叙事

可以使用命名预设，也可以写三轴中的任意部分：

```json
{ "strategy": "pyramid", "pacing": "spacious", "audience": "executive" }
```

有效值如下：

- `strategy`：`pyramid`、`storytelling`、`instructional`、`showcase`、`briefing`
- `pacing`：`dense`、`balanced`、`spacious`
- `audience`：`executive`、`technical`、`customer`、`public`

命名预设有 `general`、`boardroom-report`、`pitch`、`training`、`product-launch`、`weekly-brief` 与 `annual-review`。省略时解析为 `general`，即 `briefing`、`balanced` 与 `public`。

叙事指导论证、语气、主题选择、正文字号基线与编辑容量。它不负责选脸。主题推荐只提供方向。

## 组件

`components` 是由 62 种类型化单元组成的可辨识联合。精确字段应查询当前安装的 schema，一次查一个组件或一个 kind：

```bash
pptwise schema --component kpi_cards
pptwise schema --kind data --theme brief
```

带归属的引文组件叫 `blockquote`。不存在名为 `quote` 的组件类型。

`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap` 与 `sankey` 会占满正文区，必须独占页面。版式可以声明它在这些组件旁边能放哪些组件：bulletin 的内容页在 `waterfall` 或 `gantt` 旁边放一个 `kpi_cards`，所以在 bulletin 上这一对能通过校验，再加别的不行。

`waterfall` 的每根柱都读同一根数值轴，所以每条 `value`，以及每根柱落到的累计值，绝对值都不能超过 1e300。超了就把所有条目除以同一个十的幂，把单位写进 `unit`，这样各柱的比例不变。

组件的 kind 归属与相近选择见 [SKILL 组件指南](../skills/pptwise/references/components.zh-CN.md)。

### 图表

`chart` 把一组数字画成一个形状。`chart_type` 决定形状，每种类型对系列数各有要求：

| chart_type | 画法 | 系列 |
| --- | --- | --- |
| `bar` | 每个类别一根柱，`direction: "horizontal"` 时每个类别一行。多个系列并排。 | 1 个或以上 |
| `stacked` | 每个类别的各系列叠成一根柱，柱顶印出这一柱的合计。 | 2 个或以上 |
| `percent_stacked` | 同样的堆叠，每根柱缩放到 100%，读 0% 到 100% 的轴。 | 2 个或以上 |
| `combo` | 同一个类别轴上既有柱也有线，右侧可加第二条数值轴。 | 至少一个柱系列和一个线系列 |
| `line` | 每个系列一条线，名字写在线尾。 | 1 个或以上 |
| `area` | 线下方的区域填色。 | 1 个或以上 |
| `scatter` | 数值 x-y 点。点带 `size` 就成气泡。 | 1 个或以上 |
| `pie`、`donut` | 一个整体分成若干有名字的扇区。 | 恰好 1 个 |
| `funnel` | 一个数值沿有序阶段逐级收窄。 | 恰好 1 个 |
| `dumbbell` | 每行一个起点值和一个终点值。 | 恰好 2 个 |
| `gauge` | 一个值对一个目标。 | 恰好 1 个，且只有一个点 |

`axes` 的标题和单位作用于 `bar`、`stacked`、`percent_stacked`、`combo`、`line`、`area` 与 `scatter`。同一系列里一个类别只能出现一次。

`bar` 在每根柱旁边印出它的数值，竖柱印在柱顶上方，横条印在条的末端。只有全部数值都能印在不压柱、不出图的位置时才印，否则一个都不印，这一页的导出会停下，直到数字改短（除以十的幂，把单位写进 `y_unit`，横条写进 `x_unit`）或减少类别、系列。横条图会随类别数长高，保证每个类别各占一行。

读数值轴的每个值，绝对值都不能超过 1e300：`bar`、`line`、`area`、`scatter`、`dumbbell`、`combo` 的每个 `y`，以及 `scatter` 的每个 `x`。超了就把这条轴上的所有系列除以同一个十的幂，把单位写进这条轴的单位字段，这样各系列的比例不变。`dumbbell` 在各行下面用一行写明数值的标题和单位，单位写进 `axes.x_unit`。

`stacked` 保留绝对值。正值按系列顺序从零向上叠，负值从零向下叠，有负值垂到零下时画一条零线标出分界。每根柱上方的数字是这个类别的净合计。分段不印数字，读分段看数值轴。合计要么全印，要么一个不印：放不下时一个都不印，这一页的导出会停下，直到数字改短（除以十的幂，把单位写进 `y_unit`）或减少类别。每个类别的正值之和与负值之和，绝对值都不能超过 1e300。超了就把所有系列除以同一个十的幂，把单位写进 `y_unit`，这样各柱的比例不变。

```json
{
  "type": "chart",
  "chart_type": "stacked",
  "axes": { "x_title": "季度", "y_title": "收入", "y_unit": "万元" },
  "series": [
    { "name": "咨询", "data": [{ "x": "第一季度", "y": 420 }, { "x": "第二季度", "y": 480 }] },
    { "name": "软件", "data": [{ "x": "第一季度", "y": 300 }, { "x": "第二季度", "y": 340 }] }
  ]
}
```

`stacked` 加上 `direction: "horizontal"` 是占比条：把一个整体画成横贯全页的一根条，按系列顺序切成各个部分。每个系列是一部分，在图里唯一的那个类别上有一个值，类别名作为条的说明印在条上方。每一段里写它的名字和数值，放不下的窄段写在条上方、与它的末端对齐。用 `emphasis` 标出相邻的几段时，条下多一行，写这几段的合计和占比，旁边是其余部分里最大那段的。数值不能为负，各段不能写 `status`。

```json
{
  "type": "chart",
  "chart_type": "stacked",
  "direction": "horizontal",
  "axes": { "y_unit": "亿千瓦" },
  "series": [
    { "name": "太阳能", "emphasis": true, "data": [{ "x": "2025 年末全国发电装机，按电源分", "y": 12.02 }] },
    { "name": "风电", "emphasis": true, "data": [{ "x": "2025 年末全国发电装机，按电源分", "y": 6.4 }] },
    { "name": "火电", "data": [{ "x": "2025 年末全国发电装机，按电源分", "y": 15.39 }] },
    { "name": "水电", "data": [{ "x": "2025 年末全国发电装机，按电源分", "y": 4.48 }] },
    { "name": "核电", "data": [{ "x": "2025 年末全国发电装机，按电源分", "y": 0.62 }] }
  ]
}
```

`percent_stacked` 把每个值除以它所在类别的合计，每根柱都到 100%，只比构成。它不印合计，默认在每个 25% 处画网格线。数值不能为负，每个类别的合计必须大于零，`y_unit` 只能写 `%`。合计为零的类别直接报错，而不是画成一根空柱，因为空柱读起来像缺数据。

`combo` 在同一组类别上同时画柱和线。要画成线的系列写 `plot: "line"`，其余画成柱。写了 `axis: "right"` 的系列读右侧那条自有刻度的数值轴，轴标题与单位写在 `axes.y2_title` 和 `axes.y2_unit`。右轴的刻度与左轴落在同一排上，一组网格线两边都能读。

```json
{
  "type": "chart",
  "chart_type": "combo",
  "axes": { "x_title": "季度", "y_title": "收入", "y_unit": "万元", "y2_title": "毛利率", "y2_unit": "%" },
  "series": [
    { "name": "收入", "data": [{ "x": "第一季度", "y": 720 }, { "x": "第二季度", "y": 820 }] },
    { "name": "毛利率", "plot": "line", "axis": "right", "data": [{ "x": "第一季度", "y": 31.5 }, { "x": "第二季度", "y": 29.8 }] }
  ]
}
```

组合图至少要有一个柱系列和一个线系列，且至少一个系列留在左轴。`plot`、`axis`、`y2_title` 与 `y2_unit` 只在 `combo` 上有效，写了 `y2_title` 或 `y2_unit` 却没有系列放在右轴会报错。组合图的每个值，绝对值都不能超过 1e300。超了就把这个值所在轴上的所有系列除以同一个十的幂，单位写进该轴的 `y_unit` 或 `y2_unit`。`percent_stacked` 和 `combo` 不接受 `direction: "horizontal"`，`stacked` 只在画占比条时接受。

### 标出这一页说的那件事

一页通常只论证一件事。下面这些字段让作者说清是哪一件，也说清一个数不是实报数时它是什么。每个主题都读这些字段，被标出的那件事用主题的强调色，其余的退后。

| 字段 | 标出什么 | 限制 |
| --- | --- | --- |
| `chart.series[].data[].status` | `"forecast"` 把柱子画成斜线填充，`"target"` 画成浅色底上的虚线框。一个系列里实报和预测混着时，图例多一项「预测」或「目标」，预测柱的数值标签也写明「（预测）」。 | 只用于 `bar` 和 `stacked` |
| `chart.series[].data[].emphasis` | 这一页说的那一根柱子，比如一串年份里的最后一年：它保留系列颜色，其余柱子退后 | 只用于 `bar`，一张图只标一个点，不能和系列的 emphasis 同时用 |
| `chart.bands` | `[{ "from": 4.5, "to": 5, "label": "目标区间" }]` 在图后横跨一段数值区间着浅色，标签写在区间里，数值轴会放大到能装下它。目标区间这样写，不要画成两条水平的系列 | `line`、`area` 和竖着的 `bar`，最多 2 段 |
| `chart.changes` | `[{ "from": "2025 年三季度", "to": "2026 年三季度" }]` 在两根柱上方画一个括号，写两者的变化（相对变化，`%` 轴上写百分点）。写了 `"at": "比亚迪"` 时，`from` 和 `to` 是两个系列名，在这个类别上比较。横条图把变化写在后一根条的数值后面。 | `bar` 和 `stacked`，最多 3 个。横条图必须写 `at`，堆叠图不能写 |
| `numbered_cards.items[].emphasis` | 这一页落到的那张卡，卡片填满主色 | 最多一张 |
| `gantt.items[].text` 与 `emphasis` | 阶段名下面的一行说明，以及这一页说的那一段 | 最多标一段 |
| `timeline.milestones[].lane` 与 `timeline.lanes` | 同一条时间顺序上的两条泳道。`lanes` 给出两条泳道的名字，轴上方的那条在前。放不下两侧的版式把泳道名写在日期前面 | 要么每个节点都写 lane，要么都不写，最多两条，竖向时间线不能用 |
| `kpi_cards.items[].value` 写成 `**…**` | 用主题强调色印的那一个数 | |
| `progress_donuts.items[].detail` 与 `emphasis` | 标签下面一行，写这个完成度背后的金额（「11770 / 13000 亿元」），以及这一页讲的那一个，它的环、数字和标签用强调色 | 最多标一个 |
| `kpi_cards.items[].tag` | 这个数是什么，用几个字印成数字旁的小标签（`{ "text": "约束性指标" }`）：标出的那个数填满，其余描边，`quiet` 的用灰色 | |
| `from_to.rows[].tag` 与 `emphasis` | 行尾数值后的标签，以及这一页讲的那一项，和 `comparison` 的行一样 | 最多标一行 |
| `comparison.rows[].emphasis` | 这一页讲的那一行：整行落在强调色的浅底上 | 最多一行 |
| `comparison.rows[].tag` 与 `comparison.tag_column` | 每一行发生了什么，用几个字印成行尾的小标签（`{ "text": "改为区间" }`），`tag_column` 是标签列的表头。标出那一行的标签用强调色填满，`quiet` 的标签（没有变化）用灰色描边退后，其余用强调色描边 | `tag_column` 只能和标签一起写 |

```json
{
  "type": "chart",
  "chart_type": "bar",
  "axes": { "y_unit": "万辆" },
  "series": [
    { "name": "2025 年", "data": [{ "x": "7 月", "y": 182.6 }, { "x": "8 月", "y": 199.5 }, { "x": "9 月", "y": 224.1 }] },
    { "name": "2026 年", "emphasis": true, "data": [{ "x": "7 月", "y": 146.1 }, { "x": "8 月", "y": 154.1 }, { "x": "9 月", "y": 169, "status": "forecast" }] }
  ]
}
```

```json
{
  "type": "timeline",
  "lanes": ["国内", "海外"],
  "milestones": [
    { "date": "7 月", "title": "巴西关税 35%", "lane": "海外" },
    { "date": "7 月 7 日", "title": "推进《价格法》修改", "lane": "国内", "highlight": true }
  ]
}
```

## 页脚标记

deck 不写 `footer` 就不印页脚：没有页码，没有机构名，没有日期，没有保密字样。每样标记都要作者明确要，印的字要么是作者原样写的，要么来自 deck 自己的 `meta`。

| 字段 | 印什么 | 位置 |
| --- | --- | --- |
| `page_number` | 页码。导出为 PowerPoint 原生页码字段，调整页序后自动更新。 | 内容页右下角。封面、章节页、结尾页不印。 |
| `organization` | `meta.organization`。 | 内容页左下角。 |
| `label` | 作者原样提供的「场合加日期」一行字。 | 机构名之后。 |
| `notice` | 作者原样提供的版权行或免责声明提示。 | label 之后。 |
| `draft` | 作者原样提供的草稿或版本标识。 | 右下角，页码之前。 |
| `confidentiality` | `meta.confidentiality` 的标识，按 deck 语言选字。`"cover"` 只在封面印一次，`"footer"` 封面加每张内容页都印。 | 封面：脸自己的位置，或左上角。内容页：右下角。 |

```json
{
  "meta": { "organization": "华东区域运营中心", "confidentiality": "confidential" },
  "footer": { "page_number": true, "organization": true, "label": "2026 年中期业绩 | 2026.08", "confidentiality": "footer" }
}
```

```json
{
  "meta": { "organization": "Acme Holdings", "confidentiality": "confidential" },
  "footer": { "page_number": true, "label": "Investor Presentation | February 2026", "confidentiality": "cover" }
}
```

保密标识的措辞跟 deck 的语言走，语言从页面标题判断。中文 deck 的 `internal` 印「仅供内部讨论」，`confidential` 印「内部资料，请勿外传」，`restricted` 印「限定范围阅读，请勿转发」，不印「机密」，因为它在中文里是法定密级。英文 deck 印 Internal、Confidential 或 Restricted。`public` 什么都不印。

法定密级和保密期限写进 `meta.classification`，照原样写（如「秘密★1年」）。它只在封面左上角印一次，别处都不印。

页脚是沿版心底部的一行 16px 次级文字（12pt，与 PowerPoint 自带页脚同号），有字时上方带一条细线。声明 `branding: "none"` 的脸（构图里没有品牌框的位置，如整页金句、大数字）、声明 `footerRow: "none"` 的脸（画面压到页底，如整列出血的照片）和写了 `brand: "none"` 的菜单条目不画页脚这一行，页码也不画。

`branding` 与 `footer` 管两件事。`branding` 决定 logo 出现在哪里，`footer` 决定印哪些标记。写了 `branding: "full"` 而没写 `footer` 的 deck 保留它原来的页脚，读作 `{ "organization": true, "confidentiality": "footer" }`（`meta` 有哪样就印哪样）。它以前每页重复的日期和版本留在封面和结尾页，`full` 仍然在那里印。写了 `footer` 就以它为准，写空的 `footer: {}` 可以关掉旧页脚。

`validate` 拒绝：

- 写了 `organization` 但没有 `meta.organization`
- 写了 `confidentiality` 但没有 `meta.confidentiality`，或取值为 `public`
- `confidentiality` 与 `meta.classification` 同时出现
- 把法定密级写进 `label`、`notice` 或 `draft`
- 页脚一行太长，底部放不下（页脚不会截断作者的字）

## 资产与背景

每个 `assets.images` 条目包含 `src`，还可以带 `alt` 或 `error`。`src` 可以是 data URI，也可以是装载器支持的本地或远程来源。组件通过 `asset_id` 引用条目。

背景分为 `color`、`gradient` 与 `asset`。封面和章节页的资产背景会采用专门的可读压图处理。为图片内容找素材前先运行 `pptwise asset-brief <target>`，取得真实画框与裁切方式。

## 校验

`pptwise validate` 是现行契约。作者写的字符串必须把数值本身写出来。不要用剩余条数或省略号代替内容。validate 会拒绝。

这项检查会遍历 `slides` 与 `meta` 下的每一个字符串叶子，所以新的组件字段会自动被覆盖。spec 的标题走同一项检查。

## Deck 项目还是裸 IR

小型生成输入或直接 API 边界可以使用裸 IR。迭代工作建议使用 deck 项目。项目把主题绑定与页面语义放在 `deck.spec.json`，把内容放在 `pages/<id>.json`，再组装为同一个 IR v5，不把渲染选择写回源文件。

详见 [Deck 项目](./deck-projects.md)（英文）与 [菜单查表](./menu-lookup.md)（英文）。
