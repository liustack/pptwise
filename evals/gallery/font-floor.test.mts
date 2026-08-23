// @vitest-environment node
//
// Every rendered gallery <text> that is not decorative must sit on or
// above the 12pt (16px) readable floor. Body shrink is separately
// floored at 18pt in bullets.tsx. This scan is the gate that stops a
// new minFontSize of 8 from shipping.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { META_FONT_FLOOR_PX, pxToPt } from "@/constants"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { auditL1, classifyL1 } from "./l1"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

function hasDecor(el: Element): boolean {
  let cur: Element | null = el
  while (cur) {
    if (cur.hasAttribute("data-decor") || cur.getAttribute("data-depth") === "mid") return true
    cur = cur.parentElement
  }
  return false
}

describe("gallery SVG text respects the readable font floor", () => {
  it("scans every theme/layout/component/density/heading page", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-font-floor-"))
    const { svgs, manifest } = renderMatrix(jobs, outDir, "font-floor")
    expect(svgs.size).toBeGreaterThan(0)
    expect(manifest.pages.length).toBe(jobs.length)

    const Parser = getPlatform().domParser ?? globalThis.DOMParser
    if (!Parser) throw new Error("DOMParser unavailable")

    const undersized: string[] = []
    const l1Font: string[] = []
    for (const [id, svg] of svgs) {
      const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const content = (el.textContent ?? "").trim()
        if (!content || hasDecor(el)) continue
        const fontSize = Number(el.getAttribute("font-size") ?? 16)
        if (fontSize < META_FONT_FLOOR_PX) {
          undersized.push(
            `${id}: ${fontSize}px (${pxToPt(fontSize).toFixed(1)}pt) ${JSON.stringify(content.slice(0, 40))}`,
          )
        }
      }
      if (classifyL1(auditL1(svg)).includes("font-size")) l1Font.push(id)
    }
    expect(undersized, undersized.slice(0, 20).join("\n")).toEqual([])
    expect(l1Font, l1Font.slice(0, 20).join("\n")).toEqual([])
  })
})
