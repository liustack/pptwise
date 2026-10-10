// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { auditDeck } from "@/audit/deck-audit"
import { truncationSources } from "@/ir/truncation-tiers"
import { installNodePlatform } from "@/platform/node"
import { createElement } from "react"
import { getThemeDefinition } from "@/themes/definitions"
import { cutLines } from "./cut-fields"
import { FullSlideSvg } from "./full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "./serialize"

beforeAll(() => {
  installNodePlatform()
})

const LONG_HEADING =
  "The board should approve the second plant before the window on the cheaper financing closes at the end of the third quarter of next year, and before the competitor locks the supplier"
const LONG_KICKER = "第一章　顾客变了，而且变得比我们任何一个人预想的都要快得多，快到门店的陈列和库存都来不及跟上"

/**
 * A deck past validate. `allowDroppedContent` skips its drawn gate, for the
 * pages here that keep a hard cut on purpose: validate refuses those, and
 * how the cut reads is what is pinned.
 */
function deck(theme: string, page: Record<string, unknown>, allowDroppedContent = false): PptxIR {
  const v = validateIr({
    version: "5",
    filename: "cuts",
    theme: { id: theme },
    slides: [{ type: "cover", heading: "Cover" }, { type: "content", ...page }, { type: "ending", heading: "End" }],
  }, { allowDroppedContent })
  expect(v.errors).toEqual([])
  return v.ir!
}

const bullets = { type: "bullets", items: ["Every shape stays editable", "Pictures travel with the deck"] }

function drawn(ir: PptxIR): { markup: string; root: Element; slide: Slide } {
  const markup = renderSlideSvg(ir, 1)
  return { markup, root: parseSvgRoot(markup), slide: ir.slides[1]! }
}

describe("truncationSources", () => {
  it("holds the heading, the source and a component's words hard, and a kicker, a stamp and a tag declared", () => {
    const slide = {
      type: "content",
      kind: "points",
      heading: "Heading",
      subheading: "Sub",
      footnote: "Source: a study",
      kicker: "Chapter one",
      stamp: { text: "Approved", date: "2026" },
      components: [{ type: "kpi_cards", items: [{ value: "12", label: "Plants", tag: { text: "Estimate" }, source: "Company filing" }] }],
    } as unknown as Slide
    const tiers = Object.fromEntries(truncationSources(slide).map((s) => [s.field, s.tier]))
    expect(tiers).toEqual({
      heading: "hard",
      subheading: "hard",
      footnote: "hard",
      kicker: "declared",
      "stamp.text": "declared",
      "stamp.date": "declared",
      "components.0.items.0.value": "hard",
      "components.0.items.0.label": "hard",
      "components.0.items.0.tag.text": "declared",
      "components.0.items.0.source": "hard",
    })
  })
})

describe("a face that cuts a hard field", () => {
  it("gives the page to the step-aside sheet, which draws the heading whole", () => {
    const { markup, root, slide } = drawn(deck("brief", { kind: "points", heading: LONG_HEADING, components: [bullets] }))
    expect(markup).toContain('data-face-stepped-aside="gauge-sheet"')
    expect(cutLines(root, slide)).toEqual([])
    const words = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(words.replace(/\s+/g, " ")).toContain("competitor locks the supplier")
  })

  it("keeps its page when the sheet would cut the heading too, and the cut stays declared as hard", () => {
    const endless = Array.from({ length: 4 }, () => LONG_HEADING).join(" ")
    const ir = deck("brief", { kind: "points", heading: endless, components: [bullets] }, true)
    const { markup, root, slide } = drawn(ir)
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(cutLines(root, slide)).toEqual([expect.objectContaining({ field: "heading", tier: "hard" })])
    const found = auditDeck(ir).findings.filter((f) => f.code === "content-truncated")
    expect(found).toEqual([expect.objectContaining({ page: 2, detail: expect.objectContaining({ field: "heading", tier: "hard" }) })])
    expect(found[0]!.message).toMatch(/a reader needs whole/)
  })

  it("takes the page's kicker to the sheet, which sets it over the heading", () => {
    const { markup, root, slide } = drawn(deck("memo", { kind: "points", heading: LONG_HEADING, kicker: "Chapter one", components: [bullets] }))
    expect(markup).toContain('data-face-stepped-aside="memo-sheet"')
    expect(cutLines(root, slide)).toEqual([])
    const sheet = root.querySelector("[data-face-stepped-aside]")!
    expect(Array.from(sheet.querySelectorAll("text")).map((t) => t.textContent)).toContain("Chapter one")
  })

  it("keeps its page when the page carries a stamp the sheet has no place for", () => {
    const { markup, root, slide } = drawn(deck("lecture", { kind: "points", heading: LONG_HEADING, stamp: { text: "Approved" }, components: [bullets] }, true))
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(cutLines(root, slide).some((cut) => cut.field === "heading" && cut.tier === "hard")).toBe(true)
  })
})

describe("a face that cuts a declared field", () => {
  it("keeps its page and declares the cut", () => {
    const ir = deck("memo", { kind: "points", heading: "短标题", kicker: LONG_KICKER, components: [{ type: "bullets", items: ["一", "二"] }] })
    const { markup, root, slide } = drawn(ir)
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(cutLines(root, slide)).toEqual([expect.objectContaining({ field: "kicker", tier: "declared" })])
    const found = auditDeck(ir).findings.filter((f) => f.code === "content-truncated")
    expect(found).toEqual([expect.objectContaining({ detail: expect.objectContaining({ field: "kicker", tier: "declared" }) })])
  })
})

describe("cutLines", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Quarterly revenue rose on the back of the new plant",
    kicker: "Quarterly revenue",
    footnote: "Source: company filings for the third quarter",
    components: [],
  } as unknown as Slide
  const page = (texts: string[]) =>
    parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${texts.map((t) => `<text data-truncated="1">${t}</text>`).join("")}</svg>`)

  it("names the field a cut line came from by its tail, after the face's own words", () => {
    expect(cutLines(page(["Note 1 · Source: company filings for…"]), slide)).toEqual([{ text: "Note 1 · Source: company filings for…", field: "footnote", tier: "hard" }])
  })

  it("lets a hard field win a tie with a declared one", () => {
    expect(cutLines(page(["Quarterly reven…"]), slide)[0]).toMatchObject({ field: "heading", tier: "hard" })
  })

  it("reads a line that is none of the page's own words as the face's furniture", () => {
    expect(cutLines(page(["Northwind Holdings Group…"]), slide)).toEqual([{ text: "Northwind Holdings Group…", tier: "declared" }])
  })

  it("does not read a field shown whole as cut", () => {
    expect(cutLines(page(["Quarterly revenue"]), { ...slide, heading: "Short" } as Slide)).toEqual([{ text: "Quarterly revenue", tier: "declared" }])
  })
})

// A numbered card with no room under its title for its sentence leaves the
// sentence out whole. Its mark sat on the card's group, whose words are the
// card's number and title, so it named no field: 852 such marks across the
// content sweep read as a face's own furniture, no step-aside was asked of
// them, and validate could not tell them from a cut label.
describe("a text its block had no line for", () => {
  const cards = {
    type: "numbered_cards",
    items: Array.from({ length: 8 }, (_, i) => ({ title: `第 ${i + 1} 项要点`, text: `第 ${i + 1} 条说明文字要写完整的一句话` })),
  }

  it("is read back to the field it left out, as a hard cut", () => {
    const ir = deck("brief", { kind: "points", heading: "八条要点", components: [cards] }, true)
    const markup = renderSvgMarkup(createElement(FullSlideSvg, { ir, slide: ir.slides[1]!, index: 1, theme: getThemeDefinition("brief") }))
    const cuts = cutLines(parseSvgRoot(markup), ir.slides[1]!)
    expect(cuts.length).toBeGreaterThan(0)
    expect(cuts.every((cut) => /^components\.0\.items\.\d\.text$/.test(cut.field ?? "") && cut.tier === "hard" && cut.omitted === true)).toBe(true)
    expect(cuts.map((cut) => cut.text)).toContain(cards.items[cuts[0]!.field!.split(".")[3] as unknown as number]!.text)
  })

  it("is refused by validate, which names the card", () => {
    const v = validateIr({ version: "5", filename: "cuts", theme: { id: "brief" }, slides: [{ type: "content", kind: "points", heading: "八条要点", components: [cards] }] })
    const drawn = renderSlideSvg(deck("brief", { kind: "points", heading: "八条要点", components: [cards] }, true), 1)
    // The sheet the face steps aside to draws every sentence, and then the page passes.
    if (drawn.includes("data-face-stepped-aside")) {
      expect(v.ok).toBe(true)
      expect(drawn).not.toContain('data-truncated="1"')
    } else {
      expect(v.errors.map((e) => e.message).join(" ")).toMatch(/the text of item \d of this page's numbered_cards/)
    }
  })
})
