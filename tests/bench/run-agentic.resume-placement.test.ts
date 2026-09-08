// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { themeFileFromPreset } from "../../src/cli/theme-resolve"
import { describeError, runOneAgentic, type ChatCompletionResponse, type CompleteFn } from "./run-agentic.mts"

// ── A placement-stage failure is retried on resume without a model call
// (codex review R20). The first run's placement throws after deck.json is
// copied but before the theme travels, so the result root holds an IR bound
// to a name the built-ins also answer to. Resume finds `status: "failed"`,
// `stage: "placement"` in meta.json, re-runs placement from the workspace
// that is still there, and rewrites the meta as a completed run.
//
// The failure is injected with `vi.doMock`, not the hoisted `vi.mock`
// run-agentic.placement-failure.test.ts uses: the mock must be on for the
// first run's deferred CLI load and off for the second's, and this file
// needs the real module before either (to write the theme the model
// saves). `vi.resetModules()` before each phase makes the next dynamic
// import inside `placeArtifact` resolve afresh under whichever mock is
// registered. ──

const INJECTED_ERROR = "injected: deferred CLI module could not load"
const CLI_DECK_DIR = "../../src/cli/deck-dir"

function failNextCliLoad(): void {
  vi.doMock(CLI_DECK_DIR, () => {
    throw new Error(INJECTED_ERROR)
  })
  vi.resetModules()
}

function restoreCliLoad(): void {
  vi.doUnmock(CLI_DECK_DIR)
  vi.resetModules()
}

describe("runOneAgentic resume retries placement after a placement-stage failure", () => {
  let base: string

  afterEach(() => {
    // The second test below leaves the mock registered on purpose.
    restoreCliLoad()
    if (base) rmSync(base, { recursive: true, force: true })
  })

  const cfg = { baseUrl: "https://fake.example/v1", apiKey: "k", model: "fake-model" }
  const THESIS_PRIMARY = "#0E6245"

  function toolReply(calls: Array<{ name: string; args: unknown }>): ChatCompletionResponse {
    return {
      model: "fake-model-served",
      choices: [
        {
          message: {
            content: null,
            tool_calls: calls.map((c, i) => ({ id: `c${i + 1}`, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })),
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }
  }

  function textReply(content: string): ChatCompletionResponse {
    return { model: "fake-model-served", choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }
  }

  function scripted(replies: ChatCompletionResponse[]): CompleteFn {
    return async () => {
      const next = replies.shift()
      if (!next) throw new Error("scripted replies exhausted")
      return next
    }
  }

  /** One quote page under `brief`: thesis offers `quote`, the built-in brief does not. */
  const quoteIr = {
    version: "5",
    theme: { id: "brief" },
    slides: [{ id: "quote-1", type: "content", kind: "quote", heading: "Words", components: [{ type: "blockquote", text: "A quote", attribution: "Author" }] }],
  }

  it("the second run places the theme beside deck.json, calls no model, and the question scores under the workspace theme", async () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-resume-placement-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a one-quote deck.")
    // The theme the model writes: id brief, menu and colors from thesis.
    const theme = themeFileFromPreset("thesis", { id: "brief" })
    expect(theme.style.colors.primary).toBe(THESIS_PRIMARY)

    // Phase 1: the deferred CLI load fails at placement.
    failNextCliLoad()
    const firstRun = scripted([
      toolReply([
        { name: "write_file", args: { path: "deck.json", content: JSON.stringify(quoteIr) } },
        { name: "write_file", args: { path: "theme.json", content: JSON.stringify(theme) } },
      ]),
      textReply("Done."),
    ])
    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete: firstRun }).then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(Error)
    expect(describeError(thrown, 2000)).toContain(INJECTED_ERROR)

    const resultDir = join(resultsDir, "fake-agentic", "q01")
    const failedMeta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(failedMeta.status).toBe("failed")
    expect(failedMeta.stage).toBe("placement")
    expect(failedMeta.rounds).toBe(2)
    expect(failedMeta.tool_calls).toBe(2)
    expect(existsSync(join(resultDir, "deck.json"))).toBe(true)
    expect(existsSync(join(resultDir, "brief.theme.json"))).toBe(false)

    // Phase 2: resume. The module loads, placement runs from the workspace,
    // and the model is never asked anything.
    restoreCliLoad()
    let modelCalls = 0
    const resumed: CompleteFn = async () => {
      modelCalls++
      throw new Error("resume must not call the model")
    }
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete: resumed })
    expect(modelCalls).toBe(0)

    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBeUndefined()
    expect(meta.stage).toBeUndefined()
    expect(meta.error).toBeUndefined()
    expect(meta.rounds).toBe(2)
    expect(meta.tool_calls).toBe(2)
    expect(meta.prompt_tokens).toBe(20)
    expect(existsSync(join(resultDir, "brief.theme.json"))).toBe(true)
    expect(existsSync(join(resultDir, "placement.json"))).toBe(false)

    const { loadArtifact, scoreQuestion } = await import("./score.mts")
    const loaded = await loadArtifact(resultDir)
    expect("error" in loaded ? loaded.error : loaded.theme?.style.colors.primary).toBe(THESIS_PRIMARY)
    const score = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(score.infraFailed).toBeUndefined()
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    expect(score.self?.tool_calls).toBe(2)
  })

  it("a second placement failure rewrites the failed meta with the new error and rethrows", async () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-resume-placement-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a one-quote deck.")

    failNextCliLoad()
    const firstRun = scripted([toolReply([{ name: "write_file", args: { path: "deck.json", content: JSON.stringify(quoteIr) } }]), textReply("Done.")])
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete: firstRun }).catch(() => undefined)
    const resultDir = join(resultsDir, "fake-agentic", "q01")
    expect(JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8")).stage).toBe("placement")

    failNextCliLoad()
    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", {
      complete: async () => {
        throw new Error("resume must not call the model")
      },
    }).then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(Error)
    expect(describeError(thrown, 2000)).toContain(INJECTED_ERROR)
    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBe("failed")
    expect(meta.stage).toBe("placement")
    expect(meta.error).toContain(INJECTED_ERROR)
    expect(meta.rounds).toBe(2)
  })

  // The transcript is read only once the workspace has turned up nothing
  // (codex review R25): a deck sitting in the workspace is placed even with
  // transcript.json gone. The damaged-transcript cases live in
  // run-agentic.resume-transcript.test.ts, which needs no module mock.
  it("a workspace artifact is placed without reading the transcript, even when it is gone", async () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-resume-placement-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a one-quote deck.")
    const resultDir = join(resultsDir, "fake-agentic", "q01")

    failNextCliLoad()
    const firstRun = scripted([toolReply([{ name: "write_file", args: { path: "deck.json", content: JSON.stringify(quoteIr) } }]), textReply("Done.")])
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", { complete: firstRun }).catch(() => undefined)
    expect(JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8")).stage).toBe("placement")
    rmSync(join(resultDir, "transcript.json"))

    restoreCliLoad()
    let modelCalls = 0
    await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", {
      complete: async () => {
        modelCalls++
        throw new Error("resume must not call the model")
      },
    })
    expect(modelCalls).toBe(0)
    expect(existsSync(join(resultDir, "deck.json"))).toBe(true)
    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBeUndefined()
    expect(meta.error).toBeUndefined()
    expect(meta.rounds).toBe(2)
  })
})
