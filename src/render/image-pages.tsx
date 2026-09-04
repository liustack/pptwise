import { Fragment, type ReactNode } from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "../layouts/registry"
import { renderComponent, measureComponent } from "../components"
import { layoutContentFit, stackBottom } from "./layout"
import { DroppedContentMarker } from "./drop-marker"
import { findImageSelection, singlePictureExact } from "../layouts/find-image"
import { CANVAS_W_PX, CANVAS_H_PX } from "../constants"
import { layoutSvgText, fitSvgLine } from "../lib/svg-text-layout"
import { scaleTypePx } from "./heading-fit"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
} from "./emphasis"
import { accessibleInk } from "./ink"
import { showsDocumentMeta } from "./document-meta"
import { SvgContent } from "./svg-content"
import type { PageRenderContext } from "./page-context"

/**
 * 压图页与出血 split 页（图片排版 polish，2026-07-09 用户反馈驱动）。
 *
 * 模板文字色是各主题 baked 常量、无法反色，因此压图场景不走模板 Body，
 * 由这里的 bespoke 全页版式接管（Branding/Decor 照常）——参考 ppt-master
 * 的压图页版式本就趋同：暗遮罩 + 白字大标题，主题个性保留在 accent 细节。
 *
 * **四处标题墨改走 `accessibleInk`（2026-08-20 柔和组皮肤重设计）**：本文件
 * 的四个 bespoke 版式（image-split / image-top / image-bottom /
 * image-annotate）都把标题直接刷成 `ctx.colors.primary`——一个 baked ink，
 * 画在自己不控制明度的页底色上。这正是 W4 fix round 用 `ink.ts` 的
 * `accessibleInk` 根治过的那枚缺陷，深底组（2026-08-19）又在另外四个共享
 * 版式上修过一遍，这里是同型的第五处、当时漏掉的一处。
 *
 * 不是本轮才坏的：改动前实测 `auditDeck`，luxe（primary 压 bg 1.08:1）、
 * insight（1.14）、tech（1.31）三家在这四个版式上各报 5 条 low-contrast，
 * 一共十五条，早在本轮之前就在报。柔和组把 campaign 的 primary 从品红翻成
 * 舞台暗紫（`themes/campaign.ts` 的逐条来历）之后，campaign 会成为第四家
 * ——与其给它开例外，不如把这处共享版式的根因一起修掉：`accessibleInk`
 * 在 primary 本就过线时逐字节不变（其余 13 家），过不了线时回落
 * `readableOn` 的中性墨。全 17 主题实测见本轮报告。
 */
const W = CANVAS_W_PX
const H = CANVAS_H_PX

function MissingRequiredImageMarker({ slide }: { slide: Slide }) {
  return <DroppedContentMarker count={Math.max(1, slide.components.length)} />
}

/** 通用回落版式的版心：三个出血 takeover 共用一套几何。 */
const FALLBACK_MARGIN_X = 88
const FALLBACK_HEAD_TOP = 66
const FALLBACK_BOTTOM = 648

/**
 * The whole page, drawn plainly, when a takeover's single picture frame
 * cannot hold what the author wrote — see `singlePictureExact`.
 *
 * One geometry for `image-split`, `image-top` and `image-bottom` rather than
 * three: past the guard these pages are no longer a bleed composition of any
 * kind, they are "draw everything, honestly", and the ordinary component
 * renderer is what draws a grid with its captions and a compare with both
 * sides. `image-annotate` keeps its own fallback, whose geometry predates
 * this one.
 */
function TakeoverFallbackPage({ slide, ctx }: { slide: Slide; ctx: ComponentCtx }) {
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const contentW = W - FALLBACK_MARGIN_X * 2
  const title = fitEmphasisText(slide.heading, {
    maxWidth: contentW,
    fontSize: scaleTypePx(34, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.2,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(contentW, 900),
    fontSize: 18,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  let cursor = FALLBACK_HEAD_TOP
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + 8
  const subY = cursor + sub.lineHeight - 8
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 6
  const bodyTop = cursor + 22
  return (
    <g data-takeover-mode="fallback">
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: accessibleInk(ctx.colors.primary, bg, title.fontSize),
          fontWeight: "600",
          fontFamily: ctx.fonts.heading,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={FALLBACK_MARGIN_X}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
            x={FALLBACK_MARGIN_X}
            y={subY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <SvgContent
        components={slide.components}
        rect={{ x: FALLBACK_MARGIN_X, y: bodyTop, w: contentW, h: Math.max(80, FALLBACK_BOTTOM - bodyTop) }}
        ctx={ctx}
      />
    </g>
  )
}

/** 暗 scrim：上浅下深三段（文字集中在中下部），图保持清晰可辨。 */
function DarkScrim() {
  return (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#0A0E14" fillOpacity={0.3} />
      <rect x={0} y={Math.round(H * 0.55)} width={W} height={Math.round(H * 0.45)} fill="#0A0E14" fillOpacity={0.28} />
      <rect x={0} y={Math.round(H * 0.78)} width={W} height={Math.round(H * 0.22)} fill="#0A0E14" fillOpacity={0.3} />
    </>
  )
}

/**
 * cover/chapter 的 asset 背景页：清晰大图 + 暗遮罩 + 白字（左下构图）。
 */
export function ImageCoverPage({
  ir,
  slide,
  index,
  ctx,
  page,
}: {
  ir: PptxIR
  slide: Slide
  index: number
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  const accent = ctx.colors.accent
  const isChapter = slide.type === "chapter"
  const org = page.metadataOn ? ir.meta.organization : undefined
  const date = showsDocumentMeta(page, ir, slide) ? ir.meta.date : undefined

  const title = fitEmphasisText(slide.heading, {
    maxWidth: 1030,
    fontSize: scaleTypePx(isChapter ? 60 : 68, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.12,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: 980,
    fontSize: 27,
    maxLines: 2,
    lineHeightRatio: 1.25,
  })
  // 左下构图：从底部往上倒推（页脚区 ~88px 留给 Branding）
  const subH = sub.lines.length ? sub.lines.length * sub.lineHeight + 18 : 0
  const titleH = title.lines.length * title.lineHeight
  const baseY = H - 118 - subH
  const titleTopY = baseY - titleH + title.lineHeight - 10

  // chapter 大序号（第 N 个 chapter）
  let chapterNo = 0
  for (let i = 0; i <= index && i < ir.slides.length; i++) {
    if (ir.slides[i].type === "chapter") chapterNo++
  }

  return (
    <g>
      <DarkScrim />
      {isChapter && (
        <text
          x={96}
          y={titleTopY - titleH - 34}
          fontSize={30}
          fontWeight={700}
          fontFamily={ctx.fonts.heading}
          fill={accent}
          dominantBaseline="alphabetic"
        >
          {String(Math.max(1, chapterNo)).padStart(2, "0")}
        </text>
      )}
      {org && (
        <text
          x={96}
          y={104}
          fontSize={21}
          fontFamily={ctx.fonts.body}
          fill="#FFFFFF"
          fillOpacity={0.85}
          letterSpacing={2}
          dominantBaseline="alphabetic"
        >
          {org}
        </text>
      )}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: "#FFFFFF", accent: accent, fontWeight: "700", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            x={96}
            y={titleTopY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={700}
            fontFamily={ctx.fonts.heading}
            fill="#FFFFFF"
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={96} y={baseY + 16} width={92} height={5} fill={accent} />
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: "#FFFFFF", accent: accent, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            x={96}
            y={baseY + 52 + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill="#FFFFFF"
            fillOpacity={0.88}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {!isChapter && date && (
        <text
          x={W - 96}
          y={104}
          textAnchor="end"
          fontSize={19}
          fontFamily={ctx.fonts.body}
          fill="#FFFFFF"
          fillOpacity={0.75}
          dominantBaseline="alphabetic"
        >
          {date}
        </text>
      )}
      <DroppedContentMarker count={slide.components.length} />
    </g>
  )
}

const SPLIT_IMG_W = 540
const SPLIT_TEXT_X = 620
const SPLIT_TEXT_W = W - SPLIT_TEXT_X - 96
/** 图列垂直通栏（2026-07-09 用户裁决）：Branding 对 image_split 页
 * 已整页抑制页脚，无压图问题。 */
const SPLIT_IMG_H = H

/**
 * image_split 出血版式：左列全高出血大图（页顶到页底、贴左缘，无框线），
 * 右栏 kicker + 大标题 + accent 短线 + 副题 + components 的排印层次。
 * 无 image 块时回落 null（调用方走模板正常路径）。
 */
export function ImageSplitPage({
  ir,
  slide,
  ctx,
  page,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  if (!singlePictureExact(slide)) return <TakeoverFallbackPage slide={slide} ctx={ctx} />
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  const { image: imageComponent, source: imageSource } = imageSelection
  // 图文范式族（ppt-master P04 右图出血）：image_side=right 时整页镜像——
  // 图列贴右缘、文字区在左。
  const rightSide = slide.image_side === "right"
  const imgX = rightSide ? W - SPLIT_IMG_W : 0
  const textX = rightSide ? 96 : SPLIT_TEXT_X
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：this takeover bypasses
  // `components/image.tsx` entirely (`full-slide-svg.tsx`'s takeover
  // dispatch), so it needs its own `aria-label` emission — same
  // only-when-present rule as that file's own `<image>`.
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)
  const org = page.metadataOn ? ir.meta.organization : undefined

  // fontWeight 600 而非 700：magazine/creative 的衬线 heading（SimSun/Lora）
  // 被 700 合成加粗抹掉衬线特征——降字重提字号保气势。拟合必须带 bold +
  // heading 字体：Regular 估算会把「Competitors are pricing」收成一行，
  // SimSun 600 实宽超出 SPLIT_TEXT_W。
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: SPLIT_TEXT_W,
    fontSize: scaleTypePx(44, ctx.shape?.typeScale),
    maxLines: 3,
    minPt: 22,
    lineHeightRatio: 1.18,
    fontFamily: ctx.fonts.heading,
    bold: true,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: SPLIT_TEXT_W,
    fontSize: 21,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  let cursor = 128
  const kickerY = cursor
  cursor += 46
  const titleY = cursor + title.lineHeight - 12
  cursor += title.lines.length * title.lineHeight + 18
  const ruleY = cursor
  cursor += 30
  const subY = cursor + 6
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 24
  const componentsTop = cursor + 8
  const componentsH = H - 96 - componentsTop
  const { placed, dropped } = layoutContentFit(
    "single",
    rest,
    { x: textX, y: componentsTop, w: SPLIT_TEXT_W, h: Math.max(120, componentsH) },
    ctx,
  )

  return (
    <g>
      {src ? (
        <image
          href={src}
          x={imgX}
          y={0}
          width={SPLIT_IMG_W}
          height={SPLIT_IMG_H}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={imgX} y={0} width={SPLIT_IMG_W} height={SPLIT_IMG_H} fill={ctx.colors.surface} />
      )}
      {imageComponent.caption &&
        (() => {
          const fitted = fitSvgLine(imageComponent.caption, {
            maxWidth: SPLIT_IMG_W - 48,
            fontSize: 16,
            minFontSize: 16,
          })
          return (
            <>
              <rect x={imgX} y={SPLIT_IMG_H - 44} width={SPLIT_IMG_W} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <text
                data-truncated={fitted.truncated ? "1" : undefined}
                x={imgX + 24}
                y={SPLIT_IMG_H - 17}
                fontSize={fitted.fontSize}
                fontFamily={ctx.fonts.body}
                fill="#FFFFFF"
                fillOpacity={0.92}
                dominantBaseline="alphabetic"
              >
                {fitted.text}
              </text>
            </>
          )
        })()}
      {org && <rect x={textX} y={kickerY - 13} width={13} height={13} fill={ctx.colors.accent} />}
      {org && (
        <text
          x={textX + 24}
          y={kickerY}
          fontSize={17}
          fontFamily={ctx.fonts.body}
          fill={ctx.colors.muted}
          letterSpacing={2}
          dominantBaseline="alphabetic"
        >
          {org}
        </text>
      )}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize), fontWeight: "600", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={textX}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={textX} y={ruleY} width={72} height={4} fill={ctx.colors.accent} />
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            x={textX}
            y={subY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {placed.map((p, i) => (
        <Fragment key={i}>{renderComponent(p.component, p.box, ctx)}</Fragment>
      ))}
      {/* Recorded, never painted — and the export refuses to ship it.
          See `DroppedContentMarker`'s own doc comment. */}
      <DroppedContentMarker count={dropped} />
    </g>
  )
}

/**
 * image_top 顶图的高度边界（2026-08-31 金样人审 L 项）。
 *
 * 原来顶图是一个固定 356 的常量，下方文字轻的时候（一个 heading + 一条
 * callout）页底会空出近 180px 死白。治本的分工是：文字块按内容量出自然高度，
 * 图片当弹性件吃掉剩下的空间。
 *
 * MIN 取 356 就是今天的固定值，作为不回归的锚：内容重的页面算出来的图高会
 * 撞到下界，与改动前逐字节相同。MAX 取 480 是上界，防止内容极轻时顶图涨到
 * 把整页压成封面式的压图页，丢掉 P05「顶图 + 图下分栏」的版式识别度。
 */
const TOP_IMG_H_MIN = 356
const TOP_IMG_H_MAX = 480
/**
 * 图下一个文字块都没有时（photo 页只带一张图，image_grid / image_compare 被
 * takeover 收成单张主视觉也是这一档）的顶图上界。
 *
 * 走通用公式的话，空正文仍然要按 `TOP_BODY_MIN_H` 预留 100px 的分栏带，图被
 * 480 封顶，页底剩下近 190px 的死区，标题又贴着图底 42px——版面读起来是"没内容"
 * 而不是"一张大图配一行图注"。没有分栏可分的时候本就不需要分栏带：图长到
 * 标题带正上方，剩下的空间全部换成标题的上下呼吸。
 */
const TOP_IMG_H_MAX_CAPTION_ONLY = 520
/** 无正文档的图底到标题首行基线（通用档是 42，这里给标题让出呼吸）。 */
const TOP_CAPTION_TITLE_GAP = 62
/** 无正文档的细线到页底安全边距之间的留白，与图底那侧大致对称。 */
const TOP_CAPTION_RULE_GAP_BOTTOM = 42
/** 正文带的最薄高度，沿用原来分栏 rect 里 `Math.max(100, ...)` 的下限语义。 */
const TOP_BODY_MIN_H = 100
/**
 * 图底缘到分栏顶的「标题带」节奏，三个数字原样保留自固定图高时代的几何：
 * 图底到首行基线 42，基线到贯穿细线 12，细线到分栏顶 32。
 */
const TOP_TITLE_GAP = 42
const TOP_RULE_GAP = 12
const TOP_BODY_GAP = 32
/** 页底安全边距。 */
const TOP_SAFE_BOTTOM = 84
const BAND_PAD_X = 96

/**
 * image_top 顶图分栏（ppt-master P05）：上半全幅出血图（贴顶三边）+
 * 图下细标题行 + 下方文字 components 自动分列（2-3 块横排，1 块单栏）。
 * 无 image 块回落 null（调用方走模板路径）。
 */
export function ImageTopPage({
  ir: _ir,
  slide,
  ctx,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  if (!singlePictureExact(slide)) return <TakeoverFallbackPage slide={slide} ctx={ctx} />
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  const { image: imageComponent, source: imageSource } = imageSelection
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：见 ImageSplitPage 同名变量的注释。
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)

  // 2-3 个文字块横向分列（P05 三栏），单块全宽。列宽只跟块数有关，不依赖图高，
  // 所以可以先定列宽，再按列宽量文字，最后才算图高。
  const n = Math.max(1, Math.min(rest.length, 3))
  const colGap = 40
  const colW = (W - BAND_PAD_X * 2 - colGap * (n - 1)) / n

  const titleMaxW = W - BAND_PAD_X * 2 - 120
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: titleMaxW,
    fontSize: scaleTypePx(30, ctx.shape?.typeScale),
    maxLines: 2,
    minPt: 18,
    lineHeightRatio: 1.2,
    fontFamily: ctx.fonts.heading,
    bold: true,
  })

  // 文字块按内容量自然高度（最高的一列决定正文带）。这里必须用
  // `measureComponent` 的自然高度，不能拿 `layoutContentFit` 的结果反推：
  // fit 内部会 distributeSurplus 拉伸再 settleToGolden 下沉，结果总会撑满
  // 给它的框，反推出来的高度只会等于框本身。
  const naturalH = rest.slice(0, 3).reduce((max, block) => Math.max(max, measureComponent(block, colW, ctx)), 0)
  const neededH = Math.max(naturalH, TOP_BODY_MIN_H)
  const titleExtra = Math.max(0, title.lines.length - 1) * title.lineHeight
  const headBandH = TOP_TITLE_GAP + titleExtra + TOP_RULE_GAP + TOP_BODY_GAP
  // 图吃掉正文带和标题带之外的所有空间，上下界见常量注释。分栏里一个块都没有
  // 的时候不预留分栏带，图直接长到标题带上沿（见 TOP_IMG_H_MAX_CAPTION_ONLY）。
  const captionOnly = rest.length === 0
  const captionBandH = TOP_CAPTION_TITLE_GAP + titleExtra + TOP_RULE_GAP + TOP_CAPTION_RULE_GAP_BOTTOM
  const imgH = captionOnly
    ? Math.min(TOP_IMG_H_MAX_CAPTION_ONLY, Math.max(TOP_IMG_H_MIN, H - TOP_SAFE_BOTTOM - captionBandH))
    : Math.min(TOP_IMG_H_MAX, Math.max(TOP_IMG_H_MIN, H - TOP_SAFE_BOTTOM - neededH - headBandH))

  // 单行标题时几何跟着图底缘走（原固定图高下为 398 / 发丝 410 / 正文 442）。
  // 换行时发丝和分栏整体下移。
  const firstTitleY = imgH + (captionOnly ? TOP_CAPTION_TITLE_GAP : TOP_TITLE_GAP)
  const lastTitleY = firstTitleY + Math.max(0, title.lines.length - 1) * title.lineHeight
  const ruleY = lastTitleY + TOP_RULE_GAP
  const componentsTop = ruleY + TOP_BODY_GAP
  const componentsH = H - TOP_SAFE_BOTTOM - componentsTop
  const fits = rest.slice(0, 3).map((b, i) => {
    const rect = {
      x: BAND_PAD_X + i * (colW + colGap),
      y: componentsTop,
      w: colW,
      h: Math.max(TOP_BODY_MIN_H, componentsH),
    }
    return layoutContentFit("single", [b], rect, ctx)
  })
  const dropped = rest.length - fits.length + fits.reduce((count, fit) => count + fit.dropped, 0)

  return (
    <g>
      {src ? (
        <image
          href={src}
          x={0}
          y={0}
          width={W}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={0} y={0} width={W} height={imgH} fill={ctx.colors.surface} />
      )}
      {/* 图注压在出血图下缘（与 image-split / image-bottom 同一条 scrim 带）。
          这张脸原来根本不画 caption：一张配了图注的照片、一个 device_mockup
          的说明、一格 image_grid 的图注，被 findImageSelection 选中之后就只
          剩下像素，作者写的那行字一个字都没上过页。 */}
      {imageComponent.caption &&
        (() => {
          const fitted = fitSvgLine(imageComponent.caption, {
            maxWidth: W - BAND_PAD_X * 2,
            fontSize: 16,
            minFontSize: 16,
          })
          return (
            <>
              <rect x={0} y={imgH - 44} width={W} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <text
                data-truncated={fitted.truncated ? "1" : undefined}
                x={BAND_PAD_X}
                y={imgH - 17}
                fontSize={fitted.fontSize}
                fontFamily={ctx.fonts.body}
                fill="#FFFFFF"
                fillOpacity={0.92}
                dominantBaseline="alphabetic"
              >
                {fitted.text}
              </text>
            </>
          )
        })()}
      {/* 标题行：kicker 点 + 标题 + 贯穿细线（图眉/脚注的杂志结构） */}
      <rect x={BAND_PAD_X} y={firstTitleY - 12} width={13} height={13} fill={ctx.colors.accent} />
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize), fontWeight: "600", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={BAND_PAD_X + 26}
            y={firstTitleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={BAND_PAD_X} y={ruleY} width={W - BAND_PAD_X * 2} height={1} fill={ctx.colors.border} />
      {fits.map(({ placed }, ci) => (
        <Fragment key={ci}>
          {placed.map((p, i) => (
            <Fragment key={i}>{renderComponent(p.component, p.box, ctx)}</Fragment>
          ))}
        </Fragment>
      ))}
      <DroppedContentMarker count={dropped} />
    </g>
  )
}

// ── image_annotate 图 + 图旁说明清单 ──
//
// 原版式是「中心图 + 四角放射标注」（ppt-master P09/P16）：四个 accent 圆点
// 钉在图框四角的固定内缩位上，引线用 border 色从角落的文字连过去。
// 2026-08-20 第四轮评审当场拆穿：点落在哪儿跟画面里有什么毫无关系，任何一
// 张图配上去都是同样四个点，引线又淡到几乎看不见——一张假装在指认画面的
// 图。用户裁定：点和线全去掉，标注文字改成图旁的说明清单，诚实的排版，不
// 假装指向画面。
//
// 于是版式改成「左图右单」：白框照片卡占左侧主位（图是主），编号说明清单
// 排在右侧（说明是次），标题与副题左对齐压在页顶，剩余空间全部落到页底
// （见长期记忆 layout-gravity-principle）。标题下那条 56×3 的悬空短黄线
// 同批清除——不贴任何文字墨底的短划线一律不留。
//
// 没有 bullets 时清单栏不存在，图改为居中加宽：一张图的页面就老老实实是
// 一张图的页面。
const ANN_MARGIN_X = 88
/** 标题块顶（版面重力：主体从页顶往下紧排）。 */
const ANN_HEAD_TOP = 62
const ANN_CONTENT_W = W - ANN_MARGIN_X * 2
/** 照片卡与说明栏之间的留白。 */
const ANN_COL_GAP = 48
/** 白框照片卡的框宽（showcase 的 photo-print 质感）。 */
const ANN_FRAME_PAD = 10
/** 带说明清单时的图宽；无清单时用 ANN_SOLO_IMG_W 居中加宽。 */
const ANN_IMG_W = 620
const ANN_SOLO_IMG_W = 760
/** 图的目标宽高比；版心不够时按可用高压缩（标题两行 + 副题两行会发生）。 */
const ANN_IMG_ASPECT = 16 / 9
const ANN_IMG_H_MIN = 232
/** 照片卡底缘的下界，给 caption 与页脚分割线留出空气。 */
const ANN_BODY_BOTTOM = 620
/** caption 基线相对卡底缘的下沉量，以及它在版心里占掉的高度。 */
const ANN_CAPTION_DROP = 30
const ANN_CAPTION_SLOT = 38
/** 序号字沟：说明正文从这里起排，序号右对齐贴住沟的右缘。 */
const ANN_NOTE_INDENT = 34
/** 两条说明之间的行距。 */
const ANN_NOTE_GAP = 26

const ANN_NOTE_X = ANN_MARGIN_X + ANN_IMG_W + ANN_FRAME_PAD * 2 + ANN_COL_GAP
const ANN_NOTE_W = W - ANN_MARGIN_X - ANN_NOTE_X
const ANN_NOTE_TEXT_W = ANN_NOTE_W - ANN_NOTE_INDENT

/** bullets 条目按「：/:」拆 标题+说明（无冒号时整条做标题换行）。 */
function splitAnnotation(item: string): { title: string; desc: string } {
  const m = item.match(/^(.{1,18}?)[：:]\s*(.+)$/)
  if (m) return { title: m[1], desc: m[2] }
  return { title: item, desc: "" }
}

/**
 * image_annotate 图 + 图旁说明清单：左对齐 heading/副题压顶、左侧白框照片
 * 卡（可带 caption）、右侧 bullets 前 4 条排成编号说明清单。
 * 无 image 块回落 null（调用方走模板路径）。
 */
export function ImageAnnotatePage(props: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  if (!singlePictureExact(props.slide)) return ImageAnnotateFallbackPage(props)
  return ImageAnnotateSoloPage(props)
}

/** 这张脸画不下的图组，交给通用组件渲染：每格连图注、对比两侧连标签。 */
function ImageAnnotateFallbackPage({
  slide,
  ctx,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const title = fitEmphasisText(slide.heading, {
    maxWidth: ANN_CONTENT_W,
    fontSize: scaleTypePx(34, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.2,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(ANN_CONTENT_W, 900),
    fontSize: 18,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  let cursor = ANN_HEAD_TOP
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + 8
  const subY = cursor + sub.lineHeight - 8
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 6
  const bodyTop = cursor + 22
  return (
    <g data-annotate-mode="fallback">
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: accessibleInk(ctx.colors.primary, bg, title.fontSize),
          fontWeight: "600",
          fontFamily: ctx.fonts.heading,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={ANN_MARGIN_X}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
            x={ANN_MARGIN_X}
            y={subY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <SvgContent
        components={slide.components}
        rect={{ x: ANN_MARGIN_X, y: bodyTop, w: ANN_CONTENT_W, h: Math.max(80, ANN_BODY_BOTTOM + ANN_CAPTION_SLOT - bodyTop) }}
        ctx={ctx}
      />
    </g>
  )
}

function ImageAnnotateSoloPage({
  ir: _ir,
  slide,
  ctx,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  const { image: imageComponent, source: imageSource } = imageSelection
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：见 ImageSplitPage 同名变量的注释。
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const bulletsComponent = slide.components.find(
    (b): b is Extract<Slide["components"][number], { type: "bullets" }> => b.type === "bullets",
  )
  const annotations = (bulletsComponent?.items ?? []).slice(0, 4).map(splitAnnotation)
  // Two different things can be lost here and they are not the same unit: an
  // annotation past the fourth is one bullet item, and a component this face
  // has no place for is a whole block. Added together under one noun they
  // exported as "1 content block" for a page that lost its fifth bullet and
  // no block at all, sending an author to look for a component that was
  // never missing. Each is declared in its own unit instead.
  const droppedItems = Math.max(0, (bulletsComponent?.items.length ?? 0) - 4)
  const droppedComponents = slide.components.filter(
    (component) => component !== imageSource && component !== bulletsComponent,
  ).length
  const hasNotes = annotations.length > 0

  const bg = ctx.defaultBg ?? ctx.colors.bg
  const title = fitEmphasisText(slide.heading, {
    maxWidth: ANN_CONTENT_W,
    fontSize: scaleTypePx(34, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.2,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(ANN_CONTENT_W, 900),
    fontSize: 18,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  const caption = imageComponent.caption
    ? fitSvgLine(imageComponent.caption, { maxWidth: 620, fontSize: 16, minFontSize: 16 })
    : null

  // 竖向从上往下紧排，间距是常量而非「剩余空间的一份」。
  let cursor = ANN_HEAD_TOP
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + 8
  const subY = cursor + sub.lineHeight - 8
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 6
  const bodyTop = cursor + 22

  const imgW = hasNotes ? ANN_IMG_W : ANN_SOLO_IMG_W
  const frameW = imgW + ANN_FRAME_PAD * 2
  const frameX = hasNotes ? ANN_MARGIN_X : Math.round((W - frameW) / 2)
  const availFrameH = ANN_BODY_BOTTOM - bodyTop - (caption ? ANN_CAPTION_SLOT : 0)
  const frameH = Math.max(
    ANN_IMG_H_MIN + ANN_FRAME_PAD * 2,
    Math.min(Math.round(imgW / ANN_IMG_ASPECT) + ANN_FRAME_PAD * 2, availFrameH),
  )
  const imgH = frameH - ANN_FRAME_PAD * 2

  // 说明清单顶端与照片卡顶端齐平：两栏是一个整体，不是两块各自居中的东西。
  const notes: {
    index: string
    title: ReturnType<typeof layoutSvgText>
    desc: ReturnType<typeof layoutSvgText> | null
    titleY: number
    descY: number
  }[] = []
  let noteCursor = bodyTop + ANN_FRAME_PAD
  for (const [i, ann] of annotations.entries()) {
    const desc = ann.desc
      ? layoutSvgText(ann.desc, {
          maxWidth: ANN_NOTE_TEXT_W,
          fontSize: 16,
          maxLines: 2,
          lineHeightRatio: 1.4,
        })
      : null
    const annTitle = layoutSvgText(ann.title, {
      maxWidth: ANN_NOTE_TEXT_W,
      fontSize: 20,
      maxLines: desc ? 1 : 2,
      lineHeightRatio: 1.3,
    })
    const noteTitleY = noteCursor + annTitle.lineHeight - 6
    const noteDescY = noteTitleY + (annTitle.lines.length - 1) * annTitle.lineHeight + 24
    notes.push({
      index: String(i + 1),
      title: annTitle,
      desc,
      titleY: noteTitleY,
      descY: noteDescY,
    })
    noteCursor += annTitle.lines.length * annTitle.lineHeight
    if (desc) noteCursor += 6 + desc.lines.length * desc.lineHeight
    noteCursor += ANN_NOTE_GAP
  }

  return (
    <g>
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: accessibleInk(ctx.colors.primary, bg, title.fontSize), fontWeight: "600", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={ANN_MARGIN_X}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
            x={ANN_MARGIN_X}
            y={subY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {/* 白框照片卡（showcase 的 photo-print 质感，深浅主题通用） */}
      <rect
        x={frameX}
        y={bodyTop}
        width={frameW}
        height={frameH}
        fill="#FFFFFF"
        stroke={ctx.colors.border}
        strokeWidth={1}
      />
      {src ? (
        <image
          href={src}
          x={frameX + ANN_FRAME_PAD}
          y={bodyTop + ANN_FRAME_PAD}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect
          x={frameX + ANN_FRAME_PAD}
          y={bodyTop + ANN_FRAME_PAD}
          width={imgW}
          height={imgH}
          fill={ctx.colors.surface}
        />
      )}
      {caption && (
        <text
          data-truncated={caption.truncated ? "1" : undefined}
          x={hasNotes ? frameX : W / 2}
          y={bodyTop + frameH + ANN_CAPTION_DROP}
          textAnchor={hasNotes ? "start" : "middle"}
          fontSize={caption.fontSize}
          fontFamily={ctx.fonts.body}
          fill={ctx.colors.muted}
          dominantBaseline="alphabetic"
        >
          {caption.text}
        </text>
      )}
      {notes.map((note, i) => (
        <g key={i}>
          {/* 序号：这一页唯一的 accent，兼作口头指认的抓手（「第 2 条」）。
              accent 过不了对比度就回落中性墨，与全库其余文字同一条规矩。 */}
          <text
            x={ANN_NOTE_X + ANN_NOTE_INDENT - 12}
            y={note.titleY}
            textAnchor="end"
            fontSize={note.title.fontSize}
            fontWeight={700}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.accent, bg, note.title.fontSize)}
            dominantBaseline="alphabetic"
          >
            {note.index}
          </text>
          {/* An annotation this page kept but could not set whole says so
              on the line that carries the cut. The declarations below count
              the items and the siblings this face turned away, each in its
              own unit, and count nothing for an item it accepted and then
              trimmed to one or two lines, so a long bullet used to lose its
              tail with no mark anywhere. */}
          {note.title.lines.map((line, li) => (
            <text
              key={li}
              data-truncated={note.title.truncated && li === note.title.lines.length - 1 ? "1" : undefined}
              x={ANN_NOTE_X + ANN_NOTE_INDENT}
              y={note.titleY + li * note.title.lineHeight}
              fontSize={note.title.fontSize}
              fontWeight={700}
              fontFamily={ctx.fonts.heading}
              fill={ctx.colors.text}
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))}
          {note.desc?.lines.map((line, li) => (
            <text
              key={li}
              data-truncated={note.desc!.truncated && li === note.desc!.lines.length - 1 ? "1" : undefined}
              x={ANN_NOTE_X + ANN_NOTE_INDENT}
              y={note.descY + li * note.desc!.lineHeight}
              fontSize={note.desc!.fontSize}
              fontFamily={ctx.fonts.body}
              fill={ctx.colors.muted}
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))}
        </g>
      ))}
      <DroppedContentMarker count={droppedItems} kind="item" />
      <DroppedContentMarker count={droppedComponents} kind="component" />
    </g>
  )
}

// 底图高自适应区间（2026-07-14 内容优先）：短内容大图、长内容小图，
// 正文实际底部之下才放图，绝不碰撞。
const MIN_BOTTOM_IMG = 240
const MAX_BOTTOM_IMG = 360

/**
 * image_bottom 上文下图（ppt-master P15 对等对话）：上半 heading/副题/
 * components 居中排布，下半全幅出血图（贴底三边）。
 */
export function ImageBottomPage({
  ir: _ir,
  slide,
  ctx,
  page,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
}) {
  if (!singlePictureExact(slide)) return <TakeoverFallbackPage slide={slide} ctx={ctx} />
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  const { image: imageComponent, source: imageSource } = imageSelection
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：见 ImageSplitPage 同名变量的注释。
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)

  const title = fitEmphasisText(slide.heading, {
    maxWidth: 900,
    fontSize: scaleTypePx(44, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.15,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: 860,
    fontSize: 21,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  // 底图垂直通栏到页缘（2026-07-09 用户裁决：绝不拉伸，slice 裁剪出血）。
  // meta 页脚由 Branding 以遮罩浮层压图渲染，caption 条相应上移让位。
  // 让位条件必须与 Branding 的实际绘制一致：内容页脚只在 branding:"full"
  // 时画（cover-only 默认与 minimal 都不画 meta 行），只看 meta 字段会为
  // 不存在的页脚悬空 40px。
  const captionBottom = page.geometry.imageBottomCaptionBottomY
  let cursor = 96
  const titleY = cursor + title.lineHeight - 10
  cursor += title.lines.length * title.lineHeight + 14
  const ruleY = cursor
  cursor += 26
  const subY = cursor + 4
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 18
  const componentsTop = cursor + 6
  // 内容优先（2026-07-14 用户截图：固定底图高把正文区压太小、numbered
  // 内容溢进图片被裁）：正文先排在「到最小底图上缘」的大区，图片起点落
  // 正文实际底部下方，图高 MIN_BOTTOM_IMG..MAX_BOTTOM_IMG 自适应——短内容
  // 大图、长内容小图，正文与图永不碰撞。
  const contentZoneBottom = H - MIN_BOTTOM_IMG - 20
  const { placed, dropped } = layoutContentFit(
    "single",
    rest,
    { x: 240, y: componentsTop, w: W - 480, h: Math.max(60, contentZoneBottom - componentsTop) },
    ctx,
  )
  const contentBottom = placed.length ? stackBottom(placed, ctx) : componentsTop
  const imgTop = Math.min(
    Math.max(contentBottom + 24, H - MAX_BOTTOM_IMG),
    H - MIN_BOTTOM_IMG,
  )
  const imgH = H - imgTop

  return (
    <g>
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize), fontWeight: "600", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            x={W / 2}
            y={titleY + i * title.lineHeight}
            textAnchor="middle"
            fontSize={title.fontSize}
            fontWeight={600}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={W / 2 - 42} y={ruleY} width={84} height={4} fill={ctx.colors.accent} />
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            x={W / 2}
            y={subY + i * sub.lineHeight}
            textAnchor="middle"
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {placed.map((p, i) => (
        <Fragment key={i}>{renderComponent(p.component, p.box, ctx)}</Fragment>
      ))}
      {src ? (
        <image
          href={src}
          x={0}
          y={imgTop}
          width={W}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={0} y={imgTop} width={W} height={imgH} fill={ctx.colors.surface} />
      )}
      {imageComponent.caption &&
        (() => {
          const fitted = fitSvgLine(imageComponent.caption, {
            maxWidth: W - 240,
            fontSize: 16,
            minFontSize: 16,
          })
          return (
            <>
              <rect x={0} y={captionBottom - 40} width={W} height={40} fill="#0A0E14" fillOpacity={0.55} />
              <text
                data-truncated={fitted.truncated ? "1" : undefined}
                x={W / 2}
                y={captionBottom - 15}
                textAnchor="middle"
                fontSize={fitted.fontSize}
                fontFamily={ctx.fonts.body}
                fill="#FFFFFF"
                fillOpacity={0.92}
                dominantBaseline="alphabetic"
              >
                {fitted.text}
              </text>
            </>
          )
        })()}
      <DroppedContentMarker count={dropped} />
    </g>
  )
}

export interface TakeoverRendererProps {
  ir: PptxIR
  slide: Slide
  index: number
  ctx: ComponentCtx
  page: PageRenderContext
}

export type TakeoverRenderer = (props: TakeoverRendererProps) => ReactNode

/** The render dispatcher consumed by FullSlideSvg and the theme menu gate. */
export const TAKEOVER_RENDERERS = {
  "image-split": ({ index: _index, ...props }) => ImageSplitPage(props),
  "image-top": ({ index: _index, ...props }) => ImageTopPage(props),
  "image-bottom": ({ index: _index, ...props }) => ImageBottomPage(props),
  "image-annotate": ({ index: _index, ...props }) => ImageAnnotatePage(props),
} satisfies Record<string, TakeoverRenderer>

export function getTakeoverRenderer(id: string): TakeoverRenderer | undefined {
  return (TAKEOVER_RENDERERS as Record<string, TakeoverRenderer>)[id]
}

export function hasTakeoverRenderer(id: string): boolean {
  return getTakeoverRenderer(id) !== undefined
}

// T1d (src domain reorg wave 1): the 4 takeover LayoutDefinitions inlined
// verbatim from registry.ts's former `TAKEOVER_LAYOUT_DEFS` entries — one file,
// 4 named exports (not `layoutDef`, unlike the 130 layout files: all four
// takeovers are implemented in this single file, so they need distinct
// export names to coexist). `LayoutDefinition` is a type-only import from
// registry.ts — registry.ts value-imports these 4 exports back, and a
// type-only import is erased at compile time, so the two files' mutual
// reference never becomes a runtime cycle.
export const imageSplitLayoutDef: LayoutDefinition = {
  // image-pages.tsx ImageSplitPage: full-height bleed image in a fixed
  // column. The first image-family source supplies one image anchor and an
  // optional caption overlay. Kicker, heading, rule, and subheading occupy
  // the text column, followed by the components left after consuming that
  // source as body. The body uses hardcoded arrangement "single".
  // Takeovers do not expose standard layout arrangements.
  id: "image-split",
  kind: "takeover",
  slideTypes: ["content"],
  slots: [
    { name: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"], required: true, selection: "first" },
    { name: "caption", accepts: [] },
    { name: "body", accepts: "any" },
  ],
}

export const imageTopLayoutDef: LayoutDefinition = {
  // image-pages.tsx ImageTopPage: full-width top-band bleed image from the
  // first image-family selection, no caption render, then a heading band.
  // Components left after consuming the source split into up to 3 body
  // columns, with each column hardcoded "single"
  // (image-pages.tsx:360).
  id: "image-top",
  kind: "takeover",
  slideTypes: ["content"],
  slots: [
    { name: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"], required: true, selection: "first" },
    { name: "body", accepts: "any" },
  ],
}

export const imageBottomLayoutDef: LayoutDefinition = {
  // image-pages.tsx ImageBottomPage: centered heading/rule/subheading,
  // components left after consuming the first image-family source as body,
  // then a full-width bottom-band bleed image from its derived anchor with
  // an optional caption overlay.
  id: "image-bottom",
  kind: "takeover",
  slideTypes: ["content"],
  slots: [
    { name: "body", accepts: "any" },
    { name: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"], required: true, selection: "first" },
    { name: "caption", accepts: [] },
  ],
}

export const imageAnnotateLayoutDef: LayoutDefinition = {
  // image-pages.tsx ImageAnnotatePage: centered heading + subheading,
  // framed center image from the first image-family selection with optional
  // caption, and up to 4 annotations sourced from the first bullets component
  // items. Unlike the other 3 takeovers, this renderer only consumes the
  // selected image source and bullets component. Declaring a `body` slot
  // would claim capacity the renderer does not offer. `annotation` is the
  // substitute for body on this face.
  id: "image-annotate",
  kind: "takeover",
  slideTypes: ["content"],
  slots: [
    { name: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"], required: true, selection: "first" },
    { name: "annotation", accepts: ["bullets"], capacity: 4, capacityUnit: "items" },
    { name: "caption", accepts: [] },
  ],
}
