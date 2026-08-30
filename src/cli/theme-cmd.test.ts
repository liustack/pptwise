// @vitest-environment node
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { buildThmxBytes } from "../themes/extract/__fixtures__/thmx"
import { runBrandExtract, runThemeFork, runThemeNew, runThemeTry } from "./commands"

installNodePlatform()

afterEach(() => {
  __resetRegisteredThemes()
})

function tmp(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

describe("runThemeNew", () => {
  it("copies a builtin preset into a v2 file with no base", async () => {
    const cwd = await tmp("pptwise-theme-new-")
    const out = join(cwd, "themes", "acme.theme.json")
    const msg = await runThemeNew({ from: "consulting", output: out, cwd })
    expect(msg).toContain("Set spec.theme to \"acme\"")
    expect(msg).not.toContain("--theme-file")
    const written = JSON.parse(await readFile(out, "utf8")) as {
      version: number
      id: string
      style: { id: string; shape?: { cover?: unknown } }
      menu: unknown
      base?: unknown
    }
    expect(written.version).toBe(2)
    expect(written.id).toBe("acme")
    expect(written.style.id).toBe("acme")
    expect(written.menu).toBeTypeOf("object")
    expect(written).not.toHaveProperty("base")
    expect(written.style.shape?.cover).toBeUndefined()
  })

  it("refuses a builtin id collision", async () => {
    const cwd = await tmp("pptwise-theme-new-collide-")
    await expect(runThemeNew({ from: "consulting", id: "consulting", cwd })).rejects.toThrow(
      /collides with a built-in pptwise theme/,
    )
  })
})

describe("runThemeFork", () => {
  it("writes a same-menu color fork", async () => {
    const cwd = await tmp("pptwise-theme-fork-")
    const src = join(cwd, "themes", "acme.theme.json")
    await runThemeNew({ from: "consulting", output: src, cwd })
    const out = join(cwd, "themes", "acme-blue.theme.json")
    const msg = await runThemeFork("acme", { primary: "#0B5FFF", output: out, cwd })
    expect(msg).toContain("Set spec.theme to \"acme-blue\"")
    const written = JSON.parse(await readFile(out, "utf8")) as {
      version: number
      id: string
      style: { colors: { primary: string }; defaultBackgrounds: { chapter: { value: string } } }
      menu: unknown
    }
    const source = JSON.parse(await readFile(src, "utf8")) as { menu: unknown }
    expect(written.version).toBe(2)
    expect(written.id).toBe("acme-blue")
    expect(written.style.colors.primary).toBe("#0B5FFF")
    expect(written.style.defaultBackgrounds.chapter.value).toBe("#0B5FFF")
    expect(written.menu).toEqual(source.menu)
    expect(written).not.toHaveProperty("base")
  })

  it("treats contrast failure as a hard error", async () => {
    const cwd = await tmp("pptwise-theme-fork-bad-")
    await expect(
      runThemeFork("consulting", {
        primary: "#FFFFFF",
        bg: "#FFFFFF",
        text: "#F0F0F0",
        surface: "#FFFFFF",
        id: "wash",
        cwd,
      }),
    ).rejects.toThrow(/contrast ratio/)
  })
})

describe("runBrandExtract v2 wrap", () => {
  it("writes a complete v2 file with the donor menu and no base", async () => {
    const cwd = await tmp("pptwise-extract-v2-")
    const src = join(cwd, "corp.pptx")
    await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
    const out = join(cwd, "themes", "acme.theme.json")
    const msg = await runBrandExtract(src, { output: out, from: "consulting" })
    expect(msg).toContain("set spec.theme")
    const written = JSON.parse(await readFile(out, "utf8")) as {
      version: number
      base?: unknown
      menu: { cover: unknown }
    }
    expect(written.version).toBe(2)
    expect(written).not.toHaveProperty("base")
    expect(written.menu.cover).toBeDefined()
  })
})

describe("runThemeTry", () => {
  it("writes a contact sheet with kind rows that do not collapse", async () => {
    const cwd = await tmp("pptwise-theme-try-")
    const out = join(cwd, "sheet")
    const msg = await runThemeTry("consulting,swiss,memo", { output: out, cwd, gitIgnore: false })
    expect(msg).toContain("contact-sheet.html")
    const html = await readFile(join(out, "contact-sheet.html"), "utf8")
    expect(html).toContain("consulting")
    expect(html).toContain("swiss")
    expect(html).toContain("memo")
    expect(html).toContain("points")
    expect(html).toContain("list")
    expect(html).toContain("comparison")
    expect((html.match(/<svg\b/g) ?? []).length).toBeGreaterThanOrEqual(30)
  })

  it("rejects duplicate ids and out-of-range lists", async () => {
    const cwd = await tmp("pptwise-theme-try-err-")
    await expect(runThemeTry("consulting", { cwd })).rejects.toThrow(/expects 2-4 theme ids, got 1/)
    await expect(runThemeTry("consulting,swiss,memo,tech,ink", { cwd })).rejects.toThrow(/expects 2-4 theme ids, got 5/)
    await expect(runThemeTry("consulting, consulting", { cwd })).rejects.toThrow(/duplicate/)
  })

  it("defaults to .pptwise/theme-try/", async () => {
    const cwd = await tmp("pptwise-theme-try-default-")
    const msg = await runThemeTry("consulting,swiss", { cwd, gitIgnore: false })
    expect(msg).toContain(join(cwd, ".pptwise", "theme-try", "contact-sheet.html"))
    expect(await readdir(join(cwd, ".pptwise", "theme-try"))).toContain("contact-sheet.html")
  })
})
