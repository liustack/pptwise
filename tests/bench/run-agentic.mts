#!/usr/bin/env -S pnpm exec tsx
/**
 * Agentic tool-loop benchmark runner against an external OpenAI-compatible
 * API (BENCH-01, `.issues/2026-08-03-bench-agentic/plan.md`). Unlike
 * `run.mts` (one completion, model must answer with bare IR text), this
 * runner gives the model-under-test real function-calling tools — write a
 * file, read a file, list a directory, run the pptwise CLI — inside a
 * private per-question workspace, and lets it iterate: write IR, run
 * `validate`/`audit`, read the findings, fix, repeat. This is the mode
 * `tests/bench/README.md`'s "Run protocol" describes end to end; `run.mts`
 * is the stricter single-shot floor measurement next to it.
 *
 * Tool surface (deliberately minimal and neutral, plan 裁定 1): no general
 * shell. `run_pptwise` only accepts a whitelisted, read-only/artifact
 * subcommand (see `ALLOWED_SUBCOMMANDS` / `ALLOWED_GROUPS` — every command
 * the SKILL playbook asks the model to run is on it, including
 * `theme try|new|fork`, `spec validate`, `brand extract`, and `doctor`) —
 * no `serve` (interactive), no `plan`/`scenarios` (removed vocabulary-v4
 * aliases), no `check-update`/`self-update`/`images`/`config` (network side
 * effects or user-level writes unrelated to the benchmark), no `init`.
 * Every path argument to any tool —
 * `write_file`/`read_file`/`list_files`'s own `path`, and every non-flag
 * `run_pptwise` argument — is resolved against the workspace and rejected
 * if it is absolute or escapes the workspace via `..`. Symlink-based
 * escapes are out of scope (not checked) — the workspace is a
 * harness-created scratch directory the model itself populates, not
 * attacker-controlled input.
 *
 * No pre-injected vocabulary (schema/narratives/themes JSON) in the system
 * prompt — unlike `run.mts`, whose model has no tools and depends entirely
 * on injection. This runner's model can call `run_pptwise schema` /
 * `narratives --json` / `themes --json` itself, exactly what
 * `tests/bench/README.md`'s run protocol and the SKILL playbook already
 * describe ("give the model SKILL.md + prompt.md, let it run the SKILL's
 * workflow"). Injecting the vocabulary anyway would be a convenience that
 * the protocol never asked for and that `run.mts` already covers as the
 * no-tools floor measurement — dropping it here is more protocol-faithful,
 * not a shortcut, and it is most of this runner's ~83k-token-per-round
 * system prompt cost.
 *
 * Tool-result cap: every tool's return string is capped at
 * `TOOL_RESULT_MAX_CHARS` before it goes back into the conversation — see
 * that constant's own comment for the size and the truncate-from-the-end
 * rationale. A cut result is never silently passed off as the whole thing:
 * the full text is saved under the workspace's `.tool-results/` (one file
 * per tool call, numbered) and the model is told the exact `read_file`
 * call — with `offset` — that continues from where the cut happened
 * (`finishToolResult`). `read_file` itself pages with `offset`/`limit`.
 *
 * Skill references: `skills/pptwise/references/` is copied into the
 * workspace as `references/` so every `references/*.md` link SKILL.md
 * makes resolves through `read_file` (`copySkillReferences`).
 *
 * Tool rejections vs tool errors: a call the harness refused before running
 * it (path escape, disallowed subcommand, protected input, malformed
 * arguments, unknown tool) is recorded in meta.json's `tool_rejections` /
 * `tool_rejection_details`, apart from `tool_errors` (a call that ran and
 * reported failure — a nonzero CLI exit, a missing file). The scorer
 * reports the two separately so a harness refusal never reads as a model
 * mistake.
 *
 * Round cap: `ROUND_CAP` chat-completion calls total (plan 裁定 2, raised
 * twice since — see that constant's own doc comment for the history) — one
 * round may contain several tool calls, they all count as one round. Hitting
 * the cap stops the run with `cap_hit: true` in meta.json; whatever the
 * model wrote up to that point is left in place, same as a natural stop.
 *
 * meta.json is harness-written, never model-self-reported (2026-07-20's
 * archived round found model-reported identity untrustworthy) — it records
 * both `model_requested` (the .env `<PREFIX>_MODEL` value we asked for) and
 * `model_reported` (the `model` field the API actually echoed back, per
 * round, deduplicated) side by side without reconciling them.
 *
 * Usage: `pnpm bench:agentic <prefix> [q01 q02 ...]` (default: all
 * questions in questionsDir). Same `.env` credential shape as `run.mts`:
 * `<PREFIX>_BASE_URL` / `<PREFIX>_API_KEY` / `<PREFIX>_MODEL`. `--model=<id>`
 * overrides `<PREFIX>_MODEL` for this run only (same flag, same semantics as
 * `run.mts`'s `--model` — see that file's header for the motivating case);
 * the result model-tag then derives from the override, not the prefix — see
 * `deriveModelTag` below.
 */
import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  type Dirent,
} from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { SPEC_FILENAME, THEME_FILENAME } from "../../src/cli/deck-dir"
import { loadIrFile } from "../../src/cli/load-ir"
import { assertThemeRebind, resolveThemeByName, themeNameFromUnknown } from "../../src/cli/theme-resolve"
import { META_FILENAME, TRANSCRIPT_FILENAME, isThemeFileName } from "./harness-files.mts"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const CLI = join(ROOT, "dist/cli.js")
const SKILL_DIR = join(ROOT, "skills/pptwise")
/** Fixed round cap, identical across every question and model in a batch.
 *  Raised 24 → 32 before the first full batch: the post-slim smoke (q01,
 *  the bank's gentlest question, on the stronger of the two weak models)
 *  already used 21 rounds once vocabulary self-querying replaced injection.
 *  Raised 32 → 48 before round 2 (`.issues/notes/2026-08-04-bench-first-agentic.md`):
 *  the first full batch hit the 32-round cap on 8 of 40 deepseek runs and 7
 *  of 40 qwen runs, concentrated in the five deck-project questions
 *  (q03/q06/q08/q13/q17) — their five-phase spec→pages→assemble→validate→
 *  render workflow eats rounds faster than a single bare-IR file. Those
 *  runs' half-finished artifacts (an unfilled placeholder page, an item
 *  missing a field) scored as failures purely from running out of budget,
 *  not from producing wrong content — round 1's own report calls the
 *  resulting scores "a conservative lower bound".
 *  The cap is a cost guard, not part of the benchmark's difficulty — a cap
 *  tight enough to clip real runs would measure budget, not capability. */
const ROUND_CAP = 48
/** Tool-result content is truncated before it goes back to the model — a
 *  validate/audit dump or a long file read should not blow the context
 *  window on its own, and an unbounded result is the other big lever on
 *  this runner's per-round token cost next to the vocabulary-injection cut
 *  above (plan 裁定 2). 8000 chars (~2000 tokens) is standard agent-harness
 *  practice for a single tool result — generous enough that a real
 *  `validate`/`audit` dump or a normal IR file read round-trips intact for
 *  a single deck (empirically a few KB), while still bounding the
 *  pathological case (a huge stray file the model asks to read back).
 *  The cap is not the whole story: `pptwise schema` alone is megabytes, so
 *  an over-cap result is spilled to a file and the model pages through it
 *  with `read_file` `offset` — see `finishToolResult`. Raising this number
 *  would only move the cliff, not remove it. */
const TOOL_RESULT_MAX_CHARS = 8_000
/** Per-round output ceiling. Was 8192: the first smoke after the reach
 *  fixes (deepseek-v4-flash, q01) hit it on round 3 while writing the deck
 *  in one `write_file` call — the API dropped the unfinished tool call and
 *  returned an empty reply, and the run ended with nothing saved. Now the
 *  same 16384 `run.mts` already uses against the same providers, so the
 *  number is known to be accepted. A cut-off reply is still possible and is
 *  handled in `decideTurn`, not silently read as a stop. */
const MAX_COMPLETION_TOKENS = 16_384
/** Per-completion-call network timeout. 3 minutes is generous headroom for
 *  a slow provider producing a full `MAX_COMPLETION_TOKENS` reply while
 *  still failing a genuinely hung request well before the harness's own
 *  process-level timeout would otherwise be the only thing to notice. */
const ROUND_TIMEOUT_MS = 180_000
/** Overall wall-clock budget for one question's whole tool loop, independent
 *  of the round cap — `ROUND_CAP` rounds at the per-round timeout above
 *  could in the worst case take hours; a batch runner that can hang for
 *  hours on one question is not shippable (found the hard way: a first smoke attempt ran
 *  past this harness's own orchestrating process's timeout with no internal
 *  deadline of its own to explain why). Checked before starting each new
 *  round, not mid-round — a round already in flight is left to its own
 *  `ROUND_TIMEOUT_MS` (worst case ~2× that, since `callRound` retries a
 *  failed request once — the run can overshoot this deadline by up to
 *  ~6 minutes, which is acceptable slack for a kill-switch, not a
 *  scheduler). */
const RUN_DEADLINE_MS = 25 * 60_000

// ── shared with run.mts (small enough to duplicate rather than couple two
// independently-runnable scripts to a new shared module — see task report) ──

export function loadEnv(envPath: string): Record<string, string> {
  if (!existsSync(envPath)) throw new Error(".env not found at repo root — see tests/bench/run.mts header")
  const out: Record<string, string> = {}
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/.exec(line)
    if (m) out[m[1]!] = m[2]!
  }
  return out
}

/** Strip a ```json fence when the model wraps its answer in one — same
 *  convention as `run.mts`'s single-shot answer handling. */
export function stripFence(text: string): string {
  const fenced = /^\s*```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/.exec(text)
  return (fenced ? fenced[1]! : text).trim()
}

// ── path safety (plan 裁定 1: reject `..`/absolute escapes; symlinks out of scope) ──

export interface PathCheckOk {
  ok: true
  resolved: string
}
export interface PathCheckFail {
  ok: false
  reason: string
}
export type PathCheck = PathCheckOk | PathCheckFail

/**
 * Resolves `relPath` against `workspace` and confirms the result stays
 * inside it. Rejects an absolute `relPath` outright (an absolute path is an
 * escape attempt by construction — resolving it against workspace would
 * just discard workspace and use the absolute path verbatim), and rejects
 * any `..` traversal that walks the resolved path outside workspace. A
 * `..` that stays inside workspace (e.g. `a/../b`) is allowed — the
 * contract is "stay inside", not "never write `..`". Symlink escapes
 * (a workspace-relative path that resolves lexically inside workspace but
 * points, via a symlink, at a target outside it) are not checked — out of
 * scope for this harness, see file header.
 */
export function checkPathSafety(workspace: string, relPath: string): PathCheck {
  if (isAbsolute(relPath)) {
    return { ok: false, reason: `absolute path not allowed: ${relPath}` }
  }
  const resolved = resolve(workspace, relPath)
  if (resolved !== workspace && !resolved.startsWith(workspace + sep)) {
    return { ok: false, reason: `path escapes workspace: ${relPath}` }
  }
  return { ok: true, resolved }
}

/** Pulls the path-ish value out of a `run_pptwise` argv token for the
 *  safety scan below: a bare positional token is checked as-is, an
 *  `--opt=value`/`-o=value` token is checked on its `value` half, and a
 *  bare flag name (`--json`, or `-o` whose value is the *next* token) is
 *  skipped here — the next token, not starting with `-`, gets checked on
 *  its own turn. This intentionally also runs the check against non-path
 *  values (a theme id, a port number) — resolving `"luxe"` against
 *  workspace just yields `workspace/luxe`, which is trivially inside
 *  workspace, so it passes harmlessly. */
function pathishToken(token: string): string | null {
  if (!token.startsWith("-")) return token
  const eq = token.indexOf("=")
  return eq === -1 ? null : token.slice(eq + 1)
}

// ── run_pptwise subcommand whitelist (plan 裁定 1: read-only/artifact only, no serve) ──

/** Top-level subcommands allowed through `run_pptwise`. Checked against
 *  every `pptwise` invocation in `skills/pptwise/SKILL.md` — by a test now
 *  (`run-agentic.test.ts`, "covers every command SKILL.md asks for"), after
 *  `icons` was added to the playbook and missed here (codex review R6): the
 *  playbook runs `schema`, `schema --spec|--kind|--component`, `icons`,
 *  `narratives`, `themes`, `theme try|new|fork`, `brand extract`, `spec
 *  validate`, `assemble`, `validate`, `audit`, `preview`, `render`,
 *  `doctor`, and `serve` — everything but `serve` (interactive/long-running)
 *  is reachable. `layouts` is a plain listing and comes along. Excluded on
 *  purpose: `plan`/`scenarios`
 *  (removed vocabulary-v4 aliases that only exist to print a rename
 *  error), `check-update`/`self-update`/`images` (network side effects
 *  with no benchmark value), `config` (writes user-level settings outside
 *  the workspace), and `init` (nothing in the SKILL workflow needs a
 *  scaffolded `pptwise.config.json`). `migrate` was on the first list and
 *  no longer exists as a CLI command (`76180bbf`). */
const ALLOWED_SUBCOMMANDS = new Set([
  "render",
  "validate",
  "audit",
  "asset-brief",
  "schema",
  "assemble",
  "disassemble",
  "themes",
  "narratives",
  "preview",
  "layouts",
  "icons",
  "doctor",
])

/** Command groups (`pptwise <group> <sub>`) and the sub-subcommands each
 *  may run. The group name alone is never enough — commander would just
 *  print help — so a bare group is rejected the same as an unknown one. */
const ALLOWED_GROUPS: Readonly<Record<string, readonly string[]>> = {
  spec: ["validate"],
  theme: ["new", "fork", "try"],
  brand: ["extract"],
}

/** One human-readable list of everything `run_pptwise` accepts — the tool
 *  schema, the system prompt, and the rejection message all print this so
 *  they cannot drift apart (the way `ROUND_CAP` once did). */
export function describeAllowedSubcommands(): string {
  const groups = Object.entries(ALLOWED_GROUPS).flatMap(([group, subs]) => subs.map((sub) => `${group} ${sub}`))
  return [...ALLOWED_SUBCOMMANDS, ...groups].join(", ")
}

/** Outcome of `checkPptwiseArgs`. A failure names its kind so the caller
 *  can record it as the right sort of harness rejection without reading
 *  the reason text back. */
export type ArgsCheck =
  | { ok: true }
  | { ok: false; kind: "subcommand-not-allowed" | "path-escape"; reason: string }

/** Validates a `run_pptwise` argv array before it is ever spawned: the
 *  subcommand (and, for a command group, its sub-subcommand) must be on the
 *  whitelist, and every path-ish token must stay inside `workspace` (see
 *  `checkPathSafety`). */
export function checkPptwiseArgs(args: string[], workspace: string): ArgsCheck {
  if (args.length === 0) return { ok: false, kind: "subcommand-not-allowed", reason: "no subcommand given" }
  const [head, ...rest] = args
  const groupSubs = Object.hasOwn(ALLOWED_GROUPS, head!) ? ALLOWED_GROUPS[head!]! : undefined
  if (groupSubs) {
    if (rest[0] === undefined || !groupSubs.includes(rest[0])) {
      const allowed = groupSubs.map((sub) => `"${head} ${sub}"`).join(", ")
      const given = [head, rest[0]].filter((t) => t !== undefined).join(" ")
      return {
        ok: false,
        kind: "subcommand-not-allowed",
        reason: `subcommand not allowed: ${given} (only ${allowed} ${groupSubs.length === 1 ? "is" : "are"})`,
      }
    }
  } else if (!ALLOWED_SUBCOMMANDS.has(head!)) {
    return {
      ok: false,
      kind: "subcommand-not-allowed",
      reason: `subcommand not allowed: ${head} (allowed: ${describeAllowedSubcommands()})`,
    }
  }
  for (const token of args) {
    const pathish = pathishToken(token)
    if (pathish === null) continue
    const check = checkPathSafety(workspace, pathish)
    if (!check.ok) return { ok: false, kind: "path-escape", reason: check.reason }
  }
  return { ok: true }
}

// ── scripted-reply classification (README's two fixed human lines) ──

export type ModelTurnKind = "spec-confirmation" | "other-question" | "stop"

/** The scripted replies the harness can send in the user's place: the two
 *  protocol lines for questions (README's "Harness role"), plus one for a
 *  reply the API cut off at `MAX_COMPLETION_TOKENS` — a transport limit the
 *  harness set, so the harness says so and lets the model go on. */
export type ScriptedReplyReason = "spec-confirmation" | "other-question" | "output-limit"

const SPEC_CONFIRMATION_REPLY = "Spec confirmed, proceed."
const OTHER_QUESTION_REPLY = "Proceed with your best judgment."
const OUTPUT_LIMIT_REPLY =
  "Your last reply was cut off by the output limit before it finished. Continue, keeping each reply within the limit."

/**
 * Classifies a model turn that made no tool calls: is it asking for
 * confirmation of a spec it just proposed (README's Phase 2 "propose and
 * confirm" gate — gets the verbatim `"Spec confirmed, proceed."` line), some
 * other clarifying question (gets `"Proceed with your best judgment."`), or
 * a genuine stop (no scripted reply — the run ends)? Heuristic, not a
 * language-understanding classifier: a turn "looks like a question" when it
 * ends in `?` or uses one of a small set of confirmation-seeking phrases,
 * and among those, one "mentions a spec" when it names `spec`/`deck.spec`/
 * `plan`. A weak model's phrasing varies — this is deliberately generous on
 * the question side (a false-positive "question" just spends one scripted
 * reply and one extra round, cheap) and narrow on the spec side (a
 * false-positive "spec confirmation" would put words about spec approval
 * into the model's mouth for an unrelated question).
 */
export function classifyModelTurn(content: string): ModelTurnKind {
  const trimmed = content.trim()
  if (!trimmed) return "stop"
  const looksLikeQuestion =
    /\?\s*$/.test(trimmed) ||
    /\b(confirm|shall i|should i proceed|is this (ok|okay|good)|please (advise|confirm)|may i proceed)\b/i.test(
      trimmed,
    )
  if (!looksLikeQuestion) return "stop"
  const mentionsSpec = /\b(spec|deck\.spec|plan)\b/i.test(trimmed)
  return mentionsSpec ? "spec-confirmation" : "other-question"
}

export function scriptedReplyFor(kind: ScriptedReplyReason): string {
  switch (kind) {
    case "spec-confirmation":
      return SPEC_CONFIRMATION_REPLY
    case "other-question":
      return OTHER_QUESTION_REPLY
    case "output-limit":
      return OUTPUT_LIMIT_REPLY
  }
}

export type TurnDecision =
  | { kind: "tools" }
  | { kind: "scripted"; reason: ScriptedReplyReason; reply: string }
  | { kind: "stop"; finalText: string }

/**
 * What the loop does with one model reply. Tool calls run, whatever the
 * finish reason. A reply with no tool calls that the API cut off at
 * `max_tokens` (`finish_reason: "length"`) is the harness's limit showing,
 * not the model stopping — it gets the output-limit line and the run goes
 * on. Everything else goes through {@link classifyModelTurn}: a question
 * gets its protocol line, a statement (or a reply the model really did
 * leave empty) ends the run.
 */
export function decideTurn(
  msg: { content: string | null; tool_calls?: ToolCall[] },
  finishReason: string | undefined,
): TurnDecision {
  if (msg.tool_calls && msg.tool_calls.length > 0) return { kind: "tools" }
  if (finishReason === "length") {
    return { kind: "scripted", reason: "output-limit", reply: scriptedReplyFor("output-limit") }
  }
  const content = msg.content ?? ""
  const kind = classifyModelTurn(content)
  if (kind === "stop") return { kind: "stop", finalText: content }
  return { kind: "scripted", reason: kind, reply: scriptedReplyFor(kind) }
}

// ── meta.json assembly (plan 裁定 2: harness-written, requested vs reported) ──

export interface RunMeta {
  provider_prefix: string
  base_url_host: string
  model_requested: string
  model_reported: string[]
  mode: "agentic"
  rounds: number
  tool_calls: number
  prompt_tokens: number
  completion_tokens: number
  started_at: string
  duration_seconds: number
  cap_hit: boolean
  /** True when the run stopped early because it hit `RUN_DEADLINE_MS`
   *  (25 minutes), separate from `cap_hit` (the `ROUND_CAP`-round cap) — additive
   *  field beyond plan 裁定 2's base meta shape, added after a first smoke
   *  attempt had no overall deadline of its own and outlived this harness's
   *  own orchestrating process with no record of why. `cap_hit` keeps its
   *  documented meaning (round cap only); this field names the other way a
   *  run can stop short of a natural finish. */
  deadline_hit: boolean
  scripted_replies: number
  /** Rounds whose reply the API cut off at `MAX_COMPLETION_TOKENS`
   *  (`finish_reason: "length"`) with no tool call surviving the cut. Each
   *  one cost the model a round and a scripted continue line; a run that
   *  ends with nothing saved and this above zero was starved by the
   *  harness's output ceiling, not by the model's judgment. */
  length_cutoffs: number
  /** Sum, across every round, of whatever prompt-cache-hit field the
   *  provider's response carries (plan 裁定 3) — DeepSeek's
   *  `usage.prompt_cache_hit_tokens`, dashscope/OpenAI-shaped
   *  `usage.prompt_tokens_details.cached_tokens`. Read defensively: a
   *  provider that reports neither field contributes 0, not undefined.
   *  Additive field beyond plan 裁定 2's base meta shape — a diagnostic
   *  alongside `prompt_tokens`, not used in any pass/fail decision. */
  cached_prompt_tokens: number
  /** Tool calls the harness refused before running them — a path escape,
   *  a subcommand off the whitelist, a write to a provisioned input,
   *  malformed arguments, an unknown tool name. These are the model
   *  bumping into the harness, not the model getting pptwise wrong, and
   *  the scorer reports them apart from `tool_errors`. */
  tool_rejections: number
  tool_rejection_details: ToolRejection[]
  /** Tool calls that ran and reported failure (a nonzero CLI exit, a
   *  missing file) — the model's own mistakes, the loop the benchmark is
   *  meant to measure. */
  tool_errors: number
}

export function buildMeta(params: {
  providerPrefix: string
  baseUrl: string
  modelRequested: string
  modelReported: Set<string>
  rounds: number
  toolCalls: number
  promptTokens: number
  completionTokens: number
  startedAt: number
  finishedAt: number
  capHit: boolean
  deadlineHit: boolean
  scriptedReplies: number
  cachedPromptTokens: number
  toolRejections: ToolRejection[]
  toolErrors: number
  lengthCutoffs: number
}): RunMeta {
  return {
    provider_prefix: params.providerPrefix,
    base_url_host: new URL(params.baseUrl).host,
    model_requested: params.modelRequested,
    model_reported: [...params.modelReported].sort(),
    mode: "agentic",
    rounds: params.rounds,
    tool_calls: params.toolCalls,
    prompt_tokens: params.promptTokens,
    completion_tokens: params.completionTokens,
    started_at: new Date(params.startedAt).toISOString(),
    duration_seconds: Math.round((params.finishedAt - params.startedAt) / 100) / 10,
    cap_hit: params.capHit,
    deadline_hit: params.deadlineHit,
    scripted_replies: params.scriptedReplies,
    length_cutoffs: params.lengthCutoffs,
    cached_prompt_tokens: params.cachedPromptTokens,
    tool_rejections: params.toolRejections.length,
    tool_rejection_details: params.toolRejections,
    tool_errors: params.toolErrors,
  }
}

// ── artifact placement: score.mts reads `<resultsDir>/<model-tag>/<qid>/`
// directly (a bare *.json or a deck.spec.json project), not the workspace/
// subdirectory the model actually worked in — so after the run ends, the
// harness (not the model) locates the model's final artifact inside
// workspace/ and copies it up one level into the question's result root. ──

export type LocatedArtifact =
  | { kind: "deck-project"; dir: string }
  | { kind: "bare-ir"; file: string }
  | { kind: "none" }

/** Depth-first walk of `dir`, returning every file's path relative to
 *  `base`. Small, bounded workspaces only (a benchmark question's own
 *  output) — no symlink handling, no cycle guard, matching this file's
 *  documented "symlink tricks out of scope". */
function walkFiles(dir: string, base: string): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...walkFiles(full, base))
    else if (e.isFile()) out.push(relative(base, full))
  }
  return out
}

/** Same walk, but returns every entry (files and directories, directories
 *  suffixed `/`) — used for the `list_files` tool so the model can see
 *  workspace structure, not just leaf files. */
function walkEntries(dir: string, base: string): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      out.push(relative(base, full) + "/")
      out.push(...walkEntries(full, base))
    } else {
      out.push(relative(base, full))
    }
  }
  return out
}

/**
 * Finds the model's final deck artifact inside `workspaceDir`. Preference
 * order: (1) a deck-project directory — the shallowest `deck.spec.json`
 * found anywhere in the workspace — copied whole (its `deck.spec.json`,
 * `pages/`, and `assets/` if present); (2) if no deck project exists,
 * exactly one bare `*.json` file anywhere in the workspace; (3) with
 * several `*.json` candidates and no deck project, prefer one literally
 * named `deck.json` or `ir.json` (the convention the harness preamble asks
 * the model to use), else the most recently modified one — documented
 * best-effort tie-break, not a hard guarantee of picking the "right" file
 * for a model that scattered several unrelated JSON files around.
 */
export function locateArtifact(workspaceDir: string): LocatedArtifact {
  const allFiles = walkFiles(workspaceDir, workspaceDir)
  const specFiles = allFiles
    .filter((f) => f === "deck.spec.json" || f.endsWith(`${sep}deck.spec.json`) || f.endsWith("/deck.spec.json"))
    .sort((a, b) => a.length - b.length)
  if (specFiles.length > 0) {
    return { kind: "deck-project", dir: join(workspaceDir, dirname(specFiles[0]!)) }
  }
  // A theme file the model wrote (`theme new`, `theme fork`, `brand
  // extract`, or by hand) is named by the CLI's own convention and is never
  // the deck — see `isThemeFileName`. Left in the pool it would win the
  // newest-mtime tie-break below whenever it was written last.
  const jsonFiles = allFiles.filter((f) => f.endsWith(".json") && !isThemeFileName(f.split(/[\\/]/).pop()!))
  if (jsonFiles.length === 0) return { kind: "none" }
  if (jsonFiles.length === 1) return { kind: "bare-ir", file: join(workspaceDir, jsonFiles[0]!) }
  const conventional = jsonFiles.find((f) => f === "deck.json" || f === "ir.json")
  if (conventional) return { kind: "bare-ir", file: join(workspaceDir, conventional) }
  const newest = jsonFiles
    .map((f) => ({ f, mtime: statSync(join(workspaceDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]!.f
  return { kind: "bare-ir", file: join(workspaceDir, newest) }
}

/**
 * What theme placement found for one artifact, mirrored from the CLI's own
 * lookup (`applyDeckConfig`, src/cli/commands.ts): the bound name resolved
 * through `resolveThemeByName` plus the rebind guard, anchored exactly where
 * the tool loop anchored them — `startDir` is the workspace root the CLI ran
 * in (`doRunPptwise`'s `cwd`), `deckDir` is the IR's own directory or the
 * deck-project directory. Nothing is guessed from file names: a theme file
 * that sits near the artifact but was never on that lookup path (a
 * `themes/` inside a nested deck directory, a stray `<other>.theme.json`) is
 * not a theme the model rendered with, and carrying it would make it a
 * candidate at scoring time and change the result (codex review R8).
 */
type ThemeCarry =
  | { kind: "none" }
  | { kind: "builtin"; id: string }
  | { kind: "file"; id: string; source: string; dest: string }
  | { kind: "failed"; id: string; error: string; carried: string | undefined }

/** The name an artifact binds, read loosely the way the CLI reads it before
 *  validation: `ir.theme.id` for a bare IR, `spec.theme` for a deck
 *  project. `undefined` when the file is unreadable or names none — that is
 *  the scorer's finding to make, not placement's. */
async function boundThemeName(located: Exclude<LocatedArtifact, { kind: "none" }>): Promise<string | undefined> {
  try {
    if (located.kind === "bare-ir") {
      const raw = (await loadIrFile(located.file)) as { theme?: unknown } | null
      const id = (raw?.theme as { id?: unknown } | null | undefined)?.id
      return typeof id === "string" ? id : undefined
    }
    return themeNameFromUnknown(await loadIrFile(join(located.dir, SPEC_FILENAME), "spec"))
  } catch {
    return undefined
  }
}

/**
 * Resolves the artifact's bound theme the way the CLI did during the tool
 * loop and carries the outcome into `resultDir`:
 *
 * - a built-in: nothing to copy, the scorer's own lookup reaches it;
 * - a file (deck-local `theme.json` / `<id>.theme.json` / loose `<id>.json`,
 *   or any of the workspace `themes/` shapes): that one file, written as
 *   `<id>.theme.json` beside the artifact. The scorer's lookup is rooted at
 *   the result directory, where `theme.json` is absent and this is the next
 *   candidate, so it is hit before any `themes/` or built-in;
 * - a lookup the CLI itself refused (unknown name, malformed hit, rebind
 *   guard): nothing resolved, so nothing to carry — except the deck's own
 *   bound `theme.json`, which is what the rebind guard and a malformed-bound-
 *   file error are about, so the scorer fails the same way instead of
 *   quietly resolving the built-in of that name.
 */
async function carryResolvedTheme(
  located: Exclude<LocatedArtifact, { kind: "none" }>,
  workspaceDir: string,
  resultDir: string,
): Promise<ThemeCarry> {
  const id = await boundThemeName(located)
  if (id === undefined) return { kind: "none" }
  const deckDir = located.kind === "bare-ir" ? dirname(located.file) : located.dir
  try {
    const resolved = await resolveThemeByName(id, { startDir: workspaceDir, deckDir })
    await assertThemeRebind(deckDir, resolved)
    if (resolved.kind === "builtin") return { kind: "builtin", id }
    const dest = `${id}.theme.json`
    cpSync(resolved.path, join(resultDir, dest))
    return { kind: "file", id, source: resolved.path, dest }
  } catch (e) {
    const bound = join(deckDir, THEME_FILENAME)
    let carried: string | undefined
    if (existsSync(bound)) {
      cpSync(bound, join(resultDir, THEME_FILENAME))
      carried = THEME_FILENAME
    }
    return { kind: "failed", id, error: (e as Error).message, carried }
  }
}

function describeThemeCarry(carry: ThemeCarry, resultDir: string): string {
  switch (carry.kind) {
    case "none":
    case "builtin":
      return ""
    case "file":
      return ` (+ theme "${carry.id}" ${relative(resultDir, carry.source)} -> ${carry.dest})`
    case "failed":
      return (
        ` (theme "${carry.id}" did not resolve for the CLI either: ${carry.error}` +
        (carry.carried !== undefined ? `; carried ${carry.carried} so the scorer sees the same failure)` : ")")
      )
  }
}

/** Copies the located artifact into `resultDir` (the question root
 *  `score.mts` reads), returns a short description for logging. `none`
 *  leaves `resultDir` with only meta.json — a legitimate, recorded failure
 *  (`score.mts`'s "no artifact found" reason), not a thrown error.
 *  `workspaceDir` is the root the CLI ran in during the tool loop, the
 *  `startDir` of its theme lookup (see {@link carryResolvedTheme}). */
export async function placeArtifact(located: LocatedArtifact, resultDir: string, workspaceDir: string): Promise<string> {
  if (located.kind === "none") return "no artifact found in workspace"
  if (located.kind === "bare-ir") {
    const dest = join(resultDir, "deck.json")
    cpSync(located.file, dest)
    // A bare IR's relative assets.images[id].src resolves against the IR
    // file's own directory (score.mts's resolveLocalAssets call, and the
    // real CLI's runRender/runValidate — see that file's own comment) — so
    // an image question whose model correctly points at the workspace's
    // provisioned assets/ (see copyQuestionAssets) needs that directory
    // copied alongside deck.json, or the scorer would resolve the same
    // relative path against an empty result root and fail to find bytes
    // that were genuinely there during the model's own tool-loop render.
    const artifactDir = dirname(located.file)
    const assetsSrc = join(artifactDir, "assets")
    const hadAssets = existsSync(assetsSrc)
    if (hadAssets) cpSync(assetsSrc, join(resultDir, "assets"), { recursive: true })
    const theme = await carryResolvedTheme(located, workspaceDir, resultDir)
    return (
      `copied bare IR ${relative(resultDir, located.file)} -> deck.json` +
      (hadAssets ? ` (+ ${relative(resultDir, assetsSrc)} -> assets/)` : "") +
      describeThemeCarry(theme, resultDir)
    )
  }
  // deck-project: copy deck.spec.json + pages/ + assets/ (if present) — the
  // parts `readDeckDir` (src/cli/deck-dir.ts) looks for — plus the one
  // theme file the CLI's lookup resolved for the spec's binding.
  for (const name of ["deck.spec.json", "pages", "assets"]) {
    const src = join(located.dir, name)
    if (existsSync(src)) cpSync(src, join(resultDir, name), { recursive: true })
  }
  const theme = await carryResolvedTheme(located, workspaceDir, resultDir)
  return `copied deck project ${relative(resultDir, located.dir)} -> result root` + describeThemeCarry(theme, resultDir)
}

// ── question asset provisioning (round-2 image-question fix,
// .issues/2026-08-05-bench-round2/task-1-report.md): q02/q12/q15's prompts
// claim attached photography, but round 1's empty workspace left the model
// nothing real to point an image reference at — it either invented a path
// or tried to smuggle bytes through the text-only write_file tool (a
// zero-byte PNG, q12's chief failure). A question directory may now carry
// an optional assets/ subdirectory (tests/bench/README.md's question-bank
// schema); this copies it into the workspace before round 1 so a real file
// is there to reference. ──

/**
 * Copies `questionDir/assets/` (if present) into `workspace/assets/` before
 * round 1. Every destination path is run through {@link checkPathSafety} —
 * the same "resolved path must stay inside the destination" contract the
 * tool surface above enforces on the model's own `write_file`/`read_file`
 * calls — even though the question bank is repo-controlled, trusted
 * content today: a future, less-trusted question source (or a plain
 * authoring slip — a symlink, a crafted entry name) should not be able to
 * write outside the workspace just because it arrived through this path
 * instead of a tool call. Returns the number of files copied (0 when there
 * is no `assets/` directory to copy — not an error, most questions have
 * none). {@link walkFiles} already never traverses a symlink entry (a
 * `Dirent` reporting `DT_LNK` is neither `isFile()` nor `isDirectory()`),
 * so a symlinked entry inside `assets/` is silently skipped rather than
 * followed — consistent with this file's documented "symlink tricks out of
 * scope" posture elsewhere, here applied by omission rather than a check.
 */
export function copyQuestionAssets(questionDir: string, workspace: string): Set<string> {
  return provisionDirectory(join(questionDir, "assets"), workspace, "assets")
}

/**
 * Copies `skillDir/references/` into `workspace/references/`, so every
 * `references/<name>.md` path SKILL.md points at resolves through
 * `read_file` exactly as written — the injected playbook and its references
 * keep the same relative layout they have in `skills/pptwise/`. Without
 * this the model was handed a playbook whose every "see references/x.md"
 * led to `no such file`, and the failure went on the model's record. The
 * copies are protected the same way question assets are (see
 * `doWriteFile`): the model reads them, it does not rewrite them.
 */
export function copySkillReferences(skillDir: string, workspace: string): Set<string> {
  return provisionDirectory(join(skillDir, "references"), workspace, "references")
}

/** Shared body of the two provisioning copies above: every file under
 *  `srcDir` lands at `workspace/<destRel>/<same relative path>`, each
 *  destination path checked with {@link checkPathSafety}. Returns the
 *  resolved destination paths for the protected-input set. */
function provisionDirectory(srcDir: string, workspace: string, destRel: string): Set<string> {
  const provisioned = new Set<string>()
  if (!existsSync(srcDir)) return provisioned
  for (const rel of walkFiles(srcDir, srcDir)) {
    const check = checkPathSafety(workspace, join(destRel, rel))
    if (!check.ok) continue // never let a malformed source dir write outside the workspace
    mkdirSync(dirname(check.resolved), { recursive: true })
    cpSync(join(srcDir, rel), check.resolved)
    // Returned as RESOLVED paths so doWriteFile can compare its own
    // resolved target by exact identity — the q12 smoke watched the model
    // overwrite a provisioned PNG with base64 *text*; the prompt warning
    // added then is soft, this set makes the guard code-enforced. Only
    // exact provisioned paths are protected — the model stays free to
    // create NEW files anywhere in the workspace, including under
    // assets/ (a deck project's own asset dir is a legitimate write
    // target).
    provisioned.add(check.resolved)
  }
  return provisioned
}

// ── tool implementations ──

/**
 * Caps a tool result at `maxChars`, truncating from the end and keeping the
 * head — a CLI error or summary line leads its own output, so the part worth
 * keeping under a cap is the start, not the tail (plan 裁定 2). An over-cap
 * result gets a trailing marker line stating the original length, so the
 * model (and a human reading a transcript) can tell truncation happened and
 * how much was cut, rather than mistaking a cut-off result for the whole
 * thing. Pure and exported for unit testing; production call sites pass the
 * module constant `TOOL_RESULT_MAX_CHARS`.
 */
export function truncateForModel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n\n[truncated: ${maxChars} of ${text.length} chars shown]`
}

/** Why the harness refused to run a tool call at all. */
export type ToolRejectionKind =
  | "path-escape"
  | "subcommand-not-allowed"
  | "protected-input"
  | "bad-arguments"
  | "unknown-tool"

/** One refused call, as recorded in meta.json's `tool_rejection_details`. */
export interface ToolRejection {
  /** 1-based index of the tool call within the run. */
  call: number
  tool: string
  kind: ToolRejectionKind
  reason: string
}

/**
 * What one tool call hands back to the conversation. `content` is what the
 * model sees. `rejection` is set when the harness refused the call before
 * running it (see {@link ToolRejectionKind}); `failed` when the call ran
 * and reported failure — a nonzero CLI exit, a missing file. The two never
 * overlap, and a plain success has neither.
 */
export interface ToolResult {
  content: string
  rejection?: { kind: ToolRejectionKind; reason: string }
  failed?: boolean
}

function reject(kind: ToolRejectionKind, reason: string): ToolResult {
  return { content: `ERROR: ${reason}`, rejection: { kind, reason } }
}

function fail(reason: string): ToolResult {
  return { content: `ERROR: ${reason}`, failed: true }
}

/** Workspace-relative directory where over-cap tool results are saved. */
export const TOOL_RESULTS_DIR = ".tool-results"

/** Where the full text of tool call `callIndex` is saved when it exceeds
 *  the cap — numbered so a transcript reader can line the file up with the
 *  call, and so two calls to the same tool never overwrite each other. */
export function spillPathFor(callIndex: number, tool: string): string {
  return `${TOOL_RESULTS_DIR}/${String(callIndex).padStart(3, "0")}-${tool}.txt`
}

/** The one sentence every cut result ends with: which character range of
 *  the whole was shown, and the exact `read_file` call that continues from
 *  there. Same phrasing whether the whole lives in a spill file or in the
 *  file the model asked to read. */
export function continuationHint(from: number, to: number, total: number, path: string): string {
  return `[truncated: chars ${from}-${to} of ${total} shown. Read the rest with read_file({"path": ${JSON.stringify(path)}, "offset": ${to}})]`
}

export interface ToolResultContext {
  workspace: string
  callIndex: number
  tool: string
  maxChars: number
}

/**
 * Applies the tool-result cap to a `run_pptwise`/`list_files` result. An
 * under-cap result passes through untouched. An over-cap result is written
 * whole to `<workspace>/.tool-results/<NNN>-<tool>.txt` and the model gets
 * the head plus a {@link continuationHint} naming that file and the offset
 * where the head stopped — so a 2.6 MB `schema` dump is paged, not
 * silently reduced to its first 0.3%. The file lives inside the workspace
 * on purpose: `read_file` is the model's only reader, and it cannot see
 * anything outside.
 */
export function finishToolResult(text: string, ctx: ToolResultContext): string {
  if (text.length <= ctx.maxChars) return text
  const rel = spillPathFor(ctx.callIndex, ctx.tool)
  const abs = join(ctx.workspace, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, text, "utf8")
  return `${text.slice(0, ctx.maxChars)}\n\n${continuationHint(0, ctx.maxChars, text.length, rel)}`
}

export function doWriteFile(workspace: string, args: unknown, provisioned?: ReadonlySet<string>): ToolResult {
  const { path, content } = (args ?? {}) as { path?: unknown; content?: unknown }
  if (typeof path !== "string" || typeof content !== "string") {
    return reject("bad-arguments", "write_file requires {path: string, content: string}")
  }
  const check = checkPathSafety(workspace, path)
  if (!check.ok) return reject("path-escape", check.reason)
  if (provisioned?.has(check.resolved)) {
    // Code-enforced guard behind the preamble's soft warning: harness-
    // provisioned inputs are read-only for the model. The q12 smoke showed
    // a model "helpfully" rewriting a provided PNG with the prompt's
    // base64 text, corrupting it. New files (anywhere) stay writable.
    return reject(
      "protected-input",
      `${path} is a provided input file and cannot be overwritten — reference it as-is, or write derived output to a new path`,
    )
  }
  mkdirSync(dirname(check.resolved), { recursive: true })
  writeFileSync(check.resolved, content, "utf8")
  return { content: `wrote ${Buffer.byteLength(content, "utf8")} bytes to ${path}` }
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

/**
 * Reads `path` from character `offset` (default 0) for at most `limit`
 * characters (default and ceiling: `maxChars`). When the window stops short
 * of the end, the result ends with a {@link continuationHint} for the next
 * window — the same hint an over-cap `run_pptwise` result carries, so one
 * habit reads both. Offsets are character positions, matching the numbers
 * the hint prints.
 */
export function doReadFile(workspace: string, args: unknown, maxChars: number): ToolResult {
  const { path, offset, limit } = (args ?? {}) as { path?: unknown; offset?: unknown; limit?: unknown }
  if (typeof path !== "string") {
    return reject("bad-arguments", "read_file requires {path: string, offset?: number, limit?: number}")
  }
  if (offset !== undefined && !isCount(offset)) return reject("bad-arguments", "read_file offset must be a non-negative integer")
  if (limit !== undefined && (!isCount(limit) || limit === 0)) {
    return reject("bad-arguments", "read_file limit must be a positive integer")
  }
  const check = checkPathSafety(workspace, path)
  if (!check.ok) return reject("path-escape", check.reason)
  if (!existsSync(check.resolved)) return fail(`no such file: ${path}`)
  if (statSync(check.resolved).isDirectory()) return fail(`${path} is a directory, not a file`)
  const full = readFileSync(check.resolved, "utf8")
  const from = offset ?? 0
  if (from > 0 && from >= full.length) {
    return reject("bad-arguments", `offset ${from} is past the end of ${path} (${full.length} chars)`)
  }
  const to = Math.min(from + Math.min(limit ?? maxChars, maxChars), full.length)
  const window = full.slice(from, to)
  if (to < full.length) return { content: `${window}\n\n${continuationHint(from, to, full.length, path)}` }
  return { content: window }
}

function doListFiles(workspace: string, args: unknown, ctx: ToolResultContext): ToolResult {
  const raw = (args ?? {}) as { path?: unknown }
  const rel = typeof raw.path === "string" ? raw.path : "."
  const check = checkPathSafety(workspace, rel)
  if (!check.ok) return reject("path-escape", check.reason)
  if (!existsSync(check.resolved)) return fail(`no such path: ${rel}`)
  if (!statSync(check.resolved).isDirectory()) return fail(`not a directory: ${rel}`)
  const listing = walkEntries(check.resolved, check.resolved)
  return { content: finishToolResult(listing.length > 0 ? listing.join("\n") : "(empty)", ctx) }
}

function doRunPptwise(workspace: string, args: unknown, ctx: ToolResultContext): ToolResult {
  const raw = (args ?? {}) as { args?: unknown }
  if (!Array.isArray(raw.args) || !raw.args.every((a): a is string => typeof a === "string")) {
    return reject("bad-arguments", 'run_pptwise requires {args: string[]}, e.g. {"args": ["validate", "deck.json"]}')
  }
  const argv = raw.args
  const check = checkPptwiseArgs(argv, workspace)
  if (!check.ok) return reject(check.kind, check.reason)
  try {
    const stdout = execFileSync("node", [CLI, ...argv], {
      encoding: "utf8",
      cwd: workspace,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    })
    return { content: finishToolResult(`exit 0\n${stdout}`, ctx) }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string; message: string }
    const body = [err.stdout, err.stderr].filter(Boolean).join("\n") || err.message
    return { content: finishToolResult(`exit ${err.status ?? "?"}\n${body}`, ctx), failed: true }
  }
}

export interface ToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export interface ExecuteContext {
  provisioned?: ReadonlySet<string>
  /** 1-based index of this call within the run — names the spill file. */
  callIndex: number
  maxChars: number
}

export function executeTool(tc: ToolCall, workspace: string, exec: ExecuteContext): ToolResult {
  const ctx: ToolResultContext = { workspace, callIndex: exec.callIndex, tool: tc.function.name, maxChars: exec.maxChars }
  let args: unknown
  try {
    args = JSON.parse(tc.function.arguments || "{}")
  } catch (e) {
    return reject("bad-arguments", `malformed arguments JSON for ${tc.function.name}: ${(e as Error).message}`)
  }
  try {
    switch (tc.function.name) {
      case "write_file":
        return doWriteFile(workspace, args, exec.provisioned)
      case "read_file":
        return doReadFile(workspace, args, exec.maxChars)
      case "list_files":
        return doListFiles(workspace, args, ctx)
      case "run_pptwise":
        return doRunPptwise(workspace, args, ctx)
      default:
        return reject("unknown-tool", `unknown tool ${tc.function.name}`)
    }
  } catch (e) {
    return { content: truncateForModel(`ERROR: ${(e as Error).message}`, exec.maxChars), failed: true }
  }
}

// ── tool schema (OpenAI-compatible function calling) ──

const TOOLS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file inside your private workspace. Parent directories are created automatically.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to your workspace root. No absolute paths, no .. escapes." },
          content: { type: "string", description: "Full file content to write." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read a file inside your private workspace. Long files come back in windows: the result ends with a " +
        "[truncated: ...] line naming the next offset — call read_file again with that offset to continue.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to your workspace root." },
          offset: { type: "integer", description: "Character position to start reading from (default 0)." },
          limit: { type: "integer", description: `Maximum characters to return (default and ceiling ${TOOL_RESULT_MAX_CHARS}).` },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories under a path inside your private workspace (recursive).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to your workspace root. Defaults to the workspace root." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_pptwise",
      description:
        'Run the pptwise CLI inside your workspace, e.g. {"args": ["validate", "deck.json"]}. Only read-only and ' +
        `artifact-producing subcommands are available: ${describeAllowedSubcommands()}. There is no serve command. ` +
        `Output longer than ${TOOL_RESULT_MAX_CHARS} characters is saved whole under ${TOOL_RESULTS_DIR}/ and the result ` +
        "ends with a [truncated: ...] line telling you the read_file call that continues it.",
      parameters: {
        type: "object",
        properties: {
          args: { type: "array", items: { type: "string" }, description: 'CLI arguments, e.g. ["validate", "deck.json"].' },
        },
        required: ["args"],
      },
    },
  },
] as const

// ── chat completion round ──

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

interface ChatCompletionUsage {
  prompt_tokens?: number
  completion_tokens?: number
  /** DeepSeek's cache-hit field (plan 裁定 3). */
  prompt_cache_hit_tokens?: number
  /** dashscope/OpenAI-shaped cache-hit field (plan 裁定 3). */
  prompt_tokens_details?: { cached_tokens?: number }
}

export interface ChatCompletionResponse {
  model?: string
  choices: Array<{ message: { content: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }>
  usage?: ChatCompletionUsage
}

/** One chat-completion round: the whole conversation so far in, the API's
 *  reply out. `callRound` below is the production one; the test suite hands
 *  `runOneAgentic` a scripted stand-in so the loop, the artifact placement,
 *  and the files it leaves for the scorer can be driven without a network. */
export type CompleteFn = (
  cfg: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[],
) => Promise<ChatCompletionResponse>

/** One round's harness-side record for `transcript.json`: what the API said
 *  about the round, apart from the message itself. `finish_reason: "length"`
 *  is the one worth reading first when a run ends with nothing saved — it
 *  means the reply hit `max_tokens`, not that the model chose to stop. */
interface RoundRecord {
  round: number
  model?: string
  finish_reason?: string
  usage?: ChatCompletionUsage
  tool_calls: number
}

/** Writes the whole conversation plus per-round records beside meta.json so
 *  a run that ends with nothing saved can be read back, not guessed at. */
function writeTranscript(resultDir: string, rounds: RoundRecord[], messages: ChatMessage[]): void {
  writeFileSync(join(resultDir, TRANSCRIPT_FILENAME), JSON.stringify({ rounds, messages }, null, 2) + "\n")
}

/**
 * Reads whichever prompt-cache-hit field a provider's `usage` object
 * carries (plan 裁定 3): DeepSeek's `prompt_cache_hit_tokens`, or
 * dashscope/OpenAI-shaped `prompt_tokens_details.cached_tokens`. Purely
 * defensive — a field a provider doesn't report is treated as 0, never
 * undefined, and an `usage` that is itself absent (a failed/malformed
 * response) also reads as 0.
 *
 * The two fields are ALIASES for the same quantity, never independent
 * counters — take one, never sum. The first full batch (2026-08-04)
 * proved DeepSeek populates both with the same value on every response;
 * the original "sum both" implementation double-counted every question
 * at exactly ratio 1.96-2.00 (archived metas are the evidence), which
 * overstated cached volume and initially misread the round's hit rate.
 */
export function extractCachedTokens(usage: ChatCompletionUsage | undefined): number {
  if (!usage) return 0
  return usage.prompt_cache_hit_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0
}

async function callRound(
  cfg: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[],
): Promise<ChatCompletionResponse> {
  const attempt = async () => {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(ROUND_TIMEOUT_MS),
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return (await res.json()) as ChatCompletionResponse
  }
  return attempt().catch(() => attempt())
}

// ── per-question run ──

export async function runOneAgentic(
  cfg: { baseUrl: string; apiKey: string; model: string },
  providerPrefix: string,
  qid: string,
  shared: { skill: string },
  dirs: { questionsDir: string; resultsDir: string },
  modelTag: string,
  deps: { complete?: CompleteFn } = {},
): Promise<void> {
  const complete = deps.complete ?? callRound
  const prompt = readFileSync(join(dirs.questionsDir, qid, "prompt.md"), "utf8")
  const resultDir = join(dirs.resultsDir, modelTag, qid)
  const workspace = join(resultDir, "workspace")
  if (existsSync(join(resultDir, META_FILENAME))) {
    console.log(`${qid}: already run, skipping (resume mode)`)
    return
  }
  mkdirSync(workspace, { recursive: true })
  const provisioned = new Set<string>([
    ...copyQuestionAssets(join(dirs.questionsDir, qid), workspace),
    ...copySkillReferences(SKILL_DIR, workspace),
  ])

  const system = [
    "You are the model-under-test in the pptwise benchmark, agentic tool-loop mode.",
    "You have four tools: write_file(path, content), read_file(path, offset?, limit?), list_files(path?),",
    "run_pptwise(args).",
    "All paths are relative to your private workspace directory — you cannot read or write anything outside",
    "it, and absolute paths or \"..\" paths that escape the workspace are rejected.",
    "run_pptwise runs the pptwise CLI (node dist/cli.js) with your workspace as its current directory; only",
    `read-only and artifact-producing subcommands are available (${describeAllowedSubcommands()}) — there is`,
    "no interactive serve command and no general shell access.",
    `A tool result longer than ${TOOL_RESULT_MAX_CHARS} characters is cut: the whole output is saved under`,
    `${TOOL_RESULTS_DIR}/ and the result ends with a [truncated: ...] line giving the exact read_file call (path and`,
    "offset) that continues it. read_file pages the same way, so keep reading until no [truncated: ...] line remains",
    "when you need the rest.",
    "The IR JSON Schema, narrative presets, and theme catalog are not preloaded below — run",
    "run_pptwise(['schema']) / run_pptwise(['narratives', '--json']) / run_pptwise(['themes', '--json']) yourself",
    "whenever you need them, the same way the SKILL playbook expects.",
    "The playbook's references/ files (references/spec.md, references/layouts.md, ...) are in your workspace at",
    "those exact paths — read them with read_file when the playbook points at one.",
    "Use the SKILL playbook below to design and build the deck: write your IR (or deck-project files) with",
    "write_file, run validate/audit with run_pptwise, read what they report, and fix what needs fixing — the",
    "same self-check loop the playbook describes, with real tool access instead of imagined output.",
    "Save your final deck as a single IR JSON file at your workspace root (e.g. deck.json), or, for the",
    "deck-project workflow, as deck.spec.json plus pages/ at your workspace root.",
    "If the deck request describes material such as attached photos, the actual referenced files are already",
    "present in your workspace (check with list_files, typically under assets/) — point an image reference at",
    "the real relative path there rather than inventing a filename or fabricating placeholder image bytes.",
    "Do not overwrite, re-encode, or otherwise rewrite any file already present under assets/ — its bytes are",
    "already a real, valid image, and write_file writes whatever text you give it literally (it cannot decode",
    "base64 into real binary image bytes), so calling write_file on an existing asset will corrupt it.",
    `You have at most ${ROUND_CAP} completion turns total for this question (a turn spent making tool calls still`,
    "counts once, no matter how many tools it calls in that turn) — use them efficiently. When the deck is",
    "finished, stop calling tools and reply in plain text confirming it's done.",
  ].join(" ")
  const user = [
    "## Skill playbook (skills/pptwise/SKILL.md)\n\n" + shared.skill,
    "## Deck request\n\n" + prompt,
  ].join("\n\n---\n\n")

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ]

  const startedAt = Date.now()
  let roundsCompleted = 0
  let toolCalls = 0
  let scriptedReplies = 0
  const toolRejections: ToolRejection[] = []
  let toolErrors = 0
  let lengthCutoffs = 0
  let promptTokens = 0
  let completionTokens = 0
  let cachedPromptTokens = 0
  const modelReported = new Set<string>()
  const roundRecords: RoundRecord[] = []
  let finalText: string | undefined
  let deadlineHit = false

  try {
    while (roundsCompleted < ROUND_CAP) {
      if (Date.now() - startedAt >= RUN_DEADLINE_MS) {
        deadlineHit = true
        break
      }
      roundsCompleted++
      const data = await complete(cfg, messages)
      if (data.model) modelReported.add(data.model)
      promptTokens += data.usage?.prompt_tokens ?? 0
      completionTokens += data.usage?.completion_tokens ?? 0
      cachedPromptTokens += extractCachedTokens(data.usage)

      const msg = data.choices[0]?.message
      roundRecords.push({
        round: roundsCompleted,
        model: data.model,
        finish_reason: data.choices[0]?.finish_reason,
        usage: data.usage,
        tool_calls: msg?.tool_calls?.length ?? 0,
      })
      const assistantMsg: ChatMessage = { role: "assistant", content: msg?.content ?? null }
      if (msg?.tool_calls && msg.tool_calls.length > 0) assistantMsg.tool_calls = msg.tool_calls
      messages.push(assistantMsg)

      const decision = decideTurn(assistantMsg, data.choices[0]?.finish_reason)
      if (decision.kind === "tools") {
        for (const tc of assistantMsg.tool_calls!) {
          toolCalls++
          const result = executeTool(tc, workspace, { provisioned, callIndex: toolCalls, maxChars: TOOL_RESULT_MAX_CHARS })
          if (result.rejection) toolRejections.push({ call: toolCalls, tool: tc.function.name, ...result.rejection })
          else if (result.failed) toolErrors++
          messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result.content })
        }
        continue
      }

      if (decision.kind === "stop") {
        finalText = decision.finalText
        break
      }
      if (decision.reason === "output-limit") lengthCutoffs++
      else scriptedReplies++
      messages.push({ role: "user", content: decision.reply })
    }
  } catch (e) {
    writeTranscript(resultDir, roundRecords, messages)
    writeFileSync(
      join(resultDir, META_FILENAME),
      JSON.stringify(
        {
          provider_prefix: providerPrefix,
          base_url_host: new URL(cfg.baseUrl).host,
          model_requested: cfg.model,
          mode: "agentic",
          rounds: roundsCompleted,
          tool_calls: toolCalls,
          tool_rejections: toolRejections.length,
          tool_rejection_details: toolRejections,
          tool_errors: toolErrors,
          error: String(e).slice(0, 300),
        },
        null,
        2,
      ) + "\n",
    )
    console.error(`${qid}: failed after ${roundsCompleted} round(s) — ${String(e).slice(0, 200)}`)
    return
  }

  const capHit = !deadlineHit && finalText === undefined && roundsCompleted >= ROUND_CAP
  writeTranscript(resultDir, roundRecords, messages)

  const located = locateArtifact(workspace)
  let placementNote: string
  if (located.kind !== "none") {
    placementNote = await placeArtifact(located, resultDir, workspace)
  } else if (finalText !== undefined && stripFence(finalText).length > 0) {
    const text = stripFence(finalText)
    try {
      JSON.parse(text)
      writeFileSync(join(resultDir, "answer.json"), text + "\n")
      placementNote = "no workspace artifact — saved final message text as answer.json (single-shot convention)"
    } catch {
      placementNote = "no workspace artifact and final message text is not parseable JSON — nothing saved"
    }
  } else {
    placementNote = "no workspace artifact and no final message text — nothing saved"
  }

  const meta = buildMeta({
    providerPrefix,
    baseUrl: cfg.baseUrl,
    modelRequested: cfg.model,
    modelReported,
    rounds: roundsCompleted,
    toolCalls,
    promptTokens,
    completionTokens,
    startedAt,
    finishedAt: Date.now(),
    capHit,
    deadlineHit,
    scriptedReplies,
    cachedPromptTokens,
    toolRejections,
    toolErrors,
    lengthCutoffs,
  })
  writeFileSync(join(resultDir, META_FILENAME), JSON.stringify(meta, null, 2) + "\n")
  console.log(
    `${qid}: done — ${roundsCompleted} round(s), ${toolCalls} tool call(s) (${toolRejections.length} rejected by the harness, ` +
      `${toolErrors} failed), ${scriptedReplies} scripted repl(y/ies), ${lengthCutoffs} output-limit cutoff(s), ` +
      `cap_hit=${capHit} deadline_hit=${deadlineHit} — ${placementNote}`,
  )
}

// ── --model=<id> override (dashscope cache-list model swap,
// .issues/2026-08-04-bench-agentic/dashscope-cache-investigation.md) ──

/** Pulls `--<name>=<value>` out of `argv`, or `undefined` when absent — the
 *  same `--flag=value` shape `dirFlag` (below) uses for
 *  `--questions-dir`/`--results-dir`, factored out because this one has no
 *  path-resolution step and no fallback (an absent `--model` means "use the
 *  `.env` `<PREFIX>_MODEL` value", decided by the caller, not this helper). */
export function flagValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`
  const hit = argv.find((a) => a.startsWith(prefix))
  return hit?.slice(prefix.length)
}

/**
 * Result model-tag for one agentic run: `<prefix>-agentic` by default (e.g.
 * `qwen-agentic`, unchanged from round 1), or `<modelOverride>-agentic`
 * whenever `--model=<id>` is given — the tag then names the actual model id
 * that was queried, not the `.env` prefix, so a `--model=qwen-flash` run
 * against the `QWEN` prefix lands in `qwen-flash-agentic/`, never silently
 * mixed into `qwen-agentic/`'s results alongside `qwen3.6-27b` runs of a
 * different model (`score.mts`'s model-tag directories are the comparison
 * unit — see `tests/bench/README.md`'s "Result layout and model tag").
 * `meta.json`'s `model_requested` already records the true id regardless of
 * this tag (`buildMeta`'s `modelRequested` param, threaded from `cfg.model`
 * in `runOneAgentic` below) — this only decides the directory name.
 */
export function deriveModelTag(prefix: string, modelOverride: string | undefined): string {
  return `${sanitizeTagSegment(modelOverride ?? prefix.toLowerCase())}-agentic`
}

/**
 * A model tag becomes a results directory name, so a model id with
 * path-hostile characters (`org/model-name` is a real id shape) must not
 * silently create nested directories. Anything outside [a-z0-9._-]
 * flattens to `-`; lowercased for tag-vs-prefix consistency. (Review
 * finding on the --model override wave.)
 */
export function sanitizeTagSegment(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")
}

// ── CLI entry ──

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2)
  const dirFlag = (name: string, fallback: string): string => {
    const prefix = `--${name}=`
    const hit = rawArgs.find((a) => a.startsWith(prefix))
    return hit ? resolve(ROOT, hit.slice(prefix.length)) : join(ROOT, fallback)
  }
  const questionsDir = dirFlag("questions-dir", "tests/bench/questions")
  const resultsDir = dirFlag("results-dir", "tests/bench/results")
  const modelOverride = flagValue(rawArgs, "model")
  const [prefixArg, ...qids] = rawArgs.filter((a) => !a.startsWith("--"))
  if (!prefixArg) throw new Error("usage: pnpm bench:agentic <env-prefix e.g. qwen|deepseek> [qids...] [--model=<id>]")
  const prefix = prefixArg.toUpperCase()
  const env = loadEnv(join(ROOT, ".env"))
  const cfg = {
    baseUrl: env[`${prefix}_BASE_URL`],
    apiKey: env[`${prefix}_API_KEY`],
    model: modelOverride ?? env[`${prefix}_MODEL`],
  }
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) throw new Error(`missing ${prefix}_BASE_URL/_API_KEY/_MODEL in .env`)
  const modelTag = deriveModelTag(prefix, modelOverride)

  const questions = qids.length > 0 ? qids : readdirSync(questionsDir).filter((d) => /^[a-z]\d\d$/.test(d)).sort()
  // Unlike run.mts's shared object, no schema/narratives/themes CLI calls
  // here — the agentic model queries live vocabulary itself via run_pptwise
  // (plan 裁定 1, see file header).
  const shared = {
    skill: readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8"),
  }
  console.log(
    `model-tag ${modelTag} · ${questions.length} question(s) · round cap ${ROUND_CAP} · sequential · ` +
      `questions=${questionsDir} results=${resultsDir}`,
  )
  for (const qid of questions) {
    await runOneAgentic(
      { baseUrl: cfg.baseUrl!, apiKey: cfg.apiKey!, model: cfg.model! },
      prefix,
      qid,
      shared,
      { questionsDir, resultsDir },
      modelTag,
    )
  }
  console.log("run complete")
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invokedDirectly) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
