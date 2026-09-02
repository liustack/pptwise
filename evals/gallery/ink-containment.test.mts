// @vitest-environment node
//
// The geometry gate. Every component on every page of the review matrix
// paints inside the box it was handed, and every data label stays clear of
// its neighbours and of the marks it names.
//
// Both scans were red when they were written. Sixteen pages painted past the
// bottom of their content rect — every one of them a cartesian chart on
// consulting's `gauge-stats` face, which handed the content region a
// hard-coded 208px band and got 316px of chart drawn into it. Twenty-seven
// pages, every line chart in the corpus, had an endpoint value label sitting
// on a plot mark, because a pairwise nudger only ever looks at other labels.
// See `ink-containment.ts` for what each half measures and why.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"
import { collectInkFindings, collectLabelFindings } from "./ink-containment"

await installNodePlatform()

async function renderCorpus() {
  const themeIds = listThemes()
    .map((t) => t.id)
    .sort()
  const assets = Object.fromEntries(
    await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
  ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
  const jobs = buildMatrix(themeIds, assets)
  const outDir = mkdtempSync(join(tmpdir(), "pptwise-ink-containment-"))
  return renderMatrix(jobs, outDir, "ink-containment").svgs
}

describe("gallery geometry", () => {
  it("no component paints outside the box it accepted", { timeout: 180_000 }, async () => {
    const svgs = await renderCorpus()
    expect(svgs.size).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const [id, svg] of svgs) {
      for (const finding of collectInkFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })

  it("no data label lands on another label or on a data mark", { timeout: 180_000 }, async () => {
    const svgs = await renderCorpus()
    const offenders: string[] = []
    for (const [id, svg] of svgs) {
      for (const finding of collectLabelFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })
})
