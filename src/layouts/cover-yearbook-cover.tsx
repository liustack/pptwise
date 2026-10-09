import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { blendOver } from "../render/ink"
import { boundarySlotBlock } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import {
  fitYearbook,
  paintYearbook,
  paintYearbookLine,
  paintYearbookTracked,
  yearbookBaseline,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookTrackedWidth,
  yearOf,
} from "./compositions/yearbook"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"

type Timeline = Extract<Component, { type: "timeline" }>

/**
 * yearbook-cover：长期年鉴的封面，almanac 2026-10 定稿（p01）重画。
 *
 * 右边整幅照片：页面自己的 `background` 资产，裁成正方形铺满 x560 到页边，
 * 上下出血。左栏是页面底色，底部铺六条等高线（ghost 色细线）。左栏从上到下：
 * 汇报部门（`meta.organization`）和副题（`subheading`）连成一行，橄榄色粗
 * 体、字距 2px；标题 50/66 粗体，放得下就一行，放不下折两行，中文在逗号处
 * 断，底对齐在 y380；下面一段 60×4 的赭石短线；再下面是一条年份刻度：页面
 * 的 `timeline`，日期写成年份的里程碑，从第一年排到最后一年，每年一个点，
 * 有里程碑的年份实心、年份标在上面、里程碑标题（比如免费配额的比例）标在
 * 下面，标了 `highlight` 的那个用赭石；刻度下一行灰字是时间线的标题；最下
 * 面一行是 deck 的日期（`meta.date`）。
 *
 * 照片由脸自己画（`paintsOwnBackground`），这样它只占右边那一块，裁切按那
 * 一块来，而不是整页铺满后再被左栏盖住一半。没有照片时整页都是底色。不画
 * motif：等高线和刻度是封面自己的。零 theme id、零 hex。
 */

const LEFT = 64
const COLUMN = 560
const HEAD = { top: 64, size: 14, lineHeight: 22, tracking: 2 } as const
const TITLE = { foot: 380, size: 50, lineHeight: 66, minPt: 36, w: 470 } as const
const BAR = { y: 396, w: 60, h: 4 } as const
const SCALE = { minYears: 2, x0: 64, x1: 500, y: 520, r: 4, stroke: 1.5, year: { rise: 14, size: 13 }, value: { drop: 24, size: 13 } } as const
const CAPTION = { top: 556, size: 13, lineHeight: 20 } as const
const DATE = { top: 620, size: 15, lineHeight: 22 } as const
/** The board's contour lines: six curves across the column's lower half, the ghost at 60%. */
const CONTOURS = { y: 380, h: 300, n: 6, mix: 0.6 } as const

function contourPath(i: number): string {
  const yy = CONTOURS.y + (i * CONTOURS.h) / CONTOURS.n
  const r = (v: number) => Math.round(v * 10) / 10
  return `M 0 ${r(yy + 20)} C ${r(COLUMN * 0.3)} ${r(yy - 18 + i * 3)}, ${r(COLUMN * 0.65)} ${r(yy + 40 - i * 4)}, ${COLUMN} ${r(yy + 6)}`
}

/** The cover's year scale: a timeline whose every date is a year, laid from its first year to its last. */
function scaleOf(slide: SvgTemplateProps["slide"]): { timeline: Timeline; from: number; to: number; marks: Map<number, Timeline["milestones"][number]> } | null {
  const block = boundarySlotBlock(slide, ["timeline"])
  if (block?.type !== "timeline") return null
  const years = block.milestones.map((m) => (/^\s*\d{4}\s*$/.test(m.date) ? yearOf(m.date) : null))
  if (years.some((y) => y === null) || years.length < SCALE.minYears) return null
  const from = Math.min(...(years as number[]))
  const to = Math.max(...(years as number[]))
  if (to - from < 1 || to - from > 12) return null
  return { timeline: block, from, to, marks: new Map(block.milestones.map((m, i) => [years[i]!, m])) }
}

export function YearbookCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = yearbookInks(ctx)
  const ground = inks.ground
  const org = ir.meta.organization?.trim() ?? ""
  const sub = slide.subheading?.trim() ?? ""
  const head = [org, sub].filter(Boolean).join(" · ")
  const headInk = yearbookText(inks.mark, ground, HEAD.size)
  // The office and the occasion run tracked on one line, or untracked in two when one line cannot hold them.
  // A head with a marked run is set untracked, so the run is painted as marked rather than printed with its markers.
  const headTracked = !head || (head === stripEmphasis(head) && yearbookTrackedWidth(head, HEAD.size, HEAD.tracking, ctx, true) <= COLUMN - LEFT - 16)
  const headLines = head && !headTracked ? fitYearbook(head, { width: COLUMN - LEFT - 16, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 2, bold: true }, ctx) : null
  const headFits = headTracked || headLines !== null
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  const titleInk = yearbookText(inks.ink, ground, title.fontSize)
  const last = yearbookBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const scale = scaleOf(slide)
  const block = boundarySlotBlock(slide, ["timeline"])
  const caption = scale?.timeline.title?.trim()
    ? fitEmphasisText(scale.timeline.title.trim(), { maxWidth: COLUMN - LEFT - 16, fontSize: CAPTION.size, minPt: CAPTION.size, maxLines: 1, lineHeightRatio: CAPTION.lineHeight / CAPTION.size, fontFamily: ctx.fonts.body, bold: false })
    : null
  const date = ir.meta.date?.trim()
  const contour = blendOver(inks.ghost, ground, CONTOURS.mix)
  const count = scale ? scale.to - scale.from + 1 : 0
  const step = count > 1 ? (SCALE.x1 - SCALE.x0) / (count - 1) : 0
  return (
    <>
      <rect data-yearbook-ground="" x={0} y={0} width={photo?.src ? COLUMN : 1280} height={720} fill={ground} />
      {photo?.src ? (
        <image data-yearbook-photo="" href={photo.src} x={COLUMN} y={0} width={1280 - COLUMN} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} />
      ) : null}
      <g data-yearbook-contours="">
        {Array.from({ length: CONTOURS.n }, (_, i) => (
          <path key={i} d={contourPath(i)} fill="none" stroke={contour} strokeWidth={1} />
        ))}
      </g>
      {head ? (
        headFits ? (
          <g data-yearbook-cover-head="">
            {headLines
              ? paintYearbook(headLines, { ctx, x: LEFT, top: HEAD.top, bold: true, fill: headInk })
              : paintYearbookTracked({ ctx, text: head, x: LEFT, y: yearbookBaseline(HEAD.top, HEAD.lineHeight, HEAD.size), size: HEAD.size, tracking: HEAD.tracking, bold: true, fill: headInk })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={LEFT} y={BAR.y} width={BAR.w} height={BAR.h} fill={inks.accent} />
      {scale ? (
        <g {...blockTag(ctx, scale.timeline)} data-yearbook-scale="">
          <line x1={SCALE.x0} y1={SCALE.y} x2={SCALE.x1} y2={SCALE.y} stroke={inks.mark} strokeWidth={SCALE.stroke} />
          {Array.from({ length: count }, (_, i) => {
            const year = scale.from + i
            const x = SCALE.x0 + i * step
            const mark = scale.marks.get(year)
            const valueInk = mark?.highlight ? yearbookText(inks.accent, ground, SCALE.value.size) : yearbookText(inks.ink, ground, SCALE.value.size)
            return (
              <g key={year} data-year={year}>
                <circle cx={x} cy={SCALE.y} r={SCALE.r} fill={mark ? inks.mark : ground} stroke={inks.mark} strokeWidth={mark ? 0 : SCALE.stroke} />
                {mark ? (
                  <>
                    {paintYearbookLine(mark.date.trim(), { ctx, x, baseline: SCALE.y - SCALE.year.rise, size: SCALE.year.size, mono: true, bold: true, anchor: "middle", fill: yearbookText(inks.mark, ground, SCALE.year.size) })}
                    {paintYearbookLine(mark.title, { ctx, x, baseline: SCALE.y + SCALE.value.drop, size: SCALE.value.size, mono: true, bold: true, anchor: "middle", fill: valueInk })}
                  </>
                ) : null}
              </g>
            )
          })}
          {caption
            ? renderEmphasisHeading(caption, headingEmphasisPaint(ctx, caption, { baseFill: yearbookMeta(inks.muted, ground), fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
                <text
                  key={i}
                  data-font-floor-exempt="yearbook-spec"
                  data-truncated={caption.truncated ? "1" : undefined}
                  x={LEFT}
                  y={yearbookBaseline(CAPTION.top, CAPTION.lineHeight, CAPTION.size)}
                  fontFamily={ctx.fonts.body}
                  fontSize={CAPTION.size}
                  fill={yearbookMeta(inks.muted, ground)}
                  dominantBaseline="alphabetic"
                />
              ))
            : null}
          {scale.timeline.milestones.some((m) => m.desc || m.tag || m.source || m.icon || m.lane || m.status) || scale.timeline.periods ? (
            <g data-dropped={1} data-dropped-kind="label" />
          ) : null}
        </g>
      ) : block ? (
        <g data-dropped={1} data-dropped-kind="component" />
      ) : null}
      {date ? paintYearbookLine(date, { ctx, x: LEFT, top: DATE.top, lineHeight: DATE.lineHeight, size: DATE.size, fill: yearbookText(inks.ink, ground, DATE.size) }) : null}
    </>
  )
}

export const layoutDef = {
  // cover-yearbook-cover.tsx: almanac's long-term yearbook cover. A
  // photograph squared on the right, the office and the occasion over a bold
  // title, a short ochre bar, and the run of years with what changes at its
  // ends, over contour lines.
  id: "yearbook-cover",
  kind: "standard",
  story: {
    name: "Yearbook Cover",
    story: "A photograph fills the right half. On the left, over faint contour lines, the office and the occasion run in one tracked line above a bold title, a short ochre bar, and the run of years the report follows with what stands at its two ends.",
    positioning: "Opens a report whose subject runs for years. Choose it when the first page should already show the span the decision has to cover.",
    audience: "A board or committee about to weigh a decision that plays out over a decade.",
    notFor: "A quick update with no horizon to show, which wants a plainer cover.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["timeline"], capacity: 1, itemMinimum: SCALE.minYears, itemCapacity: 13 },
  ],
  drawsPhoto: true,
  paintsOwnBackground: true,
  suppressMotif: true,
  // Over the office's line, where nothing else stands.
  coverMark: { x: LEFT, y: 44 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
