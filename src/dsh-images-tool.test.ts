// @vitest-environment node
//
// The `pptwise_images` DSH tool, driven against a fake CLI that answers
// `images search --sheet --json` the way the real command does. Pinned here:
// where the CLI runs, what the model reads, and when the contact sheet rides
// back as an image block. The search and the sheet have their own suites
// (src/cli/images.test.ts, src/cli/image-sheet.test.ts).
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

interface Hit {
  n: number
  id: string
  width: number
  height: number
  description?: string
  author: string
  license: string
  source?: string
}

interface ImagesValue {
  query: string
  hits: Hit[]
  notes: string[]
  sheet?: string
  image?: { attachmentId: string; mediaType: string; bytes: number; width: number; height: number; name?: string }
}

interface ImagesTool {
  name: string
  parameters: { properties: Record<string, unknown>; required: string[] }
  output: {
    schema: { properties: Record<string, unknown>; required: string[]; additionalProperties: boolean }
    render: (a: unknown, v: ImagesValue) => ({ type: "text"; text: string } | { type: "image"; attachment: Record<string, unknown> })[]
  }
  execute: (args: { query: string; orientation?: string }, exec?: unknown) => Promise<ImagesValue>
}

interface ImagesModule {
  IMAGES_TOOL_NAME: string
  createImagesTool: (cliPath: string, ctx: unknown) => ImagesTool
}

async function load(): Promise<ImagesModule> {
  // @ts-expect-error untyped on purpose, like the rest of the plugin
  return import("../dsh/images-tool.js")
}

/** `images search`: two hits and a sheet in the working directory's
 *  `.pptwise/image-search/`, or none for the query "nothing". */
const FAKE_CLI = `
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
const argv = process.argv.slice(2)
appendFileSync(join(dirname(process.argv[1]), "cli.log"), JSON.stringify({ cwd: process.cwd(), argv }) + "\\n")
if (argv[0] !== "images" || argv[1] !== "search" || !argv.includes("--json") || !argv.includes("--sheet")) {
  process.stderr.write("unsupported command\\n")
  process.exit(3)
}
const query = argv[2]
if (query === "nothing") {
  process.stdout.write(JSON.stringify({ query, hits: [], notes: ["Openverse does not verify individual licenses."] }) + "\\n")
} else {
  const dir = join(process.cwd(), ".pptwise", "image-search")
  mkdirSync(dir, { recursive: true })
  const sheet = join(dir, "wind-farm.jpg")
  writeFileSync(sheet, "JPEG-BYTES")
  const hits = [
    { n: 1, id: "openverse:a1", provider: "openverse", thumb: "https://t/1", width: 1024, height: 682, author: "Wallboat", license: "cc0", pageUrl: "https://p/1", attribution: "a", source: "flickr", description: "Wind farm" },
    { n: 2, id: "openverse:b2", provider: "openverse", thumb: "https://t/2", width: 1562, height: 880, author: "Pasicles", license: "cc0", pageUrl: "https://p/2", attribution: "b" },
  ]
  process.stdout.write(JSON.stringify({ query, hits, notes: ["Openverse does not verify individual licenses."], sheet }) + "\\n")
}
`

async function setup(tag: string): Promise<{ cliPath: string; workspace: string }> {
  const base = await mkdtemp(join(tmpdir(), `pptwise-dsh-images-${tag}-`))
  const cliPath = join(base, "cli.mjs")
  await writeFile(cliPath, FAKE_CLI)
  await writeFile(join(base, "cli.log"), "")
  const workspace = join(base, "workspace")
  await mkdir(workspace)
  return { cliPath, workspace }
}

/** A host context: an attachment store that records what it saved, and a
 *  model catalogue whose one model takes `modalities`. */
function host(modalities: string[] | undefined, withStore = true, refuse?: string) {
  const saved: { data: Buffer; mediaType: string; name?: string }[] = []
  const services: Record<string, unknown> = {
    llm: {
      resolveModelInfo: async (provider: string, model: string) => {
        expect([provider, model]).toEqual(["deepseek", "v-flash"])
        return { inputModalities: modalities }
      },
    },
  }
  if (withStore) {
    services.attachments = {
      saveImage: async (input: { data: Buffer; mediaType: string; name?: string }) => {
        if (refuse !== undefined) throw new Error(refuse)
        saved.push(input)
        return { attachmentId: "att-1", mediaType: input.mediaType, bytes: input.data.length, width: 1500, height: 576, name: input.name }
      },
    }
  }
  return { ctx: { get: (name: string) => services[name] }, saved }
}

function inSession(cwd: string): unknown {
  return {
    signal: new AbortController().signal,
    agent: { options: { provider: "deepseek", model: "v-flash" }, session: { header: { cwd }, requestHeader: () => undefined } },
  }
}

describe("pptwise_images", () => {
  it("searches in the session's project and hands the model the numbered hits and the sheet as an image", async () => {
    const { cliPath, workspace } = await setup("image")
    const { IMAGES_TOOL_NAME, createImagesTool } = await load()
    const { ctx, saved } = host(["text", "image"])
    const tool = createImagesTool(cliPath, ctx)
    expect(tool.name).toBe(IMAGES_TOOL_NAME)
    expect(IMAGES_TOOL_NAME).toBe("pptwise_images")

    const value = await tool.execute({ query: " wind farm ", orientation: "landscape" }, inSession(workspace))
    const log = (await readFile(join(cliPath, "..", "cli.log"), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { cwd: string; argv: string[] })
    expect(log).toEqual([{ cwd: expect.stringContaining("workspace"), argv: ["images", "search", "wind farm", "--orientation", "landscape", "--sheet", "--json"] }])

    const sheet = join(log[0]!.cwd, ".pptwise", "image-search", "wind-farm.jpg")
    expect(value).toEqual({
      query: "wind farm",
      hits: [
        { n: 1, id: "openverse:a1", width: 1024, height: 682, description: "Wind farm", author: "Wallboat", license: "cc0", source: "flickr" },
        { n: 2, id: "openverse:b2", width: 1562, height: 880, author: "Pasicles", license: "cc0" },
      ],
      notes: ["Openverse does not verify individual licenses."],
      sheet,
      image: { attachmentId: "att-1", mediaType: "image/jpeg", bytes: 10, width: 1500, height: 576, name: "wind-farm.jpg" },
    })
    expect(saved).toHaveLength(1)
    expect(saved[0]!.data.toString()).toBe("JPEG-BYTES")
    for (const key of Object.keys(value)) expect(Object.keys(tool.output.schema.properties)).toContain(key)

    const blocks = tool.output.render({}, value)
    expect(blocks.map((block) => block.type)).toEqual(["text", "image"])
    expect(blocks[1]).toEqual({ type: "image", attachment: value.image })
    const text = (blocks[0] as { text: string }).text
    expect(text).toContain("Contact sheet below")
    expect(text).toContain("1. openverse:a1  1024x682  Wallboat  cc0  Wind farm")
    expect(text).toContain("2. openverse:b2  1562x880  Pasicles  cc0")
    expect(text).toContain("images fetch <id> --deck <deck-dir> --as <asset_id>")
    expect(text).not.toContain(sheet)
  })

  it("names the sheet's path instead where the model takes no images or the host has no store", async () => {
    const { cliPath, workspace } = await setup("text")
    const { createImagesTool } = await load()
    for (const { ctx, saved } of [host(["text"]), host(undefined), host(["text", "image"], false)]) {
      const tool = createImagesTool(cliPath, ctx)
      const value = await tool.execute({ query: "wind farm" }, inSession(workspace))
      expect(value).not.toHaveProperty("image")
      expect(saved).toEqual([])
      const blocks = tool.output.render({}, value)
      expect(blocks.map((block) => block.type)).toEqual(["text"])
      expect((blocks[0] as { text: string }).text).toContain(`Contact sheet: ${value.sheet}`)
    }
  })

  it("keeps the search when the host's store refuses the sheet, and says why", async () => {
    const { cliPath, workspace } = await setup("refused")
    const { createImagesTool } = await load()
    const tool = createImagesTool(cliPath, host(["text", "image"], true, "image too large").ctx)
    const value = await tool.execute({ query: "wind farm" }, inSession(workspace))
    expect(value).not.toHaveProperty("image")
    expect(value.hits).toHaveLength(2)
    expect(value.notes).toContain("The contact sheet could not be attached here (image too large). Open its file to look at it.")
    const text = (tool.output.render({}, value)[0] as { text: string }).text
    expect(text).toContain(`Contact sheet: ${value.sheet}`)
    expect(text).toContain("image too large")
  })

  it("says so when the search found nothing, and refuses an empty query", async () => {
    const { cliPath, workspace } = await setup("empty")
    const { createImagesTool } = await load()
    const tool = createImagesTool(cliPath, host(["text", "image"]).ctx)
    const value = await tool.execute({ query: "nothing" }, inSession(workspace))
    expect(value).toEqual({ query: "nothing", hits: [], notes: ["Openverse does not verify individual licenses."] })
    expect((tool.output.render({}, value)[0] as { text: string }).text).toContain('No photos found for "nothing".')
    await expect(tool.execute({ query: "  " }, inSession(workspace))).rejects.toThrow(/query is empty/)
  })

  it("is registered by the plugin beside its other tools", async () => {
    // @ts-expect-error untyped on purpose
    const plugin = (await import("../dsh/index.js")) as { apply: (ctx: unknown) => void; IMAGES_TOOL_NAME: string }
    const names: string[] = []
    plugin.apply({
      skills: { register: () => () => {} },
      tools: { register: (tool: { name: string }) => { names.push(tool.name) } },
      get: () => undefined,
    })
    expect(names).toEqual(["pptwise_preview", "pptwise_themes", "pptwise_outline", "pptwise_build", plugin.IMAGES_TOOL_NAME])
  })
})
