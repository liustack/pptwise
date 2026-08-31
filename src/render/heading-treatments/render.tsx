import type { ReactNode } from "react"
import type { SvgTemplateProps } from "../../layouts/types"
import type { ContentRect } from "../layout"
import type { ComponentCtx } from "../../components/types"
import { chapterNumberFor, sectionNameFor } from "../../lib/derive"
import { hasCjk } from "../../layouts/minimal-shared"
import { stacksVertically } from "../../lib/text-script"
import {
  parseEmphasis,
  renderEmphasisText,
  resolveEmphasisForm,
  sliceEmphasisForLines,
  stripEmphasis,
} from "../emphasis"
import { accessibleInk, readableOn } from "../ink"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../../lib/svg-text-layout"
import { fitHeadingLines } from "../heading-fit"
import {
  resolveHeadingTreatment,
  type HeadingKnobs,
  type HeadingTreatmentId,
  type NoTitleAnchor,
} from "./assignments"
import { formatChapterLabel, formatJournalRightSlot, headingIsCjk, padded } from "./labels"
import { stackChars } from "./stack"

const PAGE_LEFT = 96
const PAGE_RIGHT = 1184
const PAGE_BOTTOM = 640
const NO_TITLE_Y = 64
const RESERVE_GAP = 20
const RAIL_MIN_X = 64

/** Axis-aligned rects the layout will still paint in the heading band. Treatment ink must not intersect these. */
export interface HeadingBandReserve {
  rects: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[]
}

interface BandRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

function aabbIntersect(a: BandRect, b: BandRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Shift a heading-band chrome box right of any reserved rect it hits, or
 * that it shares a column with inside `RESERVE_GAP`. tag_box sat 2px above
 * the rail-numbered `{chapter}.{n}` badge (enterprise p06 / playbill / arena)
 * because the boxes did not AABB-intersect, so `leftTitleX` left the chip
 * on the badge. */
function nudgeXForReserve(box: BandRect, reserve: HeadingBandReserve | undefined): number {
  if (!reserve?.rects.length) return box.x
  let x = box.x
  for (const r of reserve.rects) {
    const shifted = { ...box, x }
    const overlapX = shifted.x < r.x + r.w && shifted.x + shifted.w > r.x
    const closeY =
      shifted.y < r.y + r.h + RESERVE_GAP && r.y < shifted.y + shifted.h + RESERVE_GAP
    if (aabbIntersect(shifted, r) || (overlapX && closeY)) {
      x = Math.max(x, r.x + r.w + RESERVE_GAP)
    }
  }
  return x
}

function glyphBox(
  x: number,
  y: number,
  fontSize: number,
  width: number,
  anchor: "start" | "middle" | "end" = "start",
): BandRect {
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x
  return { x: left, y: y - fontSize, w: width, h: fontSize * 1.25 }
}

function headingWidth(text: string, fontSize: number, fontFamily: string): number {
  return measureTextUnits(text.replace(/\*\*/g, ""), { bold: true, fontFamily }) * fontSize
}

function leftTitleX(
  defaultX: number,
  y: number,
  fontSize: number,
  text: string,
  fontFamily: string,
  reserve: HeadingBandReserve | undefined,
): number {
  if (!reserve?.rects.length) return defaultX
  const box = glyphBox(defaultX, y, fontSize, headingWidth(text, fontSize, fontFamily))
  let x = defaultX
  for (const r of reserve.rects) {
    if (aabbIntersect(box, r)) x = Math.max(x, r.x + r.w + RESERVE_GAP)
  }
  return x
}

function titleMaxWidthFor(titleX: number): number {
  return Math.max(1, PAGE_RIGHT - titleX)
}

function centerTitleMaxWidth(reserve: HeadingBandReserve | undefined, defaultMax: number): number {
  if (!reserve?.rects.length) return defaultMax
  let maxW = defaultMax
  for (const r of reserve.rects) {
    const minLeft = r.x + r.w + RESERVE_GAP
    const half = 640 - minLeft
    if (half > 0) maxW = Math.min(maxW, half * 2)
  }
  return Math.max(1, maxW)
}

type KickerSide = "default" | "left" | "right"

interface KickerLayout {
  x: number
  y: number
  fontSize: number
  side: KickerSide
}

function stackedGlyphBoxes(
  source: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
): BandRect[] {
  const step = fontSize + 6
  return Array.from(source).map((ch, i) => {
    const ty = y + i * step
    const w = measureTextUnits(ch, { fontFamily }) * fontSize
    return glyphBox(x, ty, fontSize, w)
  })
}

function kickerMarkBox(
  knobs: HeadingKnobs,
  short: boolean,
  layoutX: number,
  fontSize: number,
): BandRect | null {
  if (knobs.kickerMark === "vermilion-dot") {
    const markSize = 10
    return { x: layoutX + (fontSize - markSize) / 2, y: 72, w: markSize, h: markSize }
  }
  if (knobs.kickerMark === "gold-rule") return { x: layoutX - 8, y: 64, w: 1, h: short ? 96 : 120 }
  return null
}

function resolveKickerLayout(
  source: string,
  knobs: HeadingKnobs,
  fontFamily: string,
  reserve: HeadingBandReserve | undefined,
  short: boolean,
): KickerLayout {
  const fontSize = short ? 16 : verticalKickerFontSize(knobs)
  const pos = verticalKickerPos(knobs)
  if (!reserve?.rects.length) return { x: pos.x, y: pos.y, fontSize, side: "default" }
  const boxes = stackedGlyphBoxes(source, pos.x, pos.y, fontSize, fontFamily)
  const mark = kickerMarkBox(knobs, short, pos.x, fontSize)
  const hits = reserve.rects.filter(
    (r) => boxes.some((b) => aabbIntersect(b, r)) || (mark !== null && aabbIntersect(mark, r)),
  )
  if (hits.length === 0) return { x: pos.x, y: pos.y, fontSize, side: "default" }
  const leftBound = Math.min(...hits.map((r) => r.x))
  const rightBound = Math.max(...hits.map((r) => r.x + r.w))
  const leftX = leftBound - fontSize - 8
  if (leftX >= RAIL_MIN_X) return { x: leftX, y: pos.y, fontSize, side: "left" }
  return { x: rightBound + RESERVE_GAP, y: pos.y, fontSize, side: "right" }
}

function bodyRect(x: number, y: number): ContentRect {
  return { x, y, w: PAGE_RIGHT - x, h: PAGE_BOTTOM - y }
}

function defaultNoTitleAnchor(treatment: HeadingTreatmentId): NoTitleAnchor {
  if (treatment === "ghost_index") return "mini-index"
  if (treatment === "vertical_kicker") return "short-kicker"
  return "none"
}

function themeIdOf(props: SvgTemplateProps): string | undefined {
  return props.ctx.themeId ?? props.ir.theme?.id
}

function borderFill(colors: ComponentCtx["colors"]): string {
  return colors.border ?? colors.muted
}

function pageBg(ctx: ComponentCtx): string {
  return ctx.defaultBg ?? ctx.colors.bg
}

function ink(preferred: string, ctx: ComponentCtx, fontSize: number): string {
  return accessibleInk(preferred, pageBg(ctx), fontSize)
}

function fitTitle(text: string, fontSize: number, maxWidth: number, fontFamily: string) {
  return fitHeadingLines(text, {
    maxWidth,
    fontSize,
    maxLines: 2,
    minPt: Math.min(24, fontSize),
    fontFamily,
  })
}

function extraTitleY(fitted: ReturnType<typeof fitHeadingLines>): number {
  return Math.max(0, fitted.lines.length - 1) * fitted.lineHeight
}

export interface HeadingTreatmentPaint {
  chrome: ReactNode
  contentRect: ContentRect
  titleY?: number
  titleSize?: number
}

export function tryContentHeadingTreatment(
  props: SvgTemplateProps,
  reserve?: HeadingBandReserve,
): HeadingTreatmentPaint | null {
  const { ir, slide, index, ctx } = props
  if (slide.type !== "content") return null
  const assignment = resolveHeadingTreatment(themeIdOf(props))
  if (!assignment) return null
  const { treatment, knobs } = assignment
  const chapterNumber = chapterNumberFor(ir.slides, index)
  if ((treatment === "ghost_index" || treatment === "tag_box") && chapterNumber === 0) return null

  const heading = slide.heading?.trim() ?? ""
  const subheading = slide.subheading?.trim() ?? ""
  const sectionName = sectionNameFor(ir.slides, index)
  const cjk = headingIsCjk(sectionName, heading || subheading)
  const anchor = knobs?.noTitleAnchor ?? defaultNoTitleAnchor(treatment)
  const args: RenderArgs = {
    ctx,
    knobs: knobs ?? {},
    heading,
    subheading,
    sectionName,
    chapterNumber,
    cjk,
    anchor,
    reserve,
  }

  if (!heading) return renderNoTitle(treatment, args)

  switch (treatment) {
    case "ghost_index":
      return renderGhostIndex(args)
    case "baseline":
      return renderBaseline(args)
    case "tag_box":
      return renderTagBox(args)
    case "lead_accent":
      return renderLeadAccent(args)
    case "vertical_kicker":
      return renderVerticalKicker(args)
    case "center_mirror":
      return renderCenterMirror(args)
  }
}

interface RenderArgs {
  ctx: ComponentCtx
  knobs: HeadingKnobs
  heading: string
  subheading: string
  sectionName: string | null
  chapterNumber: number
  cjk: boolean
  anchor: NoTitleAnchor
  reserve?: HeadingBandReserve
}

function renderNoTitle(
  treatment: HeadingTreatmentId,
  args: RenderArgs,
): { chrome: ReactNode; contentRect: ContentRect } {
  if (treatment === "ghost_index" && args.anchor === "mini-index") {
    return renderGhostMiniIndex(args)
  }
  if (treatment === "vertical_kicker" && args.anchor === "short-kicker") {
    return renderShortKicker(args)
  }
  return { chrome: null, contentRect: bodyRect(PAGE_LEFT, NO_TITLE_Y) }
}

function renderGhostMiniIndex(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const { colors, fonts } = args.ctx
  const fill = args.knobs.indexStyle === "stroke-corner" ? colors.accent : colors.text
  return {
    contentRect: bodyRect(PAGE_LEFT, NO_TITLE_Y),
    chrome: (
      <text
        x={1184}
        y={76}
        fontSize={20}
        fontWeight={700}
        fontFamily={fonts.heading}
        fill={fill}
        opacity={0.35}
        textAnchor="end"
        dominantBaseline="alphabetic"
      >
        {padded(args.chapterNumber)}
      </text>
    ),
  }
}

function kickerSource(args: RenderArgs): string {
  return args.subheading || args.sectionName || ""
}

function renderShortKicker(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const source = kickerSource(args)
  const insetX = args.knobs.insetX ?? PAGE_LEFT
  if (!source || !stacksVertically(source)) {
    return { chrome: null, contentRect: bodyRect(PAGE_LEFT, NO_TITLE_Y) }
  }
  const kicker = resolveKickerLayout(source, args.knobs, args.ctx.fonts.heading, args.reserve, true)
  let contentX = insetX
  if (kicker.side === "right") {
    contentX = Math.max(contentX, kicker.x + kicker.fontSize + RESERVE_GAP)
  }
  return {
    contentRect: bodyRect(contentX, NO_TITLE_Y),
    chrome: <>{verticalSign(args, source, { short: true, layout: kicker })}</>,
  }
}

function verticalSign(
  args: RenderArgs,
  source: string,
  opts: { short: boolean; layout?: KickerLayout },
): ReactNode {
  const { colors, fonts } = args.ctx
  const mark = args.knobs.kickerMark ?? "none"
  const pos = verticalKickerPos(args.knobs)
  const layout = opts.layout ?? {
    x: pos.x,
    y: pos.y,
    fontSize: opts.short ? 16 : verticalKickerFontSize(args.knobs),
    side: "default" as const,
  }
  const fill = verticalKickerFill(args.knobs, colors)
  const markSize = 10
  return (
    <>
      {mark === "vermilion-dot" && (
        <g data-decor="">
          <rect
            x={layout.x + (layout.fontSize - markSize) / 2}
            y={72}
            width={markSize}
            height={markSize}
            fill={colors.accent}
          />
        </g>
      )}
      {mark === "gold-rule" && (
        <g data-decor="">
          <rect x={layout.x - 8} y={64} width={1} height={opts.short ? 96 : 120} fill={colors.accent} />
        </g>
      )}
      {stackChars(source, {
        x: layout.x,
        y: layout.y,
        fontSize: layout.fontSize,
        fill: ink(fill, args.ctx, layout.fontSize),
        fontFamily: fonts.heading,
      })}
    </>
  )
}

function verticalKickerFontSize(knobs: HeadingKnobs): number {
  if (knobs.kickerMark === "vermilion-dot") return 16
  return 16
}

function verticalKickerPos(knobs: HeadingKnobs): { x: number; y: number } {
  if (knobs.kickerMark === "vermilion-dot") return { x: 104, y: 100 }
  if (knobs.kickerMark === "gold-rule") return { x: 116, y: 78 }
  return { x: 112, y: 76 }
}

function verticalKickerFill(knobs: HeadingKnobs, colors: ComponentCtx["colors"]): string {
  if (knobs.kickerMark === "gold-rule") return colors.accent
  return colors.muted
}

function renderGhostIndex(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const { colors, fonts } = args.ctx
  const hasSub = args.subheading.length > 0
  const pad = resolveEmphasisForm(args.ctx.emphasis) === "pad"
  const heading = pad ? stripEmphasis(args.heading) : args.heading
  const titleX = leftTitleX(PAGE_LEFT, 128, 42, heading, fonts.heading, args.reserve)
  const title = fitTitle(heading, 42, titleMaxWidthFor(titleX), fonts.heading)
  const titleSegments = pad
    ? sliceEmphasisForLines(parseEmphasis(args.heading), title.lines)
    : title.lines.map((line) => [{ text: line, emphasized: false }])
  const y = (hasSub ? 238 : 196) + extraTitleY(title)
  const index = padded(args.chapterNumber)
  const strokeCorner = args.knobs.indexStyle === "stroke-corner"
  return {
    contentRect: bodyRect(PAGE_LEFT, y),
    chrome: (
      <>
        {strokeCorner ? (
          <>
            <text
              x={1184}
              y={86}
              fontSize={34}
              fontWeight={700}
              fontFamily={fonts.heading}
              fill={ink(colors.accent, args.ctx, 34)}
              textAnchor="end"
              dominantBaseline="alphabetic"
            >
              {index}
            </text>
            <g data-decor="">
              <rect x={1122} y={96} width={62} height={1} fill={borderFill(colors)} />
            </g>
          </>
        ) : (
          <text
            x={1300}
            y={212}
            fontSize={230}
            fontWeight={700}
            fontFamily={fonts.heading}
            fill={colors.text}
            opacity={0.07}
            textAnchor="end"
            dominantBaseline="alphabetic"
            data-bleed="1"
          >
            {index}
          </text>
        )}
        {title.lines.map((line, i) => {
          const titleFill = ink(colors.text, args.ctx, title.fontSize)
          return renderEmphasisText(
            titleSegments[i] ?? [{ text: line, emphasized: false }],
            {
              accent: colors.accent,
              padFill: colors.accent,
              baseFill: titleFill,
              fontWeight: "700",
              emphasis: args.ctx.emphasis,
              measureWeight: { bold: true, fontFamily: fonts.heading },
            },
            <text
              key={i}
              x={titleX}
              y={128 + i * title.lineHeight}
              fontSize={title.fontSize}
              fontWeight={700}
              fontFamily={fonts.heading}
              fill={titleFill}
              dominantBaseline="alphabetic"
            />,
          )
        })}
        {hasSub &&
          (pad
            ? renderEmphasisText(
                parseEmphasis(args.subheading),
                {
                  accent: colors.accent,
                  padFill: colors.accent,
                  baseFill: ink(colors.muted, args.ctx, 18),
                  fontWeight: "700",
                  emphasis: args.ctx.emphasis,
                  measureWeight: { fontFamily: fonts.body },
                },
                <text
                  x={96}
                  y={172 + extraTitleY(title)}
                  fontSize={18}
                  fontFamily={fonts.body}
                  fill={ink(colors.muted, args.ctx, 18)}
                  dominantBaseline="alphabetic"
                />,
              )
            : (
                <text
                  x={96}
                  y={172 + extraTitleY(title)}
                  fontSize={18}
                  fontFamily={fonts.body}
                  fill={ink(colors.muted, args.ctx, 18)}
                  dominantBaseline="alphabetic"
                >
                  {args.subheading}
                </text>
              ))}
      </>
    ),
  }
}

function renderBaseline(args: RenderArgs): HeadingTreatmentPaint {
  const { colors, fonts } = args.ctx
  const hasSub = args.subheading.length > 0
  const rule = args.knobs.rule ?? "hairline"
  const rightSlot = args.knobs.rightSlot ?? "none"
  const journalEnhanced = (rule === "double-tone" || rule === "wenwu") && hasSub
  const insightSide = rule === "hairline" && hasSub
  const sidePhrase = insightSide
    ? fitSvgLine(args.subheading, { maxWidth: 200, fontSize: 16, minFontSize: 16, fontFamily: fonts.body })
    : null
  const titleX = leftTitleX(PAGE_LEFT, 132, 40, args.heading, fonts.heading, args.reserve)
  const title = fitTitle(args.heading, 40, titleMaxWidthFor(titleX), fonts.heading)
  const lift = extraTitleY(title)
  const contentY = (journalEnhanced ? 248 : 210) + lift
  const numero =
    rightSlot === "numero-name" && args.sectionName
      ? formatJournalRightSlot(args.chapterNumber, args.sectionName)
      : null
  return {
    contentRect: bodyRect(PAGE_LEFT, contentY),
    titleY: 132,
    titleSize: title.fontSize,
    chrome: (
      <>
        {title.lines.map((line, i) => (
          <text
            key={i}
            x={titleX}
            y={132 + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={700}
            fontFamily={fonts.heading}
            fill={ink(colors.text, args.ctx, title.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
        {sidePhrase && (
          <text
            x={1184}
            y={132}
            fontSize={sidePhrase.fontSize}
            fontFamily={fonts.body}
            fill={ink(colors.accent, args.ctx, sidePhrase.fontSize)}
            textAnchor="end"
            dominantBaseline="alphabetic"
          >
            {sidePhrase.text}
          </text>
        )}
        {numero && (
          <text
            x={1184}
            y={132}
            fontSize={16}
            fontFamily={fonts.body}
            fill={ink(colors.accent, args.ctx, 14)}
            textAnchor="end"
            dominantBaseline="alphabetic"
          >
            {numero}
          </text>
        )}
        {rule === "hairline" && (
          <g data-decor="">
            <rect x={96} y={162 + lift} width={1088} height={1} fill={borderFill(colors)} />
          </g>
        )}
        {rule === "wenwu" && (
          <g data-decor="">
            <rect x={96} y={158 + lift} width={1088} height={2} fill={colors.primary} />
            <rect x={96} y={164 + lift} width={1088} height={1} fill={colors.primary} />
          </g>
        )}
        {rule === "double-tone" && (
          <g data-decor="">
            <rect x={96} y={158 + lift} width={1088} height={1} fill={colors.text} />
            <rect x={96} y={163 + lift} width={1088} height={1} fill={borderFill(colors)} />
          </g>
        )}
        {journalEnhanced && (
          <text
            x={96}
            y={188 + lift}
            fontSize={18}
            fontFamily={fonts.body}
            fill={ink(colors.muted, args.ctx, 18)}
            dominantBaseline="alphabetic"
          >
            {args.subheading}
          </text>
        )}
      </>
    ),
  }
}

function renderTagBox(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const { colors, fonts } = args.ctx
  const hasSub = args.subheading.length > 0
  const box = args.knobs.box ?? "solid-invert"
  const hud = box === "hud-brackets"
  const boxH = hud ? 30 : 38
  const boxFill = box === "solid-invert" ? colors.text : box === "solid-primary" ? colors.primary : colors.surface
  const labelFill =
    box === "solid-invert" ? colors.bg : box === "solid-primary" ? readableOn(colors.primary) : colors.accent
  const labelKind = args.knobs.chapterLabel ?? "act"
  const label = formatChapterLabel(labelKind, args.chapterNumber, hasCjk(args.sectionName ?? ""))
  const labelY = hud ? 77 : 82
  const labelSize = hud ? 16 : box === "solid-primary" ? 17 : 18
  const chipW = 150
  const chipY = 56
  const chipX = nudgeXForReserve({ x: PAGE_LEFT, y: chipY, w: chipW, h: boxH }, args.reserve)
  const titleX = leftTitleX(PAGE_LEFT, 150, 44, args.heading, fonts.heading, args.reserve)
  const title = fitTitle(args.heading, 44, titleMaxWidthFor(titleX), fonts.heading)
  const lift = extraTitleY(title)
  return {
    contentRect: bodyRect(PAGE_LEFT, (hasSub ? 240 : 206) + lift),
    chrome: (
      <>
        <rect x={chipX} y={chipY} width={chipW} height={boxH} fill={boxFill} />
        <text
          x={chipX + chipW / 2}
          y={labelY}
          fontSize={labelSize}
          fontWeight={700}
          fontFamily={hud ? fonts.mono : fonts.heading}
          fill={labelFill}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          {...(hud ? { letterSpacing: 4 } : {})}
        >
          {label}
        </text>
        {title.lines.map((line, i) => (
          <text
            key={i}
            x={titleX}
            y={150 + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={700}
            fontFamily={fonts.heading}
            fill={ink(colors.text, args.ctx, title.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
        {hasSub && (
          <text
            x={96}
            y={190 + lift}
            fontSize={19}
            fontFamily={fonts.body}
            fill={ink(colors.muted, args.ctx, 19)}
            dominantBaseline="alphabetic"
          >
            {args.subheading}
          </text>
        )}
      </>
    ),
  }
}

function renderLeadAccent(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const { colors, fonts } = args.ctx
  const hasSub = args.subheading.length > 0
  const segments = parseEmphasis(args.heading)
  const hasEmph = segments.some((s) => s.emphasized)
  const typeface = args.knobs.accentStyle === "typeface-shift"
  const titleInner = !hasEmph ? (
    args.heading
  ) : (
    segments.map((seg, i) =>
      typeface ? (
        <tspan
          key={i}
          fontFamily={seg.emphasized ? fonts.heading : fonts.body}
          fill={ink(seg.emphasized ? colors.primary : colors.text, args.ctx, 42)}
        >
          {seg.text}
        </tspan>
      ) : (
        <tspan
          key={i}
          fill={ink(seg.emphasized ? colors.accent : colors.text, args.ctx, 42)}
          fontWeight={seg.emphasized ? 700 : 400}
        >
          {seg.text}
        </tspan>
      ),
    )
  )
  const notes = hasSub
    ? layoutSvgText(args.subheading, {
        maxWidth: 220,
        fontSize: 16,
        maxLines: 2,
        minPt: 16,
        fontFamily: fonts.body,
      })
    : null
  const noteYs = [106, 130]
  const titleX = leftTitleX(PAGE_LEFT, 120, 42, args.heading, fonts.heading, args.reserve)
  const titleFit = hasEmph ? null : fitTitle(args.heading, 42, titleMaxWidthFor(titleX), fonts.heading)
  const lift = titleFit ? extraTitleY(titleFit) : 0
  return {
    contentRect: bodyRect(PAGE_LEFT, (hasSub ? 200 : 184) + lift),
    chrome: (
      <>
        {titleFit ? (
          titleFit.lines.map((line, i) => (
            <text
              key={i}
              x={titleX}
              y={120 + i * titleFit.lineHeight}
              fontSize={titleFit.fontSize}
              fontWeight={700}
              fontFamily={fonts.heading}
              fill={ink(colors.text, args.ctx, titleFit.fontSize)}
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))
        ) : (
          <text
            x={titleX}
            y={120}
            fontSize={42}
            fontWeight={700}
            fontFamily={fonts.heading}
            fill={ink(colors.text, args.ctx, 42)}
            dominantBaseline="alphabetic"
          >
            {titleInner}
          </text>
        )}
        {args.knobs.tail === "olive-rule" && (
          <g data-decor="">
            <rect x={titleX} y={142 + lift} width={64} height={2} fill={colors.primary} />
          </g>
        )}
        {notes &&
          notes.lines.map((line, i) => (
            <text
              key={i}
              x={1184}
              y={noteYs[i] ?? 130}
              fontSize={16}
              fontFamily={fonts.body}
              fill={ink(colors.muted, args.ctx, 16)}
              textAnchor="end"
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))}
      </>
    ),
  }
}

function renderVerticalKicker(args: RenderArgs): HeadingTreatmentPaint {
  const { colors, fonts } = args.ctx
  const source = kickerSource(args)
  const stackable = source.length > 0 && stacksVertically(source)
  const defaultTitleX = stackable ? (args.knobs.insetX ?? PAGE_LEFT) : PAGE_LEFT
  const kicker = stackable
    ? resolveKickerLayout(source, args.knobs, fonts.heading, args.reserve, false)
    : null
  const form = resolveEmphasisForm(args.ctx.emphasis)
  const headingForFit = form === "tint" ? args.heading : stripEmphasis(args.heading)
  let titleX = leftTitleX(defaultTitleX, 126, 42, headingForFit, fonts.heading, args.reserve)
  if (kicker?.side === "right") {
    titleX = Math.max(titleX, kicker.x + kicker.fontSize + RESERVE_GAP)
  }
  const title = fitTitle(headingForFit, 42, titleMaxWidthFor(titleX), fonts.heading)
  const titleSegments = sliceEmphasisForLines(parseEmphasis(args.heading), title.lines)
  const titleFill = ink(colors.text, args.ctx, title.fontSize)
  const titleAccent = ink(colors.accent, args.ctx, title.fontSize)
  const contentY = (args.knobs.kickerMark === "vermilion-dot" ? 200 : 196) + extraTitleY(title)
  let contentX = defaultTitleX
  if (kicker?.side === "right") {
    const lastY = kicker.y + (Array.from(source).length - 1) * (kicker.fontSize + 6)
    const lastBottom = lastY + kicker.fontSize * 0.25
    if (lastBottom > contentY) {
      contentX = Math.max(contentX, kicker.x + kicker.fontSize + RESERVE_GAP)
    }
  }
  return {
    contentRect: bodyRect(contentX, contentY),
    titleY: 126,
    titleSize: title.fontSize,
    chrome: (
      <>
        {stackable && kicker && verticalSign(args, source, { short: false, layout: kicker })}
        {form === "tint"
          ? title.lines.map((line, i) => (
              <text
                key={i}
                x={titleX}
                y={126 + i * title.lineHeight}
                fontSize={title.fontSize}
                fontWeight={700}
                fontFamily={fonts.heading}
                fill={titleFill}
                dominantBaseline="alphabetic"
              >
                {line}
              </text>
            ))
          : title.lines.map((line, i) =>
              renderEmphasisText(
                titleSegments[i] ?? [{ text: line, emphasized: false }],
                {
                  accent: titleAccent,
                  padFill: colors.accent,
                  baseFill: titleFill,
                  fontWeight: "700",
                  emphasis: args.ctx.emphasis,
                  measureWeight: { bold: true, fontFamily: fonts.heading },
                },
                <text
                  key={i}
                  x={titleX}
                  y={126 + i * title.lineHeight}
                  fontSize={title.fontSize}
                  fontWeight={700}
                  fontFamily={fonts.heading}
                  fill={titleFill}
                  dominantBaseline="alphabetic"
                />,
              ),
            )}
      </>
    ),
  }
}

function renderCenterMirror(args: RenderArgs): { chrome: ReactNode; contentRect: ContentRect } {
  const { colors, fonts } = args.ctx
  const hasSub = args.subheading.length > 0
  const mirror = args.knobs.mirror ?? "hairline"
  const titleFill = mirror === "hairline" ? colors.accent : mirror === "gold-rule" ? colors.primary : colors.text
  const title = fitTitle(args.heading, 42, centerTitleMaxWidth(args.reserve, 1088), fonts.heading)
  const lift = extraTitleY(title)
  const contentY = (hasSub ? 236 : mirror === "hairline" ? 216 : 212) + lift
  const eyebrowKind = args.knobs.chapterLabel ?? "chapter"
  const eyebrow =
    args.chapterNumber > 0 ? formatChapterLabel(eyebrowKind, args.chapterNumber, args.cjk) : null
  return {
    contentRect: bodyRect(PAGE_LEFT, contentY),
    chrome: (
      <>
        {mirror === "hairline" && (
          <g data-decor="">
            <rect x={500} y={64} width={90} height={1} fill={borderFill(colors)} />
            <rect x={690} y={64} width={90} height={1} fill={borderFill(colors)} />
          </g>
        )}
        {mirror === "bar" && (
          <g data-decor="">
            <rect x={556} y={62} width={24} height={3} fill={colors.accent} />
            <rect x={700} y={62} width={24} height={3} fill={colors.accent} />
          </g>
        )}
        {mirror === "gold-rule" && (
          <g data-decor="">
            <rect x={470} y={60} width={120} height={1.5} fill={colors.accent} />
            <rect x={690} y={60} width={120} height={1.5} fill={colors.accent} />
          </g>
        )}
        {eyebrow && (
          <text
            x={640}
            y={70}
            fontSize={16}
            fontFamily={fonts.body}
            fill={ink(colors.muted, args.ctx, 16)}
            textAnchor="middle"
            dominantBaseline="alphabetic"
          >
            {eyebrow}
          </text>
        )}
        {title.lines.map((line, i) => (
          <text
            key={i}
            x={640}
            y={130 + i * title.lineHeight}
            fontSize={title.fontSize}
            fontWeight={700}
            fontFamily={fonts.heading}
            fill={ink(titleFill, args.ctx, title.fontSize)}
            textAnchor="middle"
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
        {(args.knobs.diamond || (hasSub && mirror === "gold-rule")) && (
          // Identity: champagne gold (or the theme accent) is the mark. Midground, under type, no fade.
          <g data-decor="" data-decor-role="identity" data-identity="true">
            <path d="M 640 156 l 5 7 l -5 7 l -5 -7 z" fill={colors.accent} />
          </g>
        )}
        {hasSub && (
          <text
            x={640}
            y={176 + lift}
            fontSize={17}
            fontFamily={fonts.body}
            fill={ink(colors.muted, args.ctx, 17)}
            textAnchor="middle"
            dominantBaseline="alphabetic"
          >
            {args.subheading}
          </text>
        )}
      </>
    ),
  }
}
