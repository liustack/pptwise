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

  it("materializes lecture-motif onto copied menu entries", async () => {
    const cwd = await tmp("pptwise-theme-new-lecture-")
    const out = join(cwd, "themes", "lecture-copy.theme.json")
    await runThemeNew({ from: "lecture", output: out, id: "lecture-copy", cwd })
    const written = JSON.parse(await readFile(out, "utf8")) as {
      id: string
      menu: { cover: { decor?: { kind: string; id: string } }; content: { points?: { decor?: { id: string } } } }
    }
    expect(written.id).toBe("lecture-copy")
    expect(written.menu.cover.decor).toEqual({ kind: "motif", id: "lecture-motif" })
    expect(written.menu.content.points?.decor?.id).toBe("lecture-motif")
  })

  it("keeps the preset's emphasis stroke in the written file", async () => {
    // `theme new --from consulting` used to write a theme that drew its
    // `**marked**` runs in the plain accent tint: the copy chain built a
    // fresh object and never listed `emphasis` among the fields it copied.
    const cwd = await tmp("pptwise-theme-new-emphasis-")
    const pad = join(cwd, "themes", "pad.theme.json")
    await runThemeNew({ from: "consulting", output: pad, id: "pad-copy", cwd })
    expect(JSON.parse(await readFile(pad, "utf8")).emphasis).toBe("pad")

    const underline = join(cwd, "themes", "underline.theme.json")
    await runThemeNew({ from: "lecture", output: underline, id: "underline-copy", cwd })
    expect(JSON.parse(await readFile(underline, "utf8")).emphasis).toBe("underline")
  })

  it("freezes a builtin under the same id into deck/theme.json", async () => {
    const cwd = await tmp("pptwise-theme-new-freeze-")
    const out = join(cwd, "deck", "theme.json")
    const msg = await runThemeNew({ from: "consulting", output: out, id: "consulting", cwd })
    expect(msg).toContain('theme "consulting"')
    const written = JSON.parse(await readFile(out, "utf8")) as { id: string }
    expect(written.id).toBe("consulting")
  })

  it("refuses a path-like id before joining an output path", async () => {
    const cwd = await tmp("pptwise-theme-new-escape-")
    await expect(runThemeNew({ from: "consulting", id: "../../escape", cwd })).rejects.toThrow(/a-z0-9-/)
    await expect(runThemeNew({ from: "consulting", id: "Consulting", cwd })).rejects.toThrow(/a-z0-9-/)
    await expect(runThemeNew({ from: "consulting", id: "foo_bar", cwd })).rejects.toThrow(/a-z0-9-/)
  })

  it("refuses to overwrite an existing file unless --force", async () => {
    const cwd = await tmp("pptwise-theme-new-force-")
    const out = join(cwd, "themes", "acme.theme.json")
    await runThemeNew({ from: "consulting", output: out, cwd })
    const original = await readFile(out)
    await expect(runThemeNew({ from: "lecture", output: out, id: "acme", cwd })).rejects.toThrow(/--force/)
    expect(await readFile(out)).toEqual(original)
    await runThemeNew({ from: "lecture", output: out, id: "acme", cwd, force: true })
    const rewritten = JSON.parse(await readFile(out, "utf8")) as {
      id: string
      menu: { cover: { decor?: { id: string } } }
    }
    expect(rewritten.id).toBe("acme")
    expect(rewritten.menu.cover.decor?.id).toBe("lecture-motif")
  })

  it("allows exactly one concurrent writer to claim a new target without --force", async () => {
    const cwd = await tmp("pptwise-theme-new-race-")
    const out = join(cwd, "themes", "acme.theme.json")

    const results = await Promise.allSettled([
      runThemeNew({ from: "consulting", output: out, id: "acme", cwd }),
      runThemeNew({ from: "lecture", output: out, id: "acme", cwd }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect(rejected).toBeDefined()
    if (rejected?.status === "rejected") expect(String(rejected.reason)).toMatch(/--force/)

    const written = JSON.parse(await readFile(out, "utf8")) as { version: number; id: string }
    expect(written).toMatchObject({ version: 2, id: "acme" })
    // The loser's temp file must be swept, and the target must never have
    // held anything but a complete document (publish is link/rename).
    const leftovers = (await readdir(join(cwd, "themes"))).filter((name) => name.endsWith(".tmp"))
    expect(leftovers).toEqual([])
  })

  it("keeps overwrite linearizable when --force and no-force writers interleave", async () => {
    const cwd = await tmp("pptwise-theme-new-mixed-")
    const out = join(cwd, "themes", "acme.theme.json")
    await runThemeNew({ from: "consulting", output: out, id: "acme", cwd })

    const results = await Promise.allSettled([
      runThemeNew({ from: "lecture", output: out, id: "acme", cwd }),
      runThemeNew({ from: "swiss", output: out, id: "acme", cwd, force: true }),
    ])

    // A forced writer never loses; a no-force writer over a published target
    // can only fail with the overwrite hint. Whatever the interleaving, the
    // target ends as one writer's complete document, with no temp debris.
    expect(results[1]!.status).toBe("fulfilled")
    // The target pre-exists, so the no-force writer must always fail — and
    // since it never publishes, the force writer's bytes are the only
    // possible final content.
    expect(results[0]!.status).toBe("rejected")
    if (results[0]!.status === "rejected") expect(String(results[0]!.reason)).toMatch(/--force/)
    const final = JSON.parse(await readFile(out, "utf8")) as {
      version: number
      id: string
      menu: { cover: { face: string } }
    }
    expect(final).toMatchObject({ version: 2, id: "acme" })
    expect(final.menu.cover.face).toBe("institutional-block")
    const leftovers = (await readdir(join(cwd, "themes"))).filter((name) => name.endsWith(".tmp"))
    expect(leftovers).toEqual([])
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

  it("keeps the source theme's emphasis stroke through the fork", async () => {
    const cwd = await tmp("pptwise-theme-fork-emphasis-")
    const src = join(cwd, "themes", "underline-copy.theme.json")
    await runThemeNew({ from: "lecture", output: src, cwd })
    const out = join(cwd, "themes", "underline-blue.theme.json")
    await runThemeFork("underline-copy", { primary: "#0B5FFF", output: out, cwd })
    expect(JSON.parse(await readFile(out, "utf8")).emphasis).toBe("underline")
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

  it("keeps the donor's emphasis stroke alongside its menu", async () => {
    // Extraction takes the brand's colors and the donor's everything else.
    // The donor's stroke is part of that everything else.
    const cwd = await tmp("pptwise-extract-emphasis-")
    const src = join(cwd, "corp.pptx")
    await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
    const out = join(cwd, "themes", "acme.theme.json")
    await runBrandExtract(src, { output: out, from: "consulting" })
    expect(JSON.parse(await readFile(out, "utf8")).emphasis).toBe("pad")
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
