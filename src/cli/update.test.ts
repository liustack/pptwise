// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { join } from "node:path"
import { checkForUpdate, compareVersions, createSelfUpdater, syncAfterUpdate } from "./update"

describe("compareVersions", () => {
  it("orders semver numerically", () => {
    expect(compareVersions("0.1.0", "0.2.0")).toBeLessThan(0)
    expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0)
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0)
  })
})

describe("checkForUpdate", () => {
  it("reports an available update via npm view", async () => {
    const run = vi.fn().mockResolvedValue("9.9.9")
    const info = await checkForUpdate({ currentVersion: "0.1.0", run })
    expect(run).toHaveBeenCalledWith("npm", ["view", "@liustack/pptwise", "version"])
    expect(info).toMatchObject({ updateAvailable: true, latestVersion: "9.9.9", checked: true })
  })

  it("degrades gracefully when npm fails", async () => {
    const run = vi.fn().mockRejectedValue(new Error("offline"))
    const info = await checkForUpdate({ currentVersion: "0.1.0", run })
    expect(info).toMatchObject({ checked: false, updateAvailable: false, error: "offline" })
  })
})

describe("createSelfUpdater", () => {
  it("installs latest when behind", async () => {
    const run = vi.fn().mockResolvedValue("9.9.9")
    const result = await createSelfUpdater(run)({ currentVersion: "0.1.0" })
    expect(run).toHaveBeenCalledWith("npm", ["install", "-g", "@liustack/pptwise@latest"])
    expect(result.updated).toBe(true)
  })

  it("no-ops when current", async () => {
    const run = vi.fn().mockResolvedValue("0.1.0")
    const result = await createSelfUpdater(run)({ currentVersion: "0.1.0" })
    expect(result.updated).toBe(false)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("throws when the update check itself fails", async () => {
    const run = vi.fn().mockRejectedValue(new Error("offline"))
    await expect(createSelfUpdater(run)({ currentVersion: "0.1.0" })).rejects.toThrow(/offline/)
  })
})

describe("syncAfterUpdate", () => {
  const root = join("/", "usr", "local", "lib", "node_modules")
  const newCli = join(root, "@liustack", "pptwise", "dist", "cli.js")

  it("does nothing without a license", async () => {
    const run = vi.fn()
    const runCli = vi.fn()
    const result = await syncAfterUpdate({ licenseConfigured: async () => false, run, runCli })
    expect(result).toEqual({ ran: false })
    expect(run).not.toHaveBeenCalled()
    expect(runCli).not.toHaveBeenCalled()
  })

  it("runs sync in the newly installed CLI, not in this process", async () => {
    const run = vi.fn().mockResolvedValue(root)
    const runCli = vi.fn().mockResolvedValue({ code: 0, stdout: "Packs from https://pptwise.com:\n  sample 2026.1.0  up to date\n", stderr: "" })
    const result = await syncAfterUpdate({ licenseConfigured: async () => true, run, runCli, execPath: "/bin/node" })
    expect(run).toHaveBeenCalledWith("npm", ["root", "-g"])
    expect(runCli).toHaveBeenCalledWith("/bin/node", [newCli, "sync"])
    expect(result).toEqual({ ran: true, ok: true, output: "Packs from https://pptwise.com:\n  sample 2026.1.0  up to date" })
  })

  it("reports a failed sync without throwing", async () => {
    const run = vi.fn().mockResolvedValue(root)
    const runCli = vi.fn().mockResolvedValue({ code: 1, stdout: "", stderr: "sync failed: could not reach the pack server\n" })
    const result = await syncAfterUpdate({ licenseConfigured: async () => true, run, runCli })
    expect(result).toEqual({ ran: true, ok: false, output: "sync failed: could not reach the pack server" })
  })

  it("reports a license file it cannot read, or an npm it cannot ask, without throwing", async () => {
    const unreadable = await syncAfterUpdate({
      licenseConfigured: async () => {
        throw new Error("license.json is not valid JSON")
      },
    })
    expect(unreadable).toEqual({ ran: true, ok: false, output: "license.json is not valid JSON" })
    const noNpm = await syncAfterUpdate({ licenseConfigured: async () => true, run: vi.fn().mockRejectedValue(new Error("npm: not found")) })
    expect(noNpm).toEqual({ ran: true, ok: false, output: "npm: not found" })
  })
})
