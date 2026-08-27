---
summary: '主题文件、24 套内置主题、场合路由、视觉对比、选择优先级与自定义主题热重载'
read_when:
  - 挑主题，或查某个主题 id
  - 编写或装载版本 1 主题文件
  - 想让产出看起来像自己公司（`pptwise brand extract`）
  - 对比主题，或改变已 assemble deck 的视觉方向
---

# 主题

主题同时拥有皮肤与结构。style token 控制颜色、字体、间距和背景。brand 配置控制品牌框。四类 face pool 分别策展封面、章节、内容和结尾版式。motif、layout tendency 与稀排页支持补齐定义。

## 选择内置主题

不要只看名字，先跑 `pptwise themes --json`。每项都含 `id`、`label`、颜色、受控 `occasions` 与 `identity`。`identity` 表示视觉个性强度。`low` 克制且机构化，`medium` 是专业体系，`high` 表达鲜明。

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

按下面顺序路由请求：

1. 从任务与源材料提取一个或多个场合信号。
2. 保留 `occasions` 匹配的主题。
3. 按用户需要克制还是鲜明来匹配 `identity`。
4. 叙事里的 `themeRecommendations` 只作参考信号或最终平手裁决。
5. 视觉方向仍未定时，把两到四个候选放到图上比较。

`src/themes/select.ts` 的 `suggestThemes` 实现确定性的源码路由。排序依次看场合命中数、identity 匹配、叙事推荐、canonical 目录顺序。没有场合命中时，依次回落到叙事推荐、仅按 identity 的列表，最后是 `consulting`。SKILL 根据 `themes --json` 走同一条路，让用户可以看到并确认候选。

```bash
pptwise preview my-deck/ --themes consulting,swiss,memo
```

命令会写出 `contact-sheet.html`。每列是一套主题，两行分别是封面与第一张内容页。不需要额外传 `--html`。对 deck 项目，它是在 assemble 已物化的版式上做 repaint 对比，不比较结构骨相。裸 IR 没写 layout id 时，每套主题仍可解析出不同骨相。把对比图给用户看，再把选中的 id 写进 `deck.spec.json`。spec 改完后重新 assemble，才能采用所选主题的完整结构。

## 一套 schema，两种完备度

所有公共主题文件都使用 `src/themes/schema.ts` 中严格的版本 1 schema。存在 `base` 就是 partial 模式。没有 `base` 就是 complete 模式。

| 模式 | 必需结构 | 继承行为 |
| --- | --- | --- |
| partial | `version`、`id`、完整公共 `style` 与 `base`。`label`、`brand`、`occasions`、`identity` 可选 | 从内置 `base` 继承 faces、motif、tendencies 与 sparse 支持。出现 complete 专属字段会报错 |
| complete | `version`、`id`、完整公共 `style`，以及 cover、chapter、content、ending 四个非空 `faces`。`brand`、`occasions`、`identity`、`motif`、`tendencies`、`sparse` 可选 | 不继承任何结构。缺少任一 face pool 都会报错 |

两种模式都要求 `style.id` 与顶层 `id` 相同。自定义 id 不能覆盖内置 id。未知字段会被拒绝。旧的无版本 `{ id, style }` 文件不会被猜测成某种模式，而是硬报错并给出升级说明。

要在既有结构语言上换品牌皮肤时用 partial。只有主题自己拥有四类版式骨相时才用 complete。

## 注册与选择

主题注册与主题选择是两件事。`--theme-file <path>` 只注册文件，让 id 变得可用，从不选中该 id。

裸 IR 要么在 `theme.id` 中写自定义 id，要么把注册与 `--theme` 配对：

```bash
pptwise render deck.json --theme-file acme.theme.json --theme acme
```

deck 项目把确认后的文件放成 `deck.spec.json` 同级的 `theme.json`，再把 id 写进 spec。assemble、validate、audit、preview、serve、render 都会自动注册本地文件，不需要主题 flag。

主题选择共五级，越靠前优先级越高：

1. CLI `--theme`
2. 产物作者写下的选择，也就是项目的 `deck.spec.json`，或裸 IR 的 `theme.id`
3. 项目 `pptwise.config.json`
4. 用户 `$PPTWISE_HOME/config.json`
5. schema 默认值 `consulting`

项目 `theme.json` 与 `--theme-file` 是注册源，不是额外选择层。

## 抽取自己的品牌

`pptwise brand extract` 会在本地读取 `.thmx`、`.potx` 或 `.pptx` 的颜色与字体，写出 `base: "consulting"` 的 partial 主题。如果确实要继承另一套内置结构，请在注册前修改结果里的 `base` 字段。视觉方向确认前，抽取文件使用候选名称。

```bash
pptwise brand extract corp-template.pptx -o my-deck/acme.theme.json --id acme
pptwise preview my-deck/ --theme-file my-deck/acme.theme.json --theme acme --html
```

确认后，把未改动的候选保存为 `my-deck/theme.json`，在 `my-deck/deck.spec.json` 里设置 `"theme": "acme"`，此后项目命令不带主题 flag：

```bash
pptwise render my-deck/
```

OOXML 色槽会映射到 style token，六个强调色组成图表色板。装载时执行所有注册主题共用的对比度下限。映射与限制见 [`brand-extraction.md`](./brand-extraction.md)（英文）。

## Repaint、重新 assemble 与热重载

render 或 preview 上的 `--theme <id>` 是 repaint。它更换视觉皮肤，但保留 `deck.json` 中已经物化的 layout id。它适合快速比较外观，不会采用新主题的结构骨相。

要使用新主题的完整结构，先改 `deck.spec.json` 的 `theme`，再跑一次 `pptwise assemble`，随后执行 validate、audit、render。

`pptwise serve` 会监视项目 `theme.json`。裸 IR 场景还会监视 `--theme-file` 传入的文件。每次重建都会移除旧注册、重新读取文件并刷新浏览器，不需要重启服务。

## Style 覆盖

style override 只改 token，不创建主题。按照 `pptwise schema --style` 编写，通过 `--style` 传入，或存进 `pptwise.config.json`。它不会改变 face pool、motif 选择或主题元数据。
