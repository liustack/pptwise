// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { packTheme, themeEntryPath } from "./__fixtures__/pack-zip"
import { listInstalledPacks, packsRoot } from "./store"

const originalHome = process.env.PPTWISE_HOME
let home: string
let root: string

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pptwise-pack-store-"))
  process.env.PPTWISE_HOME = home
  root = join(home, "packs")
})

afterEach(() => {
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
})

async function writePack(id: string, manifest: Record<string, unknown>, themes: string[] = []): Promise<void> {
  const dir = join(root, id)
  await mkdir(join(dir, "themes"), { recursive: true })
  for (const theme of themes) await writeFile(join(dir, themeEntryPath(theme)), JSON.stringify(packTheme(theme)))
  await writeFile(
    join(dir, "pack.json"),
    JSON.stringify({ pack: 1, id, version: "1.0.0", title: id, engine: "*", themes: themes.map(themeEntryPath), ...manifest }),
  )
}

describe("installed pack store", () => {
  it("lives under $PPTWISE_HOME/packs", () => {
    expect(packsRoot()).toBe(join(home, "packs"))
  })

  it("has no packs before the first sync", async () => {
    expect(await listInstalledPacks()).toEqual([])
  })

  it("lists each pack with the id and file of every theme it ships, in id order", async () => {
    await writePack("zeta", {}, ["zeta-one"])
    await writePack("alpha", { version: "2026.1.0", title: "Alpha pack" }, ["alpha-one", "alpha-two"])
    const packs = await listInstalledPacks()
    expect(packs.map((p) => p.id)).toEqual(["alpha", "zeta"])
    expect(packs[0]).toMatchObject({ id: "alpha", version: "2026.1.0", title: "Alpha pack", dir: join(root, "alpha") })
    expect(packs[0]!.themes).toEqual([
      { id: "alpha-one", path: join(root, "alpha", themeEntryPath("alpha-one")) },
      { id: "alpha-two", path: join(root, "alpha", themeEntryPath("alpha-two")) },
    ])
  })

  it("skips hidden entries and plain files beside the packs", async () => {
    await writePack("alpha", {}, ["alpha-one"])
    await mkdir(join(root, ".staging-alpha-123"), { recursive: true })
    await writeFile(join(root, ".DS_Store"), "")
    await writeFile(join(root, "notes.txt"), "")
    expect((await listInstalledPacks()).map((p) => p.id)).toEqual(["alpha"])
  })

  it("fails loudly on a pack directory it cannot read, naming it and the way to repair it", async () => {
    await mkdir(join(root, "broken"), { recursive: true })
    await expect(listInstalledPacks()).rejects.toThrow(/broken.*pptwise packs sync/s)
  })

  it("fails loudly on a manifest whose id is not its directory", async () => {
    await writePack("alpha", { id: "beta" })
    await expect(listInstalledPacks()).rejects.toThrow(/"beta".*alpha/s)
  })

  it("fails loudly on a listed theme file that is gone or has no id", async () => {
    await writePack("alpha", { themes: ["themes/missing.theme.json"] })
    await expect(listInstalledPacks()).rejects.toThrow(/missing\.theme\.json/)
    await writePack("alpha", { themes: ["themes/odd.theme.json"] })
    await writeFile(join(root, "alpha", "themes", "odd.theme.json"), JSON.stringify({ version: 2 }))
    await expect(listInstalledPacks()).rejects.toThrow(/odd\.theme\.json/)
  })

  it("can leave one pack out, so a reinstall can repair it", async () => {
    await writePack("alpha", {}, ["alpha-one"])
    await mkdir(join(root, "broken"), { recursive: true })
    expect((await listInstalledPacks(root, { except: "broken" })).map((p) => p.id)).toEqual(["alpha"])
  })
})
