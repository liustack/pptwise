// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "../api"
import type { PptxIR, Slide } from "../ir"
import { installNodePlatform } from "../platform/node"
import {
  computeEmphasisUnassignedPages,
  EMPHASIS_UNASSIGNED_BYTES_URL,
  MARKED_HEADING,
  MARKED_SUBHEADING,
  UNASSIGNED,
} from "./emphasis-unassigned-bytes"

installNodePlatform()

function consultingPadDeck(): PptxIR {
  const plain = { type: "paragraph" as const, text: "普通正文" }
  return {
    version: "4",
    filename: "emphasis-consulting-pad-paths.pptx",
    theme: { id: "consulting" },
    meta: { organization: "pptpress" },
    assets: { images: {} },
    slides: [
      { type: "cover", heading: MARKED_HEADING, components: [] } as Slide,
      { type: "chapter", heading: "增长战略", components: [] } as Slide,
      {
        type: "content",
        layout: "two-column",
        heading: "普通标题",
        components: [{ type: "paragraph", text: "正文中的**关键证据**" }],
      } as Slide,
      {
        type: "content",
        layout: "banner-heading",
        heading: "普通标题",
        components: [{ type: "bullets", items: ["要点中的**关键证据**"] }],
      } as Slide,
      {
        type: "content",
        layout: "bento-panel",
        heading: "普通标题",
        components: [{ type: "callout", variant: "info", text: "提示中的**关键证据**" }],
      } as Slide,
      {
        type: "content",
        layout: "quiet-frame",
        heading: "普通标题",
        components: [{ type: "verdict_banner", tone: "positive", text: "结论中的**关键证据**" }],
      } as Slide,
      { type: "content", layout: "two-column", heading: MARKED_HEADING, components: [plain] } as Slide,
      {
        type: "content",
        layout: "split-band",
        heading: "普通标题",
        subheading: MARKED_SUBHEADING,
        components: [plain],
      } as Slide,
    ],
  } as PptxIR
}

// Recaptured for the three-layer depth contract. All 115 hashes move because
// the marked layer groups are now part of the serialized SVG contract. The
// same matrix remains a byte nail for every later change.
//
// Recaptured (wave8 batch 1, 2026-08-23). Cover/content paths on the five
// boarded themes pick up lock-board covers, motifs, and ink. Changed keys
// are enterprise/insight/campaign/tech/ember × pages 0,2,3,4,5 (25 of 115).
// Other unassigned themes stay byte-identical. consulting is not in this
// fixture.
//
// Recaptured (pptpress rename, 2026-08-23). Cover `meta.organization`
// changed `pptfast` → `pptpress`. Replay of `renderSlideSvg` over the same
// 23×5 matrix. Only `*|0` hashes move. Content pages stay byte-identical.
//
// Recaptured (wave8 batch 2, 2026-08-23). academic / classroom / crayon /
// journal / heritage / ink covers and content motifs lock to the board.
// consulting is not in this fixture.
//
// Recaptured (wave8 batch 3, 2026-08-23). luxe / runway / vermilion / terra /
// pulse / arena covers lock to the board. lecture also moves: its chalk
// tray is a hollow stroked rect whose bbox used to be dropped on title
// intersect. The depth contract now keeps motif identity and dims it.
//
// Recaptured (wave8 batch 4, 2026-08-23). swiss content pages drop the
// right-edge ticks (cover-only). Covers of all 23 unassigned themes stay
// byte-identical. consulting is not in this fixture.
//
// Recaptured (no-ellipsis-root, 2026-08-23). Shared text-fit drops overflow
// marks. insight content pages 2-5 and campaign cover plus content 2-5 move.
// Other unassigned themes stay byte-identical. consulting is not in this
// fixture.
const fixture = JSON.parse(
  readFileSync(EMPHASIS_UNASSIGNED_BYTES_URL, "utf-8"),
) as { pages: Record<string, string> }

describe("unassigned emphasis forms stay pinned to the depth-contract fixture", () => {
  const pages = computeEmphasisUnassignedPages()
  it("covers 23 themes across five real render paths", () => {
    expect(UNASSIGNED).toHaveLength(23)
    expect(Object.keys(pages)).toHaveLength(115)
    expect(Object.keys(fixture.pages)).toHaveLength(115)
  })

  it.each(Object.keys(fixture.pages))("%s", (key) => {
    expect(pages[key]).toBe(fixture.pages[key])
  })
})

describe("consulting pad reaches every shared emphasis path", () => {
  const ir = consultingPadDeck()

  it.each([
    [0, "cover"],
    [2, "paragraph"],
    [3, "bullets"],
    [4, "callout"],
    [5, "verdict banner"],
    [6, "heading treatment"],
    [7, "layout subheading"],
  ] as const)("page %i covers %s", (pageIndex, path) => {
    const svg = renderSlideSvg(ir, pageIndex)
    expect(svg, path).toContain('data-emphasis-pad=""')
    expect(svg, path).not.toContain("**")
  })
})
