import React from "react"
import { META_FONT_FLOOR_PX } from "../constants"
import {
  fitSvgLine,
  measureTextUnits,
  truncateToUnits,
  type TextWeightHint,
} from "../lib/svg-text-layout"
import { resolveComponentForm } from "../components/form-assignments"
import { formLegibleInk } from "../components/legibility"

/** One run of text with its emphasis state, in source (unmarked) text order. */
export interface EmphasisSegment {
  text: string
  emphasized: boolean
}

/** `**bold**` markdown subset — non-greedy so adjacent pairs don't merge. */
const EMPHASIS_RE = /\*\*(.+?)\*\*/g

/**
 * Splits `text` on a `**bold**` markdown subset into ordered segments whose
 * concatenated `.text` reconstructs the original text with the `**` markers
 * removed (see `stripEmphasis`, which relies on exactly this).
 *
 * Nesting isn't supported — the regex matches left to right, so
 * `"**a **b** c**"` treats the first `**` it can close as one emphasized run,
 * not a nested one. An unclosed `**` (no matching close) never matches, so it
 * falls through untouched as literal text; the same is true of an empty pair
 * (`"****"`) since `(.+?)` requires at least one character between markers.
 */
export function parseEmphasis(text: string): EmphasisSegment[] {
  const segments: EmphasisSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(EMPHASIS_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), emphasized: false })
    }
    segments.push({ text: match[1], emphasized: true })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), emphasized: false })
  }
  return segments
}

/** Strips `**` markers, returning plain text — the fit chain's (measure/wrap/truncate) input. */
export function stripEmphasis(text: string): string {
  return parseEmphasis(text)
    .map((s) => s.text)
    .join("")
}

/**
 * Renders segments as SVG `tspan`s: plain runs get `fill={baseFill}`,
 * emphasized runs get `fill={accent} fontWeight={opts.fontWeight ?? "600"}`.
 * When there's a single non-emphasized segment (the common case — no `**` in
 * the source text) this returns the bare string instead of wrapping it in a
 * `tspan`, so unmarked text renders byte-identical to before this primitive
 * existed.
 *
 * `fontWeight` defaults to `"600"` — the weight paragraph/bullets/callout
 * have always used — so those three existing callers are unaffected by
 * passing no `fontWeight` at all. Pass an explicit value (e.g. `"700"`) for a
 * caller whose own base weight is heavier than 600 and wants its emphasized
 * runs to stand out a full step above that (verdict_banner; template
 * subheadings).
 */
export function renderEmphasisTspans(
  segments: EmphasisSegment[],
  opts: { accent: string; baseFill: string; fontWeight?: string },
): React.ReactNode {
  if (segments.length === 0) return ""
  if (segments.length === 1 && !segments[0].emphasized) {
    return segments[0].text
  }
  return segments.map((seg, i) =>
    seg.emphasized
      ? React.createElement("tspan", { key: i, fill: opts.accent, fontWeight: opts.fontWeight ?? "600" }, seg.text)
      : React.createElement("tspan", { key: i, fill: opts.baseFill }, seg.text),
  )
}

export type EmphasisFormId = "tint" | "pad" | "underline"

export interface EmphasisLineRender {
  pads: React.ReactNode
  tspans: React.ReactNode
}

export function resolveEmphasisForm(themeId: string | undefined): EmphasisFormId {
  const form = resolveComponentForm("emphasis", themeId)?.form
  if (form === "pad") return "pad"
  if (form === "underline") return "underline"
  return "tint"
}

/** Hand-drawn quadratic chalk stroke whose x-span equals `width`. */
function chalkUnderlineD(x: number, width: number, y: number): string {
  const span = Math.max(width, 1)
  const ctrlDx = span * (200 / 420)
  const ctrlDy = Math.max(4, Math.min(10, span * 0.05))
  return `M ${x} ${y} q ${ctrlDx} ${ctrlDy} ${span} 2`
}

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function hashUnit(h: number, i: number): number {
  const mixed = Math.abs((h ^ Math.imul(i + 1, 2654435761)) | 0)
  return (mixed % 1000) / 999
}

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

/**
 * Marker-pen pad: a filled quad whose corners miss a true rectangle by a
 * few pixels. Offsets come from a djb2 of the run, never Math.random.
 */
function markerPadD(opts: {
  x: number
  y: number
  width: number
  height: number
  seed: string
}): string {
  const { x, y, width, height, seed } = opts
  const h = djb2(seed)
  const signed = (i: number) => hashUnit(h, i) * 2 - 1
  const jitter = Math.min(7, Math.max(1.6, height * 0.14))
  const overshoot = Math.min(10, Math.max(2.2, width * 0.06))
  const tilt = signed(0) * jitter * 0.55
  const tlx = r1(x + signed(1) * jitter * 0.45 + tilt)
  const tly = r1(y + signed(2) * jitter * 0.32)
  const trx = r1(x + width + signed(3) * jitter * 0.5 + overshoot * (0.15 + 0.45 * hashUnit(h, 4)) + tilt)
  const try_ = r1(y + signed(5) * jitter * 0.28)
  const brx = r1(x + width + signed(6) * jitter * 0.48 + overshoot * (0.3 + 0.4 * hashUnit(h, 7)) - tilt)
  const bry = r1(y + height + signed(8) * jitter * 0.28)
  const blx = r1(x + signed(9) * jitter * 0.45 - overshoot * (0.12 + 0.28 * hashUnit(h, 10)) - tilt)
  const bly = r1(y + height + signed(11) * jitter * 0.26)
  return `M ${tlx} ${tly} L ${trx} ${try_} L ${brx} ${bry} L ${blx} ${bly} Z`
}

/**
 * Renders one already-fitted emphasis line. The default tint branch delegates
 * to `renderEmphasisTspans` unchanged. A theme-assigned pad branch derives run
 * offsets and widths with the same `measureTextUnits` weight hint its caller
 * used for fitting, then returns foreground rectangles separately so callers
 * can place them immediately before their existing `<text>` element. The
 * underline branch reuses that run geometry for a chalk quadratic under each
 * emphasized run and keeps tint-like ink on the tspans.
 */
export function renderEmphasisLine(
  segments: EmphasisSegment[],
  opts: {
    accent: string
    padFill?: string
    baseFill: string
    fontSize: number
    x: number
    baselineY: number
    themeId?: string
    fontWeight?: string
    measureWeight?: TextWeightHint
    textAnchor?: "start" | "middle" | "end"
  },
): EmphasisLineRender {
  const form = resolveEmphasisForm(opts.themeId)
  const tspansTint = renderEmphasisTspans(segments, {
    accent: opts.accent,
    baseFill: opts.baseFill,
    fontWeight: opts.fontWeight,
  })
  if (form === "tint" || !segments.some((segment) => segment.emphasized && segment.text.length > 0)) {
    return {
      pads: null,
      tspans: tspansTint,
    }
  }

  const widths = segments.map(
    (segment) => measureTextUnits(segment.text, opts.measureWeight) * opts.fontSize,
  )
  const lineWidth = widths.reduce((sum, width) => sum + width, 0)
  const startX =
    opts.textAnchor === "middle"
      ? opts.x - lineWidth / 2
      : opts.textAnchor === "end"
        ? opts.x - lineWidth
        : opts.x
  const padFill = opts.padFill ?? opts.accent

  if (form === "underline") {
    const underlineY = opts.baselineY + opts.fontSize * 0.12
    let cursorX = startX
    const pads = segments.flatMap((segment, index) => {
      const width = widths[index] ?? 0
      const path =
        segment.emphasized && segment.text.length > 0
          ? [
              React.createElement("path", {
                key: index,
                d: chalkUnderlineD(cursorX, width, underlineY),
                fill: "none",
                stroke: padFill,
                strokeWidth: 3,
                strokeLinecap: "round",
                "data-emphasis-underline": "",
              }),
            ]
          : []
      cursorX += width
      return path
    })
    return { pads, tspans: tspansTint }
  }

  const xPadding = opts.fontSize * 0.1
  const height = opts.fontSize * 1.1
  const y = opts.baselineY - opts.fontSize * 0.85
  let cursorX = startX
  const textXs: number[] = []
  const pads = segments.flatMap((segment, index) => {
    const width = widths[index] ?? 0
    textXs[index] = cursorX
    const path =
      segment.emphasized && segment.text.length > 0
        ? [
            React.createElement("path", {
              key: index,
              d: markerPadD({
                x: cursorX - xPadding,
                y,
                width: width + xPadding * 2,
                height,
                seed: `${segment.text}:${r1(cursorX)}:${r1(y)}:${r1(width)}:${r1(opts.fontSize)}`,
              }),
              fill: padFill,
              "data-emphasis-pad": "",
            }),
          ]
        : []
    cursorX += width
    return path
  })
  const padInk = formLegibleInk(opts.baseFill, padFill, opts.fontSize)
  const tspans = segments.map((segment, index) => {
    const x = textXs[index] ?? startX
    return segment.emphasized
      ? React.createElement(
          "tspan",
          {
            key: index,
            x,
            fill: padInk,
            fontWeight: opts.fontWeight ?? "600",
            textAnchor: "start",
            "data-emphasis-pad-fill": padFill,
          },
          segment.text,
        )
      : React.createElement(
          "tspan",
          { key: index, x, fill: opts.baseFill, textAnchor: "start" },
          segment.text,
        )
  })
  return {
    pads,
    tspans,
  }
}

/**
 * Minimal-consumer wrapper around `renderEmphasisLine`. The caller supplies
 * its existing text element, preserving that element's attribute order and
 * therefore the tint branch's serialized bytes. The helper reads only the
 * numeric line geometry needed for pad placement, clones the text with the
 * generated tspans, and puts every pad before that clone.
 */
export function renderEmphasisText(
  segments: EmphasisSegment[],
  opts: {
    accent: string
    padFill?: string
    baseFill: string
    themeId?: string
    fontWeight?: string
    measureWeight?: TextWeightHint
  },
  textElement: React.ReactElement<React.SVGProps<SVGTextElement>>,
): React.ReactElement {
  const x = Number(textElement.props.x ?? 0)
  const baselineY = Number(textElement.props.y)
  const fontSize = Number(textElement.props.fontSize)
  if (![x, baselineY, fontSize].every(Number.isFinite)) {
    throw new Error("emphasis text requires numeric x, y, and fontSize")
  }
  const textAnchor =
    textElement.props.textAnchor === "middle" || textElement.props.textAnchor === "end"
      ? textElement.props.textAnchor
      : "start"
  const rendered = renderEmphasisLine(segments, {
    ...opts,
    x,
    baselineY,
    fontSize,
    textAnchor,
  })
  return React.createElement(
    React.Fragment,
    { key: textElement.key },
    rendered.pads,
    React.cloneElement(textElement, undefined, rendered.tspans),
  )
}

interface EmphasisChar {
  char: string
  emphasized: boolean
}

function flattenSegments(segments: EmphasisSegment[]): EmphasisChar[] {
  const chars: EmphasisChar[] = []
  for (const seg of segments) {
    for (const char of Array.from(seg.text)) {
      chars.push({ char, emphasized: seg.emphasized })
    }
  }
  return chars
}

function collapseChars(chars: EmphasisChar[]): EmphasisSegment[] {
  const segments: EmphasisSegment[] = []
  for (const c of chars) {
    const last = segments[segments.length - 1]
    if (last && last.emphasized === c.emphasized) {
      last.text += c.char
    } else {
      segments.push({ text: c.char, emphasized: c.emphasized })
    }
  }
  return segments
}

/**
 * Re-attaches emphasis flags from `segments` (parsed from the original
 * `**marked**` source, whose concatenated text is the plain string the fit
 * chain — `layoutSvgText` — wrapped into `lines`) onto each already-wrapped
 * line.
 *
 * `lines` must be a gap-free partition of `segments`' concatenated text (i.e.
 * the direct, not-yet-truncated output of the wrap step) — every source
 * character has to show up in some line, just possibly with whitespace
 * trimmed/collapsed at trim or line-break boundaries. If a line was already
 * cut short by `truncateToUnits` (its tail replaced with `…`), the source
 * characters that got discarded are simply missing from `lines` with no
 * trace of how many there were, so later lines would desync against a
 * cursor stuck mid-discard. Call this on the pre-truncation lines and use
 * `truncateEmphasisSegments` afterward to reproduce per-line truncation.
 *
 * Implementation: walks the flattened source characters and each line's
 * characters in lockstep; a source character not present at the cursor is
 * only skipped if it's whitespace (the collapsed/dropped case). A run split
 * across a line break continues its emphasis on both resulting lines.
 */
export function sliceEmphasisForLines(segments: EmphasisSegment[], lines: string[]): EmphasisSegment[][] {
  const chars = flattenSegments(segments)
  let cursor = 0
  return lines.map((line) => {
    const lineChars: EmphasisChar[] = []
    let lastEmphasized = false
    for (const ch of Array.from(line)) {
      while (cursor < chars.length && chars[cursor].char !== ch && /\s/.test(chars[cursor].char)) {
        cursor += 1
      }
      if (cursor < chars.length && chars[cursor].char === ch) {
        lastEmphasized = chars[cursor].emphasized
        lineChars.push({ char: ch, emphasized: lastEmphasized })
        cursor += 1
      } else {
        // Not found verbatim at the cursor — carry forward whatever emphasis
        // was last matched (covers a caller passing an already-truncated
        // line's trailing "…", though `truncateEmphasisSegments` is the
        // correct way to produce per-line truncation).
        lineChars.push({ char: ch, emphasized: lastEmphasized })
      }
    }
    return collapseChars(lineChars)
  })
}

/**
 * Truncates one line's segment table to `maxUnits`, mirroring
 * `truncateToUnits`'s budget/ellipsis behavior exactly (it's used
 * internally to decide *whether* and *where* to cut) but keeping each kept
 * character's emphasis flag, and giving the appended `…` the emphasis of
 * the last character kept before it — so truncation landing inside an
 * emphasized run stays emphasized through the `…`.
 *
 * Safe to call per-line, independently, on the output of
 * `sliceEmphasisForLines` — unlike truncating the line text first and then
 * slicing, this never desyncs later lines because it only ever looks at
 * this one line's own (gap-free) segment table.
 */
export function truncateEmphasisSegments(
  segments: EmphasisSegment[],
  maxUnits: number,
  weight?: TextWeightHint,
): EmphasisSegment[] {
  const text = segments.map((s) => s.text).join("")
  const truncated = truncateToUnits(text, maxUnits, weight)
  if (truncated === text) return segments

  const keptLen = Array.from(truncated).length
  const chars = flattenSegments(segments)
  return collapseChars(chars.slice(0, keptLen))
}

/**
 * Single-line counterpart to the `sliceEmphasisForLines` + `truncateEmphasisSegments`
 * pair above: fits `text`'s plain (emphasis-stripped) form via `fitSvgLine`
 * (shrink-then-truncate, never wrap — unlike `layoutSvgText`'s multi-line fit
 * chain, so there is no per-line slicing step here) and re-attaches emphasis
 * flags onto the result, including on the truncation ellipsis if the line had
 * to be cut.
 *
 * The truncation budget passed to `truncateEmphasisSegments` (`maxWidth /
 * minFontSize`) mirrors `fitSvgLine`'s own internal truncate-branch budget
 * exactly for the no-`letterSpacing` case this helper is scoped to (every
 * current caller is a plain accent sentence, not a letter-spaced label) —
 * `fitSvgLine` only reaches its truncate branch when the natural fit would
 * drop below `minFontSize`, which is precisely when the plain text's measured
 * units exceed this same budget, so `truncateEmphasisSegments` no-ops
 * (returns `segments` unchanged) in exactly the cases `fitSvgLine` leaves
 * `text` unchanged, and cuts at the same point otherwise.
 *
 * Returns `null` for empty/whitespace-only text, mirroring the
 * `slide.xxx ? fitSvgLine(...) : null` guard every other single-line caller
 * in this codebase already uses.
 */
export function fitEmphasisLine(
  text: string | undefined,
  opts: { maxWidth: number; fontSize: number; minFontSize?: number },
): { fontSize: number; segments: EmphasisSegment[]; truncated: boolean } | null {
  if (!text || !text.trim()) return null
  const minFontSize = opts.minFontSize ?? META_FONT_FLOOR_PX
  const fitted = fitSvgLine(stripEmphasis(text), {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    minFontSize,
  })
  const maxUnits = opts.maxWidth / minFontSize
  const segments = truncateEmphasisSegments(parseEmphasis(text), maxUnits)
  // `fitted.truncated` is authoritative for this call too (bench-driven fix
  // round, defect E) — see this function's own doc comment: the budget
  // passed to `truncateEmphasisSegments` mirrors `fitSvgLine`'s internal
  // truncate-branch budget exactly, so the two always agree on *whether* a
  // cut happened, not just where.
  return { fontSize: fitted.fontSize, segments, truncated: fitted.truncated }
}
