import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { compose } from "./compositions"
import { NOTICE_HEAD_FIT, NoticeHead, NoticeSource } from "./notice-shared"
import { noticeBand, noticeSheetPage } from "./content-notice-sheet"
import { stepAside } from "../render/step-aside"

/*
 * notice-figure: bulletin's fact page, drawn to its 2026-10 board
 * (`design/rounds/2026-10-09-bulletin-kinds/`). The notice header as on every
 * content page, then one figure set as large as the page allows in the
 * brand colour with the line that says what it counts over it, and under a
 * hairline the figures it is read against (`billboard`, in the notice
 * setting). The source in small type at the foot.
 *
 * A page with a subheading, or a body that is not one `kpi_cards` the
 * figure can be set from, goes to the notice sheet.
 */

export function NoticeFigureContent(props: SvgTemplateProps) {
  const { slide, ctx, page } = props
  if (!slide.subheading?.trim()) {
    const { source, rect } = noticeBand(slide, ctx, page)
    const composed = compose({ components: slide.components, ctx, rect, setting: "notice" }, ["billboard"])
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
  return noticeSheetPage(props, (bodyRect) => stepAside({ face: "notice-figure", slide, ctx, bodyRect }))
}

export const layoutDef = {
  id: "notice-figure",
  kind: "standard",
  story: {
    name: "Notice Figure",
    story: "The claim in the notice header, then one figure set as large as the page allows in the brand colour, the line that says what it counts above it, and under a hairline the two or three figures it is read against.",
    positioning: "Serves the fact page in the announcement grammar. Choose it when one number is the news and the page should make it impossible to miss, with just enough beside it to say whether it is large.",
    audience: "A whole organization that will remember one number from the meeting.",
    notFor: "Several figures of equal weight, which belong in a row on the notice sheet.",
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
