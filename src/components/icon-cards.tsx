import { markedLineSegments, paintMarkedLine, stripEmphasis } from "../render/emphasis"
import { cardGround, HAIRLINE, hairlineInk, isRuled } from "./surfaces"
import type React from "react"
import type { Component } from "@/ir"
import { Icon } from "../render/icons"
import { DroppedContentMarker } from "../render/drop-marker"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag"
import { withBlockTitle } from "./block-title"
import { OmittedText } from "./omitted-text"
import { graphicInk, resolveSemanticColor } from "../render/ink"
import { allowsLineBreakBetween, measureTextUnits } from "../lib/svg-text-layout"
import { columnGutterEm } from "../lib/column-gutter"
import {
  boardTypeScale,
  capFormBody,
  fillCardType,
  formIconColumnCols,
  formLineHeight,
  formTextClipMarker,
  formTextOmission,
  layoutFormBody,
  layoutFormTitle,
  linesThatFit,
} from "./legibility"

type IconCardsComponent = Extract<Component, { type: "icon_cards" }>
type IconCardItem = IconCardsComponent["items"][number]

const GAP = 16
const TITLE_LINE_HEIGHT_RATIO = 1.4
const TEXT_LINE_HEIGHT_RATIO = 1.4
const GAP_NODE_TITLE = 18
const GAP_TITLE_TEXT = 10
const COL_INSET = 16
/**
 * The widest a line of `text` at `size` may be set in a column `colW` wide:
 * the column less the gutter that text keeps from the next column
 * (`columnGutterEm`). Every line is centred in its column, so two
 * neighbouring lines stand at least a gutter apart. Columns used to offer
 * every line the column less 16px, and four services across a vermilion
 * page, or three goals across a crayon one, stood their titles and
 * sentences a few pixels apart and read as one line across the page
 * (2026-10).
 */
function lineMeasure(colW: number, size: number, text: string): number {
  return Math.max(24, colW - columnGutterEm(text) * size)
}
/** The row a card's tag (`items[].tag`) takes under its node: the ordinary tag's 28px label and 10px of air. */
const TAG_ROW = 38

function layoutItemText(
  item: IconCardItem,
  colW: number,
  ctx: ComponentCtx,
  titleSize: number,
  bodySize: number,
  titleMaxLines: number,
  bodyMaxLines: number,
) {
  const titleText = stripEmphasis(item.title)
  const bodyText = stripEmphasis(item.text)
  const title = layoutFormTitle(titleText, {
    maxWidth: lineMeasure(colW, titleSize, titleText),
    fontSize: titleSize,
    fontFamily: ctx.fonts.heading,
    maxLines: Math.max(1, titleMaxLines),
    // A title the measure breaks in two is set in even halves, and then
    // `splitTitleAtWord` moves a break that splits a word.
    balance: true,
  })
  if (title.lines.length === 2 && !title.truncated) {
    title.lines = splitTitleAtWord(titleText, title.lines, lineMeasure(colW, titleSize, titleText), titleSize, ctx.fonts.heading)
  }
  const text =
    bodyMaxLines > 0
      ? layoutFormBody(bodyText, {
          maxWidth: lineMeasure(colW, bodySize, bodyText),
          fontSize: bodySize,
          titleSize,
          maxLines: bodyMaxLines,
          lineHeightRatio: TEXT_LINE_HEIGHT_RATIO,
          fontFamily: ctx.fonts.body,
        })
      : // No line left for a text the card has is the whole text cut, and
        // says so: `geometry` reads `truncated` to decide whether the node
        // should give up height first.
        { lines: [] as string[], fontSize: bodySize, lineHeight: 0, truncated: item.text.trim().length > 0 }
  return { title, text }
}

const NODE_R_MIN = 28

const CJK_CHAR_RE = /[\u3400-\u9fff]/
const WIDE_CHAR_RE = /[\u2e80-\u9fff\uff00-\uffef]/
/** Characters that stand as words of their own between other words. */
const PARTICLE_RE = /[的地得了着过是在和与及或也都就把被之而]/
/** Particles that hold on to the word before them: a line never starts with one. */
const TRAILING_PARTICLE_RE = /^[的地得了着过之]$/

/**
 * The offsets inside Chinese words, where a break would split one.
 *
 * `Intl.Segmenter` does not know many two-character words and hands them
 * back a character at a time (评|测, 标|注, 午|间|延|时). A run of such
 * single characters, other than particles, that is even in length is read
 * as two-character words. An odd run is left open: its pairing could start
 * at either end. A particle that holds on to the word before it (的, 了)
 * counts as part of that word.
 */
function insideTitleWords(text: string): Set<number> {
  const inside = new Set<number>()
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return inside
  let run: number[] = []
  const closeRun = () => {
    if (run.length % 2 === 0) for (let i = 1; i < run.length; i += 2) inside.add(run[i]!)
    run = []
  }
  for (const { segment, index, isWordLike } of new Intl.Segmenter("zh", { granularity: "word" }).segment(text)) {
    if (isWordLike && segment.length === 1 && CJK_CHAR_RE.test(segment) && !PARTICLE_RE.test(segment)) {
      run.push(index)
      continue
    }
    closeRun()
    if (index > 0 && TRAILING_PARTICLE_RE.test(segment)) inside.add(index)
    if (isWordLike && CJK_CHAR_RE.test(segment)) for (let at = index + 1; at < index + segment.length; at += 1) inside.add(at)
  }
  closeRun()
  return inside
}

/**
 * A Chinese title set in two lines, broken between words.
 *
 * The balanced wrap breaks a title in even halves and splits a word to do
 * it (低资源评/测协议, 半自动标/注流水线). A card title is short, so an
 * uneven pair of lines that keeps its words whole reads better: among the
 * breaks whose lines both fit the measure, the one outside a word wins, then
 * the narrower widest line. With no break outside a word the balanced
 * lines stand. A break never falls inside a run of Latin letters or digits
 * (6·14), and neither line is a lone character.
 */
function splitTitleAtWord(text: string, balanced: string[], measure: number, size: number, fontFamily: string | undefined): string[] {
  const content = text.trim()
  if (!CJK_CHAR_RE.test(content)) return balanced
  const inside = insideTitleWords(content)
  const units = (line: string) => measureTextUnits(line, { bold: true, fontFamily }) * size
  let best: { lines: string[]; inside: boolean; widest: number } | null = null
  for (let k = 1; k < content.length; k += 1) {
    const before = content[k - 1]!
    const after = content[k]!
    const spaced = before === " " || after === " "
    if (!spaced && !WIDE_CHAR_RE.test(before) && !WIDE_CHAR_RE.test(after)) continue
    if (!allowsLineBreakBetween(before, after)) continue
    const lines = [content.slice(0, k).trimEnd(), content.slice(k).trimStart()]
    if (lines.some((line) => line.length < 2)) continue
    const widest = Math.max(...lines.map(units))
    if (widest > measure + 1e-6) continue
    const split = { lines, inside: inside.has(k), widest }
    if (!best || (split.inside !== best.inside ? !split.inside : split.widest < best.widest - 1e-6)) best = split
  }
  return best && !best.inside ? best.lines : balanced
}

function nodeRadius(colW: number): number {
  return Math.round(Math.min(44, Math.max(NODE_R_MIN, colW * 0.16)))
}

function stackHeight(layout: ReturnType<typeof layoutItemText>, nodeSize: number, tagRow = 0): number {
  return (
    nodeSize +
    GAP_NODE_TITLE +
    tagRow +
    layout.title.lines.length * layout.title.lineHeight +
    GAP_TITLE_TEXT +
    layout.text.lines.length * layout.text.lineHeight
  )
}

/** How far a ruled column's hairline stops short of the column's edges. */
const COLUMN_INSET = 12

function renderGlyph(
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
): React.ReactElement {
  if (!name) {
    return (
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={Math.max(3, size / 6)}
        fill={color}
      />
    )
  }
  return <Icon name={name} x={x} y={y} size={size} color={color} />
}

function geometry(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  boxH?: number,
) {
  const n = component.items.length
  const cols = formIconColumnCols(n, w, COL_INSET)
  const rows = Math.ceil(n / cols)
  const colW = w / cols
  const natural = columnsAt(component, w, ctx, cols, rows, colW, nodeRadius(colW), boxH)
  // The type keeps the column's sizes over the icon: a row too short for
  // the gutter's extra lines at the node's natural size gives up node
  // height first, and the type is set smaller only when the smallest node
  // still leaves it short.
  let settled = natural
  if (boxH !== undefined && !natural.keptSizes) {
    for (let r = natural.nodeR - 1; r >= NODE_R_MIN; r--) {
      const smaller = columnsAt(component, w, ctx, cols, rows, colW, r, boxH, natural.nodeR)
      if (smaller.keptSizes) {
        settled = smaller
        break
      }
    }
  }
  // The icon is the one thing in a column that is not content. When the box
  // is too short for every title and text at the node's natural size, the
  // node gives up height first, as far as its own floor, before a word goes.
  const cut = (layouts: typeof settled.layouts) => layouts.some((l) => l.title.truncated || l.text.truncated)
  // A column always keeps its icon and a line of title, so a short enough
  // row can be overrun by the stack even with no word cut.
  const tooTall = (res: typeof settled) => res.layouts.some((l) => stackHeight(l, res.nodeSize, res.tagRow) > res.rowH + 1)
  // A cut text keeps its opening and marks the cut. A text with no line
  // left keeps nothing of itself: a tag row under the node can take the
  // height a row of cards had for it.
  const textless = (res: typeof settled) =>
    res.layouts.some((l, i) => l.text.lines.length === 0 && component.items[i]!.text.trim().length > 0)
  if (boxH !== undefined && (cut(settled.layouts) || tooTall(settled))) {
    let shortest: typeof settled | undefined
    for (let r = settled.nodeR - 1; r >= NODE_R_MIN; r--) {
      const smaller = columnsAt(component, w, ctx, cols, rows, colW, r, boxH)
      if (!cut(smaller.layouts) && !tooTall(smaller)) return { ...smaller, declined: false }
      if (!shortest && !tooTall(smaller) && !textless(smaller)) shortest = smaller
    }
    if (!tooTall(settled) && !textless(settled)) return { ...settled, declined: false }
    // Even the smallest icon leaves a column taller than its row, or a card
    // with not one line of its text: the cards decline the box rather than
    // drawing above and below it, or drawing a title over a missing text.
    return shortest ? { ...shortest, declined: false } : { ...settled, declined: true }
  }
  return { ...settled, declined: false }
}

function columnsAt(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  cols: number,
  rows: number,
  colW: number,
  nodeR: number,
  boxH?: number,
  typeR = nodeR,
) {
  const nodeSize = nodeR * 2
  // Every card keeps the tag row when any card has a tag, so the titles in a
  // row stay level.
  const tagRow = component.items.some((item) => item.tag) ? TAG_ROW : 0
  const slotH = boxH != null ? Math.max(1, (boxH - GAP * (rows - 1)) / rows) : undefined
  const start = boardTypeScale(colW, slotH)
  const extraAbove = nodeSize + GAP_NODE_TITLE + tagRow
  const naturalInner =
    extraAbove +
    formLineHeight(start.title) +
    GAP_TITLE_TEXT +
    2 * formLineHeight(start.body)
  const naturalMeasured = rows * naturalInner + (rows - 1) * GAP
  const rowH =
    boxH === undefined
      ? naturalInner
      : Math.max(1, (boxH - GAP * (rows - 1)) / rows)
  const innerH = Math.max(1, rowH)
  // The type is sized under the node it was first sized under, so a node
  // giving up height leaves room for the gutter's lines, not larger type.
  const common = {
    innerH: Math.max(1, innerH - (typeR * 2 + GAP_NODE_TITLE + tagRow)),
    titleSize: start.title,
    bodySize: start.body,
    gap: GAP_TITLE_TEXT,
    longestBody: component.items.map((it) => it.text).sort((a, b) => b.length - a.length)[0],
    titles: component.items.map((it) => it.title),
    fonts: { heading: ctx.fonts.heading, body: ctx.fonts.body },
    titleLhRatio: TITLE_LINE_HEIGHT_RATIO,
    bodyLhRatio: TEXT_LINE_HEIGHT_RATIO,
  }
  // The type is sized on the whole column, as it always was, and then set in
  // each line's own measure, its column less the gutter: the gutter costs a
  // line more of wrapping, not a smaller size, while the row has the height
  // for it. Only a row too short for those lines sizes the type again
  // against the measures themselves (`sizedInMeasure`).
  const sized = fillCardType({ ...common, contentW: Math.max(24, colW - COL_INSET) })
  // A Latin word wider than its measure would break between its letters,
  // so the titles come down only as far as their longest word needs.
  const keptTitle = Math.min(sized.titleSize, widestWordSize(component, colW, ctx))
  const keptBody = capFormBody(keptTitle, sized.bodySize)
  const kept = linesInMeasure(component, colW, ctx, keptTitle, keptBody)
  const keptH = kept.titleLines * formLineHeight(keptTitle, TITLE_LINE_HEIGHT_RATIO) + GAP_TITLE_TEXT + kept.bodyLines * formLineHeight(keptBody, TEXT_LINE_HEIGHT_RATIO)
  const keptSizes = kept.whole && extraAbove + keptH <= innerH
  const filled = keptSizes
    ? { titleSize: keptTitle, bodySize: keptBody, titleMaxLines: kept.titleLines, bodyMaxLines: kept.bodyLines }
    : sizedInMeasure(common, colW, component)
  const fit = linesThatFit({
    innerH,
    titleSize: filled.titleSize,
    bodySize: filled.bodySize,
    gap: GAP_TITLE_TEXT,
    extraAbove,
    // As many title lines as the titles take at the size just chosen, the
    // count that size was chosen against, so the body keeps the rest.
    titleMax: filled.titleMaxLines,
    bodyMax: Math.max(2, filled.bodyMaxLines),
  })
  const layouts = component.items.map((item) =>
    layoutItemText(
      item,
      colW,
      ctx,
      filled.titleSize,
      filled.bodySize,
      fit.titleMaxLines,
      fit.bodyMaxLines,
    ),
  )
  const measuredH = boxH === undefined ? naturalMeasured : Math.min(boxH, rows * rowH + (rows - 1) * GAP)
  return { cols, rows, colW, nodeR, nodeSize, layouts, rowH, measuredH, tagRow, keptSizes }
}

/**
 * The lines every title and text takes at these sizes in its own measure,
 * and whether each is set whole: a title in two lines at most, a text in
 * eight.
 */
function linesInMeasure(component: IconCardsComponent, colW: number, ctx: ComponentCtx, titleSize: number, bodySize: number) {
  let titleLines = 1
  let bodyLines = 0
  let whole = true
  for (const item of component.items) {
    const titleText = stripEmphasis(item.title)
    const title = layoutFormTitle(titleText, { maxWidth: lineMeasure(colW, titleSize, titleText), fontSize: titleSize, fontFamily: ctx.fonts.heading, maxLines: 2, balance: true })
    titleLines = Math.max(titleLines, title.lines.length)
    if (title.truncated || splitsAWord(titleText, lineMeasure(colW, titleSize, titleText), titleSize, ctx.fonts.heading)) whole = false
    if (!item.text.trim()) continue
    const bodyText = stripEmphasis(item.text)
    const text = layoutFormBody(bodyText, { maxWidth: lineMeasure(colW, bodySize, bodyText), fontSize: bodySize, titleSize, maxLines: 8, lineHeightRatio: TEXT_LINE_HEIGHT_RATIO, fontFamily: ctx.fonts.body })
    bodyLines = Math.max(bodyLines, text.lines.length)
    if (text.truncated) whole = false
  }
  return { titleLines, bodyLines: Math.max(component.items.some((it) => it.text.trim()) ? 2 : 0, bodyLines), whole }
}

/**
 * The largest title size at which every Latin word of every title fits its
 * measure whole, or Infinity when no title has one.
 */
function widestWordSize(component: IconCardsComponent, colW: number, ctx: ComponentCtx): number {
  let size = Infinity
  for (const item of component.items) {
    const title = stripEmphasis(item.title)
    const words = title.split(/\s+/).filter((word) => /[A-Za-z]/.test(word))
    if (words.length === 0) continue
    const units = Math.max(...words.map((word) => measureTextUnits(word, { bold: true, fontFamily: ctx.fonts.heading })))
    size = Math.min(size, colW / (units + columnGutterEm(title)) - 1e-3)
  }
  return size
}

/**
 * Whether a Latin word of the title is wider than the measure, so the wrap
 * would break it between letters: 「Co-brande」+「d packs」 on a rally page
 * set at the column's size. A size that does that is no size to keep.
 */
function splitsAWord(title: string, measure: number, size: number, fontFamily: string | undefined): boolean {
  return title
    .split(/\s+/)
    .filter((word) => /[A-Za-z]/.test(word))
    .some((word) => measureTextUnits(word, { bold: true, fontFamily }) * size > measure + 1e-6)
}

/**
 * The type sized against each line's own measure, for a row too short to
 * take the column's sizes with the gutter's extra wrapping. A title that
 * fits one line at the starting size keeps to one line (`fillCardType`).
 */
function sizedInMeasure(common: Omit<Parameters<typeof fillCardType>[0], "contentW" | "measure">, colW: number, component: IconCardsComponent) {
  // One measure for every line, at the widest gutter any card's words keep.
  const words = component.items.map((item) => `${item.title}${item.text}`).join("")
  return fillCardType({ ...common, contentW: Math.max(24, colW - COL_INSET), measure: (size) => lineMeasure(colW, size, words) })
}

function measureIconColumns(component: IconCardsComponent, w: number, ctx: ComponentCtx): number {
  return geometry(component, w, ctx).measuredH
}

export const iconCards: SvgComponent<IconCardsComponent> = {
  measure: measureIconColumns,

  render(component, box, ctx): React.ReactElement {
  const g = geometry(component, box.w, ctx, box.h)
  if (g.declined) {
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <DroppedContentMarker count={1} kind="component" />
      </g>
    )
  }
  // Ruled: no disc behind the icon. Each item hangs from a hairline over
  // its column instead.
  const ruled = isRuled(ctx)
  const fill = cardGround(ctx)
  const ink = ctx.colors.accent
  const iconSize = Math.round(g.nodeR * 0.85)
  const strokeProps = { stroke: ctx.colors.border ?? ctx.colors.muted, strokeWidth: 1 }
  // One top per row: the row's tallest stack is centred in the row, and
  // every column in it starts where that one does. Centring each column on
  // its own height put a short body's icon below its longer neighbour's,
  // so icons and titles stepped across the row.
  const rowStackH = Array.from({ length: g.rows }, (_, row) =>
    Math.max(...g.layouts.slice(row * g.cols, (row + 1) * g.cols).map((l) => stackHeight(l, g.nodeSize, g.tagRow))),
  )

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {component.items.map((item, i) => {
        const col = i % g.cols
        const row = Math.floor(i / g.cols)
        const cx = col * g.colW + g.colW / 2
        const rowY = row * (g.rowH + GAP)
        const layout = g.layouts[i]!
        const stackTop = rowY + (g.rowH - rowStackH[row]!) / 2
        const cy = stackTop + g.nodeR
        const titleTop = stackTop + g.nodeSize + GAP_NODE_TITLE + g.tagRow
        const textTop =
          titleTop + layout.title.lines.length * layout.title.lineHeight + GAP_TITLE_TEXT
        return (
          <g key={i} data-audit-box={`${col * g.colW},${rowY},${g.colW}`} data-audit-column="">
            <OmittedText text={formTextOmission(item.text, layout.text)} />
            {ruled ? (
              <line x1={col * g.colW + COLUMN_INSET} y1={rowY} x2={(col + 1) * g.colW - COLUMN_INSET} y2={rowY} stroke={hairlineInk(ctx)} strokeWidth={HAIRLINE} />
            ) : (
              <circle cx={cx} cy={cy} r={g.nodeR} fill={fill} {...strokeProps} />
            )}
            {renderGlyph(
              item.icon,
              cx - iconSize / 2,
              cy - iconSize / 2,
              iconSize,
              // A card that says what kind of news it is draws its icon in the theme's ink for it.
              item.tone ? graphicInk(resolveSemanticColor(item.tone, ctx.colors), fill) : ink,
            )}
            {item.tag ? paintCardTag(item.tag, cx, stackTop + g.nodeSize + GAP_NODE_TITLE, g.colW, ctx) : null}
            {layout.title.lines.map((line, li) =>
              paintMarkedLine(
                ctx,
                markedLineSegments(item.title, layout.title.lines)[li]!,
                { baseFill: ctx.colors.text, fontWeight: "700", fontFamily: ctx.fonts.heading, bg: fill },
                <text
                  key={`t-${li}`}
                  data-truncated={formTextClipMarker(layout.title, li)}
                  x={cx}
                  y={titleTop + li * layout.title.lineHeight + layout.title.fontSize}
                  textAnchor="middle"
                  fontSize={layout.title.fontSize}
                  fontWeight="700"
                  fill={ctx.colors.text}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>,
              ),
            )}
            {layout.text.lines.map((line, li) =>
              paintMarkedLine(
                ctx,
                markedLineSegments(item.text, layout.text.lines)[li]!,
                { baseFill: ctx.colors.muted, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false, bg: fill },
                <text
                  key={li}
                  data-truncated={formTextClipMarker(layout.text, li)}
                  x={cx}
                  y={textTop + li * layout.text.lineHeight + layout.text.fontSize}
                  textAnchor="middle"
                  fontSize={layout.text.fontSize}
                  fill={ctx.colors.muted}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>,
              ),
            )}
          </g>
        )
      })}
    </g>
  )
  },
}

/**
 * A card's tag, centred in its row under the node, at the ordinary size and
 * in the ordinary inks. A tag wider than its column's measure is declared
 * dropped rather than cut.
 */
function paintCardTag(tag: NonNullable<IconCardItem["tag"]>, cx: number, top: number, colW: number, ctx: ComponentCtx): React.ReactElement {
  const spec = ordinaryTagSpec(ctx)
  const w = tagWidth(tag.text, spec)
  if (w > lineMeasure(colW, spec.size, tag.text)) return <g data-dropped={1} data-dropped-kind="label" />
  return paintTag({ tag, x: cx - w / 2, y: top, spec, inks: tagInks(ctx, tag, false, ctx.defaultBg ?? ctx.colors.bg, spec.size) })
}

// A title, when the cards carry one, is set over them as on a table.
export const renderDef: RenderDef<IconCardsComponent> = withBlockTitle({
  type: "icon_cards",
  measure: iconCards.measure,
  render: iconCards.render,
})
