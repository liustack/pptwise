import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * proposal（提案书）——面向客户的 B2B 方案：客户提案、解决方案、投标。2026-10-06
 * 立项，第 25 套内置主题，设计源 `design/rounds/2026-10-06-proposal/`，规则见
 * `docs/design-proposal.md`。
 *
 * **和 brief 的区别**：brief 是先结论的咨询报告腔，藏青加一线黄、衬线、黄只当
 * 一把高亮尺；proposal 是递到客户管理层手里的说服腔，读者是老板、厂长、财务
 * 负责人。它更暖（石油蓝的章节页配满高照片），更敢用强调色（砖红每页亮一处：
 * 回收期这样的结果数、领头的那一行、请客户定的事的编号），每页先说「贵司得到
 * 什么」，再算账、给方案、讲落地、请客户定事。版式照印刷品做（2026-10 印刷版
 * 定稿）：内容页顶上一行书眉，左边是方案名，右边是这一页所在的段落（「算账」，
 * 只写段落名，不带序号），下面一条细线。表格、数字和条目之间只用细线和 2px
 * 墨线分隔，不铺卡片、不用胶囊签和索引签。用户写的通用组件（kpi、编号卡、
 * 表格之类）走共享渲染器，主题声明 `shape.surfaces: "ruled"`，渲染器就照
 * 印刷品画：不铺卡底、不画圆角，细线和留白撑结构，编号是数字本身，强调靠
 * 字重、墨色和一条砖红细线（`components/surfaces.ts`）。封面是一张白色提案页加一张满高照片，
 * 结尾是一行一件要客户定的事，右边留空方框勾选，最后一行留空让客户填日子。
 *
 * **色板来历**（设计稿 `proposal-pvess-design-gen.py` 的常量，强调色、灰和红
 * 三处按下文改过）：
 *   - `bg` `#FFFFFF` 白纸。
 *   - `surface` `#F3F0EA` 暖沙，照设计稿（SURF）。不设 `cardStroke`，
 *     `shape.radius` 取 0。印刷版不铺卡，这件事由 `shape.surfaces: "ruled"`
 *     交给共享渲染器去做，卡面不必再装成纸白、也不必再靠一圈线色细框假装
 *     没有卡，所以两者都退回设计稿：暖沙只在缺照片时垫底，热力图最浅一格从
 *     它起色。圆角 0 不退，印刷品本来就是直角。
 *   - `primary` `#0E3B53` 石油蓝（PET）：标题、大数、书眉的段落名、章节页左半。
 *   - `accent` `#B8412C` 砖红：每页只亮一处，结果数、领头的一行、决定的编号。设计稿
 *     是橘 `#F26B3A`（TANG），2026-10-06 维护者拍板改成砖红，原因是石油蓝配橘
 *     犯了「不要蓝配橙」的禁忌（`chart-palette-taboo.test.ts`）。砖红 HSL 色相
 *     9°，在禁忌「橙」的 15° 下限之外。
 *   - `emphasisInk` `#B8412C`：和 `accent` 是同一个砖红。设计稿另有一档深橘
 *     （TANGD `#C2491B`）给小字用，因为橘本身压白纸只有 3.03。砖红压白纸 5.48，
 *     自己就能承小字，`**…**` 标记的字也走它，不再另设一档。
 *   - `text` `#14212B` 墨（INK），`border` `#E2DDD4` 线（LINE）。
 *   - `muted` 暗灰 `#55606A`：设计稿是 `#5D6A74`（MUTED），按原色相整体压暗
 *     9%。`full-matrix-contrast.test.ts` 给每个主题量 muted 压在卡面混强调色的
 *     格底上（`mixHex(surface, accent, 0.16)`，暖沙配砖红是 `#EAD4CC`），要
 *     4.5。设计稿的灰在那里只有 3.91，压暗 9% 才到 4.53。印刷版的 matrix
 *     自己不再铺这层格底，但这把尺子量的是主题本身，不分画法，所以不退。
 *   - `danger` `#812920` 深红：事故的图标。设计稿的红 `#B83A2E`（RED）和砖红
 *     几乎是同一个颜色（CIE76 ΔE 3.9），事故图标会被读成本页亮的那一处。按原
 *     色相压深到设计稿的 70%，和砖红拉开 ΔE 20.6（原来红和橘差 23.9）。
 *     `success` 设计稿是 `#2E7D5B`（GREEN），压暖沙卡面只有 4.40:1，不够 kpi
 *     箭头当字的 4.5，压深一档到 `#2A7554`（4.90），色相不动。卡面退回暖沙，
 *     这一档仍是必需。`warning` 取砖红，只作线与图标。
 *   - `chartPalette` 石油蓝 `#2F6A8A`（PET2）/ 砖红 `#B8412C` / 天青 `#8DBBD3`
 *     （SKY）/ 沙 `#B0956A`。石油蓝和天青照设计稿，沙色设计稿没给，取设计稿卡面
 *     SURF 那一族的暖沙压深到能当色块。砖红和另外三格的 ΔE 是 82.8、83.9、48.3。构图里
 *     浅天青 SKYL、旧值灰 FADE 这两格不进 token，由
 *     `binderInks` 从这几格按设计稿的比例混出来（`layouts/compositions/binder.tsx`）。
 *
 * **对比度实测**（`render/ink.ts` 的 `contrastRatio`）：
 *   - 压白纸：primary 11.87、text 16.38、muted 6.43、accent / emphasisInk
 *     5.48、danger 9.25、success 5.57、chart 石油蓝 5.92 / 砖红 5.48 / 天青
 *     2.06 / 沙 2.86。
 *   - 压暖沙卡面：primary 10.44、text 14.40、muted 5.65、success 4.90。
 *     卡面混砖红的格底 `#EAD4CC`：primary 8.36、text 11.53、muted 4.53、
 *     danger 6.51。
 *   - 章节页的大号章号压石油蓝：砖红只有 2.17，不够大字的 3:1，`binderText`
 *     往白挪最小一步到 `#C66756`（3.10:1）。
 *   - 天青压白纸 2.06、沙 2.86，低于 3.0 装饰线：这两格只当色块（参照组的
 *     条、谷段和平段的色带），旁边都有字，不单靠颜色认。
 *
 * **字**：微软雅黑优先（PowerPoint 打开时的落脚字体），PingFang 其次。设计稿
 * 的 600、800、900 在引擎里一律是粗体，雅黑只有常规和粗体两档。
 */
export const PROPOSAL_TOKENS: StyleTokens = {
  id: "proposal",
  colors: {
    bg: "#FFFFFF", // 白纸。页底，正文墨压它 16.38:1，答 4.5
    surface: "#F3F0EA", // 暖沙（SURF），只在缺照片处垫底，组件不铺卡，见上
    primary: "#0E3B53", // 石油蓝（11.87:1），色块承白字 11.87:1
    accent: "#B8412C", // 砖红（5.48:1），色块上的字用白（5.48:1）
    text: "#14212B", // 墨（16.38:1）
    muted: "#55606A", // 暗灰（6.43:1）。设计稿 #5D6A74 压暗 9%，见上
    border: "#E2DDD4", // 线。只作线，永不承字，不答文字门槛
    emphasisInk: "#B8412C", // 砖红（5.48:1）。小字的砖红、标记的字
    danger: "#812920", // 深红（9.25:1）。设计稿 #B83A2E 压深到 70%，见上
    warning: "#B8412C", // 砖红。只作线与图标，5.48:1
    success: "#2A7554", // 绿（5.57:1）。设计稿 #2E7D5B 压深一档，见上
    // 石油蓝 / 砖红 / 天青 / 沙。c0、c1 可作徽章底承白字 5.92:1、5.48:1。
    // c2、c3 只作色块，压白纸 2.06:1、2.86:1，永不承字。
    chartPalette: ["#2F6A8A", "#B8412C", "#8DBBD3", "#B0956A"],
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: {
    radius: 0, // 印刷品不圆角
    gapScale: 1.0,
    surfaces: "ruled", // 共享组件照印刷品画：无卡底、细线分隔，见上
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#FFFFFF" },
    chapter: { kind: "color", value: "#0E3B53" },
    content: { kind: "color", value: "#FFFFFF" },
    ending: { kind: "color", value: "#FFFFFF" },
  },
};

export const PROPOSAL_THEME = {
  version: 2,
  id: "proposal",
  label: "Proposal",
  story: {
    name: "Proposal",
    story: "Your client turns the pages of a binder and finds, on every one, what they get, what it costs them and what they are asked to decide.",
    positioning: "Choose it when a client's management has to say yes to a proposal, a solution or a bid, and needs to see the money, the plan and the risks before they sign.",
    audience: "A supplier putting a proposal in front of a client's owner, plant manager and finance lead.",
    notFor: "An internal report or a research paper, where a page that asks the reader to decide reads as a sales piece.",
    lineage: "The printed client proposal: a running head naming each section, a priced quote sheet, a checklist of what the client hands over.",
  },
  style: PROPOSAL_TOKENS,
  menu: {
    cover: { face: "binder-cover" },
    chapter: { face: "binder-chapter" },
    content: {
      points: { face: "binder-sheet" },
      list: { face: "binder-sheet" },
      comparison: { face: "binder-sheet" },
      process: { face: "binder-sheet" },
      data: { face: "binder-sheet" },
      photo: { face: "binder-sheet" },
      fact: { face: "binder-sheet" },
      evidence: { face: "binder-sheet" },
      hierarchy: { face: "binder-sheet" },
    },
    ending: { face: "binder-ending" },
  },
  motif: { id: "proposal-motif" },
} satisfies BuiltinThemeDeclaration;
