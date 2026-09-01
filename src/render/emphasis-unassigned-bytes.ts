import { createHash } from "node:crypto"
import { renderSlideSvg } from "../api"
import type { PptxIR, Slide } from "../ir"
import { CANONICAL_THEME_IDS } from "../themes"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { getThemeDefinition } from "../themes/definitions"

/**
 * Unassigned-theme emphasis byte-nail matrix. Shared by the colocated test
 * and `scripts/write-unassigned-bytes.mts`. Call `installNodePlatform()`
 * before `computeEmphasisUnassignedPages`.
 */

export const UNASSIGNED = CANONICAL_THEME_IDS.filter(
  (themeId) => getThemeDefinition(themeId).emphasis === undefined,
)

export const MARKED_HEADING = "年度**增长结论**与下一步投入"
export const MARKED_SUBHEADING = "先看**关键判断**，再展开证据"

export const EMPHASIS_UNASSIGNED_BYTES_URL = new URL(
  "./__fixtures__/emphasis-unassigned-bytes.json",
  import.meta.url,
)

function content(kind: "comparison" | "data" | "list" | "statement", component: Slide["components"][number]): Slide {
  return {
    type: "content",
    kind,
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
      content("comparison", {
        type: "paragraph",
        text: "普通正文中的**关键证据**保持原有强调画法。",
      }),
      content("data", {
        type: "bullets",
        items: ["第一条包含**关键证据**", "第二条保持普通文本"],
      }),
      content("list", {
        type: "callout",
        variant: "info",
        text: "提示中的**关键证据**保持原有强调画法。",
      }),
      content("statement", {
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

/** What one rendered page in the matrix is worth pinning about. */
export interface UnassignedPageAudit {
  sha: string
  /** Literal `**` left in the serialized page. Must be 0 — a marker printed
   *  as text is the defect this whole matrix exists to keep out. */
  markers: number
  /** `<tspan` elements: the shape a painted emphasis run takes. */
  tspans: number
}

/**
 * Renders the matrix once and reports both the byte hash and what the page
 * did with its `**marked**` runs. The hashes are the drift nail; the marker
 * and tspan counts are what stop a future recapture from quietly pinning a
 * page that prints its markers instead of painting them.
 */
export function auditEmphasisUnassignedPages(): Record<string, UnassignedPageAudit> {
  __resetRegisteredThemes()
  const pages: Record<string, UnassignedPageAudit> = {}
  for (const sourceThemeId of UNASSIGNED) {
    const themeId = registerTestTheme(`emphasis-${sourceThemeId}`, sourceThemeId, {
      content: {
        comparison: "two-column",
        data: "split-band",
        list: "bento-panel",
        statement: "quiet-frame",
      },
    })
    const ir = deck(themeId)
    for (const pageIndex of [0, 2, 3, 4, 5]) {
      const svg = renderSlideSvg(ir, pageIndex)
      pages[`${sourceThemeId}|${pageIndex}`] = {
        sha: sha(svg),
        markers: (svg.match(/\*\*/g) ?? []).length,
        tspans: (svg.match(/<tspan/g) ?? []).length,
      }
    }
  }
  __resetRegisteredThemes()
  return pages
}

export function computeEmphasisUnassignedPages(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(auditEmphasisUnassignedPages()).map(([key, page]) => [key, page.sha]),
  )
}
