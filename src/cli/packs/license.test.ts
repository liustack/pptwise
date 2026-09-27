// @vitest-environment node
import { chmod, mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { licensePath, readLicenseKey, runLicenseClear, runLicenseSet, runLicenseStatus } from "./license"

const KEY = "ptw_abcdefghijklmnopqrstuvwxyz234567"

const originalHome = process.env.PPTWISE_HOME
let home: string

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pptwise-license-"))
  process.env.PPTWISE_HOME = home
})

afterEach(() => {
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
})

describe("pptwise license set", () => {
  it("writes the key to $PPTWISE_HOME/license.json readable by the owner only", async () => {
    const out = await runLicenseSet(KEY)
    expect(licensePath()).toBe(join(home, "license.json"))
    expect(JSON.parse(await readFile(join(home, "license.json"), "utf8"))).toEqual({ key: KEY })
    if (process.platform !== "win32") {
      expect((await stat(join(home, "license.json"))).mode & 0o777).toBe(0o600)
    }
    expect(out).toContain(join(home, "license.json"))
    expect(out).not.toContain(KEY)
  })

  it("creates $PPTWISE_HOME when it does not exist yet", async () => {
    process.env.PPTWISE_HOME = join(home, "nested", "home")
    await runLicenseSet(KEY)
    expect(await readLicenseKey()).toBe(KEY)
  })

  it("trims the whitespace a paste carries", async () => {
    await runLicenseSet(`  ${KEY}\n`)
    expect(await readLicenseKey()).toBe(KEY)
  })

  it("refuses a value that is not a license key and writes nothing", async () => {
    const bad = [
      "",
      "ptw_",
      KEY.toUpperCase(),
      `${KEY}a`,
      KEY.slice(0, -1),
      "ptw_abcdefghijklmnopqrstuvwxyz234518", // 1 and 8 are not base32
      "key_abcdefghijklmnopqrstuvwxyz234567",
    ]
    for (const value of bad) {
      const error = await runLicenseSet(value).then(
        () => undefined,
        (e: unknown) => e as Error,
      )
      expect(error?.message, value).toMatch(/not a pptwise license key/)
      // A near-miss is still most of a secret: the message never echoes it.
      if (value.length > 8) expect(error?.message).not.toContain(value)
    }
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("replaces an existing key and tightens a loose file mode", async () => {
    await writeFile(join(home, "license.json"), JSON.stringify({ key: "ptw_" + "a".repeat(32) }), { mode: 0o644 })
    if (process.platform !== "win32") await chmod(join(home, "license.json"), 0o644)
    await runLicenseSet(KEY)
    expect(await readLicenseKey()).toBe(KEY)
    if (process.platform !== "win32") {
      expect((await stat(join(home, "license.json"))).mode & 0o777).toBe(0o600)
    }
  })

  it.skipIf(process.platform === "win32")("refuses to write through a symlink", async () => {
    const elsewhere = join(home, "elsewhere.json")
    await writeFile(elsewhere, "{}")
    await symlink(elsewhere, join(home, "license.json"))
    await expect(runLicenseSet(KEY)).rejects.toThrow(/symlink/)
    expect(await readFile(elsewhere, "utf8")).toBe("{}")
  })
})

describe("pptwise license status", () => {
  it("says no license is configured and how to set one", async () => {
    const out = await runLicenseStatus()
    expect(out).toMatch(/no license configured/i)
    expect(out).toContain("pptwise license set <key>")
  })

  it("shows only the first eight characters of a configured key", async () => {
    await runLicenseSet(KEY)
    const out = await runLicenseStatus()
    expect(out).toContain(KEY.slice(0, 8))
    expect(out).not.toContain(KEY.slice(0, 9))
    expect(out).toContain(join(home, "license.json"))
  })

  it("fails on a license file it cannot read, naming the file", async () => {
    await writeFile(join(home, "license.json"), "{not json")
    await expect(runLicenseStatus()).rejects.toThrow(join(home, "license.json"))
    await writeFile(join(home, "license.json"), JSON.stringify({ key: "nope" }))
    await expect(runLicenseStatus()).rejects.toThrow(/license set/)
  })
})

describe("pptwise license clear", () => {
  it("removes the license file", async () => {
    await runLicenseSet(KEY)
    const out = await runLicenseClear()
    expect(out).toContain(join(home, "license.json"))
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("is quiet about a license that was never set", async () => {
    expect(await runLicenseClear()).toMatch(/no license configured/i)
  })
})
