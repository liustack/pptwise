// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes, getThemeDefinition } from "../themes/definitions"
import { runThemeNew } from "./commands"
import { loadThemeFile, menusEqual, resolveThemeByName } from "./theme-resolve"
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

describe("loadThemeFile transactional replace", () => {
  it("keeps the previous registration when the new file fails the menu gate", async () => {
    const cwd = await tmp("pptwise-reload-")
    const path = join(cwd, "acme.theme.json")
    await runThemeNew({ from: "consulting", output: path, id: "acme", cwd })
    await loadThemeFile(path)
    const previous = structuredClone(getThemeDefinition("acme").menu)
    const broken = JSON.parse(await readFile(path, "utf8")) as {
      menu: { cover: { face: string } }
    }
    broken.menu.cover.face = "not-a-layout"
    await writeFile(path, JSON.stringify(broken))
    await expect(loadThemeFile(path)).rejects.toThrow(/unknown layout id/)
    expect(getThemeDefinition("acme").menu).toEqual(previous)
  })
})

describe("resolveThemeByName", () => {
  it("does not register a deck theme.json whose id does not match the lookup name", async () => {
    const deck = await tmp("pptwise-mismatch-")
    const bound = join(deck, "theme.json")
    await runThemeNew({ from: "consulting", output: bound, id: "other", cwd: deck })
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
