// @vitest-environment node
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const CLI = join(ROOT, "src", "cli.ts")

function run(args: string[]) {
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  return spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { encoding: "utf8", cwd: ROOT, env })
}

describe("CLI help after a wrong option or command", () => {
  it("prints the command's own help after an unknown option, with where one page's keys are answered", () => {
    const result = run(["schema", "--page", "intro"])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("error: unknown option '--page'")
    expect(result.stderr).toContain("Usage: pptwise schema [options]")
    expect(result.stderr).toContain("$ pptwise inspect <deck> --page <id>")
  })

  it("prints the command list after an unknown command", () => {
    const result = run(["pages"])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("error: unknown command 'pages'")
    expect(result.stderr).toMatch(/Commands:[\s\S]*inspect/)
  })
})
