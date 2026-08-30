import type { BackgroundSpec, BrandConfig, Slide } from "@/ir"
import { PptwiseError } from "../errors"
import type { MotifId } from "../motifs/types"
import { hasExactWidthTable, resolveFontFace } from "../render/fonts"
import { hasTakeoverRenderer } from "../render/image-pages"
import { contrastRatio } from "../render/ink"
import { getLayout, type LayoutParamDeclaration } from "../layouts/registry"
import { REGISTERED_THEMES } from "./registered-themes"
import {
  ThemeFileSchema,
  type BuiltinThemeDeclaration,
  type Menu,
  type MenuEntry,
  type MenuParamValue,
  type ThemeFile,
} from "./schema"
import { THEME_OCCASIONS, type Occasion } from "./occasions"
import type { StyleTokens } from "./tokens"
import { BUILTIN_THEME_FILES, CANONICAL_THEME_IDS, resolveThemeId, type CanonicalThemeId } from "./index"

/**
 * A theme = distributable bundle: `style` (style tokens) + `brand` (brand
 * frame) + affinity tags (filled in W4).
 *
 * `id` is a plain `string`, not `CanonicalThemeId` — the 24 built-ins satisfy
 * this (`CanonicalThemeId` is a subtype of `string`), but `registerTheme`
 * below (W3 task 4's SDK registration seam) must also accept ids outside that
 * closed union.
 */
export interface ThemeDefinition {
  id: string
  label?: string
  style: StyleTokens
  brand: BrandConfig
  tags: readonly string[]
  occasions?: readonly Occasion[]
  identity?: "low" | "medium" | "high"
  /** The theme's semantic page menu: one face per served kind. Authoritative. */
  menu: Menu
  /** One registered motif id. `undefined` means the theme has no motif. */
  motif?: MotifId
  motifParameters?: { intensity?: "subtle" | "normal" }
}

/**
 * Built-ins compile from the same v2 menu the public contract uses. Their
 * declaration type additionally permits internal constructor metadata
 * (`style.shape.cover` knobs, the theme-wide motif anchor) that public
 * files cannot express.
 */
export function compileBuiltinTheme(file: BuiltinThemeDeclaration): ThemeDefinition {
  assertMenuContract(file.id, file.menu)
  const record = THEME_OCCASIONS[file.id]
  return {
    id: file.id,
    label: file.label,
    style: file.style,
    brand: file.brand ?? {},
    tags: record.occasions,
    occasions: record.occasions,
    identity: record.identity,
    menu: file.menu,
    motif: file.motif?.id,
    motifParameters: file.motif?.params,
  }
}

export const THEME_DEFINITIONS: Record<CanonicalThemeId, ThemeDefinition> = Object.fromEntries(
  CANONICAL_THEME_IDS.map((id) => [id, compileBuiltinTheme(BUILTIN_THEME_FILES[id])]),
) as Record<CanonicalThemeId, ThemeDefinition>

/** Theme brand config from the installed definition. Brand is not overlaid from IR. */
export function resolveBrand(id: string): BrandConfig {
  return getThemeDefinition(id).brand
}

// ── Theme registration seam (W3 task 4, spec §4/roadmap "theme ecosystem")
// ─────────────────────────────────────────────────────────────────────────
//
// This is deliberately *not* the v0.4 registry protocol (no distribution,
// no manifest fetch, no `pptwise theme add <url>`) — just the runtime SDK
// seam a v0.4 registry client (or any embedder) would call into: hand
// `registerTheme` a fully-formed `ThemeDefinition` and it becomes visible to
// every internal theme lookup (installed-check, selection, resolveStyle,
// resolveBrand) exactly like a builtin, with no second code path.

/**
 * Reduce a `BackgroundSpec` to one representative hex color — a color spec
 * is already one; a gradient's `from` stop stands in for the whole band (see
 * `svg/full-slide-svg.tsx`'s own copy of this same function for the fuller
 * gradient/asset rationale).
 *
 * Deliberately duplicated (byte-identical logic) from `svg/full-slide-svg.tsx`'s
 * exported `resolveBackgroundHex` rather than imported: that file already
 * imports back from this one (`getThemeDefinition`), and it further pulls in
 * the render-orchestration subtree (`branding.tsx`/`layout-selection.ts`/
 * `motif-selection.ts`, confirmed via `npx madge --circular`) — importing it
 * here would fold that whole subtree into a cycle with this foundational
 * theme-registration module just to reuse a 3-line pure function. `ink.ts`'s
 * own `contrastRatio` below makes the identical call against
 * `deck-audit.ts`'s copy for an analogous reason (see that file's header
 * comment: "render code must never import from the audit package;
 * dependency direction is render→util, not the reverse") — this is the same
 * discipline applied to the mirror-image direction (a low-level
 * registration module must not import the high-level render orchestrator).
 * Keep in sync with `full-slide-svg.tsx`'s copy if the reduction rule ever
 * changes.
 */
function resolveBackgroundHex(spec: BackgroundSpec, surfaceFallback: string): string {
  if (spec.kind === "color") return spec.value
  if (spec.kind === "gradient") return spec.from
  return surfaceFallback
}

/**
 * Registration-time contrast floor (backlog-sweep task I2, controller-
 * adjudicated): `colors.text`/`colors.muted` must clear 3.0:1 — the WCAG
 * large-text floor — against each checked slide type's own resolved default
 * background (same reduction `full-slide-svg.tsx` itself paints with,
 * {@link resolveBackgroundHex}). Below 3.0 a token is unreadable at *any*
 * font size, not just body text, which is the same "always broken, no
 * legitimate design reading it as intentional" bar this function's 6
 * existing throw checks already hold layout ids to.
 *
 * Deliberately *not* the 4.5:1 body-text floor: a real gray-scale design can
 * legitimately land in [3.0, 4.5) and should not be hard-rejected at
 * registration — that higher bar is a theme author's own self-audit
 * concern, already covered by `full-matrix-contrast.test.ts`'s
 * `colors.muted contrast` suite for the 24 built-ins (all measure >= 4.5
 * there today).
 */
const CONTRAST_FLOOR = 3.0

/**
 * Slide types this check actually walks — `"chapter"` is deliberately
 * excluded, same as `full-matrix-contrast.test.ts`'s `colors.muted contrast`
 * suite (see that block's own comment). Verified by reading, not assumed:
 * every one of the 8 chapter layouts (`chapter-*.tsx`) imports
 * `accessibleInk`/`readableOn` from `../render/ink` and routes *both*
 * `colors.text` and `colors.muted` through it before ever painting a fill —
 * none paints either token raw against `ctx.defaultBg`. This isn't a
 * per-theme coincidence this function would need to re-verify per
 * registration: `registerTheme` can only curate a subset of *already
 * existing* layouts ("a theme never ships new render code", this
 * function's own doc comment above) drawn from that same shared, fixed
 * chapter-layout set — so the raw-token-vs-chapter-background pairing
 * this check would otherwise measure is structurally never what actually
 * renders, for any theme this function could ever accept, not just the 13
 * built-ins. A probe against all 24 built-ins' real tokens confirms this is
 * load-bearing, not theoretical: `academic`/`classroom`/`consulting` are the
 * 3 builtins whose `defaultBackgrounds.chapter` intentionally diverges from
 * their own `colors.bg` (a dark divider tone, see {@link resolveBackgroundHex}'s
 * own doc comment) — checking `chapter` here would hard-reject `colors.text`
 * and/or `colors.muted` for all 3 of them (measured 1.00:1/2.41:1/2.23:1 for
 * text, 3.26:1/1.18:1/1.46:1 for muted, against their own chapter
 * background) despite every one of them rendering correctly today, precisely
 * because their chapter layouts never read these tokens raw.
 */
const CONTRAST_CHECKED_SLIDE_TYPES = ["cover", "content", "ending"] as const

/**
 * Throws {@link PptwiseError} the moment any of `style.colors.text`/
 * `style.colors.muted` falls below {@link CONTRAST_FLOOR} against a
 * {@link CONTRAST_CHECKED_SLIDE_TYPES} slide type's own resolved default
 * background — see that constant's doc comment for the 3.0 rationale and
 * {@link CONTRAST_CHECKED_SLIDE_TYPES}'s for why `chapter` is out of scope.
 *
 * Exported so a test can sweep it directly against the 24 built-ins. They
 * compile from trusted in-package declarations instead of entering through
 * the public registration seam, so this direct sweep locks the same floor.
 */
export function assertContrastFloor(id: string, style: StyleTokens): void {
  for (const slideType of CONTRAST_CHECKED_SLIDE_TYPES) {
    const bg = resolveBackgroundHex(style.defaultBackgrounds[slideType], style.colors.surface)
    for (const token of ["text", "muted"] as const) {
      const ratio = contrastRatio(style.colors[token], bg)
      if (ratio < CONTRAST_FLOOR) {
        throw new PptwiseError(
          `theme "${id}" colors.${token} has a contrast ratio of ${ratio.toFixed(2)}:1 against its "${slideType}" background (${bg}) — must be at least ${CONTRAST_FLOOR.toFixed(1)}:1`,
        )
      }
    }
  }
  for (const token of ["text", "muted"] as const) {
    const ratio = contrastRatio(style.colors[token], style.colors.surface)
    if (ratio < CONTRAST_FLOOR) {
      throw new PptwiseError(
        `theme "${id}" colors.${token} has a contrast ratio of ${ratio.toFixed(2)}:1 against colors.surface (${style.colors.surface}). It must be at least ${CONTRAST_FLOOR.toFixed(1)}:1`,
      )
    }
  }
}

/**
 * `console.warn`s a single line when `stack` (a theme's `fonts.heading` or
 * `fonts.body`) resolves — via `resolveFontFace`, the exact same resolution
 * `full-slide-svg.tsx`'s render path uses — to a face with no exact
 * per-character width table (`hasExactWidthTable`, `../render/fonts` ->
 * `svg-text-layout.ts`). Not a hard rejection: an unmeasured designer font
 * (Cambria, a theme's own custom stack, …) is a legitimate design choice,
 * not a defect — `measureTextUnits`'s class-average envelope still sizes it,
 * just more conservatively, with a real (if small) overflow risk on long
 * runs. `mono` is deliberately never checked here — `measureMonoTextUnits`
 * already sizes it with an exact per-glyph model for Consolas, the only
 * mono face any builtin ships.
 *
 * This is the first `console.warn` call site in the codebase (a repo-wide
 * grep found none) — deliberately plain, no new warning-channel
 * abstraction: there is no registration-time warning plumbing to reuse, and
 * `console.warn` needs none (zero API surface change, works identically on
 * every platform this package ships to).
 */
function warnUnmeasuredFace(id: string, role: "heading" | "body", stack: string[]): void {
  const face = resolveFontFace(stack, role)
  if (!hasExactWidthTable(face)) {
    console.warn(
      `theme "${id}" ${role} font "${face}" has no exact width table — text width estimation falls back to a conservative class-average envelope and may overflow on long text; see measureTextUnits in src/lib/svg-text-layout.ts`,
    )
  }
}

function parseThemeFile(value: unknown): ThemeFile {

  const result = ThemeFileSchema.safeParse(value)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")
    throw new PptwiseError(`invalid theme definition:\n${detail}`)
  }
  return result.data as ThemeFile
}

/** Compile the public v2 declaration into the internal theme definition. */
function compileThemeFile(file: ThemeFile): ThemeDefinition {
  return {
    id: file.id,
    label: file.label,
    style: file.style,
    brand: file.brand ?? {},
    tags: file.occasions ?? [],
    occasions: file.occasions,
    identity: file.identity,
    menu: file.menu,
  }
}

interface MenuEntryLocation {
  path: string
  slideType: Slide["type"]
  entry: MenuEntry
}

function menuEntryLocations(menu: Menu): MenuEntryLocation[] {
  const content = Object.entries(menu.content).flatMap(([kind, entry]) =>
    entry === undefined ? [] : [{ path: `menu.content.${kind}`, slideType: "content" as const, entry }],
  )
  return [
    { path: "menu.cover", slideType: "cover", entry: menu.cover },
    { path: "menu.chapter", slideType: "chapter", entry: menu.chapter },
    ...content,
    { path: "menu.ending", slideType: "ending", entry: menu.ending },
  ]
}

function assertNumberParam(
  themeId: string,
  path: string,
  value: MenuParamValue,
  declaration: Extract<LayoutParamDeclaration, { type: "number" }>,
): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PptwiseError(`theme "${themeId}" ${path} expected number`)
  }
  if (declaration.integer && !Number.isInteger(value)) {
    throw new PptwiseError(`theme "${themeId}" ${path} expected an integer`)
  }
  if (declaration.min !== undefined && value < declaration.min) {
    throw new PptwiseError(`theme "${themeId}" ${path} is ${value}, below minimum ${declaration.min}`)
  }
  if (declaration.max !== undefined && value > declaration.max) {
    throw new PptwiseError(`theme "${themeId}" ${path} is ${value}, above maximum ${declaration.max}`)
  }
}

function assertStringParam(
  themeId: string,
  path: string,
  value: MenuParamValue,
  declaration: Extract<LayoutParamDeclaration, { type: "string" }>,
): void {
  if (typeof value !== "string") {
    throw new PptwiseError(`theme "${themeId}" ${path} expected string`)
  }
  if (declaration.values !== undefined && !declaration.values.includes(value)) {
    throw new PptwiseError(
      `theme "${themeId}" ${path} is "${value}". Allowed values: ${declaration.values.join(", ")}`,
    )
  }
  if (declaration.minLength !== undefined && value.length < declaration.minLength) {
    throw new PptwiseError(
      `theme "${themeId}" ${path} has length ${value.length}, below minimum length ${declaration.minLength}`,
    )
  }
  if (declaration.maxLength !== undefined && value.length > declaration.maxLength) {
    throw new PptwiseError(
      `theme "${themeId}" ${path} has length ${value.length}, above maximum length ${declaration.maxLength}`,
    )
  }
}

function assertMenuParam(
  themeId: string,
  path: string,
  value: MenuParamValue,
  declaration: LayoutParamDeclaration,
): void {
  if (declaration.type === "number") {
    assertNumberParam(themeId, path, value, declaration)
    return
  }
  if (declaration.type === "string") {
    assertStringParam(themeId, path, value, declaration)
    return
  }
  if (typeof value !== "boolean") {
    throw new PptwiseError(`theme "${themeId}" ${path} expected boolean`)
  }
}

/** Validate menu faces and every face-owned adjustable parameter before registration. */
function assertMenuContract(themeId: string, menu: Menu): void {
  for (const { path, slideType, entry } of menuEntryLocations(menu)) {
    const layout = getLayout(entry.face)
    if (!layout) {
      throw new PptwiseError(`theme "${themeId}" ${path}.face references unknown layout id "${entry.face}"`)
    }
    if (!layout.slideTypes.includes(slideType)) {
      throw new PptwiseError(
        `theme "${themeId}" ${path}.face layout "${entry.face}" is not valid for "${slideType}" slides`,
      )
    }
    if (layout.suppressMotif === true && entry.decor?.kind === "motif") {
      throw new PptwiseError(
        `theme "${themeId}" ${path}.decor selects a motif but layout "${entry.face}" suppresses motifs`,
      )
    }
    if (layout.kind === "takeover" && !hasTakeoverRenderer(entry.face)) {
      throw new PptwiseError(
        `theme "${themeId}" ${path}.face takeover "${entry.face}" has no renderer dispatcher`,
      )
    }

    const values = Object.entries(entry.params ?? {}).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    )
    if (values.length === 0) continue
    if (layout.params === undefined) {
      throw new PptwiseError(
        `theme "${themeId}" ${path}.params cannot set values because layout "${entry.face}" declares no adjustable parameters`,
      )
    }
    for (const [name, value] of values) {
      const declaration = layout.params[name]
      const paramPath = `${path}.params.${name}`
      if (declaration === undefined) {
        throw new PptwiseError(
          `theme "${themeId}" ${paramPath} is not declared by layout "${entry.face}"`,
        )
      }
      assertMenuParam(themeId, paramPath, value, declaration)
    }
  }
}

/**
 * Register a theme at runtime (SDK seam, not the v0.4 distribution
 * protocol). The input is a complete v2 theme file and nothing else: one
 * self-contained declaration carrying style, brand, and the menu. There is
 * no partial completeness, no inherited structure, and no registry-wide
 * default pool to fall back on.
 *
 * Hard gates, in order:
 *
 * - the file must parse against {@link ThemeFileSchema} (which already
 *   rejects a `style.id` that disagrees with `id`, and requires a
 *   non-empty content-kind subset).
 * - `id` must not collide with a built-in or an already-registered theme.
 * - `style.colors.text`/`style.colors.muted` must each clear the
 *   {@link CONTRAST_FLOOR} against a {@link CONTRAST_CHECKED_SLIDE_TYPES}
 *   slide type's own resolved default background — see
 *   {@link assertContrastFloor}.
 * - every menu entry must name a registered layout valid for that page
 *   type, and every parameter it sets must be declared by that face and
 *   inside the face's own declared bounds ({@link assertMenuContract}).
 *
 * Also `console.warn`s (never throws) once for each of `style.fonts.heading`/
 * `style.fonts.body` that resolves to a face with no exact width table — see
 * {@link warnUnmeasuredFace}'s own doc comment. Fires only for a
 * registration that clears every check above.
 *
 * Once registered, the theme participates in `getInstalledThemeIds`,
 * `getThemeDefinition`, and `themes/index.ts`'s `resolveStyle` — every
 * internal theme lookup, with no separate "registered theme" branch.
 *
 * File loading that may shadow a builtin or replace a previous custom
 * registration uses {@link installThemeFile} instead.
 */
export function registerTheme(input: unknown): void {
  const file = parseThemeFile(input)
  if ((CANONICAL_THEME_IDS as readonly string[]).includes(file.id) || REGISTERED_THEMES.has(file.id)) {
    throw new PptwiseError(`theme "${file.id}" is already installed`)
  }
  installParsedThemeFile(file)
}

/**
 * Validate a complete v2 theme file, then replace any previous registration
 * of the same id. Built-in ids may be shadowed. A failed gate leaves the
 * previous registration untouched.
 */
export function installThemeFile(input: unknown): ThemeDefinition {
  return installParsedThemeFile(parseThemeFile(input))
}

function installParsedThemeFile(file: ThemeFile): ThemeDefinition {
  const def = compileThemeFile(file)
  assertContrastFloor(def.id, def.style)
  assertMenuContract(def.id, def.menu)
  warnUnmeasuredFace(def.id, "heading", def.style.fonts.heading)
  warnUnmeasuredFace(def.id, "body", def.style.fonts.body)
  REGISTERED_THEMES.set(def.id, def)
  return def
}

/** Every installed theme id in deterministic lexical order. */
export function getInstalledThemeIds(): readonly string[] {
  return [...new Set([...CANONICAL_THEME_IDS, ...REGISTERED_THEMES.keys()])].sort()
}

/**
 * Resolve a theme id to its full definition — a registered theme first, then
 * the built-in shelf. An id that is neither throws (`resolveThemeId`), so a
 * misspelled theme surfaces at once instead of rendering as some other
 * theme. The one lookup every internal consumer calls.
 */
export function getThemeDefinition(id: string): ThemeDefinition {
  return REGISTERED_THEMES.get(id) ?? THEME_DEFINITIONS[resolveThemeId(id)]
}

/**
 * Test-only: clear every registered theme. Deliberately not exported from
 * `src/index.ts` (the public SDK barrel) — a `__`-prefixed, clearly
 * test-only name signals the same at the call site.
 */
export function __resetRegisteredThemes(): void {
  REGISTERED_THEMES.clear()
}
