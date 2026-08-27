import {
  layoutSvgText,
  truncateToUnits,
  type TextWeightHint,
} from "../../lib/svg-text-layout"

const WRAP_PROBE_LINES = 64

/** Wrap at a frozen font size, then clip leftover glyphs. Never paints `…`. */
export function wrapClip(
  text: string,
  opts: {
    maxWidth: number
    fontSize: number
    maxLines: number
    lineHeightRatio?: number
    fontFamily?: string
    bold?: boolean
    minPt?: number
  },
) {
  const weight: TextWeightHint = { fontFamily: opts.fontFamily, bold: opts.bold }
  const fontSize = opts.minPt != null ? Math.max(opts.fontSize, opts.minPt) : opts.fontSize
  const lineHeightRatio = opts.lineHeightRatio ?? 1.35
  const laid = layoutSvgText(text, {
    maxWidth: opts.maxWidth,
    fontSize,
    maxLines: WRAP_PROBE_LINES,
    lineHeightRatio,
    fontFamily: opts.fontFamily,
    bold: opts.bold,
    minPt: fontSize,
  })
  const maxUnits = opts.maxWidth / fontSize
  const kept = laid.lines.slice(0, opts.maxLines)
  const lines = kept.map((line) => truncateToUnits(line, maxUnits, weight))
  return {
    lines,
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio),
    truncated: laid.lines.length > kept.length || lines.some((line, i) => line !== kept[i]),
  }
}
