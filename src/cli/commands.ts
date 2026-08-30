import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
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
import { disassembleDeck, type PageContent } from "../spec/assemble"
import { formatInvalidSpecError, specJsonSchema, resolveSpecThemeId, validateSpec } from "../spec"
import { AUDIENCE_VALUES, PACING_BUDGETS, STRATEGY_DEFINITIONS, NARRATIVE_PRESETS, resolveNarrative, type NarrativeProfile } from "../narrative"
import { auditDeck, type AuditChecks, type AuditFinding, type AuditReport } from "../audit/deck-audit"
import { buildAssetBrief, type AssetBrief, type AssetBriefItem } from "../render/asset-brief"
import { assertContrastFloor, getInstalledThemeIds } from "../themes/definitions"
import { extractBrandTheme, slugify } from "../themes/extract/brand-extract"
import { parseBrandThemeFile, registerBrandThemeFile } from "../themes/brand-theme-file"
import { REGISTERED_THEMES } from "../themes/registered-themes"
import { CANONICAL_THEME_IDS } from "../themes"
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

/**
 * Read + validate + register a brand theme file (brand-extract wave, 裁定 3:
 * loading always goes through `registerTheme`, so its contrast hard gate
 * fires here, before `validateIr` ever sees the deck). Returns the loaded
 * theme's id. Throws {@link PptwiseError} for an unreadable/malformed file
 * (`parseBrandThemeFile`'s own path-naming message), a builtin-id collision
 * (裁定 4 — a theme file must never shadow a builtin), or a contrast-floor
 * failure (`registerTheme`'s `assertContrastFloor`, whose message names the
 * failing token, the measured ratio, and the background). Custom ids live
 * only in `REGISTERED_THEMES`: delete then re-register so `pptwise serve`
 * rebuilds pick up edits to the theme file. Builtin collisions still throw
 * inside `registerBrandThemeFile`.
 */
async function loadThemeFile(path: string): Promise<string> {
  const raw = await loadIrFile(path, "theme")
  const file = parseBrandThemeFile(raw, path)
  REGISTERED_THEMES.delete(file.id)
  return registerBrandThemeFile(file)
}

/**
 * Deck-project `theme.json` auto-discovery (brand-extract wave, 裁定 3's
 * zero-flag convention): a `theme.json` in the deck project directory —
 * typically `pptwise brand extract`'s own output, dropped there so the deck
 * carries its brand with it — is loaded automatically before the deck is
 * assembled, so `deck.spec.json` can reference the custom theme's id with no
 * `--theme-file` flag on any command. Must run *before* `readDeckDir`: the
 * assemble step's own `validateSpec` hard-gates the spec's theme id against
 * `getInstalledThemeIds()`, which only includes the custom id once this has
 * registered it.
 */
async function registerDeckThemeFile(deckDir: string): Promise<void> {
  const themePath = join(deckDir, THEME_FILENAME)
  if (await pathExists(themePath)) await loadThemeFile(themePath)
}

/** Names which selection layer the (invalid) resolved `theme` value came
 *  from, for {@link applyDeckConfig}'s unknown-theme error. Registration
 *  (`--theme-file` / deck `theme.json`) is not a selection layer. */
function describeThemeSource(
  opts: { theme?: string; specTheme?: string; specPath?: string; fromDeckDir?: boolean },
  irThemeId: unknown,
  projectHit: { path: string; config: { theme?: string } } | null,
  userHit: UserConfigHit,
): string {
  if (opts.theme !== undefined) return "--theme"
  if (opts.specTheme !== undefined) return opts.specPath ?? "the deck spec"
  if (!opts.fromDeckDir && typeof irThemeId === "string") return "the IR/schema default"
  if (projectHit?.config.theme !== undefined) return projectHit.path
  if (userHit?.config.theme !== undefined) return userHit.path
  return "the IR/schema default"
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
 * Selection (`--theme` > spec theme > authored IR `theme.id` on a bare IR
 * file > project config > user config > schema default). Registration
 * (`--theme-file` / deck `theme.json`) is not a selection layer: those
 * paths only call `registerBrandThemeFile` so the id can be named by a
 * higher layer. `--theme` only swaps theme.id — IR-authored style survives.
 *
 * Assembled deck-dir IR always carries `theme.id` (schema default
 * consulting) even when the spec omitted `theme`. That filled default is
 * not an authored layer: pass `fromDeckDir: true` and `specTheme` from the
 * raw spec instead of reading `ir.theme.id` after assemble.
 *
 * `opts.projectHit`/`opts.userHit` are the caller's own already-fetched
 * `findConfig(cwd)`/`findUserConfig()` results (`undefined` when the caller
 * has not fetched one — this function fetches whichever is missing itself,
 * so it stays usable standalone). Every real caller (`runRender`/
 * `runValidate`/`runPreview` below) fetches both exactly once — `loadDeckTarget`
 * needs the project layer too now, for `decksDir` (W5 task 6,
 * {@link resolveDecksDirSource}) — and passes them to both this function and
 * `loadDeckTarget`, so a command reads either config file at most once per
 * invocation instead of once per helper that happens to need it.
 *
 * The installed-theme check used to run at config *read* time
 * (`readConfigFile`, `./config.ts`) — eagerly, against every layer's value,
 * whether or not it would ever actually apply. It now runs here instead,
 * once, against `theme` (the value that actually wins the chain): a
 * stale/unknown theme sitting in a config layer that a `--theme` flag (or a
 * higher-precedence layer) overrides anyway must not hard-fail a command
 * over a value nothing was ever going to use.
 */
export async function applyDeckConfig(
  raw: unknown,
  opts: {
    theme?: string
    /** `--theme-file <path>`: loads + registers the theme file
     *  ({@link loadThemeFile} — `registerTheme`'s contrast gate fires here,
     *  before `validateIr`). Does not select the id. Pass `--theme <id>` or
     *  set the spec/IR theme to use it. */
    themeFilePath?: string
    /** Raw `deck.spec.json` `theme` when the target is a deck project and
     *  the spec actually named one. Omitted when the spec omitted `theme`. */
    specTheme?: string
    specPath?: string
    /** True when `raw` came from assembling a deck project directory.
     *  Assembled IR's filled `theme.id` is not an authored selection layer. */
    fromDeckDir?: boolean
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
  if (opts.themeFilePath !== undefined) await loadThemeFile(opts.themeFilePath)
  const [projectHit, userHit] = await Promise.all([
    opts.projectHit !== undefined ? Promise.resolve(opts.projectHit) : findConfig(opts.cwd),
    opts.userHit !== undefined ? Promise.resolve(opts.userHit) : findUserConfig(),
  ])
  const theme =
    opts.theme
    ?? opts.specTheme
    ?? (opts.fromDeckDir ? undefined : (irTheme.id as string | undefined))
    ?? projectHit?.config.theme
    ?? userHit?.config.theme
  const style = opts.stylePath
    ? await loadStyleFile(opts.stylePath)
    : (projectHit?.config.style ?? userHit?.config.style ?? irTheme.style)
  if (theme !== undefined) {
    const installedThemeIds = getInstalledThemeIds()
    if (!installedThemeIds.includes(theme)) {
      throw new PptwiseError(
        `unknown theme "${theme}" (from ${describeThemeSource(opts, irTheme.id, projectHit, userHit)}) — available: ${installedThemeIds.join(", ")} (see \`pptwise themes\`)`,
      )
    }
  }
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
    // Brand-extract wave: a deck-local theme.json must be registered before
    // readDeckDir's own assemble step spec-validates the theme id — see
    // registerDeckThemeFile's doc comment.
    await registerDeckThemeFile(target)
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
  const { raw, baseDir, workspaceAssetsDir, isDir, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, { cwd, projectHit, userHit, specTheme, specPath, fromDeckDir: isDir })
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
  theme?: string
  /** `--theme-file <path>` — see `applyDeckConfig`'s own `themeFilePath` doc comment. */
  themeFilePath?: string
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
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
    specTheme,
    specPath,
    fromDeckDir: isDir,
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
  opts: { themeFilePath?: string; theme?: string } = {},
): Promise<string> {
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, isDir, workspaceAssetsDir, specTheme, specPath } = await loadDeckTarget(irPath, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
    specTheme,
    specPath,
    fromDeckDir: isDir,
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
  /** `--theme <id>` — override the deck theme. */
  theme?: string
  /** `--theme-file <path>` — see `applyDeckConfig`'s own `themeFilePath` doc comment. */
  themeFilePath?: string
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
 * No `--theme`/`--style` flags (unlike `runRender`) — the plan's CLI surface
 * for this command is deliberately just `<target> [--json]` — but
 * `applyDeckConfig` still runs (with no CLI-flag overrides) so a project/user
 * config's own theme/style default still applies, the same "config layers
 * apply even with no flag passed" behavior `runValidate` already has.
 */
export async function runAudit(target: string, opts: AuditOptions = {}): Promise<AuditCliResult> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, workspaceAssetsDir, isDir, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
    specTheme,
    specPath,
    fromDeckDir: isDir,
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
  theme?: string
  themeFilePath?: string
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
  const { raw, baseDir, workspaceAssetsDir, isDir, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
    specTheme,
    specPath,
    fromDeckDir: isDir,
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
  // Brand-extract wave: a spec that names a custom theme id normally sits in
  // a deck project directory whose own theme.json defines it — auto-load it
  // from alongside the spec file, same zero-flag convention loadDeckTarget
  // applies for whole-directory targets, so `pptwise spec validate
  // deck-dir/deck.spec.json` doesn't hard-fail the theme gate a later
  // `pptwise validate deck-dir/` would pass.
  await registerDeckThemeFile(dirname(resolve(specPath)))
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
}

/** `basename(output)` minus a trailing `.theme.json`/`.json`, slugged — the
 *  裁定 4 default id (`my-brand.theme.json` → `my-brand`). */
function defaultThemeIdFor(output: string): string {
  return slugify(basename(output).replace(/\.theme\.json$|\.json$/i, ""))
}

/**
 * `pptwise brand extract <file> -o <out.theme.json> [--id] [--label]`
 * (brand-extract wave, roadmap §2.0.1): extract brand colors/fonts from a
 * user's own `.thmx`/`.potx`/`.pptx` **locally** — the file's bytes never
 * leave the machine; there is no network call anywhere in this path — into a
 * pptwise theme file (`extractBrandTheme`, `../themes/extract/brand-extract.ts`).
 *
 * Two fail-fast checks beyond extraction itself, both mirroring what the
 * load path would reject later, surfaced here where the fix is cheapest:
 * - a builtin-id collision (`--id consulting`, or an output filename that
 *   slugs to one) errors now, with the same message shape
 *   `registerBrandThemeFile` uses — never writes a file that every load
 *   attempt would refuse (裁定 4).
 * - a derived palette that would fail `registerTheme`'s contrast floor
 *   (`assertContrastFloor` — a pathological source template whose text/
 *   background tones are too close) still writes the file but appends the
 *   would-be load error as a warning, so the user can hand-adjust the
 *   written JSON's colors instead of discovering the problem at render time.
 */
export async function runBrandExtract(file: string, opts: BrandExtractOptions): Promise<string> {
  let bytes: Buffer
  try {
    bytes = await readFile(file)
  } catch {
    throw new PptwiseError(`cannot read template file: ${file}`)
  }
  const id = opts.id ?? defaultThemeIdFor(opts.output)
  if ((CANONICAL_THEME_IDS as readonly string[]).includes(id)) {
    throw new PptwiseError(
      `theme id "${id}" collides with a built-in pptwise theme — pick a different id with --id (or a different output filename)`,
    )
  }
  const theme = await extractBrandTheme(bytes, { id, label: opts.label })
  const outPath = resolve(opts.output)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(theme, null, 2) + "\n")
  const c = theme.style.colors
  const lines = [
    `wrote ${opts.output} (theme "${theme.id}", label "${theme.label}")`,
    `  colors: bg ${c.bg}, text ${c.text}, primary ${c.primary}, accent ${c.accent}, muted ${c.muted} (derived), ${c.chartPalette.length} chart colors`,
    `  fonts: heading "${theme.style.fonts.heading[0]}", body "${theme.style.fonts.body[0]}"`,
    `use it: pptwise render <deck> --theme-file ${opts.output} --theme ${theme.id} — or drop it into a deck project directory as ${THEME_FILENAME} and reference "${theme.id}" as the deck's theme`,
  ]
  try {
    assertContrastFloor(theme.id, theme.style)
  } catch (e) {
    lines.push(
      `warning: this theme will be refused at load time — ${e instanceof Error ? e.message : String(e)}. Edit the written file's colors (darker text, or a lighter bg) before using it`,
    )
  }
  return lines.join("\n")
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
  theme: "consulting",
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
  /** `--theme <id>` — override the deck theme for a single-theme preview. */
  theme?: string
  /** `--themes <id,id,...>` — 2-4 theme ids for a contact-sheet comparison. */
  themes?: string
  /** `--theme-file <path>` — see `applyDeckConfig`'s own `themeFilePath` doc comment. */
  themeFilePath?: string
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
  opts: { cwd?: string; themeFilePath?: string; theme?: string } = {},
): Promise<DeckRenderResult> {
  const cwd = opts.cwd ?? process.cwd()
  const [projectHit, userHit] = await Promise.all([findConfig(cwd), findUserConfig()])
  const { raw, baseDir, isDir, resolvedTarget, workspaceAssetsDir, specTheme, specPath } = await loadDeckTarget(target, cwd, projectHit, userHit)
  await applyDeckConfig(raw, {
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
    specTheme,
    specPath,
    fromDeckDir: isDir,
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
  opts: { cwd?: string; themeFilePath?: string; theme?: string } = {},
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
function parseContactSheetThemes(raw: string): string[] {
  const ids = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
  if (ids.length < 2 || ids.length > 4) {
    throw new PptwiseError(`pptwise preview --themes expects 2-4 theme ids, got ${ids.length}`)
  }
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new PptwiseError(`pptwise preview --themes has duplicate theme id "${id}"`)
    seen.add(id)
  }
  const installed = getInstalledThemeIds()
  for (const id of ids) {
    if (!installed.includes(id)) {
      throw new PptwiseError(
        `unknown theme "${id}" (from --themes) — available: ${installed.join(", ")} (see \`pptwise themes\`)`,
      )
    }
  }
  return ids
}

function pickContactSheetSlides(ir: PptxIR, svgs: string[]): { type: string; svg: string }[] {
  const picked: { type: string; svg: string }[] = []
  const cover = ir.slides.findIndex((s) => s.type === "cover")
  const content = ir.slides.findIndex((s) => s.type === "content")
  if (cover >= 0) picked.push({ type: "cover", svg: svgs[cover]! })
  if (content >= 0) picked.push({ type: "content", svg: svgs[content]! })
  if (picked.length === 0) {
    throw new PptwiseError("pptwise preview --themes needs a cover or content slide, found neither")
  }
  return picked
}

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

async function runContactSheetPreview(
  irPath: string,
  outDir: string | undefined,
  opts: PreviewOptions,
  cwd: string,
): Promise<string> {
  const ids = parseContactSheetThemes(opts.themes!)
  const columns: { id: string; slides: { type: string; svg: string }[] }[] = []
  let resolvedTarget = ""
  let isDir = false
  let title = irPath
  for (const id of ids) {
    const rendered = await renderDeckSlides(irPath, {
      cwd,
      theme: id,
      themeFilePath: opts.themeFilePath,
    })
    resolvedTarget = rendered.resolvedTarget
    isDir = rendered.isDir
    title = rendered.ir.filename
    columns.push({ id, slides: pickContactSheetSlides(rendered.ir, rendered.svgs) })
  }
  const { resolvedOut, extraNotes } = await resolvePreviewOutDir(cwd, outDir, resolvedTarget, isDir, opts)
  const htmlPath = join(resolvedOut, "contact-sheet.html")
  await writeFile(htmlPath, buildContactSheetHtml({ title, themes: columns }))
  const ok = `wrote contact sheet to ${htmlPath}`
  return extraNotes.length > 0 ? `${ok}\n${extraNotes.join("\n")}` : ok
}

export async function runPreview(irPath: string, outDir?: string, opts: PreviewOptions = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd()
  if (opts.themes !== undefined) return runContactSheetPreview(irPath, outDir, opts, cwd)
  const { ir, svgs, normalized, isDir, resolvedTarget } = await renderDeckSlides(irPath, {
    cwd,
    theme: opts.theme,
    themeFilePath: opts.themeFilePath,
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
  if (await isDeckDirectory(dir)) await registerDeckThemeFile(dir)
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
