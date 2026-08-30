/**
 * Turns the corpus into whole decks — the two tables `D2` settled on.
 *
 * Theme table: every theme runs a ten-page deck of the same shape, with
 * content leads rotating from a fixed assignment table. Layout/component table:
 * one page each, pinned, on a fixed baseline theme, so a reviewer comparing
 * two layouts is likewise looking at one variable. Nothing here picks a
 * layout implicitly — every page in the second table carries an explicit
 * `layout` pin, because auto-selection reshuffling between runs would make
 * the review non-reproducible.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Component, PptxIR, Slide } from "@/ir"
import { FULL_BODY_TYPES } from "@/render/component-traits"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "@/layouts/registry"
import { COMPONENT_BUILDERS, PHOTO_ASSETS, SCREENSHOT_ASSET } from "./components"
import type { LanguageId, Lexicon } from "./lexicon"
import { THEME_CONTENT_SLOTS, buildThemeSlot } from "./theme-slots"

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
 * `consulting` shows `pad`, `lecture` shows `underline`.
 * `evals/gallery/coverage.ts` asserts every form reaches a page this way.
 */
const THEME_EMPHASIS_PHRASES: Record<string, Record<LanguageId, EmphasisPhrases>> = {
  consulting: {
    zh: { cover: "业务评审", heading: "新签", bullet: "九成一" },
    en: { cover: "Business Review", heading: "new business", bullet: "91%" },
    mixed: { cover: "Kubernetes 托管", heading: "90 秒", bullet: "12 分钟" },
  },
  lecture: {
    zh: { cover: "业务评审", heading: "新签", bullet: "九成一" },
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
 * A full deck title still truncates at that floor and hard-blocks validate
 * as pinned_heading_overflow (same class as stat-hero's caption). Author a
 * KPI from the lexicon, not a sentence.
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
export const BASELINE_THEME = "consulting"

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
    // Pinned so layout selection, seed-dependent decor and any other
    // sampled choice reproduce byte-for-byte across runs. A gallery that
    // reshuffled between runs could not be diffed, and a reviewer could
    // not tell a real regression from a reroll.
    seed: 20260815,
    slides,
  } as PptxIR
}

// ─────────────────────────────────────────────────────────────────────────
// Theme table — one ten-page deck, rendered once per theme
// ─────────────────────────────────────────────────────────────────────────

/**
 * The ten pages a real deck actually contains, in the order it contains
 * them: an opening, a section break, seven content pages each led by a
 * different component (looked up in `THEME_CONTENT_SLOTS`), then a close.
 *
 * Layouts are left unpinned here on purpose. This table asks "does this
 * theme look good doing its own thing", and its own thing includes which
 * layout it reaches for. The `seed` on the deck keeps that choice stable.
 */
export function themeDeck(themeId: string, lex: Lexicon, assets: CorpusAssets): PptxIR {
  const slots = THEME_CONTENT_SLOTS[themeId]
  if (!slots || slots.length !== 7) {
    throw new Error(`theme table has no 7-slot assignment for ${themeId}`)
  }
  const emphasis = THEME_EMPHASIS_PHRASES[themeId]?.[lex.id]
  const content: Slide[] = slots.map((spec, i) => {
    const built = fitThemeLead(themeId, i, buildThemeSlot(spec, lex))
    const component = emphasis ? emphasizedLead(themeId, built, i, lex) : built
    const extra = thickenThemeContent(themeId, i, lex)
    return {
      type: "content" as const,
      kind: "points",
      heading: emphasis && i === 0 ? emphasizePhrase(lex.headings[i]!, emphasis.heading) : lex.headings[i]!,
      components: [component, ...extra.extra],
      ...(extra.layout ? { layout: extra.layout } : {}),
      ...(component.type === "data_table" ? { footnote: lex.sources[0]!.label } : {}),
    }
  })
  const slides: Slide[] = [
    {
      type: "cover",
      heading:
        themeId === "insight"
          ? statCoverHeading(lex)
          : themeId === "runway"
            ? showHeadlineCoverHeading(lex)
            : emphasis
              ? emphasizePhrase(lex.deckTitle, emphasis.cover)
              : lex.deckTitle,
      subheading: lex.deckSubtitle,
      components:
        themeId === "consulting"
          ? [{ type: "bullets", items: [lex.bullets[0]!, lex.bullets[1]!, lex.bullets[2]!] }]
          : [],
    },
    { type: "chapter", heading: lex.chapters[0]!, subheading: lex.kickers[0], components: [] },
    ...content,
    themeId === "academic" || themeId === "consulting" || themeId === "crayon"
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
 * frames, a 56px card in a poster hero). Inject a short companion, and
 * pin two-column where the page must actually split.
 */
function thickenThemeContent(
  themeId: string,
  slotIndex: number,
  lex: Lexicon,
): { extra: Component[]; layout?: string } {
  const shortParagraph: Component = { type: "paragraph", text: lex.shortParagraph }
  if (themeId === "stage" && slotIndex === 0) {
    return { extra: [shortParagraph], layout: "two-column" }
  }
  if (themeId === "swiss" && slotIndex === 0) {
    return { extra: [COMPONENT_BUILDERS.bullets!(lex)], layout: "two-column" }
  }
  if (themeId === "arena" && slotIndex === 2) return { extra: [shortParagraph] }
  if (themeId === "pulse" && slotIndex === 3) return { extra: [shortParagraph] }
  if (themeId === "runway" && slotIndex === 5) return { extra: [shortParagraph] }
  if (themeId === "heritage" && slotIndex === 3) return { extra: [shortParagraph] }
  // Seed landed this four-card row in quiet-frame's 640px single-component
  // frame, so icon-card body text fitted to 6-7px. two-column falls back to
  // one full-width column at n=1, which is this theme's own content claim.
  if (themeId === "enterprise" && slotIndex === 2) return { extra: [], layout: "two-column" }
  return { extra: [] }
}

function fitThemeLead(themeId: string, slotIndex: number, component: Component): Component {
  if (themeId === "enterprise" && slotIndex === 2 && component.type === "icon_cards") {
    return { ...component, items: component.items.slice(0, 3) }
  }
  return component
}

// ─────────────────────────────────────────────────────────────────────────
// Layout table — one pinned page per layout
// ─────────────────────────────────────────────────────────────────────────

/** The body slot's declared capacity, or a safe default when it has none. */
function bodyCapacity(def: LayoutDefinition): number {
  const counted = def.slots.filter((s) => typeof s.capacity === "number")
  if (counted.length === 0) return 2
  // A declared 0 is a real value (mono-bleed's body slot accepts nothing) —
  // clamping it up to 1 authors a page validate-core rejects outright.
  return Math.max(0, Math.min(...counted.map((s) => s.capacity!)))
}

function wantsImage(def: LayoutDefinition): boolean {
  return def.slots.some((s) => s.name === "image" || s.name === "hero" || s.name === "lead")
}

function shortCitation(lex: Lexicon): Component {
  const s = lex.sources[0]!
  return { type: "citation", sources: [{ label: s.label, ref: s.ref }] }
}

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
  // One source, not the corpus' full three: the slot is ~80px tall and a
  // three-entry citation does not fit, which showed up as dropped content
  // on every quote-stage page.
  if (capacity === 0) return []

  // stat-hero's one slot is the hero itself: fed a citation, the heading has
  // to carry the 180px hero figure and the corpus' long English heading
  // overruns the render-safety floor. Author the page as intended — a KPI
  // whose value is the hero — so the heading drops to the caption row.
  if (def.id === "stat-hero") {
    const kpi = b.kpi_cards!(lex) as Component & { items?: unknown[] }
    if (Array.isArray(kpi.items)) kpi.items = kpi.items.slice(0, 1)
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
    return [{
      type: "image_grid",
      items: Array.from({ length: 6 }, (_, index) => ({
        asset_id: PHOTO_ASSETS[index % PHOTO_ASSETS.length]!,
        caption: lex.captions[index % lex.captions.length]!,
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
  if (def.id === "show-figures") {
    const kpi = b.kpi_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 3)
    return [kpi]
  }

  // Sparse and a few ordinary layouts have a body slot whose declared
  // capacity is the wrong signal: citation is the capacity-1 default, but
  // these pages draw a quote, a chart, a bento grid, or a hero+strip. Match
  // the layout's own comments rather than broadening the default.
  if (def.id === "pull-quote") return [b.blockquote!(lex)]
  if (def.id === "gauge-point") return [b.blockquote!(lex)]
  if (def.id === "crayonbox-point") return [b.blockquote!(lex)]
  if (def.id === "one-evidence") return [b.chart!(lex)]
  if (def.id === "bento-panel") {
    const kpi = b.kpi_cards!(lex)
    const icons = b.icon_cards!(lex)
    if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 3)
    if (icons.type === "icon_cards") icons.items = icons.items.slice(0, 3)
    return [kpi, icons]
  }
  if (def.id === "stacked-poster") {
    // The 108px caption strip under the poster hero cannot hold
    // shortParagraph. A one-source citation fits the strip, so the page
    // stays on the two-block poster path instead of dropping the body.
    return [b.image!(lex), shortCitation(lex)]
  }
  if (def.id === "quote-stage") return [shortCitation(lex)]
  if (def.id === "statement") return [shortCitation(lex)]

  if (capacity <= 1) return [shortCitation(lex)]

  const shortParagraph: Component = { type: "paragraph", text: lex.shortParagraph }

  // Per-layout bodies. Same capacity intent as before (two compact blocks
  // for the two-column-ish family, image plus a short companion for
  // takeovers) but different types, so paging the table is not eight
  // copies of bullets+kpi.
  const bodies: Record<string, Component[]> = {
    "two-column": (() => {
      // Four KPI cards in a half-width column fall under MIN_READABLE_CARD_W
      // and draw a +N marker. Two cards still read as a kpi pair.
      const kpi = b.kpi_cards!(lex)
      if (kpi.type === "kpi_cards") kpi.items = kpi.items.slice(0, 2)
      return [b.bullets!(lex), kpi]
    })(),
    "narrow-column": [b.callout!(lex), b.numbered_cards!(lex)],
    "rail-numbered": [b.steps!(lex), shortCitation(lex)],
    "banner-heading": [b.icon_cards!(lex), b.bullets!(lex)],
    "tone-adaptive-content": [b.blockquote!(lex), b.kpi_cards!(lex)],
    "quiet-frame": [b.tag_row!(lex), b.callout!(lex)],
    "split-band": [b.icon_cards!(lex), shortCitation(lex)],
    "asymmetric-triptych": [b.image!(lex), b.blockquote!(lex)],
    "image-split": [b.image!(lex), b.bullets!(lex), shortParagraph],
    "image-top": [b.image!(lex), b.callout!(lex), shortParagraph],
    "image-bottom": [b.image!(lex), b.blockquote!(lex), shortParagraph],
    "image-annotate": [b.image!(lex), b.bullets!(lex)],
  }

  const mapped = bodies[def.id]
  if (mapped) return capacity < mapped.length ? mapped.slice(0, capacity) : mapped

  const pool: Component[] = wantsImage(def)
    ? [b.image!(lex), shortParagraph, b.bullets!(lex), b.callout!(lex)]
    : [b.paragraph!(lex), b.bullets!(lex), b.kpi_cards!(lex), b.callout!(lex)]
  return pool.slice(0, Math.min(capacity, 3))
}

/** One page pinned onto one layout, typed to whatever that layout accepts. */
export function layoutPage(layoutId: string, lex: Lexicon, assets: CorpusAssets, themeId: string = BASELINE_THEME): PptxIR {
  const def = LAYOUT_REGISTRY[layoutId]
  if (!def) throw new Error(`unknown layout id: ${layoutId}`)
  const slideType = def.slideTypes[0]!

  const slide =
    slideType === "cover"
      ? {
          type: "cover",
          layout: layoutId,
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
            def.id === "gauge-verdict"
              ? [{ type: "bullets", items: lex.bullets.slice(0, 3) }]
              : [],
        }
      : slideType === "chapter"
        ? { type: "chapter", layout: layoutId, heading: lex.chapters[1]!, subheading: lex.kickers[1], components: [] }
        : slideType === "ending"
          ? {
              type: "ending",
              layout: layoutId,
              heading: lex.chapters[5]!,
              subheading: lex.verdicts.positive,
              components:
                def.id === "gauge-next" || def.id === "crayonbox-todo"
                  ? [{ type: "bullets", items: lex.bullets.slice(0, 3) }]
                  : [],
            }
          : {
              type: "content",
              kind: "points",
              layout: layoutId,
              // stat-hero's heading is a hero caption capped at two short
              // lines — the corpus' default row overruns its render-safety
              // floor in English. headings[11] is each lexicon's shortest.
              heading: def.id === "stat-hero" ? lex.headings[11]! : lex.headings[7]!,
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

  return deckShell(lex, assets, themeId, `layout-${layoutId}-${themeId === BASELINE_THEME ? lex.id : `${themeId}-${lex.id}`}`, [typedSlide])
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
const CARTESIAN_CHART_TYPES = new Set(["bar", "line", "scatter", "area"])

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

export function componentPage(
  componentId: string,
  build: (lex: Lexicon) => Component,
  lex: Lexicon,
  assets: CorpusAssets,
  themeId: string = BASELINE_THEME,
  opts: { solo?: boolean } = {},
): PptxIR {
  const component = build(lex)
  const cartesian = isCartesianChart(component)
  const bubble = isBubbleChart(component)
  const solo = opts.solo ?? (FULL_BODY_TYPES.has(component.type) || cartesian)

  // A one-sentence lead-in, not the full corpus paragraph. The paragraph
  // runs long enough in English that it consumed the content rect and the
  // component under review got dropped — the review table was showing the
  // lead-in instead of the thing it exists to show, on 40 pages.
  const leadIn: Component = { type: "paragraph", text: lex.sentences[0]! }

  const slide = {
    type: "content",
    kind: "points",
    // This runway-only form-variant page predates the show curation. Pin the
    // old deterministic pick so a theme redesign cannot masquerade as a
    // steps-component byte change in the component comparison table.
    layout: componentId === "steps · arrow band" ? "stacked-poster" : undefined,
    heading: cartesian && component.chart_type === "scatter" ? lex.scatterHeading : lex.headings[8]!,
    subheading: cartesian
      ? component.chart_type === "scatter"
        ? lex.scatterSubhead
        : lex.sentences[3]
      : undefined,
    components: solo ? [component] : [leadIn, component],
    footnote: bubble ? lex.bubbleSizeNote : cartesian || !solo ? lex.sources[2]!.label : undefined,
  } as unknown as Slide
  const safeId = componentId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
  return deckShell(lex, assets, themeId, `component-${safeId}-${lex.id}`, [slide])
}
