import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { fitFixed, paintLines } from "./type"
import { blockTag, compositionTag, type Composition } from "./shared"
import { cardsDossier } from "./cards-dossier"
import {
  CALLOUT_ICON,
  CONSOLE_SPEC,
  baselineIn,
  consoleInks,
  consoleMeta,
  consoleTagWidth,
  consoleText,
  fitBanner,
  fitMono,
  monoWidth,
  paintBanner,
  paintBrackets,
  paintCard,
  paintConsoleTag,
  paintIcon,
  paintMono,
  splitNote,
  type ConsoleInks,
} from "./console"

type RowCards = Extract<Component, { type: "row_cards" }>
type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type VerdictBanner = Extract<Component, { type: "verdict_banner" }>

/*
 * cards: findings as HUD cards in a grid, the console setting's way of
 * setting a handful of parallel items that each earn a symbol. terminal's
 * 2026-10 board, its verdict page (p02) and its recovery page (p07).
 *
 * Takes, in the console setting only:
 *
 * - one `row_cards` of three to six items: verdict cards two across. Each
 *   card holds its icon in a 44px square box, its number at the top right in
 *   mono, its title at 23px bold and its text at 17/28 under it. The item the
 *   author highlights sits on the mark's tint inside an edge of the mark, its
 *   box, icon, number and title in the mark. A row card's `sub` and `tone`
 *   have no place here, and the page goes to the ordinary cards.
 * - one `numbered_cards` of three to six items, set the same way with no icon
 *   box, the card the author marks (`emphasis`) on the mark's tint. The number
 *   at the top right is the only number: no count stands beside the cards.
 * - either of those followed by a `verdict_banner` or a `callout`: the page's
 *   conclusion as a banner across the foot, up to two lines, the cards
 *   shortened above it. A positive verdict or a tip sits on the mark's tint
 *   inside an edge of it, a warning inside the warning ink, anything else on
 *   the surface. Cards with no icon set their title level with their number,
 *   so four of them hold a line of text each over a banner. Cards with an
 *   icon box need their full height, and decline a banner.
 * - one `icon_cards` of two to six items, optionally followed by a `callout`:
 *   HUD cards three across (two across for four), each with brackets just
 *   inside its edge, its icon at 26px in the mark, its tag at the top right in
 *   mono, its title at 21px bold and its text at 16/26. The callout takes the
 *   next cell of the grid as the page's way forward: on the mark's tint inside
 *   an edge of it, its icon, its label in mono when it is written
 *   「标签：说明」, and its text at 17/27.
 *
 * Declines: any other shape, a title or a text past its lines, a tag wider
 * than its card leaves room for, and a band too short for the cards' rows.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.body`, `fonts.heading`,
 * `fonts.mono`.
 */

const GAP = 16
/** The banner under the verdict cards: 64px for one line, 28px more for a second. */
const CLOSING = { gap: 16, h: 64, line: 28, foot: 8 } as const
/** HUD cards stand closer side by side than verdict cards do. */
const HUD_COL_GAP = 12

/** A verdict card (`row_cards`), from its top left corner. */
const VERDICT = {
  /** The cards' height, and how far the grid stands under the band's top. */
  h: 220,
  top: 4,
  pad: 24,
  box: { top: 26, size: 44, icon: 24 },
  index: { top: 30, box: 20, size: 13, gap: 16 },
  title: { top: 92, size: 23, lineHeight: 34, maxLines: 1 },
  text: { top: 136, size: 17, lineHeight: 28, maxLines: 2 },
  foot: 20,
} as const

/** A HUD card (`icon_cards`), from its top left corner. */
const HUD = {
  h: 222,
  pad: 24,
  bracket: { inset: 8, len: 10 },
  icon: { top: 24, size: 26 },
  tag: { top: 26 },
  title: { top: 72, size: 21, lineHeight: 32, maxLines: 2 },
  text: { size: 16, lineHeight: 26, gap: 10, maxLines: 3 },
  note: { label: { top: 72, box: 26, size: 15 }, top: 104, labelled: 32, size: 17, lineHeight: 27, maxLines: 4 },
  foot: 18,
} as const

interface Grid {
  cols: number
  rows: number
  w: number
  h: number
  top: number
  colGap: number
}

function gridFor(rect: { x: number; y: number; w: number; h: number }, cells: number, cols: number, cardH: number, top: number, colGap = GAP): Grid | null {
  const rows = Math.ceil(cells / cols)
  const w = (rect.w - colGap * (cols - 1)) / cols
  const h = Math.min(cardH, Math.floor((rect.h - top - GAP * (rows - 1)) / rows))
  return h > 0 ? { cols, rows, w, h, top, colGap } : null
}

function cellBox(grid: Grid, rect: { x: number; y: number }, i: number) {
  const col = i % grid.cols
  const row = Math.floor(i / grid.cols)
  return { x: rect.x + col * (grid.w + grid.colGap), y: rect.y + grid.top + row * (grid.h + GAP), w: grid.w, h: grid.h }
}

/** A verdict card's fields, from a row card or a numbered card. */
interface VerdictItem {
  icon?: string
  title: string
  text?: string
  marked: boolean
}

function verdictItems(cards: RowCards | NumberedCards): VerdictItem[] | null {
  if (cards.type === "row_cards") {
    if (cards.items.some((item) => item.sub?.trim() || item.tone !== undefined)) return null
    return cards.items.map((item) => ({ icon: item.icon, title: item.title, text: item.text, marked: item.highlight === true }))
  }
  if (cards.items.some((item) => item.sub?.trim())) return null
  return cards.items.map((item) => ({ icon: item.icon, title: item.title, text: item.text, marked: item.emphasis === true }))
}

/**
 * The page's closing line as the banner a console sets it in: a callout as it
 * is, a verdict in the variant its tone reads as.
 */
function closingNote(block: Callout | VerdictBanner): Callout {
  if (block.type === "callout") return block
  const variant = block.tone === "positive" ? "tip" : block.tone === "warning" ? "warn" : "info"
  return { type: "callout", variant, text: block.text, ...(block.icon ? { icon: block.icon } : {}) }
}

/** Verdict cards: `row_cards` or `numbered_cards` two across, with the page's closing banner under them if it has one. */
function verdictCards(
  block: RowCards | NumberedCards,
  closing: Callout | VerdictBanner | undefined,
  ctx: ComponentCtx,
  full: { x: number; y: number; w: number; h: number },
): React.ReactElement | null {
  if (block.items.length < 3 || block.items.length > 6) return null
  const items = verdictItems(block)
  if (!items) return null
  const note = closing ? closingNote(closing) : null
  const banner = note ? fitBanner(note, full.w, ctx) : null
  if (note && !banner) return null
  const bannerH = banner ? CLOSING.h + (banner.lines.length - 1) * CLOSING.line : 0
  const rect = banner ? { ...full, h: full.h - CLOSING.foot - bannerH - CLOSING.gap } : full
  const cards = { items }
  const grid = gridFor(rect, cards.items.length, 2, VERDICT.h, VERDICT.top)
  if (!grid) return null
  const inks = consoleInks(ctx)
  const inner = grid.w - VERDICT.pad * 2
  // Cards with no icon box start their title where the box would stand, level
  // with the number, and keep clear of it.
  const lift = cards.items.some((item) => item.icon) ? 0 : VERDICT.title.top - VERDICT.box.top
  const titleW = lift ? inner - monoWidth("00", VERDICT.index.size) - VERDICT.index.gap : inner
  const fitted = cards.items.map((item) => {
    const title = fitFixed(item.title, { width: titleW, size: VERDICT.title.size, lineHeight: VERDICT.title.lineHeight, maxLines: VERDICT.title.maxLines, fontFamily: ctx.fonts.heading, bold: true })
    const text = item.text?.trim() ? fitFixed(item.text, { width: inner, size: VERDICT.text.size, lineHeight: VERDICT.text.lineHeight, maxLines: VERDICT.text.maxLines, fontFamily: ctx.fonts.body, bold: false }) : null
    return { title, text }
  })
  if (fitted.some((f, i) => f.title === null || (cards.items[i]!.text?.trim() && f.text === null))) return null
  const need = VERDICT.text.top - lift + VERDICT.text.lineHeight * Math.max(1, ...fitted.map((f) => f.text?.lines.length ?? 0)) + VERDICT.foot
  if (grid.h < need) return null
  const drawn = (
    <g {...compositionTag("cards")} {...blockTag(ctx, block)}>
      {cards.items.map((item, i) => {
        const box = cellBox(grid, rect, i)
        const marked = item.marked
        const ground = marked ? inks.tint : inks.surface
        const { title, text } = fitted[i]!
        return (
          <g key={i} data-card-marked={marked ? "1" : undefined}>
            {paintCard(box, inks, marked)}
            {item.icon ? (
              <>
                <rect
                  x={box.x + VERDICT.pad}
                  y={box.y + VERDICT.box.top}
                  width={VERDICT.box.size}
                  height={VERDICT.box.size}
                  fill="none"
                  stroke={marked ? inks.mark : inks.dim}
                  strokeWidth={1.5}
                />
                {paintIcon(
                  item.icon,
                  box.x + VERDICT.pad + (VERDICT.box.size - VERDICT.box.icon) / 2,
                  box.y + VERDICT.box.top + (VERDICT.box.size - VERDICT.box.icon) / 2,
                  VERDICT.box.icon,
                  marked ? inks.mark : inks.text,
                  ground,
                )}
              </>
            ) : null}
            <text
              {...CONSOLE_SPEC}
              x={box.x + box.w - VERDICT.pad + 8}
              y={baselineIn(box.y + VERDICT.index.top, VERDICT.index.box, VERDICT.index.size)}
              textAnchor="end"
              fontFamily={ctx.fonts.mono}
              fontSize={VERDICT.index.size}
              fill={marked ? consoleText(inks.mark, ground, VERDICT.index.size) : consoleMeta(inks.dim, ground)}
              data-contrast-tier={marked ? undefined : "meta"}
              dominantBaseline="alphabetic"
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            {paintLines(title!, {
              ctx,
              x: box.x + VERDICT.pad,
              y: baselineIn(box.y + VERDICT.title.top - lift, VERDICT.title.lineHeight, VERDICT.title.size),
              fill: consoleText(marked ? inks.mark : inks.text, ground, VERDICT.title.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
              bg: ground,
            })}
            {text
              ? paintLines(text, {
                  ctx,
                  x: box.x + VERDICT.pad,
                  y: baselineIn(box.y + VERDICT.text.top - lift, VERDICT.text.lineHeight, VERDICT.text.size),
                  fill: consoleText(inks.body, ground, VERDICT.text.size),
                  fontFamily: ctx.fonts.body,
                  fontWeight: "400",
                  bg: ground,
                })
              : null}
          </g>
        )
      })}
    </g>
  )
  if (!note || !banner || !closing) return drawn
  return (
    <>
      {drawn}
      {paintBanner(note, banner, { x: full.x, y: full.y + full.h - CLOSING.foot - bannerH, w: full.w, h: bannerH }, ctx, blockTag(ctx, closing))}
    </>
  )
}

interface FittedHud {
  title: NonNullable<ReturnType<typeof fitFixed>>
  text: NonNullable<ReturnType<typeof fitFixed>>
  tagW: number
}

function fitHud(item: IconCards["items"][number], w: number, ctx: ComponentCtx): FittedHud | null {
  const inner = w - HUD.pad * 2
  const tagW = item.tag ? consoleTagWidth(item.tag.text) : 0
  // The tag stands at the top right, level with the icon, and keeps 12px off it.
  if (tagW > inner - HUD.icon.size - 12) return null
  const title = fitFixed(item.title, { width: inner, size: HUD.title.size, lineHeight: HUD.title.lineHeight, maxLines: HUD.title.maxLines, fontFamily: ctx.fonts.heading, bold: true })
  const text = fitFixed(item.text, { width: inner, size: HUD.text.size, lineHeight: HUD.text.lineHeight, maxLines: HUD.text.maxLines, fontFamily: ctx.fonts.body, bold: false })
  return title && text ? { title, text, tagW } : null
}

/** The height a HUD card's words need. */
function hudNeed(f: FittedHud): number {
  return HUD.title.top + f.title.lines.length * HUD.title.lineHeight + HUD.text.gap + f.text.lines.length * HUD.text.lineHeight + HUD.foot
}

/** HUD cards: `icon_cards` in a grid, a closing callout in the next cell. */
function hudCards(cards: IconCards, note: Callout | undefined, ctx: ComponentCtx, rect: { x: number; y: number; w: number; h: number }): React.ReactElement | null {
  const cells = cards.items.length + (note ? 1 : 0)
  if (cells > 6) return null
  const cols = cells === 4 ? 2 : Math.min(3, cells)
  const grid = gridFor(rect, cells, cols, HUD.h, 0, HUD_COL_GAP)
  if (!grid) return null
  const inks = consoleInks(ctx)
  const fitted = cards.items.map((item) => fitHud(item, grid.w, ctx))
  if (fitted.some((f) => f === null || hudNeed(f) > grid.h)) return null
  const closing = note ? fitClosing(note, grid.w, ctx) : null
  if (note && (!closing || closing.need > grid.h)) return null
  return (
    <g {...compositionTag("cards")} {...blockTag(ctx, cards)}>
      {cards.items.map((item, i) => {
        const box = cellBox(grid, rect, i)
        const f = fitted[i]!
        const ground = inks.surface
        const titleTop = box.y + HUD.title.top
        const textTop = titleTop + f.title.lines.length * HUD.title.lineHeight + HUD.text.gap
        return (
          <g key={i}>
            {paintCard(box, inks, false)}
            {paintBrackets({ x: box.x + HUD.bracket.inset, y: box.y + HUD.bracket.inset, w: box.w - HUD.bracket.inset * 2, h: box.h - HUD.bracket.inset * 2 }, inks.dim, HUD.bracket.len)}
            {paintIcon(item.icon, box.x + HUD.pad, box.y + HUD.icon.top, HUD.icon.size, inks.mark, ground)}
            {item.tag
              ? paintConsoleTag({ ctx, text: item.tag.text, x: box.x + box.w - HUD.pad - f.tagW, y: box.y + HUD.tag.top, ink: item.tag.quiet ? inks.dim : inks.muted, ground })
              : null}
            {paintLines(f.title, {
              ctx,
              x: box.x + HUD.pad,
              y: baselineIn(titleTop, HUD.title.lineHeight, HUD.title.size),
              fill: consoleText(inks.text, ground, HUD.title.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
              bg: ground,
            })}
            {paintLines(f.text, {
              ctx,
              x: box.x + HUD.pad,
              y: baselineIn(textTop, HUD.text.lineHeight, HUD.text.size),
              fill: consoleText(inks.body, ground, HUD.text.size),
              fontFamily: ctx.fonts.body,
              fontWeight: "400",
              bg: ground,
            })}
          </g>
        )
      })}
      {note && closing ? paintClosing(note, closing, cellBox(grid, rect, cards.items.length), inks, ctx) : null}
    </g>
  )
}

interface FittedClosing {
  label: ReturnType<typeof fitMono>
  glossBreak?: string
  text: NonNullable<ReturnType<typeof fitFixed>>
  need: number
}

function fitClosing(note: Callout, w: number, ctx: ComponentCtx): FittedClosing | null {
  const inner = w - HUD.pad * 2
  const split = splitNote(note.text)
  const label = split.label ? fitMono(split.label, { width: inner, size: HUD.note.label.size, lineHeight: HUD.note.label.box, maxLines: 1 }) : null
  if (split.label && !label) return null
  const text = fitFixed(split.text, { width: inner, size: HUD.note.size, lineHeight: HUD.note.lineHeight, maxLines: HUD.note.maxLines, fontFamily: ctx.fonts.body, bold: false })
  if (!text) return null
  const top = label ? HUD.note.top : HUD.note.label.top
  return { label, glossBreak: split.glossBreak, text, need: top + text.lines.length * HUD.note.lineHeight + HUD.foot }
}

function paintClosing(note: Callout, f: FittedClosing, box: { x: number; y: number; w: number; h: number }, inks: ConsoleInks, ctx: ComponentCtx): React.ReactElement {
  const ground = inks.tint
  const textTop = box.y + (f.label ? HUD.note.top : HUD.note.label.top)
  return (
    <g data-card-closing="" {...blockTag(ctx, note)}>
      {paintCard(box, inks, true)}
      {paintIcon(note.icon ?? CALLOUT_ICON[note.variant], box.x + HUD.pad, box.y + HUD.icon.top, HUD.icon.size, inks.mark, ground)}
      {f.label
        ? paintMono(f.label, {
            ctx,
            x: box.x + HUD.pad,
            y: baselineIn(box.y + HUD.note.label.top, HUD.note.label.box, HUD.note.label.size),
            fill: consoleText(inks.mark, ground, HUD.note.label.size),
            ground,
            ...(f.glossBreak ? { lastAttrs: { "data-gloss-break": f.glossBreak } } : {}),
          })
        : null}
      {paintLines(f.text, {
        ctx,
        x: box.x + HUD.pad,
        y: baselineIn(textTop, HUD.note.lineHeight, HUD.note.size),
        fill: consoleText(inks.text, ground, HUD.note.size),
        fontFamily: ctx.fonts.body,
        fontWeight: "400",
        bg: ground,
      })}
    </g>
  )
}

export const cardsComposition: Composition = (props) => {
  if (props.setting === "dossier") return cardsDossier(props)
  const { components, ctx, rect, setting } = props
  if (setting !== "console") return null
  const [first, second, ...rest] = components
  if (!first || rest.length > 0) return null
  if (first.type === "row_cards" || first.type === "numbered_cards") {
    if (second && second.type !== "verdict_banner" && second.type !== "callout") return null
    return verdictCards(first, second, ctx, rect)
  }
  if (first.type !== "icon_cards") return null
  if (second && second.type !== "callout") return null
  return hudCards(first, second, ctx, rect)
}
