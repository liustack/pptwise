/**
 * Everything a build reads to decide which theme it draws with, read once
 * and kept as one record. Three reads, in the order a build makes them:
 * the target's own source (the spec of a deck project, the bare IR file)
 * for the name it binds (`spec.theme`, `theme.id`), where that name
 * resolves to (`resolveThemeByName`, `./theme-resolve.ts`), and the deck's
 * own `theme.json` when the rebind guard would read it. Every step that
 * fails is recorded in place of its answer rather than thrown, so a record
 * exists whatever happened, and `key` folds the whole record into one
 * string: two builds with equal keys read the same theme inputs.
 *
 * The build pipeline (`renderDeckSlides`, `./commands.ts`) collects this
 * record first and carries it on its result and on every failure it
 * raises (`DeckBuildError`), passing the parsed source on to assembly and
 * the resolved definition down instead of reading the source or looking
 * the theme up again at each step. `pptwise serve`
 * (`./serve.ts`) keeps the last build's key and, every few seconds,
 * collects the same record again and compares keys: any difference, a
 * theme file rewritten, a lookup that starts or stops failing, a rebind
 * guard's input changed under a symlink, is a rebuild, and a difference
 * that is not there is not, so a file that stays broken is built once.
 */
import { createHash } from "node:crypto"
import { dirname, join, resolve } from "node:path"
import type { ThemeFile } from "../themes/schema"
import { pathExists, readSpecFile, SPEC_FILENAME, THEME_FILENAME } from "./deck-dir"
import { loadIrFile } from "./load-ir"
import {
  type ResolvedTheme,
  assertThemeRebind,
  readThemeFile,
  resolveThemeByName,
  sortKeysDeep,
  themeNameFromUnknown,
} from "./theme-resolve"

/** The target a build resolved, as `loadDeckTarget` (`./commands.ts`)
 *  resolves it: the deck project directory or the bare IR file. */
export interface ThemeInputsTarget {
  /** Where the workspace lookup starts: the working directory. */
  startDir: string
  resolvedTarget: string
  isDir: boolean
}

/** The target's own file as a record read it, parsed: the spec of a deck
 *  project or the bare IR. Assembly and validation take this object, so a
 *  build binds the name this record holds and no other. */
export interface SourceRead {
  kind: "spec" | "ir"
  path: string
  parsed: unknown
}

export interface ThemeInputs {
  /** The source the name was read off, or `undefined` when the read
   *  failed (`bound` holds the error) or the record started from a name
   *  already in hand ({@link resolveThemeInputs}). */
  source: SourceRead | undefined
  /** The name the target binds, `undefined` when it names none, or the
   *  error reading the target. */
  bound: { name: string | undefined } | { error: unknown }
  /** Where the name resolved to, or the error the lookup raised.
   *  `undefined` when there was no name to look up. */
  resolved: ResolvedTheme | { error: unknown } | undefined
  /** The deck's own `theme.json` as the rebind guard reads it: its parsed
   *  content, or the error reading it. `undefined` when the guard has
   *  nothing to read: no such file, the resolved theme is that very file,
   *  or the lookup never succeeded. */
  localTheme: { path: string; file: ThemeFile } | { path: string; error: unknown } | undefined
  /** The whole record as one string. Equal keys mean a build reads the
   *  same theme inputs; see {@link themeInputsKey} for the shape. */
  key: string
}

export async function collectThemeInputs(target: ThemeInputsTarget): Promise<ThemeInputs> {
  const deckDir = target.isDir ? target.resolvedTarget : dirname(target.resolvedTarget)
  let source: SourceRead
  try {
    source = await readSource(target)
  } catch (e) {
    return withKey({ source: undefined, bound: { error: e }, resolved: undefined, localTheme: undefined })
  }
  const name = source.kind === "spec" ? themeNameFromUnknown(source.parsed) : irThemeIdOf(source.parsed)
  return resolveThemeInputs({ name }, { startDir: target.startDir, deckDir }, source)
}

/** The record of a build that failed before it could read any of its
 *  theme inputs: a target that could not be located, a config that could
 *  not be read. The failure stands in for the name. */
export function unreadThemeInputs(error: unknown): ThemeInputs {
  return withKey({ source: undefined, bound: { error }, resolved: undefined, localTheme: undefined })
}

/**
 * The lookup and guard reads for a name already in hand. `collectThemeInputs`
 * is this after reading the name off the target; a caller holding the raw
 * IR itself (`applyDeckConfig`'s tests) starts here.
 */
export async function resolveThemeInputs(
  bound: ThemeInputs["bound"],
  opts: { startDir: string; deckDir: string },
  source?: SourceRead,
): Promise<ThemeInputs> {
  if ("error" in bound || bound.name === undefined) {
    return withKey({ source, bound, resolved: undefined, localTheme: undefined })
  }
  let resolved: ResolvedTheme
  try {
    resolved = await resolveThemeByName(bound.name, opts)
  } catch (e) {
    return withKey({ source, bound, resolved: { error: e }, localTheme: undefined })
  }
  return withKey({ source, bound, resolved, localTheme: await readLocalTheme(opts.deckDir, resolved) })
}

/**
 * The source a build assembles or validates: the object the record read
 * the name off, never a second read of the file, so what the build binds
 * is what the record says it bound. A read that failed is thrown as the
 * build's own failure, the way {@link themeFromInputs} throws a lookup
 * that failed. A record without a source was built from a name in hand
 * and has nothing to assemble: that is a caller's mistake, not a state a
 * build can be in.
 */
export function sourceFromInputs(inputs: ThemeInputs): SourceRead {
  if ("error" in inputs.bound) throw inputs.bound.error
  if (inputs.source === undefined) throw new Error("theme inputs were collected without their source")
  return inputs.source
}

/**
 * The theme a build proceeds with: the resolved theme, `undefined` when
 * the target binds none, or the error the record holds thrown as the
 * build's own failure, so a build fails the way its record says it read.
 */
export function themeFromInputs(inputs: ThemeInputs): ResolvedTheme | undefined {
  if ("error" in inputs.bound) throw inputs.bound.error
  if (inputs.resolved === undefined) return undefined
  if ("error" in inputs.resolved) throw inputs.resolved.error
  return inputs.resolved
}

/** The name the record holds, when it holds one. */
export function boundThemeName(inputs: ThemeInputs): string | undefined {
  return "name" in inputs.bound ? inputs.bound.name : undefined
}

/** The rebind guard (`assertThemeRebind`, `./theme-resolve.ts`) on the
 *  record's own read of the deck-local `theme.json`: a file the record
 *  could not read is the guard's failure, since the guard cannot say
 *  either way without it. */
export function guardThemeRebind(local: ThemeInputs["localTheme"], resolved: ResolvedTheme): void {
  if (local !== undefined && "error" in local) throw local.error
  assertThemeRebind(local?.file, resolved)
}

/** The guard for a caller holding a resolved theme and a deck directory
 *  rather than a record (the bench's own placement mirror): reads what
 *  the record would read, then checks. */
export async function checkThemeRebind(deckDir: string, resolved: ResolvedTheme): Promise<void> {
  guardThemeRebind(await readLocalTheme(deckDir, resolved), resolved)
}

async function readSource(target: ThemeInputsTarget): Promise<SourceRead> {
  if (target.isDir) {
    return { kind: "spec", path: join(target.resolvedTarget, SPEC_FILENAME), parsed: await readSpecFile(target.resolvedTarget) }
  }
  return { kind: "ir", path: target.resolvedTarget, parsed: await loadIrFile(target.resolvedTarget) }
}

/** `theme.id` off a raw IR, the authored selection a bare target carries.
 *  Anything else is left for `validateIr` to report. */
function irThemeIdOf(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const theme = (raw as { theme?: unknown }).theme
  if (typeof theme !== "object" || theme === null) return undefined
  const id = (theme as { id?: unknown }).id
  return typeof id === "string" ? id : undefined
}

/** What the rebind guard reads: the deck's own `theme.json`, unless there
 *  is none or the resolved theme is that file itself. */
async function readLocalTheme(deckDir: string, resolved: ResolvedTheme): Promise<ThemeInputs["localTheme"]> {
  const path = resolve(join(deckDir, THEME_FILENAME))
  if (resolved.kind === "file" && resolve(resolved.path) === path) return undefined
  try {
    if (!(await pathExists(path))) return undefined
    return { path, file: await readThemeFile(path) }
  } catch (e) {
    return { path, error: e }
  }
}

function withKey(inputs: Omit<ThemeInputs, "key">): ThemeInputs {
  return { ...inputs, key: themeInputsKey(inputs) }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** A digest over a file's parsed content with its keys in a fixed order:
 *  what the page is drawn from, never the file's path, timestamp, or
 *  size. A rewrite that keeps the metadata, an atomic replace, and a
 *  symlink pointed elsewhere all change it; a whitespace-only save does
 *  not. */
function contentDigest(parsed: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortKeysDeep(parsed)) ?? "").digest("hex")
}

/**
 * `source:error:<message>` when the target could not be read. Otherwise
 * the source's own digest when the record holds one (`source:spec:<sha256>`
 * or `source:ir:<sha256>`), then `bound:none` when it binds no theme, or
 * `bound:<name>` followed by the lookup (`theme:builtin:<id>`,
 * `theme:file:<sha256>`, or `theme:error:<message>`) and, after a lookup
 * that succeeded, the guard's read (`local:none`, `local:file:<sha256>`,
 * or `local:error:<message>`), joined with `|`. The source digest is what
 * makes a rebind and back between two checks a difference: the build's
 * record carries the binding it read, and a source edited back is not it.
 */
export function themeInputsKey(inputs: Omit<ThemeInputs, "key">): string {
  const { source, bound, resolved, localTheme } = inputs
  if ("error" in bound) return `source:error:${messageOf(bound.error)}`
  const parts: string[] = []
  if (source !== undefined) parts.push(`source:${source.kind}:${contentDigest(source.parsed)}`)
  if (bound.name === undefined) {
    parts.push("bound:none")
    return parts.join("|")
  }
  parts.push(`bound:${bound.name}`)
  if (resolved === undefined) return parts.join("|")
  if ("error" in resolved) {
    parts.push(`theme:error:${messageOf(resolved.error)}`)
    return parts.join("|")
  }
  parts.push(resolved.kind === "builtin" ? `theme:builtin:${resolved.id}` : `theme:file:${contentDigest(resolved.file)}`)
  if (localTheme === undefined) parts.push("local:none")
  else if ("error" in localTheme) parts.push(`local:error:${messageOf(localTheme.error)}`)
  else parts.push(`local:file:${contentDigest(localTheme.file)}`)
  return parts.join("|")
}
