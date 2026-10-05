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

大多数 deck 操作都接受 IR v5 文件、deck 项目目录或裸 deck 名。裸名称在已配置的 deck 根目录下解析。显式路径优先。

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

每轮验证之间最多填四页，写每一页之前先用 `inspect` 读它的契约。需要用户在浏览器中实时评审时使用 `serve`。

## 命令索引

| command | 作用 |
| --- | --- |
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
| `theme fork` | 拷贝主题，并围绕新锚色重推导配色。 |
| `theme try` | 用两到四个主题渲染固定试衣样稿。 |
| `brand extract` | 从 Office 文件抽取颜色与字体，产出完整 v2 主题。 |
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

## Render

```bash
pptwise render <target> \
  [-o <out.pptx>] \
  [--draft] \
  [--allow-dropped-content] \
  [--no-git-ignore]
```

省略 `-o` 时，输出写到项目根目录下的 `.pptwise/<deck>/<deck>.pptx`。改颜色用 `pptwise theme fork`，它写出一份完整主题。Render 不接受局部改色覆盖。

`--draft` 允许占位页。`--allow-dropped-content` 允许已知内容丢失，只能在用户明确同意时使用。正常处理方式是缩短或拆页。

## Validate 与 audit

```bash
pptwise validate <target>
pptwise audit <target> [--json] [--pixels]
```

Validation 覆盖严格 IR v5 结构、已安装主题、主题菜单 kind、有效边界脸、组件规则、重复 id、资产、叙事、物理容量与编辑警告。错误会阻止 `OK`，警告不会。

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

## Schema 与 spec

```bash
pptwise schema [--pretty]
pptwise schema --spec [--pretty]
pptwise schema --component <type> [--pretty]
pptwise schema --kind <kind> [--theme <name> [--deck <dir>]] [--pretty]
pptwise icons [--json]
pptwise spec validate deck-dir/deck.spec.json
```

IR schema 把每个共享片段只放进 `$defs` 一次：每个组件用自己的类型名，组件联合叫 `Component`，图标名枚举叫 `IconName`，行、数字、卡片、图表和页面共用的小标签叫 `Tag`，页面的年份刻度叫 `Years`。默认输出一行，加 `--pretty` 才缩进。

`--component` 打印一个组件的 schema，只带它用到的 `$defs`。`--kind` 打印该 kind 页面可以放的组件、每个内置主题和每个已装包内主题为它绑定的脸（读不了的包会被略过，并在 stderr 说明）、这些组件的 `oneOf` 以及它们的 `$defs`。加 `--theme` 只回答绑定主题的情况。主题名按 `validate` 解析 spec 主题的同一顺序查找：先 deck 目录（`theme.json`、`<name>.theme.json`），再工作区 `themes/`，再已装内容包，最后内置预设。deck 目录取 `--deck <dir>`，没给时当前目录含 `deck.spec.json`，或含该主题名的 deck 本地文件（`theme.json`、`<name>.theme.json`、`<name>.json`）就算 deck，`validate deck.json` 也是从裸 IR 所在目录读主题的。脸不画任何组件时，列表为空，`oneOf` 的位置换成 `not: {}`。列表来自 validate 用的同一条主题菜单路线，列表之外的组件会被 `validate` 拒绝。未知的类型、kind 或主题会失败并列出合法名字。

图标字段打印为一个指向 `pptwise icons` 的字符串。校验始终按完整枚举检查。

IR 版本是 `"5"`，deck spec 版本是 `"1"`，主题文件版本是数字 `2`。当前 IR 没有 `seed`、`layout`、`beat` 或 `arrangement` 字段。

## 逐页检查

```bash
pptwise inspect <deck> --page <id> [--json]
pptwise inspect <deck> --page <id> --component <type> [--json]
pptwise inspect <deck> --page <id> --fit [--json]
```

`inspect` 按 `validate` 读整份 deck 的方式读 deck 项目里的一页，只有一处不同：它只读这一页的页面文件，其他页都按占位页组装。deck 里别处有坏掉或还没写的页面，不会改变这一页的答案。

默认报告列出 spec 锁定的字段与填写提示、页面文件及其是否已存在、页面文件可以填的字段及其 schema、绑定主题的脸在这一页能画的组件（并标出其中的全页组件和必需组件）、来自 spec `focus` 与页面已有内容的候选、`validate` 对这一页的计数要求，以及 `validate` 对这一页或整份 deck 的结论。计数分两级。超过 `error` 上限时 `validate` 拒绝这一页，超过 `warning` 上限时它只警告。画出来的页面到不了的上限不列出：同一计数上有更严的错误先触发的上限，以及超过整张 1280×720 画布所能显示数量的上限，因为远没到这个数时绘制就已经丢内容了。页面有错误时命令以 1 退出。

`--component <type>` 展开这一页可以放的一个组件：它的设计说明、这一页对它的上限、它是否必须独占整页，以及 `schema --component` 为它打印的同一份 schema。这一页的脸不画的类型会失败，并列出它能画的类型。

计数不能证明内容在画出来的页面上放得下。`--fit` 用同一个渲染器画这一页，读取与 `render` 内容丢弃门禁相同的丢弃计数，所以它报告放得下的页面，`render` 一定接受。它还报告为了放下而被截断的文字（`render` 允许，`audit` 会报告），以及主题的脸让位、改由更朴素版式画完整页的情况。会丢内容或页面有 validate 错误时以 1 退出。还没写的页面，或 `validate` 拒绝的页面，不会被画出来，报告会说明原因。

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

pptwise theme fork <name> --primary "#0B5FFF" \
  [--bg <hex>] [--accent <hex>] [--text <hex>] [--surface <hex>] \
  [-o <theme.json>] [--id <id>] [--label <label>]

pptwise theme try <id,id,...> [-o <dir>]
```

`theme new` 拷贝一个预设或已解析的工作区主题。输出路径与 id 至少传一个。新主题是完整且独立的对象。

`theme fork` 保留菜单，重推导依赖样式 token，并运行对比度门。在把 `#` 识别为注释起点的 shell 中，应给 hex 加引号。

`theme try` 要求两个到四个互不重复的名称。默认把对比图写到 `.pptwise/theme-try/`。它永远不会修改 deck 绑定。

`themes --json` 为每一行标出 `source`：出厂预设是 `builtin`，已装内容包提供的主题是 `pack`，并带上 `pack` id。读不出来的包列为一条带 `error` 字段的条目，不影响其余条目。

主题名称先从 deck 目录解析，再从向上查找的工作区 `themes/` 目录解析，再查已装内容包，最后查出厂预设。未知名称报错，并列出查过的每个位置，包括每个已装包的目录。Deck 与工作区文件可以保名遮蔽出厂预设或包内主题。主题 id 必须匹配 `^[a-z0-9-]+$`。覆盖已有主题文件需要 `--force`。

## 品牌抽取

```bash
pptwise brand extract <file.thmx|file.potx|file.pptx> \
  -o <theme.json> \
  [--id <id>] [--label <label>] [--from <donor>]
```

抽取完全在本机运行。它复制供体的完整菜单，把抽出的颜色与字体锚点送入整套配色推导，并写出完整 v2 主题。`--from` 默认是 `brief`。

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

搜索依次检查 Pexels、已配置的 Pixabay 和经过商业用途过滤的 Openverse 来源。Fetch 把选定文件与来源 sidecar 固定在 `.pptwise/<deck>/assets/`。Generate 使用已启用的本地生成器，省略 `--prompt` 时读取 asset brief 提示词。

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

设置秘密时省略 `config set` 的 value，可以通过隐藏输入填写。`doctor` 只在硬失败时以退出码 1 结束。可选的 `sharp` 与 LibreOffice 能力会单独报告。

除非命令收到 `--no-git-ignore`，生成的 `.pptwise/` 会加入仓库本地 exclude 文件。
