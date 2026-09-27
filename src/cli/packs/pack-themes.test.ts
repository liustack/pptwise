// @vitest-environment node
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { THEME_DEFINITIONS } from "../../themes/definitions"
import { VERSION } from "../../version"
import { runRender, runSchema, runSpecValidate, runThemeNew, runThemes } from "../commands"
import { resolveThemeByName } from "../theme-resolve"
import { buildPackZip, packTheme, themeEntryPath } from "./__fixtures__/pack-zip"
import { installPack } from "./install"
import { packsRoot } from "./store"

installNodePlatform()

const originalHome = process.env.PPTWISE_HOME
let home: string
let cwd: string

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pptwise-pack-themes-home-"))
  cwd = await mkdtemp(join(tmpdir(), "pptwise-pack-themes-cwd-"))
  process.env.PPTWISE_HOME = home
})

afterEach(() => {
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
})

async function mkdirp(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true })
  return dir
}

async function installSample(themes = ["sample-brief"], id = "sample", version = "2026.1.0"): Promise<void> {
  await installPack(await buildPackZip({ id, version, themes }), { id, version }, { engineVersion: VERSION })
}

/** A complete theme file with a primary color that says where it came from. */
async function writeTheme(path: string, id: string, primary: string): Promise<void> {
  const file = packTheme(id)
  file.style.colors.primary = primary
  await mkdir(join(path, ".."), { recursive: true })
  await writeFile(path, JSON.stringify(file))
}

function spec(theme: string): Record<string, unknown> {
  return {
    version: "1",
    narrative: "boardroom-report",
    theme,
    filename: "pack-deck",
    pages: [
      { id: "p-cover", type: "cover", heading: "Pack deck" },
      { id: "p-a", type: "content", kind: "points", heading: "One" },
      { id: "p-b", type: "content", kind: "points", heading: "Two" },
      { id: "p-c", type: "content", kind: "points", heading: "Three" },
      { id: "p-ending", type: "ending", heading: "Thanks" },
    ],
  }
}

describe("theme lookup with installed packs", () => {
  it("finds a pack theme by name and says which pack it came from", async () => {
    await installSample()
    const resolved = await resolveThemeByName("sample-brief", { startDir: cwd })
    expect(resolved).toMatchObject({
      kind: "file",
      id: "sample-brief",
      path: join(packsRoot(), "sample", themeEntryPath("sample-brief")),
      pack: { id: "sample", version: "2026.1.0" },
    })
    expect(resolved.definition.id).toBe("sample-brief")
  })

  it("lets a deck bind a pack theme by name, through validate and render", async () => {
    await installSample()
    const deckDir = join(cwd, "deck")
    await mkdir(deckDir)
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(spec("sample-brief")))
    expect(await runSpecValidate(join(deckDir, "deck.spec.json"))).toMatch(/^OK .*theme "sample-brief"/)
    const out = join(cwd, "pack-deck.pptx")
    await runRender(deckDir, { output: out, draft: true, cwd })
    expect((await stat(out)).size).toBeGreaterThan(0)
  })

  it("prefers a workspace theme of the same name over the pack", async () => {
    await installSample()
    const workspaceFile = join(cwd, "themes", "sample-brief.theme.json")
    await writeTheme(workspaceFile, "sample-brief", "#0B5FFF")
    const resolved = await resolveThemeByName("sample-brief", { startDir: cwd })
    expect(resolved).toMatchObject({ kind: "file", path: workspaceFile })
    expect(resolved.kind === "file" && resolved.pack).toBeUndefined()
    expect(resolved.definition.style.colors.primary).toBe("#0B5FFF")
  })

  it("prefers a deck-local theme of the same name over the pack", async () => {
    await installSample()
    const deckDir = join(cwd, "deck")
    await writeTheme(join(deckDir, "theme.json"), "sample-brief", "#0B5FFF")
    const resolved = await resolveThemeByName("sample-brief", { startDir: cwd, deckDir })
    expect(resolved).toMatchObject({ kind: "file", path: join(deckDir, "theme.json") })
  })

  it("never asks the packs about a preset name, since no pack may ship one", async () => {
    // `packs sync` refuses a pack theme with a preset's id, so this pack is
    // written by hand: it shows that such a file cannot take the name over.
    const dir = join(packsRoot(), "handmade")
    await writeTheme(join(dir, "themes", "brief.theme.json"), "brief", "#0B5FFF")
    await writeFile(
      join(dir, "pack.json"),
      JSON.stringify({ pack: 1, id: "handmade", version: "1", title: "Handmade", engine: "*", themes: ["themes/brief.theme.json"] }),
    )
    const resolved = await resolveThemeByName("brief", { startDir: cwd })
    expect(resolved.kind).toBe("builtin")
    expect(resolved.definition).toBe(THEME_DEFINITIONS.brief)
  })

  it("still answers a preset name with the preset when no pack ships it", async () => {
    await installSample()
    const resolved = await resolveThemeByName("brief", { startDir: cwd })
    expect(resolved.kind).toBe("builtin")
    expect(resolved.definition).toBe(THEME_DEFINITIONS.brief)
  })

  it("names every pack it searched when a name is not found", async () => {
    await installSample(["sample-brief"])
    await installSample(["other-brief"], "other", "1.0.0")
    const error = await resolveThemeByName("nope", { startDir: cwd }).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).toContain(join(packsRoot(), "other"))
    expect(message).toContain(join(packsRoot(), "sample"))
    expect(message.indexOf("workspace")).toBeLessThan(message.indexOf(join(packsRoot(), "other")))
    expect(message.indexOf(join(packsRoot(), "sample"))).toBeLessThan(message.indexOf("built-in presets"))
  })

  it("says where it looked for packs when none are installed", async () => {
    await expect(resolveThemeByName("nope", { startDir: cwd })).rejects.toThrow(`installed packs in ${packsRoot()} (none installed)`)
  })

  it("fails loudly on a damaged pack when the name could be in it", async () => {
    await installSample()
    await mkdir(join(packsRoot(), "broken"), { recursive: true })
    await expect(resolveThemeByName("sample-brief", { startDir: cwd })).rejects.toThrow(/broken.*pptwise packs sync/s)
    await expect(resolveThemeByName("nope", { startDir: cwd })).rejects.toThrow(/broken.*pptwise packs sync/s)
  })

  it("names the pack and the repair when the theme it found fails the theme file checks", async () => {
    const dir = join(packsRoot(), "odd")
    await writeFile(join(await mkdirp(join(dir, "themes")), "odd-one.theme.json"), JSON.stringify({ version: 2, id: "odd-one" }))
    await writeFile(
      join(dir, "pack.json"),
      JSON.stringify({ pack: 1, id: "odd", version: "1", title: "Odd", engine: "*", themes: ["themes/odd-one.theme.json"] }),
    )
    await expect(resolveThemeByName("odd-one", { startDir: cwd })).rejects.toThrow(/installed pack .*odd cannot be read: invalid theme file.*pptwise packs sync/s)
  })

  it("keeps a damaged pack from blocking preset names and retired ids", async () => {
    await mkdir(join(packsRoot(), "broken"), { recursive: true })
    const resolved = await resolveThemeByName("brief", { startDir: cwd })
    expect(resolved.kind).toBe("builtin")
    // A retired id is refused by name before any level is searched.
    await expect(resolveThemeByName("consulting", { startDir: cwd })).rejects.toThrow(/renamed to "brief"/)
    // A workspace file of a preset's name still wins, damaged pack or not.
    await writeTheme(join(cwd, "themes", "swiss.theme.json"), "swiss", "#0B5FFF")
    expect(await resolveThemeByName("swiss", { startDir: cwd })).toMatchObject({ kind: "file", path: join(cwd, "themes", "swiss.theme.json") })
  })

  it("refuses to pick between two packs that ship the same theme id", async () => {
    // `packs sync` never installs a second owner of an id, so these are written by hand.
    for (const id of ["one", "two"]) {
      const dir = join(packsRoot(), id)
      await writeTheme(join(dir, themeEntryPath("shared")), "shared", "#0B5FFF")
      await writeFile(
        join(dir, "pack.json"),
        JSON.stringify({ pack: 1, id, version: "1", title: id, engine: "*", themes: [themeEntryPath("shared")] }),
      )
    }
    await expect(resolveThemeByName("shared", { startDir: cwd })).rejects.toThrow(/"shared".*more than one installed pack/)
  })

  it("copies a pack theme into the workspace with theme new", async () => {
    await installSample()
    const out = join(cwd, "themes", "mine.theme.json")
    await runThemeNew({ from: "sample-brief", output: out, id: "mine", cwd })
    const copied = JSON.parse(await readFile(out, "utf8")) as { id: string; label: string }
    expect(copied).toMatchObject({ id: "mine", label: "Pack sample-brief" })
  })
})

describe("pptwise themes with installed packs", () => {
  it("lists pack themes after the presets, each marked with its source", async () => {
    await installSample(["sample-brief", "sample-memo"])
    const rows = JSON.parse(await runThemes(true)) as Array<Record<string, unknown>>
    expect(rows).toHaveLength(26)
    expect(rows.slice(0, 24).every((row) => row.source === "builtin" && row.pack === undefined)).toBe(true)
    expect(rows.slice(24)).toEqual([
      expect.objectContaining({ id: "sample-brief", label: "Pack sample-brief", source: "pack", pack: "sample", occasions: expect.any(Array) }),
      expect.objectContaining({ id: "sample-memo", source: "pack", pack: "sample" }),
    ])
    expect(rows[24]).toHaveProperty("colors.primary")
    expect(rows[24]).toHaveProperty("identity")
    const text = (await runThemes(false)).split("\n")
    expect(text).toHaveLength(26)
    expect(text[24]).toMatch(/^sample-brief\s+Pack sample-brief\s+\(pack sample\)$/)
  })

  it("lists what it can read and reports each unreadable pack as an error entry", async () => {
    await installSample(["sample-brief"])
    await mkdir(join(packsRoot(), "broken"), { recursive: true })
    const badTheme = join(packsRoot(), "odd")
    await writeFile(join(await mkdirp(join(badTheme, "themes")), "odd-one.theme.json"), JSON.stringify({ version: 2, id: "odd-one" }))
    await writeFile(
      join(badTheme, "pack.json"),
      JSON.stringify({ pack: 1, id: "odd", version: "1", title: "Odd", engine: "*", themes: ["themes/odd-one.theme.json"] }),
    )
    const rows = JSON.parse(await runThemes(true)) as Array<Record<string, unknown>>
    expect(rows.slice(0, 24).every((row) => row.source === "builtin")).toBe(true)
    expect(rows.slice(24)).toEqual([
      { source: "pack", pack: "broken", error: expect.stringMatching(/broken.*pptwise packs sync/s) },
      { source: "pack", pack: "odd", error: expect.stringMatching(/odd-one\.theme\.json.*pptwise packs sync/s) },
      expect.objectContaining({ id: "sample-brief", source: "pack", pack: "sample" }),
    ])
    const text = (await runThemes(false)).split("\n")
    expect(text).toHaveLength(27)
    expect(text[24]).toMatch(/^\(pack broken\) installed pack .*broken cannot be read: /)
    expect(text[26]).toMatch(/^sample-brief\s/)
  })
})

/** A pack written by hand straight into the store, the way a user could
 *  edit or copy one: `packs sync` would have refused any of the conflicts
 *  these tests set up. */
async function handPack(id: string, themes: { id: string; primary?: string }[]): Promise<string> {
  const dir = join(packsRoot(), id)
  for (const theme of themes) await writeTheme(join(dir, themeEntryPath(theme.id)), theme.id, theme.primary ?? "#0B5FFF")
  await writeFile(
    join(dir, "pack.json"),
    JSON.stringify({ pack: 1, id, version: "1", title: id, engine: "*", themes: themes.map((t) => themeEntryPath(t.id)) }),
  )
  return dir
}

type ListRow = { id?: string; source: string; pack?: string; error?: string }

describe("installed packs, as themes and schema --kind read them", () => {
  let stderr: string
  beforeEach(() => {
    stderr = ""
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
      stderr += String(chunk)
      return true
    })
  })
  afterEach(() => vi.restoreAllMocks())

  const list = async (): Promise<ListRow[]> => JSON.parse(await runThemes(true)) as ListRow[]
  const kindThemes = async (theme?: string): Promise<Record<string, { face: string }>> =>
    (JSON.parse(await runSchema({ kind: "points", cwd, ...(theme ? { theme } : {}) })) as {
      themes: Record<string, { face: string }>
    }).themes

  it("answers for installed pack themes as well as the presets", async () => {
    await installSample()
    const themes = await kindThemes()
    expect(Object.keys(themes)).toContain("sample-brief")
    expect(Object.keys(themes)).toContain("brief")
    expect(stderr).toBe("")
  })

  it("leaves a whole pack out when one of its themes fails the checks, and says where it is", async () => {
    await installSample(["sample-brief", "sample-second"])
    const second = join(packsRoot(), "sample", themeEntryPath("sample-second"))
    const file = JSON.parse(await readFile(second, "utf8")) as { menu: { content: Record<string, { face: string }> } }
    file.menu.content.points = { face: "no-such-face" }
    await writeFile(second, JSON.stringify(file))

    const themes = await kindThemes()
    expect(Object.keys(themes)).not.toContain("sample-brief")
    expect(Object.keys(themes)).not.toContain("sample-second")
    expect(Object.keys(themes)).toContain("brief")
    expect(stderr).toContain(join(packsRoot(), "sample"))
    expect(stderr).toContain("pptwise packs sync")

    // themes --json judges the same pack the same way: one error row, no themes.
    const rows = (await list()).filter((row) => row.pack === "sample")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.error).toContain(join(packsRoot(), "sample"))
  })

  it("never lets a pack theme stand in for a preset of the same name", async () => {
    await handPack("handmade", [{ id: "brief" }])
    const themes = await kindThemes()
    const preset = (JSON.parse(await runSchema({ kind: "points", cwd, theme: "brief" })) as {
      themes: Record<string, { face: string }>
    }).themes.brief
    expect(themes.brief).toEqual(preset)
    expect(stderr).toMatch(/handmade[\s\S]*"brief"/)
    const rows = (await list()).filter((row) => row.pack === "handmade")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.error).toMatch(/factory preset/)
  })

  it("names both packs, and answers for neither, when two ship the same theme id", async () => {
    await handPack("one", [{ id: "shared" }])
    await handPack("two", [{ id: "shared" }])
    const themes = await kindThemes()
    expect(Object.keys(themes)).not.toContain("shared")
    expect(stderr).toContain(join(packsRoot(), "one"))
    expect(stderr).toContain(join(packsRoot(), "two"))
    const rows = await list()
    for (const pack of ["one", "two"]) {
      const own = rows.filter((row) => row.pack === pack)
      expect(own).toHaveLength(1)
      expect(own[0]!.error).toMatch(/more than one installed pack/)
    }
  })

  it("answers for the named theme alone when --theme is given", async () => {
    await installSample()
    expect(Object.keys(await kindThemes("brief"))).toEqual(["brief"])
  })
})
