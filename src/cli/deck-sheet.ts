/**
 * The deck sheet `pptwise build --sheet` writes: every page of the deck drawn
 * small into one JPEG, each under its page number. It is for looking at the
 * deck as a reader does, all at once: whether the pictures fit their pages,
 * where a page is empty, and how the pages follow one another. The audit
 * measures the pages. This only shows them.
 *
 * The pages are the SVGs the build just drew, rasterized by sharp (an
 * optional dependency, as for the stock search's contact sheet) and laid out
 * by the same sheet drawer, in cells of the slide's own 16:9 shape.
 */
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { PptwiseError } from "../errors"
import { drawContactSheet, loadSharp, type SheetCell } from "./image-sheet"

/** The sheet's file name in the deck's workspace folder. */
export const DECK_SHEET_FILE = "sheet.jpg"

/** One page's cell: a 16:9 box wide enough to read a heading. */
export const DECK_SHEET_CELL = { width: 480, height: Math.round((480 * CANVAS_H_PX) / CANVAS_W_PX) }

/**
 * Draw `svgs`, the deck's pages in order, into `<dir>/sheet.jpg`. Returns the
 * path, or a note saying why there is none when sharp is not installed. A page
 * sharp cannot draw is crossed out under its number and named in the note.
 */
export async function writeDeckSheet(dir: string, svgs: readonly string[]): Promise<{ path?: string; note?: string }> {
  let sharp: Awaited<ReturnType<typeof loadSharp>>
  try {
    sharp = await loadSharp()
  } catch (e) {
    if (e instanceof PptwiseError) return { note: `no deck sheet: ${e.message}` }
    throw e
  }
  const cells: SheetCell[] = []
  for (const [i, svg] of svgs.entries()) {
    let bytes: Buffer | null
    try {
      bytes = await sharp(Buffer.from(svg), { density: 72 })
        .resize({ width: DECK_SHEET_CELL.width, height: DECK_SHEET_CELL.height, fit: "contain", background: "#ffffff" })
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer()
    } catch {
      bytes = null
    }
    cells.push({ n: i + 1, bytes })
  }
  const { jpeg, missing } = await drawContactSheet(cells, DECK_SHEET_CELL)
  const path = join(dir, DECK_SHEET_FILE)
  await writeFile(path, jpeg)
  return missing.length > 0 ? { path, note: `the deck sheet could not draw page ${missing.join(", ")}: open its SVG to look at it` } : { path }
}
