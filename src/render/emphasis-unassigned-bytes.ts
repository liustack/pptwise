import { createHash } from "node:crypto"
import { renderSlideSvg } from "../api"
import type { PptxIR, Slide } from "../ir"
import { CANONICAL_THEME_IDS } from "../themes"
import { resolveComponentForm } from "../components/form-assignments"

/**
 * Unassigned-theme emphasis byte-nail matrix. Shared by the colocated test
 * and `scripts/write-unassigned-bytes.mts`. Call `installNodePlatform()`
 * before `computeEmphasisUnassignedPages`.
 */

export const UNASSIGNED = CANONICAL_THEME_IDS.filter(
  (themeId) => resolveComponentForm("emphasis", themeId) === undefined,
)

export const MARKED_HEADING = "年度**增长结论**与下一步投入"
export const MARKED_SUBHEADING = "先看**关键判断**，再展开证据"

export const EMPHASIS_UNASSIGNED_BYTES_URL = new URL(
  "./__fixtures__/emphasis-unassigned-bytes.json",
  import.meta.url,
)

function content(layout: string, component: Slide["components"][number]): Slide {
  return {
    type: "content",
    kind: "points",
    layout,
    heading: MARKED_HEADING,
    subheading: MARKED_SUBHEADING,
    components: [component],
  } as Slide
}

function deck(themeId: string): PptxIR {
  return {
    version: "5",
    filename: "emphasis-unassigned-byte-nail.pptx",
    theme: { id: themeId },
    meta: { organization: "pptwise" },
    assets: { images: {} },
    slides: [
      {
        type: "cover",
        heading: MARKED_HEADING,
        subheading: MARKED_SUBHEADING,
        components: [],
      } as Slide,
      { type: "chapter", heading: "增长战略", components: [] } as Slide,
      content("two-column", {
        type: "paragraph",
        text: "普通正文中的**关键证据**保持原有强调画法。",
      }),
      content("split-band", {
        type: "bullets",
        items: ["第一条包含**关键证据**", "第二条保持普通文本"],
      }),
      content("bento-panel", {
        type: "callout",
        variant: "info",
        text: "提示中的**关键证据**保持原有强调画法。",
      }),
      content("quiet-frame", {
        type: "verdict_banner",
        tone: "positive",
        text: "结论中的**关键证据**保持原有强调画法。",
      }),
    ],
  } as PptxIR
}

function sha(svg: string): string {
  return createHash("sha256").update(svg).digest("hex")
}

export function computeEmphasisUnassignedPages(): Record<string, string> {
  const pages: Record<string, string> = {}
  for (const themeId of UNASSIGNED) {
    const ir = deck(themeId)
    for (const pageIndex of [0, 2, 3, 4, 5]) {
      pages[`${themeId}|${pageIndex}`] = sha(renderSlideSvg(ir, pageIndex))
    }
  }
  return pages
}
