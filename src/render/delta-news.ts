import { resolveSemanticColor, type SemanticColorTokens } from "./ink"

/**
 * What a figure's move means to the reader: good news or bad.
 *
 * A `kpi_cards` item says which way its figure moved (`delta`) and, when the
 * direction alone would mislead, whether that move is good news
 * (`delta_good`): a delivery time that fell, a return rate that rose. Left
 * unsaid, a rise reads as good and a fall as bad, as every face drew it
 * before the author could say otherwise.
 *
 * Every face that colours a move asks here, so the kpi cards, the bento
 * cards, the panel and ticker figures, gauge-stats' notes and the
 * invitation's pills all agree on which moves are good news. A face decides
 * only how good and bad news look on its own page.
 */
export type DeltaNews = "good" | "bad"

interface DeltaItem {
  readonly delta?: "up" | "down" | "flat"
  readonly delta_good?: boolean
}

/** The news a figure's move is, or `null` for a figure that held level or has no move. */
export function deltaNews(item: DeltaItem): DeltaNews | null {
  if (item.delta === undefined || item.delta === "flat") return null
  const good = item.delta_good ?? item.delta === "up"
  return good ? "good" : "bad"
}

/**
 * The theme's colour for a figure's news: `success` for good news, `danger`
 * for bad, `null` when there is no news. Raw: each caller holds it to the
 * contrast its size needs on the ground it paints on (`accessibleInk`).
 */
export function deltaNewsInk(item: DeltaItem, colors: SemanticColorTokens): string | null {
  const news = deltaNews(item)
  if (news === null) return null
  return resolveSemanticColor(news === "good" ? "success" : "danger", colors)
}
