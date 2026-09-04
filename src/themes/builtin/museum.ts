import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * museum（博物）——2026-08-21 新增第 20 个 theme id（第 19 个结构身份）。
 * 性格：展厅灯灭之后，标签牌还亮着。
 * 目标场景：博物馆与展览解说、自然科普、人文讲座、演讲型极简叙事 deck。
 * 三个新极简版式的第一签约主题（版式本轮不动，倾向只用现有池）。
 *
 * 深底第五色温：insight 暖黑终端 `#0F1216` / tech 蓝黑 `#0A0F1E` / luxe
 * 真黑 `#0B0908` / arena 紫黑 `#120B22` 之后，museum 棕黑厅堂 `#211A12`
 * （RGB 33,26,18，R > G ≫ B）。比 luxe 亮一档才看得出褐，缩略图里是那块
 * 褐，不是又一块死黑。
 *
 * 金与 luxe 香槟金分家：luxe `#C6A15B` 是请柬浅香槟（H 39.3，L 0.57）。
 * museum `#BE7A28` 是展签铜牌（H 32.8，L 0.45），更橙、更暗。G 低 39、
 * B 低 51。luxe=请柬奢侈品，museum=博物馆标签牌。
 *
 * 逐条来历（鹦鹉站 `--void #15110B` / `--amber #C28A3E` 只作起点，hex
 * 不照抄，本仓库 `svg/ink.ts` 的 `contrastRatio` 压 `bg #211A12` 实测）：
 *   - `bg` `#211A12`：棕黑厅堂。
 *   - `surface` `#2B241A`：展柜衬板，一档抬升。深底不出白卡。
 *   - `primary` `#322A1E`：深色块，让铜金唱主角。白字压 primary 14.14:1。
 *   - `accent` `#BE7A28`：展签铜金。压 bg 4.92:1，可直接承大标题。
 *   - `text` `#F4ECD8`：暖纸白（14.61:1）。
 *   - `muted` `#C2B394`：旧纸注脚（8.33:1）。
 *   - `border` `#403628`：展柜接缝。
 *   - `chartPalette` 四色：铜金 / 苔绿 / 氧化红 / 暖石。金主序 + 标本柜
 *     配角。氧化红 H 9.9 落在红段，不进蓝配橙禁忌带。
 *
 * 语义三色压 `surface` 校准（kpi 箭头是字，callout 的 warning 是线与图标）：
 *   - `danger` `#E0705C`：氧化红提亮（4.85:1）。
 *   - `warning` `#D4A04A`：铜金提亮（6.52:1），只作线与图标。
 *   - `success` `#8A9A52`：标本苔绿（4.98:1）。
 *
 * 字体：heading SimSun 族（journal / heritage / luxe 先例），Windows 安全
 * 面打头保导出无 tofu。body 仍是雅黑。圆角 0 + gapScale 1.3（airy 档，
 * ink 同值）。
 *
 * 装饰：无 motif。2026-08-21 用户裁撤四角针点。第八波批 4 角标 tick
 * 再次退役，不要加回来。展签细框是内容页版式结构件，不升成页缘 motif。
 * 加 motif 会改封面，禁止。
 *
 * 第八波批 4（封面 poster-center 锁板不动）：章节 hall-label-chapter
 * （展厅号当章号，铜金只给厅号），ending exit-word-ending（中轴铜金
 * 短线依附标题簇）。内容倾向 split-band / two-column / quiet-frame。
 *
 * 可拉伸性：铜金即参数（自然科普可换成氧化绿 `#5E8A62`，人文讲座 bg 可
 * 收到石黑 `#1A1814`、accent 收到旧银 `#C4B8A0`）。
 *
 * **菜单分派（S1-B）**：厅堂靠留白与展签，points 用居中的 quiet-frame，evidence 正是一件展品配一句说明的展签格式，photo 用图文对开的 image-split，quote 不上。
 */
export const MUSEUM_TOKENS: StyleTokens = {
  id: "museum",
  colors: {
    bg: "#211A12", // 棕黑厅堂。页底，正文墨压它 14.61:1，答 4.5
    surface: "#2B241A", // 展柜衬板。卡面，正文墨压它 13.02:1，答 4.5
    primary: "#322A1E", // 深色块（让 accent 唱主角，白字 14.14:1）
    accent: "#BE7A28", // 展签铜金（4.92:1）——比 luxe 香槟金更橙更暗
    text: "#F4ECD8", // 暖纸白（14.61:1）
    muted: "#C2B394", // 旧纸注脚（8.33:1）
    border: "#403628", // 展柜接缝。只作线，永不承字，不答文字门槛
    danger: "#E0705C", // 氧化红（压 surface 4.85:1）
    warning: "#D4A04A", // 铜金提亮（6.52:1），只作线与图标
    success: "#8A9A52", // 标本苔绿（4.98:1）
    // 四格只作图系列与色块。可作徽章底，字走 readableOn 并答 4.5。
    // 深底上取深墨，永不让白色小字直接压这些系列色。
    chartPalette: ["#BE7A28", "#7A8B4A", "#C45A45", "#9A8E78"], // 铜金/苔绿/氧化红/暖石
  },
  fonts: {
    // 展签衬线：SimSun/宋体 是 SAFE_FONTS 里的 CJK 衬线，放首位保导出。
    // Songti SC/STSong 留作 macOS 预览回退（journal/heritage/luxe 同款）。
    heading: ["SimSun", "宋体", "Songti SC", "STSong", "serif"],
    body: ["Microsoft YaHei", "Helvetica Neue", "Arial", "system-ui"],
  },
  shape: {
    radius: 0,
    gapScale: 1.3, // 展签直角 + airy 厅堂留白（ink 同档）
    cover: { metaPlacement: "top" },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#211A12" },
    chapter: { kind: "color", value: "#211A12" },
    content: { kind: "color", value: "#211A12" },
    ending: { kind: "color", value: "#211A12" },
  },
};

export const MUSEUM_THEME = {
  version: 2,
  id: "museum",
  label: "Museum",
  story: {
    name: "Museum",
    story: "The gallery lights are off and the labels are still lit. Fifty lux, a hairline, and every page answers one question: what did this illuminate?",
    positioning: "Choose it for exhibitions, curator talks, and quiet narrative decks where each page is an object with a label.",
    audience: "A curator guiding visitors, one object at a time.",
    notFor: "Sales decks, rapid-fire updates, or dense tables.",
    lineage: "The exhibition label and the museum catalog.",
  },
  style: MUSEUM_TOKENS,
  menu: {
    cover: { face: "poster-center" },
    chapter: { face: "hall-label-chapter" },
    content: {
      points: { face: "quiet-frame" },
      list: { face: "bento-panel" },
      comparison: { face: "two-column" },
      process: { face: "rail-numbered" },
      data: { face: "split-band" },
      photo: { face: "image-split" },
      statement: { face: "statement" },
      fact: { face: "stat-hero" },
      evidence: { face: "one-evidence" },
      hierarchy: { face: "asymmetric-triptych" },
    },
    ending: { face: "exit-word-ending" },
  },
} satisfies BuiltinThemeDeclaration;
