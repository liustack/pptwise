// @vitest-environment node
//
// A face that steps aside hands the page to the shared sheet, and the page's
// own fields go with it or the face keeps the page.
//
// The sheet used to draw the heading, the subheading, the components and the
// source line, and nothing else. A face that declares a place for a kicker, a
// page tag, a stamp, a ballot, a strip of years or a course stage
// (`LayoutDefinition.pageFields`) passes validate with that field, and when
// its body came up short the sheet drew the page without it: no validate
// error, no `data-dropped`, nothing in the audit. The sheet now draws the
// kicker over the heading and the tag beside it, and on a page carrying any
// field it has no place for it declines, so the face keeps the page and the
// body's own decline stays declared (`stepAside`, `stepAsideForCut`).
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { getLayout } from "../layouts/registry"
import { THEME_DEFINITIONS } from "../themes/definitions"
import { parseSvgRoot } from "./serialize"

beforeAll(() => {
  installNodePlatform()
})

const SENTENCE = "The second plant pays back in four years if the cheaper financing holds. "

/**
 * A body that grows with `step`, of a type the face's body slot draws: one
 * bullet row per step up to 22, then a line chart that gains a label row per
 * series. A face that takes only a paragraph or a quote gets one that gains a
 * sentence per step.
 */
function body(step: number, accepts: readonly string[]) {
  if (accepts.includes("bullets") && step <= 22) return [{ type: "bullets", items: Array.from({ length: step }, (_, i) => `Quarterly operations review, volume ${i + 1}`) }]
  if (accepts.includes("chart")) {
    return [
      {
        type: "chart",
        chart_type: "line",
        axes: { x_title: "Quarter", y_title: "Seats" },
        series: Array.from({ length: Math.max(1, step - 22) }, (_, i) => ({
          name: `Series ${i}`,
          data: [
            { x: "Q1", y: 10 + i },
            { x: "Q2", y: 20 + i },
          ],
        })),
      },
    ]
  }
  if (accepts.includes("blockquote")) return [{ type: "blockquote", text: SENTENCE.repeat(step).trim(), attribution: "Chair" }]
  if (accepts.includes("paragraph")) return [{ type: "paragraph", text: SENTENCE.repeat(step).trim() }]
  throw new Error(`no growing body for a slot that accepts ${accepts.join(", ")}`)
}

const BULLETS_AND_CHART = ["bullets", "chart"] as const

/** Whether the page shows `words`: its text read in order, the way a tracked label paints one glyph at a time. */
function shows(markup: string, words: string): boolean {
  const squash = (text: string) => text.replace(/\s+/gu, "").toLowerCase()
  return squash(parseSvgRoot(markup).textContent ?? "").includes(squash(words))
}

/** How many times the page shows `words`. */
function times(markup: string, words: string): number {
  const squash = (text: string) => text.replace(/\s+/gu, "").toLowerCase()
  return squash(parseSvgRoot(markup).textContent ?? "").split(squash(words)).length - 1
}

/** Each face page field, filled with words that cannot turn up anywhere else on the page. */
const FIELD_VALUES: Record<string, { value: unknown; words: string }> = {
  kicker: { value: "Gallery Kicker", words: "Gallery Kicker" },
  tag: { value: { text: "Trial Tag" }, words: "Trial Tag" },
  stamp: { value: { text: "Approved" }, words: "Approved" },
  ballot: { value: { choices: ["Yea", "Nay"] }, words: "Yea" },
  stage: { value: "Unit B", words: "Unit B" },
  years: { value: { from: 2026, to: 2030, marked: [2027] }, words: "2027" },
}

const COURSE = { stages: [{ label: "Unit A" }, { label: "Unit B" }] }

function deck(theme: string, kind: string, page: Record<string, unknown>): PptxIR {
  const v = validateIr({
    version: "5",
    filename: "fields",
    theme: { id: theme },
    ...("stage" in page ? { course: COURSE } : {}),
    slides: [{ type: "content", kind, heading: "Heading words", subheading: "Standfirst words", ...page }],
  })
  expect(v.errors).toEqual([])
  return v.ir!
}

/** Every content face a built-in theme offers that declares a place for a page field, once, with the theme and kind that reach it. */
function facesWithPageFields(): { face: string; theme: string; kind: string; fields: string[]; accepts: readonly string[] }[] {
  const out = new Map<string, { face: string; theme: string; kind: string; fields: string[]; accepts: readonly string[] }>()
  for (const [theme, def] of Object.entries(THEME_DEFINITIONS)) {
    for (const [kind, entry] of Object.entries(def.menu.content)) {
      const face = (entry as { face: string }).face
      const layout = getLayout(face)
      const fields = (layout?.pageFields ?? []).filter((field) => field !== "footnote")
      const slot = layout?.slots.find((candidate) => candidate.name === "body")?.accepts ?? []
      const accepts = slot === "any" ? BULLETS_AND_CHART : slot
      if (fields.length > 0 && !out.has(face)) out.set(face, { face, theme, kind, fields, accepts })
    }
  }
  return [...out.values()]
}

const DROPPED = /data-dropped="[1-9]/

describe("a page's own fields on a page whose face came up short", () => {
  const faces = facesWithPageFields()

  it("finds the faces to hold to it", () => {
    expect(faces.length).toBeGreaterThan(15)
  })

  for (const { face, theme, kind, fields, accepts } of faces) {
    it(`${face} never loses ${fields.join(", ")} without saying so`, () => {
      const page = Object.fromEntries(fields.map((field) => [field, FIELD_VALUES[field]!.value]))
      for (let step = 2; step <= 40; step++) {
        const markup = renderSlideSvg(deck(theme, kind, { ...page, components: body(step, accepts) }), 0)
        if (DROPPED.test(markup)) continue
        for (const field of fields) {
          expect(shows(markup, FIELD_VALUES[field]!.words), `${face} at step ${step}${markup.includes("data-face-stepped-aside") ? " (stepped aside)" : ""} lost its ${field}`).toBe(true)
        }
      }
    })
  }
})

describe("the step-aside sheet", () => {
  // clinic's sheet holds the page's tag and its section (`dossier-sheet`).
  const dossier = (step: number) => deck("clinic", "points", { kicker: "Gallery Kicker", tag: { text: "Trial Tag" }, components: body(step, BULLETS_AND_CHART) })

  it("draws the kicker over the heading and the tag beside it, once each", () => {
    const markup = renderSlideSvg(dossier(10), 0)
    expect(markup).toContain('data-face-stepped-aside="dossier-sheet"')
    expect(markup).not.toMatch(DROPPED)
    expect(times(markup, "Gallery Kicker")).toBe(1)
    expect(times(markup, "Trial Tag")).toBe(1)
    const root = parseSvgRoot(markup)
    const sheet = root.querySelector("[data-face-stepped-aside]")!
    const y = (words: string) => Number(Array.from(sheet.querySelectorAll("text")).find((t) => t.textContent === words)!.getAttribute("y"))
    expect(y("Gallery Kicker")).toBeLessThan(y("Heading words"))
    expect(y("Trial Tag")).toBe(y("Gallery Kicker"))
  })

  it("leaves the kicker to a motif that sets it in its own running head", () => {
    // museum's hall sign is the page's kicker (`motif-museum-motif.tsx`).
    for (let step = 2; step <= 40; step++) {
      const markup = renderSlideSvg(deck("museum", "points", { kicker: "Gallery Kicker", components: body(step, BULLETS_AND_CHART) }), 0)
      if (!markup.includes("data-face-stepped-aside")) continue
      expect(times(markup, "Gallery Kicker")).toBe(1)
      expect(markup).toContain('data-placard-hall-sign="Gallery Kicker"')
      return
    }
    throw new Error("museum's sheet never stepped aside")
  })

  it("is not taken by a page carrying a field it has no place for, so the face's own decline is declared", () => {
    // ember's pitch sheet draws the course; at this length its band drops bullets.
    const markup = renderSlideSvg(deck("ember", "points", { stage: "Unit B", components: body(10, BULLETS_AND_CHART) }), 0)
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(markup).toMatch(DROPPED)
  })
})
