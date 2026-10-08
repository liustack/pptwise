import type React from "react"
import { dataUriDimensions } from "../lib/image-size"

/**
 * A picture cropped to the part an author named (`image.crop`,
 * `image_grid.items[].crop`): left, top, width and height as fractions of the
 * whole picture.
 *
 * SVG has no way to crop an `<image>` past what `preserveAspectRatio` does,
 * which only centres or pins a picture to an edge. So a cropped picture is
 * drawn whole, at its own shape, scaled and moved so the named part fills
 * the frame, and a `<clipPath>` of one rectangle, the frame, cuts it there.
 * That one shape is part of the exportable subset (`subset-validate.ts`),
 * and everything that reads an `<image>`'s box (the export's crop, the
 * audit's backgrounds) reads it through the clip (`lib/svg-image-box.ts`).
 *
 * The part fills the frame and is trimmed evenly from its sides where its
 * shape and the frame's differ (`fit: "cover"`), or sits whole inside it
 * (`"contain"`), so the part's centre is always the frame's centre. A
 * picture whose size cannot be read from its data (a remote address, an
 * unknown format) is drawn as an uncropped one: its shape is what places the
 * part.
 */

export type Crop = readonly number[]

export interface FrameBox {
  x: number
  y: number
  w: number
  h: number
}

/** Where the whole picture stands so that `crop` fills `box`, or `null` when the picture's size is unknown. */
export function cropPlacement(src: string, box: FrameBox, crop: Crop, fit: "cover" | "contain" = "cover"): FrameBox | null {
  const natural = dataUriDimensions(src)
  if (!natural || natural.w <= 0 || natural.h <= 0) return null
  const [left = 0, top = 0, width = 1, height = 1] = crop
  const part = { x: left * natural.w, y: top * natural.h, w: width * natural.w, h: height * natural.h }
  if (part.w <= 0 || part.h <= 0) return null
  const scale = fit === "cover" ? Math.max(box.w / part.w, box.h / part.h) : Math.min(box.w / part.w, box.h / part.h)
  const round = (v: number) => Math.round(v * 100) / 100
  return {
    x: round(box.x + box.w / 2 - (part.x + part.w / 2) * scale),
    y: round(box.y + box.h / 2 - (part.y + part.h / 2) * scale),
    w: round(natural.w * scale),
    h: round(natural.h * scale),
  }
}

/** A clip id that two frames on one page share only when they would clip the same picture the same way. */
function clipId(box: FrameBox, crop: Crop, assetKey: string): string {
  const n = (v: number) => String(Math.round(v * 1000) / 1000).replace(/[^0-9]/g, "_")
  return `crop-${assetKey.replace(/[^A-Za-z0-9_-]/g, "_")}-${[box.x, box.y, box.w, box.h, ...crop].map(n).join("-")}`
}

/**
 * A picture filling `box`: cropped to `crop` when there is one, and otherwise
 * the plain `<image>` every renderer draws (`xMidYMid slice` for cover,
 * `meet` for contain), byte for byte.
 */
export function CroppedImage({
  src,
  box,
  crop,
  fit = "cover",
  alt,
  assetKey = "photo",
}: {
  src: string
  box: FrameBox
  crop?: Crop
  fit?: "cover" | "contain"
  alt?: string
  /** The asset's id, to keep two crops of different pictures apart. */
  assetKey?: string
}): React.ReactElement {
  const placed = crop ? cropPlacement(src, box, crop, fit) : null
  if (!crop || !placed) {
    return <image href={src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"} aria-label={alt || undefined} />
  }
  const id = clipId(box, crop, assetKey)
  return (
    <g data-crop="">
      <clipPath id={id}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} />
      </clipPath>
      <image href={src} x={placed.x} y={placed.y} width={placed.w} height={placed.h} preserveAspectRatio="none" clipPath={`url(#${id})`} aria-label={alt || undefined} />
    </g>
  )
}
