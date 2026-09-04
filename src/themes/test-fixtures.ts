import type { PageKind } from "@/ir"
import { getLayout } from "../layouts/registry"
import { __registerStructuralTheme, THEME_DEFINITIONS } from "./definitions"
import type { CanonicalThemeId } from "./index"
import type { Menu, MenuDecor, MenuEntry, ThemeFile } from "./schema"

type FaceChoice = string | MenuEntry

export interface TestThemeFaces {
  cover?: FaceChoice
  chapter?: FaceChoice
  content?: Partial<Record<PageKind, FaceChoice>>
  ending?: FaceChoice
}

function sourceDecor(themeId: CanonicalThemeId): MenuDecor | undefined {
  const source = THEME_DEFINITIONS[themeId]
  if (source.motif === undefined) return undefined
  return source.motifParameters
    ? { kind: "motif", id: source.motif, params: { ...source.motifParameters } }
    : { kind: "motif", id: source.motif }
}

function materializeEntry(entry: MenuEntry, fallbackDecor: MenuDecor | undefined): MenuEntry {
  const copy = structuredClone(entry)
  if (copy.decor !== undefined || fallbackDecor === undefined) return copy
  if (getLayout(copy.face)?.suppressMotif === true) return copy
  return { ...copy, decor: structuredClone(fallbackDecor) }
}

function replaceFace(
  current: MenuEntry | undefined,
  choice: FaceChoice | undefined,
  fallbackDecor: MenuDecor | undefined,
): MenuEntry | undefined {
  if (choice === undefined) {
    return current === undefined ? undefined : materializeEntry(current, fallbackDecor)
  }
  if (typeof choice !== "string") return structuredClone(choice)
  const decor = current?.decor ?? fallbackDecor
  if (decor?.kind === "motif" && getLayout(choice)?.suppressMotif === true) return { face: choice }
  return decor === undefined ? { face: choice } : { face: choice, decor: structuredClone(decor) }
}

function publicStyle(themeId: CanonicalThemeId, id: string): ThemeFile["style"] {
  const style = structuredClone(THEME_DEFINITIONS[themeId].style)
  style.id = id
  if (style.shape?.cover !== undefined) delete style.shape.cover
  return style
}

/**
 * Register a public v2 test theme that keeps one built-in theme's visual
 * tokens and decoration while replacing only the menu faces under test.
 */
export function registerTestTheme(
  id: string,
  sourceThemeId: CanonicalThemeId,
  faces: TestThemeFaces = {},
): string {
  const source = THEME_DEFINITIONS[sourceThemeId]
  const fallbackDecor = sourceDecor(sourceThemeId)
  const content: Menu["content"] = {}
  const contentKinds = new Set<PageKind>([
    ...(Object.keys(source.menu.content) as PageKind[]),
    ...(Object.keys(faces.content ?? {}) as PageKind[]),
  ])

  for (const kind of contentKinds) {
    const entry = replaceFace(source.menu.content[kind], faces.content?.[kind], fallbackDecor)
    if (entry !== undefined) content[kind] = entry
  }

  const menu: Menu = {
    cover: replaceFace(source.menu.cover, faces.cover, fallbackDecor)!,
    chapter: replaceFace(source.menu.chapter, faces.chapter, fallbackDecor)!,
    content,
    ending: replaceFace(source.menu.ending, faces.ending, fallbackDecor)!,
  }

  // Structural install: this id is composed out of a source theme, a page
  // type, and the internal name of the drawing under test, so it is a handle
  // and not a name. Every other gate the public contract runs still runs.
  __registerStructuralTheme({
    version: 2,
    id,
    label: `Test copy of ${sourceThemeId}`,
    style: publicStyle(sourceThemeId, id),
    brand: structuredClone(source.brand),
    occasions: source.occasions === undefined ? undefined : [...source.occasions],
    identity: source.identity,
    menu,
  } satisfies ThemeFile)
  return id
}
