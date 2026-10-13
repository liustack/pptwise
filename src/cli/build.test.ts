// @vitest-environment node
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import type { BuildReport } from "./build-report"
import { assembleIssues, validateIssue } from "./build-report"
import { BUILTIN_THEME_IDS, type PptxIR } from "../ir"
import { getThemeDefinition } from "../themes/definitions"
import { themeShortlist } from "../themes/select"
import { ALTERNATIVES_DIRNAME, ALTERNATIVES_MAX, alternativeCandidates } from "./build-alternatives"
import { runBuild, runRender, runThemeNew } from "./commands"

installNodePlatform()

const SPEC = {
  version: "1",
  filename: "weekly",
  narrative: "general",
  theme: "brief",
  pages: [
    { id: "cover", type: "cover", heading: "Weekly review" },
    { id: "why", type: "content", kind: "points", heading: "Why we change it" },
    { id: "numbers", type: "content", kind: "data", heading: "Where the hour goes" },
    { id: "how", type: "content", kind: "list", heading: "What changes" },
    { id: "who", type: "content", kind: "comparison", heading: "Who runs it" },
    { id: "end", type: "ending", heading: "Starting Monday" },
  ],
}

const PAGES: Record<string, unknown> = {
  cover: {},
  why: { components: [{ type: "bullets", items: ["Status goes in writing first", "The meeting is for blockers", "Notes go out within ten minutes"] }] },
  numbers: { components: [{ type: "kpi_cards", items: [{ value: "60", label: "minutes today" }, { value: "30", label: "minutes from Monday" }] }] },
  how: {
    components: [
      {
        type: "row_cards",
        items: [
          { title: "Before", text: "Three lines each" },
          { title: "During", text: "Blockers only" },
          { title: "After", text: "Notes in ten minutes" },
        ],
      },
    ],
  },
  who: { components: [{ type: "comparison", columns: ["Now", "From Monday"], rows: [{ label: "Chair", cells: ["Manager", "Rotating"] }] }] },
  end: {},
}

/** A workspace holding one deck project, `weekly/`, written from SPEC and PAGES with `edit` applied. */
async function workspace(edit: (spec: typeof SPEC, pages: Record<string, unknown>) => void = () => {}): Promise<{ cwd: string; deck: string }> {
  const cwd = await mkdtemp(join(tmpdir(), "pptwise-build-"))
  const deck = join(cwd, "weekly")
  const spec = structuredClone(SPEC)
  const pages = structuredClone(PAGES)
  edit(spec, pages)
  await mkdir(join(deck, "pages"), { recursive: true })
  await writeFile(join(deck, "deck.spec.json"), JSON.stringify(spec))
  for (const [id, page] of Object.entries(pages)) await writeFile(join(deck, "pages", `${id}.json`), JSON.stringify(page))
  return { cwd, deck }
}

async function build(cwd: string, target = "weekly"): Promise<{ report: BuildReport; ok: boolean }> {
  const { output, ok } = await runBuild(target, { json: true, cwd, gitIgnore: false })
  return { report: JSON.parse(output) as BuildReport, ok }
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  )
}

/** Every .pptx under `dir`, recursively. */
async function pptxFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".pptx")) found.push(join(entry.parentPath, entry.name))
  }
  return found
}

describe("pptwise build", () => {
  it("writes the pages and the deck's one .pptx when every check passes", async () => {
    const { cwd } = await workspace()
    const { report, ok } = await build(cwd)
    const out = join(cwd, ".pptwise", "weekly")
    expect(ok).toBe(true)
    expect(report).toMatchObject({ status: "ok", theme: "brief", pageCount: 6, audited: true, errors: [], pptx: join(out, "weekly.pptx") })
    expect(await pptxFiles(cwd)).toEqual([join(out, "weekly.pptx")])
    expect((await readFile(report.pptx!)).subarray(0, 2).toString()).toBe("PK")
    expect(report.preview).toMatchObject({ dir: out, html: join(out, "preview.html"), manifest: join(out, "manifest.json") })
    expect(report.preview!.pages.map((page) => [page.page, page.id, page.type])).toEqual([
      [1, "cover", "cover"],
      [2, "why", "content"],
      [3, "numbers", "content"],
      [4, "how", "content"],
      [5, "who", "content"],
      [6, "end", "ending"],
    ])
    for (const page of report.preview!.pages) expect(await readFile(page.file, "utf8")).toMatch(/^<svg\b/)
  })

  it("prints a short report without --json, and the .pptx path on its own line", async () => {
    const { cwd } = await workspace()
    const { output, ok } = await runBuild("weekly", { cwd, gitIgnore: false, alternatives: false })
    expect(ok).toBe(true)
    expect(output.split("\n")).toEqual([
      'OK: 6 pages, theme "brief", audit clean',
      `preview: ${join(cwd, ".pptwise", "weekly", "preview.html")}`,
      `pptx: ${join(cwd, ".pptwise", "weekly", "weekly.pptx")}`,
    ])
  })

  it("writes to the path render defaults to, so the two never leave two decks", async () => {
    const { cwd } = await workspace()
    const rendered = await runRender("weekly", { cwd, gitIgnore: false })
    const { report } = await build(cwd)
    expect(rendered).toContain(`wrote ${report.pptx}`)
    expect(await pptxFiles(cwd)).toEqual([report.pptx])
  })

  it("places a validate error on its page, its page file and its field, and writes no .pptx", async () => {
    const { cwd } = await workspace((_spec, pages) => {
      const why = pages.why as { components: { items: string[] }[] }
      why.components[0]!.items = Array.from({ length: 30 }, (_, i) => `Point number ${i + 1} that runs on for a while`)
    })
    const { report, ok } = await build(cwd)
    expect(ok).toBe(false)
    expect(report).toMatchObject({ status: "needs_revision", pptx: null, preview: null })
    expect(report.errors.length).toBeGreaterThan(0)
    expect(report.errors[0]).toMatchObject({ stage: "validate", page: 2, pageId: "why", file: "pages/why.json", field: expect.stringMatching(/^components/) })
    expect(await pptxFiles(cwd)).toEqual([])
  })

  it("sends a field the spec locks back to deck.spec.json", async () => {
    const { cwd } = await workspace((spec) => {
      spec.pages[0]!.heading = "A cover heading that goes on and on well past anything a cover face could ever set on one slide without cutting it"
    })
    const { report } = await build(cwd)
    expect(report.errors).toContainEqual(expect.objectContaining({ stage: "assemble", page: 1, pageId: "cover", file: "deck.spec.json", field: "heading" }))
  })

  it("removes the .pptx an earlier build wrote once the sources stop passing", async () => {
    const { cwd, deck } = await workspace()
    const first = await build(cwd)
    expect(await exists(first.report.pptx!)).toBe(true)
    await writeFile(join(deck, "pages", "why.json"), "{not json")
    const second = await build(cwd)
    expect(second.report.status).toBe("needs_revision")
    expect(await exists(first.report.pptx!)).toBe(false)
    expect(second.report.errors).toEqual([
      expect.objectContaining({ stage: "assemble", pageId: "why", file: "pages/why.json", message: expect.stringMatching(/not valid JSON/) }),
    ])
  })

  it("names the .pptx after the spec's filename and keeps one when that name changes", async () => {
    const { cwd, deck } = await workspace((spec) => {
      spec.filename = "周会改版"
    })
    const out = join(cwd, ".pptwise", "weekly")
    const first = await build(cwd)
    expect(first.report.pptx).toBe(join(out, "周会改版.pptx"))
    const spec = JSON.parse(await readFile(join(deck, "deck.spec.json"), "utf8")) as typeof SPEC
    spec.filename = "weekly-v2.pptx"
    await writeFile(join(deck, "deck.spec.json"), JSON.stringify(spec))
    const second = await build(cwd)
    expect(second.report.pptx).toBe(join(out, "weekly-v2.pptx"))
    expect(await pptxFiles(cwd)).toEqual([join(out, "weekly-v2.pptx")])
  })

  it("draws the deck but refuses the .pptx while a page is unwritten, naming the file to write", async () => {
    const { cwd } = await workspace((_spec, pages) => {
      delete pages.how
    })
    const { report } = await build(cwd)
    expect(report.status).toBe("needs_revision")
    expect(report.audited).toBe(false)
    expect(report.preview!.pages).toHaveLength(6)
    expect(report.errors).toEqual([
      { stage: "validate", page: 4, pageId: "how", file: "pages/how.json", message: "this page is not written yet. Write pages/how.json" },
    ])
    expect(report.pptx).toBeNull()
  })

  it("reports an audit finding with its code and detail, and keeps the drawn pages", async () => {
    const bullets = { components: [{ type: "bullets", items: ["One", "Two", "Three"] }] }
    const { cwd } = await workspace((spec, pages) => {
      spec.pages[2] = { id: "numbers", type: "content", kind: "points", heading: "Where the hour goes" }
      spec.pages[3] = { id: "how", type: "content", kind: "points", heading: "What changes" }
      pages.why = bullets
      pages.numbers = bullets
      pages.how = bullets
    })
    const { report } = await build(cwd)
    expect(report.status).toBe("needs_revision")
    expect(report.audited).toBe(true)
    expect(report.errors).toContainEqual(
      expect.objectContaining({ stage: "audit", code: "monotony", page: 2, pageId: "why", file: "pages/why.json", detail: expect.objectContaining({ componentType: "bullets" }) }),
    )
    expect(report.preview).not.toBeNull()
    expect(await pptxFiles(cwd)).toEqual([])
  })

  it("fails the command, rather than reporting a revision, for a deck that is not there", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "pptwise-build-missing-"))
    await expect(runBuild("nowhere", { cwd, gitIgnore: false })).rejects.toThrow(/nothing to build at .*nowhere/)
  })
})

describe("assembleIssues", () => {
  it("splits a spec failure into one issue per line, each pointed at deck.spec.json", () => {
    const issues = assembleIssues(
      'invalid spec (2 issues):\npage "p-a" — pages.1.kind: kind "quote" is not offered\npages: spec has 5 pages',
    )
    expect(issues).toEqual([
      { stage: "assemble", page: 2, pageId: "p-a", file: "deck.spec.json", field: "kind", message: 'page "p-a" — pages.1.kind: kind "quote" is not offered' },
      { stage: "assemble", file: "deck.spec.json", message: "pages: spec has 5 pages" },
    ])
  })

  it("places an assembled page the IR schema refuses on its page, file and field", () => {
    expect(assembleIssues("assembled deck did not produce valid IR:\nslides.3.components.0.items: Too small: expected array to have >=3 items", ["a", "b", "c", "how"])).toEqual([
      { stage: "assemble", page: 4, pageId: "how", file: "pages/how.json", field: "components.0.items", message: "Too small: expected array to have >=3 items" },
    ])
  })

  it("points a page-file failure at that page's file", () => {
    expect(assembleIssues('page "why": "heading" is locked by the spec. Remove it from the page file')).toEqual([
      { stage: "assemble", pageId: "why", file: "pages/why.json", message: 'page "why": "heading" is locked by the spec. Remove it from the page file' },
    ])
  })
})

describe("validateIssue", () => {
  it("sends page content to the page file and what the spec locks to the spec, inside a deck project only", () => {
    const content = { path: "slides.2.components.0.items", message: "too many", page: 3, slideId: "why" }
    const heading = { path: "slides.0.heading", message: "too long", page: 1, slideId: "cover" }
    expect(validateIssue(content, true)).toEqual({ stage: "validate", page: 3, pageId: "why", file: "pages/why.json", field: "components.0.items", message: "too many" })
    expect(validateIssue(heading, true)).toEqual({ stage: "validate", page: 1, pageId: "cover", file: "deck.spec.json", field: "heading", message: "too long" })
    expect(validateIssue(content, false)).toEqual({ stage: "validate", page: 3, pageId: "why", field: "components.0.items", message: "too many" })
    expect(validateIssue({ path: "theme.id", message: "unknown theme" }, true)).toEqual({ stage: "validate", field: "theme.id", message: "unknown theme" })
  })
})


describe("pptwise build: the deck in other themes", () => {
  async function buildWith(cwd: string, alternatives?: boolean): Promise<BuildReport> {
    const { output } = await runBuild("weekly", { json: true, cwd, gitIgnore: false, alternatives })
    return JSON.parse(output) as BuildReport
  }

  it("draws the deck's own cover and content pages in up to three other themes on its first build", async () => {
    const { cwd } = await workspace()
    const report = await buildWith(cwd)
    const dir = join(cwd, ".pptwise", "weekly", ALTERNATIVES_DIRNAME)
    expect(report.themeSource).toBe("builtin")
    const alternatives = report.alternatives!
    expect(alternatives.dir).toBe(dir)
    expect(alternatives.themes.length).toBeGreaterThanOrEqual(2)
    expect(alternatives.themes.length).toBeLessThanOrEqual(ALTERNATIVES_MAX)
    expect(alternatives.ms).toBeGreaterThanOrEqual(0)
    const ids = alternatives.themes.map((theme) => theme.theme)
    expect(ids).not.toContain("brief")
    expect(new Set(ids).size).toBe(ids.length)
    for (const theme of alternatives.themes) {
      expect(theme.name).toBe(getThemeDefinition(theme.theme).label)
      const contents = theme.pages.filter((page) => page.type === "content")
      expect(contents.length).toBeGreaterThanOrEqual(1)
      expect(contents.length).toBeLessThanOrEqual(2)
      for (const page of theme.pages) {
        expect(page.file.startsWith(dir)).toBe(true)
        expect(await readFile(page.file, "utf8")).toMatch(/^<svg/)
      }
    }
    // The cover is the deck's own, in each theme that can draw it.
    expect(alternatives.themes.some((theme) => theme.pages[0]!.type === "cover" && theme.pages[0]!.page === 1)).toBe(true)
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as { bound: string; themes: { id: string }[] }
    expect(manifest.bound).toBe("brief")
    expect(manifest.themes.map((theme) => theme.id)).toEqual(ids)
  })

  it("offers them once: a later build leaves them alone, --alternatives draws them again", async () => {
    const { cwd } = await workspace()
    const first = await buildWith(cwd)
    expect(first.alternatives).toBeDefined()
    const again = await buildWith(cwd)
    expect(again.alternatives).toBeUndefined()
    expect(await exists(join(first.alternatives!.dir, "manifest.json"))).toBe(true)
    const asked = await buildWith(cwd, true)
    expect(asked.alternatives!.themes.map((theme) => theme.theme)).toEqual(first.alternatives!.themes.map((theme) => theme.theme))
  })

  it("draws none with --no-alternatives", async () => {
    const { cwd } = await workspace()
    const report = await buildWith(cwd, false)
    expect(report.alternatives).toBeUndefined()
    expect(await exists(join(cwd, ".pptwise", "weekly", ALTERNATIVES_DIRNAME))).toBe(false)
  })

  it("leaves a deck on a theme file alone unless asked, and says where its theme came from", async () => {
    const { cwd, deck } = await workspace((spec) => {
      spec.theme = "acme"
    })
    await runThemeNew({ from: "brief", output: join(deck, "acme.theme.json"), cwd })
    const report = await buildWith(cwd)
    expect(report.themeSource).toBe("file")
    expect(report.alternatives).toBeUndefined()
    const asked = await buildWith(cwd, true)
    expect(asked.alternatives!.themes.length).toBeGreaterThan(0)
  })

  it("draws them for a deck that still needs revision, since its pages are drawn", async () => {
    const { cwd } = await workspace((_spec, pages) => {
      delete pages.how
    })
    const report = await buildWith(cwd)
    expect(report.status).toBe("needs_revision")
    const drawn = report.alternatives!.themes.flatMap((theme) => theme.pages.map((page) => page.id))
    expect(drawn.length).toBeGreaterThan(0)
    // A page not written yet is never one of them.
    expect(drawn).not.toContain("how")
  })

  it("says in the text report how to switch", async () => {
    const { cwd } = await workspace()
    const { output } = await runBuild("weekly", { cwd, gitIgnore: false })
    expect(output).toMatch(/^alternatives: the deck's own pages in 1 \w+, 2 \w+/m)
    expect(output).toContain('To switch, change "theme" in deck.spec.json and build again.')
  })
})

describe("alternativeCandidates", () => {
  it("starts from the shortlist for the bound theme's occasions and the deck's strategy, never the bound theme", () => {
    const ir = { theme: { id: "crayon" }, narrative: { strategy: "instructional" } } as unknown as PptxIR
    const bound = getThemeDefinition("crayon")
    const candidates = alternativeCandidates(ir, bound)
    const shortlist = themeShortlist({ occasions: bound.occasions, strategy: "instructional" }).filter((id) => id !== "crayon")
    expect(candidates.slice(0, shortlist.length)).toEqual(shortlist)
    expect(candidates).not.toContain("crayon")
    expect(new Set(candidates).size).toBe(BUILTIN_THEME_IDS.length - 1)
  })
})

describe("pptwise build: a theme change is a name change", () => {
  it("builds a deck moved to a theme without some of its kinds, and says which pages are drawn as which", async () => {
    const { cwd } = await workspace((spec, pages) => {
      spec.pages[2] = { id: "numbers", type: "content", kind: "fact", heading: "Where the hour goes" }
      pages.numbers = { components: [{ type: "kpi_cards", items: [{ value: "30", label: "minutes from Monday" }] }] }
    })
    const before = await runBuild("weekly", { json: true, cwd, gitIgnore: false, alternatives: false })
    expect((JSON.parse(before.output) as BuildReport).drawnAs).toBeUndefined()
    const specPath = join(cwd, "weekly", "deck.spec.json")
    const spec = JSON.parse(await readFile(specPath, "utf8")) as { theme: string }
    expect(getThemeDefinition("crayon").menu.content.fact).toBeUndefined()
    await writeFile(specPath, JSON.stringify({ ...spec, theme: "crayon" }))
    const { output, ok } = await runBuild("weekly", { json: true, cwd, gitIgnore: false, alternatives: false })
    const report = JSON.parse(output) as BuildReport
    expect(report.errors).toEqual([])
    expect(ok).toBe(true)
    expect(report.theme).toBe("crayon")
    expect(report.drawnAs).toEqual([{ page: 3, pageId: "numbers", kind: "fact", drawnAs: expect.any(String) }])
    const text = await runBuild("weekly", { cwd, gitIgnore: false, alternatives: false })
    expect(text.output).toMatch(/^note: page 3 \(numbers\): theme "crayon" draws this "fact" page as "\w+", the nearest kind whose face takes it$/m)
  })
})

describe("pptwise build: pages written for another theme", () => {
  const coverList = (spec: typeof SPEC, pages: Record<string, unknown>) => {
    pages.cover = { components: [{ type: "bullets", items: ["Status in writing", "Blockers only"] }] }
  }
  const recordOf = async (cwd: string) => JSON.parse(await readFile(join(cwd, ".pptwise", "weekly", "written-for.json"), "utf8")) as { theme: string }
  const bind = async (cwd: string, theme: string) => {
    const specPath = join(cwd, "weekly", "deck.spec.json")
    await writeFile(specPath, JSON.stringify({ ...(JSON.parse(await readFile(specPath, "utf8")) as object), theme }))
  }
  const opts = (cwd: string) => ({ json: true, cwd, gitIgnore: false, alternatives: false })

  it("draws the deck under the new theme with what it cannot take left off, names it, and keeps the record for switching back", async () => {
    const { cwd } = await workspace(coverList)
    expect((await runBuild("weekly", opts(cwd))).ok).toBe(true)
    expect(await recordOf(cwd)).toEqual({ theme: "brief" })

    await bind(cwd, "thesis")
    const { output, ok } = await runBuild("weekly", opts(cwd))
    const report = JSON.parse(output) as BuildReport
    expect(ok).toBe(true)
    expect(report).toMatchObject({ status: "ok", theme: "thesis", writtenFor: "brief", errors: [] })
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ page: 1, message: expect.stringMatching(/^this deck's pages were written for theme "brief", and under "thesis" this is left off the page/) })]),
    )
    expect(await recordOf(cwd)).toEqual({ theme: "brief" })
    const text = await runBuild("weekly", { ...opts(cwd), json: false })
    expect(text.output).toMatch(/^note: this deck's pages were written for theme "brief"\. Theme "thesis" leaves off or cuts what the warnings below name\./m)

    await bind(cwd, "brief")
    const back = JSON.parse((await runBuild("weekly", opts(cwd))).output) as BuildReport
    expect(back.writtenFor).toBeUndefined()
    expect(await recordOf(cwd)).toEqual({ theme: "brief" })
  })

  it("moves the record when a build under the new theme draws every page whole", async () => {
    const { cwd } = await workspace()
    expect((await runBuild("weekly", opts(cwd))).ok).toBe(true)
    await bind(cwd, "thesis")
    const report = JSON.parse((await runBuild("weekly", opts(cwd))).output) as BuildReport
    expect(report.status).toBe("ok")
    expect(report.writtenFor).toBeUndefined()
    expect(await recordOf(cwd)).toEqual({ theme: "thesis" })
  })

  it("refuses the same pages under that theme when no build has recorded another", async () => {
    const { cwd } = await workspace((spec, pages) => {
      coverList(spec, pages)
      spec.theme = "thesis"
    })
    const { report, ok } = await build(cwd)
    expect(ok).toBe(false)
    expect(report.status).toBe("needs_revision")
    expect(report.errors[0]!.message).toContain('"cover" slides do not render components')
    expect(await exists(join(cwd, ".pptwise", "weekly", "written-for.json"))).toBe(false)
  })
})

describe("pptwise build: a label the new theme's face leaves off", () => {
  it("warns of it, draws the deck, and keeps the record on the theme that drew it", async () => {
    const { cwd } = await workspace((spec) => {
      ;(spec as Record<string, unknown>).meta = { organization: "New term parents' meeting" }
      spec.pages[0] = { id: "cover", type: "cover", kicker: "Autumn term evening session", heading: "Weekly review" } as never
    })
    const opts = { json: true, cwd, gitIgnore: false, alternatives: false }
    expect((await runBuild("weekly", opts)).ok).toBe(true)
    const specPath = join(cwd, "weekly", "deck.spec.json")
    // Ink's scroll cover stands the organization and the kicker in one
    // vertical column, too long here to stand.
    await writeFile(specPath, JSON.stringify({ ...(JSON.parse(await readFile(specPath, "utf8")) as object), theme: "ink" }))
    const { output, ok } = await runBuild("weekly", opts)
    const report = JSON.parse(output) as BuildReport
    expect(ok).toBe(true)
    expect(report).toMatchObject({ status: "ok", theme: "ink", writtenFor: "brief", errors: [] })
    expect(report.warnings).toContainEqual(expect.objectContaining({ stage: "audit", page: 1, code: "content-dropped", detail: { count: 1, kind: "label" } }))
    expect(JSON.parse(await readFile(join(cwd, ".pptwise", "weekly", "written-for.json"), "utf8"))).toEqual({ theme: "brief" })
  })
})
