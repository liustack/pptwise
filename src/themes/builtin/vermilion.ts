import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * vermilion（庄重公务汇报——工作汇报/述职/年度总结语域）——2026-08-06 gov-theme
 * wave（第 17 个内置主题，也是第一个从立项就以中文语域为主的主题，plan
 * `.issues/2026-08-06-gov-theme/plan.md`）。现有 16 主题无一覆盖庄重红金公务
 * 语域（ink 是文人水墨、heritage 是酒红典藏西式、rally 是营销紫）。正红
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
 * （红作结构色，正是裁定 1「红作结构色」的落地）。这与 ember/thesis/
 * brief/clinic/almanac 先例一致（封面浅、章节饱和）。
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
 * **菜单分派（S1-B）**：公文按条分述，statement 承一句话的表态。红头文件不借他人之口，quote 不上。2026-10 起各页改走 seal 一套脸，photo 也开了，见下。
 *
 * **2026-10 定稿重画（`design/rounds/2026-10-04-vermilion/`，政府工作报告
 * 学习汇报样例）**：整套改成一份公文的版面。
 *   - 内容页统一走 `seal-sheet`：天头金双线（motif），标题居中正红粗体
 *     34px、整行宽、两行内均衡折行，其下 64×2 金色短线，正文交给
 *     seal 设定的构图（中文数字方块编号、表头 2px 红线的开放表格、每页
 *     一处红）。list 页的编号卡片排成两两一组的面板（`cards: "tiles"`），
 *     points 页排成带编号的横行。
 *   - fact 页走 `seal-figure`：页头照常画标题，左边 240px 红色大数字加
 *     约束性标签与说明句，右边竖线后三条辅证。旧的 stat-hero 稀排脸不画
 *     标题。
 *   - 新开 photo：`image-split` 的 seal 栏，照片占左 560px，右栏金线、
 *     标题、三行数字。照片页关掉 motif（`decor: silent`），金线由栏自己从
 *     照片右边画起。evidence 也走 `seal-sheet`，不再用左上写死「案卷」的卡。
 *   - 封面 `red-head-cover`、结尾 `deliberation-ending` 按定稿重画，封面
 *     底缘与结尾天头地脚的金双线归 motif。
 *   - `chartPalette` 改成正红加两档褐灰再加金、靛灰：定稿里次要数据一律
 *     褐灰（#A89480、#CDBBA5），红留给这一页标出的那一组。seal 设定按
 *     「离标记最近的取调色板第二位」上色，所以褐灰排在红后面。金退到第四，
 *     只在没有标记、系列超过三组的普通图表里出现。
 *   - 英文版仍用雅黑。量过 PowerPoint 自带的 msyh.ttc：雅黑的连字符墨迹
 *     0.288em、粗 0.074em，Arial 是 0.270em、0.088em，长短一样，是普通的
 *     连字符而不是破折号，只是字宽 0.433em 比 Arial 的 0.333em 宽，字宽表
 *     已经计入。主题的字体按角色（heading、body）给，不按语言给。把拉丁面
 *     换成 Arial 之类，导出端 `eaFontFaceFor` 会自动把中文落到雅黑，但
 *     `hasExactWidthTable` 只有雅黑和 Georgia，中文版的标题与正文会从精确
 *     字宽退回保守包络，中文版里的数字和拉丁字母也会换成 Arial。所以不换。
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
    // `**…**` 标出的那一处落正红。金只给线、压 bg 2.26:1 承不了字，强调
    // 原先回落到 accent，对比表里标出的那句成了金字。
    emphasisInk: "#B02318",
    // 五格只作图系列与色块，字走 readableOn 并答 4.5。褐灰两档是退后的
    // 次要数据（定稿 2026-10），压 bg 都不到 3:1，图上每根柱都印数值，
    // 色块从不是数字的唯一载体。金同 accent，只给线，永不承字。
    chartPalette: ["#B02318", "#A89480", "#CDBBA5", "#C79A3B", "#4A5C6E"], // 正红/褐灰/浅褐灰/金/靛灰
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
  label: "Vermilion",
  story: {
    name: "Vermilion",
    story: "Vermilion red, a line of gold, warm off-white paper. It carries the gravity of an official report read aloud in a hall.",
    positioning: "Choose it for government and institutional work reports, reviews, and year-end summaries in the formal register.",
    audience: "An office reporting upward and outward in a formal setting.",
    notFor: "Startups, playful brands, or anything that should feel casual.",
    lineage: "The Chinese official report, red and gold on paper.",
  },
  style: VERMILION_TOKENS,
  menu: {
    cover: { face: "red-head-cover" },
    chapter: { face: "seal-numeral-chapter" },
    content: {
      points: { face: "seal-sheet" },
      list: { face: "seal-sheet", params: { cards: "tiles" } },
      comparison: { face: "seal-sheet" },
      process: { face: "seal-sheet" },
      data: { face: "seal-sheet" },
      photo: { face: "image-split", params: { column: "seal" }, decor: { kind: "silent" } },
      statement: { face: "statement" },
      fact: { face: "seal-figure" },
      evidence: { face: "seal-sheet" },
      hierarchy: { face: "seal-sheet" },
    },
    ending: { face: "deliberation-ending" },
  },
  motif: { id: "vermilion-motif" },
} satisfies BuiltinThemeDeclaration;
