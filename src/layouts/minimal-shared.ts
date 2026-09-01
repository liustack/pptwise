import type { Slide } from "@/ir"

/**
 * Convert an em tracking value to SVG `letterSpacing` px at `fontSize`.
 * Kickers and attributions on the editorial-verse layouts use em tracking
 * (label grammar), and `fitSvgLine` budgets spacing in absolute px.
 */
export function trackingPx(fontSize: number, em: number): number {
  return Math.round(fontSize * em)
}

/**
 * Uppercase Latin letters only. CJK, digits, and punctuation pass through
 * unchanged (`String#toUpperCase` is a no-op on them), matching the
 * "uppercase for Latin labels, never for body" rule.
 */
export function latinUpper(text: string): string {
  return text.replace(/[A-Za-z]+/g, (run) => run.toUpperCase())
}

export function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text)
}

const CJK_CHAR_RE = /[\u3400-\u9fff]/
const SEAL_SPLIT_RE = /[·•|｜/\s]+/
const STUDIO_SUFFIXES = ["书院", "书斋", "斋", "堂", "阁", "馆", "社", "楼", "居", "轩", "庵", "园"] as const
const ORG_SUFFIXES = ["中心", "公司", "集团", "科技", "有限", "部", "组", "处", "科", "室"] as const

function cjkRun(text: string): string {
  return [...text].filter((ch) => CJK_CHAR_RE.test(ch)).join("")
}

/**
 * Cover / ending vermilion-seal glyph from an organization name.
 * Empty or non-CJK → no seal. Studio suffixes take the first CJK of the
 * prefix. Modern org suffixes, and names longer than 4 CJK that are not
 * studio-like, refuse the seal entirely so the square is not painted empty.
 */
export function sealStudioGlyph(org: string | undefined): string | undefined {
  if (!org?.trim()) return undefined
  const first = org.split(SEAL_SPLIT_RE).find((part) => part.length > 0)
  if (!first) return undefined
  const cjk = cjkRun(first)
  if (!cjk) return undefined
  for (const suffix of STUDIO_SUFFIXES) {
    if (!cjk.endsWith(suffix)) continue
    const prefix = cjk.slice(0, cjk.length - suffix.length)
    return prefix[0]
  }
  for (const suffix of ORG_SUFFIXES) {
    if (cjk.endsWith(suffix)) return undefined
  }
  if (cjk.length >= 2 && cjk.length <= 4) return cjk[0]
  return undefined
}

/**
 * Chapter-index kicker for `verse-chapter`. The large heading is the verse
 * itself, so the kicker carries only the index — duplicating `heading` here
 * would print the same line twice.
 */
export function chapterIndexKicker(n: number, heading: string | undefined): string {
  if (hasCjk(heading ?? "")) return `第 ${n} 章`
  return `CHAPTER ${String(n).padStart(2, "0")}`
}

/**
 * Attribution line for `statement`: the single legal body component is the
 * source, never a card. Quote attribution wins over quote text. Subheading
 * is the no-component fallback.
 */
export function statementAttribution(slide: Slide): string | undefined {
  const component = slide.components[0]
  if (component?.type === "blockquote") {
    const fromQuote = component.attribution?.trim() || component.text.trim()
    if (fromQuote) return fromQuote
  }
  if (component?.type === "paragraph") {
    const text = component.text.trim()
    if (text) return text
  }
  if (component?.type === "citation") {
    const label = component.sources[0]?.label?.trim()
    if (label) return label
  }
  const sub = slide.subheading?.trim()
  return sub || undefined
}

/**
 * The `pull-quote` family's field contract, shared by the generic face and
 * every theme skin of it.
 *
 * The quote a reader sees is the quote an author wrote: `blockquote.text`,
 * set at hero size. A page with no blockquote has no component quote to set,
 * and there the heading is the quote — that is this face's declared semantic
 * (the same posture `stat-hero` takes when no `kpi_cards` supplies its
 * numeral), not the heading standing in for component content that exists
 * and is being ignored.
 */
function quoteComponent(slide: Slide) {
  const component = slide.components[0]
  if (component?.type !== "blockquote") return undefined
  return component.text.trim() ? component : undefined
}

/** The hero line: the authored quote, or the heading when no quote component exists. */
export function pullQuoteText(slide: Slide): string {
  return quoteComponent(slide)?.text.trim() ?? slide.heading?.trim() ?? ""
}

/**
 * The small context line above the quote — the page's own words, in the
 * kicker register: heading and subheading, in that order, joined when an
 * author wrote both.
 *
 * The heading drops out of this line exactly when it is itself the quote
 * (no blockquote component on the page), so one sentence is never set twice
 * on one page. The subheading never drops out: nothing else on this face
 * paints it, and a face that declares a `subheading` slot has promised to
 * draw one.
 */
export function pullQuoteContext(slide: Slide): string | undefined {
  const sub = slide.subheading?.trim()
  if (!quoteComponent(slide)) return sub || undefined
  const parts = [slide.heading?.trim(), sub].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(" \u00b7 ") : undefined
}

/**
 * Attribution line for `pull-quote`: the quote's or citation's own field.
 *
 * There is no `subheading` fallback. A subheading is the page's structure,
 * not the quote's source, and printing it under a quote credits a line the
 * author never attributed to anyone.
 */
export function pullQuoteAttribution(slide: Slide): string | undefined {
  const component = slide.components[0]
  if (component?.type === "blockquote") {
    const fromQuote = component.attribution?.trim()
    if (fromQuote) return fromQuote
  }
  if (component?.type === "citation") {
    const label = component.sources[0]?.label?.trim()
    if (label) return label
  }
  return undefined
}

/** Body prose for `pull-quote`: only a paragraph component, never the quote itself. */
export function pullQuoteBody(slide: Slide): string | undefined {
  const component = slide.components[0]
  if (component?.type === "paragraph") {
    const text = component.text.trim()
    if (text) return text
  }
  return undefined
}

type KpiItem = { value: string; unit?: string; label: string; source?: string }

function kpiHero(slide: Slide): KpiItem | undefined {
  const component = slide.components[0]
  if (component?.type === "kpi_cards" && component.items.length > 0) {
    return component.items[0]
  }
  return undefined
}

/** Hero numeral for `stat-hero`: kpi_cards[0].value, else the heading. */
export function heroValue(slide: Slide): string {
  const kpi = kpiHero(slide)
  const fromKpi = kpi?.value.trim()
  if (fromKpi) return fromKpi
  return slide.heading?.trim() ?? ""
}

export function heroUnit(slide: Slide): string | undefined {
  const unit = kpiHero(slide)?.unit?.trim()
  return unit || undefined
}

export function heroCaption(slide: Slide): string | undefined {
  const kpi = kpiHero(slide)
  if (kpi) {
    const heading = slide.heading?.trim()
    if (heading && heading !== kpi.value.trim()) return heading
    const label = kpi.label.trim()
    return label || undefined
  }
  return slide.subheading?.trim() || undefined
}

export function heroSource(slide: Slide): string | undefined {
  const kpi = kpiHero(slide)
  const fromKpi = kpi?.source?.trim()
  if (fromKpi) return fromKpi
  const component = slide.components[0]
  if (!kpi && component?.type === "citation") {
    const label = component.sources[0]?.label?.trim()
    if (label) return label
  }
  if (!kpi && component?.type === "paragraph") {
    const text = component.text.trim()
    if (text) return text
  }
  const footnote = slide.footnote?.trim()
  if (footnote) return footnote
  if (kpi) {
    const sub = slide.subheading?.trim()
    if (sub) return sub
  }
  return undefined
}
