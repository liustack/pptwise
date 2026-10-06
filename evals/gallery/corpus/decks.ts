/**
 * Turns the corpus into whole decks — the two tables `D2` settled on.
 *
 * Theme table: every theme runs a ten-page deck of the same shape, with
 * content leads rotating from a fixed assignment table. Layout/component table:
 * one page each on a fixed baseline style. An exact face under review is
 * carried by a registered test theme menu, so the author-facing IR stays
 * semantic and deterministic.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Component, PageKind, PptxIR, Slide } from "@/ir"
import { FULL_BODY_TYPES } from "@/render/component-traits"
import type { CompositionId } from "@/layouts/compositions"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "@/layouts/registry"
import { fitSvgLine } from "@/lib/svg-text-layout"
import { resolveFontStack } from "@/render/fonts"
import { CANONICAL_THEME_IDS, resolveStyle, type CanonicalThemeId } from "@/themes"
import { getInstalledThemeIds, getThemeDefinition } from "@/themes/definitions"
import { registerTestTheme, type TestThemeFaces } from "@/themes/test-fixtures"
import { CHART_VARIANTS, COMPONENT_BUILDERS, PHOTO_ASSETS, PHONE_SCREENSHOT_ASSET, SCREENSHOT_ASSET } from "./components"
import type { LanguageId, Lexicon } from "./lexicon"
import { THEME_CONTENT_SLOTS, buildThemeSlot } from "./theme-slots"
import { BINDER_BODIES } from "./binder-bodies"

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/images")

interface EmphasisPhrases {
  readonly cover: string
  readonly heading: string
  readonly bullet: string
}

/**
 * Themes whose pages carry a `**run**` so the emphasis forms are visible on
 * the review wall. Emphasis forms draw inside body text, so a theme-table
 * page with a marked run is the only surface that can show them:
 * `brief` shows `pad`, `lecture` shows `underline`.
 * `evals/gallery/coverage.ts` asserts every form reaches a page this way.
 */
const THEME_EMPHASIS_PHRASES: Record<string, Record<LanguageId, EmphasisPhrases>> = {
  brief: {
    zh: { cover: "业务评审", heading: "新签", bullet: "九成一" },
    en: { cover: "Business Review", heading: "new business", bullet: "91%" },
    mixed: { cover: "Kubernetes 托管", heading: "90 秒", bullet: "12 分钟" },
  },
  // lecture's deck reads its native lexicon, so its phrases come from there.
  lecture: {
    zh: { cover: "手机摄影课", heading: "二十一位", bullet: "三个词" },
    en: { cover: "Business Review", heading: "new business", bullet: "91%" },
    mixed: { cover: "Kubernetes 托管", heading: "90 秒", bullet: "12 分钟" },
  },
}

function emphasizePhrase(source: string, phrase: string): string {
  if (!source.includes(phrase)) {
    throw new Error(`gallery emphasis phrase ${JSON.stringify(phrase)} is absent from ${JSON.stringify(source)}`)
  }
  return source.replace(phrase, `**${phrase}**`)
}

/**
 * stat-cover's heading is the giant number, one 200px line floored at 72pt.
 * A full deck title still truncates at that floor, so the review page would
 * be showing a cut sentence rather than the face. Author a KPI from the
 * lexicon, not a sentence.
 */
function statCoverHeading(lex: Lexicon): string {
  const m = lex.metrics[1]!
  return `${m.value}${m.unit ?? ""}`
}

/**
 * cut-panel-cover and lookbook-open-cover lock a single display line
 * (36pt / 48pt floor). The corpus deck title still truncates at that
 * floor in English and mixed, which hard-blocks validate. A chapter
 * title is the length those faces actually carry.
 */
function oneLineCoverHeading(lex: Lexicon): string {
  return lex.chapters[0]!
}

/** show-headline reserves 132px for one sharp cover claim. */
function showHeadlineCoverHeading(lex: Lexicon): string {
  return lex.kickers[0]!
}

function emphasizedLead(themeId: string, component: Component, slotIndex: number, lex: Lexicon): Component {
  if (slotIndex !== 1) return component
  if (component.type !== "bullets") return component
  const phrase = THEME_EMPHASIS_PHRASES[themeId]![lex.id].bullet
  return {
    ...component,
    items: component.items.map((item, index) => (index === 0 ? emphasizePhrase(item, phrase) : item)),
  }
}

function fixtureJpegDataUri(id: string): string {
  const bytes = readFileSync(join(FIXTURE_DIR, `${id}.jpg`))
  return `data:image/jpeg;base64,${bytes.toString("base64")}`
}

/** The theme held fixed while layouts and components are under review. */
export const BASELINE_THEME = "brief"

export type CorpusAssets = PptxIR["assets"]

/**
 * Every asset id the corpus can reference, loaded once per language track
 * from the committed JPEG fixtures. Async so the gallery entry can still
 * await it; the bytes themselves are local files, never a network fetch.
 */
export async function corpusAssets(lex: Lexicon): Promise<CorpusAssets> {
  const images: Record<string, { src: string; alt?: string }> = {}
  for (const [i, id] of PHOTO_ASSETS.entries()) {
    images[id] = { src: fixtureJpegDataUri(id), alt: lex.captions[i % lex.captions.length]! }
  }
  images[SCREENSHOT_ASSET] = {
    src: fixtureJpegDataUri(SCREENSHOT_ASSET),
    alt: lex.captions[2]!,
  }
  // The phone screen's own alt: `captions[3]` is the mobile line in every
  // register, where `captions[2]` is the desktop dashboard the browser shows.
  images[PHONE_SCREENSHOT_ASSET] = {
    src: fixtureJpegDataUri(PHONE_SCREENSHOT_ASSET),
    alt: lex.captions[3]!,
  }
  return { images }
}

function deckShell(lex: Lexicon, assets: CorpusAssets, themeId: string, filename: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename,
    theme: { id: themeId },
    // Meta drives the cover's own rows (organization line, author credits),
    // so it is filled rather than left default. Deck branding stays omitted:
    // the gallery is the new default, so content and ending pages have no
    // footer rule, meta, or logo, and `date`/`confidentiality` below stay
    // off the canvas even though they are set — that is exactly what a
    // reviewer needs to see. `branding: "full"` is the explicit declaration that
    // paints them (`src/render/document-meta.ts`).
    meta: {
      organization: lex.author,
      authors: lex.people.slice(0, 2).map((p) => ({ name: p.name, role: p.role, org: p.org })),
      date: lex.date,
      confidentiality: "internal",
    },
    assets,
    slides,
  }
}

const COMPONENT_KINDS: Record<Component["type"], PageKind> = {
  paragraph: "points",
  bullets: "points",
  blockquote: "quote",
  quote_wall: "evidence",
  callout: "points",
  code: "evidence",
  verdict_banner: "points",
  kpi_cards: "data",
  progress_donuts: "data",
  chart: "data",
  data_table: "data",
  waterfall: "data",
  heatmap: "data",
  gantt: "process",
  sankey: "process",
  steps: "process",
  concept_equation: "points",
  numbered_cards: "points",
  icon_cards: "list",
  row_cards: "list",
  timeline: "process",
  roadmap: "process",
  cycle: "process",
  staircase: "process",
  chevron_process: "process",
  swimlane: "process",
  journey_map: "process",
  // `hierarchy` and `process` are both honest homes for a decision tree
  // (skills/pptwise/references/components.md lists both). The gallery page
  // takes the process one because a hierarchy face on several themes is a
  // two-column layout, and half a slide is under the width the drawing
  // declines at — the review would be looking at a blank page instead of the
  // component.
  decision_tree: "process",
  from_to: "comparison",
  hub_spoke: "hierarchy",
  segmented_wheel: "hierarchy",
  rings: "hierarchy",
  pros_cons: "comparison",
  sketch: "evidence",
  positioning_map: "comparison",
  venn: "comparison",
  matrix: "comparison",
  flowchart: "process",
  architecture: "hierarchy",
  comparison: "comparison",
  insight_panel: "evidence",
  swot: "comparison",
  pest: "comparison",
  fishbone: "hierarchy",
  five_forces: "hierarchy",
  bmc: "hierarchy",
  people_cards: "hierarchy",
  image: "photo",
  image_grid: "photo",
  logo_wall: "list",
  product_cards: "list",
  image_compare: "photo",
  device_mockup: "photo",
  org_tree: "hierarchy",
  issue_tree: "hierarchy",
  pyramid: "hierarchy",
  iceberg: "hierarchy",
  pillar_model: "hierarchy",
  value_chain: "process",
  harvey_balls: "comparison",
  scorecard: "data",
  pictogram: "data",
  word_cloud: "list",
}

function componentKind(component: Component): PageKind {
  return COMPONENT_KINDS[component.type]
}

/**
 * Drawings whose own natural height is around 400px — a numbered pill stack,
 * a stage ring, a hub and its spokes each fill a content rect on their own.
 * Sharing the page with even a one-sentence lead-in leaves them under their
 * measured height: the density gate drops the pill stack and the ring
 * outright, and squeezes the hub into a cell where its element descriptions
 * no longer fit. Either way the review page stops showing what it exists to
 * show. Not full-body (a real deck may still stack them), just too tall to
 * review alongside anything.
 */
const TALL_COMPONENT_TYPES = new Set<Component["type"]>([
  "numbered_cards",
  "cycle",
  "hub_spoke",
  "row_cards",
  "data_table",
  // The hierarchy family draws a whole sheet: a three-row tree, a stack of
  // trapezoids beside its legend, a berg with its waterline, a beam over its
  // columns, a chain with its supporting bands. Each measures around 400px
  // and declares a decline rather than shrink into half a rect, so a lead-in
  // sentence above one would send the review page to the step-aside instead
  // of showing the drawing.
  "org_tree",
  "issue_tree",
  "pyramid",
  "iceberg",
  "pillar_model",
  "value_chain",
  "venn",
  "segmented_wheel",
])

/**
 * Drawings whose items are packed along one horizontal run, so what they can
 * hold is set by the width they are given rather than the height.
 * `architecture` prints each layer's parts as a single `·`-separated strip
 * (`fitItemRuns`, `src/components/architecture.tsx`) — on a full content
 * rect all four parts of a layer fit, but sharing the page with a lead-in
 * sentence sends it into `asymmetric-triptych`'s 424px side panel, where the
 * strip runs out of room and the layer drops its tail. Same remedy as the
 * tall set above, different axis, so it is named for its own reason instead
 * of being filed under a name that would be untrue of it.
 *
 * `positioning_map` belongs to the same axis for its own reason: every point
 * carries a name printed beside it, and half a rect is where those names
 * start running into each other. `pros_cons` splits whatever width it is
 * given into two columns of its own, so a side panel halves an already
 * halved column and every point arrives cut. `fishbone` is the same case at
 * its most extreme: the spine, its ribs and every cause label are laid out
 * along one horizontal run.
 */
const WIDE_COMPONENT_TYPES = new Set<Component["type"]>(["architecture", "positioning_map", "pros_cons", "fishbone"])

// ─────────────────────────────────────────────────────────────────────────
// Theme table — one ten-page deck, rendered once per theme
// ─────────────────────────────────────────────────────────────────────────

/**
 * The ten pages a real deck actually contains, in the order it contains
 * them: an opening, a section break, seven content pages each led by a
 * different component (looked up in `THEME_CONTENT_SLOTS`), then a close.
 *
 * Each content page names the semantic kind of its lead component. The
 * bound theme menu then chooses the one face for that kind.
 */
export function themeDeck(themeId: string, lex: Lexicon, assets: CorpusAssets): PptxIR {
  const slots = THEME_CONTENT_SLOTS[themeId]
  if (!slots || slots.length !== 7) {
    throw new Error(`theme table has no 7-slot assignment for ${themeId}`)
  }
  const emphasis = THEME_EMPHASIS_PHRASES[themeId]?.[lex.id]
  const content: Slide[] = slots.map((spec, i) => {
    const built = buildThemeSlot(spec, lex)
    const component = emphasis ? emphasizedLead(themeId, built, i, lex) : built
    const extra = thickenThemeContent(themeId, i, lex, component)
    const kind = componentKind(component)
    if (getThemeDefinition(themeId).menu.content[kind] === undefined) {
      throw new Error(`theme table slot ${themeId}[${i}] uses ${component.type}, but its menu does not offer ${kind}`)
    }
    return {
      type: "content" as const,
      kind,
      heading: emphasis && i === 0 ? emphasizePhrase(lex.headings[i]!, emphasis.heading) : lex.headings[i]!,
      components: [component, ...extra],
      ...(component.type === "data_table" ? { footnote: lex.sources[0]!.label } : {}),
    }
  })
  const slides: Slide[] = [
    {
      type: "cover",
      heading:
        themeId === "ledger"
          ? statCoverHeading(lex)
          : themeId === "runway"
            ? showHeadlineCoverHeading(lex)
            : emphasis
              ? emphasizePhrase(lex.deckTitle, emphasis.cover)
              : lex.deckTitle,
      subheading: lex.deckSubtitle,
      components:
        themeId === "brief"
          ? [{ type: "bullets", items: [lex.bullets[0]!, lex.bullets[1]!, lex.bullets[2]!] }]
          : [],
    },
    { type: "chapter", heading: lex.chapters[0]!, subheading: lex.kickers[0], components: [] },
    ...content,
    themeId === "thesis" || themeId === "brief" || themeId === "crayon" || themeId === "clinic" || themeId === "almanac"
      ? {
          type: "ending" as const,
          heading: lex.chapters[5]!,
          subheading: lex.verdicts.positive,
          components: [{ type: "bullets" as const, items: lex.bullets.slice(0, 3) }],
        }
      : { type: "ending" as const, heading: lex.chapters[5]!, subheading: lex.verdicts.positive, components: [] },
  ]
  return deckShell(lex, assets, themeId, `theme-${themeId}-${lex.id}`, slides)
}

/**
 * Gallery theme pages ship one lead component. A few slots are too thin
 * for the layouts they land in (empty second column, vacant triptych
 * frames, a 56px card in a poster hero). Inject a short companion where the
 * menu-selected face needs one.
 */
function thickenThemeContent(themeId: string, slotIndex: number, lex: Lexicon, lead: Component): Component[] {
  // A lead that fills the sheet on its own never wants a companion. The
  // thickening list is keyed by theme and slot, so a lead swapped into one of
  // those slots inherits a companion meant for the component that used to sit
  // there — and a component that declines rather than shrink then draws
  // nothing at all, which is how a hierarchy page arrived blank.
  if (TALL_COMPONENT_TYPES.has(lead.type) || WIDE_COMPONENT_TYPES.has(lead.type)) return []
  const shortParagraph: Component = { type: "paragraph", text: lex.shortParagraph }
  if (themeId === "stage" && slotIndex === 0) return [shortParagraph]
  // Two bullets, not five: split-band gives the pie chart 260px of its 400px
  // rect, and the full list did not fit in the ~124px left over — so the
  // companion meant to fill the band under the plot was dropped whole.
  if (themeId === "swiss" && slotIndex === 0) return [sliceBullets(COMPONENT_BUILDERS.bullets!(lex), 2)]
  if (themeId === "arena" && slotIndex === 2) return [shortParagraph]
  if (themeId === "clinic" && slotIndex === 3) return [shortParagraph]
  if (themeId === "runway" && slotIndex === 5) return [shortParagraph]
  if (themeId === "heritage" && slotIndex === 3) return [shortParagraph]
  return []
}

// ─────────────────────────────────────────────────────────────────────────
// Layout table — one menu-bound page per layout
// ─────────────────────────────────────────────────────────────────────────

/** The body slot's declared capacity, or a safe default when it has none. */
function bodyCapacity(def: LayoutDefinition): number {
  // Only the body slot governs how many stacked components the corpus may
  // author — an auxiliary slot's own ceiling (asymmetric-triptych's lead is
  // capacity 1) must not drag the whole page down to a degenerate single
  // component (menu-model review BLOCKER B2).
  const body = def.slots.find((s) => s.name === "body")
  if (typeof body?.capacity === "number") {
    // A declared 0 is a real value (mono-bleed's body slot accepts nothing) —
    // clamping it up to 1 authors a page validate-core rejects outright.
    return Math.max(0, body.capacity)
  }
  return 2
}

function wantsImage(def: LayoutDefinition): boolean {
  return def.slots.some((s) => s.name === "image" || s.name === "hero" || s.name === "lead")
}

/** A bullets component narrowed to the rows a tight annotation rail holds. */
function sliceBullets(component: Component, n: number): Component {
  return component.type === "bullets" ? { ...component, items: component.items.slice(0, n) } : component
}

/**
 * One sentence, the size an annotation slot holds.
 *
 * From the far end of the sentence pool, for the reason `stepAsidePage`
 * gives below: every component builder draws from the near end
 * (`sentences[0]` through `sentences[7]`), and a note beside a `steps`
 * stack taken from the same end printed step one's text a second time on
 * every `rail-numbered` page. `corpus-scan.test.mts` holds the whole corpus to
 * that, page by page.
 */
function shortNote(lex: Lexicon): Component {
  return { type: "paragraph", text: lex.sentences[10]! }
}

/** The frames `show-gallery` lays across its page (`FRAME_X` in `content-show-gallery.tsx`). */
const SHOW_GALLERY_FRAMES = 6

/**
 * Body components for a content page under a given layout, filled up to the
 * layout's declared capacity and no further. Overfilling would make the
 * density gate silently drop components, and a reviewer would be judging a
 * page the renderer never intended to draw.
 */
function bodyFor(def: LayoutDefinition, lex: Lexicon): Component[] {
  const b = COMPONENT_BUILDERS
  const capacity = bodyCapacity(def)

  // A capacity-1 body is an annotation position, not a content region —
  // quote-stage's own registry entry calls it "a small attribution/footnote
  // annotation slot below an oversized heading". Feeding it a full
  // paragraph is authoring the page wrong, and the first review round spent
  // three findings on the resulting mess rather than on the layout itself.
  // One sentence, not the corpus' full paragraph: the slot is ~80px tall and
  // a paragraph does not fit, which showed up as dropped content on every
  // quote-stage page.
  if (capacity === 0) return []

  // stat-hero's one slot is the hero itself: fed an annotation, the heading
  // has to carry the 180px hero figure and the corpus' long English heading
  // overruns the render-safety floor. Author the page as intended — a KPI
  // whose value is the hero, with no heading over it (`layoutPage`). The hero
  // sets the card's value, unit, label and source and nothing else, so the
  // card carries no icon and no delta: either one, or a heading, steps the
  // face aside (`heroExact`), and this band is here to show the face.
  if (def.id === "stat-hero") {
    const kpi = b.kpi_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 1).map(({ value, unit, label, source }) => ({ value, unit, label, source }))
    return [kpi]
  }
  if (def.id === "gauge-stats") {
    const kpi = b.kpi_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 4)
    return [kpi]
  }
  if (def.id === "crayonbox-cards") {
    const cards = b.numbered_cards!(lex)
    if (cards.type === "numbered_cards") {
      cards.items = cards.items.slice(0, 3).map((item, index) => ({
        ...item,
        title: lex.labels[index]!,
        text: lex.labels[index + 3]!,
        sub: lex.periods[index]!,
      }))
    }
    return [cards]
  }
  if (def.id === "show-gallery") {
    // Six frames over four photos, and a caption of its own under each. The
    // captions used to cycle the four-line pool, so frames five and six
    // printed the captions of frames one and two.
    const captions = lex.captions.slice(0, SHOW_GALLERY_FRAMES)
    if (captions.length < SHOW_GALLERY_FRAMES) {
      throw new Error(`show-gallery draws ${SHOW_GALLERY_FRAMES} frames, and lexicon "${lex.id}" has ${lex.captions.length} captions`)
    }
    return [{
      type: "image_grid",
      items: captions.map((caption, index) => ({
        asset_id: PHOTO_ASSETS[index % PHOTO_ASSETS.length]!,
        caption,
      })),
    }]
  }
  if (def.id === "show-spotlight") {
    const panel = b.insight_panel!(lex)
    if (panel.type === "insight_panel") panel.rows = panel.rows.slice(0, 3)
    return [b.image!(lex), panel]
  }
  if (def.id === "show-statement") {
    const cards = b.numbered_cards!(lex)
    if (cards.type === "numbered_cards") cards.items = cards.items.slice(0, 3)
    return [cards]
  }
  // ledger's panel sheet: the board's data page, a chart in its panel with
  // the author's figures in panels beside it.
  if (def.id === "panel-sheet") {
    const chart = b.chart!(lex)
    if (chart.type !== "chart") throw new Error("the corpus chart builder returned no chart")
    // One series over the periods, the way the board's panel draws columns:
    // the axis is named by the panel's title bar, not an axis title.
    const series = chart.series.slice(0, 1)
    return [
      { ...chart, axes: { y_title: chart.axes?.y_title, y_unit: chart.axes?.y_unit }, series },
      { type: "kpi_cards", items: figureItems(lex, 3) },
    ]
  }
  // panel-figure's lead is one figure, read against a few bars of the same
  // measure: the figure and the two periods before it, the last bar the
  // figure itself.
  if (def.id === "panel-figure") {
    const figure = lex.metrics[1]!
    const value = Number.parseFloat(figure.value)
    if (!Number.isFinite(value)) throw new Error(`panel-figure needs a numeric metric, and lexicon "${lex.id}" has "${figure.value}"`)
    return [
      { type: "kpi_cards", items: [{ value: figure.value, unit: figure.unit, label: figure.label }] },
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_unit: figure.unit },
        series: [{ name: figure.label, data: lex.periods.slice(0, 3).map((x, i) => ({ x, y: Math.round(value * [0.8, 0.9, 1][i]! * 10) / 10 })) }],
      },
    ]
  }
  // vermilion's seal sheet: the board's overview page, numbered points with
  // a sentence each, the last the one the page lands on.
  if (def.id === "seal-sheet") {
    return [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(0, 4).map((title, i) => ({ title, text: lex.sentences[i + 2]!, ...(i === 3 ? { emphasis: true } : {}) })),
      },
    ]
  }
  // terminal's console sheet: the board's verdict page, four findings with
  // their icons, the first the one the page lands on.
  if (def.id === "console-sheet") {
    return [
      {
        type: "row_cards",
        items: lex.phrases.slice(0, 4).map((title, i) => ({
          icon: (["zap", "cloud-lightning", "repeat", "receipt"] as const)[i]!,
          title,
          text: lex.sentences[i + 2]!,
          ...(i === 0 ? { highlight: true } : {}),
        })),
      },
    ]
  }
  // almanac's yearbook sheet: the board's decision page, what the year came
  // to on three cards over the two things the members are asked to settle.
  if (def.id === "yearbook-sheet") return yearbookAsk(lex).components
  // homeroom's lesson sheet: the board's recap page, four pairs of words
  // chalked on the board with a line each, one underlined.
  if (def.id === "lesson-sheet") return COMPOSITION_BODIES.blackboard(lex).components
  // ember's pitch sheet: the board's ask page, the ask beside its uses as a
  // bar, over what it is measured against. Its photo page: one figure lit
  // beside the photograph.
  if (def.id === "pitch-sheet") return COMPOSITION_BODIES.uses(lex).components
  if (def.id === "pitch-photo") return COMPOSITION_BODIES.spotlight(lex).components
  // rally's marquee sheet: the board's scoreboard, measures still to be
  // filled with their pending targets. Its one-line plan: the touchpoints
  // under the claim.
  if (def.id === "marquee-sheet") return COMPOSITION_BODIES.scoreboard(lex).components
  // proposal's binder sheet: the board's sum, the inputs beside the working
  // and the answer the page lands on.
  if (def.id === "binder-sheet") return COMPOSITION_BODIES.workings(lex).components
  if (def.id === "marquee-statement") {
    return [{ type: "icon_cards", items: [0, 1, 2].map((i) => ({ icon: (["cup-soda", "package", "ticket"] as const)[i]!, title: lex.labels[i]!, text: lex.bullets[i]! })) }]
  }
  // memo's sheet: the board's decision page, four clauses numbered in the
  // deck's numerals with a sentence each, the last the one the page lands on.
  if (def.id === "memo-sheet") {
    return [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(6, 10).map((title, i) => ({ title, text: lex.sentences[i + 8]!, ...(i === 3 ? { emphasis: true } : {}) })),
      },
    ]
  }
  // clinic's dossier sheet: the board's proposal page, three proposals on
  // cards with their icons and where their evidence is, the first the one
  // the page argues for.
  if (def.id === "dossier-sheet") {
    return [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(0, 3).map((title, i) => ({
          icon: (["pill", "hospital", "clipboard-check"] as const)[i]!,
          title,
          text: lex.sentences[i + 2]!,
          sub: lex.periods[i]!,
          ...(i === 0 ? { emphasis: true } : {}),
        })),
      },
    ]
  }
  // The seal fact page: the lead figure with its tag and note, and three
  // figures beside it, one marked.
  if (def.id === "seal-figure") {
    return [
      {
        type: "kpi_cards",
        items: figureItems(lex, 4).map((item, i) =>
          i === 0 ? { ...item, tag: { text: lex.labels[13]! } } : i === 2 ? { ...item, value: `**${item.value}**` } : item,
        ),
      },
    ]
  }
  if (def.id === "show-figures") {
    const kpi = b.kpi_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 3)
    return [kpi]
  }

  // Sparse and a few ordinary layouts have a body slot whose declared
  // capacity is the wrong signal: a one-sentence note is the capacity-1
  // default, but
  // these pages draw a quote, a chart, a bento grid, or a hero+strip. Match
  // the layout's own comments rather than broadening the default.
  if (def.id === "pull-quote") return [b.blockquote!(lex)]
  if (def.id === "gauge-point") return [b.blockquote!(lex)]
  if (def.id === "crayonbox-point") return [b.blockquote!(lex)]
  if (def.id === "one-evidence") return [b.chart!(lex)]
  if (def.id === "gauge-exhibit") return [b.chart!(lex)]
  // The board's ruled rows with a closing block: a short list and one
  // remark the page lands on, which is the shape the face composes by hand.
  if (def.id === "gauge-sheet") {
    return [sliceBullets(b.bullets!(lex), 3), { type: "callout", variant: "info", text: lex.verdicts.positive }]
  }
  // The notice board's overview: numbered rows, the last the answer the
  // others lead to, which the face reverses out of a primary block.
  if (def.id === "notice-sheet") {
    return [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(0, 4).map((title, i) => ({ title, text: lex.sentences[i + 2]!, ...(i === 3 ? { emphasis: true } : {}) })),
      },
    ]
  }
  // swiss's grid sheet: the board's table page, a highlighted row over a
  // closing note, which the face sets by hand in its grid setting.
  if (def.id === "grid-sheet") {
    const table = b.data_table!(lex)
    return [
      table.type === "data_table" ? { ...table, source: undefined } : table,
      { type: "callout", variant: "info", text: lex.verdicts.positive },
    ]
  }
  // The statement's figures and the figure page's lead with two beside it:
  // plain values, labels and notes, the second one marked.
  if (def.id === "grid-statement" || def.id === "grid-figure") {
    return [{ type: "kpi_cards", items: figureItems(lex, 3).map((item, i) => (i === 1 ? { ...item, value: `**${item.value}**` } : item)) }]
  }
  if (def.id === "gauge-figure") {
    // One figure with nothing the hero line has no place for: a delta arrow
    // or an icon sends the page to the plain fallback.
    const kpi = b.kpi_cards!(lex)
    if (kpi.type === "kpi_cards") {
      kpi.items = kpi.items.slice(0, 1).map((item) => ({ value: item.value, unit: item.unit, label: item.label, source: item.source }))
    }
    return [kpi]
  }
  if (def.id === "bento-panel") {
    const kpi = b.kpi_cards!(lex)
    const icons = b.icon_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 3)
    if (icons.type === "icon_cards") icons.items = icons.items.slice(0, 3)
    return [kpi, icons]
  }
  if (def.id === "stacked-poster") {
    // The 108px caption strip under the poster hero cannot hold
    // shortParagraph. One sentence fits the strip, so the page stays on the
    // two-block poster path instead of dropping the body.
    return [b.image!(lex), shortNote(lex)]
  }
  if (def.id === "quote-stage") return [shortNote(lex)]
  if (def.id === "statement") return [shortNote(lex)]

  if (capacity <= 1) return [shortNote(lex)]

  const shortParagraph: Component = { type: "paragraph", text: lex.shortParagraph }

  // Per-layout bodies. Same capacity intent as before (two compact blocks
  // for the two-column-ish family, image plus a short companion for
  // takeovers) but different types, so paging the table is not eight
  // copies of bullets+kpi.
  const bodies: Record<string, Component[]> = {
    "two-column": (() => {
      // Four KPI cards in a half-width column fall under MIN_READABLE_CARD_W
      // and get dropped from the page. Two cards still read as a kpi pair.
      const kpi = b.kpi_cards!(lex)
      if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 2)
      return [b.bullets!(lex), kpi]
    })(),
    // Four bullets, not a numbered_cards stack: narrow-column is the `points`
    // face, and a numbered card stack is ~400px tall on its own
    // (`TALL_COMPONENT_TYPES`), so under the callout it overran this face's
    // body rect and the density gate dropped the whole block. A bulleted list
    // is what a points page actually carries. Four rows rather than the
    // corpus' usual five because memo and clinic spend 100px more on the
    // header, leaving a 325px rect where the fifth row does not fit.
    "narrow-column": [b.callout!(lex), sliceBullets(b.bullets!(lex), 4)],
    "rail-numbered": [b.steps!(lex), shortNote(lex)],
    "banner-heading": [b.icon_cards!(lex), b.bullets!(lex)],
    "tone-adaptive-content": [b.blockquote!(lex), b.kpi_cards!(lex)],
    "quiet-frame": [b.bullets!(lex), b.callout!(lex)],
    "split-band": [b.icon_cards!(lex), shortNote(lex)],
    "asymmetric-triptych": [b.image!(lex), b.blockquote!(lex)],
    "image-split": [b.image!(lex), b.bullets!(lex), shortParagraph],
    "image-top": [b.image!(lex), b.callout!(lex), shortParagraph],
    "image-bottom": [b.image!(lex), b.blockquote!(lex), shortParagraph],
    // Four notes, not the corpus' usual five: image-annotate's annotation
    // rail beside the picture holds exactly four rows, and the fifth was
    // being dropped on every theme that offers this face.
    "image-annotate": [b.image!(lex), sliceBullets(b.bullets!(lex), 4)],
  }

  const mapped = bodies[def.id]
  if (mapped) return capacity < mapped.length ? mapped.slice(0, capacity) : mapped

  const pool: Component[] = wantsImage(def)
    ? [b.image!(lex), shortParagraph, b.bullets!(lex), b.callout!(lex)]
    : [b.paragraph!(lex), b.bullets!(lex), b.kpi_cards!(lex), b.callout!(lex)]
  return pool.slice(0, Math.min(capacity, 3))
}

const CONTENT_FACE_KINDS: Record<string, PageKind> = {
  "asymmetric-triptych": "hierarchy",
  "bento-panel": "list",
  "crayonbox-cards": "list",
  "crayonbox-point": "statement",
  "gauge-point": "statement",
  "gauge-exhibit": "evidence",
  "gauge-figure": "fact",
  "gauge-sheet": "points",
  "notice-sheet": "points",
  "grid-sheet": "data",
  "grid-statement": "statement",
  "grid-figure": "fact",
  "seal-sheet": "points",
  "seal-figure": "fact",
  "gauge-stats": "data",
  "image-annotate": "photo",
  "image-bottom": "photo",
  "image-split": "photo",
  "image-top": "photo",
  "mono-bleed": "statement",
  "narrow-column": "points",
  "one-evidence": "evidence",
  "pull-quote": "quote",
  "quiet-frame": "points",
  "quote-stage": "quote",
  "rail-numbered": "process",
  "show-figures": "data",
  "show-gallery": "photo",
  "show-spotlight": "photo",
  "show-statement": "statement",
  "split-band": "data",
  "stacked-poster": "data",
  "stat-hero": "fact",
  statement: "statement",
  "tone-adaptive-content": "data",
  "two-column": "comparison",
}

/**
 * Which menu slot a layout would occupy: the boundary slide type it draws,
 * or, for a content face, the page kind it is authored against. The gallery
 * needs this for faces no menu offers — they still have to be filed under a
 * slot so the cross-cut view can put them in the right row.
 */
export function layoutFaceSlot(layoutId: string): string {
  const def = LAYOUT_REGISTRY[layoutId]
  if (!def) throw new Error(`unknown layout id: ${layoutId}`)
  const slideType = def.slideTypes[0]!
  return slideType === "content" ? (CONTENT_FACE_KINDS[layoutId] ?? "points") : slideType
}

function galleryThemeId(sourceThemeId: CanonicalThemeId, layoutId: string, slideType: Slide["type"], kind?: PageKind): string {
  return `gallery-face-${sourceThemeId}-${slideType}-${kind ?? "boundary"}-${layoutId}`
}

function ensureGalleryFaceTheme(
  sourceThemeId: string,
  layoutId: string,
  slideType: Slide["type"],
  kind?: PageKind,
): string {
  const source = getThemeDefinition(sourceThemeId)
  const current = slideType === "content" && kind !== undefined ? source.menu.content[kind]?.face : source.menu[slideType as Exclude<Slide["type"], "content">].face
  if (current === layoutId) return sourceThemeId
  if (!(CANONICAL_THEME_IDS as readonly string[]).includes(sourceThemeId)) {
    throw new Error(`gallery cannot bind face "${layoutId}" onto non-builtin theme "${sourceThemeId}"`)
  }

  const canonical = sourceThemeId as CanonicalThemeId
  const id = galleryThemeId(canonical, layoutId, slideType, kind)
  if (getInstalledThemeIds().includes(id)) return id
  const faces: TestThemeFaces =
    slideType === "content" && kind !== undefined ? { content: { [kind]: layoutId } } : { [slideType]: layoutId }
  return registerTestTheme(id, canonical, faces)
}

/** One page routed to one exact face through a theme menu. */
export function layoutPage(
  layoutId: string,
  lex: Lexicon,
  assets: CorpusAssets,
  themeId: string = BASELINE_THEME,
  requestedKind?: PageKind,
): PptxIR {
  const def = LAYOUT_REGISTRY[layoutId]
  if (!def) throw new Error(`unknown layout id: ${layoutId}`)
  const slideType = def.slideTypes[0]!
  const kind = slideType === "content" ? requestedKind ?? CONTENT_FACE_KINDS[layoutId] ?? "points" : undefined
  const renderingThemeId = ensureGalleryFaceTheme(themeId, layoutId, slideType, kind)

  const slide =
    slideType === "cover"
      ? {
          type: "cover",
          heading:
            def.id === "stat-cover"
              ? statCoverHeading(lex)
              : def.id === "show-headline"
                ? showHeadlineCoverHeading(lex)
                : def.id === "cut-panel-cover" || def.id === "lookbook-open-cover"
                  ? oneLineCoverHeading(lex)
                  : lex.deckTitle,
          subheading: lex.deckSubtitle,
          components:
            def.id === "gauge-verdict" || def.id === "pitch-cover"
              ? [{ type: "bullets", items: lex.bullets.slice(0, 3) }]
              : // rally's cover: the campaign's facts as pills, each with its icon.
                def.id === "marquee-cover"
                ? [{ type: "row_cards", items: [0, 1, 2].map((i) => ({ icon: (["calendar-days", "map-pin", "qr-code"] as const)[i]!, title: lex.labels[i]! })) }]
                : [],
        }
      : slideType === "chapter"
        ? {
            type: "chapter",
            heading: lex.chapters[1]!,
            subheading: lex.kickers[1],
            // homeroom's part of a lesson says what the part covers on three cards.
            components:
              def.id === "lesson-chapter"
                ? [{ type: "row_cards", items: [0, 1, 2].map((i) => ({ icon: (["lightbulb", "triangle-alert", "gauge"] as const)[i]!, title: lex.bullets[i]! })) }]
                : // ember's act of a pitch says what the act covers, a line each with an icon.
                  def.id === "pitch-chapter"
                  ? [{ type: "row_cards", items: [0, 1, 2, 3].map((i) => ({ icon: (["package", "trending-up", "map-pin", "users"] as const)[i]!, title: lex.bullets[i]! })) }]
                  : [],
          }
        : slideType === "ending"
          ? {
              type: "ending",
              heading: lex.chapters[5]!,
              subheading: lex.verdicts.positive,
              components:
                def.id === "gauge-next" || def.id === "crayonbox-todo" || def.id === "dossier-ending" || def.id === "yearbook-ending"
                  ? [{ type: "bullets", items: lex.bullets.slice(0, 3) }]
                  : def.id === "lesson-ending"
                    ? [
                        { type: "numbered_cards", items: [0, 1, 2].map((i) => ({ title: lex.phrases[i]!, text: lex.labels[i]! })) },
                        { type: "callout", variant: "tip", title: lex.kickers[5]!, text: lex.sentences[11]! },
                      ]
                    : // ember's close: the steps the round pays for and the button's words.
                      def.id === "pitch-ending"
                      ? [
                          { type: "timeline", milestones: [0, 1, 2].map((i) => ({ date: lex.periods[i]!, title: lex.phrases[i]!, icon: (["file-check", "hospital", "coins"] as const)[i]! })) },
                          { type: "paragraph", text: lex.kickers[5]! },
                        ]
                      : // rally's close: the next steps and the button's words.
                        def.id === "marquee-ending"
                        ? [
                            { type: "timeline", milestones: [0, 1, 2].map((i) => ({ date: lex.periods[i]!, title: lex.phrases[i]! })) },
                            { type: "paragraph", text: lex.kickers[5]! },
                          ]
                        : [],
            }
          : {
              type: "content",
              kind: kind!,
              // stat-hero sets no heading over its figure: one written
              // there has nowhere on the hero to go, and the face steps
              // aside for it.
              heading: def.id === "stat-hero" ? undefined : lex.headings[7]!,
              components: bodyFor(def, lex),
              footnote: lex.sources[1]!.label,
              ...(def.kind === "takeover" ? { image_side: "right" as const } : {}),
            }

  // A takeover layout draws the picture itself from the slide's own image
  // component, so it needs one present whatever its body capacity says.
  const typedSlide = slide as unknown as Slide
  if (def.kind === "takeover" && typedSlide.components.every((c) => c.type !== "image")) {
    typedSlide.components = [COMPONENT_BUILDERS.image!(lex), ...typedSlide.components].slice(0, 2)
  }

  return deckShell(lex, assets, renderingThemeId, `layout-${layoutId}-${themeId === BASELINE_THEME ? lex.id : `${themeId}-${lex.id}`}`, [typedSlide])
}

// ─────────────────────────────────────────────────────────────────────────
// Component table — one page per component (and per chart variant)
// ─────────────────────────────────────────────────────────────────────────

/**
 * One component on one page, on the baseline theme. Full-body components
 * (swot, bmc, waterfall and the rest) must be the slide's only component —
 * that is their contract, not an accident — so nothing is added alongside.
 * Everything else gets a short lead-in paragraph, because a component is
 * almost never alone on a real slide and its spacing against neighbouring
 * text is part of what is being judged.
 */
const CARTESIAN_CHART_TYPES = new Set(["bar", "line", "scatter", "area", "stacked", "percent_stacked", "combo"])

function isCartesianChart(component: Component): component is Extract<Component, { type: "chart" }> {
  return component.type === "chart" && CARTESIAN_CHART_TYPES.has(component.chart_type)
}

function isBubbleChart(component: Component): boolean {
  return (
    component.type === "chart" &&
    component.chart_type === "scatter" &&
    component.series.some((s) => s.data.some((d) => d.size != null))
  )
}

/**
 * A heading short enough for the narrowest face a specimen page can land on.
 *
 * `show-spotlight`'s fallback fits the page heading to a single 496px line
 * with a 36px floor — about thirteen CJK glyphs — and runway routes `photo`
 * there, so the pool's usual `headings[8]` lost its last character on runway's
 * device pages and the review compared a cut line against whole ones. Picking
 * the first entry in the theme's own pool that survives that budget keeps the
 * register the lexicon authored, instead of inventing a short line per theme,
 * and fits every wider face by construction.
 *
 * Only device pages ask for it: they are the specimen the frame is judged on,
 * and the frame leaves the heading less room than a bare picture does.
 */
const NARROW_HEADING_W = 496
const NARROW_HEADING_FLOOR = 36

function headingThatFitsAnywhere(lex: Lexicon, themeId: string): string {
  const fontFamily = resolveFontStack(resolveStyle(themeId).fonts.heading, "heading")
  for (const heading of lex.headings) {
    const fitted = fitSvgLine(heading, {
      maxWidth: NARROW_HEADING_W,
      fontSize: 56,
      minFontSize: NARROW_HEADING_FLOOR,
      fontFamily,
      bold: true,
    })
    if (!fitted.truncated) return heading
  }
  return lex.headings[0]!
}

export function componentPage(
  componentId: string,
  build: (lex: Lexicon) => Component,
  lex: Lexicon,
  assets: CorpusAssets,
  themeId: string = BASELINE_THEME,
  opts: { solo?: boolean } = {},
): PptxIR {
  const component = build(lex)
  const chart = component.type === "chart"
  const cartesian = isCartesianChart(component)
  const bubble = isBubbleChart(component)
  const kind = componentKind(component)
  // Every chart type owns its page, not just the cartesian four. A chart
  // sharing the page with a lead-in paragraph is a two-component slide, and
  // a face that reserves its second slot for a caption strip (stage's
  // stacked-poster) then hands the plot a 68px band: the dumbbell, funnel,
  // gauge and pie skins were rendering as thumbnails under a full-size
  // paragraph, i.e. the review page was not showing what it exists to show.
  const solo =
    opts.solo ??
    (FULL_BODY_TYPES.has(component.type) ||
      TALL_COMPONENT_TYPES.has(component.type) ||
      WIDE_COMPONENT_TYPES.has(component.type) ||
      // The lead-in is itself a paragraph, so a paragraph page paired with
      // one is two paragraphs stacked — nothing about the component is
      // clearer for the company, and on brief's short `points` rect the
      // English body was dropped and the review saw only the lead-in.
      component.type === "paragraph" ||
      // A flowchart scales to whatever box it is handed (`SCALABLE_TYPES`),
      // so sharing the page turns it into a thumbnail — the same reason a
      // chart owns its page. Under a lead-in sentence on brief it drew
      // in a 96px band of a 437px rect and an edge label had nowhere left to
      // park, which the drawing declared as a drop.
      component.type === "flowchart" ||
      chart ||
      ["quote", "evidence", "statement", "fact", "photo"].includes(kind))

  // A one-sentence lead-in, not the full corpus paragraph. The paragraph
  // runs long enough in English that it consumed the content rect and the
  // component under review got dropped — the review table was showing the
  // lead-in instead of the thing it exists to show, on 40 pages.
  //
  // From the far end of the pool, same reason as `stepAsidePage` below:
  // `steps`, `rings` and `insight_panel` all write `sentences[0]` into their
  // first row, so a lead-in taken from the near end said the same thing
  // twice on every one of their pages.
  const leadIn: Component = { type: "paragraph", text: lex.sentences[9]! }
  const menuFace = getThemeDefinition(themeId).menu.content[kind]?.face
  const renderingThemeId =
    menuFace !== undefined
      ? themeId
      : ensureGalleryFaceTheme(themeId, kind === "quote" ? "pull-quote" : "narrow-column", "content", kind)

  const slide = {
    type: "content",
    kind,
    heading:
      cartesian && component.chart_type === "scatter"
        ? lex.scatterHeading
        : component.type === "device_mockup"
        ? headingThatFitsAnywhere(lex, themeId)
        : lex.headings[8]!,
    subheading: cartesian
      ? component.chart_type === "scatter"
        ? lex.scatterSubhead
        : lex.sentences[3]
      : undefined,
    components: solo ? [component] : [leadIn, component],
    footnote: bubble ? lex.bubbleSizeNote : chart || !solo ? lex.sources[2]!.label : undefined,
  } as unknown as Slide
  const safeId = componentId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
  return deckShell(lex, assets, renderingThemeId, `component-${safeId}-${lex.id}`, [slide])
}

/**
 * A page whose theme's own face for `kind` cannot hold it, so the face hands
 * it to the shared step-aside (`src/render/step-aside.tsx`).
 *
 * The gallery corpus is Chinese and comfortably inside every face, which is
 * why not one of its other pages steps aside — good news for the faces and
 * no coverage at all for the rendering that stands in when one cannot cope.
 *
 * The content is the corpus's own. Each of these pages is one component from
 * `COMPONENT_BUILDERS`, in the theme's native lexicon, under the same
 * one-sentence lead-in `componentPage` puts above a component that does not
 * own its page. They are ordinary authored pages — a quarterly bar chart, a
 * roster, an onion — that happen to be a little more than the face they land
 * on can hold. That is the whole point: a reviewer should be able to look at
 * one and ask whether the page is good, which is not a question a
 * fourteen-series stress chart lets anyone answer.
 *
 * `branding: "full"` because that is the posture under review here. A
 * stepped-aside page has none of the face's own furniture, so the deck's
 * branding is the only thing left carrying the organization and the date,
 * and a reviewer needs to see whether it arrived.
 */
/** Both corpus builder tables, so a step-aside page can name a chart skin. */
const STEP_ASIDE_COMPONENT_BUILDERS: Record<string, (lex: Lexicon) => Component> = {
  ...COMPONENT_BUILDERS,
  ...CHART_VARIANTS,
}

export function stepAsidePage(
  lex: Lexicon,
  assets: CorpusAssets,
  themeId: string,
  kind: PageKind,
  componentId: string,
  opts: { withLeadIn?: boolean } = {},
): PptxIR {
  const build = STEP_ASIDE_COMPONENT_BUILDERS[componentId]
  if (!build) throw new Error(`unknown step-aside component id: ${componentId}`)
  const component = build(lex)
  // One sentence of argument above the thing it is arguing about, which is
  // how a real page carries a component that is not the whole page.
  //
  // From the far end of the pool, the same rule `componentPage` follows:
  // `rings` draws its own descriptions from `sentences[0]` onward, so a
  // lead-in taken from the same end printed the identical sentence twice on
  // the runway page, once above the onion and once inside its third ring. No
  // component builder reaches the far end — and `step-aside-corpus.test.mts`
  // holds that for every page here, as `corpus-scan.test.mts` does for the
  // whole corpus.
  const leadIn: Component = { type: "paragraph", text: lex.sentences[6]! }
  const slide = {
    type: "content",
    kind,
    heading: lex.headings[8]!,
    subheading: lex.sentences[3],
    components: opts.withLeadIn === false ? [component] : [leadIn, component],
    footnote: lex.sources[2]!.label,
  } as unknown as Slide
  return {
    ...deckShell(lex, assets, themeId, `step-aside-${themeId}-${lex.id}`, [slide]),
    branding: "full",
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Composition table: one page per shared composition
// ─────────────────────────────────────────────────────────────────────────

interface CompositionBody {
  readonly heading: string
  readonly components: Component[]
  readonly footnote?: string
  /** The section a yearbook page names beside its sprout. */
  readonly kicker?: string
  /** The years a yearbook page is about, lit on its strip. */
  readonly years?: NonNullable<Slide["years"]>
  /** What the page as a whole rests on, set by the compositions that take one. */
  readonly tag?: NonNullable<Slide["tag"]>
  /** The boxes a quiz page ticks beside each question. */
  readonly ballot?: NonNullable<Slide["ballot"]>
}

/**
 * The page each shared composition (`src/layouts/compositions/`) takes, built
 * from the corpus' own pools in the exact shape that composition recognises.
 *
 * A theme section's other bands reach a composition only by accident: the
 * component band puts a lead-in sentence above most components, which is a
 * second component, and every composition but `rows` takes its component
 * alone. So without these pages an options table, a phase plan and a team
 * tree were never drawn by the review at all.
 *
 * Each page also carries the author mark its composition has a look for: the
 * recommended option, the marked phase, the marked series. `rows` writes its
 * items as "label：value" from `metrics`, where label and value are one
 * authored fact, so the page shows the two-column split no other page does.
 * `composition-corpus.test.mts` holds every page to being drawn by the
 * composition it names, whole.
 */
const COMPOSITION_BODIES: Record<CompositionId, (lex: Lexicon) => CompositionBody> = {
  // proposal's binder sheet: what the client gets, a day's bands, places as
  // cards, the sum, what moves it, a day's earnings, what has moved, the
  // parts, the ways to pay, public records, safeguards, the risks, the steps,
  // the quote and the papers to hand over.
  ...BINDER_BODIES,
  rows: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      { type: "bullets", items: lex.metrics.slice(1, 4).map((m) => `${m.label}${lex.id === "en" ? ": " : "："}${m.value}${m.unit ?? ""}`) },
      { type: "callout", variant: "info", text: lex.verdicts.positive },
    ],
  }),
  table: (lex) => {
    const comparison = COMPONENT_BUILDERS.comparison!(lex)
    return {
      heading: lex.headings[9]!,
      components: [comparison.type === "comparison" ? { ...comparison, recommended: 1 } : comparison],
    }
  },
  waves: (lex) => {
    const roadmap = COMPONENT_BUILDERS.roadmap!(lex)
    return {
      heading: lex.headings[11]!,
      components: [
        roadmap.type === "roadmap"
          ? { ...roadmap, items: roadmap.items.map((item, i) => (i === 0 ? { ...item, emphasis: true as const } : item)) }
          : roadmap,
      ],
    }
  },
  // The root and the managers under it, without their reports: the
  // composition is a two-level team, and a deeper tree is the org chart's.
  tree: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "org_tree",
        root: { name: lex.orgChart.root.name, role: lex.orgChart.root.role },
        children: lex.orgChart.managers.map((manager) => ({ name: manager.name, role: manager.role })),
      },
    ],
  }),
  // Three headline numbers over the quote the page is about.
  figures: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      { type: "kpi_cards", items: figureItems(lex, 3) },
      { type: "blockquote", text: lex.quote.text, attribution: lex.quote.attribution },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // The timeline across the page, its third milestone marked, over a
  // closing line.
  track: (lex) => ({
    heading: lex.headings[11]!,
    components: [COMPONENT_BUILDERS.timeline!(lex), { type: "callout", variant: "info", text: lex.verdicts.positive }],
    footnote: lex.sources[0]!.label,
  }),
  // A photograph beside a list of facts written "label：value".
  pairs: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      COMPONENT_BUILDERS.image!(lex),
      { type: "bullets", items: lex.metrics.slice(0, 4).map((m) => `${m.label}${lex.id === "en" ? ": " : "："}${m.value}${m.unit ?? ""}`) },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Upright bars, the second series marked, its last value a forecast, and
  // the change between the two series in the last period bracketed.
  columns: (lex) => {
    const periods = lex.periods.slice(0, 3)
    const second = lex.labels[9]!
    return {
      heading: lex.headings[0]!,
      components: [
        {
          type: "chart",
          chart_type: "bar",
          axes: { y_unit: lex.metrics[0]!.unit },
          changes: [{ from: lex.labels[8]!, to: second, at: periods[2]! }],
          series: [
            { name: lex.labels[8]!, data: periods.map((x, i) => ({ x, y: 42 + i * 11 })) },
            {
              name: second,
              emphasis: true,
              data: periods.map((x, i) => ({ x, y: 30 + i * 6, ...(i === 2 ? { status: "forecast" as const } : {}) })),
            },
          ],
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // Bars across, two series per row, the change at the first row stated.
  bars: (lex) => {
    const rows = lex.labels.slice(8, 12)
    return {
      heading: lex.headings[2]!,
      components: [
        {
          type: "chart",
          chart_type: "bar",
          direction: "horizontal",
          axes: { y_title: lex.metrics[1]!.label, y_unit: "%" },
          changes: [{ from: lex.periods[0]!, to: lex.periods[1]!, at: rows[0]! }],
          series: [
            { name: lex.periods[0]!, data: rows.map((x, i) => ({ x, y: 27.8 - i * 6.1 })) },
            { name: lex.periods[1]!, emphasis: true, data: rows.map((x, i) => ({ x, y: 23.3 - i * 5.2 })) },
          ],
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // A bridge whose levels sit far above zero, so its axis starts at a floor,
  // one of its steps marked.
  bridge: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      {
        type: "waterfall",
        unit: lex.metrics[0]!.unit,
        items: [
          { label: lex.periods[0]!, value: 4172, kind: "total" },
          { label: lex.phrases[0]!, value: -132 },
          { label: lex.phrases[2]!, value: -687, emphasis: true },
          { label: lex.periods[1]!, value: 3353, kind: "total" },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // A data table with one highlighted row over a warning.
  records: (lex) => {
    const table = COMPONENT_BUILDERS.data_table!(lex)
    return {
      heading: lex.headings[9]!,
      components: [
        table.type === "data_table" ? { ...table, source: undefined, rows: table.rows.filter((row) => row.emphasis !== "total") } : table,
        { type: "callout", variant: "warn", text: lex.verdicts.warning },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // Two figures, the second marked, beside a titled list.
  stack: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "kpi_cards",
        items: figureItems(lex, 2).map((item, i) => (i === 1 ? { ...item, value: `**${item.value}**` } : item)),
      },
      {
        type: "insight_panel",
        title: lex.chapters[0]!,
        rows: lex.phrases.slice(0, 4).map((label, i) => ({ label, text: lex.sentences[i]! })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Three periods, the first two one marked window, over three facts.
  window: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "gantt",
        axis_labels: lex.periods.slice(0, 3),
        items: [
          { label: lex.stages[0]!, text: lex.phrases[0]!, start: 0, end: 2, emphasis: true },
          { label: lex.stages[1]!, text: lex.phrases[1]!, start: 2, end: 3 },
        ],
      },
      {
        type: "kpi_cards",
        items: lex.metrics.slice(0, 3).map((metric, i) => ({ label: metric.label, value: `${metric.value}${metric.unit ?? ""}`, note: lex.periods[i]! })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Six milestones on two lanes, one highlighted, over a closing note.
  lanes: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "timeline",
        lanes: [lex.labels[8]!, lex.labels[9]!],
        milestones: lex.stages.slice(0, 6).map((title, i) => ({
          date: lex.periods[i % lex.periods.length]!,
          title,
          desc: lex.phrases[i]!,
          lane: i % 2 === 0 ? lex.labels[9]! : lex.labels[8]!,
          highlight: i === 1,
        })),
      },
      { type: "callout", variant: "info", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // One whole as a share bar, its first two parts marked, over two figures
  // the face draws in the band under it.
  share: (lex) => {
    const whole = lex.chapters[1]!
    return {
      heading: lex.headings[3]!,
      components: [
        {
          type: "chart",
          chart_type: "stacked",
          direction: "horizontal",
          axes: { y_unit: lex.metrics[0]!.unit },
          series: lex.labels.slice(8, 12).map((name, i) => ({
            name,
            ...(i < 2 ? { emphasis: true as const } : {}),
            data: [{ x: whole, y: [1202, 640, 1539, 448][i]! }],
          })),
        },
        { type: "kpi_cards", items: figureItems(lex, 2) },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // Four numbered panels, the second the one the page lands on.
  tiles: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(0, 4).map((title, i) => ({ title, text: lex.sentences[i + 2]!, ...(i === 1 ? { emphasis: true } : {}) })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // A move per row from a first value to a later one, one row falling, the
  // values titled and in their unit.
  shifts: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "chart",
        chart_type: "dumbbell",
        axes: { x_title: lex.chapters[0]!, x_unit: lex.metrics[0]!.unit },
        series: [
          { name: lex.periods[0]!, data: lex.labels.slice(8, 12).map((x, i) => ({ x, y: [1800, 2000, 1250, 1900][i]! })) },
          { name: lex.periods[1]!, data: lex.labels.slice(8, 12).map((x, i) => ({ x, y: [2000, 2200, 1375, 1750][i]! })) },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Eight short titles in two columns, the first the one the page lands on,
  // over a closing line.
  roster: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      { type: "numbered_cards", items: lex.phrases.slice(0, 8).map((title, i) => ({ title, ...(i === 0 ? { emphasis: true } : {}) })) },
      { type: "callout", variant: "info", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // The track's own promises scored as a table, the one off track the mark.
  // The card's note already names the first source, so the page cites the
  // second.
  scores: (lex) => ({
    heading: lex.headings[9]!,
    components: [COMPONENT_BUILDERS.scorecard!(lex)],
    footnote: lex.sources[1]!.label,
  }),
  // The plan's statement in a block beside its targets, one target marked
  // and tagged, another tagged.
  targets: (lex) => {
    const plan = COMPONENT_BUILDERS.from_to!(lex)
    return {
      heading: lex.headings[3]!,
      components: [
        { type: "insight_panel", title: lex.chapters[0]!, rows: [{ label: lex.labels[8]!, text: lex.sentences[0]! }], footnote: lex.verdicts.positive },
        plan.type === "from_to"
          ? {
              ...plan,
              label_column: lex.labels[12]!,
              rows: plan.rows.map(({ change: _change, ...row }, i) => ({
                ...row,
                ...(i === 1 ? { tag: { text: lex.labels[13]! }, emphasis: true } : i === 3 ? { tag: { text: lex.labels[14]! } } : {}),
              })),
            }
          : plan,
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // One series over five periods, a target range tinted behind it.
  trend: (lex) => ({
    heading: lex.headings[0]!,
    components: [
      {
        type: "chart",
        chart_type: "line",
        axes: { y_title: lex.metrics[2]!.label, y_unit: "%" },
        series: [{ name: lex.metrics[2]!.label, data: lex.periods.slice(0, 5).map((x, i) => ({ x, y: [5.4, 5.2, 4.8, 4.5, 5.0][i]! })) }],
        bands: [{ from: 4.5, to: 5, label: lex.labels[10]! }],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Four completion rates with the amounts behind them, the last marked.
  rings: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "progress_donuts",
        items: lex.metrics.slice(0, 4).map((metric, i) => ({
          value: ["90.5%", "66.6%", "60.5%", "100%"][i]!,
          label: metric.label,
          detail: lex.periods[i]!,
          ...(i === 3 ? { emphasis: true } : {}),
        })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // The combo chart with its rate line marked, the series the column then
  // sets over the emphasis stroke.
  rail: (lex) => {
    const chart = CHART_VARIANTS["chart · combo"]!(lex)
    return {
      heading: lex.headings[0]!,
      components: [
        chart.type === "chart"
          ? { ...chart, series: chart.series.map((series) => (series.plot === "line" ? { ...series, emphasis: true as const } : series)) }
          : chart,
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // terminal's terminal window: a short listing with comments, quoted lines
  // and one line marked.
  listing: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "code",
        language: "text",
        title: "notes / quotes.txt",
        code: [`# ${lex.chapters[0]!}`, `"${lex.sentences[0]!}"`, "", `# ${lex.chapters[1]!}`, `"${lex.sentences[1]!}"`].join("\n"),
        highlight_lines: [5],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's log: six times down one rule, each turn's tone a dot, the
  // recovery highlighted, two durations to scale and a quoted note beside it.
  log: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "timeline",
        title: lex.chapters[1]!,
        milestones: lex.phrases.slice(0, 6).map((title, i) => ({
          date: ["06:48", "09:40", "11:14", "12:30", "16:36", "21:20"][i]!,
          title,
          desc: lex.labels[i]!,
          tone: (["danger", "success", "warning", "danger", "warning", "success"] as const)[i]!,
          ...(i === 1 ? { highlight: true } : {}),
        })),
      },
      { type: "kpi_cards", items: [{ value: "**2h52m**", label: lex.labels[6]! }, { value: "14h32m", label: lex.labels[7]!, tone: "danger" }] },
      { type: "callout", variant: "info", text: `${lex.labels[8]!}：${lex.verdicts.positive}` },
      { type: "callout", variant: "warn", icon: "siren", text: `${lex.labels[9]!}："${lex.sentences[0]!}"` },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // The same two durations alone: the board's cascade page without its log.
  span: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      { type: "kpi_cards", items: [{ value: "**2h52m**", label: lex.labels[6]! }, { value: "14h32m", label: lex.labels[7]!, tone: "danger" }] },
      { type: "callout", variant: "info", text: `${lex.labels[8]!}：${lex.verdicts.positive}` },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's pictures over their figures: three photographs, each with
  // where and when, its figure and what happened, and a banner under them.
  plates: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      { type: "image_grid", items: PHOTO_ASSETS.slice(0, 3).map((asset_id, i) => ({ asset_id, caption: lex.captions[i]! })) },
      { type: "kpi_cards", items: lex.metrics.slice(0, 3).map((metric) => ({ value: metric.unit ? `${metric.value} ${metric.unit}` : metric.value, label: metric.label })) },
      { type: "callout", variant: "tip", icon: "shield-check", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's paths: four failure points, each beside its fix, the second
  // the one the page warns about.
  paths: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      {
        type: "issue_tree",
        question: lex.labels[0]!,
        children_column: lex.labels[1]!,
        branches: lex.phrases.slice(0, 4).map((label, i) => ({
          label,
          note: lex.labels[i + 2]!,
          icon: (["globe", "key-round", "git-branch", "database"] as const)[i]!,
          children: [{ label: lex.labels[i + 6]! }],
          ...(i === 1 ? { emphasis: true as const } : {}),
        })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's screen: a dashboard in a browser beside four log lines, two
  // of them bad news and the last the page's answer.
  screen: (lex) => ({
    heading: lex.headings[8]!,
    components: [
      { type: "device_mockup", device: "browser", asset_id: PHOTO_ASSETS[0]!, url: "status.internal / overview" },
      {
        type: "row_cards",
        items: lex.labels.slice(0, 4).map((title, i) => ({
          icon: (["bell-off", "radio-tower", "shield-check", "flag"] as const)[i]!,
          title,
          text: lex.phrases[i]!,
          ...(i < 2 ? { tone: "danger" as const } : {}),
          ...(i === 3 ? { highlight: true } : {}),
        })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's HUD cards: five findings with their icons and where each came
  // from, and the way forward in the sixth cell.
  cards: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      {
        type: "icon_cards",
        items: lex.phrases.slice(0, 5).map((title, i) => ({
          icon: (["repeat", "layers", "refresh-cw", "log-in", "hard-drive"] as const)[i]!,
          title,
          text: lex.sentences[i + 2]!,
          tag: { text: lex.periods[i]! },
        })),
      },
      { type: "callout", variant: "tip", icon: "timer", text: `${lex.labels[0]!}：${lex.verdicts.positive}` },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's typed memorandum: the page's points beside a photograph pasted in
  // as an exhibit, a remark in the mark under it.
  annex: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      { type: "bullets", items: lex.bullets.slice(0, 4) },
      { type: "image", asset_id: PHOTO_ASSETS[0], caption: lex.captions[0]!, fit: "cover" },
      { type: "callout", variant: "info", text: lex.verdicts.warning },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's reasons: three rows, each its icon, its name, its figure in the
  // mark and the sentence behind it.
  tallies: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "kpi_cards",
        // The three short figures: a tally's figure is set at 48px in a 160px column.
        items: [0, 4, 5]
          .map((m) => lex.metrics[m]!)
          .map((metric, i) => ({
            icon: (["piggy-bank", "hourglass", "clock"] as const)[i]!,
            value: metric.value,
            ...(metric.unit ? { unit: metric.unit } : {}),
            label: metric.label,
            note: lex.sentences[[2, 9, 10][i]!]!,
          })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's slope charts: three measures before and after for two groups,
  // the first marked, and the authors' caveat beside them.
  slopes: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      ...[0, 1, 2].map(
        (i): Component => ({
          type: "chart",
          chart_type: "line",
          axes: { y_title: lex.labels[i]! },
          series: [
            {
              name: lex.labels[12]!,
              emphasis: true,
              data: [
                { x: lex.periods[0]!, y: [2.8, 2.9, 3.0][i]! },
                { x: lex.periods[4]!, y: [2.4, 3.3, 3.3][i]! },
              ],
            },
            {
              name: lex.labels[13]!,
              data: [
                { x: lex.periods[0]!, y: [2.9, 2.9, 3.1][i]! },
                { x: lex.periods[4]!, y: [2.9, 2.9, 3.1][i]! },
              ],
            },
          ],
        }),
      ),
      {
        type: "callout",
        variant: "warn",
        icon: "triangle-alert",
        text: `${lex.kickers[4]!}${colonOf(lex)}“${lex.bullets[4]!}” ${lex.verdicts.neutral}`,
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's diverging bars: who got better and who got worse on four
  // measures, the last one's worse share marked, and the figure beside them.
  diverging: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "chart",
        chart_type: "percent_stacked",
        series: [
          { name: lex.labels[12]!, tone: "success", data: lex.phrases.slice(0, 4).map((x, i) => ({ x, y: [62, 35, 20, 8][i]! })) },
          { name: lex.labels[13]!, data: lex.phrases.slice(0, 4).map((x, i) => ({ x, y: [20, 45, 50, 30][i]! })) },
          {
            name: lex.labels[14]!,
            tone: "danger",
            data: lex.phrases.slice(0, 4).map((x, i) => ({ x, y: [18, 20, 30, 62][i]!, ...(i === 3 ? { emphasis: true } : {}) })),
          },
        ],
      },
      {
        type: "kpi_cards",
        items: [
          {
            value: lex.metrics[0]!.value,
            ...(lex.metrics[0]!.unit ? { unit: lex.metrics[0]!.unit } : {}),
            label: lex.metrics[0]!.label,
            note: lex.periods[0]!,
          },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's quoted original: the quote typed as written, what it means, and
  // the two figures it is read against in a panel with their shared note.
  citation: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      { type: "blockquote", text: lex.quote.text, attribution: lex.quote.attribution },
      { type: "callout", variant: "info", text: `${lex.kickers[5]!}${colonOf(lex)}${lex.verdicts.positive}` },
      {
        type: "kpi_cards",
        items: lex.metrics
          .slice(0, 2)
          .map((metric, i) => ({
            value: i === 0 ? `**${metric.value}**` : metric.value,
            ...(metric.unit ? { unit: metric.unit } : {}),
            label: metric.label,
          })),
      },
      { type: "callout", variant: "info", text: `${lex.kickers[2]!}${colonOf(lex)}${lex.verdicts.neutral}` },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's weighing: the case for and against a proposal, and the verdict in
  // a banner of ink.
  scales: (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "pros_cons",
        pros: { title: lex.debate.forTitle, items: lex.debate.pros.slice(0, 3) },
        cons: { title: lex.debate.againstTitle, items: lex.debate.cons.slice(0, 4) },
        verdict: lex.debate.verdict,
      },
    ],
    footnote: lex.sources[2]!.label,
  }),
  // memo's options under their photographs: three columns, the second the
  // recommended one with its label.
  catalog: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      { type: "image_grid", items: PHOTO_ASSETS.slice(0, 3).map((asset_id, i) => ({ asset_id, caption: lex.phrases[i + 6]! })) },
      {
        type: "comparison",
        columns: lex.phrases.slice(6, 9),
        recommended: 1,
        recommended_label: lex.kickers[3]!,
        rows: [0, 1].map((r) => ({ label: lex.labels[r]!, cells: [0, 1, 2].map((c) => lex.bullets[(r * 3 + c) % lex.bullets.length]!) })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's rota: six people across five days, each off one day, and how many
  // are in each day.
  rota: (lex) => {
    const off = lex.id === "zh" ? "休" : "Off"
    const days = lex.periods.slice(0, 5)
    return {
      heading: lex.headings[10]!,
      components: [
        {
          type: "data_table",
          title: lex.chapters[3]!,
          columns: [{ key: "who", label: lex.kickers[0]! }, ...days.map((label, d) => ({ key: `d${d}`, label }))],
          rows: [
            ...lex.people
              .slice(0, 6)
              .map((person, p) => ({
                icon: "user" as const,
                cells: Object.fromEntries([["who", person.name], ...days.map((_, d) => [`d${d}`, d === p % 5 ? off : ""])]),
              })),
            {
              emphasis: "total" as const,
              cells: Object.fromEntries([
                ["who", lex.id === "zh" ? "在岗" : "In"],
                ...days.map((_, d) => [`d${d}`, d === 0 ? "4 / 6" : "5 / 6"]),
              ]),
            },
          ],
        },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  // memo's sum on ruled paper: three lines of working, the answer in the
  // mark, and a note beside the pad.
  sum: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "bullets",
        items: [
          `${lex.metrics[1]!.label}${colonOf(lex)}6500 × 22 = 143000`,
          `${lex.labels[2]!}${colonOf(lex)}2100 × 22 = 46200`,
          `${lex.labels[0]!}${colonOf(lex)}143000 + 46200 = 189200`,
        ],
      },
      { type: "kpi_cards", items: [{ value: "18.9", unit: lex.id === "zh" ? "万" : "k", label: lex.labels[0]! }] },
      { type: "callout", variant: "info", text: `${lex.kickers[4]!}${colonOf(lex)}${lex.bullets[4]!}\n${lex.verdicts.warning}` },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // memo's calendar: three stretches over five months, the second marked,
  // over the dates as a typed table.
  schedule: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      {
        type: "gantt",
        axis_labels: lex.periods.slice(0, 5),
        items: [
          { label: lex.stages[0]!, start: 0, end: 1 },
          { label: lex.stages[2]!, start: 1, end: 4, emphasis: true },
          { label: lex.stages[5]!, start: 4, end: 5 },
        ],
      },
      {
        type: "timeline",
        milestones: [0, 1, 3, 5].map((s, i) => ({
          date: lex.periods[[0, 1, 3, 4][i]!]!,
          title: lex.stages[s]!,
          desc: lex.labels[i + 4]!,
          ...(i === 2 ? { highlight: true } : {}),
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  // memo's checklist: four conditions, each its kind and measure and the
  // threshold, and what happens once one trips in a banner.
  checks: (lex) => ({
    heading: lex.headings[8]!,
    components: [
      {
        type: "row_cards",
        items: [0, 1, 2, 3].map((i) => ({
          icon: (["wallet", "hourglass", "hammer", "heart-pulse"] as const)[i]!,
          title: `${lex.labels[i]!}${colonOf(lex)}${lex.phrases[i + 2]!}`,
          text: lex.bullets[i + 1]!,
        })),
      },
      { type: "callout", variant: "warn", icon: "circle-stop", text: lex.verdicts.warning },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // clinic's figure cards: three figures, each naming the kind of source it
  // comes from, the second the one the page argues from, over a share bar
  // whose first two parts are marked.
  readings: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "kpi_cards",
        items: [0, 1, 2].map((i) => ({
          icon: (["hospital", "trending-down", "hourglass"] as const)[i]!,
          value: i === 1 ? `**${lex.metrics[i]!.value}**` : lex.metrics[i]!.value,
          ...(lex.metrics[i]!.unit ? { unit: lex.metrics[i]!.unit } : {}),
          label: lex.metrics[i]!.label,
          note: lex.periods[i]!,
          tag: { text: lex.labels[i + 4]!, evidence: (["official", "press", "company"] as const)[i]! },
        })),
      },
      {
        type: "chart",
        chart_type: "stacked",
        direction: "horizontal",
        axes: { y_unit: "%" },
        series: [
          { name: lex.labels[9]!, emphasis: true, data: [{ x: lex.segmentAxis, y: 16.4 }] },
          { name: lex.labels[8]!, emphasis: true, data: [{ x: lex.segmentAxis, y: 34.3 }] },
          { name: lex.labels[7]!, data: [{ x: lex.segmentAxis, y: 49.3 }] },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // clinic's photograph beside its cases: four cases, the first two bad news.
  inset: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      { type: "image", asset_id: PHOTO_ASSETS[0], caption: lex.captions[0]!, fit: "cover" },
      dossierCases(lex),
    ],
    footnote: lex.sources[0]!.label,
  }),
  // The cases alone, across the body.
  docket: (lex) => ({
    heading: lex.headings[3]!,
    components: [dossierCases(lex)],
    footnote: lex.sources[0]!.label,
  }),
  // Four groups against their controls, the third control moving the other
  // way, and how much more each group did beside them.
  controlled: (lex) => {
    const rows = [0, 1, 2, 3].map((i) => `${lex.labels[i + 11]!} · ${lex.phrases[i]!} · ${lex.periods[i]!}`)
    return {
      heading: lex.headings[4]!,
      components: [
        {
          type: "chart",
          chart_type: "bar",
          direction: "horizontal",
          axes: { y_title: lex.segmentAxis, x_title: lex.labels[0]!, y_unit: "%" },
          series: [
            { name: lex.labels[6]!, emphasis: true, data: rows.map((x, i) => ({ x, y: [-17.5, -14.01, -12.1, -11.8][i]! })) },
            { name: lex.labels[5]!, data: rows.map((x, i) => ({ x, y: [-2.3, 0.3, -2.2, -3.5][i]! })) },
          ],
        },
        {
          type: "kpi_cards",
          items: [0, 1, 2, 3].map((i) => ({ value: ["15.2", "14.3", "9.9", "8.3"][i]!, unit: "%", label: lex.labels[i + 11]!, note: lex.labels[15]! })),
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // Two options head to head: their headline figures, their shares reaching
  // four marks from one company's figures, and three side effects.
  duel: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      { type: "kpi_cards", items: [0, 1].map((i) => ({ value: ["−20.2%", "−13.7%"][i]!, label: lex.phrases[i]!, note: lex.periods[i]! })) },
      {
        type: "chart",
        chart_type: "bar",
        axes: { y_title: lex.labels[0]!, y_unit: "%" },
        tag: { text: lex.labels[5]!, evidence: "company" },
        series: [0, 1].map((s) => ({
          name: lex.phrases[s]!,
          data: [0, 1, 2, 3].map((c) => ({ x: lex.labels[c + 11]!, y: [[81.6, 64.6, 48.4, 31.6], [60.5, 40.1, 27.3, 16.1]][s]![c]! })),
        })),
      },
      {
        type: "data_table",
        columns: [
          { key: "m", label: "" },
          { key: "a", label: lex.phrases[0]! },
          { key: "b", label: lex.phrases[1]! },
        ],
        rows: [0, 1, 2].map((i) => ({ cells: { m: lex.labels[i + 11]!, a: ["43.6%", "15.0%", "6.1%"][i]!, b: ["44.4%", "21.3%", "8.0%"][i]! } })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // An outcome trial's endpoints and its forest plot, the first marked, and a
  // trial still to report under it.
  forest: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "e", label: lex.segmentAxis },
          { key: "t", label: lex.phrases[0]!, align: "right" as const },
          { key: "c", label: lex.phrases[1]!, align: "right" as const },
          { key: "hr", label: "HR (95% CI)", align: "right" as const },
        ],
        rows: [0, 1, 2, 3].map((i) => ({
          cells: { e: lex.labels[i + 11]!, t: ["6.5%", "2.5%", "4.3%", "3.4%"][i]!, c: ["8.0%", "3.0%", "5.2%", "4.1%"][i]!, hr: ["0.80 (0.72-0.90)", "0.85 (0.71-1.01)", "0.81 (0.71-0.93)", "0.82 (0.71-0.96)"][i]! },
          ...(i === 0 ? { emphasis: "highlight" as const } : {}),
        })),
      },
      { type: "callout", variant: "warn", icon: "hourglass", text: lex.verdicts.warning },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Three groups' rates against their controls on three measures, beside the
  // risks to watch.
  multiples: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      {
        type: "data_table",
        title: lex.segmentAxis,
        columns: [
          { key: "d", label: lex.labels[6]! },
          { key: "a", label: lex.labels[0]! },
          { key: "b", label: lex.labels[1]! },
          { key: "c", label: lex.labels[2]! },
        ],
        rows: [0, 1, 2].flatMap((i) => [
          { cells: { d: lex.phrases[i]!, a: ["44%", "28%", "50.5%"][i]!, b: ["24%", "13%", "43.1%"][i]!, c: ["6.8%", "6.7%", "1.0%"][i]! }, tag: { text: lex.labels[i + 11]!, evidence: "label" as const }, ...(i === 2 ? { emphasis: "highlight" as const } : {}) },
          { cells: { d: lex.labels[5]!, a: ["16%", "8%", "5.9%"][i]!, b: ["6%", "2%", "2.9%"][i]!, c: ["3.2%", "3.4%", "1.0%"][i]! } },
        ]),
      },
      {
        type: "row_cards",
        items: [0, 1, 2, 3].map((i) => ({ icon: (["shield-alert", "triangle-alert", "eye", "bed"] as const)[i]!, title: lex.phrases[i + 4]!, text: lex.sentences[i + 2]!, tone: i === 0 ? ("danger" as const) : ("warning" as const) })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // Two groups that walk one road and part at a randomization, the regain
  // pinned on its branch, the evidence that says the same beside it.
  fork: (lex) => {
    const weeks = ["0", "36 · " + lex.labels[3]!, "88"]
    return {
      heading: lex.headings[8]!,
      components: [
        {
          type: "chart",
          chart_type: "line",
          axes: { y_unit: "%" },
          series: [
            { name: lex.labels[6]!, emphasis: true, data: weeks.map((x, i) => ({ x, y: [0, -20.9, -25.3][i]! })) },
            { name: lex.labels[5]!, tone: "warning" as const, data: weeks.map((x, i) => ({ x, y: [0, -20.9, -9.9][i]! })) },
          ],
        },
        { type: "callout", variant: "info", text: lex.labels[8]! },
        { type: "kpi_cards", items: [0, 1, 2].map((i) => ({ label: lex.phrases[i + 6]!, value: lex.metrics[i]!.value, note: lex.periods[i]! })) },
        { type: "callout", variant: "warn", icon: "trending-up", text: lex.verdicts.warning },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  // Who qualifies where on one scale: two bands a row, a row of its own and
  // a breach, and the note under the legend.
  ruler: (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "comparison",
        title: "BMI",
        tag_column: lex.labels[15]!,
        columns: [lex.labels[8]!, lex.labels[9]!],
        rows: [
          { label: lex.phrases[0]!, cells: ["27 至 <30", "≥30"], tag: { text: lex.labels[7]! }, emphasis: true },
          { label: lex.phrases[1]!, cells: ["24 至 <28", "≥28"], tag: { text: lex.labels[11]!, quiet: true } },
          { label: lex.phrases[2]!, cells: ["", "≥27"], tag: { text: lex.labels[12]! } },
          { label: lex.phrases[3]!, cells: ["24 至 <28", ""], tag: { text: lex.labels[10]!, tone: "danger" as const } },
        ],
      },
      { type: "callout", variant: "info", text: lex.sentences[4]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // What each thing cost before and after, beside the reminder that goes
  // with the figures.
  dumbbells: (lex) => ({
    heading: lex.headings[10]!,
    components: [
      {
        type: "chart",
        chart_type: "dumbbell",
        axes: { x_title: lex.labels[0]!, x_unit: "元" },
        series: [
          { name: lex.periods[0]!, data: [0, 1, 2, 3].map((i) => ({ x: lex.phrases[i]!, y: [4758, 2758, 2463, 1894][i]! })) },
          { name: lex.periods[1]!, data: [0, 1, 2, 3].map((i) => ({ x: lex.phrases[i]!, y: [937, 551, 1284, 987][i]! })) },
        ],
      },
      { type: "insight_panel", icon: "receipt", title: lex.phrases[4]!, rows: [0, 1].map((i) => ({ label: lex.labels[i + 11]!, text: lex.sentences[i + 3]! })), footnote: lex.verdicts.warning },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // A check in five steps, the first two able to stop it, the stop box and a
  // note beside it.
  gate: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "steps",
        items: [0, 1, 2, 3, 4].map((i) => ({ icon: (["ruler", "ban", "pill", "file-check", "receipt"] as const)[i]!, title: lex.phrases[i]!, text: lex.bullets[i]!, ...(i < 2 ? { tone: "danger" as const } : {}) })),
      },
      { type: "callout", variant: "warn", icon: "ban", text: lex.verdicts.warning },
      { type: "callout", variant: "info", icon: "receipt-text", text: lex.sentences[10]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // What to check, a photograph, and when to look again.
  watch: (lex) => ({
    heading: lex.headings[12]!,
    components: [
      {
        type: "row_cards",
        items: [0, 1, 2].map((i) => ({ icon: (["activity", "shield-check", "calendar-check"] as const)[i]!, title: lex.labels[i + 11]!, text: `${lex.bullets[i]!}。${lex.bullets[i + 1]!}` })),
      },
      { type: "image", asset_id: PHOTO_ASSETS[1], fit: "cover" },
      {
        type: "timeline",
        title: lex.labels[15]!,
        milestones: [0, 1, 2, 3, 4].map((i) => ({ date: lex.periods[i]!, title: lex.phrases[i + 6]!, ...(i === 1 ? { highlight: true } : {}) })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // almanac's yearbook sheet sets the shapes as a long-run yearbook: the
  // section beside the sprout, the years the page is about lit on its strip,
  // and what a figure or a rule rests on as a pill. The farm's fifth year in
  // the shapes the board drew.
  motion: (lex) => yearbookAsk(lex),
  calendar: (lex) => ({
    heading: lex.headings[2]!,
    kicker: lex.kickers[0]!,
    years: { from: 2022, to: 2030, marked: [2026] },
    components: [
      {
        type: "timeline",
        periods: [
          { from: "2026-03", to: "2026-05", label: lex.labels[9]! },
          { from: "2026-06", to: "2026-08", label: lex.labels[10]! },
          { from: "2026-09", to: "2026-11", label: lex.labels[11]! },
        ],
        milestones: (["2026-03-05", "2026-06-05", "2026-07-22", "2026-09-23", "2026-11-22"] as const).map((date, i) => ({
          date,
          title: lex.stages[i]!,
          desc: lex.periods[i]!,
          ...(i === 2 ? { highlight: true } : {}),
        })),
      },
      { type: "kpi_cards", items: [0, 3, 4].map((m, i) => ({ value: i === 0 ? `**${lex.metrics[m]!.value}**` : lex.metrics[m]!.value, ...(lex.metrics[m]!.unit ? { unit: lex.metrics[m]!.unit } : {}), label: lex.metrics[m]!.label, note: lex.bullets[m]! })) },
      { type: "callout", variant: "info", icon: "droplets", title: lex.stages[2]!, text: lex.sentences[4]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  horizon: (lex) => {
    const years = [2022, 2023, 2024, 2025, 2026]
    const crops = [12, 16, 21, 24, Number(lex.metrics[2]!.value)]
    return {
      heading: lex.headings[1]!,
      kicker: lex.kickers[1]!,
      years: { from: 2022, to: 2030, marked: [2022, 2026] },
      components: [
        {
          type: "chart",
          chart_type: "line",
          axes: { ...(lex.metrics[0]!.unit ? { y_unit: lex.metrics[0]!.unit } : {}) },
          series: [
            { name: lex.labels[5]!, emphasis: true, data: years.map((y, i) => ({ x: String(y), y: [1.1, 1.5, 1.9, 2.4, 2.9][i]! })) },
            { name: lex.labels[3]!, data: years.map((y, i) => ({ x: String(y), y: [1.3, 1.5, 1.8, 2.1, 2.4][i]! })) },
            { name: lex.labels[6]!, data: years.map((y, i) => ({ x: String(y), y: [1.0, 1.2, 1.5, 1.8, 2.1][i]! })) },
          ],
        },
        {
          type: "timeline",
          title: lex.metrics[2]!.label,
          milestones: years.map((y, i) => ({ date: String(y), title: `${crops[i]!}${lex.metrics[2]!.unit ? ` ${lex.metrics[2]!.unit}` : ""}`, ...(i === years.length - 1 ? { highlight: true } : {}) })),
        },
        {
          type: "kpi_cards",
          items: [
            { value: `**${lex.metrics[0]!.value}**`, ...(lex.metrics[0]!.unit ? { unit: lex.metrics[0]!.unit } : {}), label: lex.labels[5]!, note: lex.bullets[0]!, icon: "sprout" as const },
            { value: "1.1", ...(lex.metrics[0]!.unit ? { unit: lex.metrics[0]!.unit } : {}), label: lex.positions.points[7]!.label, note: lex.sources[0]!.ref ?? lex.sources[0]!.label, icon: "hourglass" as const },
          ],
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  formula: (lex) => {
    const colon = colonOf(lex)
    // The year's books in thousands, which close on the lexicon's surplus.
    const unit = lex.id === "zh" ? "千元" : "k"
    return {
      heading: lex.headings[9]!,
      kicker: lex.kickers[4]!,
      years: { from: 2022, to: 2030, marked: [2026] },
      tag: { text: lex.sources[1]!.ref ?? lex.sources[1]!.label },
      components: [
        {
          type: "waterfall",
          unit,
          items: [
            { label: lex.labels[13]!, value: 847, kind: "total" as const },
            { label: lex.labels[14]!, value: 126.1 },
            { label: lex.chain.support[0]!.label, value: -314 },
            { label: lex.chain.support[1]!.label, value: -248 },
            { label: lex.chain.support[2]!.label, value: -408, emphasis: true },
            { label: lex.metrics[5]!.label, value: 3.1, kind: "total" as const },
          ],
        },
        { type: "code", language: "formula", title: lex.metrics[5]!.label, code: "S = R1 + R2\n  − C1 − C2 − C3" },
        {
          type: "bullets",
          items: [
            `R1${colon}${lex.labels[13]!}`,
            `R2${colon}${lex.labels[14]!}`,
            `C1${colon}${lex.chain.support[0]!.label}`,
            `C2${colon}${lex.chain.support[1]!.label}`,
            `C3${colon}${lex.chain.support[2]!.label}`,
          ],
        },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  errata: (lex) => ({
    heading: lex.headings[7]!,
    kicker: lex.kickers[4]!,
    years: { from: 2022, to: 2030, marked: [2026] },
    components: [
      {
        type: "comparison",
        columns: [lex.iceberg.aboveLabel, lex.iceberg.belowLabel],
        recommended: 1,
        // The farm's targets against its books, the shortfall marked, the
        // one it beat set small under it.
        rows: [0, 2, 1].map((g, i) => ({ label: lex.goals[g]!.title, cells: [lex.goals[g]!.target, lex.goals[g]!.actual], ...(i === 1 ? { emphasis: true } : {}) })),
      },
      { type: "callout", variant: "info", text: lex.callouts.info },
    ],
  }),
  breakdown: (lex) => {
    const area = lex.metrics[1]!
    return {
      heading: lex.headings[0]!,
      kicker: lex.kickers[0]!,
      years: { from: 2022, to: 2030, marked: [2026] },
      components: [
        {
          type: "chart",
          chart_type: "stacked",
          direction: "horizontal",
          axes: { ...(area.unit ? { y_unit: area.unit } : {}) },
          emphasis_label: `${lex.labels[5]!} 52${area.unit ? ` ${area.unit}` : ""}${lex.id === "zh" ? "，占 60%" : ", 60%"}`,
          series: [
            { name: lex.labels[5]!, emphasis: true, data: [{ x: area.label, y: 52 }] },
            { name: lex.labels[6]!, data: [{ x: area.label, y: 20 }] },
            { name: lex.labels[3]!, data: [{ x: area.label, y: 14 }] },
          ],
        },
        {
          type: "kpi_cards",
          items: [1, 2, 3].map((m, i) => ({
            value: i === 0 ? `**${lex.metrics[m]!.value}**` : lex.metrics[m]!.value,
            ...(lex.metrics[m]!.unit ? { unit: lex.metrics[m]!.unit } : {}),
            label: lex.metrics[m]!.label,
            note: lex.phrases[[9, 2, 6][i]!]!,
            icon: (["map", "sprout", "package"] as const)[i]!,
          })),
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  benchmark: (lex) => {
    const om = lex.metrics[0]!
    const points = [0, 1, 4].map((p) => lex.positions.points[p]!.label)
    return {
      heading: lex.headings[1]!,
      kicker: lex.kickers[1]!,
      years: { from: 2022, to: 2030, marked: [2026] },
      components: [
        { type: "image", asset_id: PHOTO_ASSETS[0], fit: "cover", caption: lex.captions[0]! },
        {
          type: "chart",
          chart_type: "bar",
          direction: "horizontal",
          axes: { y_title: om.label, ...(om.unit ? { y_unit: om.unit } : {}) },
          reference: { value: 2.8, label: lex.goals[1]!.target },
          series: [{ name: om.label, data: points.map((x, i) => ({ x, y: [2.9, 2.1, 1.2][i]!, ...(i === 0 ? { emphasis: true } : {}) })) }],
        },
        {
          type: "kpi_cards",
          items: [
            { value: `**${om.value}**`, ...(om.unit ? { unit: om.unit } : {}), label: points[0]!, note: lex.bullets[0]!, icon: "sprout" as const },
            { value: "1.2", ...(om.unit ? { unit: om.unit } : {}), label: points[2]!, note: lex.sources[0]!.ref ?? lex.sources[0]!.label, icon: "scale" as const },
          ],
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  paired: (lex) => {
    const renewal = lex.metrics[3]!
    const years = [2022, 2023, 2024, 2025, 2026]
    return {
      heading: lex.headings[7]!,
      kicker: lex.kickers[4]!,
      years: { from: 2022, to: 2030, marked: [2022, 2026] },
      components: [
        {
          type: "chart",
          chart_type: "bar",
          axes: { y_title: renewal.label, ...(renewal.unit ? { y_unit: renewal.unit } : {}) },
          series: [
            { name: lex.labels[14]!, data: years.map((y, i) => ({ x: String(y), y: [55, 58, 60, 61, 63][i]! })) },
            { name: lex.labels[13]!, emphasis: true, data: years.map((y, i) => ({ x: String(y), y: [62, 70, 78, 83, Number(renewal.value)][i]! })) },
          ],
        },
        { type: "image", asset_id: PHOTO_ASSETS[2], fit: "cover", caption: lex.captions[1]! },
        {
          type: "callout",
          variant: "warn",
          icon: "file-text",
          title: lex.threats[1]!,
          text: lex.callouts.warn,
          tag: { text: lex.phrases[6]!, basis: "pending" },
        },
      ],
    }
  },
  procedure: (lex) => ({
    heading: lex.headings[6]!,
    kicker: lex.kickers[2]!,
    years: { from: 2022, to: 2030, marked: [2026] },
    components: [
      {
        type: "steps",
        items: [0, 1, 2, 3].map((i) => ({
          icon: (["sprout", "bird", "droplets", "wheat"] as const)[i]!,
          title: i === 1 ? `**${lex.stages[i]!}**` : lex.stages[i]!,
          text: lex.sentences[[3, 5, 4, 8][i]!]!,
        })),
      },
      {
        type: "comparison",
        columns: [lex.labels[6]!, lex.labels[5]!],
        recommended: 1,
        rows: [
          { label: lex.metrics[0]!.label, cells: [`2.1${lex.metrics[0]!.unit ?? ""}`, `2.9${lex.metrics[0]!.unit ?? ""}`] },
          { label: lex.phrases[3]!, cells: [lex.debate.pros[1]!.note!, lex.debate.pros[1]!.label] },
          { label: lex.labels[13]!, cells: [lex.debate.pros[3]!.note!, lex.debate.pros[3]!.label] },
        ],
      },
    ],
  }),
  magnitude: (lex) => {
    const om = lex.metrics[0]!
    const unit = om.unit ?? ""
    return {
      heading: lex.headings[1]!,
      kicker: lex.kickers[1]!,
      years: { from: 2022, to: 2030, marked: [2022, 2026] },
      components: [
        { type: "kpi_cards", items: [{ value: `**${om.value}${unit}**`, label: om.label, note: lex.sentences[1]!, tag: { text: lex.sources[0]!.label } }] },
        { type: "code", language: "formula", code: `${om.value}${unit} ÷ 1.1${unit} ≈ 2.6` },
        {
          type: "chart",
          chart_type: "bar",
          direction: "horizontal",
          axes: { y_title: om.label, ...(om.unit ? { y_unit: om.unit } : {}) },
          series: [
            {
              name: om.label,
              data: [
                { x: lex.positions.points[0]!.label, y: Number(om.value) },
                { x: lex.positions.points[7]!.label, y: 1.1, emphasis: true, note: "2022" },
              ],
            },
          ],
        },
        { type: "kpi_cards", items: [{ value: "2.6×", label: lex.bullets[0]!, note: lex.sources[0]!.ref ?? lex.sources[0]!.label, tag: { text: lex.phrases[9]!, basis: "estimate" } }] },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  segments: (lex) => {
    const compost = lex.metrics[4]!
    return {
      heading: lex.headings[8]!,
      kicker: lex.kickers[2]!,
      years: { from: 2022, to: 2030, marked: [2026] },
      components: [
        { type: "image", asset_id: PHOTO_ASSETS[3], fit: "cover", caption: lex.captions[2]! },
        {
          type: "chart",
          chart_type: "stacked",
          direction: "horizontal",
          axes: { ...(compost.unit ? { y_unit: compost.unit } : {}) },
          emphasis_label: lex.bullets[4]!,
          series: [
            { name: lex.labels[0]!, emphasis: true, data: [{ x: compost.label, y: 120 }] },
            { name: lex.labels[2]!, data: [{ x: compost.label, y: 70, note: lex.phrases[7]! }] },
          ],
        },
        { type: "callout", variant: "info", text: lex.callouts.tip },
        {
          type: "kpi_cards",
          items: [
            { value: `**${compost.value}**`, ...(compost.unit ? { unit: compost.unit } : {}), label: compost.label, note: lex.bullets[4]!, icon: "recycle" as const },
            { value: lex.metrics[0]!.value, ...(lex.metrics[0]!.unit ? { unit: lex.metrics[0]!.unit } : {}), label: lex.metrics[0]!.label, note: lex.bullets[0]!, icon: "sprout" as const },
          ],
        },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  survey: (lex) => ({
    heading: lex.headings[3]!,
    kicker: lex.kickers[2]!,
    years: { from: 2022, to: 2030, marked: [2026] },
    components: [
      { type: "image_grid", items: [0, 1, 2].map((i) => ({ asset_id: PHOTO_ASSETS[i]!, caption: lex.labels[i + 5]! })) },
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { y_title: lex.sources[1]!.label, y_unit: "%" },
        series: [{ name: lex.sources[1]!.label, data: lex.chain.links.map((link, i) => ({ x: link.label, y: Number(link.value), ...(i === 3 ? { emphasis: true } : {}) })) }],
      },
      { type: "callout", variant: "info", icon: "users", title: lex.phrases[10]!, text: lex.sentences[10]! },
    ],
  }),
  outlook: (lex) => ({
    heading: lex.headings[12]!,
    kicker: lex.kickers[5]!,
    years: { from: 2022, to: 2032, marked: [2027] },
    components: [
      {
        type: "timeline",
        periods: [
          { from: "2022", to: "2027", label: lex.phrases[9]!, basis: "law" as const },
          { from: "2027", to: "2032", label: lex.debate.proposal, basis: "proposal" as const },
        ],
        milestones: [
          { date: "2026", title: lex.bullets[5]!, desc: lex.sentences[9]!, icon: "receipt" as const, tag: { text: lex.sources[1]!.ref ?? lex.sources[1]!.label }, source: lex.sources[1]!.label },
          { date: "2027", title: lex.threats[1]!, desc: lex.verdicts.warning, icon: "file-text" as const, tag: { text: lex.id === "zh" ? "在谈" : "Negotiating", basis: "proposal" as const }, source: lex.orgs[3]! },
          { date: "2028", title: lex.debate.proposal, desc: lex.debate.cons[0]!.label, icon: "shovel" as const, tag: { text: lex.id === "zh" ? "提议" : "Proposed", basis: "proposal" as const }, source: lex.orgs[1]! },
        ],
      },
      { type: "callout", variant: "info", text: lex.verdicts.neutral },
    ],
  }),
  // homeroom's lesson sheet sets the shapes as a class taught from a
  // handout: goals with boxes to tick, the class by the minute, studies
  // with their kind of study in a pill, a quiz and its stamped answers, the
  // recap on a board. The quarter's review taught as a lesson.
  objectives: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      { type: "image", asset_id: PHOTO_ASSETS[0], fit: "cover", caption: lex.labels[7]! },
      { type: "icon_cards", items: [0, 1, 2].map((i) => ({ icon: (["list-checks", "shield-alert", "clipboard-check"] as const)[i]!, title: lex.phrases[i]!, text: lex.sentences[[0, 3, 10][i]!]!, tag: { text: lex.periods[i]! } })) },
      { type: "callout", variant: "tip", text: lex.bullets[3]! },
    ],
  }),
  syllabus: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "roadmap",
        duration_unit: lex.id === "zh" ? "分钟" : "min",
        items: [0, 1, 2, 3].map((i) => ({
          period: lex.labels[i]!,
          title: lex.stages[i]!,
          icon: (["lightbulb", "gavel", "clipboard-check", "notebook-pen"] as const)[i]!,
          duration: [15, 9, 15, 6][i]!,
          points: [lex.labels[i + 4]!, lex.labels[i + 8]!],
          ...(i === 0 || i === 2 ? { checkpoint: lex.periods[i === 0 ? 0 : 1]! } : {}),
          rows: [{ label: lex.kickers[0]!, value: lex.labels[i + 12]! }],
          ...(i === 2 ? { emphasis: true } : {}),
        })),
      },
      { type: "callout", variant: "tip", icon: "hand", text: lex.verdicts.neutral },
    ],
  }),
  studies: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "kpi_cards",
        items: [0, 1, 2, 3].map((i) => ({
          icon: (["pencil-line", "headset", "briefcase", "users"] as const)[i]!,
          label: `${lex.labels[i + 8]!}${colonOf(lex)}${lex.metrics[i]!.label}`,
          value: i === 0 ? `**${lex.metrics[i]!.value}**` : lex.metrics[i]!.value,
          ...(lex.metrics[i]!.unit ? { unit: lex.metrics[i]!.unit } : {}),
          note: lex.labels[i]!,
          source: lex.labels[i + 12]!,
          tag: { text: lex.periods[i]!, evidence: i < 2 ? ("trial" as const) : ("preprint" as const) },
        })),
      },
      { type: "callout", variant: "warn", icon: "info", text: lex.verdicts.neutral },
    ],
    footnote: lex.sources[0]!.label,
  }),
  cohorts: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "comparison",
        columns: [lex.labels[12]!, lex.labels[13]!],
        rows: [
          { label: lex.phrases[0]!, cells: [`${lex.labels[0]!}${colonOf(lex)}+36%`, `${lex.labels[1]!}${colonOf(lex)}${lex.labels[7]!}`] },
          { label: lex.phrases[1]!, cells: [`${lex.labels[2]!}${colonOf(lex)}+43%`, `${lex.labels[3]!}${colonOf(lex)}+17%`] },
        ],
      },
      { type: "callout", variant: "info", text: lex.bullets[1]! },
      { type: "insight_panel", title: lex.kickers[1]!, rows: [0, 1].map((i) => ({ label: lex.phrases[i + 4]!, text: lex.periods[i]! })), footnote: lex.labels[6]! },
      { type: "callout", variant: "tip", icon: "graduation-cap", text: lex.sentences[6]! },
    ],
  }),
  diptych: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      { type: "insight_panel", icon: "triangle-alert", title: lex.phrases[7]!, rows: [{ label: lex.labels[7]!, text: lex.bullets[4]! }], footnote: lex.sentences[7]! },
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_title: lex.metrics[1]!.label, x_unit: "%" },
        tag: { text: lex.periods[2]!, evidence: "preprint" },
        series: [{ name: lex.metrics[1]!.label, data: [{ x: lex.labels[12]!, y: 84.5 }, { x: lex.labels[13]!, y: 60, upper: 70, emphasis: true }] }],
      },
      { type: "insight_panel", icon: "file-warning", title: lex.phrases[9]!, rows: [{ label: lex.labels[7]!, text: lex.bullets[5]! }], footnote: lex.labels[4]! },
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_unit: "%" },
        tag: { text: lex.periods[3]!, evidence: "company" },
        series: [{ name: lex.metrics[4]!.label, data: [{ x: lex.phrases[10]!, y: 1.8, upper: 24.2, emphasis: true }, { x: lex.phrases[11]!, y: 17, upper: 33 }] }],
      },
      { type: "callout", variant: "tip", icon: "user-check", text: lex.verdicts.positive },
    ],
  }),
  estimates: (lex) => ({
    heading: lex.headings[8]!,
    components: [
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_title: lex.metrics[3]!.label, x_unit: "%" },
        series: [{ name: lex.metrics[3]!.label, data: [lex.labels[8]!, lex.labels[9]!, lex.labels[10]!, lex.labels[11]!, lex.labels[12]!].map((x, i) => ({ x, y: [-24, -39, -38, -20, 19][i]!, ...(i === 4 ? { emphasis: true } : {}) })) }],
      },
      { type: "kpi_cards", items: [{ icon: "gauge", value: "**39**", unit: lex.id === "zh" ? "个百分点" : "points", label: lex.metrics[5]!.label, note: lex.bullets[2]!, tag: { text: lex.periods[4]!, evidence: "preprint" } }] },
    ],
    footnote: lex.sources[0]!.label,
  }),
  quiz: (lex) => ({
    heading: lex.headings[9]!,
    ballot: { choices: lex.id === "zh" ? ["可以", "不行", "先别急"] : ["Yes", "No", "Not yet"] },
    components: [
      { type: "image", asset_id: PHOTO_ASSETS[1], fit: "cover", caption: lex.labels[7]! },
      { type: "row_cards", items: [0, 1, 2].map((i) => ({ title: lex.periods[i]!, text: lex.bullets[i]! })) },
    ],
  }),
  answers: (lex) => ({
    heading: lex.headings[10]!,
    components: [
      {
        type: "row_cards",
        items: [0, 1, 2].map((i) => ({
          title: `${lex.periods[i]!}${colonOf(lex)}${(lex.id === "zh" ? ["可以", "不行", "先别急"] : ["Yes", "No", "Not yet"])[i]!}`,
          text: lex.bullets[i]!,
          sub: lex.labels[i + 4]!,
          tone: (["success", "danger", "warning"] as const)[i]!,
        })),
      },
      { type: "callout", variant: "info", text: lex.verdicts.neutral },
    ],
  }),
  cases: (lex) => ({
    heading: lex.headings[0]!,
    components: [
      {
        type: "comparison",
        columns: [lex.labels[7]!, lex.labels[6]!, lex.kickers[2]!],
        rows: [0, 1, 2].map((i) => ({
          label: lex.labels[i + 8]!,
          icon: (["file-warning", "gavel", "plane"] as const)[i]!,
          tag: { text: lex.periods[i]!, quiet: true },
          cells: [lex.bullets[i]!, lex.labels[i + 12]!, lex.sources[i]!.label],
        })),
      },
      { type: "callout", variant: "info", icon: "message-square-quote", text: lex.verdicts.warning },
      { type: "kpi_cards", items: [{ value: `**${lex.metrics[0]!.value}**`, label: lex.metrics[0]!.label }] },
    ],
    footnote: lex.sources[0]!.label,
  }),
  ranking: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_title: lex.metrics[2]!.label, x_unit: "%" },
        tag: { text: lex.periods[4]!, evidence: "company" },
        series: [{ name: lex.metrics[2]!.label, data: [0, 1, 2, 3, 4, 5].map((i) => ({ x: lex.phrases[i]!, y: [72, 66, 57, 56, 56, 48][i]!, ...(i === 5 ? { emphasis: true } : {}) })) }],
      },
      { type: "callout", variant: "info", icon: "ban", title: lex.labels[8]!, text: lex.verdicts.neutral },
      { type: "chart", chart_type: "bar", direction: "horizontal", axes: { x_unit: "%" }, series: [{ name: lex.labels[8]!, data: [12, 13, 14].map((i, j) => ({ x: lex.labels[i]!, y: [67, 56, 33][j]!, ...(j === 0 ? { emphasis: true } : {}) })) }] },
    ],
    footnote: lex.sources[0]!.label,
  }),
  rules: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      {
        type: "icon_cards",
        items: [0, 1, 2, 3, 4, 5].map((i) => ({
          icon: (["lock", "shield-check", "user-check", "badge-info", "history", "siren"] as const)[i]!,
          title: lex.phrases[i + 6]!,
          text: lex.bullets[i]!,
          tag: { text: lex.labels[i]!, basis: "law" as const },
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  tiers: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      { type: "pyramid", layers: [12, 13, 14].map((i, j) => ({ label: lex.labels[i]!, tone: (["danger", "warning", "success"] as const)[j]! })) },
      {
        type: "icon_cards",
        items: [0, 1, 2].map((i) => ({
          icon: (["lock", "shield-check", "globe"] as const)[i]!,
          title: lex.phrases[i]!,
          text: `${lex.id === "zh" ? "例如" : "For example"}${colonOf(lex)}${lex.labels[i]!}, ${lex.labels[i + 4]!}`,
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  methods: (lex) => ({
    heading: lex.headings[12]!,
    components: [
      {
        type: "image_grid",
        items: [0, 1, 2].map((i) => ({
          asset_id: PHOTO_ASSETS[i % PHOTO_ASSETS.length]!,
          caption: `${lex.labels[i]!}${colonOf(lex)}${lex.phrases[i + 3]!}`,
          icon: (["file-text", "message-square-quote", "pencil-line"] as const)[i]!,
        })),
      },
      { type: "callout", variant: "tip", title: lex.kickers[5]!, text: lex.bullets[0]! },
    ],
    footnote: lex.sources[2]!.label,
  }),
  blackboard: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "row_cards",
        items: [0, 1, 2, 3].map((i) => ({
          icon: (["list-checks", "lock", "user-check", "siren"] as const)[i]!,
          title: `${lex.labels[i]!} · ${lex.labels[i + 4]!}`,
          text: lex.bullets[i]!,
          ...(i === 1 ? { highlight: true } : {}),
        })),
      },
      { type: "callout", variant: "tip", text: lex.verdicts.positive },
    ],
  }),
  // ember's pitch sheet sets the shapes a seed-round pitch makes its case
  // in: a part set against its whole, why now as steps, a funnel, rivals, the
  // wedge as a sum, bets with their windows, two groups that cannot be
  // compared, gates, risks, a runway with its gate and the ask with its uses.
  expanse: (lex) => ({
    heading: lex.headings[3]!,
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: `${lex.levels[0]!.value} ${lex.levels[0]!.unit}`, label: lex.levels[0]!.title },
          { value: `**${lex.levels[3]!.value} ${lex.levels[3]!.unit}**`, label: lex.levels[3]!.title },
          { value: "12%", label: lex.bullets[3]! },
        ],
      },
      { type: "paragraph", text: lex.sentences[5]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  stairs: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "timeline",
        milestones: [0, 1, 2].map((i) => ({
          date: lex.periods[i]!,
          icon: (["file-check", "route", "trending-up"] as const)[i]!,
          title: lex.phrases[i]!,
          desc: `${lex.sentences[i]!} ${lex.bullets[i]!}`,
          ...(i === 2 ? { highlight: true } : {}),
        })),
      },
      { type: "callout", variant: "info", text: lex.sentences[6]! },
    ],
    footnote: lex.sources[1]!.label,
  }),
  funnel: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      { type: "chart", chart_type: "funnel", axes: { y_unit: lex.levels[0]!.unit }, series: [{ name: lex.decision, data: lex.levels.map((level) => ({ x: level.title, y: Number(level.value) })) }] },
      { type: "kpi_cards", items: [{ value: `${lex.metrics[1]!.value} ${lex.metrics[1]!.unit}`, label: lex.phrases[11]!, note: lex.sentences[3]! }] },
      { type: "callout", variant: "info", title: lex.kickers[2]!, text: lex.sentences[4]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  rivals: (lex) => ({
    heading: lex.headings[8]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "who", label: lex.segmentAxis },
          { key: "how", label: lex.kickers[1]! },
          { key: "what", label: lex.kickers[2]! },
          { key: "when", label: lex.periodAxis },
          { key: "open", label: lex.phrases[1]!, emphasis: true, icon: "circle-help" },
        ],
        rows: [0, 1, 2].map((i) => ({
          icon: (["package", "truck", "store"] as const)[i]!,
          cells: { who: lex.labels[i]!, how: lex.phrases[i + 3]!, what: lex.bullets[i]!, when: lex.periods[i]!, open: lex.labels[i + 12]! },
        })),
      },
      { type: "callout", variant: "info", text: lex.verdicts.neutral },
    ],
    footnote: lex.sources[1]!.label,
  }),
  equation: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "concept_equation",
        operands: [
          { icon: "route", label: lex.phrases[0]!, value: `${lex.metrics[0]!.value}${lex.metrics[0]!.unit}`, note: lex.bullets[0]! },
          { icon: "map-pin", label: lex.phrases[5]!, value: `${lex.metrics[1]!.value} ${lex.metrics[1]!.unit}`, note: lex.bullets[2]! },
        ],
        result: { label: lex.phrases[6]!, value: `${lex.labels[0]!} + ${lex.labels[1]!}`, note: lex.bullets[3]! },
        excluded: { icon: "ban", label: lex.kickers[4]!, value: lex.labels[2]!, note: lex.verdicts.neutral },
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  spotlight: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      { type: "image", asset_id: PHOTO_ASSETS[0], fit: "cover", caption: lex.labels[7]! },
      {
        type: "kpi_cards",
        items: [0, 1, 2].map((i) => ({ value: `${i === 0 ? "**" : ""}${lex.metrics[i]!.value} ${lex.metrics[i]!.unit}${i === 0 ? "**" : ""}`, label: lex.metrics[i]!.label })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  bets: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "gantt",
        range: { from: 0, to: 18 },
        axis_labels: [lex.periods[0]!, lex.periods[4]!],
        items: [0, 1, 2].map((i) => ({
          label: lex.phrases[i]!,
          icon: (["coins", "trending-up", "shield-check"] as const)[i]!,
          start: [12, 6, 0][i]!,
          end: [18, 12, 6][i]!,
          period: lex.periods[3 - i]!,
          text: lex.sentences[i]!,
          ...(i === 0 ? { emphasis: true } : {}),
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  divide: (lex) => ({
    heading: lex.headings[7]!,
    components: [
      {
        type: "kpi_cards",
        items: [0, 1, 2, 3].map((i) => ({ value: lex.metrics[i]!.value, unit: lex.metrics[i]!.unit, label: lex.metrics[i]!.label, tag: { text: lex.labels[i < 2 ? 10 : 11]! } })),
      },
      { type: "verdict_banner", text: lex.verdicts.warning, tone: "neutral", icon: "target" },
    ],
    footnote: lex.sources[0]!.label,
  }),
  locks: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "chevron_process",
        items: [0, 1, 2, 3, 4].map((i) => ({
          title: lex.stages[i]!,
          text: lex.bullets[i]!,
          icon: (["fingerprint-pattern", "id-card", "umbrella", "file-check", "badge-check"] as const)[i]!,
        })),
      },
      {
        type: "kpi_cards",
        items: [
          { value: `${lex.metrics[2]!.value}${lex.metrics[2]!.unit}`, label: lex.phrases[8]!, note: lex.sentences[6]! },
          { value: `${lex.metrics[5]!.value} ${lex.metrics[5]!.unit}`, label: lex.phrases[10]!, note: lex.sentences[11]! },
        ],
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  register: (lex) => ({
    heading: lex.headings[0]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "risk", label: lex.kickers[0]! },
          { key: "case", label: lex.kickers[2]! },
          { key: "plan", label: lex.kickers[1]! },
          { key: "when", label: lex.periodAxis },
        ],
        rows: [0, 1, 2, 3].map((i) => ({
          icon: (["construction", "triangle-alert", "zap", "umbrella"] as const)[i]!,
          cells: { risk: lex.phrases[i]!, case: lex.sentences[i]!, plan: lex.bullets[i]!, when: lex.periods[i]! },
          ...(i === 0 ? { emphasis: "highlight" as const } : {}),
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  runway: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      {
        type: "roadmap",
        duration_unit: lex.id === "zh" ? "个月" : "months",
        items: [0, 1, 2].map((i) => ({
          title: lex.phrases[i + 6]!,
          period: lex.periods[i]!,
          icon: (["file-check", "hospital", "coins"] as const)[i]!,
          duration: 6,
          points: [lex.bullets[i]!, lex.labels[i + 4]!],
          ...(i === 0 ? { checkpoint: lex.kickers[2]!, emphasis: true } : {}),
        })),
      },
      { type: "callout", variant: "warn", icon: "flag", text: lex.verdicts.warning },
    ],
    footnote: lex.sources[0]!.label,
  }),
  uses: (lex) => ({
    heading: lex.headings[10]!,
    components: [
      { type: "kpi_cards", items: [{ value: lex.bullets[5]!, label: lex.kickers[5]!, note: lex.sentences[10]! }] },
      {
        type: "chart",
        chart_type: "stacked",
        direction: "horizontal",
        axes: { y_unit: "%" },
        series: [0, 1, 2, 3].map((i) => ({ name: lex.phrases[i]!, data: [{ x: lex.metrics[4]!.label, y: [35, 30, 20, 15][i]! }] })),
      },
      { type: "callout", variant: "info", icon: "hand-coins", text: lex.verdicts.neutral },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // rally's marquee sheet sets the shapes a campaign proposal makes its
  // case in: one figure over its run, two branches, a year's heat, a crowd
  // cut into shares, where the crowd comes from, a weekend route, touchpoints
  // beside their photographs, peers' cases, a loop, ticket stubs, a plan B
  // for each risk, a schedule by the month, a scoreboard still to fill, a
  // budget cut into shares and the requests.
  crest: (lex) => ({
    heading: lex.headings[0]!,
    kicker: lex.kickers[0]!,
    components: [
      { type: "kpi_cards", items: [{ value: lex.levels[0]!.value, unit: lex.levels[0]!.unit, label: `${lex.periods[3]!} · ${lex.bullets[4]!}`, note: lex.sentences[0]! }] },
      { type: "chart", chart_type: "bar", axes: { y_unit: lex.levels[0]!.unit }, series: [{ name: lex.phrases[9]!, data: [0, 1, 2, 3].map((i) => ({ x: lex.periods[i]!, y: [96, 186, 330, 412][i]!, ...(i === 3 ? { emphasis: true } : {}) })) }] },
      { type: "callout", variant: "info", title: lex.phrases[10]!, text: lex.sentences[1]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  branch: (lex) => ({
    heading: lex.headings[0]!,
    kicker: lex.kickers[0]!,
    components: [
      {
        type: "chart",
        chart_type: "line",
        axes: { y_unit: "%" },
        series: [
          { name: lex.labels[0]!, emphasis: true, data: [{ x: lex.periods[0]!, y: 0 }, { x: lex.periods[3]!, y: 42 }] },
          { name: lex.labels[1]!, data: [{ x: lex.periods[0]!, y: 0 }, { x: lex.periods[3]!, y: -7 }] },
        ],
      },
      { type: "callout", variant: "info", icon: "trending-up", title: `${lex.labels[0]!} · ${lex.phrases[0]!}`, text: lex.sentences[0]! },
      { type: "callout", variant: "info", icon: "trending-down", title: lex.labels[1]!, text: lex.sentences[1]!, tag: { text: lex.kickers[3]!, evidence: "press" } },
    ],
    footnote: lex.sources[1]!.label,
  }),
  season: (lex) => {
    const months = Array.from({ length: 12 }, (_, i) => (lex.id === "en" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]! : `${i + 1} 月`))
    const colon = colonOf(lex)
    return {
      heading: lex.headings[3]!,
      kicker: lex.kickers[3]!,
      components: [
        {
          type: "heatmap",
          x_labels: months,
          y_labels: [lex.labels[0]!, lex.labels[1]!],
          values: [
            [0, 0, 0, 0, 2, 0, 0, 3, 3, 0, 2, 0],
            [0, 0, 0, 0, 3, 0, 1, 1, 1, 3, 0, 0],
          ],
          bands: [{ from: months[5]!, to: months[8]!, label: lex.phrases[11]! }],
        },
        { type: "callout", variant: "info", text: `${lex.labels[0]!}${colon}${lex.bullets[0]!}` },
        { type: "callout", variant: "info", text: `${lex.labels[1]!}${colon}${lex.bullets[1]!}` },
        { type: "callout", variant: "info", text: lex.sentences[11]! },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  makeup: (lex) => {
    const parts = [lex.labels[10]!, lex.labels[11]!, lex.labels[12]!, lex.labels[13]!, lex.labels[14]!]
    const bar = (name: string, values: number[]) => ({
      type: "chart" as const,
      chart_type: "stacked" as const,
      direction: "horizontal" as const,
      emphasis_label: `${lex.phrases[10]!} ${values[1]! + values[2]!}%`,
      series: parts.map((part, i) => ({ name: part, data: [{ x: name, y: values[i]! }], ...(i === 1 || i === 2 ? { emphasis: true } : {}) })),
    })
    return {
      heading: lex.headings[2]!,
      kicker: lex.kickers[1]!,
      components: [
        bar(lex.labels[6]!, [12, 34, 28, 16, 10]),
        bar(lex.labels[7]!, [9, 41, 30, 12, 8]),
        { type: "kpi_cards", items: [{ value: `**${lex.metrics[1]!.value}${lex.metrics[1]!.unit}**`, label: lex.metrics[1]!.label, note: `${lex.bullets[0]!}${lex.id === "en" ? ". " : "。"}${lex.bullets[1]!}`, icon: "users" }] },
        { type: "callout", variant: "warn", icon: "user-round-search", text: lex.sentences[5]! },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  origins: (lex) => ({
    heading: lex.headings[6]!,
    kicker: lex.kickers[4]!,
    components: [
      {
        type: "chart",
        chart_type: "percent_stacked",
        axes: { x_title: lex.segmentAxis, y_unit: "%" },
        series: [0, 1, 2].map((s) => ({
          name: lex.labels[s]!,
          data: [0, 1, 2, 3].map((i) => ({ x: lex.labels[10 + i]!, y: [[46, 35, 28, 19], [10, 21, 37, 48], [44, 44, 35, 33]][s]![i]! })),
        })),
      },
      { type: "image", asset_id: PHOTO_ASSETS[0], fit: "cover", caption: lex.labels[7]! },
      { type: "kpi_cards", items: [{ value: `**${lex.metrics[2]!.value}${lex.metrics[2]!.unit}**`, label: lex.bullets[2]! }] },
    ],
    footnote: lex.sources[0]!.label,
  }),
  route: (lex) => ({
    heading: lex.headings[7]!,
    kicker: lex.kickers[4]!,
    components: [
      {
        type: "steps",
        items: [0, 1, 2, 3, 4].map((i) => ({
          icon: (["train-front", "cup-soda", "music", "moon-star", "map-pin"] as const)[i]!,
          title: lex.stages[i]!,
          text: i === 2 ? `${lex.labels[6]!}${lex.id === "en" ? ". " : "。"}${lex.labels[7]!}` : lex.labels[i]!,
          ...(i === 2 ? { tone: "warning" as const } : {}),
        })),
      },
      { type: "kpi_cards", items: [{ value: `**${lex.metrics[1]!.value}${lex.metrics[1]!.unit}**`, label: lex.metrics[1]!.label, note: lex.bullets[2]! }] },
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { y_unit: "%" },
        series: [{ name: lex.phrases[7]!, data: [0, 1, 2, 3, 4].map((i) => ({ x: lex.labels[i]!, y: [96, 82, 64, 48, 21][i]!, ...(i === 0 ? { emphasis: true } : {}) })) }],
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  spots: (lex) => {
    const colon = colonOf(lex)
    const stop = lex.id === "en" ? ". " : "。"
    return {
      heading: lex.headings[4]!,
      kicker: lex.kickers[4]!,
      components: [
        {
          type: "image_grid",
          emphasis: "first",
          items: [0, 1, 2, 3].map((i) => ({
            asset_id: PHOTO_ASSETS[i % PHOTO_ASSETS.length]!,
            caption: `${lex.labels[i]!}${colon}${lex.bullets[i]!}${stop}${lex.labels[7]!}`,
            icon: (["cup-soda", "sparkles", "moon-star", "map-pin"] as const)[i]!,
          })),
        },
        { type: "callout", variant: "warn", text: lex.bullets[5]! },
      ],
    }
  },
  wall: (lex) => {
    const stop = lex.id === "en" ? ". " : "。"
    return {
      heading: lex.headings[7]!,
      kicker: lex.kickers[3]!,
      components: [
        {
          type: "icon_cards",
          items: [0, 1, 2, 3, 4, 5].map((i) => ({
            icon: (["cup-soda", "zap", "milk", "ice-cream-cone", "wine", "megaphone"] as const)[i]!,
            title: `${lex.labels[i]!} · ${lex.periods[i % 4]!}`,
            text: `${lex.phrases[i]!}${stop}${lex.bullets[i]!}`,
            tag: { text: lex.kickers[i]!, evidence: i % 3 === 2 ? ("press" as const) : ("company" as const) },
          })),
        },
        { type: "kpi_cards", items: [{ value: "0", unit: lex.levels[0]!.unit, label: lex.phrases[11]!, note: lex.sentences[10]! }] },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  loop: (lex) => ({
    heading: lex.headings[11]!,
    kicker: lex.kickers[5]!,
    components: [
      {
        type: "chevron_process",
        items: [0, 1, 2, 3, 4].map((i) => ({ title: lex.stages[i]!, text: lex.bullets[i]!, icon: (["qr-code", "smartphone", "store", "repeat", "scale"] as const)[i]! })),
      },
      { type: "callout", variant: "info", text: lex.phrases[8]! },
      {
        type: "data_table",
        columns: [
          { key: "t", label: lex.segmentAxis },
          { key: "c", label: lex.kickers[2]!, emphasis: true },
          { key: "y", label: lex.kickers[0]! },
          { key: "n", label: lex.kickers[5]! },
        ],
        rows: [0, 1, 2].map((i) => ({
          icon: (["cup-soda", "package", "ticket"] as const)[i]!,
          cells: { t: lex.labels[i]!, c: lex.labels[i + 3]!, y: lex.bullets[i]!, n: lex.phrases[i]! },
        })),
      },
    ],
  }),
  stubs: (lex) => {
    const colon = colonOf(lex)
    return {
      heading: lex.headings[5]!,
      kicker: lex.kickers[4]!,
      components: [
        {
          type: "icon_cards",
          items: [0, 1, 2, 3].map((i) => ({
            icon: (["landmark", "map-pin", "ticket", "bus-front"] as const)[i]!,
            title: `${lex.labels[10 + i]!}${colon}${lex.phrases[i]!}`,
            text: lex.bullets[i]!,
            tag: { text: lex.labels[6]! },
          })),
        },
        { type: "kpi_cards", items: [{ value: "1:6.8", label: lex.phrases[9]!, note: lex.sentences[6]!, icon: "building-2", tone: "warning" }] },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  fallbacks: (lex) => {
    const colon = colonOf(lex)
    return {
      heading: lex.headings[9]!,
      kicker: lex.kickers[3]!,
      components: [
        {
          type: "data_table",
          columns: [
            { key: "e", label: lex.kickers[3]! },
            { key: "p", label: lex.kickers[5]! },
          ],
          rows: [0, 1, 2, 3, 4].map((i) => ({
            icon: (["cloud-lightning", "siren", "user-x", "ticket-x", "ban"] as const)[i]!,
            cells: { e: `${lex.labels[i]!}${colon}${lex.threats[i % 4]!}`, p: lex.bullets[i]! },
            ...(i === 4 ? { emphasis: "highlight" as const } : {}),
          })),
        },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  timetable: (lex) => ({
    heading: lex.headings[9]!,
    kicker: lex.kickers[3]!,
    components: [
      {
        type: "gantt",
        axis_labels: Array.from({ length: 13 }, (_, i) => String(((i + 9) % 12) + 1)),
        bands: [{ from: 8, to: 12, label: lex.phrases[11]! }],
        items: [0, 1, 2, 3, 4].map((i) => ({
          label: lex.stages[i]!,
          text: lex.labels[i]!,
          start: [0, 1, 2, 8, 9][i]!,
          end: [1, 4, 8, 9, 12][i]!,
          ...(i === 3 ? { emphasis: true, icon: "star" as const } : {}),
        })),
      },
    ],
  }),
  scoreboard: (lex) => ({
    heading: lex.headings[10]!,
    kicker: lex.kickers[5]!,
    components: [
      {
        type: "icon_cards",
        items: [0, 1, 2, 3, 4, 5].map((i) => ({
          icon: (["qr-code", "store", "package", "repeat", "ticket", "message-circle-warning"] as const)[i]!,
          title: lex.phrases[i]!,
          text: lex.bullets[i]!,
          tag: { text: lex.kickers[5]!, tone: "warning" as const },
        })),
      },
      { type: "callout", variant: "info", text: lex.bullets[5]! },
    ],
  }),
  allotment: (lex) => ({
    heading: lex.headings[9]!,
    kicker: lex.kickers[5]!,
    components: [
      {
        type: "chart",
        chart_type: "stacked",
        direction: "horizontal",
        axes: { y_unit: "%" },
        emphasis_label: `${lex.kickers[5]!} 15%`,
        series: [0, 1, 2, 3, 4, 5].map((i) => ({ name: lex.labels[i]!, data: [{ x: lex.periodAxis, y: [30, 25, 15, 15, 8, 7][i]! }], ...(i >= 4 ? { emphasis: true } : {}) })),
      },
      {
        type: "icon_cards",
        items: [
          { icon: "hand-coins", title: lex.phrases[5]!, text: lex.bullets[5]! },
          { icon: "file-check", title: lex.phrases[7]!, text: lex.bullets[4]! },
        ],
      },
    ],
  }),
  asks: (lex) => {
    const colon = colonOf(lex)
    return {
      heading: lex.headings[11]!,
      kicker: lex.kickers[5]!,
      ballot: { choices: lex.id === "en" ? ["Approve", "Revisit"] : ["批准", "再议"] },
      components: [
        {
          type: "numbered_cards",
          items: [0, 1, 2, 3].map((i) => ({
            icon: (["target", "wallet", "qr-code", "shield-alert"] as const)[i]!,
            title: `${lex.kickers[i]!}${colon}${lex.phrases[i]!}`,
            text: lex.bullets[i]!,
            sub: lex.periods[i]!,
            ...(i === 0 ? { emphasis: true } : {}),
          })),
        },
      ],
    }
  },
  phases: (lex) => {
    const colon = colonOf(lex)
    const tbd = lex.id === "zh" ? "待定" : "TBD"
    const months = lex.wheel.sectors.map((sector) => sector.value)
    return {
      heading: lex.headings[11]!,
      kicker: lex.kickers[5]!,
      years: { from: 2022, to: 2030, marked: [2026, 2027] },
      components: [
        {
          type: "roadmap",
          items: [
            {
              title: lex.stages[4]!,
              period: months[4]!,
              rows: [
                { label: lex.labels[5]!, value: lex.debate.cons[0]!.label },
                { label: lex.labels[7]!, value: lex.bullets[4]! },
                { label: lex.kickers[4]!, value: `${lex.phrases[6]!}${colon}${tbd}`, basis: "pending" as const },
              ],
            },
            {
              title: lex.stages[5]!,
              period: months[5]!,
              emphasis: true,
              rows: [
                { label: lex.phrases[9]!, value: lex.threats[1]! },
                { label: lex.labels[13]!, value: lex.verdicts.warning },
              ],
            },
            {
              title: lex.stages[0]!,
              period: months[0]!,
              rows: [
                { label: lex.labels[1]!, value: lex.sentences[11]! },
                { label: lex.labels[4]!, value: lex.phrases[5]! },
                { label: lex.kickers[4]!, value: `${lex.labels[8]!}${colon}${tbd}`, basis: "pending" as const },
              ],
            },
            {
              title: lex.stages[1]!,
              period: months[1]!,
              rows: [
                { label: lex.phrases[3]!, value: lex.choices[0]!.title },
                { label: lex.labels[0]!, value: lex.choices[0]!.detail },
              ],
            },
          ],
        },
      ],
    }
  },
}

/** clinic's cases: four, each its icon, who reported it, what happened and the figure it turns on, the first two bad news. */
function dossierCases(lex: Lexicon): Component {
  return {
    type: "kpi_cards",
    items: [0, 1, 2, 3].map((i) => ({
      icon: (["siren", "siren", "landmark", "badge-alert"] as const)[i]!,
      source: `${lex.labels[i + 11]!} · ${lex.periods[i]!}`,
      label: lex.labels[i]!,
      value: lex.metrics[i]!.value,
      ...(lex.metrics[i]!.unit ? { unit: lex.metrics[i]!.unit } : {}),
      note: lex.sentences[i + 2]!,
      ...(i < 2 ? { tone: "danger" as const } : {}),
    })),
  }
}

/**
 * almanac's ask: what the year came to on three cards, each its icon, and
 * the two things the members are asked to settle. The board's decision page,
 * which the yearbook sheet hands to `motion`.
 */
function yearbookAsk(lex: Lexicon): CompositionBody {
  return {
    heading: lex.headings[0]!,
    kicker: lex.kickers[0]!,
    years: { from: 2022, to: 2030, marked: [2026, 2027] },
    components: [
      {
        type: "row_cards",
        items: [0, 1, 2].map((i) => ({ icon: (["sprout", "bird", "receipt"] as const)[i]!, title: lex.bullets[[0, 2, 5][i]!]!, text: lex.sentences[[1, 6, 9][i]!]! })),
      },
      {
        type: "insight_panel",
        icon: "gavel",
        title: lex.decision,
        rows: [
          { label: lex.phrases[9]!, text: lex.sentences[11]! },
          { label: lex.phrases[11]!, text: lex.verdicts.warning },
        ],
      },
    ],
  }
}

/** The colon a label stands before in the lexicon's language. */
function colonOf(lex: Lexicon): string {
  return lex.id === "zh" ? "：" : ": "
}

/** The figures the column beside a chart or a row of figures sets: label, value and a note. */
function figureItems(lex: Lexicon, count: number) {
  return lex.metrics.slice(0, count).map((metric, i) => ({
    value: metric.value,
    ...(metric.unit ? { unit: metric.unit } : {}),
    label: metric.label,
    note: lex.periods[i]!,
  }))
}

/**
 * Second pages for the compositions that take two shapes or set themselves
 * at a second size: `rail` with the author's figures beside the chart
 * instead of the changes it computes, and `table` at its dense size, four
 * options over a closing line.
 */
export type CompositionVariant = "figures" | "dense" | "answer" | "console" | "memo" | "dossier"

const COMPOSITION_VARIANT_BODIES: Record<`${CompositionId}-${CompositionVariant}`, ((lex: Lexicon) => CompositionBody) | undefined> = {
  "rail-figures": (lex) => ({
    heading: lex.headings[0]!,
    components: [CHART_VARIANTS["chart · bar"]!(lex), { type: "kpi_cards", items: figureItems(lex, 2) }],
    footnote: lex.sources[0]!.label,
  }),
  // Numbered cards, the last one the answer the others lead to.
  "rows-answer": (lex) => ({
    heading: lex.headings[1]!,
    components: [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(0, 4).map((title, i) => ({ title, text: lex.sentences[i + 2]!, ...(i === 3 ? { emphasis: true } : {}) })),
      },
    ],
  }),
  "table-dense": (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "comparison",
        recommended: 0,
        columns: [lex.labels[8]!, lex.labels[9]!, lex.labels[10]!, lex.labels[11]!],
        rows: lex.phrases.slice(0, 4).map((label, i) => ({
          label,
          cells: [lex.periods[i % 4]!, lex.labels[(i + 12) % lex.labels.length]!, lex.periods[(i + 1) % 4]!, lex.labels[(i + 13) % lex.labels.length]!],
        })),
      },
      { type: "callout", variant: "info", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // terminal's console forms of the shared shapes: windows ranked beside two
  // figures, a matrix of marked cells, options as cards with a rating and a
  // measure, a roadmap over its decision.
  "rail-console": (lex): CompositionBody => ({
    heading: lex.headings[0]!,
    components: [
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_title: lex.labels[0]!, ...(lex.metrics[0]!.unit ? { x_unit: lex.metrics[0]!.unit } : {}) },
        series: [
          { name: lex.labels[1]!, data: lex.phrases.slice(0, 2).map((x, i) => ({ x: `${lex.labels[i + 4]!} · ${lex.periods[i]!}`, y: [1326, 872][i]! })) },
          { name: lex.labels[2]!, emphasis: true, data: lex.phrases.slice(2, 6).map((x, i) => ({ x: `${lex.labels[i + 6]!} · ${lex.periods[(i + 2) % 4]!}`, y: [504, 387, 190, 25][i]! })) },
        ],
      },
      {
        type: "kpi_cards",
        items: [
          { value: "**5/8**", label: lex.labels[2]!, note: lex.periods[0]!, icon: "zap" as const },
          { value: "7+", ...(lex.metrics[1]!.unit ? { unit: lex.metrics[1]!.unit } : {}), label: lex.labels[3]!, note: lex.periods[1]!, icon: "flame" as const, tone: "danger" as const },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  "records-console": (lex): CompositionBody => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "case", label: lex.labels[0]! },
          { key: "scope", label: lex.labels[1]! },
          { key: "a", label: lex.labels[2]! },
          { key: "b", label: lex.labels[3]! },
        ],
        rows: lex.phrases.slice(0, 5).map((phrase, i) => ({
          cells: { case: lex.labels[i + 4]!, scope: lex.labels[i + 9]!, a: ["✓ ", "✕ ", "✕ ", "— ", "✕ "][i]! + lex.periods[i % 4]!, b: ["✓ ", "✓ ", "✕ ", "— ", "✓ "][i]! + lex.periods[(i + 1) % 4]! },
          ...(i === 2 ? { emphasis: "highlight" as const } : {}),
        })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  "table-console": (lex): CompositionBody => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "comparison",
        recommended: 2,
        columns: [lex.labels[8]!, lex.labels[9]!, lex.labels[10]!, lex.labels[11]!],
        rows: [
          { label: "RPO", cells: [lex.periods[0]!, lex.periods[1]!, lex.periods[2]!, lex.periods[3]!] },
          { label: lex.labels[0]!, cells: lex.phrases.slice(0, 4) },
          { label: lex.labels[1]!, cells: ["$", "$$", "$$$", "$$$$"] },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  "waves-console": (lex): CompositionBody => {
    const roadmap = COMPONENT_BUILDERS.roadmap!(lex)
    return {
      heading: lex.headings[11]!,
      components: [
        roadmap.type === "roadmap" ? { ...roadmap, items: roadmap.items.map((item, i) => (i === 0 ? { ...item, emphasis: true as const } : item)) } : roadmap,
        { type: "callout" as const, variant: "warn" as const, icon: "flag" as const, text: lex.verdicts.warning },
      ],
    }
  },
  // memo's forms of the shared shapes: a decision's clauses numbered in the
  // deck's numerals, and a table of figures whose rows carry the kind of
  // source they come from as tags.
  "rows-memo": (lex): CompositionBody => ({
    heading: lex.headings[12]!,
    components: [
      {
        type: "numbered_cards",
        items: lex.phrases.slice(6, 10).map((title, i) => ({ title, text: lex.sentences[i + 8]!, ...(i === 3 ? { emphasis: true } : {}) })),
      },
    ],
  }),
  "records-memo": (lex): CompositionBody => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "item", label: lex.segmentAxis },
          { key: "goal", label: lex.labels[12]! },
          { key: "note", label: lex.labels[13]! },
        ],
        rows: lex.goals
          .slice(0, 5)
          .map((goal, i) => ({
            cells: { item: goal.title, goal: goal.actual, note: goal.gap },
            tag: { text: lex.tags[[2, 3, 4, 2, 3][i]!]! },
            ...(i === 4 ? { emphasis: "highlight" as const } : {}),
          })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  // clinic's dossier forms of the shared shapes: proposals as cards with their
  // icons and where their evidence is, options with their proposals as
  // capsules, approvals on two lanes, rules on cards two by two.
  "rows-dossier": (lex): CompositionBody => ({
    heading: lex.headings[1]!,
    components: [
      {
        type: "numbered_cards",
        items: [0, 1, 2].map((i) => ({ icon: (["pill", "hospital", "clipboard-check"] as const)[i]!, title: lex.bullets[i]!, text: lex.sentences[i + 2]!, sub: lex.periods[i]!, ...(i === 0 ? { emphasis: true } : {}) })),
      },
    ],
  }),
  "table-dossier": (lex): CompositionBody => ({
    heading: lex.headings[8]!,
    components: [
      {
        type: "comparison",
        label_column: lex.segmentAxis,
        tag_column: lex.labels[15]!,
        columns: [lex.labels[11]!, lex.labels[12]!],
        rows: [0, 1, 2, 3].map((i) => ({
          icon: "pill" as const,
          label: lex.phrases[i]!,
          cells: [lex.sentences[i + 2]!, lex.periods[i]!],
          tag: [{ text: lex.labels[7]!, settled: true }, { text: lex.labels[8]! }, { text: lex.labels[13]!, quiet: true }, { text: lex.labels[10]!, quiet: true, settled: true }][i]!,
          ...(i === 0 ? { emphasis: true } : {}),
        })),
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  "lanes-dossier": (lex): CompositionBody => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "timeline",
        lanes: [lex.labels[11]!, lex.labels[12]!],
        milestones: [
          { date: "2024-03-12", title: lex.phrases[0]!, desc: lex.labels[0]!, lane: lex.labels[11]! },
          { date: "2024-09-05", title: lex.phrases[1]!, lane: lex.labels[12]! },
          { date: "2025-02-20", title: lex.phrases[2]!, desc: lex.labels[1]!, lane: lex.labels[11]! },
          { date: "2025-08-18", title: lex.phrases[3]!, lane: lex.labels[12]!, highlight: true },
          { date: "2026-01-09", title: lex.phrases[4]!, desc: lex.labels[2]!, lane: lex.labels[11]! },
          { date: "2026-06-30", title: lex.phrases[5]!, lane: lex.labels[12]! },
        ],
      },
    ],
    footnote: lex.sources[0]!.label,
  }),
  "cards-dossier": (lex): CompositionBody => ({
    heading: lex.headings[6]!,
    components: [
      { type: "icon_cards", items: [0, 1].map((i) => ({ icon: (["hospital", "user-check"] as const)[i]!, title: lex.phrases[i]!, text: lex.sentences[i + 2]! })) },
      { type: "icon_cards", items: [2, 3].map((i) => ({ icon: (["badge-check", "users"] as const)[i - 2]!, title: lex.phrases[i]!, text: lex.sentences[i + 2]! })) },
    ],
    footnote: lex.sources[0]!.label,
  }),
} as Record<`${CompositionId}-${CompositionVariant}`, ((lex: Lexicon) => CompositionBody) | undefined>

/** One page drawn by one shared composition, on `themeId`, under the face its menu gives `kind`. */
export function compositionPage(
  lex: Lexicon,
  assets: CorpusAssets,
  themeId: string,
  kind: PageKind,
  composition: CompositionId,
  variant?: CompositionVariant,
): PptxIR {
  const build = variant ? COMPOSITION_VARIANT_BODIES[`${composition}-${variant}`] : COMPOSITION_BODIES[composition]
  if (!build) throw new Error(`no gallery page for composition ${composition} in variant ${variant}`)
  const body = build(lex)
  const slide = {
    type: "content",
    kind,
    heading: body.heading,
    components: body.components,
    ...(body.footnote ? { footnote: body.footnote } : {}),
    ...(body.kicker ? { kicker: body.kicker } : {}),
    ...(body.years ? { years: body.years } : {}),
    ...(body.tag ? { tag: body.tag } : {}),
    ...(body.ballot ? { ballot: body.ballot } : {}),
  } as Slide
  return deckShell(lex, assets, themeId, `composition-${composition}${variant ? `-${variant}` : ""}-${themeId}-${lex.id}`, [slide])
}
