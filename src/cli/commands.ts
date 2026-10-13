import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"
import {
  formatIssues,
  formatWarnings,
  generatePptx,
  irJsonSchema,
  listThemes,
  renderSlideSvg,
  validateIr,
  type ValidationIssue,
} from "../api"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { PptwiseError } from "../errors"
import { VERSION } from "../version"
import type { PageKind, PptxIR } from "../ir"
import { compileThemeDefinition, THEME_DEFINITIONS, type ThemeDefinition } from "../themes/definitions"
import { componentJsonSchema } from "../ir/json-schema"
import { PPTX_ICON_NAMES } from "../icons/catalog"
import { kindJsonSchema } from "../kind-components"
import { disassembleDeck, type PageContent } from "../spec/assemble"
import { formatInvalidSpecError, specJsonSchema, resolveSpecThemeId, validateSpec, type DeckSpec, type SpecValidationIssue } from "../spec"
import { pageComponentContract, pageContract, pageIndex } from "../inspect/page-contract"
import { pageFit } from "../inspect/page-fit"
import { AUDIENCE_VALUES, PACING_BUDGETS, STRATEGY_DEFINITIONS, STRATEGY_VALUES, NARRATIVE_PRESETS, resolveNarrative, type NarrativeProfile } from "../narrative"
import { auditDeck, type AuditChecks, type AuditFinding, type AuditReport } from "../audit/deck-audit"
import { buildAssetBrief, type AssetBrief, type AssetBriefItem } from "../render/asset-brief"
import { dropPhrase, parseDropKind, type DropKind } from "../render/drop-marker"
import { resolveFontFace } from "../render/fonts"
import { extractBrandTheme, slugify } from "../themes/extract/brand-extract"
import { ThemeFileSchema, type Menu, type ThemeFile } from "../themes/schema"
import { OCCASION_VOCAB, THEME_OCCASIONS } from "../themes/occasions"
import { themeShortlist } from "../themes/select"
import { CANONICAL_THEME_IDS } from "../themes/index"
import { RETIRED_THEME_IDS, foldedThemeTarget } from "../themes/retired-ids"
import { LAYOUT_REGISTRY } from "../layouts/registry"
import { pageSignatureUse } from "../layouts/signature"
import { CONFIG_FILENAME, findConfig, findUserConfig } from "./config"
import {
  assertSafeFileSegment,
  isDeckDirectory,
  pathExists,
  readDeckDir,
  resolveDeckTarget,
  writeDeckAssets,
  ASSETS_DIRNAME,
  PAGES_DIRNAME,
  SPEC_FILENAME,
  THEME_FILENAME,
} from "./deck-dir"
import {
  formatPageComponentContract,
  formatPageContract,
  formatPageFitReport,
  type InspectFit,
  type PageFitReport,
} from "./inspect-format"
import { writeThemeFile } from "./theme-write"
import {
  assembleIssues,
  auditIssue,
  formatBuildReport,
  placeholderIssues,
  validateIssue,
  type BuildIssue,
  type BuildDrawnAs,
  type BuildThemeSource,
  type BuildReport,
  type BuildSignature,
  type BuildSignaturePage,
} from "./build-report"
import { readWrittenFor, writeWrittenFor } from "./written-for"
import { ALTERNATIVES_DIRNAME, writeBuildAlternatives } from "./build-alternatives"
import { loadIrFile, resolveLocalAssets } from "./load-ir"
import { buildContactSheetHtml, buildPreviewHtml, buildThemeWallHtml } from "./preview-html"
import {
  buildThemeWall,
  formatThemeWall,
  themeWallSkipNotes,
  themeWallContentPage,
  themeWallLang,
  THEME_WALL_MANIFEST_FILE,
  THEME_WALL_SHEET_FILE,
  type ThemeWallInput,
} from "./theme-wall"
import { buildPreviewManifest } from "./preview-manifest"
import {
  finalPptxName,
  prepareWorkspaceDir,
  pruneRenderedSvgs,
  removeFinalPptx,
  resolveWorkspaceLocation,
  scanWorkspaceAssets,
  type GitRunner,
} from "./workspace"
import {
  assertThemeId,
  deckThemeCandidates,
  lookupThemeName,
  readThemeFile,
  resolveThemeSelection,
  resolveThemeByName,
  themeNameFromUnknown,
  WORKSPACE_THEMES_DIRNAME,
  type ResolvedTheme,
} from "./theme-resolve"
import { damagedPackError, installedPackIds, packsRoot, readInstalledPack } from "./packs/store"
import {
  boundThemeName,
  collectThemeInputs,
  guardThemeRebind,
  sourceFromInputs,
  themeFromInputs,
  unreadThemeInputs,
  type ThemeInputs,
} from "./theme-inputs"
import { forkTheme } from "./theme-fork"
import { describePlacement, parseBrandOption, regenerateFromBrand } from "../themes/brand/brand-regen"
import { themeFileFromPreset } from "../themes/presets"
import { THEME_TRY_SAMPLE_IR } from "./fixtures/theme-try-sample"
import { offeredContentKinds, resolveEffectiveFace } from "../render/layout-selection"
import { resolveIrTheme } from "../themes/resolve-ir-theme"

/** `findUserConfig()`'s own return shape, named here so it can be threaded as
 *  a parameter (`loadDeckTarget`/`applyDeckConfig` below) instead of each
 *  callee re-fetching it — see `applyDeckConfig`'s own doc comment for why. */
type UserConfigHit = Awaited<ReturnType<typeof findUserConfig>>

/** `findConfig()`'s own return shape — the project-layer counterpart to
 *  {@link UserConfigHit}, threaded the same way and for the same reason. */
type ProjectConfigHit = Awaited<ReturnType<typeof findConfig>>

/**
 * Both config layers, read together and reported in one fixed order:
 * project first, then user. Each read settles on its own, so a failure is
 * never "whichever rejected first": one broken file is its own error, and
 * two broken files are one error naming both, project before user. The
 * message is what a build that fails here records as its theme inputs
 * (`unreadThemeInputs`, `./theme-inputs.ts`), and `pptwise serve` compares
 * that record with its next read of the same two files, so the same two
 * broken files have to read as the same failure every time.
 */
async function readConfigs(cwd: string): Promise<[ProjectConfigHit, UserConfigHit]> {
  const [project, user] = await Promise.allSettled([findConfig(cwd), findUserConfig()])
  const failures = [project, user].filter((r): r is PromiseRejectedResult => r.status === "rejected")
  if (failures.length === 1) throw failures[0]!.reason
  if (failures.length === 2) {
    const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
    throw new PptwiseError(failures.map((f) => message(f.reason)).join("\n"), { cause: failures[0]!.reason })
  }
  return [(project as PromiseFulfilledResult<ProjectConfigHit>).value, (user as PromiseFulfilledResult<UserConfigHit>).value]
}

/**
 * Resolve deck defaults onto the raw (pre-validation) IR from the theme
 * inputs the build has already read (`collectThemeInputs`,
 * `./theme-inputs.ts`), and return the bound theme as that record resolved
 * it: `definition` is the compiled theme every later step (`validateIr`,
 * `generatePptx`, `renderSlideSvg`, `auditDeck`, `buildAssetBrief`) takes
 * as its `theme` option. Reads nothing itself: an error the record holds
 * is thrown here as the build's own failure, and the rebind guard runs on
 * the deck-local `theme.json` as the record read it. Returns `undefined`
 * only when nothing named a theme, in which case `validateIr` reports the
 * missing binding itself. Selection authority is spec.theme (deck project)
 * or authored IR theme.id (bare file), which is what the record's `bound`
 * holds; assembled deck-dir IR always carries theme.id from the required
 * spec theme, and is never read for it here.
 */
export async function applyDeckConfig(raw: unknown, themeInputs: ThemeInputs): Promise<ResolvedTheme | undefined> {
  if (typeof raw !== "object" || raw === null) return undefined // schema error surfaces in validateIr
  const deck = raw as Record<string, unknown>
  const irTheme =
    typeof deck.theme === "object" && deck.theme !== null
      ? (deck.theme as Record<string, unknown>)
      : {}
  const resolved = themeFromInputs(themeInputs)
  if (resolved === undefined) return undefined
  guardThemeRebind(themeInputs.localTheme, resolved)
  // The deck carries the name it bound, not the id the lookup answered. The
  // two differ only for a folded name (arena resolves to rally), and
  // `validateIr` is where that is read as its target and said in a warning.
  deck.theme = {
    ...irTheme,
    id: boundThemeName(themeInputs) ?? resolved.id,
  }
  return resolved
}

/**
 * Shared "turn a CLI target argument into a raw IR-shaped object plus its
 * asset base directory" step for `runValidate`/`runRender`/`runPreview` (W5
 * task 5) — the one piece of logic those three commands would otherwise
 * triplicate. `arg` is resolved against the cwd (`resolveDeckTarget`), then
 * branches on whether the resolved target is a deck project directory:
 *
 * - directory → `readDeckDir` (assemble in memory — spec + pages/ + assets/,
 *   `./deck-dir.ts`), asset paths resolve against the deck directory itself.
 * - file → the pre-existing single-file path, byte-for-byte: the IR as the
 *   theme-input record read it (`loadIrFile`, one read per build), then the
 *   same `dirname(resolve(...))` asset base every caller already used.
 *
 * `isDir` is threaded back so `runValidate` can gate its dir-only placeholder
 * note on it (single-file mode must never grow that note, even for a
 * hand-authored IR that happens to set `placeholder: true` itself).
 *
 * `projectHit` is the caller's own already-fetched `findConfig(cwd)` result,
 * threaded rather than fetched here again.
 *
 * `themeInputs` is the record of every theme input this load read
 * (`collectThemeInputs`, `./theme-inputs.ts`), collected once the target is
 * located and before anything is assembled or parsed for rendering. The
 * resolved definition in it is what assembly validates the spec against,
 * and the record itself is what `applyDeckConfig` applies, so no later
 * step looks the theme up again: a build reads its theme inputs exactly
 * once, and what it reports having read is what it built with.
 *
 * `resolvedTarget` (serve wave, task S1) is the absolute path `target` itself
 * resolved to — the deck directory (`isDir: true`) or the single IR file
 * (`isDir: false`). `runRender`/`runPreview` use it as the slug source when
 * `-o` is omitted (workspace-artifacts wave). `buildDeckPreview` hands it to
 * `createServeServer` (`./serve.ts`) as the exact path to `fs.watch`, without
 * that module resolving the target a second time.
 */
function mergeWorkspaceImages(raw: unknown, extras: Record<string, { src: string }>): unknown {
  if (typeof raw !== "object" || raw === null) return raw
  const deck = raw as { assets?: { images?: Record<string, { src: string }> } }
  const existing = deck.assets?.images ?? {}
  return { ...deck, assets: { images: { ...extras, ...existing } } }
}

async function loadWorkspaceStock(
  cwd: string,
  projectHit: ProjectConfigHit,
  resolvedTarget: string,
  isDir: boolean,
): Promise<{ workspaceAssetsDir: string; images: Record<string, { src: string }> }> {
  const location = resolveWorkspaceLocation({
    cwd,
    projectConfigPath: projectHit?.path,
    target: resolvedTarget,
    isDir,
  })
  const workspaceAssetsDir = join(location.dir, ASSETS_DIRNAME)
  const images = await scanWorkspaceAssets(workspaceAssetsDir)
  return { workspaceAssetsDir, images }
}

/** Where `arg` resolved to: the deck project directory or the bare IR
 *  file, with the directory the theme lookup and rebind guard anchor at. */
export interface DeckLocation {
  resolvedTarget: string
  isDir: boolean
}

async function locateDeckTarget(arg: string, cwd: string): Promise<DeckLocation> {
  const target = await resolveDeckTarget(arg, cwd)
  if (await isDeckDirectory(target)) return { resolvedTarget: resolve(target), isDir: true }
  return { resolvedTarget: resolve(target), isDir: false }
}

/**
 * Where a build of `arg` would find it right now, located the way a build
 * locates it: both config layers read, then the target resolved. Throws
 * whatever that raises. `pptwise serve` (`./serve.ts`) starts watching
 * here before its first build, so a page saved while that build runs is
 * an event like any other.
 */
export async function locateDeck(arg: string, opts: { cwd?: string } = {}): Promise<DeckLocation> {
  const cwd = opts.cwd ?? process.cwd()
  await readConfigs(cwd)
  return locateDeckTarget(arg, cwd)
}

/**
 * The theme inputs a build of `arg` reads right now, collected the way a
 * build collects them and never thrown: a target that cannot be located
 * is recorded in the name's place ({@link unreadThemeInputs}). `pptwise
 * serve` (`./serve.ts`) asks this on a timer and compares the key with the
 * one its last build recorded.
 */
export async function collectDeckThemeInputs(arg: string, opts: { cwd?: string } = {}): Promise<ThemeInputs> {
  const cwd = opts.cwd ?? process.cwd()
  let location: DeckLocation
  try {
    location = await locateDeck(arg, { cwd })
  } catch (e) {
    return unreadThemeInputs(e)
  }
  return collectThemeInputs({ startDir: cwd, ...location })
}

interface LoadedDeckTarget {
  raw: unknown
  baseDir: string
  isDir: boolean
  resolvedTarget: string
  workspaceAssetsDir: string
  /** Where a picture the deck names but nobody supplied belongs, for
   *  validate to say so (`validateIr`'s `missingAssetPath`): a deck
   *  project's own `assets/`, an IR file's workspace `assets/`. */
  missingAssetPath: (assetId: string) => string
  themeInputs: ThemeInputs
  /** The deck project's spec as assembly parsed it. Absent for a bare IR file. */
  spec?: DeckSpec
}

/** The read half of {@link loadDeckTarget}, for a target already located
 *  and a theme-input record already collected: assembly (deck project) or
 *  the IR itself, both from the source the record read (`sourceFromInputs`,
 *  `./theme-inputs.ts`), never a second read of the file, with the record's
 *  theme definition handed to assembly so the spec is validated against
 *  the definition render will use. The one file this half reads for
 *  itself is a page or an asset, neither of which binds a theme. */
async function readDeckTarget(
  location: DeckLocation,
  themeInputs: ThemeInputs,
  cwd: string,
  projectHit: ProjectConfigHit,
  page?: string,
): Promise<LoadedDeckTarget> {
  const { resolvedTarget, isDir } = location
  const source = sourceFromInputs(themeInputs)
  if (isDir) {
    const theme = themeFromInputs(themeInputs)?.definition
    const { ir, spec, deckDir } = await readDeckDir(resolvedTarget, { theme, spec: source, ...(page !== undefined ? { page } : {}) })
    const stock = await loadWorkspaceStock(cwd, projectHit, deckDir, true)
    return {
      raw: mergeWorkspaceImages(ir, stock.images),
      baseDir: deckDir,
      isDir: true,
      resolvedTarget: deckDir,
      workspaceAssetsDir: stock.workspaceAssetsDir,
      missingAssetPath: assetPathIn(join(deckDir, ASSETS_DIRNAME), cwd),
      themeInputs,
      spec,
    }
  }
  const stock = await loadWorkspaceStock(cwd, projectHit, resolvedTarget, false)
  return {
    raw: mergeWorkspaceImages(source.parsed, stock.images),
    baseDir: dirname(resolvedTarget),
    isDir: false,
    resolvedTarget,
    workspaceAssetsDir: stock.workspaceAssetsDir,
    missingAssetPath: assetPathIn(stock.workspaceAssetsDir, cwd),
    themeInputs,
  }
}

/** The `filename` the deck itself sets: the spec's for a deck project, the
 *  raw file's own for an IR file. Never the IR schema's default, which
 *  assembly has already filled in for a deck project. */
function deckFilename(loaded: Pick<LoadedDeckTarget, "isDir" | "raw" | "spec">): unknown {
  if (loaded.isDir) return loaded.spec?.filename
  const raw = loaded.raw
  return typeof raw === "object" && raw !== null ? (raw as { filename?: unknown }).filename : undefined
}

/** `<dir>/<asset id>`, shown from `cwd` when it lies under it. */
function assetPathIn(dir: string, cwd: string): (assetId: string) => string {
  return (assetId) => {
    const path = join(dir, assetId)
    const rel = relative(resolve(cwd), path)
    return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel) ? rel : path
  }
}

async function loadDeckTarget(arg: string, cwd: string, projectHit: ProjectConfigHit): Promise<LoadedDeckTarget> {
  const location = await locateDeckTarget(arg, cwd)
  const themeInputs = await collectThemeInputs({ startDir: cwd, ...location })
  return readDeckTarget(location, themeInputs, cwd, projectHit)
}

/** Load, apply deck config, validate, and resolve local assets — the same
 *  sequence `runAssetBrief` uses, exported so `images generate` can read
 *  `suggested_prompt` without duplicating the chain. */
export async function loadValidatedDeckIr(
  target: string,
  cwd: string,
): Promise<{ ir: PptxIR; theme: ThemeDefinition | undefined }> {
  const [projectHit] = await readConfigs(cwd)
  const { raw, baseDir, workspaceAssetsDir, themeInputs, missingAssetPath } = await loadDeckTarget(target, cwd, projectHit)
  const theme = (await applyDeckConfig(raw, themeInputs))?.definition
  const v = validateIr(raw, { theme, missingAssetPath })
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  return { ir: v.ir!, theme }
}

export interface RenderOptions {
  /** `-o <file>`. Optional (workspace-artifacts wave): omitted, the deck
   *  renders to `<anchor>/.pptwise/<slug>/<slug>.pptx` — see
   *  {@link resolveWorkspaceLocation} (`./workspace.ts`) for how the anchor
   *  and slug are derived. A relative value resolves against `cwd`, and the
   *  workspace default is never consulted: an explicit path is always the
   *  final word, and nothing gets created or ignored on its behalf. */
  output?: string
  cwd?: string
  /** `--no-git-ignore` sets this false: skip the one-time
   *  `.git/info/exclude` line the workspace default would otherwise add
   *  (`prepareWorkspaceDir`, `./workspace.ts`). No effect when `-o` is given
   *  — that path never touches the workspace at all. */
  gitIgnore?: boolean
  /** Injectable git runner for tests. Production leaves this unset. */
  runGit?: GitRunner
  /** Skip the unfilled-placeholder-pages gate (W5 task 1) — see `generatePptx` in `../api`. */
  draft?: boolean
  /** Skip the content-drop gate — see `checkContentDropGate` in `../pptx/generate`. */
  allowDroppedContent?: boolean
}

/**
 * `irPath` accepts a single IR/spec JSON file, a deck project directory, or
 * a deck project directory (W5 task 5, `loadDeckTarget`
 * above) — directory input is assembled in memory first, then
 * follows the exact same validate → resolve-assets → generate pipeline a
 * single file always has. `--draft` threads through unchanged either way
 * (`generatePptx`'s own gate, W5 task 1) — a deck project's own placeholder
 * pages are exactly what that gate exists to catch. `--allow-dropped-content`
 * threads the same way for the sibling content-drop gate
 * (`checkContentDropGate`, `../pptx/generate`).
 *
 * Appends the same field-alias {@link normalizedNote} `runValidate` below
 * prints (W5 whole-branch review finding 3 — the README already claimed
 * `render` did this; it never actually threaded `v.normalized` through
 * until now), plus {@link warningsNote} (borrow wave, Task 2) whenever the
 * pre-flight `validateIr` call below returned warn-severity findings —
 * `generatePptx`'s own internal re-validate (`../api.ts`) follows the exact
 * same error-only severity rule, so this pre-flight check and the actual
 * generation it gates in step can never disagree on what counts as blocking.
 */
export async function runRender(irPath: string, opts: RenderOptions): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit] = await readConfigs(cwd)
  const loaded = await loadDeckTarget(irPath, cwd, projectHit)
  const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, themeInputs, missingAssetPath } = loaded
  const theme = (await applyDeckConfig(raw, themeInputs))?.definition
  const v = validateIr(raw, { theme, missingAssetPath, allowDroppedContent: opts.allowDroppedContent })
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const bytes = await generatePptx(v.ir!, {
    draft: opts.draft,
    allowDroppedContent: opts.allowDroppedContent,
    theme,
  })
  const extraNotes: string[] = []
  let output: string
  if (opts.output !== undefined) {
    output = resolve(cwd, opts.output)
    await mkdir(dirname(output), { recursive: true })
  } else {
    const location = resolveWorkspaceLocation({
      cwd,
      projectConfigPath: projectHit?.path,
      target: resolvedTarget,
      isDir,
    })
    extraNotes.push(...(await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })))
    output = join(location.dir, finalPptxName(deckFilename(loaded), location.name))
  }
  await writeFile(output, bytes)
  const ok = `wrote ${output} (${v.ir!.slides.length} slides, ${bytes.length} bytes)`
  const notes = [...extraNotes, warningsNote(v.warnings), normalizedNote(v.normalized)].filter(
    (n): n is string => n !== undefined,
  )
  return notes.length > 0 ? `${ok}\n${notes.join("\n")}` : ok
}

/**
 * `"note: N field alias(es) normalized\n  path: alias → canonical\n..."` —
 * the note line every one of `validateIr`'s callers appends after its own
 * success line when `ValidateResult.normalized` (`../api.ts`) is non-empty,
 * i.e. `validateIr` deterministically rewrote at least one synonym field
 * name before parsing (W5 task 4 — kpi `title`→`label` and friends,
 * `../ir/field-aliases.ts`). Extracted so `runRender`/`runPreview` (W5
 * whole-branch review finding 3 — the README already claimed `validate`
 * *and* `render` both printed this note — `render` never actually did, and
 * `preview` is folded in here too for the same reason) can append the exact
 * same note `runValidate` below has always printed, instead of each
 * re-deriving the formatting a second and third time. `undefined` when
 * nothing was normalized, the same "let the caller skip the line entirely"
 * shape {@link placeholderNote} below already uses.
 */
function normalizedNote(normalized: string[] | undefined): string | undefined {
  if (!normalized || normalized.length === 0) return undefined
  const n = normalized.length
  return `note: ${n} field alias${n === 1 ? "" : "es"} normalized\n${normalized.map((line) => `  ${line}`).join("\n")}`
}

/**
 * `"warning: page N — path: message"` block, one line per
 * {@link ValidateResult.warnings} entry (`../api.ts`, borrow wave Task 2's
 * dual-threshold severity split) — printed by `runValidate`/`runRender`
 * alongside their own success line whenever `validateIr` returned at least
 * one warn-severity finding. `undefined` when there are none, same
 * "let the caller skip the line entirely" shape {@link normalizedNote}
 * above and {@link placeholderNote} below both use. Exit code is
 * unaffected either way — a warning never turns a `runValidate`/`runRender`
 * call into a thrown `PptwiseError` (only `!v.ok`, i.e. an error-severity
 * finding, does that). This note is purely additive visibility.
 */
function warningsNote(warnings: ValidationIssue[] | undefined): string | undefined {
  if (!warnings || warnings.length === 0) return undefined
  return formatWarnings(warnings)
}

/**
 * Dir-mode-only informational note (W5 task 5, `runValidate` below): unlike
 * `generatePptx`'s draft gate (a hard error) or the content-quality gate
 * (which skips a placeholder's content rules entirely, `ir-quality.ts`), a
 * placeholder page is schema-valid and produces no validation issue on its
 * own — without this, a deck project with pages still unfilled would
 * validate silently "OK" with no signal anything is left to do. `undefined`
 * when there are none, so the caller can skip the note line entirely rather
 * than test its own string for emptiness.
 */
function placeholderNote(ir: PptxIR): string | undefined {
  const placeholders = ir.slides
    .map((slide, i) => ({ slide, page: i + 1 }))
    .filter(({ slide }) => slide.placeholder)
  if (placeholders.length === 0) return undefined
  const refs = placeholders
    .map(({ slide, page }) => (slide.id ? `${slide.id} (page ${page})` : `page ${page}`))
    .join(", ")
  return `note: ${placeholders.length} unfilled placeholder page${placeholders.length === 1 ? "" : "s"}: ${refs}`
}

/**
 * `irPath` accepts a single IR/spec JSON file or a deck project directory
 * (same `loadDeckTarget` resolution `runRender` uses).
 * Directory input additionally gets a {@link placeholderNote} —
 * gated on `isDir` specifically so single-file mode (including a
 * hand-authored IR that sets `placeholder: true` itself) never grows one,
 * keeping that path's output byte-identical to before this task.
 *
 * Returns human-readable report. Throws PptwiseError when invalid (CLI exit 1).
 * When `validateIr` deterministically rewrote any synonym field names before
 * parsing (W5 task 4 — kpi `title`→`label` and friends, `ir/field-aliases.ts`),
 * appends them as a "note" line after the OK summary: visible so the caller
 * knows their input got silently massaged, but never a reason to fail — a
 * fixed alias never makes it into `v.errors`.
 *
 * Borrow wave, Task 2 (dual-threshold severity): also appends
 * {@link warningsNote} whenever `validateIr` returned warn-severity
 * findings — printed as `"warning: ..."` lines, exit code 0 either way
 * (only `!v.ok`, above, throws). A deck can print `OK` and still carry
 * warnings — that combination is the point of the split, not a bug.
 *
 * Borrow wave, Task 2 follow-up (review finding, medium): also runs
 * `resolveLocalAssets` on `v.ir!`, same as `runRender`/`runAudit`/
 * `runPreview` already do — `validateIr` itself only sniffs already-inlined
 * `data:` URIs (`checkAssetBytes`, `../api.ts`'s own doc comment on why a
 * local file path is a different, Node-only ingestion form), so without
 * this a deck-dir referencing a corrupt local `.png` printed `OK` here while
 * `render` correctly rejected the exact same input right after — an
 * inconsistency with SKILL.md's Phase 3 contract, which treats `validate`
 * as the authoritative pre-flight check. `resolveLocalAssets` mutating
 * `v.ir!.assets.images[x].src` into a data URI as a side effect is harmless
 * here — nothing this function reads afterward (`slides.length`, `theme.id`,
 * `placeholderNote`) depends on `src` — so there was no reason to write a
 * separate check-only variant; reusing the exact same function guarantees
 * identical rejection semantics with `render` by construction, not by
 * keeping two copies of the same logic in sync by hand.
 */
export async function runValidate(
  irPath: string,
  cwd = process.cwd(),
): Promise<string> {
  const [projectHit] = await readConfigs(cwd)
  const { raw, baseDir, isDir, workspaceAssetsDir, themeInputs, missingAssetPath } = await loadDeckTarget(irPath, cwd, projectHit)
  const theme = (await applyDeckConfig(raw, themeInputs))?.definition
  const v = validateIr(raw, { theme, missingAssetPath })
  if (!v.ok)
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const ok = `OK — ${v.ir!.slides.length} slides, theme "${v.ir!.theme.id}"`
  const notes: string[] = []
  const warnNote = warningsNote(v.warnings)
  if (warnNote) notes.push(warnNote)
  const aliasNote = normalizedNote(v.normalized)
  if (aliasNote) notes.push(aliasNote)
  if (isDir) {
    const note = placeholderNote(v.ir!)
    if (note) notes.push(note)
  }
  return notes.length > 0 ? `${ok}\n${notes.join("\n")}` : ok
}

/**
 * `"page 3 (p-kpi): [low-contrast] ..."` — one line per {@link AuditFinding},
 * echoing `formatIssues`' own `"page N (id) — path: message"` convention
 * (`../api.ts`) with a bracketed `[code]` standing in for `path` — an
 * `AuditFinding` has no `path` (it is not a schema-location error, see that
 * interface's own doc comment in `../audit/deck-audit.ts`), and `code`
 * is the closest equivalent "what kind of problem" tag. The bracket keeps an
 * audit-finding line visually distinct from a validate-error line at a
 * glance, per the plan's own worked example.
 */
function formatAuditFinding(f: AuditFinding): string {
  const idSuffix = f.slideId !== undefined ? ` (${f.slideId})` : ""
  return `page ${f.page}${idSuffix}: [${f.code}] ${f.message}`
}

/**
 * Human-readable `pptwise audit` report (W6 task 2, spec §7 workflow ④):
 * every finding as its own {@link formatAuditFinding} line — already
 * naturally grouped by page, since `auditDeck` pushes findings in slide
 * order (`../audit/deck-audit.ts`) — followed by a trailing summary line
 * in the plan's own literal wording ("audited N pages, M skipped, K
 * findings") so an agent can read just the last line to decide whether to
 * keep iterating, instead of counting findings itself. {@link placeholderNote}
 * runs unconditionally (unlike `runValidate`'s dir-mode-only gating on that
 * same helper below) — audit has no pre-existing single-file-mode output to
 * keep byte-identical the way `runValidate` did when that gating was added,
 * so there is no reason to withhold a genuinely useful note from a
 * hand-authored IR that happens to carry placeholders too.
 *
 * `checks.pixels === "completed"` (audit-v2 phase B, i.e. `--pixels` was
 * passed) appends one more line — purely additive, gated on that exact
 * value so the far more common no-`--pixels` run stays byte-identical to
 * the wording pinned above (`checks.pixels` is `"not-requested"` there,
 * never `"completed"`). No line at all for the omitted case rather than an
 * explicit "not requested" note: the human already knows whether they
 * passed the flag, and the machine-readable `--json` path (never silent
 * about `checks` either way) is what an agent actually consumes to tell
 * "not checked" apart from "checked and clean".
 */
function formatAuditReport(report: AuditReport, ir: PptxIR): string {
  const lines = report.findings.map(formatAuditFinding)
  lines.push(
    `audited ${report.pagesAudited} page${report.pagesAudited === 1 ? "" : "s"}, ${report.pagesSkipped} skipped, ${report.findings.length} finding${report.findings.length === 1 ? "" : "s"}`,
  )
  if (report.checks.pixels === "completed") {
    lines.push("pixel-contrast check: completed")
  }
  const note = placeholderNote(ir)
  if (note) lines.push(note)
  return lines.join("\n")
}

export interface AuditOptions {
  json?: boolean
  cwd?: string
  /** `--pixels` (audit-v2 phase B, spec §4.3/§11.7): also run the optional
   *  pixel-contrast pass over image-backed text. Explicit opt-in only — see
   *  `auditDeck`'s own overload doc comment for why this is threaded as a
   *  ternary with a literal in each arm rather than passed straight through
   *  as `{ pixels: opts.pixels }` (a plain `boolean` doesn't match either
   *  overload). Missing rasterization capability or a remote asset
   *  reference makes this command fail loudly (a rejected `auditDeck`
   *  promise propagates straight out of this function, same as the
   *  existing invalid-IR `PptwiseError` path) rather than silently
   *  reporting a clean pixel check that never ran. */
  pixels?: boolean
}

export interface AuditCliResult {
  /** Human report ({@link formatAuditReport}) or, with `opts.json`, the raw
   *  `JSON.stringify`'d {@link AuditReport} verbatim — the plan's own "the
   *  full AuditReport" requirement, unmodified by any CLI-side enrichment. */
  output: string
  /** `true` when `report.findings.length > 0`. The CLI (`../cli.ts`) prints
   *  `output` either way, then exits 1 on this signal alone — clean exits 0
   *  (spec §7 workflow ④: advisory, not a hard gate, but still
   *  agent-judgeable purely from the exit code without parsing output). */
  hasFindings: boolean
}

/**
 * `pptwise audit <target> [--json]` (W6 task 2, spec §7 workflow ④): resolve
 * `target` through the exact same `loadDeckTarget` path `runValidate`/
 * `runRender`/`runPreview` already use (IR file / deck project directory /
 * deck project directory), validate first, then hand the
 * validated IR to `auditDeck` (`../audit/deck-audit.ts`, pure, no I/O).
 *
 * An invalid deck fails exactly like `pptwise validate` — same message
 * shape, same `PptwiseError` → CLI exit-1 path — and never reaches
 * `auditDeck` at all: the geometry/contrast/overlap checks only mean
 * anything over a schema-valid, already-quality-gated deck (`auditDeck`'s
 * own "advisory, not a hard gate" doc comment — `validateIr` is the hard
 * gate this command leans on rather than re-implements).
 *
 * `resolveLocalAssets` runs after validation, same as `runRender`/
 * `runPreview` — a deck referencing local (non-`data:`/non-`http(s)`) image
 * files must have them inlined before `auditDeck`'s internal `renderSlideSvg`
 * calls, otherwise a local asset's `src` would still be its raw relative
 * path when the contrast checker's background-region walk inspects it,
 * auditing a slide shape that doesn't match what `render`/`preview` actually
 * produce for the same deck.
 *
 * Theme selection is spec.theme or IR theme.id.
 */
export async function runAudit(target: string, opts: AuditOptions = {}): Promise<AuditCliResult> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit] = await readConfigs(cwd)
  const { raw, baseDir, workspaceAssetsDir, themeInputs, missingAssetPath } = await loadDeckTarget(target, cwd, projectHit)
  const theme = (await applyDeckConfig(raw, themeInputs))?.definition
  const v = validateIr(raw, { theme, missingAssetPath })
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const report = opts.pixels ? await auditDeck(v.ir!, { pixels: true, theme }) : auditDeck(v.ir!, { theme })
  const hasFindings = report.findings.length > 0
  const output = opts.json ? JSON.stringify(report, null, 2) : formatAuditReport(report, v.ir!)
  return { output, hasFindings }
}

// ── inspect ──────────────────────────────────────────────────────────────

export interface InspectOptions {
  /** The spec page id to inspect. Required. */
  page?: string
  /** Expand this one component for the page instead of the whole contract. */
  component?: string
  /** Draw the page and report whether its content fits, instead of the whole contract. */
  fit?: boolean
  /** Print the contract object as one line of JSON. */
  json?: boolean
  cwd?: string
}

export interface InspectCliResult {
  output: string
  /** True when the report carries an error. The CLI exits 1 on it. */
  failed: boolean
}

/**
 * `pptwise inspect <deck> --page <id> [--component <type> | --fit] [--json]`:
 * one page's fill contract (`../inspect/page-contract.ts`), one component of
 * it expanded with its schema, or the page drawn and checked for what it
 * loses (`../inspect/page-fit.ts`).
 *
 * The deck resolves the way `validate` resolves it: the same target lookup,
 * the same theme inputs, the same workspace stock images. Only the page's
 * own file is read, and every other page assembles as a placeholder
 * (`readDeckDir`'s `page` option), so the page answers the same way whether
 * the rest of the deck is finished, unwritten, or broken. Validation then
 * runs on that deck exactly as `validate` runs it, and the contract carries
 * the findings that land on this page or on the deck as a whole.
 */
export async function runInspect(target: string, opts: InspectOptions): Promise<InspectCliResult> {
  if (opts.page === undefined || opts.page.length === 0) {
    throw new PptwiseError("pass --page <id>: the id of one page in deck.spec.json")
  }
  if (opts.component !== undefined && opts.fit) throw new PptwiseError("pass --component or --fit, not both")
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit] = await readConfigs(cwd)
  const location = await locateDeckTarget(target, cwd)
  if (!location.isDir) {
    throw new PptwiseError(`pptwise inspect reads a deck project directory (deck.spec.json plus pages/), and ${target} is not one`)
  }
  assertSafeFileSegment(opts.page, "page id")
  const themeInputs = await collectThemeInputs({ startDir: cwd, ...location })
  const loaded = await readDeckTarget(location, themeInputs, cwd, projectHit, opts.page)
  const theme = (await applyDeckConfig(loaded.raw, themeInputs))?.definition
  if (theme === undefined) throw new PptwiseError(`${SPEC_FILENAME} binds no theme`)
  const ir = loaded.raw as PptxIR
  const validation = validateIr(ir, { theme, missingAssetPath: loaded.missingAssetPath })
  const pageSpec = loaded.spec?.pages.find((page) => page.id === opts.page)
  const contractOpts = { theme, validation, ...(pageSpec !== undefined ? { pageSpec } : {}) }
  if (opts.component !== undefined) {
    const expanded = pageComponentContract(ir, opts.page, opts.component, contractOpts)
    return { output: opts.json ? JSON.stringify(expanded) : formatPageComponentContract(expanded), failed: false }
  }
  const contract = pageContract(ir, opts.page, contractOpts)
  const file = `${PAGES_DIRNAME}/${opts.page}.json`
  if (opts.fit) {
    let fit: InspectFit
    if (!contract.page.filled) {
      fit = { checked: false, reason: "the page is not written yet" }
    } else if (!validation.ok) {
      fit = { checked: false, reason: "fix the page's validate errors first" }
    } else {
      // The input the export draws: the validated deck, local assets read in.
      await resolveLocalAssets(validation.ir!, loaded.baseDir, loaded.workspaceAssetsDir)
      fit = { checked: true, ...pageFit(validation.ir!, opts.page, { theme }) }
    }
    const report: PageFitReport = {
      page: { ...contract.page, file },
      errors: contract.errors,
      warnings: contract.warnings,
      fit,
    }
    return {
      output: opts.json ? JSON.stringify(report) : formatPageFitReport(report, contract.theme),
      failed: contract.errors.length > 0 || (fit.checked && !fit.fits),
    }
  }
  if (contract.signature !== undefined && contract.page.filled && validation.ok) {
    // Which drawing draws the page now: the page drawn as the export draws it.
    await resolveLocalAssets(validation.ir!, loaded.baseDir, loaded.workspaceAssetsDir)
    const index = pageIndex(validation.ir!, opts.page)
    const svg = renderSlideSvg(validation.ir!, index, { theme })
    // The page has a signature section, so its face offers drawings and the use is defined.
    contract.signature = { ...contract.signature, drawnBy: pageSignatureUse(validation.ir!, validation.ir!.slides[index]!, theme, svg)!.drawnBy }
  }
  const output = opts.json
    ? JSON.stringify({ ...contract, page: { ...contract.page, file } })
    : formatPageContract(contract, file)
  return { output, failed: contract.errors.length > 0 }
}

// ── asset-brief ──────────────────────────────────────────────────────────

/**
 * `"page 3 (p-kpi, content) — pic (missing): frame 613x307 @ (571,203), aspect
 * 2:1, cover ..."` — one block per {@link AssetBriefItem}, grouped naturally
 * by page order (`buildAssetBrief` pushes items in slide/document order, same
 * convention {@link formatAuditFinding} relies on for audit findings). A
 * `rendered: false` item prints without the frame/pixel lines (there is
 * nothing real to report — {@link buildAssetBrief}'s own doc comment) but
 * still gets its palette/mood/prompt lines, matching the brief's own "never
 * silently drop it" contract. A `shared` item (>=2 `image` components on the
 * page reference the same `asset_id`) gets an explicit "(shared by N image
 * slots, frame not attributable to one)" header suffix — this asset_id's
 * frames are real but which specific component each one belongs to cannot be
 * determined from the render (`buildAssetBrief`'s own doc comment), so the
 * report says so instead of implying a pairing it can't back up.
 */
function formatAssetBriefItem(item: AssetBriefItem): string {
  const idSuffix = item.page.id !== undefined ? `, ${item.page.id}` : ""
  const sharedSuffix = item.shared
    ? ` (shared by ${item.occurrenceCount} image slots, frame not attributable to one)`
    : ""
  const header = `page ${item.page.index + 1} (${item.page.type}${idSuffix}) — ${item.asset_id}${item.missing ? " (missing)" : ""}${item.rendered ? "" : " (not rendered under the selected layout)"}${sharedSuffix}`
  const lines = [header]
  if (item.frame && item.suggested_pixels) {
    lines.push(
      `  frame: ${item.frame.w}x${item.frame.h} @ (${item.frame.x},${item.frame.y}), aspect ${item.frame.aspect}, ${item.fit.mode}`,
    )
    lines.push(`  suggested pixels: ${item.suggested_pixels.w}x${item.suggested_pixels.h}`)
  }
  lines.push(`  fit: ${item.fit.note}`)
  lines.push(`  palette: primary ${item.palette.primary}, accent ${item.palette.accent} (${item.palette.hexes.join(", ")})`)
  lines.push(`  mood: ${item.mood.description}`)
  lines.push(`  prompt: ${item.suggested_prompt}`)
  return lines.join("\n")
}

/**
 * Human-readable `pptwise asset-brief` report (asset-brief plan, task 1):
 * one {@link formatAssetBriefItem} block per image slot, followed by a
 * trailing summary line in the same "read just the last line" spirit
 * {@link formatAuditReport} already established for `audit`.
 */
function formatAssetBriefReport(brief: AssetBrief): string {
  if (brief.items.length === 0) return `no image components found for theme "${brief.theme}"`
  const missingCount = brief.items.filter((i) => i.missing).length
  const notRenderedCount = brief.items.filter((i) => !i.rendered).length
  const lines = brief.items.map(formatAssetBriefItem)
  lines.push(
    `${brief.items.length} image slot${brief.items.length === 1 ? "" : "s"}, ${missingCount} to generate, ${notRenderedCount} not rendered under their selected layout`,
  )
  return lines.join("\n\n")
}

export interface AssetBriefOptions {
  json?: boolean
  cwd?: string
}

/**
 * `pptwise asset-brief <target> [--json]` (asset-brief plan, task 1): resolve
 * `target` through the exact same `loadDeckTarget` path `audit`/`validate`/
 * `render`/`preview` already use, validate first (same error shape/exit-1
 * path as every other command in this file), then hand the validated IR to
 * `buildAssetBrief` (`../render/asset-brief.ts`, pure, no I/O beyond the render
 * pass it runs internally).
 *
 * No exit-1 gating on `missing`/`rendered` the way `audit` gates on
 * `hasFindings` — a to-do list of images still needing art is not a defect
 * the way an audit finding is; this command is purely informational, the
 * same "advisory" posture `runValidate`'s `placeholderNote` already has for
 * unfilled pages.
 */
export async function runAssetBrief(target: string, opts: AssetBriefOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit] = await readConfigs(cwd)
  const { raw, baseDir, workspaceAssetsDir, themeInputs, missingAssetPath } = await loadDeckTarget(target, cwd, projectHit)
  const theme = (await applyDeckConfig(raw, themeInputs))?.definition
  const v = validateIr(raw, { theme, missingAssetPath })
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const brief = buildAssetBrief(v.ir!, { theme })
  return opts.json ? JSON.stringify(brief, null, 2) : formatAssetBriefReport(brief)
}

/**
 * Validate a deck spec JSON file with `pptwise spec validate`.
 * `loadIrFile` is a generic "read + JSON-parse with a readable failure
 * message" helper despite its IR-scoped name (`./load-ir.ts`) — reused as-is
 * rather than duplicated, same pattern `runValidate` above uses for IR.
 * Returns human-readable report. Throws PptwiseError when invalid (CLI exit 1).
 *
 * Appends the same {@link normalizedNote} `runValidate`/`runRender` print
 * (T0b fix 2 scope extension) whenever `validateSpec` rewrote a top-level
 * `narrative: {id: "<preset>"}` shape (`SpecValidateResult.normalized`,
 * `../spec/index.ts`) — the spec-validate channel gets the identical note
 * format the bare-IR path already has, not a second, differently-shaped one.
 */
export async function runSpecValidate(specPath: string): Promise<string> {
  const raw = await loadIrFile(specPath, "spec")
  const specDir = dirname(resolve(specPath))
  const resolved = await resolveThemeSelection(themeNameFromUnknown(raw), { startDir: specDir, deckDir: specDir })
  const v = validateSpec(raw, { theme: resolved?.definition })
  if (!v.ok) {
    throw new PptwiseError(formatInvalidSpecError(v.errors))
  }
  const spec = v.spec!
  // Safe to call unguarded: validateSpec already resolved this same
  // expression successfully as part of its own hard-gate chain.
  const axes = resolveNarrative(spec.narrative as string | Partial<NarrativeProfile> | undefined)
  const ok = `OK — ${spec.pages.length} pages, narrative ${axes.strategy}/${axes.pacing}/${axes.audience}, theme "${resolveSpecThemeId(spec)}"`
  const lines = [ok]
  // Advisory findings (kind distribution and friends) ride the OK output the
  // same way `runValidate` prints IR warnings — computing a lint nobody can
  // see is the same as not having it.
  for (const w of v.warnings ?? []) {
    lines.push(`warning: ${w.path ? `${w.path}: ` : ""}${w.message}`)
  }
  for (const landing of v.landings ?? []) lines.push(`note: ${landing.path}: ${landing.message}`)
  const aliasNote = normalizedNote(v.normalized)
  if (aliasNote) lines.push(aliasNote)
  return lines.join("\n")
}

/** One page of a validated spec, as `spec validate --json` lists it. */
export interface SpecOutlinePage {
  page: number
  id: string
  type: string
  kind?: string
  heading: string
  summary?: string
}

/**
 * `spec validate --json`: the same checks as {@link runSpecValidate}, printed
 * as one JSON object a program can read. A valid spec carries its pages in
 * order (number, id, type, kind, heading, summary), the theme and the
 * resolved narrative, so a caller can show the outline without reading the
 * spec a second time. An invalid one carries `ok: false` and every error with
 * its path. A file that cannot be read or parsed still throws, as every other
 * command does.
 */
export async function runSpecValidateJson(specPath: string): Promise<{ output: string; ok: boolean }> {
  const raw = await loadIrFile(specPath, "spec")
  const specDir = dirname(resolve(specPath))
  const resolved = await resolveThemeSelection(themeNameFromUnknown(raw), { startDir: specDir, deckDir: specDir })
  const v = validateSpec(raw, { theme: resolved?.definition })
  const issue = (i: SpecValidationIssue) => ({ path: i.path, message: i.message, ...(i.pageId ? { pageId: i.pageId } : {}) })
  if (!v.ok) {
    return { ok: false, output: JSON.stringify({ ok: false, errors: v.errors.map(issue), warnings: (v.warnings ?? []).map(issue) }, null, 2) }
  }
  const spec = v.spec!
  const axes = resolveNarrative(spec.narrative as string | Partial<NarrativeProfile> | undefined)
  const pages: SpecOutlinePage[] = spec.pages.map((page, index) => ({
    page: index + 1,
    id: page.id,
    type: page.type,
    ...(page.type === "content" ? { kind: page.kind } : {}),
    heading: page.heading,
    ...(page.summary !== undefined ? { summary: page.summary } : {}),
  }))
  const cover = spec.pages.find((page) => page.type === "cover")
  const report = {
    ok: true,
    theme: resolveSpecThemeId(spec),
    narrative: { strategy: axes.strategy, pacing: axes.pacing, audience: axes.audience },
    ...(cover ? { title: cover.heading } : {}),
    pageCount: pages.length,
    pages,
    warnings: (v.warnings ?? []).map(issue),
    ...(v.landings && v.landings.length > 0 ? { landings: v.landings } : {}),
    ...(v.normalized && v.normalized.length > 0 ? { normalized: v.normalized } : {}),
  }
  return { ok: true, output: JSON.stringify(report, null, 2) }
}

export interface SchemaCommandOptions {
  /** Print the deck spec schema instead of the IR schema. */
  spec?: boolean
  /** Print one component's schema with the `$defs` it needs. */
  component?: string
  /** Print the components legal on a page of this kind, with their schemas. */
  kind?: string
  /** With `kind`: answer for one theme name instead of every installed
   *  theme. Resolved the way `validate` resolves a spec's theme: the deck
   *  directory first (`theme.json`, `<name>.theme.json`), then workspace
   *  `themes/`, then the presets. */
  theme?: string
  /** With `theme`: the deck project directory to read a deck-local theme
   *  from. Omitted, `cwd` counts as the deck when it holds `deck.spec.json`
   *  or a deck-local file for that name (`theme.json`, `<name>.theme.json`,
   *  `<name>.json`). */
  deck?: string
  /** Indent the JSON. Default output is one line. */
  pretty?: boolean
  /** Where a workspace theme name is resolved from. Defaults to `process.cwd()`. */
  cwd?: string
}

/**
 * The deck directory a `schema --kind --theme` lookup reads first. `--deck`
 * names it outright. Otherwise the cwd is the deck when it holds
 * `deck.spec.json`, the same file `validate <dir>` requires of a deck
 * project (`./deck-dir.ts`'s `readDeckDir`), or when it holds any of the
 * deck-local files the name could resolve to (`deckThemeCandidates`,
 * `./theme-resolve.ts`): `validate deck.json` reads a bare IR's theme from
 * the IR file's own directory, spec or no spec, so a cwd with only
 * `deck.json` and `theme.json` beside it is that directory. Either way an
 * agent standing in its deck gets the answer validate will give.
 */
async function schemaDeckDir(cwd: string, deck: string | undefined, themeName: string): Promise<string | undefined> {
  if (deck !== undefined) {
    const dir = resolve(cwd, deck)
    if (!(await isDeckDirectory(dir))) throw new PptwiseError(`--deck ${deck}: ${dir} is not a directory`)
    return dir
  }
  if (await pathExists(join(cwd, SPEC_FILENAME))) return cwd
  for (const candidate of deckThemeCandidates(cwd, themeName)) {
    if (await pathExists(candidate.path)) return cwd
  }
  return undefined
}

/** `pptwise schema [--spec | --component <type> | --kind <kind> [--theme <name> [--deck <dir>]]] [--pretty]`. */
export async function runSchema(opts: SchemaCommandOptions = {}): Promise<string> {
  const modes = [opts.spec ? "--spec" : undefined, opts.component !== undefined ? "--component" : undefined, opts.kind !== undefined ? "--kind" : undefined]
    .filter((flag): flag is string => flag !== undefined)
  if (modes.length > 1) throw new PptwiseError(`pass one of --spec, --component, --kind (got ${modes.join(" and ")})`)
  if (opts.theme !== undefined && opts.kind === undefined) throw new PptwiseError("--theme requires --kind")
  if (opts.deck !== undefined && opts.theme === undefined) throw new PptwiseError("--deck requires --theme")
  let schema: Record<string, unknown>
  if (opts.spec) {
    schema = specJsonSchema()
  } else if (opts.component !== undefined) {
    schema = componentJsonSchema(opts.component)
  } else if (opts.kind !== undefined) {
    const cwd = opts.cwd ?? process.cwd()
    let deckDir: string | undefined
    if (opts.theme !== undefined && opts.theme.length > 0) {
      // Same gate the resolver runs first: a name it would refuse never
      // reaches the filesystem as part of a candidate path.
      const name = lookupThemeName(opts.theme)
      assertThemeId(name)
      deckDir = await schemaDeckDir(cwd, opts.deck, name)
    }
    const resolved = await resolveThemeSelection(opts.theme, { startDir: cwd, deckDir })
    schema = kindJsonSchema(opts.kind, {
      theme: resolved?.definition,
      extraThemes: resolved === undefined ? await readablePackDefinitions() : undefined,
    })
  } else {
    schema = irJsonSchema()
  }
  return opts.pretty ? JSON.stringify(schema, null, 2) : JSON.stringify(schema)
}

/** `pptwise icons [--json]` — every icon name an `icon` field accepts. */
export function runIcons(asJson: boolean): string {
  return asJson ? JSON.stringify([...PPTX_ICON_NAMES], null, 2) : PPTX_ICON_NAMES.join("\n")
}

/**
 * What a theme's menu offers, as `themes --json` lists it: the face each
 * boundary page type resolves to, and the face each offered content kind
 * resolves to, in the kind vocabulary's own order. A kind the theme does not
 * offer is absent. Read off the compiled menu, the same table validate and
 * render resolve pages through, so it cannot list a page the theme refuses.
 */
interface ThemeMenuFaces {
  cover: string
  chapter: string
  ending: string
  content: Partial<Record<PageKind, string>>
}

function menuFaces(menu: Menu): ThemeMenuFaces {
  const content: Partial<Record<PageKind, string>> = {}
  for (const kind of offeredContentKinds(menu)) content[kind] = menu.content[kind]!.face
  return { cover: menu.cover.face, chapter: menu.chapter.face, ending: menu.ending.face, content }
}

interface ThemeListRow {
  id: string
  label: string
  colors: Record<string, unknown>
  occasions: readonly string[]
  identity: string | null
  /** `builtin` for a factory preset, `pack` for a theme an installed content pack ships. */
  source: "builtin" | "pack"
  /** The pack id, for a pack theme. */
  pack?: string
  menu: ThemeMenuFaces
}

/** An installed pack that could not be read, listed in place of its themes. */
interface PackErrorRow {
  source: "pack"
  pack: string
  error: string
}

type InstalledPackRead =
  | { ok: true; id: string; themes: { file: ThemeFile; definition: ThemeDefinition }[] }
  | { ok: false; id: string; error: string }

/**
 * Every installed pack, read the way a lookup of one of its themes reads it:
 * each theme file parsed and fully compiled (schema, menu contract, contrast
 * floor). A pack is unreadable as a whole when any of its themes fails, when
 * it ships a factory preset's or a retired id, or when another installed
 * pack ships one of its ids too. `packs sync` refuses all of these, so they
 * only arise from a pack edited or copied by hand. `themes` and `schema
 * --kind` both list from here, so the two never disagree about which packs
 * count. Only the expected failures (a `PptwiseError`) mark a pack
 * unreadable: anything else is a bug and propagates.
 */
async function readInstalledPackThemes(): Promise<InstalledPackRead[]> {
  const reads: InstalledPackRead[] = []
  for (const id of await installedPackIds()) {
    const dir = join(packsRoot(), id)
    try {
      const pack = await readInstalledPack(dir, id)
      const themes: { file: ThemeFile; definition: ThemeDefinition }[] = []
      for (const theme of pack.themes) {
        let file: ThemeFile
        let definition: ThemeDefinition
        try {
          file = await readThemeFile(theme.path)
          definition = compileThemeDefinition(file)
        } catch (e) {
          if (!(e instanceof PptwiseError)) throw e
          throw damagedPackError(dir, e.message)
        }
        if ((CANONICAL_THEME_IDS as readonly string[]).includes(file.id)) {
          throw damagedPackError(dir, `it ships theme "${file.id}", which is a factory preset name`)
        }
        const renamed = RETIRED_THEME_IDS[file.id] ?? foldedThemeTarget(file.id)
        if (renamed !== undefined) {
          throw damagedPackError(dir, `it ships theme "${file.id}", a retired id (now "${renamed}")`)
        }
        themes.push({ file, definition })
      }
      reads.push({ ok: true, id, themes })
    } catch (e) {
      if (!(e instanceof PptwiseError)) throw e
      reads.push({ ok: false, id, error: e.message })
    }
  }
  const owners = new Map<string, string[]>()
  for (const read of reads) {
    if (!read.ok) continue
    for (const { file } of read.themes) owners.set(file.id, [...(owners.get(file.id) ?? []), read.id])
  }
  return reads.map((read) => {
    if (!read.ok) return read
    const shared = read.themes.find(({ file }) => (owners.get(file.id) ?? []).length > 1)
    if (shared === undefined) return read
    const where = owners.get(shared.file.id)!.map((owner) => join(packsRoot(), owner)).join(" and ")
    const error = damagedPackError(
      join(packsRoot(), read.id),
      `theme "${shared.file.id}" is shipped by more than one installed pack (${where})`,
    ).message
    return { ok: false, id: read.id, error }
  })
}

/** Every readable pack theme, for `schema --kind` without a theme. An
 *  unreadable pack is left out with its reason on stderr, the way `themes`
 *  lists it as an error row: the answer for the presets and the readable
 *  packs still stands. */
async function readablePackDefinitions(): Promise<ThemeDefinition[]> {
  const definitions: ThemeDefinition[] = []
  for (const read of await readInstalledPackThemes()) {
    if (read.ok) definitions.push(...read.themes.map(({ definition }) => definition))
    else process.stderr.write(`schema --kind: left out ${read.error}\n`)
  }
  return definitions
}

/** One pack's rows: its themes, or a single error entry when the pack
 *  cannot be read (see {@link readInstalledPackThemes}). */
function packThemeRows(read: InstalledPackRead): (ThemeListRow | PackErrorRow)[] {
  if (!read.ok) return [{ source: "pack", pack: read.id, error: read.error }]
  return read.themes.map(({ file, definition }) => ({
    id: file.id,
    label: file.label ?? file.id,
    colors: { ...file.style.colors },
    occasions: file.occasions ?? [],
    identity: file.identity ?? null,
    source: "pack",
    pack: read.id,
    menu: menuFaces(definition.menu),
  }))
}

/**
 * `pptwise themes [--json]`: the factory presets, then the themes of every
 * installed content pack in pack order. A pack that cannot be read does not
 * fail the list: it appears as one entry with an `error` in place of its
 * themes, so the presets and every readable pack are still listed.
 */
export async function runThemes(asJson: boolean): Promise<string> {
  const rows: (ThemeListRow | PackErrorRow)[] = listThemes().map((t) => {
    const rec = Object.hasOwn(THEME_OCCASIONS, t.id) ? THEME_OCCASIONS[t.id as keyof typeof THEME_OCCASIONS] : undefined
    return {
      id: t.id,
      label: t.label,
      colors: t.colors,
      occasions: rec?.occasions ?? [],
      identity: rec?.identity ?? null,
      source: "builtin" as const,
      menu: menuFaces(THEME_DEFINITIONS[t.id as keyof typeof THEME_DEFINITIONS].menu),
    }
  })
  for (const read of await readInstalledPackThemes()) rows.push(...packThemeRows(read))
  if (asJson) return JSON.stringify(rows, null, 2)
  return rows
    .map((t) => {
      if ("error" in t) return `(pack ${t.pack}) ${t.error.replace(/\s*\n\s*/g, " ")}`
      const line = `${t.id.padEnd(12)} ${t.label}`
      return t.pack === undefined ? line : `${line}  (pack ${t.pack})`
    })
    .join("\n")
}

interface LayoutDiscoverySlot {
  name: string
  accepts: readonly string[] | "any"
  capacity?: number
}

interface LayoutDiscoveryRow {
  id: string
  slideTypes: readonly string[]
  capacity?: number
  slots: LayoutDiscoverySlot[]
}

function layoutCapacity(slots: readonly { capacity?: number }[]): number | undefined {
  let sum = 0
  let any = false
  for (const slot of slots) {
    if (slot.capacity !== undefined) {
      sum += slot.capacity
      any = true
    }
  }
  return any ? sum : undefined
}

function listLayouts(): LayoutDiscoveryRow[] {
  return Object.values(LAYOUT_REGISTRY).map((layout) => {
    const capacity = layoutCapacity(layout.slots)
    const row: LayoutDiscoveryRow = {
      id: layout.id,
      slideTypes: layout.slideTypes,
      slots: layout.slots.map((slot) => {
        const compact: LayoutDiscoverySlot = { name: slot.name, accepts: slot.accepts }
        if (slot.capacity !== undefined) compact.capacity = slot.capacity
        return compact
      }),
    }
    if (capacity !== undefined) row.capacity = capacity
    return row
  })
}

/** `pptwise layouts [--json]` — compact discovery surface over LAYOUT_REGISTRY. */
export function runLayouts(asJson: boolean): string {
  const layouts = listLayouts()
  if (asJson) return JSON.stringify(layouts, null, 2)
  const rows = layouts.map((l) => ({
    id: l.id,
    types: l.slideTypes.join(","),
    cap: l.capacity !== undefined ? String(l.capacity) : "-",
    slots: l.slots.map((s) => s.name).join(", "),
  }))
  const idWidth = Math.max(...rows.map((r) => r.id.length))
  const typesWidth = Math.max(...rows.map((r) => r.types.length))
  const capWidth = Math.max(...rows.map((r) => r.cap.length))
  return rows
    .map(
      (r) =>
        `${r.id.padEnd(idWidth + 2)}${r.types.padEnd(typesWidth + 2)}${r.cap.padEnd(capWidth + 2)}${r.slots}`,
    )
    .join("\n")
}

export interface BrandExtractOptions {
  output: string
  /** `--id` (裁定 4) — defaults to a slug of the output filename. */
  id?: string
  /** `--label` — defaults to the source theme's own color-scheme name. */
  label?: string
  /** Donor preset whose menu and remaining tokens are copied. Default brief. */
  from?: string
  /** `--brand-fonts`: set the template's Latin fonts ahead of the theme's own. */
  brandFonts?: boolean
  force?: boolean
}

/** `basename(output)` minus a trailing `.theme.json`/`.json`, slugged — the
 *  裁定 4 default id (`my-brand.theme.json` → `my-brand`). */
function defaultThemeIdFor(output: string): string {
  return slugify(basename(output).replace(/\.theme\.json$|\.json$/i, ""))
}

async function defaultThemeOutputPath(id: string, cwd: string): Promise<string> {
  assertThemeId(id)
  const project = await findConfig(cwd)
  const root = project !== null ? dirname(project.path) : resolve(cwd)
  return join(root, WORKSPACE_THEMES_DIRNAME, `${id}.theme.json`)
}

async function resolveThemeWriteTarget(
  opts: { id?: string; output?: string; cwd: string },
): Promise<{ id: string; output: string }> {
  if (opts.output !== undefined) {
    const output = resolve(opts.cwd, opts.output)
    const id = opts.id ?? defaultThemeIdFor(output)
    assertThemeId(id)
    return { id, output }
  }
  if (opts.id !== undefined) {
    assertThemeId(opts.id)
    return { id: opts.id, output: await defaultThemeOutputPath(opts.id, opts.cwd) }
  }
  throw new PptwiseError("pass --id or -o so the theme file has a name")
}

async function themeFileFromResolved(resolved: ResolvedTheme, identity: { id: string; label?: string }): Promise<ThemeFile> {
  if (resolved.kind === "builtin") {
    return themeFileFromPreset(resolved.id, identity)
  }
  const copy = structuredClone(resolved.file)
  copy.id = identity.id
  copy.style = { ...copy.style, id: identity.id }
  if (identity.label !== undefined) copy.label = identity.label
  return ThemeFileSchema.parse(copy) as ThemeFile
}



function rethrowBrandColorError(error: unknown, id: string): never {
  const message = error instanceof Error ? error.message : String(error)
  if (/colors\.|contrast ratio|calibrate/i.test(message)) {
    throw new PptwiseError(
      `${message}. Run \`pptwise theme new --from <preset> --id ${id}\`, adjust the copied theme colors by hand, then bind that theme`,
    )
  }
  throw error
}

/**
 * `pptwise brand extract <file> -o <out.theme.json> [--id] [--label] [--from]`
 * reads the template's brand color (its accent1), the second color the
 * company paired with it (accent2), and its fonts locally, then repaints
 * the donor theme around them (`../themes/brand/brand-regen.ts`). The
 * donor keeps its ground, text, and surface. Contrast failure is a hard
 * error.
 */
export async function runBrandExtract(file: string, opts: BrandExtractOptions): Promise<string> {
  let bytes: Buffer
  try {
    bytes = await readFile(file)
  } catch {
    throw new PptwiseError(`cannot read template file: ${file}`)
  }
  const id = opts.id ?? defaultThemeIdFor(opts.output)
  assertThemeId(id)
  const from = opts.from ?? "bulletin"
  const cwd = dirname(resolve(opts.output))
  const donor = await resolveThemeByName(from, { startDir: cwd })
  let result: Awaited<ReturnType<typeof extractBrandTheme>>
  try {
    result = await extractBrandTheme(bytes, {
      id,
      label: opts.label,
      from: donor.kind === "builtin" ? donor.id : donor.file,
      brandFonts: opts.brandFonts === true,
    })
  } catch (error) {
    rethrowBrandColorError(error, id)
  }
  const theme = result.file
  const outPath = resolve(opts.output)
  await writeThemeFile(outPath, theme, opts.force === true)
  const c = theme.style.colors
  const lines = [
    `wrote ${opts.output} (theme "${theme.id}", label "${theme.label}", from "${from}")`,
    ...(result.placement.brand.neutral ? ["  the template has no colored brand color: its accent1 is a grey, a black or a white"] : []),
    ...describePlacement(result.placement, "the template's accent1"),
    `  colors: primary ${c.primary}, accent ${c.accent}, ${c.chartPalette.length} chart colors. bg ${c.bg}, text ${c.text}, surface ${c.surface} stay ${from}'s`,
    opts.brandFonts !== true
      ? `  fonts: ${from}'s own, heading "${resolveFontFace(theme.style.fonts.heading, "heading")}", body "${resolveFontFace(theme.style.fonts.body, "body")}" (--brand-fonts puts the template's Latin fonts first)`
      : `  fonts: heading "${theme.style.fonts.heading[0]}", body "${theme.style.fonts.body[0]}" from the template, Chinese text in ${from}'s own faces`,
    ...result.fontNotes.map((note) => `  ${note}`),
    `Drop the file in a deck ${THEME_FILENAME} or workspace themes/ and set spec.theme to "${theme.id}".`,
  ]
  return lines.join("\n")
}

export interface ThemeNewOptions {
  from: string
  output?: string
  id?: string
  label?: string
  cwd?: string
  force?: boolean
}

/** `pptwise theme new --from <preset|theme-name>` copies a resolved theme into
 *  a self-contained v2 file. Create means copy. There is no `base`. */
export async function runThemeNew(opts: ThemeNewOptions): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { id, output } = await resolveThemeWriteTarget({ id: opts.id, output: opts.output, cwd })
  const resolved = await resolveThemeByName(opts.from, { startDir: cwd })
  const file = await themeFileFromResolved(resolved, { id, label: opts.label })
  await writeThemeFile(output, file, opts.force === true)
  return `wrote ${output} (theme "${file.id}"). Set spec.theme to "${file.id}".`
}

export interface ThemeForkOptions {
  /** `--brand`: one brand color the whole palette is rederived around. */
  brand?: string
  primary?: string
  bg?: string
  accent?: string
  text?: string
  surface?: string
  output?: string
  id?: string
  label?: string
  cwd?: string
  force?: boolean
}

const FORK_ANCHOR_FLAGS = ["primary", "accent", "bg", "text", "surface"] as const

/** `pptwise theme fork <name> --brand <#hex>` repaints the source around one
 *  brand color, or a brand color and its second color joined by a comma
 *  (`../themes/brand/brand-regen.ts`). `--primary <#hex>` and the other anchor
 *  flags set those tokens literally and rederive the rest. The two ways do
 *  not mix. Contrast failure is a hard error. */
export async function runThemeFork(name: string, opts: ThemeForkOptions): Promise<string> {
  const anchors = FORK_ANCHOR_FLAGS.filter((flag) => opts[flag] !== undefined)
  if (opts.brand !== undefined && anchors.length > 0) {
    throw new PptwiseError(
      `--brand repaints the theme around a brand color and cannot be combined with ${anchors.map((flag) => `--${flag}`).join(", ")}. Use --brand alone, or set the tokens exactly with --primary and friends`,
    )
  }
  if (opts.brand === undefined && opts.primary === undefined) {
    throw new PptwiseError("pptwise theme fork needs --brand <hex>, or --primary <hex> to set the tokens exactly")
  }
  const cwd = opts.cwd ?? process.cwd()
  const { id, output } = await resolveThemeWriteTarget({ id: opts.id, output: opts.output, cwd })
  const resolved = await resolveThemeByName(name, { startDir: cwd })
  const source = await themeFileFromResolved(resolved, { id, label: opts.label })
  if (opts.brand !== undefined) {
    const result = regenerateFromBrand(source, parseBrandOption(opts.brand), { id, label: opts.label ?? source.label })
    await writeThemeFile(output, result.file, opts.force === true)
    return [
      `wrote ${output} (theme "${result.file.id}"). Set spec.theme to "${result.file.id}".`,
      ...describePlacement(result.placement, "--brand"),
    ].join("\n")
  }
  const file = forkTheme(
    source,
    { primary: opts.primary!, bg: opts.bg, accent: opts.accent, text: opts.text, surface: opts.surface },
    { id, label: opts.label ?? source.label },
  )
  await writeThemeFile(output, file, opts.force === true)
  return `wrote ${output} (theme "${file.id}"). Set spec.theme to "${file.id}".`
}

export interface ThemeTryOptions {
  output?: string
  cwd?: string
  gitIgnore?: boolean
  runGit?: GitRunner
  /** `--title`: draw the caller's cover and one content page instead of the fixed sample. */
  title?: string
  /** `--subtitle`: the cover's subheading. Needs `title`. */
  subtitle?: string
  /** `--lang`: the default content page's language. Needs `title`. */
  lang?: string
  /** `--page <file>`: one content page, as a deck page carries it, in place of the default. Needs `title`. */
  page?: string
  /** `--json`: print the manifest instead of a summary. Needs `title`. */
  json?: boolean
  /**
   * `--occasion`: with `title` and no ids, the occasion words or narrative
   * that pick a shortlist of four to six themes.
   */
  occasion?: string
}

/**
 * The themes a wall draws when the caller names none: a shortlist for the
 * occasion words and narrative in `--occasion` (comma-separated), or a spread
 * of voices when that is empty too. See {@link themeShortlist}.
 */
export function themeTryShortlist(occasion: string | undefined): string[] {
  const occasions: string[] = []
  let strategy: string | undefined
  for (const word of (occasion ?? "").split(",").map((part) => part.trim()).filter((part) => part.length > 0)) {
    if (Object.hasOwn(OCCASION_VOCAB, word)) {
      occasions.push(word)
      continue
    }
    if (Object.hasOwn(NARRATIVE_PRESETS, word) || (STRATEGY_VALUES as readonly string[]).includes(word)) {
      if (strategy !== undefined) throw new PptwiseError(`--occasion names two narratives, "${strategy}" and "${word}". Keep one`)
      strategy = word
      continue
    }
    throw new PptwiseError(
      `unknown --occasion "${word}". Use occasion words (${Object.keys(OCCASION_VOCAB).join(", ")}) or a narrative preset (${Object.keys(NARRATIVE_PRESETS).join(", ")})`,
    )
  }
  return themeShortlist({ occasions, ...(strategy !== undefined ? { strategy } : {}) })
}

function parseThemeTryIds(raw: string): string[] {
  const ids = raw.split(",").map((part) => part.trim()).filter((part) => part.length > 0)
  if (ids.length < 2 || ids.length > 4) {
    throw new PptwiseError(`pptwise theme try expects 2-4 theme ids, got ${ids.length}`)
  }
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new PptwiseError(`pptwise theme try has duplicate theme id "${id}"`)
    seen.add(id)
  }
  return ids
}

function contactSheetSlidesFromIr(
  ir: { slides: Array<{ type?: string; kind?: string }>; filename: string },
  svgs: string[],
): { type: string; label: string; svg: string }[] {
  return ir.slides.map((slide, index) => {
    const type = slide.type ?? "content"
    const label = type === "content" && typeof slide.kind === "string" ? slide.kind : type
    return { type, label, svg: svgs[index]! }
  })
}

/** `pptwise theme try <ids>` renders the fitting-room sample in each named
 *  theme and writes a contact sheet. Bound decks still render only their
 *  bound theme. */
export async function runThemeTry(idsRaw: string | undefined, opts: ThemeTryOptions = {}): Promise<string> {
  const named = idsRaw !== undefined && idsRaw.trim() !== ""
  if (opts.title !== undefined) {
    if (named && opts.occasion !== undefined) {
      throw new PptwiseError("--occasion picks the themes when none are named. Pass theme ids or --occasion, not both")
    }
    return runThemeWall(named ? idsRaw : themeTryShortlist(opts.occasion).join(","), { ...opts, title: opts.title })
  }
  const needsTitle = [
    ["--subtitle", opts.subtitle],
    ["--lang", opts.lang],
    ["--page", opts.page],
    ["--json", opts.json || undefined],
    ["--occasion", opts.occasion],
  ].filter(([, value]) => value !== undefined)
  if (needsTitle.length > 0) {
    throw new PptwiseError(`${needsTitle.map(([flag]) => flag).join(", ")} draw the caller's own pages and need --title`)
  }
  if (!named) throw new PptwiseError("pptwise theme try expects 2-4 theme ids, or --title to draw your own cover")
  const cwd = opts.cwd ?? process.cwd()
  const ids = parseThemeTryIds(idsRaw)
  const columns: { id: string; slides: { type: string; label: string; svg: string }[] }[] = []
  for (const name of ids) {
    const resolved = await resolveThemeByName(name, { startDir: cwd })
    const raw = structuredClone(THEME_TRY_SAMPLE_IR) as {
      theme: { id: string }
      slides: { type?: string; kind?: string }[]
      filename: string
    }
    raw.theme = { id: resolved.id }
    // The sample shows every kind, and a theme offers the kinds its menu
    // names. A page whose kind this theme does not offer is left out of its
    // column, which the sheet marks, rather than failing the whole comparison.
    const offered = new Set<string>(offeredContentKinds(resolved.definition.menu))
    raw.slides = raw.slides.filter((slide) => slide.type !== "content" || offered.has(slide.kind ?? ""))
    const v = validateIr(raw, { theme: resolved.definition })
    if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
    const ir = v.ir!
    const svgs = ir.slides.map((_, index) => renderSlideSvg(ir, index, { theme: resolved.definition }))
    columns.push({ id: resolved.id, slides: contactSheetSlidesFromIr(ir, svgs) })
  }
  const { resolvedOut, extraNotes } = await themeTryOutDir(cwd, opts)
  const htmlPath = join(resolvedOut, "contact-sheet.html")
  await writeFile(htmlPath, buildContactSheetHtml({ title: "theme try", themes: columns }))
  const ok = `wrote contact sheet to ${htmlPath}`
  return extraNotes.length > 0 ? `${ok}\n${extraNotes.join("\n")}` : ok
}

/** `-o`, or `.pptwise/theme-try/` under the project root. */
async function themeTryOutDir(cwd: string, opts: ThemeTryOptions): Promise<{ resolvedOut: string; extraNotes: string[] }> {
  if (opts.output !== undefined) {
    const resolvedOut = resolve(cwd, opts.output)
    await mkdir(resolvedOut, { recursive: true })
    return { resolvedOut, extraNotes: [] }
  }
  const projectHit = await findConfig(cwd)
  const location = resolveWorkspaceLocation({
    cwd,
    projectConfigPath: projectHit?.path,
    target: "theme-try",
    isDir: true,
  })
  const extraNotes = await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })
  return { resolvedOut: location.dir, extraNotes }
}

/**
 * The names a wall draws: a comma-separated list of one or more, or `all`
 * for every theme `pptwise themes` lists (the presets, then every readable
 * pack theme). An unreadable pack is left out with its reason on stderr,
 * the way `schema --kind` leaves it out.
 */
async function themeWallNames(raw: string): Promise<string[]> {
  if (raw.trim() === "all") {
    return [...CANONICAL_THEME_IDS, ...(await readablePackDefinitions()).map((definition) => definition.id)]
  }
  const ids = raw.split(",").map((part) => part.trim()).filter((part) => part.length > 0)
  if (ids.length === 0) throw new PptwiseError("pptwise theme try expects theme ids, or all")
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new PptwiseError(`pptwise theme try has duplicate theme id "${id}"`)
    seen.add(id)
  }
  return ids
}

/**
 * `pptwise theme try <ids|all> --title <text>`: the caller's cover and one
 * content page in each named theme, as SVG files, a manifest naming them,
 * and a contact sheet. See `./theme-wall.ts`.
 */
async function runThemeWall(idsRaw: string, opts: ThemeTryOptions & { title: string }): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const title = opts.title.trim()
  if (title === "") throw new PptwiseError("--title is empty. Pass the deck's cover title")
  const names = await themeWallNames(idsRaw)
  const themes: ThemeWallInput["themes"][number][] = []
  for (const name of names) {
    const resolved = await resolveThemeByName(name, { startDir: cwd })
    const source = resolved.kind === "builtin" ? "builtin" : resolved.pack !== undefined ? "pack" : "file"
    themes.push({ id: resolved.id, label: resolved.definition.label ?? resolved.id, source, definition: resolved.definition })
  }
  let contentPage: Record<string, unknown> | undefined
  if (opts.page !== undefined) {
    const pagePath = resolve(cwd, opts.page)
    let text: string
    try {
      text = await readFile(pagePath, "utf8")
    } catch {
      throw new PptwiseError(`cannot read --page file: ${pagePath}`)
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      throw new PptwiseError(`--page file is not JSON: ${pagePath}: ${e instanceof Error ? e.message : String(e)}`)
    }
    contentPage = themeWallContentPage(parsed, pagePath)
  }
  const subtitle = opts.subtitle?.trim()
  const wall = buildThemeWall({
    title,
    ...(subtitle ? { subtitle } : {}),
    lang: themeWallLang(title, opts.lang),
    ...(contentPage !== undefined ? { contentPage } : {}),
    themes,
  })
  const { resolvedOut, extraNotes } = await themeTryOutDir(cwd, opts)
  // A page this run left out must not leave the last run's drawing of it
  // under the name the manifest would have given it.
  for (const theme of themes) {
    for (const type of ["cover", "content"]) await rm(join(resolvedOut, `${theme.id}-${type}.svg`), { force: true })
  }
  for (const file of wall.files) await writeFile(join(resolvedOut, file.name), file.svg)
  await writeFile(
    join(resolvedOut, THEME_WALL_SHEET_FILE),
    buildThemeWallHtml({ title, columns: ["cover", "content"], rows: wall.rows }),
  )
  await writeFile(join(resolvedOut, THEME_WALL_MANIFEST_FILE), `${JSON.stringify(wall.manifest, null, 2)}\n`)
  if (opts.json) {
    const notes = themeWallSkipNotes(wall.manifest.themes)
    return JSON.stringify({ dir: resolvedOut, ...wall.manifest, ...(notes.length > 0 ? { notes } : {}) }, null, 2)
  }
  const summary = formatThemeWall(wall.manifest, resolvedOut)
  return extraNotes.length > 0 ? `${summary}\n${extraNotes.join("\n")}` : summary
}

/**
 * List the named narrative presets (spec §5): strategy/pacing/audience axes +
 * soft theme recommendations — never a hard constraint, see
 * `NarrativePreset.themeRecommendations`'s own doc comment in `narrative/index.ts`.
 * `--json` hands back the full machine-readable payload an agent would want
 * before picking a narrative: every preset, plus the raw strategy/pacing/audience
 * tables those presets are built from (`STRATEGY_DEFINITIONS`/`PACING_BUDGETS`
 * carry data this wave doesn't yet consume for selection — W4's job — but are
 * still useful for a caller inspecting what each axis value means).
 *
 * CLI surface renamed this task (spec §8.2's `scenarios`→`narratives`
 * rename, task 2): command name `narratives`, `--json` output field names
 * `strategies`/`pacings` (were `modes`/`deliveries`) — kept in step with the
 * command's own new name rather than leaving a `pptwise narratives --json`
 * caller staring at a `modes` key for what is now the `strategy` axis.
 */
export function runNarratives(asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(
      {
        presets: NARRATIVE_PRESETS,
        strategies: STRATEGY_DEFINITIONS,
        pacings: PACING_BUDGETS,
        audiences: AUDIENCE_VALUES,
      },
      null,
      2,
    )
  }
  const rows = Object.values(NARRATIVE_PRESETS).map((p) => ({
    id: p.id,
    axes: `${p.axes.strategy}/${p.axes.pacing}/${p.axes.audience}`,
    themes: p.themeRecommendations.join(", "),
  }))
  const idWidth = Math.max(...rows.map((r) => r.id.length))
  const axesWidth = Math.max(...rows.map((r) => r.axes.length))
  return rows
    .map((r) => `${r.id.padEnd(idWidth + 2)}${r.axes.padEnd(axesWidth + 2)}${r.themes}`)
    .join("\n")
}

const CONFIG_TEMPLATE = {} as const

/** Scaffold pptwise.config.json in cwd. Never overwrites. */
export async function runInit(cwd = process.cwd()): Promise<string> {
  const target = join(cwd, CONFIG_FILENAME)
  try {
    await writeFile(target, JSON.stringify(CONFIG_TEMPLATE, null, 2) + "\n", { flag: "wx" })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new PptwiseError(`${target} already exists — edit it instead`)
    }
    throw e
  }
  return `wrote ${target} — themes: \`pptwise themes\``
}

export interface PreviewOptions {
  cwd?: string
  /** `--no-git-ignore` sets this false. No effect when `-o` is given. */
  gitIgnore?: boolean
  /** Injectable git runner for tests. Production leaves this unset. */
  runGit?: GitRunner
  /** `--html` (v0.3 W7 task 1, spec §7 workflow ⑤): also write a
   *  self-contained `preview.html` alongside the per-slide SVG files —
   *  every slide's already-rendered SVG inlined into one file (thumbnail
   *  filmstrip + keyboard/click navigation, `buildPreviewHtml`,
   *  `./preview-html.ts`) for a human (or an agent that can view HTML) to
   *  flip through the whole deck at once instead of opening N separate SVG
   *  files. Named `htmlOut` rather than `html` so `RenderOptions.draft`-style
   *  option objects in this file all read as "what to produce", not
   *  "whether this is HTML" (there is nothing else this bundle could be).
   *  Known limitation (see `buildPreviewHtml`'s own doc comment,
   *  `./preview-html.ts`): self-containment assumes every image asset is
   *  local or already a `data:` URI — a remote `http(s):` asset src passes
   *  through `resolveLocalAssets` untouched and lands in the bundle as a
   *  live network reference, not an inlined file.
   *
   *  Also gates the audit overlay (notes+preview wave, task 2): when set
   *  and the deck has no placeholder page, `runPreview` runs `auditDeck`
   *  (`../audit/deck-audit.ts`) and embeds its findings and `checks`
   *  into `preview.html` (per-page badges + a findings panel + a one-line
   *  checks summary, `buildPreviewHtml`). A deck with any placeholder page
   *  skips the audit entirely instead of running it partially — see
   *  `runPreview`'s own doc comment for why. */
  htmlOut?: boolean
}

/**
 * Shared "assemble/validate/render" half of the preview build pipeline
 * (serve wave, task S1 extraction) — every step `runPreview` always
 * performed regardless of `--html`, factored out so {@link buildDeckPreview}
 * below (and transitively `createServeServer`, `./serve.ts`) can reuse it
 * without re-threading `loadDeckTarget`/`applyDeckConfig`/`validateIr`/
 * `resolveLocalAssets` a second time. Resolves `target` exactly like
 * `runRender`/`runValidate`/`runAudit` (single IR file or deck project
 * directory, {@link loadDeckTarget} above), then renders
 * every slide to SVG once (`svgs`, index-aligned with `ir.slides`) — the same
 * strings both `runPreview`'s per-slide `.svg` files and
 * {@link buildDeckAuditAndHtml}'s embedded `preview.html` copies come from,
 * so the two stay byte-identical by construction, not just because the
 * renderer is deterministic (the same guarantee `runPreview` documented
 * before this extraction).
 */
interface DeckRenderResult {
  ir: PptxIR
  /** The bound theme's compiled definition, carried so the audit half of the
   *  preview draws from the same object the slides were rendered with. */
  theme: ThemeDefinition | undefined
  /** Every theme input this build read, as it read them (`theme` is the
   *  resolved definition among them): the bound name, where it resolved
   *  to, and the deck-local `theme.json` the rebind guard saw
   *  (`./theme-inputs.ts`). `createServeServer` (`./serve.ts`) keeps its
   *  key as the record of what the served page was built from, so the
   *  record can never describe a file that changed after this build had
   *  already read it. */
  themeInputs: ThemeInputs
  svgs: string[]
  /** The deck directory (`isDir: true`) or the single IR file (`isDir:
   *  false`) `target` resolved to — see {@link loadDeckTarget}'s own doc
   *  comment on `resolvedTarget` for why this is threaded back. */
  resolvedTarget: string
  isDir: boolean
  normalized?: string[]
}

/**
 * A build failure, carrying the theme inputs the build read
 * ({@link ThemeInputs}). Same message as the failure it wraps, which stays
 * reachable as `cause`, and a `PptwiseError` like every build failure, so
 * `run*` commands print it exactly as before. Every failure
 * {@link buildDeckPreview} raises is one of these: a build collects its
 * theme inputs before it does anything else, and a build that fails even
 * before that (a target it cannot locate) carries the record of that
 * ({@link unreadThemeInputs}), so a caller keeping the record of each
 * build (`createServeServer`, `./serve.ts`) always has one that describes
 * what this build actually read, not what stood on disk before or after
 * it.
 */
export class DeckBuildError extends PptwiseError {
  readonly themeInputs: ThemeInputs
  constructor(cause: unknown, themeInputs: ThemeInputs) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.themeInputs = themeInputs
  }
}

async function renderDeckSlides(
  target: string,
  opts: { cwd?: string } = {},
): Promise<DeckRenderResult> {
  const cwd = opts.cwd ?? process.cwd()
  let location: DeckLocation
  let projectHit: ProjectConfigHit
  try {
    ;[projectHit] = await readConfigs(cwd)
    location = await locateDeckTarget(target, cwd)
  } catch (e) {
    throw new DeckBuildError(e, unreadThemeInputs(e))
  }
  const themeInputs = await collectThemeInputs({ startDir: cwd, ...location })
  try {
    const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, missingAssetPath } = await readDeckTarget(location, themeInputs, cwd, projectHit)
    const theme = (await applyDeckConfig(raw, themeInputs))?.definition
    const v = validateIr(raw, { theme, missingAssetPath })
    if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
    await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
    const ir = v.ir!
    const svgs = ir.slides.map((_, i) => renderSlideSvg(ir, i, { theme }))
    return { ir, theme, themeInputs, svgs, resolvedTarget, isDir, normalized: v.normalized }
  } catch (e) {
    throw new DeckBuildError(e, themeInputs)
  }
}

/**
 * Audit + HTML-build half of the pipeline (serve wave, task S1 extraction —
 * this is `runPreview`'s pre-extraction `opts.htmlOut` branch body, moved
 * here with no behavior change so both `--html` output and
 * `createServeServer`'s cached page are the exact same bytes for the exact
 * same deck state). Runs `auditDeck` (notes+preview wave, task 2) — but only
 * when the deck has no placeholder page. `auditDeck` itself silently skips a
 * placeholder (`AuditReport.pagesSkipped`, nothing to audit on an unfilled
 * page) — running it over a deck that has some would produce a *partial*
 * report that still looks complete (zero findings reads as "clean", not
 * "some pages were never checked"), which is worse than not running it at
 * all. The plan's contract is the simpler "any placeholder present → skip
 * the whole overlay, one-line notice instead" — implemented here as
 * `hasPlaceholder`, and threaded into `buildPreviewHtml` as either
 * `findings` + `checks` (clean run) or `auditNote` (skipped), never both.
 * `checks` (`AuditReport.checks`, `../audit/deck-audit.ts`) rides along
 * with `findings` on every clean run, not just a partial/findings-only one —
 * `buildPreviewHtml` renders it as its own one-line summary regardless of
 * `findings.length`, so a deck that audited clean because nothing was wrong
 * stays visually distinct from one that audited clean because the pixel
 * pass never ran.
 */
function buildDeckAuditAndHtml(
  ir: PptxIR,
  svgs: string[],
  theme: ThemeDefinition | undefined,
): { html: string; findings: AuditFinding[]; checks?: AuditChecks } {
  const hasPlaceholder = ir.slides.some((slide) => slide.placeholder)
  const auditReport = hasPlaceholder ? undefined : auditDeck(ir, { theme })
  const findings = auditReport?.findings ?? []
  const html = buildPreviewHtml({
    title: ir.filename,
    slides: ir.slides.map((slide, i) => ({
      index: i,
      id: slide.id,
      type: slide.type,
      svg: svgs[i]!,
      placeholder: slide.placeholder,
    })),
    findings: findings.map((f) => ({ page: f.page, slideId: f.slideId, code: f.code, message: f.message })),
    auditNote: hasPlaceholder
      ? "audit overlay skipped — deck has unfilled placeholder pages; fill every page and re-run `pptwise preview --html` to see audit findings"
      : undefined,
    checks: auditReport?.checks,
  })
  return { html, findings, checks: auditReport?.checks }
}

/**
 * {@link renderDeckSlides} + {@link buildDeckAuditAndHtml} combined — the
 * full "target → {html, findings, ...}" preview build pipeline (serve wave,
 * task S1; spec-plan.md `.issues/2026-07-25-serve/spec-plan.md` §3 design
 * ruling 5: "buildPreviewHtml 复用现状 ... 禁止 fork 一份 preview 构建逻辑").
 * Two consumers: `runPreview`'s `opts.htmlOut` branch below (byte-identical
 * output to before this extraction — see that function's own doc comment),
 * and `createServeServer` (`./serve.ts`), which calls this once at startup
 * and again on every debounced `fs.watch` rebuild, caching `.html` in memory
 * for `GET /` and pushing an SSE `reload` once it succeeds. A thrown
 * `PptwiseError` (invalid IR, a mid-edit malformed JSON save, ...) propagates
 * straight out of this function either way, as a {@link DeckBuildError}
 * carrying the theme inputs the build read — it is
 * `createServeServer`'s job
 * to catch the *rebuild* case and turn it into an SSE `error` event instead
 * of letting it kill the server; the *first* call (before serve starts
 * listening) is deliberately allowed to reject the whole command, same
 * "throw `PptwiseError` → CLI exit 1" contract every other `run*` command
 * already has, since there is no previous-good HTML yet to keep serving.
 */
export interface DeckPreviewResult extends DeckRenderResult {
  html: string
  findings: AuditFinding[]
  checks?: AuditChecks
}

export async function buildDeckPreview(
  target: string,
  opts: { cwd?: string } = {},
): Promise<DeckPreviewResult> {
  const rendered = await renderDeckSlides(target, opts)
  try {
    const { html, findings, checks } = buildDeckAuditAndHtml(rendered.ir, rendered.svgs, rendered.theme)
    return { ...rendered, html, findings, checks }
  } catch (e) {
    throw new DeckBuildError(e, rendered.themeInputs)
  }
}

/**
 * `irPath` accepts a single IR/spec JSON file or a deck project directory
 * (same `loadDeckTarget` resolution `runRender` uses).
 * Preview never gates on placeholder pages either way (single-file or
 * dir-mode) — `renderSlideSvg` itself never calls the draft gate, spec §7:
 * preview always lets everything through — an agent iterating on a
 * partially-filled deck needs to see whatever page it just wrote without
 * every other still-empty page blocking it.
 *
 * Appends the same field-alias {@link normalizedNote} `runValidate`/
 * `runRender` print (W5 whole-branch review finding 3).
 *
 * Delegates the assemble/render/audit/HTML-build work to
 * {@link renderDeckSlides}/{@link buildDeckAuditAndHtml} (serve wave, task S1
 * extraction — see {@link buildDeckPreview}'s own doc comment for why); this
 * function's own job is now purely the CLI-facing shell around them —
 * writing each rendered SVG to `outDir`, conditionally writing
 * `preview.html`, and assembling the human-readable summary line. `outDir`
 * is optional (workspace-artifacts wave): omitted, the files land in
 * `<anchor>/.pptwise/<slug>/`, and matching `NNN-<type>.svg` leftovers from
 * a previous run of the same deck are pruned first. An explicit `-o` is
 * resolved against `cwd` and is never pruned — that directory may be
 * anything. The directory is only created once assemble/validate/render has
 * already succeeded (`renderDeckSlides` runs first) — a target that fails
 * to resolve or validate never leaves behind an empty directory it was
 * never able to fill, the same "don't create output for a call that's about
 * to fail" posture `runDisassemble`'s own path-traversal guard already
 * established elsewhere in this file.
 */
async function resolvePreviewOutDir(
  cwd: string,
  outDir: string | undefined,
  resolvedTarget: string,
  isDir: boolean,
  opts: PreviewOptions,
): Promise<{ resolvedOut: string; extraNotes: string[] }> {
  if (outDir !== undefined) {
    const resolvedOut = resolve(cwd, outDir)
    await mkdir(resolvedOut, { recursive: true })
    return { resolvedOut, extraNotes: [] }
  }
  const projectHit = await findConfig(cwd)
  const location = resolveWorkspaceLocation({
    cwd,
    projectConfigPath: projectHit?.path,
    target: resolvedTarget,
    isDir,
  })
  const extraNotes = await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })
  await pruneRenderedSvgs(location.dir)
  return { resolvedOut: location.dir, extraNotes }
}

const DROP_MARK = /data-dropped="(\d+)"(?:\s+data-dropped-kind="([a-z-]+)")?/g

/**
 * The preview's own word on pages that lose content, or `null` when none do.
 *
 * Preview draws a page that drops content, which is what it is for, and the
 * export refuses the same deck (`checkContentDropGate`). Saying nothing here
 * left the author looking at a page without its callout and no reason to
 * suspect one, until render refused. The counts are the export gate's own:
 * every `data-dropped` mark, in its own unit.
 */
function droppedContentNote(ir: PptxIR, svgs: readonly string[]): string | null {
  const refs: string[] = []
  svgs.forEach((svg, i) => {
    const byKind = new Map<DropKind, number>()
    for (const m of svg.matchAll(DROP_MARK)) {
      const count = Number(m[1])
      if (count <= 0) continue
      const kind = parseDropKind(m[2])
      byKind.set(kind, (byKind.get(kind) ?? 0) + count)
    }
    if (byKind.size === 0) return
    const id = ir.slides[i]?.id
    const where = id ? `${id} (page ${i + 1})` : `page ${i + 1}`
    refs.push(`${where}: ${Array.from(byKind, ([kind, count]) => dropPhrase(kind, count)).join(", ")}`)
  })
  if (refs.length === 0) return null
  return (
    `note: ${refs.length} page${refs.length === 1 ? " drops" : "s drop"} content that does not fit, and render will refuse the deck until ` +
    `${refs.length === 1 ? "it fits" : "they fit"}. ${refs.join(". ")}. Shorten the content or split the page in two`
  )
}

/** One SVG per page, `NNN-<type>.svg`, the names `preview` has always used. */
async function writeSlideSvgs(outDir: string, ir: PptxIR, svgs: readonly string[]): Promise<string[]> {
  const svgNames: string[] = []
  for (let i = 0; i < ir.slides.length; i++) {
    const name = `${String(i + 1).padStart(3, "0")}-${ir.slides[i]!.type}.svg`
    svgNames.push(name)
    await writeFile(join(outDir, name), svgs[i]!)
  }
  return svgNames
}

/**
 * `preview.html` and `manifest.json` beside the SVGs `writeSlideSvgs` wrote,
 * with the audit run once for both (skipped while a page is unfilled, see
 * {@link buildDeckAuditAndHtml}). `preview --html` and `build` both write
 * through here, so the two bundles are the same files.
 */
async function writePreviewReview(
  outDir: string,
  ir: PptxIR,
  svgs: string[],
  svgNames: readonly string[],
  theme: ThemeDefinition | undefined,
): Promise<{ htmlPath: string; manifestPath: string; findings: AuditFinding[]; checks?: AuditChecks }> {
  const { html, findings, checks } = buildDeckAuditAndHtml(ir, svgs, theme)
  const htmlPath = join(outDir, "preview.html")
  await writeFile(htmlPath, html)

  // The machine-readable half of the same bundle (`./preview-manifest.ts`).
  // A harness with its own UI reads this and draws the deck however it
  // likes; one without a UI opens the HTML sitting next to it. Neither has
  // to re-implement the renderer, which is the only way there stays exactly
  // one rendering path.
  const hasPlaceholder = ir.slides.some((s) => s.placeholder)
  const manifest = buildPreviewManifest({
    title: ir.filename,
    pptwiseVersion: VERSION,
    width: CANVAS_W_PX,
    height: CANVAS_H_PX,
    slides: ir.slides.map((slide, i) => ({
      index: i,
      type: slide.type ?? "content",
      id: slide.id,
      placeholder: slide.placeholder,
      file: svgNames[i]!,
    })),
    findings: findings.map((f) => ({ page: f.page, code: f.code, message: f.message })),
    checks,
    auditNote: hasPlaceholder
      ? "audit skipped — deck has unfilled placeholder pages"
      : undefined,
  })
  const manifestPath = join(outDir, "manifest.json")
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return { htmlPath, manifestPath, findings, ...(checks !== undefined ? { checks } : {}) }
}

export async function runPreview(irPath: string, outDir?: string, opts: PreviewOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { ir, theme, svgs, normalized, isDir, resolvedTarget } = await renderDeckSlides(irPath, {
    cwd,
  })
  // After render, not before (S1 review carry) — see this function's own doc comment.
  const { resolvedOut, extraNotes } = await resolvePreviewOutDir(cwd, outDir, resolvedTarget, isDir, opts)
  const svgNames = await writeSlideSvgs(resolvedOut, ir, svgs)
  const ok = `wrote ${ir.slides.length} SVG files to ${resolvedOut}`
  const notes: string[] = [...extraNotes]
  const aliasNote = normalizedNote(normalized)
  if (aliasNote) notes.push(aliasNote)
  const dropNote = droppedContentNote(ir, svgs)
  if (dropNote) notes.push(dropNote)
  if (opts.htmlOut) {
    const { htmlPath, manifestPath, findings } = await writePreviewReview(resolvedOut, ir, svgs, svgNames, theme)
    notes.push(`note: wrote self-contained preview to ${htmlPath}`)
    notes.push(`note: wrote machine-readable page manifest to ${manifestPath}`)
    if (findings.length > 0) {
      notes.push(`note: audit found ${findings.length} finding${findings.length === 1 ? "" : "s"} — see preview.html`)
    }
  }
  return notes.length > 0 ? `${ok}\n${notes.join("\n")}` : ok
}

export interface BuildOptions {
  /** `--json`: print the {@link BuildReport} instead of a summary. */
  json?: boolean
  cwd?: string
  /** `--no-git-ignore` sets this false. */
  gitIgnore?: boolean
  /** Injectable git runner for tests. Production leaves this unset. */
  runGit?: GitRunner
  /**
   * `--alternatives` (true) or `--no-alternatives` (false): draw the deck's
   * own pages in other themes, or not. Unset draws them on a deck's first
   * build bound to a built-in theme (`./build-alternatives.ts`).
   */
  alternatives?: boolean
}

export interface BuildCliResult {
  output: string
  /** `false` when the deck needs revision. The CLI exits 1 on it. */
  ok: boolean
}

/**
 * `pptwise build <target> [--json]`: assemble, validate, audit, preview and
 * render in one pass, reported as one {@link BuildReport} (`./build-report.ts`).
 *
 * Everything lands in the deck's workspace folder, `.pptwise/<place>/`, the
 * one `render` and `preview` default to. There is no `-o`: a deck has one
 * final .pptx, at `.pptwise/<place>/<deck>.pptx`, and `build` is the command
 * that keeps it honest. It is written only when every check passes, and a
 * build that does not pass removes the one an earlier build left there, so a
 * .pptx at that path always matches the sources the last build read. Nothing
 * else in that folder, or anywhere else, is removed.
 *
 * The pages are drawn whenever validate passes, audit findings or not, so the
 * deck can be looked at while it is being fixed. A target that cannot be
 * found, or a configuration that cannot be read, is not a deck to revise:
 * those fail the command as every other one does.
 */
export async function runBuild(target: string, opts: BuildOptions = {}): Promise<BuildCliResult> {
  const report = await buildDeck(target, opts)
  return {
    output: opts.json ? JSON.stringify(report, null, 2) : formatBuildReport(report),
    ok: report.status === "ok",
  }
}

/**
 * The page ids `deck.spec.json` lists, in order, read only to place an
 * assemble failure on its page. A spec that cannot be read or parsed gives
 * none: assemble's own message already says what is wrong with it.
 */
async function specPageIds(deckDir: string): Promise<string[]> {
  try {
    const spec = JSON.parse(await readFile(join(deckDir, SPEC_FILENAME), "utf8")) as { pages?: { id?: unknown }[] }
    return Array.isArray(spec.pages) ? spec.pages.map((page) => (typeof page?.id === "string" ? page.id : "")) : []
  } catch {
    return []
  }
}

/** Every content page the bound theme draws as another kind, read off the same route render takes. */
function drawnAsReport(ir: PptxIR, theme: ThemeDefinition | undefined): BuildDrawnAs[] {
  const definition = resolveIrTheme(ir, theme)
  const out: BuildDrawnAs[] = []
  ir.slides.forEach((slide, index) => {
    if (slide.type !== "content") return
    const served = resolveEffectiveFace(ir, slide, definition).servedKind
    if (served === undefined || served === slide.kind) return
    out.push({ page: index + 1, ...(slide.id !== undefined ? { pageId: slide.id } : {}), kind: slide.kind, drawnAs: served })
  })
  return out
}

/** Where the bound theme came from: a built-in preset, a theme file, or an installed content pack. */
function themeSourceOf(resolved: ResolvedTheme): BuildThemeSource {
  if (resolved.kind === "builtin") return "builtin"
  return resolved.pack !== undefined ? "pack" : "file"
}

/**
 * Whether this build draws the deck in other themes (`./build-alternatives.ts`):
 * always with `--alternatives`, never with `--no-alternatives`, and otherwise
 * once, on the first build of a deck bound to a built-in theme. A theme file
 * or a pack is a choice someone already made on purpose.
 */
async function wantsAlternatives(flag: boolean | undefined, resolved: ResolvedTheme | undefined, workspaceDir: string): Promise<boolean> {
  if (flag !== undefined) return flag
  if (resolved?.kind !== "builtin") return false
  return !(await pathExists(join(workspaceDir, ALTERNATIVES_DIRNAME, "manifest.json")))
}

/** Audit findings that, on a deck built under a theme its pages were not written for, say the page is drawn short rather than drawn wrong. */
const SWITCH_DECLARED_AUDIT_CODES: ReadonlySet<string> = new Set(["content-truncated", "content-dropped", "stepped-aside"])

/** Which pages the theme's signature drawings drew, from the drawn pages, and the nearest one for each the face drew plain. */
function signatureReport(ir: PptxIR, theme: ThemeDefinition, svgs: readonly string[], isDir: boolean): BuildSignature {
  const perPage: BuildSignaturePage[] = []
  ir.slides.forEach((slide, i) => {
    const use = pageSignatureUse(ir, slide, theme, svgs[i]!)
    if (use === undefined) return
    perPage.push({
      page: i + 1,
      ...(slide.id !== undefined ? { pageId: slide.id } : {}),
      ...(slide.id !== undefined && isDir ? { file: `${PAGES_DIRNAME}/${slide.id}.json` } : {}),
      drawnBy: use.drawnBy,
      ...(use.nearest !== undefined ? { nearest: use.nearest } : {}),
    })
  })
  return { pages: ir.slides.length, offered: perPage.length, drawn: perPage.filter((entry) => entry.drawnBy !== null).length, perPage }
}

async function buildDeck(target: string, opts: BuildOptions): Promise<BuildReport> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit] = await readConfigs(cwd)
  const location = await locateDeckTarget(target, cwd)
  const { isDir, resolvedTarget } = location
  if (!(await pathExists(resolvedTarget))) {
    throw new PptwiseError(`nothing to build at ${resolvedTarget}: pass a deck project directory or an IR JSON file`)
  }
  const workspace = resolveWorkspaceLocation({
    cwd,
    projectConfigPath: projectHit?.path,
    target: resolvedTarget,
    isDir,
  })
  const report: BuildReport = {
    status: "needs_revision",
    target: resolvedTarget,
    theme: undefined,
    pageCount: undefined,
    audited: false,
    errors: [],
    warnings: [],
    preview: null,
    pptx: null,
    notes: [],
  }
  const needsRevision = async (errors: BuildIssue[]): Promise<BuildReport> => {
    // The .pptx an earlier build wrote describes sources that no longer pass.
    await removeFinalPptx(workspace.dir)
    return { ...report, status: "needs_revision", errors }
  }

  const themeInputs = await collectThemeInputs({ startDir: cwd, ...location })
  let loaded: LoadedDeckTarget
  let theme: ThemeDefinition | undefined
  let resolvedTheme: ResolvedTheme | undefined
  try {
    loaded = await readDeckTarget(location, themeInputs, cwd, projectHit)
    resolvedTheme = await applyDeckConfig(loaded.raw, themeInputs)
    theme = resolvedTheme?.definition
  } catch (e) {
    if (!(e instanceof PptwiseError)) throw e
    return needsRevision(assembleIssues(e.message, isDir ? await specPageIds(resolvedTarget) : []))
  }
  // A deck project's pages may have been written for another theme (`./written-for.ts`).
  const writtenFor = isDir ? await readWrittenFor(workspace.dir) : undefined
  const v = validateIr(loaded.raw, { theme, missingAssetPath: loaded.missingAssetPath, ...(writtenFor !== undefined ? { writtenFor } : {}) })
  report.warnings = (v.warnings ?? []).map((issue) => validateIssue(issue, isDir))
  if (!v.ok) return needsRevision(v.errors.map((issue) => validateIssue(issue, isDir)))
  const ir = v.ir!
  report.theme = ir.theme.id
  if (resolvedTheme !== undefined) report.themeSource = themeSourceOf(resolvedTheme)
  report.pageCount = ir.slides.length
  const drawnAs = drawnAsReport(ir, theme)
  if (drawnAs.length > 0) report.drawnAs = drawnAs
  try {
    await resolveLocalAssets(ir, loaded.baseDir, loaded.workspaceAssetsDir)
  } catch (e) {
    if (!(e instanceof PptwiseError)) throw e
    return needsRevision([{ stage: "validate", message: e.message }])
  }

  const svgs = ir.slides.map((_, i) => renderSlideSvg(ir, i, { theme }))
  if (theme !== undefined) report.signature = signatureReport(ir, theme, svgs, isDir)
  report.notes.push(...(await prepareWorkspaceDir(workspace, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })))
  await pruneRenderedSvgs(workspace.dir)
  const svgNames = await writeSlideSvgs(workspace.dir, ir, svgs)
  const review = await writePreviewReview(workspace.dir, ir, svgs, svgNames, theme)
  report.audited = review.checks !== undefined
  report.preview = {
    dir: workspace.dir,
    html: review.htmlPath,
    manifest: review.manifestPath,
    pages: ir.slides.map((slide, i) => ({
      page: i + 1,
      ...(slide.id !== undefined ? { id: slide.id } : {}),
      type: slide.type ?? "content",
      file: join(workspace.dir, svgNames[i]!),
    })),
  }
  if (await wantsAlternatives(opts.alternatives, resolvedTheme, workspace.dir)) {
    report.alternatives = await writeBuildAlternatives(ir, resolveIrTheme(ir, theme), workspace.dir)
  }
  // Under a theme the pages were not written for, a text the face cuts or
  // a label it leaves off (a scroll cover's column too long to stand, say)
  // is the page drawn short, and a page a plainer layout drew whole is the
  // page drawn plainer. The audit finding names the page and what it lost,
  // and stays a warning, so the build still draws the deck.
  const switched = writtenFor !== undefined && writtenFor !== ir.theme.id
  const shortHere = switched ? review.findings.filter((finding) => SWITCH_DECLARED_AUDIT_CODES.has(finding.code)) : []
  report.warnings.push(...shortHere.map((finding) => auditIssue(finding, isDir)))
  const drawnShort = v.switchedFrom !== undefined || shortHere.length > 0
  const errors = [...placeholderIssues(ir, isDir), ...review.findings.filter((finding) => !shortHere.includes(finding)).map((finding) => auditIssue(finding, isDir))]
  if (errors.length > 0) return needsRevision(errors)

  let bytes: Uint8Array
  try {
    // A page drawn short under a theme its pages were not written for is
    // already named in the warnings, so the export takes it as drawn.
    bytes = await generatePptx(ir, { theme, ...(drawnShort ? { allowDroppedContent: true } : {}) })
  } catch (e) {
    if (!(e instanceof PptwiseError)) throw e
    return needsRevision([{ stage: "render", message: e.message }])
  }
  // One final .pptx per deck: a name changed in `filename` leaves no old export beside the new one.
  await removeFinalPptx(workspace.dir)
  const pptxPath = join(workspace.dir, finalPptxName(deckFilename(loaded), workspace.name))
  await writeFile(pptxPath, bytes)
  // Every page drawn whole: the pages are now written for this theme.
  if (isDir && !drawnShort) await writeWrittenFor(workspace.dir, ir.theme.id)
  if (drawnShort) report.writtenFor = writtenFor
  return { ...report, status: "ok", pptx: pptxPath }
}

export interface AssembleOptions {
  output?: string
  cwd?: string
}

/**
 * Rewrites every local (non-`data:`/non-`http(s)`) asset src so it keeps
 * resolving correctly when the assembled IR is written to `outDir`, a
 * different directory than the `deckDir` it was assembled from (`-o`
 * pointing outside the deck project, `runAssemble` below). `readDeckDir`'s
 * asset scan always produces a `deckDir`-relative src (`./deck-dir.ts`'s
 * `scanAssets` — always `assets/<file>`), so writing the IR anywhere else
 * unchanged would leave that src resolving against the *wrong* base the
 * next time this file is loaded (`loadDeckTarget`'s single-file branch
 * resolves relative asset srcs against the IR file's own directory, not
 * where it happened to be assembled from). Rebuilds `assets.images` rather
 * than mutating entries in place — the same "never mutate a live IR's asset
 * map" caution `readDeckDir` itself documents (`./deck-dir.ts`).
 */
function withRewrittenAssetPaths(ir: PptxIR, deckDir: string, outDir: string): PptxIR {
  const images = Object.fromEntries(
    Object.entries(ir.assets.images).map(([id, asset]) => {
      if (asset.src.startsWith("data:") || /^https?:\/\//.test(asset.src)) return [id, asset] as const
      return [id, { ...asset, src: relative(outDir, join(deckDir, asset.src)) }] as const
    }),
  )
  return { ...ir, assets: { images } }
}

/**
 * `pptwise assemble <dir>` (W5 task 5): resolve `target` against the cwd
 * (`resolveDeckTarget`) → `readDeckDir` (spec + pages/ + assets/ →
 * IR, `./deck-dir.ts`) → write the assembled IR as pretty-printed JSON,
 * default `<deckDir>/deck.json` when `-o` is omitted. Deliberately does
 * *not* call `applyDeckConfig` — `assemble` materializes exactly what the
 * spec says plus each page's own auto-selected `layout` where the page file
 * left it implicit (`assembleDeck`'s own doc comment, W4 design decision
 * 10) — a portable IR file, self-contained down to which layout each page
 * will render with. Theme/style overrides are `validate`/`render`/
 * `preview`'s job (each already applies the four-layer chain whether given
 * this same directory or the `deck.json` this command just wrote).
 *
 * `target` must resolve to an actual directory: a target that exists but
 * names a file gets a friendly `expected a deck project directory` error
 * right here rather than reaching `readDeckDir` and failing deeper, with a
 * confusing `ENOTDIR` message, trying to read `<file>/deck.spec.json`. A
 * target that does not exist *at all* is deliberately let through to
 * `readDeckDir` unchanged — its own missing-spec-file error already names
 * the expected layout, strictly more helpful than this shorter message.
 *
 * `-o` resolves against `cwd` (the same fix `resolveDeckTarget` already
 * needed — see that function's own doc comment) rather than the real
 * `process.cwd()`, so a caller that threads a custom `cwd` gets the output
 * where it actually asked for it. When the resolved output directory is not
 * `deckDir` itself, every local asset src is rewritten
 * ({@link withRewrittenAssetPaths}) to stay correct from the new location —
 * otherwise `assets/logo.png` (correct relative to `deckDir`) would silently
 * fail to resolve from wherever `-o` actually put the file.
 *
 * When the spec omitted `seed`, `readDeckDir` (via `assembleDeck`) generates
 * a suggestion to add it back to `deck.spec.json` for revision stability
 * (spec §5's seed-generation semantics). Never written automatically:
 * `assembleDeck` stays a pure function with no fs side effects, and silently
 * rewriting a file the user did not ask this command to touch would be a
 * worse surprise than asking them to paste one line in.
 *
 * already named its own `layout` or landed on the image-cover bypass) gets
 * its own one-line note the same way, listed after the seed note when both
 * apply — purely informational, telling the caller how many pages just had
 * an auto-pick baked into `deck.json` rather than leaving them to notice by
 * diffing the file. The base summary line's `(N slides, M placeholders)`
 * parenthetical itself stays untouched by either note (`scripts/e2e.mts`
 * checks it by exact substring) — both notes are strictly additional lines.
 */
export async function runAssemble(target: string, opts: AssembleOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const dir = await resolveDeckTarget(target, cwd)
  if ((await pathExists(dir)) && !(await isDeckDirectory(dir))) {
    throw new PptwiseError(`expected a deck project directory: ${dir}`)
  }
  // Same theme-input read `loadDeckTarget` performs (brand-extract wave):
  // assemble bypasses that helper but hands the same spec and definition
  // to readDeckDir's assemble step, whose spec gate reads them.
  const themeInputs = (await isDeckDirectory(dir))
    ? await collectThemeInputs({ startDir: cwd, resolvedTarget: dir, isDir: true })
    : undefined
  const { ir, deckDir } = await readDeckDir(dir, {
    theme: themeInputs && themeFromInputs(themeInputs)?.definition,
    spec: themeInputs && sourceFromInputs(themeInputs),
  })
  const outPath = opts.output ? resolve(cwd, opts.output) : join(deckDir, "deck.json")
  const outDir = dirname(outPath)
  const outIr = outDir === deckDir ? ir : withRewrittenAssetPaths(ir, deckDir, outDir)
  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, JSON.stringify(outIr, null, 2) + "\n")
  const placeholderCount = outIr.slides.filter((s) => s.placeholder).length
  const summary = `wrote ${outPath} (${outIr.slides.length} slides, ${placeholderCount} placeholder${placeholderCount === 1 ? "" : "s"})`
  return summary
}

/**
 * `pptwise disassemble <deck.json> -o <dir>` (W5 task 5): the CLI shell for
 * `disassembleDeck` (`../spec/assemble.ts`) — read + validate an IR file the
 * same way `runRender`/`runValidate` do, then write `deck.spec.json` +
 * `pages/<id>.json` for every non-placeholder page. Pretty-printed. Key
 * order is already stable because `disassembleDeck` builds every object
 * with the same fixed field order on every call, not by iterating the
 * input, so there is no separate "stable stringify" step to write. Refuses
 * to overwrite an existing `deck.spec.json` — same `wx`-flag EEXIST guard as
 * `runInit`'s config scaffold — so re-running this command never silently
 * clobbers a deck project someone has since started filling in. Page files
 * are freely (re)written since they only exist because this same command
 * produced them, and written concurrently (`Promise.all`) since each is an
 * independent file.
 *
 * Also materializes `assets/` ({@link writeDeckAssets}, `./deck-dir.ts`) —
 * `disassembleDeck` itself never touches `ir.assets.images` (see that
 * function's own doc comment for the full accounting), so this is the step
 * that actually closes the loop: without it, an image deck disassembles
 * with every `asset_id` reference intact but no bytes behind it, then
 * re-assembles and renders with the image silently missing.
 *
 * The summary never claims to have written a directory it did not create:
 * `pagesDir`/`assetsDir` are only named when at least one page/asset file
 * actually landed there (a spec-only deck with every slide a placeholder,
 * or an assetless deck, leaves either directory unwritten).
 *
 * Every page id is checked with {@link assertSafeFileSegment} (`./deck-dir.ts`)
 * before *any* file is written — not just ahead of `pages/<id>.json` (W5
 * whole-branch review finding 1, CRITICAL — CWE-22), but ahead of
 * `deck.spec.json` too (post-v0.3 W8 fix round, backlog item 8,
 * `.issues/notes/engineering-history.md` #8 — the check originally
 * ran after the spec write): `slide.id` is an unrestricted string at the
 * schema layer, so a hand-authored IR could otherwise set one to
 * `"../../../../escape"` and write outside `outDir`. `writeDeckAssets` below
 * (`./deck-dir.ts`) carries the matching check for asset keys, inside
 * `writeOneAsset` — that check stays per-asset rather than also moving
 * ahead of the spec write, since an unsafe id is only one of several ways
 * `writeOneAsset` can fail (malformed data URI, URL asset, unreadable local
 * file) and the others can't be front-loaded without doing the write itself.
 *
 * Failure rollback (post-v0.3 W8 fix round, backlog item 8): once
 * `deck.spec.json` is written, this call is the sole owner of that file for
 * the rest of its own execution, so any failure in the page/asset writes
 * below deletes it before rethrowing — a failed run never leaves a
 * `deck.spec.json` behind that doesn't match what actually landed in
 * `pages/`/`assets/`. The `wx` no-overwrite guard above still runs first and
 * throws before this rollback scope is ever entered, so a pre-existing
 * `deck.spec.json` this call did not itself create is never at risk of
 * being deleted — deleting only ever targets the file this same invocation
 * just wrote.
 */
export async function runDisassemble(irPath: string, outDir: string): Promise<string> {
  const raw = await loadIrFile(irPath)
  const v = validateIr(raw)
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  const { spec, pages } = disassembleDeck(v.ir!)

  // W5 whole-branch review finding 1 (CRITICAL, CWE-22): `id` is `slide.id`
  // off the parsed input IR (`disassembleDeck` passes a bare `slide.id`
  // through unchanged when present, `../spec/assemble.ts`) — unrestricted at
  // the schema layer, so an id like `"../../../../escape"` would otherwise
  // write outside `outDir`. Post-v0.3 W8 fix round (backlog item 8): checked
  // here, ahead of every write including `deck.spec.json` itself, so a
  // single unsafe id fails the whole call with nothing written at all,
  // rather than leaving a `deck.spec.json` that then needs rolling back.
  const ids = Object.keys(pages)
  for (const id of ids) assertSafeFileSegment(id, "slide id")

  const specPath = join(outDir, "deck.spec.json")
  await mkdir(outDir, { recursive: true })
  try {
    await writeFile(specPath, JSON.stringify(spec, null, 2) + "\n", { flag: "wx" })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new PptwiseError(`${specPath} already exists — refusing to overwrite an existing deck project`)
    }
    throw e
  }

  // From here on `specPath` is a file this call just created (the `wx` flag
  // above guarantees no pre-existing file survived to this point), so it is
  // safe to delete on any failure below — backlog item 8: a mid-way failure
  // used to leave `deck.spec.json` on disk with no matching pages/assets,
  // misrepresenting the deck project as already, successfully disassembled.
  const pagesDir = join(outDir, "pages")
  try {
    if (ids.length > 0) {
      await mkdir(pagesDir, { recursive: true })
      await Promise.all(
        ids.map((id) => {
          const content: PageContent = pages[id]!
          return writeFile(join(pagesDir, `${id}.json`), JSON.stringify(content, null, 2) + "\n")
        }),
      )
    }

    const { count: assetCount, assetsDir } = await writeDeckAssets(
      v.ir!.assets.images,
      outDir,
      dirname(resolve(irPath)),
    )

    const pagesNote =
      ids.length > 0
        ? `${ids.length} page file${ids.length === 1 ? "" : "s"} to ${pagesDir}`
        : "no pages (every slide was a placeholder)"
    const assetsNote = assetCount > 0 ? `, and ${assetCount} asset file${assetCount === 1 ? "" : "s"} to ${assetsDir}` : ""
    return `wrote ${specPath}, ${pagesNote}${assetsNote}`
  } catch (e) {
    // Best-effort cleanup: a failure to delete the spec file must never mask
    // the real failure `e` below, so its own error is swallowed, not thrown.
    await rm(specPath, { force: true }).catch(() => {})
    throw e
  }
}
