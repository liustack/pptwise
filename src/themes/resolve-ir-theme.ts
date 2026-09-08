import { PptwiseError } from "../errors"
import { getInstalledThemeIds, getThemeDefinition, type ThemeDefinition } from "./definitions"
import { retiredThemeHint } from "./retired-ids"

/**
 * The one place a bound theme id is looked up in a table.
 *
 * A theme reaches the render chain by value: every entry point resolves the
 * definition once, at its own front door, and hands the object down. Inside
 * the chain the definition is a required argument, so no function further in
 * can quietly resolve a different theme under the same id.
 *
 * Resolution has exactly two cases. A caller that supplies a definition owns
 * it outright — the only question is whether it answers to the id the deck
 * binds. A caller that supplies none is asking for the installed theme under
 * that id, which is a built-in preset or something an embedder registered
 * with `registerTheme` at startup.
 */
export type BoundThemeResolution =
  | { ok: true; theme: ThemeDefinition }
  | { ok: false; reason: "mismatch"; suppliedId: string }
  | { ok: false; reason: "unknown"; installed: readonly string[] }

/**
 * Resolve the theme a deck binds, reporting a mismatch or an unknown id as
 * data so a validator can phrase the failure in its own vocabulary. Callers
 * that want an exception use {@link resolveBoundTheme} or
 * {@link resolveIrTheme} instead.
 */
export function resolveBoundThemeResult(boundThemeId: string, theme?: ThemeDefinition): BoundThemeResolution {
  if (theme !== undefined) {
    return theme.id === boundThemeId ? { ok: true, theme } : { ok: false, reason: "mismatch", suppliedId: theme.id }
  }
  const installed = getInstalledThemeIds()
  if (!installed.includes(boundThemeId)) return { ok: false, reason: "unknown", installed }
  return { ok: true, theme: getThemeDefinition(boundThemeId) }
}

/** {@link resolveBoundThemeResult}, throwing {@link PptwiseError} instead of returning a failure. */
export function resolveBoundTheme(boundThemeId: string, theme?: ThemeDefinition): ThemeDefinition {
  const resolved = resolveBoundThemeResult(boundThemeId, theme)
  if (resolved.ok) return resolved.theme
  if (resolved.reason === "mismatch") {
    throw new PptwiseError(
      `deck binds theme "${boundThemeId}" but the supplied theme definition is "${resolved.suppliedId}"`,
    )
  }
  throw new PptwiseError(
    `unknown theme "${boundThemeId}"${retiredThemeHint(boundThemeId)}. Themes available: ${resolved.installed.join(
      ", ",
    )} (see \`pptwise themes\`)`,
  )
}

/** {@link resolveBoundTheme} for an IR: the deck's own `theme.id` is the binding. */
export function resolveIrTheme(ir: { theme: { id: string } }, theme?: ThemeDefinition): ThemeDefinition {
  return resolveBoundTheme(ir.theme.id, theme)
}
