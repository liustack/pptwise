---
summary: 'skills/pptwise/references/components.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/components.md
---

# 组件指南

何时读：主题与 `kind` 已经确定，需要选择填充页面的类型化内容单元时。

## 读取现场契约

写页面前先向已安装的 CLI 查精确字段。一次查一页，或这一页上的一个组件，不读整份 schema：

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise icons
```

页面查询列出绑定主题的脸在这一页能画的组件，以及 `validate` 对这一页的计数要求，列表之外的组件会被 `validate` 拒绝。组件查询打印一个组件的设计说明、它在这一页的上限和它的字段。图标字段的名字来自 `pptwise icons`。

没有 deck 项目时，比如直接写一个 IR 文件，按 kind 或按组件切出同一份契约：

```bash
pptwise schema --kind <kind> --theme <theme>
pptwise schema --component <type>
```

## 命名

组件类型叫 `blockquote`。页面讲法叫 `quote`。有归属的引文放进 `blockquote`，它既可以出现在 `quote` 页面，也可以作为其他页面的证据。不要写名为 `quote` 的组件类型。

## 语义归属

下表给出每种组件通常归属的 kind。只要页面的语义动作仍然准确，一个组件可以服务多个 kind。kind 命名页面在做什么，组件命名完成这件事的内容单元。

| component | 通常归属的 kind |
| --- | --- |
| `bullets` | `points`, `list` |
| `paragraph` | `points`, `statement` |
| `blockquote` | `quote` |
| `callout` | `points`, `statement`, `evidence` |
| `code` | `points`, `evidence` |
| `kpi_cards` | `data`, `fact` |
| `chart` | `data`, `evidence` |
| `flowchart` | `process` |
| `architecture` | `hierarchy` |
| `timeline` | `process` |
| `comparison` | `comparison` |
| `icon_cards` | `list`, `points` |
| `row_cards` | `list`, `points` |
| `steps` | `process` |
| `rings` | `data`, `hierarchy` |
| `numbered_cards` | `points`, `process` |
| `roadmap` | `process` |
| `matrix` | `comparison`, `hierarchy` |
| `insight_panel` | `points`, `evidence` |
| `verdict_banner` | `statement`, `points` |
| `image` | `photo`, `evidence` |
| `image_grid` | `photo`, `list` |
| `image_compare` | `comparison`, `evidence` |
| `logo_wall` | `list` |
| `product_cards` | `list`, `comparison` |
| `quote_wall` | `evidence` |
| `swot` | `comparison` |
| `bmc` | `hierarchy` |
| `waterfall` | `data`, `process` |
| `gantt` | `process` |
| `pest` | `comparison` |
| `five_forces` | `hierarchy` |
| `heatmap` | `data`, `comparison` |
| `sankey` | `data`, `process` |
| `data_table` | `data`, `evidence` |
| `device_mockup` | `photo`, `evidence` |
| `cycle` | `process` |
| `people_cards` | `list` |
| `hub_spoke` | `hierarchy` |
| `progress_donuts` | `data` |
| `staircase` | `process` |
| `chevron_process` | `process` |
| `swimlane` | `process` |
| `journey_map` | `process` |
| `decision_tree` | `hierarchy`, `process` |
| `from_to` | `comparison` |
| `org_tree` | `hierarchy` |
| `issue_tree` | `hierarchy` |
| `pyramid` | `hierarchy` |
| `iceberg` | `hierarchy`, `statement` |
| `pillar_model` | `hierarchy` |
| `value_chain` | `process` |
| `harvey_balls` | `data`, `comparison` |
| `scorecard` | `data`, `comparison` |
| `pictogram` | `data`, `fact` |
| `word_cloud` | `data`, `list` |
| `venn` | `comparison` |
| `fishbone` | `hierarchy` |
| `positioning_map` | `comparison` |
| `concept_equation` | `points`、`statement` |
| `segmented_wheel` | `hierarchy`、`list` |
| `pros_cons` | `comparison` |

## 相近组件

- 线的含义是「向谁汇报」用 `org_tree`，是「拆解成」用 `issue_tree`，是按条件做判断用 `flowchart`。
- 上层由下层支撑（结论压在论据上、高一级压在低一级上）用 `pyramid`，同心包含用 `rings`，每层装的是系统构件用 `architecture`，有先后顺序用 `steps`。
- 要说「说得出口的只是一小部分」用 `iceberg`，两组东西平级掂量用 `comparison`。
- 目标要靠几件事同时立住才成立用 `pillar_model`，只是并列几项用 `icon_cards`。
- 问「价值出在哪一环」用 `value_chain`，只讲先后用 `steps`，讲数量的分合用 `sankey`。
- 直线步骤用 `steps`，有决策分支用 `flowchart`，末段回到首段用 `cycle`。
- 工作必须依次穿过每个环节、交接本身是重点时用 `chevron_process`；环节之间差的是程度而不是先后用 `staircase`；每一步归谁做也是论点用 `swimlane`。
- 每个阶段都带 1-5 的情绪分、最低点就是论点时用 `journey_map`；阶段不带情绪用 `chevron_process`。
- 一个条件把读者送上两三条路之一、每个结局各有代价时用 `decision_tree`；一条主线上带若干决策用 `flowchart`。
- 同一批指标在两个状态下都有值、移动幅度就是论点时用 `from_to`；两边是不同主体而不是同一主体的两次用 `comparison`。
- 一个中心概念带一组无序并列要素用 `hub_spoke`，要素闭环用 `cycle`，层层包含用 `rings`。
- 两三个集合互相重叠、重叠处才是结论时用 `venn`，两边互相权衡用 `comparison`，层层包含用 `rings`。
- 结果已经发生、页面在给原因分类时用 `fishbone`，方框通向某个终点时用 `flowchart`。
- 每个主体在两个连续维度上的位置就是论据时用 `positioning_map`，两个维度是分类而不是刻度时用 `matrix`。
- 两三个要素加起来得到一个结果、相加本身就是论证时用 `concept_equation`，条目之间不产生结果时用 `icon_cards`。
- 四到八块对等的部分合起来正好是一个整体时用 `segmented_wheel`，末段回到首段用 `cycle`，各块占比不等用 `chart` 内的 `pie`。
- 两栏说的是同一个方案的正反两面、最后要落一句结论时用 `pros_cons`，两栏是两个不同对象时用 `comparison`。
- 没有共享数值轴的工作线用 `roadmap`，在同一日期轴上比较条形用 `gantt`。
- 四类外部宏观因素用 `pest`，同时评估内外部战略条件用 `swot`。
- 带宽承载数量并发生分支与汇合时用 `sankey`：宽度即论据，缺口显示未核算的流量。分支表达决策而非数量时用 `flowchart`。
- 需要逐行读取精确值时用 `data_table`，需要一眼看懂数值形态时用 `chart`，定性属性对照用 `comparison`。
- 一个值对一个目标用 `chart` 内的 `gauge`，多个完成度百分比用 `progress_donuts`，一个或多个独立头条数字用 `kpi_cards`。
- `kpi_cards` 的每一项可以写 `note`，交代这个数字的口径：比的基数、时间段，或背后的计数。数字出自哪里写进 `source`。图表页要点名它讲的数字，就在 `chart` 后面跟一到两项 `kpi_cards`，需要收束时再跟一个 `callout` 或 `blockquote`。会在图旁排数字栏的主题直接用作者写的数字，不再自己推算。
- 每个类别的总量和它由哪几块组成都要看时用 `chart` 内的 `stacked`。只比构成、各类别总量相差太大没法比分块时用 `percent_stacked`，系列要并排比而不是相加时用 `bar`。
- 两个指标共用一条类别轴时用 `chart` 内的 `combo`，比如按季度看收入和毛利率。单位不同的那个指标放到 `axis: "right"`。两个指标的类别对不上时拆成两张图。
- 想在一张 `bar` 图里把两组类别区分开（比如全年和上半年），每组各写一个系列，系列里只写它自己覆盖的类别。每根柱子仍居中对准自己的类别，颜色跟随所属系列。不要为此用 0 填满另一个系列，也不要改成 `stacked`：0 是一个数据点，图会把它当成真实数值。

- `logo_wall` 用在一串组织名字本身就是论据、每个名字权重相同时。照片用 `image_grid`，每个名字都要配一句说明用 `row_cards`。

- `product_cards` 用在每一项都是可购买的东西、各自带一张图时。同一组属性横向权衡用 `comparison`，参数要逐行读用 `data_table`。

- `quote_wall` 用在几个人说同一件事本身就是论据时。一个人说一句、要放大到整页用 `blockquote`，页面讲的是这些人是谁用 `people_cards`。

- 几个方案在同一组标准上按五档打分、要一眼看出短板时用 `harvey_balls`。数值是连续量、要看它在两个维度上的分布时用 `heatmap`，任何数字要读准时用 `data_table`，没有共同刻度的定性属性对照用 `comparison`。

- 每个数字都对着一个目标、还要给结论时用 `scorecard`。只报数字不下结论用 `data_table`。

- 要把比例还原成数得过来的人时用 `pictogram`。比例本身是主角时用 `progress_donuts`。

- 重点是「哪些词反复出现」时用 `word_cloud`。次数要被读出来时用 `chart`，一排等重短标签用 `tag_row`。

## 图表类型

`chart_type` 决定画法。其中三种对系列有别的类型没有的要求：

- `stacked` 与 `percent_stacked` 需要两个或以上系列，落在同一组类别上。`percent_stacked` 不接受负值，每个类别的合计必须大于零。
- `combo` 里写了 `plot: "line"` 的系列画成线，其余画成柱，线和柱至少各一个。写了 `axis: "right"` 的系列读右侧那条自有刻度的轴，轴标题与单位写在 `axes.y2_title` 和 `axes.y2_unit`。

```json
{
  "type": "chart",
  "chart_type": "combo",
  "axes": { "y_title": "收入", "y_unit": "万元", "y2_title": "毛利率", "y2_unit": "%" },
  "series": [
    { "name": "收入", "data": [{ "x": "第一季度", "y": 720 }, { "x": "第二季度", "y": 820 }] },
    { "name": "毛利率", "plot": "line", "axis": "right", "data": [{ "x": "第一季度", "y": 31.5 }, { "x": "第二季度", "y": 29.8 }] }
  ]
}
```

`bar` 在每个数值都能印在自己的柱旁时逐柱印出数值，否则一个都不印，导出会停下，直到数字改短或类别、系列减少。`stacked` 的合计按同样的规则印。`percent_stacked` 在图上不印数字，`combo` 只在被标记的线上印数字（见下文「标出页面要讲的那一项」）。观众必须读准的数字写进标题或放进 `data_table`。

数值轴上的任何值，绝对值都不能超过 1e300。超了就把这条轴上的所有系列除以同一个十的幂，把单位写进这条轴的单位字段。`waterfall` 的数值和各柱落到的累计值也一样：所有条目除以同一个十的幂，单位写进 `unit`。

`waterfall` 的各级累计值和合计都大于零、且最低一级不低于最高一级的一半时，坐标轴不从零起，把高度留给中间的涨跌。此时每根合计柱底部画一道截断标记。

## 标出页面要讲的那一项

四个组件允许作者把页面要论证的那一部分单独标出来。标记都是可选的，不写标记的组件和原来画得一模一样。

- `chart`：在某个系列上写 `emphasis: true`，它保留主色，其余系列一律变灰。只适用于两个或以上系列的 `bar`、`line`、`area`、`scatter`、`stacked`、`percent_stacked` 与 `combo`，且只能标一个系列。`combo` 里被标记的线还会在每个点上方印出数值（带这条轴的单位），前提是每个数值都碰不到柱、点、线和其他数值。只要有一个碰到，就一个都不印，数值仍可从坐标轴读出。
- `waterfall`：在页面要讲的条目上写 `emphasis: true`，这些柱填强调色，合计柱填主色，其余变灰。被标记的条目必须相邻，且不能是合计。`emphasis_label` 在横跨被标记柱的括号上方印一行说明，至少要有一个被标记的条目。
- `comparison`：`recommended` 是 `columns` 里被推荐那一项的序号，从 0 数起。这一列的表头和单元格改用主色加粗。任何单元格都可以用 `**…**` 标出一段，画法与主题在别处标记重点的方式相同。
- `roadmap`：在某个阶段上写 `emphasis: true`，只有这张卡保留强调色顶条，其余卡的顶条改为主色。只能标一个阶段。

```json
{
  "type": "waterfall",
  "unit": "$",
  "emphasis_label": "计划类因素：+$1.25 涨幅里占 +$1.11",
  "items": [
    { "label": "FY2023", "value": 4.1, "kind": "total" },
    { "label": "首投失败", "value": 0.48, "emphasis": true },
    { "label": "路线密度下降", "value": 0.37, "emphasis": true },
    { "label": "司机加班", "value": 0.26, "emphasis": true },
    { "label": "燃油", "value": 0.09 },
    { "label": "其他", "value": 0.05 },
    { "label": "FY2026", "value": 5.35, "kind": "total" }
  ]
}
```

`architecture.layers` 默认从上向下绘制。作者按基座优先的顺序写作时，设置 `direction: "bottom_up"`，不要手工倒置数组。

`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap`、`sankey`、`harvey_balls`、`scorecard`、`pictogram` 与 `word_cloud` 是全页组件。它们必须独占页面。
