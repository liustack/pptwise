/**
 * The part of npm's semver range grammar a pack's `engine` field uses,
 * read the way `semver.satisfies` reads it with default options: `||`
 * unions, space-joined comparators, `<`, `<=`, `>`, `>=`, `=`, bare and
 * partial versions, `x`/`X`/`*` wildcards, `~`, `^`, and hyphen ranges.
 * A prerelease version satisfies a set only when one of that set's
 * comparators names a prerelease on the same major.minor.patch.
 *
 * Written here rather than taken as a dependency because this is the one
 * question the CLI asks of a range. Anything the grammar does not cover
 * (loose mode, `includePrerelease`) is not accepted: an unreadable range
 * throws, and the caller treats that pack as one this engine cannot take.
 */

interface SemVer {
  major: number
  minor: number
  patch: number
  prerelease: (string | number)[]
}

type Op = "<" | "<=" | ">" | ">=" | "="

/** `undefined` is the always-true comparator (`*`). */
type Comparator = { op: Op; version: SemVer } | undefined

const NUM = "0|[1-9]\\d*"
const PRE_ID = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)"
const PRERELEASE = `${PRE_ID}(?:\\.${PRE_ID})*`
const BUILD = "[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*"

const FULL_VERSION = new RegExp(`^v?(${NUM})\\.(${NUM})\\.(${NUM})(?:-(${PRERELEASE}))?(?:\\+${BUILD})?$`)
const X = `${NUM}|x|X|\\*`
const PARTIAL = new RegExp(`^[v=]*(${X})(?:\\.(${X})(?:\\.(${X})(?:-(${PRERELEASE}))?(?:\\+${BUILD})?)?)?$`)
const OPERATOR = /^(<=|>=|<|>|=)?(.*)$/

function invalidRange(range: string): Error {
  return new Error(`invalid semver range "${range}"`)
}

function parsePrerelease(raw: string | undefined): (string | number)[] {
  if (raw === undefined) return []
  return raw.split(".").map((id) => (/^\d+$/.test(id) ? Number(id) : id))
}

function parseVersion(version: string): SemVer {
  const m = FULL_VERSION.exec(version.trim())
  if (m === null) throw new Error(`invalid version "${version}"`)
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: parsePrerelease(m[4]) }
}

function compareIds(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1
  if (typeof a === "number") return -1
  if (typeof b === "number") return 1
  return a === b ? 0 : a < b ? -1 : 1
}

function compare(a: SemVer, b: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length === 0 ? 1 : -1
  }
  for (let i = 0; ; i++) {
    const x = a.prerelease[i]
    const y = b.prerelease[i]
    if (x === undefined && y === undefined) return 0
    if (x === undefined) return -1
    if (y === undefined) return 1
    const c = compareIds(x, y)
    if (c !== 0) return c
  }
}

/** A partial version: `undefined` is a wildcard position. */
interface Partial {
  major?: number
  minor?: number
  patch?: number
  prerelease: (string | number)[]
}

function parsePartial(raw: string, range: string): Partial {
  const m = PARTIAL.exec(raw)
  if (m === null) throw invalidRange(range)
  const num = (s: string | undefined) => (s === undefined || /^[xX*]$/.test(s) ? undefined : Number(s))
  const major = num(m[1])
  const minor = major === undefined ? undefined : num(m[2])
  const patch = minor === undefined ? undefined : num(m[3])
  return { major, minor, patch, prerelease: patch === undefined ? [] : parsePrerelease(m[4]) }
}

function v(major: number, minor: number, patch: number, prerelease: (string | number)[] = []): SemVer {
  return { major, minor, patch, prerelease }
}

/** The `-0` floor npm puts on an exclusive upper bound, so `<2.0.0-0`
 *  keeps every 2.0.0 prerelease out. */
function below(major: number, minor: number, patch: number): Comparator {
  return { op: "<", version: v(major, minor, patch, [0]) }
}

const NOTHING: Comparator = below(0, 0, 0)

function primitive(op: Op, p: Partial): Comparator[] {
  const { major, minor, patch } = p
  if (major === undefined) return op === "<" || op === ">" ? [NOTHING] : [undefined]
  if (minor !== undefined && patch !== undefined) return [{ op, version: v(major, minor, patch, p.prerelease) }]
  if (op === "=") return xRange(p)
  if (op === ">") return [{ op: ">=", version: minor === undefined ? v(major + 1, 0, 0) : v(major, minor + 1, 0) }]
  if (op === ">=") return [{ op: ">=", version: v(major, minor ?? 0, 0) }]
  if (op === "<") return [below(major, minor ?? 0, 0)]
  // "<="
  return [minor === undefined ? below(major + 1, 0, 0) : below(major, minor + 1, 0)]
}

function xRange(p: Partial): Comparator[] {
  const { major, minor, patch } = p
  if (major === undefined) return [undefined]
  if (minor === undefined) return [{ op: ">=", version: v(major, 0, 0) }, below(major + 1, 0, 0)]
  if (patch === undefined) return [{ op: ">=", version: v(major, minor, 0) }, below(major, minor + 1, 0)]
  return [{ op: "=", version: v(major, minor, patch, p.prerelease) }]
}

function tilde(p: Partial): Comparator[] {
  const { major, minor, patch } = p
  if (major === undefined) return [undefined]
  if (minor === undefined) return xRange(p)
  if (patch === undefined) return xRange(p)
  return [{ op: ">=", version: v(major, minor, patch, p.prerelease) }, below(major, minor + 1, 0)]
}

function caret(p: Partial): Comparator[] {
  const { major, minor, patch } = p
  if (major === undefined) return [undefined]
  if (minor === undefined) return xRange(p)
  if (patch === undefined) {
    return [{ op: ">=", version: v(major, minor, 0) }, major === 0 ? below(0, minor + 1, 0) : below(major + 1, 0, 0)]
  }
  const floor: Comparator = { op: ">=", version: v(major, minor, patch, p.prerelease) }
  if (major !== 0) return [floor, below(major + 1, 0, 0)]
  if (minor !== 0) return [floor, below(0, minor + 1, 0)]
  return [floor, below(0, 0, patch + 1)]
}

function hyphen(fromRaw: string, toRaw: string, range: string): Comparator[] {
  const from = parsePartial(fromRaw, range)
  const to = parsePartial(toRaw, range)
  const out: Comparator[] = []
  if (from.major !== undefined) {
    out.push({ op: ">=", version: v(from.major, from.minor ?? 0, from.patch ?? 0, from.prerelease) })
  }
  if (to.major !== undefined) {
    if (to.minor === undefined) out.push(below(to.major + 1, 0, 0))
    else if (to.patch === undefined) out.push(below(to.major, to.minor + 1, 0))
    else out.push({ op: "<=", version: v(to.major, to.minor, to.patch, to.prerelease) })
  }
  return out.length === 0 ? [undefined] : out
}

function simple(token: string, range: string): Comparator[] {
  if (token.startsWith("~>")) return tilde(parsePartial(token.slice(2), range))
  if (token.startsWith("~")) return tilde(parsePartial(token.slice(1), range))
  if (token.startsWith("^")) return caret(parsePartial(token.slice(1), range))
  const [, op, rest] = OPERATOR.exec(token)!
  const partial = parsePartial(rest!, range)
  return op === undefined ? xRange(partial) : primitive(op as Op, partial)
}

const HYPHEN = /^(\S+)\s+-\s+(\S+)$/

function parseSet(raw: string, range: string): Comparator[] {
  const set = raw.trim()
  if (set === "") return [undefined]
  const h = HYPHEN.exec(set)
  if (h !== null) return hyphen(h[1]!, h[2]!, range)
  // `>= 1.2.3`, `~ 1.2.3`, `^ 1.2.3`: an operator may stand apart from its version.
  const joined = set.replace(/(<=|>=|<|>|=|~>|~|\^)\s+/g, "$1")
  return joined.split(/\s+/).flatMap((token) => simple(token, range))
}

function parseRange(range: string): Comparator[][] {
  return range.split("||").map((set) => parseSet(set, range))
}

function test(c: Comparator, version: SemVer): boolean {
  if (c === undefined) return true
  const cmp = compare(version, c.version)
  switch (c.op) {
    case "=":
      return cmp === 0
    case "<":
      return cmp < 0
    case "<=":
      return cmp <= 0
    case ">":
      return cmp > 0
    case ">=":
      return cmp >= 0
  }
}

function testSet(set: Comparator[], version: SemVer): boolean {
  if (!set.every((c) => test(c, version))) return false
  if (version.prerelease.length === 0) return true
  return set.some(
    (c) =>
      c !== undefined &&
      c.version.prerelease.length > 0 &&
      c.version.major === version.major &&
      c.version.minor === version.minor &&
      c.version.patch === version.patch,
  )
}

/** Whether `version` falls in `range`. Throws on a range or version that
 *  does not parse. */
export function satisfiesRange(version: string, range: string): boolean {
  const parsed = parseVersion(version)
  return parseRange(range).some((set) => testSet(set, parsed))
}
