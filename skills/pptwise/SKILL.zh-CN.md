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

1. 已安装版本与钉定版本兼容时，运行 `pptwise <args>`。钉定版本为 0.x 时要求主版本和次版本都相同，补丁版本不低于钉定值。1.0 及以后要求主版本相同，且不低于钉定版本。
2. `npx --yes --package @liustack/pptwise@0.42.0 pptwise <args>`。
3. `bunx --bun @liustack/pptwise@0.42.0 <args>`。
4. 都不可用时，请用户安装 Node 22.19+ 或 Bun。

安装后运行 `pptwise doctor`。某个失败无法由错误信息本身解释时也先运行它。转告结果，不要猜。

## 先读取现场真相

永远不要凭记忆写 IR 或 spec。每个 deck 任务开始时运行：

```bash
pptwise schema --spec
pptwise narratives --json
pptwise packs sync
pptwise themes --json
```

配置了 license 时，`packs sync` 会安装或更新用户的内容包，`themes --json` 随后会列出包内主题，并标 `"source": "pack"`。没有 license 时它只打印一行并以 0 退出。失败时转告它的信息，用已装的内容继续。每个主题行都带 `menu`：`menu.content` 的键就是它提供的内容讲法。IR 组件契约在填页时按页读取，不整份读。见第 5 步。

提问前先扫描工作区。已有 `deck.spec.json` 会记录叙事、绑定主题、页面顺序、标题与每张内容页的 `kind`。deck 内 `theme.json`、工作区 `themes/` 文件、用户点名的主题，或递来的 `.thmx`、`.potx`、带品牌 `.pptx` 都是主题信号。

## 先给用户看，再自己查

主题和大纲两个决定归用户。到这两处时，在对话里展示出来，问过再往下走。用户已经说了不用问（「直接做」「你定」），就不问，但仍然展示主题墙和大纲，说明你选了什么，然后继续。

页面要早给、常给。用户应在第一分钟内看到页面，而不是最后才看到。你自己的检查只看 `pptwise build` 的报告。不要把页面转成 PNG 或读页面图片来判断：报告已经点出每个问题，图是给用户看的。

## 工作流

### 1. 意图

选择讲法前先记录四个事实：受众、想要的结果、现场讲述还是传阅、可用时长。请求或工作区已经给出的事实直接推导。用户在场且仍缺关键事实时，把所有未决问题合并成一轮询问。

### 2. 叙事

先定叙事，再定主题。叙事决定论证方式、节奏与语气。完全匹配时使用具名预设，否则显式写 `strategy`、`pacing`、`audience`。`pacing` 控制编辑预算与正文字号基线。叙事从不选择页面的脸。

展示主题墙时用一句话说明你选的叙事，让用户的一次回答同时定下两者。简洁访谈与 spec 示例见 `references/spec.md`。

### 3. 绑定主题

主题是一个完整、自包含的文件，包含样式、页面菜单、可选品牌规则与场合元数据。内容菜单只服务全局 11 个 `kind` 中的一个子集。缺少某个词是设计选择。

主题名按四级查找：

1. deck 目录。
2. 从当前目录向上查找工作区 `themes/`。
3. 已装的内容包（`pptwise packs list`）。
4. 22 个出厂预设。

按请求用 `occasions`、`identity` 和 `menu` 筛出四到六个候选，再让用户看到自己的封面标题在这些主题里的样子。有 `pptwise_themes` 工具时，传入 deck 的封面标题、副标题，并把候选放进 `themes`：用户会在对话里看到每个主题的封面和一张正文页，你拿回主题 id。没有这个工具时，用 CLI 出同样的墙，id 用逗号分隔，或写 `all`：

```bash
pptwise theme try <ids> --title "<cover title>" --subtitle "<subtitle>" --json
```

它打印一份清单，列出每个主题的一张封面 SVG 和一张正文 SVG，外加 `contact-sheet.html`。宿主能显示图片时把这些 SVG 给用户看，否则交出联系表的路径。然后问用户要哪个主题，用户让你定时就说明你选了哪个。

创建就是拷贝：把最接近的预设拷进工作区、从 Office 文件抽取品牌，或为改色 fork 一份。命令见 `references/spec.md`。

写页面内容之前，把选中的主题名写进 `deck.spec.json`。绑定后的 deck 命令只读这个名字，没有渲染时临时换主题。

工作流中可以换绑到菜单相同的配色 fork。菜单不同就是另一套主题。回到本步骤，保留意图、叙事、事实、数据、图片与可复用文案，再按新菜单重写 spec 与填充。

### 4. 用 `kind` 写 spec

spec 锁定主题、叙事、品牌姿态、页脚标记、页面顺序、页型、标题，以及每张内容页的 `kind`。它不保存任何渲染选择状态。

spec 的 `footer` 不要，deck 就不印页码、机构名、日期和保密字样。只要场合需要的那几样，见 `references/branding.md`。

- `cover`、`chapter`、`ending` 是页型，不写 `kind`。
- 每张 `content` 页必须显式写且只写一个 `kind`。
- 作者只写语义 `kind`，从不选择页面的脸或几何。
- `focus` 与 `summary` 是可选写作提示。

运行 `pptwise spec validate deck.spec.json`，直到打印 `OK`。内容页 `kind` 不在绑定主题菜单中时会硬报错，并列出菜单提供的词。不要为了消错给页面贴一个失真的词。只有页面意图确实匹配时才换词，否则回到主题层。

校验通过的 spec 就是大纲。按每页一行展示给用户：页码、页型或 `kind`、标题、这一页讲什么。有 `pptwise_preview` 工具时，同时对 deck 目录调用它，让用户在动笔写页之前就看到封面和整套页序。用户没说直接做就请他提修改。

11 个词及边界见 `references/layouts.md`。完整 spec 与主题创建流程见 `references/spec.md`。

### 5. 填页面

每批至多写四个 `pages/<id>.json`。页面文件可以含 `components`、`background`、`image_side`、`footnote`、`fields`、`stamp`、`tag`、`ballot`、`years`、`stage`、`notes`。不要重复 `type`、`kind`、`heading`，它们归 spec。

选择服务本页 `kind` 的组件。`quote` 是页面讲法，引用组件名是 `blockquote`。组件归属与相似项对照见 `references/components.md`。节奏与容量见 `references/density.md`。图片流程见 `references/images.md`。

写一页之前先读这一页的契约。`inspect` 打印 spec 锁定的内容、页面文件可以填的字段、绑定主题的脸在这一页能画的组件、`validate` 对这一页的计数要求，以及 `validate` 此刻对它的结论。组件列表之外的组件过不了 `validate`。写某个组件前先展开它。计数不能证明内容放得下：页面内容偏长时，`--fit` 会真的画这一页，告诉你渲染会不会丢内容。图标字段的名字来自 `pptwise icons`。

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise inspect deck-dir/ --page <id> --fit
pptwise icons
```

每批写完都 build 一次。有 `pptwise_build` 工具时用它，它会把目前画好的页面展示给用户。否则运行：

```bash
pptwise build deck-dir/ --json
```

`errors` 里的每一项都写明 `page`、要改的 `file` 与 `field`，以及检查自带的改法。修完每个错误再 build。重组内容，不要删除检查抓到的信息。还没写的页会被报为尚未写，最后一批之前这是正常的。

### 6. 构建、审阅与交付

所有页面写完后，build 到 `status` 为 `ok`。build 一次跑完 assemble、validate、audit、preview 和 render，全部通过才写出 `.pptx`。报告里的 `pptx` 就是这份 deck 唯一的最终文件，位于 `.pptwise/<deck>/` 下。

只交付这一份文件。不要再跑 `render`，不要复制、改名或另导出一份 `.pptx`。在 DSH 上用 `present` 交给用户。其他宿主报出它的绝对路径。没有对话内预览工具时，同时给出报告里的 `preview.html` 路径，或运行 `pptwise serve deck-dir/ --no-open` 做实时浏览器审阅。

文字压在照片背景上时另跑 `pptwise audit deck-dir/ --pixels`。只有用户明确接受妥协时才使用 `render --draft` 或 `--allow-dropped-content`。

## 快速组件分派

| 页面意图 | `kind` | 常用组件 |
| --- | --- | --- |
| 有顺序的论证 | `points` | `bullets`、`numbered_cards`、`paragraph`、`concept_equation` |
| 可换序的并列项 | `list` | `row_cards`、`icon_cards`、`people_cards`、`word_cloud` |
| 并排看差异 | `comparison` | `comparison`、`from_to`、`image_compare`、`matrix`、`swot`、`harvey_balls`、`venn`、`positioning_map`、`pros_cons` |
| 有方向的步骤或时间 | `process` | `steps`、`chevron_process`、`staircase`、`swimlane`、`journey_map`、`flowchart`、`timeline`、`roadmap`、`gantt`、`cycle`、`value_chain` |
| 一组数字的结构 | `data` | `chart`、`data_table`、`kpi_cards`、`progress_donuts`、`scorecard`、`pictogram`、`heatmap`、`sankey` |
| 画面本身就是信息 | `photo` | `image`、`image_grid`、`device_mockup` |
| 作者自己的立论 | `statement` | `verdict_banner`、`callout`，也可以没有组件 |
| 借别人之口 | `quote` | `blockquote` |
| 一个数字就是全部 | `fact` | 单项 `kpi_cards`、`pictogram`，也可以没有组件 |
| 断言配一件展品 | `evidence` | `image`、`chart`、`data_table`、`code`、`device_mockup`、`sketch` |
| 包含或层级 | `hierarchy` | `architecture`、`bmc`、`five_forces`、`rings`、`hub_spoke`、`decision_tree`、`org_tree`、`issue_tree`、`pyramid`、`iceberg`、`pillar_model`、`fishbone`、`segmented_wheel` |

## 规则

- 从不编辑或后处理生成的 `.pptx`。
- 从不在作者内容中加入坐标、SVG、页面脸名或几何控制。
- 面向用户的 deck 文案跟随用户语言。schema 键与枚举值使用英文。
- 不声称 `chart` 或 `data_table` 的数字是原生 PowerPoint 数据对象。它们导出为可编辑的成组图形与文字。改数字要改源文件并重新渲染。
- 把数值本身写出来。不要用剩余条数或省略号代替内容。validate 会拒绝。
- preview 全程只读。修订回到 `deck.spec.json`、`pages/*.json`、资产或绑定主题文件。

## 何时阅读

- `references/spec.md`：意图、叙事、主题创建、绑定、换绑、spec 与菜单错误。
- `references/layouts.md`：在 11 个 `kind` 中选择。
- `references/components.md`：组件归属、字段与相似项选择。
- `references/density.md`：节奏、容量、独占页面组件与局部装饰。
- `references/branding.md`：页脚标记（页码、机构名、保密标识）、deck 品牌姿态、无框页面、logo 与品牌抽取。
- `references/images.md`：图片资产、图库、生图，以及 `photo` 和 `evidence` 的边界。
- `references/validate.md`：build、assemble、validate、audit、preview、serve、render 与修订循环。
