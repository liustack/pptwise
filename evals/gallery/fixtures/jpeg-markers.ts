/**
 * The parts of a JPEG that say how it was encoded.
 *
 * A fixture's recipe used to be proved by file size alone, which is a weak
 * proxy: re-encoding the same pixels at quality 87 or 89 lands within 1.5% of
 * quality 88, so an edit to the recorded quality that never reached the
 * committed bytes slipped through. The markers below are the encoder's actual
 * output — the sampling factors it chose, whether it wrote a progressive scan,
 * and the quantization tables it derived from the quality — so comparing them
 * against a re-encode of the file's own pixels answers "was this written with
 * that recipe" directly instead of inferring it from a byte count.
 *
 * Quantization tables depend on the quality and the table selection, never on
 * the picture, so this comparison holds across machines and encoders.
 */

/** Segment markers, by the byte that follows `0xFF`. */
const MARKER_SOI = 0xd8
const MARKER_SOS = 0xda
const MARKER_DQT = 0xdb
const MARKER_TEM = 0x01
const SOF_BASELINE = 0xc0
const SOF_EXTENDED = 0xc1
const SOF_PROGRESSIVE = 0xc2
const RST_FIRST = 0xd0
const RST_LAST = 0xd7

export interface JpegMarkers {
  /** True when the frame header is SOF2 rather than SOF0/SOF1. */
  readonly progressive: boolean
  /** "4:4:4", "4:2:2", "4:2:0", "4:4:0", or "grayscale" for one component. */
  readonly chromaSubsampling: string
  /** Every DQT segment's payload, concatenated and hex-encoded. */
  readonly quantisationTables: string
  readonly width: number
  readonly height: number
}

/** Sampling factors of the first (luma) component name the subsampling. */
function subsamplingFrom(frame: Buffer): string {
  const components = frame.readUInt8(5)
  if (components === 1) return "grayscale"
  const sampling = frame.readUInt8(7)
  const h = sampling >> 4
  const v = sampling & 0x0f
  if (h === 1 && v === 1) return "4:4:4"
  if (h === 2 && v === 1) return "4:2:2"
  if (h === 1 && v === 2) return "4:4:0"
  if (h === 2 && v === 2) return "4:2:0"
  return `${h}x${v}`
}

export function readJpegMarkers(jpeg: Buffer): JpegMarkers {
  if (jpeg.readUInt16BE(0) !== 0xffd8) throw new Error("not a JPEG: no SOI")
  const tables: Buffer[] = []
  let progressive = false
  let chromaSubsampling = "unknown"
  let width = 0
  let height = 0
  let seenFrame = false

  let i = 2
  while (i < jpeg.length - 1) {
    if (jpeg.readUInt8(i) !== 0xff) {
      i++
      continue
    }
    const marker = jpeg.readUInt8(i + 1)
    // Standalone markers carry no length.
    if (marker === MARKER_SOI || marker === MARKER_TEM || (marker >= RST_FIRST && marker <= RST_LAST)) {
      i += 2
      continue
    }
    // Entropy-coded data starts here, and nothing past it describes the recipe.
    if (marker === MARKER_SOS) break
    const length = jpeg.readUInt16BE(i + 2)
    const payload = jpeg.subarray(i + 4, i + 2 + length)
    if (marker === MARKER_DQT) tables.push(payload)
    if (marker === SOF_BASELINE || marker === SOF_EXTENDED || marker === SOF_PROGRESSIVE) {
      progressive = marker === SOF_PROGRESSIVE
      chromaSubsampling = subsamplingFrom(payload)
      height = payload.readUInt16BE(1)
      width = payload.readUInt16BE(3)
      seenFrame = true
    }
    i += 2 + length
  }
  if (!seenFrame) throw new Error("not a JPEG: no frame header")
  return {
    progressive,
    chromaSubsampling,
    quantisationTables: Buffer.concat(tables).toString("hex"),
    width,
    height,
  }
}
