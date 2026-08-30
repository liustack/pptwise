import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * vermilion（庄重公务汇报——工作汇报/述职/年度总结语域）——2026-08-06 gov-theme
 * wave（第 17 个内置主题，也是第一个从立项就以中文语域为主的主题，plan
 * `.issues/2026-08-06-gov-theme/plan.md`）。现有 16 主题无一覆盖庄重红金公务
 * 语域（ink 是文人水墨、heritage 是酒红典藏西式、campaign 是营销紫）。正红
 * 主色 + 金强调 + 暖米白底，气质一句话：庄重、提气、汇报体。专属
 * vermilion-motif 画公文金线（抽象传达提气感，刻意不用五角星等政治符号——
 * 过线风险，plan 裁定 2）。
 *
 * **背景裁定（plan 裁定 1 起点为「cover/chapter 可用正红整版」，实现期依
 * pptwise 对比度架构收敛为「仅 chapter 正红整版」）**：`assertContrastFloor`
 * （`definitions.ts`）对 cover/content/ending 三页型逐一实测 text/muted 与该
 * 页型默认背景的对比度，要求 ≥3.0——且 text/muted 是全主题单值 token。若
 * cover 取正红，则 text 对红仅 ~2.2:1、muted 对红 ~1.05:1，双双跌破 3.0
 * 地板（chapter 因八个 chapter layout 全部走 `readableOn`/`accessibleInk`
 * 自适应取墨，被 `CONTRAST_CHECKED_SLIDE_TYPES` 刻意豁免，故可整版红）。而
 * content/ending 必须是浅底（正文可读性，plan 裁定 1「正文页不可整版红」），
 * 浅底又要求 text/muted 是深墨——同一对 token 不可能既在红底达标又在浅底
 * 达标。结论：**cover 随 content/ending 取暖米白**，封面的庄重红金身份改由
 * 红色结构型 layout（banner-title 的红强调条、left-anchor 的 40% 红色块、
 * split-diagonal 的红斜切块——后两者走 readableOn 反白，banner-title 则是
 * 浅底上的红标题+红条，靠 primary·bg 5.93:1 直接达标）+ 红金 motif 承载
 * （红作结构色，正是裁定 1「红作结构色」的落地）。这与 ember/academic/
 * consulting/pulse/terra 先例一致（封面浅、章节饱和）。
 *
 * **暖纸组皮肤重设计（2026-08-19，`.issues/2026-08-18-theme-redesign/skins/`
 * 的 `group2-warm-boards.dc.html` 里 vermilion 的色板角色表 + 封面样例）**：
 * vermilion 在暖纸四家里拿到的语域是公文纸——米白、正红、金。逐条来历：
 *   - `bg` `#FBF7F0` → `#F6EFE3`：公文米白，暖而不黄，比旧值多一档纸感；
 *     四家纸色阶梯里它排第三档（灰本白 < 沙 < 米白 < 暖白）。
 *   - `surface` `#FFFFFF` → `#FCF8EF`：纯白面板在米白纸上是冷斑，换成文件
 *     页的同族米白。
 *   - `primary` `#C8102E` → `#B02318`：正红压深。实测压各自 bg 5.51:1 →
 *     5.93:1，白字压红 5.88:1 → 6.78:1——红头承白字这件事从「勉强」变成
 *     「稳」，chapter 整版红与 banner 红条上的反白都受益。
 *   - `accent` `#D4A017` → `#C79A3B`：金压深半档，实测 2.22:1 → 2.26:1。
 *     仍远低于任何文字门槛，纪律不变：**金只给线，绝不当文字色**。
 *   - `text` `#2B2020` → `#33231C`：公文墨转暖褐，13.14:1。
 *   - `muted` `#6E5A50` → `#6E5B4B`：档案灰，5.63:1，仍清 4.5:1 正文门槛。
 *   - `border` `#E7DCC8` → `#E0D2B8`：案卷线。
 *   - `chartPalette`：正红 / 金 / 靛灰 / 松绿——红金主从，冷色对照。旧表的
 *     藏青 `#1F3A5F` 压 bg 10.75:1，在一张红金表里黑得像另一套配色；靛灰
 *     `#4A5C6E` 6.03:1 与松绿 `#66754F` 4.35:1 是同一张表里的冷调对照。
 *   - `fonts.heading` SimSun 衬线 → 雅黑无衬线：设计板的组内互检明写
 *     「heritage 衬线、其余 sans」，vermilion 封面样例的巨号标题也是无衬线
 *     （只有「云觅科技文件」那行引首用楷体）。附带收益：雅黑有精确字宽表
 *     （`hasExactWidthTable`），vermilion 因此退出 `definitions.test.ts` 的
 *     `nonExactHeadingBuiltins` 豁免集合，标题排版从保守包络回到精确测量。
 *
 * 对比度实测（本仓库 `svg/audit/deck-audit.ts` 的 `contrastRatio`，压 `bg`
 * `#F6EFE3`）：primary 5.93:1、accent 2.26:1、text 13.14:1、muted 5.63:1、
 * chart 正红 5.93:1 / 金 2.26:1 / 靛灰 6.03:1 / 松绿 4.35:1；白字压 primary
 * 6.78:1。设计板自查写的 primary 8 / accent 3.2 / chart 8·3.2·5·4.5 高于
 * 实测（primary 差 2.07 是本组最大的一处偏差），**以实测为准**：primary
 * 5.93:1 达 4.5:1 正文门槛，accent 2.26:1 未达 3.0 装饰门槛因而只画线不承字
 * ——两条纪律与旧值时期完全一致，未因板上数字放宽。板上「红头能直接承
 * 白字（6.7:1）」一条与实测 6.78:1 相符。
 *
 * 装饰见 `src/motifs/motif-vermilion-motif.tsx`（文件金线：只留顶缘金双线。
 * 金芒扇与底缘金菱已退役。封面与章节 motif 退让，内容/ending 画天头金线）。
 *
 * **第八波批 3（`.issues/2026-08-22-theme-redesign-wave8/batch3`）**：chapter
 * 从正红整版改为公文米白 `#F6EFE3`（与 bg 同值）。板上章节是浅底红号块，
 * 不是整版红。红身份来自红头与号块，正文页本来就不可整版红。
 *
 * **菜单分派（S1-B）**：公文按条分述，points 的窄栏是主力，statement 承一句话的表态。红头文件不铺满版照片也不借他人之口，photo 与 quote 都不上。
 */
export const VERMILION_TOKENS: StyleTokens = {
  id: "vermilion",
  colors: {
    bg: "#F6EFE3", // 公文米白页底，正文墨压它 13.14:1，答 4.5
    surface: "#FCF8EF", // 文件页面板。卡面，正文墨压它 14.17:1，答 4.5
    primary: "#B02318", // 正红（5.93:1；白字压它 6.78:1）
    accent: "#C79A3B", // 金（2.26:1，只给线，绝不当文字色）
    text: "#33231C", // 公文墨（13.14:1）
    muted: "#6E5B4B", // 档案灰（5.63:1）
    border: "#E0D2B8", // 案卷线。只作线，永不承字，不答文字门槛
    danger: "#8C1810", // 深朱。kpi 箭头当字，压 surface 8.79:1，答 4.5
    warning: "#8E6A18", // 金压深。只作线与图标，压 surface 4.69:1，不答文字门槛
    success: "#4C6B3C", // 松绿。kpi 箭头当字，压 surface 5.70:1，答 4.5
    // 四格只作图系列与色块。c0、c2、c3 可作徽章底，字走 readableOn 并答 4.5。
    // c1 同 accent，只给线，压 bg 2.26:1，永不承字，不答文字门槛。
    chartPalette: ["#B02318", "#C79A3B", "#4A5C6E", "#66754F"], // 正红/金/靛灰/松绿
  },
  // Microsoft YaHei first: resolveFontFace picks the first SAFE_FONTS match,
  // and only Georgia/Microsoft YaHei carry an exact per-character width table
  // (`hasExactWidthTable`, `src/lib/svg-text-layout.ts`); Georgia has no CJK
  // glyphs, so YaHei is the only face that both clears that invariant and
  // renders this theme's own CJK register. The warm-group board moved
  // vermilion off SimSun's serif masthead (see the file header) — the pre-
  // reskin comment's own argument for SimSun was "CJK-safe serif", and the
  // register itself is what the board changed.
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "system-ui"],
  },
  shape: {
    radius: 2,
    gapScale: 1, // 庄重利落（方正克制，汇报体不求圆润）
    cover: { textAnchor: "middle", bandY: 272, bandH: 196 },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#F6EFE3" }, // 浅底（红身份来自结构型 layout + motif，见文件头背景裁定）
    chapter: { kind: "color", value: "#F6EFE3" }, // 公文米白（红身份来自红头与号块，正文页不可整版红）
    content: { kind: "color", value: "#F6EFE3" },
    ending: { kind: "color", value: "#F6EFE3" },
  },
};

export const VERMILION_THEME = {
  version: 2,
  id: "vermilion",
  label: "Official Report",
  style: VERMILION_TOKENS,
  menu: {
    cover: { face: "red-head-cover" },
    chapter: { face: "seal-numeral-chapter" },
    content: {
      points: { face: "narrow-column" },
      list: { face: "bento-panel" },
      comparison: { face: "two-column" },
      process: { face: "rail-numbered" },
      data: { face: "split-band" },
      statement: { face: "statement", decor: { kind: "silent" } },
      fact: { face: "stat-hero", decor: { kind: "silent" } },
      evidence: { face: "one-evidence", decor: { kind: "silent" } },
      hierarchy: { face: "asymmetric-triptych" },
    },
    ending: { face: "deliberation-ending" },
  },
  motif: { id: "vermilion-motif" },
} satisfies BuiltinThemeDeclaration;
