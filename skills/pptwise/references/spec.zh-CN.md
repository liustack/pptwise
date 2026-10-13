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
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

`themes --json` 的每个主题行都带 `menu`。`menu.content` 的键就是这个主题提供的内容 kind，想知道某个主题支不支持某种 kind，就读这里。`menu.content` 里没有的 kind，用这个主题时按它最近的替身 kind 来画，见[主题缺少的讲法](#主题缺少的讲法)。不要去翻已安装包的文件找菜单。

IR 组件契约在填页时用 `pptwise inspect deck-dir/ --page <id>` 按页读取。见 `components.md`。

命令输出与工作区文件优先于本指南。提问前先找已有 `deck.spec.json`、deck 内 `theme.json`、工作区 `themes/`，以及用户递来的 Office 品牌文件。

## 意图与叙事

意图记录讲给谁、要促成什么结果、现场讲述还是传阅、可用时长。叙事是根据意图作出的第一个决定，确定论证方式、节奏与语气。

用户在场且仍缺关键事实时，只问一轮简洁问题：

1. 受众是谁，结束后应该决定、理解或做什么？
2. 会有人现场讲，还是文件必须独立读懂？有多少时间？
3. 论证应该结论先行、按故事展开、分步教学、突出一个画面或数字，还是写成紧凑简报？
4. 页面应该密、均衡，还是留白？

用 `pptwise narratives --json` 把答案映射成具名预设，或显式的 `strategy`、`pacing`、`audience`。不要从品牌配色推导叙事。随大纲用一句话说出这份叙事包，让用户一次回答就能定下。

## 选择、创建并绑定主题

主题是第二个决定，必须早于 spec。主题是一个完整文件，包含样式、页面菜单、可选品牌规则、`occasions` 与 `identity`。菜单只服务 11 种内容页讲法中的一个明确子集。

先按场合，再按视觉个性强度挑出一个主题，随大纲用一句话说明理由。只有用户想先看看有哪些样子再选，才用他自己的封面标题画出候选：宿主有 `pptwise_themes` 工具时用它，否则用 CLI 出主题墙：

```bash
pptwise theme try brief,swiss,memo --title "Q3 review" --subtitle "Board meeting" --json
```

带 `--title` 时，`theme try` 给每个点名的主题画一张封面和一张正文页，主题数不限，也可以写 `all`，不点名时按 `--occasion <words>` 画四到六个的短名单，并打印一份清单，列出每页一个 SVG，外加 `contact-sheet.html`。`--lang zh` 或 `--lang en` 决定默认正文页的语言。`--page <file>` 改画这份 deck 自己的一张正文页，写法同页面，带上它的 `kind`。某个主题画不了的页会从该主题那一行里拿掉，清单写明原因。把 SVG 或联系表给用户看。图是给用户的：不要自己读图来评判主题。不带 `--title` 时，`theme try` 用 2 到 4 个主题渲染一份固定的英文样张。

创建就是拷贝。即使从出厂预设开始，也优先创建工作区自有主题：

```bash
pptwise theme new --from brief --id acme-report
```

有 Office 主题或模板时，先按场合选主题，再用模板的品牌色和字体给它重新上色。主题保留自己的菜单、纸色和文字色：

```bash
pptwise brand extract corp.pptx -o themes/acme.theme.json --from bulletin
```

已有主题要换成品牌色时，用 `--brand` fork 它。fork 保持菜单逐字节相同，并围绕这个颜色重新上色：

```bash
pptwise theme fork acme --brand '#0B5FFF' --id acme-blue
```

主题名按四级解析：

1. deck 目录，包括 `theme.json` 与具名主题 JSON。
2. 从 deck 向上查找的工作区 `themes/`。
3. 已装的内容包，位于 `$PPTWISE_HOME/packs/`，安装时由 `pptwise packs sync` 装好。
4. 出厂预设。

工作区里的同名文件会遮住包内主题。包内主题的 id 不会与出厂预设重名。

在 `deck.spec.json` 的 `theme` 中写入唯一名称完成绑定。要把工作区主题冻结给单个 deck，保持 id 不变，把完整文件复制到 deck 目录并命名为 `theme.json`。之后 deck 命令会自动装载。

<!-- generated:begin themes -->
### 出厂预设全量表

本段由预设库及每个预设的菜单生成。`identity` 表示视觉个性强度。`菜单词数` 与最后一列都只计算内容页讲法。

| id | label | occasions | identity | 菜单词数 | 提供的 kind |
| --- | --- | --- | --- | ---: | --- |
| `brief` | Brief | business | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `bulletin` | Bulletin | business, institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `thesis` | Thesis | education | medium | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `ledger` | Ledger | finance | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `rally` | Rally | marketing, event, entertainment | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `homeroom` | Homeroom | education | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `ink` | Ink | culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `terminal` | Terminal | tech | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `runway` | Runway | fashion | high | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
| `journal` | Journal | editorial | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `luxe` | Luxe | luxury, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `clinic` | Clinic | health | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `almanac` | Almanac | sustainability | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `ember` | Ember | startup | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `vermilion` | Vermilion | government, institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `crayon` | Crayon | kids, education | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement` |
| `museum` | Museum | museum, culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `stage` | Stage | keynote | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `lecture` | Lecture | education | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `swiss` | Swiss | institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `memo` | Memo | business, institutional | low | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `proposal` | Proposal | sales, business | medium | 9 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `fact`, `evidence`, `hierarchy` |
| `profile` | Profile | career | medium | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
| `recap` | Recap | review, career | medium | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
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

合法 spec 以 `cover` 开头，以 `ending` 结束，中间使用 `content` 或 `chapter`。每页都有 `id`、`type`、`heading`。内容页还必须有 `kind`。`focus` 可以点名偏好的组件类型。`summary` 是填充步骤使用的简短内容锚点。`kicker` 是标题上方的一行短标签，比如封面上的场合。只有给它留了位置的脸才画，没有位置时 validate 会点名是哪张脸。

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

修完硬错误，直到命令打印 `OK`。页数超出 `pacing` 通常的范围只是提示，不是错误。用户给了页数就保持那个页数。连续三张或更多内容页使用同一个 `kind` 时，会产生编辑提示。

## 主题缺少的讲法

spec 可以请求绑定主题没有提供的 `kind`。`spec validate` 只给一条提示，那一页按菜单里最近、且它的脸接得住这页组件的讲法来画。`fact` 先按 `data`，再按 `statement`。`quote` 按 `statement`。`evidence` 看展品是图表还是图片，按 `data` 或 `photo`。`hierarchy` 按 `points`。每条替身链都以 `points` 或 `list` 收尾。页面保留自己的 kind，换到提供这种 kind 的主题时又回到它自己的脸。`kind` 写页面真实的讲法，不要为了换一张脸改词。

## 换主题

换主题就是改名字：把 `deck.spec.json` 里的 `theme` 改掉，再 build 一次。不要先去改 spec 或页面文件。build 会报告新主题处理得不一样的地方：

- `drawnAs` 列出按别的讲法画的页面。
- 警告点名脸上没有位置的装饰字段（`kicker`、`stamp`、`tag`、`years`、`stage`）。它们不画出来，但留在页面文件里。
- 只要之前有一次 build 把每页都画全了，之后换到别的主题再 build，deck 照样画出来。新脸接不住的内容（`fields`、`ballot`、封面上的组件或脚注、和整页组件放在一起的组件、长列表末尾的几项）不画或截短，每一处都有警告点名页面，报告里的 `writtenFor` 写明哪个主题能把它画全。页面文件里的内容一样不少。照常交付，告诉用户哪几页少了什么。用户想在新主题里画全，再改那几页。
- 没有这样一次 build 时，错误点名新脸接不住的内容。改好那一页再 build。

把主题冻结成自己的 `theme.json` 的 deck 会一直用它：要换到菜单不同的主题，先删掉或替换这个文件。菜单相同的配色 fork 两样都不需要。用户想换个颜色又没说哪种时，先 fork 两三个，用 `theme try` 画出来，挑了再绑定。

很小的 deck 可以使用单个 IR 文件而不是 deck 项目。它仍遵循同一条链。顶层 `theme.id` 是绑定，每张内容页仍必须显式写 `kind`。
