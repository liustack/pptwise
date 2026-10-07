import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { blendOver } from "../render/ink"
import {
  INVITATION_META,
  INVITATION_SPEC,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationTrackedWidth,
  paintInvitationTracked,
} from "../layouts/compositions/invitation"

/**
 * luxe-motif v2 —— 卡纸内框、左下的场合与年月、右下烫金印记页码，luxe
 * 2026-10 定稿重画（设计源 `design/rounds/2026-10-08-luxe/`）。
 *
 * **id 没改**（注册表键，改名牵动 schema 与测试）。v1 的「请柬金框」
 * （双层金框，外框 48,40 1184×640，内框 60,52 1160×616）只上封面与结尾，
 * 原样留给仍然点名旧封面、旧结尾脸的主题副本。新的封面、章节页和结尾页
 * 的脸自己画全，不要 motif。
 *
 * 内容页：四周一圈发丝内框，离页边 24px，走 border（暗檀），永远在。一页
 * 照片从页面左缘铺到中间时（脸在画里写 `data-frame-left`，由 `frameLeft`
 * 传进来），框和页脚都从那里起。页脚（deck 要页脚时）：左下是 deck 页脚的
 * `organization` 接 `label`（「年度经销商大会 · 二〇二六年十月」），11px 暗金、
 * 字距 2px。右下是页码，像金器上打的印记：一个双线圆角小框（外 48×22，
 * 内 42×16），框里 12px 衬线金字，PowerPoint 的页码字段。`notice` 接在
 * 左下那行后面，草稿和保密标记在印记左边，11px 暗金。本 motif 在
 * `footer-roles.ts` 里记为 `"row"`：页脚这一行由它来印，共享页脚让位。
 *
 * 小字带 `invitation-spec` 豁免，页脚的字按 meta 档（3:1）验。零 theme id、
 * 零 hex。
 */

// ── v1: the invitation frame on a cover and an ending that ask for it ─────

const OUTER = { x: 48, y: 40, w: 1184, h: 640, stroke: 1 } as const
const INNER = { x: 60, y: 52, w: 1160, h: 616, stroke: 0.5, opacity: 0.55 } as const

/** Four edge lines, not a hollow rect: a stroked rect's bbox fills the interior and the midground contract drops it when it crosses title ink. */
function frameLines(x: number, y: number, w: number, h: number): readonly [number, number, number, number][] {
  const x2 = x + w
  const y2 = y + h
  return [
    [x, y, x2, y],
    [x2, y, x2, y2],
    [x2, y2, x, y2],
    [x, y2, x, y],
  ]
}

// ── v2: the card stock on every content page ─────────────────────────────

/** The hairline frame, 24px in from the page's edges. */
export const STOCK = { inset: 24, w: 1 } as const
/** The occasion at the foot: from x64 (24px inside the frame beside a photograph), the line box from y666. */
const OCCASION = { pad: 40, photoPad: 24, top: 666, size: 11, lineHeight: 18, tracking: 2 } as const
/** The hallmark: an outer capsule 48 by 22 at x1168, y664, and an inner one 3px inside it. */
const HALLMARK = { x: 1168, y: 664, w: 48, h: 22, inset: 3, inner: 0.6, innerMix: 0.6, size: 12, gap: 16 } as const

/** Whether this page carries the footer row: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function LuxeMotif(props: DecorProps) {
  const { slide, ctx } = props
  if (slide.type === "chapter") return null
  if (slide.type === "content") return <CardStock {...props} />
  const gold = ctx.colors.accent
  return (
    <DecorPiece id="invitation" role="structure">
      {frameLines(OUTER.x, OUTER.y, OUTER.w, OUTER.h).map(([x1, y1, x2, y2]) => (
        <line key={`outer-${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth={OUTER.stroke} />
      ))}
      {frameLines(INNER.x, INNER.y, INNER.w, INNER.h).map(([x1, y1, x2, y2]) => (
        <line key={`inner-${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth={INNER.stroke} opacity={INNER.opacity} />
      ))}
    </DecorPiece>
  )
}

function CardStock(props: DecorProps) {
  const { ir, ctx, page, frameLeft } = props
  const inks = invitationInks(ctx)
  const left = frameLeft ?? STOCK.inset
  const right = 1280 - STOCK.inset
  const top = STOCK.inset
  const bottom = 720 - STOCK.inset
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <>
      <DecorPiece id="stock" role="structure">
        {frameLines(left + 0.5, top + 0.5, right - left - 1, bottom - top - 1).map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={inks.line} strokeWidth={STOCK.w} />
        ))}
      </DecorPiece>
      {drawsRow(props) ? (
        <DecorPiece id="hallmark" role="structure">
          <InvitationFolio {...props} footer={footer} left={frameLeft !== undefined ? frameLeft + OCCASION.photoPad : OCCASION.pad + STOCK.inset} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The footer row: the occasion and the date at the left, the page number struck as a hallmark at the right, the draft and confidentiality marks before it. */
function InvitationFolio({ ir, slide, ctx, index, footer, left }: DecorProps & { footer: DeckFooter; left: number }) {
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const quiet = invitationMeta(inks.dim, ground)
  const y = invitationBaseline(OCCASION.top, OCCASION.lineHeight, OCCASION.size)
  const words = [footer.organization, footer.label, footer.notice].map((part) => (part ? stripEmphasis(part).trim() : "")).filter(Boolean)
  const occasion = words.join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const gold = invitationMark(inks.gold, ground)
  const inner = { x: HALLMARK.x + HALLMARK.inset, y: HALLMARK.y + HALLMARK.inset, w: HALLMARK.w - HALLMARK.inset * 2, h: HALLMARK.h - HALLMARK.inset * 2 }
  const room = (footer.pageNumber ? HALLMARK.x - HALLMARK.gap : 1280 - STOCK.inset - 16) - left
  const occasionFits = !occasion || invitationTrackedWidth(occasion, OCCASION.size, OCCASION.tracking, ctx) <= room - (rightText ? invitationTrackedWidth(rightText, OCCASION.size, 0, ctx) + HALLMARK.gap : 0)
  return (
    <g data-footer="row">
      {occasion && occasionFits ? paintInvitationTracked({ ctx, text: occasion, x: left, y, size: OCCASION.size, tracking: OCCASION.tracking, fill: quiet, attrs: { ...INVITATION_META } }) : null}
      {occasion && !occasionFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {rightText ? (
        <text {...INVITATION_SPEC} {...INVITATION_META} x={footer.pageNumber ? HALLMARK.x - HALLMARK.gap : 1280 - STOCK.inset - 16} y={y} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={OCCASION.size} fill={quiet} dominantBaseline="alphabetic">
          {rightText}
        </text>
      ) : null}
      {footer.pageNumber ? (
        <g data-invitation-hallmark="">
          <rect x={HALLMARK.x + 0.5} y={HALLMARK.y + 0.5} width={HALLMARK.w - 1} height={HALLMARK.h - 1} rx={(HALLMARK.h - 1) / 2} fill="none" stroke={gold} strokeWidth={1} />
          <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx={inner.h / 2} fill="none" stroke={blendOver(gold, ground, HALLMARK.innerMix)} strokeWidth={HALLMARK.inner} />
          <text {...INVITATION_SPEC} {...INVITATION_META} data-field={SLIDE_NUMBER_FIELD} x={HALLMARK.x + HALLMARK.w / 2} y={invitationBaseline(HALLMARK.y, HALLMARK.h, HALLMARK.size, true)} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={HALLMARK.size} fill={invitationMeta(inks.gold, ground)} dominantBaseline="alphabetic">
            {String(pageIndex + 1)}
          </text>
        </g>
      ) : null}
    </g>
  )
}
