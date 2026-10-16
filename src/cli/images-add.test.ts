// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { runImagesAdd, runImagesList } from "./images"

const JPEG_TINY = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

async function deckProject(): Promise<{ cwd: string; deck: string; assets: string }> {
  const cwd = await mkdtemp(join(tmpdir(), "pptwise-images-add-"))
  const deck = join(cwd, ".pptwise", "decks", "q3-review")
  await mkdir(deck, { recursive: true })
  await writeFile(join(deck, "deck.spec.json"), "{}\n")
  return { cwd, deck, assets: join(deck, "assets") }
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { r: 200, g: 16, b: 46, alpha: 0 } } }).png().toBuffer()
}

const COMMONS_FILE = "https://upload.wikimedia.org/wikipedia/commons/a/ab/River.jpg"
const COMMONS_PAGE = "https://commons.wikimedia.org/wiki/File:River.jpg"

function serving(bytes: Buffer, seen: string[] = []): typeof fetch {
  return async (input) => {
    seen.push(String(input))
    return new Response(new Uint8Array(bytes), { status: 200 })
  }
}

const sidecarOf = async (assets: string, id: string) => JSON.parse(await readFile(join(assets, `${id}.json`), "utf8")) as Record<string, unknown>

describe("runImagesAdd", () => {
  it("pins a picture from the web with its source page, author and license, and prints the credit it needs", async () => {
    const { cwd, deck, assets } = await deckProject()
    const seen: string[] = []
    const out = await runImagesAdd(COMMONS_FILE, {
      deck,
      as: "river",
      license: "cc-by-4.0",
      source: COMMONS_PAGE,
      author: "Jane Doe",
      cwd,
      fetch: serving(JPEG_TINY, seen),
      resizeToJpeg: async (bytes) => bytes,
      now: () => new Date("2026-10-16T00:00:00.000Z"),
    })
    expect(seen).toEqual([COMMONS_FILE])
    expect(out).toBe(`pinned web picture as river → ${join(assets, "river.jpg")}\ncredit: Jane Doe, CC BY 4.0, ${COMMONS_PAGE}`)
    expect((await readFile(join(assets, "river.jpg"))).equals(JPEG_TINY)).toBe(true)
    expect(await sidecarOf(assets, "river")).toEqual({
      provider: "web",
      license: "CC BY 4.0",
      author: "Jane Doe",
      page_url: COMMONS_PAGE,
      attribution: `Jane Doe, CC BY 4.0, ${COMMONS_PAGE}`,
      url: COMMONS_FILE,
      added_at: "2026-10-16T00:00:00.000Z",
    })
    expect(await runImagesList({ deck, cwd })).toBe(`river  web  Jane Doe  CC BY 4.0  ${COMMONS_PAGE}`)
  })

  it("takes a public-domain picture with no credit, and press material credited to its owner", async () => {
    const { cwd, deck, assets } = await deckProject()
    const base = { deck, cwd, fetch: serving(JPEG_TINY), resizeToJpeg: async (bytes: Buffer) => bytes }
    expect(await runImagesAdd(COMMONS_FILE, { ...base, as: "map", license: "pdm", source: COMMONS_PAGE })).not.toContain("credit:")
    expect(await sidecarOf(assets, "map")).not.toHaveProperty("attribution")
    const press = await runImagesAdd("https://press.example.com/launch.jpg", {
      ...base,
      as: "launch",
      license: "press",
      source: "https://press.example.com/kit",
      author: "Example Space Agency",
    })
    expect(press).toContain("credit: Courtesy of Example Space Agency")
  })

  it("refuses a web picture without the license, source page, or author its terms need", async () => {
    const { cwd, deck } = await deckProject()
    const base = { deck, cwd, as: "x", fetch: serving(JPEG_TINY), resizeToJpeg: async (bytes: Buffer) => bytes }
    await expect(runImagesAdd(COMMONS_FILE, { ...base })).rejects.toThrow(/needs --license/)
    await expect(runImagesAdd(COMMONS_FILE, { ...base, license: "cc0" })).rejects.toThrow(/needs --source/)
    await expect(runImagesAdd(COMMONS_FILE, { ...base, license: "cc-by", source: COMMONS_PAGE })).rejects.toThrow(/pass --author/)
    await expect(runImagesAdd(COMMONS_FILE, { ...base, license: "cc-by-sa-4.0", source: COMMONS_PAGE, author: "A" })).rejects.toThrow(
      /share-alike, non-commercial and no-derivatives pictures are not taken/,
    )
    await expect(runImagesAdd(COMMONS_FILE, { ...base, license: "cc-by-nc", source: COMMONS_PAGE, author: "A" })).rejects.toThrow(/not taken/)
    await expect(runImagesAdd(COMMONS_FILE, { ...base, license: "all rights reserved", source: COMMONS_PAGE })).rejects.toThrow(
      /is not one images add takes/,
    )
    await expect(runImagesAdd("ftp://example.com/a.jpg", { ...base, license: "cc0", source: COMMONS_PAGE })).rejects.toThrow(/https address or a file path/)
    await expect(runImagesAdd("http://example.com/a.jpg", { ...base, license: "cc0", source: COMMONS_PAGE })).rejects.toThrow(/non-HTTPS/)
  })

  it("pins a project file as the user's own, keeps a PNG a PNG, and records the file it came from", async () => {
    const { cwd, deck, assets } = await deckProject()
    await mkdir(join(cwd, "public"), { recursive: true })
    const logo = await png(400, 120)
    await writeFile(join(cwd, "public", "logo.png"), logo)
    const out = await runImagesAdd("public/logo.png", { deck, as: "logo", cwd, now: () => new Date("2026-10-16T00:00:00.000Z") })
    expect(out).toBe(`pinned file picture as logo → ${join(assets, "logo.png")}`)
    expect((await readFile(join(assets, "logo.png"))).equals(logo)).toBe(true)
    expect(await sidecarOf(assets, "logo")).toEqual({ provider: "file", license: "Own", file: "public/logo.png", added_at: "2026-10-16T00:00:00.000Z" })
  })

  it("turns an SVG logo into a PNG, and replaces an earlier pin of the same id", async () => {
    const { cwd, deck, assets } = await deckProject()
    await writeFile(join(cwd, "logo.svg"), '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60"><rect width="240" height="60" fill="#C8102E"/></svg>\n')
    await runImagesAdd(COMMONS_FILE, { deck, cwd, as: "logo", license: "cc0", source: COMMONS_PAGE, fetch: serving(JPEG_TINY), resizeToJpeg: async (b) => b })
    await runImagesAdd("logo.svg", { deck, cwd, as: "logo" })
    const drawn = await sharp(await readFile(join(assets, "logo.png"))).metadata()
    expect(drawn.format).toBe("png")
    expect(drawn.width).toBe(960)
    await expect(readFile(join(assets, "logo.jpg"))).rejects.toThrow(/ENOENT/)
  })

  it("leaves a file of the user's alone under the same id", async () => {
    const { cwd, deck, assets } = await deckProject()
    await mkdir(assets, { recursive: true })
    await writeFile(join(assets, "cover.jpg"), JPEG_TINY)
    await writeFile(join(cwd, "cover.png"), await png(64, 64))
    await expect(runImagesAdd("cover.png", { deck, cwd, as: "cover" })).rejects.toThrow(/already holds the asset id "cover"/)
  })

  it("refuses a file that is not a picture", async () => {
    const { cwd, deck } = await deckProject()
    await writeFile(join(cwd, "notes.txt"), "hello\n")
    await expect(runImagesAdd("notes.txt", { deck, cwd, as: "notes" })).rejects.toThrow(/is not a picture a deck takes/)
    await expect(runImagesAdd("missing.png", { deck, cwd, as: "m" })).rejects.toThrow(/cannot read missing\.png/)
  })
})
