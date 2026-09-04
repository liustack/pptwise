---
summary: 'skills/pptwise/SKILL.md 的中文阅读镜像，仅供人工审阅该 skill 会指示 agent 做什么'
mirror_of: skills/pptwise/SKILL.md
---

# pptwise deck 生成操作手册

> 本文件是 [`skills/pptwise/SKILL.md`](./SKILL.md) 的中文阅读镜像。agent 只注册并执行英文版。两份文件如有出入，以英文版为准。

pptwise 把语义 JSON 转成原生 DrawingML `.pptx`。文字与图形在 PowerPoint 中保持可编辑。作者只描述每页在怎么讲，以及页面包含哪些有类型的组件。页面的脸、几何、配色、字体和装饰归主题与引擎。

严格按这条单向链工作，不跨步，不同时决定两层。

```text
意图 -> 叙事 -> 主题绑定 -> 带 kind 的 spec -> 填充 -> 渲染
```

## 运行 CLI

所有命令都通过本文件旁边的启动器运行。把 `<skill-dir>` 换成本 skill 的目录。

```bash
bash <skill-dir>/scripts/run.sh <args>                                       # macOS / Linux
powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\run.ps1 <args>  # Windows
```

启动器依次尝试 `PATH` 上兼容的 `pptwise`、`npx`、`bunx`，参数和退出码原样透传。退出码 78 表示没有 JavaScript 运行时。转告 stderr 中的 `nextSteps`，不要重试。

无法执行脚本时，使用第一条可行路径：

1. 已安装版本的主版本与本 skill 一致，且不低于钉定版本时，运行 `pptwise <args>`。
2. `npx --yes --package @liustack/pptwise@0.32.0 pptwise <args>`。
3. `bunx --bun @liustack/pptwise@0.32.0 <args>`。
4. 都不可用时，请用户安装 Node 22.19+ 或 Bun。

安装后运行 `pptwise doctor`。某个失败无法由错误信息本身解释时也先运行它。转告结果，不要猜。

## 先读取现场真相

永远不要凭记忆写 IR 或 spec。每个 deck 任务开始时运行：

```bash
pptwise schema
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

提问前先扫描工作区。已有 `deck.spec.json` 会记录叙事、绑定主题、页面顺序、标题与每张内容页的 `kind`。deck 内 `theme.json`、工作区 `themes/` 文件、用户点名的主题，或递来的 `.thmx`、`.potx`、带品牌 `.pptx` 都是主题信号。

## 工作流

### 1. 意图

选择讲法前先记录四个事实：受众、想要的结果、现场讲述还是传阅、可用时长。请求或工作区已经给出的事实直接推导。用户在场且仍缺关键事实时，把所有未决问题合并成一轮询问。

### 2. 叙事

先定叙事，再定主题。叙事决定论证方式、节奏与语气。完全匹配时使用具名预设，否则显式写 `strategy`、`pacing`、`audience`。`pacing` 控制编辑预算与正文字号基线。叙事从不选择页面的脸。

继续前先确认叙事包。简洁访谈与 spec 示例见 `references/spec.md`。

### 3. 绑定主题

主题是一个完整、自包含的文件，包含样式、页面菜单、可选品牌规则与场合元数据。内容菜单只服务全局 11 个 `kind` 中的一个子集。缺少某个词是设计选择。

主题名按三级查找：

1. deck 目录。
2. 从当前目录向上查找工作区 `themes/`。
3. 24 个出厂预设。

按请求与工作区信号，用 `occasions` 和 `identity` 筛出候选。用固定样张比较 2 到 4 个候选：

```bash
pptwise theme try brief,swiss,memo
```

创建就是拷贝。没有现成资产时，把最接近的预设拷进工作区。有 Office 品牌文件时，抽取配色与字体，同时拷入合适的菜单。要改色时，fork 当前主题，让整套配色重新派生，原主题保持不动。

```bash
pptwise theme new --from brief --id acme-report
pptwise brand extract corp.pptx -o themes/acme.theme.json --from brief
pptwise theme fork acme --primary '#0B5FFF' --id acme-blue
```

写页面内容之前，把选中的主题名写进 `deck.spec.json`。绑定后的 deck 命令只读这个名字，没有渲染时临时换主题。

工作流中可以换绑到菜单相同的配色 fork。菜单不同就是另一套主题。回到本步骤，保留意图、叙事、事实、数据、图片与可复用文案，再按新菜单重写 spec 与填充。

### 4. 用 `kind` 写 spec

spec 锁定主题、叙事、品牌姿态、页面顺序、页型、标题，以及每张内容页的 `kind`。它不保存任何渲染选择状态。

- `cover`、`chapter`、`ending` 是页型，不写 `kind`。
- 每张 `content` 页必须显式写且只写一个 `kind`。
- 作者只写语义 `kind`，从不选择页面的脸或几何。
- `focus` 与 `summary` 是可选写作提示。

运行 `pptwise spec validate deck.spec.json`，直到打印 `OK`。内容页 `kind` 不在绑定主题菜单中时会硬报错，并列出菜单提供的词。不要为了消错给页面贴一个失真的词。只有页面意图确实匹配时才换词，否则回到主题层。

11 个词及边界见 `references/layouts.md`。完整 spec 与主题创建流程见 `references/spec.md`。

### 5. 填页面

每批至多写四个 `pages/<id>.json`。页面文件可以含 `components`、`background`、`image_side`、`footnote`、`notes`。不要重复 `type`、`kind`、`heading`，它们归 spec。

选择服务本页 `kind` 的组件。`quote` 是页面讲法，引用组件名是 `blockquote`。组件归属与相似项对照见 `references/components.md`。节奏与容量见 `references/density.md`。图片流程见 `references/images.md`。

每批完成后运行：

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

修完每个错误后重跑两条命令。重组内容，不要删除校验抓到的信息。

### 6. 审查、预览与渲染

所有页面填完后运行：

```bash
pptwise audit deck-dir/
pptwise preview deck-dir/ --html
pptwise render deck-dir/
```

交付前 `audit` 必须以 0 退出。文字压在照片背景上时加 `--pixels`。有 `pptwise_preview` 工具时优先使用。否则交付命令打印的 `preview.html` 路径，或运行 `pptwise serve deck-dir/ --no-open` 做实时浏览器审阅。把 `render` 打印的 `.pptx` 绝对路径报给用户。

只有用户明确接受妥协时才使用 `--draft` 或 `--allow-dropped-content`。

## 快速组件分派

| 页面意图 | `kind` | 常用组件 |
| --- | --- | --- |
| 有顺序的论证 | `points` | `bullets`、`numbered_cards`、`paragraph` |
| 可换序的并列项 | `list` | `row_cards`、`icon_cards`、`tag_row`、`people_cards` |
| 并排看差异 | `comparison` | `comparison`、`image_compare`、`matrix`、`swot` |
| 有方向的步骤或时间 | `process` | `steps`、`flowchart`、`timeline`、`roadmap`、`gantt`、`cycle` |
| 一组数字的结构 | `data` | `chart`、`data_table`、`kpi_cards`、`progress_donuts`、`heatmap`、`sankey` |
| 画面本身就是信息 | `photo` | `image`、`image_grid`、`device_mockup` |
| 作者自己的立论 | `statement` | `verdict_banner`、`callout`，也可以没有组件 |
| 借别人之口 | `quote` | `blockquote` |
| 一个数字就是全部 | `fact` | 单项 `kpi_cards`，也可以没有组件 |
| 断言配一件展品 | `evidence` | `image`、`chart`、`data_table`、`code`、`device_mockup` |
| 包含或层级 | `hierarchy` | `architecture`、`bmc`、`five_forces`、`rings`、`hub_spoke` |

## 规则

- 从不编辑或后处理生成的 `.pptx`。
- 从不在作者内容中加入坐标、SVG、页面脸名或几何控制。
- 面向用户的 deck 文案跟随用户语言。schema 键与枚举值使用英文。
- 不声称 `chart` 或 `data_table` 的数字是原生 PowerPoint 数据对象。它们导出为可编辑的成组图形与文字。改数字要改源文件并重新渲染。
- preview 全程只读。修订回到 `deck.spec.json`、`pages/*.json`、资产或绑定主题文件。

## 何时阅读

- `references/spec.md`：意图、叙事、主题创建、绑定、换绑、spec 与菜单错误。
- `references/layouts.md`：在 11 个 `kind` 中选择。
- `references/components.md`：组件归属、字段与相似项选择。
- `references/density.md`：节奏、容量、独占页面组件与局部装饰。
- `references/branding.md`：deck 品牌姿态、无框页面、logo 与品牌抽取。
- `references/images.md`：图片资产、图库、生图，以及 `photo` 和 `evidence` 的边界。
- `references/validate.md`：assemble、validate、audit、preview、serve、render 与修订循环。
