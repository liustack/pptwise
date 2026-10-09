// @vitest-environment node
//
// Every word an author writes into a page's own fields reaches the page, or
// the engine says it did not.
//
// AGENTS.md gives a face two postures toward what an author wrote: draw it
// whole, or decline and leave a mark a machine can find (a validate error,
// `data-truncated`, `data-dropped`). Components have their own gates. A
// page's own fields did not: `manuscript-cover` drew no subheading at all,
// with no mark, and validate and audit both passed the page.
//
// So this sweep fills every page field the IR schema offers, each with words
// found nowhere else, on every registered face, and holds
// each field to one of three outcomes: its words are on the page, validate
// refuses the field on this page, or the page carries a mark that the field
// itself put there. Words that are simply gone fail.
//
// Every registered face, not every face on a built-in menu. A theme file may
// put any face on its menu, so a face no built-in serves is one theme file
// away from a customer's deck. Each built-in theme's own menu is swept with
// its own content, and every other face is swept on a copy of that theme
// with the face swapped into its slot, the way a theme file copied from it
// would pick it up.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PageKind, PptxIR, Slide } from "@/ir"
import { componentJsonSchema, irJsonSchema } from "@/ir/json-schema"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from "@/themes"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutFaceSlot, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"
import { isDropKind } from "./drop-marker"
import { parseSvgRoot } from "./serialize"

beforeAll(() => {
  installNodePlatform()
})

/** One piece of an authored field: the words it carries and how to find them. */
interface Probe {
  /** The field the words belong to, as the IR names it. */
  field: string
  /** Which part of the field, for a field that carries several (`fields[].note`). */
  part: string
  words: string
}

/** A field's value, in the page's own language, and the words to look for. */
interface Sample {
  value: unknown
  probes: { part: string; words: string }[]
  /** Deck-level fields the page field needs to mean anything (`stage` needs a `course`). */
  deck?: Record<string, unknown>
}

type Words = Record<"heading" | "subheading" | "kicker" | "label" | "value" | "note" | "stamp" | "date" | "tag" | "yes" | "no" | "sign" | "stageA" | "stageB" | "corner" | "footnote", string>

const ZH: Words = {
  heading: "鹦鹉螺题目",
  subheading: "琥珀副题",
  kicker: "珊瑚眉题",
  label: "鲸鱼",
  value: "海豚之值",
  note: "海獭注",
  stamp: "麒麟",
  date: "鸵鸟日",
  tag: "云雀标签",
  yes: "赞成鹤",
  no: "反对鹳",
  sign: "鹈鹕签字",
  stageA: "环节鹭",
  stageB: "环节鸥",
  corner: "鸳鸯角标",
  footnote: "松柏来源",
}

const EN: Words = {
  heading: "Nautilus Heading",
  subheading: "Amberline Standfirst",
  kicker: "Coralwick Kicker",
  label: "Walrus",
  value: "Dolphinade Value",
  note: "Otterly Note",
  stamp: "Qilin",
  date: "Ostrich Day",
  tag: "Larkspur Tag",
  yes: "Craneyes",
  no: "Storknay",
  sign: "Pelican Sign",
  stageA: "Heron Part",
  stageB: "Gull Part",
  corner: "Mandarin",
  footnote: "Cypress Source",
}

/**
 * Every slide property the IR schema offers, answered once: the words it
 * puts on a page, or why it puts none. A property added to the schema has
 * no answer here and fails the sweep until it gets one.
 */
const NOT_WORDS_ON_THE_PAGE: Record<string, string> = {
  type: "the page type, which picks the menu entry",
  kind: "the content kind, which picks the menu entry",
  id: "the page's stable id",
  placeholder: "assemble's mark on a page not yet filled",
  components: "held to their slots by validate's component gates",
  background: "a picture or a colour, no words",
  image_side: "which side a picture sits on",
  notes: "speaker notes, exported as PowerPoint notes and never painted",
}

function samples(w: Words): Record<string, Sample> {
  return {
    heading: { value: w.heading, probes: [{ part: "", words: w.heading }] },
    subheading: { value: w.subheading, probes: [{ part: "", words: w.subheading }] },
    kicker: { value: w.kicker, probes: [{ part: "", words: w.kicker }] },
    fields: {
      value: [{ label: w.label, value: w.value, note: w.note }],
      probes: [
        { part: "label", words: w.label },
        { part: "value", words: w.value },
        { part: "note", words: w.note },
      ],
    },
    stamp: {
      value: { text: w.stamp, date: w.date },
      probes: [
        { part: "text", words: w.stamp },
        { part: "date", words: w.date },
      ],
    },
    ballot: {
      value: { choices: [w.yes, w.no], signature: w.sign },
      probes: [
        { part: "choices", words: w.yes },
        { part: "choices", words: w.no },
        { part: "signature", words: w.sign },
      ],
    },
    tag: { value: { text: w.tag }, probes: [{ part: "text", words: w.tag }] },
    years: { value: { from: 2040, to: 2044, marked: [2042] }, probes: [{ part: "marked", words: "2042" }] },
    stage: {
      value: w.stageB,
      probes: [{ part: "", words: w.stageB }],
      deck: { course: { stages: [{ label: w.stageA }, { label: w.stageB }] } },
    },
    decor: { value: { kind: "corner_tag", text: w.corner }, probes: [{ part: "text", words: w.corner }] },
    footnote: { value: w.footnote, probes: [{ part: "", words: w.footnote }] },
  }
}

/** The slide properties the schema offers on a page of `type`. */
function schemaFields(type: Slide["type"]): string[] {
  const full = irJsonSchema() as { properties: { slides: { items: { oneOf: { properties: Record<string, { const?: string }> }[] } } } }
  const variant = full.properties.slides.items.oneOf.find((option) => option.properties.type?.const === type)
  if (variant === undefined) throw new Error(`IR schema has no slide variant for "${type}"`)
  return Object.keys(variant.properties)
}

const squash = (text: string) => text.replace(/\s+/gu, "").toLowerCase()

/** The page's words, read in order, the way a tracked label paints one glyph at a time. */
function pageText(markup: string): string {
  return squash(parseSvgRoot(markup).textContent ?? "")
}

/** How many declared losses the page carries: each `data-dropped` element and each `data-truncated` one. */
function marks(markup: string): number {
  const root = parseSvgRoot(markup)
  let n = 0
  for (const el of Array.from(root.querySelectorAll("[data-dropped]"))) if (Number(el.getAttribute("data-dropped")) > 0) n++
  for (const el of Array.from(root.querySelectorAll("[data-truncated]"))) {
    const v = el.getAttribute("data-truncated")
    if (v !== null && v !== "" && v !== "0" && v !== "false") n++
  }
  return n
}

/** How many `data-dropped` elements the page carries: what its face declined. */
function drops(markup: string): number {
  return Array.from(parseSvgRoot(markup).querySelectorAll("[data-dropped]")).filter((el) => Number(el.getAttribute("data-dropped")) > 0).length
}

/** A refusal validate gave this field on page 1. */
function refusesField(errors: readonly { path: string; message: string }[], field: string): boolean {
  const named = new RegExp(`\\b${field}\\b`, "u")
  return errors.some((e) => e.path === `slides.0.${field}` || e.path.startsWith(`slides.0.${field}.`) || (e.path === "slides.0" && named.test(e.message)))
}

interface Route {
  theme: string
  slot: string
  face: string
  /** The face is on this theme's own menu, and the page is written in the theme's own words. */
  own: boolean
}

/**
 * Every registered face on every built-in theme. A theme's own menu, slot by
 * slot: a face that dispatches by content is reached once per kind that
 * names it. Then every face that menu does not offer, swapped into the slot
 * a built-in menu first gives it, or the one the gallery files it under when
 * no menu does (`layoutFaceSlot`).
 */
function routes(): Route[] {
  const out: Route[] = []
  for (const theme of CANONICAL_THEME_IDS) for (const [slot, face] of Object.entries(menuFaces(theme))) out.push({ theme, slot, face, own: true })
  const firstSlot = new Map<string, string>()
  for (const route of out) if (!firstSlot.has(route.face)) firstSlot.set(route.face, route.slot)
  for (const theme of CANONICAL_THEME_IDS) {
    const own = new Set(Object.values(menuFaces(theme)))
    for (const face of Object.keys(LAYOUT_REGISTRY).sort()) {
      if (!own.has(face)) out.push({ theme, slot: firstSlot.get(face) ?? layoutFaceSlot(face), face, own: false })
    }
  }
  return out
}

/** A loss nothing declared: the theme, the slot, the face, the field and the words that went missing. */
interface Silent {
  route: Route
  /** The block the page carried besides its gallery body, when the loss was found with one (`companions`). */
  beside?: string
  probe: Probe
}

/**
 * Every unit the sweep's pages declared a drop in. A page here carries
 * every field at once, so the faces that cannot set one of them declare it,
 * and each unit they name has to be one the drop table names
 * (`drop-marker.tsx`): an unnamed one used to reach authors as content
 * blocks.
 */
const DROP_KINDS_SEEN = new Set<string>()

/** Validate a deck whose page 1 is `slide`, with `deck` merged in. */
function validated(base: PptxIR, slide: Record<string, unknown>, deck: Record<string, unknown>) {
  return validateIr({ ...base, ...deck, slides: [slide] })
}

/**
 * `block` with only the properties its schema requires, on the block and on
 * each item of its lists: the plainest block of its type, for a face that
 * takes a block's bare shape and declines the corpus's fuller one.
 */
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

/** The list a block carries, by the name its schema gives it. */
function listOf(component: Record<string, unknown>): { key: string; list: unknown[] } | undefined {
  for (const key of ["items", "milestones"]) if (Array.isArray(component[key])) return { key, list: component[key] as unknown[] }
  return undefined
}

/**
 * The gallery page of a cover, chapter or ending face, once more for each
 * body slot the gallery page leaves empty, with a block that slot accepts.
 *
 * A boundary face's gallery page is its plainest page, and on many of them
 * that is a page with no block at all. A face that reads a field one way
 * when the page is bare and another way when a block is there was only ever
 * swept bare: four ending faces set the heading as their list when a page
 * had no bullets and drew no heading at all when it had some, and the sweep
 * never wrote that page. So each empty slot gets the corpus's own block of
 * each type it accepts, one at a time, holding as few items as the face
 * draws whole on this page, the corpus's own items first and then their
 * bare required shape, and the fields are swept again with it there. A
 * block validate refuses, or the face declines, at every length and shape
 * is not a page an author can ship.
 */
function companions(route: Route, base: PptxIR): { beside: string; slide: Record<string, unknown> }[] {
  const page = base.slides[0] as unknown as Record<string, unknown>
  if (!["cover", "chapter", "ending"].includes(page.type as string)) return []
  const lex = route.own ? nativeLexiconFor(route.theme) : LEXICONS.zh
  const carried = (page.components as { type: string }[]) ?? []
  const bare = validated(base, page, {})
  const bareDrops = bare.errors.length === 0 ? drops(renderSlideSvg(bare.ir!, 0)) : 0
  const out: { beside: string; slide: Record<string, unknown> }[] = []
  for (const slot of LAYOUT_REGISTRY[route.face]!.slots) {
    if (slot.accepts === "any" || slot.accepts.length === 0) continue
    if (carried.some((component) => slot.accepts.includes(component.type))) continue
    for (const type of slot.accepts) {
      const full = COMPONENT_BUILDERS[type]!(lex) as unknown as Record<string, unknown>
      const found = [full, plainBlock(type, full)]
        .flatMap((built) => {
          const list = listOf(built)
          return Array.from({ length: list?.list.length ?? 1 }, (_, i) => (list ? { ...built, [list.key]: list.list.slice(0, i + 1) } : built))
        })
        .map((block) => ({ ...page, components: [...carried, block] }))
        .find((slide) => {
          const result = validated(base, slide, {})
          return result.errors.length === 0 && drops(renderSlideSvg(result.ir!, 0)) <= bareDrops
        })
      if (found) out.push({ beside: type, slide: found })
    }
  }
  return out
}

/**
 * The silent losses on one route: the face's own gallery page, and each of
 * its `companions`, every schema field filled, refused fields taken off,
 * rendered once with all of them and once without each one that went
 * missing.
 */
function sweep(route: Route, assets: Record<LanguageId, CorpusAssets>): Silent[] {
  const lex = route.own ? nativeLexiconFor(route.theme) : LEXICONS.zh
  const kind = ["cover", "chapter", "ending"].includes(route.slot) ? undefined : (route.slot as PageKind)
  const base = layoutPage(route.face, lex, assets[lex.id], route.theme, kind)
  return [
    ...sweepPage(route, base, base.slides[0] as unknown as Record<string, unknown>),
    ...companions(route, base).flatMap(({ beside, slide }) => sweepPage(route, base, slide).map((silent) => ({ ...silent, beside }))),
  ]
}

/** The silent losses on one page of `route`, its fields filled over `page`. */
function sweepPage(route: Route, base: PptxIR, page: Record<string, unknown>): Silent[] {
  // A swapped-in face gets the shared lexicon its gallery page is built
  // from: the corpus sizes some faces' bodies to it (six captions for
  // show-gallery's six frames), and the fields under test are the same
  // words either way.
  const lex = route.own ? nativeLexiconFor(route.theme) : LEXICONS.zh
  const all = samples(lex.id === "en" ? EN : ZH)
  const offered = schemaFields(page.type as Slide["type"])
  const unanswered = offered.filter((field) => !(field in all) && !(field in NOT_WORDS_ON_THE_PAGE))
  if (unanswered.length > 0) throw new Error(`the IR schema offers ${unanswered.join(", ")}, which this sweep has no answer for`)
  const fields = offered.filter((field) => field in all)

  let deck: Record<string, unknown> = {}
  const slide: Record<string, unknown> = { ...page }
  for (const field of fields) {
    slide[field] = all[field]!.value
    if (all[field]!.deck) deck = { ...deck, ...all[field]!.deck }
  }
  // validate answers in stages and stops at the first stage that refuses,
  // so the refused fields come off one stage at a time.
  const refused: string[] = []
  let result = validated(base, slide, deck)
  for (;;) {
    const more = fields.filter((field) => !refused.includes(field) && refusesField(result.errors, field))
    if (more.length === 0) break
    refused.push(...more)
    for (const field of more) delete slide[field]
    if (more.includes("stage")) delete deck.course
    result = validated(base, slide, deck)
  }
  if (result.errors.length > 0) throw new Error(`${route.theme} ${route.slot} ${route.face}: ${result.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`)
  const markup = renderSlideSvg(result.ir!, 0)
  for (const el of Array.from(parseSvgRoot(markup).querySelectorAll("[data-dropped-kind]"))) DROP_KINDS_SEEN.add(el.getAttribute("data-dropped-kind")!)
  const text = pageText(markup)

  const silent: Silent[] = []
  for (const field of fields) {
    if (refused.includes(field)) continue
    const missing = all[field]!.probes.filter((probe) => !text.includes(squash(probe.words)))
    if (missing.length === 0) continue
    const without = { ...slide }
    delete without[field]
    const withoutDeck = field === "stage" ? Object.fromEntries(Object.entries(deck).filter(([k]) => k !== "course")) : deck
    const bare = validated(base, without, withoutDeck)
    const declared = bare.errors.length === 0 && marks(markup) > marks(renderSlideSvg(bare.ir!, 0))
    if (declared) continue
    for (const probe of missing) silent.push({ route, probe: { field, part: probe.part, words: probe.words } })
  }
  return silent
}

describe("a page's own fields reach the page, or the engine says they did not", () => {
  const assets = {} as Record<LanguageId, CorpusAssets>
  beforeAll(async () => {
    for (const id of Object.keys(LEXICONS) as LanguageId[]) assets[id] = await corpusAssets(LEXICONS[id])
  })

  for (const theme of CANONICAL_THEME_IDS) {
    it(`${theme}: every face draws every field it accepts`, () => {
      const silent = routes()
        .filter((route) => route.theme === theme)
        .flatMap((route) => sweep(route, assets))
        .map(({ route, beside, probe }) => `${route.theme} × ${route.slot} (${route.face}${beside ? ` + ${beside}` : ""}) × ${probe.field}${probe.part ? `.${probe.part}` : ""}`)
      expect([...new Set(silent)]).toEqual([])
    })
  }

  // After every theme above: the tests in a file run in order.
  it("names every dropped unit by the drop table", () => {
    expect(DROP_KINDS_SEEN.size).toBeGreaterThan(0)
    expect([...DROP_KINDS_SEEN].filter((kind) => !isDropKind(kind)).sort()).toEqual([])
  })
})
