import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import {
  DeckSpecSchema,
  SPEC_PAGE_COUNT_RANGE,
  formatSpecIssues,
  resolveSpecThemeId,
  specJsonSchema,
  validateSpec,
  type DeckSpec,
} from "./index"

const TEST_THEME_ID = "spec-index-tests"

beforeAll(() => {
  registerTheme({
    version: 2,
    id: TEST_THEME_ID,
    style: {
      ...CONSULTING_TOKENS,
      id: TEST_THEME_ID,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: { points: { face: "two-column" } },
      ending: { face: "poster-ending" },
    },
  })
})

afterAll(() => {
  __resetRegisteredThemes()
})

const cover = (id = "cover") => ({ id, type: "cover", heading: "Cover" })
const ending = (id = "ending") => ({ id, type: "ending", heading: "Ending" })
const content = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "content",
  kind: "points",
  heading: `Heading ${id}`,
  ...extra,
})

function valid(extra: Record<string, unknown> = {}): unknown {
  return {
    version: "1",
    theme: TEST_THEME_ID,
    pages: [cover(), content("a"), content("b"), content("c"), content("d"), ending()],
    ...extra,
  }
}

function expectOk(input: unknown): DeckSpec {
  const result = validateSpec(input)
  if (!result.ok) throw new Error(formatSpecIssues(result.errors))
  return result.spec!
}

describe("deck spec schema", () => {
  it("requires kind on every content page", () => {
    const raw = valid() as { pages: Array<Record<string, unknown>> }
    delete raw.pages[1]!.kind
    const result = validateSpec(raw)
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "pages.1.kind",
      pageId: "a",
    })
  })

  it.each(["beat", "layout"])("rejects retired page field %s", (field) => {
    const result = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("a", { [field]: "retired" }), content("b"), ending()],
    })
    expect(result.ok).toBe(false)
    expect(formatSpecIssues(result.errors)).toContain(field)
  })

  it("rejects retired top-level seed", () => {
    const result = validateSpec({ ...(valid() as object), seed: 42 })
    expect(result.ok).toBe(false)
    expect(formatSpecIssues(result.errors)).toContain("seed")
  })

  it("defaults version and meta, and requires an explicit theme", () => {
    const omitted = DeckSpecSchema.safeParse({
      pages: [cover(), content("a"), content("b"), content("c"), content("d"), ending()],
    })
    expect(omitted.success).toBe(false)

    const spec = DeckSpecSchema.parse({
      theme: TEST_THEME_ID,
      pages: [cover(), content("a"), content("b"), content("c"), content("d"), ending()],
    })
    expect(spec.version).toBe("1")
    expect(spec.meta).toEqual({})
    expect(spec.theme).toBe(TEST_THEME_ID)
    expect(resolveSpecThemeId(spec)).toBe(TEST_THEME_ID)
  })

  it("validateSpec fails when theme is omitted", () => {
    const result = validateSpec({
      pages: [cover(), content("a"), content("b"), content("c"), content("d"), ending()],
    })
    expect(result.ok).toBe(false)
    expect(formatSpecIssues(result.errors)).toMatch(/pptwise theme new --from/)
    expect(formatSpecIssues(result.errors)).toMatch(/"theme": "<id>"/)
  })

  it("keeps deck branding as the existing three-state field", () => {
    expect(expectOk(valid({ branding: "full" })).branding).toBe("full")
    expect(expectOk(valid({ branding: "cover-only" })).branding).toBe("cover-only")
    expect(expectOk(valid({ branding: "minimal" })).branding).toBe("minimal")
    expect(validateSpec(valid({ branding: "none" })).ok).toBe(false)
  })

  it("normalizes the root chrome alias", () => {
    const result = validateSpec(valid({ chrome: "full" }))
    expect(result.ok).toBe(true)
    expect(result.spec?.branding).toBe("full")
    expect(result.normalized).toEqual(["(root): chrome → branding"])
  })
})

describe("deck spec hard gates", () => {
  it("requires cover and ending boundaries", () => {
    const result = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [content("a"), content("b"), content("c"), content("d")],
    })
    expect(result.ok).toBe(false)
    expect(formatSpecIssues(result.errors)).toContain('first page must be type "cover"')
    expect(formatSpecIssues(result.errors)).toContain('last page must be type "ending"')
  })

  it("requires safe unique page ids", () => {
    const duplicate = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("dup"), content("dup"), ending()],
    })
    expect(formatSpecIssues(duplicate.errors)).toContain('duplicate page id "dup"')

    const unsafe = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("../escape"), content("b"), ending()],
    })
    expect(formatSpecIssues(unsafe.errors)).toContain("not a safe file name")
  })

  it("requires concise non-empty headings", () => {
    const empty = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("a", { heading: " " }), content("b"), ending()],
    })
    expect(formatSpecIssues(empty.errors)).toContain("missing a required heading")

    const long = validateSpec({
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("a", { heading: "x".repeat(49) }), content("b"), ending()],
    })
    expect(formatSpecIssues(long.errors)).toContain("48-character limit")
  })

  it("checks installed themes", () => {
    expect(expectOk(valid()).theme).toBe(TEST_THEME_ID)
    const result = validateSpec(valid({ theme: "not-installed" }))
    expect(result.ok).toBe(false)
    expect(formatSpecIssues(result.errors)).toContain('unknown theme "not-installed"')
  })

  it("resolves narrative values and normalizes the preset object shape", () => {
    const result = validateSpec(valid({ narrative: { id: "boardroom-report" } }))
    expect(result.ok).toBe(true)
    expect(result.spec?.narrative).toBe("boardroom-report")
    expect(result.normalized?.[0]).toContain("narrative")

    const invalid = validateSpec(valid({ narrative: { pacing: "impossible" } }))
    expect(invalid.ok).toBe(false)
    expect(formatSpecIssues(invalid.errors)).toContain('unknown pacing "impossible"')
  })

  it("keeps focus as a validated authoring hint", () => {
    expect(
      expectOk(
        valid({
          pages: [cover(), content("a", { focus: "chart" }), content("b"), content("c"), content("d"), ending()],
        }),
      ).pages[1],
    ).toMatchObject({ focus: "chart" })
    const invalid = validateSpec(
      valid({
        pages: [cover(), content("a", { focus: "bogus" }), content("b"), content("c"), content("d"), ending()],
      }),
    )
    expect(invalid.ok).toBe(false)
    expect(formatSpecIssues(invalid.errors)).toContain('unknown focus "bogus"')
  })

  it("keeps pacing page-count budgets unchanged", () => {
    expect(SPEC_PAGE_COUNT_RANGE.spacious).toEqual({ min: 4, max: 16 })
    const fourPages = {
      narrative: { pacing: "spacious" },
      theme: TEST_THEME_ID,
      pages: [cover(), content("a"), content("b"), ending()],
    }
    expect(validateSpec(fourPages).ok).toBe(true)
    expect(validateSpec({ ...fourPages, narrative: { pacing: "dense" } }).ok).toBe(false)
  })
})

describe("spec JSON schema", () => {
  it("exposes kind and omits retired selection fields", () => {
    const schema = JSON.stringify(specJsonSchema())
    expect(schema).toContain('"kind"')
    expect(schema).not.toContain('"seed"')
    expect(schema).not.toContain('"beat"')
    expect(schema).not.toContain('"layout"')
  })
})
