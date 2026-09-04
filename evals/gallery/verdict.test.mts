// @vitest-environment node
//
// The merge is where a page's grade is decided, so it is where a loss can be
// lost. `renderMatrix` records the deck auditor's findings on every page, and
// they used to be dropped on the floor here: a page could carry
// `content-dropped` and still be graded `pass`, on the L1 path and behind a
// clean vision verdict alike.

import { describe, expect, it } from "vitest"
import { mergeVerdict } from "./verdict"
import type { ManifestPage } from "./render"
import type { L2Verdict } from "./l2"

const page = (findings?: { code: string; message: string }[]) =>
  ({
    id: "consulting--comp--chart--zh",
    section: "consulting",
    sectionLabel: "consulting",
    band: "component",
    subject: "chart",
    language: "zh",
    languageLabel: "中文",
    theme: "consulting",
    page: 1,
    pageCount: 1,
    slideType: "content",
    heading: "十六条系列的折线图",
    ...(findings ? { findings } : {}),
  }) as unknown as ManifestPage

const DROPPED = [{ code: "content-dropped", message: "1 piece of content is missing from the rendered slide" }]

describe("mergeVerdict folds the findings the render already recorded", () => {
  it("a clean page still passes", () => {
    const v = mergeVerdict(page(), { findings: [] }, undefined)
    expect(v.verdict).toBe("pass")
    expect(v.findings).toEqual([])
  })

  it("a page carrying content-dropped cannot pass on the L1 path", () => {
    const v = mergeVerdict(page(DROPPED), { findings: [] }, undefined)
    expect(v.verdict).toBe("rework")
    expect(v.findings).toContain("content-dropped")
    expect(v.note).toContain("missing")
  })

  it("a page carrying content-dropped cannot pass behind a clean vision verdict", () => {
    const l2 = { id: page().id, verdict: "pass", note: "读起来很干净", findings: [] } as unknown as L2Verdict
    const v = mergeVerdict(page(DROPPED), { findings: [] }, l2)
    expect(v.verdict).toBe("rework")
    expect(v.findings).toContain("content-dropped")
  })

  it("leaves a vision rework verdict alone and still lists the drop", () => {
    const l2 = { id: page().id, verdict: "rework", note: "构图松散", findings: ["composition"] } as unknown as L2Verdict
    const v = mergeVerdict(page(DROPPED), { findings: [] }, l2)
    expect(v.verdict).toBe("rework")
    expect(v.findings).toEqual(expect.arrayContaining(["composition", "content-dropped"]))
  })

  it("ignores manifest findings that are not content losses", () => {
    const v = mergeVerdict(page([{ code: "low-contrast", message: "…" }]), { findings: [] }, undefined)
    expect(v.verdict).toBe("pass")
  })
})
