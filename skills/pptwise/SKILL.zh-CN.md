---
summary: 'skills/pptwise/SKILL.md 的中文阅读镜像，仅供人工审阅该 skill 会指示 agent 做什么'
mirror_of: skills/pptwise/SKILL.md
---

# pptwise deck 生成操作手册

> 本文件是 [`skills/pptwise/SKILL.md`](./SKILL.md) 的中文阅读镜像。agent 只注册并执行英文版。两份文件如有出入，以英文版为准。

pptwise 把语义 JSON 转成原生 DrawingML `.pptx`。文字与图形在 PowerPoint 中保持可编辑。作者只描述每页在怎么讲，以及页面包含哪些有类型的组件。页面的脸、几何、配色、字体和装饰归主题与引擎。

严格按这条单向链工作，不跨步，不同时决定两层。

```text
需求澄清 -> 素材收集 -> 大纲和主题 -> 制作 -> 验收 -> 交付
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
2. `npx --yes --package @liustack/pptwise@0.48.0 pptwise <args>`。
3. `bunx --bun @liustack/pptwise@0.48.0 <args>`。
4. 都不可用时，请用户安装 Node 22.19+ 或 Bun。

安装后运行 `pptwise doctor`。某个失败无法由错误信息本身解释时也先运行它。转告结果，不要猜。内容包在安装时装好，不按 deck 装。用户有 license 时，安装步骤是 `pptwise login <key>`：它向包服务器校验 key、保存 key 并装好内容包，转告它的结果。付款还在审核中的 key 会先保存，审核通过后由 `pptwise sync` 安装内容包。之后只在用户要求更新内容包、审核通过、换了 license，或 `pptwise doctor` 报告有包可更新时再跑 `pptwise sync`。除了 `pptwise logout` 和 `config set`，只有这几条命令会写 pptwise 主目录（`~/.pptwise`）。做 deck 的过程一次都不写那里，所以主目录只读的沙箱里也能做。不要在 deck 任务里运行 `login`、`sync` 或 `logout`。

## 先读取现场真相

永远不要凭记忆写 IR 或 spec。每个 deck 任务开始时运行：

```bash
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

`themes --json` 会列出已装内容包的主题，并标 `"source": "pack"`。每个主题行都带 `menu`：`menu.content` 的键就是它提供的内容讲法。IR 组件契约在制作时按页读取，不整份读。见第 4 步。

提问前先扫描工作区，`.pptwise/decks/` 也要看：按 `.gitignore` 过滤的文件搜索会跳过它。已有 `deck.spec.json` 会记录叙事、绑定主题、页面顺序、标题与每张内容页的 `kind`：改这份 deck 从第 4 步开始。deck 内 `theme.json`、工作区 `themes/` 文件、用户点名的主题，或递来的 `.thmx`、`.potx`、带品牌 `.pptx` 都是主题信号。

## 用户在哪里拍板

给用户的每一条消息都用他写话所用的语言，从第一句进度说明到最后的回答。用户只在两处拍板：第 1 步的那一轮提问，和第 3 步的大纲和主题。其余步骤一路做下去，不停。用户已经说了不用问（「直接做」「你定」），第 1 步就不问，第 3 步照样把大纲和主题列出来，然后在同一条回复里接着做。

## 工作流

### 1. 需求澄清

问清四件事：受众、想要的结果、现场讲述还是传阅、可用时长。据此定下叙事：论证方式 `strategy`、节奏 `pacing`（页面有多密）、语气 `audience`。有完全匹配的具名预设（`pptwise narratives --json`）就用它。请求和工作区已经给出的直接推导，仍缺的放进一轮问完，有 `ask_user_question` 工具时用它来问。绝不问第二轮。用户说了直接做，其余的由你推断。叙事从不选择页面的脸。见 `references/spec.md`。

### 2. 素材收集，静默做

这一步不问用户任何事。先建 deck 目录：项目目录（有 `pptwise.config.json` 的目录，没有就是当前工作目录）下的 `.pptwise/decks/<名字>/`，名字用几个小写英文单词加连字符，比如 `q3-review`。用户点名放别处时照用户的。已有的 deck 在哪就在哪改，不要搬。命令都在项目目录里运行，下文的 `deck-dir/` 就是 deck 从那里算起的路径。然后收集两类素材：

- **内容。** 案头调查默认要做：上网查 deck 需要的数字、日期和例子，每个都带出处。用户给的材料已经包含内容时，只补出处。绝不编造数字。
- **视觉。** 运行 `pptwise brand scan --json`，找项目的 logo、图片、品牌色和字体、Office 模板（见 `references/branding.md`），并给每页规划要什么样的图（见 `references/images.md`）。

两类结果按 `references/materials.md` 给的格式写进 `deck-dir/materials.md`。后面每一步都读这个文件，不靠记忆，同样的素材做出同样的 deck。要改什么，先改这个文件。

### 3. 大纲和主题，一次拍板

按素材写 `deck-dir/deck.spec.json`。spec 锁定叙事、主题、品牌姿态、页脚标记、页面顺序、页型、标题，以及每张内容页的 `kind`。主题先绑你会选的那个。工作区里有主题文件、内容包主题或品牌文件时先用它，否则选 `themes --json` 里 `occasions` 和 `identity` 最贴合的出厂主题。主题名按四级查找：

1. deck 目录。
2. 从 deck 目录向上查找工作区 `themes/`。
3. 已装的内容包（`pptwise packs list`）。
4. 24 个出厂预设。

spec 的 `footer` 不要，deck 就不印页码、机构名、日期和保密字样，见 `references/branding.md`。

- `cover`、`chapter`、`ending` 是页型，不写 `kind`。
- 每张 `content` 页必须显式写且只写一个 `kind`。作者只写语义 `kind`，从不选择页面的脸或几何。`focus` 与 `summary` 是可选写作提示。
- 除非用户说了不要图，至少一张内容页是 `photo` 页，素材里有地方、产品、人物或作品可以展示时更多。每个出厂主题都画得出它的图：主题按场合选，不为配图换主题。
- 用户说了页数，spec 就正好是那么多页，封面和结尾页都算在内。不要为了过检查加页或删页。

运行 `pptwise spec validate deck-dir/deck.spec.json`，直到打印 `OK`。`kind` 不在绑定主题菜单里只是一条提示，不是错误：那一页按菜单里最近的讲法来画。`kind` 写页面真实的讲法。然后把三件事放进一条消息问用户，有 `ask_user_question` 工具时用它来问：

1. **大纲**：每页一行，写页码、页型或 `kind`、标题、这一页讲什么。有 `pptwise_outline` 工具时，同时对 deck 目录调用它。
2. **主题**：用 deck 自己的封面标题画一面主题墙。调用 `pptwise_themes`，传入标题、副标题和 `occasion`。检索找到品牌色时，再把 `brand` 设为检索结果的 `next.brandFlag`：墙的最后会多一个选项，就是第一个主题按品牌色重新上色的版本。每个主题一个选项，标签带上它的编号。没有这个工具时，用 CLI 出同样的墙，把它的 SVG 或 `contact-sheet.html` 给用户看：

```bash
pptwise theme try --title "<cover title>" --subtitle "<subtitle>" --occasion <words> --json
```

   加上 `--brand '<next.brandFlag>'` 就有品牌选项。用户点名了主题，就给他看那一个，不画墙。

3. **配图**：素材里的配图方向，一句话：图上是什么，从哪里来。

绑定用户选的。选了品牌选项时，运行墙打印的那行 `theme fork`，以 deck 自己的 id 写到 `deck-dir/theme.json`，绑定这个 id。再校验一次。spec 从此锁定：制作过程中不再换主题。创建和 fork 主题见 `references/spec.md`。

### 4. 制作

每批至多写四个 `pages/<id>.json`。页面文件可以含 `components`、`background`、`image_side`、`footnote`、`fields`、`stamp`、`tag`、`ballot`、`years`、`stage`、`notes`。不要重复 `type`、`kind`、`heading`，它们归 spec。选择服务本页 `kind` 的组件。`quote` 是页面讲法，引用组件名是 `blockquote`。见 `references/components.md` 和 `references/density.md`。

写一页之前先读这一页的契约。`inspect` 打印 spec 锁定的内容、页面文件可以填的字段、绑定主题的脸在这一页能画的组件、`validate` 对这一页的计数要求，以及 `validate` 此刻对它的结论。写某个组件前先展开它。页面内容偏长时，`--fit` 会真的画这一页，告诉你渲染会不会丢内容。图标字段的名字来自 `pptwise icons`。`inspect` 还会列出主题在这一页的招牌版式，每个都写明画出来是什么样子，以及配方（`write:` 后面是它要的组件、条目数和字段）。按配方写的页面会用上这种画法。封面、章节页或结尾页的脸如果画在照片上，配方就是一张背景照片。手上的内容撑得起某个配方时，就照它写。

```bash
pptwise inspect deck-dir/ --page <id>
pptwise inspect deck-dir/ --page <id> --component <type>
pptwise inspect deck-dir/ --page <id> --fit
pptwise icons
```

除非用户说了不要图，按配图规划给 deck 配图：每个 `photo` 页，`inspect` 列出照片配方的封面和章节页，以及图本身就是要点的其他页，不为填空间加图。来源依次是：用户和项目自己的图，然后是图库搜索，然后是网上，最后是启用了的本地生成器。一批页面写完、build 之前：跑 `pptwise asset-brief deck-dir/` 拿每个图框的形状、裁切和配色，用 `pptwise images search "<两到四个英文词>" --orientation <画幅> --sheet` 搜图，看带编号的联系表，挑合适的编号，用 `pptwise images fetch <id> --deck deck-dir/ --as <asset_id>` 取图。有 `pptwise_images` 工具时用它搜。项目里的文件或网上的图用 `pptwise images add` 钉进来，网上的图它只按图片自己页面写明的许可收。规则见 `references/images.md`。

每批写完都 build。有 `pptwise_build` 工具时用它。否则运行：

```bash
pptwise build deck-dir/ --json
```

`errors` 里的每一项都写明 `page`、要改的 `file` 与 `field`，以及检查自带的改法。修完每个错误再 build，直到 `status` 为 `ok`。还没写的页会被报为尚未写，最后一批之前这是正常的。重组内容，不要删除检查抓到的信息。报告还会给每个用普通版式画的页面指出最近的招牌配方：内容本来就撑得起配方的普通页，照配方改写。不要为了凑配方编造事实、数字或图片。

### 5. 验收

build 报告是第一层检查：`status` 为 `ok`，能修的警告都修了。第二层是你自己的眼睛。带上联系表 build，把每一页缩小画进一张带编号的图，然后看它：`pptwise build deck-dir/ --json --sheet` 在 `preview.sheet` 里给出路径，`pptwise_build` 传 `sheet: true` 会把图直接给你看。看三样：

- **图**：每张图都展示这一页说的事，不是千篇一律的图库套路，主体在裁切框里，压在图上的字读得清。
- **空洞**：空着的图框、大半空白的页面、规划里要而 deck 里缺的图。
- **节奏**：连着三页长得一样、一页接一页全是文字、章节页彼此不一致。

看到的问题回到第 4 步改，再看一遍。最多两轮，保留原样的地方告诉用户。细节见 `references/validate.md`。

### 6. 交付

build 报告里的 `pptx` 就是这份 deck 唯一的最终文件，位于 `.pptwise/<deck>/` 下。只交付这一份文件。不要再跑 `render`，不要复制、改名或另导出一份 `.pptx`。在 DSH 上用 `present` 交给用户。其他宿主报出它的绝对路径，在后台启动 `pptwise serve deck-dir/ --no-open`，把它打印的地址给用户做实时审阅。从 `pptwise images list` 里找出需要署名的图，告诉用户。

用户的修改意见回到第 4 步。用户要换主题时，带 `--alternatives` build 一次（`pptwise_build` 传 `alternatives: true`）：它用另外三个主题画出 deck 的封面和一两页，带编号。最近一次 build 的结果按卡片上的编号列出它们：编号对应哪个主题，看那里，不用去翻文件。换主题只改 `deck.spec.json` 里的 `theme`，再 build 一次。页面保留各自的讲法和文件：build 在 `drawnAs` 里列出按别的讲法画的页面，对新脸不画的内容给出警告。用户想换个颜色又没说哪种时，先 fork 两三个合适的配色，用 `theme try` 画出来，让用户挑了再绑定。

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
- 来源没有写明可以使用的图，绝不放进 deck，也绝不从没写许可的页面拷图。
- preview 全程只读。修订回到 `deck.spec.json`、`pages/*.json`、资产或绑定主题文件。
- 图片生成器因为沙箱不让它写自己的主目录而失败时，在沙箱外运行 `images generate`，或请用户放行。绝不复制、移动或重定向任何登录凭据文件来绕过。

## 何时阅读

- `references/spec.md`：意图、叙事、主题创建、绑定、换绑、spec 与菜单错误。
- `references/materials.md`：素材文件、案头调查与配图规划。
- `references/layouts.md`：在 11 个 `kind` 中选择。
- `references/components.md`：组件归属、字段与相似项选择。
- `references/density.md`：节奏、容量、独占页面组件与局部装饰。
- `references/branding.md`：品牌素材检索、页脚标记（页码、机构名、保密标识）、deck 品牌姿态、无框页面、logo 与品牌抽取。
- `references/images.md`：哪些页配图、图从哪里来、图片资产、图库搜索与联系表、网上的图和它们的许可、图源配置、生图，以及 `photo` 和 `evidence` 的边界。
- `references/validate.md`：build、整份 deck 的联系表和要看什么、assemble、validate、audit、preview、serve、render 与修订循环。
