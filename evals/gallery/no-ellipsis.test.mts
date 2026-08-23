// @vitest-environment node
//
// Constitutional nail: no gallery page may paint an overflow ellipsis.
// Academic statement gold dots are <circle>s, not text, so this test has
// no page exclusion list.

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

const STANDALONE_DOTS = /(?<![.])\.\.\.(?![.])/

function textContents(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  return Array.from(root.querySelectorAll("text")).map((el) => el.textContent ?? "")
}

describe("gallery SVG text never paints an overflow ellipsis", () => {
  it("scans every theme/layout/component/density page in zh/en/mixed", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptpress-no-ellipsis-"))
    const { svgs, manifest } = renderMatrix(jobs, outDir, "no-ellipsis")
    expect(svgs.size).toBeGreaterThan(0)
    expect(manifest.pages.length).toBe(jobs.length)

    const hits: string[] = []
    for (const [id, svg] of svgs) {
      for (const content of textContents(svg)) {
        if (content.includes("…") || STANDALONE_DOTS.test(content)) {
          hits.push(`${id}: ${JSON.stringify(content.slice(0, 80))}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})
