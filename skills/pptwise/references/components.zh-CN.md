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
| `citation` | `quote`, `evidence` |
| `image` | `photo`, `evidence` |
| `image_grid` | `photo`, `list` |
| `image_compare` | `comparison`, `evidence` |
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
| `tag_row` | `list` |
| `hub_spoke` | `hierarchy` |
| `progress_donuts` | `data` |

## 相近组件

- 直线步骤用 `steps`，有决策分支用 `flowchart`，末段回到首段用 `cycle`。
- 一个中心概念带一组无序并列要素用 `hub_spoke`，要素闭环用 `cycle`，层层包含用 `rings`。
- 没有共享数值轴的工作线用 `roadmap`，在同一日期轴上比较条形用 `gantt`。
- 四类外部宏观因素用 `pest`，同时评估内外部战略条件用 `swot`。
- 带宽承载守恒数量并发生分支与汇合时用 `sankey`，分支表达决策而非数量时用 `flowchart`。
- 需要逐行读取精确值时用 `data_table`，需要一眼看懂数值形态时用 `chart`，定性属性对照用 `comparison`。
- 一个值对一个目标用 `chart` 内的 `gauge`，多个完成度百分比用 `progress_donuts`，多个独立头条数字用 `kpi_cards`。
- `tag_row` 只放短标签。句子式条目用 `bullets`，每项都有说明文字时用卡片组件。

`architecture.layers` 默认从上向下绘制。作者按基座优先的顺序写作时，设置 `direction: "bottom_up"`，不要手工倒置数组。

`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap` 与 `sankey` 是全页组件。它们必须独占页面。
