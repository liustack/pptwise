---
summary: '当前 CLI 命令面：IR v5、主题 v2、deck 项目、逐页检查、固定样张主题对比、验证、审计、图片、预览、内容包与安装体检'
read_when:
  - 查询受支持的命令或参数
  - 给 agent 接上 spec、填充、validate、audit 与 render 回路
  - 读取一页的填写契约，或在 render 前检查一页放不放得下
  - 创建、分叉、对比、抽取或解析主题
  - 排查 audit 输出、图片获取或安装状态
  - 设置 license 或同步内容包
---

# CLI

大多数 deck 操作都接受 IR v5 文件或 deck 项目目录。两者都是路径，按当前目录解析。

渲染阶段没有临时主题选项。项目在 `deck.spec.json` 中绑定主题，裸 IR 在 `theme.id` 中绑定。编写 spec 前用 `theme try` 比较尚未绑定的候选。

## 推荐项目回路

```bash
pptwise spec validate deck-dir/deck.spec.json
pptwise assemble deck-dir/
pptwise validate deck-dir/
pptwise audit deck-dir/
pptwise render deck-dir/
pptwise preview deck-dir/ --html
```

`pptwise build deck-dir/ --json` 一次跑完 assemble、validate、audit、preview 和 render，把所有问题列在一份清单里。见 [Build](#build)。

每轮验证之间最多填四页，写每一页之前先用 `inspect` 读它的契约。需要用户在浏览器中实时评审时使用 `serve`。

## 命令索引

| command | 作用 |
| --- | --- |
| `build <target>` | 一次跑完 assemble、validate、audit、preview 和 render，返回一份结构化结论。 |
| `render <target>` | 渲染原生可编辑 PPTX。 |
| `validate <target>` | 验证 IR、主题绑定、菜单 kind、组件、资产与内容质量。 |
| `audit <target>` | 运行确定性视觉与几何检查。 |
| `asset-brief <target>` | 报告真实图片画框、裁切、配色、安全区与提示词。 |
| `schema` | 打印 IR 或 spec JSON Schema，或从中切出一个组件或一个 kind。 |
| `inspect <deck> --page <id>` | 显示一页的填写契约，为它展开一个组件，或检查它放不放得下。 |
| `spec validate <file>` | 验证主题形状的 deck spec。 |
| `assemble <dir|name>` | 把 deck 项目合并成派生 IR v5。 |
| `disassemble <ir.json>` | 把 IR v5 拆成 spec、页面文件与资产。 |
| `themes` | 列出 24 个出厂预设与已装内容包的主题，附元数据。 |
| `theme new` | 把命名主题拷贝为自包含 v2 文件。 |
| `theme fork` | 拷贝主题，围绕一个品牌色或几个指定锚色重新上色。 |
| `theme try` | 用两到四个主题渲染固定试衣样稿，或用任意多个主题渲染调用方自己的封面和一页正文。 |
| `brand extract` | 用 Office 模板的品牌色和字体给一个主题重新上色。 |
| `narratives` | 列出命名叙事预设与三轴。 |
| `icons` | 列出 `icon` 字段接受的全部图标名。 |
| `layouts` | 为引擎维护检查内部脸注册表。 |
| `images search` | 搜索已配置的图库来源。 |
| `images fetch` | 把一张选定图库图片固定到 deck。 |
| `images list` | 列出某 deck 已固定的图片。 |
| `images generate` | 通过已启用的本地 CLI 生成并固定图片。 |
| `config set` | 设置可选用户配置。 |
| `config show` | 显示已生效配置，秘密会遮盖。 |
| `license set <key>` | 保存解锁内容包的 license。 |
| `license status` | 显示是否已配置 license。 |
| `license clear` | 删除已保存的 license。 |
| `packs sync` | 安装或更新 license 覆盖的内容包。 |
| `packs list` | 列出已装内容包及其主题。 |
| `init` | 在当前目录创建 `pptwise.config.json`。 |
| `preview <target>` | 写出 SVG 页面与可选的自包含评审文件。 |
| `serve <target>` | 启动自动刷新的评审服务。 |
| `doctor` | 检查运行时、skill 副本、插件状态、可选能力与自检渲染。 |
| `check-update` | 检查 npm 是否有新版本。 |
| `self-update` | 更新全局安装。 |

`layouts` 暴露的是维护者使用的引擎词汇。Deck 作者与创作 agent 只选择内容 `kind`，不写内部脸 id。

## Build

```bash
pptwise build <target> [--json] [--no-git-ignore] [--alternatives | --no-alternatives]
```

`build` 组装 deck 工程（或读取 IR 文件），校验，画出每一页，检查画出来的结果，再渲染 `.pptx`，全部在一个进程里、基于对源文件的同一次读取完成。deck 通过全部检查时以 0 退出，需要修改时以 1 退出。

输出位置就是 `render` 和 `preview` 的默认位置：页面、`preview.html` 和 `manifest.json` 写到 `.pptwise/<place>/`，deck 唯一的 `.pptx` 写到 `.pptwise/<place>/<filename>.pptx`，和 `render` 写的是同一个路径。没有 `-o`。只有全部检查通过才写 `.pptx`，没通过的 build 会删掉之前 build 留在这个目录里的 `.pptx`（改了 `filename` 也不会留下旧名字的文件），所以那里的文件永远和最近一次 build 读到的源文件一致。只要 validate 通过就会画出页面，有 audit 问题的 deck 也照样能看。

`--json` 打印结论。`status` 是 `ok` 或 `needs_revision`。`errors` 的每一条写明是哪项检查报的（`stage`：`assemble`、`validate`、`audit` 或 `render`），落在哪里（`page`、`pageId`，deck 工程还有要改的 `file`，即 `pages/<id>.json` 或 `deck.spec.json`，以及其中的 `field`），以及检查自己的 `message`，检查知道怎么改时会写在里面。audit 的条目另带 `code` 和 `detail`。没写的页面算一条错误，会写明要写哪个页面文件，在所有页面写完之前不跑 audit。`warnings` 是 validate 的警告，从不阻止写出 `.pptx`。

```json
{
  "status": "needs_revision",
  "target": "/work/weekly",
  "theme": "brief",
  "pageCount": 6,
  "audited": true,
  "errors": [
    {
      "stage": "audit",
      "page": 2,
      "pageId": "why",
      "file": "pages/why.json",
      "code": "monotony",
      "message": "pages 2-4 repeat component type \"bullets\" (3 consecutive pages) — vary the lead component across neighbouring pages (mix bullets, chart, kpi, blockquote) so the deck does not read as a repeating template",
      "detail": { "componentType": "bullets", "fromPage": 2, "toPage": 4, "length": 3 }
    }
  ],
  "warnings": [],
  "preview": {
    "dir": "/work/.pptwise/weekly",
    "html": "/work/.pptwise/weekly/preview.html",
    "manifest": "/work/.pptwise/weekly/manifest.json",
    "pages": [{ "page": 1, "id": "cover", "type": "cover", "file": "/work/.pptwise/weekly/001-cover.svg" }]
  },
  "pptx": null,
  "notes": []
}
```

通过的 build 是 `"status": "ok"`，`errors` 为空，`pptx` 是这份 deck 的 `.pptx` 的绝对路径。目标不存在、配置文件读不了时，命令直接失败，不产出结论。

`signature` 数出脸提供招牌版式的页数（`offered`）、用上了的页数（`drawn`）和整份 deck 的页数（`pages`），并在 `perPage` 里逐页列出画它的画法（`drawnBy`）。脸用普通版式画的页面，`drawnBy` 为 `null`，附上最近的配方（`nearest`：画法 id、样子、一行配方，以及这一页要改的地方）。文字报告打印一行汇总，每个普通页一条提示。这些只是提示，不是问题：不会挡住 build，内容撑不起配方的页面就保持原样。

`themeSource` 写明绑定的主题从哪来：`builtin`（内置）、`file`（查找到的主题文件）或 `pack`（内容包）。`drawnAs` 列出绑定主题按别的 kind 画的内容页，以及实际画它的 kind（见 [Menu lookup](./menu-lookup.md#content-pages)）。`writtenFor` 写明这份 deck 的页面是为哪个主题写的，只在这次 build 换到别的主题、有内容没画出来或被截短时出现。每一处都在 `warnings` 里（见 [Deck projects](./deck-projects.md#theme-binding-and-rebinding)）。

绑定内置主题的 deck 第一次画出页面时，build 还会用另外最多三个主题画出这份 deck 自己的封面和一到两页内容页。候选主题来自 `theme try` 用的同一份短名单，按绑定主题的场合和 deck 的叙事策略挑。某个主题接不住的页面直接跳过。结果写到 `.pptwise/<place>/alternatives/`，带一份 `manifest.json`，报告里的 `alternatives` 列出每个主题的 id、显示名和页面文件，以及耗时（`ms`，16 页的 deck 大约十分之一秒）。之后的 build 不再重画。`--alternatives` 强制重画（主题文件绑定的 deck 也可以），`--no-alternatives` 跳过。换主题仍然是改 `deck.spec.json` 里的 `theme` 再 build 一次。

## Render

```bash
pptwise render <target> \
  [-o <out.pptx>] \
  [--draft] \
  [--allow-dropped-content] \
  [--no-git-ignore]
```

省略 `-o` 时，输出写到项目根目录下的 `.pptwise/<place>/<filename>.pptx`。`<filename>` 是 deck 自己的 `filename`（spec 的，或 IR 文件的），带不带 `.pptx` 都行，deck 没写时用 deck 目录名或 IR 文件名。`<place>` 是 deck 相对项目根目录的路径，用连字符连起来，所以 `decks/q3/zh` 和 `decks/q4/zh` 各有自己的目录（`decks-q3-zh`、`decks-q4-zh`）。放在项目根目录下一层的 deck 保持原名，放在 `.pptwise/decks/` 里的 deck 也一样，按它在这个文件夹里的路径命名（`.pptwise/decks/q3-review/` 写到 `.pptwise/q3-review/`）。项目外的 deck，或路径里有拉丁字母和数字以外字符的 deck，名字后面加一段路径的短哈希。改颜色用 `pptwise theme fork`，它写出一份完整主题。Render 不接受局部改色覆盖。

`--draft` 允许占位页。`--allow-dropped-content` 允许已知内容丢失，只能在用户明确同意时使用。正常处理方式是缩短或拆页。

## Validate 与 audit

```bash
pptwise validate <target>
pptwise audit <target> [--json] [--pixels]
```

Validation 覆盖严格 IR v5 结构、已安装主题、主题菜单 kind（菜单没有的 kind 落到最近的替身 kind，见 [Menu lookup](./menu-lookup.md)）、有效边界脸、组件规则、重复 id、资产、叙事、物理容量与编辑警告。错误会阻止 `OK`，警告不会。

校验还会按 `render` 的画法把每一页画一遍。内容页也画（包括改由朴素版式接手的情况），会漏掉任何内容、或截掉标题、来源行、组件文字的页直接拒绝，报错写明会丢什么，再画一遍能找到时还写明删什么。`render`、`preview` 和 `inspect` 都按同样的方式校验。`render --allow-dropped-content` 会跳过对内容页的这一遍，连同导出自己的内容丢弃门禁。

Audit 渲染确定性 SVG，并检查：

- `overflow`
- `out-of-bounds`
- `low-contrast`
- `overlap`
- `content-truncated`
- `content-dropped`
- `stepped-aside`
- `monotony`

任意发现都会让退出码变为 1。`--pixels` 增加压图文字的像素对比度采样，需要 `sharp`。

页面 `background` 是中间调颜色（大约和 `#777777`、`#6B7B8C` 一样亮）时报出的 `low-contrast`，要在背景上解决。主题字色在这种底色上读不清的地方，渲染器已经改用纯黑，卡片也挑纯黑读得清的一侧加深或提亮，封面左上角的标记按它实际落在的版式色带取色。字色由主题决定，仍然报出的就把背景调浅或调深。

截断按被截的字段分级。页面的标题、副标题、来源行（`footnote`），以及组件里除标签以外的每一段文字，都是读者必须看全的硬内容。主题版式截掉其中任何一段时，改由一个能把它们画全的朴素版式接手这一页，audit 报 `stepped-aside`。之后 `content-truncated` 只报哪个版式都躲不开的截断，`detail` 里写明字段和分级（`"tier": "hard"`）。眉题、印章、标签这类装饰性文字被截时仍留在主题版式上，报为 `"tier": "declared"`。

朴素版式接手一页时，不论是因为截断还是因为主题版式放不下内容，都会把页面的 kicker 画成标题上方的眉题，把页面标签画在眉题旁边。它没有 `fields`、印章、选票、`stage` 和 `years` 的位置，所以带着其中任何一个的页面留在主题版式上，主题版式放不下的部分照常上报：截断报 `content-truncated`，正文超容量报 `content-dropped`。分级清单在 `src/ir/truncation-tiers.ts`，朴素版式画哪些页面字段在 `src/render/step-aside.tsx`。

## Schema 与 spec

```bash
pptwise schema [--pretty]
pptwise schema --spec [--pretty]
pptwise schema --component <type> [--pretty]
pptwise schema --kind <kind> [--theme <name> [--deck <dir>]] [--pretty]
pptwise icons [--json]
pptwise spec validate deck-dir/deck.spec.json [--json]
```

IR schema 把每个共享片段只放进 `$defs` 一次：每个组件用自己的类型名，组件联合叫 `Component`，图标名枚举叫 `IconName`，行、数字、卡片、图表和页面共用的小标签叫 `Tag`，数字、行和节点是哪一类消息叫 `Tone`，页面的年份刻度叫 `Years`，页面的表决框叫 `Ballot`，只有部分版式会画的页面字段叫 `Kicker`、`Fields`、`Stamp` 和 `Stage`。默认输出一行，加 `--pretty` 才缩进。

`--component` 打印一个组件的 schema，只带它用到的 `$defs`。`--kind` 打印该 kind 页面可以放的组件、每个内置主题和每个已装包内主题为它绑定的脸（读不了的包会被略过，并在 stderr 说明）、这些组件的 `oneOf` 以及它们的 `$defs`。加 `--theme` 只回答绑定主题的情况。主题名按 `validate` 解析 spec 主题的同一顺序查找：先 deck 目录（`theme.json`、`<name>.theme.json`），再工作区 `themes/`，再已装内容包，最后内置预设。deck 目录取 `--deck <dir>`，没给时当前目录含 `deck.spec.json`，或含该主题名的 deck 本地文件（`theme.json`、`<name>.theme.json`、`<name>.json`）就算 deck，`validate deck.json` 也是从裸 IR 所在目录读主题的。脸不画任何组件时，列表为空，`oneOf` 的位置换成 `not: {}`。列表来自 validate 用的同一条主题菜单路线。列表之外的组件要么被 `validate` 拒绝，要么在某个替身 kind 的脸接得住时，让这一页按那个 kind 来画，并给出警告。主题不提供的 kind，列表是它的替身们的，`drawnAs` 按远近列出它们。未知的类型、kind 或主题会失败并列出合法名字。

`spec validate --json` 把结果打印成一个 JSON 对象。合法的 spec 给出 `ok: true`、主题、解析后的叙事、封面标题 `title`，以及按顺序排列的 `pages`，每页带页号、`id`、`type`、正文页的 `kind`、`heading`，spec 里有 `summary` 时也带上，另附全部警告。不合法的 spec 给出 `ok: false` 和每条错误及其路径，退出码为 1。

图标字段打印为一个指向 `pptwise icons` 的字符串。校验始终按完整枚举检查。

IR 版本是 `"5"`，deck spec 版本是 `"1"`，主题文件版本是数字 `2`。当前 IR 没有 `seed`、`layout`、`beat` 或 `arrangement` 字段。

## 逐页检查

```bash
pptwise inspect <deck> --page <id> [--json]
pptwise inspect <deck> --page <id> --component <type> [--json]
pptwise inspect <deck> --page <id> --fit [--json]
```

`inspect` 按 `validate` 读整份 deck 的方式读 deck 项目里的一页，只有一处不同：它只读这一页的页面文件，其他页都按占位页组装。deck 里别处有坏掉或还没写的页面，不会改变这一页的答案。

默认报告列出 spec 锁定的字段与填写提示、页面文件及其是否已存在、这一页的脸上页面文件可以填的顶层键及其 schema（只有部分脸才有位置的键，比如表单抬头那几行 `fields`，只在这张脸有位置时才列出）、绑定主题的脸在这一页能画的组件（并标出其中的全页组件和必需组件）、来自 spec `focus` 与页面已有内容的候选、`validate` 对这一页的计数要求，以及 `validate` 对这一页或整份 deck 的结论。计数分两级。超过 `error` 上限时 `validate` 拒绝这一页，超过 `warning` 上限时它只警告。画出来的页面到不了的上限不列出：同一计数上有更严的错误先触发的上限，以及超过整张 1280×720 画布所能显示数量的上限，因为远没到这个数时绘制就已经丢内容了。页面有错误时命令以 1 退出。

报告还会列出主题在这一页的招牌版式：这一页的脸提供的组合画法（主题样例页用的那些手工画法），为这一页的 kind（或它落到的 kind）设计的排在前面，每个都写明画出来的样子和配方，也就是这种画法要的组件、条目数和字段。这张脸为别的 kind 准备的画法跟在后面，只列名字。封面、章节页或结尾页的脸如果自己画在照片上，就列出这张照片，写法是背景图片。页面已写好且通过校验时，报告会把它画出来，标出眼下画它的是哪种画法，或者说明脸用的是普通版式。配方是一条路，不是保证：文字仍然要放得下。配方是引擎内部的事实，永远不进 IR。

`--component <type>` 展开这一页可以放的一个组件：它的设计说明、这一页对它的上限、它是否必须独占整页，以及 `schema --component` 为它打印的同一份 schema。这一页的脸不画的类型会失败，并列出它能画的类型。

计数不能证明内容在画出来的页面上放得下。`--fit` 用同一个渲染器画这一页，读取与 `render` 内容丢弃门禁相同的丢弃计数，所以它报告放得下的页面，`render` 一定接受。它还报告为了放下而被截断的文字，以及主题的脸让位、改由更朴素版式画完整页的情况。会丢内容或页面有 validate 错误时以 1 退出。还没写的页面，或 `validate` 拒绝的页面，不会被画出来，报告会说明原因。`validate` 也会画内容页，所以会丢内容的页面就是 `validate` 拒绝的页面，它的报错写明会丢什么。

`--json` 把报告打印成一行 JSON。

## Assemble 与 disassemble

```bash
pptwise assemble <dir|name> [-o <deck.json>]
pptwise disassemble <ir.json> -o <dir>
```

Assembly 组合 spec 拥有的语义、只含内容的页面文件与本地资产。缺失页面文件会变成占位页。它不持久化脸的选择或其他渲染状态。

Disassembly 拒绝覆盖已有 `deck.spec.json`。它保留页面 id，并在输入来源可复制或解码时写出资产文件。

## 主题

```bash
pptwise themes [--json]

pptwise theme new --from <preset-or-name> \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme fork <name> --brand "#C8102E[,#E97132]" \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme fork <name> --primary "#0B5FFF" \
  [--bg <hex>] [--accent <hex>] [--text <hex>] [--surface <hex>] \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme try <id,id,...> [-o <dir>]
pptwise theme try [<id,...|all>] --title <text> [--occasion <words>] \
  [--subtitle <text>] [--lang zh|en] [--page <page.json>] [--json] [-o <dir>]
```

`theme new` 拷贝一个预设或已解析的工作区主题。输出路径与 id 至少传一个。新主题是完整且独立的对象。

`theme fork` 保留菜单，并运行对比度门。重新上色有两种方式，不能混用：

- `--brand <hex>[,<hex>]` 保留主题自己的底色、文字色、面板色和字体，把品牌色原样放进主题最显眼的彩色位置，主题其余的彩色都从品牌色派生成同色系的深浅。第二个颜色是公司自己的配色，进主题的第二个彩色位置和图表的第二个系列，但图表本是「墨色里一个颜色」的主题保持单色。柱子和色块用品牌色原样。品牌色当标题字看不清，或主题会把主色加工成认不出品牌的样子时（如 homeroom 的黑板），这个位置保留主题原色，品牌色改放到另一个彩色位置。命令会打印每个颜色放进了哪里，为了在主题底色上看得清而调过明暗时也会说明。规则见[品牌抽取](./brand-extraction.md#repainting-around-a-brand-color)。
- `--primary <hex>`，可再加 `--accent`、`--bg`、`--text`、`--surface`，按字面设置这些 token，其余围绕它们重推导。需要精确控制时用它。

`--brand` 与任何锚色旗标一起给会报错。在把 `#` 识别为注释起点的 shell 中，应给 hex 加引号。

`theme try` 要求两个到四个互不重复的名称。默认把对比图写到 `.pptwise/theme-try/`。它永远不会修改 deck 绑定。

带 `--title` 时，`theme try` 不画固定样稿，改画调用方自己的页面：一张用这个标题的封面（`--subtitle` 作副题），加一页正文。正文默认是三条短要点，语言由 `--lang` 指定，可选 `zh` 或 `en`，不传时标题里有中日韩文字就用 `zh`，否则用 `en`。`--page <file>` 用一页自己的正文替换它，写法和 IR 里的 deck 页面一样：`kind`、`heading`、`components`，`type` 可写可不写，写的话必须是 `content`。主题名可以是一个或多个，也可以写 `all`，表示 `themes` 列出的全部主题。不写主题名时，`theme try` 画一份四到六个的短名单：场合与 `--occasion` 相符的主题（场合词如 `business`、`tech`，或叙事预设如 `weekly-brief`，逗号分隔），不足四个时从一组从克制到张扬的通用主题里补齐。不传 `--occasion` 时就画这组通用主题：brief、swiss、journal、terminal。语言只决定样例正文页，不影响画哪些主题。

每一页单独按每个主题校验。主题拒绝的页面，比如封面会截断的标题、这个 kind 能落到的脸都接不住的组件，会从这个主题里去掉，列在 `skipped` 下，并附上 validate 的原话。`--json` 另给 `notes`，同一个原因只写一行，并列出它涉及的主题，所以一页在所有主题里都失败时只读到一行。输出目录里每张画出的页面一个 SVG，命名为 `<theme>-cover.svg` 和 `<theme>-content.svg`，另有每个主题一行的 `contact-sheet.html` 和 `manifest.json`。`--json` 把清单打印出来，并用 `dir` 给出输出目录的绝对路径。画完 22 个预设约需半秒。

```json
{
  "manifestVersion": 1,
  "generator": "pptwise theme try",
  "pptwiseVersion": "0.40.0",
  "title": "Q3 review",
  "lang": "en",
  "slide": { "width": 1280, "height": 720 },
  "contactSheet": "contact-sheet.html",
  "themes": [
    {
      "id": "crayon",
      "label": "Crayon",
      "source": "builtin",
      "pages": [{ "type": "cover", "file": "crayon-cover.svg" }],
      "skipped": [{ "type": "content", "kind": "fact", "reason": "kind: ..." }]
    }
  ]
}
```

`source` 是 `builtin`、`pack`，或 deck 与工作区主题文件对应的 `file`。页面文件路径相对于清单所在目录。

`themes --json` 为每一行标出 `source`：出厂预设是 `builtin`，已装内容包提供的主题是 `pack`，并带上 `pack` id。读不出来的包列为一条带 `error` 字段的条目，不影响其余条目。

每个主题行还带 `menu`：`cover`、`chapter`、`ending` 各自落到的版式，以及 `content` 下这个主题提供的每种内容 kind 落到的版式，按 kind 词表的顺序排列。主题不提供的 kind 不出现在 `content` 里，spec 里写了这种 kind 的页由最近的替身 kind 来画，`spec validate` 只给一条提示（见 [Menu lookup](./menu-lookup.md#content-pages)）。这份列表读自 validate 和 render 解析页面所用的同一份编译后菜单。crayon 那一行的一部分：

```json
"menu": {
  "cover": "crayonbox-cover",
  "chapter": "crayonbox-chapter",
  "ending": "crayonbox-ending",
  "content": { "points": "crayonbox-sheet", "list": "crayonbox-sheet", "statement": "crayonbox-sheet" }
}
```

主题名称先从 deck 目录解析，再从向上查找的工作区 `themes/` 目录解析，再查已装内容包，最后查出厂预设。未知名称报错，并列出查过的每个位置，包括每个已装包的目录。Deck 与工作区文件可以保名遮蔽出厂预设或包内主题。主题 id 必须匹配 `^[a-z0-9-]+$`。覆盖已有主题文件需要 `--force`。

## 品牌抽取

```bash
pptwise brand extract <file.thmx|file.potx|file.pptx> \
  -o <theme.json> \
  [--id <id>] [--label <label>] [--from <donor>] [--brand-fonts]
```

抽取完全在本机运行。它读出模板的品牌色（`accent1`）和第二个颜色（`accent2`），按 `theme fork --brand` 的同一套规则给 `--from` 指定的主题重新上色，写出完整 v2 主题。主题默认保留自己的字体。`--brand-fonts` 改把模板的西文字体排在最前，中文字体永不替换。字体不在导出安全名单上时（这时它根本不生效），或没有精确字宽表时（长行可能溢出），命令会给出警告。模板的背景色、文字色和其余强调色都不使用。`--from` 默认是 `bulletin`：在测过的品牌色里，它是能原样把品牌色放在门面上的商务主题。

## 叙事与引擎检查

```bash
pptwise narratives [--json]
pptwise layouts [--json]
```

Narratives 报告命名预设、具体 strategy、pacing、audience 三轴与主题推荐。推荐用于 spec 前的主题选择，不参与选脸。

`layouts` 报告内部注册记录、容量、槽位与引擎标记。开发脸或检查菜单注册时使用。它的 id 不应出现在 IR v5 或 deck spec 中。

## 图片

```bash
pptwise asset-brief <target> [--json]
pptwise images search <query> \
  [--orientation landscape|portrait|square] \
  [--color <name-or-hex>] [--min-width <px>] [--min-height <px>]
pptwise images fetch <provider:id> --deck <dir> --as <asset_id> [--query <text>]
pptwise images list --deck <dir>
pptwise images generate --deck <dir> --as <asset_id> [--prompt <text>]
```

搜索依次检查 Pexels、已配置的 Pixabay 和经过商业用途过滤的 Openverse 来源。Fetch 和 generate 把图存成 `<asset_id>.jpg`，旁边带来源 sidecar `<asset_id>.json`。目标是 deck 项目时，图写进这个 deck 自己的 `assets/`，deck 按文件名登记它们，所以 deck 换目录图也跟着走。目标是单个 IR 文件时，图写到 `.pptwise/<place>/assets/`。旧版本给 deck 项目存在 `.pptwise/<place>/assets/` 的图，deck 不挪位置时照样能用。要挪位置，先把它们复制进 deck 的 `assets/`。Generate 使用已启用的本地生成器，省略 `--prompt` 时读取 asset brief 提示词。生成器被沙箱挡住、写不了自己的主目录时（`Operation not permitted`、`EPERM`、`FS_PERMISSION_DENIED`），报错会点名这个生成器并给出办法：在沙箱外运行这条命令，或在宿主里允许它写自己的主目录。把它的登录文件复制到别处不算办法。

页面引用的 `asset_id` 没有对应文件时，validate 会警告，并给出这张图该放的路径，比如 `decks/q3/zh/assets/hero.jpg`。

## Preview 与 serve

```bash
pptwise preview <target> [-o <dir>] [--html] [--no-git-ignore]
pptwise serve <target> [--port <number>] [--no-open]
```

Preview 为每页写一个 SVG。`--html` 还会写一个内联评审界面，带缩略图、键盘导航、占位页标记，以及完整 deck 的 audit 输出。

Serve 监听 IR 或项目源文件，包括 deck 本地的 `theme.json`，并刷新浏览器。Agent 应传 `--no-open`，报告准确 URL，结束时只停止自己启动的进程。

`GET /status` 返回 JSON 对象，包含 `latestRevision`、`servedRevision`、`latestOk` 和可选的 `error` 消息。`GET /` 带三个响应头：`X-Pptwise-Build-Status`（`ok` 或 `failed`）、`X-Pptwise-Served-Revision`、`X-Pptwise-Latest-Revision`。重建失败时浏览器显示错误横幅，继续提供上一次成功的 HTML，不会把旧结果冒充最新。

## 内容包

```bash
pptwise license set <key>
pptwise license status
pptwise license clear
pptwise packs sync [--json]
pptwise packs list [--json]
```

内容包是一组带版本的额外主题，由 license 解锁。`license set` 校验 key 的形状后存进 `$PPTWISE_HOME/license.json`，只有本人可读。`license status` 最多显示 key 的前 8 个字符。`license clear` 删除 key，已装的包保持原样。

`packs sync` 找出 license 覆盖、但本地缺失或版本不同的包，逐个下载安装。装前校验 sha256、`pack.json`、engine 范围与每个主题文件。需要更新版 pptwise 的包会跳过并提示更新。没有 license 时只打印一行并以 0 退出。同步失败时已装的包保持原样，并以 1 退出。`PPTWISE_PACKS_URL` 可以改指另一台服务器，地址必须是 https（只有 `localhost`、`127.0.0.1`、`::1` 上允许明文 http）。协议、包格式与 `--json` 报告见 [内容包](./packs.zh-CN.md)。

## 配置与体检

```bash
pptwise init
pptwise config set <key> [value]
pptwise config show
pptwise doctor [--json]
pptwise check-update
pptwise self-update
```

只有 `config set`、`license set`、`license clear` 和 `packs sync` 会写 pptwise 主目录（`$PPTWISE_HOME`，缺省为 `~/.pptwise`）。做 deck、查 deck 的命令最多只读它，读不到配置就用默认值，所以主目录只读或不存在时照样能做 deck。`packs sync` 在安装时跑，不按 deck 跑。

设置秘密时省略 `config set` 的 value，可以通过隐藏输入填写。`doctor` 只在硬失败时以退出码 1 结束。可选的 `sharp` 与 LibreOffice 能力会单独报告。

第一次创建 `.pptwise/` 的命令用两种办法让它不进 git：在里面写一个内容为 `*` 的 `.pptwise/.gitignore`，并把 `.pptwise/` 加进仓库本地 exclude 文件。任一种都够用，所以 `.git` 不可写时（有些 agent 沙箱就是这样）只多一条提示。`--no-git-ignore` 两样都跳过。共享的 `.gitignore` 永远不动。

DSH 插件的卡片也放在这个文件夹：deck 预览、主题墙和大纲写到会话所在项目的 `.pptwise/previews/<id>/`，一直留到你自己删。`.pptwise/` 由插件先建出来时，它也用同样两种办法让这个文件夹不进 git。只要项目没挪位置，之后哪个会话都能按卡片找回预览。调用拿不到工作目录时，预览放到绝对路径 deck 所在的项目里（`.pptwise/decks/` 里的 deck 就放进外面那个 `.pptwise/`），两样都没有就拒绝并说明原因。四个名字不给 deck 产物用：pptwise 自己写的 `previews/` 和 `theme-try/`，放 deck 源文件的 `decks/`，还有 `themes/`。deck 落到这几个名字上时，目录名后面加 `-deck`。
