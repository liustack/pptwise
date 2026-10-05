import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { boundaryBulletItems } from "./boundary-content"
import { splitRow } from "./compositions/rows"
import {
  fitYearbook,
  paintYearbook,
  paintYearbookCard,
  paintYearbookTracked,
  Sprout,
  yearbookBaseline,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookTrackedWidth,
} from "./compositions/yearbook"
import { fitDossierTitle } from "./dossier-shared"
import { YearbookSection } from "./yearbook-shared"

/**
 * yearbook-ending：长期年鉴的结尾，almanac 2026-10 定稿（p17）重画。
 *
 * 页面自己的 `background` 照片铺满整页（`drawsPhoto`），左边压一层页面底色
 * 的渐变：从左缘 97% 到 760px 处 94% 的七成宽，再到 760px 处全透明，字都站
 * 在左边。左上角一个 22px 的 sprout，后面是页面的 `kicker`（「决定」），橄
 * 榄色粗体、字距 2px。标题 44/60 粗体从 y110 起，放得下就一行，下面一段
 * 60×4 的赭石短线。
 *
 * 短线下面是要决定的事：第一组 `bullets`，每条写成「类别：事项」，一条一张
 * 半透明的卡片，左边一个空的勾选框，类别是小号粗体（字距 2px），事项是 22px
 * 粗体墨色。作者用 `**…**` 标出的那一条是这一页要先定的：它的卡片描赭石边，
 * 勾选框和类别也用赭石，事项照常墨色。其余描细线，勾选框和类别用橄榄色。
 * 最多四条，条目多时卡片间距收紧。
 *
 * 底部一行灰字是页面的 `subheading`（部门和日期）。没有照片时底就是页面颜
 * 色。不画 motif：sprout 是这一页自己的。零 theme id、零 hex。
 */

const LEFT = 64
const SPROUT = { x: 64, y: 64, size: 22 } as const
const KICKER = { x: 96, top: 64, size: 14, lineHeight: 22 } as const
const TITLE = { top: 110, size: 44, lineHeight: 60, minPt: 32, w: 640 } as const
const BAR = { y: 186, w: 60, h: 4 } as const
const ITEMS = { top: 232, pitch: 108, gap: 16, w: 600, max: 4, floor: 584 } as const
const BOX = { x: 24, size: 26, stroke: 2 } as const
const LABEL = { x: 68, top: 16, size: 13, lineHeight: 22, tracking: 2 } as const
const TEXT = { x: 68, top: 42, size: 22, lineHeight: 32, trail: 20 } as const
const FOOT = { top: 600, size: 14, lineHeight: 22 } as const
/** The scrim over the photograph: the page colour from the left edge, gone by 760px. */
const SCRIM = { w: 760, stops: [{ offset: "0%", opacity: 0.97 }, { offset: "70%", opacity: 0.94 }, { offset: "100%", opacity: 0 }] } as const
/** A card over the photograph: the paper at 95%. */
const CARD_ALPHA = 0.95

export function YearbookEnding({ slide, index, ctx }: SvgTemplateProps) {
  const inks = yearbookInks(ctx)
  const ground = inks.ground
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  const titleInk = yearbookText(inks.ink, ground, title.fontSize)
  const shift = Math.max(0, title.lines.length - 1) * title.lineHeight
  const first = yearbookBaseline(TITLE.top, title.lineHeight, title.fontSize)
  const photo = slide.background?.kind === "asset"
  // An item written 「类别：事项」 splits at its colon, which is set as the break
  // after the kind (`data-gloss-break`) rather than printed.
  const items = boundaryBulletItems(slide, ITEMS.max).map((raw) => {
    const row = splitRow(raw)
    const whole = raw.trim()
    const marked = whole !== stripEmphasis(whole)
    return { ...row, label: row.label ? stripEmphasis(row.label) : undefined, gloss: stripEmphasis(row.gloss), marked, glossBreak: row.label ? whole.slice(row.label.length, whole.length - row.gloss.length).trim() : "" }
  })
  const top = ITEMS.top + shift
  const pitch = items.length > 0 ? Math.min(ITEMS.pitch, (ITEMS.floor - top + ITEMS.gap) / items.length) : ITEMS.pitch
  const cardH = pitch - ITEMS.gap
  const fitted = items.map((item) => ({
    text: fitYearbook(item.gloss, { width: ITEMS.w - TEXT.x - TEXT.trail, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: 1, bold: true }, ctx),
    labelFits: !item.label || yearbookTrackedWidth(item.label, LABEL.size, LABEL.tracking, ctx, true) <= ITEMS.w - LABEL.x - TEXT.trail,
  }))
  const foot = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading.trim(), { maxWidth: ITEMS.w, fontSize: FOOT.size, minPt: FOOT.size, maxLines: 1, lineHeightRatio: FOOT.lineHeight / FOOT.size, fontFamily: ctx.fonts.body, bold: false })
    : null
  const scrimId = `yearbook-ending-scrim-${index}`
  return (
    <>
      {photo ? (
        <g data-photo-scrim="">
          <defs>
            <linearGradient id={scrimId} x1={0} y1={0} x2={1} y2={0}>
              {SCRIM.stops.map((stop) => (
                <stop key={stop.offset} offset={stop.offset} stopColor={ground} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={SCRIM.w} height={720} fill={`url(#${scrimId})`} />
        </g>
      ) : null}
      <Sprout ctx={ctx} x={SPROUT.x} y={SPROUT.y} size={SPROUT.size} />
      <YearbookSection slide={slide} ctx={ctx} x={KICKER.x} top={KICKER.top} size={KICKER.size} lineHeight={KICKER.lineHeight} />
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
      <rect x={LEFT} y={BAR.y + shift} width={BAR.w} height={BAR.h} fill={inks.accent} />
      {items.map((item, i) => {
        const y = top + i * pitch
        const f = fitted[i]!
        const ink = item.marked ? inks.accent : inks.mark
        const textTop = item.label ? TEXT.top : (cardH - TEXT.lineHeight) / 2
        return (
          <g key={i} data-yearbook-decision={item.marked ? "marked" : ""}>
            {paintYearbookCard({ x: LEFT, y, w: ITEMS.w, h: cardH }, inks, { stroke: item.marked ? inks.accent : inks.line, fillOpacity: photo ? CARD_ALPHA : undefined })}
            <rect x={LEFT + BOX.x + BOX.stroke / 2} y={y + (cardH - BOX.size) / 2 + BOX.stroke / 2} width={BOX.size - BOX.stroke} height={BOX.size - BOX.stroke} rx={3} fill="none" stroke={ink} strokeWidth={BOX.stroke} />
            {item.label ? (
              f.labelFits ? (
                paintYearbookTracked({
                  ctx,
                  text: item.label,
                  x: LEFT + LABEL.x,
                  y: yearbookBaseline(y + LABEL.top, LABEL.lineHeight, LABEL.size),
                  size: LABEL.size,
                  tracking: LABEL.tracking,
                  bold: true,
                  fill: yearbookText(ink, inks.paper, LABEL.size),
                })
              ) : (
                <g data-dropped={1} data-dropped-kind="label" />
              )
            ) : null}
            {f.text ? (
              paintYearbook(f.text, {
                ctx,
                x: LEFT + TEXT.x,
                top: y + textTop,
                bold: true,
                fill: yearbookText(inks.ink, inks.paper, TEXT.size),
                ground: inks.paper,
                attrs: item.glossBreak ? { "data-gloss-break": item.glossBreak } : undefined,
              })
            ) : (
              <g data-dropped={1} data-dropped-kind="item" />
            )}
          </g>
        )
      })}
      {foot
        ? renderEmphasisHeading(foot, headingEmphasisPaint(ctx, foot, { baseFill: yearbookMeta(inks.muted, ground), fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
            <text
              key={i}
              data-font-floor-exempt="yearbook-spec"
              data-truncated={foot.truncated ? "1" : undefined}
              x={LEFT}
              y={yearbookBaseline(FOOT.top, FOOT.lineHeight, FOOT.size)}
              fontFamily={ctx.fonts.body}
              fontSize={FOOT.size}
              fill={yearbookMeta(inks.muted, ground)}
              dominantBaseline="alphabetic"
            />
          ))
        : null}
    </>
  )
}

export const layoutDef = {
  // ending-yearbook-ending.tsx: almanac's close. A photograph under a sand
  // scrim from the left, the section after a sprout, the decision large over
  // a short ochre bar, and the things to decide as cards with empty boxes,
  // the one to settle first edged in ochre.
  id: "yearbook-ending",
  kind: "standard",
  story: {
    name: "Yearbook Decisions",
    story: "A photograph of the land fades into the page from the left, where the decision stands large over a short ochre bar and the things to decide wait in cards with empty boxes to tick, the first one edged in ochre.",
    positioning: "The close of a long-term report that ends in a few decisions. Choose it when the room should leave with what it agreed to start.",
    audience: "A board or committee asked to settle a handful of items today.",
    notFor: "A thank-you or a contact page, which wants a quieter close.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEMS.max },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
