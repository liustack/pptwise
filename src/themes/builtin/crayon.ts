import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

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
 *   - `primary` `#0B87C7`：蜡笔蓝。只给 24px 粗体日期与联系方式上色，
 *     压 bg 3.78:1，答 3.0 大字门槛，不答 4.5。承白字 3.96:1。
 *   - `accent` `#FF6A12`：号贴纸底，承深蓝黑 5.35:1，答 4.5，不给小字上色。
 *   - `text` `#1E2340`：正文墨。压 bg 14.65:1，答 4.5。
 *   - `muted` `#6E655A`：次级文字。压 bg 5.46:1，压 surface 5.72:1，答 4.5。
 *   - `border` `#F0E6D6`：卡纸折线。
 *   - `chartPalette`：亮糖果蓝 / 亮橘 / 草绿 / 阳光黄。压 bg 分别为
 *     2.23 / 2.74 / 1.95 / 1.40，只作厚笔画图形与色块，永不承字。
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
 * 共享内容页装饰见 `../../motifs/motif-crayonbox-motif.tsx`。太阳与星贴纸
 * 缩在右上角。五张专属脸各自声明 `suppressMotif`，避免重复装饰。
 *
 * 可拉伸性：四色蜡笔即参数（K12 学科课换学科色组、亲子活动 bg 可提饱和至
 * `#FFF1D6`）。阳光黄永不承字。
 *
 * **菜单分派（S1-B）**：蜡笔盒家族接管并列与宣言（list 走 crayonbox-cards，statement 走本来无人认领的 crayonbox-point），低龄课不摆数据也不讲层级，data、hierarchy、quote、fact、evidence 都不上。
 */
export const CRAYON_TOKENS: StyleTokens = {
  id: "crayon",
  colors: {
    bg: "#FFF9F0", // 亮暖白，正文压它 14.65:1
    surface: "#FFFFFF", // 图画纸卡白，正文压它 15.33:1
    primary: "#0B87C7", // 蜡笔蓝（压 bg 3.78:1，承白字 3.96:1）——它只给日期与
    // 联系方式这两行 24px 粗体上色，answers 的是 3:1 大字门槛而不是 4.5。
    // 先前取 #0A78B4 是按 4.5 挑的，压深两档后读起来像企业链接蓝不像蜡笔。
    accent: "#FF6A12", // 号贴纸底，承深蓝黑 5.35:1，答 4.5，不给小字上色
    text: "#1E2340", // 正文墨，压 bg 14.65:1，答 4.5
    muted: "#6E655A", // 次级文字，压 bg 5.46:1，压 surface 5.72:1，答 4.5
    border: "#F0E6D6", // 卡纸折线。只作线，永不承字，不答文字门槛
    danger: "#C71559", // 糖果粉压深，压 surface 5.71:1
    warning: "#A67C00", // 阳光黄压深，压 surface 3.82:1，只作线与图标
    success: "#0E8437", // 草绿压深，压 surface 4.80:1
    // 一盒四色亮糖果蜡笔。四格压 bg 2.23 / 2.74 / 1.95 / 1.40。
    // 这是设计裁定的例外。厚笔画图形在奶油底上可辨，不受 3.0 图表标记线
    // 约束。旧 crayon 的 #F5B700（1.68）已有同款先例。四格永不承字。
    chartPalette: ["#14B4FF", "#FF6A12", "#15D157", "#FFD100"],
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

export const CRAYON_THEME = {
  version: 2,
  id: "crayon",
  label: "Kids Education",
  style: CRAYON_TOKENS,
  menu: {
    cover: { face: "crayonbox-open" },
    chapter: { face: "crayonbox-sticker" },
    content: {
      points: { face: "narrow-column" },
      list: { face: "crayonbox-cards" },
      comparison: { face: "two-column" },
      process: { face: "rail-numbered" },
      photo: { face: "image-top" },
      statement: { face: "crayonbox-point" },
    },
    ending: { face: "crayonbox-todo" },
  },
  motif: { id: "crayonbox-motif" },
} satisfies BuiltinThemeDeclaration;
