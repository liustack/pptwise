// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { buildThmxBytes } from "../themes/extract/__fixtures__/thmx"
import { applyDeckConfig, runBrandExtract, runSpecValidate, runValidate } from "./commands"

installNodePlatform()

const SLIDES = [
  { type: "cover", heading: "CLI" },
  { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "hello from the CLI test" }] },
]

const IR_TECH = { version: "5", filename: "cli-test", theme: { id: "tech" }, slides: SLIDES }
const IR_NO_THEME = { version: "5", filename: "cli-test", slides: SLIDES }

const originalPptwiseHome = process.env.PPTWISE_HOME
beforeAll(async () => {
  process.env.PPTWISE_HOME = await mkdtemp(join(tmpdir(), "pptwise-sel-home-"))
})
afterAll(() => {
  if (originalPptwiseHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalPptwiseHome
})
afterEach(() => {
  __resetRegisteredThemes()
})

function makeDeckPlan(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: "1",
    narrative: "boardroom-report",
    theme: "consulting",
    filename: "q3-review",
    pages: [
      { id: "p-cover", type: "cover", heading: "Q3 Review" },
      { id: "p-a", type: "content", kind: "points", heading: "Segment A" },
      { id: "p-b", type: "content", kind: "points", heading: "Segment B" },
      { id: "p-c", type: "content", kind: "points", heading: "Segment C" },
      { id: "p-ending", type: "ending", heading: "Thanks" },
    ],
    ...extra,
  }
}

function tmp(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

async function writeDeckDir(spec: Record<string, unknown>): Promise<string> {
  const deckDir = await tmp("pptwise-sel-deck-")
  await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(spec))
  return deckDir
}

async function writeIrFile(raw: unknown): Promise<string> {
  const d = await tmp("pptwise-sel-ir-")
  const path = join(d, "deck.json")
  await writeFile(path, JSON.stringify(raw))
  return path
}

async function extractTheme(dir: string, id: string, filename: string): Promise<string> {
  const src = join(dir, "corp.pptx")
  await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
  const out = join(dir, filename)
  await runBrandExtract(src, { output: out, id })
  return out
}

async function projectWith(theme: string | undefined): Promise<string> {
  const projectDir = await tmp("pptwise-sel-proj-")
  if (theme !== undefined) {
    await writeFile(join(projectDir, "pptwise.config.json"), JSON.stringify({ theme }))
  }
  return projectDir
}

const REBIND_MESSAGE =
  /cannot rebind theme "acme" to "swiss": menus differ\. A same-menu color fork is allowed\. A different menu is a new theme\. Start over from the theme layer \(keep intent, narrative, and harvested materials, rewrite the spec\)\./

describe("theme selection chain", () => {
  it("1. deck theme.json id=acme + spec.theme=acme -> acme", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "acme" }))
    await extractTheme(deckDir, "acme", "theme.json")
    const projectDir = await projectWith("ink")
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "acme"/)
  })

  it("2. deck ${name}.theme.json hits", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "acme" }))
    await extractTheme(deckDir, "acme", "acme.theme.json")
    const projectDir = await projectWith("ink")
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "acme"/)
  })

  it("3. workspace themes/acme.theme.json from a nested startDir -> acme", async () => {
    const root = await tmp("pptwise-sel-ws-")
    await mkdir(join(root, "themes"))
    await extractTheme(join(root, "themes"), "acme", "acme.theme.json")
    const nested = join(root, "deep", "cwd")
    await mkdir(nested, { recursive: true })
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "acme" }))
    await expect(runValidate(deckDir, nested)).resolves.toMatch(/theme "acme"/)
  })

  it("4. spec.theme=consulting with no files -> builtin", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "consulting" }))
    const projectDir = await projectWith(undefined)
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "consulting"/)
  })

  it("5. spec.theme beats config.theme", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "tech" }))
    const projectDir = await projectWith("ink")
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "tech"/)
  })

  it("6. bare IR theme.id is authority, config cannot override", async () => {
    const irPath = await writeIrFile(IR_TECH)
    const projectDir = await projectWith("ink")
    await expect(runValidate(irPath, projectDir)).resolves.toMatch(/theme "tech"/)
  })

  it("7. bare IR with no theme key -> schema default consulting, config cannot override", async () => {
    const irPath = await writeIrFile(IR_NO_THEME)
    const projectDir = await projectWith("ink")
    await expect(runValidate(irPath, projectDir)).resolves.toMatch(/theme "consulting"/)
    expect(await runValidate(irPath, projectDir)).not.toMatch(/theme "ink"/)
  })

  it("8. unknown name errors, no consulting fallback", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "not-a-real-theme" }))
    const projectDir = await projectWith("consulting")
    await expect(runValidate(deckDir, projectDir)).rejects.toThrow(/unknown theme "not-a-real-theme"/)
    await expect(runValidate(deckDir, projectDir)).rejects.not.toThrow(/theme "consulting"/)
    const raw: Record<string, unknown> = { ...IR_NO_THEME }
    await expect(
      applyDeckConfig(raw, {
        cwd: projectDir,
        specTheme: "not-a-real-theme",
        specPath: join(deckDir, "deck.spec.json"),
        fromDeckDir: true,
        deckDir,
      }),
    ).rejects.toThrow(/unknown theme "not-a-real-theme"/)
  })

  it("9. rebind to different menu rejected", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "swiss" }))
    await extractTheme(deckDir, "acme", "theme.json")
    const projectDir = await projectWith(undefined)
    await expect(runValidate(deckDir, projectDir)).rejects.toThrow(REBIND_MESSAGE)
  })

  it("10. rebind to same-menu fork allowed", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "acme-blue" }))
    await extractTheme(deckDir, "acme", "theme.json")
    const bound = JSON.parse(await readFile(join(deckDir, "theme.json"), "utf8")) as {
      id: string
      style: { id: string; colors: { primary: string } }
    }
    bound.id = "acme-blue"
    bound.style.id = "acme-blue"
    bound.style.colors.primary = "#0B5FFF"
    const projectDir = await projectWith(undefined)
    await mkdir(join(projectDir, "themes"))
    await writeFile(join(projectDir, "themes", "acme-blue.theme.json"), JSON.stringify(bound))
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "acme-blue"/)
  })

  it("11. workspace file cannot shadow a builtin id", async () => {
    const root = await tmp("pptwise-sel-shadow-")
    await mkdir(join(root, "themes"))
    await extractTheme(join(root, "themes"), "acme", "consulting.theme.json")
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "consulting" }))
    await expect(runValidate(deckDir, root)).resolves.toMatch(/theme "consulting"/)
    expect(await runValidate(deckDir, root)).not.toMatch(/theme "acme"/)
  })

  it("12. runSpecValidate sees a workspace custom id", async () => {
    const root = await tmp("pptwise-sel-spec-")
    await mkdir(join(root, "themes"))
    await extractTheme(join(root, "themes"), "acme", "acme.theme.json")
    const specPath = join(root, "deck.spec.json")
    await writeFile(specPath, JSON.stringify(makeDeckPlan({ theme: "acme" })))
    await expect(runSpecValidate(specPath)).resolves.toMatch(/theme "acme"/)
  })
})
