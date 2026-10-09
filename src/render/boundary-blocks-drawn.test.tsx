// @vitest-environment node
//
// A cover, chapter or ending page validate passes is one its face draws
// with nothing left off. Four face-and-block pairings used to pass validate
// and be left off at every length the gallery corpus writes: binder-ending
// with a paragraph (its button ran off the page), close-word-ending and
// console-ending with bullets of sentences (each sets an item as a
// one-line label), and yearbook-cover with a timeline dated by quarter (it
// lays a scale of years). Every registered boundary face is swept here with
// each block its slots accept, at every length, full and bare.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { componentJsonSchema } from "@/ir/json-schema"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutFaceSlot, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"
import { droppedIn } from "./render-slide"
import { parseSvgRoot } from "./serialize"

/** `block` with only the properties its schema requires, on the block and on each item of its lists. */
function plainBlock(type: string, block: Record<string, unknown>): Record<string, unknown> {
  const schema = componentJsonSchema(type) as { required?: string[]; properties?: Record<string, { items?: { required?: string[] } }> }
  const required = new Set(schema.required ?? [])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(block)) {
    if (!required.has(key)) continue
    const itemRequired = schema.properties?.[key]?.items?.required
    out[key] =
      Array.isArray(value) && itemRequired !== undefined
        ? value.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).filter(([field]) => itemRequired.includes(field))))
        : value
  }
  return out
}

const dropped = (ir: PptxIR) => droppedIn(parseSvgRoot(renderSlideSvg(ir, 0))).dropped

const assets = {} as Record<LanguageId, CorpusAssets>
beforeAll(async () => {
  installNodePlatform()
  for (const id of Object.keys(LEXICONS) as LanguageId[]) assets[id] = await corpusAssets(LEXICONS[id])
})

const homes = new Map<string, string>()
for (const theme of CANONICAL_THEME_IDS) for (const [slot, face] of Object.entries(menuFaces(theme))) if (!homes.has(face) && ["cover", "chapter", "ending"].includes(slot)) homes.set(face, theme)
const FACES = Object.keys(LAYOUT_REGISTRY)
  .sort()
  .filter((id) => ["cover", "chapter", "ending"].includes(layoutFaceSlot(id)))

describe("a boundary page validate passes is one its face draws whole", () => {
  it.each(FACES)("%s", (face) => {
    const theme = homes.get(face) ?? "brief"
    const lex = homes.has(face) ? nativeLexiconFor(theme) : LEXICONS.zh
    const base = layoutPage(face, lex, assets[lex.id], theme, undefined)
    const page = base.slides[0]!
    const lost: string[] = []
    for (const slot of LAYOUT_REGISTRY[face]!.slots) {
      if (slot.accepts === "any" || slot.accepts.length === 0) continue
      const others = page.components.filter((c) => !(slot.accepts as readonly string[]).includes(c.type))
      for (const type of slot.accepts) {
        const full = COMPONENT_BUILDERS[type]?.(lex) as unknown as Record<string, unknown> | undefined
        if (!full) continue
        for (const block of [full, plainBlock(type, full)]) {
          const key = ["items", "milestones"].find((k) => Array.isArray(block[k]))
          const n = key ? (block[key] as unknown[]).length : 1
          for (let i = 1; i <= n; i++) {
            const component = (key ? { ...block, [key]: (block[key] as unknown[]).slice(0, i) } : block) as unknown as Slide["components"][number]
            const result = validateIr({ ...base, slides: [{ ...page, components: [...others, component] }] })
            if (result.ok && dropped(result.ir!) > 0) lost.push(`${type} of ${i}${block === full ? "" : ", bare"}`)
          }
        }
      }
    }
    expect(lost).toEqual([])
  })
})

describe("the four pairings validate now refuses, and why", () => {
  const deck = (theme: string, slide: Record<string, unknown>): PptxIR =>
    ({ version: "5", filename: "pairings.pptx", theme: { id: theme }, meta: {}, assets: { images: {} }, slides: [slide] }) as PptxIR

  it("binder-ending declares a button too long for its pill, and validate quotes the words it holds", () => {
    const words = "请在本周五之前回复我们是否同意分两期实施并确认第一期的范围、预算与上线时间，以便我们安排现场踏勘与项目启动会，同时请指定贵方的项目对接人和验收负责人"
    const ir = deck("proposal", { type: "ending", heading: "请您定三件事", components: [{ type: "paragraph", text: words }] })
    expect(getThemeDefinition("proposal").menu.ending.face).toBe("binder-ending")
    // Drawn as written, the pill no longer runs off the page unsaid.
    const markup = renderSlideSvg(ir, 0)
    expect(markup).toContain('data-dropped="1" data-dropped-kind="label"')
    const result = validateIr(ir)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.path).toBe("slides.0.components.0.text")
    expect(result.errors[0]!.message).toMatch(new RegExp(`^face "binder-ending" holds the first \\d+ \\("请在本周五之前[^"]*"\\) of the ${Array.from(words).length} characters in the text of this page's paragraph, so the face would leave the block off the page\\.`))
    expect(validateIr(deck("proposal", { type: "ending", heading: "请您定三件事", components: [{ type: "paragraph", text: "约踏勘时间" }] })).ok).toBe(true)
  })

  for (const [theme, face] of [
    ["ledger", "close-word-ending"],
    ["terminal", "console-ending"],
  ] as const) {
    it(`${face} refuses a bullet longer than the label it sets it as, quoting the part it holds`, () => {
      expect(getThemeDefinition(theme).menu.ending.face).toBe(face)
      const ir = deck(theme, { type: "ending", heading: "下半年重点", components: [{ type: "bullets", items: ["续约率回到九成一，六个季度最高", "开通周期九周压到五周"] }] })
      const result = validateIr(ir)
      expect(result.errors.map((e) => e.path)).toEqual(["slides.0.components.0.items.0"])
      expect(result.errors[0]!.message).toMatch(new RegExp(`^face "${face}" holds the first \\d+ \\("续约率[^"]*"\\) of the 15 characters in item 1 of this page's bullets`))
    })
  }

  it("yearbook-cover refuses a timeline that is not dated by year, and draws one that is", () => {
    const milestones = (dates: string[]) => dates.map((date, i) => ({ date, title: ["免费配额 30%", "免费配额 20%", "免费配额 10%"][i]! }))
    const cover = (dates: string[]) => deck("almanac", { type: "cover", heading: "排放年鉴", components: [{ type: "timeline", milestones: milestones(dates) }] })
    expect(getThemeDefinition("almanac").menu.cover.face).toBe("yearbook-cover")
    expect(validateIr(cover(["第一季度", "第二季度", "第三季度"])).errors).toEqual([
      {
        path: "slides.0.components",
        page: 1,
        message:
          'face "yearbook-cover" cannot draw this cover page\'s "timeline" block as written: the cover lays a timeline as a scale of years, so every milestone\'s date has to be a year, such as "2024". Rewrite it that way, or move it to a content slide.',
      },
    ])
    const years = validateIr(cover(["2024", "2026", "2030"]))
    expect(years.ok).toBe(true)
    expect(dropped(years.ir!)).toBe(0)
  })
})
