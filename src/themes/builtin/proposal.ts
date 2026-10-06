import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * proposal（提案书）——面向客户的 B2B 方案：客户提案、解决方案、投标。2026-10-06
 * 立项，第 25 套内置主题，设计源 `design/rounds/2026-10-06-proposal/`，规则见
 * `docs/design-proposal.md`。
 *
 * **和 brief 的区别**：brief 是先结论的咨询报告腔，藏青加一线黄、衬线、黄只当
 * 一把高亮尺；proposal 是递到客户管理层手里的说服腔，读者是老板、厂长、财务
 * 负责人。它更暖（白纸上压一层暖沙色的卡），更敢用强调色（橘色每页亮一处，
 * 而且可以是一整块结果、一枚勾选按钮），每页先说「贵司得到什么」，再算账、
 * 给方案、讲落地、请客户定事。版式也不一样：右缘一列活页夹索引签标出全稿的
 * 几个段落，当前段落那一签伸出来；封面是一张白色提案页加一张满高照片；结尾
 * 是请客户勾选的决定卡加一枚按钮。
 *
 * **色板来历**（设计稿 `proposal-pvess-design-gen.py` 的常量，逐格照抄）：
 *   - `bg` `#FFFFFF` 白纸。
 *   - `surface` `#F3F0EA` 暖沙卡面（设计稿 SURF），不描边。
 *   - `primary` `#0E3B53` 石油蓝（PET）：标题、大数、深色块、亮着的索引签。
 *   - `accent` `#F26B3A` 橘（TANG）：每页只亮一处，结果块、勾选按钮、关键数。
 *     橘色上的字一律用深墨 `text`，不用白。
 *   - `emphasisInk` `#C2491B` 深橘（TANGD）：小字要用橘色时用它，`**…**` 标记
 *     的字也走它，橘色本身压白纸不够承小字。
 *   - `text` `#14212B` 墨（INK），`border` `#E2DDD4` 线（LINE）。
 *   - `muted` 暗灰：设计稿是 `#5D6A74`（MUTED），压白纸 5.56、压卡面 4.89，但
 *     共享构图 matrix 会把卡面和橘混成格底（`mixHex(surface, accent, 0.16)`），
 *     压上去只剩 4.19，过不了 `full-matrix-contrast.test.ts` 给每个主题 muted
 *     定的 4.5。按原色相整体压暗 5% 到 `#58656E`，最差的那格 4.52。
 *   - `danger` `#B83A2E` 红（RED），事故的图标。`success` 设计稿是 `#2E7D5B`
 *     （GREEN），压卡面只有 4.40:1，差 0.1 不够 kpi 箭头当字的 4.5，压深一档
 *     到 `#2A7554`（4.90:1），色相不动。`warning` 取深橘 `#C2491B`，只作线与
 *     图标。
 *   - `chartPalette` 石油蓝 `#2F6A8A`（PET2）/ 橘 `#F26B3A` / 天青 `#8DBBD3`
 *     （SKY）/ 沙 `#B0956A`。前三格照设计稿；沙色设计稿没给，取卡面那一族的
 *     暖沙压深到能当色块。构图里浅蓝 PETL、浅天青 SKYL、浅橘 TANGL、旧值灰
 *     FADE 这几格不进 token，由 `binderInks` 从这几格按设计稿的比例混出来
 *     （`layouts/compositions/binder.tsx`）。
 *
 * **对比度实测**（`render/ink.ts` 的 `contrastRatio`）：
 *   - 压白纸：primary 11.87、text 16.38、muted 6.00、emphasisInk 4.93、
 *     accent 3.03、danger 5.70、chart 石油蓝 5.92 / 橘 3.03 / 天青 2.06 /
 *     沙 2.86。
 *   - 压卡面：primary 10.44、text 14.40、muted 5.27、emphasisInk 4.33、
 *     danger 5.01、success 4.90、accent 2.66。
 *   - 橘色压白纸 3.03，只能做大字和色块，压卡面 2.66 连大字都不够：卡面上的
 *     橘色大数由 `binderText` 往深墨方向挪最小一步到 3.0。小字一律用深橘
 *     （压白纸 4.93）。深墨压橘 5.41，白压橘只有 3.03，所以橘色上的字是深墨。
 *   - 天青压白纸 2.06、沙 2.86，低于 3.0 装饰线：这两格只当色块（参照组的
 *     条、谷段和平段的色带），旁边都有字，不单靠颜色认。
 *
 * **蓝配橙**：`chart-palette-taboo.test.ts` 记着维护者「不要蓝配橙」的旧裁定。
 * 本主题的石油蓝配橘是 2026-10-06 维护者批准的设计稿本身，任务书也点名图表色
 * 「石油蓝、橘、天青、沙色」，所以在那里按名记为裁定例外，理由写在那里。
 *
 * **字**：微软雅黑优先（PowerPoint 打开时的落脚字体），PingFang 其次。设计稿
 * 的 600、800、900 在引擎里一律是粗体，雅黑只有常规和粗体两档。
 */
export const PROPOSAL_TOKENS: StyleTokens = {
  id: "proposal",
  colors: {
    bg: "#FFFFFF", // 白纸。页底，正文墨压它 16.38:1，答 4.5
    surface: "#F3F0EA", // 暖沙卡面。正文墨压它 14.40:1，答 4.5
    primary: "#0E3B53", // 石油蓝（11.87:1），色块承白字 11.87:1
    accent: "#F26B3A", // 橘（3.03:1），只承大字与色块，色块上的字用深墨（5.41:1）
    text: "#14212B", // 墨（16.38:1）
    muted: "#58656E", // 暗灰（6.00:1，压卡面 5.27:1）。设计稿 #5D6A74 压暗 5%，见上
    border: "#E2DDD4", // 线。只作线，永不承字，不答文字门槛
    emphasisInk: "#C2491B", // 深橘（4.93:1）。小字的橘、标记的字
    danger: "#B83A2E", // 红。压卡面 5.01:1，答 4.5
    warning: "#C2491B", // 深橘。只作线与图标，压卡面 4.33:1
    success: "#2A7554", // 绿。设计稿 #2E7D5B 压卡面 4.40:1，压深一档到 4.90:1
    // 石油蓝 / 橘 / 天青 / 沙。c0 可作徽章底承白字 5.92:1。c1 只承大字与色块。
    // c2、c3 只作色块，压白纸 2.06:1、2.86:1，永不承字。
    chartPalette: ["#2F6A8A", "#F26B3A", "#8DBBD3", "#B0956A"],
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: {
    radius: 12,
    gapScale: 1.0,
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
    lineage: "The client proposal in a ring binder: tabbed sections, a priced quote sheet, a checklist of what the client hands over.",
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
