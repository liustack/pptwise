// @vitest-environment node
//
// Heading-treatment review table. Six constructions × three title states ×
// three language tracks, pinned on a content layout that actually calls
// tryContentHeadingTreatment, always after a chapter slide.

import { describe, expect, it } from "vitest"
import { HEADING_TREATMENTS } from "@/render/heading-treatments/assignments"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from "@/themes"
import type { CorpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS } from "./corpus/lexicon"
import { mapJobSubject } from "./coverage"
import { buildMatrix } from "./matrix"

await installNodePlatform()

const emptyAssets = { images: {} } as CorpusAssets
const assets = { zh: emptyAssets, en: emptyAssets, mixed: emptyAssets }

const HEADING_STATES = ["none", "title", "subtitle"] as const
const HEADING_THEME: Record<(typeof HEADING_TREATMENTS)[number], string> = {
  ghost_index: "consulting",
  baseline: "insight",
  tag_box: "enterprise",
  lead_accent: "academic",
  vertical_kicker: "ink",
  center_mirror: "luxe",
}

function headingJobs() {
  return buildMatrix(CANONICAL_THEME_IDS, assets, { only: "heading" })
}

describe("gallery heading table", () => {
  it("emits every construction × state × language, and no extras", () => {
    const jobs = headingJobs()
    const expected = HEADING_TREATMENTS.flatMap((treatment) =>
      HEADING_STATES.flatMap((state) =>
        LANGUAGE_IDS.map((lang) => `heading--${treatment.replace(/_/g, "-")}--${state}--${lang}`),
      ),
    )
    expect(jobs.map((job) => job.id).sort()).toEqual([...expected].sort())
    expect(jobs).toHaveLength(HEADING_TREATMENTS.length * HEADING_STATES.length * LANGUAGE_IDS.length)
  })

  it("pins two-column content after a chapter slide, on the assigned theme", () => {
    const jobs = headingJobs()
    expect(jobs.length).toBeGreaterThan(0)
    for (const job of jobs) {
      expect(job.slideIndex).toBe(1)
      expect(job.ir.slides[0]?.type).toBe("chapter")
      expect(job.ir.slides[1]?.type).toBe("content")
      expect(job.ir.slides[1]?.layout).toBe("two-column")
      expect(job.theme).toBe(HEADING_THEME[job.subject as (typeof HEADING_TREATMENTS)[number]])
      expect(job.ir.theme).toEqual({ id: job.theme })
    }

    const ghost = jobs.filter((job) => job.subject === "ghost_index" || job.subject === "tag_box")
    expect(ghost.length).toBe(2 * HEADING_STATES.length * LANGUAGE_IDS.length)
    for (const job of ghost) {
      expect(job.ir.slides[0]?.type).toBe("chapter")
      expect(job.slideIndex).toBe(1)
    }
  })

  it("authors none / title / subtitle from the lexicon, with a real body", () => {
    const jobs = headingJobs().filter((job) => job.language === "zh" && job.subject === "ghost_index")
    const byState = Object.fromEntries(jobs.map((job) => [job.id.split("--")[2], job]))
    expect(byState.none?.ir.slides[1]?.heading ?? "").toBe("")
    expect(byState.none?.ir.slides[1]?.subheading).toBeFalsy()
    expect(byState.title?.ir.slides[1]?.heading).toBeTruthy()
    expect(byState.title?.ir.slides[1]?.subheading).toBeFalsy()
    expect(byState.subtitle?.ir.slides[1]?.heading).toBeTruthy()
    expect(byState.subtitle?.ir.slides[1]?.subheading).toBeTruthy()
    for (const job of jobs) {
      const types = job.ir.slides[1]!.components.map((c) => c.type)
      expect(types).toEqual(expect.arrayContaining(["paragraph", "bullets"]))
    }
  })

  it("maps heading pages onto HEADING_TREATMENTS, not leftover subjects", () => {
    for (const treatment of HEADING_TREATMENTS) {
      expect(mapJobSubject({ table: "heading", subject: treatment })).toEqual({
        inventory: "heading",
        id: treatment,
      })
    }
    expect(mapJobSubject({ table: "heading", subject: "speech" })).toBeUndefined()
    const jobs = headingJobs()
    expect(jobs.length).toBeGreaterThan(0)
    for (const job of jobs) {
      expect(mapJobSubject(job)).toEqual({ inventory: "heading", id: job.subject })
    }
  })

  it("renders every heading page, with treatment chrome not the native heading", async () => {
    const { renderMatrix } = await import("./render")
    const { mkdtempSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")

    const jobs = headingJobs()
    expect(jobs.length).toBe(54)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-gallery-heading-"))
    const { manifest, svgs } = renderMatrix(jobs, outDir, "test")

    const skipped = manifest.pages.filter((p) => p.skipped).map((p) => `${p.id}: ${p.skipped}`)
    expect(skipped).toEqual([])

    // Native two-column sits the title at y=150 / 46px. ghost_index title-only
    // is y=128 / 42px with contentRect y=196. The 230px bleed "01" is routed
    // into the mid layer and the depth-safety pass can drop it. The title
    // geometry is the signal that the treatment ran, not the native heading.
    const ghostTitle = svgs.get("heading--ghost-index--title--zh")!
    expect(ghostTitle).toContain('y="128"')
    expect(ghostTitle).toContain('font-size="42"')
    expect(ghostTitle).toContain('data-audit-rect="96,196,1088,444"')

    const ghostNone = svgs.get("heading--ghost-index--none--zh")!
    expect(ghostNone).toContain(">01<")
    expect(ghostNone).toContain('opacity="0.35"')
    expect(ghostNone).toContain('font-size="20"')

    const baseline = svgs.get("heading--baseline--title--zh")!
    expect(baseline).toMatch(/x="96" y="162" width="1088" height="1"/)

    const kicker = svgs.get("heading--vertical-kicker--title--zh")!
    // Square is centered on the 16px stacked kicker at x=104.
    expect(kicker).toMatch(/x="107" y="72" width="10" height="10"/)
  }, 60_000)
})
