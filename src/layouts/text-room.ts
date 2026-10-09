/**
 * How much of an author's own text a face holds, counted in that text.
 *
 * validate refuses a heading or a subheading a face would not set whole, and
 * tells the author how much of it the face does hold. That number used to be
 * found on a stock sentence of ordinary words and reported against the
 * author's word count, so a heading of six long words could be refused with
 * "about 12 words at most": the stock words were narrower than the author's.
 * The face's real limit is a width, and no count of other words says it.
 *
 * So the room is measured on the text itself. Its own first units (a Chinese
 * text's characters, any other text's words) are handed to the face one
 * prefix at a time, and the limit is the prefix the face still holds whole
 * where one unit more is not. What the message says the face holds is then a
 * piece of this very text the face was asked about, and one unit past it is
 * one the face was asked about too.
 */
import { isChineseText } from "../lib/text-script"
import { parseEmphasis, stripEmphasis } from "../render/emphasis"

/** How much of one text a face holds. */
export interface TextRoom {
  /** How many of the text's units the face holds: the prefix it sets whole, where one unit more it does not. */
  limit: number
  /** How many units the text has. */
  count: number
  /** What `limit` and `count` count: a Chinese text's characters, any other text's words. */
  unit: "characters" | "words"
  /** The first `limit` units, as the page shows them (no emphasis markers). */
  held: string
}

/** Where each unit of `plain` ends, in UTF-16 offsets: every character but a blank of a Chinese text, every word of any other. */
function unitEnds(plain: string, chinese: boolean): number[] {
  const ends: number[] = []
  if (chinese) {
    let at = 0
    for (const char of plain) {
      at += char.length
      if (/\S/u.test(char)) ends.push(at)
    }
    return ends
  }
  for (const match of plain.matchAll(/\S+/gu))
    ends.push(match.index + match[0].length)
  return ends
}

/** The source `text` cut after `length` characters of its plain text, its emphasis markers kept around what stays. */
function sourcePrefix(text: string, length: number): string {
  let left = length
  let out = ""
  for (const segment of parseEmphasis(text)) {
    if (left <= 0) break
    const part = segment.text.slice(0, left)
    left -= part.length
    out += segment.emphasized && part.trim() !== "" ? `**${part}**` : part
  }
  return out
}

/**
 * The room a face gives `text`, where `holds(prefix)` says whether the face
 * sets that prefix of the text whole on the same page. The text itself is
 * taken as not held: callers ask only about a text the face would cut or
 * leave off.
 *
 * Searched by halving between the empty text and the whole one, so `limit`
 * is always a prefix `holds` passed and `limit + 1` one it refused, which is
 * what the message promises, even on a face whose answers do not grow
 * steadily with length.
 */
export function textRoom(
  text: string,
  holds: (prefix: string) => boolean
): TextRoom {
  const plain = stripEmphasis(text)
  const chinese = isChineseText(plain)
  const ends = unitEnds(plain, chinese)
  let lo = 0
  let hi = ends.length
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (holds(sourcePrefix(text, ends[mid - 1]!))) lo = mid
    else hi = mid
  }
  return {
    limit: lo,
    count: ends.length,
    unit: chinese ? "characters" : "words",
    held: lo === 0 ? "" : plain.slice(0, ends[lo - 1]!).trim(),
  }
}

/** The first `units` units of `text`, counted the way {@link textRoom} counts them, its emphasis markers kept. */
export function prefixOf(text: string, units: number): string {
  const plain = stripEmphasis(text)
  const ends = unitEnds(plain, isChineseText(plain))
  return units <= 0
    ? ""
    : sourcePrefix(text, ends[Math.min(units, ends.length) - 1]!)
}
