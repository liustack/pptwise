import { dirname, join, resolve } from "node:path"
import { THEME_ID_CONSTRAINT, THEME_ID_PATTERN } from "@/ir"
import { PptwiseError } from "../errors"
import { parseBrandThemeFile } from "../themes/brand-theme-file"
import { getThemeDefinition, installThemeFile, type ThemeDefinition } from "../themes/definitions"
import { CANONICAL_THEME_IDS } from "../themes"
import { copyThemePreset } from "../themes/presets"
import {
  ThemeFileSchema,
  type Menu,
  type ThemeFile,
} from "../themes/schema"
import { THEME_FILENAME, pathExists } from "./deck-dir"
import { loadIrFile } from "./load-ir"

export const WORKSPACE_THEMES_DIRNAME = "themes"

export type ResolvedTheme =
  | { kind: "file"; id: string; path: string; file: ThemeFile }
  | { kind: "builtin"; id: string }

function sortKeysDeep(value: unknown): unknown {
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

export function assertThemeId(id: string): void {
  if (!THEME_ID_PATTERN.test(id)) {
    throw new PptwiseError(`invalid theme id "${id}". ${THEME_ID_CONSTRAINT}`)
  }
}

/** Read, parse, and register a theme file. The previous registration of the
 *  same id is replaced only after every gate passes. */
export async function loadThemeFile(path: string): Promise<ThemeFile> {
  const file = await readThemeFile(path)
  installThemeFile(file)
  return file
}

async function readThemeFile(path: string): Promise<ThemeFile> {
  const raw = await loadIrFile(path, "theme")
  return parseBrandThemeFile(raw, path)
}

function isCanonicalThemeId(name: string): boolean {
  return (CANONICAL_THEME_IDS as readonly string[]).includes(name)
}

export function menuForThemeId(id: string): Menu {
  const def = getThemeDefinition(id)
  return def.menu
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
    menu: copy.menu,
  }
  return ThemeFileSchema.parse(file) as ThemeFile
}

async function tryParseThemeFile(path: string): Promise<ThemeFile | undefined> {
  const raw = await loadIrFile(path, "theme")
  const parsed = ThemeFileSchema.safeParse(raw)
  return parsed.success ? (parsed.data as ThemeFile) : undefined
}

async function acceptThemeFile(path: string, file: ThemeFile): Promise<ResolvedTheme> {
  installThemeFile(file)
  return { kind: "file", id: file.id, path, file }
}

async function acceptIfNameMatches(
  path: string,
  name: string,
  file: ThemeFile,
): Promise<ResolvedTheme | undefined> {
  if (file.id !== name) return undefined
  return acceptThemeFile(path, file)
}

async function resolveDeckThemeFile(
  deckDir: string,
  name: string,
): Promise<ResolvedTheme | undefined> {
  const boundPath = join(deckDir, THEME_FILENAME)
  if (await pathExists(boundPath)) {
    const file = await readThemeFile(boundPath)
    const hit = await acceptIfNameMatches(boundPath, name, file)
    if (hit !== undefined) return hit
  }

  const namedTheme = join(deckDir, `${name}.theme.json`)
  if (await pathExists(namedTheme)) {
    const file = await readThemeFile(namedTheme)
    const hit = await acceptIfNameMatches(namedTheme, name, file)
    if (hit !== undefined) return hit
  }

  const namedJson = join(deckDir, `${name}.json`)
  if (await pathExists(namedJson)) {
    const file = await tryParseThemeFile(namedJson)
    if (file !== undefined) {
      const hit = await acceptIfNameMatches(namedJson, name, file)
      if (hit !== undefined) return hit
    }
  }

  return undefined
}

async function resolveWorkspaceThemeFile(
  startDir: string,
  name: string,
): Promise<ResolvedTheme | undefined> {
  let dir = resolve(startDir)
  for (;;) {
    const candidates = [
      join(dir, WORKSPACE_THEMES_DIRNAME, `${name}.theme.json`),
      join(dir, WORKSPACE_THEMES_DIRNAME, `${name}.json`),
      join(dir, WORKSPACE_THEMES_DIRNAME, name, THEME_FILENAME),
    ]
    for (const candidate of candidates) {
      if (!(await pathExists(candidate))) continue
      const isLooseJson = candidate.endsWith(`${name}.json`) && !candidate.endsWith(`${name}.theme.json`)
      if (isLooseJson) {
        const file = await tryParseThemeFile(candidate)
        if (file !== undefined) {
          const hit = await acceptIfNameMatches(candidate, name, file)
          if (hit !== undefined) return hit
        }
        continue
      }
      const file = await readThemeFile(candidate)
      const hit = await acceptIfNameMatches(candidate, name, file)
      if (hit !== undefined) return hit
    }
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

export async function resolveThemeByName(
  name: string,
  opts: { startDir: string; deckDir?: string },
): Promise<ResolvedTheme> {
  assertThemeId(name)
  if (opts.deckDir !== undefined) {
    const deckHit = await resolveDeckThemeFile(opts.deckDir, name)
    if (deckHit !== undefined) return deckHit
  }

  const workspaceHit = await resolveWorkspaceThemeFile(opts.startDir, name)
  if (workspaceHit !== undefined) return workspaceHit

  if (isCanonicalThemeId(name)) return { kind: "builtin", id: name }

  const places = [
    opts.deckDir !== undefined ? `deck directory ${opts.deckDir}` : undefined,
    `workspace ${WORKSPACE_THEMES_DIRNAME}/ walking up from ${resolve(opts.startDir)}`,
    "built-in presets",
  ].filter((place): place is string => place !== undefined)
  throw new PptwiseError(`unknown theme "${name}". Searched ${places.join(", ")}.`)
}

const REBIND_SUFFIX =
  "A same-menu color fork is allowed. A different menu is a new theme. Start over from the theme layer (keep intent, narrative, and harvested materials, rewrite the spec)."

export async function assertThemeRebind(deckDir: string | undefined, resolved: ResolvedTheme): Promise<void> {
  if (deckDir === undefined) return
  const boundPath = resolve(join(deckDir, THEME_FILENAME))
  if (!(await pathExists(boundPath))) return
  if (resolved.kind === "file" && resolve(resolved.path) === boundPath) return

  const bound = parseBrandThemeFile(await loadIrFile(boundPath, "theme"), boundPath)
  const nextId = resolved.id
  const nextMenu = resolved.kind === "file" ? resolved.file.menu : menuForThemeId(resolved.id)
  if (menusEqual(bound.menu, nextMenu)) return
  throw new PptwiseError(`cannot rebind theme "${bound.id}" to "${nextId}": menus differ. ${REBIND_SUFFIX}`)
}

/** Resolve and register the requested theme through the ordinary lookup
 * route. A missing authored name wins before any adjacent theme file is
 * read. A deck-local theme.json is installed only when its id matches the
 * requested name. */
export async function registerThemeSelection(
  name: string | undefined,
  opts: { startDir: string; deckDir?: string },
): Promise<ResolvedTheme | undefined> {
  if (name === undefined || name.length === 0) return undefined
  return resolveThemeByName(name, opts)
}

export function themeNameFromUnknown(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const theme = (raw as { theme?: unknown }).theme
  return typeof theme === "string" ? theme : undefined
}
