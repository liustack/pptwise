import type { Slide } from "@/ir"
import { stripEmphasis } from "../render/emphasis"

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
 * The source line of a page with one small line for "where this came from",
 * and the page's own `footnote` with it.
 *
 * The statement, pull-quote and stat-hero families each set one such line
 * under their claim: the quote's speaker, the figure's source, the sentence
 * under a claim. The page's `footnote` is a source too, and none of them
 * printed it once something else had the line, so a page that wrote both
 * lost its footnote with nothing to say so. Both go on the line now, the
 * component's first, joined the way a kicker joins two of the page's texts.
 */
export function joinSources(primary: string | undefined, footnote: string | undefined): string | undefined {
  const parts = [primary?.trim(), footnote?.trim()].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(" \u00b7 ") : undefined
}

/** The two texts a `statement`-family page can put under its claim. */
export interface StatementLines {
  /**
   * The quote itself, when the body component is a `blockquote`.
   *
   * A face that has room for it paints it; a face that does not must not
   * pretend the page never had one.
   */
  readonly quote?: string
  /**
   * The small line naming where the claim came from: the quote's speaker,
   * the paragraph, or the subheading.
   */
  readonly source?: string
}

/**
 * The `statement` family's field contract.
 *
 * A statement page is a claim set large and a line or two underneath. The
 * claim is `slide.heading`. Everything underneath is the author's: the source
 * they cited, the speaker they quoted, the sentence they wrote, the
 * subheading they typed. The single legal body component supplies it, never a
 * card, and never a line this repository composed.
 *
 * The split matters because a `blockquote` carries two authored texts, not
 * one. `gauge-point` and `crayonbox-point` used to read the attribution and
 * leave `text` — the quote itself — unpainted, which put a speaker's name on
 * a page that never showed what they said. Faces with room for both read
 * both fields here; the skins read them through `fitStatementSource`
 * (`sparse/shared.ts`).
 */
export function statementLines(slide: Slide): StatementLines {
  return bodyStatementLines(slide) ?? { source: slide.subheading?.trim() || undefined }
}

/**
 * The lines the page's body component fills under the claim, or `undefined`
 * when it leaves them to the subheading. A face that sets the subheading
 * only there declares it (`LayoutDefinition.subheading: "in-body"`), and
 * validate refuses a subheading on a page whose body fills them.
 */
export function bodyStatementLines(slide: Pick<Slide, "components">): StatementLines | undefined {
  const component = slide.components[0]
  if (component?.type === "blockquote") {
    const quote = component.text.trim() || undefined
    const source = component.attribution?.trim() || undefined
    if (quote || source) return { quote, source }
  }
  if (component?.type === "paragraph") {
    const text = component.text.trim()
    if (text) return { source: text }
  }
  return undefined
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
 * The texts under a `pull-quote`: the quote's own attribution, and the
 * page's `footnote`, which stands under it on lines of its own
 * (`fitPullQuoteSource`).
 *
 * There is no `subheading` fallback. A subheading is the page's structure,
 * not the quote's source, and printing it under a quote credits a line the
 * author never attributed to anyone.
 */
export function pullQuoteSourceParts(slide: Slide): { attribution?: string; footnote?: string } {
  const component = slide.components[0]
  const attribution = component?.type === "blockquote" ? component.attribution?.trim() || undefined : undefined
  return { attribution, footnote: slide.footnote?.trim() || undefined }
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

/**
 * The line under the hero numeral: what the number is.
 *
 * With a `kpi_cards` on the page that is the card's own `label`. The heading
 * used to take this position whenever it differed from the value, which left
 * the label — a text the author wrote into a component — painted nowhere at
 * all. The page's own heading does not compete with the component for the
 * one caption row; it yields.
 *
 * With no kpi component the heading is the hero numeral itself (see
 * `heroValue`), so the caption falls to the subheading.
 */
export function heroCaption(slide: Slide): string | undefined {
  const kpi = kpiHero(slide)
  if (kpi) return kpi.label.trim() || undefined
  return slide.subheading?.trim() || undefined
}

/**
 * The two texts under a hero figure: the line that says where the figure
 * came from (the card's `source`, the paragraph, or with neither and no
 * footnote the subheading), and the page's own `footnote`, which stands under
 * it on lines of its own (`fitSourceBlock`).
 */
export function heroSourceParts(slide: Slide): { primary?: string; footnote?: string } {
  const kpi = kpiHero(slide)
  const component = slide.components[0]
  const paragraph = !kpi && component?.type === "paragraph" ? component.text.trim() : undefined
  const footnote = slide.footnote?.trim() || undefined
  const primary = kpi?.source?.trim() || paragraph || (kpi && !footnote ? slide.subheading?.trim() : undefined) || undefined
  return { primary, footnote }
}

/**
 * Whether the page's own heading and subheading land somewhere on the hero.
 *
 * With no figure component they always do: the heading is the hero and the
 * subheading its caption. With a figure, the hero line is the figure and the
 * caption row is the card's label (`heroValue`, `heroCaption`), and the
 * heading has no line of its own, so a page with a figure on it lands its
 * heading nowhere. A heading that repeats the label word for word still
 * counts: the author wrote it twice and the hero would set it once. The
 * subheading lands only on an empty source line (`heroSource`), so one
 * beside a cited source lands nowhere either. The face that reads these
 * steps aside for such a page rather than leave a line of it out.
 */
export function heroSetsPageText(slide: Slide): boolean {
  const kpi = kpiHero(slide)
  if (!kpi) return true
  if (stripEmphasis(slide.heading ?? "").trim()) return false
  const sub = slide.subheading?.trim()
  return !sub || !joinSources(kpi.source, slide.footnote)
}
