/**
 * The factory preset library.
 *
 * The 24 built-ins are no longer a closed set of "the themes pptwise has".
 * They are the shelf a new workspace theme is copied off (charter: 创建 =
 * 拷贝, `.issues/2026-08-30-theme-first-principles/charter.md`). This module
 * is the read source for that copy: it names what is on the shelf, what
 * occasion each preset answers, and it hands out an independent copy that
 * the copier owns outright. Nothing here keeps a link back to the preset —
 * a copy never inherits later, which is the whole point of copying.
 *
 * Decoration is pushed down on the way out. A built-in declares one
 * theme-wide `motif` anchor, but the public menu contract carries decoration
 * per entry, so {@link copyThemePreset} writes the anchor into every entry
 * that has not already declared its own decoration and whose face does not
 * structurally suppress the motif. The copy therefore needs no theme-level
 * anchor to look like its source.
 */
import { THEME_ID_CONSTRAINT, THEME_ID_PATTERN } from "@/ir"
import { PptwiseError } from "../errors"
import { BUILTIN_THEME_FILES, CANONICAL_THEME_IDS, type CanonicalThemeId } from "./index"
import { THEME_OCCASIONS, type IdentityStrength, type Occasion } from "./occasions"
import { retiredThemeHint } from "./retired-ids"
import { getLayout } from "../layouts/registry"
import type { BuiltinThemeDeclaration, Menu, MenuEntry } from "./schema"

/** One shelf entry: what a picker needs to choose a starting point. */
export interface ThemePresetSummary {
  readonly id: CanonicalThemeId
  readonly label: string
  readonly occasions: readonly Occasion[]
  readonly identity: IdentityStrength
}

/** Every preset on the shelf, in canonical order. */
export const THEME_PRESETS: readonly ThemePresetSummary[] = CANONICAL_THEME_IDS.map((id) => ({
  id,
  label: BUILTIN_THEME_FILES[id].label,
  occasions: THEME_OCCASIONS[id].occasions,
  identity: THEME_OCCASIONS[id].identity,
}))

/** Whether `id` names a factory preset. */
export function isThemePresetId(id: string): id is CanonicalThemeId {
  return (CANONICAL_THEME_IDS as readonly string[]).includes(id)
}

/** One shelf entry by id. Unknown ids are an error, never a silent fallback. */
export function getThemePreset(id: string): ThemePresetSummary {
  const summary = THEME_PRESETS.find((preset) => preset.id === id)
  if (!summary) {
    throw new PptwiseError(
      `unknown theme preset "${id}"${retiredThemeHint(id)}. Installed presets: ${CANONICAL_THEME_IDS.join(", ")}`,
    )
  }
  return summary
}

function withDecor(entry: MenuEntry, motif: BuiltinThemeDeclaration["motif"]): MenuEntry {
  if (entry.decor !== undefined || motif === undefined) return structuredClone(entry)
  // A face that paints its own identity never receives the theme motif, so
  // writing the anchor onto it would only mislead a reader of the copy.
  if (getLayout(entry.face)?.suppressMotif === true) return structuredClone(entry)
  return {
    ...structuredClone(entry),
    decor: motif.params ? { kind: "motif", id: motif.id, params: { ...motif.params } } : { kind: "motif", id: motif.id },
  }
}

function copyMenu(menu: Menu, motif: BuiltinThemeDeclaration["motif"]): Menu {
  const content: Menu["content"] = {}
  for (const [kind, entry] of Object.entries(menu.content) as [keyof Menu["content"], MenuEntry][]) {
    content[kind] = withDecor(entry, motif)
  }
  return {
    cover: withDecor(menu.cover, motif),
    chapter: withDecor(menu.chapter, motif),
    content,
    ending: withDecor(menu.ending, motif),
  }
}

/**
 * Copy one preset under a new id. The result shares nothing with the
 * preset: style tokens, brand, and menu are all fresh objects, and the
 * theme-wide motif anchor has been written into the menu entries.
 *
 * `emphasis` travels with the copy. It is theme identity, not decoration:
 * brief swipes a marker pad behind a `**marked**` run and lecture
 * chalks a line under it, so a copy that lost the field silently reverted
 * both to the plain accent tint.
 *
 * `targetId` may equal a preset id. That is how a freeze copy keeps the
 * bound name while the file shadows the factory shelf.
 */
export function copyThemePreset(presetId: string, targetId: string): BuiltinThemeDeclaration {
  getThemePreset(presetId)
  if (!THEME_ID_PATTERN.test(targetId)) {
    throw new PptwiseError(`invalid theme id "${targetId}". ${THEME_ID_CONSTRAINT}`)
  }
  const preset: BuiltinThemeDeclaration = BUILTIN_THEME_FILES[presetId as CanonicalThemeId]
  const record = THEME_OCCASIONS[preset.id]
  return {
    version: 2,
    id: targetId as BuiltinThemeDeclaration["id"],
    label: preset.label,
    style: { ...structuredClone(preset.style), id: targetId },
    ...(preset.brand ? { brand: structuredClone(preset.brand) } : {}),
    occasions: [...record.occasions],
    identity: record.identity,
    ...(preset.emphasis ? { emphasis: preset.emphasis } : {}),
    // The story travels with the copy for the same reason `emphasis` does:
    // it is what the theme is, not how it was built. A copy that lost it
    // would come out of the box with nothing to say for itself, and the
    // gallery and the docs read the copy, not the preset it came from.
    ...(preset.story ? { story: structuredClone(preset.story) } : {}),
    menu: copyMenu(preset.menu, preset.motif),
  }
}
