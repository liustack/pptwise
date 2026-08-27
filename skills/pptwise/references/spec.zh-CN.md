---
summary: 'skills/pptwise/references/spec.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/spec.md
---

# Spec 写法与页型

何时读：写 `deck.spec.json`、选页型（`cover` / `chapter` / `content` / `ending`）、或做叙事访谈时。

### Phase 1 — 读词汇表（每个 session 都要重新读一遍）

```bash
pptwise schema             # IR JSON Schema: the single source of truth
pptwise schema --spec      # deck spec schema
pptwise narratives --json  # named narrative presets (strategy/pacing/audience axes + theme recommendations)
pptwise themes --json      # built-in themes (id, label, occasions, identity, colors)
pptwise layouts --json     # standard layouts, slots, capacities, and pin-only status
```

永远不要凭上一个 session 的记忆、或凭这份文件本身的记忆去写 IR 或 spec——schema 会演进，`schema`/`narratives`/`themes` 的实际输出永远优先。

动手问人之前，先扫工作区。文件能回答的事实不要问人：

- 已有确认过的 `deck.spec.json` 已经锁死 narrative、theme、品牌框。不要重做访谈。后续请求走阶段六
- 已有 `theme.json`、项目 `pptwise.config.json` 钉死的 theme、用户点名的 theme id、或用户递来的 `.thmx` / `.potx` / 带品牌 `.pptx`，都是品牌信号。抽取或沿用。不要再问有没有模板
- 请求原文已经点名受众、论证方式或疏密，这一轴就算推导出来了。不要再问

品牌信号回答的是这份 deck 长什么样，从来不回答它该怎么论证。完整规则在 `references/branding.md`。

<!-- generated:begin themes -->
### 内置主题全量表

本段由 canonical theme registry 与场合路由表生成。`identity` 表示视觉个性强度。

| id | label | occasions | identity |
| --- | --- | --- | --- |
| `consulting` | Business Consulting | business | medium |
| `enterprise` | Enterprise | business, institutional | low |
| `academic` | Academic | education | medium |
| `insight` | Financial Insight | finance | medium |
| `campaign` | Marketing Campaign | marketing, event | high |
| `classroom` | Classroom | education | medium |
| `ink` | Ink Wash | culture | high |
| `tech` | Tech | tech | medium |
| `runway` | Fashion Runway | fashion | high |
| `journal` | Editorial Journal | editorial | medium |
| `luxe` | Luxe | luxury, event | high |
| `heritage` | Heritage | culture, luxury | medium |
| `pulse` | Health & Life Science | health | medium |
| `terra` | Sustainability & ESG | sustainability | medium |
| `ember` | Startup Pitch | startup | high |
| `vermilion` | Official Report | government, institutional | low |
| `crayon` | Kids Education | kids, education | high |
| `arena` | Esports & Entertainment | entertainment | high |
| `museum` | Museum | museum, culture | high |
| `stage` | Keynote Stage | keynote | high |
| `lecture` | Lecture Hall | education | high |
| `swiss` | Swiss Institutional | institutional | low |
| `memo` | Decision Memo | business, institutional | low |
| `playbill` | Playbill | event, entertainment | high |
<!-- generated:end themes -->


**边界页规则：** `chapter` 永远不渲染 `components` 或 `footnote`。`cover` 与 `ending` 永远不渲染 `footnote`。边界页只有在已知版式声明了兼容槽位时才能带 `components`。目前 `verdict-index` 与 `gauge-verdict` 封面各接受一个 `bullets` component，部分 ending 版式接受自己声明的 body 内容。普通正文放到 `content` 页。`validate` 会点名已知版式会丢掉的字段，并要求把内容移走。

```json
// pages/market.json，spec type "chapter"：WRONG，chapter 版式不渲染 components
{ "components": [{ "type": "bullets", "items": ["市场规模", "买家分层"] }] }
```

```json
// pages/market-detail.json，spec type "content"：CORRECT
{ "components": [{ "type": "bullets", "items": ["市场规模", "买家分层"] }] }
```

```json
// pages/market.json，spec type "chapter"：保持空白，内容已移走
{}
```

`docs/deck-projects.md` 里的边界页渲染面表（boundary-page render surface table）有按页型划分的完整对照。

### Phase 2 — 定 spec 并确认

写任何页面内容之前，先提议并确认。

- 先锁定叙事包：具名预设（或显式三轴）、theme id、品牌框姿态、以及 typeScale 档（封面 / 章 / 演讲页标题有多大：`regular` 省略/1，`display` 1.3，`hero` 1.5）。这是位于 theme 之上的一层决策，不是视觉选择。任一轴仍未知且用户在场时，走下方「叙事访谈」。这种情况下不要自己静默挑一个预设
- 疏密（留白还是铺满）在访谈里判定（或从请求推导）。钉高潮页、金句页、证据页版式和写 `notes` 时走 `references/layouts.md` 的稀排页合同。`pacing` 不会为此多出第四档
- 从请求和工作区提取受控场合信号，例如 `business`、`education`、`event` 或 `institutional`。先用 `themes --json` 的 `occasions` 筛出两到三套，再用 `identity` 决定视觉表达要克制还是鲜明。叙事里的 `themeRecommendations` 只在这两层之后作参考和平手裁决，不得压过场合或 identity 匹配。没有场合命中时，才按路由回落顺序用它，随后是仅按 identity 的列表与 `consulting`。访谈的品牌问如果返回模板，先抽成候选主题文件。用户确认前，不要把它命名为项目 `theme.json`，见 `references/branding.md`
- 用户想比较内置视觉方向时，带两到四个候选 id 跑 `pptwise preview deck-dir/ --themes consulting,swiss,memo`。命令会把同一套已解析封面与第一张内容页用每个主题 repaint，再排成对比图。把图给用户看，让用户按图选择。尚未落盘的自定义候选要单独跑 `pptwise preview deck-dir/ --theme-file <candidate> --theme <id> --html`，因为注册不会选中主题。无人运行时，采用场合与个性强度排序后的第一个确定性候选，并明确说出选择
- 确认后，把选中的 id 写进 `deck.spec.json`。自定义主题文件落在 `deck-dir/theme.json`，spec 引用它的 id。项目路径后续不需要 `--theme-file` 或 `--theme`。选择内置主题时不需要复制一份 `theme.json`
- 用户一点头，立刻把确认下来的 `narrative`、`theme`、`branding` 写进 `deck.spec.json`，再起草任何一页。不要把答案留在对话里，等页面写完再凭记忆补
- 起草 `deck.spec.json`：每页一条记录（`id`、`type`、`heading`，可选加 `beat`/`focus`/`summary`）——以 `cover` 开篇，以 `ending` 收尾，中间的每一页都是 `content` 或 `chapter`。三轴与某个预设完全相等时，`narrative` 写预设 id 字符串，否则写 `{strategy, pacing, audience}`。不要写 `{id, pacing}` 这种混形。默认省略 `branding`。只有每一页内容页都需要品牌页脚时才写 `branding: "full"`（`meta.confidentiality` 为 `confidential` 或 `restricted` 时同样写 `"full"`）。不要在 spec 上发明 `typeScale` 字段，那个字段不存在。档是推荐。只有跳过 spec、直接写 IR 时，才允许把 `theme.style.shape.typeScale` 写进 IR
- 跑 `pptwise spec validate deck.spec.json`，把它报出的问题都修掉，直到打印 `OK`——边界页、标题长度、beat 轮换、页数是否匹配 pacing 这些硬门都在这一步触发，早于任何一页正文的写作
- `spec validate` 打印 `OK` 之后，在 `deck.spec.json` 里设一个 `seed`（任意整数）以保证修订稳定——现在就写一个，或者在阶段三跑一次 `pptwise assemble`，把它打印出的 `generated seed …` 值抄进 spec。没有固化的 seed，之后改一页的标题就可能打乱其余每一页自动选出的 layout

**用户确认过校验通过的 spec 之后，不要再重新定 spec。** 改动一份已确认的 spec（调整顺序、改页型、删页）会悄悄浪费用户已经做过的审阅。如果确有新信息迫使必须改动，先说明理由并重新取得确认，再重新跑一次 `spec validate`。

### 叙事访谈（最多一轮）

用户在场，且受众、怎么讲 / strategy、pacing 任一轴仍未知时，把所有未决的问放进**一条**消息转达给人，然后停。不要自己填。不要说「我按常见情况先选」。宿主有选择题工具就用它，选项原文照传。

这条消息开头先写一句话，说出你打算建的这份 deck：给谁、论证怎么讲、每页多满、哪个主题、页脚开还是关。这句话只能用请求和工作区真说过的东西搭。缺信号的地方就说缺，并把 ★ 点明成默认，不是对用户处境的读数。不要把默认打扮成结论。这句话和选项里都不要出现 `pyramid`、`spacious`、`executive` 这类轴名。结尾给三条出路：不改就说「就这样」，要改就挑选项，或者说「都不对」。

整段跳过访谈（零问）：已有确认过的 spec。用户说跳过问题、直接生成或批量。这一轮里根本没有人。请求已经同时锁定受众、论证方式、疏密。完整 brief 仍要在写 spec 之前甩一句叙事包。那是原来的 spec 确认，不是第二轮访谈。

没有选择题工具，不等于没有用户。普通文本对话里用户是在场的：问题就是整条消息，停照旧。只有真的没有人的运行（CI、批量、无对话脚本）才免掉这次停顿，而且仍要把包、一句理由、一句改口条件写进可见输出，然后按包继续。事后用户任何一条反对都重开这个决定，改完重跑 `spec validate`。

只跳过已推导的轴。空 workspace（无 spec、无 `theme.json`、无钉死的 config theme、请求里什么都推不出）把 Q1–Q4 一起问。没有品牌信号的工作区即使别的文件很多，也要问 Q4。

用户跳过某选项、说「都行」、或回了表外的话：用 ★ 默认补齐，在推荐理由里写明补了哪一轴，不要追问。用户说「都不对」：只回一句「三轴里哪一根不对」，别的都不问。用户否决推荐包：抛出事先准备的第二候选，不要重开访谈。

<!-- 维护者注记，不要转达给用户：Q1 今天的价值全部来自下面那张查表和正文口吻，`audience` 轴在渲染面上仍然什么都不做。如果将来查表不再读 `audience`，应该删掉 Q1，而不是留着一个答案改变不了交付物的问题。 -->

**Q1 这页是讲给谁的？** `executive` 董事会 / 高管（结论先行） · `technical` 会核对数字的技术同事 · `customer` ★ 客户、买家、路演现场 · `public` 公开或不特定。

**Q2 你想怎么讲这件事？** 这一问才是这份 deck 的读法，Q1 和 Q3 只是把它调准。`talk-pyramid` ★ 一页一个结论（`pyramid`） · `talk-showcase` 一页一个画面或数字（`showcase`） · `read-brief` 一页铺满证据（`briefing`） · `teach` 按步骤教（`instructional`）。年报 / 品牌片 / 情境到解决的说法直接推导 `storytelling`，不要把它加成第五选项。

**Q3 页上要留白还是铺满？** `spacious` ★ 留白，一页少字 · `balanced` 普通疏密 · `dense` 铺满证据，页自己把话说完。

**Q4 有没有公司模板可以抽成主题？** 仅当没有品牌信号时问。`extract` 有，用户会给出 `.thmx` / `.potx` / 带品牌 `.pptx` · `builtin` ★ 没有，用内置主题 · `later` 先用内置，稍后补（当作 `builtin`，不开第二轮）。工作区里有没有 `theme.json`，是自己查的事，永远不问。

这条消息的结尾原样附上下面这个块，一轴一行，已推导的轴填上值，未决的轴留 `?`：

```
NARRATIVE_INTERVIEW
audience: ?
tell: ?
pacing: ?
brand: ?
```

这个块就是闸，不靠自觉：只要还有一行是 `?`，就不许新建或修改 `deck.spec.json`、页面文件或裸 IR。清掉一个 `?` 只有两条路：用户回答，或者用户已经回复、只是留空了某一轴，那一轴用 ★ 默认补。真的没有人的运行里，自己把每一行填满，并在块的第一行标上 `(no user in this run)`，让这个选择可见、可推翻。

用户回复之后，立刻给一个推荐包和一个第二候选，一句理由，一句改口条件，然后等确认：

`推荐：<预设或三轴> × <theme> × branding 省略|full × typeScale regular|display|hero`
`改口条件：<一句>`。最常见的一条：这份会在没有主讲人的情况下被转发，把多出来的字写进 notes，或者建议改用 PDF，不要把幻灯片塞满。

下面的查表只决定叙事预设、品牌框姿态和 type-scale 档。主题单独走上面的场合与 `identity` 路由。相符预设里的 `themeRecommendations` 可以裁决最后的平手，但从不作为主选择器。默认省略品牌框字段。`meta.confidentiality` 为 `confidential` 或 `restricted`，或每一页内容页都需要品牌页脚时，才写 `"full"`。`customer` + `talk-pyramid` + `spacious` → `pitch` / 省略 / display。`executive` + `talk-pyramid` + `spacious` → `boardroom-report` / 省略 / display。`customer` + `talk-showcase` + `spacious` → `product-launch` / 省略 / display。`technical` + `teach` + `balanced` → `training` / 省略 / regular。`technical` + `read-brief` + `dense` → `weekly-brief` / 省略 / regular。`executive` + `read-brief` + `dense` → 三轴 `{pyramid, dense, executive}` / 省略 / regular。`public` + storytelling + `balanced` → `annual-review` / 省略 / regular。其余写三轴对象，取最接近的预设：`pyramid`+`executive` → `boardroom-report`，`pyramid`+`customer` → `pitch`，`showcase` → `product-launch`，`instructional` → `training`，`briefing`+`dense` → `weekly-brief`，`storytelling` → `annual-review`，否则 `general`。

typeScale 档：`dense` 或 `balanced` 用 `regular`。`spacious` 用 `display`。`hero` 只出现在把 theme 换成 `stage` 的那种换皮上。不要为了把标题加大，把董事会 deck 改成 `stage`。不要在 `deck.spec.json` 上写 `typeScale`。不要为了一个 deck 去改仓库根上的 `pptwise.config.json`。跳过 spec、直接写 IR 时，非 `regular` 的档可以写成 `theme.style.shape.typeScale` 1.3 或 1.5。

第二候选跟着推荐包一起抛，事先准备，而且必须在机制上不同：翻疏密（`spacious` ↔ `dense`，type-scale 跟着翻），或者换由什么领头论证（`pitch` ↔ `product-launch`，`training` ↔ 同样内容的密页讲义）。同样三根轴换个主题是换皮，不算候选，只在用户否的是皮时才给，并说清叙事没动。showcase 想要更大标题时，`stage` × `hero` 属于这种换皮。不要三轴一起翻。

这一轮只定三根叙事轴，不负责判断这件事该不该做成 deck。那个更大的问题还开着，就直说，让用户先答，再定 spec。

很小的 deck 仍可跳过 spec 文件、直接写一份 IR。轴未知时不可跳过这场访谈。把同样的决策写到 IR 的 `narrative` / `theme` / `branding` 上。
