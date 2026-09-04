/**
 * Deck spec schema and validation. A spec binds one theme, then names the
 * semantic kind of each content page. It never stores render selection state.
 * This module stays pure and Node-free so it remains inside `src/index.ts`'s
 * browser-safe dependency closure.
 */
import { z } from "zod"
import { PptwiseError } from "../errors"
import {
  BrandSchema,
  COMPONENT_TYPES,
  DeckBrandingSchema,
  KIND_VALUES,
  MetaSchema,
  NarrativeProfileInputSchema,
  THEME_ID_CONSTRAINT,
  THEME_ID_PATTERN,
  THEME_REQUIRED_MESSAGE,
  themeIssueMessage,
} from "../ir"
import { normalizeDeckRootAliases } from "../ir/field-aliases"
import {
  normalizeNarrativeShape,
  resolveNarrative,
  type NarrativeProfile,
  type Pacing,
} from "../narrative"
import { CAPACITY } from "../audit/capacity"
import { type SlideType } from "../layouts/registry"
import { offeredContentKinds, resolveLayoutId } from "../render/layout-selection"
import { getInstalledThemeIds, getThemeDefinition } from "../themes/definitions"

// ── schema ───────────────────────────────────────────────────────────────

export type PageSpecType = SlideType
export type PageKind = (typeof KIND_VALUES)[number]

/**
 * Every page locks its id, type, and heading. Content pages additionally lock
 * a semantic `kind`, which must be offered by the bound theme menu. `focus`
 * and `summary` remain optional authoring hints.
 */
const CommonPageSpecFields = {
  id: z.string(),
  heading: z.string(),
  /** Optional authoring hint pointing fill at a preferred content kind or component type, not a face. */
  focus: z.string().optional(),
  /** Free-text content anchor read by the fill step. */
  summary: z.string().optional(),
}

export const PageSpecSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cover"), ...CommonPageSpecFields }).strict(),
  z.object({ type: z.literal("chapter"), ...CommonPageSpecFields }).strict(),
  z
    .object({
      type: z.literal("content"),
      kind: z.enum(KIND_VALUES),
      ...CommonPageSpecFields,
    })
    .strict(),
  z.object({ type: z.literal("ending"), ...CommonPageSpecFields }).strict(),
])

export type PageSpec = z.infer<typeof PageSpecSchema>

/**
 * Top-level deck spec shape. Narrative defaults are resolved by validation
 * and assembly without being written back into the parsed spec. Theme is
 * required. The spec version is independent from the IR version.
 */
export const DeckSpecSchema = z
  .object({
    version: z.literal("1").default("1"),
    // Same open-schema/closed-semantic split as PptxIRSchema's `narrative`
    // field — see `NarrativeProfileInputSchema`'s doc comment in `ir/index.ts`
    // for the full rationale (reused verbatim here, not redefined, so the
    // two can't drift apart). Field renamed from `scenario` to `narrative`
    // this task (spec §8.1's `DeckPlan`→`DeckSpec` rename, task 2) — its
    // *value* was already in the new strategy/pacing vocabulary as of task 1
    // (vocabulary-v4 rename) — `resolveNarrative` below is what actually
    // enforces that.
    narrative: z.union([z.string(), NarrativeProfileInputSchema]).optional(),
    theme: z
      .string({
        error: (iss) => (iss.input === undefined ? THEME_REQUIRED_MESSAGE : undefined),
      })
      .regex(THEME_ID_PATTERN, THEME_ID_CONSTRAINT),
    filename: z.string().optional(),
    meta: MetaSchema.default({}),
    /** Deck logo placement — reused verbatim from the IR's own `brand` field
     *  (`BrandSchema`, `../ir`) so the deck spec and IR can't drift apart on
     *  shape, same pattern as `meta` just above. Unlike `meta`, no
     *  `.default({})`: IR's own `brand` field is a bare `.optional()` with no
     *  default either (`undefined` means "no brand", not "an empty brand
     *  object") — consumed by `Branding` (`src/render/branding.tsx`) for
     *  the deck's logo image and corner position. */
    brand: BrandSchema.optional(),
    /**
     * Where the brand footer and logo appear — reused verbatim from the IR's
     * own `branding` field (`DeckBrandingSchema`, `../ir`) so the spec and IR
     * cannot drift. Optional, no default: omitted stays unset and assemble
     * does not write `"cover-only"` into the IR. The renderer treats that
     * as `"cover-only"`. Omitted by default. Write `"full"` only when every
     * content page needs the brand footer. `"full"` also paints confidentiality
     * and date on cover and ending meta rows. A silent menu entry can suppress
     * branding for its own page.
     */
    branding: DeckBrandingSchema.optional(),
    pages: z.array(PageSpecSchema),
  })
  .strict()

export type DeckSpec = z.infer<typeof DeckSpecSchema>

/** JSON Schema for the deck spec — feed this to a model before it writes one (see `pptwise schema --spec`). */
export function specJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(DeckSpecSchema) as Record<string, unknown>
}

// ── result / issue types ────────────────────────────────────────────────

export interface SpecValidationIssue {
  path: string
  message: string
  /** The offending page's `id`, when the issue is scoped to one specific
   *  page and that page's `id` could be determined — absent for deck-level
   *  issues (e.g. "pages non-empty") and for structural issues on a page
   *  whose own `id` itself failed to parse. */
  pageId?: string
}

export interface SpecValidateResult {
  ok: boolean
  spec?: DeckSpec
  errors: SpecValidationIssue[]
  /** Editorial advisories never change `ok`. */
  warnings?: SpecValidationIssue[]
  /**
   * Same shape and channel as `ValidateResult.normalized` (`../validate-core.ts`)
   * — human-readable `path: alias → canonical`-style rewrite entries for every
   * deterministic pre-parse rewrite `validateSpec` applied before parsing.
   * Sources: `normalizeDeckRootAliases` (identity, no current root aliases) and
   * `normalizeNarrativeShape` (`../narrative`, T0b fix 2): a top-level
   * `narrative: {id: "<preset>"}` shape rewritten to the bare preset string.
   * Present only when at least one rewrite happened; informational, never
   * gates `ok` on its own.
   * `cli/commands.ts`'s `runSpecValidate` prints this through the same
   * `normalizedNote` helper `runValidate`/`runRender` already use for the
   * bare-IR path's own component field-alias notes.
   */
  normalized?: string[]
}

export function formatSpecIssues(errors: SpecValidationIssue[]): string {
  return errors.map((e) => (e.pageId ? `page "${e.pageId}" — ${e.path}: ${e.message}` : `${e.path}: ${e.message}`)).join("\n")
}

/**
 * `"invalid spec (N issue[s]):\n<formatted issues>"` — the exact
 * {@link PptwiseError} message both `runSpecValidate` (`src/cli/commands.ts`)
 * and {@link assembleDeck}'s (`./assemble.ts`) step 1 throw on a failed
 * {@link validateSpec} call. Extracted here instead of duplicated verbatim at
 * each call site so the two can't drift on wording — reuses
 * {@link formatSpecIssues} for the per-issue body.
 */
export function formatInvalidSpecError(errors: SpecValidationIssue[]): string {
  return `invalid spec (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n${formatSpecIssues(errors)}`
}

/**
 * Bound theme id on a validated spec. Theme is required. There is no
 * brief fallback.
 */
export function resolveSpecThemeId(spec: DeckSpec): string {
  return spec.theme
}

// ── hard gate: pages non-empty ──────────────────────────────────────────

function checkPagesNonEmpty(spec: DeckSpec): SpecValidationIssue[] {
  if (spec.pages.length > 0) return []
  return [{ path: "pages", message: "spec has no pages — a spec needs at least a cover page and an ending page" }]
}

// ── hard gate: boundary types ───────────────────────────────────────────

/**
 * Structural boundary gate (spec §5): the deck must open on a cover page and
 * close on an ending page, and no interior page may claim either type —
 * cover/ending are reserved for the two boundary positions. `content` and
 * `chapter` are both legal interior types. Called only when `spec.pages` is non-empty
 * (see {@link validateSpec}) — on a single-page spec `first`/`last` are the
 * same page and both checks run against it independently, so a lone page
 * that is neither cover nor ending reports both violations.
 */
function checkBoundaryTypes(spec: DeckSpec): SpecValidationIssue[] {
  const { pages } = spec
  const errors: SpecValidationIssue[] = []
  const first = pages[0]!
  const last = pages[pages.length - 1]!
  if (first.type !== "cover") {
    errors.push({
      path: "pages.0.type",
      pageId: first.id,
      message: `first page must be type "cover" (got "${first.type}") — a spec must open with a cover page`,
    })
  }
  if (last.type !== "ending") {
    errors.push({
      path: `pages.${pages.length - 1}.type`,
      pageId: last.id,
      message: `last page must be type "ending" (got "${last.type}") — a spec must close with an ending page`,
    })
  }
  for (let i = 1; i < pages.length - 1; i++) {
    const page = pages[i]!
    if (page.type === "cover" || page.type === "ending") {
      errors.push({
        path: `pages.${i}.type`,
        pageId: page.id,
        message: `page "${page.id}" is type "${page.type}", only allowed as the first (cover) or last (ending) page — use "content" or "chapter" for interior pages`,
      })
    }
  }
  return errors
}

// ── hard gate: page id required + unique ────────────────────────────────

/**
 * Path-traversal-safety check (CWE-22 defense-in-depth, W5 whole-branch
 * review finding 1) on a spec-authored page id — this id becomes `slide.id`
 * at assemble time ({@link buildSlide} in `./assemble.ts`, step 5) and, from
 * there, a `pages/<id>.json` / `assets/<id><ext>` file name if the resulting
 * IR is ever disassembled again (`runDisassemble`'s page write and
 * `writeOneAsset`, both via `assertSafeFileSegment` in `../cli/deck-dir.ts`
 * — the actual write-time gates, and the only checks that matter for
 * *every* id regardless of provenance, since a hand-authored bare IR skips
 * this module entirely). Rejecting an unsafe id here too, at spec-validation
 * time, is pure defense-in-depth: it means a spec-authored id is already
 * safe by the time it could ever reach either sink.
 *
 * This module stays Node-free (`AGENTS.md`'s layout rule, this file's own
 * top comment), so the check is duplicated as plain string logic instead of
 * importing `assertSafeFileSegment` itself (which needs `node:path`'s
 * `resolve`/`relative`) — same "duplicate a few lines rather than pull a
 * Node-touching module into this closure" call {@link specHeadingLength}'s
 * own doc comment makes just above. A single trailing path segment can only
 * ever escape whatever directory it is joined under if it is itself
 * absolute, contains a `/`/`\` separator, or is exactly `".."` —
 * `assertSafeFileSegment`'s own doc comment walks through why those lexical
 * checks alone are already sufficient (it additionally cross-checks via
 * `resolve`/`relative` as belt-and-suspenders, not because the lexical
 * checks alone fall short). Keep in sync with `assertSafeFileSegment` if
 * either check's rules ever change.
 */
function isUnsafePageId(id: string): boolean {
  return id.includes("/") || id.includes("\\") || id === ".."
}

/**
 * `id` is required at the schema level (`PageSpecSchema.id: z.string()`, no
 * `.optional()`) so a missing key is already a structural error by the time
 * this runs — what remains to check here is (a) an empty/whitespace-only
 * string, which the schema's plain `z.string()` lets through, (b) a value
 * unsafe to use as a page/asset file name ({@link isUnsafePageId}, W5
 * whole-branch review finding 1), and (c) cross-page uniqueness, which no
 * per-page schema can express. Kebab-case is suggested by spec §5 but never
 * enforced ("kebab-case suggested, not required") — neither (a) nor (b)
 * narrows that: spaces, underscores, and uppercase all stay legal, only path
 * separators and a bare `".."` are not.
 */
function checkPageIds(spec: DeckSpec): SpecValidationIssue[] {
  const errors: SpecValidationIssue[] = []
  const seen = new Map<string, number[]>()
  spec.pages.forEach((page, i) => {
    if (page.id.trim() === "") {
      errors.push({ path: `pages.${i}.id`, message: `page ${i + 1} has an empty id — every page needs a non-empty, unique id` })
      return
    }
    if (isUnsafePageId(page.id)) {
      errors.push({
        path: `pages.${i}.id`,
        pageId: page.id,
        message: `page id "${page.id}" is not a safe file name — ids used as page/asset file names must not contain path separators or ".."`,
      })
      return
    }
    const indices = seen.get(page.id)
    if (indices) indices.push(i)
    else seen.set(page.id, [i])
  })
  for (const [id, indices] of seen) {
    if (indices.length < 2) continue
    errors.push({
      path: "pages",
      pageId: id,
      message: `duplicate page id "${id}" used by ${indices.length} pages (positions ${indices.map((i) => i + 1).join(", ")}) — page ids must be unique within a spec`,
    })
  }
  return errors
}

// ── hard gate: heading required + length ────────────────────────────────

/**
 * `CAPACITY.headingMaxChars` (`svg/audit/capacity.ts`) — the exact same 48
 * numeric source `ir-quality.ts`'s long-heading warning reads (see that
 * constant's own derivation comment there). Not re-derived here.
 */
const HEADING_MAX_CHARS = CAPACITY.headingMaxChars

/**
 * Character count for the heading-length gate — deliberately plain
 * `.length` (CJK characters count as 1 each), matching `ir-quality.ts`'s own
 * `charLen` helper's semantics exactly (that function's doc comment: "Count
 * characters. CJK characters count as 1 each (same as .length)") — not
 * `measureTextUnits`'s visual-width weighting, a different unit system used
 * elsewhere in this codebase for a different purpose (bullets budgets).
 * Duplicated rather than imported: `charLen` is a one-line function and
 * importing it would pull `ir-quality.ts`'s whole module graph
 * (`layout-selection.ts`, `svg-text-layout.ts`, ...) into this Node-free
 * package for a single line of logic. Keep in sync with `ir-quality.ts`'s
 * `charLen` if that one ever changes.
 */
function specHeadingLength(heading: string): number {
  return heading.length
}

function checkHeadings(spec: DeckSpec): SpecValidationIssue[] {
  const errors: SpecValidationIssue[] = []
  spec.pages.forEach((page, i) => {
    if (page.heading.trim() === "") {
      errors.push({ path: `pages.${i}.heading`, pageId: page.id, message: `page "${page.id}" is missing a required heading` })
      return
    }
    const length = specHeadingLength(page.heading)
    if (length > HEADING_MAX_CHARS) {
      errors.push({
        path: `pages.${i}.heading`,
        pageId: page.id,
        message: `page "${page.id}" heading is ${length} characters, exceeds the ${HEADING_MAX_CHARS}-character limit — tighten it into a short, assertive phrase`,
      })
    }
  })
  return errors
}

// ── hard gate: theme resolution ─────────────────────────────────────────

/**
 * Installed-theme check, same shape as `validateIr`'s own (`api.ts`) —
 * `theme` stays an open string at the schema layer (like IR's `theme.id`),
 * this hard gate is where an unknown id is actually rejected.
 */
function checkTheme(spec: DeckSpec): SpecValidationIssue[] {
  const themeId = resolveSpecThemeId(spec)
  const installed = getInstalledThemeIds()
  if (installed.includes(themeId)) return []
  const message =
    themeId === "bloom"
      ? 'theme id "bloom" was removed — current format uses an installed theme id (see `pptwise themes`)'
      : `unknown theme "${themeId}" — available: ${installed.join(", ")} (see \`pptwise themes\`)`
  return [{ path: "theme", message }]
}

// ── hard gate: focus vocabulary ─────────────────────────────────────────

/**
 * Focus vocabulary gate: `focus` is optional authoring guidance pointing a
 * later fill step at a preferred content kind or component type. Face ids
 * and layout ids are not authoring vocabulary. When present it must be one
 * of {@link KIND_VALUES} or {@link COMPONENT_TYPES}.
 */
function checkFocusVocabulary(spec: DeckSpec): SpecValidationIssue[] {
  const kinds: readonly string[] = KIND_VALUES
  const errors: SpecValidationIssue[] = []
  spec.pages.forEach((page, i) => {
    if (page.focus === undefined) return
    if (page.focus === "logo_wall") {
      errors.push({
        path: `pages.${i}.focus`,
        pageId: page.id,
        message: 'component type "logo_wall" is not in the current vocabulary — use "image_grid"',
      })
      return
    }
    if (page.focus === "banner-heading") {
      errors.push({
        path: `pages.${i}.focus`,
        pageId: page.id,
        message:
          '"banner-heading" is a face id, not authoring vocabulary — focus accepts a content kind or a component type',
      })
      return
    }
    if (kinds.includes(page.focus) || COMPONENT_TYPES.includes(page.focus)) {
      return
    }
    errors.push({
      path: `pages.${i}.focus`,
      pageId: page.id,
      message:
        `unknown focus "${page.focus}" — expected a content kind (${KIND_VALUES.join(", ")}) ` +
        `or a component type (${COMPONENT_TYPES.join(", ")})`,
    })
  })
  return errors
}

// ── theme-menu hard gate and kind-distribution advisory ─────────────────

function checkThemeMenuKinds(spec: DeckSpec): SpecValidationIssue[] {
  const menu = getThemeDefinition(resolveSpecThemeId(spec)).menu
  if (menu === undefined) {
    return [
      {
        path: "theme",
        message: `theme "${resolveSpecThemeId(spec)}" has no menu`,
      },
    ]
  }

  const offered = offeredContentKinds(menu)
  return spec.pages.flatMap((page, index) => {
    if (page.type !== "content" || resolveLayoutId("content", page.kind, menu) !== null) return []
    return [
      {
        path: `pages.${index}.kind`,
        pageId: page.id,
        message: `kind "${page.kind}" is not offered by theme "${resolveSpecThemeId(
          spec,
        )}". Available content kinds: ${offered.join(", ")}`,
      },
    ]
  })
}

/** Report each maximal run of three or more identical content-page kinds. */
function checkKindDistribution(spec: DeckSpec): SpecValidationIssue[] {
  const contentPages = spec.pages
    .map((page, index) => ({ page, index }))
    .filter(
      (
        entry,
      ): entry is {
        page: Extract<PageSpec, { type: "content" }>
        index: number
      } => entry.page.type === "content",
    )
  const warnings: SpecValidationIssue[] = []
  let start = 0
  while (start < contentPages.length) {
    let end = start + 1
    while (end < contentPages.length && contentPages[end]!.page.kind === contentPages[start]!.page.kind) end++
    if (end - start >= 3) {
      const run = contentPages.slice(start, end)
      warnings.push({
        path: "pages",
        pageId: run[0]!.page.id,
        message: `${run.length} consecutive content pages use kind "${run[0]!.page.kind}" (${run
          .map((entry) => entry.page.id)
          .join(", ")}). Vary the explanation pattern where the argument allows it`,
      })
    }
    start = end
  }
  return warnings
}

// ── hard gate: page count vs pacing ─────────────────────────────────────

/**
 * Deck-level page-count range per pacing (spec §5's pacing table,
 * initial values — "dense 8-30 / balanced 6-24 / spacious 4-16", not yet
 * tuned against real usage). Independent of `PACING_BUDGETS`
 * (`narrative/index.ts`, per-slide component-count/bullets editorial
 * budget) — this is a separate, deck-wide page-count concern the spec calls
 * out as its own hard gate ("page count vs. pacing recommended range").
 * Message wording renamed from "delivery" to "pacing" (vocabulary-v4
 * residual, routed from the task 1 review) — the axis itself was already
 * `Pacing` at the type level, this closes the last stale word in the
 * error text.
 */
export const SPEC_PAGE_COUNT_RANGE: Record<Pacing, { min: number; max: number }> = {
  dense: { min: 8, max: 30 },
  balanced: { min: 6, max: 24 },
  spacious: { min: 4, max: 16 },
}

function checkPageCount(spec: DeckSpec, pacing: Pacing): SpecValidationIssue[] {
  const { min, max } = SPEC_PAGE_COUNT_RANGE[pacing]
  const n = spec.pages.length
  if (n >= min && n <= max) return []
  return [
    {
      path: "pages",
      message: `spec has ${n} pages — "${pacing}" pacing expects ${min}-${max} pages, change pacing or add/remove pages`,
    },
  ]
}

// ── entry point ──────────────────────────────────────────────────────────

/** Best-effort page id lookup straight off the *raw* (pre-parse) input, used
 *  only for structural (zod) issues — the page that failed to parse may
 *  still have a readable `id` sitting right next to whatever field failed. */
function pageIdFromRawInput(input: unknown, index: number): string | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const pages = (input as Record<string, unknown>).pages
  if (!Array.isArray(pages)) return undefined
  const page = pages[index] as unknown
  if (typeof page !== "object" || page === null) return undefined
  const id = (page as Record<string, unknown>).id
  return typeof id === "string" ? id : undefined
}

/**
 * Parse raw JSON, then run isolated hard-gate categories in order. A hard
 * failure short-circuits later categories. Kind distribution runs last as an
 * editorial advisory and never changes `ok`.
 *
 * Before the schema parse, {@link normalizeNarrativeShape} (`../narrative`,
 * T0b fix 2 scope extension) runs on the raw input, exactly mirroring
 * `validateIr`'s own pre-parse pass (`../validate-core.ts`) — a top-level
 * `narrative: {id: "<preset>"}` shape is rewritten to the bare preset
 * string before `DeckSpecSchema.safeParse` ever sees it, so the correction
 * lands in the returned `spec` itself (read again by
 * `checkFocusVocabulary`/`checkPageCount` below, and by `runSpecValidate`'s
 * own OK-summary line, `../cli/commands.ts`), not just this function's own
 * local `resolveNarrative` call below. Every return path is wrapped in
 * `withNormalized` so the rewrite note (`SpecValidateResult.normalized`)
 * surfaces on success *or* failure, success or failure alike — same
 * "informational, never gates `ok`" contract `ValidateResult.normalized`
 * has.
 */
export function validateSpec(input: unknown): SpecValidateResult {
  const rootAliasPass = normalizeDeckRootAliases(input)
  const narrativeShapePass = normalizeNarrativeShape(rootAliasPass.value)
  const normalizedInput = narrativeShapePass.value
  const normalized = [...rootAliasPass.normalized, ...narrativeShapePass.normalized]
  const withNormalized = (result: SpecValidateResult): SpecValidateResult =>
    normalized.length > 0 ? { ...result, normalized } : result

  const r = DeckSpecSchema.safeParse(normalizedInput)
  if (!r.success) {
    const errors = r.error.issues.map((issue) => {
      const path = issue.path.join(".")
      const m = /^pages\.(\d+)/.exec(path)
      return {
        path,
        message: themeIssueMessage(path, issue.message, issue.input, issue.code),
        pageId: m ? pageIdFromRawInput(normalizedInput, Number(m[1])) : undefined,
      }
    })
    return withNormalized({ ok: false, errors })
  }
  const spec = r.data

  const emptyErrors = checkPagesNonEmpty(spec)
  if (emptyErrors.length > 0) return withNormalized({ ok: false, errors: emptyErrors })

  const boundaryErrors = checkBoundaryTypes(spec)
  if (boundaryErrors.length > 0) return withNormalized({ ok: false, errors: boundaryErrors })

  const idErrors = checkPageIds(spec)
  if (idErrors.length > 0) return withNormalized({ ok: false, errors: idErrors })

  const headingErrors = checkHeadings(spec)
  if (headingErrors.length > 0) return withNormalized({ ok: false, errors: headingErrors })

  const themeErrors = checkTheme(spec)
  if (themeErrors.length > 0) return withNormalized({ ok: false, errors: themeErrors })

  const menuErrors = checkThemeMenuKinds(spec)
  if (menuErrors.length > 0) return withNormalized({ ok: false, errors: menuErrors })

  // Narrative resolution (spec §5's defaults chain), same open-schema/
  // closed-semantic split as validateIr's own (api.ts) — see that
  // function's comment for the full rationale. `spec.narrative`'s inferred
  // type is wider than `resolveNarrative`'s parameter — safe to narrow here
  // because `resolveNarrative` validates every key/value itself at runtime.
  // When the input was an `{id}` shape, `spec.narrative` here already reads
  // as the rescued bare string (`normalizeNarrativeShape` rewrote it before
  // the schema parse above) — this call just resolves that string like any
  // other preset id. `resolveNarrative`'s own entry additionally tolerates
  // the unrescued `{id}` shape directly too (see its doc comment), so this
  // line stays correct even if some future caller of `resolveNarrative`
  // reaches it without going through a normalizeNarrativeShape pass first.
  let resolvedAxes: NarrativeProfile
  try {
    resolvedAxes = resolveNarrative(spec.narrative as string | Partial<NarrativeProfile> | undefined)
  } catch (err) {
    if (!(err instanceof PptwiseError)) throw err
    return withNormalized({ ok: false, errors: [{ path: "narrative", message: err.message }] })
  }

  const focusErrors = checkFocusVocabulary(spec)
  if (focusErrors.length > 0) return withNormalized({ ok: false, errors: focusErrors })

  const pageCountErrors = checkPageCount(spec, resolvedAxes.pacing)
  if (pageCountErrors.length > 0) return withNormalized({ ok: false, errors: pageCountErrors })

  const warnings = checkKindDistribution(spec)
  return withNormalized({
    ok: true,
    spec,
    errors: [],
    ...(warnings.length > 0 ? { warnings } : {}),
  })
}
