// @vitest-environment jsdom
//
// The review shell grades pages too, and it used to grade them by a
// different rule.
//
// `mergeVerdict` holds a floor: a page whose findings say it dropped content
// is at least `rework`, because nothing on the slide shows the loss and no
// amount of looking at it can. The shell kept its own verdicts in
// `localStorage` and asked nobody: a reviewer could click 通过 on the very
// page `evals:gallery` calls `rework`, and export it that way, findings and
// all, in the same JSON.
//
// So the rule is one function now (`effectiveVerdict`, `verdict.ts`) and the
// page carries its source. This file runs the real shell — the same script
// the built HTML ships — against a page that dropped content, and checks the
// four places a verdict is read: what load does with a stored value, what the
// buttons offer, what the tally counts, and what the export writes.

import { describe, expect, it, beforeEach } from "vitest"
import { buildGalleryHtml } from "./html"
import type { Manifest, ManifestPage } from "./render"

const STORE_KEY = "pptwise-gallery-verdicts-v1"

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><text x="96" y="150" font-size="44">丢了内容的一页</text></svg>`

function page(id: string, findings?: { code: string; message: string }[]): ManifestPage {
  return {
    id,
    section: "consulting",
    sectionLabel: "consulting",
    band: "component",
    subject: "bullets",
    component: "bullets",
    language: "zh",
    languageLabel: "中文",
    theme: "consulting",
    page: 1,
    pageCount: 1,
    slideType: "content",
    heading: "丢了内容的一页",
    file: `${id}.svg`,
    width: 1280,
    height: 720,
    hash: `hash-${id}`,
    fingerprint: { geometry: `geo-${id}`, color: `col-${id}` },
    ...(findings ? { findings } : {}),
  } as unknown as ManifestPage
}

const DROPPED = [{ code: "content-dropped", message: "1 item is missing from the rendered slide" }]
const TRUNCATED = [{ code: "content-truncated", message: "text was truncated to fit" }]

const LOSER = "consulting--comp--dropped--zh"
const CLEAN = "consulting--comp--clean--zh"
const CUT = "consulting--comp--truncated--zh"

function manifest(): Manifest {
  const pages = [page(LOSER, DROPPED), page(CLEAN), page(CUT, TRUNCATED)]
  return {
    manifestVersion: 4,
    generator: "test",
    pptwiseVersion: "0.31.0",
    generatedAt: "2026-09-04T00:00:00Z",
    slide: { width: 1280, height: 720 },
    sections: [{ id: "consulting", label: "consulting", blurb: "", pages: pages.length }],
    bands: [{ id: "component", label: "组件皮肤", question: "" }],
    pages,
  } as unknown as Manifest
}

/** Build the page, put its data blocks in the document, and run its script. */
function openShell(stored: Record<string, unknown>): { run: () => void } {
  const m = manifest()
  const svgs = new Map(m.pages.map((p) => [p.id, SVG]))
  const html = buildGalleryHtml(m, svgs)
  const body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>"))
  document.body.innerHTML = body.slice(body.indexOf(">") + 1)
  localStorage.setItem(STORE_KEY, JSON.stringify(stored))
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((s) => s[1]!)
  const shell = scripts[scripts.length - 1]!
  return { run: () => new Function(shell)() }
}

/** A verdict entry as the shell writes one: value plus page fingerprints. */
const entry = (id: string, verdict: string) => ({
  verdict,
  hash: `hash-${id}`,
  geo: `geo-${id}`,
  col: `col-${id}`,
})

function storedVerdicts(): Record<string, { verdict?: string }> {
  return JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
}

describe("the review shell holds the same floor as the automated merge", () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ""
    // The shell lazy-loads page images through an observer every browser has
    // and jsdom does not. Nothing here depends on what it reports.
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  })

  it("normalizes a stored pass on a page that dropped content, and writes it back", () => {
    const { run } = openShell({ [LOSER]: entry(LOSER, "pass") })
    run()
    expect(storedVerdicts()[LOSER]!.verdict).toBe("rework")
  })

  it("normalizes a stored limit the same way", () => {
    const { run } = openShell({ [LOSER]: entry(LOSER, "limit") })
    run()
    expect(storedVerdicts()[LOSER]!.verdict).toBe("rework")
  })

  it("leaves every other stored verdict alone", () => {
    const { run } = openShell({
      [CLEAN]: entry(CLEAN, "pass"),
      [CUT]: entry(CUT, "limit"),
      [LOSER]: entry(LOSER, "rework"),
    })
    run()
    const after = storedVerdicts()
    expect(after[CLEAN]!.verdict).toBe("pass")
    // A cut string is on the page and a reviewer can judge it.
    expect(after[CUT]!.verdict).toBe("limit")
    expect(after[LOSER]!.verdict).toBe("rework")
  })

  it("offers no pass or limit button on a page that dropped content", () => {
    const { run } = openShell({})
    run()
    const card = document.querySelector(`.card[data-id="${LOSER}"]`)!
    const buttons = [...card.querySelectorAll(".verdicts button")] as HTMLButtonElement[]
    const state = Object.fromEntries(buttons.map((b) => [b.dataset.verdict, b.disabled]))
    expect(state).toEqual({ pass: true, limit: true, rework: false })
    expect(buttons.find((b) => b.dataset.verdict === "pass")!.title).toContain("rework")
  })

  it("coerces a click that arrives anyway, so a keyboard path cannot slip past", () => {
    const { run } = openShell({})
    run()
    const card = document.querySelector(`.card[data-id="${LOSER}"]`)!
    const pass = [...card.querySelectorAll(".verdicts button")].find(
      (b) => (b as HTMLButtonElement).dataset.verdict === "pass",
    ) as HTMLButtonElement
    pass.disabled = false
    pass.click()
    expect(storedVerdicts()[LOSER]!.verdict).toBe("rework")
  })

  it("counts a stored pass on a dropping page as rework in the tally", () => {
    const { run } = openShell({ [LOSER]: entry(LOSER, "pass"), [CLEAN]: entry(CLEAN, "pass") })
    run()
    expect(document.getElementById("n-pass")!.textContent).toBe("1")
    expect(document.getElementById("n-rework")!.textContent).toBe("1")
  })

  it("exports the effective verdict, never the stored one", async () => {
    const { run } = openShell({ [LOSER]: entry(LOSER, "pass"), [CLEAN]: entry(CLEAN, "pass") })
    run()
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => void (copied = text) },
    })
    document.getElementById("export")!.dispatchEvent(new Event("click"))
    await new Promise((r) => setTimeout(r, 0))
    const payload = JSON.parse(copied) as { verdicts: { id: string; verdict: string; findings: string[] }[] }
    const loser = payload.verdicts.find((v) => v.id === LOSER)!
    // The contradiction this test exists for: a `pass` shipped in the same
    // object as the finding that makes it impossible.
    expect(loser.verdict).toBe("rework")
    expect(loser.findings).toContain("content-dropped")
    expect(payload.verdicts.find((v) => v.id === CLEAN)!.verdict).toBe("pass")
  })
})
