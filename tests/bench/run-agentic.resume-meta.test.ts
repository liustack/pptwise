// @vitest-environment node
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { describeError, runOneAgentic } from "./run-agentic.mts"

// ── "No meta.json" and "cannot read meta.json" are two different answers
// from the file system (codex review R26). Resume treats only the first as
// a question that has not run; a meta that exists but cannot be read stops
// the batch with the path and errno, since re-running would bill the model
// again for a question whose record is right there. A meta that reads but
// is not JSON still means "has run", as before. ──

describe("runOneAgentic resume tells a missing meta.json from an unreadable one", () => {
  let base: string
  let metaPath: string | undefined

  afterEach(() => {
    if (metaPath && existsSync(metaPath)) chmodSync(metaPath, 0o600)
    metaPath = undefined
    if (base) rmSync(base, { recursive: true, force: true })
  })

  const cfg = { baseUrl: "https://fake.example/v1", apiKey: "k", model: "fake-model" }

  function setUp(): { resultDir: string; dirs: { questionsDir: string; resultsDir: string } } {
    base = mkdtempSync(join(tmpdir(), "bench-agentic-resume-meta-"))
    const questionsDir = join(base, "questions")
    const resultsDir = join(base, "results")
    mkdirSync(join(questionsDir, "q01"), { recursive: true })
    writeFileSync(join(questionsDir, "q01", "prompt.md"), "Make a one-page deck.")
    const resultDir = join(resultsDir, "fake-agentic", "q01")
    mkdirSync(resultDir, { recursive: true })
    return { resultDir, dirs: { questionsDir, resultsDir } }
  }

  async function resume(dirs: { questionsDir: string; resultsDir: string }): Promise<{ thrown: unknown; modelCalls: number }> {
    let modelCalls = 0
    const thrown = await runOneAgentic(cfg, "FAKE", "q01", { skill: "playbook" }, dirs, "fake-agentic", {
      complete: async () => {
        modelCalls++
        return { model: "fake-model-served", choices: [{ message: { content: "Done." }, finish_reason: "stop" }] }
      },
    }).then(
      () => undefined,
      (e: unknown) => e,
    )
    return { thrown, modelCalls }
  }

  // root reads a mode-000 file regardless, so the permission case cannot be staged there.
  it.skipIf(process.getuid?.() === 0)("a meta.json that exists but cannot be read stops resume with the path and errno, no model call", async () => {
    const { resultDir, dirs } = setUp()
    metaPath = join(resultDir, "meta.json")
    const before = JSON.stringify({ rounds: 1, tool_calls: 0 }) + "\n"
    writeFileSync(metaPath, before)
    chmodSync(metaPath, 0)

    const { thrown, modelCalls } = await resume(dirs)
    expect(modelCalls).toBe(0)
    expect(thrown).toBeInstanceOf(Error)
    const described = describeError(thrown, 2000)
    expect(described).toContain("EACCES")
    expect(described).toContain(metaPath)
    chmodSync(metaPath, 0o600)
    expect(readFileSync(metaPath, "utf8")).toBe(before)
  })

  it("a meta.json that is not JSON still counts as run and is skipped", async () => {
    const { resultDir, dirs } = setUp()
    writeFileSync(join(resultDir, "meta.json"), "{")
    const { thrown, modelCalls } = await resume(dirs)
    expect(thrown).toBeUndefined()
    expect(modelCalls).toBe(0)
    expect(readFileSync(join(resultDir, "meta.json"), "utf8")).toBe("{")
  })

  it("no meta.json at all means the question has not run and the model is called", async () => {
    const { resultDir, dirs } = setUp()
    const { thrown, modelCalls } = await resume(dirs)
    expect(thrown).toBeUndefined()
    expect(modelCalls).toBe(1)
    expect(existsSync(join(resultDir, "meta.json"))).toBe(true)
  })
})
