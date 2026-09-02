// @vitest-environment node
import { describe, expect, it } from "vitest"
import { collapseWhitespaceRuns } from "./svg-whitespace"

const texts = (runs: { text: string; preserve?: boolean }[]) => collapseWhitespaceRuns(runs)

describe("collapseWhitespaceRuns", () => {
  it("collapses a blank pair that straddles a run boundary", () => {
    // Two adjacent characters in the stream, one space on the page. Both the
    // exporter and the ink scan used to keep both.
    expect(texts([{ text: "AA " }, { text: " BB" }])).toEqual(["AA ", "BB"])
  })

  it("keeps the one blank a boundary really does paint", () => {
    expect(texts([{ text: "AA" }, { text: " " }, { text: "BB" }])).toEqual(["AA", " ", "BB"])
  })

  it("drops whitespace at the two ends of the text, not inside it", () => {
    expect(texts([{ text: "  The " }, { text: "decisive" }, { text: " year  " }])).toEqual([
      "The ",
      "decisive",
      " year",
    ])
  })

  it("collapses a run of blanks inside one node", () => {
    expect(texts([{ text: "99.95" }, { text: "%" }, { text: "   of   plan" }])).toEqual(["99.95", "%", " of plan"])
  })

  it("leaves every character of a preserved run alone", () => {
    // `code.tsx` writes each line with xml:space="preserve" because the
    // indentation is the author's content.
    expect(texts([{ text: "    raise Error()", preserve: true }])).toEqual(["    raise Error()"])
  })

  it("does not let a preserved run's blanks be eaten by its neighbours", () => {
    expect(texts([{ text: "a" }, { text: "   ", preserve: true }, { text: "b" }])).toEqual(["a", "   ", "b"])
  })

  it("keeps a trailing blank when the last run is preserved", () => {
    expect(texts([{ text: "x  ", preserve: true }])).toEqual(["x  "])
  })

  it("reports an empty run rather than dropping it, so callers keep their own metadata", () => {
    expect(texts([{ text: "AA " }, { text: "  " }, { text: "BB" }])).toEqual(["AA ", "", "BB"])
  })
})
