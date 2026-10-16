// @vitest-environment node
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { CELL_HEIGHT, CELL_WIDTH, drawContactSheet, numberStrokes } from "./image-sheet"

async function solid(width: number, height: number, rgb: [number, number, number]): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } })
    .jpeg()
    .toBuffer()
}

async function pixel(jpeg: Buffer, x: number, y: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
  const at = (y * info.width + x) * info.channels
  return [data[at]!, data[at + 1]!, data[at + 2]!]
}

function near(actual: [number, number, number], expected: [number, number, number], tolerance = 24): boolean {
  return actual.every((value, index) => Math.abs(value - expected[index]!) <= tolerance)
}

describe("drawContactSheet", () => {
  it("lays eight thumbnails out four to a row, each under a dark number badge", async () => {
    const red = await solid(400, 300, [220, 30, 30])
    const cells = Array.from({ length: 8 }, (_, index) => ({ n: index + 1, bytes: red }))
    const { jpeg, missing } = await drawContactSheet(cells)
    const meta = await sharp(jpeg).metadata()
    expect(meta.format).toBe("jpeg")
    expect(meta.width).toBe(12 + 4 * (CELL_WIDTH + 12))
    expect(meta.height).toBe(12 + 2 * (CELL_HEIGHT + 12))
    expect(missing).toEqual([])
    // The last cell's middle is the picture, and its top left corner the badge.
    const left = 12 + 3 * (CELL_WIDTH + 12)
    const top = 12 + CELL_HEIGHT + 12
    expect(near(await pixel(jpeg, left + CELL_WIDTH / 2, top + CELL_HEIGHT / 2), [220, 30, 30])).toBe(true)
    expect(near(await pixel(jpeg, left + 3, top + 3), [17, 17, 17])).toBe(true)
  })

  it("sizes a short sheet to its hits and crosses out a thumbnail it could not get or read", async () => {
    const blue = await solid(300, 400, [30, 30, 220])
    const { jpeg, missing } = await drawContactSheet([
      { n: 1, bytes: blue },
      { n: 2, bytes: null },
      { n: 3, bytes: Buffer.from("not a picture") },
    ])
    const meta = await sharp(jpeg).metadata()
    expect(meta.width).toBe(12 + 3 * (CELL_WIDTH + 12))
    expect(meta.height).toBe(12 + CELL_HEIGHT + 12)
    expect(missing).toEqual([2, 3])
    // A portrait picture keeps its shape: the cell's sides stay empty.
    expect(near(await pixel(jpeg, 12 + 6, 12 + CELL_HEIGHT - 6), [230, 230, 230])).toBe(true)
    expect(near(await pixel(jpeg, 12 + CELL_WIDTH / 2, 12 + CELL_HEIGHT / 2), [30, 30, 220])).toBe(true)
  })

  it("lays cells out at the size it is given", async () => {
    const green = await solid(1280, 720, [30, 160, 30])
    const { jpeg } = await drawContactSheet([{ n: 1, bytes: green }, { n: 2, bytes: green }], { width: 480, height: 270 })
    const meta = await sharp(jpeg).metadata()
    expect(meta.width).toBe(12 + 2 * (480 + 12))
    expect(meta.height).toBe(12 + 270 + 12)
    expect(near(await pixel(jpeg, 12 + 480 + 12 + 240, 12 + 135), [30, 160, 30])).toBe(true)
  })

  it("numbers a deck's pages in a band above each row, leaving every corner of the page to show", async () => {
    // A page's top left corner holds its section label or crumb, and a badge
    // over it hid that from a look at the deck sheet (2026-10).
    const red = await solid(1280, 720, [220, 30, 30])
    const cells = Array.from({ length: 5 }, (_, index) => ({ n: index + 1, bytes: red }))
    const { jpeg } = await drawContactSheet(cells, { width: 480, height: 270 }, "above")
    const meta = await sharp(jpeg).metadata()
    expect(meta.height).toBe(12 + 2 * (36 + 270 + 12))
    const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
    for (const [left, top] of [
      [12, 12 + 36],
      [12, 12 + 36 + 270 + 12 + 36],
    ]) {
      expect(near(await pixel(jpeg, left! + 3, top! + 3), [220, 30, 30])).toBe(true)
      // The band above the page holds the number in dark strokes on the white sheet.
      let darkest = 255
      for (let x = left!; x < left! + 30; x++) for (let y = top! - 36; y < top!; y++) darkest = Math.min(darkest, data[(y * info.width + x) * info.channels]!)
      expect(darkest).toBeLessThan(80)
    }
  })

  it("refuses an empty sheet", async () => {
    await expect(drawContactSheet([])).rejects.toThrow(/at least one picture/)
  })
})

describe("numberStrokes", () => {
  it("draws each digit from its own segments, two digits side by side", () => {
    expect(numberStrokes(1, 0, 0, 1).match(/<line/g)).toHaveLength(2)
    expect(numberStrokes(8, 0, 0, 1).match(/<line/g)).toHaveLength(7)
    expect(numberStrokes(12, 0, 0, 1).match(/<line/g)).toHaveLength(7)
    expect(numberStrokes(12, 0, 0, 1)).toContain('x1="23"')
  })
})
