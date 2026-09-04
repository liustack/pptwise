import type { SvgTemplateProps } from "./types"
import { stepAside } from "../render/step-aside"
import type { LayoutDefinition } from "./registry"
import { SvgContent } from "../render/svg-content"
import { chapterNumberFor, contentIndexInChapter } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitEmphasisHeading, fitEmphasisLine, headingEmphasisPaint, renderEmphasisHeading, renderEmphasisText } from "../render/emphasis"
import { accessibleInk, readableOn } from "../render/ink"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { tryContentHeadingTreatment } from "../render/heading-treatments/render"

/**
 * rail-numbered content layout（spec §3.2，Wave 3 Task 18）：grammar break
 * ("换骨") vs. the other legacy themes' section-name-kicker + plain-heading
 * layout. Instead: a "{chapter}.{content-in-chapter}" number badge replaces
 * the old kicker (the content-in-chapter index comes from
 * `contentIndexInChapter`, derive.ts). The face's former left progress track
 * ("rail") was cut by author ruling (2026-09-01): across themes it read as a
 * stray vertical line beside the content, and the badge alone already says
 * where the slide sits. The face id keeps its historical name. The heading
 * sits to the right of the badge, vertically centered on it. Extracted from
 * templates/thesis.tsx 的 `BCGEmeraldContent`（390-531 行，Step A 实测边界，
 * 比 brief 给出的 390-558 短——558 行已进入下一节"Ending"的头注释）。随迁
 * helper：无——本函数消费的 `SvgContent`/`chapterNumberFor`/
 * `contentIndexInChapter`/`fitHeadingLines`/`fitSvgLine`/`fitEmphasisLine`/
 * `renderEmphasisText` 均是 svg 或 pptx-preview 下的公共 helper（经
 * import 消费，非 templates 文件私有），照常 import，不复制。函数消费的模块
 * 级私有几何常量（`BADGE_*`/`TITLE_*`/`CONTENT_*`/`SUBHEADING_*`/
 * `BASELINE_FUDGE_RATIO`——均是像素/比例数值，非颜色）随函数体一并复制为本
 * 文件私有常量，不建公共 util（同 chapter-rail-chapter.tsx 对 `CH_DOT_*`
 * 的处理）。
 *
 * 替换表（Step B，逐十六进制核实，对照 themes/thesis.ts 的 colors。
 * 十六进制值本身不抄进本注释——避免污染本文件的 grep 清零门，同
 * cover-left-anchor.tsx 先例）：
 *   - `colors.primary`：源函数已直接消费 `ctx.colors.primary`（
 *     节点/徽章底色），未烤死，原样保留。
 *   - 源文件私有常量 `TEXT`  → `ctx.colors.text`  —— 逐字符精确匹配。
 *   - 源文件私有常量 `MUTED` → `ctx.colors.muted` —— 逐字符精确匹配。
 *   - `colors.text`/`colors.primary`（`renderEmphasisText` 的
 *     accent/baseFill 入参）：源函数已直接消费，未烤死，原样保留。
 * 两处烤死常量都在 thesis 的 token 表里有精确匹配，**无孤儿色**。
 *
 * 白字例外（同 chapter-rail-chapter.tsx / cover-left-anchor.tsx 先例）——
 * **W4 fix round 前**：徽章文字曾固定写死纯白字面量，注释断言"任意主题色下
 * 都可读"。全矩阵扫描推翻了这个断言（多个主题的 `colors.primary` 明度偏
 * 高，白字对比度精确 1.00-1.14:1）——同 cover-left-anchor.tsx/content-
 * banner-heading.tsx 的根因（baked 白字 on 自画 `colors.primary` 色块，未
 * 检查该色块本身的明度）。
 *
 * 对比度自适应修复（W4 fix round，根因处置）：徽章文字改用
 * `readableOn(colors.primary)`——徽章底色（本文件自画的 `<rect>`）就是文字
 * 唯一的背景来源，不依赖页面级默认背景。
 *
 * **档位一・逐字节等价**（两处烤死常量都精确匹配 token 值，无孤儿色）。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量——heading/subheading/徽章三处
 * 均已改为 token 或 `../render/ink` 调用，grep 清零门预期不再命中任何纯白字面量。
 */

// Shared vertical-centering convention (see brief.tsx's assertion
// banner for the original derivation, also copied privately into
// cover-left-anchor.tsx): for a single line at `fontSize`, `pivotY +
// round(fontSize * 0.32)` lands the baseline visually centered on `pivotY`;
// multi-line blocks spread symmetrically around the same pivot.
const BASELINE_FUDGE_RATIO = 0.32


// BADGE_Y=96 (not 64) keeps the badge clear of Branding's tl logo band
// (x 64-160, y 48-88) — mirrors the Cover confLabel fix (see
// cover-left-anchor.tsx's own y=104 equivalent).
const BADGE_X = 96
const BADGE_Y = 96
const BADGE_W = 64
const BADGE_H = 32
const BADGE_RADIUS = 6
const BADGE_CENTER_X = BADGE_X + BADGE_W / 2
const BADGE_CENTER_Y = BADGE_Y + BADGE_H / 2 // 112
const BADGE_FONT_SIZE = 16
// Inner padding so long labels (e.g. "12.10") don't touch the badge's rounded
// corners before fitSvgLine kicks in.
const BADGE_TEXT_MAX_W = BADGE_W - 8

const TITLE_X = 180
const TITLE_MAX_W = 1000

const CONTENT_X = 96
const CONTENT_W = 1088
const CONTENT_BOTTOM_BASE = 640
// -> 620 with a footnote, the same shrink `banner-heading` (a flat 620) and
// `split-band` (640 minus 20) already apply. Without it the content rect
// floored at 640 while a 14px footnote's ink starts at 633.75, so the rect a
// stretched component fills ran 6.25px *into* the footnote. Measured on
// `layout--rail-numbered--zh` (4x raster): the body ink and the footnote ink
// used to form one unbroken band down the page, and now read as two.
const CONTENT_BOTTOM_FOOTNOTE_SHRINK = 20
const CONTENT_GAP = 36 // gap between the title's last line and the content rect

// Subheading: a 22px accent "so-what" sentence below the badge/title row.
// Occupies a slot (22px line + gap) added to the content rect's y *only*
// when `slide.subheading` is set, so a slide without one gets byte-identical
// geometry to before this feature existed. subheadingY = titleLastY + 41
// (subheading ascent + target visual gap + glyph-descent fudge, six-theme
// unified formula — see templates/thesis.tsx's own S3b note for the
// full derivation this was ported from).
const SUBHEADING_FONT_SIZE = 22
const SUBHEADING_MIN_FONT_SIZE = 16
const SUBHEADING_SLOT = 45

export function RailNumberedContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const treated = tryContentHeadingTreatment(
    { ir, slide, index, ctx },
    { rects: [{ x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_H }] },
  )
  const { colors, fonts } = ctx

  // A content slide with no chapter before it (malformed/edge-case deck) is
  // clamped to chapter 1 rather than showing "0.n".
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const contentNum = contentIndexInChapter(ir.slides, index)
  const badgeLabel = fitSvgLine(`${chNum}.${contentNum}`, {
    maxWidth: BADGE_TEXT_MAX_W,
    fontSize: BADGE_FONT_SIZE,
    minFontSize: 16,
  })

  const heading = fitEmphasisHeading(slide.heading, {
    maxWidth: TITLE_MAX_W,
    fontSize: 40,
    maxLines: 2,
    minPt: 24,
    fontFamily: fonts.heading,
  })
  const headingFudge = Math.round(heading.fontSize * BASELINE_FUDGE_RATIO)
  const titleLastY =
    BADGE_CENTER_Y + ((heading.lines.length - 1) * heading.lineHeight) / 2 + headingFudge

  // thesis's own `colors.accent` (emerald) measures well below even WCAG
  // AA's 3:1 floor for *large* text against the off-white content bg, let
  // alone the 4.5:1 floor this 22px/regular-weight line actually needs — so,
  // like navy, this theme substitutes `colors.primary` (measured
  // sufficient contrast) as the subheading's base color instead of the usual
  // `colors.accent` (see the task report's contrast table).
  //
  // W4 fix round: that substitution was itself a fixed per-theme assumption
  // baked into the layout (colors.primary passes for thesis, but
  // full-matrix scanning found rally's own colors.primary falls to
  // 3.49:1 against rally's own content background — same defect class
  // as content-banner-heading.tsx's identical primary-for-accent
  // substitution). `subheadingFill` below keeps colors.primary when it
  // already clears the ratio (every theme this substitution was actually
  // built for does) and falls back to readableOn's neutral ink otherwise.
  const subheading = fitEmphasisLine(slide.subheading, {
    maxWidth: TITLE_MAX_W,
    fontSize: SUBHEADING_FONT_SIZE,
    minFontSize: SUBHEADING_MIN_FONT_SIZE,
  })
  const subheadingY = titleLastY + 41
  const subheadingFill = subheading
    ? accessibleInk(colors.primary, ctx.defaultBg ?? colors.bg, subheading.fontSize)
    : colors.primary

  const contentRectY = titleLastY + CONTENT_GAP + (subheading ? SUBHEADING_SLOT : 0)
  const contentBottom = slide.footnote
    ? CONTENT_BOTTOM_BASE - CONTENT_BOTTOM_FOOTNOTE_SHRINK
    : CONTENT_BOTTOM_BASE
  const contentRect = {
    x: CONTENT_X,
    y: contentRectY,
    w: CONTENT_W,
    h: Math.max(0, contentBottom - contentRectY),
  }

  const footnote = slide.footnote
    ? fitSvgLine(slide.footnote, { maxWidth: CONTENT_W, fontSize: 16, minFontSize: 16 })
    : null

  if (treated) {
    const titleY = treated.titleY ?? BADGE_CENTER_Y + Math.round(40 * BASELINE_FUDGE_RATIO)
    const titleSize = treated.titleSize ?? 40
    const badgeCenterY = titleY - Math.round(titleSize * BASELINE_FUDGE_RATIO)
    const badgeY = Math.round(badgeCenterY - BADGE_H / 2)
    const treatedRect = {
      x: CONTENT_X,
      y: treated.contentRect.y,
      w: CONTENT_W,
      // cycle_loop paints up to 480px regardless of the slot. A treated
      // heading starts lower than the native rail title, so the remaining
      // 640-y slot is shorter than that cap and the ring's last
      // descriptions overflow the audit rect. Keep the slot tall enough
      // for that self-bounded form.
      h: Math.max(480, contentBottom - treated.contentRect.y),
    }
    const treatedAside = stepAside({ face: "rail-numbered", slide, ctx, bodyRect: treatedRect })
    if (treatedAside) return treatedAside
    return (
      <>
        {treated.chrome}
        <rect
          x={BADGE_X}
          y={badgeY}
          width={BADGE_W}
          height={BADGE_H}
          rx={ctx.shape?.radius ?? BADGE_RADIUS}
          fill={colors.primary}
        />
        <text
          data-truncated={badgeLabel.truncated ? "1" : undefined}
          x={BADGE_CENTER_X}
          y={badgeCenterY + Math.round(badgeLabel.fontSize * BASELINE_FUDGE_RATIO)}
          fontFamily={fonts.body}
          fontSize={badgeLabel.fontSize}
          fontWeight="700"
          fill={readableOn(colors.primary)}
          textAnchor="middle"
          dominantBaseline="alphabetic"
        >
          {badgeLabel.text}
        </text>
        <SvgContent components={slide.components} rect={treatedRect} ctx={ctx} />
        {footnote && (
          <text
            data-truncated={footnote.truncated ? "1" : undefined}
            x={CONTENT_X}
            y={footnoteBaselineFor(footnote.fontSize)}
            fontFamily={fonts.body}
            fontSize={footnote.fontSize}
            fill={colors.muted}
            fontStyle="italic"
            dominantBaseline="alphabetic"
          >
            {footnote.text}
          </text>
        )}
      </>
    )
  }

  // The numbered badge column and the heading block both take height off the
  // top of the body band, and the footnote takes more off the bottom.
  const aside = stepAside({ face: "rail-numbered", slide, ctx, bodyRect: contentRect })
  if (aside) return aside

  return (
    <>
      {/* "{chapter}.{content}" number badge, replacing the old section kicker */}
      <rect
        x={BADGE_X}
        y={BADGE_Y}
        width={BADGE_W}
        height={BADGE_H}
        rx={ctx.shape?.radius ?? BADGE_RADIUS}
        fill={colors.primary}
      />
      <text
        data-truncated={badgeLabel.truncated ? "1" : undefined}
        x={BADGE_CENTER_X}
        y={BADGE_CENTER_Y + Math.round(badgeLabel.fontSize * BASELINE_FUDGE_RATIO)}
        fontFamily={fonts.body}
        fontSize={badgeLabel.fontSize}
        fontWeight="700"
        fill={readableOn(colors.primary)}
        textAnchor="middle"
        dominantBaseline="alphabetic"
      >
        {badgeLabel.text}
      </text>

      {/* Heading, vertically centered against the badge row */}
      {renderEmphasisHeading(
        heading,
        headingEmphasisPaint(ctx, heading, { baseFill: colors.text, fontWeight: "600", fontFamily: fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={
            BADGE_CENTER_Y -
            ((heading.lines.length - 1) * heading.lineHeight) / 2 +
            i * heading.lineHeight +
            headingFudge
            }
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="600"
            fill={colors.text}
            dominantBaseline="alphabetic"
            />
        ),
      )}

      {/* Subheading: accent so-what sentence below the badge/title row */}
      {subheading &&
        renderEmphasisText(
          subheading.segments,
          {
            accent: colors.text,
            padFill: colors.accent,
            baseFill: subheadingFill,
            fontWeight: "700",
            emphasis: ctx.emphasis,
          },
          <text
            data-truncated={subheading.truncated ? "1" : undefined}
            x={TITLE_X}
            y={subheadingY}
            fontFamily={fonts.body}
            fontSize={subheading.fontSize}
            fill={subheadingFill}
            dominantBaseline="alphabetic"
          />,
        )}

      {/* Content components below the title row (was a divider + foreignObject) */}
      <SvgContent components={slide.components} rect={contentRect} ctx={ctx} />

      {/* Footnote only — Branding already renders the y=664 footer
       * hairline for content pages, so this layout must not draw its own
       * line down there (see brief.tsx's fix-wave note on the same
       * double-hairline bug). */}
      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x={CONTENT_X}
          y={footnoteBaselineFor(footnote.fontSize)}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={colors.muted}
          fontStyle="italic"
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </>
  )
}

// T1d (src domain reorg wave 1): inlined verbatim from registry.ts's former
// CONTENT_LAYOUT_DEFS["rail-numbered"] entry. Slot `accepts: []` means the slot is not fed by an authored
// component. That empty array used to live as a private alias in registry.ts
// and is inlined here as the literal `[]` it always held, to avoid a value-import
// cycle with the registry aggregator (which value-imports this export) — see
// registry.ts's slot-`accepts` convention doc for what `[]` means. The body
// slot's capacity comment is reworded from "see file header derivation" to
// name registry.ts explicitly, since that derivation essay lives in
// registry.ts's CONTENT_LAYOUT_DEFS aggregation block, not in this file.
export const layoutDef: LayoutDefinition = {
  // content-rail-numbered.tsx: "{chapter}.{n}" number badge replacing the
  // usual kicker, heading, subheading, SvgContent body (arrangement passed
  // through), italic footnote (meta). The face's former left progress track
  // was cut by author ruling (2026-09-01): across themes it read as a stray
  // vertical line, and the badge alone already carries the position.
  id: "rail-numbered",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 }, // single-stack — see registry.ts's CONTENT_LAYOUT_DEFS header for the derivation
    { name: "meta", accepts: [] },
  ],
}
