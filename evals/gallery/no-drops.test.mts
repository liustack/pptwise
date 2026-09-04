// @vitest-environment node
//
// Constitutional nail: no gallery page may declare a content drop.
//
// `data-dropped` means a page lost authored content and says nothing about
// it on its own face, and the export gate refuses any deck carrying one
// (`checkContentDropGate`, `src/pptx/generate.ts`). A review specimen that
// drops content is therefore two useless things at once: an unexportable
// deck, and a page that does not show the thing it exists to show. A
// `data_table` page without its table reviews nothing.
//
// So the corpus itself has to stay inside what each face can hold. This test
// is the guard on that: author a page past its face's capacity and it goes
// red here, at the corpus, rather than turning up months later as a drop
// nobody was watching. The fix belongs on whichever side is wrong, and the
// two sides are told apart the same way every time: trim the corpus when the
// page asks for more than the face was ever meant to hold, fix the engine
// when a component measures one size and paints another, or a face hands a
// component less than its own declared minimum.
//
// There is no exclusion list, and there must not be one. A page allowed to
// drop is a page nobody reviews.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

/** Every `data-dropped` declaration on one page, as `count × kind`. */
function drops(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  return Array.from(root.querySelectorAll("[data-dropped]"))
    .filter((el) => Number(el.getAttribute("data-dropped")) > 0)
    .map((el) => `${el.getAttribute("data-dropped")}×${el.getAttribute("data-dropped-kind") ?? "component"}`)
}

describe("the gallery corpus declares no content drops", () => {
  it("scans every theme/layout/component page in zh/en/mixed", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-no-drops-"))
    const { svgs, manifest } = renderMatrix(jobs, outDir, "no-drops")
    expect(svgs.size).toBeGreaterThan(0)
    expect(manifest.pages.length).toBe(jobs.length)

    const declared: string[] = []
    for (const [id, svg] of svgs) {
      const found = drops(svg)
      if (found.length > 0) declared.push(`${id}: ${found.join(", ")}`)
    }
    expect(declared).toEqual([])
  })
})
