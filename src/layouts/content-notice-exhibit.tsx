import type { Component, PptxIR, Slide } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { compose } from "./compositions"
import { manuscriptChinese } from "./compositions/manuscript"
import { NOTICE_HEAD_FIT, NoticeHead, NoticeSource } from "./notice-shared"
import { noticeBand, noticeSheetPage } from "./content-notice-sheet"
import { stepAside } from "../render/step-aside"

/*
 * notice-exhibit: bulletin's evidence page, drawn to its 2026-10 board
 * (`design/rounds/2026-10-09-bulletin-kinds/`). The notice header as on every
 * content page, then one exhibit on a white card with its number, a ring in
 * the brand colour round the place in it that proves the claim, and the
 * reading beside it numbered to the ring (`proof`, in the notice setting).
 * The source in small type at the foot.
 *
 * Exhibits are numbered across the deck: in a Chinese deck figures and
 * tables each count their own (「图 2」, 「表 1」), in any other deck they count
 * together as exhibits ("Exhibit 3"). A page with a subheading, or a body the
 * exhibit cannot set, goes to the notice sheet.
 */

/** What an evidence page's exhibit counts as: its first component, a titled chart or table. */
function exhibitOf(slide: Pick<Slide, "type" | "components"> & { kind?: string }): "figure" | "table" | null {
  if (slide.type !== "content" || slide.kind !== "evidence") return null
  const first: Component | undefined = slide.components[0]
  if (first?.type === "chart" && first.title?.trim()) return "figure"
  if (first?.type === "data_table" && first.title?.trim()) return "table"
  return null
}

/**
 * The number the exhibit on the page at `index` takes: one more than the
 * exhibits of its kind on the evidence pages before it, or of either kind
 * outside Chinese.
 */
export function noticeExhibitNumber(ir: Pick<PptxIR, "slides">, index: number, chinese: boolean): number {
  const own = exhibitOf(ir.slides[index]!)
  let n = 1
  for (const slide of ir.slides.slice(0, index)) {
    const kind = exhibitOf(slide)
    if (kind && (!chinese || kind === own)) n += 1
  }
  return n
}

export function NoticeExhibitContent(props: SvgTemplateProps) {
  const { ir, slide, index, ctx, page } = props
  if (!slide.subheading?.trim()) {
    const { source, rect } = noticeBand(slide, ctx, page)
    const exhibitNumber = noticeExhibitNumber(ir, index, manuscriptChinese(ctx, [slide.heading ?? ""]))
    const composed = compose({ components: slide.components, ctx, rect, setting: "notice", exhibitNumber }, ["proof"])
    if (composed) {
      return (
        <>
          <NoticeHead heading={slide.heading} ctx={ctx} />
          {composed}
          <NoticeSource source={source} ctx={ctx} />
        </>
      )
    }
  }
  return noticeSheetPage(props, (bodyRect) => stepAside({ face: "notice-exhibit", slide, ctx, bodyRect }))
}

export const layoutDef = {
  id: "notice-exhibit",
  kind: "standard",
  story: {
    name: "Notice Exhibit",
    story: "The claim in the notice header, then one chart or table on a white card with its number, a ring in the brand colour round the place in it that proves the claim, and the reading beside it, numbered to the ring.",
    positioning: "Serves the evidence page in the announcement grammar. Choose it when a claim rests on one exhibit and the reader should be shown exactly where to look in it.",
    audience: "A whole organization that wants to check the claim with its own eyes.",
    notFor: "An exhibit with no single place that proves the point, which reads better on the notice sheet.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: NOTICE_HEAD_FIT,
  fullBodyCompanions: ["kpi_cards"],
} satisfies LayoutDefinition
