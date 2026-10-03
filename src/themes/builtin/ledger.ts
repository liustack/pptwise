// ledger（深度洞察）——原 creative 改名（2026-07-10 用户裁决：深底红金
// 气质其实是 terminal/Economist 财经信息图风，不配叫 creative；真正的
// 创意子类由 doodle/ink 两新主题承接）。
import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * **深底组皮肤重设计（2026-08-19，`.issues/2026-08-18-theme-redesign/skins/`
 * 的 `group1-dark-boards.dc.html` 色板角色表 + 封面样例）**：深底三家
 * （ledger / terminal / luxe）此前共用「深底 + 左竖条 + 左上标题」一张脸，
 * covers-review 把它记成反面基线。ledger 的处方是往行情屏走——暖黑终端底
 * 配终端琥珀，装饰换成「行情语汇」。逐条来历：
 *   - `bg` `#0A0A0C` → `#0F1216`：中性死黑 → 暖黑终端底。死黑没有色温，
 *     三家并排时分不出谁是谁；暖黑与 terminal 的蓝黑、luxe 的真黑各占一档。
 *   - `surface` `#14141A` → `#171C22`：数据面板跟着底色转暖，仍只抬一档，
 *     深底主题不出白卡。
 *   - `primary` `#E63946` → `#16202B`：正红 → 墨蓝。红色横幅在深底上抢走
 *     所有注意力，accent 反而没了位置；primary 退成墨蓝色块，让琥珀唱主角。
 *   - `accent` `#D4A57C` → `#F0A63C`：奶茶褐 → 终端琥珀。琥珀是行情屏的
 *     行业记忆色，也是封面巨号与章节 SECTION 眉的着色。装饰线改走 border。
 *   - `text` `#F5F5F5` → `#F2EFE8`：冷白 → 暖纸白，跟着底色的色温走。
 *   - `muted` `#93939C` → `#9AA7B4`：中性灰 → 青灰，注脚也进色温体系。
 *   - `border` `#2A2A2E` → `#2A3440`：行情表格线，暗而可辨。motif 底缘暗线
 *     取的就是这个角色。
 *   - `chartPalette` 全换：琥珀主序 + 涨绿 + 跌红 + 中性青灰——财经图表的
 *     涨跌语义直接进色序，不再是「红/褐/灰/白」的无语义排列。
 *   - `defaultBackgrounds` 四页型从纯色改成竖向渐变（`#151B23` → `#0C1016`，
 *     封面样例的 `insbg`）：`full-slide-svg.tsx` 真正画的是这四条，`bg`
 *     token 只喂组件——两者都要改，只改一个等于没改（ink v3 同一条教训）。
 *
 * 对比度实测（本仓库 `svg/ink.ts` 的 `contrastRatio`，压渐变起点 `#151B23`
 * 这个更严的一端；`registerTheme` 的 3:1 硬闸按 `resolveBackgroundHex` 取
 * 渐变 `from`，所以这一列才是闸门实际读的数）：
 * text 15.08:1、muted 7.06:1、accent 8.43:1。压 `bg` `#0F1216` 则为
 * text 16.35:1、muted 7.65:1、accent 9.14:1。
 * 设计板自查写的 muted 7.8:1 略高于实测 7.65:1，以实测为准，仍远高于 4.5:1。
 *
 * 装饰见 `src/motifs/motif-poster-motif.tsx`（行情语汇 第八波：顶缘
 * 行情带与封面幽灵季字退役，只留底缘暗线，stroke 走 border。章节幽灵序号
 * 改由 `ghost-section-chapter` 画，整字落在画布内）。
 *
 * **2026-10 样例改版**（`design/rounds/2026-10-04-ledger/`，设计系统见
 * `docs/design-ledger.md`）：
 *   - 每页顶部一条 32px 状态栏（`poster-motif` 重画）：比页底更深一档的栏，
 *     下边一条 border 线，左边琥珀小圆点加机构名，右边日期，12px 青灰字，
 *     不放页码。底缘暗线退役。
 *   - 内容页统一一种头部（`panel-sheet` 的 `PanelHead`）：标题字体 31/42
 *     常规字重，整行 1152 宽，以最后一行为基准落在 y130，不提前折行。
 *   - 数据放进深色面板（surface 填充、1px border、方角），面板顶部 36px
 *     标题栏，左边名称、右边单位，13px 青灰。重点面板琥珀边、琥珀名称。
 *   - 琥珀（accent，也是强调墨）是唯一强调色。绿（success）和红（danger）
 *     只表示数值的涨跌方向，不表示好坏，也不当普通序列色。
 *   - `chartPalette` 改成琥珀加三档蓝灰，再加一档浅蓝灰：原来第 2、3 位是
 *     涨绿跌红，三系列以上的图会被读成涨跌。面板里未标的序列从第 2 位起按
 *     离标记由近到远取色，空心点和未标节点取对面板对比度最高的那一档。
 *   - 封面 `stat-cover` 重画成行情条封面，结尾 `close-word-ending` 重画成
 *     「信号面板」收口页，都读页面的 `kicker`。结尾页的 `footnote` 印在页脚。
 *   - 照片页上菜：`image-split` 的 `column: "panel"`，照片铺左半，右边标题
 *     加一列大数字。
 *
 * **菜单分派**：行情屏按数字推进，七类内容页共用一张面板正文页
 * （`panel-sheet`，按内容挑面板设定下的构图）。大数字页 `panel-figure`。
 * 照片页 `image-split` 的面板栏。结论页、引语页沿用原来的脸。evidence
 * 不上：面板页本身就是证据页。
 */
export const INSIGHT_TOKENS: StyleTokens = {
  id: "ledger",
  colors: {
    bg: "#0F1216", // 暖黑终端底。页底，正文墨压它 16.35:1，答 4.5
    surface: "#171C22", // 数据面板。卡面，正文墨压它 14.92:1，答 4.5
    primary: "#16202B", // 墨蓝色块，不作 bg 上的字。承白字 16.46:1，答 4.5
    accent: "#F0A63C", // 终端琥珀
    text: "#F2EFE8", // 暖纸白
    muted: "#9AA7B4", // 青灰注脚（压 bg 7.65:1，压渐变起点 7.06:1）
    border: "#2A3440", // 行情表格线。只作线，永不承字，不答文字门槛
    danger: "#DA6354", // 跌红。kpi 箭头当字，压 surface 4.81:1，答 4.5
    warning: "#E0863A", // 深琥珀。只作线与图标，压 surface 6.23:1，不答文字门槛
    success: "#2FA97C", // 涨绿。kpi 箭头当字，压 surface 5.78:1，答 4.5
    // 只作图系列与色块。琥珀领头，其后三档蓝灰由近到远退后，最后一档浅
    // 蓝灰给空心点和未标节点。涨绿跌红不进色序：它们只说涨跌方向。
    chartPalette: ["#F0A63C", "#56677A", "#3D4B5A", "#2E3A47", "#7E93A8"], // 琥珀 / 蓝灰一 / 蓝灰二 / 蓝灰三 / 浅蓝灰
  },
  fonts: {
    heading: ["Lora", "Georgia", "Source Han Serif SC", "serif"],
    body: ["Inter", "system-ui"],
  },
  shape: {
    radius: 2,
    gapScale: 0.95, // 信息图利落+数据密度
    cover: { metaPlacement: "top" },
  },
  defaultBackgrounds: {
    cover: { kind: "gradient", from: "#151B23", to: "#0C1016", direction: "tb" },
    chapter: { kind: "gradient", from: "#151B23", to: "#0C1016", direction: "tb" },
    content: { kind: "gradient", from: "#151B23", to: "#0C1016", direction: "tb" },
    ending: { kind: "gradient", from: "#151B23", to: "#0C1016", direction: "tb" },
  },
};

export const INSIGHT_THEME = {
  version: 2,
  id: "ledger",
  label: "Ledger",
  story: {
    name: "Ledger",
    story: "Warm black terminal, amber figures, a serif for the argument. It talks like a strategist who publishes the odds and settles the account every quarter.",
    positioning: "Choose it when the story is a bet with numbers attached and the audience will remember whether you were right.",
    audience: "An analyst or strategist addressing people who allocate money.",
    notFor: "Soft narratives, celebrations, or anything without a number to defend.",
    lineage: "The market screen and the annual strategy note, ticker lines and all.",
  },
  style: INSIGHT_TOKENS,
  menu: {
    cover: { face: "stat-cover" },
    chapter: { face: "ghost-section-chapter" },
    content: {
      points: { face: "panel-sheet" },
      list: { face: "panel-sheet" },
      comparison: { face: "panel-sheet" },
      process: { face: "panel-sheet" },
      data: { face: "panel-sheet" },
      photo: { face: "image-split", params: { column: "panel" } },
      statement: { face: "statement" },
      quote: { face: "pull-quote" },
      fact: { face: "panel-figure" },
      hierarchy: { face: "panel-sheet" },
    },
    ending: { face: "close-word-ending" },
  },
  motif: { id: "poster-motif" },
} satisfies BuiltinThemeDeclaration;
