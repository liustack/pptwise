---
summary: 'skills/pptwise/references/components.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/components.md
---

# 组件指南

何时读：主题与 `kind` 已经确定，需要选择填充页面的类型化内容单元时。

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

## 相近组件

- 直线步骤用 `steps`，有决策分支用 `flowchart`，末段回到首段用 `cycle`。
- 工作必须依次穿过每个环节、交接本身是重点时用 `chevron_process`；环节之间差的是程度而不是先后用 `staircase`；每一步归谁做也是论点用 `swimlane`。
- 每个阶段都带 1-5 的情绪分、最低点就是论点时用 `journey_map`；阶段不带情绪用 `chevron_process`。
- 一个条件把读者送上两三条路之一、每个结局各有代价时用 `decision_tree`；一条主线上带若干决策用 `flowchart`。
- 同一批指标在两个状态下都有值、移动幅度就是论点时用 `from_to`；两边是不同主体而不是同一主体的两次用 `comparison`。
- 一个中心概念带一组无序并列要素用 `hub_spoke`，要素闭环用 `cycle`，层层包含用 `rings`。
- 没有共享数值轴的工作线用 `roadmap`，在同一日期轴上比较条形用 `gantt`。
- 四类外部宏观因素用 `pest`，同时评估内外部战略条件用 `swot`。
- 带宽承载数量并发生分支与汇合时用 `sankey`：宽度即论据，缺口显示未核算的流量。分支表达决策而非数量时用 `flowchart`。
- 需要逐行读取精确值时用 `data_table`，需要一眼看懂数值形态时用 `chart`，定性属性对照用 `comparison`。
- 一个值对一个目标用 `chart` 内的 `gauge`，多个完成度百分比用 `progress_donuts`，一个或多个独立头条数字用 `kpi_cards`。

- `logo_wall` 用在一串组织名字本身就是论据、每个名字权重相同时。照片用 `image_grid`，每个名字都要配一句说明用 `row_cards`。

- `product_cards` 用在每一项都是可购买的东西、各自带一张图时。同一组属性横向权衡用 `comparison`，参数要逐行读用 `data_table`。

- `quote_wall` 用在几个人说同一件事本身就是论据时。一个人说一句、要放大到整页用 `blockquote`，页面讲的是这些人是谁用 `people_cards`。

`architecture.layers` 默认从上向下绘制。作者按基座优先的顺序写作时，设置 `direction: "bottom_up"`，不要手工倒置数组。

`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap` 与 `sankey` 是全页组件。它们必须独占页面。
