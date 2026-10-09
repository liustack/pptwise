// @vitest-environment node
//
// A photo page's column sets the page's subheading as its theme's standfirst.
//
// bulletin's notice column, ledger's panel column, swiss's grid band and
// ember's pitch photograph each wear the frame of their theme's sheet, and
// every one of those sheets sets a subheading as a standfirst under the
// claim. The photo pages drew the claim and the body and left the subheading
// off the slide with no mark. They now set it on the column's own measure
// at the top of the body, and the body moves down under it.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { corpusAssets, layoutPage } from "../../evals/gallery/corpus/decks"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"
import { parseSvgRoot } from "./serialize"

beforeAll(() => {
  installNodePlatform()
})

const SUB = "三座工厂、一家供应商，合同明年三月续签"

const COLUMNS = [
  { theme: "bulletin", mark: "data-notice-standfirst" },
  { theme: "ledger", mark: "data-panel-standfirst" },
  { theme: "swiss", mark: "data-grid-standfirst" },
  { theme: "ember", mark: "data-pitch-standfirst" },
] as const

async function photoPage(theme: string, subheading?: string): Promise<PptxIR> {
  const lex = nativeLexiconFor(theme)
  const base = layoutPage(menuFaces(theme).photo!, lex, await corpusAssets(lex), theme, "photo")
  const v = validateIr({ ...base, slides: [{ ...base.slides[0], ...(subheading ? { subheading } : {}) }] })
  expect(v.errors).toEqual([])
  return v.ir!
}

/** A text's baseline on the page: its own `y` plus every translate above it. */
function pageY(t: Element): number {
  let y = Number(t.getAttribute("y"))
  for (let el = t.parentElement; el; el = el.parentElement) {
    const m = /translate\(\s*[-\d.]+[\s,]+([-\d.]+)/u.exec(el.getAttribute("transform") ?? "")
    if (m) y += Number(m[1])
  }
  return y
}

/** Each line of words on the page and its baseline. */
function lines(markup: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of Array.from(parseSvgRoot(markup).querySelectorAll("text"))) {
    const words = (t.textContent ?? "").trim()
    const y = pageY(t)
    if (words && Number.isFinite(y) && !out.has(words)) out.set(words, y)
  }
  return out
}

describe("a photo page's column sets the subheading as its theme's standfirst", () => {
  for (const { theme, mark } of COLUMNS) {
    it(`${theme}: under the claim, once, with the body moved down under it`, async () => {
      const bare = renderSlideSvg(await photoPage(theme), 0)
      const markup = renderSlideSvg(await photoPage(theme, SUB), 0)
      expect(bare).not.toContain(mark)
      expect(markup).not.toContain("data-face-stepped-aside")
      expect(markup).not.toMatch(/data-dropped="[1-9]/)
      const root = parseSvgRoot(markup)
      const standfirst = root.querySelector(`[${mark}]`)!
      expect(standfirst.textContent?.replace(/\s/g, "")).toBe(SUB.replace(/\s/g, ""))
      expect(markup.split(SUB).length - 1).toBe(1)
      // The body's lines move down, and nothing on the page moves up.
      const before = lines(bare)
      const moves = [...lines(markup)].flatMap(([words, y]) => (before.has(words) ? [y - before.get(words)!] : []))
      expect(Math.max(...moves)).toBeGreaterThan(0)
      expect(Math.min(...moves)).toBe(0)
    })
  }
})
