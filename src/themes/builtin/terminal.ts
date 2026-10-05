import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * **深底组皮肤重设计（2026-08-19，`.issues/2026-08-18-theme-redesign/skins/`
 * 的 `group1-dark-boards.dc.html` 色板角色表 + 封面样例）**：深底三家共用
 * 一张脸是本轮的反面基线，terminal 的处方是往深空工程走——蓝黑底配青瓷青光。
 * 第八波把右缘星座链退役，装饰改成顶缘细规线（border）+ 内容页青点睛。
 * 色板本身不动。逐条来历：
 *   - `bg` `#060A13` → `#0A0F1E`：近黑 → 蓝黑深空。与 ledger 的暖黑拉开
 *     色温，三家并排时第一眼就能分开。
 *   - `surface` `#0A101C` → `#121A30`：舱内面板蓝，抬升一档（bento 卡底）。
 *   - `primary` `#2DD4E6` → `#14294A`：此前 primary 与 accent 是同一个电光
 *     青（单 accent 重设计的遗留），横幅因此整块发光、`readableOn` 只能靠
 *     深色字勉强站住。primary 退成深蓝，横幅重新承得起反白。
 *   - `accent` `#2DD4E6` → `#53E0D2`：电光青 → 青瓷青光。保住 terminal 的色相
 *     记忆，但离开刺眼的纯 cyan。
 *   - `text` `#F2F6FA` → `#EAF1FA`、`muted` `#8A94A6` → `#93A5C0`：冷白与
 *     舱灰，跟着蓝黑底一起偏蓝。
 *   - `border` `#2C3140` → `#24304A`：界格即星轨——motif 的节点连线取的就是
 *     这个角色，界格与装饰同色是这套语言的一部分。
 *   - `chartPalette` 从 5 色（青/绿/橙/紫/灰）收成 4 色：青 / 蓝 / 紫 /
 *     薄荷绿。灰色 `#4A5568` 在深底上本就接近隐形，删。
 *     motif 的节点也从这条色序取蓝/紫两位，图表与装饰同源。
 *     **第四格在第四轮评审里换掉了：警示琥珀 `#FFC14D` → 薄荷绿
 *     `#4BD98A`**（压 bg 10.54:1、压渐变起点 9.86:1）。原因是用户把蓝配橙
 *     定为禁忌（原话在 bulletin p09/p10），而琥珀在这张全冷的表里正是
 *     唯一一枚暖色，四系列图上它就贴着蓝与紫。换成薄荷绿之后整条色序真的
 *     全冷了——设计板本来写的就是「4 色冷序列」，只是当时给第四格挂了个
 *     告警位的名分。实测这一格还是四色里两两 ΔE 最大的选择（最近的一格
 *     ΔE 35.8，色盲模拟最近 ΔE 34.3，都优于霓虹粉/兰紫的候选）。
 *     `warning` 仍是 `#FFC14D`（值未动），但它从此只作警示图标与线，
 *     不再兼任图表第四色。
 *   - `defaultBackgrounds` 四页型统一成设计稿的对角渐变（`#0E1630` →
 *     `#070B16`，封面样例的 `techbg`）。此前 content 与其余三型用的是两组
 *     不同的渐变，设计稿只给一组，不再自造差异。
 *
 * 对比度实测（本仓库 `svg/ink.ts` 的 `contrastRatio`，压渐变起点 `#0E1630`
 * 这个更严的一端——`registerTheme` 的 3:1 硬闸按 `resolveBackgroundHex` 取
 * 渐变 `from`）：text 15.70:1、muted 7.13:1、accent 11.02:1。
 * 压 `bg` `#0A0F1E` 则为 text 16.78:1、muted 7.62:1、accent 11.78:1。
 * 设计板自查写的 muted 6.5:1 低于实测 7.62:1，以实测为准。
 *
 * 装饰见 `src/motifs/motif-constellation-motif.tsx`（第八波：星座链与
 * 碎点退役，改为顶缘细规线，border，永不亮色。内容页青点睛必须骑在线上。
 * chapter 退让，空心序号与底规青段归 `stroke-index-chapter`）。
 *
 * **菜单分派（S1-B）**：工程件的图是要标注的架构图，photo 因此选 image-annotate，evidence 承担跑分与实测这类断言配展品的页，quote 不上。2026-10 起各页改走 console 一套脸，见下。
 *
 * **2026-10 定稿重画（`design/rounds/2026-10-05-terminal/`，云中断复盘
 * 样例）**：整套改成一块事故控制台。
 *   - 每页左上一行等宽面包屑（青点、章节号与章节名、页码），封面写机构
 *     与日期，章节页写 DIR，结尾写 EOF。面包屑归版式，不归 motif。
 *   - 内容页统一走 `console-sheet`：标题 31/42 粗体整行宽，两行内底对齐，
 *     其下一根 border 细线、左端 32×3 青段；正文交给 console 设定的构图
 *     （方角面板、HUD 角括号、数字时间与标签一律等宽、标记的那一处落在
 *     青色暗底上），来源 12px 等宽「src:」。photo 也走 `console-sheet`：
 *     图组配大数字（plates）、浏览器样机配日志行（screen）都是构图。
 *   - 封面 `console-cover`、章节 `console-chapter` 自己画满版照片和左侧
 *     渐暗（`drawsPhoto`），不再交给公共的压图页；结尾 `console-ending`
 *     是待办清单。
 *   - 红、琥珀、绿只说一条信息是什么性质（故障、处置中、恢复），不说哪条
 *     最重要，那是青色的事，一页一处。
 *   - `shape.radius` 10 → 0（面板方角），四页型背景从对角渐变改成平铺
 *     `#0A0F1E`，与定稿一致。statement 与 fact 本轮没有定稿，仍走原脸，
 *     原 motif（顶缘细规线）只在这两种页上出现。
 */
export const TECH_TOKENS: StyleTokens = {
  id: "terminal",
  colors: {
    bg: "#0A0F1E", // 蓝黑深空。页底，正文墨压它 16.78:1，答 4.5
    // No `panel` override (Task 1, electric-cyan single-accent redesign):
    // the old lighter-than-surface "card-on-card" tier read as a muddy
    // blue-grey that fought the new near-black system, so bento now falls
    // back to `colors.surface` for its card fill like most of the other
    // theme token files already do (only `custom` sets a distinct `panel`).
    surface: "#121A30", // 舱内面板蓝。卡面，正文墨压它 15.18:1，答 4.5
    primary: "#14294A", // 横幅深蓝（承 readableOn 反白）
    accent: "#53E0D2", // 青瓷青光。承大标题，压 bg 11.78:1，答 3.0，不承白字
    text: "#EAF1FA", // 冷白
    muted: "#93A5C0", // 舱灰注脚（压 bg 7.62:1，压渐变起点 7.13:1）
    border: "#24304A", // 界格规线。只作线，永不承字，不答文字门槛
    danger: "#FF6B7D", // 警示玫红。kpi 箭头当字，压 surface 6.29:1，答 4.5
    warning: "#FFC14D", // 警示琥珀（压 surface 10.68:1）——第四轮起不再兼任 chartPalette 第四色
    success: "#4BD98A", // 薄荷绿。kpi 箭头当字，压 surface 9.53:1，答 4.5
    // 四格只作图系列与色块。可作徽章底，字走 readableOn 取深墨并答 4.5。
    // 深底上的系列色永不直接承白色小字。
    chartPalette: ["#53E0D2", "#5B8CFF", "#9A7CFF", "#4BD98A"], // 青/蓝/紫/薄荷绿，整条冷序列
  },
  fonts: {
    // Microsoft YaHei 前置：导出的 pptx 单字体无法回退，纯拉丁 sans 无 CJK
    // 字形会渲染成豆腐块。雅黑承担 terminal 的科技感无衬线气质。
    heading: ["Microsoft YaHei", "Helvetica Neue", "Helvetica", "Inter", "Arial", "system-ui"],
    body: [
      "Microsoft YaHei",
      "Helvetica Neue",
      "Helvetica",
      "Inter",
      "Arial",
      "system-ui",
    ],
    mono: ["Consolas", "Courier New"],
  },
  shape: {
    radius: 0,
    gapScale: 1, // 控制台面板方角（2026-10 定稿）
    cover: { titleBottomAnchor: false, ruleStyle: "star-chain" },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#0A0F1E" },
    chapter: { kind: "color", value: "#0A0F1E" },
    content: { kind: "color", value: "#0A0F1E" },
    ending: { kind: "color", value: "#0A0F1E" },
  },
};

export const TECH_THEME = {
  version: 2,
  id: "terminal",
  label: "Terminal",
  story: {
    name: "Terminal",
    story: "Blue-black depth with a celadon glow, a hairline rule at the top, one highlight point per page. It speaks the way a maintainer explains an architecture: precise, unhurried, allergic to hype.",
    positioning: "Choose it for engineering talks, architecture reviews, and open-source stories where tradeoffs matter more than slogans.",
    audience: "Engineers explaining a system to engineers.",
    notFor: "Consumer launches, warm human stories, or pages that need color to carry emotion.",
    lineage: "The conference terminal talk and the design doc, set in the dark.",
  },
  style: TECH_TOKENS,
  menu: {
    cover: { face: "console-cover" },
    chapter: { face: "console-chapter" },
    content: {
      points: { face: "console-sheet" },
      list: { face: "console-sheet" },
      comparison: { face: "console-sheet" },
      process: { face: "console-sheet" },
      data: { face: "console-sheet" },
      photo: { face: "console-sheet" },
      statement: { face: "statement" },
      fact: { face: "stat-hero" },
      evidence: { face: "console-sheet" },
      hierarchy: { face: "console-sheet" },
    },
    ending: { face: "console-ending" },
  },
  motif: { id: "constellation-motif" },
} satisfies BuiltinThemeDeclaration;
