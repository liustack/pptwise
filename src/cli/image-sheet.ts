/**
 * The contact sheet `pptwise images search --sheet` writes: every result's
 * thumbnail in one JPEG, each under a large number that matches the number
 * the search printed beside its id. A model that can look at an image picks
 * a photo by reading one file instead of opening eight links, and a person
 * does the same at a glance.
 *
 * The numbers are drawn as strokes, not set in a font: sharp renders SVG
 * through librsvg, and which fonts it finds differs per machine. Strokes look
 * the same everywhere.
 */
import type * as Sharp from "sharp"
import { PptwiseError } from "../errors"
import { isMissingModuleError } from "../platform/node"

/** One numbered cell. `bytes` is null when the thumbnail could not be had,
 *  and the cell is then drawn crossed out under its number. */
export interface SheetCell {
  n: number
  bytes: Buffer | null
}

export const SHEET_COLUMNS = 4
export const CELL_WIDTH = 360
export const CELL_HEIGHT = 270
const GAP = 12
const BADGE = 52
const PAGE = "#ffffff"
const CELL = "#e6e6e6"

/**
 * Seven segments per digit on a 10 x 18 box: a top, b top right, c bottom
 * right, d bottom, e bottom left, f top left, g middle.
 */
const SEGMENTS: Record<string, [number, number, number, number]> = {
  a: [1, 1, 9, 1],
  b: [9, 1, 9, 9],
  c: [9, 9, 9, 17],
  d: [1, 17, 9, 17],
  e: [1, 9, 1, 17],
  f: [1, 1, 1, 9],
  g: [1, 9, 9, 9],
}
const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
}

/** The strokes that draw `n` with its top left corner at (x, y), each digit
 *  `scale` times the 10 x 18 box, 4 units apart. */
export function numberStrokes(n: number, x: number, y: number, scale: number): string {
  const lines: string[] = []
  ;[...String(n)].forEach((digit, index) => {
    const left = x + index * 14 * scale
    for (const segment of DIGITS[digit] ?? "") {
      const [x1, y1, x2, y2] = SEGMENTS[segment]!
      lines.push(
        `<line x1="${left + x1 * scale}" y1="${y + y1 * scale}" x2="${left + x2 * scale}" y2="${y + y2 * scale}"/>`,
      )
    }
  })
  return lines.join("")
}

/** The size of one cell. Search thumbnails take the default 4:3 cell. */
export interface CellSize {
  width: number
  height: number
}

const DEFAULT_CELL: CellSize = { width: CELL_WIDTH, height: CELL_HEIGHT }

/** Where cell `index` sits on the sheet. */
function cellOrigin(index: number, cell: CellSize): { left: number; top: number } {
  const col = index % SHEET_COLUMNS
  const row = Math.floor(index / SHEET_COLUMNS)
  return { left: GAP + col * (cell.width + GAP), top: GAP + row * (cell.height + GAP) }
}

/** The badges and the crosses for missing thumbnails, as one SVG over the sheet. */
function overlaySvg(cells: SheetCell[], width: number, height: number, size: CellSize): string {
  const parts: string[] = []
  cells.forEach((cell, index) => {
    const { left, top } = cellOrigin(index, size)
    if (cell.bytes === null) {
      parts.push(
        `<g stroke="#9a9a9a" stroke-width="3"><line x1="${left}" y1="${top}" x2="${left + size.width}" y2="${top + size.height}"/><line x1="${left + size.width}" y1="${top}" x2="${left}" y2="${top + size.height}"/></g>`,
      )
    }
    const digits = String(cell.n).length
    const scale = 2
    const badgeWidth = Math.max(BADGE, 16 + (digits * 14 - 4) * scale)
    parts.push(`<rect x="${left}" y="${top}" width="${badgeWidth}" height="${BADGE}" fill="#111111"/>`)
    const textWidth = (digits * 14 - 4) * scale
    parts.push(
      `<g stroke="#ffffff" stroke-width="4.5" stroke-linecap="round">${numberStrokes(cell.n, left + (badgeWidth - textWidth) / 2, top + (BADGE - 18 * scale) / 2, scale)}</g>`,
    )
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join("")}</svg>`
}

export async function loadSharp(): Promise<typeof Sharp.default> {
  try {
    return (await import("sharp")).default as unknown as typeof Sharp.default
  } catch (e) {
    if (isMissingModuleError(e)) {
      throw new PptwiseError(`Drawing a contact sheet requires the optional dependency "sharp" (npm i sharp)`)
    }
    throw e
  }
}

/**
 * Draw the sheet as a JPEG. Each thumbnail is fitted whole into its cell,
 * so the sheet shows the picture's own shape. A thumbnail sharp cannot read
 * is drawn as a missing one. `missing` lists the numbers drawn that way.
 * `size` is the cell's size, 360 by 270 unless given.
 */
export async function drawContactSheet(cells: SheetCell[], size: CellSize = DEFAULT_CELL): Promise<{ jpeg: Buffer; missing: number[] }> {
  if (cells.length === 0) throw new PptwiseError("a contact sheet needs at least one picture")
  const sharp = await loadSharp()
  const rows = Math.ceil(cells.length / SHEET_COLUMNS)
  const columns = Math.min(cells.length, SHEET_COLUMNS)
  const width = GAP + columns * (size.width + GAP)
  const height = GAP + rows * (size.height + GAP)
  const drawn: SheetCell[] = []
  const layers: Sharp.OverlayOptions[] = []
  for (const [index, cell] of cells.entries()) {
    const { left, top } = cellOrigin(index, size)
    let fitted: Buffer | null = null
    if (cell.bytes !== null) {
      try {
        fitted = await sharp(cell.bytes)
          .rotate()
          .resize({ width: size.width, height: size.height, fit: "contain", background: CELL })
          .flatten({ background: CELL })
          .jpeg({ quality: 82 })
          .toBuffer()
      } catch {
        // Bytes that are not a picture sharp reads: drawn as a missing one.
        fitted = null
      }
    }
    const missing = fitted === null
    fitted ??= await sharp({ create: { width: size.width, height: size.height, channels: 3, background: CELL } })
      .jpeg()
      .toBuffer()
    layers.push({ input: fitted, left, top })
    drawn.push({ n: cell.n, bytes: missing ? null : fitted })
  }
  layers.push({ input: Buffer.from(overlaySvg(drawn, width, height, size)), left: 0, top: 0 })
  const jpeg = await sharp({ create: { width, height, channels: 3, background: PAGE } })
    .composite(layers)
    .jpeg({ quality: 82 })
    .toBuffer()
  return { jpeg, missing: drawn.filter((cell) => cell.bytes === null).map((cell) => cell.n) }
}
