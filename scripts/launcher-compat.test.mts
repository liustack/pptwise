import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const launcher = join(import.meta.dirname, "..", "skills", "pptwise", "scripts", "run.sh")

/** Ask `run.sh`'s own `compatible()` whether a PATH `pptwise` at `found` may
 *  serve a skill pinned to `pinned`. The script is sourced as a library so its
 *  dispatch never runs, then `PINNED` is overridden before the call. */
function compatible(pinned: string, found: string): boolean {
  const result = spawnSync(
    "sh",
    ["-c", '. "$1"; PINNED="$2"; if compatible "$3"; then echo yes; else echo no; fi', "_", launcher, pinned, found],
    { encoding: "utf8", env: { ...process.env, PPTWISE_LAUNCHER_LIB: "1" } },
  )
  expect(result.status, result.stderr).toBe(0)
  const verdict = result.stdout.trim()
  expect(["yes", "no"]).toContain(verdict)
  return verdict === "yes"
}

describe("skill launcher compatibility rule", () => {
  // Every 0.x minor is a breaking release: 0.35 dropped a component that a
  // skill pinned to 0.34 still teaches. A 0.34 skill must therefore refuse a
  // 0.35 CLI on PATH and fall through to npx at its own pin.
  it("accepts a newer patch on the same 0.x minor", () => {
    expect(compatible("0.34.0", "0.34.2")).toBe(true)
    expect(compatible("0.34.0", "0.34.0")).toBe(true)
  })

  it("refuses a different 0.x minor, newer or older", () => {
    expect(compatible("0.34.0", "0.35.0")).toBe(false)
    expect(compatible("0.34.0", "0.33.9")).toBe(false)
  })

  it("refuses an older patch on the same 0.x minor", () => {
    expect(compatible("0.34.2", "0.34.1")).toBe(false)
  })

  it("accepts a newer minor once the major is 1 or above", () => {
    expect(compatible("1.2.0", "1.3.0")).toBe(true)
    expect(compatible("1.2.0", "1.2.5")).toBe(true)
  })

  it("still refuses a different major or an older version at major 1 or above", () => {
    expect(compatible("1.2.0", "2.0.0")).toBe(false)
    expect(compatible("1.2.0", "1.1.9")).toBe(false)
  })

  it("refuses anything that is not a plain X.Y.Z version", () => {
    for (const bad of ["", "abc", "0.34", "0.34.x", "v0.34.0", "0.34.0.1", "0..34.0"]) {
      expect(compatible("0.34.0", bad), JSON.stringify(bad)).toBe(false)
    }
  })
})
