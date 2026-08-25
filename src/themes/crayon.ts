import type { StyleTokens } from "./tokens";

/**
 * crayon（蜡笔卡纸）。2026-08-21 第 18 主题（场景审计低龄教育立项，
 * 设计源 `design-project/skin-boards.html` 的 crayon 板 + `new-themes-brief.md`
 * 第六组）。面向 K12 课件与家长会 / 兴趣班与培训机构招生 / 亲子活动与夏令营 /
 * 绘本与科普分享。性格：一盒蜡笔画在卡纸上，亮而不吵，圆角与手绘线，没有
 * 一处冷灰。
 *
 * 与 classroom（讲义雾蓝、拍纸簿）场景切分：classroom 是「亲和的教与学」，
 * crayon 是更低龄的「蜡笔卡纸」。两家四轴最近邻（L / top-band / · / medium），
 * 装饰浓度岔开。classroom 是横线簿格，crayon 是太阳涂鸦与星贴纸。
 * 底色隔开一个色温段。classroom 雾蓝 `#ECF0F2`，crayon 亮暖白
 * `#FFF9F0`。
 *
 * 2026-08-25「一盒蜡笔」配色换血，以下均由本仓库 `contrastRatio` 实测：
 *   - `bg` `#FFF9F0`：亮暖白。正文压它 14.65:1。
 *   - `surface` `#FFFFFF`：图画纸卡白。正文压它 15.33:1。
 *   - `primary` `#0A78B4`：蜡笔蓝。压 bg 4.60:1，承白字 4.82:1。
 *   - `accent` `#FF6A12`：亮橘。承深蓝黑 5.35:1。
 *   - `text` `#1E2340`：深蓝黑。
 *   - `muted` `#6E655A`：铅笔灰。压 bg 5.46:1，压 surface 5.72:1。
 *   - `border` `#F0E6D6`：卡纸折线。
 *   - `chartPalette`：蜡笔蓝 / 亮橘 / 草绿 / 阳光黄。
 *     阳光黄 `#FFD100` 压 bg 1.40:1，只作色块与太阳笔画，永不承字。
 *
 * 语义三色不在设计板色表里，按 classroom 同款「从角色色压深、属于这盒蜡笔」
 * 派生，压 `surface` 校准（kpi 箭头是 20px 字，callout 是线与图标）：
 *   - `danger` `#C71559`：糖果粉压深（5.71:1）。
 *   - `warning` `#A67C00`：阳光黄压深（3.82:1），只作线与图标。
 *   - `success` `#0E8437`：草绿压深（4.80:1）。
 *
 * chapter 底色改亮暖白 `#FFF9F0`（第八波批 2：斜贴纸号块是前景，不再铺
 * 满版 primary）。标题走深蓝黑压亮暖白，号块走 accent 承 `accessibleInk`。
 *
 * 字体跟 classroom 同一套 CJK 安全字面（heading 经 resolveFontFace 落到
 * Microsoft YaHei）。圆角 12 + gapScale 1.1，全主题最圆润档（课堂亲和那一档），
 * 蜡笔卡纸要的就是这个圆。
 *
 * 共享内容页装饰见 `../svg/motifs/motif-crayonbox-motif.tsx`。太阳与星贴纸
 * 缩在右上角。五张专属脸各自声明 `suppressMotif`，避免重复装饰。
 *
 * 可拉伸性：四色蜡笔即参数（K12 学科课换学科色组、亲子活动 bg 可提饱和至
 * `#FFF1D6`）。阳光黄永不承字。
 */
export const CRAYON_TOKENS: StyleTokens = {
  id: "crayon",
  colors: {
    bg: "#FFF9F0", // 亮暖白，正文压它 14.65:1
    surface: "#FFFFFF", // 图画纸卡白，正文压它 15.33:1
    primary: "#0A78B4", // 蜡笔蓝，压 bg 4.60:1，承白字 4.82:1
    accent: "#FF6A12", // 亮橘，承深蓝黑 5.35:1
    text: "#1E2340", // 深蓝黑
    muted: "#6E655A", // 铅笔灰，压 bg 5.46:1，压 surface 5.72:1
    border: "#F0E6D6", // 卡纸折线
    danger: "#C71559", // 糖果粉压深，压 surface 5.71:1
    warning: "#A67C00", // 阳光黄压深，压 surface 3.82:1，只作线与图标
    success: "#0E8437", // 草绿压深，压 surface 4.80:1
    // 一盒四色蜡笔。第四格阳光黄压 bg 1.40:1，只作色块，永不承字。
    chartPalette: ["#0A78B4", "#FF6A12", "#0E8437", "#FFD100"],
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: { radius: 12, gapScale: 1.1 }, // 与 classroom 同档：最圆润 + 呼吸感
  defaultBackgrounds: {
    cover: { kind: "color", value: "#FFF9F0" },
    // 第八波批 2：章节改亮暖白，斜贴纸号块自己承 accent，不再满版 primary
    chapter: { kind: "color", value: "#FFF9F0" },
    content: { kind: "color", value: "#FFF9F0" },
    ending: { kind: "color", value: "#FFF9F0" },
  },
};
