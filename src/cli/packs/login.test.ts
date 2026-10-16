// @vitest-environment node
import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PassThrough, Writable } from "node:stream"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { HELD, KEY, REVOKED, publish, sendJson, startServer, type FakePackServer } from "./__fixtures__/pack-server"
import { licensePath, readLicenseKey, runLicenseSet } from "./license"
import { runLogin, runLogout, type LoginOptions, type LoginReport } from "./login"
import { listInstalledPacks } from "./store"

installNodePlatform()

const ENGINE = "0.37.1"
const UNKNOWN = "ptw_" + "a".repeat(32)

const originalHome = process.env.PPTWISE_HOME
const PROXY_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const
const originalProxy = Object.fromEntries(PROXY_VARS.map((name) => [name, process.env[name]]))
let home: string
let server: FakePackServer

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pptwise-login-"))
  process.env.PPTWISE_HOME = home
  for (const name of PROXY_VARS) delete process.env[name]
  server = await startServer()
})

afterEach(async () => {
  await server.close()
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
  for (const name of PROXY_VARS) {
    if (originalProxy[name] === undefined) delete process.env[name]
    else process.env[name] = originalProxy[name]
  }
})

/** A stdin that is not a terminal, as when a script pipes into the CLI. */
function pipedIo(): NonNullable<LoginOptions["io"]> {
  const sink = new Writable({ write: (_c, _e, cb) => cb() })
  return { stdin: new PassThrough(), stderr: sink }
}

/** A stdin that reports itself a terminal. */
function ttyIo(): NonNullable<LoginOptions["io"]> {
  const stdin = Object.assign(new PassThrough(), { isTTY: true })
  return { stdin, stderr: new Writable({ write: (_c, _e, cb) => cb() }) }
}

function login(key: string | undefined, opts: LoginOptions = {}) {
  return runLogin(key, { env: { PPTWISE_PACKS_URL: server.url }, engineVersion: ENGINE, io: pipedIo(), ...opts })
}

async function loginError(key: string | undefined, opts: LoginOptions = {}): Promise<Error> {
  const error = await login(key, opts).then(
    () => undefined,
    (e: unknown) => e as Error,
  )
  expect(error).toBeInstanceOf(Error)
  return error!
}

const catalogRequests = () => server.requests.filter((p) => p === "/api/packs/catalog")

describe("pptwise login", () => {
  it("checks the key, saves it like license set, and installs the packs it covers", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const { output, failed } = await login(KEY)
    expect(failed).toBe(false)
    expect(await readLicenseKey()).toBe(KEY)
    if (process.platform !== "win32") expect((await stat(licensePath())).mode & 0o777).toBe(0o600)
    expect(output).toContain(licensePath())
    expect(output).toContain("sample 2026.1.0")
    expect(output).toContain("sample-brief")
    expect(output).not.toContain(KEY)
    expect((await listInstalledPacks()).map((p) => p.id)).toEqual(["sample"])
    // One catalog request checks the key and drives the install.
    expect(catalogRequests()).toHaveLength(1)
    expect(new Set(server.auth)).toEqual(new Set([`Bearer ${KEY}`]))
  })

  it("keeps the key when a pack fails to install and says to sync again later", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] }, { sha256: "0".repeat(64) })
    const { output, failed } = await login(KEY)
    expect(failed).toBe(true)
    expect(await readLicenseKey()).toBe(KEY)
    expect(output).toMatch(/not installed/)
    expect(output).toContain("pptwise packs sync")
  })

  it("keeps the key when the catalog cannot be read and says to sync again later", async () => {
    server.catalogOverride = (res) => {
      sendJson(res, 200, { catalog: 2, packs: [] })
      return true
    }
    const { output, failed } = await login(KEY)
    expect(failed).toBe(true)
    expect(await readLicenseKey()).toBe(KEY)
    expect(output).toMatch(/catalog/)
    expect(output).toContain("pptwise packs sync")
  })

  it("saves nothing for a key the server does not know (401)", async () => {
    const error = await loginError(UNKNOWN)
    expect(error.message).toMatch(/Unknown license key/)
    expect(error.message).toMatch(/nothing was saved/i)
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("leaves a key saved earlier in place when another key is refused", async () => {
    await runLicenseSet(KEY)
    await loginError(UNKNOWN)
    expect(await readLicenseKey()).toBe(KEY)
  })

  it("saves nothing for a revoked key (403)", async () => {
    const error = await loginError(REVOKED)
    expect(error.message).toMatch(/revoked/)
    expect(error.message).toMatch(/nothing was saved/i)
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("saves a key held for review (423), repeats the server, and leaves the sync for later", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const { output, failed } = await login(HELD)
    expect(failed).toBe(false)
    expect(await readLicenseKey()).toBe(HELD)
    expect(output).toContain("This purchase is being reviewed.")
    expect(output).toContain("`pptwise packs sync`")
    expect(output).not.toMatch(/revoked/)
    expect(server.requests.filter((p) => p.endsWith(".zip"))).toEqual([])
    expect(await listInstalledPacks()).toEqual([])
  })

  it("saves nothing when the server cannot be reached, and offers retry or an offline save", async () => {
    const url = server.url
    await server.close()
    const error = await loginError(KEY, { env: { PPTWISE_PACKS_URL: url } })
    expect(error.message).toContain("127.0.0.1")
    expect(error.message).toMatch(/nothing was saved/i)
    expect(error.message).toContain("pptwise license set <key>")
    expect(await readLicenseKey()).toBeUndefined()
    server = await startServer()
  })

  it("saves nothing on another status and repeats what the server said", async () => {
    server.catalogOverride = (res) => {
      sendJson(res, 503, { error: "Packs are not configured." })
      return true
    }
    const error = await loginError(KEY)
    expect(error.message).toMatch(/503/)
    expect(error.message).toMatch(/Packs are not configured/)
    expect(error.message).toContain("pptwise license set <key>")
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("names the status alone when the server sends no sentence", async () => {
    server.catalogOverride = (res) => {
      res.writeHead(502)
      res.end()
      return true
    }
    const error = await loginError(KEY)
    expect(error.message).toContain("(HTTP 502)")
    expect(error.message).not.toContain("undefined")
  })

  it("refuses a malformed key before any request", async () => {
    const error = await loginError("ptw_short")
    expect(error.message).toMatch(/not a pptwise license key/)
    expect(server.requests).toEqual([])
    expect(await readLicenseKey()).toBeUndefined()
  })

  it("refuses to read a key from a stdin that is not a terminal, with the usage", async () => {
    const error = await loginError(undefined)
    expect(error.message).toContain("pptwise login <key>")
    expect(server.requests).toEqual([])
  })

  it("asks a terminal for the key at a hidden prompt", async () => {
    const prompts: string[] = []
    const { failed } = await login(undefined, {
      io: ttyIo(),
      readSecret: async (prompt) => {
        prompts.push(prompt)
        return `  ${KEY}  `
      },
    })
    expect(failed).toBe(false)
    expect(prompts).toEqual([expect.stringMatching(/hidden/)])
    expect(await readLicenseKey()).toBe(KEY)
  })

  it("prints a machine-readable report with --json", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const ok = await login(KEY, { json: true })
    expect(ok.failed).toBe(false)
    expect(JSON.parse(ok.output)).toEqual({
      outcome: "accepted",
      ok: true,
      saved: true,
      server: server.url,
      sync: {
        license: true,
        ok: true,
        server: server.url,
        packs: [{ id: "sample", version: "2026.1.0", title: "Pack sample", status: "installed", themes: ["sample-brief"] }],
      },
    } satisfies LoginReport)
    const refused = await login(REVOKED, { json: true })
    expect(refused.failed).toBe(true)
    expect(JSON.parse(refused.output)).toMatchObject({ outcome: "revoked", ok: false, saved: false, status: 403 })
    const held = await login(HELD, { json: true })
    expect(held.failed).toBe(false)
    expect(JSON.parse(held.output)).toMatchObject({ outcome: "held", ok: true, saved: true, status: 423, message: "This purchase is being reviewed." })
  })
})

describe("pptwise logout", () => {
  it("removes the key, keeps the installed packs, and says so", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await login(KEY)
    const out = await runLogout()
    expect(out).toContain(licensePath())
    expect(out).toMatch(/installed packs stay/i)
    expect(await readLicenseKey()).toBeUndefined()
    await expect(readFile(licensePath())).rejects.toThrow()
    expect((await listInstalledPacks()).map((p) => p.id)).toEqual(["sample"])
  })

  it("says there was nothing to remove when no key is saved", async () => {
    expect(await runLogout()).toMatch(/no license/i)
  })
})
