import type { BackgroundSpec, BrandConfig, Slide } from "@/ir"
import { PptwiseError } from "../errors"
import type { MotifId } from "../motifs/types"
import { hasExactWidthTable, resolveFontFace } from "../render/fonts"
import { contrastRatio } from "../render/ink"
import { excludePinOnly, getLayout, layoutsForSlideType } from "../layouts/registry"
import { REGISTERED_THEMES } from "./registered-themes"
import {
  SPARSE_LAYOUT_IDS,
  ThemeFileSchema,
  type BuiltinThemeDeclaration,
  type FaceReference,
  type ThemeFile,
} from "./schema"
import type { Occasion } from "./occasions"
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
  /** Curated layout ids eligible for each page type. Built-ins and public
   * complete themes compile their `faces` pools into this total record.
   * Legacy programmatic registrations may omit a page type and receive the
   * registry-wide fallback once at registration. Public complete files must
   * declare all four pools, so they never take that fallback. */
  layouts: Record<Slide["type"], readonly string[]>
  /** Original declarative face entries when the theme came from the v1
   * theme schema. Render selection consumes the compiled `layouts` ids. */
  faces?: Record<Slide["type"], readonly FaceReference[]>
  /** One registered motif id. `undefined` means the theme has no motif. */
  motif?: MotifId
  motifParameters?: { intensity?: "subtle" | "normal" }
  /**
   * A theme's own structural personality (theme-structure wave, task T1 —
   * `.issues/2026-07-26-theme-structure/plan.md`'s 控制器设计裁定 2): per
   * page type, the layout ids this theme's author wants `resolveLayoutId`
   * (`src/render/layout-selection.ts`) to lean toward. Shape mirrors
   * `StrategyDefinition.layoutTendencies` (`@/narrative`) — the same "named
   * ids get a soft weight bump, everyone else stays at the floor" contract —
   * but declared **per slide type** rather than content-only: a strategy's
   * `layoutTendencies` is content-only, so on cover/chapter/ending a theme
   * competes only with `StrategyDefinition.identityTendencies` (which
   * `tendencyIdsFor` does consult for those three types — an earlier draft
   * of this comment wrongly claimed no strategy signal reached them at all).
   * **Consequence worth knowing when declaring:** because `weightOf`
   * composes via `Math.max`, a theme tendency naming an id the active
   * strategy's `identityTendencies` already names adds no differential pull
   * for that id under that strategy (max(3,3) = 3) — a theme's structural
   * character therefore reads most clearly on ids the strategies do not
   * already favor. Content can carry both a strategy tendency
   * and a theme tendency at once; `weightOf` composes every live layer via
   * `Math.max`, never multiplication (same ruling `BEAT_TENDENCY_WEIGHT`'s
   * doc comment already argues for: agreement between layers corroborates
   * the same preference dimension, it does not square the pull).
   *
   * **Soft weight, not a whitelist — `layouts` above stays the one hard
   * boundary.** A slide type's candidate pool is built from `layouts[slideType]`
   * *before* any tendency is ever consulted (`resolveLayoutId`'s own
   * `pool` construction), so an id this record names for a page type it is
   * not also present in that same page type's `layouts` set can never be
   * scored — it is invisible to `weightOf`, not merely down-weighted. That
   * silent no-op is exactly why it counts as a theme-author mistake rather
   * than a legal (if unusual) declaration — `definitions.test.ts`'s
   * consistency sweep over the 24 built-ins, and `registerTheme`'s own
   * validation below for any future custom theme, both fail loudly the
   * moment a `layoutTendencies` entry names an id outside its own page
   * type's `layouts` set, so the mistake surfaces at registration/test time
   * instead of silently doing nothing at render time.
   *
   * Optional at every level (the whole field, and independently each of its
   * four page-type entries) — **omission is not a lesser default, it is
   * today's exact behavior**: a page type this record doesn't cover (key
   * absent, or the field itself `undefined`) contributes a uniform weight of
   * 1 to every candidate, the same "no theme-layer opinion" no-op floor
   * `beatTendencies === undefined` already gives beat. None of the 13
   * builtins declare this field yet (theme-structure wave task T1 is the
   * mechanism only — task T2 is where individual builtins pick up a
   * personality), so every one of them renders byte-identically to before
   * this field existed.
   */
  layoutTendencies?: Partial<Record<Slide["type"], readonly string[]>>
  /**
   * Which sparse climax pins this theme is willing to honour. This is not a
   * curated auto-pick pool: pinOnly sparse ids never enter `layouts[slideType]`
   * (`fullLayoutSet` / `excludePinOnly` already drop them), so a list here
   * does not make `resolveLayoutId` sample them. It is the offer table for
   * an explicit `slide.layout` pin — the only road that can ever reach a
   * sparse page.
   *
   * **Three shapes, none of them a defaulted array:**
   * - omitted / `undefined`: this theme offers every id in
   *   {@link SPARSE_LAYOUT_IDS}. Builtins that have not boarded a face still
   *   render the generic content face (`sparseFace` miss → `content-*.tsx`).
   *   Custom themes registered via {@link registerTheme} get the same
   *   omitted-means-all contract; do not default the field to `[]` or the
   *   six-id list on the way in (`getThemeDefinition` round-trips the
   *   registration object).
   * - `[]`: this theme offers none. An explicit pin of any sparse id warns
   *   at `validateIr` (`ok` stays true) and render falls back to auto-pick
   *   from the ordinary content (or chapter, for `verse-chapter`) pool.
   * - a list: only those ids. A listed id must be one of the six sparse
   *   ids (`registerTheme` throws {@link PptwiseError} otherwise). It does
   *   **not** have to sit in `layouts[slideType]` — those pools exclude
   *   pinOnly members by construction.
   *
   * {@link themeOffersSparse} is the only offer check. Renderers must not
   * branch on theme id. A pin this theme does not offer is stripped
   * (`effectiveRequestedLayout`) *before* `resolveLayoutId`'s pin
   * short-circuit, so fallback reuses the existing auto-pick path instead
   * of teaching selection about this table.
   */
  sparseLayouts?: readonly string[]
}

/**
 * Every registered standard layout id applicable to `slideType`, in
 * `LAYOUT_REGISTRY`'s own insertion order (W4, spec §3's curation default:
 * "layouts 主题引用的 layout 精选集...缺省 = 全集"). Takeover layouts are
 * excluded — `layoutsForSlideType("content")` also returns the 4 image
 * takeovers (their `slideTypes` includes `"content"` too), but a curated
 * auto-pick set may only ever contain standard layouts (`registerTheme`'s own
 * validation below enforces the same constraint on any caller-supplied
 * set. Takeovers are addressed only via an explicit `slide.layout` pin,
 * never auto-selected). The default also excludes every `pinOnly` layout.
 * A builtin may still list a pin-only cover, chapter, or ending face as a
 * deliberate one-entry board lock. See `LayoutDefinition.pinOnly` and the
 * matching exception in `resolveLayoutId`.
 */
function fullLayoutSet(slideType: Slide["type"]): readonly string[] {
  return excludePinOnly(layoutsForSlideType(slideType).filter((layout) => layout.kind === "archetype")).map(
    (layout) => layout.id,
  )
}

/**
 * Test-only: `fullLayoutSet` under a `__`-prefixed name (same convention
 * as `__resetRegisteredThemes` below) so a pinOnly regression test can call
 * it directly against a synthetic `LAYOUT_REGISTRY` mutation. The
 * registration fallback snapshots `fullLayoutSet` at module load, long
 * before any test could inject a fixture entry. Deliberately not
 * exported from `src/index.ts` (the public SDK barrel).
 */
export function __fullLayoutSet(slideType: Slide["type"]): readonly string[] {
  return fullLayoutSet(slideType)
}

/**
 * Registry-wide defaults used by custom themes that omit `layouts`.
 * Consulting's gauge layouts remain visible here because an explicitly
 * registered theme may opt into the complete auto-selectable registry.
 */
const REGISTERED_THEME_DEFAULT_LAYOUTS: Record<Slide["type"], readonly string[]> = {
  cover: fullLayoutSet("cover"),
  chapter: fullLayoutSet("chapter"),
  content: fullLayoutSet("content"),
  ending: fullLayoutSet("ending"),
}

/**
 * Built-ins compile from the same declarative face model as public complete
 * themes. Their declaration type additionally permits internal constructor
 * metadata that public files cannot express.
 */
function compileBuiltinTheme(file: BuiltinThemeDeclaration): ThemeDefinition {
  const layouts: ThemeDefinition["layouts"] = {
    cover: file.faces.cover.map(faceId),
    chapter: file.faces.chapter.map(faceId),
    content: file.faces.content.map(faceId),
    ending: file.faces.ending.map(faceId),
  }
  return {
    id: file.id,
    label: file.label,
    style: file.style,
    brand: file.brand ?? {},
    tags: file.occasions ?? [],
    occasions: file.occasions,
    identity: file.identity,
    layouts,
    faces: file.faces,
    motif: file.motif?.id,
    motifParameters: file.motif?.params,
    layoutTendencies: file.tendencies,
    sparseLayouts: file.sparse,
  }
}

/** The sparse vocabulary is shared with validation and gallery speech. */
export { SPARSE_LAYOUT_IDS } from "./schema"

export const THEME_DEFINITIONS: Record<CanonicalThemeId, ThemeDefinition> = Object.fromEntries(
  CANONICAL_THEME_IDS.map((id) => [id, compileBuiltinTheme(BUILTIN_THEME_FILES[id])]),
) as Record<CanonicalThemeId, ThemeDefinition>

/** Theme brand config + optional IR-level override (shallow merge, override wins). */
export function resolveBrand(id: string, override?: BrandConfig): BrandConfig {
  const base = getThemeDefinition(id).brand
  return override ? { ...base, ...override } : base
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

const REGISTERABLE_SLIDE_TYPES: readonly Slide["type"][] = ["cover", "chapter", "content", "ending"]

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

/**
 * `registerTheme`'s input shape (W4, spec §3 "缺省 = 全集"): identical to
 * {@link ThemeDefinition} except `layouts` is optional, and — when present —
 * each of its four slide-type entries is independently optional too. A
 * slide type this theme doesn't narrow (its own key omitted, or the whole
 * `layouts` object omitted) defaults to that type's full registered-
 * layout set ({@link fullLayoutSet}). Public complete files cannot reach
 * this legacy fallback because their schema requires all four face pools.
 * `getThemeDefinition`/`REGISTERED_THEMES` still only ever
 * hold the fully-resolved `ThemeDefinition` shape (`layouts` total over all
 * four types) — `registerTheme` performs the defaulting once, here, so
 * every downstream reader (`resolveLayoutId` foremost) can keep assuming
 * a total record and never re-derive "was this slide type curated or
 * defaulted".
 */
export type ThemeRegistration = Omit<ThemeDefinition, "layouts"> & {
  layouts?: Partial<Record<Slide["type"], readonly string[]>>
}

function faceId(face: FaceReference): string {
  return typeof face === "string" ? face : face.id
}

function facesFromLayouts(layouts: ThemeDefinition["layouts"]): ThemeDefinition["faces"] {
  return {
    cover: [...layouts.cover],
    chapter: [...layouts.chapter],
    content: [...layouts.content],
    ending: [...layouts.ending],
  }
}

function isVersionedThemeFile(value: ThemeRegistration | ThemeFile): boolean {
  return typeof value === "object" && value !== null && Object.hasOwn(value, "version")
}

function parseVersionedThemeFile(value: ThemeRegistration | ThemeFile): ThemeFile {
  const result = ThemeFileSchema.safeParse(value)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")
    throw new PptwiseError(`invalid theme definition:\n${detail}`)
  }
  return result.data as ThemeFile
}

/** Compile the public declaration into the total internal shape consumed by
 * layout, motif, brand, and sparse selection. */
function compileThemeFile(file: ThemeFile): ThemeRegistration {
  if ("base" in file) {
    const base = THEME_DEFINITIONS[file.base]
    const style: StyleTokens = {
      ...file.style,
      id: file.base,
      ...(base.style.shape?.cover
        ? { shape: { ...file.style.shape, cover: base.style.shape.cover } }
        : {}),
    }
    return {
      id: file.id,
      label: file.label,
      // Component forms, emphasis treatments, and sparse boarded faces use
      // ComponentCtx.themeId, which is sourced from StyleTokens.id. Keep the
      // public file id for registration, but dispatch those structural tables
      // through the declared base so partial truly inherits all structure.
      style,
      brand: { ...base.brand, ...file.brand },
      tags: file.occasions ?? base.tags,
      occasions: file.occasions ?? base.occasions,
      identity: file.identity ?? base.identity,
      layouts: base.layouts,
      faces: base.faces ?? facesFromLayouts(base.layouts),
      motif: base.motif,
      motifParameters: base.motifParameters,
      layoutTendencies: base.layoutTendencies,
      sparseLayouts: base.sparseLayouts,
    }
  }

  const faces = file.faces
  return {
    id: file.id,
    label: file.label,
    style: file.style,
    brand: file.brand ?? {},
    tags: file.occasions ?? [],
    occasions: file.occasions,
    identity: file.identity,
    layouts: {
      cover: faces.cover.map(faceId),
      chapter: faces.chapter.map(faceId),
      content: faces.content.map(faceId),
      ending: faces.ending.map(faceId),
    },
    faces,
    motif: file.motif?.id,
    motifParameters: file.motif?.params,
    layoutTendencies: file.tendencies,
    sparseLayouts: file.sparse,
  }
}

/**
 * Register a theme at runtime (SDK seam, not the v0.4 distribution
 * protocol). Validates just enough to keep the render chain from silently
 * breaking on a malformed registration — not a full schema:
 *
 * - `id` must not collide with a builtin or an already-registered theme.
 * - each of the four slide types, once defaulted ({@link ThemeRegistration}),
 *   must have at least one layout id that is both registered in
 *   `LAYOUT_REGISTRY` and valid for that slide type (the same registry
 *   `resolveLayoutId`/`FullSlideSvg` select from. A theme never ships
 *   new render code, only a curated subset of the existing 130 standard
 *   layouts, per `docs/architecture.md`'s "Adding a theme" section. An
 *   *explicit* empty array for a slide type still fails this check (the
 *   default only kicks in when the key — or `layouts` itself — is omitted
 *   entirely, `undefined`, never for a caller-supplied `[]`).
 * - `style` must be present (a JS caller can bypass the TS type).
 * - `style.colors.text`/`style.colors.muted` must each clear the
 *   {@link CONTRAST_FLOOR} against a {@link CONTRAST_CHECKED_SLIDE_TYPES}
 *   slide type's own resolved default background — see
 *   {@link assertContrastFloor}'s own doc comment.
 * - `sparseLayouts`, when present, may be empty (offers none) or a list of
 *   {@link SPARSE_LAYOUT_IDS} members. A listed non-sparse id throws. The
 *   field is not defaulted when omitted (`undefined` = offer all six).
 *
 * Also `console.warn`s (never throws) once for each of `style.fonts.heading`/
 * `style.fonts.body` that resolves to a face with no exact width table — see
 * {@link warnUnmeasuredFace}'s own doc comment. Fires only for a
 * registration that clears every check above (i.e. one that is actually
 * about to succeed).
 *
 * Once registered, the theme participates in `getInstalledThemeIds`,
 * `getThemeDefinition` (hence `layout-selection.ts`/`FullSlideSvg`'s
 * selection and `resolveBrand`), and `themes/index.ts`'s `resolveStyle` —
 * every internal theme lookup, with no separate "registered theme" branch
 * for callers to remember.
 */
export function registerTheme(input: ThemeRegistration | ThemeFile): void {
  const fromThemeFile = isVersionedThemeFile(input)
  const def = fromThemeFile ? compileThemeFile(parseVersionedThemeFile(input)) : (input as ThemeRegistration)
  if ((CANONICAL_THEME_IDS as readonly string[]).includes(def.id) || REGISTERED_THEMES.has(def.id)) {
    throw new PptwiseError(`theme "${def.id}" is already installed`)
  }
  if (!def.style) {
    throw new PptwiseError(`theme "${def.id}" is missing style tokens`)
  }
  assertContrastFloor(def.id, def.style)
  const layouts = {} as Record<Slide["type"], readonly string[]>
  for (const slideType of REGISTERABLE_SLIDE_TYPES) {
    const ids = def.layouts?.[slideType] ?? REGISTERED_THEME_DEFAULT_LAYOUTS[slideType]
    if (ids.length === 0) {
      throw new PptwiseError(`theme "${def.id}" must declare at least one layout for "${slideType}" slides`)
    }
    for (const [index, id] of ids.entries()) {
      const layout = getLayout(id)
      const pathRoot = fromThemeFile ? `faces.${slideType}` : `layouts.${slideType}`
      if (!layout) {
        throw new PptwiseError(`theme "${def.id}" ${pathRoot} references unknown layout id "${id}"`)
      }
      // Curated sets feed the auto-selection path, which assumes layout ids
      // only — a takeover id here would crash at render (undefined component).
      if (layout.kind !== "archetype") {
        throw new PptwiseError(
          `theme "${def.id}" ${pathRoot}: "${id}" is a ${layout.kind} layout. Curated sets may only contain archetype layouts`,
        )
      }
      if (!layout.slideTypes.includes(slideType)) {
        throw new PptwiseError(
          `theme "${def.id}" ${pathRoot}: layout "${id}" is not valid for "${slideType}" slides`,
        )
      }
      const face = def.faces?.[slideType]?.[index]
      const capacity = typeof face === "string" ? undefined : face?.params?.capacity
      if (capacity) {
        const slot = layout.slots.find((candidate) => candidate.name === capacity.slot)
        if (!slot) {
          throw new PptwiseError(
            `theme "${def.id}" faces.${slideType}.${index}.params.capacity references unknown slot "${capacity.slot}" on layout "${id}"`,
          )
        }
        if (slot.capacity === undefined) {
          throw new PptwiseError(
            `theme "${def.id}" faces.${slideType}.${index}.params.capacity cannot adapt slot "${capacity.slot}" on layout "${id}" because the registry declares no capacity`,
          )
        }
        if (capacity.max > slot.capacity) {
          throw new PptwiseError(
            `theme "${def.id}" faces.${slideType}.${index}.params.capacity.max is ${capacity.max}, above layout "${id}" slot "${capacity.slot}" capacity ${slot.capacity}`,
          )
        }
      }
    }
    layouts[slideType] = ids
  }
  // `layoutTendencies` consistency (theme-structure wave, task T1): a
  // declared id that isn't also a member of this same slide type's
  // just-resolved `layouts` set can never be scored by `weightOf`
  // (`layout-selection.ts`'s pool is built from `layouts[slideType]` before
  // any tendency is consulted) — it would silently do nothing forever, the
  // exact "theme author mistake" `ThemeDefinition.layoutTendencies`'s own
  // doc comment warns about. Caught here, at registration time, rather than
  // left to surface (or not) at render time.
  for (const slideType of REGISTERABLE_SLIDE_TYPES) {
    const tendencyIds = def.layoutTendencies?.[slideType]
    if (!tendencyIds) continue
    for (const id of tendencyIds) {
      if (!layouts[slideType].includes(id)) {
        throw new PptwiseError(
          `theme "${def.id}" layoutTendencies.${slideType} references "${id}", which is not in this theme's own layouts.${slideType} set — a tendency must name an id already in the theme's curated pool`,
        )
      }
    }
  }
  // Offer table for explicit sparse pins, not an auto-pick pool. A listed
  // id must be one of the six sparse climax layouts. It does not have to
  // sit in `layouts[slideType]` (those pools exclude pinOnly members).
  // Empty array is legal (offers none). Omitted stays undefined — do not
  // default it to an array, `getThemeDefinition` round-trips the
  // registration object.
  if (def.sparseLayouts !== undefined) {
    for (const id of def.sparseLayouts) {
      if (!(SPARSE_LAYOUT_IDS as readonly string[]).includes(id)) {
        throw new PptwiseError(
          `theme "${def.id}" sparseLayouts references "${id}", which is not a sparse climax layout — allowed: ${SPARSE_LAYOUT_IDS.join(", ")}`,
        )
      }
    }
  }
  // Soft checks last, only once every hard check above has confirmed this
  // registration will actually succeed — a registration that goes on to
  // throw (bad layout id, etc.) never warns for an unrelated font choice.
  warnUnmeasuredFace(def.id, "heading", def.style.fonts.heading)
  warnUnmeasuredFace(def.id, "body", def.style.fonts.body)
  REGISTERED_THEMES.set(def.id, { ...def, layouts })
}

/** Every installed theme id: the 24 built-ins, then registered themes in registration order. */
export function getInstalledThemeIds(): readonly string[] {
  return [...CANONICAL_THEME_IDS, ...REGISTERED_THEMES.keys()]
}

/**
 * Resolve a theme id to its full definition — a registered theme first, then
 * the builtin fallback (`THEME_DEFINITIONS[resolveThemeId(id)]`, which itself
 * folds an unrecognized id to consulting). The one lookup every internal
 * consumer that used to read `THEME_DEFINITIONS[resolveThemeId(id)]`
 * directly (`layout-selection.ts`, `full-slide-svg.tsx`) now calls instead, so
 * a registered theme's curated layouts actually drive selection end-to-end.
 */
export function getThemeDefinition(id: string): ThemeDefinition {
  return REGISTERED_THEMES.get(id) ?? THEME_DEFINITIONS[resolveThemeId(id)]
}

/**
 * Whether `themeId` is willing to honour an explicit pin of `layoutId` as a
 * sparse climax page. Reads the definition via {@link getThemeDefinition} so
 * a registered custom theme participates the same way as a builtin.
 *
 * - `layoutId` not in {@link SPARSE_LAYOUT_IDS}: `false`
 * - `sparseLayouts` omitted / `undefined`: `true` (offers all six)
 * - `sparseLayouts` is `[]`: `false`
 * - otherwise `sparseLayouts.includes(layoutId)`
 *
 * The only offer check. Do not put theme-id switches in renderers.
 */
export function themeOffersSparse(themeId: string, layoutId: string): boolean {
  if (!(SPARSE_LAYOUT_IDS as readonly string[]).includes(layoutId)) return false
  const offered = getThemeDefinition(themeId).sparseLayouts
  if (offered === undefined) return true
  return offered.includes(layoutId)
}

/**
 * Strip an unoffered sparse pin to `undefined` so `resolveLayoutId`'s pin
 * short-circuit does not fire and auto-pick runs on the ordinary content /
 * chapter pool. Non-sparse pins (including takeovers) and offered sparse
 * pins pass through unchanged. Shared by `resolveOneEffectiveLayoutId` and
 * `FullSlideSvg`'s `resolvePageLayout` wrapper so validate and render cannot
 * drift. Not exported from `src/index.ts`.
 */
export function effectiveRequestedLayout(themeId: string, requested: string | undefined): string | undefined {
  if (
    requested !== undefined &&
    (SPARSE_LAYOUT_IDS as readonly string[]).includes(requested) &&
    !themeOffersSparse(themeId, requested)
  ) {
    return undefined
  }
  return requested
}

/**
 * Test-only: clear every registered theme. Deliberately not exported from
 * `src/index.ts` (the public SDK barrel) — a `__`-prefixed, clearly
 * test-only name signals the same at the call site.
 */
export function __resetRegisteredThemes(): void {
  REGISTERED_THEMES.clear()
}
