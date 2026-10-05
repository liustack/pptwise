import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { DOSSIER_SPEC, dossierBaseline, dossierInks, dossierMeta, dossierWidth, heartbeatPoints } from "../layouts/compositions/dossier"

/**
 * clinic-motif —— 临床评估档案的页眉与页脚，clinic 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-05-clinic/`）。旧的封面页中长心搏线退役：封面的心搏
 * 线如今是 `dossier-cover` 自己的，横在标题和抬头之间。
 *
 * 页眉（封面以外每一页）：左上一段短心搏线，x64 起 34px 长，accent 色 1.6px，
 * 起笔就跳一下。后面是页面的章节标签，那是脸画的（`kicker`）。内容页右上角
 * 还有一行 12px 灰字：deck 的 `footer.label`（「GLP-1 类减重药进院评估 · 药
 * 事会审议」），这份档案的主题。
 *
 * 页脚（内容页，deck 要页脚时）：左边 12px 灰字的汇报部门
 * （`meta.organization`，接着 `footer.notice`），右边「N / M」，前面是草稿和
 * 保密标记。N 是 PowerPoint 的页码字段，挪页时自己会变，M 是导出时的总页
 * 数。本 motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行（连同
 * `label`）由它来印，共享页脚让位。页码和其余标记只上内容页，跟全 deck 的页
 * 脚规矩一致，所以章节页和结尾页只有心搏线。
 *
 * 心搏线是页面骨架（`structure`），原色满画。小字是定稿的 12px，带
 * `dossier-spec` 豁免。零 theme id、零 hex，颜色只来自 ctx。
 */

const LEFT = 64
const RIGHT = 1216
const PULSE = { y: 38, w: 34, at: 0.05, stroke: 1.6 } as const
const LABEL = { top: 28, lineHeight: 20, size: 12 } as const
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function ClinicMotif(props: DecorProps) {
  const { ir, slide, ctx, page } = props
  // The cover sets its own heartbeat (`dossier-cover`).
  if (slide.type === "cover") return null
  const inks = dossierInks(ctx)
  const row = drawsRow(props)
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const meta = dossierMeta(inks.muted, inks.ground)
  return (
    <>
      <DecorPiece id="pulse" role="structure">
        <polyline points={heartbeatPoints(LEFT, PULSE.y, PULSE.w, PULSE.at)} fill="none" stroke={inks.accent} strokeWidth={PULSE.stroke} strokeLinejoin="round" strokeLinecap="round" />
        {row && footer.label ? (
          <text
            {...DOSSIER_SPEC}
            data-dossier-subject=""
            x={RIGHT}
            y={dossierBaseline(LABEL.top, LABEL.lineHeight, LABEL.size)}
            textAnchor="end"
            fontFamily={ctx.fonts.body}
            fontSize={LABEL.size}
            fill={meta}
            dominantBaseline="alphabetic"
          >
            {footer.label}
          </text>
        ) : null}
      </DecorPiece>
      {row ? (
        <DecorPiece id="folio" role="structure">
          <ClinicFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The folio: the reporting office at the left, 「N / M」 at the right, N a slide-number field. */
function ClinicFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const y = dossierBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...DOSSIER_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const left = [footer.organization, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const total = `/ ${ir.slides.length}`
  const space = dossierWidth(" ", FOLIO.size, ctx)
  const totalX = RIGHT - dossierWidth(total, FOLIO.size, ctx)
  const numberRight = totalX - space
  const folioLeft = numberRight - dossierWidth(String(pageIndex + 1), FOLIO.size, ctx)
  return (
    <g data-footer="row">
      {left ? text(left, LEFT, "start") : null}
      {right ? text(right, footer.pageNumber ? folioLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-dossier-folio="">
          {text(String(pageIndex + 1), numberRight, "end", { "data-field": SLIDE_NUMBER_FIELD })}
          {text(total, totalX, "start")}
        </g>
      ) : null}
    </g>
  )
}
