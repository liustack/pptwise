/**
 * The two endpoints of the pack distribution contract, served from memory
 * on this machine's loopback. Shared by the sync and login tests so the
 * server's answers are described once.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { buildPackZip, sha256Hex, type PackFixture } from "./pack-zip"

/** The key the fake server accepts. */
export const KEY = "ptw_abcdefghijklmnopqrstuvwxyz234567"
/** The key the fake server answers 403 for. */
export const REVOKED = "ptw_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
/** The key the fake server answers 423 for: its purchase is being reviewed. */
export const HELD = "ptw_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh"

/**
 * `packs` is what the catalog lists and what the zip endpoint serves.
 * `requests` records every path asked for, so a test can tell whether a
 * download happened.
 */
export interface FakePackServer {
  url: string
  requests: string[]
  auth: (string | undefined)[]
  packs: { entry: Record<string, unknown>; bytes: Buffer }[]
  /** Answer the zip endpoint with these status and body instead. */
  zipOverride?: (id: string, res: ServerResponse) => boolean
  catalogOverride?: (res: ServerResponse) => boolean
  close: () => Promise<void>
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

export async function startServer(): Promise<FakePackServer> {
  const state = { requests: [], auth: [], packs: [] } as unknown as FakePackServer
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = new URL(req.url ?? "/", "http://x").pathname
    state.requests.push(path)
    state.auth.push(req.headers.authorization)
    const auth = req.headers.authorization
    if (auth === `Bearer ${REVOKED}`) return sendJson(res, 403, { error: "This key was revoked." })
    if (auth === `Bearer ${HELD}`) return sendJson(res, 423, { error: "This purchase is being reviewed." })
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

/** Build a pack archive and list it in `server`'s catalog, replacing any
 *  pack with the same id. */
export async function publish(server: FakePackServer, fixture: PackFixture, entry: Record<string, unknown> = {}): Promise<Buffer> {
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
