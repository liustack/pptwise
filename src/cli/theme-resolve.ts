import { dirname, join, resolve } from "node:path"
import { PptwiseError } from "../errors"
import { KIND_VALUES } from "../ir"
import { getLayout } from "../layouts/registry"
import { parseBrandThemeFile, registerBrandThemeFile } from "../themes/brand-theme-file"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { CANONICAL_THEME_IDS } from "../themes"
import { REGISTERED_THEMES } from "../themes/registered-themes"
import {
  MenuSchema,
  ThemeFileSchema,
  type Menu,
  type MenuEntry,
  type ThemeFile,
} from "../themes/schema"
import { THEME_FILENAME, pathExists } from "./deck-dir"
import { loadIrFile } from "./load-ir"

export const WORKSPACE_THEMES_DIRNAME = "themes"

export type ResolvedTheme =
  | { kind: "file"; id: string; path: string; file: ThemeFile }
  | { kind: "builtin"; id: string }

export function menusEqual(a: Menu, b: Menu): boolean {
  return JSON.stringify(MenuSchema.parse(a)) === JSON.stringify(MenuSchema.parse(b))
}

/** Read, parse, and register a theme file. Deletes any previous registration
 *  of the same id first so serve rebuilds pick up new bytes. */
export async function loadThemeFile(path: string): Promise<ThemeFile> {
  const raw = await loadIrFile(path, "theme")
  const file = parseBrandThemeFile(raw, path)
  REGISTERED_THEMES.delete(file.id)
  registerBrandThemeFile(file)
  return file
}

function isCanonicalThemeId(name: string): boolean {
  return (CANONICAL_THEME_IDS as readonly string[]).includes(name)
}

function faceId(face: string | { id: string }): string {
  return typeof face === "string" ? face : face.id
}

function archetypeIds(ids: readonly string[]): string[] {
  return ids.filter((id) => getLayout(id)?.kind === "archetype")
}

function idsForSlideType(def: ThemeDefinition, slideType: "cover" | "chapter" | "content" | "ending"): string[] {
  const faces = def.faces?.[slideType]
  if (faces && faces.length > 0) return faces.map(faceId)
  return [...def.layouts[slideType]]
}

function synthesizeMenu(def: ThemeDefinition): Menu {
  const motifDecor =
    def.motif === undefined
      ? undefined
      : def.motifParameters?.intensity !== undefined
        ? { kind: "motif" as const, id: def.motif, params: { intensity: def.motifParameters.intensity } }
        : { kind: "motif" as const, id: def.motif }

  const entry = (face: string): MenuEntry => (motifDecor ? { face, decor: motifDecor } : { face })

  const firstArchetype = (slideType: "cover" | "chapter" | "content" | "ending"): string => {
    const faces = archetypeIds(idsForSlideType(def, slideType))
    if (faces.length === 0) {
      throw new PptwiseError(`cannot materialize theme "${def.id}": no archetype face for ${slideType}`)
    }
    return faces[0]!
  }

  const contentFaces = archetypeIds(idsForSlideType(def, "content"))
  if (contentFaces.length === 0) {
    throw new PptwiseError(`cannot materialize theme "${def.id}": no archetype face for content`)
  }

  const content: Menu["content"] = {}
  KIND_VALUES.forEach((kind, index) => {
    content[kind] = entry(contentFaces[index % contentFaces.length]!)
  })

  return MenuSchema.parse({
    cover: entry(firstArchetype("cover")),
    chapter: entry(firstArchetype("chapter")),
    content,
    ending: entry(firstArchetype("ending")),
  })
}

export function menuForThemeId(id: string): Menu {
  const def = getThemeDefinition(id)
  return def.menu ?? synthesizeMenu(def)
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

/** Copy a built-in preset into a self-contained v2 ThemeFile. Engine-only
 *  `style.shape.cover` is stripped. The new id must not collide with a builtin. */
export function materializeBuiltinTheme(
  presetId: string,
  identity: { id: string; label?: string },
): ThemeFile {
  if (!isCanonicalThemeId(presetId)) {
    throw new PptwiseError(`unknown built-in theme "${presetId}"`)
  }
  if (isCanonicalThemeId(identity.id)) {
    throw new PptwiseError(
      `theme id "${identity.id}" collides with a built-in pptwise theme. Pick a different id with --id (or a different output filename)`,
    )
  }
  const def = getThemeDefinition(presetId)
  const file = {
    version: 2 as const,
    id: identity.id,
    label: identity.label ?? def.label,
    style: publicStyle(def.style, identity.id),
    brand: def.brand,
    occasions: def.occasions !== undefined ? [...def.occasions] : undefined,
    identity: def.identity,
    menu: def.menu ?? synthesizeMenu(def),
  }
  return ThemeFileSchema.parse(file) as ThemeFile
}

async function tryParseThemeFile(path: string): Promise<ThemeFile | undefined> {
  const raw = await loadIrFile(path, "theme")
  const parsed = ThemeFileSchema.safeParse(raw)
  return parsed.success ? (parsed.data as ThemeFile) : undefined
}

async function acceptThemeFile(path: string, file: ThemeFile): Promise<ResolvedTheme> {
  REGISTERED_THEMES.delete(file.id)
  registerBrandThemeFile(file)
  return { kind: "file", id: file.id, path, file }
}

async function resolveDeckThemeFile(
  deckDir: string,
  name: string,
): Promise<ResolvedTheme | undefined> {
  const boundPath = join(deckDir, THEME_FILENAME)
  if (await pathExists(boundPath)) {
    const file = await loadThemeFile(boundPath)
    if (file.id === name) return { kind: "file", id: file.id, path: boundPath, file }
  }

  const namedTheme = join(deckDir, `${name}.theme.json`)
  if (await pathExists(namedTheme)) {
    const file = await loadThemeFile(namedTheme)
    if (file.id === name) return { kind: "file", id: file.id, path: namedTheme, file }
  }

  const namedJson = join(deckDir, `${name}.json`)
  if (await pathExists(namedJson)) {
    const file = await tryParseThemeFile(namedJson)
    if (file !== undefined && file.id === name) return acceptThemeFile(namedJson, file)
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
        if (file !== undefined && file.id === name) return acceptThemeFile(candidate, file)
        continue
      }
      const file = await loadThemeFile(candidate)
      if (file.id === name) return { kind: "file", id: file.id, path: candidate, file }
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
  if (opts.deckDir !== undefined) {
    const deckHit = await resolveDeckThemeFile(opts.deckDir, name)
    if (deckHit !== undefined) return deckHit
  }

  // A workspace file must never steal a built-in name.
  if (!isCanonicalThemeId(name)) {
    const workspaceHit = await resolveWorkspaceThemeFile(opts.startDir, name)
    if (workspaceHit !== undefined) return workspaceHit
  }

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

/** Register a deck-local theme.json (fail-loud) and resolve `name` so
 *  `getInstalledThemeIds` sees a custom id before spec/IR validation. */
export async function registerThemeSelection(
  name: string | undefined,
  opts: { startDir: string; deckDir?: string },
): Promise<ResolvedTheme | undefined> {
  if (opts.deckDir !== undefined) {
    const boundPath = join(opts.deckDir, THEME_FILENAME)
    if (await pathExists(boundPath)) await loadThemeFile(boundPath)
  }
  if (name === undefined || name.length === 0) return undefined
  return resolveThemeByName(name, opts)
}

export function themeNameFromUnknown(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const theme = (raw as { theme?: unknown }).theme
  return typeof theme === "string" ? theme : undefined
}
