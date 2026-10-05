import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * rally（活力营销）——2026-07-13 memphis 拆分主题 A（用户拍板：场景命名
 * rally + 深紫方向，参考「炫彩简约活动策划」类模板），面向活动策划/
 * 营销 rally/发布会/年轻化品牌。存量 memphis/doodle deck 经
 * LEGACY_THEME_MAP 兜底到本主题。紫色系是全主题色域里唯一的空位。
 *
 * **柔和组皮肤重设计（2026-08-20，设计源
 * `.issues/2026-08-18-theme-redesign/skins/group4-soft-boards.dc.html` 的
 * `section#g4` 里 rally 的色板角色表 + 封面样例）**：这一组是频谱两端，
 * rally 是闹的那半。旧表是「深紫底 + 四彩笔刷涂鸦」，新表把整台戏挪进
 * 剧场——幕布深紫的舞台、开灯前的暗、荧光洋红的主音、四色纸屑当彩带。
 * 逐条来历：
 *   - `bg` `#3D2E78` → `#2A1E3F`：偏蓝深紫 → 幕布深紫。压暗一大档，纸屑
 *     和图表色才有地方亮起来。
 *   - `surface` `#4A3A8E` → `#35284E`：侧幕紫，比 bg 抬升一档。
 *   - `primary` `#F0559E` → `#23173A`：**这一格是整轮最大的语义翻转**。
 *     旧 primary 是品红——一个「主强调色」，横幅底刷成它之后 baked 白字只有
 *     ~3.2:1，content 因此长期禁配 `banner-heading`。设计板把 primary 判成
 *     「更深一档给横幅/色块」的舞台暗部，强调的活交给 `accent`。翻转之后
 *     白字压 primary 实测 16.73:1，横幅从此是全主题最稳的一块底。
 *   - `accent` `#F7D23E` → `#E84F8A`：柠檬黄 → 荧光洋红，营销的主音。
 *   - `text` `#FFFFFF` → `#F6F2F9`：纯白 → 灯光白（14.00:1）。
 *   - `muted` `#D5CFE8` → `#B3A6C7`：浅紫灰 → 幕影紫灰（6.78:1）。
 *   - `border` `#5A4AA0` → `#4A3A66`：幕缝线。
 *   - `chartPalette` 换成板上的纸屑四色：洋红 / 鎏金 / 天青 / 荧绿——
 *     **图表与装饰同源**，纸屑撒的就是这四色。
 *
 * 对比度实测（`svg/ink.ts` 的 `contrastRatio`，压 `bg` `#2A1E3F`）：
 * accent 4.36:1、text 14.00:1、muted 6.78:1（压 surface 5.88:1）、chart
 * 洋红 4.36 / 鎏金 8.31 / 天青 7.48 / 荧绿 10.03——四格全过 3.0 装饰线，
 * 后三格连 4.5 正文线都过。设计板自查写的 5 / 15 / 6 / 5·9·8·11 与实测
 * 同向（板上像是拿更深的 `primary` `#23173A` 当底算的：压 primary 分别是
 * 4.71 / 15.13 / 7.33 / 4.71·8.98·8.08·10.84，六格里有四格与板上数字对得
 * 上），以压 bg 的实测为准，无一格跌破门槛，故七个 token 与四格 chart
 * 一字未改——本主题这一轮零偏离。
 *
 * `primary` 压 bg 只有 1.08:1 是**设计意图**，不是缺陷：它是舞台暗部的
 * 色块底，不是画在 bg 上的字。画在 primary 上的字由 `readableOn`/
 * `accessibleInk` 自适应取墨（白字 16.73:1）。
 *
 * 装饰见 `../../motifs/motif-rally-motif.tsx`（v8：内容页右上一小撮七枚四色纸屑，
 * 按页号撒，避字；右下「N / M」页脚。v7 的三枚斜方片随 2026-10 定稿退役）。
 *
 * **菜单分派（S1-B）**：海报腔：data 交给居中的 stacked-poster（一张图当主角的海报路径），photo 用顶部满幅的 image-top，营销讲自己的话，quote 不上。
 *
 * **2026-10 活动策划案定稿**（设计源 `design/rounds/2026-10-06-rally/`，规则见
 * `docs/design-rally.md`）：每一页是一份活动策划案的一个分区。左上一张票根
 * （洋红票面写分区编号，侧幕紫票身写分区名，页面的 `kicker`），右上一小撮纸屑
 * （四色，按页号撒，motif 画），右下「N / M」。封面 `marquee-cover`（满版人海
 * 照片、下暗渐变、72px 标题、洋红副题、带图标的描边胶囊），分区页
 * `marquee-chapter`，收尾 `marquee-ending`（满版纸屑舞台、下一步三点、作者
 * 写的洋红钮）。一句话方案 `marquee-statement`（没有标题栏，引子加 72px 两行
 * 大字，上下两带纸屑）。其余内容页全走 `marquee-sheet`：34px 特粗标题，正文交给
 * marquee 设定里的构图。色值不动：洋红是主音，洋红上的字一律深墨（primary
 * 压暗），图表和纸屑同用四色。旧的 poster-center / act-chapter / pill-cta-ending /
 * stacked-poster 等脸不再挂在 rally 上，quote 照旧不上。
 */
export const CAMPAIGN_TOKENS: StyleTokens = {
  id: "rally",
  colors: {
    bg: "#2A1E3F", // 幕布深紫。页底，正文墨压它 14.00:1，答 4.5
    surface: "#35284E", // 侧幕紫。卡面，正文墨压它 12.13:1，答 4.5
    primary: "#23173A", // 更深一档给横幅/色块（白字 16.73:1）
    accent: "#E84F8A", // 营销主音，只承大字。压 bg 4.36:1 答 3.0，不承小字
    text: "#F6F2F9", // 灯光白（14.00:1）
    muted: "#B3A6C7", // 幕影紫灰（6.78:1）
    border: "#4A3A66", // 幕缝线。只作线，永不承字，不答文字门槛
    danger: "#F07764", // 追光珊瑚。kpi 箭头当字，压 surface 4.81:1，答 4.5
    warning: "#F0B429", // 鎏金。只作线与图标，压 surface 7.20:1，不答文字门槛
    success: "#9BE36D", // 荧绿。kpi 箭头当字，压 surface 8.69:1，答 4.5
    // 四格是图系列与纸屑色块，可作徽章底，字走 readableOn 并答 4.5。
    // c0 洋红压 bg 4.36:1，只承大字并答 3.0，不承小字。
    chartPalette: ["#E84F8A", "#F0B429", "#4FC1E9", "#9BE36D"], // 洋红/鎏金/天青/荧绿=纸屑四色
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: {
    radius: 10,
    gapScale: 1.0, // 活力圆润（terminal 同档）
    cover: { showKicker: true, barFill: "accent", metaPlacement: "bottom-left", textAnchor: "start" },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#2A1E3F" },
    chapter: { kind: "color", value: "#2A1E3F" },
    content: { kind: "color", value: "#2A1E3F" },
    ending: { kind: "color", value: "#2A1E3F" },
  },
};

export const CAMPAIGN_THEME = {
  version: 2,
  id: "rally",
  label: "Rally",
  story: {
    name: "Rally",
    story: "Deep purple with sharp accents, built for short slogans and hard deadlines. It is a launch room where every page is a call to move.",
    positioning: "Choose it for launches, marketing pushes, and mobilization pieces where a single phrase must carry across all materials.",
    audience: "A team rallying partners, channels, and its own people.",
    notFor: "Reflective, thesis, or slow-paced storytelling.",
    lineage: "The rally kickoff and the launch war room.",
  },
  style: CAMPAIGN_TOKENS,
  menu: {
    cover: { face: "marquee-cover" },
    chapter: { face: "marquee-chapter" },
    content: {
      points: { face: "marquee-sheet" },
      list: { face: "marquee-sheet" },
      comparison: { face: "marquee-sheet" },
      process: { face: "marquee-sheet" },
      data: { face: "marquee-sheet" },
      photo: { face: "marquee-sheet" },
      statement: { face: "marquee-statement" },
      fact: { face: "marquee-sheet" },
      evidence: { face: "marquee-sheet" },
      hierarchy: { face: "marquee-sheet" },
    },
    ending: { face: "marquee-ending" },
  },
  motif: { id: "rally-motif" },
} satisfies BuiltinThemeDeclaration;
