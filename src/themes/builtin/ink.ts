import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * ink（水墨国风）——2026-07-10 用户裁决新增的「真创意」子类之二（用户
 * 点名的古风/中国风例子）。宣纸米底 + 墨黑 + 朱砂红 + 楷体标题（KaiTi
 * 在 CJK 导出安全白名单内），面向传统文化/节日/国潮/茶酒场景。
 *
 * **v3 重设计（2026-08-18，`.issues/2026-08-18-theme-redesign/ink/decisions.md`
 * 的 1a「素」方向，马远式克制）**：色板整体提亮半档、把墨压到焦墨、把
 * 留白拉开。逐条来历：
 *   - `bg` `#F5F0E6` → `#F7F2E7`：宣纸底再亮一点，给焦墨标题让出对比空间。
 *     `defaultBackgrounds` 四页型同步（这四条本来就是 `bg` 的复制，
 *     `full-slide-svg.tsx` 真正画的是它们，改 `bg` 不同步等于没改）。
 *   - `surface` `#FBF8F1` → `#FCF9F2`：面板比纸底再白一档，卡片边界靠明度
 *     差而不是描边说话。也是 InkMotif 印章内嵌白描边取的色。
 *   - `primary` `#2B2B2B` → `#1F1C18`：中性炭灰 → 带暖调的焦墨。水墨的黑
 *     从来不是纯灰，偏暖才像墨。
 *   - `border` `#DED5C2` → `#DCD2BD`：分隔线随纸底一起压暗半档，免得在更亮
 *     的底上糊掉。
 *   - `chartPalette` 首色跟着 `primary` 走（`#2B2B2B` → `#1F1C18`），其余
 *     三色不动——它们本来就是这个主题的墨/朱砂/褐/黄土四色序列。
 *   - `shape.gapScale` 1.15 → 1.3：分配表给 ink 的留白档位是 airy
 *     （`structure-map.md` 定稿分配表），1.15 只到 medium。
 *   - `text` `#262421` 与 `accent` `#C3272B` **不动**：焦墨正文与朱砂在 1a
 *     方向里原样保留。
 *
 * 对比度实测（新底 `#F7F2E7`，`registerTheme` 的 3:1 硬闸与
 * `full-matrix-contrast.test.ts` 的 4.5:1 muted 线都要过）：
 * text 13.86:1、muted 5.54:1、primary 15.20:1、accent 5.16:1。
 *
 * 装饰见 `src/motifs/motif-ink-motif.tsx`（第八波：封面左下半山，内容
 * 右缘落款列，ending 右下半山，章节退让）。封面见
 * `src/layouts/cover-vertical-title-cover.tsx`（竖题 + 朱砂印）。
 * 四页 defaultBackgrounds 保持宣纸米，不改角色色。
 *
 * **菜单分派（S1-B）**：留白是水墨的第一性，points 因此改用居中透气的 quiet-frame 而不是带页码水印的窄栏，evidence 的展品腔与它相斥，不上。
 */
export const INK_TOKENS: StyleTokens = {
  id: "ink",
  colors: {
    bg: "#F7F2E7", // 宣纸米。页底，正文墨压它 13.86:1，答 4.5
    surface: "#FCF9F2", // 面板纸。卡面，正文墨压它 14.72:1，答 4.5
    primary: "#1F1C18", // 焦墨。可作正文，也可作色块承白字 16.97:1，答 4.5
    accent: "#C3272B", // 朱砂。作大字与印，压 bg 5.16:1，答 3.0，不承小字
    text: "#262421",
    muted: "#686056", // post-v0.3 W8 fix round补测（backlog 5a，content-matrix 色调混合格底色缺口，task-2 审校发现）：明度再下调校准 4.5:1（原 #756C60 为首轮校准值，更早为 #8A8071，保色相/饱和度）。v3 换底后复测 5.54:1，仍过线，不动。
    border: "#DCD2BD", // 分隔线，永不承字，不答文字门槛
    danger: "#9E1B1E", // 银朱。kpi 箭头当字，压 surface 7.60:1，答 4.5
    warning: "#A05A22", // 赭石。只作线与图标，压 surface 5.02:1，不答文字门槛
    success: "#2F6B4A", // 石绿。kpi 箭头当字，压 surface 6.01:1，答 4.5
    // 四格只作色块与标记，永不承字。前三格不直接答文字门槛。
    // c3 黄土压 bg 2.23:1，不答文字门槛。
    chartPalette: ["#1F1C18", "#C3272B", "#8A8071", "#B5A36F"],
  },
  fonts: {
    heading: ["KaiTi", "楷体", "SimSun", "宋体", "serif"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: { radius: 8, gapScale: 1.3 }, // 圆角柔和（水墨无锋，用户裁决）+ v3 留白拉到 airy 档
  defaultBackgrounds: {
    cover: { kind: "color", value: "#F7F2E7" },
    chapter: { kind: "color", value: "#F7F2E7" },
    content: { kind: "color", value: "#F7F2E7" },
    ending: { kind: "color", value: "#F7F2E7" },
  },
};

export const INK_THEME = {
  version: 2,
  id: "ink",
  label: "Ink",
  story: {
    name: "Ink",
    story: "Rice paper, ink black, a seal of cinnabar, headings set in kaishu. Text can stand vertically, the way a scroll does.",
    positioning: "Choose it for culture, calligraphy, tea, festivals, and any story that wants the register of the literati.",
    audience: "A society, curator, or host speaking to guests who read slowly.",
    notFor: "Corporate reporting, dashboards, or Latin-heavy copy.",
    lineage: "Chinese ink painting and the hanging scroll.",
  },
  style: INK_TOKENS,
  brand: { suppressFooterRule: true, suppressFooterMeta: true },
  menu: {
    cover: { face: "vertical-title-cover" },
    chapter: { face: "volume-slip-chapter" },
    content: {
      points: { face: "quiet-frame" },
      list: { face: "bento-panel" },
      comparison: { face: "two-column" },
      process: { face: "rail-numbered" },
      data: { face: "split-band" },
      photo: { face: "image-split" },
      statement: { face: "statement" },
      quote: { face: "pull-quote" },
      fact: { face: "stat-hero" },
      hierarchy: { face: "asymmetric-triptych" },
    },
    ending: { face: "seal-close-ending" },
  },
  motif: { id: "ink-motif" },
} satisfies BuiltinThemeDeclaration;
