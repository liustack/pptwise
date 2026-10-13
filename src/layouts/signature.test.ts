// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { Component, PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { getThemeDefinition } from "@/themes/definitions"
import { resolveEffectiveFace } from "@/render/layout-selection"
import { RECIPES } from "./compositions"
import { describePart, meetsNeed, shapeGaps } from "./compositions/recipe"
import { PHOTOGRAPH, nearestRecipe, pageOffers, pageSignature, pageSignatureUse } from "./signature"

beforeAll(() => installNodePlatform())

type Content = Extract<Slide, { type: "content" }>

const KPIS = { type: "kpi_cards", items: [{ value: "60", label: "minutes today" }, { value: "30", label: "minutes from Monday" }] } as Component
const PROSE = { type: "paragraph", text: "Every driver traces back to how the work is planned." } as Component

/** The deck as validate hands it on, so render takes it as the export does. */
function deck(theme: string, slides: Slide[]): PptxIR {
  const raw = { version: "5", meta: {}, theme: { id: theme }, slides } as unknown as PptxIR
  const checked = validateIr(raw, { theme: getThemeDefinition(theme) })
  expect(checked.errors).toEqual([])
  return checked.ir!
}

function page(kind: Content["kind"], components: Component[], extra: Partial<Content> = {}): Content {
  return { type: "content", kind, heading: "Where the hour goes", components, ...extra } as Content
}

describe("recipe lines", () => {
  it("count one entry in the singular and read a value choice as words", () => {
    expect(describePart({ type: "kpi_cards", count: [1, 1] })).toBe("kpi_cards (1 item)")
    expect(describePart({ type: "chart", count: [2, 6], needs: ["chart_type=bar|line"] })).toBe("chart (2 to 6 categories, chart_type bar or line)")
    expect(describePart({ type: "icon_cards", count: [2, 4], needs: ["items[].icon"] })).toBe("icon_cards (2 to 4 items, icon on an item)")
  })

  it("meet a value choice with any value it names", () => {
    const chart = { type: "chart", chart_type: "line", series: [] } as unknown as Component
    expect(meetsNeed(chart, "chart_type=bar|line")).toBe(true)
    expect(meetsNeed(chart, "chart_type=bar")).toBe(false)
  })

  it("say what a page lacks for a shape, in the order an author would fix it", () => {
    const shape = { parts: [{ type: "kpi_cards", count: [3, 4] }, { type: "blockquote" }], page: ["footnote"] } as const
    expect(shapeGaps(shape, { components: [KPIS, PROSE] })).toEqual([
      "give the kpi_cards 3 to 4 items (it has 2)",
      "turn the paragraph into blockquote",
      "add a footnote",
    ])
    expect(shapeGaps({ parts: [{ type: "kpi_cards", count: [2, 4] }] }, { components: [KPIS] })).toEqual([])
  })

  it("turn a component of a kindred type into the part rather than ask for new content", () => {
    const bullets = { type: "bullets", items: ["Budgets", "New stores"] } as Component
    expect(shapeGaps({ parts: [{ type: "icon_cards", count: [2, 3], needs: ["items[].icon"] }] }, { components: [bullets] })).toEqual([
      "turn the bullets into icon_cards (2 to 3 items, icon on an item)",
    ])
    expect(shapeGaps({ parts: [{ type: "comparison", count: [2, 5] }] }, { components: [bullets] })).toEqual([
      "add comparison (2 to 5 rows)",
      "the recipe has no room for the bullets",
    ])
  })
})

describe("pageSignature", () => {
  it("lists the drawings made for the page's kind first, and the face's others by name", () => {
    const signature = pageSignature(deck("brief", [page("data", [KPIS])]), page("data", [KPIS]), getThemeDefinition("brief"))!
    expect(signature.face).toBe("gauge-sheet")
    expect(signature.forPage.map((entry) => entry.id)).toEqual(["rail", "figures"])
    expect(signature.forPage.find((entry) => entry.id === "figures")).toMatchObject({ written: true, write: ["kpi_cards (2 to 4 items) + blockquote (optional)"] })
    expect(signature.others.map((other) => other.id)).toContain("rows")
  })

  it("lists the drawings of the kind a page lands on when the theme lacks its own", () => {
    const theme = getThemeDefinition("crayon")
    expect(theme.menu.content.fact).toBeUndefined()
    const slide = page("fact", [KPIS])
    const ir = deck("crayon", [slide])
    const served = resolveEffectiveFace(ir, slide, theme).servedKind!
    const signature = pageSignature(ir, slide, theme)!
    expect(signature.forPage.length).toBeGreaterThan(0)
    for (const entry of signature.forPage) {
      const offer = pageOffers(ir, slide, theme)!.forPage.find((o) => o.id === entry.id)!
      expect(offer.recipe.kinds.some((kind) => kind === "fact" || kind === served), entry.id).toBe(true)
    }
  })

  it("is absent on a face that offers no drawing", () => {
    const slide = page("statement", [])
    expect(pageSignature(deck("brief", [slide]), slide, getThemeDefinition("brief"))).toBeUndefined()
  })

  it("offers a cover whose face draws over a photograph that photograph", () => {
    const bare = { type: "cover", heading: "Applying for product lead", components: [] } as unknown as Slide
    const signature = pageSignature(deck("profile", [bare]), bare, getThemeDefinition("profile"))!
    expect(signature.forPage).toEqual([expect.objectContaining({ id: PHOTOGRAPH, written: false })])
    const shot = { ...bare, background: { kind: "asset", asset_id: "portrait" } } as Slide
    expect(pageSignature(deck("profile", [shot]), shot, getThemeDefinition("profile"))!.forPage[0]!.written).toBe(true)
    expect(pageSignature(deck("brief", [bare]), bare, getThemeDefinition("brief"))).toBeUndefined()
  })
})

describe("pageSignatureUse", () => {
  it("names the drawing that drew a page written to its recipe", () => {
    const ir = deck("brief", [page("data", [KPIS])])
    const slide = ir.slides[0]!
    const theme = getThemeDefinition("brief")
    expect(pageSignatureUse(ir, slide, theme, renderSlideSvg(ir, 0, { theme }))).toEqual({ drawnBy: "figures" })
  })

  it("gives a page drawn plain its nearest recipe and what it lacks", () => {
    const ir = deck("brief", [page("data", [KPIS, PROSE])])
    const slide = ir.slides[0] as Content
    const theme = getThemeDefinition("brief")
    const use = pageSignatureUse(ir, slide, theme, renderSlideSvg(ir, 0, { theme }))!
    expect(use.drawnBy).toBeNull()
    expect(use.nearest).toMatchObject({ id: "figures", changes: ["turn the paragraph into blockquote"] })
    expect(nearestRecipe(slide, pageOffers(ir, slide, theme)!)).toEqual(use.nearest)
  })

  it("prefers on a tie a drawing made for the page's kind, turning a kindred component rather than adding one", () => {
    const theme = getThemeDefinition("profile")
    const cards = { type: "row_cards", items: [{ title: "Floor first", text: "Stood at the till and in the kitchen" }, { title: "Rotas", text: "Reads footfall every week" }, { title: "Gets it done", text: "Took the new rota through three teams" }] } as Component
    const slide = page("list", [cards])
    const offers = pageOffers(deck("profile", [slide]), slide, theme)!
    const near = nearestRecipe(slide, offers)!
    expect(offers.forPage.map((offer) => offer.id)).toContain(near.id)
    expect(RECIPES[near.id].kinds).toContain("list")
    expect(near.changes).toContain("turn the row_cards into icon_cards (2 to 3 items)")
  })

  it("tells a face that declines a subheading to drop it first", () => {
    const theme = getThemeDefinition("profile")
    const offers = pageOffers(deck("profile", [page("process", [])]), page("process", []), theme)!
    expect(offers.subheadingDeclines).toBe(true)
    const near = nearestRecipe(page("process", [], { subheading: "Four roles" }), offers)!
    expect(near.changes[0]).toBe("drop the subheading")
  })
})
