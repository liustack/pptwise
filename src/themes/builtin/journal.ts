import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * journal（人文期刊）——原 magazine 主题纯改名（2026-07-10 用户裁决拆分：
 * 「现在的人文叙事/年度回顾风格配色和版式根本不是人们潜意识里对杂志的
 * 印象」——暖纸+砖红+宋体报头其实是人文期刊气质，magazine 名字腾给新的
 * 时尚杂志主题）。存量 editorial-serif/anthropic-clay 旧 deck 的 legacy
 * 链随迁指向本主题。
 *
 * **编辑组皮肤重设计（2026-08-20，`.issues/2026-08-18-theme-redesign/skins/`
 * 的 `group5-editorial-boards.dc.html` 里 `section#g5` journal 的色板角色表
 * + 封面样例）**：journal 拿到的语域是「人文期刊」——主色就是铅字的墨，
 * 配角是木刻藏书章的赭红，整本单色调版画感。这一轮同时给 heritage 让路：
 * 两家都是印刷品语域，此前 journal 的砖红 `#C0392B` 与 heritage 的暖调
 * 撞在同一格；journal 改赭红、装饰改通栏报头双线，heritage 留角花与徽记
 * （分家的另一半在 `motif-corner-ornament-motif.tsx` 的文件头）。逐条来历：
 *   - `bg` `#FAF7F2` → `#EFEBE1`：近白暖纸 → 期刊纸，比 heritage 的灰本白
 *     多一分黄。旧值几乎是白，宋体报头压上去像打印稿不像期刊。
 *   - `surface` `#FFFFFF` → `#F8F5EC`：内页白，跟着纸底暖半档，卡片不再是
 *     纸上贴的一块纯白。
 *   - `primary` `#1A1A1A` → `#2C2C2A`：纯黑 → 铅字黑（略带暖灰）。期刊的
 *     主色就是墨，不是印刷机的绝对黑。实测压 bg 11.75:1（板上自标 12:1），
 *     承白字 13.99:1。
 *   - `accent` `#C0392B` → `#8C4A3C`：砖红 → 赭红（木刻藏书章色），给首
 *     字母与章号。实测压 bg 5.58:1（板上自标 6:1，实测低 0.42 仍在 4.5:1
 *     正文门槛的正确一侧，按本组纪律留板上 hex、把差记在这里）。
 *   - `text` `#1F1F1F` → `#26261F`：油墨（12.79:1，板上自标 13:1），衬线
 *     承字。
 *   - `muted` `#6E6259` → `#626159`：铅灰脱开偏红的暖色相，走中性暖灰。
 *     板上给的 hex 是 `#66655C`，压 bg 只有 4.93:1，而板上自标 5:1——照
 *     「数字赢」压深到 `#626159`（压 bg 5.23:1、压 surface 5.71:1）。压深
 *     的硬理由不是那 0.07，是 `content-matrix` 的三档 tone 混合格底：
 *     `#66655C` 压最难的一档（accent 混 16%，`#e7dad0`）只有 4.28:1，正文
 *     4.5:1 门槛失守，`full-matrix-contrast.test.ts` 的 muted sweep 当场报
 *     红；压深之后三档实测 4.55 / 4.94 / 5.13:1 全过。
 *   - `border` `#E4DCD0` → `#D9D3C2`：栏线压深，栏与栏之间才分得开。
 *   - `chartPalette` 换成板上的单色调版画四色：铅字黑 / 赭红 / 苔绿 /
 *     亚麻灰。实测 11.75 / 5.58 / 5.83 / 3.50:1。
 *
 * **板上 hex 与板上自标数字矛盾时以数字为准**（本组纪律）：亚麻灰板上给
 * 的 hex 是 `#9A927E`，实测压 bg 只有 2.60:1，落在 3.0 装饰可见度线**之
 * 下**，而板上自标 3.5:1。按「数字赢」保色相压明度解到 `#827C6B`（实测
 * 3.50:1），这是 journal 唯一一处照数字改 hex 的格子。
 *
 * chapter 底色仍与正文同纸（`#EFEBE1`），journal 的章节页靠排印分段不靠
 * 满版色块。
 *
 * 装饰见 `src/motifs/motif-corner-ornament-motif.tsx`（v3，2026-10 定稿重画：
 * 刊头的栏目名与期号、页脚居中的页码「· N ·」；v2 的顶缘文武双线、底缘单线和
 * 「№」退役）。journal 的锚点 motif 是 `corner-ornament-motif`，内置主题里
 * 只有 journal 用它。
 *
 * **第八波刊头规制（2026-08-23，`.issues/design-boards/wave8/b2/Journal.dc.html`）**：
 * 封面改为刊头规制（`issue-head-cover`：左齐刊名 + 右齐日期 + y148/156 文武
 * 双线，全页零彩）。章节 `fascicle-ghost-chapter`，ending `afterword-ending`。
 * 四页 `defaultBackgrounds` 仍是期刊纸 `#EFEBE1`。角色色与字体一处不改。
 * 报头双线 motif 留下：封面版式自己画刊头双线，motif 封面不再画 y26/32。
 * 内容 / ending 继续页缘文武双线 + 期号，chapter 继续退让。
 *
 * **菜单分派（S1-B）**：铅字编辑腔：quote 是期刊的看家页（pull-quote），photo 用图文对开的 image-split，evidence 的实证格式属于论文不属于特稿，不上。
 *
 * **2026-10 年度长信定稿**（设计源 `design/rounds/2026-10-07-journal/`，规则见
 * `docs/design-journal.md`）：每一页是一本小刊物自己的一页。刊头一行小字压在
 * 一粗一细两条通栏线上（y50、y55）：左边栏目名（页脚的 `organization`，
 * 「致读者」，motif 画），中间赭红分栏名（页面的 `kicker`，「十年」，脸画），
 * 右边期号（页脚的 `label`，motif 画）。标题 32px 衬线粗体，底部对齐在 y158，
 * 一行放得下就一行，放不下在逗号或冒号处断；有照片从刊头一直落到页底的页，
 * 标题让到照片旁边。图注是赭红「图 N」加图题，下面一行衬线斜体的编辑短评；
 * 图按 deck 顺序编号，照片不编号。来源一两行小字在页底，页码「· 3 ·」居中。
 * 每页一处重点用赭红：作者标了哪根就红哪根，其余铅字黑或亚麻灰。封面
 * `periodical-cover`（刊头大字、期号、赭红封面故事、带页码的封面要目、右侧
 * 照片），结尾 `periodical-ending`（作者写的分栏名、作者断行的后记、右对齐
 * 的落款），quote 走 `periodical-quote`（作者写什么出处就印什么，不加破折号），
 * statement 照旧，其余内容页全走 `periodical-sheet`，正文交给 periodical 设定
 * 里的构图。章节页照旧用 fascicle-ghost-chapter。色值不动。标题字体从
 * SimSun 打头换成 Times New Roman 配宋体：定稿是宋体排的，数字是等高数字，
 * 拉丁部分用 Times New Roman 才对得上，中文仍由 SimSun 承担，导出不会豆腐块。
 */

export const JOURNAL_TOKENS: StyleTokens = {
  id: "journal",
  colors: {
    bg: "#EFEBE1", // 期刊纸。页底，正文墨压它 12.79:1，答 4.5
    surface: "#F8F5EC", // 内页白。卡面，正文墨压它 13.96:1，答 4.5
    primary: "#2C2C2A", // 铅字黑（11.75:1）——期刊的主色就是墨
    accent: "#8C4A3C", // 赭红（5.58:1），木刻藏书章色，给首字母与章号
    text: "#26261F", // 油墨（12.79:1），衬线承字
    muted: "#626159", // 铅灰（5.23:1）——照板上自标的 5:1 压深，见文件头
    border: "#D9D3C2", // 栏线。只作线，永不承字，不答文字门槛
    danger: "#9B2C1E", // 木刻红。kpi 箭头当字，压 surface 6.95:1，答 4.5
    warning: "#96731C", // 芥黄。只作线与图标，压 surface 4.04:1，不答文字门槛
    success: "#48664A", // 苔绿。kpi 箭头当字，压 surface 5.88:1，答 4.5
    // c0、c1、c2 可作徽章底，承白字并答 4.5。c3 只作标记，永不承字。
    // c3 压 bg 3.50:1，答 3.0 装饰线。板上 hex `#9A927E` 实测仅 2.60:1。
    chartPalette: ["#2C2C2A", "#8C4A3C", "#4E5E4A", "#827C6B"],
  },
  fonts: {
    // Times New Roman for the Latin and its lining figures, SimSun for the
    // Chinese (the export pairs the two, so no CJK tofu), Songti where the
    // preview has no SimSun: the board's Songti.
    heading: ["Times New Roman", "SimSun", "宋体", "Songti SC", "STSong", "serif"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
    mono: ["Consolas", "Courier New"],
  },
  shape: {
    radius: 6,
    gapScale: 1.1, // 期刊温和+杂志留白
    cover: { showKicker: true },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#EFEBE1" },
    chapter: { kind: "color", value: "#EFEBE1" },
    content: { kind: "color", value: "#EFEBE1" },
    ending: { kind: "color", value: "#EFEBE1" },
  },
};

export const JOURNAL_THEME = {
  version: 2,
  id: "journal",
  label: "Journal",
  story: {
    name: "Journal",
    story: "Warm paper, brick red, a serif masthead and issue numbers. It reads like a small magazine explaining itself to its readers.",
    positioning: "Choose it for editorial voices: a redesign note, a letter to subscribers, a long-form argument that takes its time.",
    audience: "An editor or writer speaking to a loyal readership.",
    notFor: "Fast pitches, dashboards, or corporate mobilization.",
    lineage: "The independent periodical and its masthead conventions.",
  },
  style: JOURNAL_TOKENS,
  menu: {
    cover: { face: "periodical-cover" },
    chapter: { face: "fascicle-ghost-chapter" },
    content: {
      points: { face: "periodical-sheet" },
      list: { face: "periodical-sheet" },
      comparison: { face: "periodical-sheet" },
      process: { face: "periodical-sheet" },
      data: { face: "periodical-sheet" },
      photo: { face: "periodical-sheet" },
      statement: { face: "statement" },
      quote: { face: "periodical-quote" },
      fact: { face: "periodical-sheet" },
      hierarchy: { face: "periodical-sheet" },
    },
    ending: { face: "periodical-ending" },
  },
  motif: { id: "corner-ornament-motif" },
} satisfies BuiltinThemeDeclaration;
