// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes, getThemeDefinition, THEME_DEFINITIONS } from "../themes/definitions"
import { runThemeNew } from "./commands"
import { menusEqual, resolveThemeByName } from "./theme-resolve"
import type { Menu } from "../themes/schema"

installNodePlatform()

afterEach(() => {
  __resetRegisteredThemes()
})

function tmp(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

const MENU: Menu = {
  cover: { face: "poster-center", params: { density: "tight", tone: "dark" } },
  chapter: { face: "masthead-chapter" },
  content: {
    points: { face: "two-column" },
    list: { face: "bento-panel" },
  },
  ending: { face: "poster-ending" },
}

describe("menusEqual", () => {
  it("treats params key insertion order as equal", () => {
    const reordered: Menu = {
      ...MENU,
      cover: { face: "poster-center", params: { tone: "dark", density: "tight" } },
    }
    expect(menusEqual(MENU, reordered)).toBe(true)
  })

  it("treats content-kind key insertion order as equal", () => {
    const reordered: Menu = {
      ...MENU,
      content: {
        list: { face: "bento-panel" },
        points: { face: "two-column" },
      },
    }
    expect(menusEqual(MENU, reordered)).toBe(true)
  })

  it("treats a different face as not equal", () => {
    const other: Menu = {
      ...MENU,
      cover: { face: "gauge-verdict", params: { density: "tight", tone: "dark" } },
    }
    expect(menusEqual(MENU, other)).toBe(false)
  })

  it("treats whitespace-different source files as equal after parse", () => {
    const compact = JSON.parse(JSON.stringify(MENU)) as Menu
    const pretty = JSON.parse(`${JSON.stringify(MENU, null, 4)}\n`) as Menu
    expect(menusEqual(compact, pretty)).toBe(true)
  })
})

describe("a theme file resolved by name is carried by value", () => {
  it("returns the file definition without writing it into any lookup table", async () => {
    const cwd = await tmp("pptwise-by-value-")
    await mkdir(join(cwd, "themes"))
    const path = join(cwd, "themes", "brief.theme.json")
    await runThemeNew({ from: "brief", output: path, id: "brief", cwd })
    const override = JSON.parse(await readFile(path, "utf8")) as {
      style: { colors: { primary: string } }
    }
    override.style.colors.primary = "#0B5FFF"
    await writeFile(path, JSON.stringify(override))

    const resolved = await resolveThemeByName("brief", { startDir: cwd })
    expect(resolved.kind).toBe("file")
    expect(resolved.definition.style.colors.primary).toBe("#0B5FFF")
    expect(getThemeDefinition("brief").style.colors.primary).toBe(THEME_DEFINITIONS.brief.style.colors.primary)
  })

  it("resolves the built-in again once the workspace override is deleted", async () => {
    const cwd = await tmp("pptwise-override-gone-")
    await mkdir(join(cwd, "themes"))
    const path = join(cwd, "themes", "brief.theme.json")
    await runThemeNew({ from: "brief", output: path, id: "brief", cwd })
    const override = JSON.parse(await readFile(path, "utf8")) as {
      style: { colors: { primary: string } }
    }
    override.style.colors.primary = "#0B5FFF"
    await writeFile(path, JSON.stringify(override))

    const first = await resolveThemeByName("brief", { startDir: cwd })
    expect(first.definition.style.colors.primary).toBe("#0B5FFF")

    await rm(path)
    const second = await resolveThemeByName("brief", { startDir: cwd })
    expect(second.kind).toBe("builtin")
    expect(second.definition.style.colors.primary).toBe(THEME_DEFINITIONS.brief.style.colors.primary)
    expect(second.definition).toBe(THEME_DEFINITIONS.brief)
  })

  it("rejects a file that fails the menu gate and installs nothing", async () => {
    const cwd = await tmp("pptwise-bad-menu-")
    const path = join(cwd, "acme.theme.json")
    await runThemeNew({ from: "brief", output: path, id: "acme", cwd })
    const broken = JSON.parse(await readFile(path, "utf8")) as {
      menu: { cover: { face: string } }
    }
    broken.menu.cover.face = "not-a-layout"
    await writeFile(path, JSON.stringify(broken))
    await expect(resolveThemeByName("acme", { startDir: cwd, deckDir: cwd })).rejects.toThrow(/unknown layout id/)
    expect(() => getThemeDefinition("acme")).toThrow(/unknown theme "acme"/)
  })
})

describe("resolveThemeByName", () => {
  it("does not register a deck theme.json whose id does not match the lookup name", async () => {
    const deck = await tmp("pptwise-mismatch-")
    const bound = join(deck, "theme.json")
    await runThemeNew({ from: "brief", output: bound, id: "other", cwd: deck })
    await expect(resolveThemeByName("acme", { startDir: deck, deckDir: deck })).rejects.toThrow(/unknown theme "acme"/)
    expect(() => getThemeDefinition("other")).toThrow(/unknown theme "other"/)
  })

  it("refuses a path-like name before joining candidates", async () => {
    const cwd = await tmp("pptwise-name-escape-")
    await mkdir(join(cwd, "secret"), { recursive: true })
    await expect(resolveThemeByName("../secret", { startDir: cwd, deckDir: cwd })).rejects.toThrow(/a-z0-9-/)
    await expect(resolveThemeByName("Consulting", { startDir: cwd })).rejects.toThrow(/a-z0-9-/)
  })
})
