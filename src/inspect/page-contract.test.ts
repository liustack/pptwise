import { describe, expect, it } from "vitest"
import { validateIr, type ValidateResult } from "@/api"
import { COMPONENT_TYPES, KIND_VALUES, PptxIRSchema, type Component, type PptxIR } from "@/ir"
import { componentJsonSchema } from "@/ir/json-schema"
import { PAGE_FILL_FIELDS } from "@/spec/assemble"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"
import { pageComponentContract, pageContract, type PageLimit } from "./page-contract"

// 1x1 红色 PNG
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

type PageShape = { type: "cover" | "chapter" | "ending" } | { type: "content"; kind: string }

/** Every `asset_id` a component refers to, so a probe deck can declare them. */
function assetIdsOf(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) assetIdsOf(item, out)
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "asset_id" && typeof value === "string") out.add(value)
      else assetIdsOf(value, out)
    }
  }
  return out
}

/**
 * A deck under `theme` whose second page is `page` holding `components`,
 * between a cover and an ending that are still placeholders. `extra` lands
 * on the probed page (a background, a footnote).
 */
function probeDeck(theme: string, page: PageShape, components: Component[] = [], extra: Record<string, unknown> = {}): PptxIR {
  const images: Record<string, { src: string }> = { hero: { src: PNG_1PX } }
  for (const id of assetIdsOf(components)) images[id] = { src: PNG_1PX }
  const raw = {
    version: "5",
    theme: { id: theme },
    assets: { images },
    slides: [
      { id: "open", type: "cover", heading: "Open", placeholder: true },
      { id: "probe", heading: "Probe", ...page, components, ...extra },
      { id: "close", type: "ending", heading: "Close", placeholder: true },
    ],
  }
  // Schema parse only, the way assembly hands a deck over: the probe may
  // carry content validate goes on to refuse.
  return PptxIRSchema.parse(raw)
}

function sample(type: string): Component {
  return COMPONENT_BUILDERS[type]!(LEXICONS.en)
}

function contractOf(theme: string, page: PageShape, components: Component[] = [], extra: Record<string, unknown> = {}) {
  return pageContract(probeDeck(theme, page, components, extra), "probe", { theme: getThemeDefinition(theme) })
}

/** Whether validate rejects the probe page for holding a component its face does not draw. */
function validateRefusesComponent(theme: string, page: PageShape, type: string, extra: Record<string, unknown> = {}): boolean {
  const result = validateIr(probeDeck(theme, page, [sample(type)], extra), { theme: getThemeDefinition(theme) })
  return result.errors.some(
    (e) => e.page === 2 && /does not render|do not render components/.test(e.message),
  )
}

describe("pageContract: components (T7, one route with validate)", () => {
  const pages: Array<[string, PageShape, Record<string, unknown>?]> = [
    ["brief", { type: "content", kind: "fact" }],
    ["brief", { type: "content", kind: "points" }],
    ["brief", { type: "content", kind: "photo" }],
    ["thesis", { type: "content", kind: "quote" }],
    ["thesis", { type: "content", kind: "photo" }],
    ["playbill", { type: "content", kind: "statement" }],
    ["brief", { type: "cover" }],
    ["bulletin", { type: "ending" }],
    ["museum", { type: "chapter" }],
    ["brief", { type: "cover" }, { background: { kind: "asset", asset_id: "hero" } }],
  ]

  it.each(pages)("lists exactly what validate accepts: %s %o %o", (theme, page, extra = {}) => {
    const legal = new Set(contractOf(theme, page, [], extra).components.legal)
    for (const type of COMPONENT_TYPES) {
      expect(validateRefusesComponent(theme, page, type, extra), `${theme}/${JSON.stringify(page)}/${type}`).toBe(!legal.has(type))
    }
  })

  it("says why a cover over its background picture takes nothing", () => {
    const contract = contractOf("brief", { type: "cover" }, [], { background: { kind: "asset", asset_id: "hero" } })
    expect(contract.components.legal).toEqual([])
    expect(contract.components.notes.join(" ")).toMatch(/background picture/)
  })

  it("says why a face that draws the heading alone takes nothing", () => {
    const contract = contractOf("playbill", { type: "content", kind: "statement" })
    expect(contract.components.legal).toEqual([])
    expect(contract.components.notes.join(" ")).toMatch(/heading alone/)
  })

  it("names the full-body components among the legal ones, and a takeover's required picture", () => {
    const photo = contractOf("brief", { type: "content", kind: "photo" }).components
    expect(photo.fullBody.length).toBeGreaterThan(0)
    for (const type of photo.fullBody) expect(photo.legal).toContain(type)
    expect(photo.required).toEqual([{ slot: "image", accepts: ["image", "image_grid", "image_compare", "device_mockup"] }])
    // Boundary pages have no required-slot gate in validate, so none is reported.
    expect(contractOf("brief", { type: "cover" }).components.required).toEqual([])
  })

  it("recommends the spec focus first, then what the page already holds, and nothing else", () => {
    const ir = probeDeck("brief", { type: "content", kind: "data" }, [sample("kpi_cards"), sample("chart")])
    const theme = getThemeDefinition("brief")
    const withFocus = pageContract(ir, "probe", {
      theme,
      pageSpec: { id: "probe", type: "content", kind: "data", heading: "Probe", focus: "chart" },
    })
    expect(withFocus.components.onPage).toEqual(["kpi_cards", "chart"])
    expect(withFocus.components.recommended).toEqual([
      { type: "chart", because: "spec focus" },
      { type: "kpi_cards", because: "on the page" },
    ])
    const bare = pageContract(probeDeck("brief", { type: "content", kind: "data" }), "probe", { theme })
    expect(bare.components.recommended).toEqual([])
  })

  it("notes a spec focus the face cannot draw instead of recommending it", () => {
    const ir = probeDeck("brief", { type: "content", kind: "fact" })
    const contract = pageContract(ir, "probe", {
      theme: getThemeDefinition("brief"),
      pageSpec: { id: "probe", type: "content", kind: "fact", heading: "Probe", focus: "chart" },
    })
    expect(contract.components.recommended).toEqual([])
    expect(contract.components.notes).toContain('The spec\'s focus "chart" is not a component this page draws.')
  })
})

describe("pageContract: page facts and fields", () => {
  it("reports the locked facts, the position, the fill hints, and the placeholder state", () => {
    const ir = probeDeck("brief", { type: "content", kind: "data" })
    const contract = pageContract(ir, "probe", {
      theme: getThemeDefinition("brief"),
      pageSpec: { id: "probe", type: "content", kind: "data", heading: "Probe", summary: "Revenue mix", focus: "chart" },
    })
    expect(contract.page).toEqual({
      id: "probe",
      number: 2,
      of: 3,
      type: "content",
      kind: "data",
      heading: "Probe",
      summary: "Revenue mix",
      focus: "chart",
      filled: true,
    })
    expect(contract.theme).toBe("brief")
    expect(contract.face).toBe(getThemeDefinition("brief").menu.content.data!.face)
    expect(pageContract(ir, "open", { theme: getThemeDefinition("brief") }).page.filled).toBe(false)
  })

  it("refuses an unknown page id and lists the ids there are", () => {
    const ir = probeDeck("brief", { type: "content", kind: "data" })
    expect(() => pageContract(ir, "nope", { theme: getThemeDefinition("brief") })).toThrow(
      /no page "nope" in this deck\. Pages: open, probe, close/,
    )
  })

  it("lists the page file's fields with their IR schema, and drops footnote on a boundary page", () => {
    const content = contractOf("brief", { type: "content", kind: "data" }).fields
    expect(Object.keys(content).filter((key) => key !== "$defs")).toEqual([...PAGE_FILL_FIELDS])
    expect(content.image_side).toEqual({ type: "string", enum: ["left", "right"] })
    expect(content.footnote).toEqual({ type: "string" })
    const cover = contractOf("brief", { type: "cover" }).fields
    expect(Object.keys(cover)).not.toContain("footnote")
    expect(Object.keys(cover)).toContain("background")
  })
})

describe("pageContract: errors and warnings", () => {
  it("locates validate's own finding inside the page", () => {
    const theme = getThemeDefinition("brief")
    const ir = probeDeck("brief", { type: "content", kind: "fact" }, [sample("chart")])
    const direct = validateIr(ir, { theme })
    const contract = pageContract(ir, "probe", { theme })
    expect(contract.errors).toEqual(
      direct.errors.map((e) => ({ scope: "page", path: e.path.replace(/^slides\.1\.?/, ""), message: e.message })),
    )
    expect(contract.errors[0]).toMatchObject({ scope: "page", path: "components" })
    expect(contract.errors[0]!.message).toMatch(/does not render chart/)
  })

  it("keeps deck-level findings and leaves out another page's", () => {
    const theme = getThemeDefinition("brief")
    const ir = probeDeck("brief", { type: "content", kind: "points" }, [sample("paragraph")])
    const validation: ValidateResult = {
      ok: false,
      errors: [
        { path: "narrative", message: "deck-wide" },
        { path: "slides.0.components", page: 1, message: "someone else's" },
        { path: "slides.1.components.0.text", page: 2, message: "this page's" },
        { path: "slides.1", page: 2, message: "the whole page" },
      ],
    }
    expect(pageContract(ir, "probe", { theme, validation }).errors).toEqual([
      { scope: "deck", path: "narrative", message: "deck-wide" },
      { scope: "page", path: "components.0.text", message: "this page's" },
      { scope: "page", path: "", message: "the whole page" },
    ])
  })
})

/** The smallest instance of a type that raises nothing on its own. */
function minimal(type: string, i: number): Component {
  if (type === "paragraph") return { type: "paragraph", text: `Block ${i}` }
  if (type === "bullets") return { type: "bullets", items: [`Point ${i}`] }
  return sample(type)
}

/**
 * Content that sits exactly on a limit when `n` equals its `max`: the probe
 * page's components with the limit's measure set to `n`. Undefined when the
 * page cannot hold a probe for this limit.
 */
function atCount(limit: PageLimit, legal: readonly string[], n: number): Component[] | undefined {
  const of = limit.of?.filter((type) => legal.includes(type)) ?? []
  switch (limit.measure) {
    case "components": {
      const type = limit.of === undefined ? ["paragraph", "bullets"].find((t) => legal.includes(t)) : of[0]
      if (type === undefined) return undefined
      return Array.from({ length: n }, (_, i) => minimal(type, i))
    }
    case "items":
      if (!of.includes("bullets")) return undefined
      return [{ type: "bullets", items: Array.from({ length: n }, (_, i) => `Point ${i}`) }]
    case "item width":
      return [{ type: "bullets", items: ["测".repeat(n)] }]
    case "rows": {
      const base = sample("comparison") as Extract<Component, { type: "comparison" }>
      return [{ ...base, rows: Array.from({ length: n }, (_, i) => ({ ...base.rows[0]!, label: `Row ${i}` })) }]
    }
    case "layers": {
      const base = sample("architecture") as Extract<Component, { type: "architecture" }>
      return [{ ...base, layers: Array.from({ length: n }, (_, i) => ({ ...base.layers[0]!, title: `Layer ${i}` })) }]
    }
    case "series":
      return [
        {
          type: "chart",
          chart_type: "line",
          series: Array.from({ length: n }, (_, i) => ({ name: `S${i}`, data: [{ x: "A", y: i }, { x: "B", y: i + 1 }] })),
        } as Component,
      ]
  }
}

/** The page's findings at one severity, as comparable strings. */
function findings(result: ValidateResult, level: PageLimit["level"]): string[] {
  const issues = level === "error" ? result.errors : (result.warnings ?? [])
  return issues.filter((issue) => issue.page === 2).map((issue) => `${issue.path}: ${issue.message}`)
}

describe("pageContract: limits flip validate exactly at max (T7)", () => {
  const pages: Array<[string, PageShape]> = []
  for (const theme of CANONICAL_THEME_IDS) {
    const menu = getThemeDefinition(theme).menu
    pages.push([theme, { type: "cover" }], [theme, { type: "ending" }])
    for (const kind of KIND_VALUES) if (menu.content[kind] !== undefined) pages.push([theme, { type: "content", kind }])
  }

  it.each(pages)("%s %o", (theme, page) => {
    const bound = getThemeDefinition(theme)
    const contract = contractOf(theme, page)
    // A face slot that needs a picture gets one first, so the page reaches
    // the checks past the required-slot gate.
    const base = contract.components.required.map((slot) => sample(slot.accepts[0]!))
    const verdict = (components: Component[], level: PageLimit["level"]) =>
      findings(validateIr(probeDeck(theme, page, [...base, ...components]), { theme: bound }), level)
    for (const limit of contract.limits) {
      const label = `${theme} ${JSON.stringify(page)} ${JSON.stringify(limit)}`
      const atMax = atCount(limit, contract.components.legal, limit.max)
      const past = atCount(limit, contract.components.legal, limit.max + 1)
      const below = atCount(limit, contract.components.legal, Math.max(limit.max - 1, 0))
      expect(atMax && past && below, `${label} has no probe`).toBeDefined()
      const before = verdict(atMax!, limit.level)
      // One past the limit raises a finding at the stated level that the
      // limit itself did not.
      expect(verdict(past!, limit.level).filter((line) => !before.includes(line)), label).not.toEqual([])
      // At the limit, the count raises nothing a count one lower did not,
      // unless a tighter limit on the same count has already fired.
      const tighter = contract.limits.some(
        (other) => other !== limit && other.level === limit.level && other.measure === limit.measure && other.max < limit.max,
      )
      if (tighter) continue
      const under = verdict(below!, limit.level)
      expect(before.filter((line) => !under.includes(line)), label).toEqual([])
    }
  })
})

describe("pageComponentContract", () => {
  const theme = getThemeDefinition("brief")
  const ir = probeDeck("brief", { type: "content", kind: "data" })

  it("expands one legal component: the same schema cut, its story, and the limits that count it", () => {
    const expanded = pageComponentContract(ir, "probe", "bullets", { theme })
    expect(expanded.component).toBe("bullets")
    expect(expanded.schema).toEqual(componentJsonSchema("bullets"))
    expect(expanded.story?.name).toBeTruthy()
    expect(expanded.fullBody).toBe(false)
    expect(expanded.limits.length).toBeGreaterThan(0)
    for (const limit of expanded.limits) expect(limit.of).toContain("bullets")
    expect(pageComponentContract(ir, "probe", "sankey", { theme }).fullBody).toBe(true)
  })

  it("refuses a component the page's face does not draw, naming what it does draw", () => {
    const fact = probeDeck("brief", { type: "content", kind: "fact" })
    expect(() => pageComponentContract(fact, "probe", "chart", { theme })).toThrow(
      /page "probe" does not draw chart\. It draws: paragraph, kpi_cards|page "probe" does not draw chart\. It draws: kpi_cards, paragraph/,
    )
    expect(() => pageComponentContract(ir, "probe", "quote", { theme })).toThrow(/unknown component type "quote"/)
  })
})
