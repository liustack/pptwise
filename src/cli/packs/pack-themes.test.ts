// @vitest-environment node
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { THEME_DEFINITIONS } from "../../themes/definitions"
import { VERSION } from "../../version"
import { runRender, runSpecValidate, runThemeNew, runThemes } from "../commands"
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

  it("looks in the packs before the factory presets", async () => {
    // `packs sync` refuses a pack theme with a preset's id, so this pack is
    // written by hand: it exists only to show the order of the levels.
    const dir = join(packsRoot(), "handmade")
    await writeTheme(join(dir, "themes", "brief.theme.json"), "brief", "#0B5FFF")
    await writeFile(
      join(dir, "pack.json"),
      JSON.stringify({ pack: 1, id: "handmade", version: "1", title: "Handmade", engine: "*", themes: ["themes/brief.theme.json"] }),
    )
    const resolved = await resolveThemeByName("brief", { startDir: cwd })
    expect(resolved).toMatchObject({ kind: "file", pack: { id: "handmade" } })
    expect(resolved.definition.style.colors.primary).toBe("#0B5FFF")
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

  it("fails loudly on a damaged pack instead of answering past it", async () => {
    await mkdir(join(packsRoot(), "broken"), { recursive: true })
    await expect(resolveThemeByName("brief", { startDir: cwd })).rejects.toThrow(/broken.*pptwise packs sync/s)
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
})
