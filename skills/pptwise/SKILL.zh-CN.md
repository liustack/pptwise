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
2. `npx --yes --package @liustack/pptwise@0.44.0 pptwise <args>`。
3. `bunx --bun @liustack/pptwise@0.44.0 <args>`。
4. 都不可用时，请用户安装 Node 22.19+ 或 Bun。

安装后运行 `pptwise doctor`。某个失败无法由错误信息本身解释时也先运行它。转告结果，不要猜。内容包在安装时装好，不按 deck 装。用户有 license 时，`pptwise license set <key>` 和 `pptwise packs sync` 属于安装步骤，之后只在用户要求更新内容包或换了 license 时再跑 `packs sync`。除了 `config set`，只有这几条命令会写 pptwise 主目录（`~/.pptwise`）。做 deck 的过程一次都不写那里，所以主目录只读的沙箱里也能做。不要在 deck 任务里运行 `license set` 或 `packs sync`。

## 先读取现场真相

永远不要凭记忆写 IR 或 spec。每个 deck 任务开始时运行：

```bash
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

`themes --json` 会列出已装内容包的主题，并标 `"source": "pack"`。每个主题行都带 `menu`：`menu.content` 的键就是它提供的内容讲法。IR 组件契约在填页时按页读取，不整份读。见第 5 步。

提问前先扫描工作区。已有 `deck.spec.json` 会记录叙事、绑定主题、页面顺序、标题与每张内容页的 `kind`。deck 内 `theme.json`、工作区 `themes/` 文件、用户点名的主题，或递来的 `.thmx`、`.potx`、带品牌 `.pptx` 都是主题信号。

## 先给用户看，再自己查

给用户的每一条消息都用他写话所用的语言，从第一句进度说明到最后的回答。只有一处停下来等用户：大纲，大纲里同时写明你选的主题和理由。在对话里展示出来，问过再写页面。用户已经说了不用问（「直接做」「你定」），就不问，但仍然展示大纲，然后继续。主题不是第二个停顿点：用户在大纲处或任何一次 build 之后都能改。

页面要早给、常给。用户应在第一分钟内看到页面，而不是最后才看到。你自己的检查只看 `pptwise build` 的报告。不要把页面转成 PNG 或读页面图片来判断：报告已经点出每个问题，图是给用户看的。

## 工作流

### 1. 意图

选择讲法前先记录四个事实：受众、想要的结果、现场讲述还是传阅、可用时长。请求或工作区已经给出的事实直接推导。用户在场且仍缺关键事实时，把所有未决问题合并成一轮询问。

### 2. 叙事

先定叙事，再定主题。叙事决定论证方式、节奏与语气。完全匹配时使用具名预设，否则显式写 `strategy`、`pacing`、`audience`。`pacing` 控制编辑预算与正文字号基线。叙事从不选择页面的脸。

随大纲用一句话说明你选的叙事，让用户一次回答就能定下。简洁访谈与 spec 示例见 `references/spec.md`。

### 3. 绑定主题

主题是一个完整、自包含的文件，包含样式、页面菜单、可选品牌规则与场合元数据。内容菜单只服务全局 11 个 `kind` 中的一个子集。菜单没有的讲法，那一页按菜单里最近的讲法来画，所以任何主题都能接任何 spec。

主题名按四级查找：

1. deck 目录。
2. 从当前目录向上查找工作区 `themes/`。
3. 已装的内容包（`pptwise packs list`）。
4. 24 个出厂预设。

主题由你来挑。工作区里有主题文件、内容包主题或品牌文件时优先用它。否则从 `themes --json` 里挑 `occasions` 和 `identity` 最贴合请求和叙事的出厂主题，随大纲写一句为什么。只有用户想先看看有哪些样子再选（「先给我看几种风格」），才画主题墙。这时调用 `pptwise_themes` 工具，传入 deck 的封面标题、副标题和 `occasion`：与请求相符的场合词。它在对话里按编号画出短名单里每个主题的封面和一张正文页。只有用户点名了主题才传 `themes`。没有这个工具时，用 CLI 出同样的墙：

```bash
pptwise theme try --title "<cover title>" --subtitle "<subtitle>" --occasion <words> --json
```

把它的 SVG 或 `contact-sheet.html` 给用户看，问他要哪个。

只有用户给了品牌色，或交来公司模板、公司已有的 PPT，才创建主题。想要某种观感（「炫酷」「科技感」「高级」）是在现有主题里挑的理由。创建就是拷贝：拷贝最接近的预设、从 Office 文件抽取品牌，或为改色 fork 一份。用户想换个颜色又没说哪种时，先 fork 两三个合适的配色，用 `theme try` 画出来，让用户挑了再绑定。命令见 `references/spec.md`。

写页面内容之前，把主题名写进 `deck.spec.json`。没有渲染时临时换主题。之后要换主题，只改 `deck.spec.json` 里的 `theme`，再 build 一次。页面保留各自的讲法和文件：build 在 `drawnAs` 里列出按别的讲法画的页面，对新脸不画或截短的内容给出警告，仍需改动的页面会被点名。之前有一次 build 把每页都画全过，换主题一次 build 就能画出来，警告会说明每页少了什么。

### 4. 用 `kind` 写 spec

spec 锁定主题、叙事、品牌姿态、页脚标记、页面顺序、页型、标题，以及每张内容页的 `kind`。它不保存任何渲染选择状态。

spec 的 `footer` 不要，deck 就不印页码、机构名、日期和保密字样。只要场合需要的那几样，见 `references/branding.md`。

- `cover`、`chapter`、`ending` 是页型，不写 `kind`。
- 每张 `content` 页必须显式写且只写一个 `kind`。
- 作者只写语义 `kind`，从不选择页面的脸或几何。
- `focus` 与 `summary` 是可选写作提示。

用户说了页数，spec 就正好是那么多页，封面和结尾页都算在内。不要为了过检查加页或删页。

运行 `pptwise spec validate deck.spec.json`，直到打印 `OK`。`kind` 不在绑定主题菜单里只是一条提示，不是错误：那一页按菜单里最近的讲法来画。`kind` 写页面真实的讲法。

校验通过的 spec 就是大纲。写任何页面文件之前，先在对话里逐页列出：页码、页型或 `kind`、标题、这一页讲什么。主题和那一句理由写在页面列表上方。这一步不论 deck 多短都不能省。有 `pptwise_outline` 工具时，同时对 deck 目录调用它，让用户以卡片看到同一份列表。用户说了直接做或让你定，就列出大纲，在同一条回复里接着做。否则请用户确认或修改，有 `ask_user_question` 工具时用它来问，等他回答再写页面。

11 个词及边界见 `references/layouts.md`。完整 spec 与主题创建流程见 `references/spec.md`。

### 5. 填页面

每批至多写四个 `pages/<id>.json`。页面文件可以含 `components`、`background`、`image_side`、`footnote`、`fields`、`stamp`、`tag`、`ballot`、`years`、`stage`、`notes`。不要重复 `type`、`kind`、`heading`，它们归 spec。

选择服务本页 `kind` 的组件。`quote` 是页面讲法，引用组件名是 `blockquote`。组件归属与相似项对照见 `references/components.md`。节奏与容量见 `references/density.md`。图片流程见 `references/images.md`。

写一页之前先读这一页的契约。`inspect` 打印 spec 锁定的内容、页面文件可以填的字段、绑定主题的脸在这一页能画的组件、`validate` 对这一页的计数要求，以及 `validate` 此刻对它的结论。组件列表之外的组件要么过不了 `validate`，要么让这一页按别的讲法来画，并给出警告。写某个组件前先展开它。计数不能证明内容放得下：页面内容偏长时，`--fit` 会真的画这一页，告诉你渲染会不会丢内容。图标字段的名字来自 `pptwise icons`。`inspect` 还会列出主题在这一页的招牌版式：主题自己的样例页就是用它们画的，每个都写明画出来是什么样子，以及配方（`write:` 后面是它要的组件、条目数和字段）。按配方写的页面会用上这种画法，其余的页面用脸的普通版式来画。封面、章节页或结尾页的脸如果画在照片上，配方就是一张背景照片。写这一页之前先读它们，手上的内容撑得起某个配方时，就照它写。

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

`errors` 里的每一项都写明 `page`、要改的 `file` 与 `field`，以及检查自带的改法。修完每个错误再 build。重组内容，不要删除检查抓到的信息。还没写的页会被报为尚未写，最后一批之前这是正常的。报告还会数出用上主题招牌版式的页数（`signature`），并给每个用普通版式画的页面指出最近的配方和要改的地方。这些只是提示，不是错误。所有页面都写完、第一次 build 之后，内容本来就撑得起配方的普通页，照配方改写再 build。撑不起的，就让它保持普通版式。不要为了凑配方编造事实、数字或图片：图片只用用户自己的，或者走图片流程拿到的。

第一次 build 还会用另外最多三个主题画出 deck 的封面和一两页内容页，列在 `alternatives` 里（`pptwise_build` 卡片在页面下方按编号展示）。用一句话提一下就继续，不要停下来问。用户挑了其中一个（「换成第 2 个」），把 `theme` 改成它的 id，再 build 一次。

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
- 和用户说话始终用他的语言，进度说明和提问也一样，面向用户的 deck 文案同样跟随用户语言。schema 键与枚举值使用英文。
- 不声称 `chart` 或 `data_table` 的数字是原生 PowerPoint 数据对象。它们导出为可编辑的成组图形与文字。改数字要改源文件并重新渲染。
- 把数值本身写出来。不要用剩余条数或省略号代替内容。validate 会拒绝。
- preview 全程只读。修订回到 `deck.spec.json`、`pages/*.json`、资产或绑定主题文件。
- 图片生成器因为沙箱不让它写自己的主目录而失败时，在沙箱外运行 `images generate`，或请用户放行。绝不复制、移动或重定向任何登录凭据文件来绕过。

## 何时阅读

- `references/spec.md`：意图、叙事、主题创建、绑定、换绑、spec 与菜单错误。
- `references/layouts.md`：在 11 个 `kind` 中选择。
- `references/components.md`：组件归属、字段与相似项选择。
- `references/density.md`：节奏、容量、独占页面组件与局部装饰。
- `references/branding.md`：页脚标记（页码、机构名、保密标识）、deck 品牌姿态、无框页面、logo 与品牌抽取。
- `references/images.md`：图片资产、图库、生图，以及 `photo` 和 `evidence` 的边界。
- `references/validate.md`：build、assemble、validate、audit、preview、serve、render 与修订循环。
