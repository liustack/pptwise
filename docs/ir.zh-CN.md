---
summary: 'IR v5：deck 字段、内容页必填 kind、页面字段、组件、资产、叙事 pacing、品牌，以及选型字段的严格删除'
read_when:
  - 编写或验证裸 IR 文件
  - 某个字段、页面 kind、组件或版本被拒绝
  - 在裸 IR 与 deck 项目之间选择
  - 确认哪些语义字段会进入渲染
---

# IR v5

IR 是 pptwise 的类型化语义输入。版本 5 描述 deck 说什么、绑定哪个主题，以及每张页面由哪些组件填充。它不保存脸的选择或随机状态。

```json
{
  "version": "5",
  "filename": "hello.pptx",
  "narrative": "general",
  "theme": { "id": "consulting" },
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
| `theme` | object | 只绑定主题 id：`{ "id": "consulting" }`。默认 `consulting`。改颜色用 `pptwise theme fork`。品牌配置写在主题文件上。 |
| `meta` | object | 机构、作者、日期、版本、保密级别、联系信息、版权与动画。 |
| `assets` | object | `assets.images` 下的命名图片来源。 |
| `brand` | object | Deck logo 的资产 id 与角落位置。 |
| `branding` | enum | `full`、`cover-only` 或 `minimal`。省略等于 `cover-only`。 |
| `slides` | array | 有序页面。 |

根对象是严格结构，未知字段会让验证失败。

## 页型与页面字段

四种页型是 `cover`、`chapter`、`content` 与 `ending`。省略 `type` 时按 content 处理，因此仍然必须填写 `kind`。

通用页面字段包括：

- `id`，可选的稳定页面标识
- `placeholder: true`，通常由未完成的 deck 项目产生
- `heading` 与 `subheading`
- `components`
- `background`
- `decor`，一个受控的局部装饰原语
- `image_side`，支持该偏好的脸可读取 `left` 或 `right`
- `footnote`
- `notes`，导出为原生演讲者备注

只有内容页携带 `kind`，边界页不携带。边界页组件只有在主题菜单绑定的脸声明兼容槽位时才会渲染。输出前会按实际脸验证内容。

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

`components` 是由 37 种类型化单元组成的可辨识联合。精确字段应查询当前安装的 schema：

```bash
pptwise schema > ir.schema.json
```

带归属的引文组件叫 `blockquote`。不存在名为 `quote` 的组件类型。

`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap` 与 `sankey` 会占满正文区，必须独占页面。

组件的 kind 归属与相近选择见 [SKILL 组件指南](../skills/pptwise/references/components.zh-CN.md)。

## 资产与背景

每个 `assets.images` 条目包含 `src`，还可以带 `alt` 或 `error`。`src` 可以是 data URI，也可以是装载器支持的本地或远程来源。组件通过 `asset_id` 引用条目。

背景分为 `color`、`gradient` 与 `asset`。封面和章节页的资产背景会采用专门的可读压图处理。为图片内容找素材前先运行 `pptwise asset-brief <target>`，取得真实画框与裁切方式。

## Deck 项目还是裸 IR

小型生成输入或直接 API 边界可以使用裸 IR。迭代工作建议使用 deck 项目。项目把主题绑定与页面语义放在 `deck.spec.json`，把内容放在 `pages/<id>.json`，再组装为同一个 IR v5，不把渲染选择写回源文件。

详见 [Deck 项目](./deck-projects.md)（英文）与 [菜单查表](./menu-lookup.md)（英文）。
