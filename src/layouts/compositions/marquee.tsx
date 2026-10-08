import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, graphicInk, metaInk, readableOn } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The marquee setting: a campaign proposal staged as a show. Settled on
 * rally's 2026-10 board (`design/rounds/2026-10-06-rally/`).
 *
 * The page is one section of the proposal, named on a ticket stub at its top
 * left: the section's number on a stamp of the theme's accent, a perforation,
 * its name on the card colour. A small fistful of confetti in the four
 * palette colours is thrown at the top right, scattered differently on every
 * page and the same on every render. The ground is the house dark (the
 * theme's page colour), cards a step lighter (its surface), words in the
 * light of its text and the grey of its muted ink. The accent is the lead
 * singer: it takes the thing a page is about, and words set on it are in a
 * dark ink drawn from the theme's own primary. Charts and decoration share the
 * palette, so the bars are the same colours as the confetti.
 *
 * The board's small type (11 to 15px labels, the stub, notes, the source and
 * the folio) is under the 16px floor and carries the `marquee-spec`
 * exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const MARQUEE_SPEC = { "data-font-floor-exempt": "marquee-spec" } as const

/** `MARQUEE_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function marqueeSmall(size: number): Record<string, string> {
  return size < 16 ? { ...MARQUEE_SPEC } : {}
}

export interface MarqueeInks {
  /** The house: the page. */
  ground: string
  /** A card, a step lighter. */
  card: string
  /** The stage's dark: a scoreboard's panel, a step darker than the house. */
  deep: string
  /** Words. */
  ink: string
  /** Labels, notes, the source. */
  muted: string
  /** Hairlines and dashed frames. Never words. */
  line: string
  /** A bar, a cell or a dot that is not the page's: the hairline lifted toward the grey. */
  dim: string
  /** The lead: the theme's accent. */
  fire: string
  /** Words and icons on the lead: the theme's primary darkened, or the plain dark ink where that does not read. */
  onFire: string
  /** The four confetti colours, which charts share: the theme's chart palette. */
  confetti: readonly string[]
  /** A caution or a company's own figure: the theme's warning ink. */
  gold: string
}

/** #5B4B7A on the board: the hairline lifted 17% toward the grey. */
const DIM_MIX = 0.17
/** #1A1030 on the board: the stage's dark three quarters of the way to black. */
const ON_FIRE_MIX = 0.75

export function marqueeInks(ctx: ComponentCtx): MarqueeInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.35)
  const darkened = blendOver(colors.primary, "#000000", ON_FIRE_MIX)
  const onFire = contrastRatio(darkened, colors.accent) >= 4.5 ? darkened : readableOn(colors.accent)
  const palette = colors.chartPalette.length >= 4 ? colors.chartPalette.slice(0, 4) : [...colors.chartPalette, colors.accent, colors.muted, colors.text].slice(0, 4)
  return {
    ground,
    card: colors.surface,
    deep: colors.primary,
    ink: colors.text,
    muted: colors.muted,
    line,
    dim: blendOver(colors.muted, line, DIM_MIX),
    fire: colors.accent,
    onFire,
    confetti: palette,
    gold: colors.warning ?? colors.accent,
  }
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink, so a
 * small word in the accent stays the accent's colour.
 */
export function marqueeText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function marqueeMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function marqueeBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface MarqueeTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitMarquee(text: string | undefined, spec: MarqueeTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: spec.bold ? ctx.fonts.heading : ctx.fonts.body,
    bold: spec.bold === true,
  })
}

/** Paints a fitted block whose first line box starts at `top`, one `<text>` per line. */
export function paintMarquee(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    top?: number
    baseline?: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    runInk?: string
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: opts.baseline ?? marqueeBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    runInk: opts.runInk,
    attrs: { ...marqueeSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, centred in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintMarqueeLine(
  text: string,
  opts: {
    ctx: ComponentCtx
    x: number
    size: number
    fill: string
    top?: number
    lineHeight?: number
    baseline?: number
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string | number
  },
): React.ReactElement {
  const y = opts.baseline ?? marqueeBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...marqueeSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={text.includes("  ") ? "preserve" : undefined}
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`. */
export function marqueeWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintMarqueeTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; bold?: boolean; anchor?: "start" | "middle"; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...marqueeSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      textAnchor={opts.anchor === "middle" ? "middle" : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={opts.tracking}
      xmlSpace={opts.text.includes(" ") ? "preserve" : undefined}
    >
      {chars[0]}
      {chars.slice(1).map((ch, i) => (
        <tspan key={i} dx={opts.tracking}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}

/** The tracked width of `text`, as `paintMarqueeTracked` sets it. */
export function marqueeTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return marqueeWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintMarqueeIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-marquee-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Cards and the lead ─────────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A card's corner, the board's 12px. */
export const MARQUEE_CARD_R = 12

/** A card: the surface, rounded 12px, no outline unless asked. */
export function paintMarqueeCard(
  box: Box,
  inks: MarqueeInks,
  opts: { fill?: string; r?: number; stroke?: string; strokeWidth?: number; dash?: string; key?: string | number; attrs?: Record<string, string> } = {},
): React.ReactElement {
  const sw = opts.stroke ? (opts.strokeWidth ?? 1) : 0
  // A stroke is drawn inside the card's box, as the board's border-box did.
  return (
    <rect
      key={opts.key}
      {...opts.attrs}
      x={box.x + sw / 2}
      y={box.y + sw / 2}
      width={box.w - sw}
      height={box.h - sw}
      rx={Math.max(0, (opts.r ?? MARQUEE_CARD_R) - sw / 2)}
      fill={opts.fill ?? inks.card}
      stroke={opts.stroke}
      strokeWidth={opts.stroke ? sw : undefined}
      strokeDasharray={opts.dash}
    />
  )
}

/**
 * The lead on a page. Every shape a composition paints in the accent sits
 * inside one of these groups, so a test can find what the page lights.
 */
export function Lead({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  return <g data-marquee-lead={id}>{children}</g>
}

/**
 * A photograph filling `box`, cropped to it, its corners rounded `r` by four
 * small pieces of `ground` laid over them, so PowerPoint, which keeps a
 * picture square, shows the same rounded photograph the preview does. The
 * card's surface stands in where the deck has no such asset.
 */
export function paintMarqueePhoto(assetId: string, box: Box, ctx: ComponentCtx, inks: MarqueeInks, opts: { r?: number; ground?: string; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const r = opts.r ?? 10
  const ground = opts.ground ?? inks.ground
  const { x, y, w, h } = box
  if (!asset?.src) return <rect key={opts.key} data-marquee-photo={assetId} x={x} y={y} width={w} height={h} rx={r} fill={inks.card} />
  const corners = [
    `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} Z`,
    `M ${x + w} ${y} L ${x + w} ${y + r} A ${r} ${r} 0 0 0 ${x + w - r} ${y} Z`,
    `M ${x + w} ${y + h} L ${x + w - r} ${y + h} A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} Z`,
    `M ${x} ${y + h} L ${x} ${y + h - r} A ${r} ${r} 0 0 0 ${x + r} ${y + h} Z`,
  ]
  return (
    <g key={opts.key} data-marquee-photo={assetId}>
      <image href={asset.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
      {r > 0 ? corners.map((d, i) => <path key={i} data-photo-corner="" d={d} fill={ground} />) : null}
    </g>
  )
}

/** The accent laid at `alpha` over `ground`: the tint under a row the page is about. */
export function fireTint(inks: MarqueeInks, alpha: number, ground = inks.ground): string {
  return blendOver(inks.fire, ground, alpha)
}

/** A lighter step of `ink` toward white, for the extra parts of a palette that runs past four colours. */
export function lighter(ink: string, alpha: number): string {
  return blendOver("#FFFFFF", ink, alpha)
}

/**
 * Splits `text` at its first sentence end (「。」 or ". ") into the sentence
 * and the rest, with the end the author wrote, or `null` when it is one
 * sentence. A composition that sets the two apart prints no end and says so
 * on the sentence's last line (`data-gloss-break`), so a reader of the page
 * reads it back where it stood.
 */
export function splitSentence(text: string): { lead: string; sep: string; rest: string } | null {
  const m = /^(.+?)(。|\. )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/**
 * Splits `text` at its first colon (「：」 or ": ") into the name before it and
 * the rest, or `null` when it has none. The colon is declared on the name's
 * line (`data-gloss-break`), not printed.
 */
export function splitName(text: string): { name: string; sep: string; rest: string } | null {
  const m = /^(.+?)(：|: )(.+)$/su.exec(text.trim())
  return m && m[1]!.trim() && m[3]!.trim() ? { name: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** Splits `text` at its first " · " into the name and what follows, or `null`. */
export function splitDot(text: string): { name: string; rest: string } | null {
  const at = text.indexOf(" · ")
  return at > 0 ? { name: text.slice(0, at).trim(), rest: text.slice(at + 3).trim() } : null
}

/** The attribute that says a separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}

// ── The ticket stub ────────────────────────────────────────────────────

/**
 * The ticket stub that names a page's section: the stamp (the section's
 * number, or a cover's or an ending's own word) at 12px bold in the dark ink
 * on a stamp of the accent, eleven pixels of air a side; then the section's
 * name at 14px bold in the light on a stub of the card colour, twelve pixels
 * a side; between them a perforation, a dashed line in the house colour,
 * with a hole of the house colour punched at each end. 30px tall, rounded
 * 6px at its outer corners.
 */
export const TICKET = { h: 30, r: 6, stamp: { size: 12, tracking: 1, pad: 11 }, label: { size: 14, pad: 12, seam: 2 }, hole: 6, dash: "6 2" } as const

export interface TicketText {
  /** The stamp's words, such as 「02」 or 「提案」. */
  stamp?: string
  /** The stub's words, such as 「大盘」 or 「市场部 · 2026 年 10 月」. */
  label?: string
}

/** The ticket's words as it prints them: plain, since a stub sets no emphasis, and trimmed. */
function ticketWords(text: TicketText): { stamp: string; label: string } {
  return { stamp: stripEmphasis(text.stamp ?? "").trim(), label: stripEmphasis(text.label ?? "").trim() }
}

/** The stamp's width and the stub's, in px, as the ticket sets them; 0 for a part it does not have. */
export function ticketWidths(text: TicketText, ctx: ComponentCtx): { stamp: number; label: number } {
  const words = ticketWords(text)
  const stamp = words.stamp ? Math.round(marqueeTrackedWidth(words.stamp, TICKET.stamp.size, TICKET.stamp.tracking, ctx, true) + TICKET.stamp.tracking + TICKET.stamp.pad * 2) : 0
  const label = words.label ? Math.round(marqueeWidth(words.label, TICKET.label.size, ctx, true) + TICKET.label.seam + TICKET.label.pad * 2) : 0
  return { stamp, label }
}

/** The ticket at `x`, `y`: the stamp, the perforation and the stub, or as much of them as it has words for. */
export function Ticket({ x, y, text, ctx }: { x: number; y: number; text: TicketText; ctx: ComponentCtx }): React.ReactElement | null {
  const inks = marqueeInks(ctx)
  const w = ticketWidths(text, ctx)
  if (!w.stamp && !w.label) return null
  const { stamp, label } = ticketWords(text)
  const seam = x + w.stamp
  const baseline = (size: number) => marqueeBaseline(y, TICKET.h, size)
  // Each part is a rounded box. Where two meet, the stub covers the stamp's
  // inner corners and the holes cover the stub's.
  return (
    <g data-marquee-ticket="">
      {stamp ? (
        <Lead id="ticket">
          <rect x={x} y={y} width={w.stamp + (label ? TICKET.r : 0)} height={TICKET.h} rx={TICKET.r} fill={inks.fire} />
          {paintMarqueeTracked({ ctx, text: stamp, x: x + w.stamp / 2, y: baseline(TICKET.stamp.size), size: TICKET.stamp.size, tracking: TICKET.stamp.tracking, bold: true, anchor: "middle", fill: marqueeText(inks.onFire, inks.fire, TICKET.stamp.size) })}
        </Lead>
      ) : null}
      {label ? (
        <g data-marquee-stub="">
          <rect x={seam} y={y} width={w.label} height={TICKET.h} rx={TICKET.r} fill={inks.card} />
          {paintMarqueeLine(label, { ctx, x: seam + TICKET.label.seam + TICKET.label.pad, baseline: baseline(TICKET.label.size), size: TICKET.label.size, bold: true, fill: marqueeText(inks.ink, inks.card, TICKET.label.size) })}
        </g>
      ) : null}
      {stamp && label ? (
        <g data-marquee-perforation="">
          <line x1={seam + TICKET.label.seam / 2} y1={y} x2={seam + TICKET.label.seam / 2} y2={y + TICKET.h} stroke={inks.ground} strokeWidth={TICKET.label.seam} strokeDasharray={TICKET.dash} />
          <circle cx={seam} cy={y} r={TICKET.hole} fill={inks.ground} />
          <circle cx={seam} cy={y + TICKET.h} r={TICKET.hole} fill={inks.ground} />
        </g>
      ) : null}
    </g>
  )
}

// ── Confetti ───────────────────────────────────────────────────────────

/**
 * Python's `random.Random(seed)` for a whole-number seed, so a scatter drawn
 * from it lands exactly where the board's generator threw it: the Mersenne
 * twister, seeded the way Python seeds it, with `random()`, `randint()` and
 * `choice()` drawing the way Python draws them.
 */
export class SeededRandom {
  private mt = new Uint32Array(624)
  private index = 625

  constructor(seed: number) {
    this.initByArray([Math.abs(Math.trunc(seed)) >>> 0])
  }

  private initGenrand(s: number): void {
    this.mt[0] = s >>> 0
    for (let i = 1; i < 624; i++) {
      const prev = this.mt[i - 1]! ^ (this.mt[i - 1]! >>> 30)
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0
    }
    this.index = 624
  }

  private initByArray(key: number[]): void {
    this.initGenrand(19650218)
    let i = 1
    let j = 0
    for (let k = Math.max(624, key.length); k > 0; k--) {
      const prev = this.mt[i - 1]! ^ (this.mt[i - 1]! >>> 30)
      this.mt[i] = ((this.mt[i]! ^ Math.imul(prev, 1664525)) + key[j]! + j) >>> 0
      i++
      j++
      if (i >= 624) {
        this.mt[0] = this.mt[623]!
        i = 1
      }
      if (j >= key.length) j = 0
    }
    for (let k = 623; k > 0; k--) {
      const prev = this.mt[i - 1]! ^ (this.mt[i - 1]! >>> 30)
      this.mt[i] = ((this.mt[i]! ^ Math.imul(prev, 1566083941)) - i) >>> 0
      i++
      if (i >= 624) {
        this.mt[0] = this.mt[623]!
        i = 1
      }
    }
    this.mt[0] = 0x80000000
  }

  private next32(): number {
    if (this.index >= 624) {
      for (let k = 0; k < 624; k++) {
        const y = (this.mt[k]! & 0x80000000) | (this.mt[(k + 1) % 624]! & 0x7fffffff)
        this.mt[k] = (this.mt[(k + 397) % 624]! ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0)) >>> 0
      }
      this.index = 0
    }
    let y = this.mt[this.index++]!
    y ^= y >>> 11
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0
    y ^= y >>> 18
    return y >>> 0
  }

  /** `random()`: a float in [0, 1) with 53 bits. */
  random(): number {
    const a = this.next32() >>> 5
    const b = this.next32() >>> 6
    return (a * 67108864 + b) / 9007199254740992
  }

  private below(n: number): number {
    const k = 32 - Math.clz32(n)
    for (;;) {
      const r = this.next32() >>> (32 - k)
      if (r < n) return r
    }
  }

  /** `randint(a, b)`, both ends included. */
  randint(a: number, b: number): number {
    return a + this.below(b - a + 1)
  }

  /** `choice(seq)`. */
  choice<T>(seq: readonly T[]): T {
    return seq[this.below(seq.length)]!
  }
}

export interface ConfettiPiece {
  x: number
  y: number
  w: number
  h: number
  /** Degrees, clockwise, about the piece's own top left corner. */
  rotate: number
  color: string
}

/** Where confetti is thrown, and how much. */
export interface ConfettiThrow {
  /** The seed: the page's number, so each page lands differently and every render the same. */
  seed: number
  region: Box
  count: number
}

/** The fistful a content page gets at its top right. */
export const CONFETTI_PILE = { region: { x: 1100, y: 14, w: 160, h: 44 }, count: 7 } as const

const CONFETTI = { widths: [10, 14, 6], heights: [4, 5, 10], turn: 60, r: 1.5, opacity: 0.9 } as const

/** The pieces a throw scatters, each a small rounded strip in one of the four colours, in turn. */
export function confettiPieces(spec: ConfettiThrow, colors: readonly string[]): ConfettiPiece[] {
  const rnd = new SeededRandom(spec.seed)
  return Array.from({ length: spec.count }, (_, i) => {
    const x = spec.region.x + rnd.random() * spec.region.w
    const y = spec.region.y + rnd.random() * spec.region.h
    const rotate = rnd.randint(-CONFETTI.turn, CONFETTI.turn)
    const w = rnd.choice(CONFETTI.widths)
    const h = rnd.choice(CONFETTI.heights)
    return { x, y, w, h, rotate, color: colors[i % colors.length]! }
  })
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** A piece's corners, turned about its top left corner, as a closed path with its rounded corners. */
export function confettiPath(p: Pick<ConfettiPiece, "x" | "y" | "w" | "h" | "rotate">): string {
  const a = (p.rotate * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const r = Math.min(CONFETTI.r, p.w / 2, p.h / 2)
  const at = (dx: number, dy: number) => `${round2(p.x + dx * cos - dy * sin)} ${round2(p.y + dx * sin + dy * cos)}`
  const arc = (dx: number, dy: number) => `A ${r} ${r} 0 0 1 ${at(dx, dy)}`
  return [
    `M ${at(r, 0)}`,
    `L ${at(p.w - r, 0)}`,
    arc(p.w, r),
    `L ${at(p.w, p.h - r)}`,
    arc(p.w - r, p.h),
    `L ${at(r, p.h)}`,
    arc(0, p.h - r),
    `L ${at(0, r)}`,
    arc(r, 0),
    "Z",
  ].join(" ")
}

/** A piece's box on the page once turned, for keeping it off words. */
export function confettiBounds(p: ConfettiPiece): Box {
  const a = (p.rotate * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const xs = [0, p.w].flatMap((dx) => [0, p.h].map((dy) => p.x + dx * cos - dy * sin))
  const ys = [0, p.w].flatMap((dx) => [0, p.h].map((dy) => p.y + dx * sin + dy * cos))
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

const meets = (a: Box, b: Box, air: number) => a.x < b.x + b.w + air && b.x < a.x + a.w + air && a.y < b.y + b.h + air && b.y < a.y + a.h + air

/**
 * The pieces of `throws`, less any that would land within `air` of a box in
 * `keepOff` (the words and furniture of the page), painted as one field.
 */
export function Confetti({ throws, colors, keepOff = [], air = 4 }: { throws: readonly ConfettiThrow[]; colors: readonly string[]; keepOff?: readonly Box[]; air?: number }): React.ReactElement | null {
  const pieces = throws.flatMap((t) => confettiPieces(t, colors)).filter((p) => !keepOff.some((box) => meets(confettiBounds(p), box, air)))
  if (pieces.length === 0) return null
  return (
    <g data-marquee-confetti={pieces.length}>
      {pieces.map((p, i) => (
        <path key={i} d={confettiPath(p)} fill={p.color} opacity={CONFETTI.opacity} />
      ))}
    </g>
  )
}
