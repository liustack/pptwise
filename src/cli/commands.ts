import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve } from "node:path"
import {
  formatIssues,
  formatWarnings,
  generatePptx,
  irJsonSchema,
  listThemes,
  renderSlideSvg,
  styleJsonSchema,
  validateIr,
  type ValidationIssue,
} from "../api"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { PptwiseError } from "../errors"
import { VERSION } from "../version"
import { StyleOverrideSchema, type PptxIR, type StyleOverride } from "../ir"
import { PptxIRV3Schema } from "../ir/legacy-v3"
import {
  migrateBannerHeadingToTwoColumn,
  migrateBloomToClassroom,
  migrateChromeToBranding,
  migrateIrV3ToV4,
  migrateLogoWallToImageGrid,
} from "../ir/migrate"
import { disassembleDeck, type PageContent } from "../spec/assemble"
import { formatInvalidSpecError, specJsonSchema, resolveSpecThemeId, validateSpec } from "../spec"
import { migrateDeckPlanToSpec } from "../spec/migrate"
import { AUDIENCE_VALUES, PACING_BUDGETS, STRATEGY_DEFINITIONS, NARRATIVE_PRESETS, resolveNarrative, type NarrativeProfile } from "../narrative"
import { auditDeck, type AuditChecks, type AuditFinding, type AuditReport } from "../audit/deck-audit"
import { buildAssetBrief, type AssetBrief, type AssetBriefItem } from "../render/asset-brief"
import { extractBrandTheme, slugify } from "../themes/extract/brand-extract"
import { CANONICAL_THEME_IDS } from "../themes"
import { ThemeFileSchema, type ThemeFile } from "../themes/schema"
import { THEME_OCCASIONS } from "../themes/occasions"
import { LAYOUT_REGISTRY } from "../layouts/registry"
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
  PLAN_FILENAME,
  SPEC_FILENAME,
  THEME_FILENAME,
} from "./deck-dir"
import { loadIrFile, resolveLocalAssets } from "./load-ir"
import { buildContactSheetHtml, buildPreviewHtml } from "./preview-html"
import { buildPreviewManifest } from "./preview-manifest"
import {
  prepareWorkspaceDir,
  pruneRenderedSvgs,
  resolveWorkspaceLocation,
  scanWorkspaceAssets,
  type GitRunner,
} from "./workspace"
import {
  assertThemeRebind,
  materializeBuiltinTheme,
  registerThemeSelection,
  resolveThemeByName,
  themeNameFromUnknown,
  WORKSPACE_THEMES_DIRNAME,
  type ResolvedTheme,
} from "./theme-resolve"
import { contrastFloorError, forkTheme, forkThemeUnchecked } from "./theme-fork"
import { THEME_TRY_SAMPLE_IR } from "./fixtures/theme-try-sample"

/** `findUserConfig()`'s own return shape, named here so it can be threaded as
 *  a parameter (`loadDeckTarget`/`applyDeckConfig` below) instead of each
 *  callee re-fetching it — see `applyDeckConfig`'s own doc comment for why. */
type UserConfigHit = Awaited<ReturnType<typeof findUserConfig>>

/** `findConfig()`'s own return shape — the project-layer counterpart to
 *  {@link UserConfigHit}, threaded the same way and for the same reason
 *  (W5 task 6: `loadDeckTarget` now needs the project layer too, for
 *  `decksDir` — see {@link resolveDecksDirSource}). */
type ProjectConfigHit = Awaited<ReturnType<typeof findConfig>>

async function loadStyleFile(path: string): Promise<StyleOverride> {
  const raw = await loadIrFile(path)
  const r = StyleOverrideSchema.safeParse(raw)
  if (!r.success) {
    const detail = r.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n")
    throw new PptwiseError(`invalid style file ${path}:\n${detail}`)
  }
  return r.data
}

async function registerThemesFromSpecSource(
  specPath: string,
  opts: { startDir: string; deckDir?: string },
): Promise<void> {
  if (!(await pathExists(specPath))) return
  const specRaw = await loadIrFile(specPath, "spec")
  await registerThemeSelection(themeNameFromUnknown(specRaw), opts)
}

/**
 * The `config` argument `resolveDeckTarget` (`./deck-dir.ts`) and its
 * `decksRoot` (`./home.ts`) expect: an object exposing `decksDir`, resolved
 * against whichever base that value's own layer implies. Project
 * `pptwise.config.json`'s own `decksDir` (spec §7's project-level escape
 * hatch, `ConfigSchema` in `./config.ts`, W5 task 6) wins over the user
 * config's (`UserConfigSchema`) when both are set — same project-beats-user
 * precedence as `theme`/`style` (see `applyDeckConfig` below) — but the two
 * layers resolve against different bases (project against the config file's
 * own directory, user against `pptwiseHome()`, `decksRoot`'s one fixed
 * base), so a winning project value is resolved to an absolute path *here*,
 * before being handed down: `decksRoot`'s own
 * `resolve(pptwiseHome(), config?.decksDir ?? "decks")` then returns that
 * absolute path unchanged (`path.resolve`'s own semantics for an absolute
 * later segment) — the same "already-absolute short-circuits the base"
 * behavior `decksRoot({ decksDir: "/elsewhere/decks" })` already exercises
 * for the user layer, reused rather than reimplemented. Falls through to
 * `userHit?.config` untouched when the project layer has no `decksDir` of
 * its own — including when there is no project config at all — so the user
 * layer (or, absent that too, `decksRoot`'s own built-in default) keeps
 * working exactly as before this function existed.
 */
function resolveDecksDirSource(
  projectHit: ProjectConfigHit,
  userHit: UserConfigHit,
): { decksDir?: string } | undefined {
  if (projectHit?.config.decksDir !== undefined) {
    return { decksDir: resolve(dirname(projectHit.path), projectHit.config.decksDir) }
  }
  return userHit?.config
}

/**
 * Resolve deck defaults onto the raw (pre-validation) IR.
 * Selection authority is spec.theme (deck project) or authored IR theme.id
 * (bare file). Config.theme is not a selection layer. Style flags/config
 * still apply. Assembled deck-dir IR always carries theme.id even when the
 * spec omitted theme. That filled default is not an authored layer: pass
 * `fromDeckDir: true` and `specTheme` from the raw spec instead of reading
 * `ir.theme.id` after assemble.
 */
export async function applyDeckConfig(
  raw: unknown,
  opts: {
    /** Raw `deck.spec.json` `theme` when the target is a deck project and
     *  the spec actually named one. Omitted when the spec omitted `theme`. */
    specTheme?: string
    specPath?: string
    /** True when `raw` came from assembling a deck project directory.
     *  Assembled IR's filled `theme.id` is not an authored selection layer. */
    fromDeckDir?: boolean
    /** Deck project directory, used for three-level lookup and the rebind guard. */
    deckDir?: string
    stylePath?: string
    cwd: string
    projectHit?: ProjectConfigHit
    userHit?: UserConfigHit
  },
): Promise<void> {
  if (typeof raw !== "object" || raw === null) return // schema error surfaces in validateIr
  const deck = raw as Record<string, unknown>
  const irTheme =
    typeof deck.theme === "object" && deck.theme !== null
      ? (deck.theme as Record<string, unknown>)
      : {}
  const [projectHit, userHit] = await Promise.all([
    opts.projectHit !== undefined ? Promise.resolve(opts.projectHit) : findConfig(opts.cwd),
    opts.userHit !== undefined ? Promise.resolve(opts.userHit) : findUserConfig(),
  ])
  const authoredName =
    opts.specTheme
    ?? (opts.fromDeckDir ? undefined : (typeof irTheme.id === "string" ? irTheme.id : undefined))
  let theme: string | undefined
  if (authoredName !== undefined) {
    const resolved = await resolveThemeByName(authoredName, { startDir: opts.cwd, deckDir: opts.deckDir })
    await assertThemeRebind(opts.deckDir, resolved)
    theme = resolved.id
  }
  const style = opts.stylePath
    ? await loadStyleFile(opts.stylePath)
    : (projectHit?.config.style ?? userHit?.config.style ?? irTheme.style)
  if (theme === undefined && style === undefined) return
  deck.theme = {
    ...irTheme,
    ...(theme !== undefined ? { id: theme } : {}),
    ...(style !== undefined ? { style } : {}),
  }
}

/**
 * Shared "turn a CLI target argument into a raw IR-shaped object plus its
 * asset base directory" step for `runValidate`/`runRender`/`runPreview` (W5
 * task 5) — the one piece of logic those three commands would otherwise
 * triplicate. `arg` is resolved through `resolveDeckTarget` (path vs.
 * bare-name, spec §7) using the effective `decksDir` source — project config
 * when it sets one, else the user config's, else `resolveDeckTarget`'s own
 * built-in default (W5 task 6, {@link resolveDecksDirSource}) — then
 * branches on whether the resolved target is a deck project directory:
 *
 * - directory → `readDeckDir` (assemble in memory — spec + pages/ + assets/,
 *   `./deck-dir.ts`), asset paths resolve against the deck directory itself.
 * - file → the pre-existing single-file path, byte-for-byte: `loadIrFile`
 *   then the same `dirname(resolve(...))` asset base every caller already
 *   used. When `arg` is an explicit path (has a separator, or exists
 *   locally — true of every pre-W5 caller, since every existing test passes
 *   a full path), `resolveDeckTarget` returns it completely unchanged with
 *   no `fs` call at all, so this branch degenerates to exactly the old
 *   inline code — single-file behavior stays byte-identical.
 *
 * `isDir` is threaded back so `runValidate` can gate its dir-only placeholder
 * note on it (single-file mode must never grow that note, even for a
 * hand-authored IR that happens to set `placeholder: true` itself).
 *
 * `projectHit`/`userHit` are the caller's own already-fetched
 * `findConfig(cwd)`/`findUserConfig()` results (see `applyDeckConfig`'s doc
 * comment above for why both are threaded rather than fetched here too).
 *
 * `resolvedTarget` (serve wave, task S1) is the absolute path `target` itself
 * resolved to — the deck directory (`isDir: true`) or the single IR file
 * (`isDir: false`). `runRender`/`runPreview` use it as the slug source when
 * `-o` is omitted (workspace-artifacts wave). `buildDeckPreview` hands it to
 * `createServeServer` (`./serve.ts`) as the exact path to `fs.watch`, without
 * that module re-deriving the same bare-name/`decksDir` resolution a second
 * time.
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
    outDir: projectHit?.config.outDir,
    target: resolvedTarget,
    isDir,
  })
  const workspaceAssetsDir = join(location.dir, ASSETS_DIRNAME)
  const images = await scanWorkspaceAssets(workspaceAssetsDir)
  return { workspaceAssetsDir, images }
}

async function loadDeckTarget(
  arg: string,
  cwd: string,
  projectHit: ProjectConfigHit,
  userHit: UserConfigHit,
): Promise<{
  raw: unknown
  baseDir: string
  isDir: boolean
  resolvedTarget: string
  workspaceAssetsDir: string
  specTheme?: string
  specPath?: string
}> {
  const target = await resolveDeckTarget(arg, resolveDecksDirSource(projectHit, userHit), cwd)
  if (await isDeckDirectory(target)) {
    await registerThemesFromSpecSource(join(target, SPEC_FILENAME), { startDir: cwd, deckDir: target })
    const { ir, deckDir, specTheme, specPath } = await readDeckDir(target)
    const stock = await loadWorkspaceStock(cwd, projectHit, deckDir, true)
    return {
      raw: mergeWorkspaceImages(ir, stock.images),
      baseDir: deckDir,
      isDir: true,
      resolvedTarget: deckDir,
      workspaceAssetsDir: stock.workspaceAssetsDir,
      specTheme,
      specPath,
    }
  }
  const raw = await loadIrFile(target)
  const resolvedFile = resolve(target)
  const stock = await loadWorkspaceStock(cwd, projectHit, resolvedFile, false)
  return {
    raw: mergeWorkspaceImages(raw, stock.images),
    baseDir: dirname(resolvedFile),
    isDir: false,
    resolvedTarget: resolvedFile,
    workspaceAssetsDir: stock.workspaceAssetsDir,
  }
}

/** Load, apply deck config, validate, and resolve local assets — the same
 *  sequence `runAssetBrief` uses, exported so `images generate` can read
 *  `suggested_prompt` without duplicating the chain. */
export async function loadValidatedDeckIr(target: string, cwd: string): Promise<PptxIR> {
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, workspaceAssetsDir, isDir, resolvedTarget, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    cwd,
    projectHit,
    userHit,
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
  })
  const v = validateIr(raw)
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  return v.ir!
}

export interface RenderOptions {
  /** `-o <file>`. Optional (workspace-artifacts wave): omitted, the deck
   *  renders to `<anchor>/.pptwise/<slug>/<slug>.pptx` — see
   *  {@link resolveWorkspaceLocation} (`./workspace.ts`) for how the anchor
   *  and slug are derived. A relative value resolves against `cwd`, and the
   *  workspace default is never consulted: an explicit path is always the
   *  final word, and nothing gets created or ignored on its behalf. */
  output?: string
  stylePath?: string
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
 * a bare deck name under `~/.pptwise/decks` (W5 task 5, `loadDeckTarget`
 * above) — directory/bare-name input is assembled in memory first, then
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
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, specTheme, specPath } = await loadDeckTarget(irPath, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
    stylePath: opts.stylePath,
    cwd,
    projectHit,
    userHit,
  })
  const v = validateIr(raw)
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const bytes = await generatePptx(v.ir!, {
    draft: opts.draft,
    allowDroppedContent: opts.allowDroppedContent,
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
      outDir: projectHit?.config.outDir,
      target: resolvedTarget,
      isDir,
    })
    extraNotes.push(...(await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })))
    output = join(location.dir, `${location.slug}.pptx`)
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
 * `irPath` accepts a single IR/spec JSON file, a deck project directory, or
 * a bare deck name (same `loadDeckTarget` resolution `runRender` uses).
 * Directory/bare-name input additionally gets a {@link placeholderNote} —
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
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, specTheme, specPath } = await loadDeckTarget(irPath, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
    cwd,
    projectHit,
    userHit,
  })
  const v = validateIr(raw)
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
 * bare name under `~/.pptwise/decks`), validate first, then hand the
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
 * Theme selection is spec.theme or IR theme.id. Style config still applies.
 */
export async function runAudit(target: string, opts: AuditOptions = {}): Promise<AuditCliResult> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, workspaceAssetsDir, isDir, resolvedTarget, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
    cwd,
    projectHit,
    userHit,
  })
  const v = validateIr(raw)
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const report = opts.pixels ? await auditDeck(v.ir!, { pixels: true }) : auditDeck(v.ir!)
  const hasFindings = report.findings.length > 0
  const output = opts.json ? JSON.stringify(report, null, 2) : formatAuditReport(report, v.ir!)
  return { output, hasFindings }
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
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, workspaceAssetsDir, isDir, resolvedTarget, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
    cwd,
    projectHit,
    userHit,
  })
  const v = validateIr(raw)
  if (!v.ok) {
    throw new PptwiseError(
      `invalid IR (${v.errors.length} issue${v.errors.length === 1 ? "" : "s"}):\n${formatIssues(v.errors)}`,
    )
  }
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const brief = buildAssetBrief(v.ir!)
  return opts.json ? JSON.stringify(brief, null, 2) : formatAssetBriefReport(brief)
}

/**
 * Validate a deck spec JSON file (W5 task 2: `pptwise plan validate`, renamed
 * to `pptwise spec validate` — vocabulary-v4 rename, task 2, spec §8.2).
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
  await registerThemeSelection(themeNameFromUnknown(raw), { startDir: specDir, deckDir: specDir })
  const v = validateSpec(raw)
  if (!v.ok) {
    throw new PptwiseError(formatInvalidSpecError(v.errors))
  }
  const spec = v.spec!
  // Safe to call unguarded: validateSpec already resolved this same
  // expression successfully as part of its own hard-gate chain.
  const axes = resolveNarrative(spec.narrative as string | Partial<NarrativeProfile> | undefined)
  const ok = `OK — ${spec.pages.length} pages, narrative ${axes.strategy}/${axes.pacing}/${axes.audience}, theme "${resolveSpecThemeId(spec)}"`
  const aliasNote = normalizedNote(v.normalized)
  return aliasNote ? `${ok}\n${aliasNote}` : ok
}

/** `mode` selects which JSON Schema to print (`pptwise schema [--style|--spec]`,
 *  spec §8.2's `schema --plan`→`schema --spec` rename, task 2) — `"plan"` was
 *  the pre-rename flag value, no longer accepted (`../cli.ts` hard-fails a
 *  bare `--plan` before this function is ever called, see that file's own
 *  comment). */
export function runSchema(mode?: "style" | "spec"): string {
  const schema = mode === "style" ? styleJsonSchema() : mode === "spec" ? specJsonSchema() : irJsonSchema()
  return JSON.stringify(schema, null, 2)
}

export function runThemes(asJson: boolean): string {
  const themes = listThemes()
  if (asJson) {
    return JSON.stringify(
      themes.map((t) => {
        const rec = Object.hasOwn(THEME_OCCASIONS, t.id)
          ? THEME_OCCASIONS[t.id as keyof typeof THEME_OCCASIONS]
          : undefined
        return {
          id: t.id,
          label: t.label,
          colors: t.colors,
          occasions: rec?.occasions ?? [],
          identity: rec?.identity ?? null,
        }
      }),
      null,
      2,
    )
  }
  return themes.map((t) => `${t.id.padEnd(12)} ${t.label}`).join("\n")
}

interface LayoutDiscoverySlot {
  name: string
  accepts: readonly string[] | "any"
  capacity?: number
}

interface LayoutDiscoveryRow {
  id: string
  slideTypes: readonly string[]
  pinOnly: boolean
  capacity?: number
  slots: LayoutDiscoverySlot[]
  arrangements?: readonly string[] | "all"
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
      pinOnly: layout.pinOnly ?? false,
      slots: layout.slots.map((slot) => {
        const compact: LayoutDiscoverySlot = { name: slot.name, accepts: slot.accepts }
        if (slot.capacity !== undefined) compact.capacity = slot.capacity
        return compact
      }),
    }
    if (capacity !== undefined) row.capacity = capacity
    if (layout.arrangements !== undefined) row.arrangements = layout.arrangements
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
    pin: l.pinOnly ? "pin-only" : "-",
    cap: l.capacity !== undefined ? String(l.capacity) : "-",
    slots: l.slots.map((s) => s.name).join(", "),
    arrangements: l.arrangements === undefined ? "-" : l.arrangements === "all" ? "all" : l.arrangements.join(","),
  }))
  const idWidth = Math.max(...rows.map((r) => r.id.length))
  const typesWidth = Math.max(...rows.map((r) => r.types.length))
  const pinWidth = Math.max(...rows.map((r) => r.pin.length))
  const capWidth = Math.max(...rows.map((r) => r.cap.length))
  const slotsWidth = Math.max(...rows.map((r) => r.slots.length))
  return rows
    .map(
      (r) =>
        `${r.id.padEnd(idWidth + 2)}${r.types.padEnd(typesWidth + 2)}${r.pin.padEnd(pinWidth + 2)}${r.cap.padEnd(capWidth + 2)}${r.slots.padEnd(slotsWidth + 2)}${r.arrangements}`,
    )
    .join("\n")
}

export interface BrandExtractOptions {
  output: string
  /** `--id` (裁定 4) — defaults to a slug of the output filename. */
  id?: string
  /** `--label` — defaults to the source theme's own color-scheme name. */
  label?: string
  /** Donor preset whose menu and remaining tokens are copied. Default consulting. */
  from?: string
}

/** `basename(output)` minus a trailing `.theme.json`/`.json`, slugged — the
 *  裁定 4 default id (`my-brand.theme.json` → `my-brand`). */
function defaultThemeIdFor(output: string): string {
  return slugify(basename(output).replace(/\.theme\.json$|\.json$/i, ""))
}

function assertCustomThemeId(id: string): void {
  if ((CANONICAL_THEME_IDS as readonly string[]).includes(id)) {
    throw new PptwiseError(
      `theme id "${id}" collides with a built-in pptwise theme — pick a different id with --id (or a different output filename)`,
    )
  }
}

async function defaultThemeOutputPath(id: string, cwd: string): Promise<string> {
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
    assertCustomThemeId(id)
    return { id, output }
  }
  if (opts.id !== undefined) {
    assertCustomThemeId(opts.id)
    return { id: opts.id, output: await defaultThemeOutputPath(opts.id, opts.cwd) }
  }
  throw new PptwiseError("pass --id or -o so the theme file has a name")
}

async function themeFileFromResolved(resolved: ResolvedTheme, identity: { id: string; label?: string }): Promise<ThemeFile> {
  if (resolved.kind === "builtin") {
    return materializeBuiltinTheme(resolved.id, identity)
  }
  const copy = structuredClone(resolved.file)
  copy.id = identity.id
  copy.style = { ...copy.style, id: identity.id }
  if (identity.label !== undefined) copy.label = identity.label
  return ThemeFileSchema.parse(copy) as ThemeFile
}

async function writeThemeFile(path: string, file: ThemeFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(file, null, 2) + "\n")
}

/**
 * `pptwise brand extract <file> -o <out.theme.json> [--id] [--label] [--from]`
 * extracts colors/fonts locally, copies the donor preset's menu, then
 * `forkTheme`s the donor around the extracted anchors. Contrast failure
 * still writes the file and appends a warning.
 */
export async function runBrandExtract(file: string, opts: BrandExtractOptions): Promise<string> {
  let bytes: Buffer
  try {
    bytes = await readFile(file)
  } catch {
    throw new PptwiseError(`cannot read template file: ${file}`)
  }
  const id = opts.id ?? defaultThemeIdFor(opts.output)
  assertCustomThemeId(id)
  const extracted = await extractBrandTheme(bytes, { id, label: opts.label })
  const from = opts.from ?? "consulting"
  const cwd = dirname(resolve(opts.output))
  const donorResolved = await resolveThemeByName(from, { startDir: cwd })
  const donor = await themeFileFromResolved(donorResolved, { id: extracted.id, label: extracted.label })
  const theme = forkThemeUnchecked(
    donor,
    {
      primary: extracted.style.colors.primary,
      accent: extracted.style.colors.accent,
      bg: extracted.style.colors.bg,
      text: extracted.style.colors.text,
      surface: extracted.style.colors.surface,
      chartPalette: extracted.style.colors.chartPalette,
    },
    { id: extracted.id, label: extracted.label, fonts: extracted.style.fonts },
  )
  const outPath = resolve(opts.output)
  await writeThemeFile(outPath, theme)
  const c = theme.style.colors
  const lines = [
    `wrote ${opts.output} (theme "${theme.id}", label "${theme.label}")`,
    `  colors: bg ${c.bg}, text ${c.text}, primary ${c.primary}, accent ${c.accent}, muted ${c.muted} (derived), ${c.chartPalette.length} chart colors`,
    `  fonts: heading "${theme.style.fonts.heading[0]}", body "${theme.style.fonts.body[0]}"`,
    `Drop the file in a deck ${THEME_FILENAME} or workspace themes/ and set spec.theme to "${theme.id}".`,
  ]
  const contrastWarning = contrastFloorError(theme.id, theme.style)
  if (contrastWarning !== undefined) {
    lines.push(
      `warning: this theme will be refused at load time — ${contrastWarning}. Edit the written file's colors (darker text, or a lighter bg) before using it`,
    )
  }
  return lines.join("\n")
}

export interface ThemeNewOptions {
  from: string
  output?: string
  id?: string
  label?: string
  cwd?: string
}

/** `pptwise theme new --from <preset|theme-name>` copies a resolved theme into
 *  a self-contained v2 file. Create means copy. There is no `base`. */
export async function runThemeNew(opts: ThemeNewOptions): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { id, output } = await resolveThemeWriteTarget({ id: opts.id, output: opts.output, cwd })
  const resolved = await resolveThemeByName(opts.from, { startDir: cwd })
  const file = await themeFileFromResolved(resolved, { id, label: opts.label })
  await writeThemeFile(output, file)
  return `wrote ${output} (theme "${file.id}"). Set spec.theme to "${file.id}".`
}

export interface ThemeForkOptions {
  primary: string
  bg?: string
  accent?: string
  text?: string
  surface?: string
  output?: string
  id?: string
  label?: string
  cwd?: string
}

/** `pptwise theme fork <name> --primary <#hex>` copies the source and
 *  rederives tokens around the new anchors. Contrast failure is a hard error. */
export async function runThemeFork(name: string, opts: ThemeForkOptions): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { id, output } = await resolveThemeWriteTarget({ id: opts.id, output: opts.output, cwd })
  const resolved = await resolveThemeByName(name, { startDir: cwd })
  const source = await themeFileFromResolved(resolved, { id, label: opts.label })
  const file = forkTheme(
    source,
    { primary: opts.primary, bg: opts.bg, accent: opts.accent, text: opts.text, surface: opts.surface },
    { id, label: opts.label ?? source.label },
  )
  await writeThemeFile(output, file)
  return `wrote ${output} (theme "${file.id}"). Set spec.theme to "${file.id}".`
}

export interface ThemeTryOptions {
  output?: string
  cwd?: string
  gitIgnore?: boolean
  runGit?: GitRunner
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
export async function runThemeTry(idsRaw: string, opts: ThemeTryOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const ids = parseThemeTryIds(idsRaw)
  const columns: { id: string; slides: { type: string; label: string; svg: string }[] }[] = []
  for (const name of ids) {
    const resolved = await resolveThemeByName(name, { startDir: cwd })
    const raw = structuredClone(THEME_TRY_SAMPLE_IR) as { theme: { id: string }; slides: unknown[]; filename: string }
    raw.theme = { id: resolved.id }
    const v = validateIr(raw)
    if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
    const ir = v.ir!
    const svgs = ir.slides.map((_, index) => renderSlideSvg(ir, index))
    columns.push({ id: resolved.id, slides: contactSheetSlidesFromIr(ir, svgs) })
  }
  let resolvedOut: string
  const extraNotes: string[] = []
  if (opts.output !== undefined) {
    resolvedOut = resolve(cwd, opts.output)
    await mkdir(resolvedOut, { recursive: true })
  } else {
    const projectHit = await findConfig(cwd)
    const location = resolveWorkspaceLocation({
      cwd,
      projectConfigPath: projectHit?.path,
      outDir: projectHit?.config.outDir,
      target: "theme-try",
      isDir: true,
    })
    extraNotes.push(...(await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })))
    resolvedOut = location.dir
  }
  const htmlPath = join(resolvedOut, "contact-sheet.html")
  await writeFile(htmlPath, buildContactSheetHtml({ title: "theme try", themes: columns }))
  const ok = `wrote contact sheet to ${htmlPath}`
  return extraNotes.length > 0 ? `${ok}\n${extraNotes.join("\n")}` : ok
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

const CONFIG_TEMPLATE = {
  style: {
    colors: { primary: "#0B5FFF", accent: "#FF6A00" },
  },
} as const

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
  return `wrote ${target} — themes: \`pptwise themes\`, style schema: \`pptwise schema --style\``
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
 * `runRender`/`runValidate`/`runAudit` (single IR file, deck project
 * directory, or bare deck name — {@link loadDeckTarget} above), then renders
 * every slide to SVG once (`svgs`, index-aligned with `ir.slides`) — the same
 * strings both `runPreview`'s per-slide `.svg` files and
 * {@link buildDeckAuditAndHtml}'s embedded `preview.html` copies come from,
 * so the two stay byte-identical by construction, not just because the
 * renderer is deterministic (the same guarantee `runPreview` documented
 * before this extraction).
 */
interface DeckRenderResult {
  ir: PptxIR
  svgs: string[]
  /** The deck directory (`isDir: true`) or the single IR file (`isDir:
   *  false`) `target` resolved to — see {@link loadDeckTarget}'s own doc
   *  comment on `resolvedTarget` for why this is threaded back. */
  resolvedTarget: string
  isDir: boolean
  normalized?: string[]
}

async function renderDeckSlides(
  target: string,
  opts: { cwd?: string } = {},
): Promise<DeckRenderResult> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    specTheme,
    specPath,
    fromDeckDir: isDir,
    deckDir: isDir ? resolvedTarget : undefined,
    cwd,
    projectHit,
    userHit,
  })
  const v = validateIr(raw)
  if (!v.ok) throw new PptwiseError(`invalid IR:\n${formatIssues(v.errors)}`)
  await resolveLocalAssets(v.ir!, baseDir, workspaceAssetsDir)
  const ir = v.ir!
  const svgs = ir.slides.map((_, i) => renderSlideSvg(ir, i))
  return { ir, svgs, resolvedTarget, isDir, normalized: v.normalized }
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
): { html: string; findings: AuditFinding[]; checks?: AuditChecks } {
  const hasPlaceholder = ir.slides.some((slide) => slide.placeholder)
  const auditReport = hasPlaceholder ? undefined : auditDeck(ir)
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
 * straight out of this function either way — it is `createServeServer`'s job
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
  const { html, findings, checks } = buildDeckAuditAndHtml(rendered.ir, rendered.svgs)
  return { ...rendered, html, findings, checks }
}

/**
 * `irPath` accepts a single IR/spec JSON file, a deck project directory, or
 * a bare deck name (same `loadDeckTarget` resolution `runRender` uses).
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
    outDir: projectHit?.config.outDir,
    target: resolvedTarget,
    isDir,
  })
  const extraNotes = await prepareWorkspaceDir(location, { gitIgnore: opts.gitIgnore, runGit: opts.runGit })
  await pruneRenderedSvgs(location.dir)
  return { resolvedOut: location.dir, extraNotes }
}

export async function runPreview(irPath: string, outDir?: string, opts: PreviewOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  const { ir, svgs, normalized, isDir, resolvedTarget } = await renderDeckSlides(irPath, {
    cwd,
  })
  // After render, not before (S1 review carry) — see this function's own doc comment.
  const { resolvedOut, extraNotes } = await resolvePreviewOutDir(cwd, outDir, resolvedTarget, isDir, opts)
  const svgNames: string[] = []
  for (let i = 0; i < ir.slides.length; i++) {
    const name = `${String(i + 1).padStart(3, "0")}-${ir.slides[i]!.type}.svg`
    svgNames.push(name)
    await writeFile(join(resolvedOut, name), svgs[i]!)
  }
  const ok = `wrote ${ir.slides.length} SVG files to ${resolvedOut}`
  const notes: string[] = [...extraNotes]
  const aliasNote = normalizedNote(normalized)
  if (aliasNote) notes.push(aliasNote)
  if (opts.htmlOut) {
    const { html, findings, checks } = buildDeckAuditAndHtml(ir, svgs)
    const htmlPath = join(resolvedOut, "preview.html")
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
    const manifestPath = join(resolvedOut, "manifest.json")
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    notes.push(`note: wrote self-contained preview to ${htmlPath}`)
    notes.push(`note: wrote machine-readable page manifest to ${manifestPath}`)
    if (findings.length > 0) {
      notes.push(`note: audit found ${findings.length} finding${findings.length === 1 ? "" : "s"} — see preview.html`)
    }
  }
  return notes.length > 0 ? `${ok}\n${notes.join("\n")}` : ok
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
 * `pptwise assemble <dir|name>` (W5 task 5): resolve `target` (path or bare
 * deck name, `resolveDeckTarget`) → `readDeckDir` (spec + pages/ + assets/ →
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
 * one deterministically and reports it as `generatedSeed` — surfaced here as
 * a suggestion to add it back to `deck.spec.json` for revision stability
 * (spec §5's seed-generation semantics). Never written automatically:
 * `assembleDeck` stays a pure function with no fs side effects, and silently
 * rewriting a file the user did not ask this command to touch would be a
 * worse surprise than asking them to paste one line in.
 *
 * `materializedLayoutCount` (also from `assembleDeck`, unset when every page
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
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const dir = await resolveDeckTarget(target, resolveDecksDirSource(projectHit, userHit), cwd)
  if ((await pathExists(dir)) && !(await isDeckDirectory(dir))) {
    throw new PptwiseError(`expected a deck project directory: ${dir}`)
  }
  // Same deck-local theme.json auto-load `loadDeckTarget` performs (brand-
  // extract wave) — assemble bypasses that helper but hits the same
  // spec-level installed-theme gate inside readDeckDir's assemble step.
  if (await isDeckDirectory(dir)) {
    await registerThemesFromSpecSource(join(dir, SPEC_FILENAME), { startDir: cwd, deckDir: dir })
  }
  const { ir, generatedSeed, materializedLayoutCount, deckDir } = await readDeckDir(dir)
  const outPath = opts.output ? resolve(cwd, opts.output) : join(deckDir, "deck.json")
  const outDir = dirname(outPath)
  const outIr = outDir === deckDir ? ir : withRewrittenAssetPaths(ir, deckDir, outDir)
  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, JSON.stringify(outIr, null, 2) + "\n")
  const placeholderCount = outIr.slides.filter((s) => s.placeholder).length
  const summary = `wrote ${outPath} (${outIr.slides.length} slides, ${placeholderCount} placeholder${placeholderCount === 1 ? "" : "s"})`
  const notes: string[] = []
  if (generatedSeed !== undefined) {
    notes.push(`note: generated seed ${generatedSeed} — add "seed": ${generatedSeed} to deck.spec.json for revision stability`)
  }
  if (materializedLayoutCount !== undefined) {
    notes.push(
      `note: ${materializedLayoutCount} layout${materializedLayoutCount === 1 ? "" : "s"} auto-selected into deck.json — pin "layout" in a page file to lock one`,
    )
  }
  return [summary, ...notes].join("\n")
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

// ── migrate ──────────────────────────────────────────────────────────────

/**
 * `pptwise migrate <input> -o <output>` (spec §9.1/§9.2/§9.3, vocabulary-v4
 * rename, task 2): the one deterministic conversion surface for both
 * artifacts this rename touches. Dispatches purely on whether `<input>`
 * resolves to a directory ({@link isDeckDirectory}) — the same signal every
 * other deck-accepting command already uses to branch between single-file
 * and deck-project-directory mode:
 *
 * - a directory containing `deck.plan.json` → {@link runMigrateDeckDir}:
 *   rewrites it to `deck.spec.json` per spec §9.2's field mapping
 *   ({@link migrateDeckPlanToSpec}, `../spec/migrate.ts`), written to
 *   `<output>` (a directory — `<output>/deck.spec.json`).
 * - a file → {@link runMigrateIrFile}: an IR v3 document (`version: "3"`)
 *   wraps {@link migrateIrV3ToV4} (`../ir/migrate.ts`). A v4 IR or
 *   spec-shaped file that still carries the old `chrome` field is rewritten
 *   via {@link migrateChromeToBranding}, a leftover `bloom` theme id is
 *   relocated onto `classroom` via {@link migrateBloomToClassroom}, and a
 *   leftover `logo_wall` component is rewritten to `image_grid` via
 *   {@link migrateLogoWallToImageGrid}, and a leftover `banner-heading`
 *   layout pin is rewritten to `two-column` via
 *   {@link migrateBannerHeadingToTwoColumn}. IR v2
 *   is explicitly not accepted here (spec §15.3: "v2 无真实用户" —
 *   `pptwise migrate` does not convert v2, `validateIr`'s own v2
 *   hard-reject message carries the full v2→v4 combined mapping for a
 *   caller who needs to convert one by hand).
 *
 * Both branches never overwrite `<output>` — a pre-existing file at the
 * resolved output path is a hard `PptwiseError`, the same `wx`-flag EEXIST
 * guard `runDisassemble`/`runInit` already use elsewhere in this file (spec
 * §9.2: "迁移工具必须默认写到新目标，不覆盖原文件"). Neither branch runs a
 * model or reinterprets content — both are thin CLI shells over an
 * already-pure mapping function, per spec §9.3: "只做已声明的结构映射，不
 * 运行模型，不重写内容，不重新选择 layout".
 */
export async function runMigrate(input: string, output: string, cwd = process.cwd()): Promise<string> {
  const resolvedInput = resolve(cwd, input)
  if (await isDeckDirectory(resolvedInput)) {
    return runMigrateDeckDir(resolvedInput, output, cwd)
  }
  return runMigrateIrFile(resolvedInput, output, cwd)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function needsChromeRewrite(raw: Record<string, unknown>): boolean {
  return Object.hasOwn(raw, "chrome")
}

function needsBloomRewrite(raw: Record<string, unknown>): boolean {
  const theme = raw.theme
  if (theme === "bloom") return true
  return isPlainRecord(theme) && theme.id === "bloom"
}

function componentListHasLogoWall(components: unknown): boolean {
  return Array.isArray(components) && components.some((component) => isPlainRecord(component) && component.type === "logo_wall")
}

function needsLogoWallRewrite(raw: Record<string, unknown>): boolean {
  if (componentListHasLogoWall(raw.components)) return true
  if (!Array.isArray(raw.slides)) return false
  return raw.slides.some((slide) => isPlainRecord(slide) && componentListHasLogoWall(slide.components))
}

function recordHasBannerHeadingPin(obj: Record<string, unknown>): boolean {
  return obj.layout === "banner-heading" || obj.focus === "banner-heading"
}

function needsBannerHeadingRewrite(raw: Record<string, unknown>): boolean {
  if (recordHasBannerHeadingPin(raw)) return true
  if (Array.isArray(raw.slides) && raw.slides.some((slide) => isPlainRecord(slide) && recordHasBannerHeadingPin(slide))) {
    return true
  }
  if (Array.isArray(raw.pages) && raw.pages.some((page) => isPlainRecord(page) && recordHasBannerHeadingPin(page))) {
    return true
  }
  return false
}

function migrateRewriteNote(chrome: boolean, bloom: boolean, logoWall = false, bannerHeading = false): string {
  const parts: string[] = []
  if (chrome) parts.push("renamed chrome → branding")
  if (bloom) parts.push("relocated bloom → classroom")
  if (logoWall) parts.push("rewrote logo_wall → image_grid")
  if (bannerHeading) parts.push("rewrote banner-heading → two-column")
  return parts.join(", ")
}

function applyV4LeftoverRewrites(raw: Record<string, unknown>): unknown {
  return migrateBannerHeadingToTwoColumn(
    migrateLogoWallToImageGrid(migrateBloomToClassroom(migrateChromeToBranding(raw))),
  )
}

async function listPageJsonNames(dir: string): Promise<string[]> {
  const pagesDir = join(dir, PAGES_DIRNAME)
  try {
    const entries = await readdir(pagesDir)
    return entries.filter((name) => name.endsWith(".json")).sort()
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []
    throw e
  }
}

async function rewriteLeftoverPages(
  dir: string,
  outDir: string,
): Promise<{ paths: string[]; logoWall: boolean; bannerHeading: boolean }> {
  const names = await listPageJsonNames(dir)
  const written: string[] = []
  let logoWall = false
  let bannerHeading = false
  for (const name of names) {
    const src = join(dir, PAGES_DIRNAME, name)
    const raw = await loadIrFile(src, "page")
    if (!isPlainRecord(raw)) continue
    const hasLogo = needsLogoWallRewrite(raw)
    const hasBanner = needsBannerHeadingRewrite(raw)
    if (!hasLogo && !hasBanner) continue
    if (hasLogo) logoWall = true
    if (hasBanner) bannerHeading = true
    const dest = join(outDir, PAGES_DIRNAME, name)
    await writeMigratedJson(dest, migrateBannerHeadingToTwoColumn(migrateLogoWallToImageGrid(raw)))
    written.push(dest)
  }
  return { paths: written, logoWall, bannerHeading }
}

/** Write JSON with the existing `wx` never-overwrite rule shared by migrate legs. */
async function writeMigratedJson(outPath: string, data: unknown): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true })
  try {
    await writeFile(outPath, JSON.stringify(data, null, 2) + "\n", { flag: "wx" })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new PptwiseError(`${outPath} already exists — refusing to overwrite, delete it first or choose a different -o`)
    }
    throw e
  }
}

/**
 * Deck-project-directory leg of {@link runMigrate}: reads `deck.plan.json`
 * out of `dir` (`loadIrFile`'s generic read-plus-parse, `./load-ir.ts` —
 * same helper `runSpecValidate` above uses, "plan" naming its own failure
 * messages), maps it through {@link migrateDeckPlanToSpec}
 * (`../spec/migrate.ts`, spec §9.2's field mapping), and writes the result
 * to `<output>/deck.spec.json`. `assets/*` are untouched. Leftover
 * `logo_wall` components in `pages/*.json` are rewritten to `image_grid`,
 * leftover `banner-heading` pins to `two-column`, at
 * `<output>/pages/<filename>` (source pages stay put). Spec §9.2's
 * field mapping still only touches `deck.plan.json`'s own top-level
 * `scenario` field and each page's `rhythm` field.
 *
 * Deliberately does not delete or rename the source `deck.plan.json` —
 * spec §9.2: "不覆盖原文件" applies to the migration direction generally,
 * and leaving the old file in place is what lets {@link readSpecFile}-style
 * dual-file detection (`../cli/deck-dir.ts`) catch a half-finished migration
 * (both files present) instead of one command silently deciding the old
 * file is now garbage. The success message tells the caller to delete it
 * once they have confirmed the new file is correct.
 *
 * Checks for `deck.plan.json` up front (task 3, routed from task 2's
 * review) instead of letting a missing file fall through to
 * `loadIrFile`'s generic "cannot read plan file" — a directory that has
 * already been migrated (a `deck.spec.json` sitting there with no
 * `deck.plan.json` left to convert, the plan file having since been
 * deleted per this function's own success message) gets a dedicated
 * "already migrated" error instead of a message that reads like the
 * directory was never a deck project at all. A directory with neither file
 * still reaches `loadIrFile`'s generic error — this function has no more
 * specific diagnosis to offer than that one already gives.
 *
 * A directory that has only `deck.spec.json` (no plan) still carrying the
 * old `chrome` field is rewritten via {@link migrateChromeToBranding}, a
 * leftover `bloom` theme id is relocated onto `classroom` via
 * {@link migrateBloomToClassroom}, and leftover `logo_wall` components in
 * `pages/*.json` are rewritten to `image_grid` via
 * {@link migrateLogoWallToImageGrid}. Spec rewrites land at
 * `<output>/deck.spec.json`. Page rewrites land at
 * `<output>/pages/<filename>`. Same-dir write keeps the `wx`
 * never-overwrite rule. Dual-source hard-errors. Neither chrome-to-rename
 * nor bloom nor leftover logo_wall left means already migrated.
 */
async function runMigrateDeckDir(dir: string, output: string, cwd: string): Promise<string> {
  const planPath = join(dir, PLAN_FILENAME)
  const sourceSpecPath = join(dir, SPEC_FILENAME)
  const outDir = resolve(cwd, output)
  const specPath = join(outDir, SPEC_FILENAME)
  if (!(await pathExists(planPath)) && (await pathExists(sourceSpecPath))) {
    const raw = await loadIrFile(sourceSpecPath, "spec")
    const specNeeds =
      isPlainRecord(raw) &&
      (needsChromeRewrite(raw) || needsBloomRewrite(raw) || needsBannerHeadingRewrite(raw))
    const pages = await rewriteLeftoverPages(dir, outDir)
    if (specNeeds && isPlainRecord(raw)) {
      const chrome = needsChromeRewrite(raw)
      const bloom = needsBloomRewrite(raw)
      const bannerHeading = needsBannerHeadingRewrite(raw)
      const migrated = applyV4LeftoverRewrites(raw)
      await writeMigratedJson(specPath, migrated)
      const specNote = `wrote ${specPath} (${migrateRewriteNote(chrome, bloom, false, bannerHeading)})`
      if (pages.paths.length === 0) return specNote
      return `${specNote}, wrote ${pages.paths.length === 1 ? pages.paths[0] : join(outDir, PAGES_DIRNAME)} (${migrateRewriteNote(false, false, pages.logoWall, pages.bannerHeading)})`
    }
    if (pages.paths.length > 0) {
      const target = pages.paths.length === 1 ? pages.paths[0] : join(outDir, PAGES_DIRNAME)
      return `wrote ${target} (${migrateRewriteNote(false, false, pages.logoWall, pages.bannerHeading)})`
    }
    throw new PptwiseError(
      `${dir} has ${SPEC_FILENAME} but no ${PLAN_FILENAME} — this deck project is already migrated, nothing to do`,
    )
  }
  const raw = await loadIrFile(planPath, "plan")
  const migrated = migrateDeckPlanToSpec(raw)
  await writeMigratedJson(specPath, migrated)
  const pages = await rewriteLeftoverPages(dir, outDir)
  const specNote = `wrote ${specPath} — run \`pptwise spec validate ${specPath}\` to confirm it, then delete ${planPath} (a directory with both files present is rejected)`
  if (pages.paths.length === 0) return specNote
  return `${specNote}, wrote ${pages.paths.length === 1 ? pages.paths[0] : join(outDir, PAGES_DIRNAME)} (${migrateRewriteNote(false, false, pages.logoWall, pages.bannerHeading)})`
}

/**
 * Single-file leg of {@link runMigrate}: an explicit `version: "3"` is the
 * IR v3 → v4 path (spec §9.3). `version: "2"` gets its own message pointing
 * at `validateIr`'s existing combined v2→v4 mapping rather than silently
 * routing it through the v3 vocabulary as a stepping stone (spec §15.3:
 * "v2 无真实用户", "`pptwise migrate` 只支持 v3→v4，不接 v2"). A v4 IR or
 * spec-shaped file that still carries the old `chrome` field is rewritten
 * via {@link migrateChromeToBranding}, a leftover `bloom` theme id is
 * relocated onto `classroom` via {@link migrateBloomToClassroom}, and a
 * leftover `logo_wall` component is rewritten to `image_grid` via
 * {@link migrateLogoWallToImageGrid}, and a leftover `banner-heading`
 * layout pin is rewritten to `two-column` via
 * {@link migrateBannerHeadingToTwoColumn}. Anything else is rejected with a
 * message naming what this command does accept.
 */
async function runMigrateIrFile(filePath: string, output: string, cwd: string): Promise<string> {
  const raw = await loadIrFile(filePath)
  const version = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).version : undefined
  if (version === "2") {
    throw new PptwiseError(
      "pptwise migrate does not support IR v2 (spec §15.3: v2 has no real users) — run `pptwise validate` on the v2 file to see the full v2→v4 combined field mapping and rewrite it by hand",
    )
  }
  const outPath = resolve(cwd, output)
  if (version === "3") {
    // PptxIRV3Schema reuses v4 SlideSchema, so a leftover logo_wall would
    // fail parse after the union drops the type. Rewrite it on the raw
    // object first, then parse, then the v3→v4 field map (which also
    // relocates leftover banner-heading pins).
    const pre = isPlainRecord(raw) ? migrateLogoWallToImageGrid(raw) : raw
    const parsed = PptxIRV3Schema.safeParse(pre)
    if (!parsed.success) {
      const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n")
      throw new PptwiseError(`invalid IR v3 file ${filePath}:\n${detail}`)
    }
    const migrated = migrateIrV3ToV4(parsed.data)
    await writeMigratedJson(outPath, migrated)
    return `wrote ${outPath} (migrated IR v3 → v4)`
  }
  if (
    isPlainRecord(raw) &&
    (needsChromeRewrite(raw) || needsBloomRewrite(raw) || needsLogoWallRewrite(raw) || needsBannerHeadingRewrite(raw))
  ) {
    const chrome = needsChromeRewrite(raw)
    const bloom = needsBloomRewrite(raw)
    const logoWall = needsLogoWallRewrite(raw)
    const bannerHeading = needsBannerHeadingRewrite(raw)
    const migrated = applyV4LeftoverRewrites(raw)
    await writeMigratedJson(outPath, migrated)
    return `wrote ${outPath} (${migrateRewriteNote(chrome, bloom, logoWall, bannerHeading)})`
  }
  throw new PptwiseError(
    `pptwise migrate converts an IR v3 file (version: "3"), a v4 IR or deck spec still carrying the old chrome field (renamed to branding), the removed bloom theme id (relocated to classroom), a leftover logo_wall component (rewritten to image_grid), or a leftover banner-heading layout pin (rewritten to two-column), or a deck project directory containing ${PLAN_FILENAME} — got version ${JSON.stringify(version)} in ${filePath} with nothing to migrate`,
  )
}
