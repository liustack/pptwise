// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { describeError, runOneAgentic, type ChatCompletionResponse, type CompleteFn } from "./run-agentic.mts"

// ── Placement-stage failures land in the question's own meta.json (codex
// review R17). `placeArtifact` loads the CLI's deck/theme lookup lazily,
// after the tool loop, and that load sat outside every catch in
// `runOneAgentic`: a module that failed to load threw straight to the batch
// entry with the rounds and tool calls already spent recorded nowhere, and
// a resumed batch re-ran the question as if it had never started. This file
// lives apart from run-agentic.test.ts because the mock below is hoisted
// over the whole file and that file imports src/cli/commands, whose own
// import graph reaches the same module. ──

// `vi.mock` is hoisted above every import, so the factory's one input is
// hoisted with it. Vitest wraps a throwing factory in its own message and
// keeps the original as `cause`, which is exactly the shape a real module
// loader failure has too — the assertions read the cause chain.
const { INJECTED_ERROR } = vi.hoisted(() => ({ INJECTED_ERROR: "injected: deferred CLI module could not load" }))

vi.mock("../../src/cli/deck-dir", () => {
  throw new Error(INJECTED_ERROR)
})

describe("runOneAgentic records a placement-stage failure in meta.json", () => {
  let base: string

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  const cfg = { baseUrl: "https://fake.example/v1", apiKey: "k", model: "fake-model" }

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

  it("writes a failed meta.json with stage 'placement' and the rounds and tool calls actually spent, then rethrows", async () => {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-placement-fail-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a three-slide deck.")
    const ir = readFileSync(join(import.meta.dirname, "fixtures/results/green-model/fx01/answer.json"), "utf8")
    const complete = scripted([
      toolReply("write_file", { path: "deck.json", content: ir }),
      textReply("Done. The deck is written and validates."),
    ])

    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", {
      complete,
    }).then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(Error)
    expect(describeError(thrown, 2000)).toContain(INJECTED_ERROR)

    const resultDir = join(resultsDir, "fake-agentic", "q01")
    expect(existsSync(join(resultDir, "transcript.json"))).toBe(true)
    expect(existsSync(join(resultDir, "meta.json"))).toBe(true)
    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBe("failed")
    expect(meta.stage).toBe("placement")
    expect(meta.rounds).toBe(2)
    expect(meta.tool_calls).toBe(1)
    expect(meta.error).toContain(INJECTED_ERROR)
    expect(meta.mode).toBe("agentic")
    expect(meta.model_requested).toBe("fake-model")
    expect(existsSync(join(resultDir, "placement.json"))).toBe(false)
  })
})
