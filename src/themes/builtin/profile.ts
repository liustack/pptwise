import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * profile（人物专访）——一个人在几分钟里向评委介绍自己：竞聘、自我介绍、
 * 职业规划。2026-10 立项并定稿（设计源 `design/rounds/2026-10-12-profile/`）。
 *
 * 整套像杂志人物专访：白纸、大留白、宋体标题和大数字、黑体正文，人像在
 * 封面占半屏，在「为什么是我」占一侧，在结尾缩成名片上的圆头像，全稿始终
 * 是一个人在说话。短板和成绩摆在一起。内容页顶部是一行章节小字（一根短色
 * 线加「一\u3000我是谁」，取自 deck 的 `course` 和页面的 `stage`），页脚左边是
 * deck 的标签，右边是讲者的名字（`meta.authors[0].name`）和页码。
 *
 * 和最近的几家拉开：proposal 是活页夹索引签、沙色卡片、全黑体；bulletin 是
 * 克莱因蓝横幅和广播腔；clinic 是薄荷底和诊疗卡。profile 不用卡片，细线
 * 分栏，左右边距 80px，标题和数字换成宋体，每页最多一处门面色整块填色。
 *
 * 色板逐条（设计稿 `design/rounds/2026-10-12-profile/`）：
 *   - `bg` `#FFFFFF`：白纸。
 *   - `surface` `#F5F2EE`：暖白底带，只给短板页的检验条。墨压它 15.9:1。
 *   - `primary` `#1D1B1A`：墨。不是门面色：profile 的门面是 `accent`，品牌
 *     换色时由量取得出（`brand-face.test.ts`）。
 *   - `accent` `#6E2C57`：茄紫，门面色。设计稿是 `#6B2D55`，彩度略提一点，
 *     让正文里 `**` 标出的字和墨色字一眼分得开（`definitions.test.ts` 的
 *     彩度门槛），肉眼看不出差别。压白 9.72:1，白字压它 9.72:1。给章节
 *     小字和短色线、当前那一段、结果大数、强调行、雷达图「我现在」那一圈和
 *     「交」那一整块。
 *   - `text` `#1D1B1A`：墨。压白 17.0:1。
 *   - `muted` `#6B655E`：灰。注释、标签、日期、页脚。压白 5.86:1，压暖白底
 *     5.21:1。
 *   - `border` `#DCD6CE`：细线。只作线，永不承字。
 *   - `chartPalette`：茄紫 / 墨 / 暖灰 / 浅线。一色配墨与灰，品牌换色只换
 *     第一格。c2 `#B9B0A6` 是条形图里不强调的那几根，压白 2.07:1，只作色块。
 *
 * 门面色换成别的品牌色时，整块填色（「交」那一块）上的字按对比自动选白或
 * 墨，两种都过不了 4.5:1 时把块的明度往更好的一侧推到过线
 * （`readableBlock`，`render/ink.ts`）。小字里的门面色由各处的取色函数按字号
 * 守住对比，不另设 token。
 *
 * 字体：标题、人名和大数字用 Times New Roman 配宋体（与 thesis、runway 同
 * 一对，英文标题和弯引号由 Times New Roman 来画），正文微软雅黑。
 */
export const PROFILE_TOKENS: StyleTokens = {
  id: "profile",
  colors: {
    bg: "#FFFFFF", // 白纸。正文墨压它 17.0:1，答 4.5
    surface: "#F5F2EE", // 暖白底带（检验条）。正文墨压它 15.9:1，答 4.5
    primary: "#1D1B1A", // 墨。不是门面色
    accent: "#6E2C57", // 茄紫门面色（9.72:1），白字压它 9.72:1
    text: "#1D1B1A", // 墨（17.0:1）
    muted: "#6B655E", // 灰（5.86:1，压暖白底 5.21:1）
    border: "#DCD6CE", // 细线。只作线，永不承字，不答文字门槛
    danger: "#9E2F2A", // 深红。kpi 箭头当字，压暖白底 6.4:1，答 4.5
    warning: "#8A6420", // 烟草金。只作线与图标，压暖白底 4.6:1
    success: "#2E6B47", // 深绿。kpi 箭头当字，压暖白底 5.8:1，答 4.5
    // c0 茄紫、c1 墨可作色块承白字并答 4.5。c2、c3 只作色块，永不承字。
    chartPalette: ["#6E2C57", "#1D1B1A", "#B9B0A6", "#DCD6CE"],
  },
  fonts: {
    // 专访衬线：Times New Roman 管拉丁文与数字，SimSun/宋体 管中文（导出把
    // 两者配成一对）。Songti SC/STSong 是 macOS 预览回退。
    heading: ["Times New Roman", "SimSun", "宋体", "Songti SC", "STSong", "serif"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
  },
  shape: { radius: 0, gapScale: 1.0 },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#FFFFFF" },
    chapter: { kind: "color", value: "#FFFFFF" },
    content: { kind: "color", value: "#FFFFFF" },
    ending: { kind: "color", value: "#FFFFFF" },
  },
};

export const PROFILE_THEME = {
  version: 2,
  id: "profile",
  label: "Profile",
  story: {
    name: "Profile",
    story: "The panel has seen ten candidates today. Yours is the one they can still describe on the way out: who you are, the one result each job left behind, and what you will do first.",
    positioning: "Choose it when you have a few minutes to make a panel remember you: a candidacy, a promotion review, a self-introduction, a career plan.",
    audience: "A candidate in front of a hiring panel, a promotion board or a review committee.",
    notFor: "A team's report or a company's proposal, where one person's portrait on every page reads as a résumé that lost its way.",
    lineage: "The magazine profile: a portrait, a name set large, a career told in a few dated turns and one line in the subject's own words.",
  },
  style: PROFILE_TOKENS,
  motif: { id: "profile-motif" },
  menu: {
    cover: { face: "portrait-cover" },
    chapter: { face: "portrait-chapter" },
    content: {
      points: { face: "portrait-sheet" },
      list: { face: "portrait-sheet" },
      comparison: { face: "portrait-sheet" },
      process: { face: "portrait-sheet" },
      data: { face: "portrait-sheet" },
      photo: { face: "portrait-sheet" },
      statement: { face: "portrait-sheet" },
      fact: { face: "portrait-sheet" },
    },
    ending: { face: "portrait-ending" },
  },
} satisfies BuiltinThemeDeclaration;
