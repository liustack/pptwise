---
summary: '当前 CLI 命令面：IR v5、主题 v2、deck 项目、固定样张主题对比、验证、审计、图片、预览与安装体检'
read_when:
  - 查询受支持的命令或参数
  - 给 agent 接上 spec、填充、validate、audit 与 render 回路
  - 创建、分叉、对比、抽取或解析主题
  - 排查 audit 输出、图片获取或安装状态
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

每轮验证之间最多填四页。需要用户在浏览器中实时评审时使用 `serve`。

## 命令索引

| command | 作用 |
| --- | --- |
| `render <target>` | 渲染原生可编辑 PPTX。 |
| `validate <target>` | 验证 IR、主题绑定、菜单 kind、组件、资产与内容质量。 |
| `audit <target>` | 运行确定性视觉与几何检查。 |
| `asset-brief <target>` | 报告真实图片画框、裁切、配色、安全区与提示词。 |
| `schema` | 打印 IR、spec 或 style 覆盖 JSON Schema。 |
| `spec validate <file>` | 验证主题形状的 deck spec。 |
| `assemble <dir|name>` | 把 deck 项目合并成派生 IR v5。 |
| `disassemble <ir.json>` | 把 IR v5 拆成 spec、页面文件与资产。 |
| `themes` | 列出 24 个出厂预设及元数据。 |
| `theme new` | 把命名主题拷贝为自包含 v2 文件。 |
| `theme fork` | 拷贝主题，并围绕新锚色重推导配色。 |
| `theme try` | 用两到四个主题渲染固定试衣样稿。 |
| `brand extract` | 从 Office 文件抽取颜色与字体，产出完整 v2 主题。 |
| `narratives` | 列出命名叙事预设与三轴。 |
| `layouts` | 为引擎维护检查内部脸注册表。 |
| `images search` | 搜索已配置的图库来源。 |
| `images fetch` | 把一张选定图库图片固定到 deck。 |
| `images list` | 列出某 deck 已固定的图片。 |
| `images generate` | 通过已启用的本地 CLI 生成并固定图片。 |
| `config set` | 设置可选用户配置。 |
| `config show` | 显示已生效配置，秘密会遮盖。 |
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
- `monotony`

任意发现都会让退出码变为 1。`--pixels` 增加压图文字的像素对比度采样，需要 `sharp`。

## Schema 与 spec

```bash
pptwise schema
pptwise schema --spec
pptwise spec validate deck-dir/deck.spec.json
```

IR 版本是 `"5"`，deck spec 版本是 `"1"`，主题文件版本是数字 `2`。当前 IR 没有 `seed`、`layout`、`beat` 或 `arrangement` 字段。

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

主题名称先从 deck 目录解析，再从向上查找的工作区 `themes/` 目录解析，最后查出厂预设。未知名称报错。Deck 与工作区文件可以保名遮蔽出厂预设。主题 id 必须匹配 `^[a-z0-9-]+$`。覆盖已有主题文件需要 `--force`。

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
