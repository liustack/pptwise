// @vitest-environment node
//
// A content page validate passes is one the export draws whole.
//
// validate asked a content face what its slots declare, and a body slot that
// takes any block declares no room, so a page its face could not hold
// passed: a six-rib fishbone in brief's sheet left ribs off, nine people
// cards left cards off, an English KPI label wider than its card was cut,
// and a fifth annotation beside a lone picture was left off. Each reached
// the export as a mark the export refused, or as a cut only the audit read.
// validate draws each content page now, step-aside included, and refuses
// one that would lose anything (`checkContentPagesDrawn`,
// `./content-loss.ts`).
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { cutLines } from "./cut-fields"
import { droppedIn } from "./render-slide"
import { parseSvgRoot } from "./serialize"

const assets = {} as Record<LanguageId, CorpusAssets>
beforeAll(async () => {
  installNodePlatform()
  for (const id of ["zh", "en"] as const) assets[id] = await corpusAssets(LEXICONS[id])
})

/** What a drawn page lost: its drops, and the hard fields it cut. */
function lost(ir: PptxIR, index = 0): { dropped: number; hardCut: number } {
  const root = parseSvgRoot(renderSlideSvg(ir, index))
  return { dropped: droppedIn(root).dropped, hardCut: cutLines(root, ir.slides[index]!).filter((cut) => cut.tier === "hard").length }
}

/** brief's points page (`gauge-sheet`) in `lang`, its body replaced by `components`. */
function briefPage(lang: LanguageId, components: unknown[], extra: Record<string, unknown> = {}): PptxIR {
  const base = layoutPage("gauge-sheet", LEXICONS[lang], assets[lang], "brief", "points")
  return { ...base, slides: [{ ...base.slides[0]!, ...extra, components } as unknown as Slide] }
}

/** The corpus's own block of `type` in `lang`, its main list `n` long, cycling the corpus's items. */
function block(type: string, lang: LanguageId, key: string, n: number): Record<string, unknown> {
  const built = COMPONENT_BUILDERS[type]!(LEXICONS[lang]) as unknown as Record<string, unknown>
  const list = built[key] as Record<string, unknown>[]
  return { ...built, [key]: Array.from({ length: n }, (_, i) => ({ ...list[i % list.length]!, ...(typeof list[i % list.length]!.id === "string" ? { id: `${String(list[i % list.length]!.id)}-${i}` } : {}) })) }
}

describe("validate refuses a content page its drawing would lose part of", () => {
  it("a fishbone with more ribs than brief's sheet draws, naming the items it would leave off", () => {
    const ir = briefPage("zh", [block("fishbone", "zh", "ribs", 6)])
    expect(lost(validateIr(ir, { allowDroppedContent: true }).ir!).dropped).toBeGreaterThan(0)
    const v = validateIr(ir)
    expect(v.ok).toBe(false)
    expect(v.errors.map((e) => e.message).join("\n")).toMatch(/face "gauge-sheet" .*would leave \d+ items of this page's fishbone off the page/)
  })

  it("nine people cards, none of which the sheet draws, naming what it would leave off", () => {
    const ir = briefPage("zh", [block("people_cards", "zh", "people", 9)])
    expect(lost(validateIr(ir, { allowDroppedContent: true }).ir!).dropped).toBe(9)
    const v = validateIr(ir)
    expect(v.errors).toEqual([
      expect.objectContaining({ path: "slides.0.components", message: "face \"gauge-sheet\" cannot draw this page as written: it would leave 9 cards of this page's people_cards off the page." }),
    ])
  })

  it("a fifth annotation beside a lone picture, naming how many of the items the page draws", () => {
    const base = layoutPage("image-annotate", LEXICONS.zh, assets.zh, "brief", "photo")
    const page = base.slides[0]!
    const bullets = { type: "bullets", items: ["一", "二", "三", "四", "五"] }
    const ir = { ...base, slides: [{ ...page, components: [...page.components.filter((c) => c.type !== "bullets"), bullets] } as unknown as Slide] }
    expect(lost(validateIr(ir, { allowDroppedContent: true }).ir!).dropped).toBe(1)
    const v = validateIr(ir)
    expect(v.errors).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/^face "image-annotate" draws 4 of the 5 items in this page's bullets with the rest of the page as written, so it would leave 1 item of this page's .*bullets.* off the page\. Keep 4, or split the bullets across two pages\.$/) }),
    ])
  })

  it("English KPI labels wider than their cards, naming each text it would cut", () => {
    const ir = briefPage("en", [block("kpi_cards", "en", "items", 5)])
    expect(lost(validateIr(ir, { allowDroppedContent: true }).ir!).hardCut).toBeGreaterThan(0)
    const v = validateIr(ir)
    expect(v.ok).toBe(false)
    expect(v.errors.map((e) => e.message).join("\n")).toMatch(/it would cut .*the label of item 3 of this page's kpi_cards/)
  })

  it("a heading a face sets on one line beside its picture, naming the heading to shorten", () => {
    const base = layoutPage("show-spotlight", LEXICONS.en, assets.en, "brief", "photo")
    const ir = { ...base, slides: [{ ...base.slides[0]!, heading: "Competitors are pricing below cost in the mid-market" }] }
    const v = validateIr(ir)
    expect(v.errors).toEqual([
      expect.objectContaining({ path: "slides.0.heading", message: "face \"show-spotlight\" cannot set this page's heading whole beside the rest of this page, so it would cut it. Shorten it, or split the page." }),
    ])
  })

  it("passes the same blocks at a size the page draws whole, and that page is drawn whole", () => {
    for (const [type, key, n] of [["fishbone", "ribs", 4], ["people_cards", "people", 3], ["kpi_cards", "items", 4]] as const) {
      const v = validateIr(briefPage("zh", [block(type, "zh", key, n)]))
      expect(v.errors, type).toEqual([])
      expect(lost(v.ir!), type).toEqual({ dropped: 0, hardCut: 0 })
    }
  })

  it("is skipped by allowDroppedContent alone, which the export's own opt-in passes", () => {
    const ir = briefPage("zh", [block("people_cards", "zh", "people", 9)])
    expect(validateIr(ir, { allowDroppedContent: true }).ok).toBe(true)
  })
})

describe("every corpus block on brief's sheet: validate passes it only when the page draws it whole", () => {
  it.each(["zh", "en"] as const)("%s", (lang) => {
    const passedButLost: string[] = []
    for (const [type, build] of Object.entries(COMPONENT_BUILDERS)) {
      const v = validateIr(briefPage(lang, [build(LEXICONS[lang])]))
      if (!v.ok) continue
      const { dropped, hardCut } = lost(v.ir!)
      if (dropped > 0 || hardCut > 0) passedButLost.push(`${type}: ${dropped} dropped, ${hardCut} cut`)
    }
    expect(passedButLost).toEqual([])
  })
})
