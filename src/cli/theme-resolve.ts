import { dirname, join, resolve } from "node:path"
import { THEME_ID_CONSTRAINT, THEME_ID_PATTERN } from "@/ir"
import { PptwiseError } from "../errors"
import { parseBrandThemeFile } from "../themes/brand-theme-file"
import { compileThemeDefinition, THEME_DEFINITIONS, type ThemeDefinition } from "../themes/definitions"
import { CANONICAL_THEME_IDS, type CanonicalThemeId } from "../themes"
import { copyThemePreset } from "../themes/presets"
import { assertNotRetiredThemeId } from "../themes/retired-ids"
import {
  ThemeFileSchema,
  type Menu,
  type ThemeFile,
} from "../themes/schema"
import { THEME_FILENAME, pathExists } from "./deck-dir"
import { loadIrFile } from "./load-ir"
import { listInstalledPacks, packsRoot } from "./packs/store"

export const WORKSPACE_THEMES_DIRNAME = "themes"

/**
 * The outcome of a name lookup. `definition` is the compiled theme the
 * caller passes down the render chain as the `theme` option of `validateIr`,
 * `renderSlideSvg`, `generatePptx`, `auditDeck`, and `buildAssetBrief`. A
 * built-in carries its factory definition. A file carries the definition
 * compiled from that file, owned by this call alone. A file found in an
 * installed content pack also names that pack.
 */
export type ResolvedTheme =
  | {
      kind: "file"
      id: string
      path: string
      file: ThemeFile
      definition: ThemeDefinition
      pack?: { id: string; version: string }
    }
  | { kind: "builtin"; id: string; definition: ThemeDefinition }

/** The same JSON for the same data whatever order the keys were written
 *  in. Arrays keep their order: a menu entry list or a font stack is
 *  ordered data. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

export function menusEqual(a: Menu, b: Menu): boolean {
  return JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b))
}

/**
 * The CLI's own theme-id gate: shape first, then the retired names. Every
 * command that writes or looks up a theme by name runs it, and
 * `resolveThemeByName` runs it before it searches a directory, so a
 * `consulting.theme.json` a workspace kept cannot answer to the old name.
 */
export function assertThemeId(id: string): void {
  if (!THEME_ID_PATTERN.test(id)) {
    throw new PptwiseError(`invalid theme id "${id}". ${THEME_ID_CONSTRAINT}`)
  }
  assertNotRetiredThemeId(id)
}

/** A theme file read strictly: a malformed file is an error. */
export async function readThemeFile(path: string): Promise<ThemeFile> {
  const raw = await loadIrFile(path, "theme")
  return parseBrandThemeFile(raw, path)
}

function isCanonicalThemeId(name: string): name is CanonicalThemeId {
  return (CANONICAL_THEME_IDS as readonly string[]).includes(name)
}

function publicStyle(style: ThemeDefinition["style"], id: string): ThemeFile["style"] {
  const colors = { ...style.colors }
  const fonts: ThemeFile["style"]["fonts"] = {
    heading: [...style.fonts.heading],
    body: [...style.fonts.body],
  }
  if (style.fonts.mono !== undefined) fonts.mono = [...style.fonts.mono]
  const out: ThemeFile["style"] = {
    id,
    colors,
    fonts,
    defaultBackgrounds: structuredClone(style.defaultBackgrounds),
  }
  if (style.allowCustomBackground !== undefined) out.allowCustomBackground = style.allowCustomBackground
  if (style.shape !== undefined) {
    const shape: NonNullable<ThemeFile["style"]["shape"]> = {}
    if (style.shape.radius !== undefined) shape.radius = style.shape.radius
    if (style.shape.gapScale !== undefined) shape.gapScale = style.shape.gapScale
    if (style.shape.typeScale !== undefined) shape.typeScale = style.shape.typeScale
    if (Object.keys(shape).length > 0) out.shape = shape
  }
  return out
}

/** Copy a factory preset into a public v2 ThemeFile. Engine-only
 *  `style.shape.cover` is stripped. Motif is materialized per menu entry.
 *  `emphasis` is copied like the rest of the theme's identity — a `theme new
 *  --from lecture` that dropped it chalked no line under a `**marked**` run. */
export function themeFileFromPreset(
  presetId: string,
  identity: { id: string; label?: string },
): ThemeFile {
  const copy = copyThemePreset(presetId, identity.id)
  const file = {
    version: 2 as const,
    id: identity.id,
    label: identity.label ?? copy.label,
    style: publicStyle(copy.style, identity.id),
    brand: copy.brand,
    occasions: copy.occasions !== undefined ? [...copy.occasions] : undefined,
    identity: copy.identity,
    emphasis: copy.emphasis,
    story: copy.story,
    menu: copy.menu,
  }
  return ThemeFileSchema.parse(file) as ThemeFile
}

async function tryParseThemeFile(path: string): Promise<ThemeFile | undefined> {
  const raw = await loadIrFile(path, "theme")
  const parsed = ThemeFileSchema.safeParse(raw)
  return parsed.success ? (parsed.data as ThemeFile) : undefined
}

/** Compile an accepted file into the definition this lookup hands back.
 *  Every gate runs here (contrast floor, menu contract). Nothing is stored:
 *  the caller owns the result and passes it down the render chain. */
async function acceptThemeFile(path: string, file: ThemeFile): Promise<Extract<ResolvedTheme, { kind: "file" }>> {
  const definition = compileThemeDefinition(file)
  return { kind: "file", id: file.id, path, file, definition }
}

async function acceptIfNameMatches(
  path: string,
  name: string,
  file: ThemeFile,
): Promise<ResolvedTheme | undefined> {
  if (file.id !== name) return undefined
  return acceptThemeFile(path, file)
}

/**
 * One place a name lookup may find its theme file. `loose` marks the
 * `<name>.json` shape: a file there is accepted only when it already parses
 * as a complete theme file, since a plain JSON file of that name may be
 * anything. The other shapes are read strictly and a malformed file is an
 * error.
 */
export interface ThemeCandidate {
  path: string
  loose: boolean
  /** From the deck-directory level rather than a workspace `themes/`. */
  deck: boolean
  /** The directory this lookup level is anchored at: the deck directory,
   *  or the ancestor whose `themes/` the candidate sits under. */
  anchor: string
}

/** The deck-directory level of the lookup: `theme.json`, `<name>.theme.json`,
 *  and a matching complete `<name>.json`, in that order. */
export function deckThemeCandidates(deckDir: string, name: string): ThemeCandidate[] {
  return [
    { path: join(deckDir, THEME_FILENAME), loose: false, deck: true, anchor: deckDir },
    { path: join(deckDir, `${name}.theme.json`), loose: false, deck: true, anchor: deckDir },
    { path: join(deckDir, `${name}.json`), loose: true, deck: true, anchor: deckDir },
  ]
}

/** The workspace level of the lookup: every `themes/` directory from
 *  `startDir` up to the filesystem root, nearest first. */
export function workspaceThemeCandidates(startDir: string, name: string): ThemeCandidate[] {
  const out: ThemeCandidate[] = []
  let dir = resolve(startDir)
  for (;;) {
    const themesDir = join(dir, WORKSPACE_THEMES_DIRNAME)
    out.push(
      { path: join(themesDir, `${name}.theme.json`), loose: false, deck: false, anchor: dir },
      { path: join(themesDir, `${name}.json`), loose: true, deck: false, anchor: dir },
      { path: join(themesDir, name, THEME_FILENAME), loose: false, deck: false, anchor: dir },
    )
    const parent = dirname(dir)
    if (parent === dir) return out
    dir = parent
  }
}

/**
 * Every file path the deck and workspace levels of `resolveThemeByName`
 * would look at for `name`, in lookup order, whether or not it exists.
 * This is the list the resolver walks before the installed packs, and the
 * list `pptwise serve` watches, so a theme file that appears after startup
 * at any of these places is seen by both. A pack's theme files are named by
 * its manifest rather than by the theme name, so they are not on this list:
 * serve's timed re-resolution sees a pack installed or updated. `name` is
 * not validated here. Callers that take the name from user input run
 * {@link assertThemeId} first, as the resolver does.
 */
export function themeCandidates(name: string, opts: { startDir: string; deckDir?: string }): ThemeCandidate[] {
  const deck = opts.deckDir !== undefined ? deckThemeCandidates(opts.deckDir, name) : []
  return [...deck, ...workspaceThemeCandidates(opts.startDir, name)]
}

/**
 * Options every name lookup takes. There is one lookup behaviour: a
 * candidate whose existence cannot be checked (a plain file named `themes`
 * up the chain gives ENOTDIR, a directory this user cannot traverse gives
 * EACCES) fails the lookup, since a lookup that cannot say whether a file is
 * there should not quietly answer with the built-in. `pptwise serve`'s timed
 * check asks exactly this question and records the failure as its answer.
 */
export interface ThemeLookupOptions {
  startDir: string
  deckDir?: string
}

async function resolveThemeFileFrom(
  candidates: ThemeCandidate[],
  name: string,
): Promise<ResolvedTheme | undefined> {
  for (const candidate of candidates) {
    if (!(await pathExists(candidate.path))) continue
    const file = candidate.loose ? await tryParseThemeFile(candidate.path) : await readThemeFile(candidate.path)
    if (file === undefined) continue
    const hit = await acceptIfNameMatches(candidate.path, name, file)
    if (hit !== undefined) return hit
  }
  return undefined
}

/**
 * The installed-pack level: the theme with this id among the packs under
 * `$PPTWISE_HOME/packs`, or `undefined` with the pack directories that
 * were searched. A pack directory that cannot be read fails the lookup
 * (`listInstalledPacks`), and so does an id two packs both ship, which
 * `packs sync` never installs.
 */
async function resolvePackTheme(name: string): Promise<{ hit: ResolvedTheme | undefined; searched: string[] }> {
  const packs = await listInstalledPacks()
  const hits = packs.flatMap((pack) => pack.themes.filter((theme) => theme.id === name).map((theme) => ({ pack, theme })))
  if (hits.length > 1) {
    const where = hits.map(({ pack }) => pack.dir).join(" and ")
    throw new PptwiseError(`theme "${name}" is shipped by more than one installed pack (${where}). Remove one of them.`)
  }
  const found = hits[0]
  if (found === undefined) return { hit: undefined, searched: packs.map((pack) => pack.dir) }
  const file = await readThemeFile(found.theme.path)
  // The store read the id a moment ago. A file rewritten since then must
  // not answer to a name it no longer carries.
  if (file.id !== name) {
    throw new PptwiseError(`installed pack theme ${found.theme.path} no longer has id "${name}". Run \`pptwise packs sync\` to reinstall its pack.`)
  }
  const accepted = await acceptThemeFile(found.theme.path, file)
  return { hit: { ...accepted, pack: { id: found.pack.id, version: found.pack.version } }, searched: [] }
}

/**
 * Four levels, first hit wins: the deck directory, workspace `themes/`
 * walking up, the installed content packs, then the factory presets.
 */
export async function resolveThemeByName(name: string, opts: ThemeLookupOptions): Promise<ResolvedTheme> {
  assertThemeId(name)
  const fileHit = await resolveThemeFileFrom(themeCandidates(name, opts), name)
  if (fileHit !== undefined) return fileHit

  const packs = await resolvePackTheme(name)
  if (packs.hit !== undefined) return packs.hit

  if (isCanonicalThemeId(name)) return { kind: "builtin", id: name, definition: THEME_DEFINITIONS[name] }

  const places = [
    opts.deckDir !== undefined ? `deck directory ${opts.deckDir}` : undefined,
    `workspace ${WORKSPACE_THEMES_DIRNAME}/ walking up from ${resolve(opts.startDir)}`,
    packs.searched.length > 0
      ? `installed packs (${packs.searched.join(", ")})`
      : `installed packs in ${packsRoot()} (none installed)`,
    "built-in presets",
  ].filter((place): place is string => place !== undefined)
  throw new PptwiseError(`unknown theme "${name}". Searched ${places.join(", ")}.`)
}

const REBIND_SUFFIX =
  "A same-menu color fork is allowed. A different menu is a new theme. Start over from the theme layer (keep intent, narrative, and harvested materials, rewrite the spec)."

/**
 * The rebind guard: a deck whose own `theme.json` is `bound` may only be
 * drawn with a theme of the same menu. Reads nothing: `bound` is the file
 * as the theme-input record read it (`./theme-inputs.ts`, which also
 * decides when there is nothing to compare against), so the guard's
 * verdict is a function of that record alone.
 */
export function assertThemeRebind(bound: ThemeFile | undefined, resolved: ResolvedTheme): void {
  if (bound === undefined) return
  if (menusEqual(bound.menu, resolved.definition.menu)) return
  throw new PptwiseError(`cannot rebind theme "${bound.id}" to "${resolved.id}": menus differ. ${REBIND_SUFFIX}`)
}

/** Resolve the requested theme through the ordinary lookup route. A missing
 * authored name wins before any adjacent theme file is read. A deck-local
 * theme.json is accepted only when its id matches the requested name. */
export async function resolveThemeSelection(
  name: string | undefined,
  opts: ThemeLookupOptions,
): Promise<ResolvedTheme | undefined> {
  if (name === undefined || name.length === 0) return undefined
  return resolveThemeByName(name, opts)
}

export function themeNameFromUnknown(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const theme = (raw as { theme?: unknown }).theme
  return typeof theme === "string" ? theme : undefined
}
