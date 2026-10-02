import type { Meta, PptxIR } from "@/ir"
import { mostlyChinese } from "./text-script"

/**
 * The words a confidentiality mark prints, in the deck's own language.
 *
 * A Chinese deck never prints 「机密」: in Chinese it is one of the three
 * legal classification levels for state secrets, not a company label. The
 * phrases companies actually put on internal material are 「内部资料，请勿
 * 外传」 and 「仅供内部讨论」 (survey of 87 public decks, 2026-10-02), so
 * those are the defaults. An English deck keeps the familiar single words.
 *
 * `public` has no mark. A public deck is the one without a confidentiality
 * line, which is exactly how public decks look in the survey: listed
 * companies' roadshows, sell-side reports and government briefings carried
 * none.
 *
 * A legal classification ("秘密★1年") is not a level here. It is written by
 * the author into `meta.classification` and printed as given.
 */
export type ConfidentialityLevel = NonNullable<Meta["confidentiality"]>

const LABELS_EN: Record<ConfidentialityLevel, string | null> = {
  public: null,
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
}

const LABELS_ZH: Record<ConfidentialityLevel, string | null> = {
  public: null,
  internal: "仅供内部讨论",
  confidential: "内部资料，请勿外传",
  restricted: "限定范围阅读，请勿转发",
}

/**
 * True when the deck is written in Chinese: more than half of its page
 * headings and subheadings count as Chinese (`mostlyChinese`). Headings are
 * what every page has and what an author writes in the deck's own voice,
 * so they decide, not a locale flag and not the organization name (a
 * Chinese deck may well be for "Acme Ltd.").
 */
export function deckWritesChinese(ir: Pick<PptxIR, "slides">): boolean {
  const texts: string[] = []
  for (const slide of ir.slides) {
    if (slide.heading) texts.push(slide.heading)
    if (slide.subheading) texts.push(slide.subheading)
  }
  return mostlyChinese(texts)
}

/** The printed mark for `level` in a deck of that language, or null when the level prints nothing. */
export function confidentialityLabel(level: ConfidentialityLevel, chinese: boolean): string | null {
  return (chinese ? LABELS_ZH : LABELS_EN)[level]
}
