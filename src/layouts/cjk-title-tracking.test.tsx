// @vitest-environment jsdom
//
// Letter-spacing on a CJK title is a defect of the render chain, not of one
// face. Han characters already sit on a fixed em grid, so tracking them
// apart opens gaps a reader sees as broken words — a Latin display trick
// applied to the wrong script.
//
// Thirty-nine face test files each carried their own copy of
// `it("CJK title has no letter-spacing")`. This scan walks the four
// page-type registries instead: every registered face is checked, and a
// face registered tomorrow is checked without anyone remembering to paste
// anything.
import { describe, expect, it } from "vitest"
import { SCANNED_LAYOUTS, SCAN_HEADING, renderScannedLayoutRoot } from "./__fixtures__/scan"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"

/** Any Han ideograph. Enough to tell a CJK title run from a Latin one. */
const HAN = /\p{Script=Han}/u

const stripped = (s: string) => s.replace(/\s+/g, "")
const HEADING_NO_SPACE = stripped(SCAN_HEADING)

/** The text runs carrying the fixture heading, wrapped or whole. */
function titleRuns(root: Element): Element[] {
  return Array.from(root.querySelectorAll("text")).filter((el) => {
    const text = stripped(el.textContent ?? "")
    return text.length >= 2 && HAN.test(text) && HEADING_NO_SPACE.includes(text)
  })
}

describe("no registered face letter-spaces a CJK title", () => {
  for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
    it(`CJK titles keep the em grid — ${themeId}`, () => {
      let scanned = 0
      for (const layout of SCANNED_LAYOUTS) {
        const { root } = renderScannedLayoutRoot(layout, themeId)
        const runs = titleRuns(root)
        scanned += runs.length === 0 ? 0 : 1
        for (const run of runs) {
          const where = `${layout.slideType}/${layout.id} "${run.textContent}"`
          expect(run.getAttribute("letter-spacing"), where).toBeNull()
        }
      }
      // A scan that matched no title run would pass in silence. Most faces
      // draw the heading as one or two runs the matcher above recognises;
      // the handful that set it one character per line (vertical titles) do
      // not, which is why this floor is well under the registry size.
      expect(scanned).toBeGreaterThanOrEqual(100)
    })
  }
})
