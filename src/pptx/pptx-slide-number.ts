import JSZip from "jszip"
import { pad4 } from "./pptx-animations"

/**
 * Turn the footer's page number into PowerPoint's own slide-number field.
 *
 * The SVG page draws the number as plain text (`render/footer.tsx`, marked
 * `data-field="slidenum"`), and svg2pptx writes it as an ordinary text box
 * named {@link slideNumberObjectName}, like every other line of text on the
 * page, so it lands on the same per-font baseline and in the same place.
 * pptxgenjs has no API for a field inside an ordinary text box. Its own
 * `slideNumber` option writes a slide-number placeholder with a fixed shape
 * id and its own margins, which would collide with svg2pptx's ids and drift
 * off the SVG's baseline. So the run is rewritten here, after the package is
 * written: `<a:r>…</a:r>` becomes `<a:fld type="slidenum">…</a:fld>`, the
 * same element PowerPoint writes for Insert > Slide Number in a text box.
 * The run's properties and its text (this page's own number) are kept, and
 * PowerPoint recomputes the number whenever slides move.
 *
 * Fails loud. A marked box that is not exactly one run would ship a frozen
 * number that goes wrong the moment a slide moves, which is the reason the
 * static page numbers were removed in the first place (2026-07-09).
 */

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

/** Same scope as the sibling patches: slide parts only. */
const SLIDE_PART_RE = /^ppt\/slides\/slide\d+\.xml$/

/** Prefix of the `p:cNvPr name` svg2pptx gives a page-number text box. */
export const SLIDE_NUMBER_OBJECT_PREFIX = "pptwise-slidenum-"

/**
 * The field id PowerPoint keys a slide-number field by. Any GUID is valid,
 * and PowerPoint itself reuses one id for every slide-number field in a file.
 * A fixed value keeps the export byte-deterministic.
 */
export const SLIDE_NUMBER_FIELD_ID = "{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}"

/** The `objectName` of the page-number text box on the slide at `slideIndex` (0-based). */
export function slideNumberObjectName(slideIndex: number | undefined): string {
  return `${SLIDE_NUMBER_OBJECT_PREFIX}s${pad4(slideIndex ?? 0)}`
}

const RUN_RE = /<a:r>([\s\S]*?)<\/a:r>/g

/** Rewrite every marked text box in one slide part. Idempotent: a box already holding its field is left alone. */
export function patchSlideNumberFieldsInXml(xml: string, part = "slide"): string {
  let out = xml
  let from = 0
  for (;;) {
    const anchor = out.indexOf(`name="${SLIDE_NUMBER_OBJECT_PREFIX}`, from)
    if (anchor === -1) return out
    const spStart = out.lastIndexOf("<p:sp>", anchor)
    const spEnd = out.indexOf("</p:sp>", anchor)
    if (spStart === -1 || spEnd === -1) {
      throw new Error(`pptx: page-number text box in ${part} is not inside a <p:sp>…</p:sp>`)
    }
    const sp = out.slice(spStart, spEnd)
    if (sp.includes('<a:fld ') && sp.includes('type="slidenum"')) {
      from = spEnd
      continue
    }
    const runs = sp.match(RUN_RE) ?? []
    if (runs.length !== 1) {
      throw new Error(`pptx: page-number text box in ${part} holds ${runs.length} runs, expected exactly one`)
    }
    const patched = sp.replace(RUN_RE, (_run, body: string) => `<a:fld id="${SLIDE_NUMBER_FIELD_ID}" type="slidenum">${body}</a:fld>`)
    out = out.slice(0, spStart) + patched + out.slice(spEnd)
    from = spStart + patched.length
  }
}

/** Apply `patchSlideNumberFieldsInXml` to every slide part of a finished package. */
export async function applySlideNumberFields(pptx: Blob): Promise<Blob> {
  const zip = await JSZip.loadAsync(await pptx.arrayBuffer())
  let changed = false
  for (const path of Object.keys(zip.files)) {
    if (!SLIDE_PART_RE.test(path) || zip.files[path]!.dir) continue
    const raw = await zip.files[path]!.async("string")
    if (!raw.includes(SLIDE_NUMBER_OBJECT_PREFIX)) continue
    const patched = patchSlideNumberFieldsInXml(raw, path)
    if (patched !== raw) {
      zip.file(path, patched)
      changed = true
    }
  }
  if (!changed) return pptx
  const ab = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" })
  return new Blob([ab], { type: PPTX_MIME })
}
