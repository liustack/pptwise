// @vitest-environment node
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { buildPackZip, sha256Hex, type PackFixture } from "./__fixtures__/pack-zip"
import { runLicenseSet } from "./license"
import { listInstalledPacks } from "./store"
import { packsServerUrl, runPacksList, runPacksSync, syncPacks, type PackSyncReport } from "./sync"

installNodePlatform()

const KEY = "ptw_abcdefghijklmnopqrstuvwxyz234567"
const REVOKED = "ptw_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
const ENGINE = "0.37.1"

/**
 * The two endpoints of the pack distribution contract, served from memory.
 * `packs` is what the catalog lists and what the zip endpoint serves.
 * `requests` records every path asked for, so a test can tell whether a
 * download happened.
 */
interface FakePackServer {
  url: string
  requests: string[]
  auth: (string | undefined)[]
  packs: { entry: Record<string, unknown>; bytes: Buffer }[]
  /** Answer the zip endpoint with these status and body instead. */
  zipOverride?: (id: string, res: ServerResponse) => boolean
  catalogOverride?: (res: ServerResponse) => boolean
  close: () => Promise<void>
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

async function startServer(): Promise<FakePackServer> {
  const state = { requests: [], auth: [], packs: [] } as unknown as FakePackServer
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = new URL(req.url ?? "/", "http://x").pathname
    state.requests.push(path)
    state.auth.push(req.headers.authorization)
    const auth = req.headers.authorization
    if (auth === `Bearer ${REVOKED}`) return sendJson(res, 403, { error: "This key was revoked." })
    if (auth !== `Bearer ${KEY}`) return sendJson(res, 401, { error: "Unknown license key." })
    if (path === "/api/packs/catalog") {
      if (state.catalogOverride?.(res)) return
      return sendJson(res, 200, { catalog: 1, packs: state.packs.map((p) => p.entry) })
    }
    const m = /^\/api\/packs\/([^/]+)\/([^/]+)\.zip$/.exec(path)
    const hit = m && state.packs.find((p) => p.entry.id === m[1] && p.entry.version === m[2])
    if (!m || !hit) return sendJson(res, 404, { error: "No such pack." })
    if (state.zipOverride?.(m[1]!, res)) return
    res.writeHead(200, { "content-type": "application/zip", "content-length": String(hit.bytes.length) })
    res.end(hit.bytes)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  state.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    })
  return state
}

async function publish(server: FakePackServer, fixture: PackFixture, entry: Record<string, unknown> = {}): Promise<Buffer> {
  // The catalog entry and the archive's pack.json say the same thing, as the contract has them.
  const engine = fixture.engine ?? ">=0.37.0 <1.0.0"
  const bytes = await buildPackZip({ ...fixture, engine })
  server.packs = server.packs.filter((p) => p.entry.id !== fixture.id)
  server.packs.push({
    bytes,
    entry: {
      id: fixture.id,
      version: fixture.version,
      title: fixture.title ?? `Pack ${fixture.id}`,
      size: bytes.length,
      sha256: sha256Hex(bytes),
      engine,
      ...entry,
    },
  })
  return bytes
}

const originalHome = process.env.PPTWISE_HOME
// A developer's proxy would carry the requests for 127.0.0.1 away from the fake server.
const PROXY_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const
const originalProxy = Object.fromEntries(PROXY_VARS.map((name) => [name, process.env[name]]))
let home: string
let server: FakePackServer

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pptwise-pack-sync-"))
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

function sync(): Promise<PackSyncReport> {
  return syncPacks({ env: { PPTWISE_PACKS_URL: server.url }, engineVersion: ENGINE })
}

async function installedVersions(): Promise<[string, string][]> {
  return (await listInstalledPacks()).map((p) => [p.id, p.version])
}

const zipRequests = () => server.requests.filter((p) => p.endsWith(".zip"))

describe("packs sync without a license", () => {
  it("says so in one line, succeeds, and asks the server nothing", async () => {
    const report = await sync()
    expect(report).toMatchObject({ license: false, ok: true, packs: [] })
    expect(server.requests).toEqual([])
    const text = await runPacksSync({ env: { PPTWISE_PACKS_URL: server.url } })
    expect(text.failed).toBe(false)
    expect(text.output.split("\n")).toHaveLength(1)
    expect(text.output).toContain("pptwise license set <key>")
    const json = await runPacksSync({ json: true, env: { PPTWISE_PACKS_URL: server.url } })
    expect(json.failed).toBe(false)
    expect(JSON.parse(json.output)).toMatchObject({ license: false, ok: true, packs: [] })
  })
})

describe("packs sync with a license", () => {
  beforeEach(async () => {
    await runLicenseSet(KEY)
  })

  it("installs every pack the catalog lists, sending the key as a bearer token", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", title: "Sample pack", themes: ["sample-brief", "sample-memo"] })
    const report = await sync()
    expect(report).toMatchObject({ license: true, ok: true, server: server.url })
    expect(report.packs).toEqual([
      { id: "sample", version: "2026.1.0", title: "Sample pack", status: "installed", themes: ["sample-brief", "sample-memo"] },
    ])
    expect(server.requests).toEqual(["/api/packs/catalog", "/api/packs/sample/2026.1.0.zip"])
    expect(new Set(server.auth)).toEqual(new Set([`Bearer ${KEY}`]))
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
    const manifest = JSON.parse(await readFile(join(home, "packs", "sample", "pack.json"), "utf8")) as { id: string }
    expect(manifest.id).toBe("sample")
  })

  it("downloads nothing on a second sync when every pack is current", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    server.requests.length = 0
    const report = await sync()
    expect(report.ok).toBe(true)
    expect(report.packs).toEqual([expect.objectContaining({ id: "sample", status: "current" })])
    expect(server.requests).toEqual(["/api/packs/catalog"])
  })

  it("updates a pack whose catalog version differs from the installed one", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    await publish(server, { id: "sample", version: "2026.2.0", themes: ["sample-brief", "sample-memo"] })
    const report = await sync()
    expect(report.packs).toEqual([
      expect.objectContaining({ id: "sample", version: "2026.2.0", status: "updated", previous: "2026.1.0", themes: ["sample-brief", "sample-memo"] }),
    ])
    expect(await installedVersions()).toEqual([["sample", "2026.2.0"]])
  })

  it("refuses a download whose sha256 is not the catalog's", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] }, { sha256: "0".repeat(64) })
    const report = await sync()
    expect(report.ok).toBe(false)
    expect(report.packs).toEqual([expect.objectContaining({ id: "sample", status: "failed", reason: expect.stringMatching(/sha256/) })])
    expect(await installedVersions()).toEqual([])
    const text = await runPacksSync({ env: { PPTWISE_PACKS_URL: server.url } })
    expect(text.failed).toBe(true)
    expect(text.output).toMatch(/sample.*sha256/s)
  })

  it("refuses a pack whose archive holds a .. path, and still installs the rest", async () => {
    await publish(server, { id: "evil", version: "1.0.0", themes: ["evil-brief"], edit: (zip) => zip.file("../escape.txt", "x") })
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const report = await sync()
    expect(report.ok).toBe(false)
    expect(report.packs).toEqual([
      expect.objectContaining({ id: "evil", status: "failed", reason: expect.stringMatching(/\.\./) }),
      expect.objectContaining({ id: "sample", status: "installed" }),
    ])
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
  })

  it("refuses a pack that would shadow a built-in theme", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["swiss"] })
    const report = await sync()
    expect(report.packs).toEqual([expect.objectContaining({ status: "failed", reason: expect.stringMatching(/"swiss".*built-in/) })])
    expect(await installedVersions()).toEqual([])
  })

  it("skips a pack whose engine range this pptwise does not meet, without downloading it", async () => {
    await publish(server, { id: "future", version: "2027.1.0", themes: ["future-brief"], engine: ">=0.40.0 <1.0.0" })
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const report = await sync()
    expect(report.ok).toBe(true)
    expect(report.packs[0]).toMatchObject({ id: "future", status: "incompatible", reason: expect.stringMatching(/>=0\.40\.0 <1\.0\.0.*0\.37\.1/) })
    expect(zipRequests()).toEqual(["/api/packs/sample/2026.1.0.zip"])
    const text = await runPacksSync({ env: { PPTWISE_PACKS_URL: server.url } })
    expect(text.failed).toBe(false)
    expect(text.output).toMatch(/future.*pptwise self-update/)
  })

  it("keeps the installed version when a download breaks off midway", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    const bytes = await publish(server, { id: "sample", version: "2026.2.0", themes: ["sample-brief", "sample-memo"] })
    server.zipOverride = (_id, res) => {
      res.writeHead(200, { "content-type": "application/zip", "content-length": String(bytes.length) })
      res.write(bytes.subarray(0, Math.floor(bytes.length / 2)), () => res.destroy())
      return true
    }
    const report = await sync()
    expect(report.ok).toBe(false)
    expect(report.packs).toEqual([
      expect.objectContaining({ id: "sample", version: "2026.2.0", status: "failed", reason: expect.stringMatching(/download failed/) }),
    ])
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
    const [pack] = await listInstalledPacks()
    expect(pack!.themes.map((t) => t.id)).toEqual(["sample-brief"])
  })

  it("reports a download the server refuses as that pack's failure", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    server.zipOverride = (_id, res) => {
      sendJson(res, 404, { error: "No such pack." })
      return true
    }
    const report = await sync()
    expect(report.packs).toEqual([expect.objectContaining({ status: "failed", reason: expect.stringMatching(/404.*No such pack/) })])
  })

  it("tells an unknown key to check and set it again, and changes nothing", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    await runLicenseSet("ptw_" + "a".repeat(32))
    const report = await sync()
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/Unknown license key/)
    expect(report.error).toContain("pptwise license set <key>")
    expect(report.error).toMatch(/installed packs are unchanged/i)
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
    await expect(runPacksSync({ env: { PPTWISE_PACKS_URL: server.url } })).rejects.toThrow(/Unknown license key/)
  })

  it("tells a revoked key it is no longer active, and changes nothing", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    await runLicenseSet(REVOKED)
    const report = await sync()
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/revoked/)
    expect(report.error).toMatch(/installed packs are unchanged/i)
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
    const json = await runPacksSync({ json: true, env: { PPTWISE_PACKS_URL: server.url } })
    expect(json.failed).toBe(true)
    expect(JSON.parse(json.output)).toMatchObject({ ok: false, error: expect.stringMatching(/revoked/) })
  })

  it("reports a server that is not configured", async () => {
    server.catalogOverride = (res) => {
      sendJson(res, 503, { error: "Packs are not configured." })
      return true
    }
    const report = await sync()
    expect(report.error).toMatch(/503|not available/)
    expect(report.error).toMatch(/Packs are not configured/)
  })

  it("reports a catalog it cannot read", async () => {
    server.catalogOverride = (res) => {
      sendJson(res, 200, { catalog: 2, packs: [] })
      return true
    }
    expect((await sync()).error).toMatch(/catalog/)
  })

  it("keeps installed packs when the server cannot be reached", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    await sync()
    const url = server.url
    await server.close()
    const report = await syncPacks({ env: { PPTWISE_PACKS_URL: url }, engineVersion: ENGINE })
    expect(report.ok).toBe(false)
    expect(report.error).toContain("127.0.0.1")
    expect(report.error).toMatch(/installed packs are unchanged/i)
    expect(await installedVersions()).toEqual([["sample", "2026.1.0"]])
    server = await startServer()
  })

  it("prints a machine-readable report with --json", async () => {
    await publish(server, { id: "sample", version: "2026.1.0", themes: ["sample-brief"] })
    const { output, failed } = await runPacksSync({ json: true, env: { PPTWISE_PACKS_URL: server.url } })
    expect(failed).toBe(false)
    expect(JSON.parse(output)).toEqual({
      license: true,
      ok: true,
      server: server.url,
      packs: [{ id: "sample", version: "2026.1.0", title: "Pack sample", status: "installed", themes: ["sample-brief"] }],
    })
  })

  it("refuses a pack server address that is not http or https", async () => {
    await expect(syncPacks({ env: { PPTWISE_PACKS_URL: "file:///etc" }, engineVersion: ENGINE })).rejects.toThrow(/PPTWISE_PACKS_URL/)
  })

  it("refuses plain http to another machine before sending anything, since the key would travel unencrypted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    try {
      for (const url of ["http://example.com", "http://example.com:8080/mirror", "http://localhost.example.com", "http://10.0.0.1", "http://127.0.0.2"]) {
        await expect(syncPacks({ env: { PPTWISE_PACKS_URL: url }, engineVersion: ENGINE }), url).rejects.toThrow(/https.*unencrypted|unencrypted.*https/)
        await expect(runPacksSync({ json: true, env: { PPTWISE_PACKS_URL: url } }), url).rejects.toThrow(/PPTWISE_PACKS_URL/)
      }
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(server.requests).toEqual([])
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe("pack server address", () => {
  it("defaults to https://pptwise.com", () => {
    expect(packsServerUrl({})).toBe("https://pptwise.com")
  })

  it("takes any https address, path prefix included", () => {
    expect(packsServerUrl({ PPTWISE_PACKS_URL: "https://mirror.example.com/pptwise/" })).toBe("https://mirror.example.com/pptwise")
    expect(packsServerUrl({ PPTWISE_PACKS_URL: "https://203.0.113.7:8443" })).toBe("https://203.0.113.7:8443")
  })

  it("takes plain http only on this machine's loopback names", () => {
    for (const url of ["http://127.0.0.1:8787", "http://localhost", "http://localhost:3000", "http://[::1]:8787"]) {
      expect(packsServerUrl({ PPTWISE_PACKS_URL: url }), url).toBe(url)
    }
  })

  it("refuses plain http anywhere else", () => {
    for (const url of ["http://example.com", "http://pptwise.com", "http://192.168.1.10:8787"]) {
      expect(() => packsServerUrl({ PPTWISE_PACKS_URL: url }), url).toThrow(/https.*unencrypted|unencrypted.*https/)
    }
  })
})

describe("packs list", () => {
  it("says when nothing is installed", async () => {
    expect(await runPacksList()).toMatch(/no packs installed/i)
    expect(JSON.parse(await runPacksList({ json: true }))).toEqual([])
  })

  it("lists each installed pack with its themes", async () => {
    await runLicenseSet(KEY)
    await publish(server, { id: "sample", version: "2026.1.0", title: "Sample pack", themes: ["sample-brief", "sample-memo"] })
    await sync()
    const text = await runPacksList()
    expect(text).toMatch(/sample\s+2026\.1\.0\s+Sample pack/)
    expect(text).toMatch(/sample-brief.*sample-memo/s)
    expect(JSON.parse(await runPacksList({ json: true }))).toEqual([
      {
        id: "sample",
        version: "2026.1.0",
        title: "Sample pack",
        engine: ">=0.37.0 <1.0.0",
        dir: join(home, "packs", "sample"),
        themes: [
          { id: "sample-brief", path: join(home, "packs", "sample", "themes", "sample-brief.theme.json") },
          { id: "sample-memo", path: join(home, "packs", "sample", "themes", "sample-memo.theme.json") },
        ],
      },
    ])
  })
})
