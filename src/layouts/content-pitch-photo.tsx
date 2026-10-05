import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { SvgContent } from "../render/svg-content"
import { bodySlotDropsContent, stepAside } from "../render/step-aside"
import { compose } from "./compositions"
import { blockTag } from "./compositions/shared"
import { fitPitch, paintPitch, paintPitchPhoto, pitchInks, pitchText } from "./compositions/pitch"
import { fitPitchSource, PITCH_RIGHT, PitchRailHead, PitchSource, PitchTitle } from "./pitch-shared"
import { PitchSheetContent } from "./content-pitch-sheet"

type Image = Extract<Component, { type: "image" }>

/*
 * pitch-photo: ember's photograph page, drawn to its 2026-10 board (the
 * medical page, p09). The page's photograph fills its left 560px from edge
 * to edge, its caption small on a dark strip along its foot. The right
 * column is a pitch page of its own: the running order at the top right with
 * the page's beat lit, the claim bold at 34/46 ending at y220, a hairline,
 * and under it the body (the spotlight composition, the figure the page is
 * about set huge in the fire with the others beside it, or the ordinary
 * component renderer), the source at the foot.
 *
 * Takes the page's first `image` component as the photograph and sets the
 * rest in the right column. A page with no image is set as an ordinary
 * pitch sheet; a column the rest does not fit steps aside.
 */

const PHOTO = { w: 560, caption: { h: 24, size: 11, x: 16, over: 0.6 } } as const
const COLUMN = { x: 624, title: { foot: 220 }, rule: 256, top: 280, bottom: 640 } as const

export function PitchPhotoContent(props: SvgTemplateProps) {
  const { ir, slide, ctx } = props
  const inks = pitchInks(ctx)
  const image = slide.components.find((c): c is Image => c.type === "image")
  if (!image) return <PitchSheetContent {...props} />
  const rest = slide.components.filter((c) => c !== image)
  const w = PITCH_RIGHT - COLUMN.x
  const rect = { x: COLUMN.x, y: COLUMN.top, w, h: COLUMN.bottom - COLUMN.top }
  const composed = compose({ components: rest, ctx, rect, setting: "pitch" }, ["spotlight"])
  if (!composed) {
    // Only what the column carries is probed: the photograph has its own half.
    const aside = stepAside({ face: "pitch-photo", slide, ctx, cramped: bodySlotDropsContent(rest, rect, ctx) })
    if (aside) return aside
  }
  const caption = image?.caption?.trim() ? fitPitch(image.caption, { width: PHOTO.w - PHOTO.caption.x * 2, size: PHOTO.caption.size, lineHeight: PHOTO.caption.h, maxLines: 1 }, ctx) : null
  const source = fitPitchSource(slide, ctx, w)
  return (
    <>
      <g {...blockTag(ctx, image)} data-pitch-photo-column="">
          {paintPitchPhoto(image.asset_id, { x: 0, y: 0, w: PHOTO.w, h: 720 }, ctx, inks)}
          {caption ? (
            <g data-pitch-caption="">
              <rect x={0} y={720 - PHOTO.caption.h - 6} width={PHOTO.w} height={PHOTO.caption.h} fill={inks.ground} fillOpacity={PHOTO.caption.over} />
              {paintPitch(caption, { ctx, x: PHOTO.caption.x, top: 720 - PHOTO.caption.h - 6, fill: pitchText(inks.ink, inks.ground, PHOTO.caption.size), ground: inks.ground })}
            </g>
          ) : null}
          {image.caption?.trim() && !caption ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      </g>
      <PitchRailHead ir={ir} slide={slide} ctx={ctx} />
      <PitchTitle heading={slide.heading} ctx={ctx} x={COLUMN.x} width={w} foot={COLUMN.title.foot} />
      <rect x={COLUMN.x} y={COLUMN.rule} width={w} height={1} fill={inks.line} />
      {composed ?? <SvgContent components={rest} rect={rect} ctx={ctx} />}
      <PitchSource source={source} ctx={ctx} x={COLUMN.x} />
    </>
  )
}

export const layoutDef = {
  id: "pitch-photo",
  kind: "standard",
  story: {
    name: "Pitch Photograph",
    story: "A photograph fills the left of the page from edge to edge, and the right is a pitch page of its own: the beat lit on the running order, the claim, and the figure the page is about set huge in the single fire colour.",
    positioning: "Shows what a pitch is about before it argues for it. Choose it when one picture and the figure behind it carry the page.",
    audience: "Investors who need to see the thing before they weigh its numbers.",
    notFor: "A gallery of several pictures, which wants a grid rather than one photograph.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1 },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["stage"],
  decorKeepOut: [{ x: 0, y: 0, w: PHOTO.w, h: 720 }],
  headingFit: { maxWidth: PITCH_RIGHT - COLUMN.x, fontSize: 34, maxLines: 2, minPt: 28, bold: true, lineHeightRatio: 46 / 34 },
} satisfies LayoutDefinition
