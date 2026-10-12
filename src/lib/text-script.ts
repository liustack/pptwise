/**
 * Questions asked of a label's own characters: does it carry square-script
 * glyphs (CJK layout), and does it count as Chinese (built-in titles).
 *
 * Deliberately its own character table rather than a reuse of the two that
 * already exist: `svg-text-layout.ts`'s `WIDE_CHAR_RE` classifies characters
 * for *width measurement*, and `people-initials.ts`'s `CJK_IDEOGRAPH_RE`
 * picks a *badge letter*. Neither answers these questions, and widening
 * either one to cover every job would tie unrelated behaviors together.
 */

/**
 * The square scripts themselves. Written as escapes rather than as literal
 * characters so a reader can check a range against a code chart without
 * trusting their own font:
 *
 *   3040-30FF  hiragana and katakana, including ・ and ー
 *   3400-4DBF  CJK Unified Ideographs Extension A
 *   4E00-9FFF  CJK Unified Ideographs
 *   AC00-D7A3  Hangul syllables
 *   F900-FAFF  CJK Compatibility Ideographs
 */
const SQUARE_SCRIPT = "\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7a3\\uf900-\\ufaff"

/** At least one real square glyph. Punctuation and digits alone do not count. */
const HAS_SQUARE_GLYPH_RE = new RegExp(`[${SQUARE_SCRIPT}]`)

/**
 * True when `text` carries at least one square-script glyph. Callout lead
 * words pick the CJK lexicon (风险/注意/提示) vs the English one
 * (Risk/Note/Tip) from this, not from a locale flag.
 */
export function isCjk(text: string): boolean {
  return HAS_SQUARE_GLYPH_RE.test(text)
}

const HAN_RE = /\p{Script=Han}/gu
const KANA_HANGUL_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const LATIN_WORD_RE = /[A-Za-z]+/g

/**
 * True when `text` counts as Chinese for picking built-in titles: it has Han
 * characters, no Japanese kana or Korean hangul, and at least as many Han
 * characters as ASCII letter runs. So "Apple 生态" counts and "Sales grew in
 * 中国" does not. It is a count, not language detection: a short English
 * phrase around a long Chinese name ("Visit 上海", "Made in 中华人民共和国")
 * counts as Chinese, and Japanese written in kanji alone cannot be told
 * apart from Chinese. An author who needs other titles writes them. Which
 * language the titles speak is a different question from how to lay out
 * square glyphs, which is what {@link isCjk} answers.
 */
export function isChineseText(text: string): boolean {
  if (KANA_HANGUL_RE.test(text)) return false
  const han = text.match(HAN_RE)?.length ?? 0
  if (han === 0) return false
  return han >= (text.match(LATIN_WORD_RE)?.length ?? 0)
}

/**
 * True when more than half of the non-empty `texts` count as Chinese
 * ({@link isChineseText}). Components with built-in titles (SWOT, PEST, the
 * five forces, the business model canvas, a waterfall's automatic total)
 * pick their Chinese set from this. A tie, or items of digits and symbols
 * only, stay English. The vote inherits the per-item count's limits.
 */
export function mostlyChinese(texts: readonly string[]): boolean {
  const written = texts.filter((text) => text.trim() !== "")
  return written.filter(isChineseText).length * 2 > written.length
}
