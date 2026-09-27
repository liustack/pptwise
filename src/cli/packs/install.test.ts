// @vitest-environment node
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { buildPackZip, packTheme, themeEntryPath } from "./__fixtures__/pack-zip"
import { installPack } from "./install"
import { listInstalledPacks } from "./store"

installNodePlatform()

const ENGINE = "0.37.1"
let base: string
let root: string

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "pptwise-pack-install-"))
  root = join(base, "packs")
})

async function install(bytes: Buffer, id = "sample", version = "2026.1.0") {
  return installPack(bytes, { id, version }, { root, engineVersion: ENGINE })
}

async function exists(path: string): Promise<boolean> {
  return readFile(path).then(
    () => true,
    () => false,
  )
}

/** Only the installed pack directories: a refused or finished install
 *  leaves no staging directory behind. */
async function rootEntries(): Promise<string[]> {
  return (await readdir(root).catch(() => [] as string[])).sort()
}

describe("installPack", () => {
  it("unpacks a verified pack into <root>/<id>/ with its manifest and themes", async () => {
    const result = await install(await buildPackZip({ id: "sample", version: "2026.1.0", themes: ["sample-brief"] }))
    expect(result.themes).toEqual(["sample-brief"])
    const dir = join(root, "sample")
    expect(result.dir).toBe(dir)
    expect(JSON.parse(await readFile(join(dir, "pack.json"), "utf8"))).toMatchObject({ id: "sample", version: "2026.1.0" })
    expect(JSON.parse(await readFile(join(dir, themeEntryPath("sample-brief")), "utf8")).id).toBe("sample-brief")
    expect(await rootEntries()).toEqual(["sample"])
  })

  it("replaces an installed version wholesale", async () => {
    await install(
      await buildPackZip({
        id: "sample",
        version: "2026.1.0",
        themes: ["sample-brief"],
        edit: (zip) => zip.file("notes/old-only.txt", "gone after the update"),
      }),
    )
    await install(await buildPackZip({ id: "sample", version: "2026.2.0", themes: ["sample-brief", "sample-memo"] }), "sample", "2026.2.0")
    const [pack] = await listInstalledPacks(root)
    expect(pack).toMatchObject({ id: "sample", version: "2026.2.0" })
    expect(pack!.themes.map((t) => t.id)).toEqual(["sample-brief", "sample-memo"])
    expect(await exists(join(root, "sample", "notes", "old-only.txt"))).toBe(false)
    expect(await rootEntries()).toEqual(["sample"])
  })

  it("ignores manifest fields a v1 client does not know", async () => {
    const bytes = await buildPackZip({
      id: "sample",
      version: "2026.1.0",
      themes: ["sample-brief"],
      manifest: { examples: ["examples/launch"], assets: "assets/", futureField: { any: 1 } },
      edit: (zip) => zip.file("examples/launch/deck.spec.json", "{}"),
    })
    await expect(install(bytes)).resolves.toMatchObject({ themes: ["sample-brief"] })
    expect(await exists(join(root, "sample", "examples", "launch", "deck.spec.json"))).toBe(true)
  })

  describe("refuses the pack and keeps the installed version", () => {
    beforeEach(async () => {
      await install(await buildPackZip({ id: "sample", version: "2026.1.0", themes: ["sample-brief"] }))
    })

    async function expectRefused(bytes: Buffer, message: RegExp, version = "2026.2.0") {
      await expect(install(bytes, "sample", version)).rejects.toThrow(message)
      const [pack] = await listInstalledPacks(root)
      expect(pack).toMatchObject({ id: "sample", version: "2026.1.0" })
      expect(await rootEntries()).toEqual(["sample"])
    }

    const v2 = { id: "sample", version: "2026.2.0", themes: ["sample-brief"] }

    it("when a zip entry climbs out with ..", async () => {
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("../escape.txt", "x") }), /\.\..*escape\.txt|escape\.txt.*\.\./)
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("themes/../../escape.txt", "x") }), /escape\.txt/)
      expect(await exists(join(base, "escape.txt"))).toBe(false)
    })

    it("when a zip entry is an absolute path", async () => {
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("/tmp/escape.txt", "x") }), /absolute|relative/)
    })

    it("when a zip entry uses a backslash or a drive letter", async () => {
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("..\\escape.txt", "x") }), /escape\.txt/)
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("C:/escape.txt", "x") }), /escape\.txt/)
    })

    it("when a zip entry is a symbolic link", async () => {
      const bytes = await buildPackZip({
        ...v2,
        edit: (zip) => zip.file("themes/link.theme.json", "/etc/passwd", { unixPermissions: 0o120777 }),
      })
      await expectRefused(bytes, /symbolic link/)
    })

    it("when the archive is not a zip", async () => {
      await expectRefused(Buffer.from("not a zip at all"), /zip/)
    })

    it("when pack.json is missing or malformed", async () => {
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.remove("pack.json") }), /pack\.json/)
      await expectRefused(await buildPackZip({ ...v2, edit: (zip) => zip.file("pack.json", "{oops") }), /pack\.json/)
      await expectRefused(await buildPackZip({ ...v2, manifest: { pack: 2 } }), /pack\.json/)
      await expectRefused(await buildPackZip({ ...v2, manifest: { themes: "themes/" } }), /pack\.json/)
    })

    it("when pack.json names another id or version than the catalog", async () => {
      await expectRefused(await buildPackZip({ ...v2, id: "other" }), /"other".*"sample"|"sample".*"other"/)
      await expectRefused(await buildPackZip({ ...v2, version: "2026.3.0" }), /2026\.3\.0/)
    })

    it("when pack.json's engine range excludes this pptwise", async () => {
      await expectRefused(await buildPackZip({ ...v2, engine: ">=9.0.0" }), /pptwise >=9\.0\.0.*0\.37\.1/)
      await expectRefused(await buildPackZip({ ...v2, engine: "whenever" }), /engine range/)
    })

    it("when a theme path climbs out, is absolute, or is not in the archive", async () => {
      await expectRefused(await buildPackZip({ ...v2, manifest: { themes: ["../sample-brief.theme.json"] } }), /\.\./)
      await expectRefused(await buildPackZip({ ...v2, manifest: { themes: ["/themes/sample-brief.theme.json"] } }), /relative/)
      await expectRefused(await buildPackZip({ ...v2, manifest: { themes: ["themes/missing.theme.json"] } }), /missing\.theme\.json/)
    })

    it("when a theme id is a built-in preset or a retired id", async () => {
      await expectRefused(await buildPackZip({ ...v2, themes: ["brief"] }), /"brief".*built-in/)
      const retired = packTheme("sample-brief")
      const bytes = await buildPackZip({
        ...v2,
        edit: (zip) =>
          zip.file(themeEntryPath("sample-brief"), JSON.stringify({ ...retired, id: "consulting", style: { ...retired.style, id: "consulting" } })),
      })
      await expectRefused(bytes, /consulting/)
    })

    it("when a theme id belongs to another installed pack", async () => {
      await install(await buildPackZip({ id: "other", version: "1.0.0", themes: ["other-brief"] }), "other", "1.0.0")
      await expect(install(await buildPackZip({ ...v2, themes: ["sample-brief", "other-brief"] }), "sample", "2026.2.0")).rejects.toThrow(
        /"other-brief".*pack "other"/,
      )
      const packs = await listInstalledPacks(root)
      expect(packs.map((p) => [p.id, p.version])).toEqual([
        ["other", "1.0.0"],
        ["sample", "2026.1.0"],
      ])
    })

    it("when two theme files in the pack share an id", async () => {
      const bytes = await buildPackZip({
        ...v2,
        manifest: { themes: [themeEntryPath("sample-brief"), "themes/copy.theme.json"] },
        edit: (zip) => zip.file("themes/copy.theme.json", JSON.stringify(packTheme("sample-brief"))),
      })
      await expectRefused(bytes, /"sample-brief".*twice/)
    })

    it("when a theme fails the theme file checks", async () => {
      const broken = packTheme("sample-brief") as unknown as { menu: { cover: { face: string } } }
      broken.menu.cover.face = "not-a-layout"
      await expectRefused(
        await buildPackZip({ ...v2, edit: (zip) => zip.file(themeEntryPath("sample-brief"), JSON.stringify(broken)) }),
        /not-a-layout/,
      )
      await expectRefused(
        await buildPackZip({ ...v2, edit: (zip) => zip.file(themeEntryPath("sample-brief"), JSON.stringify({ version: 2, id: "sample-brief" })) }),
        /invalid theme file/,
      )
    })
  })

  it("refuses to install beside a pack directory it cannot read, since that pack's theme ids are unknown", async () => {
    await mkdir(join(root, "junk"), { recursive: true })
    await writeFile(join(root, "junk", "readme.txt"), "not a pack")
    await expect(install(await buildPackZip({ id: "sample", version: "2026.1.0", themes: ["sample-brief"] }))).rejects.toThrow(
      /junk.*pptwise packs sync|pptwise packs sync.*junk/s,
    )
  })
})
