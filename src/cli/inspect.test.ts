// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { componentJsonSchema } from "../ir/json-schema"
import { pageContract } from "../inspect/page-contract"
import { getThemeDefinition } from "../themes/definitions"
import { runInspect, runRender, runValidate } from "./commands"
import { readDeckDir } from "./deck-dir"

const originalPptwiseHome = process.env.PPTWISE_HOME
beforeAll(async () => {
  installNodePlatform()
  // Keep the real machine's ~/.pptwise out of every read below.
  process.env.PPTWISE_HOME = await mkdtemp(join(tmpdir(), "pptwise-inspect-home-"))
})
afterAll(() => {
  if (originalPptwiseHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalPptwiseHome
})

const SPEC = {
  version: "1",
  narrative: "boardroom-report",
  theme: "brief",
  filename: "inspect-test",
  pages: [
    { id: "open", type: "cover", heading: "Quarterly review" },
    { id: "growth", type: "content", kind: "data", heading: "Expansion drove the quarter", summary: "Revenue mix", focus: "chart" },
    { id: "number", type: "content", kind: "fact", heading: "One number" },
    { id: "later", type: "content", kind: "points", heading: "Still to write" },
    { id: "close", type: "ending", heading: "Decisions" },
  ],
}

const CHART = {
  type: "chart",
  chart_type: "bar",
  series: [{ name: "Revenue", data: [{ x: "Expansion", y: 62 }, { x: "New", y: 38 }] }],
}

/** A deck project with `pages` written under `pages/`. */
async function deck(pages: Record<string, unknown>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pptwise-inspect-"))
  await writeFile(join(dir, "deck.spec.json"), JSON.stringify(SPEC))
  await mkdir(join(dir, "pages"))
  for (const [id, content] of Object.entries(pages)) {
    await writeFile(join(dir, "pages", `${id}.json`), typeof content === "string" ? content : JSON.stringify(content))
  }
  return dir
}

async function inspectJson(dir: string, page: string): Promise<Record<string, any>> {
  const { output } = await runInspect(dir, { page, json: true })
  expect(output).not.toContain("\n")
  return JSON.parse(output)
}

describe("runInspect --page", () => {
  it("prints the page's contract as one line of JSON, with the page file it fills", async () => {
    const dir = await deck({ growth: { components: [CHART] } })
    const report = await inspectJson(dir, "growth")
    expect(report.page).toEqual({
      id: "growth",
      number: 2,
      of: 5,
      type: "content",
      kind: "data",
      heading: "Expansion drove the quarter",
      summary: "Revenue mix",
      focus: "chart",
      filled: true,
      file: "pages/growth.json",
    })
    expect(report.theme).toBe("brief")
    expect(report.components.legal).toContain("chart")
    expect(report.components.recommended[0]).toEqual({ type: "chart", because: "spec focus" })
    expect(report.errors).toEqual([])
  })

  it("answers what the whole assembled deck answers, from this page's file alone", async () => {
    const dir = await deck({
      open: {},
      growth: { components: [CHART, { type: "paragraph", text: "Expansion was concentrated in two segments." }] },
      number: { components: [{ type: "kpi_cards", items: [{ value: "62%", label: "Expansion share" }] }] },
      close: {},
    })
    const { ir, spec } = await readDeckDir(dir)
    const theme = getThemeDefinition("brief")
    for (const page of SPEC.pages) {
      const report = await inspectJson(dir, page.id)
      const { file: _file, ...fromCli } = report.page
      const whole = pageContract(ir, page.id, { theme, pageSpec: spec.pages.find((p) => p.id === page.id) })
      expect({ ...report, page: fromCli }, page.id).toEqual(JSON.parse(JSON.stringify(whole)))
    }
  })

  it("is not blocked by a broken page elsewhere in the deck", async () => {
    const dir = await deck({ growth: { components: [CHART] }, later: "{ not json" })
    await expect(runValidate(dir)).rejects.toThrow(/page "later".*not valid JSON/s)
    const report = await inspectJson(dir, "growth")
    expect(report.page.filled).toBe(true)
    expect(report.errors).toEqual([])
  })

  it("locates validate's own finding inside the page and exits non-zero", async () => {
    const dir = await deck({ number: { components: [CHART] } })
    await expect(runValidate(dir)).rejects.toThrow(/page 3 \(number\) — slides\.2\.components: layout "stat-hero" does not render chart components/)
    const { output, failed } = await runInspect(dir, { page: "number", json: true })
    expect(failed).toBe(true)
    expect(JSON.parse(output).errors).toEqual([
      { scope: "page", path: "components", message: 'layout "stat-hero" does not render chart components' },
    ])
  })

  it("reports an unwritten page as a placeholder with its full contract", async () => {
    const dir = await deck({})
    const { output, failed } = await runInspect(dir, { page: "later", json: true })
    expect(failed).toBe(false)
    const report = JSON.parse(output)
    expect(report.page.filled).toBe(false)
    expect(report.components.legal.length).toBeGreaterThan(0)
    expect(report.limits.length).toBeGreaterThan(0)
  })

  it("prints a readable summary without --json", async () => {
    const dir = await deck({ growth: { components: [CHART] } })
    const { output, failed } = await runInspect(dir, { page: "growth" })
    expect(failed).toBe(false)
    expect(output).toContain('page growth (2 of 5): content, kind "data", theme "brief"')
    expect(output).toContain("file: pages/growth.json")
    expect(output).toContain("recommended: chart (spec focus)")
    expect(output).toContain("advice (validate warns past these):\n  at most 3 components on the page (spacious pacing allows 3")
    expect(output).toContain("errors: none")
    expect(output).toContain("--component <type>")
    expect(output).toContain("--fit")
  })

  it("refuses a missing or unknown page, an unsafe page id, and a file target", async () => {
    const dir = await deck({})
    await expect(runInspect(dir, {})).rejects.toThrow(/--page <id>/)
    await expect(runInspect(dir, { page: "nope" })).rejects.toThrow(/no page "nope" in this deck\. Pages: open, growth, number, later, close/)
    await expect(runInspect(dir, { page: "../deck.spec" })).rejects.toThrow(/not a safe file name/)
    await expect(runInspect(join(dir, "deck.spec.json"), { page: "growth" })).rejects.toThrow(/deck project directory/)
  })
})

describe("runInspect --component", () => {
  it("expands one component for the page: its schema cut, its story, and the page's limits on it", async () => {
    const dir = await deck({})
    const { output, failed } = await runInspect(dir, { page: "growth", component: "chart", json: true })
    expect(failed).toBe(false)
    expect(output).not.toContain("\n")
    const expanded = JSON.parse(output)
    expect(expanded.page.id).toBe("growth")
    expect(expanded.component).toBe("chart")
    expect(expanded.fullBody).toBe(false)
    expect(expanded.schema).toEqual(componentJsonSchema("chart"))
    expect(expanded.story.name).toBeTruthy()
    expect(expanded.limits.map((limit: { measure: string }) => limit.measure)).toEqual(["series"])
  })

  it("prints the story and the schema without --json", async () => {
    const dir = await deck({})
    const { output } = await runInspect(dir, { page: "growth", component: "sankey" })
    expect(output).toContain("component sankey on page growth (2 of 5)")
    expect(output).toContain("full-body: yes, it must be the page's only component")
    expect(output).toContain("choose it: ")
    expect(output).toContain('"const": "sankey"')
  })

  it("refuses a component the page's face does not draw, and an unknown type", async () => {
    const dir = await deck({})
    await expect(runInspect(dir, { page: "number", component: "chart" })).rejects.toThrow(/page "number" does not draw chart\. It draws: /)
    await expect(runInspect(dir, { page: "number", component: "quote" })).rejects.toThrow(/unknown component type "quote"/)
  })
})

describe("runInspect --fit", () => {
  const LONG = "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明"
  const FIT_SPEC = {
    version: "1",
    narrative: { pacing: "spacious" },
    theme: "brief",
    filename: "fit-test",
    pages: [
      { id: "open", type: "cover", heading: "Quarterly review" },
      { id: "fits", type: "content", kind: "data", heading: "Revenue mix" },
      { id: "blocks", type: "content", kind: "points", heading: "Too much" },
      { id: "items", type: "content", kind: "points", heading: "Long list" },
      { id: "close", type: "ending", heading: "Decisions" },
    ],
  }
  const FIT_PAGES: Record<string, unknown> = {
    open: {},
    fits: { components: [CHART] },
    blocks: { components: Array.from({ length: 8 }, () => ({ type: "paragraph", text: LONG.repeat(3) })) },
    items: { components: [{ type: "bullets", items: Array.from({ length: 40 }, (_, i) => `要点 ${i}`) }] },
    close: {},
  }

  async function fitDeck(pages: Record<string, unknown>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "pptwise-inspect-fit-"))
    await writeFile(join(dir, "deck.spec.json"), JSON.stringify(FIT_SPEC))
    await mkdir(join(dir, "pages"))
    for (const [id, content] of Object.entries(pages)) await writeFile(join(dir, "pages", `${id}.json`), JSON.stringify(content))
    return dir
  }

  it("gives each page the verdict render's content-drop gate gives it (T8)", async () => {
    const dir = await fitDeck(FIT_PAGES)
    const refs: string[] = []
    for (const [number, page] of FIT_SPEC.pages.entries()) {
      const { output, failed } = await runInspect(dir, { page: page.id, fit: true, json: true })
      const report = JSON.parse(output)
      expect(report.fit.checked, page.id).toBe(true)
      expect(failed, page.id).toBe(!report.fit.fits)
      if (!report.fit.fits) {
        refs.push(`${page.id} (page ${number + 1}): ${report.fit.dropped.map((d: { what: string }) => d.what).join(", ")}`)
      }
    }
    expect(refs.map((ref) => ref.split(" ")[0])).toEqual(["blocks", "items"])
    await expect(runRender(dir, { output: join(dir, "out.pptx") })).rejects.toThrow(
      `deck drops content that does not fit the content area, on 2 pages — ${refs.join("; ")}. `,
    )
    // Validate keeps its structural boundary: the same deck passes it.
    await expect(runValidate(dir)).resolves.toMatch(/^OK/)
  })

  it("prints the verdict and what to do without --json", async () => {
    const dir = await fitDeck(FIT_PAGES)
    const blocks = await runInspect(dir, { page: "blocks", fit: true })
    expect(blocks.failed).toBe(true)
    expect(blocks.output).toMatch(/fit: does not fit, \d+ content blocks dropped/)
    expect(blocks.output).toContain("render refuses a deck that drops content")
    const fits = await runInspect(dir, { page: "fits", fit: true })
    expect(fits.failed).toBe(false)
    expect(fits.output).toContain("fit: fits, nothing dropped")
  })

  it("does not draw a page validate refuses, or a page not written yet", async () => {
    const dir = await fitDeck({ fits: { components: [{ type: "bullets", items: ["测".repeat(40)] }] } })
    const refused = await runInspect(dir, { page: "fits", fit: true, json: true })
    expect(refused.failed).toBe(true)
    const report = JSON.parse(refused.output)
    expect(report.errors.length).toBeGreaterThan(0)
    expect(report.fit).toEqual({ checked: false, reason: "fix the page's validate errors first" })
    const unwritten = await runInspect(dir, { page: "blocks", fit: true, json: true })
    expect(unwritten.failed).toBe(false)
    expect(JSON.parse(unwritten.output).fit).toEqual({ checked: false, reason: "the page is not written yet" })
  })

  it("takes --fit or --component, not both", async () => {
    const dir = await fitDeck(FIT_PAGES)
    await expect(runInspect(dir, { page: "fits", fit: true, component: "chart" })).rejects.toThrow(/--component or --fit, not both/)
  })
})
