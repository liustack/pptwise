---
summary: 'skills/pptwise/references/spec.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/spec.md
---

# 意图、叙事、主题绑定与 spec

何时读：创建 `deck.spec.json`、选择主题、或处理菜单不匹配时。

作者链条是因果单向的：

```text
意图 -> 叙事 -> 主题绑定 -> 带 kind 的 spec -> 填充 -> 渲染
```

## 读取现场词汇

每个 deck 任务开始时运行：

```bash
pptwise schema
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

命令输出与工作区文件优先于本指南。提问前先找已有 `deck.spec.json`、deck 内 `theme.json`、工作区 `themes/`，以及用户递来的 Office 品牌文件。

## 意图与叙事

意图记录讲给谁、要促成什么结果、现场讲述还是传阅、可用时长。叙事是根据意图作出的第一个决定，确定论证方式、节奏与语气。

用户在场且仍缺关键事实时，只问一轮简洁问题：

1. 受众是谁，结束后应该决定、理解或做什么？
2. 会有人现场讲，还是文件必须独立读懂？有多少时间？
3. 论证应该结论先行、按故事展开、分步教学、突出一个画面或数字，还是写成紧凑简报？
4. 页面应该密、均衡，还是留白？

用 `pptwise narratives --json` 把答案映射成具名预设，或显式的 `strategy`、`pacing`、`audience`。不要从品牌配色推导叙事。先确认这份叙事包，再选择主题。

## 选择、创建并绑定主题

主题是第二个决定，必须早于 spec。主题是一个完整文件，包含样式、页面菜单、可选品牌规则、`occasions` 与 `identity`。菜单只服务 11 种内容页讲法中的一个明确子集。

先按场合筛选，再按视觉个性强度筛选。用固定样张比较 2 到 4 个候选：

```bash
pptwise theme try brief,swiss,memo
```

`theme try` 用每个候选渲染同一份固定样张 deck。只有这里会在不绑定 deck 的情况下比较主题。按图选，不要只看名字。

创建就是拷贝。即使从出厂预设开始，也优先创建工作区自有主题：

```bash
pptwise theme new --from brief --id acme-report
```

有 Office 主题或模板时，先按场合选择菜单来源，再把配色与字体抽进一个完整的 v2 文件：

```bash
pptwise brand extract corp.pptx -o themes/acme.theme.json --from brief
```

已有主题要改色时，fork 它。fork 保持菜单逐字节相同，并重新派生整套配色：

```bash
pptwise theme fork acme --primary '#0B5FFF' --id acme-blue
```

主题名按三级解析：

1. deck 目录，包括 `theme.json` 与具名主题 JSON。
2. 从 deck 向上查找的工作区 `themes/`。
3. 出厂预设。

在 `deck.spec.json` 的 `theme` 中写入唯一名称完成绑定。要把工作区主题冻结给单个 deck，保持 id 不变，把完整文件复制到 deck 目录并命名为 `theme.json`。之后 deck 命令会自动装载。

<!-- generated:begin themes -->
### 出厂预设全量表

本段由预设库及每个预设的菜单生成。`identity` 表示视觉个性强度。`菜单词数` 与最后一列都只计算内容页讲法。

| id | label | occasions | identity | 菜单词数 | 提供的 kind |
| --- | --- | --- | --- | ---: | --- |
| `brief` | Brief | business | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `bulletin` | Bulletin | business, institutional | low | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `thesis` | Thesis | education | medium | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `ledger` | Ledger | finance | medium | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `quote`, `fact`, `hierarchy` |
| `rally` | Rally | marketing, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `homeroom` | Homeroom | education | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `ink` | Ink Wash | culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `terminal` | Terminal | tech | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `runway` | Runway | fashion | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement` |
| `journal` | Editorial Journal | editorial | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `luxe` | Luxe | luxury, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `heritage` | Heritage | culture, luxury | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `clinic` | Clinic | health | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `almanac` | Almanac | sustainability | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `ember` | Ember | startup | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `vermilion` | Official Report | government, institutional | low | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `fact`, `evidence`, `hierarchy` |
| `crayon` | Crayon | kids, education | high | 6 | `points`, `list`, `comparison`, `process`, `photo`, `statement` |
| `arena` | Arena | entertainment | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `museum` | Museum | museum, culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `stage` | Keynote Stage | keynote | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `lecture` | Lecture Hall | education | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `swiss` | Swiss Institutional | institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `memo` | Decision Memo | business, institutional | low | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `quote`, `fact`, `hierarchy` |
| `playbill` | Playbill | event, entertainment | high | 9 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `hierarchy` |
<!-- generated:end themes -->

## 11 种内容页讲法

`kind` 说明内容页怎样表达观点。每张内容页必填。封面、章节与结尾不写。

| `kind` | 何时使用 | 不要混淆 |
| --- | --- | --- |
| `points` | 论证按顺序逐步推进 | `list` 的条目可以换序 |
| `list` | 一组并列项一起陈列 | `points` 的顺序承载论证 |
| `comparison` | 方案或两边需要直接对照 | 包含关系用 `hierarchy`，方向关系用 `process` |
| `process` | 步骤、时间、运动或闭环很重要 | 没有流程关系的递进论证用 `points` |
| `data` | 一组数字、图表或表格是主角 | 只有一个数字时用 `fact` |
| `photo` | 画面本身就是内容 | 展品服务断言时用 `evidence` |
| `statement` | 作者自己的一句话立论占满一页 | 借别人之口用 `quote` |
| `quote` | 文字归属于另一位说话者或来源 | 作者自己的话用 `statement` |
| `fact` | 一个数字承担整页信息 | 多个数字之间的结构用 `data` |
| `evidence` | 一个断言配一件支持它的展品 | 图片独立成义时用 `photo` |
| `hierarchy` | 页面解释包含、层级或组成 | 先后关系用 `process`，两边对照用 `comparison` |

四条边界能解决大多数歧义：

- `statement`、`quote`、`fact`、`evidence` 的区别在说话主体，分别是自己的立论、别人的话、一个数字、断言加展品。
- `data` 展示多个值之间的结构。`fact` 用一个值制造冲击。
- `points` 有递进。`list` 可换序。
- `photo` 让画面成为信息。`evidence` 让画面服务断言。

## 编写 spec

合法 spec 以 `cover` 开头，以 `ending` 结束，中间使用 `content` 或 `chapter`。每页都有 `id`、`type`、`heading`。内容页还必须有 `kind`。`focus` 可以点名偏好的组件类型。`summary` 是填充步骤使用的简短内容锚点。

```json
{
  "version": "1",
  "filename": "q3-review.pptx",
  "narrative": "boardroom-report",
  "theme": "acme-report",
  "meta": { "organization": "Acme", "date": "2026 Q3" },
  "pages": [
    { "id": "cover", "type": "cover", "heading": "Q3 经营复盘" },
    { "id": "decision", "type": "content", "kind": "points", "heading": "两项动作守住全年目标" },
    { "id": "options", "type": "content", "kind": "comparison", "heading": "聚焦方案回报更快" },
    { "id": "economics", "type": "content", "kind": "data", "heading": "利润率在年末前恢复" },
    { "id": "delivery", "type": "content", "kind": "process", "heading": "三次发布补齐缺口" },
    { "id": "close", "type": "ending", "heading": "批准聚焦方案" }
  ]
}
```

spec 不含页面几何或渲染选择状态。不要加入已退役的作者字段。后续页面文件只装可填内容，不重复 `type`、`kind` 或 `heading`。

运行：

```bash
pptwise spec validate deck.spec.json
```

修完硬错误，直到命令打印 `OK`。页数会按 `pacing` 检查。连续三张或更多内容页使用同一个 `kind` 时，会产生编辑提示。

## 菜单不匹配怎么处理

spec 请求了绑定主题没有提供的 `kind` 时，校验会失败并列出可用词。按这个顺序处理：

1. 重查页面的语义姿势。只有另一个可用词确实正确时才改 `kind`。
2. 页面意图不能变时，选择或创建菜单能服务它的主题。
3. 已经填过内容时，回到主题层。保留有用的事实、数据、图片与文案片段，再按新菜单重写 spec 与页面文件。

不要为了通过校验硬套一个相近词。菜单缺口是主题决策，不是几何缺口。

## 开工后的换绑

菜单相同的配色 fork 可以替换绑定主题。更新绑定名称，再重跑 spec validate、assemble、validate、audit 与 render。

菜单不同的主题不是换色，必须回到主题层重写 spec。CLI 会直接比较规范化后的菜单，并拒绝流程内换绑到不同菜单。

很小的 deck 可以使用单个 IR 文件而不是 deck 项目。它仍遵循同一条链。顶层 `theme.id` 是绑定，每张内容页仍必须显式写 `kind`。
