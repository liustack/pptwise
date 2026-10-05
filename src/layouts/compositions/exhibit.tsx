import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { blendOver } from "../../render/ink"
import { fitMono } from "./console"
import type { Box } from "./console"
import { memoChinese, memoInks, memoText, paintMemo } from "./memo"
import type { EmphasisHeadingLayout } from "../../render/emphasis"

/*
 * An exhibit: a photograph pasted onto the page the way a memo's attachment
 * is, settled on memo's 2026-10 board. The picture sits in a white print
 * border, 8px round it and 30px under it, where its caption is typed in the
 * mono face, 「附图 1 · 周五早晨的办公室（示意）」 or "Exhibit 1 · …". The
 * print is turned a degree or two, and casts a flat shadow a little down and
 * right, so it reads as paper laid on paper.
 *
 * The turn is a rotation of the whole print around its centre, which the
 * export writes as each shape's own turn (`svg2pptx/dispatch.ts`), so the
 * picture stays a picture in PowerPoint, cropped as the preview crops it and
 * editable. The shadow is one flat shape, not a blur, since nothing softer
 * survives the export.
 *
 * Exhibits are numbered across the deck, in the order they appear: the face
 * that sets a page counts the pictures on the pages before it and hands the
 * composition its first number (`CompositionProps.exhibitNumber`). Each
 * number turns its print its own way (`exhibitAngle`), so a page of three
 * prints never lines them up.
 *
 * Any theme can paste a picture in this way: the border is a print's white,
 * the shadow and caption read the theme's ink and muted tokens.
 */

/** A photographic print's white border. A border whiter than the page reads as a print laid on it. */
const PRINT_WHITE = "#FFFFFF"

export const EXHIBIT = {
  /** The border round the picture, and under it where the caption is typed. */
  pad: 8,
  foot: 30,
  caption: { size: 12, lineHeight: 22 },
  /** The flat shadow: how far it falls, and how dark over the page. */
  shadow: { dx: 1, dy: 3, mix: 0.14 },
} as const

/**
 * The turn each exhibit number takes, in degrees, from the board's own
 * prints: the cover's +2, the reasons page's -2, the three modes' -1.5, +1 and
 * -1, then +1 and +1.5. Past seven it starts again.
 */
const ANGLES = [2, -2, -1.5, 1, -1, 1, 1.5] as const

export function exhibitAngle(n: number): number {
  return ANGLES[(((n - 1) % ANGLES.length) + ANGLES.length) % ANGLES.length]!
}

/** The caption an exhibit is typed with: its number, then the author's caption after a middle dot. */
export function exhibitCaption(n: number, caption: string | undefined, chinese: boolean): string {
  const head = chinese ? `附图 ${n}` : `Exhibit ${n}`
  const words = caption?.trim()
  return words ? `${head} · ${words}` : head
}

/** The caption fitted on one line under a picture `w` wide, or `null` when it does not fit. */
export function fitExhibitCaption(text: string, w: number): EmphasisHeadingLayout | null {
  return fitMono(text, { width: w - EXHIBIT.pad * 2, size: EXHIBIT.caption.size, lineHeight: EXHIBIT.caption.lineHeight, maxLines: 1 })
}

export interface ExhibitSpec {
  /** The print, border included, before its turn. */
  box: Box
  number: number
  caption?: string
  /** The picture, from the deck's assets. A missing one leaves the paper blank. */
  src?: string
  alt?: string
  /** Degrees, clockwise. `exhibitAngle(number)` when omitted. */
  angle?: number
  /** "cover" crops the picture to fill the print (the default), "contain" fits it whole. */
  fit?: "cover" | "contain"
}

/** The caption a spec prints, fitted, or `null` when it does not fit its print. */
export function exhibitCaptionLayout(spec: ExhibitSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitExhibitCaption(exhibitCaption(spec.number, spec.caption, memoChinese(ctx)), spec.box.w)
}

/**
 * Paints a print: its shadow, its white border, the picture and the typed
 * caption, turned together around the print's centre. The caller has
 * checked the caption fits (`exhibitCaptionLayout`).
 */
export function paintExhibit(spec: ExhibitSpec, caption: EmphasisHeadingLayout, ctx: ComponentCtx, attrs?: Record<string, unknown>): React.ReactElement {
  const inks = memoInks(ctx)
  const { x, y, w, h } = spec.box
  const angle = spec.angle ?? exhibitAngle(spec.number)
  const cx = x + w / 2
  const cy = y + h / 2
  const imgW = w - EXHIBIT.pad * 2
  const imgH = h - EXHIBIT.pad - EXHIBIT.foot
  const shadow = blendOver(inks.ink, inks.ground, EXHIBIT.shadow.mix)
  const captionTop = y + h - EXHIBIT.foot
  return (
    <g data-exhibit={spec.number} {...attrs} transform={angle ? `rotate(${angle} ${cx} ${cy})` : undefined}>
      <rect x={x + EXHIBIT.shadow.dx} y={y + EXHIBIT.shadow.dy} width={w} height={h} fill={shadow} />
      <rect x={x} y={y} width={w} height={h} fill={PRINT_WHITE} />
      {spec.src ? (
        <image
          href={spec.src}
          x={x + EXHIBIT.pad}
          y={y + EXHIBIT.pad}
          width={imgW}
          height={imgH}
          preserveAspectRatio={spec.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
          aria-label={spec.alt || undefined}
        />
      ) : (
        <rect x={x + EXHIBIT.pad} y={y + EXHIBIT.pad} width={imgW} height={imgH} fill={inks.paper} />
      )}
      {paintMemo(caption, {
        ctx,
        x: x + EXHIBIT.pad,
        top: captionTop,
        face: "mono",
        fill: memoText(inks.muted, PRINT_WHITE, EXHIBIT.caption.size),
        ground: PRINT_WHITE,
      })}
    </g>
  )
}
