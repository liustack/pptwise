---
summary: 'skills/pptwise/references/layouts.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/layouts.md
---

# 版式与写死

何时读：钉 `layout`，包括高潮页、金句页、证据页稀排版式时。

### 稀排 pin-only 版式

下方生成表才是 pin-only 的完整清单。这里单独解释的七种，是需要额外写作纪律的稀排演讲版式。它们不会通过普通自动选型出现。每次要用都得显式设置 `layout`。pin-only 的 content 版式超出声明容量时 `validate` 会硬报错（普通版式钉住超容量只给警告）。

`quote-stage` 是 content 页上的论断页：一句短而有力的标题是整页主视觉，最多再配一个短附注 component（出处、署名、一句补充）。0 个 component 合法。这一页仍会画主题的品牌页脚和 motif。

`statement` 是 content 页上的整页诗行或金句。最多一个 component，渲成出处小字（quote / paragraph / citation），不走卡片。可选 kicker 来自上一章。品牌页脚和 logo 不画。主题 motif 仍画。脸是主题专属的（已定稿的主题不是通用斜体 500 行）。

`pull-quote` 是 content 页上的引言页：标题、出处小字、可选 muted 散文。出处优先 quote 的 `attribution`，否则 `subheading`。品牌页脚和 logo 不画。主题 motif 仍画。

`verse-chapter` 是居中诗行章首（`type: "chapter"`）。tracking 章号眉、两行标题、可选斜体副题。没有水印大数字，没有 body，没有 footnote，chapter 页的既有边界照旧。logo 不画。主题 motif 仍画。

`stat-hero` 是 content 页上的整页数字。英雄位数字优先取自 `kpi_cards` 第一项，否则就是 heading。一行说明，可选出处。最多一个 component。品牌页脚和 logo 不画。主题 motif 仍画。

`one-evidence` 是 content 页上的断言加一条证据。标题是一句完整主张。最多一个 component，渲成那条证据（一张 chart、一张表或一张图）。品牌页脚和 logo 不画。主题 motif 仍画。

`mono-bleed` 是 content 页上的满版品牌色底，字当图。容量 0：字写在 heading 里，没有 body component。品牌页脚和 logo 不画。主题 motif 仍画。

### 稀排页合同

一份 deck 是拿来讲的。幻灯片装不下的字写进 `slide.notes`。如果文件必须作为文档独立站住，建议用 PDF，不要把画布塞满。

这不是新的 `pacing` 档。枚举仍是 `dense` / `balanced` / `spacious`。合同靠版式点名、`notes` 和 deck `branding` 实现。

高潮页、金句页、证据页，在主题提供这些版式时显式钉 pinOnly 极简版式。点名：`statement`、`pull-quote`、`verse-chapter`、`stat-hero`、`one-evidence`、`mono-bleed`。不要把这些页交给自动选型。某一页真的只剩一句话时，即使 pacing 是 `dense` 也仍然钉。crayon、classroom、enterprise、pulse、runway、ember 不提供这些版式。如果 `validate` 警告这个钉子不是该主题提供的稀排页，就去掉钉子，改写普通内容页。

访谈或请求选了 `spacious`：收紧页上预算。标题就是主视觉。钉住的极简页最多一个 body component（一行出处、一个数字、一张图或一张表）。这些页零 bullet。装不下就拆页。

`balanced` 或 `dense`：按 pacing 预算写。某一页是一句话、一个数字、一句引语或一条证据时，仍然钉极简版式。

讲稿写进 `slide.notes`。`render` 导出成原生 PowerPoint 演讲者备注（View → Notes，演讲者视图可见）。讲稿从不画到画布上。

品牌框 omit/full 写在 `references/branding.md`。

下方生成表覆盖全部标准版式，包括所有 pin-only 封面、章节、内容和结尾骨相。容量与槽位来自 `pptwise layouts --json` 使用的同一份 registry。

<!-- generated:begin layouts -->
### 标准版式全量表

本段由版式 registry 与每个版式的 slots 元数据生成。`capacity` 是所有已声明槽位容量之和，`n/a` 表示该版式没有声明可计数容量。

#### 封面

| id | pinOnly | capacity | 一句话用途 |
| --- | --- | ---: | --- |
| `banner-title` | 否 | n/a | 提供 `kicker`、`meta`、`heading`、`rule`、`subheading` 槽位。 |
| `poster-center` | 否 | n/a | 提供 `heading`、`rule`、`subheading`、`meta` 槽位。 |
| `left-anchor` | 否 | n/a | 提供 `kicker`、`decor`、`heading`、`meta`、`subheading`、`rule` 槽位。 |
| `constellation` | 否 | n/a | 提供 `kicker`、`rule`、`subheading`、`heading`、`meta`、`decor` 槽位。 |
| `editorial-masthead` | 否 | n/a | 提供 `heading`、`rule`、`subheading`、`meta` 槽位。 |
| `tone-adaptive-header` | 否 | n/a | 提供 `kicker`、`meta`、`heading`、`subheading`、`rule` 槽位。 |
| `fashion-masthead` | 否 | n/a | 提供 `kicker`、`rule`、`heading`、`subheading`、`meta` 槽位。 |
| `split-diagonal` | 否 | n/a | 提供 `kicker`、`decor`、`heading`、`rule`、`subheading`、`meta` 槽位。 |
| `colophon` | 否 | n/a | 提供 `decor`、`heading`、`kicker`、`subheading`、`meta` 槽位。 |
| `institutional-block` | 否 | n/a | 提供 `kicker`、`heading`、`decor`、`meta` 槽位。 |
| `memo-head` | 否 | n/a | 提供 `kicker`、`rule`、`heading`、`meta` 槽位。 |
| `board-head` | 否 | n/a | 提供 `kicker`、`heading`、`rule`、`subheading`、`meta` 槽位。 |
| `bill-head` | 否 | n/a | 提供 `heading`、`rule`、`meta` 槽位。 |
| `verdict-index` | 否 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `band-title` | 否 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `header-band` | 否 | n/a | 提供 `meta`、`heading`、`subheading` 槽位。 |
| `paper-masthead` | 否 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `horizon-wedge` | 否 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `corner-wedge` | 否 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `ikb-field-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `stat-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `type-rule-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `thesis-plate-cover` | 是 | n/a | 提供 `kicker`、`heading`、`meta`、`rule` 槽位。 |
| `chalk-band-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `capsule-open-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `issue-head-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `double-frame-cover` | 是 | n/a | 提供 `kicker`、`heading`、`rule`、`meta` 槽位。 |
| `vertical-title-cover` | 是 | n/a | 提供 `heading`、`subheading`、`rule`、`meta` 槽位。 |
| `invitation-plate-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `lookbook-open-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `red-head-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `pledge-open-cover` | 是 | n/a | 提供 `kicker`、`heading`、`meta` 槽位。 |
| `report-open-cover` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `cut-panel-cover` | 是 | n/a | 提供 `kicker`、`panel`、`heading`、`subheading`、`meta` 槽位。 |
| `gauge-verdict` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta`、`rule` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `crayonbox-open` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta` 槽位。 |
| `show-headline` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`image`、`caption`、`meta`、`decor` 槽位，其中 `image` 槽接收 `image` 组件，容量 1。 |

#### 章节

| id | pinOnly | capacity | 一句话用途 |
| --- | --- | ---: | --- |
| `masthead-chapter` | 否 | n/a | 提供 `rule`、`watermark`、`heading`、`subheading` 槽位。 |
| `constellation-chapter` | 否 | n/a | 提供 `watermark`、`heading`、`subheading`、`rule` 槽位。 |
| `rail-chapter` | 否 | n/a | 提供 `watermark`、`heading`、`subheading`、`rail` 槽位。 |
| `banner-chapter` | 否 | n/a | 提供 `watermark`、`heading`、`subheading`、`rule` 槽位。 |
| `poster-chapter` | 否 | n/a | 提供 `kicker`、`rule`、`watermark`、`heading` 槽位。 |
| `roman-chapter` | 否 | n/a | 提供 `kicker`、`watermark`、`heading`、`subheading`、`rule`、`decor` 槽位。 |
| `tone-adaptive-chapter` | 否 | n/a | 提供 `watermark`、`heading` 槽位。 |
| `fashion-chapter` | 否 | n/a | 提供 `kicker`、`watermark`、`heading`、`rule` 槽位。 |
| `verse-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `ghost-rule-chapter` | 是 | n/a | 提供 `watermark`、`rule`、`heading`、`subheading` 槽位。 |
| `block-numeral-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `ghost-section-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`watermark` 槽位。 |
| `ember-index-chapter` | 是 | n/a | 提供 `watermark`、`heading`、`subheading`、`decor` 槽位。 |
| `stroke-index-chapter` | 是 | n/a | 提供 `watermark`、`heading`、`subheading`、`rule` 槽位。 |
| `act-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `folio-ghost-chapter` | 是 | n/a | 提供 `watermark`、`kicker`、`rule`、`heading`、`subheading` 槽位。 |
| `lesson-box-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `sticker-numeral-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `fascicle-ghost-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`watermark` 槽位。 |
| `mirror-volume-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`rule`、`subheading` 槽位。 |
| `volume-slip-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `gilt-ordinal-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`rule` 槽位。 |
| `look-range-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `seal-numeral-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `field-band-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `subject-rule-chapter` | 是 | n/a | 提供 `rule`、`kicker`、`heading`、`subheading` 槽位。 |
| `round-mark-chapter` | 是 | n/a | 提供 `rail`、`kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `one-word-chapter` | 是 | n/a | 提供 `heading`、`kicker`、`subheading` 槽位。 |
| `chalk-rule-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`rule`、`subheading` 槽位。 |
| `decimal-index-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `issue-line-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `day-bill-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `hall-label-chapter` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `gauge-section` | 是 | n/a | 提供 `watermark`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `crayonbox-sticker` | 是 | n/a | 提供 `kicker`、`heading`、`subheading` 槽位。 |
| `show-plate` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`image`、`watermark`、`decor` 槽位，其中 `image` 槽接收 `image` 组件，容量 1。 |

#### 内容

| id | pinOnly | capacity | 一句话用途 |
| --- | --- | ---: | --- |
| `narrow-column` | 否 | 4 | 提供 `rule`、`kicker`、`heading`、`subheading`、`body`、`watermark`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `two-column` | 否 | 4 | 提供 `kicker`、`heading`、`subheading`、`rule`、`body` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `rail-numbered` | 否 | 4 | 提供 `rail`、`kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `stacked-poster` | 否 | 6 | 提供 `kicker`、`rule`、`heading`、`subheading`、`body`、`hero`、`strip`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4、`hero` 槽接收 任意组件，容量 1、`strip` 槽接收 任意组件，容量 1。 |
| `bento-panel` | 否 | 12 | 提供 `kicker`、`heading`、`subheading`、`body`、`grid`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 6、`grid` 槽接收 任意组件，容量 6。 |
| `tone-adaptive-content` | 否 | 4 | 提供 `kicker`、`heading`、`subheading`、`rule`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `asymmetric-triptych` | 否 | 5 | 提供 `kicker`、`heading`、`subheading`、`body`、`lead`、`top`、`bottom`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4、`lead` 槽接收 任意组件，容量 1、`top` 槽接收 任意组件、`bottom` 槽接收 任意组件。 |
| `quiet-frame` | 否 | 4 | 提供 `kicker`、`heading`、`subheading`、`rule`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `split-band` | 否 | 4 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `quote-stage` | 是 | 1 | 提供 `heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 1。 |
| `statement` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`meta` 槽位，其中 `body` 槽接收 `paragraph`、`quote`、`citation` 组件，容量 1。 |
| `pull-quote` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 `paragraph`、`quote`、`citation` 组件，容量 1。 |
| `stat-hero` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`meta` 槽位，其中 `body` 槽接收 `kpi_cards`、`paragraph`、`citation` 组件，容量 1。 |
| `one-evidence` | 是 | 1 | 提供 `heading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 1。 |
| `mono-bleed` | 是 | 0 | 提供 `heading`、`subheading`、`body` 槽位，其中 `body` 槽承载派生内容，容量 0。 |
| `gauge-stats` | 是 | 4 | 提供 `kicker`、`heading`、`subheading`、`body`、`rule`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `gauge-point` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`meta` 槽位，其中 `body` 槽接收 `quote`、`paragraph`、`citation` 组件，容量 1。 |
| `crayonbox-cards` | 是 | 4 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 4。 |
| `crayonbox-point` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`meta` 槽位，其中 `body` 槽接收 `quote`、`paragraph`、`citation` 组件，容量 1。 |
| `show-gallery` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 1。 |
| `show-spotlight` | 是 | 3 | 提供 `kicker`、`heading`、`subheading`、`image`、`body`、`meta` 槽位，其中 `image` 槽接收 `image` 组件，容量 1、`body` 槽接收 任意组件，容量 2。 |
| `show-statement` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`rule` 槽位，其中 `body` 槽接收 任意组件，容量 1。 |
| `show-figures` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 任意组件，容量 1。 |

#### 结尾

| id | pinOnly | capacity | 一句话用途 |
| --- | --- | ---: | --- |
| `masthead-ending` | 否 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `constellation-ending` | 否 | n/a | 提供 `heading`、`subheading`、`rule`、`meta` 槽位。 |
| `rail-ending` | 否 | n/a | 提供 `decor`、`kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `banner-ending` | 否 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule`、`meta` 槽位。 |
| `poster-ending` | 否 | n/a | 提供 `heading`、`rule`、`subheading`、`meta` 槽位。 |
| `tone-adaptive-ending` | 否 | n/a | 提供 `kicker`、`heading`、`rule`、`meta` 槽位。 |
| `fashion-ending` | 否 | n/a | 提供 `kicker`、`heading`、`rule`、`subheading`、`meta` 槽位。 |
| `action-pad-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `signoff-ending` | 是 | 1 | 提供 `heading`、`body`、`rule`、`meta` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `close-word-ending` | 是 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `ask-ending` | 是 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `rule-close-ending` | 是 | n/a | 提供 `heading`、`rule`、`meta` 槽位。 |
| `pill-cta-ending` | 是 | 1 | 提供 `heading`、`subheading`、`body` 槽位，其中 `body` 槽接收 `bullets`、`paragraph` 组件，容量 1。 |
| `defense-close-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`meta` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `homework-close-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `reminder-list-ending` | 是 | 1 | 提供 `heading`、`body`、`subheading` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `afterword-ending` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`rule` 槽位。 |
| `invite-field-ending` | 是 | n/a | 提供 `heading`、`subheading`、`rule`、`meta` 槽位。 |
| `seal-close-ending` | 是 | n/a | 提供 `heading`、`subheading`、`rule` 槽位。 |
| `gilt-word-ending` | 是 | n/a | 提供 `heading`、`meta` 槽位。 |
| `window-close-ending` | 是 | n/a | 提供 `heading`、`subheading`、`rule`、`meta` 槽位。 |
| `deliberation-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`rule` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `scorecard-ending` | 是 | 1 | 提供 `heading`、`body`、`subheading` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `care-plan-ending` | 是 | 1 | 提供 `heading`、`body`、`subheading`、`rule` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `seat-cta-ending` | 是 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `release-close-ending` | 是 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `next-lecture-ending` | 是 | 1 | 提供 `kicker`、`body`、`rule`、`subheading` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `resolution-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`rule` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `decision-close-ending` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`rule` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `ticket-cta-ending` | 是 | n/a | 提供 `heading`、`subheading`、`meta` 槽位。 |
| `exit-word-ending` | 是 | n/a | 提供 `heading`、`subheading`、`rule`、`meta` 槽位。 |
| `gauge-next` | 是 | 1 | 提供 `kicker`、`heading`、`subheading`、`body`、`rule`、`meta` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `crayonbox-todo` | 是 | 1 | 提供 `kicker`、`heading`、`body`、`subheading` 槽位，其中 `body` 槽接收 `bullets` 组件，容量 1。 |
| `show-finale` | 是 | n/a | 提供 `kicker`、`heading`、`subheading`、`meta`、`decor` 槽位。 |
<!-- generated:end layouts -->
