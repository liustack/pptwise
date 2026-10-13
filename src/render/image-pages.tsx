import { Fragment, type ReactNode } from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "../layouts/registry"
import { renderComponent, measureComponent } from "../components"
import { layoutContentFit } from "./layout"
import { DroppedContentMarker } from "./drop-marker"
import { CaptionText, fitCaptionLine } from "./caption-line"
import { bleedSlotCanHost, findImageSelection, singlePictureExact } from "../layouts/find-image"
import { CANVAS_W_PX, CANVAS_H_PX } from "../constants"
import { scaleTypePx } from "./heading-fit"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
} from "./emphasis"
import { accessibleInk, blendOver, liftedInk } from "./ink"
import { showsDocumentMeta } from "./document-meta"
import { footnoteBaselineFor } from "./branding-geometry"
import { compose, type CompositionId } from "../layouts/compositions"
import { faceParam, type FaceParams } from "../layouts/face-params"
import { SvgContent } from "./svg-content"
import type { PageRenderContext } from "./page-context"
import { NOTICE_BODY_BOTTOM, NOTICE_BODY_TOP, NoticeHead, NoticeSource, fitNoticeSource } from "../layouts/notice-shared"
import { NoticeSheetContent, noticeStandfirst } from "../layouts/content-notice-sheet"
import { GridSheetContent, gridStandfirst } from "../layouts/content-grid-sheet"
import { PanelSheetContent } from "../layouts/content-panel-sheet"
import { PanelSplitPage } from "../layouts/image-panel-split"
import { SealSheetContent } from "../layouts/content-seal-sheet"
import { SealSplitPage } from "../layouts/image-seal-split"
import { FittedLines, GRID_LEFT, GRID_W, GridSource, fitGridSource, gridBodyRect } from "../layouts/grid-shared"
import { centredBaseline } from "../layouts/compositions/type"
import { bodySlotDropsContent } from "./step-aside"

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
 * ledger（1.14）、terminal（1.31）三家在这四个版式上各报 5 条 low-contrast，
 * 一共十五条，早在本轮之前就在报。柔和组把 rally 的 primary 从品红翻成
 * 舞台暗紫（`themes/rally.ts` 的逐条来历）之后，rally 会成为第四家
 * ——与其给它开例外，不如把这处共享版式的根因一起修掉：`accessibleInk`
 * 在 primary 本就过线时逐字节不变（其余 13 家），过不了线时回落
 * `readableOn` 的中性墨。全 17 主题实测见本轮报告。
 */
const W = CANVAS_W_PX
const H = CANVAS_H_PX

function MissingRequiredImageMarker({ slide }: { slide: Slide }) {
  return <DroppedContentMarker count={Math.max(1, slide.components.length)} />
}

/**
 * The source line (`slide.footnote`) of a takeover page.
 *
 * The takeovers used to draw none, on any theme: a photo credit or a
 * data source written for a photo page reached nobody, with nothing on the
 * page and nothing in validate or the audit to say so. Each takeover now
 * sets it the way the rest of the engine sets a footnote, 16px in the
 * theme's muted ink, up to two lines of its own column, its last line on
 * `lastBaseline`, and keeps its body clear of `top`. A source longer than two
 * lines is cut and marked `data-truncated`.
 */
const SOURCE_SIZE = 16
const SOURCE_LINE_HEIGHT = 24
const SOURCE_MAX_LINES = 2
/** Georgia's ascent, the share of the size a line's ink rises above its baseline. */
const SOURCE_ASCENT = 0.917

/** Georgia's descent at the source size, rounded up: where the last line's ink ends. */
const SOURCE_DESCENT = 4

interface TakeoverSource {
  node: ReactNode
  /** Where the first line's ink starts. A body above it stops short of this. */
  top: number
  /** Where the last line's ink ends. */
  bottom: number
}

/**
 * Sets the source line with its last baseline on `lastBaseline`, or, for a
 * face that stacks it under its body instead, with its first line's ink
 * starting at `top`.
 */
function takeoverSource(
  slide: Slide,
  ctx: ComponentCtx,
  place: { x: number; width: number; anchor?: "start" | "middle" } & ({ lastBaseline: number } | { top: number }),
): TakeoverSource | null {
  if (!slide.footnote?.trim()) return null
  const layout = fitEmphasisText(slide.footnote, {
    maxWidth: place.width,
    fontSize: SOURCE_SIZE,
    minPt: SOURCE_SIZE,
    maxLines: SOURCE_MAX_LINES,
    lineHeightRatio: SOURCE_LINE_HEIGHT / SOURCE_SIZE,
    fontFamily: ctx.fonts.body,
  })
  if (layout.lines.length === 0) return null
  const ink = accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, SOURCE_SIZE)
  const ascent = Math.ceil(SOURCE_SIZE * SOURCE_ASCENT)
  const firstBaseline =
    "top" in place ? place.top + ascent : place.lastBaseline - (layout.lines.length - 1) * SOURCE_LINE_HEIGHT
  const lastBaseline = firstBaseline + (layout.lines.length - 1) * SOURCE_LINE_HEIGHT
  const node = (
    <g data-takeover-source="">
      {renderEmphasisHeading(
        layout,
        headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "400", fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
            x={place.x}
            y={firstBaseline + i * SOURCE_LINE_HEIGHT}
            textAnchor={place.anchor === "middle" ? "middle" : undefined}
            fontSize={SOURCE_SIZE}
            fontFamily={ctx.fonts.body}
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
    </g>
  )
  return { node, top: firstBaseline - ascent, bottom: lastBaseline + SOURCE_DESCENT }
}

/** Air between a takeover's body and the source line under it. */
const SOURCE_GAP = 16

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
  const source = takeoverSource(slide, ctx, {
    x: FALLBACK_MARGIN_X,
    width: contentW,
    lastBaseline: footnoteBaselineFor(SOURCE_SIZE),
  })
  const bodyBottom = source ? Math.min(FALLBACK_BOTTOM, source.top - SOURCE_GAP) : FALLBACK_BOTTOM
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
        rect={{ x: FALLBACK_MARGIN_X, y: bodyTop, w: contentW, h: Math.max(80, bodyBottom - bodyTop) }}
        ctx={ctx}
      />
      {source?.node}
    </g>
  )
}

/** 暗 scrim：上浅下深三段（文字集中在中下部），图保持清晰可辨。 */
const SCRIM_INK = "#0A0E14"
const SCRIM_ALPHA = 0.3

function DarkScrim() {
  return (
    <>
      <rect x={0} y={0} width={W} height={H} fill={SCRIM_INK} fillOpacity={SCRIM_ALPHA} />
      <rect x={0} y={Math.round(H * 0.55)} width={W} height={Math.round(H * 0.45)} fill={SCRIM_INK} fillOpacity={0.28} />
      <rect x={0} y={Math.round(H * 0.78)} width={W} height={Math.round(H * 0.22)} fill={SCRIM_INK} fillOpacity={0.3} />
    </>
  )
}

/**
 * What the words on the photo cover are read against: the lightest of the
 * scrim's bands over a photograph's middle grey. The photograph is not known
 * when the page is drawn, and the theme's accent, chosen for its own page,
 * can sink into it (a dark red over a harbour at dusk read 1.48:1), so the
 * accent the cover sets in words is lifted toward white until it reads here.
 */
const PHOTO_COVER_GROUND = blendOver(SCRIM_INK, "#808080", SCRIM_ALPHA)

/**
 * cover/chapter 的 asset 背景页：清晰大图 + 暗遮罩 + 白字（左下构图）。
 */
/**
 * The title a cover or chapter over a photograph sets: up to two lines,
 * shrunk toward the meta floor, and cut past that. The page draws it from
 * here, and validate asks the same fit through {@link IMAGE_COVER_HEADING},
 * so a heading validate passes is one this page sets whole.
 */
function imageCoverTitle(slide: Slide, ctx: Pick<ComponentCtx, "shape">) {
  return fitEmphasisText(slide.heading, {
    maxWidth: 1030,
    fontSize: scaleTypePx(slide.type === "chapter" ? 60 : 68, ctx.shape?.typeScale),
    maxLines: 2,
    lineHeightRatio: 1.12,
  })
}

/**
 * The heading fit of the shared photo page (`image-cover` route), for
 * validate's boundary heading gate: a cover or chapter over a photograph is
 * drawn here rather than by its menu face, which declares a fit for a page
 * it never draws.
 */
export const IMAGE_COVER_HEADING: Pick<LayoutDefinition, "headingSet"> = {
  headingSet: ({ slide, ctx }) => (imageCoverTitle(slide, ctx).truncated ? "cut" : "whole"),
}

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
  const wordInk = (fontSize: number) => liftedInk(accent, PHOTO_COVER_GROUND, fontSize)
  const org = page.metadataOn ? ir.meta.organization : undefined
  const date = showsDocumentMeta(page, ir, slide) ? ir.meta.date : undefined

  const title = imageCoverTitle(slide, ctx)
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
          fill={wordInk(30)}
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
        headingEmphasisPaint(ctx, title, { baseFill: "#FFFFFF", accent: wordInk(title.fontSize), fontWeight: "700", fontFamily: ctx.fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
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
        headingEmphasisPaint(ctx, sub, { baseFill: "#FFFFFF", accent: wordInk(sub.fontSize), fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
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
/** 图列垂直通栏（2026-07-09 用户裁决）：图压到页底，本版式声明
 * `footerRow: "none"`，页脚这一行整页不画，无压图问题。 */
const SPLIT_IMG_H = H

/**
 * The text column beside the photograph, in the two settings a menu can ask
 * for with the `column` parameter.
 *
 * - `standard`: a 540px photograph, the title at 44px semibold on 1.18 lines,
 *   a 72 by 4 accent bar, and the components stacked under it.
 * - `report`: the tea board's photo page (p04), the way a report sets a
 *   photograph and its facts: a 600px photograph, the title at 40px regular
 *   on 52px lines, a short 48 by 6 accent bar, and a list of "Label: value"
 *   facts set as ruled pairs (the shared `pairs` composition), with the
 *   source at the foot of the column.
 */
interface SplitColumn {
  imageW: number
  /** The text column's left edge when the photograph is on the left. */
  textX: number
  titleSize: number
  titleLineRatio: number
  titleWeight: "400" | "600"
  /** Top of the title's first line box; its baseline sits 12px above that box's foot. */
  titleTop: number
  barW: number
  barH: number
  /** From the title's last line box to the bar. */
  barGap: number
  /** Whether a list of "Label: value" facts is offered to the `pairs` composition. */
  pairs: boolean
  /** The source line's last baseline. */
  sourceBaseline: number
}

/** The signature drawing the report and notice columns offer the components beside the photograph. */
const PAIRS_COMPOSITIONS: readonly CompositionId[] = ["pairs"]

const SPLIT_COLUMNS: Record<"standard" | "report", SplitColumn> = {
  standard: {
    imageW: SPLIT_IMG_W,
    textX: SPLIT_TEXT_X,
    titleSize: 44,
    titleLineRatio: 1.18,
    titleWeight: "600",
    titleTop: 174,
    barW: 72,
    barH: 4,
    barGap: 18,
    pairs: false,
    sourceBaseline: footnoteBaselineFor(SOURCE_SIZE),
  },
  report: {
    imageW: 600,
    textX: 672,
    titleSize: 40,
    titleLineRatio: 52 / 40,
    titleWeight: "400",
    titleTop: 150,
    barW: 48,
    barH: 6,
    barGap: 32,
    pairs: true,
    // The board's source box starts at y600 with two 24px lines.
    sourceBaseline: 642,
  },
}

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
  params,
}: {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page: PageRenderContext
  params?: FaceParams
}) {
  const columnId = faceParam<"standard" | "report" | "notice" | "panel" | "seal">(params, "column", "standard")
  // A notice or panel page that is not one photograph and its facts is drawn
  // as that theme's sheet draws any other page, under the same frame, so the
  // deck keeps one heading throughout.
  const plain = () =>
    columnId === "notice" ? (
      <NoticeSheetContent ir={ir} slide={slide} index={0} ctx={ctx} page={page} />
    ) : columnId === "panel" ? (
      <PanelSheetContent ir={ir} slide={slide} index={0} ctx={ctx} page={page} />
    ) : columnId === "seal" ? (
      <SealSheetContent ir={ir} slide={slide} index={0} ctx={ctx} page={page} />
    ) : (
      <TakeoverFallbackPage slide={slide} ctx={ctx} />
    )
  if (!singlePictureExact(slide)) return plain()
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  if (!bleedSlotCanHost(imageSelection.source)) return plain()
  const { image: imageComponent, source: imageSource } = imageSelection
  if (columnId === "notice") return <NoticeSplitPage slide={slide} ctx={ctx} imageSelection={imageSelection} />
  if (columnId === "panel") return PanelSplitPage({ slide, ctx, page, imageSelection }) ?? plain()
  if (columnId === "seal") return SealSplitPage({ slide, ctx, page, imageSelection }) ?? plain()
  const column = SPLIT_COLUMNS[columnId]
  const imageW = column.imageW
  const textW = W - column.textX - 96
  // 图文范式族（ppt-master P04 右图出血）：image_side=right 时整页镜像——
  // 图列贴右缘、文字区在左。
  const rightSide = slide.image_side === "right"
  const imgX = rightSide ? W - imageW : 0
  const textX = rightSide ? 96 : column.textX
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：this takeover bypasses
  // `components/image.tsx` entirely (`full-slide-svg.tsx`'s takeover
  // dispatch), so it needs its own `aria-label` emission — same
  // only-when-present rule as that file's own `<image>`.
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)

  // fontWeight 600 而非 700：magazine/creative 的衬线 heading（SimSun/Lora）
  // 被 700 合成加粗抹掉衬线特征——降字重提字号保气势。拟合必须带 bold +
  // heading 字体：Regular 估算会把「Competitors are pricing」收成一行，
  // SimSun 600 实宽超出文字栏宽。
  const titleBold = column.titleWeight !== "400"
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: textW,
    fontSize: scaleTypePx(column.titleSize, ctx.shape?.typeScale),
    maxLines: 3,
    minPt: 22,
    lineHeightRatio: column.titleLineRatio,
    fontFamily: ctx.fonts.heading,
    bold: titleBold,
  })
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: textW,
    fontSize: 21,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  // The band above the title used to carry an organization kicker. On a
  // content page the organization is a footer mark with one place, the
  // footer row, and only when the deck asks for it (2026-10-02 footer
  // ruling), so the band stays empty and the title keeps its place.
  let cursor = column.titleTop
  const titleY = cursor + title.lineHeight - 12
  cursor += title.lines.length * title.lineHeight + column.barGap
  const ruleY = cursor
  cursor += 30
  const subY = cursor + 6
  if (sub.lines.length) cursor += sub.lines.length * sub.lineHeight + 24
  const componentsTop = cursor + 8
  const source = takeoverSource(slide, ctx, {
    x: textX,
    width: textW,
    lastBaseline: column.sourceBaseline,
  })
  const componentsBottom = source ? Math.min(H - 96, source.top - SOURCE_GAP) : H - 96
  const componentsH = componentsBottom - componentsTop
  const pairs = column.pairs
    ? compose(
        { components: rest, ctx, rect: { x: textX, y: componentsTop, w: textW, h: componentsBottom - componentsTop } },
        PAIRS_COMPOSITIONS,
      )
    : null
  const { placed, dropped } = pairs
    ? { placed: [], dropped: 0 }
    : layoutContentFit(
        "single",
        rest,
        { x: textX, y: componentsTop, w: textW, h: Math.max(120, componentsH) },
        ctx,
      )

  return (
    <g>
      {src ? (
        <image
          href={src}
          x={imgX}
          y={0}
          width={imageW}
          height={SPLIT_IMG_H}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={imgX} y={0} width={imageW} height={SPLIT_IMG_H} fill={ctx.colors.surface} />
      )}
      {imageComponent.caption &&
        (() => {
          const fitted = fitCaptionLine(imageComponent.caption, imageW - 48)
          if (!fitted) return null
          return (
            <>
              <rect x={imgX} y={SPLIT_IMG_H - 44} width={imageW} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <CaptionText fitted={fitted} ctx={ctx} x={imgX + 24} y={SPLIT_IMG_H - 17} fill="#FFFFFF" fillOpacity={0.92} ground="#0A0E14" />
            </>
          )
        })()}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize),
          fontWeight: column.titleWeight,
          fontFamily: ctx.fonts.heading,
          bold: titleBold,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={textX}
            y={titleY + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={titleBold ? 600 : 400}
            fontFamily={ctx.fonts.heading}
            fill={accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, title.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={textX} y={ruleY} width={column.barW} height={column.barH} fill={ctx.colors.accent} />
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
      {pairs}
      {placed.map((p, i) => (
        <Fragment key={i}>{renderComponent(p.component, p.box, ctx)}</Fragment>
      ))}
      {source?.node}
      {/* Recorded, never painted — and the export refuses to ship it.
          See `DroppedContentMarker`'s own doc comment. */}
      <DroppedContentMarker count={dropped} />
    </g>
  )
}

/** The notice column: the photograph's width and where the text column starts beside it. */
const NOTICE_SPLIT = { imageW: 560, textX: 624, headW: 520, right: 80, sourceFirstBaseline: 656 }

/**
 * The notice column: bulletin's 2026-10 photo page (p05). The photograph
 * takes the left 560px, edge to edge, top to bottom. Beside it the column
 * wears the notice frame every bulletin content page wears (`NoticeHead`:
 * the claim black and bold in a box that ends at y144, the hairline and its
 * short primary bar), so a photo page reads as the same notice as the pages
 * around it. Under the frame, a list of "Label: value" facts is set as the
 * notice pairs, any other content by the component renderer, and the source
 * sits at the foot of the column in the frame's 14px. A subheading is the
 * frame's standfirst at the top of the column's body, as on every notice
 * page, and the body moves down under it.
 */
function NoticeSplitPage({
  slide,
  ctx,
  imageSelection,
}: {
  slide: Slide
  ctx: ComponentCtx
  imageSelection: NonNullable<ReturnType<typeof findImageSelection>>
}) {
  const { image: imageComponent, source: imageSource } = imageSelection
  const rightSide = slide.image_side === "right"
  const imgX = rightSide ? W - NOTICE_SPLIT.imageW : 0
  const textX = rightSide ? NOTICE_SPLIT.right : NOTICE_SPLIT.textX
  const textRight = rightSide ? W - NOTICE_SPLIT.imageW - (NOTICE_SPLIT.textX - NOTICE_SPLIT.imageW) : W - NOTICE_SPLIT.right
  const textW = textRight - textX
  const src = ctx.images?.[imageComponent.asset_id]?.src
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)
  const probe = fitNoticeSource(slide.footnote, ctx, textW)
  const source = probe
    ? fitNoticeSource(slide.footnote, ctx, textW, NOTICE_SPLIT.sourceFirstBaseline + (probe.layout.lines.length - 1) * 20)
    : null
  const bottom = source ? source.top - 12 : NOTICE_BODY_BOTTOM
  const standfirst = noticeStandfirst(slide.subheading, ctx, { x: textX, w: textW, top: NOTICE_BODY_TOP })
  const top = NOTICE_BODY_TOP + (standfirst?.h ?? 0)
  const rect = { x: textX, y: top, w: textW, h: bottom - top }
  const pairs = compose({ components: rest, ctx, rect, setting: "notice" }, PAIRS_COMPOSITIONS)
  const { placed, dropped } = pairs ? { placed: [], dropped: 0 } : layoutContentFit("single", rest, rect, ctx)
  return (
    <g data-split-column="notice">
      {src ? (
        <image
          href={src}
          x={imgX}
          y={0}
          width={NOTICE_SPLIT.imageW}
          height={H}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={imgX} y={0} width={NOTICE_SPLIT.imageW} height={H} fill={ctx.colors.surface} />
      )}
      {imageComponent.caption &&
        (() => {
          const fitted = fitCaptionLine(imageComponent.caption, NOTICE_SPLIT.imageW - 48)
          if (!fitted) return null
          return (
            <>
              <rect x={imgX} y={H - 44} width={NOTICE_SPLIT.imageW} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <CaptionText fitted={fitted} ctx={ctx} x={imgX + 24} y={H - 17} fill="#FFFFFF" fillOpacity={0.92} ground="#0A0E14" />
            </>
          )
        })()}
      <NoticeHead heading={slide.heading} ctx={ctx} place={{ x: textX, w: Math.min(NOTICE_SPLIT.headW, textW), right: textRight }} />
      {standfirst?.node}
      {pairs}
      {placed.map((p, i) => (
        <Fragment key={i}>{renderComponent(p.component, p.box, ctx)}</Fragment>
      ))}
      <NoticeSource source={source} ctx={ctx} x={textX} />
      <DroppedContentMarker count={dropped} />
    </g>
  )
}

/** The grid band: swiss's 2026-10 photo page (p10). */
const GRID_TOP = {
  /** The photograph's foot under a one-line title; a second title line takes 46px off it. */
  imageH: 330,
  title: { size: 34, lineHeight: 46, foot: 402, maxLines: 2, minPt: 28 },
  rule: { y: 418, h: 2 },
  bodyTop: 444,
}

/**
 * The grid band of `image-top`: swiss's photo page (p10). The photograph
 * runs edge to edge across the top of the page down to y330. Under it the
 * claim at 34/46 bold across the full measure, set on its last line, and a
 * 2px black rule at y418, the grid frame's header with the photograph in
 * place of the chapter line. Under the rule the figures the photograph
 * shows, two to four in columns (`figures` in the grid setting), or anything
 * else the page carries drawn by the component renderer, and the source at
 * the foot in the frame's 14px. A two-line claim takes its second line out
 * of the photograph, not out of the figures. A subheading is the frame's
 * standfirst under the rule, as on every grid page, and the figures move
 * down under it. A page that is not one photograph, or whose rest the band
 * cannot hold, is drawn as a grid sheet.
 */
function GridTopPage({ ir, slide, index, ctx, page }: { ir: PptxIR; slide: Slide; index: number; ctx: ComponentCtx; page: PageRenderContext }) {
  const plain = () => <GridSheetContent ir={ir} slide={slide} index={index} ctx={ctx} page={page} />
  if (!singlePictureExact(slide)) return plain()
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  if (!bleedSlotCanHost(imageSelection.source)) return plain()
  const { image: imageComponent, source: imageSource } = imageSelection
  const src = ctx.images?.[imageComponent.asset_id]?.src
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: GRID_W,
    fontSize: GRID_TOP.title.size,
    maxLines: GRID_TOP.title.maxLines,
    minPt: GRID_TOP.title.minPt,
    bold: true,
    lineHeightRatio: GRID_TOP.title.lineHeight / GRID_TOP.title.size,
    fontFamily: fonts.heading,
  })
  const extra = Math.max(0, title.lines.length - 1) * title.lineHeight
  const imgH = GRID_TOP.imageH - extra
  const lastBaseline = centredBaseline(GRID_TOP.title.foot - GRID_TOP.title.lineHeight, GRID_TOP.title.lineHeight, title.fontSize)
  const source = fitGridSource(slide, ctx, page)
  const standfirst = gridStandfirst(slide.subheading, ctx, { x: GRID_LEFT, w: GRID_W, top: GRID_TOP.bodyTop })
  const rect = gridBodyRect(source, page, GRID_TOP.bodyTop + (standfirst?.h ?? 0))
  const composed = rest.length > 0 ? compose({ components: rest, ctx, rect, setting: "grid" }, ["figures"]) : null
  if (rest.length > 0 && !composed && bodySlotDropsContent(rest, rect, ctx)) return plain()
  return (
    <g data-image-top-band="grid">
      {src ? (
        <image href={src} x={0} y={0} width={W} height={imgH} preserveAspectRatio="xMidYMid slice" aria-label={alt || undefined} />
      ) : (
        <rect x={0} y={0} width={W} height={imgH} fill={colors.surface} />
      )}
      {imageComponent.caption &&
        (() => {
          const fitted = fitCaptionLine(imageComponent.caption, GRID_W)
          if (!fitted) return null
          return (
            <>
              <rect x={0} y={imgH - 44} width={W} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <CaptionText fitted={fitted} ctx={ctx} x={GRID_LEFT} y={imgH - 17} fill="#FFFFFF" fillOpacity={0.92} ground="#0A0E14" />
            </>
          )
        })()}
      <FittedLines
        layout={title}
        ctx={ctx}
        x={GRID_LEFT}
        y={lastBaseline - extra}
        fill={accessibleInk(colors.text, bg, title.fontSize)}
        bold
      />
      <rect x={GRID_LEFT} y={GRID_TOP.rule.y} width={GRID_W} height={GRID_TOP.rule.h} fill={accessibleInk(colors.text, bg, GRID_TOP.title.size)} />
      {standfirst?.node}
      {composed ?? (rest.length > 0 && <SvgContent components={rest} rect={rect} ctx={ctx} />)}
      <GridSource source={source} ctx={ctx} />
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
/** 标题定稿字号，主题的 typeScale 在它上面放大。 */
const TOP_TITLE_SIZE = 30
/**
 * 夹住标题的两段距离（图底到首行基线、基线到贯穿细线）跟着标题字号走。
 * 上面这些数字是 30px 标题定稿时的节奏，放大字号的主题（playbill 1.3×、
 * stage 1.5×）把标题排到 39、45px：固定的 12px 让逗号落到了细线上，固定的
 * 42px 让字顶贴住了图底。按同一比例放大，不低于定稿值，所以缩了字号的标题
 * 仍按原来的节奏。
 */
function titleBandGap(gap: number, titleFontSize: number): number {
  return Math.max(gap, Math.round((titleFontSize * gap) / TOP_TITLE_SIZE))
}
/** The subheading's measure under the title, the plain page's own (`TakeoverFallbackPage`). */
const TOP_SUB_MAX_W = 900
/** Air between the title's last baseline and the subheading's first line box. */
const TOP_SUB_GAP = 6
/** 页底安全边距。 */
const TOP_SAFE_BOTTOM = 84
const BAND_PAD_X = 96

/**
 * image_top 顶图分栏（ppt-master P05）：上半全幅出血图（贴顶三边）+
 * 图下细标题行 + 下方文字 components 自动分列（2-3 块横排，1 块单栏）。
 * 无 image 块回落 null（调用方走模板路径）。
 */
export function ImageTopPage({
  ir,
  slide,
  index,
  ctx,
  page,
  params,
}: {
  ir: PptxIR
  slide: Slide
  index: number
  ctx: ComponentCtx
  page: PageRenderContext
  params?: FaceParams
}) {
  if (faceParam<"standard" | "grid">(params, "band", "standard") === "grid") {
    return <GridTopPage ir={ir} slide={slide} index={index} ctx={ctx} page={page} />
  }
  if (!singlePictureExact(slide)) return <TakeoverFallbackPage slide={slide} ctx={ctx} />
  const imageSelection = findImageSelection(slide)
  if (!imageSelection) return <MissingRequiredImageMarker slide={slide} />
  if (!bleedSlotCanHost(imageSelection.source)) return <TakeoverFallbackPage slide={slide} ctx={ctx} />
  const { image: imageComponent, source: imageSource } = imageSelection
  const src = ctx.images?.[imageComponent.asset_id]?.src
  // A11Y-01 alt 链路收尾（q15 根因）：见 ImageSplitPage 同名变量的注释。
  const alt = ctx.images?.[imageComponent.asset_id]?.alt
  const rest = slide.components.filter((component) => component !== imageSource)

  // 2-3 个文字块横向分列（P05 三栏），单块全宽。列宽只跟块数有关，不依赖图高，
  // 所以可以先定列宽，再按列宽量文字，最后才算图高。
  // The source line sits on the page's footnote baseline across the band, and
  // the body and the picture's arithmetic both stop above it.
  const source = takeoverSource(slide, ctx, {
    x: BAND_PAD_X,
    width: W - BAND_PAD_X * 2,
    lastBaseline: footnoteBaselineFor(SOURCE_SIZE),
  })
  const bodyBottom = source ? Math.min(H - TOP_SAFE_BOTTOM, source.top - SOURCE_GAP) : H - TOP_SAFE_BOTTOM

  const n = Math.max(1, Math.min(rest.length, 3))
  const colGap = 40
  const colW = (W - BAND_PAD_X * 2 - colGap * (n - 1)) / n

  const titleMaxW = W - BAND_PAD_X * 2 - 120
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: titleMaxW,
    fontSize: scaleTypePx(TOP_TITLE_SIZE, ctx.shape?.typeScale),
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
  // The page's subheading under the title, set the way this face's own
  // plain page sets it (`TakeoverFallbackPage`): 18px muted body, up to two
  // lines. The band grows by its height, which the picture gives up.
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: Math.min(titleMaxW, TOP_SUB_MAX_W),
    fontSize: 18,
    maxLines: 2,
    lineHeightRatio: 1.3,
  })
  const subExtra = sub.lines.length ? sub.lines.length * sub.lineHeight + TOP_SUB_GAP : 0
  const titleExtra = Math.max(0, title.lines.length - 1) * title.lineHeight
  const titleGap = titleBandGap(TOP_TITLE_GAP, title.fontSize)
  const captionTitleGap = titleBandGap(TOP_CAPTION_TITLE_GAP, title.fontSize)
  const ruleGap = titleBandGap(TOP_RULE_GAP, title.fontSize)
  const headBandH = titleGap + titleExtra + subExtra + ruleGap + TOP_BODY_GAP
  // 图吃掉正文带和标题带之外的所有空间，上下界见常量注释。分栏里一个块都没有
  // 的时候不预留分栏带，图直接长到标题带上沿（见 TOP_IMG_H_MAX_CAPTION_ONLY）。
  const captionOnly = rest.length === 0
  const captionBandH = captionTitleGap + titleExtra + subExtra + ruleGap + TOP_CAPTION_RULE_GAP_BOTTOM
  const imgH = captionOnly
    ? Math.min(TOP_IMG_H_MAX_CAPTION_ONLY, Math.max(TOP_IMG_H_MIN, bodyBottom - captionBandH))
    : Math.min(TOP_IMG_H_MAX, Math.max(TOP_IMG_H_MIN, bodyBottom - neededH - headBandH))

  // 单行标题时几何跟着图底缘走（原固定图高下为 398 / 发丝 410 / 正文 442）。
  // 换行时发丝和分栏整体下移。
  const firstTitleY = imgH + (captionOnly ? captionTitleGap : titleGap)
  const lastTitleY = firstTitleY + Math.max(0, title.lines.length - 1) * title.lineHeight
  const firstSubY = lastTitleY + TOP_SUB_GAP + sub.lineHeight
  const ruleY = lastTitleY + subExtra + ruleGap
  const componentsTop = ruleY + TOP_BODY_GAP
  const componentsH = bodyBottom - componentsTop
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
          const fitted = fitCaptionLine(imageComponent.caption, W - BAND_PAD_X * 2)
          if (!fitted) return null
          return (
            <>
              <rect x={0} y={imgH - 44} width={W} height={44} fill="#0A0E14" fillOpacity={0.62} />
              <CaptionText fitted={fitted} ctx={ctx} x={BAND_PAD_X} y={imgH - 17} fill="#FFFFFF" fillOpacity={0.92} ground="#0A0E14" />
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
      {renderEmphasisHeading(
        sub,
        headingEmphasisPaint(ctx, sub, { baseFill: ctx.colors.muted, fontFamily: ctx.fonts.body, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
            x={BAND_PAD_X + 26}
            y={firstSubY + i * sub.lineHeight}
            fontSize={sub.fontSize}
            fontFamily={ctx.fonts.body}
            fill={ctx.colors.muted}
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
      {source?.node}
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
  /** The menu entry's parameters, checked against the face's declaration when the theme was registered. */
  params?: FaceParams
}

export type TakeoverRenderer = (props: TakeoverRendererProps) => ReactNode

/** The render dispatcher consumed by FullSlideSvg and the theme menu gate. */
export const TAKEOVER_RENDERERS = {
  "image-split": ({ index: _index, ...props }) => ImageSplitPage(props),
  "image-top": (props) => ImageTopPage(props),
} satisfies Record<string, TakeoverRenderer>

export function getTakeoverRenderer(id: string): TakeoverRenderer | undefined {
  return (TAKEOVER_RENDERERS as Record<string, TakeoverRenderer>)[id]
}

export function hasTakeoverRenderer(id: string): boolean {
  return getTakeoverRenderer(id) !== undefined
}

// T1d (src domain reorg wave 1): the takeover LayoutDefinitions inlined
// verbatim from registry.ts's former `TAKEOVER_LAYOUT_DEFS` entries — one file,
// one named export each (not `layoutDef`, unlike the layout files: every
// takeover is implemented in this single file, so they need distinct
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
  // The image column runs to the bottom edge, caption bar included, so the
  // page carries no footer row (2026-07-09 ruling: the footer would print
  // over the photo).
  footerRow: "none",
  id: "image-split",
  kind: "takeover",
  story: {
    name: "Side Takeover",
    story: "A full-height bleed image fills one half of the page, left or right. The other half holds the heading, a rule, the subheading and any remaining blocks in a single column.",
    positioning: "Serves photo with one required image plus text in a vertical split. Choose it when a photograph and paragraphs each need a full-height column on one page.",
    audience: "Readers viewing a proposal or plan on screen, where the image anchors the argument.",
    notFor: "An image above or below the text, which belongs in Top Takeover or Base Takeover.",
  },
  slideTypes: ["content"],
  // How the text column is set (`SPLIT_COLUMNS`): "standard", or "report",
  // a wider photograph beside a regular-weight title and a list of facts set
  // as ruled pairs.
  params: {
    column: { type: "string", values: ["standard", "report", "notice", "panel", "seal"] },
  },
  // The report and notice columns set "Label: value" facts as ruled pairs.
  compositions: (params) => {
    const column = faceParam<string>(params, "column", "standard")
    return column === "report" ? { setting: "board", offer: PAIRS_COMPOSITIONS } : column === "notice" ? { setting: "notice", offer: PAIRS_COMPOSITIONS } : undefined
  },
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
  // How the band under the photograph is set: "standard", or "grid", the
  // claim on a black rule over the figures in columns (`GridTopPage`).
  params: {
    band: { type: "string", values: ["standard", "grid"] },
  },
  id: "image-top",
  kind: "takeover",
  story: {
    name: "Top Takeover",
    story: "A full-width bleed image fills the top of the page. Below it the heading and up to three columns of text share the remaining space, each column stacking its own block.",
    positioning: "Serves photo with one required image above and up to three text columns below. Choose it when the image leads and a few short texts follow underneath.",
    audience: "A screen or projection where the image enters first and the text completes it.",
    notFor: "An image at the bottom of the page, which belongs in Base Takeover.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"], required: true, selection: "first" },
    { name: "body", accepts: "any" },
  ],
}
