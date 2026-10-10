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
    const msg = await runThemeNew({ from: "brief", output: out, cwd })
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
    // `theme new --from brief` used to write a theme that drew its
    // `**marked**` runs in the plain accent tint: the copy chain built a
    // fresh object and never listed `emphasis` among the fields it copied.
    const cwd = await tmp("pptwise-theme-new-emphasis-")
    const pad = join(cwd, "themes", "pad.theme.json")
    await runThemeNew({ from: "brief", output: pad, id: "pad-copy", cwd })
    expect(JSON.parse(await readFile(pad, "utf8")).emphasis).toBe("pad")

    const underline = join(cwd, "themes", "underline.theme.json")
    await runThemeNew({ from: "lecture", output: underline, id: "underline-copy", cwd })
    expect(JSON.parse(await readFile(underline, "utf8")).emphasis).toBe("underline")
  })

  it("freezes a builtin under the same id into deck/theme.json", async () => {
    const cwd = await tmp("pptwise-theme-new-freeze-")
    const out = join(cwd, "deck", "theme.json")
    const msg = await runThemeNew({ from: "brief", output: out, id: "brief", cwd })
    expect(msg).toContain('theme "brief"')
    const written = JSON.parse(await readFile(out, "utf8")) as { id: string }
    expect(written.id).toBe("brief")
  })

  it("refuses a path-like id before joining an output path", async () => {
    const cwd = await tmp("pptwise-theme-new-escape-")
    await expect(runThemeNew({ from: "brief", id: "../../escape", cwd })).rejects.toThrow(/a-z0-9-/)
    await expect(runThemeNew({ from: "brief", id: "Consulting", cwd })).rejects.toThrow(/a-z0-9-/)
    await expect(runThemeNew({ from: "brief", id: "foo_bar", cwd })).rejects.toThrow(/a-z0-9-/)
  })

  it("refuses to overwrite an existing file unless --force", async () => {
    const cwd = await tmp("pptwise-theme-new-force-")
    const out = join(cwd, "themes", "acme.theme.json")
    await runThemeNew({ from: "brief", output: out, cwd })
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
      runThemeNew({ from: "brief", output: out, id: "acme", cwd }),
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
    await runThemeNew({ from: "brief", output: out, id: "acme", cwd })

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
    await runThemeNew({ from: "brief", output: src, cwd })
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
      runThemeFork("brief", {
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
    const msg = await runBrandExtract(src, { output: out, from: "brief" })
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
    await runBrandExtract(src, { output: out, from: "brief" })
    expect(JSON.parse(await readFile(out, "utf8")).emphasis).toBe("pad")
  })
})

describe("runThemeTry", () => {
  it("writes a contact sheet with kind rows that do not collapse", async () => {
    const cwd = await tmp("pptwise-theme-try-")
    const out = join(cwd, "sheet")
    const msg = await runThemeTry("brief,swiss,memo", { output: out, cwd, gitIgnore: false })
    expect(msg).toContain("contact-sheet.html")
    const html = await readFile(join(out, "contact-sheet.html"), "utf8")
    expect(html).toContain("brief")
    expect(html).toContain("swiss")
    expect(html).toContain("memo")
    expect(html).toContain("points")
    expect(html).toContain("list")
    expect(html).toContain("comparison")
    expect((html.match(/<svg\b/g) ?? []).length).toBeGreaterThanOrEqual(30)
  })

  // `theme try bulletin,brief` failed outright: the sample shows every kind,
  // and bulletin's menu names no statement or fact page.
  it("leaves a kind a theme does not offer out of its column and says so in the cell", async () => {
    const cwd = await tmp("pptwise-theme-try-menu-")
    const out = join(cwd, "sheet")
    // crayon offers no fact page, and the sample carries one.
    await runThemeTry("crayon,brief", { output: out, cwd, gitIgnore: false })
    const html = await readFile(join(out, "contact-sheet.html"), "utf8")
    expect(html.match(/not in crayon&#39;s menu|not in crayon's menu/g)).toHaveLength(1)
    expect(html).not.toMatch(/not in brief/)
  })

  it("rejects duplicate ids and out-of-range lists", async () => {
    const cwd = await tmp("pptwise-theme-try-err-")
    await expect(runThemeTry("brief", { cwd })).rejects.toThrow(/expects 2-4 theme ids, got 1/)
    await expect(runThemeTry("brief,swiss,memo,terminal,ink", { cwd })).rejects.toThrow(/expects 2-4 theme ids, got 5/)
    await expect(runThemeTry("brief, brief", { cwd })).rejects.toThrow(/duplicate/)
  })

  it("defaults to .pptwise/theme-try/", async () => {
    const cwd = await tmp("pptwise-theme-try-default-")
    const msg = await runThemeTry("brief,swiss", { cwd, gitIgnore: false })
    expect(msg).toContain(join(cwd, ".pptwise", "theme-try", "contact-sheet.html"))
    expect(await readdir(join(cwd, ".pptwise", "theme-try"))).toContain("contact-sheet.html")
  })
})

describe("runThemeTry --title (the caller's own pages)", () => {
  interface WallManifest {
    generator: string
    title: string
    subtitle?: string
    lang: string
    slide: { width: number; height: number }
    contactSheet: string
    themes: {
      id: string
      label: string
      source: string
      pages: { type: string; kind?: string; file: string }[]
      skipped?: { type: string; kind?: string; reason: string }[]
    }[]
  }

  it("draws the caller's cover and a content page in every theme, as SVG files a manifest names", async () => {
    const cwd = await tmp("pptwise-theme-wall-")
    const out = join(cwd, "wall")
    const printed = JSON.parse(
      await runThemeTry("all", { output: out, cwd, title: "账小满：自由职业者的第一本账", subtitle: "新品发布会", json: true }),
    ) as WallManifest & { dir: string }
    expect(printed.dir).toBe(out)
    const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8")) as WallManifest
    const { dir: _dir, ...rest } = printed
    expect(rest).toEqual(manifest)
    expect(manifest).toMatchObject({ generator: "pptwise theme try", lang: "zh", subtitle: "新品发布会", slide: { width: 1280, height: 720 } })
    expect(manifest.themes).toHaveLength(22)
    for (const theme of manifest.themes) {
      expect(theme.source).toBe("builtin")
      expect(theme.skipped).toBeUndefined()
      expect(theme.pages.map((page) => page.type)).toEqual(["cover", "content"])
      for (const page of theme.pages) {
        const svg = await readFile(join(out, page.file), "utf8")
        expect(svg).toMatch(/^<svg\b/)
        // Glyphs may be set one tspan each, so the text is read with the tags taken out.
        const text = svg.replace(/<[^>]+>/g, "")
        if (page.type === "cover") expect(text).toContain("账小满")
        else expect(text).toContain("这一季我们定下的三件事")
      }
    }
    const sheet = await readFile(join(out, manifest.contactSheet), "utf8")
    expect((sheet.match(/<svg\b/g) ?? []).length).toBe(44)
    expect(sheet).toContain("账小满")
  })

  it("defaults the content page to English for a Latin title, and takes --lang over the title", async () => {
    const cwd = await tmp("pptwise-theme-wall-lang-")
    const en = JSON.parse(await runThemeTry("brief", { output: join(cwd, "en"), cwd, title: "Q3 review", json: true })) as WallManifest
    expect(en.lang).toBe("en")
    expect((await readFile(join(cwd, "en", "brief-content.svg"), "utf8")).replace(/<[^>]+>/g, "")).toContain("What we decided")
    const zh = JSON.parse(await runThemeTry("brief", { output: join(cwd, "zh"), cwd, title: "Q3 review", lang: "zh-CN", json: true })) as WallManifest
    expect(zh.lang).toBe("zh")
    await expect(runThemeTry("brief", { cwd, title: "Q3", lang: "fr" })).rejects.toThrow(/unknown --lang "fr".*zh, en/)
  })

  it("draws the caller's content page, and leaves it out of a theme whose menu does not offer its kind", async () => {
    const cwd = await tmp("pptwise-theme-wall-page-")
    const page = join(cwd, "page.json")
    await writeFile(
      page,
      JSON.stringify({ kind: "fact", heading: "Revenue grew", components: [{ type: "kpi_cards", items: [{ value: "38%", label: "year over year" }] }] }),
    )
    const out = join(cwd, "wall")
    const manifest = JSON.parse(await runThemeTry("brief,crayon", { output: out, cwd, title: "Q3 review", page, json: true })) as WallManifest
    const [brief, crayon] = manifest.themes
    expect(brief!.pages).toEqual([
      { type: "cover", file: "brief-cover.svg" },
      { type: "content", kind: "fact", file: "brief-content.svg" },
    ])
    expect((await readFile(join(out, "brief-content.svg"), "utf8")).replace(/<[^>]+>/g, "")).toContain("38%")
    expect(crayon!.pages).toEqual([{ type: "cover", file: "crayon-cover.svg" }])
    expect(crayon!.skipped).toEqual([{ type: "content", kind: "fact", reason: expect.stringMatching(/fact/) }])
    expect((manifest as WallManifest & { notes?: string[] }).notes).toEqual([expect.stringMatching(/^note: crayon left out its content \(fact\) page: /)])
    expect(await readdir(out)).not.toContain("crayon-content.svg")
    expect(await readFile(join(out, "contact-sheet.html"), "utf8")).toContain("tw-missing")
  })

  it("leaves out a cover whose face would cut the title, saying how much of it fits", async () => {
    const cwd = await tmp("pptwise-theme-wall-long-")
    const out = join(cwd, "wall")
    const title = "账小满：自由职业者的第一本账，从今天开始按项目记账，公私分开报税一键出"
    const manifest = JSON.parse(await runThemeTry("stage", { output: out, cwd, title, json: true })) as WallManifest
    expect(manifest.themes[0]!.pages.map((page) => page.type)).toEqual(["content"])
    expect(manifest.themes[0]!.skipped![0]).toMatchObject({ type: "cover", reason: expect.stringMatching(/^heading: .*Shorten the heading/) })
  })

  it("does not leave a page an earlier run drew under a name this run left out", async () => {
    const cwd = await tmp("pptwise-theme-wall-stale-")
    const out = join(cwd, "wall")
    await runThemeTry("crayon", { output: out, cwd, title: "Q3 review" })
    expect(await readdir(out)).toContain("crayon-content.svg")
    const page = join(cwd, "page.json")
    await writeFile(page, JSON.stringify({ kind: "fact", heading: "Revenue", components: [] }))
    await runThemeTry("crayon", { output: out, cwd, title: "Q3 review", page })
    expect(await readdir(out)).not.toContain("crayon-content.svg")
  })

  it("draws a shortlist of four to six themes when no ids are named", async () => {
    const cwd = await tmp("pptwise-theme-wall-shortlist-")
    const plain = JSON.parse(await runThemeTry(undefined, { output: join(cwd, "a"), cwd, title: "Q3 review", json: true })) as WallManifest
    expect(plain.themes.map((theme) => theme.id)).toEqual(["brief", "swiss", "journal", "terminal"])
    const weekly = JSON.parse(
      await runThemeTry(undefined, { output: join(cwd, "b"), cwd, title: "周会改版", occasion: "weekly-brief", json: true }),
    ) as WallManifest
    expect(weekly.themes.map((theme) => theme.id)).toEqual(["bulletin", "brief", "swiss", "journal"])
    const business = JSON.parse(
      await runThemeTry("", { output: join(cwd, "c"), cwd, title: "Q3", occasion: "business,institutional", json: true }),
    ) as WallManifest
    expect(business.themes.length).toBeGreaterThanOrEqual(4)
    expect(business.themes.length).toBeLessThanOrEqual(6)
    expect(business.themes[0]!.id).toBe("bulletin")
    await expect(runThemeTry(undefined, { cwd, title: "Q3", occasion: "wedding" })).rejects.toThrow(/unknown --occasion "wedding"/)
    await expect(runThemeTry("brief", { cwd, title: "Q3", occasion: "business" })).rejects.toThrow(/not both/)
    await expect(runThemeTry(undefined, { cwd })).rejects.toThrow(/expects 2-4 theme ids, or --title/)
    await expect(runThemeTry("brief,swiss", { cwd, occasion: "business" })).rejects.toThrow(/--occasion draw .* need --title/)
  })

  it("says once that a content page failed in every theme, instead of once per theme", async () => {
    const cwd = await tmp("pptwise-theme-wall-badpage-")
    const page = join(cwd, "page.json")
    await writeFile(page, JSON.stringify({ kind: "points", heading: "Why", components: [{ type: "bullets", items: [{ text: "a" }] }] }))
    const summary = await runThemeTry("brief,swiss,memo", { output: join(cwd, "w"), cwd, title: "Q3", page })
    const notes = summary.split("\n").filter((line) => line.startsWith("note:"))
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatch(/^note: every theme left out its content \(points\) page: .*items\.0.*Fix the page, or leave it out/)
    expect(summary).toContain("themes: brief, swiss, memo")
  })

  it("refuses the caller-page flags without --title, and keeps the fixed sample's limits there", async () => {
    const cwd = await tmp("pptwise-theme-wall-flags-")
    await expect(runThemeTry("brief,swiss", { cwd, subtitle: "x", json: true })).rejects.toThrow(/--subtitle, --json .*need --title/)
    await expect(runThemeTry("all", { cwd })).rejects.toThrow(/expects 2-4 theme ids/)
    await expect(runThemeTry("brief,brief", { cwd, title: "Q3" })).rejects.toThrow(/duplicate/)
    await expect(runThemeTry("brief", { cwd, title: "  " })).rejects.toThrow(/--title is empty/)
    const page = join(cwd, "page.json")
    await writeFile(page, JSON.stringify({ type: "cover", heading: "Q3" }))
    await expect(runThemeTry("brief", { cwd, title: "Q3", page })).rejects.toThrow(/holds a cover page/)
  })
})

