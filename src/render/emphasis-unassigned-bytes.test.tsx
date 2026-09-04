// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "../api"
import type { PptxIR, Slide } from "../ir"
import { installNodePlatform } from "../platform/node"
import {
  auditEmphasisUnassignedPages,
  EMPHASIS_UNASSIGNED_BYTES_URL,
  MARKED_HEADING,
  MARKED_SUBHEADING,
  UNASSIGNED,
} from "./emphasis-unassigned-bytes"

installNodePlatform()

function consultingPadDeck(): PptxIR {
  const plain = { type: "paragraph" as const, text: "普通正文" }
  return {
    version: "5",
    filename: "emphasis-brief-pad-paths.pptx",
    theme: { id: "brief" },
    meta: { organization: "pptwise" },
    assets: { images: {} },
    slides: [
      { type: "cover", heading: MARKED_HEADING, components: [] } as Slide,
      { type: "chapter", heading: "增长战略", components: [] } as Slide,
      {
        type: "content",
        kind: "comparison",
        heading: "普通标题",
        components: [{ type: "paragraph", text: "正文中的**关键证据**" }],
      } as Slide,
      {
        type: "content",
        kind: "process",
        heading: "普通标题",
        components: [{ type: "bullets", items: ["要点中的**关键证据**"] }],
      } as Slide,
      {
        type: "content",
        kind: "list",
        heading: "普通标题",
        components: [{ type: "callout", variant: "info", text: "提示中的**关键证据**" }],
      } as Slide,
      {
        type: "content",
        kind: "points",
        heading: "普通标题",
        components: [{ type: "verdict_banner", tone: "positive", text: "结论中的**关键证据**" }],
      } as Slide,
      { type: "content", kind: "points", heading: MARKED_HEADING, components: [plain] } as Slide,
      {
        type: "content",
        kind: "points",
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
// are bulletin/ledger/rally/terminal/ember × pages 0,2,3,4,5 (25 of 115).
// Other unassigned themes stay byte-identical. brief is not in this
// fixture.
//
// Recaptured (pptwise rename, 2026-08-23). Cover `meta.organization`
// changed `pptpress` → `pptwise`. Replay of `renderSlideSvg` over the same
// 23×5 matrix. Only `*|0` hashes move. Content pages stay byte-identical.
//
// Recaptured (wave8 batch 2, 2026-08-23). thesis / homeroom / crayon /
// journal / heritage / ink covers and content motifs lock to the board.
// brief is not in this fixture.
//
// Recaptured (wave8 batch 3, 2026-08-23). luxe / runway / vermilion / almanac /
// clinic / arena covers lock to the board. lecture also moves: its chalk
// tray is a hollow stroked rect whose bbox used to be dropped on title
// intersect. The depth contract now keeps motif identity and dims it.
//
// Recaptured (wave8 batch 4, 2026-08-23). swiss content pages drop the
// right-edge ticks (cover-only). Covers of all 23 unassigned themes stay
// byte-identical. brief is not in this fixture.
//
// Recaptured (allocated-height declaration). Every stacked component box now
// declares the height it was allocated as a fourth number, so the
// `data-audit-box` attribute value moves on every content page. Verified by
// diffing pages before and after: nothing else in the markup changed.
//
// Recaptured (audit-box frame normalization). `verdict_banner` states its
// own `data-audit-box`/`data-audit-rect` in the frame its ink uses — at the
// local origin, under the `translate` it already carried — instead of adding
// its page position back in. Only `*|5` moves, and only those two attribute
// values on it (verified by diffing the page before and after). Every other
// page in the matrix stays byte-identical.
//
// Recaptured (no-ellipsis-root, 2026-08-23). Shared text-fit drops overflow
// marks. ledger content pages 2-5 and rally cover plus content 2-5 move.
// Other unassigned themes stay byte-identical. brief is not in this
// fixture.
// Recaptured (audit round-1 group F, 2026-08-23). lecture leaves the
// unassigned matrix: emphasis form is now underline. Remaining 22
// themes × five paths = 110 hashes. brief is not in this fixture.
//
// Recaptured (audit round-1 group E, 2026-08-23). Page 3 swaps the retired
// banner-heading pin for split-band. Only `|3` hashes move (22 of 110).
// Other unassigned pages stay byte-identical.
//
// Recaptured (audit round-2 C/D, 2026-08-24). rally cover kicker air
// and terminal constellation / bento inset move. Other unassigned pages stay
// byte-identical.
//
// Recaptured (runway show, 2026-08-26). The runway cover lock moves from
// lookbook-open-cover to show-headline. Only `runway|0` changes. The other
// 109 paths stay byte-identical.
//
// Recaptured (heading emphasis parse, 2026-09-01). Every heading painter now
// fits the emphasis-stripped text and paints the runs as tspans, so a theme
// with no declared stroke tints its marked heading instead of printing the
// `**` markers. 96 of the 110 hashes move. The matrix keeps its original job
// — proving an unassigned theme does not drift — and gains the assertion that
// makes the old hashes un-recapturable: no page may contain a literal marker.
const fixture = JSON.parse(
  readFileSync(EMPHASIS_UNASSIGNED_BYTES_URL, "utf-8"),
) as { pages: Record<string, string> }

describe("unassigned emphasis forms stay pinned to the depth-contract fixture", () => {
  const pages = auditEmphasisUnassignedPages()
  it("covers 22 themes across five real render paths", () => {
    expect(UNASSIGNED).not.toContain("lecture")
    expect(UNASSIGNED).not.toContain("brief")
    expect(UNASSIGNED).toHaveLength(22)
    expect(Object.keys(pages)).toHaveLength(110)
    expect(Object.keys(fixture.pages)).toHaveLength(110)
  })

  it.each(Object.keys(fixture.pages))("%s", (key) => {
    expect(pages[key].sha).toBe(fixture.pages[key])
  })

  // The guard that keeps a recapture honest. Revert the parse anywhere in
  // this matrix and this fails before the hashes can be re-recorded over the
  // regression, which is how the old hashes came to pin pages that printed
  // their markers as text.
  it.each(Object.keys(fixture.pages))("%s prints no literal marker", (key) => {
    expect(pages[key].markers).toBe(0)
  })

  // Marker-free is not enough on its own — stripping every run would also
  // pass. A theme that declares no stroke still has one (`resolveEmphasisForm`
  // defaults to `tint`), so the content pages have to *paint* their runs.
  //
  // Covers are excluded on purpose: seven of the bespoke cover plates
  // (thesis-plate, cut-panel, chalk-band, crayonbox-open, double-frame,
  // issue-head, show-headline) have always stripped instead of tinting, a
  // decision that predates this matrix and belongs to those faces.
  const contentKeys = Object.keys(fixture.pages).filter((key) => !key.endsWith("|0"))
  it.each(contentKeys)("%s paints its runs as tspans", (key) => {
    expect(pages[key].tspans).toBeGreaterThan(0)
  })
})

describe("lecture underline reaches every shared emphasis path", () => {
  const ir = consultingPadDeck()
  ir.filename = "emphasis-lecture-underline-paths.pptx"
  ir.theme = { id: "lecture" }

  it.each([
    [0, "cover"],
    [2, "paragraph"],
    [3, "bullets"],
    [4, "callout"],
    [5, "verdict banner"],
    [6, "heading treatment"],
  ] as const)("page %i covers %s", (pageIndex, path) => {
    const svg = renderSlideSvg(ir, pageIndex)
    expect(svg, path).toContain('data-emphasis-underline=""')
    expect(svg, path).not.toContain('data-emphasis-pad=""')
    expect(svg, path).not.toContain("**")
  })
})

describe("brief gauge cover and shared emphasis paths", () => {
  const ir = consultingPadDeck()

  it("gauge cover replaces the keyword pad with its one fixed gold underline", () => {
    const svg = renderSlideSvg(ir, 0)
    expect(svg).toContain('<rect x="160" y="432" width="504" height="8" fill="#F5C518"></rect>')
    expect(svg).not.toContain('data-emphasis-pad=""')
    expect(svg).not.toContain("**")
  })

  it.each([
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
