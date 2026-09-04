// @vitest-environment node
//
// The marker reader is the fixture test's only portable evidence about how a
// JPEG was encoded, so its own edges are worth pinning. Every case here is a
// hand-built file: the real fixtures are all standard baseline output and would
// never exercise a reordered frame header, a restart marker or a second scan.

import { describe, expect, it } from "vitest"
import { readJpegMarkers } from "./jpeg-markers"

const SOI = [0xff, 0xd8]
const EOI = [0xff, 0xd9]

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2
  return [0xff, marker, length >> 8, length & 0xff, ...payload]
}

/** One 8-bit quantization table, filled with a recognisable value. */
function dqt(id: number, fill: number, precision = 0): number[] {
  const size = precision === 0 ? 64 : 128
  return segment(0xdb, [(precision << 4) | id, ...Array(size).fill(fill)])
}

/** A frame header listing components as `[id, h, v]`. */
function sof(marker: number, components: [number, number, number][], w = 16, h = 8): number[] {
  return segment(marker, [
    8,
    h >> 8,
    h & 0xff,
    w >> 8,
    w & 0xff,
    components.length,
    ...components.flatMap(([id, ch, cv]) => [id, (ch << 4) | cv, 0]),
  ])
}

function sos(): number[] {
  return segment(0xda, [1, 1, 0, 0, 63, 0])
}

function jpeg(...parts: number[][]): Buffer {
  return Buffer.from(parts.flat())
}

describe("readJpegMarkers", () => {
  it("names subsampling from the ratio between components, not the first one", () => {
    const standard420 = jpeg(SOI, dqt(0, 1), sof(0xc0, [[1, 2, 2], [2, 1, 1], [3, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(standard420).chromaSubsampling).toBe("4:2:0")

    // The same file with its components listed in another order. Reading only
    // component one called this 4:4:4.
    const reordered420 = jpeg(SOI, dqt(0, 1), sof(0xc0, [[2, 1, 1], [1, 2, 2], [3, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(reordered420).chromaSubsampling).toBe("4:2:0")

    // Full chroma resolution written at twice the scale. Reading component
    // one's absolute factors called this 4:2:2.
    const scaled444 = jpeg(SOI, dqt(0, 1), sof(0xc0, [[1, 2, 1], [2, 2, 1], [3, 2, 1]]), sos(), EOI)
    expect(readJpegMarkers(scaled444).chromaSubsampling).toBe("4:4:4")

    const plain444 = jpeg(SOI, dqt(0, 1), sof(0xc0, [[1, 1, 1], [2, 1, 1], [3, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(plain444).chromaSubsampling).toBe("4:4:4")

    const grey = jpeg(SOI, dqt(0, 1), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(grey).chromaSubsampling).toBe("grayscale")
  })

  it("reads the frame size and scan type", () => {
    const baseline = jpeg(SOI, dqt(0, 1), sof(0xc0, [[1, 1, 1]], 1280, 720), sos(), EOI)
    expect(readJpegMarkers(baseline)).toMatchObject({ width: 1280, height: 720, progressive: false })

    const progressive = jpeg(SOI, dqt(0, 1), sof(0xc2, [[1, 1, 1]], 720, 1520), sos(), EOI)
    expect(readJpegMarkers(progressive)).toMatchObject({ width: 720, height: 1520, progressive: true })
  })

  it("walks past entropy data, stuffed bytes, restart markers and fill bytes", () => {
    // 0xFF00 is an escaped 0xFF inside the scan, 0xFFD0 is a restart, and a run
    // of 0xFF before a marker code is legal padding.
    const entropy = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xd1, 0x78]
    const file = jpeg(
      SOI,
      dqt(0, 1),
      sof(0xc0, [[1, 1, 1]]),
      sos(),
      entropy,
      [0xff, 0xff, 0xff],
      dqt(1, 2),
      EOI,
    )
    const markers = readJpegMarkers(file)
    expect(markers.width).toBe(16)
    // Both tables are found: the one before the scan and the one after it.
    expect(markers.quantisationTables.split("|")).toHaveLength(2)
  })

  it("collects tables declared between the scans of a progressive file", () => {
    const first = jpeg(SOI, dqt(0, 1), sof(0xc2, [[1, 1, 1]]), sos(), [0x11, 0x22], EOI)
    const second = jpeg(
      SOI,
      dqt(0, 1),
      sof(0xc2, [[1, 1, 1]]),
      sos(),
      [0x11, 0x22],
      dqt(1, 3),
      sos(),
      [0x33],
      EOI,
    )
    // Stopping at the first scan reported only the first table.
    expect(readJpegMarkers(first).quantisationTables.split("|")).toHaveLength(1)
    expect(readJpegMarkers(second).quantisationTables.split("|")).toHaveLength(2)
  })

  it("compares equal when the same tables are framed differently", () => {
    const twoSegments = jpeg(SOI, dqt(0, 7), dqt(1, 9), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    // The same two tables, declared in the other order.
    const swapped = jpeg(SOI, dqt(1, 9), dqt(0, 7), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    // And packed into one segment instead of two.
    const packed = jpeg(
      SOI,
      segment(0xdb, [0, ...Array(64).fill(7), 1, ...Array(64).fill(9)]),
      sof(0xc0, [[1, 1, 1]]),
      sos(),
      EOI,
    )
    const canonical = readJpegMarkers(twoSegments).quantisationTables
    expect(readJpegMarkers(swapped).quantisationTables).toBe(canonical)
    expect(readJpegMarkers(packed).quantisationTables).toBe(canonical)
    // A different table value is still a different recipe.
    const different = jpeg(SOI, dqt(0, 7), dqt(1, 8), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(different).quantisationTables).not.toBe(canonical)
  })

  it("keeps 16-bit tables distinct from 8-bit ones with the same id", () => {
    const eight = jpeg(SOI, dqt(0, 4, 0), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    const sixteen = jpeg(SOI, dqt(0, 4, 1), sof(0xc0, [[1, 1, 1]]), sos(), EOI)
    expect(readJpegMarkers(eight).quantisationTables).not.toBe(readJpegMarkers(sixteen).quantisationTables)
  })

  it("refuses a file that is not a JPEG", () => {
    expect(() => readJpegMarkers(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toThrow(/no SOI/)
    expect(() => readJpegMarkers(jpeg(SOI, dqt(0, 1), EOI))).toThrow(/no frame header/)
  })
})
