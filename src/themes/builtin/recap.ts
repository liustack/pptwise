import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * recap（述职账本）——一个人向评审交代自己这一年：年终述职、转正答辩、晋升
 * 述职。2026-10 立项并定稿（设计源 `design/rounds/2026-10-13-recap/`）。
 *
 * 评审听述职只问三件事：承诺的数到了没有，里面多少是你做的，明年要什么。
 * 所以整套像一本账：白纸，结论用黑体特粗，数字用一款窄的 DIN 数字字体，
 * 每一栏由一根 2px 墨线打开，行间是浅发丝线。门面色只给「我牵头的」和每页
 * 要看的那一个数，红色只给没做到的事，而且旁边一定有形状（叉、红条），
 * 门面色换成红色也分得清。谁做的用一套小图例说：实心方块是我，空心灰方块
 * 是团队，红叉是失误，对勾是完成，空心深色方块是待批。要评审当场定的事印成
 * 空的勾选框，不画按钮。内容页顶部一行章节小字（两位序号加段名，取自 deck
 * 的 `course` 和页面的 `stage`），页脚左边是 deck 的标签，右边是述职人、场合
 * （封面的 `kicker`）和页码。
 *
 * 和最近的几家拉开：profile 是杂志专访、宋体大名字和人像；bulletin 是克莱因
 * 蓝横幅；proposal 是活页夹和沙色卡片。recap 不放人像、不用卡片，衬线一处
 * 都没有，数字全部换成 DIN。
 *
 * 色板逐条（设计稿 `design/rounds/2026-10-13-recap/`）：
 *   - `bg` `#FFFFFF`：白纸。
 *   - `surface` `#F4F5F7`：浅灰底，只给普通渲染器兜底的块。墨压它 16.2:1。
 *   - `primary` `#15191E`：墨。不是门面色：recap 的门面是 `accent`，品牌
 *     换色时由量取得出（`brand-face.test.ts`）。
 *   - `accent` `#0B6E69`：深青，门面色。压白 6.09:1，白字压它 6.09:1。给
 *     「我牵头」的图例方块、每页要看的那个数、高亮行底色（混 10% 白）、结尾
 *     那一整块。深一档（各通道乘 0.75，`#08534F`）给章节序号和图例的字。
 *   - `text` `#15191E`：墨。压白 17.6:1。
 *   - `muted` `#5B6470`：灰。标签、单位、注释、页脚。压白 6.00:1。
 *   - `border` `#D9DDE2`：发丝线。只作线，永不承字。
 *   - `danger` `#B42318`：红。没做到的数、红叉、失误条。压白 6.57:1。
 *   - `chartPalette`：深青 / 石墨 / 灰条 / 浅线。c1 `#2E353D` 是「实际」的柱，
 *     c2 `#9AA3AE` 是团队和去年的柱，只作色块，永不承字。
 *
 * 门面色换成别的品牌色时，结尾那一整块上的字按对比自动选白或墨，两种都
 * 过不了线时把块的明度推到过线（`readableBlock`）。橙色这类压白不到 4.5 的
 * 门面色，写在白纸上的数字和图例字由取色函数按字号推深（`accountText`），
 * 图例方块按 3:1 守住（`accountMark`）。
 *
 * 字体：标题和正文都用微软雅黑（预览回退 PingFang SC），数字用 DIN：导出是
 * Windows 自带的 Bahnschrift，Mac 预览是 DIN Alternate。
 */
export const RECAP_TOKENS: StyleTokens = {
  id: "recap",
  colors: {
    bg: "#FFFFFF", // 白纸。正文墨压它 17.6:1，答 4.5
    surface: "#F4F5F7", // 浅灰底。墨压它 16.2:1，答 4.5
    primary: "#15191E", // 墨。不是门面色
    accent: "#0B6E69", // 深青门面色（6.09:1），白字压它 6.09:1
    text: "#15191E", // 墨（17.6:1）
    muted: "#5B6470", // 灰（6.00:1）
    border: "#D9DDE2", // 发丝线。只作线，永不承字，不答文字门槛
    danger: "#B42318", // 红。数字和叉当字，压白 6.57:1，答 4.5
    warning: "#9A5B00", // 琥珀。只作线与图标，压白 5.43:1
    success: "#0B6E69", // 完成用门面色的对勾
    // c0 深青、c1 石墨可作色块承白字并答 4.5。c2、c3 只作色块，永不承字。
    chartPalette: ["#0B6E69", "#2E353D", "#9AA3AE", "#D9DDE2"],
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
    // DIN：Windows 自带 Bahnschrift，Mac 上 PowerPoint 从云字体取它，预览用 DIN Alternate。
    figure: ["DIN Alternate", "Bahnschrift", "Arial"],
  },
  shape: { radius: 0, gapScale: 1.0 },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#FFFFFF" },
    chapter: { kind: "color", value: "#FFFFFF" },
    content: { kind: "color", value: "#FFFFFF" },
    ending: { kind: "color", value: "#FFFFFF" },
  },
};

export const RECAP_THEME = {
  version: 2,
  id: "recap",
  label: "Recap",
  story: {
    name: "Recap",
    story: "Your reviewers will ask three things: did the target hold, how much of it was you, and what you want next. Every page answers one of them, your own part set apart from the team's and the miss in plain sight.",
    positioning: "Choose it when you have to account for a year to the people who review it: a year-end review, a probation review, a promotion defence.",
    audience: "One person reporting a year of their work to a manager, a review panel or an HR partner.",
    notFor: "A company's annual report or a team's pitch, where one person's ledger on every page puts the wrong subject first.",
    lineage: "The sales ledger and the year-end review form: target against what came in, a column for whose work it was, boxes for the reviewer to tick.",
  },
  style: RECAP_TOKENS,
  motif: { id: "recap-motif" },
  menu: {
    cover: { face: "account-cover" },
    chapter: { face: "account-chapter" },
    content: {
      points: { face: "account-sheet" },
      list: { face: "account-sheet" },
      comparison: { face: "account-sheet" },
      process: { face: "account-sheet" },
      data: { face: "account-sheet" },
      photo: { face: "account-sheet" },
      statement: { face: "account-sheet" },
      fact: { face: "account-sheet" },
    },
    ending: { face: "account-ending" },
  },
} satisfies BuiltinThemeDeclaration;
