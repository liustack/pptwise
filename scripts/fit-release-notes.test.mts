import { describe, expect, it } from "vitest"
import { fitReleaseNotes, headingAnchor, NOTES_LIMIT } from "./fit-release-notes.mts"

const bullets = (n: number) => Array.from({ length: n }, (_, i) => `- change number ${i} with some words after it`).join("\n")

describe("fitReleaseNotes", () => {
  it("leaves notes that fit untouched", () => {
    const notes = `### Patch Changes\n\n${bullets(10)}\n`
    expect(fitReleaseNotes(notes, "1.2.3", "1.2.3 - 2026-10-10")).toBe(notes)
  })

  it("cuts an over-long section at a whole bullet and links the full one", () => {
    const notes = `### Patch Changes\n\n${bullets(4000)}\n`
    expect(notes.length).toBeGreaterThan(NOTES_LIMIT)
    const fitted = fitReleaseNotes(notes, "0.41.0", "0.41.0 - 2026-10-10")
    expect(fitted.length).toBeLessThanOrEqual(NOTES_LIMIT)
    // GitHub's own cap, with room to spare.
    expect(fitted.length).toBeLessThan(125_000)
    const [kept, note] = fitted.split("\n\n---\n\n")
    expect(kept!.split("\n").at(-1)).toMatch(/^- change number \d+ with some words after it$/)
    expect(notes.startsWith(kept!)).toBe(true)
    expect(note).toContain("https://github.com/liustack/pptwise/blob/v0.41.0/CHANGELOG.md#0410---2026-10-10")
  })

  it("refuses a section it cannot cut at a bullet", () => {
    expect(() => fitReleaseNotes("x".repeat(200), "1.0.0", "1.0.0", 100)).toThrow("no bullet boundary")
  })
})

describe("headingAnchor", () => {
  it("matches GitHub's anchor for a dated version heading", () => {
    expect(headingAnchor("0.41.0 - 2026-10-10")).toBe("0410---2026-10-10")
  })
})
