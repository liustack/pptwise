import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { PITCH_SPEC, pitchBaseline, pitchInks, pitchMeta, pitchTrackedWidth, pitchWidth, paintPitchTracked } from "../layouts/compositions/pitch"
import { railLeft } from "../layouts/compositions/pitch"
import { pitchStage } from "../layouts/pitch-shared"

/**
 * ember-motif v4 —— 路演舞台的页眉标签与页脚，ember 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-06-ember/`）。v3 什么都不画，角楔归版式。
 *
 * 页眉（内容页，deck 要页脚时）：左上一行 deck 的场合（`footer.label`，
 * 「种子轮路演」），12px 暖灰粗体、字距 3px，跟右上的段落导轨（脸画的，
 * 页面的 `stage`）在同一行。
 *
 * 页脚（内容页）：右下角页码「N」，前面是草稿和保密标记，12px 暖灰；左下
 * 是发文单位（`meta.organization`）和 `footer.notice`。N 是 PowerPoint 的页码
 * 字段，挪页时自己会变。本 motif 在 `footer-roles.ts` 里记为 `"row"`：页脚
 * 这一行（连同 `label`）由它来印，共享页脚让位。页码和其余标记只上内容页，
 * 跟全 deck 的页脚规矩一致。
 *
 * 脸声明左边是它自己的照片时（`decorKeepOut`，pitch-photo 的左半），左下那一组
 * 让到照片右边，不压在照片上；场合不再站在左上（右栏的段落导轨占了那一行），
 * 而是挪进页脚左边那一组，排在发文单位后面。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字是定稿的 12px，带
 * `pitch-spec` 豁免。零 theme id、零 hex。
 */

const LEFT = 64
const RIGHT = 1216
const LABEL = { top: 28, lineHeight: 20, size: 12, tracking: 3 } as const
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

/** Where the left of the page starts: past a photograph the face keeps to itself at the left edge. */
function leftEdge(props: DecorProps): number {
  const photo = props.page?.decorKeepOut?.find((r) => r.x <= 0 && r.y <= 0 && r.h >= 720)
  return photo ? photo.x + photo.w + LEFT : LEFT
}

export function EmberMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const inks = pitchInks(ctx)
  const left = leftEdge(props)
  // Beside a photograph the column's top line is the rail's, and the label
  // joins the folio at the foot.
  const label = left === LEFT ? footer.label : null
  // The label keeps clear of the rail the face sets on the same line.
  const staged = pitchStage(ir, slide)
  const room = (staged ? railLeft(staged.course, ctx, RIGHT) - 24 : RIGHT) - left
  const labelFits = label !== null && pitchTrackedWidth(label, LABEL.size, LABEL.tracking, ctx, true) <= room
  return (
    <>
      {label ? (
        <DecorPiece id="label" role="structure">
          {labelFits ? (
            <g data-pitch-label="">
              {paintPitchTracked({ ctx, text: label, x: left, y: pitchBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: pitchMeta(inks.muted, inks.ground) })}
            </g>
          ) : (
            <g data-dropped={1} data-dropped-kind="label" />
          )}
        </DecorPiece>
      ) : null}
      <DecorPiece id="folio" role="structure">
        <EmberFolio {...props} footer={footer} left={left} />
      </DecorPiece>
    </>
  )
}

/** The folio: the organization and the notice at the left, the page number at the right, a slide-number field. */
function EmberFolio({ ir, slide, ctx, index, footer, left }: DecorProps & { footer: DeckFooter; left: number }) {
  const inks = pitchInks(ctx)
  const meta = pitchMeta(inks.muted, inks.ground)
  const y = pitchBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...PITCH_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const leftText = [footer.organization, left === LEFT ? null : footer.label, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const number = String(pageIndex + 1)
  const numberLeft = RIGHT - pitchWidth(number, FOLIO.size, ctx)
  return (
    <g data-footer="row">
      {leftText ? text(leftText, left, "start") : null}
      {rightText ? text(rightText, footer.pageNumber ? numberLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? <g data-pitch-folio="">{text(number, RIGHT, "end", { "data-field": SLIDE_NUMBER_FIELD })}</g> : null}
    </g>
  )
}
