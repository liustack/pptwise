// @vitest-environment node
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { buildThmxBytes } from "../themes/extract/__fixtures__/thmx"
import { applyDeckConfig, runBrandExtract, runValidate } from "./commands"

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

async function withPptwiseHome<T>(home: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.PPTWISE_HOME
  process.env.PPTWISE_HOME = home
  try {
    return await fn()
  } finally {
    if (prev === undefined) delete process.env.PPTWISE_HOME
    else process.env.PPTWISE_HOME = prev
  }
}

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

async function userHomeWith(theme: string | undefined): Promise<string> {
  const home = await tmp("pptwise-sel-user-")
  if (theme !== undefined) {
    await writeFile(join(home, "config.json"), JSON.stringify({ theme }))
  }
  return home
}

describe("theme selection chain", () => {
  it("1. --theme beats spec, project, and user", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "tech" }))
    const projectDir = await projectWith("ink")
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(deckDir, projectDir, { theme: "consulting" })).resolves.toMatch(/theme "consulting"/)
    })
  })

  it("2. spec.theme beats project and user when --theme is omitted", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "tech" }))
    const projectDir = await projectWith("ink")
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "tech"/)
    })
  })

  it("3. omitted spec theme lets project config win (assembled consulting does not beat it)", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: undefined }))
    const projectDir = await projectWith("ink")
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "ink"/)
    })
  })

  it("4. omitted spec and project lets user config win", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: undefined }))
    const projectDir = await projectWith(undefined)
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "journal"/)
    })
  })

  it("5. omitted spec/project/user falls through to schema default consulting", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: undefined }))
    const projectDir = await projectWith(undefined)
    const home = await userHomeWith(undefined)
    await withPptwiseHome(home, async () => {
      await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "consulting"/)
    })
  })

  it("6. bare IR authored theme.id beats project and user", async () => {
    const irPath = await writeIrFile(IR_TECH)
    const projectDir = await projectWith("ink")
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(irPath, projectDir)).resolves.toMatch(/theme "tech"/)
    })
  })

  it("7. bare IR with no theme key lets project config win", async () => {
    const irPath = await writeIrFile(IR_NO_THEME)
    const projectDir = await projectWith("ink")
    const home = await userHomeWith("journal")
    await withPptwiseHome(home, async () => {
      await expect(runValidate(irPath, projectDir)).resolves.toMatch(/theme "ink"/)
    })
  })

  it("8. spec.theme selects a registered custom id from deck theme.json", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "acme-custom" }))
    await extractTheme(deckDir, "acme-custom", "theme.json")
    const projectDir = await projectWith("ink")
    await expect(runValidate(deckDir, projectDir)).resolves.toMatch(/theme "acme-custom"/)
  })

  it("9. --theme-file alone does not override an authored IR theme", async () => {
    const d = await tmp("pptwise-sel-file-")
    const themeFile = await extractTheme(d, "acme", "acme.theme.json")
    await writeFile(join(d, "deck.json"), JSON.stringify(IR_TECH))
    const report = await runValidate(join(d, "deck.json"), d, { themeFilePath: themeFile })
    expect(report).toMatch(/theme "tech"/)
  })

  it("10. --theme custom id wins over spec when the file is registered", async () => {
    const d = await tmp("pptwise-sel-flag-")
    const themeFile = await extractTheme(d, "acme-custom", "acme.theme.json")
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "tech" }))
    const projectDir = await projectWith("ink")
    await expect(
      runValidate(deckDir, projectDir, { theme: "acme-custom", themeFilePath: themeFile }),
    ).resolves.toMatch(/theme "acme-custom"/)
  })

  it("11. --theme builtin wins over a registered file and authored IR", async () => {
    const d = await tmp("pptwise-sel-builtin-")
    const themeFile = await extractTheme(d, "acme", "acme.theme.json")
    await writeFile(join(d, "deck.json"), JSON.stringify(IR_TECH))
    const report = await runValidate(join(d, "deck.json"), d, { theme: "consulting", themeFilePath: themeFile })
    expect(report).toMatch(/theme "consulting"/)
  })

  it("12. --theme-file alone does not select the file id when no layer names it", async () => {
    const d = await tmp("pptwise-sel-nosel-")
    const themeFile = await extractTheme(d, "acme", "acme.theme.json")
    await writeFile(join(d, "deck.json"), JSON.stringify(IR_NO_THEME))
    const report = await runValidate(join(d, "deck.json"), d, { themeFilePath: themeFile })
    expect(report).toMatch(/theme "consulting"/)
    expect(report).not.toMatch(/theme "acme"/)
  })

  it("13. --theme consulting ignores a stale project-config theme", async () => {
    const irPath = await writeIrFile(IR_NO_THEME)
    const projectDir = await projectWith("not-a-real-theme")
    await expect(runValidate(irPath, projectDir, { theme: "consulting" })).resolves.toMatch(/theme "consulting"/)
  })

  it("14. winning unknown spec theme throws and names the spec file", async () => {
    const deckDir = await writeDeckDir(makeDeckPlan({ theme: "not-a-real-theme" }))
    const projectDir = await projectWith("consulting")
    const raw: Record<string, unknown> = { ...IR_NO_THEME }
    await expect(
      applyDeckConfig(raw, {
        cwd: projectDir,
        specTheme: "not-a-real-theme",
        specPath: join(deckDir, "deck.spec.json"),
        fromDeckDir: true,
      }),
    ).rejects.toThrow(/unknown theme "not-a-real-theme" \(from .*deck\.spec\.json\)/)
  })

  it("--theme-file + IR that names the custom id selects it", async () => {
    const d = await tmp("pptwise-sel-named-")
    const themeFile = await extractTheme(d, "acme", "acme.theme.json")
    await writeFile(join(d, "deck.json"), JSON.stringify({ ...IR_NO_THEME, theme: { id: "acme" } }))
    const report = await runValidate(join(d, "deck.json"), d, { themeFilePath: themeFile })
    expect(report).toMatch(/theme "acme"/)
  })
})
