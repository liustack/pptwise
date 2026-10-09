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
// found nowhere else, on every face of every built-in theme's menu, and holds
// each field to one of three outcomes: its words are on the page, validate
// refuses the field on this page, or the page carries a mark that the field
// itself put there. Words that are simply gone fail.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PageKind, PptxIR, Slide } from "@/ir"
import { irJsonSchema } from "@/ir/json-schema"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from "@/themes"
import { corpusAssets, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"
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

/** A refusal validate gave this field on page 1. */
function refusesField(errors: readonly { path: string; message: string }[], field: string): boolean {
  const named = new RegExp(`\\b${field}\\b`, "u")
  return errors.some((e) => e.path === `slides.0.${field}` || e.path.startsWith(`slides.0.${field}.`) || (e.path === "slides.0" && named.test(e.message)))
}

interface Route {
  theme: string
  slot: string
  face: string
}

/** Every face of every built-in theme's menu, slot by slot: a face that dispatches by content is reached once per kind that names it. */
function routes(): Route[] {
  const out: Route[] = []
  for (const theme of CANONICAL_THEME_IDS) for (const [slot, face] of Object.entries(menuFaces(theme))) out.push({ theme, slot, face })
  return out
}

/** A loss nothing declared: the theme, the slot, the face, the field and the words that went missing. */
interface Silent {
  route: Route
  probe: Probe
}

/** Validate a deck whose page 1 is `slide`, with `deck` merged in. */
function validated(base: PptxIR, slide: Record<string, unknown>, deck: Record<string, unknown>) {
  return validateIr({ ...base, ...deck, slides: [slide] })
}

/**
 * The silent losses on one route: the face's own gallery page, every
 * schema field filled, refused fields taken off, rendered once with all of
 * them and once without each one that went missing.
 */
function sweep(route: Route, assets: Record<LanguageId, CorpusAssets>): Silent[] {
  const lex = nativeLexiconFor(route.theme)
  const kind = ["cover", "chapter", "ending"].includes(route.slot) ? undefined : (route.slot as PageKind)
  const base = layoutPage(route.face, lex, assets[lex.id], route.theme, kind)
  const page = base.slides[0] as unknown as Record<string, unknown>
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
        .map(({ route, probe }) => `${route.theme} × ${route.slot} (${route.face}) × ${probe.field}${probe.part ? `.${probe.part}` : ""}`)
      expect([...new Set(silent)]).toEqual([])
    })
  }
})
