/**
 * The parts of a JPEG header that say how it was encoded.
 *
 * A fixture's recipe used to be proved by file size alone, which is a weak
 * proxy: re-encoding the same pixels at quality 87 or 89 lands within 1.5% of
 * quality 88, so an edit to the recorded quality that never reached the
 * committed bytes slipped through. What this reads instead is the encoder's
 * own output — the scan type it wrote, the sampling ratio it chose, and the
 * quantization tables it derived from the quality.
 *
 * Scope, stated so nobody reads more into it than it proves: these are header
 * facts. Options that only move entropy-coded data — Huffman optimisation,
 * trellis quantisation, overshoot deringing — leave every field here identical
 * while changing the file by up to 22%, so they are proved by the byte-identity
 * check the fixture test runs on the canonical machine, never by this.
 *
 * Quantization tables depend on the quality and the table selection, never on
 * the picture, so this part of the comparison holds across encoders. Measured
 * on this repository's own fixture at quality 88, sharp 0.35.3, libjpeg-turbo
 * 3.2.0 `cjpeg` and ImageMagick 7.1.2 all produce the same tables. That is an
 * observation about current builds, not a guarantee the JPEG standard makes:
 * libjpeg's own documentation reserves the right to change the quality-to-table
 * mapping, and a future build that does will need the fixtures regenerated.
 */

/** Segment markers, by the byte that follows `0xFF`. */
const MARKER_SOI = 0xd8
const MARKER_EOI = 0xd9
const MARKER_DQT = 0xdb
const MARKER_TEM = 0x01
const MARKER_STUFFED = 0x00
const SOF_BASELINE = 0xc0
const SOF_EXTENDED = 0xc1
const SOF_PROGRESSIVE = 0xc2
const RST_FIRST = 0xd0
const RST_LAST = 0xd7

export interface JpegMarkers {
  /** True when the frame header is SOF2 rather than SOF0/SOF1. */
  readonly progressive: boolean
  /** "4:4:4", "4:2:2", "4:2:0", "4:4:0", "grayscale", or "hxv" when unnamed. */
  readonly chromaSubsampling: string
  /**
   * Every quantization table in the file, canonicalized: parsed out of their
   * segments, sorted by table id then precision, and serialized. Two files
   * that declare the same tables compare equal even if their encoders wrote
   * them in a different order or packed them into a different number of DQT
   * segments — which is a difference in framing, not in recipe.
   */
  readonly quantisationTables: string
  readonly width: number
  readonly height: number
}

interface Segment {
  readonly marker: number
  readonly payload: Buffer
}

/**
 * Walk the file's segments.
 *
 * Deliberately does not stop at the first scan. A progressive file may declare
 * new quantization tables between scans, and stopping early reported only the
 * tables that happened to come first. Entropy-coded data is walked through
 * rather than parsed: a `0xFF 0x00` stuffed byte is not a marker, restart
 * markers carry no payload, and a run of `0xFF` fill bytes before a marker code
 * is legal padding rather than a marker in itself.
 */
function* segments(jpeg: Buffer): Generator<Segment> {
  let i = 2
  while (i < jpeg.length - 1) {
    if (jpeg.readUInt8(i) !== 0xff) {
      i++
      continue
    }
    // Fill bytes: any number of 0xFF may precede the marker code.
    let at = i
    while (at < jpeg.length && jpeg.readUInt8(at) === 0xff) at++
    if (at >= jpeg.length) return
    const marker = jpeg.readUInt8(at)
    if (marker === MARKER_STUFFED) {
      // 0xFF00 inside entropy-coded data is an escaped 0xFF, not a marker.
      i = at + 1
      continue
    }
    if (marker === MARKER_EOI) return
    if (marker === MARKER_SOI || marker === MARKER_TEM || (marker >= RST_FIRST && marker <= RST_LAST)) {
      i = at + 1
      continue
    }
    if (at + 2 >= jpeg.length) return
    const length = jpeg.readUInt16BE(at + 1)
    if (length < 2) return
    yield { marker, payload: jpeg.subarray(at + 3, at + 1 + length) }
    // A scan header is followed by entropy data, which the loop above walks.
    i = at + 1 + length
  }
}

interface FrameComponent {
  readonly id: number
  readonly h: number
  readonly v: number
}

/**
 * Name the subsampling from the ratio between the components, not from the
 * first one's absolute factors.
 *
 * Reading only component one assumed it was luma and that its own numbers
 * meant something on their own. Neither holds: a file that lists its
 * components in another order reported 4:2:0 as 4:4:4, and a file where all
 * three components share `2x1` — full chroma resolution, written at twice the
 * scale — reported 4:4:4 as 4:2:2. Luma is whichever component samples most
 * finely, and the ratio to the others is what the notation names.
 */
function nameSubsampling(components: readonly FrameComponent[]): string {
  if (components.length === 1) return "grayscale"
  const hMax = Math.max(...components.map((c) => c.h))
  const vMax = Math.max(...components.map((c) => c.v))
  const chroma = components.filter((c) => !(c.h === hMax && c.v === vMax))
  if (chroma.length === 0) return "4:4:4"
  const h = chroma[0]!.h
  const v = chroma[0]!.v
  if (!chroma.every((c) => c.h === h && c.v === v)) return "mixed"
  const hSub = hMax / h
  const vSub = vMax / v
  if (hSub === 1 && vSub === 1) return "4:4:4"
  if (hSub === 2 && vSub === 1) return "4:2:2"
  if (hSub === 1 && vSub === 2) return "4:4:0"
  if (hSub === 2 && vSub === 2) return "4:2:0"
  if (hSub === 4 && vSub === 1) return "4:1:1"
  return `${hSub}x${vSub}`
}

/** One quantization table, as declared. */
interface QuantTable {
  readonly id: number
  readonly precision: number
  readonly values: string
}

/** A DQT segment may pack several tables end to end. */
function readQuantTables(payload: Buffer): QuantTable[] {
  const out: QuantTable[] = []
  let pos = 0
  while (pos < payload.length) {
    const spec = payload.readUInt8(pos)
    const precision = spec >> 4
    const id = spec & 0x0f
    const size = precision === 0 ? 64 : 128
    if (pos + 1 + size > payload.length) break
    out.push({ id, precision, values: payload.subarray(pos + 1, pos + 1 + size).toString("hex") })
    pos += 1 + size
  }
  return out
}

export function readJpegMarkers(jpeg: Buffer): JpegMarkers {
  if (jpeg.length < 4 || jpeg.readUInt16BE(0) !== 0xffd8) throw new Error("not a JPEG: no SOI")
  const tables: QuantTable[] = []
  let progressive = false
  let chromaSubsampling = "unknown"
  let width = 0
  let height = 0
  let seenFrame = false

  for (const { marker, payload } of segments(jpeg)) {
    if (marker === MARKER_DQT) {
      tables.push(...readQuantTables(payload))
      continue
    }
    if (marker === SOF_BASELINE || marker === SOF_EXTENDED || marker === SOF_PROGRESSIVE) {
      if (seenFrame) continue
      progressive = marker === SOF_PROGRESSIVE
      height = payload.readUInt16BE(1)
      width = payload.readUInt16BE(3)
      const count = payload.readUInt8(5)
      const components: FrameComponent[] = []
      for (let c = 0; c < count; c++) {
        const at = 6 + c * 3
        if (at + 1 >= payload.length) break
        const sampling = payload.readUInt8(at + 1)
        components.push({ id: payload.readUInt8(at), h: sampling >> 4, v: sampling & 0x0f })
      }
      chromaSubsampling = nameSubsampling(components)
      seenFrame = true
    }
  }
  if (!seenFrame) throw new Error("not a JPEG: no frame header")

  const canonical = [...tables]
    .sort((a, b) => a.id - b.id || a.precision - b.precision)
    .map((t) => `${t.id}/${t.precision}:${t.values}`)
    .join("|")
  return { progressive, chromaSubsampling, quantisationTables: canonical, width, height }
}
