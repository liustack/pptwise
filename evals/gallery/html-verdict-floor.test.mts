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
import { buildGalleryHtml, inlineRule } from "./html"
import { effectiveVerdict } from "./verdict"
import type { Manifest, ManifestPage } from "./render"

const STORE_KEY = "pptwise-gallery-verdicts-v1"

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><text x="96" y="150" font-size="44">丢了内容的一页</text></svg>`

function page(id: string, findings?: { code: string; message: string }[]): ManifestPage {
  return {
    id,
    section: "brief",
    sectionLabel: "brief",
    band: "component",
    subject: "bullets",
    component: "bullets",
    language: "zh",
    languageLabel: "中文",
    theme: "brief",
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

const LOSER = "brief--comp--dropped--zh"
const CLEAN = "brief--comp--clean--zh"
const CUT = "brief--comp--truncated--zh"

function manifest(): Manifest {
  const pages = [page(LOSER, DROPPED), page(CLEAN), page(CUT, TRUNCATED)]
  return {
    manifestVersion: 5,
    generator: "test",
    pptwiseVersion: "0.31.0",
    generatedAt: "2026-09-04T00:00:00Z",
    slide: { width: 1280, height: 720 },
    sections: [{ id: "brief", label: "brief", blurb: "", pages: pages.length }],
    bands: [{ id: "component", label: "组件皮肤", question: "" }],
    pages,
    stories: {},
  } as unknown as Manifest
}

/** Build the page, put its data blocks in the document, and run its script. */
function openShell(
  stored: Record<string, unknown>,
  transform: (script: string) => string = (x) => x,
): { run: () => void } {
  const m = manifest()
  const svgs = new Map(m.pages.map((p) => [p.id, SVG]))
  const html = buildGalleryHtml(m, svgs)
  const body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>"))
  document.body.innerHTML = body.slice(body.indexOf(">") + 1)
  localStorage.setItem(STORE_KEY, JSON.stringify(stored))
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((s) => s[1]!)
  const shell = transform(scripts[scripts.length - 1]!)
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

// The rule travels as source, and source can be renamed on the way.
describe("the embedded rule is bound to the name the page calls", () => {
  const embedded = (): string => {
    const m = manifest()
    const html = buildGalleryHtml(m, new Map(m.pages.map((p) => [p.id, SVG])))
    const match = /const effectiveVerdict = \(([\s\S]*?)\);\n/.exec(html)
    expect(match, "the shell no longer binds the rule to a name it controls").not.toBeNull()
    return match![1]!
  }

  it("carries a source that parses and answers exactly like the module export", () => {
    const copy = new Function(`return (${embedded()});`)() as typeof effectiveVerdict
    const cases: [string | null | undefined, string[]][] = [
      ["pass", ["content-dropped"]],
      ["limit", ["content-dropped"]],
      ["rework", ["content-dropped"]],
      ["pass", []],
      ["limit", ["content-truncated"]],
      [undefined, ["content-dropped"]],
      [null, []],
    ]
    for (const [verdict, codes] of cases) {
      expect(copy(verdict, codes), `${String(verdict)} / ${codes.join()}`).toEqual(
        effectiveVerdict(verdict, codes),
      )
    }
  })

  it("still runs when the embedded function has been renamed, as a minifier would", () => {
    // The reported failure, reproduced: esbuild with renaming turns the
    // declaration into `function $l(...)` while the call sites keep saying
    // `effectiveVerdict`. The binding is the page's, so the rename is
    // confined to the expression and the shell is unaffected.
    const rename = (script: string) =>
      script.replace("const effectiveVerdict = (function effectiveVerdict(", "const effectiveVerdict = (function $l(")
    const { run } = openShell({ [LOSER]: entry(LOSER, "pass") }, (script) => {
      const renamed = rename(script)
      expect(renamed, "the rename did not apply — check the embedded shape").not.toBe(script)
      return renamed
    })
    run()
    expect(storedVerdicts()[LOSER]!.verdict).toBe("rework")
    expect(document.getElementById("n-rework")!.textContent).toBe("1")
  })

  it("carries nothing that could break out of the page it is pasted into", () => {
    const source = embedded()
    expect(source).not.toContain("`")
    expect(source).not.toContain("${")
    expect(source).not.toContain("__name(")
    expect(source.toLowerCase()).not.toContain("</script")
    // eslint-disable-next-line no-control-regex
    expect(/[^\x00-\x7F]/.test(source)).toBe(false)
  })

  it("refuses to embed a rule that would break the page, at build time", () => {
    // Built with `new Function` so the bundler that compiles this file
    // cannot sand the hazard off first: esbuild escapes `</script` inside a
    // string literal, which is a good habit and would have made the case
    // untestable through ordinary source.
    const hazards: [string, string][] = [
      ["a backtick", "return `x`"],
      ["a template placeholder", 'return "${x}"'],
      ["a script close", 'return "</script>"'],
      // Composed at runtime so the character reaches the function's own
      // source, rather than an escape sequence that is pure ASCII.
      ["non-ASCII", 'return "' + String.fromCharCode(0x4e22) + '"'],
    ]
    for (const [why, body] of hazards) {
      const fn = new Function(body) as (...args: never[]) => unknown
      expect(() => inlineRule("rule", fn), why).toThrow(/cannot embed rule/)
    }
    // A keepNames wrapper is the other way an embedded rule arrives broken.
    // That one is stripped rather than refused, which is the whole reason
    // this helper existed before the binding was added.
    const wrapped = { toString: () => 'function rule(a) { return a } __name(rule, "rule");' }
    const embeddedWrapped = inlineRule("rule", wrapped as unknown as (...args: never[]) => unknown)
    expect(embeddedWrapped).not.toContain("__name(")
    expect(embeddedWrapped).toContain("const rule = (")
    // And the shape it does accept stays accepted.
    expect(inlineRule("rule", ((a: number) => a) as unknown as (...args: never[]) => unknown)).toContain(
      "const rule = (",
    )
  })
})
