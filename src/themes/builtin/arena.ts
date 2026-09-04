import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * arena（竞技场紫黑）——2026-08-21 新增第 18 个内置主题（娱乐电竞）。
 * 性格：开赛前一秒的场馆，紫黑灯灭，电光绿是唯一亮着的 HUD。
 * 目标场景：电竞赛事发布与战报、战队/俱乐部汇报、游戏版本发布与直播活动。
 * 拉伸覆盖音乐演出（场景审计 #28）：accent 电光绿可换成电光紫 `#B48CFF`
 * 或舞台金 `#FFD84D`，能量条改舞台电平条即从「赛场」变「演出」。chart 红蓝
 * 对抗位在演出场景退化为双主色。色板角色化，气质不焊死在 hex 上。
 *
 * 深底第四色温：insight 暖黑 `#0F1216` / tech 蓝黑 `#0A0F1E` / luxe 真黑
 * `#0B0908` 之后，arena 紫黑 `#120B22`。比 campaign `#2A1E3F` 深两档，是
 * 灯灭不是幕布。撞脸自查：arena vs campaign（紫黑灯灭 vs 深紫幕布、斜切
 * 面板 vs 纸屑场），arena vs tech（能量条 vs 星座链、绿 vs 青）。
 *
 * 逐条来历（设计源 `design-project/skin-boards` 的 arena 板）：
 *   - `bg` `#120B22`：紫黑灯灭。账面上与深底三家互差 ≥1 位色相通道。
 *   - `surface` `#1B1233`：选手席面板，一档抬升。深底主题不出白卡。
 *   - `primary` `#241847`：色块深紫，让电光绿唱主角。横幅/色块吃这个角色。
 *     封面斜切面板走 `surface`，灯带走 `accent`，都是版式结构件，不属 motif。
 *   - `accent` `#52F2A8`：电光绿。全部主题中唯一绿系 accent，可直接承大标题。
 *   - `text` `#F2F3F7`：灯光白。
 *   - `muted` `#A79FC4`：观众席紫灰。
 *   - `border` `#3A2D63`：HUD 界线。motif 右下三段能量条取的就是这个角色。
 *   - `chartPalette` 四色：电光绿 / 品红 / 冰蓝 / 电金。红蓝对抗＋金牌位，
 *     胜负语义入图。
 *
 * 对比度实测（本仓库 `svg/ink.ts` 的 `contrastRatio`，压 `bg` `#120B22`。
 * 四页型都是纯色底，`resolveBackgroundHex` 读到的就是这个值）：
 * accent 13.34:1、text 17.27:1、muted 7.66:1（压 surface 7.11:1）、chart
 * 电光绿 13.34 / 品红 6.20 / 冰蓝 9.63 / 电金 13.84。设计板自查写的
 * 12 / 16 / 6.2 / 12·5.5·9·11 与实测同向、略低于实测，以实测为准，
 * 七个 token 与四格 chart 一字未改。
 *
 * `primary` 压 bg 只有 1.18:1 是设计意图，不是缺陷：它是色块底，不是画在
 * bg 上的字。画在 primary 上的字由 `readableOn`/`accessibleInk` 自适应取墨。
 *
 * 装饰见 `../../motifs/motif-arena-motif.tsx`（第八波批 3：四角括弧退役，
 * 速度线本波不画，只留右下三段能量条。斜切面板与灯带归封面版式）。
 *
 * **菜单分派（S1-B）**：赛事腔要战绩和名场面，fact 的整页大数字与 image-top 的满幅画面是主力，选手语录不进正式页，quote 不上。
 */
export const ARENA_TOKENS: StyleTokens = {
  id: "arena",
  colors: {
    bg: "#120B22", // 紫黑灯灭。页底，正文墨压它 17.27:1，答 4.5
    surface: "#1B1233", // 选手席面板。卡面，正文墨压它 16.04:1，答 4.5
    primary: "#241847", // 色块深紫（让 accent 唱主角）
    accent: "#52F2A8", // 电光绿（13.34:1）——可直接承大标题
    text: "#F2F3F7", // 灯光白（17.27:1）
    muted: "#A79FC4", // 观众席紫灰（7.66:1）
    border: "#3A2D63", // HUD 界线。只作线，永不承字，不答文字门槛
    danger: "#FF4D9D", // 品红。kpi 箭头当字，压 surface 5.76:1，答 4.5
    warning: "#FFD84D", // 电金。只作线与图标，压 surface 12.86:1，不答文字门槛
    success: "#52F2A8", // 电光绿。kpi 箭头当字，压 surface 12.38:1，答 4.5
    // 四格只作图系列。可作徽章底，字走 readableOn 并答 4.5。
    // 电金不作正文小字，图系列色不直接充当文字墨。
    chartPalette: ["#52F2A8", "#FF4D9D", "#4DC3FF", "#FFD84D"], // 电光绿/品红/冰蓝/电金
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: {
    radius: 10,
    gapScale: 0.9, // HUD 卡片圆角 + tight 留白（比 campaign 的 1.0 再收一档）
    cover: { textAnchor: "middle", wedgePeakY: 340, wedgeStartX: 980 },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#120B22" },
    chapter: { kind: "color", value: "#120B22" },
    content: { kind: "color", value: "#120B22" },
    ending: { kind: "color", value: "#120B22" },
  },
};

export const ARENA_THEME = {
  version: 2,
  id: "arena",
  label: "Esports & Entertainment",
  story: {
    name: "Arena",
    story: "Purple-black one second before kickoff, and electric green as the only HUD that is on. Fast, loud, exact about the numbers.",
    positioning: "Choose it for esports, fan events, season reviews, and live entertainment where energy is the message.",
    audience: "A club or organizer speaking to fans and players.",
    notFor: "Institutional, academic, or quiet narrative work.",
    lineage: "The esports broadcast overlay and the arena screen.",
  },
  style: ARENA_TOKENS,
  menu: {
    cover: { face: "cut-panel-cover" },
    chapter: { face: "round-mark-chapter" },
    content: {
      points: { face: "narrow-column" },
      list: { face: "bento-panel" },
      comparison: { face: "two-column" },
      process: { face: "rail-numbered" },
      data: { face: "split-band" },
      photo: { face: "image-top" },
      statement: { face: "statement" },
      fact: { face: "stat-hero" },
      evidence: { face: "one-evidence" },
      hierarchy: { face: "asymmetric-triptych" },
    },
    ending: { face: "seat-cta-ending" },
  },
  motif: { id: "arena-motif" },
} satisfies BuiltinThemeDeclaration;
