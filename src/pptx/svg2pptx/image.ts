import { pxToIn } from "../../constants"
import { dataUriDimensions } from "../../lib/image-size"
import { clipFor, drawnImageBox, roundImage, visibleImageBox } from "../../lib/svg-image-box"

/**
 * A pptxgenjs image draw, produced from an SVG `<image>` element.
 * Rendered later via `slide.addImage({ data, x, y, w, h })`.
 * `data` is a base64 data-URI string (e.g. "data:image/png;base64,...").
 * All positions are in inches.
 */
export interface ImageOp {
  kind: "image"
  x: number
  y: number
  w: number
  h: number
  data: string
  /**
   * pptxgenjs sizing（2026-07-09 用户报导出拉伸）：SVG 预览的
   * preserveAspectRatio 语义必须翻译到导出，否则 addImage 按 w/h 拉伸。
   * slice→cover（居中裁剪出血，pptxgenjs 对称 srcRect）、meet/缺省→contain
   * （SVG 规范缺省即 xMidYMid meet）、显式 none→不设（保持拉伸）。
   */
  sizing?: { type: "cover" | "contain"; w: number; h: number } | { type: "crop"; x: number; y: number; w: number; h: number }
  /**
   * A11Y-01 alt 链路：这个 `<image>` 元素的 `aria-label`（`components/image.tsx`
   * 写入的，源头是 `ir.assets.images[asset_id].alt`），原样传给
   * `render.ts` 去设 pptxgenjs 的 `altText`（落到 `p:cNvPr@descr`，PowerPoint
   * 「编辑替换文字」读写的就是它）。`undefined` 而非空字符串——没有 alt 的
   * 资产整个属性都不发（见 `resolveHref` 上方 `imageToOp` 的读取），所以这里
   * 也不该凭空造一个空串。
   */
  alt?: string
  /**
   * Degrees clockwise around the box's centre, matching pptxgenjs `rotate`.
   * Set by `svg2pptx/dispatch.ts` when the leaf's CTM carries a turn.
   */
  rotate?: number
  /** Set by `svg2pptx/dispatch.ts` when this leaf lives under a `data-blk`-tagged `<g>` (wave-C S3, `elements === "auto"` only). */
  blockIndex?: number
  /** A picture cut round (a clip of one circle or ellipse): PowerPoint draws it as an oval picture. */
  round?: boolean
}

const XLINK_NS = "http://www.w3.org/1999/xlink"

function num(el: Element, name: string): number {
  return parseFloat(el.getAttribute(name) ?? "0") || 0
}

/**
 * Resolve the image source from an SVG `<image>` element.
 * Priority: `href` attribute > `xlink:href` (namespaced) > `xlink:href` (raw).
 */
function resolveHref(el: Element): string {
  return (
    el.getAttribute("href") ??
    el.getAttributeNS(XLINK_NS, "href") ??
    el.getAttribute("xlink:href") ??
    ""
  )
}

export { dataUriDimensions } from "../../lib/image-size"

/** Convert an SVG `<image>` element to a pptxgenjs image op. */
export function imageToOp(el: Element): ImageOp {
  const boxW = pxToIn(num(el, "width"))
  const boxH = pxToIn(num(el, "height"))
  const data = resolveHref(el)
  const op: ImageOp = {
    kind: "image",
    x: pxToIn(num(el, "x")),
    y: pxToIn(num(el, "y")),
    w: boxW,
    h: boxH,
    data,
  }
  // `.getAttribute()`, not `.getAttributeNode()?.value`, would look
  // equivalent and read cleaner — but linkedom (the Node DOMParser this
  // export path runs under) has a real decode bug on it: parsing
  // `aria-label="a &amp; b &lt;c&gt;"` back with `.getAttribute()` returns
  // `"a &amp; b &lt;c&gt;"` (only `&quot;`/`&#x27;`/numeric entities decoded,
  // `&amp;`/`&lt;`/`&gt;` left literal — verified against linkedom 0.18.12
  // directly, no fix upstream at the time of writing), which would then get
  // *re*-escaped by pptxgenjs's own `encodeXmlEntities` into a doubled
  // `&amp;amp;` in the exported `descr`. `.getAttributeNode()?.value` (and
  // equivalently, iterating `el.attributes`) hits a different linkedom code
  // path that decodes correctly. `href`/`x`/`y`/etc. above don't carry free
  // user text through an XML *attribute* (data URIs have no `&`/`<`/`>` to
  // mis-decode; positions are plain numbers), so this is the first place in
  // this file that needs the workaround.
  const alt = el.getAttributeNode("aria-label")?.value
  if (alt) op.alt = alt
  // A round picture is the same picture in an oval frame: PowerPoint's
  // ellipse geometry cuts it where the clip's circle does.
  if (roundImage(el)) op.round = true
  // A cropped picture (`render/cropped-image.tsx`) is drawn whole at its own
  // shape and cut by a one-rectangle clip. PowerPoint draws the clip's box
  // and crops the picture to it: pptxgenjs's `crop` sizing takes the whole
  // picture's size as `w`/`h` and the visible box inside it, in the same
  // units, and turns their ratio into the `srcRect`.
  const drawn = drawnImageBox(el)
  const visible = visibleImageBox(el)
  if (clipFor(el) && drawn.w > 0 && drawn.h > 0 && (visible.x !== drawn.x || visible.y !== drawn.y || visible.w !== drawn.w || visible.h !== drawn.h)) {
    if (visible.w <= 0 || visible.h <= 0) return { ...op, x: pxToIn(visible.x), y: pxToIn(visible.y), w: 0, h: 0 }
    op.x = pxToIn(visible.x)
    op.y = pxToIn(visible.y)
    op.w = boxW
    op.h = boxH
    op.sizing = { type: "crop", x: pxToIn(visible.x - drawn.x), y: pxToIn(visible.y - drawn.y), w: pxToIn(visible.w), h: pxToIn(visible.h) }
    return op
  }
  const par = el.getAttribute("preserveAspectRatio") ?? ""
  if (par !== "none") {
    // slice→cover（居中裁剪出血）；meet/缺省→contain（SVG 规范缺省即
    // xMidYMid meet）。pptxgenjs 契约：w/h 传图片原始尺寸、sizing.w/h 传
    // 目标框（单位一致即可，比值运算）。嗅探不到原始尺寸时保持拉伸
    // （不比修复前更糟，且 aspect 相同时拉伸=无损）。
    const natural = dataUriDimensions(data)
    if (natural && natural.w > 0 && natural.h > 0) {
      op.w = pxToIn(natural.w)
      op.h = pxToIn(natural.h)
      op.sizing = { type: par.includes("slice") ? "cover" : "contain", w: boxW, h: boxH }
    }
  }
  return op
}
