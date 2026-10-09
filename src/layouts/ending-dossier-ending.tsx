import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { boundaryBulletItems } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import { splitRow } from "./compositions/rows"
import {
  dossierBaseline,
  dossierInks,
  dossierMeta,
  dossierText,
  dossierWidth,
  paintDossier,
  paintDossierCard,
  paintDossierLine,
  paintDossierTracked,
} from "./compositions/dossier"
import { DOSSIER_LEFT, DOSSIER_RIGHT, DOSSIER_W, DossierSection, fitDossierTitle, dossierTitleSet } from "./dossier-shared"

/**
 * dossier-ending：临床评估档案的表决页，clinic 2026-10 定稿（p18）重画。
 *
 * 左上的短心搏线归 motif，后面是页面的 `kicker`（「表决」）。标题 40/56 粗
 * 体，从 y80 起，放得下就一行，放不下折两行，中文在逗号处断，下面一条细线，
 * 左端压 56×3 的一段青绿。
 *
 * 有 `subheading` 时，它作一行灰字（16/24，最多两行）站在细线下，条目跟着下
 * 移。细线下是要表决的条目：第一组 `bullets`，每条写成「类别：事项」，一条一张
 * 卡片：左边青绿大号序号，类别是青绿粗体小字（字距 2px），事项是墨色粗体。
 * 页面有 `ballot` 时，卡片右侧每个选项一个勾选框，第一个描青绿边，其余描灰
 * 边，选项名（「同意」「不同意」「弃权」）在卡片上方一行灰字。条目最多四条。
 *
 * 底部一条细线下是提请栏：页面的 `fields` 连成一行（「提请：药学部」「日
 * 期：2026 年 10 月」），右边是 `ballot` 的签字栏，一行字后面留一段签名线。
 * 零 theme id、零 hex。
 */

const TITLE = { top: 80, size: 40, lineHeight: 56, minPt: 30 } as const
const RULE = { y: 152, bar: { w: 56, h: 3 } } as const
const CHOICES = { top: 178, size: 12, lineHeight: 20, col: 120, right: 1180, box: 28, stroke: 1.8 } as const
const ITEMS = { top: 206, pitch: 112, gap: 16, max: 4, minH: 64 } as const
const NUMBER = { x: 24, size: 36, lineHeight: 52 } as const
const LABEL = { x: 86, size: 14, lineHeight: 24, tracking: 2, gap: 2 } as const
const TEXT = { size: 22, lineHeight: 34, minPt: 18, trail: 30 } as const
const FOOT = { rule: 560, top: 580, size: 15, lineHeight: 24, line: 128, gap: 6, fieldGap: 45 } as const
const SUB = { top: 168, size: 16, lineHeight: 24, maxLines: 2, gap: 10 } as const

export function DossierEnding({ slide, ctx }: SvgTemplateProps) {
  const inks = dossierInks(ctx)
  const chinese = ctx.figures?.chinese ?? true
  const colon = chinese ? "：" : ": "
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt)
  const titleInk = dossierText(inks.ink, inks.ground, title.fontSize)
  const titleShift = Math.max(0, title.lines.length - 1) * title.lineHeight
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, {
        maxWidth: DOSSIER_W,
        fontSize: SUB.size,
        minPt: SUB.size,
        maxLines: SUB.maxLines,
        lineHeightRatio: SUB.lineHeight / SUB.size,
        fontFamily: ctx.fonts.body,
        bold: false,
      })
    : null
  // What stands under the rule pushes the choices and the items down.
  const shift = titleShift + (sub ? sub.lines.length * SUB.lineHeight + SUB.gap : 0)
  const first = dossierBaseline(TITLE.top, title.lineHeight, title.fontSize)
  const bullets = slide.components.find((component) => component.type === "bullets")
  // An item written 「类别：事项」 splits at its colon, which is set as the break
  // after the kind (`data-gloss-break`) rather than printed.
  const items = boundaryBulletItems(slide, ITEMS.max).map((raw) => {
    const row = splitRow(raw)
    const whole = raw.trim()
    return { ...row, glossBreak: row.label ? whole.slice(row.label.length, whole.length - row.gloss.length).trim() : "" }
  })
  const ballot = slide.ballot
  const choices = ballot?.choices ?? []
  const choicesX = CHOICES.right - CHOICES.col * choices.length
  const textRight = choices.length > 0 ? choicesX - TEXT.trail : DOSSIER_RIGHT - 40
  const itemsTop = ITEMS.top + shift
  const pitch = items.length > 0 ? Math.min(ITEMS.pitch, (FOOT.rule - ITEMS.gap - itemsTop + ITEMS.gap) / items.length) : ITEMS.pitch
  const cardH = pitch - ITEMS.gap
  const texts = items.map((item) =>
    fitEmphasisText(item.gloss, {
      maxWidth: textRight - (DOSSIER_LEFT + LABEL.x),
      fontSize: TEXT.size,
      minPt: TEXT.minPt,
      maxLines: 1,
      lineHeightRatio: TEXT.lineHeight / TEXT.size,
      fontFamily: ctx.fonts.heading,
      bold: true,
    }),
  )
  const fields = slide.fields ?? []
  const fieldTexts = fields.map((f) => `${f.label}${colon}${f.value}${f.note?.trim() ? ` ${f.note.trim()}` : ""}`)
  const fieldXs: number[] = []
  let fieldAt = DOSSIER_LEFT
  for (const text of fieldTexts) {
    fieldXs.push(fieldAt)
    fieldAt += dossierWidth(text, FOOT.size, ctx) + FOOT.fieldGap
  }
  const meta = dossierMeta(inks.muted, inks.ground)
  const signature = ballot?.signature?.trim()
  return (
    <>
      {/* Every item's boxes stand in the same columns: boxes of an item's own have no place. */}
      {ballot?.item_choices ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <DossierSection slide={slide} ctx={ctx} />
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={DOSSIER_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={DOSSIER_LEFT} y={RULE.y + titleShift} width={DOSSIER_W} height={1} fill={inks.line} />
      <rect x={DOSSIER_LEFT} y={RULE.y + titleShift - 1} width={RULE.bar.w} height={RULE.bar.h} fill={inks.mark} />
      {sub
        ? paintDossier(sub, {
            ctx,
            x: DOSSIER_LEFT,
            top: SUB.top + titleShift,
            fill: dossierText(inks.muted, inks.ground, SUB.size),
            ...(sub.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
          })
        : null}
      {choices.length > 0 ? (
        <g data-dossier-choices="">
          {choices.map((choice, j) =>
            paintDossierLine(choice, { ctx, key: `c${j}`, x: choicesX + j * CHOICES.col + CHOICES.col / 2, top: CHOICES.top + shift, lineHeight: CHOICES.lineHeight, size: CHOICES.size, anchor: "middle", fill: meta }),
          )}
        </g>
      ) : null}
      {bullets && cardH >= ITEMS.minH ? (
        <g data-dossier-motions="" {...blockTag(ctx, bullets)}>
          {items.map((item, i) => {
            const y = itemsTop + i * pitch
            const blockH = item.label ? LABEL.lineHeight + LABEL.gap + TEXT.lineHeight : TEXT.lineHeight
            const labelTop = y + (cardH - blockH) / 2
            const textTop = item.label ? labelTop + LABEL.lineHeight + LABEL.gap : labelTop
            const text = texts[i]!
            return (
              <g key={i} data-dossier-motion="">
                {paintDossierCard({ x: DOSSIER_LEFT, y, w: DOSSIER_W, h: cardH }, inks)}
                {paintDossierLine(String(i + 1), { ctx, x: DOSSIER_LEFT + NUMBER.x, top: y + (cardH - NUMBER.lineHeight) / 2, lineHeight: NUMBER.lineHeight, size: NUMBER.size, bold: true, fill: dossierText(inks.mark, inks.paper, NUMBER.size) })}
                {item.label
                  ? paintDossierTracked({ ctx, text: item.label, x: DOSSIER_LEFT + LABEL.x, y: dossierBaseline(labelTop, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: dossierText(inks.mark, inks.paper, LABEL.size), attrs: { "data-gloss-break": item.glossBreak } })
                  : null}
                {paintDossier(text, {
                  ctx,
                  x: DOSSIER_LEFT + LABEL.x,
                  top: textTop,
                  bold: true,
                  fill: dossierText(inks.ink, inks.paper, text.fontSize),
                  ground: inks.paper,
                  ...(text.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
                })}
                {choices.map((_, j) => (
                  <rect
                    key={j}
                    data-dossier-tickbox=""
                    x={choicesX + j * CHOICES.col + (CHOICES.col - CHOICES.box) / 2 + 0.9}
                    y={y + (cardH - CHOICES.box) / 2 + 0.9}
                    width={CHOICES.box - 1.8}
                    height={CHOICES.box - 1.8}
                    rx={4}
                    fill={inks.ground}
                    stroke={j === 0 ? inks.mark : inks.ghost}
                    strokeWidth={CHOICES.stroke}
                  />
                ))}
              </g>
            )
          })}
        </g>
      ) : bullets ? (
        <g data-dropped={1} data-dropped-kind="component" />
      ) : null}
      {fieldTexts.length > 0 || signature ? (
        <g data-dossier-signoff="">
          <rect x={DOSSIER_LEFT} y={FOOT.rule} width={DOSSIER_W} height={1} fill={inks.line} />
          {fieldTexts.map((text, i) => paintDossierLine(text, { ctx, key: `f${i}`, x: fieldXs[i]!, top: FOOT.top, lineHeight: FOOT.lineHeight, size: FOOT.size, fill: dossierText(inks.ink, inks.ground, FOOT.size) }))}
          {signature ? (
            <>
              {paintDossierLine(`${signature}${colon.trim()}`, { ctx, x: DOSSIER_RIGHT - FOOT.line - FOOT.gap, top: FOOT.top, lineHeight: FOOT.lineHeight, size: FOOT.size, anchor: "end", fill: dossierText(inks.muted, inks.ground, FOOT.size) })}
              <rect x={DOSSIER_RIGHT - FOOT.line} y={dossierBaseline(FOOT.top, FOOT.lineHeight, FOOT.size) + 3} width={FOOT.line} height={1} fill={inks.muted} />
            </>
          ) : null}
        </g>
      ) : null}
    </>
  )
}

export const layoutDef = {
  // ending-dossier-ending.tsx: clinic's ballot. The items a committee votes
  // on, one card each with its number and kind, a box per choice when the
  // page carries a ballot, who submits it and when, and a line to sign.
  id: "dossier-ending",
  kind: "standard",
  story: {
    name: "Dossier Ballot",
    story:
      "The question stands bold over a hairline, and each item to decide sits on its own numbered card, with a box per choice when the page carries a ballot. The foot says who submits it and when, and leaves a line to sign.",
    positioning: "Closes a submission with what is to be decided. Choose it when the last page should put each item to the vote, or at least set them out one by one.",
    audience: "A committee about to vote, or a reader who needs the decisions as a list to act on.",
    notFor: "Closings that thank the room or ask for discussion, which are not decisions.",
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
  pageFields: ["kicker", "fields", "ballot"],
  headingFit: { maxWidth: DOSSIER_W, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt),
} satisfies LayoutDefinition
