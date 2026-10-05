/**
 * Reads the real advance widths of the punctuation, symbols and accented
 * Latin letters Chinese and English decks carry, from the four faces the
 * width estimator names, and writes them as upper bounds to
 *   src/lib/symbol-advances.ts
 *
 * The estimator prices a character outside printable ASCII by class average
 * (0.46em for a mark, 1em for a CJK one). Several real glyphs are wider than
 * that: SimSun and KaiTi set "·" on the full em, YaHei's "—" runs 1.08em,
 * "‰" is 1.31em in Georgia. An underestimate is the unsafe direction, since
 * a line fitted to it paints past its box. The table this writes is a floor
 * the estimator raises its guess to, never a ceiling it lowers it by.
 *
 * Which glyph paints is not always the declared face's. The export writes
 * YaHei as the East Asian font behind Georgia (`eaFontFaceFor`), so a Georgia
 * bound is the wider of the two. A character a face does not carry at all is
 * drawn from a substitute, and its bound is the widest of the measured faces
 * that do carry it. SimSun and KaiTi have no Bold binary, and PowerPoint
 * emboldens them synthetically without changing an advance, so their Bold
 * bound is their Regular one. The two share one estimator key, so their
 * bound is the wider of the two.
 *
 * The middle dot, the em dash and the curly quotation marks are measured,
 * not bounded. The export writes every run as lang="en-US", and PowerPoint
 * then paints these from the run's `<a:latin>` face, beside Chinese text as
 * much as English, and never from its `<a:ea>` face. PowerPoint for Mac, PDF
 * export, 2026-10-03, every run Georgia over YaHei: “ ” at 0.411em and ‘ ’
 * at 0.228em in a Latin sentence, inside a Chinese one and opening one, "—"
 * at 0.857em and "·" at 0.279em (Bold 0.928em and 0.338em) in 「甲——乙·丙」
 * and "A—B·C" alike, the Georgia advances below. A YaHei, YaHei Bold,
 * SimSun, KaiTi or Consolas run painted them from its own face. So such a
 * mark's width is the advance of the face the run names, and
 * `LATIN_FACE_MARK_ADVANCES` holds it for each face that carries the mark.
 * Bounding them wide instead put Georgia's "—" at YaHei's 1.08em.
 *
 * The same probe found "…", "•", "‰", "′" and "–" painted from Georgia too,
 * at or under the bounds here, which err wide for them, and "×", "°", "±"
 * and "÷" painted from YaHei, the `<a:ea>` face, which the bounds hold.
 *
 * Needs the genuine binaries: macOS Georgia and the Office for Mac copies of
 * Microsoft YaHei, SimSun and KaiTi. Each file's `name` table is checked
 * before it is read.
 *
 * Run: pnpm exec tsx scripts/gen-symbol-advances.mts
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "src/lib/symbol-advances.ts")

const OFFICE = "/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts/"
const SYSTEM = "/System/Library/Fonts/Supplemental/"

interface FaceFile {
  file: string
  family: string
  subfamily: string
}

const FACES = {
  georgia: { file: `${SYSTEM}Georgia.ttf`, family: "Georgia", subfamily: "Regular" },
  georgiaBold: { file: `${SYSTEM}Georgia Bold.ttf`, family: "Georgia", subfamily: "Bold" },
  yahei: { file: `${OFFICE}msyh.ttc`, family: "Microsoft YaHei", subfamily: "Regular" },
  yaheiBold: { file: `${OFFICE}msyhbd.ttc`, family: "Microsoft YaHei", subfamily: "Bold" },
  simsun: { file: `${OFFICE}Simsun.ttc`, family: "SimSun", subfamily: "Regular" },
  kaiti: { file: `${OFFICE}Kaiti.ttf`, family: "KaiTi", subfamily: "Regular" },
  times: { file: `${OFFICE}times.ttf`, family: "Times New Roman", subfamily: "Regular" },
  timesBold: { file: `${OFFICE}timesbd.ttf`, family: "Times New Roman", subfamily: "Bold" },
} as const satisfies Record<string, FaceFile>

type FaceName = keyof typeof FACES

/** The code points covered: Latin-1, the punctuation and symbols decks use, and CJK punctuation. */
const RANGES: readonly (readonly [number, number])[] = [
  [0x00a0, 0x00ff],
  [0x2010, 0x2027],
  [0x2030, 0x203b],
  [0x20ac, 0x20ac],
  [0x2103, 0x2103],
  [0x2116, 0x2116],
  [0x2122, 0x2122],
  [0x2190, 0x2193],
  [0x2212, 0x2212],
  [0x221e, 0x221e],
  [0x2248, 0x2248],
  [0x2260, 0x2260],
  [0x2264, 0x2265],
  [0x25a0, 0x25a1],
  [0x25b2, 0x25b2],
  [0x25bc, 0x25bc],
  [0x25cb, 0x25cb],
  [0x25cf, 0x25cf],
  [0x2605, 0x2606],
  [0x3000, 0x3011],
  [0x3014, 0x301f],
  [0xff01, 0xff5e],
  [0xffe0, 0xffe6],
]

/** Advance widths in em for the BMP code points a face maps, read from `cmap` (3,1) format 4 and `hmtx`. */
function readFace(face: FaceFile): (cp: number) => number | undefined {
  const b = readFileSync(face.file)
  const base = b.toString("latin1", 0, 4) === "ttcf" ? b.readUInt32BE(12) : 0
  const tables = new Map<string, number>()
  for (let i = 0; i < b.readUInt16BE(base + 4); i++) {
    const o = base + 12 + 16 * i
    tables.set(b.toString("latin1", o, o + 4), b.readUInt32BE(o + 8))
  }
  const at = (tag: string): number => {
    const off = tables.get(tag)
    if (off === undefined) throw new Error(`${face.file}: no ${tag} table`)
    return off
  }

  const names = new Map<number, string>()
  const name = at("name")
  const strings = name + b.readUInt16BE(name + 4)
  for (let i = 0; i < b.readUInt16BE(name + 2); i++) {
    const r = name + 6 + 12 * i
    if (b.readUInt16BE(r) !== 3 || b.readUInt16BE(r + 4) !== 0x409) continue
    const raw = b.subarray(strings + b.readUInt16BE(r + 10), strings + b.readUInt16BE(r + 10) + b.readUInt16BE(r + 8))
    let s = ""
    for (let k = 0; k + 1 < raw.length; k += 2) s += String.fromCharCode(raw.readUInt16BE(k))
    names.set(b.readUInt16BE(r + 6), s)
  }
  if (names.get(1) !== face.family || names.get(2) !== face.subfamily) {
    throw new Error(`${face.file}: expected ${face.family} ${face.subfamily}, found ${names.get(1)} ${names.get(2)}`)
  }

  const upem = b.readUInt16BE(at("head") + 18)
  const metrics = b.readUInt16BE(at("hhea") + 34)
  const hmtx = at("hmtx")
  const cmap = at("cmap")
  let sub = -1
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
    const r = cmap + 4 + 8 * i
    if (b.readUInt16BE(r) === 3 && b.readUInt16BE(r + 2) === 1) sub = cmap + b.readUInt32BE(r + 4)
  }
  if (sub < 0 || b.readUInt16BE(sub) !== 4) throw new Error(`${face.file}: no (3,1) format 4 cmap`)
  const segX2 = b.readUInt16BE(sub + 6)
  const ends = sub + 14
  const starts = ends + segX2 + 2
  const deltas = starts + segX2
  const offsets = deltas + segX2
  const glyph = (cp: number): number => {
    for (let i = 0; i < segX2 / 2; i++) {
      if (cp > b.readUInt16BE(ends + 2 * i)) continue
      const start = b.readUInt16BE(starts + 2 * i)
      if (cp < start) return 0
      const delta = b.readInt16BE(deltas + 2 * i)
      const ro = b.readUInt16BE(offsets + 2 * i)
      if (ro === 0) return (cp + delta) & 0xffff
      const g = b.readUInt16BE(offsets + 2 * i + ro + 2 * (cp - start))
      return g === 0 ? 0 : (g + delta) & 0xffff
    }
    return 0
  }
  return (cp) => {
    const g = glyph(cp)
    return g === 0 ? undefined : b.readUInt16BE(hmtx + 4 * Math.min(g, metrics - 1)) / upem
  }
}

const advance = Object.fromEntries(
  Object.entries(FACES).map(([key, face]) => [key, readFace(face)]),
) as Record<FaceName, (cp: number) => number | undefined>

/** Rounded up, so a stored bound is never below the width it came from. */
const ceil4 = (n: number): number => Math.ceil(n * 10000 - 1e-6) / 10000

/**
 * The widest of `primary` that carry the code point, or when none does, the
 * widest of `substitutes` that do.
 */
function bound(cp: number, primary: readonly FaceName[], substitutes: readonly FaceName[]): number | undefined {
  const widest = (faces: readonly FaceName[]) => {
    const found = faces.map((f) => advance[f](cp)).filter((w): w is number => w !== undefined)
    return found.length ? Math.max(...found) : undefined
  }
  const w = widest(primary) ?? widest(substitutes)
  return w === undefined ? undefined : ceil4(w)
}

/**
 * The substitutes a code point no primary face carries is bounded by. Times
 * New Roman joined the measured faces after the first four keys were
 * written, and stays out of their substitutes so their bounds are the ones
 * they always were.
 */
const ALL: readonly FaceName[] = ["georgia", "georgiaBold", "yahei", "yaheiBold", "simsun", "kaiti"]
const ALL_WITH_TIMES: readonly FaceName[] = [...ALL, "times", "timesBold"]
/**
 * Times New Roman sits over SimSun when memo pairs them, and over YaHei
 * (`eaFontFaceFor`) anywhere else, so its bound is the widest of the three.
 */
const TABLES = {
  georgia: { regular: ["georgia", "yahei"], bold: ["georgiaBold", "yaheiBold"] },
  yahei: { regular: ["yahei"], bold: ["yaheiBold"] },
  "simsun-kaiti": { regular: ["simsun", "kaiti"], bold: ["simsun", "kaiti"] },
  times: { regular: ["times", "yahei", "simsun"], bold: ["timesBold", "yaheiBold", "simsun"] },
} as const satisfies Record<string, Record<"regular" | "bold", readonly FaceName[]>>
const SUBSTITUTES: Record<keyof typeof TABLES, readonly FaceName[]> = {
  georgia: ALL,
  yahei: ALL,
  "simsun-kaiti": ALL,
  times: ALL_WITH_TIMES,
}

const codePoints: number[] = []
for (const [from, to] of RANGES) for (let cp = from; cp <= to; cp++) codePoints.push(cp)

const literal = (primary: readonly FaceName[], substitutes: readonly FaceName[]): string => {
  const entries: string[] = []
  for (const cp of codePoints) {
    const w = bound(cp, primary, substitutes)
    if (w !== undefined) entries.push(`${cp}:${w}`)
  }
  return `{${entries.join(",")}}`
}

const body = Object.entries(TABLES)
  .map(
    ([key, weights]) =>
      `  ${JSON.stringify(key)}: {\n    regular: ${literal(weights.regular, SUBSTITUTES[key as keyof typeof TABLES])},\n    bold: ${literal(weights.bold, SUBSTITUTES[key as keyof typeof TABLES])},\n  },`,
  )
  .join("\n")

/**
 * The marks PowerPoint paints from the run's Latin face: the middle dot, the
 * em dash, and the curly quotation marks U+2018 to U+201F.
 */
const LATIN_FACE_MARKS: readonly number[] = [0x00b7, 0x2014, ...Array.from({ length: 8 }, (_, i) => 0x2018 + i)]

/**
 * The faces behind each estimator key, for those marks: the key's own face
 * at that weight. SimSun and KaiTi share a key, so a mark counts only when
 * both carry it at the same advance, and their Bold is their Regular.
 */
const LATIN_FACE_MARK_FACES = {
  georgia: { regular: ["georgia"], bold: ["georgiaBold"] },
  yahei: { regular: ["yahei"], bold: ["yaheiBold"] },
  "simsun-kaiti": { regular: ["simsun", "kaiti"], bold: ["simsun", "kaiti"] },
  times: { regular: ["times"], bold: ["timesBold"] },
} as const satisfies Record<keyof typeof TABLES, Record<"regular" | "bold", readonly FaceName[]>>

/** The advance every one of `faces` gives the code point, or `undefined` when one lacks it or they differ. */
function sharedAdvance(cp: number, faces: readonly FaceName[]): number | undefined {
  const found = faces.map((f) => advance[f](cp))
  const first = found[0]
  if (first === undefined || found.some((w) => w !== first)) return undefined
  return Math.round(first * 10000) / 10000
}

const markLiteral = (faces: readonly FaceName[]): string => {
  const entries: string[] = []
  for (const cp of LATIN_FACE_MARKS) {
    const w = sharedAdvance(cp, faces)
    if (w !== undefined) entries.push(`${cp}:${w}`)
  }
  return `{${entries.join(",")}}`
}

const markBody = Object.entries(LATIN_FACE_MARK_FACES)
  .map(([key, weights]) => `  ${JSON.stringify(key)}: {\n    regular: ${markLiteral(weights.regular)},\n    bold: ${markLiteral(weights.bold)},\n  },`)
  .join("\n")

writeFileSync(
  OUT,
  `// Generated by scripts/gen-symbol-advances.mts. Do not edit by hand.
//
// Upper bounds, in em, on the advance of each covered non-ASCII code point in
// the faces the width estimator names, keyed by \`charCodeAt(0)\`. See the
// generator for which faces each bound is the widest of, and why.

export const SYMBOL_ADVANCE_BOUNDS: Readonly<
  Record<"georgia" | "yahei" | "simsun-kaiti" | "times", Readonly<Record<"regular" | "bold", Readonly<Record<number, number>>>>>
> = {
${body}
}

// The advance, in em, of the middle dot, the em dash and each curly
// quotation mark in the face itself, keyed by \`charCodeAt(0)\`. PowerPoint
// paints these from the run's Latin face, so this is their width, not a
// bound. A mark the face lacks is left out.

export const LATIN_FACE_MARK_ADVANCES: Readonly<
  Record<"georgia" | "yahei" | "simsun-kaiti" | "times", Readonly<Record<"regular" | "bold", Readonly<Record<number, number>>>>>
> = {
${markBody}
}
`,
)
console.log(`wrote ${codePoints.length} code points x ${Object.keys(TABLES).length} faces to ${path.relative(ROOT, OUT)}`)
