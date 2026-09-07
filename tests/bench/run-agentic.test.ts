// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, sep } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  buildMeta,
  checkPathSafety,
  checkPptwiseArgs,
  classifyModelTurn,
  copyQuestionAssets,
  copySkillReferences,
  decideTurn,
  deriveModelTag,
  doReadFile,
  doWriteFile,
  executeTool,
  finishToolResult,
  sanitizeTagSegment,
  extractCachedTokens,
  flagValue,
  locateArtifact,
  placeArtifact,
  runOneAgentic,
  scriptedReplyFor,
  stripFence,
  truncateForModel,
  type ChatCompletionResponse,
  type CompleteFn,
} from "./run-agentic.mts"
import { scoreQuestion } from "./score.mts"

// ── checkPathSafety — the tool-surface escape guard (plan 裁定 1) ──

describe("checkPathSafety", () => {
  const workspace = join(sep, "fake", "workspace")

  it("accepts a plain relative path inside the workspace", () => {
    const result = checkPathSafety(workspace, "deck.json")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resolved).toBe(join(workspace, "deck.json"))
  })

  it("accepts a nested relative path inside the workspace", () => {
    const result = checkPathSafety(workspace, "pages/p-cover.json")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resolved).toBe(join(workspace, "pages", "p-cover.json"))
  })

  it("accepts the workspace root itself (\".\")", () => {
    const result = checkPathSafety(workspace, ".")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resolved).toBe(workspace)
  })

  it("accepts a .. that stays inside the workspace", () => {
    const result = checkPathSafety(workspace, "pages/../deck.json")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resolved).toBe(join(workspace, "deck.json"))
  })

  it("rejects a .. that escapes the workspace", () => {
    const result = checkPathSafety(workspace, "../outside.json")
    expect(result.ok).toBe(false)
  })

  it("rejects a deeply nested .. escape", () => {
    const result = checkPathSafety(workspace, "pages/../../outside.json")
    expect(result.ok).toBe(false)
  })

  it("rejects an absolute path", () => {
    const result = checkPathSafety(workspace, "/etc/passwd")
    expect(result.ok).toBe(false)
  })

  it("rejects an absolute path even when it happens to be inside the workspace tree", () => {
    // Absolute paths are rejected outright regardless of where they point —
    // "no absolute paths" is the contract, not "no absolute paths outside
    // the workspace" (see run-agentic.mts's checkPathSafety doc comment).
    const result = checkPathSafety(workspace, join(workspace, "deck.json"))
    expect(result.ok).toBe(false)
  })

  it("rejects a sibling directory sharing the workspace name as a prefix", () => {
    // The classic prefix-trap: `/fake/workspace-evil/x` starts with
    // `/fake/workspace` as a raw string but is outside it — the guard must
    // compare against `workspace + sep`, not the bare prefix. (Wave-review
    // finding: the implementation was correct, this pins it.)
    const result = checkPathSafety(workspace, join("..", "workspace-evil", "x.json"))
    expect(result.ok).toBe(false)
  })

  it("accepts an empty path as the workspace root", () => {
    // `resolve(workspace, "")` is the workspace itself — same contract as
    // the explicit "." case above. Downstream fs calls on a directory fail
    // safely inside executeTool's try/catch, so ok:true here is harmless.
    const result = checkPathSafety(workspace, "")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resolved).toBe(workspace)
  })
})

// ── checkPptwiseArgs — run_pptwise subcommand whitelist + path safety ──

describe("checkPptwiseArgs", () => {
  const workspace = join(sep, "fake", "workspace")

  it("allows a whitelisted read-only subcommand with an in-workspace path", () => {
    expect(checkPptwiseArgs(["validate", "deck.json"], workspace)).toEqual({ ok: true })
  })

  it("allows every documented whitelisted subcommand", () => {
    for (const cmd of ["render", "validate", "audit", "asset-brief", "schema", "assemble", "disassemble", "themes", "narratives", "preview", "layouts", "doctor"]) {
      expect(checkPptwiseArgs([cmd], workspace).ok).toBe(true)
    }
  })

  it("allows the one permitted spec sub-subcommand", () => {
    expect(checkPptwiseArgs(["spec", "validate", "deck.spec.json"], workspace)).toEqual({ ok: true })
  })

  it("rejects other spec sub-subcommands and a bare group name", () => {
    expect(checkPptwiseArgs(["spec", "assemble"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["spec"], workspace).ok).toBe(false)
  })

  it("allows the theme subcommands the SKILL playbook asks for (try / new / fork)", () => {
    expect(checkPptwiseArgs(["theme", "try", "brief,swiss,memo"], workspace)).toEqual({ ok: true })
    expect(checkPptwiseArgs(["theme", "new", "--from", "brief", "--id", "acme-report"], workspace)).toEqual({ ok: true })
    expect(checkPptwiseArgs(["theme", "fork", "acme", "--primary", "#0B5FFF", "--id", "acme-blue"], workspace)).toEqual({
      ok: true,
    })
  })

  it("rejects a theme sub-subcommand that is not on the list, and a bare theme", () => {
    expect(checkPptwiseArgs(["theme", "delete", "acme"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["theme"], workspace).ok).toBe(false)
  })

  it("allows brand extract (local Office-file extraction the playbook names)", () => {
    expect(checkPptwiseArgs(["brand", "extract", "corp.pptx", "-o", "themes/acme.theme.json"], workspace)).toEqual({
      ok: true,
    })
    expect(checkPptwiseArgs(["brand", "steal"], workspace).ok).toBe(false)
  })

  it("rejects migrate (the command no longer exists) and init (scaffolds config outside the workflow)", () => {
    expect(checkPptwiseArgs(["migrate", "deck.json"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["init"], workspace).ok).toBe(false)
  })

  it("rejects config and images (user-level config writes, network side effects)", () => {
    expect(checkPptwiseArgs(["config", "set", "pexels.apiKey", "x"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["images", "search", "office"], workspace).ok).toBe(false)
  })

  it("rejects serve (interactive, out of the neutral tool surface)", () => {
    expect(checkPptwiseArgs(["serve", "deck.json"], workspace).ok).toBe(false)
  })

  it("rejects check-update / self-update (network side effects)", () => {
    expect(checkPptwiseArgs(["check-update"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["self-update"], workspace).ok).toBe(false)
  })

  it("rejects removed vocabulary-v4 aliases (plan/scenarios)", () => {
    expect(checkPptwiseArgs(["plan", "validate", "x.json"], workspace).ok).toBe(false)
    expect(checkPptwiseArgs(["scenarios"], workspace).ok).toBe(false)
  })

  it("rejects an unknown subcommand", () => {
    expect(checkPptwiseArgs(["frobnicate"], workspace).ok).toBe(false)
  })

  it("rejects empty args", () => {
    expect(checkPptwiseArgs([], workspace).ok).toBe(false)
  })

  it("rejects a path argument escaping the workspace via ..", () => {
    expect(checkPptwiseArgs(["validate", "../../etc/passwd"], workspace).ok).toBe(false)
  })

  it("rejects an absolute path argument", () => {
    expect(checkPptwiseArgs(["render", "deck.json", "-o", "/tmp/out.pptx"], workspace).ok).toBe(false)
  })

  it("rejects an escaping path passed via --flag=value", () => {
    expect(checkPptwiseArgs(["render", "deck.json", "--output=../outside.pptx"], workspace).ok).toBe(false)
  })

  it("allows a safe --flag=value path", () => {
    expect(checkPptwiseArgs(["render", "deck.json", "--output=out.pptx"], workspace)).toEqual({ ok: true })
  })

  it("allows a non-path flag value like a theme id or boolean flag", () => {
    expect(checkPptwiseArgs(["render", "deck.json", "-o", "out.pptx", "--theme", "luxe"], workspace)).toEqual({
      ok: true,
    })
    expect(checkPptwiseArgs(["audit", "deck.json", "--json"], workspace)).toEqual({ ok: true })
  })
})

// ── classifyModelTurn / scriptedReplyFor — README's two fixed human lines ──

describe("classifyModelTurn", () => {
  it("classifies a spec-confirmation question", () => {
    expect(classifyModelTurn("Here is my proposed spec. Can you confirm this spec before I proceed?")).toBe(
      "spec-confirmation",
    )
  })

  it("classifies a spec-confirmation question phrased as deck.spec.json", () => {
    expect(classifyModelTurn("I've drafted deck.spec.json — should I proceed with this plan?")).toBe(
      "spec-confirmation",
    )
  })

  it("classifies an other clarifying question with no spec mention", () => {
    expect(classifyModelTurn("Should the chart use blue or green for the trend line?")).toBe("other-question")
  })

  it("classifies a confirmation-seeking statement with no question mark as a question", () => {
    expect(classifyModelTurn("Please confirm before I continue.")).toBe("other-question")
  })

  it("classifies a plain completion statement as a stop", () => {
    expect(classifyModelTurn("The deck is complete: validate and audit both pass, render succeeded.")).toBe("stop")
  })

  it("classifies empty content as a stop", () => {
    expect(classifyModelTurn("")).toBe("stop")
    expect(classifyModelTurn("   ")).toBe("stop")
  })

  it("classifies a bare IR JSON answer (no tool calls, no question) as a stop", () => {
    expect(classifyModelTurn('{"slides": [{"components": []}]}')).toBe("stop")
  })
})

describe("scriptedReplyFor", () => {
  it("returns the exact verbatim spec-confirmation line", () => {
    expect(scriptedReplyFor("spec-confirmation")).toBe("Spec confirmed, proceed.")
  })

  it("returns the exact verbatim other-question line", () => {
    expect(scriptedReplyFor("other-question")).toBe("Proceed with your best judgment.")
  })
})

// ── stripFence — reused from run.mts's single-shot answer convention ──

describe("stripFence", () => {
  it("strips a ```json fence", () => {
    expect(stripFence('```json\n{"a": 1}\n```')).toBe('{"a": 1}')
  })

  it("strips a bare ``` fence with no language tag", () => {
    expect(stripFence('```\n{"a": 1}\n```')).toBe('{"a": 1}')
  })

  it("leaves unfenced text untouched (trimmed)", () => {
    expect(stripFence('  {"a": 1}  ')).toBe('{"a": 1}')
  })
})

// ── truncateForModel — per-tool-result cap, truncate from the end (plan 裁定 2) ──

describe("truncateForModel", () => {
  it("returns short text untouched, no marker appended", () => {
    expect(truncateForModel("exit 0\nok", 100)).toBe("exit 0\nok")
  })

  it("returns text exactly at the cap untouched", () => {
    const text = "a".repeat(100)
    expect(truncateForModel(text, 100)).toBe(text)
  })

  it("truncates from the end, keeping the head, when text exceeds the cap", () => {
    const text = "a".repeat(50) + "b".repeat(50) // head is 'a's, tail is 'b's
    const result = truncateForModel(text, 50)
    expect(result.startsWith("a".repeat(50))).toBe(true)
    expect(result).not.toContain("b")
  })

  it("appends a marker line stating the cap and the original length", () => {
    const text = "x".repeat(9000)
    const result = truncateForModel(text, 8000)
    expect(result).toContain("[truncated: 8000 of 9000 chars shown]")
  })

  it("keeps the exact head content before the marker", () => {
    const text = "0123456789".repeat(10) // 100 chars, distinct content
    const result = truncateForModel(text, 30)
    expect(result.startsWith(text.slice(0, 30))).toBe(true)
    expect(result).toContain("[truncated: 30 of 100 chars shown]")
  })
})

// ── buildMeta — harness-written, requested vs reported identity (plan 裁定 2) ──

describe("buildMeta", () => {
  it("assembles every documented field, keeping requested and reported identity separate", () => {
    const meta = buildMeta({
      providerPrefix: "QWEN",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelRequested: "qwen3.6-27b",
      modelReported: new Set(["qwen3.6-27b-20260801"]),
      rounds: 7,
      toolCalls: 12,
      promptTokens: 15000,
      completionTokens: 2200,
      startedAt: 1_700_000_000_000,
      finishedAt: 1_700_000_042_000,
      capHit: false,
      deadlineHit: false,
      scriptedReplies: 1,
      cachedPromptTokens: 9000,
      toolRejections: [{ call: 3, tool: "run_pptwise", kind: "subcommand-not-allowed", reason: "subcommand not allowed: serve" }],
      toolErrors: 2,
      lengthCutoffs: 1,
    })
    expect(meta).toEqual({
      provider_prefix: "QWEN",
      base_url_host: "dashscope.aliyuncs.com",
      model_requested: "qwen3.6-27b",
      model_reported: ["qwen3.6-27b-20260801"],
      mode: "agentic",
      rounds: 7,
      tool_calls: 12,
      prompt_tokens: 15000,
      completion_tokens: 2200,
      started_at: new Date(1_700_000_000_000).toISOString(),
      duration_seconds: 42,
      cap_hit: false,
      deadline_hit: false,
      scripted_replies: 1,
      cached_prompt_tokens: 9000,
      tool_rejections: 1,
      tool_rejection_details: [
        { call: 3, tool: "run_pptwise", kind: "subcommand-not-allowed", reason: "subcommand not allowed: serve" },
      ],
      tool_errors: 2,
      length_cutoffs: 1,
    })
  })

  it("does not reconcile a mismatch between requested and reported model — both survive as-is", () => {
    const meta = buildMeta({
      providerPrefix: "QWEN",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelRequested: "qwen3.6-27b",
      modelReported: new Set(["some-other-served-model"]),
      rounds: 1,
      toolCalls: 0,
      promptTokens: 100,
      completionTokens: 10,
      startedAt: 0,
      finishedAt: 1000,
      capHit: false,
      deadlineHit: false,
      scriptedReplies: 0,
      cachedPromptTokens: 0,
      toolRejections: [],
      toolErrors: 0,
      lengthCutoffs: 0,
    })
    expect(meta.model_requested).toBe("qwen3.6-27b")
    expect(meta.model_reported).toEqual(["some-other-served-model"])
  })

  it("sorts and dedupes model_reported (a Set collected across rounds may vary in insertion order)", () => {
    const meta = buildMeta({
      providerPrefix: "DEEPSEEK",
      baseUrl: "https://api.deepseek.com/v1",
      modelRequested: "deepseek-v4-flash",
      modelReported: new Set(["b-model", "a-model", "a-model"]),
      rounds: 2,
      toolCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      startedAt: 0,
      finishedAt: 0,
      capHit: true,
      deadlineHit: false,
      scriptedReplies: 0,
      cachedPromptTokens: 0,
      toolRejections: [],
      toolErrors: 0,
      lengthCutoffs: 0,
    })
    expect(meta.model_reported).toEqual(["a-model", "b-model"])
    expect(meta.cap_hit).toBe(true)
  })

  it("records deadline_hit separately from cap_hit — the overall run-deadline guard", () => {
    const meta = buildMeta({
      providerPrefix: "QWEN",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelRequested: "qwen3.6-27b",
      modelReported: new Set(),
      rounds: 3,
      toolCalls: 5,
      promptTokens: 1000,
      completionTokens: 100,
      startedAt: 0,
      finishedAt: 1_500_000,
      capHit: false,
      deadlineHit: true,
      scriptedReplies: 0,
      cachedPromptTokens: 0,
      toolRejections: [],
      toolErrors: 0,
      lengthCutoffs: 0,
    })
    expect(meta.deadline_hit).toBe(true)
    expect(meta.cap_hit).toBe(false)
  })

  it("records cached_prompt_tokens as a plain additive field, 0 when no provider reported any", () => {
    const meta = buildMeta({
      providerPrefix: "QWEN",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelRequested: "qwen3.6-27b",
      modelReported: new Set(),
      rounds: 1,
      toolCalls: 0,
      promptTokens: 500,
      completionTokens: 50,
      startedAt: 0,
      finishedAt: 1000,
      capHit: false,
      deadlineHit: false,
      scriptedReplies: 0,
      cachedPromptTokens: 0,
      toolRejections: [],
      toolErrors: 0,
      lengthCutoffs: 0,
    })
    expect(meta.cached_prompt_tokens).toBe(0)
  })
})

// ── extractCachedTokens — provider prompt-cache-hit fields (plan 裁定 3) ──

describe("extractCachedTokens", () => {
  it("returns 0 when usage is undefined", () => {
    expect(extractCachedTokens(undefined)).toBe(0)
  })

  it("returns 0 when usage carries neither cache field", () => {
    expect(extractCachedTokens({ prompt_tokens: 100, completion_tokens: 10 })).toBe(0)
  })

  it("reads DeepSeek's prompt_cache_hit_tokens field", () => {
    expect(extractCachedTokens({ prompt_tokens: 1000, prompt_cache_hit_tokens: 400 })).toBe(400)
  })

  it("reads dashscope/OpenAI-shaped prompt_tokens_details.cached_tokens field", () => {
    expect(extractCachedTokens({ prompt_tokens: 1000, prompt_tokens_details: { cached_tokens: 250 } })).toBe(250)
  })

  it("treats a present but undefined cached_tokens as 0", () => {
    expect(extractCachedTokens({ prompt_tokens: 1000, prompt_tokens_details: {} })).toBe(0)
  })

  it("takes ONE field when a response carries both aliases, never sums", () => {
    // First-batch evidence (2026-08-04): DeepSeek populates BOTH fields
    // with the same value on every response — they alias one quantity.
    // The original sum double-counted every question at ratio ~2.0
    // (archived metas in results-archive/2026-08-04-first-full-agentic/).
    expect(
      extractCachedTokens({
        prompt_tokens: 1000,
        prompt_cache_hit_tokens: 300,
        prompt_tokens_details: { cached_tokens: 300 },
      }),
    ).toBe(300)
  })

  it("prefers the provider-specific field when the aliases disagree", () => {
    // Disagreement should not happen in practice; the deterministic rule
    // is documented field precedence, not summing.
    expect(
      extractCachedTokens({
        prompt_tokens: 1000,
        prompt_cache_hit_tokens: 300,
        prompt_tokens_details: { cached_tokens: 100 },
      }),
    ).toBe(300)
  })
})

// ── locateArtifact / placeArtifact — bridging workspace/ to the result root score.mts reads ──

describe("locateArtifact + placeArtifact", () => {
  let workspace: string
  let resultDir: string

  afterEach(() => {
    if (workspace) rmSync(join(workspace, ".."), { recursive: true, force: true })
  })

  function setup(): void {
    const base = mkdtempSync(join(tmpdir(), "bench-agentic-test-"))
    workspace = join(base, "workspace")
    resultDir = base
    mkdirSync(workspace, { recursive: true })
  }

  it("finds a single bare IR json file at the workspace root", () => {
    setup()
    writeFileSync(join(workspace, "deck.json"), '{"slides": []}')
    const located = locateArtifact(workspace)
    expect(located).toEqual({ kind: "bare-ir", file: join(workspace, "deck.json") })
    const note = placeArtifact(located, resultDir, workspace)
    expect(note).toMatch(/copied bare IR/)
  })

  it("prefers a deck-project directory over any stray json files", () => {
    setup()
    mkdirSync(join(workspace, "pages"), { recursive: true })
    writeFileSync(join(workspace, "deck.spec.json"), "{}")
    writeFileSync(join(workspace, "pages", "p-cover.json"), "{}")
    writeFileSync(join(workspace, "notes.json"), "{}") // stray, not part of the project
    const located = locateArtifact(workspace)
    expect(located).toEqual({ kind: "deck-project", dir: workspace })
    placeArtifact(located, resultDir, workspace)
    // deck.spec.json + pages/ land at the result root; the stray notes.json does not.
    expect(() => statSync(join(resultDir, "deck.spec.json"))).not.toThrow()
    expect(() => statSync(join(resultDir, "pages", "p-cover.json"))).not.toThrow()
  })

  it("picks the conventional deck.json among several candidates when no deck project exists", () => {
    setup()
    writeFileSync(join(workspace, "scratch.json"), "{}")
    writeFileSync(join(workspace, "deck.json"), '{"slides": []}')
    const located = locateArtifact(workspace)
    expect(located).toEqual({ kind: "bare-ir", file: join(workspace, "deck.json") })
  })

  it("reports none when the workspace has no json artifact at all", () => {
    setup()
    writeFileSync(join(workspace, "notes.txt"), "not json")
    expect(locateArtifact(workspace)).toEqual({ kind: "none" })
  })

  it("copies a bare IR's sibling assets/ directory alongside deck.json (round-2 image-question fix)", () => {
    setup()
    writeFileSync(join(workspace, "deck.json"), '{"slides": []}')
    mkdirSync(join(workspace, "assets"), { recursive: true })
    writeFileSync(join(workspace, "assets", "hero.png"), "fake-png-bytes")
    const located = locateArtifact(workspace)
    const note = placeArtifact(located, resultDir, workspace)
    expect(readFileSync(join(resultDir, "assets", "hero.png"), "utf8")).toBe("fake-png-bytes")
    expect(note).toContain("assets/")
  })

  it("does not create an assets/ dir in the result root when the workspace has none", () => {
    setup()
    writeFileSync(join(workspace, "deck.json"), '{"slides": []}')
    const located = locateArtifact(workspace)
    placeArtifact(located, resultDir, workspace)
    expect(existsSync(join(resultDir, "assets"))).toBe(false)
  })

  // Custom theme files (codex review R3): the CLI resolves a bound theme
  // through deck-local theme.json / <name>.theme.json and the workspace
  // themes/ directory (src/cli/theme-resolve.ts). Whatever the model's own
  // validate/render calls found has to travel with the artifact, or the
  // scorer resolves a different theme than the one the deck was built on.

  it("copies the workspace themes/ directory and deck-local theme files alongside a bare IR", () => {
    setup()
    writeFileSync(join(workspace, "deck.json"), '{"slides": []}')
    mkdirSync(join(workspace, "themes"), { recursive: true })
    writeFileSync(join(workspace, "themes", "sketch.theme.json"), '{"id": "sketch"}')
    writeFileSync(join(workspace, "theme.json"), '{"id": "bound"}')
    writeFileSync(join(workspace, "acme.theme.json"), '{"id": "acme"}')
    const located = locateArtifact(workspace)
    // theme files beside the IR are never mistaken for the IR itself
    expect(located).toEqual({ kind: "bare-ir", file: join(workspace, "deck.json") })
    const note = placeArtifact(located, resultDir, workspace)
    expect(readFileSync(join(resultDir, "themes", "sketch.theme.json"), "utf8")).toBe('{"id": "sketch"}')
    expect(readFileSync(join(resultDir, "theme.json"), "utf8")).toBe('{"id": "bound"}')
    expect(readFileSync(join(resultDir, "acme.theme.json"), "utf8")).toBe('{"id": "acme"}')
    expect(note).toContain("themes/")
  })

  it("does not pick a theme file as the bare IR when the IR has an unconventional name", () => {
    setup()
    writeFileSync(join(workspace, "sketch.theme.json"), '{"id": "sketch"}')
    writeFileSync(join(workspace, "my-deck.json"), '{"slides": []}')
    // the theme file is written last, so a plain newest-mtime tie-break would pick it
    writeFileSync(join(workspace, "theme.json"), '{"id": "sketch"}')
    expect(locateArtifact(workspace)).toEqual({ kind: "bare-ir", file: join(workspace, "my-deck.json") })
  })

  it("copies a nested deck project's own theme.json and the workspace-root themes/ the CLI resolved against", () => {
    setup()
    const deckDir = join(workspace, "my-deck")
    mkdirSync(join(deckDir, "pages"), { recursive: true })
    writeFileSync(join(deckDir, "deck.spec.json"), '{"theme": "sketch"}')
    writeFileSync(join(deckDir, "pages", "p-cover.json"), "{}")
    writeFileSync(join(deckDir, "theme.json"), '{"id": "sketch"}')
    mkdirSync(join(workspace, "themes"), { recursive: true })
    writeFileSync(join(workspace, "themes", "acme.theme.json"), '{"id": "acme"}')
    const located = locateArtifact(workspace)
    expect(located).toEqual({ kind: "deck-project", dir: deckDir })
    placeArtifact(located, resultDir, workspace)
    expect(readFileSync(join(resultDir, "theme.json"), "utf8")).toBe('{"id": "sketch"}')
    expect(readFileSync(join(resultDir, "themes", "acme.theme.json"), "utf8")).toBe('{"id": "acme"}')
    expect(existsSync(join(resultDir, "pages", "p-cover.json"))).toBe(true)
  })
})

// ── flagValue — --model=<id> CLI override parsing ──

describe("flagValue", () => {
  it("returns the value of a present --name=value flag", () => {
    expect(flagValue(["qwen", "--model=qwen-flash", "q01"], "model")).toBe("qwen-flash")
  })

  it("returns undefined when the flag is absent", () => {
    expect(flagValue(["qwen", "q01"], "model")).toBeUndefined()
  })

  it("does not match a same-prefixed but different flag name", () => {
    expect(flagValue(["--model-extra=x"], "model")).toBeUndefined()
  })

  it("handles a value that itself contains an equals sign", () => {
    expect(flagValue(["--model=qwen=flash"], "model")).toBe("qwen=flash")
  })
})

// ── deriveModelTag — result model-tag with/without --model (dashscope
// cache-list swap, .issues/2026-08-04-bench-agentic/dashscope-cache-investigation.md) ──

describe("deriveModelTag", () => {
  it("defaults to <prefix>-agentic when no override is given", () => {
    expect(deriveModelTag("QWEN", undefined)).toBe("qwen-agentic")
  })

  it("uses the override id, not the prefix, when --model is given", () => {
    expect(deriveModelTag("QWEN", "qwen-flash")).toBe("qwen-flash-agentic")
  })

  it("keeps the override's own casing/shape rather than reprocessing it", () => {
    expect(deriveModelTag("DEEPSEEK", "deepseek-v4-flash")).toBe("deepseek-v4-flash-agentic")
  })

  it("lowercases the default prefix-based tag even when the prefix arrives uppercase", () => {
    expect(deriveModelTag("DEEPSEEK", undefined)).toBe("deepseek-agentic")
  })
})

// ── copyQuestionAssets — provisions a question's assets/ into the workspace
// before round 1 (round-2 image-question fix, checkPathSafety-style escape
// guard reused even though the question bank is trusted content) ──

describe("copyQuestionAssets", () => {
  let base: string
  let questionDir: string
  let workspace: string

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  function setup(): void {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-assets-test-"))
    questionDir = join(base, "q02")
    workspace = join(base, "workspace")
    mkdirSync(questionDir, { recursive: true })
    mkdirSync(workspace, { recursive: true })
  }

  it("returns an empty set and copies nothing when the question has no assets/ directory", () => {
    setup()
    expect(copyQuestionAssets(questionDir, workspace).size).toBe(0)
    expect(existsSync(join(workspace, "assets"))).toBe(false)
  })

  it("copies every file under assets/ into workspace/assets/", () => {
    setup()
    mkdirSync(join(questionDir, "assets"), { recursive: true })
    writeFileSync(join(questionDir, "assets", "hero.png"), "hero-bytes")
    writeFileSync(join(questionDir, "assets", "case.png"), "case-bytes")
    const copied = copyQuestionAssets(questionDir, workspace)
    expect(copied.size).toBe(2)
    expect(copied.has(join(workspace, "assets", "hero.png"))).toBe(true)
    expect(readFileSync(join(workspace, "assets", "hero.png"), "utf8")).toBe("hero-bytes")
    expect(readFileSync(join(workspace, "assets", "case.png"), "utf8")).toBe("case-bytes")
  })

  it("preserves a nested directory structure under assets/", () => {
    setup()
    mkdirSync(join(questionDir, "assets", "photos"), { recursive: true })
    writeFileSync(join(questionDir, "assets", "photos", "team.png"), "team-bytes")
    copyQuestionAssets(questionDir, workspace)
    expect(readFileSync(join(workspace, "assets", "photos", "team.png"), "utf8")).toBe("team-bytes")
  })

  it("never writes outside the workspace even if a crafted entry name tries to escape", () => {
    setup()
    mkdirSync(join(questionDir, "assets"), { recursive: true })
    writeFileSync(join(questionDir, "assets", "safe.png"), "safe-bytes")
    // Simulate a malicious/misconfigured question dir with a symlink escape
    // attempt inside assets/ — readdirSync withFileTypes reports a symlink
    // as neither isFile() nor isDirectory(), so walkFiles never traverses
    // it; this test pins that a symlink entry is silently skipped, not
    // followed, and every legitimate file still copies correctly.
    const outsideTarget = join(base, "outside-secret.txt")
    writeFileSync(outsideTarget, "should never appear in workspace")
    try {
      symlinkSync(outsideTarget, join(questionDir, "assets", "escape.png"))
    } catch {
      // symlink creation can fail without elevated perms on some platforms
      // (notably Windows) — the property under test is "no escape occurs",
      // which trivially holds if the symlink was never created at all.
    }
    const copied = copyQuestionAssets(questionDir, workspace)
    expect(readFileSync(join(workspace, "assets", "safe.png"), "utf8")).toBe("safe-bytes")
    expect(existsSync(join(workspace, "assets", "escape.png"))).toBe(false)
    expect(copied.size).toBe(1)
  })

  it("write_file refuses to overwrite a provisioned input but allows new files beside it", () => {
    // Code-enforced guard behind the preamble's soft warning (q12 smoke:
    // model rewrote a provided PNG with base64 text, corrupting it).
    setup()
    mkdirSync(join(questionDir, "assets"), { recursive: true })
    writeFileSync(join(questionDir, "assets", "hero.png"), "hero-bytes")
    const provisioned = copyQuestionAssets(questionDir, workspace)
    const refused = doWriteFile(workspace, { path: "assets/hero.png", content: "base64garbage" }, provisioned)
    expect(refused.content).toMatch(/^ERROR: .*provided input file/)
    expect(refused.rejection?.kind).toBe("protected-input")
    expect(readFileSync(join(workspace, "assets", "hero.png"), "utf8")).toBe("hero-bytes")
    const allowed = doWriteFile(workspace, { path: "assets/derived.png", content: "new-bytes" }, provisioned)
    expect(allowed.content).toMatch(/^wrote /)
    expect(allowed.rejection).toBeUndefined()
    expect(readFileSync(join(workspace, "assets", "derived.png"), "utf8")).toBe("new-bytes")
  })
})

// ── sanitizeTagSegment — model ids double as result-dir names ──

describe("sanitizeTagSegment", () => {
  it("flattens a slash-bearing model id to one path segment", () => {
    expect(sanitizeTagSegment("org/model-name")).toBe("org-model-name")
  })

  it("lowercases and collapses runs of hostile characters", () => {
    expect(sanitizeTagSegment("Qwen Flash::v2")).toBe("qwen-flash-v2")
  })

  it("keeps already-clean ids byte-identical", () => {
    expect(sanitizeTagSegment("qwen-flash")).toBe("qwen-flash")
  })

  it("deriveModelTag applies it to --model overrides", () => {
    expect(deriveModelTag("QWEN", "org/custom.Model")).toBe("org-custom.model-agentic")
  })
})

// ── finishToolResult — over-cap results spill to a file the model can page through ──

describe("finishToolResult", () => {
  let workspace: string

  afterEach(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true })
  })

  function setup(): void {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-spill-test-"))
  }

  it("returns an under-cap result untouched and writes no file", () => {
    setup()
    const out = finishToolResult("exit 0\nok", { workspace, callIndex: 1, tool: "run_pptwise", maxChars: 100 })
    expect(out).toBe("exit 0\nok")
    expect(existsSync(join(workspace, ".tool-results"))).toBe(false)
  })

  it("saves the full text under .tool-results/ with the call index in the name and tells the model how to read on", () => {
    setup()
    const text = "0123456789".repeat(1000) // 10000 chars
    const out = finishToolResult(text, { workspace, callIndex: 7, tool: "run_pptwise", maxChars: 8000 })
    const spill = join(workspace, ".tool-results", "007-run_pptwise.txt")
    expect(readFileSync(spill, "utf8")).toBe(text)
    expect(out.startsWith(text.slice(0, 8000))).toBe(true)
    expect(out).toContain("[truncated: chars 0-8000 of 10000 shown.")
    expect(out).toContain('read_file({"path": ".tool-results/007-run_pptwise.txt", "offset": 8000})')
  })

  it("the spill path is readable back through read_file with the offset the hint names", () => {
    setup()
    const text = "a".repeat(50) + "b".repeat(50)
    finishToolResult(text, { workspace, callIndex: 2, tool: "list_files", maxChars: 50 })
    const rest = doReadFile(workspace, { path: ".tool-results/002-list_files.txt", offset: 50 }, 8000)
    expect(rest.content).toBe("b".repeat(50))
  })
})

// ── doReadFile — offset / limit paging ──

describe("doReadFile", () => {
  let workspace: string

  afterEach(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true })
  })

  function setup(content: string): void {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-read-test-"))
    writeFileSync(join(workspace, "big.txt"), content)
  }

  it("reads a whole small file with no hint", () => {
    setup("hello")
    expect(doReadFile(workspace, { path: "big.txt" }, 8000).content).toBe("hello")
  })

  it("caps a large file at maxChars and points at the next offset", () => {
    setup("x".repeat(20000))
    const out = doReadFile(workspace, { path: "big.txt" }, 8000)
    expect(out.content.startsWith("x".repeat(8000))).toBe(true)
    expect(out.content).toContain("[truncated: chars 0-8000 of 20000 shown.")
    expect(out.content).toContain('read_file({"path": "big.txt", "offset": 8000})')
    expect(out.content).not.toContain("x".repeat(8001))
  })

  it("honours offset and limit as character positions", () => {
    setup("0123456789".repeat(10))
    const out = doReadFile(workspace, { path: "big.txt", offset: 10, limit: 5 }, 8000)
    expect(out.content.startsWith("01234")).toBe(true)
    expect(out.content).toContain("[truncated: chars 10-15 of 100 shown.")
    expect(out.content).toContain('"offset": 15')
  })

  it("returns the tail with no hint when offset + limit reaches the end", () => {
    setup("0123456789".repeat(10))
    const out = doReadFile(workspace, { path: "big.txt", offset: 90 }, 8000)
    expect(out.content).toBe("0123456789")
  })

  it("rejects an offset past the end as a bad argument", () => {
    setup("short")
    const out = doReadFile(workspace, { path: "big.txt", offset: 500 }, 8000)
    expect(out.content).toMatch(/^ERROR: offset 500/)
    expect(out.rejection?.kind).toBe("bad-arguments")
  })

  it("reports a missing file as a tool error, not a harness rejection", () => {
    setup("x")
    const out = doReadFile(workspace, { path: "nope.txt" }, 8000)
    expect(out.content).toMatch(/^ERROR: no such file/)
    expect(out.rejection).toBeUndefined()
    expect(out.failed).toBe(true)
  })
})

// ── copySkillReferences — the playbook's references/ travel with SKILL.md ──

describe("copySkillReferences", () => {
  let base: string

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  it("copies skills/pptwise/references/ into workspace/references/ and protects the copies", () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-refs-test-"))
    const skillDir = join(base, "skill")
    const workspace = join(base, "workspace")
    mkdirSync(join(skillDir, "references"), { recursive: true })
    writeFileSync(join(skillDir, "SKILL.md"), "see references/spec.md")
    writeFileSync(join(skillDir, "references", "spec.md"), "spec guidance")
    writeFileSync(join(skillDir, "references", "spec.zh-CN.md"), "spec 指南")
    mkdirSync(workspace, { recursive: true })
    const provisioned = copySkillReferences(skillDir, workspace)
    expect(readFileSync(join(workspace, "references", "spec.md"), "utf8")).toBe("spec guidance")
    expect(readFileSync(join(workspace, "references", "spec.zh-CN.md"), "utf8")).toBe("spec 指南")
    expect(provisioned.has(join(workspace, "references", "spec.md"))).toBe(true)
    const refused = doWriteFile(workspace, { path: "references/spec.md", content: "oops" }, provisioned)
    expect(refused.rejection?.kind).toBe("protected-input")
  })

  it("the real skill directory ships a references/ folder for the runner to copy", () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-refs-real-"))
    const copied = copySkillReferences(join(import.meta.dirname, "../../skills/pptwise"), base)
    expect(copied.size).toBeGreaterThan(0)
    expect(existsSync(join(base, "references", "spec.md"))).toBe(true)
  })
})

// ── executeTool — harness rejections are recorded apart from the model's own errors ──

describe("executeTool rejection classification", () => {
  let workspace: string

  afterEach(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true })
  })

  const call = (name: string, args: unknown) => ({
    id: "c1",
    type: "function" as const,
    function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) },
  })
  const ctx = () => ({ callIndex: 1, maxChars: 8000 })

  it("flags a path escape", () => {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-exec-test-"))
    const out = executeTool(call("read_file", { path: "../secret" }), workspace, ctx())
    expect(out.rejection?.kind).toBe("path-escape")
  })

  it("flags a disallowed subcommand", () => {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-exec-test-"))
    const out = executeTool(call("run_pptwise", { args: ["serve", "deck.json"] }), workspace, ctx())
    expect(out.rejection?.kind).toBe("subcommand-not-allowed")
  })

  it("flags malformed argument JSON and an unknown tool", () => {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-exec-test-"))
    expect(executeTool(call("read_file", "{not json"), workspace, ctx()).rejection?.kind).toBe("bad-arguments")
    expect(executeTool(call("frobnicate", {}), workspace, ctx()).rejection?.kind).toBe("unknown-tool")
  })

  it("does not flag a tool that ran and reported a failure the model caused", () => {
    workspace = mkdtempSync(join(tmpdir(), "bench-agentic-exec-test-"))
    const out = executeTool(call("read_file", { path: "missing.json" }), workspace, ctx())
    expect(out.rejection).toBeUndefined()
    expect(out.failed).toBe(true)
  })
})

// ── decideTurn — what the loop does after each model reply ──

describe("decideTurn", () => {
  const call = { id: "c1", type: "function" as const, function: { name: "list_files", arguments: "{}" } }

  it("runs the tools when the reply carries tool calls, whatever the finish reason", () => {
    expect(decideTurn({ content: null, tool_calls: [call] }, "tool_calls").kind).toBe("tools")
    expect(decideTurn({ content: "", tool_calls: [call] }, "length").kind).toBe("tools")
  })

  it("treats a reply cut off by max_tokens as an output-limit cutoff, not a stop", () => {
    // The first smoke after the reach fixes: round 3 came back with
    // finish_reason "length", 8192 completion tokens, no content and no
    // tool calls — the deck the model was writing never arrived — and the
    // run ended as if the model had chosen to stop, with nothing saved.
    const decision = decideTurn({ content: "" }, "length")
    expect(decision).toEqual({ kind: "scripted", reason: "output-limit", reply: scriptedReplyFor("output-limit") })
    expect(scriptedReplyFor("output-limit")).toBe(
      "Your last reply was cut off by the output limit before it finished. Continue, keeping each reply within the limit.",
    )
  })

  it("keeps the two protocol lines for questions", () => {
    expect(decideTurn({ content: "Can you confirm this spec?" }, "stop")).toEqual({
      kind: "scripted",
      reason: "spec-confirmation",
      reply: "Spec confirmed, proceed.",
    })
    expect(decideTurn({ content: "Blue or green?" }, "stop")).toEqual({
      kind: "scripted",
      reason: "other-question",
      reply: "Proceed with your best judgment.",
    })
  })

  it("stops on a plain statement, and on an empty reply the model actually finished", () => {
    expect(decideTurn({ content: "Done, the deck renders." }, "stop")).toEqual({ kind: "stop", finalText: "Done, the deck renders." })
    expect(decideTurn({ content: "" }, "stop")).toEqual({ kind: "stop", finalText: "" })
    expect(decideTurn({ content: null }, undefined)).toEqual({ kind: "stop", finalText: "" })
  })
})

// ── runOneAgentic → scoreQuestion — the result directory the runner leaves
// behind must be one the scorer reads as intended. The runner writes its
// own bookkeeping (meta.json, transcript.json) beside the model's artifact,
// and the scorer's bare-IR candidate scan has to know those files are the
// harness's, not the model's (codex review R2: a normal deck.json run was
// scored "ambiguous artifact" the moment transcript.json appeared). Driven
// end to end with scripted completions in place of the API. ──

describe("runOneAgentic result directory scores as intended", () => {
  let base: string

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  const cfg = { baseUrl: "https://fake.example/v1", apiKey: "k", model: "fake-model" }

  function setup(): { questionsDir: string; resultsDir: string } {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-run-test-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a three-slide deck.")
    return { questionsDir, resultsDir }
  }

  function toolReply(name: string, args: unknown): ChatCompletionResponse {
    return {
      model: "fake-model-served",
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ id: "c1", type: "function", function: { name, arguments: JSON.stringify(args) } }],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }
  }

  function textReply(content: string): ChatCompletionResponse {
    return { model: "fake-model-served", choices: [{ message: { content }, finish_reason: "stop" }] }
  }

  function scripted(replies: ChatCompletionResponse[]): CompleteFn {
    return async () => {
      const next = replies.shift()
      if (!next) throw new Error("scripted replies exhausted")
      return next
    }
  }

  it("a bare-IR run (deck.json beside meta.json and transcript.json) validates and renders under scoreQuestion", async () => {
    const { questionsDir, resultsDir } = setup()
    const ir = readFileSync(join(import.meta.dirname, "fixtures/results/green-model/fx01/answer.json"), "utf8")
    const complete = scripted([
      toolReply("write_file", { path: "deck.json", content: ir }),
      textReply("Done. The deck is written and validates."),
    ])
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete })

    const resultDir = join(resultsDir, "fake-agentic", "q01")
    expect(existsSync(join(resultDir, "deck.json"))).toBe(true)
    expect(existsSync(join(resultDir, "meta.json"))).toBe(true)
    expect(existsSync(join(resultDir, "transcript.json"))).toBe(true)

    const score = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    expect(score.deterministic).toBe(true)
    expect(score.self?.tool_calls).toBe(1)
  })

  it("a run that saved nothing scores 'no artifact found', never reading transcript.json as the answer", async () => {
    const { questionsDir, resultsDir } = setup()
    const complete = scripted([textReply("I cannot build this deck.")])
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete })

    const resultDir = join(resultsDir, "fake-agentic", "q01")
    expect(existsSync(join(resultDir, "transcript.json"))).toBe(true)
    const score = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(score.reason).toMatch(/no artifact found/)
    expect(score.validatePass).toBe(false)
  })
})
