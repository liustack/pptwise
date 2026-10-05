import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { dossierInks, dossierMeta, fitDossier, paintDossier } from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Image = Extract<Component, { type: "image" }>

/*
 * inset: a photograph set beside the page's body, clinic's 2026-10 board
 * (the outside-risk page, p04, the scope page, p14, and the pharmacist page,
 * p16). The picture stands 400px tall at the top of the band, at the left
 * when the author puts it first and at the right when last, and its caption,
 * when it has one, runs under it in 12px muted type (「示意图：…（AI 生成）」).
 * Everything else on the page is the body, set in the column beside it by
 * the face's other compositions (`handOn`), or by the ordinary component
 * renderer when none takes it.
 *
 * A body of figures (`kpi_cards`, the cases of p04) takes a 520px picture
 * 40px away, any other body a 560px one 32px away, as the board drew them.
 *
 * Takes, in the dossier setting: an `image` first or last, and one or more
 * components beside it.
 *
 * Declines: a second picture, a picture with nothing beside it, a caption
 * past one line, and a body its column cannot hold.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the images the face hands in.
 */

const PHOTO = { top: 10, h: 400 } as const
/** A photograph's caption under it, shared with the other dossier pages that set one. */
export const PHOTO_CAPTION = { gap: 8, size: 12, lineHeight: 18 } as const
const WIDE = { w: 560, gap: 32 } as const
const FIGURES = { w: 520, gap: 40 } as const

/** Paints a photograph filling `box`, cropped to it, with its alt text. */
export function paintPhoto(image: Image, box: { x: number; y: number; w: number; h: number }, ctx: ComponentCtx, key?: string): React.ReactElement {
  const asset = ctx.images?.[image.asset_id]
  const inks = dossierInks(ctx)
  return asset?.src ? (
    <image
      key={key}
      href={asset.src}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      preserveAspectRatio={image.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
      aria-label={asset.alt || undefined}
    />
  ) : (
    <rect key={key} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.tint} />
  )
}

export const insetComposition: Composition = ({ components, ctx, rect, setting, handOn }) => {
  if (setting !== "dossier") return null
  const images = components.filter((c) => c.type === "image")
  if (images.length !== 1 || components.length < 2) return null
  const first = components[0]!.type === "image"
  const last = components[components.length - 1]!.type === "image"
  if (!first && !last) return null
  const image = (first ? components[0] : components[components.length - 1]) as Image
  const body = first ? components.slice(1) : components.slice(0, -1)
  const spec = body.length === 1 && body[0]!.type === "kpi_cards" ? FIGURES : WIDE
  const photo = { x: first ? rect.x : rect.x + rect.w - spec.w, y: rect.y + PHOTO.top, w: spec.w, h: PHOTO.h }
  const column = { x: first ? rect.x + spec.w + spec.gap : rect.x, y: rect.y, w: rect.w - spec.w - spec.gap, h: rect.h }
  const inks = dossierInks(ctx)
  const caption = image.caption?.trim() ? fitDossier(image.caption, { width: spec.w, size: PHOTO_CAPTION.size, lineHeight: PHOTO_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (image.caption?.trim() && !caption) return null
  if (PHOTO.top + PHOTO.h + (caption ? PHOTO_CAPTION.gap + PHOTO_CAPTION.lineHeight : 0) > rect.h) return null

  let main = handOn?.(body, column) ?? null
  if (!main) {
    if (bodySlotDropsContent(body, column, ctx)) return null
    main = <SvgContent components={[...body]} rect={column} ctx={ctx} />
  }
  return (
    <g {...compositionTag("inset")}>
      <g {...blockTag(ctx, image)} data-dossier-photo="">
        {paintPhoto(image, photo, ctx)}
        {caption ? paintDossier(caption, { ctx, x: photo.x, top: photo.y + photo.h + PHOTO_CAPTION.gap, fill: dossierMeta(inks.muted, inks.ground) }) : null}
      </g>
      {main}
    </g>
  )
}
