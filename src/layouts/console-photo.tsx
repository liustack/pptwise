import type { Slide } from "@/ir"

/*
 * The darkening a console cover or chapter lays over its photograph, from the
 * left: the page colour at 94% at the left edge, 78% at 45% of the width and
 * 15% at the right edge, so the title and the list on the left read on the
 * dark and the photograph shows on the right. One linear gradient, which the
 * export writes as a gradient fill with its alphas, so PowerPoint keeps it as
 * one editable shape. terminal's 2026-10 board, p01, p03 and p10.
 */

const STOPS = [
  { offset: "0%", opacity: 0.94 },
  { offset: "45%", opacity: 0.78 },
  { offset: "100%", opacity: 0.15 },
] as const

/** Whether the page is drawn over a photograph of its own. */
export function onPhoto(slide: Slide): boolean {
  return slide.background?.kind === "asset"
}

/** The darkening over the whole page, in the page colour `ink`. */
export function PhotoScrim({ id, ink }: { id: string; ink: string }) {
  return (
    <g data-photo-scrim="">
      <defs>
        <linearGradient id={id} x1={0} y1={0} x2={1} y2={0}>
          {STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={ink} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1280} height={720} fill={`url(#${id})`} />
    </g>
  )
}
