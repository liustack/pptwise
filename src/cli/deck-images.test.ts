// @vitest-environment node
import { chmodSync } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rename, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { runRender, runValidate } from "./commands"
import { pathExists } from "./deck-dir"
import { persistImageApiKey, persistUserConfigValue } from "./image-config"
import { runImagesFetch, runImagesGenerate, runImagesList, type ProcessRunner } from "./images"

/*
 * A deck project keeps the pictures pinned for it in its own assets/, the
 * folder it already reads, so the deck can move and keep them. Pictures
 * pinned before, under .pptwise/<deck>/assets/, still count for a deck that
 * has not moved.
 */

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

const originalHome = process.env.PPTWISE_HOME
const originalPath = process.env.PATH

beforeAll(() => {
  installNodePlatform()
})

afterEach(() => {
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
  if (originalPath === undefined) delete process.env.PATH
  else process.env.PATH = originalPath
})

async function writeDeck(dir: string): Promise<void> {
  await mkdir(join(dir, "pages"), { recursive: true })
  await writeFile(
    join(dir, "deck.spec.json"),
    JSON.stringify({
      version: "1",
      narrative: "boardroom-report",
      theme: "brief",
      filename: "moving",
      pages: [
        { id: "p-cover", type: "cover", heading: "Cover" },
        { id: "p-hero", type: "content", kind: "photo", heading: "Hero" },
        { id: "p-why", type: "content", kind: "points", heading: "Why" },
        { id: "p-end", type: "ending", heading: "End" },
      ],
    }),
  )
  await writeFile(join(dir, "pages", "p-cover.json"), "{}")
  await writeFile(join(dir, "pages", "p-hero.json"), JSON.stringify({ components: [{ type: "image", asset_id: "hero" }] }))
  await writeFile(join(dir, "pages", "p-why.json"), JSON.stringify({ components: [{ type: "bullets", items: ["Every shape stays editable", "Pictures travel with the deck"] }] }))
  await writeFile(join(dir, "pages", "p-end.json"), "{}")
}

/** A home with grok enabled and a stand-in `grok` on PATH. The runner below draws the picture, so nothing is ever spawned. */
async function stubGenerator(): Promise<ProcessRunner> {
  const home = await mkdtemp(join(tmpdir(), "pptwise-deck-images-home-"))
  process.env.PPTWISE_HOME = home
  await persistUserConfigValue(["images", "generators", "grok", "enabled"], true)
  const bin = await mkdtemp(join(tmpdir(), "pptwise-deck-images-bin-"))
  await writeFile(join(bin, "grok"), "#!/bin/sh\nexit 0\n")
  chmodSync(join(bin, "grok"), 0o755)
  process.env.PATH = bin
  return async (req) => {
    if (!req.args.includes("--version")) await writeFile(join(req.cwd ?? "", "generated.jpg"), PNG_1PX)
    return { code: 0, stdout: "DONE\n", stderr: "" }
  }
}

async function mediaParts(pptx: string): Promise<string[]> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(await readFile(pptx))
  return Object.keys(zip.files).filter((k) => k.startsWith("ppt/media/") && !k.endsWith("/"))
}

describe.skipIf(process.platform === "win32")("a deck project's own pictures", () => {
  it("are generated into the deck's assets/, with their sidecar, and nothing under .pptwise", async () => {
    const run = await stubGenerator()
    const root = await mkdtemp(join(tmpdir(), "pptwise-deck-images-gen-"))
    const deck = join(root, "decks", "moving")
    await writeDeck(deck)
    const out = await runImagesGenerate({ deck, as: "hero", cwd: root, prompt: "a harbour at dawn", run })
    expect(out).toContain(join(deck, "assets", "hero.jpg"))
    expect((await readdir(join(deck, "assets"))).sort()).toEqual(["hero.jpg", "hero.json"])
    expect(await pathExists(join(root, ".pptwise"))).toBe(false)
    const list = await runImagesList({ deck, cwd: root })
    expect(list).toContain("hero  grok")
  })

  it("are fetched into the deck's assets/ too", async () => {
    process.env.PPTWISE_HOME = await mkdtemp(join(tmpdir(), "pptwise-deck-images-fetch-home-"))
    await persistImageApiKey("pexels", "TESTPEXELSKEY99")
    const root = await mkdtemp(join(tmpdir(), "pptwise-deck-images-fetch-"))
    const deck = join(root, "moving")
    await writeDeck(deck)
    const photo = { id: 123, width: 1, height: 1, url: "https://www.pexels.com/photo/harbour-123/", photographer: "Jane", src: { original: "https://images.pexels.com/photos/123/original.png" } }
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.startsWith("https://api.pexels.com/v1/photos/123")) return new Response(JSON.stringify(photo), { status: 200, headers: { "Content-Type": "application/json" } })
      if (url.startsWith("https://images.pexels.com/")) return new Response(new Uint8Array(PNG_1PX), { status: 200 })
      throw new Error(`unexpected fetch ${url}`)
    }
    await runImagesFetch("pexels:123", { deck, as: "hero", cwd: root, fetch: fetchImpl })
    expect((await readdir(join(deck, "assets"))).sort()).toEqual(["hero.jpg", "hero.json"])
    expect(await pathExists(join(root, ".pptwise"))).toBe(false)
  })

  it("stay with the deck when it moves to another folder", async () => {
    const run = await stubGenerator()
    const root = await mkdtemp(join(tmpdir(), "pptwise-deck-images-move-"))
    const before = join(root, "drafts", "moving")
    await writeDeck(before)
    await runImagesGenerate({ deck: before, as: "hero", cwd: root, prompt: "a harbour at dawn", run })

    const after = join(root, "decks", "2026", "moving")
    await mkdir(join(root, "decks", "2026"), { recursive: true })
    await rename(before, after)

    const validated = await runValidate(after, root)
    expect(validated).toMatch(/^OK/)
    expect(validated).not.toMatch(/asset_id "hero"/)
    const pptx = join(root, "moved.pptx")
    await runRender(after, { output: pptx, cwd: root })
    expect(await mediaParts(pptx)).toHaveLength(1)
  })

  it("still include a picture pinned before under .pptwise/<deck>/assets/", async () => {
    const root = await mkdtemp(join(tmpdir(), "pptwise-deck-images-legacy-"))
    const deck = join(root, "moving")
    await writeDeck(deck)
    const legacy = join(root, ".pptwise", "moving", "assets")
    await mkdir(legacy, { recursive: true })
    await writeFile(join(legacy, "hero.png"), PNG_1PX)
    await writeFile(join(legacy, "hero.json"), JSON.stringify({ provider: "pexels", photo_id: "123", license: "Pexels License", author: "Jane" }))

    expect(await runValidate(deck, root)).not.toMatch(/asset_id "hero"/)
    const pptx = join(root, "legacy.pptx")
    await runRender(deck, { output: pptx, cwd: root })
    expect(await mediaParts(pptx)).toHaveLength(1)
    expect(await runImagesList({ deck, cwd: root })).toContain("hero  pexels:123")
  })

  it("that are missing are named with the file the deck reads them from", async () => {
    const root = await mkdtemp(join(tmpdir(), "pptwise-deck-images-missing-"))
    const deck = join(root, "decks", "moving")
    await writeDeck(deck)
    const out = await runValidate(deck, root)
    expect(out).toMatch(/asset_id "hero" is not defined/)
    expect(out).toContain(`Put the picture at ${join("decks", "moving", "assets", "hero")}.jpg`)
  })
})
