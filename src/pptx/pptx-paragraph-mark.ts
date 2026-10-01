import JSZip from "jszip"

/**
 * Give every paragraph-end mark the fonts of the paragraph it ends.
 *
 * PowerPoint lays the paragraph-end mark (`<a:endParaRPr>`) out like one more
 * character on the last line, so its font takes part in that line's height
 * and in where the first baseline sits. pptxgenjs 4.0.1 writes the mark with
 * a size and no typeface (`genXmlTextBody`, the `reqsClosingFontSize`
 * branch: `<a:endParaRPr lang="en-US" sz="…" dirty="0"/>`), so it falls
 * back to the theme's minor font, Calibri. Measured in PowerPoint for Mac,
 * that pulled every line toward Calibri's metrics: a Georgia line set its
 * baseline at 0.945 em instead of Georgia's own 0.969, a Courier New line at
 * 0.890 instead of 0.882, a SimSun line at 0.960 instead of 1.031. With the
 * mark carrying the run's fonts, every face measured lands on its own
 * metrics, which `svg2pptx/baseline.ts` can then predict from a table.
 *
 * The mark copies the first run's `<a:latin>`, `<a:ea>` and `<a:cs>`. Every
 * text op svg2pptx writes names one face for the whole `<text>`, so all runs
 * of a paragraph carry the same three slots. Runs after the
 * `applyEaFontFaces` pass, so the mark copies the corrected `<a:ea>` too. A
 * side effect a user sees: text typed at the end of an exported line now
 * continues in the line's face instead of Calibri.
 */

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

/** Same scope as the sibling patches: slide parts only. */
const SLIDE_PART_RE = /^ppt\/slides\/slide\d+\.xml$/

/** One paragraph. `<a:p>` never nests, and `<a:pPr` does not match `<a:p>`. */
const PARAGRAPH_RE = /<a:p>[\s\S]*?<\/a:p>/g

/**
 * The first run's font slots, in schema order (`CT_TextCharacterProperties`:
 * latin, ea, cs), as pptxgenjs and `applyEaFontFaces` write them, adjacent.
 */
const RUN_FONTS_RE = /<a:rPr\b[^>]*>[\s\S]*?(<a:latin [^>]*\/>(?:<a:ea [^>]*\/>)?(?:<a:cs [^>]*\/>)?)/

/** A mark that names no font yet: self-closing, attributes only. */
const BARE_MARK_RE = /<a:endParaRPr([^>]*?)\/>/

/** Rewrite one slide part. Idempotent: a mark with children is left alone. */
export function patchParagraphMarksInXml(xml: string): string {
  return xml.replace(PARAGRAPH_RE, (paragraph) => {
    const fonts = RUN_FONTS_RE.exec(paragraph)
    if (!fonts) return paragraph
    return paragraph.replace(BARE_MARK_RE, (_mark, attrs: string) => `<a:endParaRPr${attrs}>${fonts[1]}</a:endParaRPr>`)
  })
}

/** Apply `patchParagraphMarksInXml` to every slide part of a finished package. */
export async function applyParagraphMarkFonts(pptx: Blob): Promise<Blob> {
  const zip = await JSZip.loadAsync(await pptx.arrayBuffer())
  let changed = false
  for (const path of Object.keys(zip.files)) {
    if (!SLIDE_PART_RE.test(path) || zip.files[path]!.dir) continue
    const raw = await zip.files[path]!.async("string")
    const patched = patchParagraphMarksInXml(raw)
    if (patched !== raw) {
      zip.file(path, patched)
      changed = true
    }
  }
  if (!changed) return pptx
  const ab = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" })
  return new Blob([ab], { type: PPTX_MIME })
}
