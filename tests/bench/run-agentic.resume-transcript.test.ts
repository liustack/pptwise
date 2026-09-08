// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { scoreQuestion } from "./score.mts"
import { describeError, runOneAgentic, type ChatCompletionResponse } from "./run-agentic.mts"

// ── A placement retry that needs the model's final message reads it back
// from transcript.json, and only trusts a transcript that is the record the
// harness wrote (codex review R25). A missing, unreadable, or misshapen
// transcript used to come back as "no final text", so the retry finished
// with nothing saved and cleared the failure — the question then scored as
// the model's "no artifact found" instead of staying a runner failure.
//
// The first run here is a single-shot reply: the model answers with the IR
// as text, writes nothing to the workspace, and placement saves the text as
// answer.json. That write is made to fail by planting a directory of the
// same name, which leaves the real failed meta and the real transcript on
// disk with no module mocking (the mock-driven placement retries live in
// run-agentic.resume-placement.test.ts). ──

describe("runOneAgentic resume reads the final message back from transcript.json", () => {
  let base: string

  afterEach(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  const cfg = { baseUrl: "https://fake.example/v1", apiKey: "k", model: "fake-model" }
  const coverIr = { version: "5", theme: { id: "brief" }, slides: [{ id: "cover", type: "cover", heading: "Transcript" }] }

  function textReply(content: string): ChatCompletionResponse {
    return { model: "fake-model-served", choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }
  }

  /** Runs the single-shot question once with `answer.json` blocked, and
   *  returns the result directory holding the placement-failed meta. */
  async function failedSingleShotRun(): Promise<{ resultDir: string; dirs: { questionsDir: string; resultsDir: string } }> {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-resume-transcript-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a one-page deck.")
    const resultDir = join(resultsDir, "fake-agentic", "q01")
    mkdirSync(join(resultDir, "answer.json"), { recursive: true })
    const replies = [textReply(JSON.stringify(coverIr))]
    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, { questionsDir, resultsDir }, "fake-agentic", {
      complete: async () => replies.shift()!,
    }).then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(Error)
    expect(describeError(thrown, 2000)).toContain("EISDIR")
    const failedMeta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(failedMeta.status).toBe("failed")
    expect(failedMeta.stage).toBe("placement")
    expect(failedMeta.rounds).toBe(1)
    rmSync(join(resultDir, "answer.json"), { recursive: true })
    return { resultDir, dirs: { questionsDir, resultsDir } }
  }

  async function resume(dirs: { questionsDir: string; resultsDir: string }): Promise<{ thrown: unknown; modelCalls: number }> {
    let modelCalls = 0
    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, dirs, "fake-agentic", {
      complete: async () => {
        modelCalls++
        throw new Error("resume must not call the model")
      },
    }).then(
      () => undefined,
      (e: unknown) => e,
    )
    return { thrown, modelCalls }
  }

  it("an intact transcript hands the retry the final message and answer.json is saved", async () => {
    const { resultDir, dirs } = await failedSingleShotRun()
    const { thrown, modelCalls } = await resume(dirs)
    expect(thrown).toBeUndefined()
    expect(modelCalls).toBe(0)
    expect(JSON.parse(readFileSync(join(resultDir, "answer.json"), "utf8"))).toEqual(coverIr)
    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBeUndefined()
    expect(meta.stage).toBeUndefined()
    expect(meta.error).toBeUndefined()
    expect(meta.rounds).toBe(1)
    const score = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(score.infraFailed).toBeUndefined()
    expect(score.validatePass).toBe(true)
  })

  it.each([
    ["missing", undefined],
    ["truncated JSON", "{"],
    ["an object without messages", "{}"],
    ["null", "null"],
  ])("a transcript that is %s keeps the placement failure, names the transcript, and calls no model", async (_label, content) => {
    const { resultDir, dirs } = await failedSingleShotRun()
    const transcript = join(resultDir, "transcript.json")
    if (content === undefined) rmSync(transcript)
    else writeFileSync(transcript, content)

    const { thrown, modelCalls } = await resume(dirs)
    expect(modelCalls).toBe(0)
    expect(thrown).toBeInstanceOf(Error)
    expect(describeError(thrown, 2000)).toContain("transcript.json is unusable")
    expect(existsSync(join(resultDir, "answer.json"))).toBe(false)
    const meta = JSON.parse(readFileSync(join(resultDir, "meta.json"), "utf8"))
    expect(meta.status).toBe("failed")
    expect(meta.stage).toBe("placement")
    expect(meta.error).toContain("transcript.json is unusable")
    expect(meta.error).toContain(transcript)
    expect(meta.rounds).toBe(1)
    const score = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(score.infraFailed).toBe(true)
  })
})
