// @vitest-environment node
//
// The theme wall and one-pass build tools of the DSH plugin, driven against a
// fake CLI that answers `theme try --title --json` and `build --json` the way
// the real commands do. What is pinned here is the plugin's half: what each
// tool hands the model, what it writes under the preview root, and what the
// route serves the card from it. The commands themselves have their own
// suites (src/cli/theme-cmd.test.ts, src/cli/build.test.ts).
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

interface Issue {
  stage: string
  page?: number
  pageId?: string
  file?: string
  field?: string
  code?: string
  message: string
}

interface ThemesValue {
  wallId: string
  title: string
  themeCount: number
  themes: { id: string; label: string; skipped?: { type: string; reason: string }[] }[]
  notes?: string[]
}

interface OutlineValue {
  status: "ok" | "invalid"
  outlineId?: string
  title?: string
  theme?: string
  pageCount?: number
  pages?: { page: number; id: string; type: string; kind?: string; heading: string; summary?: string }[]
  errors: { path: string; message: string }[]
  warnings: { path: string; message: string }[]
}

interface BuildValue {
  status: "ok" | "needs_revision"
  pptx?: string
  previewId?: string
  pageCount?: number
  errors: Issue[]
  warnings: Issue[]
  alternatives?: { id: string; name: string }[]
}

interface Tool<A, V> {
  name: string
  parameters: { properties: Record<string, unknown>; required: string[] }
  output: {
    schema: { properties: Record<string, unknown>; required: string[]; additionalProperties: boolean }
    render: (a: unknown, v: V) => { type: string; text: string }[]
    presentationMeta: (a: unknown, v: V) => Record<string, unknown>
  }
  execute: (args: A, exec?: unknown) => Promise<V>
}

interface RouteRegistration {
  handler: (req: { url: string }, res: FakeResponse) => Promise<void>
}

interface FakeResponse {
  writeHead: (status: number, headers: Record<string, string | number>) => void
  end: (body?: string | Buffer) => void
}

interface Service {
  themesTool: Tool<{ title: string; subtitle?: string; lang?: string; occasion?: string; themes?: string[]; page?: unknown }, ThemesValue>
  buildTool: Tool<{ target: string }, BuildValue>
  outlineTool: Tool<{ target: string }, OutlineValue>
  registerRoute: (ctx: { webServer: { register: (r: RouteRegistration) => void } }) => void
  /** The test's own note of where the workspace keeps previews: `previewRoot(workspace)`. */
  root: string
}

interface HostModule {
  createPreviewService: (cliPath: string) => Service
  previewRoot: (anchor: string) => string
  PREVIEW_ROUTE: string
  __testing: {
    sessionCwd: (exec: unknown) => string | undefined
    writeRecord: (root: string, id: string, record: Record<string, unknown>) => Promise<void>
    encodePreviewId: (anchor: string, key: string) => string
  }
}

async function host(): Promise<HostModule> {
  // @ts-expect-error untyped on purpose, like the rest of the plugin
  return import("../dsh/preview-tool.js")
}

/**
 * The two commands, as their JSON reports shape them. Every call is logged
 * with its working directory so a test can see where the CLI was run.
 *
 * `theme try`: two pages per named theme, except that `crayon` refuses the
 * content page, the way a real theme refuses a page it cannot draw.
 *
 * `build`: the deck directory decides the outcome. A `broken` file there makes
 * it a deck that needs revision, `unassembled` one whose pages could not even
 * be drawn, and `crash` a command that fails outright.
 */
const FAKE_CLI = `
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
const argv = process.argv.slice(2)
const home = dirname(process.argv[1])
appendFileSync(join(home, "cli.log"), JSON.stringify({ cwd: process.cwd(), argv }) + "\\n")
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
if (argv[0] === "theme" && argv[1] === "try") {
  const title = opt("--title")
  if (title === "FAIL") { process.stderr.write("unknown theme \\"nope\\"\\n"); process.exit(1) }
  const out = opt("-o")
  // No ids: the CLI draws its own shortlist, here the same three.
  const ids = argv[2].startsWith("--") ? ["brief", "swiss", "crayon"] : argv[2].split(",")
  const page = opt("--page") ? JSON.parse(readFileSync(opt("--page"), "utf8")) : null
  mkdirSync(out, { recursive: true })
  const themes = ids.map((id) => {
    writeFileSync(join(out, id + "-cover.svg"), "<svg><text>" + id + " " + title + "</text></svg>")
    const pages = [{ type: "cover", file: id + "-cover.svg" }]
    const entry = { id, label: id.toUpperCase(), source: "builtin", pages }
    if (id === "crayon") entry.skipped = [{ type: "content", kind: "points", reason: "kind: not offered" }]
    else {
      writeFileSync(join(out, id + "-content.svg"), "<svg><text>" + (page ? page.heading : "default") + "</text></svg>")
      pages.push({ type: "content", kind: "points", file: id + "-content.svg" })
    }
    return entry
  })
  writeFileSync(join(out, "contact-sheet.html"), "<!doctype html><title>sheet " + title + "</title>")
  const manifest = { manifestVersion: 1, generator: "pptwise theme try", title, ...(opt("--subtitle") ? { subtitle: opt("--subtitle") } : {}), lang: opt("--lang") || "en", slide: { width: 1280, height: 720 }, contactSheet: "contact-sheet.html", themes }
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest))
  const notes = ids.includes("crayon") ? { notes: ["note: crayon left out its content (points) page: kind: not offered"] } : {}
  process.stdout.write(JSON.stringify({ dir: out, ...manifest, ...notes }, null, 2) + "\\n")
} else if (argv[0] === "build") {
  const target = resolve(argv[1])
  const name = basename(target)
  if (existsSync(join(target, "crash"))) { process.stderr.write("nothing to build at " + target + "\\n"); process.exit(1) }
  const out = join(process.cwd(), ".pptwise", name)
  mkdirSync(out, { recursive: true })
  const broken = existsSync(join(target, "broken"))
  const unassembled = existsSync(join(target, "unassembled"))
  let preview = null
  if (!unassembled) {
    writeFileSync(join(out, "001-cover.svg"), "<svg>cover</svg>")
    writeFileSync(join(out, "002-why.svg"), "<svg>why</svg>")
    writeFileSync(join(out, "preview.html"), "<!doctype html><title>deck " + name + "</title>")
    const pages = [{ page: 1, id: "cover", type: "cover", file: "001-cover.svg" }, { page: 2, id: "why", type: "content", file: "002-why.svg" }]
    writeFileSync(join(out, "manifest.json"), JSON.stringify({ title: name, pages, ...(broken ? {} : { checks: { ran: true } }) }))
    preview = { dir: out, html: join(out, "preview.html"), manifest: join(out, "manifest.json"), pages: pages.map((p) => ({ page: p.page, id: p.id, type: p.type, file: join(out, p.file) })) }
  }
  const pptx = join(out, name + ".pptx")
  const errors = unassembled
    ? [{ stage: "assemble", pageId: "why", file: "pages/why.json", message: "page \\"why\\": not valid JSON" }]
    : broken
      ? [{ stage: "audit", page: 2, pageId: "why", file: "pages/why.json", code: "monotony", message: "three bullet pages in a row", detail: { componentType: "bullets" } }]
      : []
  if (errors.length === 0) writeFileSync(pptx, "PK-" + name)
  let alternatives
  if (!unassembled && existsSync(join(target, "alternatives"))) {
    const dir = join(out, "alternatives")
    mkdirSync(dir, { recursive: true })
    alternatives = { dir, ms: 42, themes: ["memo", "swiss"].map((id) => {
      writeFileSync(join(dir, id + "-01.svg"), "<svg>" + id + " cover</svg>")
      writeFileSync(join(dir, id + "-02.svg"), "<svg>" + id + " why</svg>")
      return { theme: id, name: id[0].toUpperCase() + id.slice(1), pages: [{ page: 1, id: "cover", type: "cover", file: join(dir, id + "-01.svg") }, { page: 2, id: "why", type: "content", file: join(dir, id + "-02.svg") }] }
    }) }
  }
  const warnings = existsSync(join(target, "clean")) ? [] : [{ stage: "validate", page: 1, pageId: "cover", field: "heading", message: "long heading" }]
  const report = { status: errors.length === 0 ? "ok" : "needs_revision", target, theme: "brief", ...(unassembled ? {} : { pageCount: 2 }), audited: !unassembled, errors, warnings, preview, pptx: errors.length === 0 ? pptx : null, ...(alternatives ? { alternatives } : {}), notes: [] }
  process.stdout.write(JSON.stringify(report, null, 2) + "\\n")
  if (errors.length > 0) process.exitCode = 1
} else if (argv[0] === "spec" && argv[1] === "validate") {
  const spec = JSON.parse(readFileSync(argv[2], "utf8"))
  if (!Array.isArray(spec.pages) || spec.pages.length === 0) {
    process.stdout.write(JSON.stringify({ ok: false, errors: [{ path: "pages", message: "spec has no pages" }], warnings: [] }) + "\\n")
    process.exitCode = 1
  } else {
    const pages = spec.pages.map((p, i) => ({ page: i + 1, id: p.id, type: p.type, ...(p.kind ? { kind: p.kind } : {}), heading: p.heading, ...(p.summary ? { summary: p.summary } : {}) }))
    process.stdout.write(JSON.stringify({ ok: true, theme: spec.theme, narrative: { strategy: "briefing", pacing: "balanced", audience: "public" }, title: pages[0].heading, pageCount: pages.length, pages, warnings: [] }) + "\\n")
  }
} else {
  process.stderr.write("unsupported command\\n")
  process.exit(3)
}
`

/** The directory a public id names inside its project's preview root: everything after the first dash. */
function keyOf(id: string): string {
  return id.slice(id.indexOf("-") + 1)
}

/** A fake CLI, a workspace with its preview root, and a service on top. */
async function setup(tag: string): Promise<{ svc: Service; cliPath: string; workspace: string; route: string; handler: RouteRegistration["handler"] }> {
  const base = await mkdtemp(join(tmpdir(), `pptwise-dsh-tools-${tag}-`))
  const cliPath = join(base, "cli.mjs")
  await writeFile(cliPath, FAKE_CLI)
  await writeFile(join(base, "cli.log"), "")
  const workspace = join(base, "workspace")
  await mkdir(workspace)
  const { createPreviewService, previewRoot, PREVIEW_ROUTE } = await host()
  const svc = Object.assign(createPreviewService(cliPath), { root: previewRoot(workspace) })
  let captured: RouteRegistration | undefined
  svc.registerRoute({ webServer: { register: (r) => { captured = r } } })
  if (!captured) throw new Error("registerRoute registered nothing")
  return { svc, cliPath, workspace, route: PREVIEW_ROUTE, handler: captured.handler }
}

/** A DSH tool call made inside a session whose working directory is `cwd`. */
function inSession(cwd: string): unknown {
  return { signal: new AbortController().signal, agent: { session: { header: { cwd } } } }
}

async function calls(cliPath: string): Promise<{ cwd: string; argv: string[] }[]> {
  const log = await readFile(join(cliPath, "..", "cli.log"), "utf8")
  return log
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as { cwd: string; argv: string[] })
}

async function request(handler: RouteRegistration["handler"], url: string): Promise<{ status: number; body: Buffer }> {
  let status = 0
  const chunks: Buffer[] = []
  await handler(
    { url },
    {
      writeHead(s) {
        status = s
      },
      end(body) {
        if (body !== undefined) chunks.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body)))
      },
    },
  )
  return { status, body: Buffer.concat(chunks) }
}

/** A deck directory in the workspace, with marker files that steer the fake build. */
async function deck(workspace: string, markers: string[] = []): Promise<string> {
  const dir = join(workspace, "weekly")
  await mkdir(dir, { recursive: true })
  for (const marker of markers) await writeFile(join(dir, marker), "")
  return dir
}

/** Every key the value carries is one its declared schema names, and every required one is there. */
function matchesSchema(value: object, schema: Tool<unknown, unknown>["output"]["schema"]): void {
  expect(schema.additionalProperties).toBe(false)
  for (const key of Object.keys(value)) expect(Object.keys(schema.properties)).toContain(key)
  for (const key of schema.required) expect(value).toHaveProperty(key)
}

describe("pptwise_themes", () => {
  it("draws the caller's title in the conversation's workspace and hands the model names, never pages", async () => {
    const { svc, cliPath, workspace } = await setup("themes-value")
    const page = { kind: "points", heading: "What we decided", components: [{ type: "bullets", items: ["a", "b", "c"] }] }
    const value = await svc.themesTool.execute({ title: "Q3 review", subtitle: "Board", lang: "en", page }, inSession(workspace))

    expect(value).toEqual({
      wallId: value.wallId,
      title: "Q3 review",
      themeCount: 3,
      themes: [
        { id: "brief", label: "BRIEF" },
        { id: "swiss", label: "SWISS" },
        { id: "crayon", label: "CRAYON", skipped: [{ type: "content", reason: "kind: not offered" }] },
      ],
      notes: ["note: crayon left out its content (points) page: kind: not offered"],
    })
    expect(JSON.stringify(value)).not.toMatch(/<svg/)
    matchesSchema(value, svc.themesTool.output.schema)

    const [call] = await calls(cliPath)
    expect(await realpath(call!.cwd)).toBe(await realpath(workspace))
    const stage = call!.argv[call!.argv.indexOf("-o") + 1]!
    expect(call!.argv).toEqual([
      "theme", "try", "--title", "Q3 review", "--json", "-o", stage,
      "--subtitle", "Board", "--lang", "en", "--page", join(stage, "sample-page.json"),
    ])
    // Published under the wall's own id, with the staging name gone.
    expect(stage).toBe(join(svc.root, `${keyOf(value.wallId)}.partial`))
    expect(await readdir(svc.root)).toEqual([keyOf(value.wallId)])
    expect(JSON.parse(await readFile(join(svc.root, keyOf(value.wallId), "sample-page.json"), "utf8"))).toEqual(page)
    // The wall lives in the workspace's .pptwise/, which keeps itself out of git.
    expect(await readFile(join(workspace, ".pptwise", ".gitignore"), "utf8")).toBe("*\n")
  })

  it("passes only the themes asked for", async () => {
    const { svc, cliPath, workspace } = await setup("themes-named")
    const value = await svc.themesTool.execute({ title: "Q3", themes: ["brief", "swiss"] }, inSession(workspace))
    expect(value.themes.map((t) => t.id)).toEqual(["brief", "swiss"])
    expect((await calls(cliPath))[0]!.argv.slice(0, 3)).toEqual(["theme", "try", "brief,swiss"])
  })

  it("passes the occasion so the CLI picks the shortlist, and ignores it when themes are named", async () => {
    const { svc, cliPath, workspace } = await setup("themes-occasion")
    await svc.themesTool.execute({ title: "周会", occasion: "weekly-brief" }, inSession(workspace))
    await svc.themesTool.execute({ title: "周会", occasion: "weekly-brief", themes: ["brief", "swiss"] }, inSession(workspace))
    const [shortlist, named] = await calls(cliPath)
    expect(shortlist!.argv.slice(0, 4)).toEqual(["theme", "try", "--title", "周会"])
    expect(shortlist!.argv).toContain("--occasion")
    expect(shortlist!.argv[shortlist!.argv.indexOf("--occasion") + 1]).toBe("weekly-brief")
    expect(named!.argv.slice(0, 3)).toEqual(["theme", "try", "brief,swiss"])
    expect(named!.argv).not.toContain("--occasion")
  })

  it("tells the model the user is choosing, and stamps the id the card fetches the wall by", async () => {
    const { svc, workspace } = await setup("themes-text")
    const value = await svc.themesTool.execute({ title: "Q3 review" }, inSession(workspace))
    const text = svc.themesTool.output.render({}, value)[0]!.text

    expect(text.split("\n")[0]).toBe(`pptwise-themes:${value.wallId} · drew 3 themes for "Q3 review", a cover and one content page each`)
    expect(text).toMatch(/Ask which theme they want/)
    expect(text.split("\n")[1]).toBe("In the card, numbered: 1 brief, 2 swiss, 3 crayon.")
    expect(text).toMatch(/one option per theme in this order, each label starting with its number/)
    expect(text).toContain("note: crayon left out its content (points) page: kind: not offered")
    expect(svc.themesTool.output.presentationMeta({}, value)).toEqual({ card: "pptwise-themes", wallId: value.wallId })
  })

  it("serves the wall to the card: every page inlined, the contact sheet as the viewer, and no download", async () => {
    const { svc, workspace, route, handler } = await setup("themes-route")
    const value = await svc.themesTool.execute({ title: "Q3 review" }, inSession(workspace))

    const bundle = await request(handler, `${route}/${value.wallId}`)
    expect(bundle.status).toBe(200)
    const wall = JSON.parse(bundle.body.toString("utf8")) as { kind: string; title: string; themes: { id: string; pages: { type: string; svg: string }[] }[] }
    expect(wall.kind).toBe("themes")
    expect(wall.title).toBe("Q3 review")
    expect(wall.themes.map((t) => [t.id, t.pages.map((p) => p.type)])).toEqual([
      ["brief", ["cover", "content"]],
      ["swiss", ["cover", "content"]],
      ["crayon", ["cover"]],
    ])
    expect(wall.themes[0]!.pages[0]!.svg).toBe("<svg><text>brief Q3 review</text></svg>")

    const html = await request(handler, `${route}/${value.wallId}/html`)
    expect(html.status).toBe(200)
    expect(html.body.toString("utf8")).toBe("<!doctype html><title>sheet Q3 review</title>")

    const pptx = await request(handler, `${route}/${value.wallId}/pptx`)
    expect(pptx.status).toBe(410)
    expect(JSON.parse(pptx.body.toString("utf8"))).toMatchObject({ error: "a theme wall has no deck to download" })
  })

  it("throws the command's own reason and leaves nothing under the preview root", async () => {
    const { svc, workspace } = await setup("themes-fail")
    await expect(svc.themesTool.execute({ title: "FAIL" }, inSession(workspace))).rejects.toThrow('unknown theme "nope"')
    expect(await readdir(svc.root)).toEqual([])
  })

  it("draws nothing, and says why, in a call that has no workspace", async () => {
    // A theme wall belongs to no deck, so there is no target to fall back on:
    // without the session's working directory there is nowhere to put it.
    const { svc, cliPath } = await setup("themes-no-session")
    await expect(svc.themesTool.execute({ title: "Q3" }, { signal: new AbortController().signal })).rejects.toThrow(
      /no project folder/,
    )
    expect(await calls(cliPath)).toEqual([])
  })
})

describe("pptwise_build", () => {
  it("returns the deck's one .pptx, written where the CLI writes it in the conversation's workspace", async () => {
    const { svc, cliPath, workspace, route, handler } = await setup("build-ok")
    const target = await deck(workspace)
    const value = await svc.buildTool.execute({ target }, inSession(workspace))
    const [call] = await calls(cliPath)
    expect(await realpath(call!.cwd)).toBe(await realpath(workspace))
    expect(call!.argv).toEqual(["build", target, "--json"])
    // The path the CLI itself reports: its own working directory, which is the
    // workspace in whatever spelling the OS hands a child (Windows keeps an 8.3
    // short name where realpath would expand it).
    const pptx = join(call!.cwd, ".pptwise", "weekly", "weekly.pptx")

    expect(value).toEqual({
      status: "ok",
      pptx,
      previewId: value.previewId,
      pageCount: 2,
      errors: [],
      warnings: [{ stage: "validate", page: 1, pageId: "cover", field: "heading", message: "long heading" }],
    })
    matchesSchema(value, svc.buildTool.output.schema)

    const text = svc.buildTool.output.render({}, value)[0]!.text
    expect(text.split("\n")[0]).toBe(`pptwise-preview:${value.previewId} · rendered 2 pages · build passed with 1 warning, listed below`)
    expect(text).toContain(`The deck's one .pptx is ${pptx}. Deliver this file as it is. Do not render, copy or rename another .pptx.`)
    expect(text).toContain("warning: page 1 (cover) — heading: long heading (validate)")

    // The card's copy: this build's pages, and the export it downloads.
    const bundle = JSON.parse((await request(handler, `${route}/${value.previewId}`)).body.toString("utf8")) as {
      exportable: boolean
      pages: { svg: string }[]
    }
    expect(bundle.exportable).toBe(true)
    expect(bundle.pages.map((p) => p.svg)).toEqual(["<svg>cover</svg>", "<svg>why</svg>"])
    expect((await request(handler, `${route}/${value.previewId}/html`)).body.toString("utf8")).toBe(
      "<!doctype html><title>deck weekly</title>",
    )
    const download = await request(handler, `${route}/${value.previewId}/pptx`)
    expect(download.status).toBe(200)
    expect(download.body.toString("utf8")).toBe("PK-weekly")
  })

  it("says every check is clean only when there is no warning", async () => {
    const { svc, workspace } = await setup("build-clean")
    const target = await deck(workspace, ["clean"])
    const value = await svc.buildTool.execute({ target }, inSession(workspace))
    expect(value.warnings).toEqual([])
    const text = svc.buildTool.output.render({}, value)[0]!.text
    expect(text.split("\n")[0]).toBe(`pptwise-preview:${value.previewId} · rendered 2 pages · build passed: every check is clean`)
  })

  it("returns each problem with its page, file and field, and shows the pages without a download", async () => {
    const { svc, workspace, route, handler } = await setup("build-revise")
    const target = await deck(workspace, ["broken"])
    const value = await svc.buildTool.execute({ target }, inSession(workspace))

    expect(value.status).toBe("needs_revision")
    expect(value).not.toHaveProperty("pptx")
    // The audit's own detail object stays in the CLI's report: the message says it.
    expect(value.errors).toEqual([
      { stage: "audit", page: 2, pageId: "why", file: "pages/why.json", code: "monotony", message: "three bullet pages in a row" },
    ])
    matchesSchema(value, svc.buildTool.output.schema)

    const text = svc.buildTool.output.render({}, value)[0]!.text
    expect(text.split("\n").slice(0, 3)).toEqual([
      `pptwise-preview:${value.previewId} · rendered 2 pages · needs revision: 1 problem, no .pptx written`,
      "- page 2 (why) — pages/why.json: [monotony] three bullet pages in a row (audit)",
      "Fix each file named above, then call pptwise_build again.",
    ])

    const bundle = JSON.parse((await request(handler, `${route}/${value.previewId}`)).body.toString("utf8")) as { exportable: boolean }
    expect(bundle.exportable).toBe(false)
    const download = await request(handler, `${route}/${value.previewId}/pptx`)
    expect(download.status).toBe(410)
    expect(JSON.parse(download.body.toString("utf8"))).toMatchObject({ error: "this build needs revision, so it wrote no .pptx" })
    // Nothing in the preview root but the one published build.
    expect(await readdir(svc.root)).toEqual([keyOf(value.previewId!)])
  })

  it("publishes nothing when the build could not draw a page", async () => {
    const { svc, workspace } = await setup("build-unassembled")
    const target = await deck(workspace, ["unassembled"])
    const value = await svc.buildTool.execute({ target }, inSession(workspace))

    expect(value).toEqual({
      status: "needs_revision",
      errors: [{ stage: "assemble", pageId: "why", file: "pages/why.json", message: 'page "why": not valid JSON' }],
      warnings: [{ stage: "validate", page: 1, pageId: "cover", field: "heading", message: "long heading" }],
    })
    const text = svc.buildTool.output.render({}, value)[0]!.text
    expect(text).not.toContain("pptwise-preview:")
    expect(text.split("\n")[0]).toBe("needs revision: 1 problem, no .pptx written")
    expect(await readdir(svc.root).catch(() => [])).toEqual([])
  })

  it("keeps the deck's pages in other themes with the card, and tells the model not to stop for them", async () => {
    const { svc, workspace, route, handler } = await setup("build-alternatives")
    const target = await deck(workspace, ["alternatives"])
    const value = await svc.buildTool.execute({ target }, inSession(workspace))
    expect(value.alternatives).toEqual([
      { id: "memo", name: "Memo" },
      { id: "swiss", name: "Swiss" },
    ])
    matchesSchema(value, svc.buildTool.output.schema)
    const text = svc.buildTool.output.render({}, value)[0]!.text
    expect(text).toContain(
      'Under the pages, the card also shows this deck in other themes, numbered: 1 memo (Memo), 2 swiss (Swiss). Do not stop to ask about them. If the user asks for one, set "theme" in deck.spec.json to its id, change nothing else, and call pptwise_build again.',
    )
    // Copied, not pointed at: the next build may redraw the CLI's own folder.
    await rm(join(workspace, ".pptwise", "weekly", "alternatives"), { recursive: true })
    const bundle = JSON.parse((await request(handler, `${route}/${value.previewId}`)).body.toString("utf8")) as {
      pages: { svg: string }[]
      alternatives: { id: string; label: string; pages: { page: number; type: string; svg: string }[] }[]
    }
    expect(bundle.pages.map((p) => p.svg)).toEqual(["<svg>cover</svg>", "<svg>why</svg>"])
    expect(bundle.alternatives.map((t) => [t.id, t.label, t.pages.map((p) => [p.page, p.type, p.svg])])).toEqual([
      ["memo", "Memo", [[1, "cover", "<svg>memo cover</svg>"], [2, "content", "<svg>memo why</svg>"]]],
      ["swiss", "Swiss", [[1, "cover", "<svg>swiss cover</svg>"], [2, "content", "<svg>swiss why</svg>"]]],
    ])
  })

  it("says nothing about other themes when the build drew none", async () => {
    const { svc, workspace, route, handler } = await setup("build-no-alternatives")
    const target = await deck(workspace)
    const value = await svc.buildTool.execute({ target }, inSession(workspace))
    expect(value).not.toHaveProperty("alternatives")
    expect(svc.buildTool.output.render({}, value)[0]!.text).not.toContain("other themes")
    const bundle = JSON.parse((await request(handler, `${route}/${value.previewId}`)).body.toString("utf8")) as Record<string, unknown>
    expect(bundle).not.toHaveProperty("alternatives")
  })

  it("throws when the command fails outright rather than reporting a revision", async () => {
    const { svc, workspace } = await setup("build-crash")
    const target = await deck(workspace, ["crash"])
    await expect(svc.buildTool.execute({ target }, inSession(workspace))).rejects.toThrow(/nothing to build at/)
  })
})

describe("the page route and page fingerprints", () => {
  it("serves each drawn page on its own, with a fingerprint per page in the bundle", async () => {
    const { svc, workspace, route, handler } = await setup("page-route")
    const target = await deck(workspace)
    const value = await svc.buildTool.execute({ target }, inSession(workspace))
    const id = value.previewId!
    const bundle = JSON.parse((await request(handler, `${route}/${id}`)).body.toString("utf8")) as { pages: { hash: string }[] }
    expect(bundle.pages.map((p) => p.hash)).toHaveLength(2)
    for (const p of bundle.pages) expect(p.hash).toMatch(/^[0-9a-f]{16}$/)
    expect(bundle.pages[0]!.hash).not.toBe(bundle.pages[1]!.hash)

    const second = await request(handler, `${route}/${id}/page/2`)
    expect(second.status).toBe(200)
    expect(second.body.toString("utf8")).toBe("<svg>why</svg>")
    expect((await request(handler, `${route}/${id}/page/3`)).status).toBe(404)
    // The same deck built again keeps each unchanged page's fingerprint.
    const again = await svc.buildTool.execute({ target }, inSession(workspace))
    const rebuilt = JSON.parse((await request(handler, `${route}/${again.previewId}`)).body.toString("utf8")) as { pages: { hash: string }[] }
    expect(rebuilt.pages.map((p) => p.hash)).toEqual(bundle.pages.map((p) => p.hash))
  })

  it("has no page route for an id it does not know, or a path that is not a page number", async () => {
    const { route, handler } = await setup("page-route-bad")
    expect((await request(handler, `${route}/00000000-0000-4000-8000-000000000999/page/1`)).status).toBe(404)
    expect((await request(handler, `${route}/../../etc/page/1`)).status).toBe(404)
  })
})

describe("pptwise_outline", () => {
  const SPEC = {
    theme: "brief",
    pages: [
      { id: "cover", type: "cover", heading: "周会" },
      { id: "done", type: "content", kind: "points", heading: "本周完成", summary: "三件事" },
      { id: "next", type: "content", kind: "points", heading: "下周计划" },
      { id: "end", type: "ending", heading: "谢谢" },
    ],
  }

  it("reads the spec of a deck directory and shows every page as a row, with the id the card fetches by", async () => {
    const { svc, cliPath, workspace, route, handler } = await setup("outline")
    const dir = await deck(workspace)
    await writeFile(join(dir, "deck.spec.json"), JSON.stringify(SPEC))
    const value = await svc.outlineTool.execute({ target: "weekly" }, inSession(workspace))
    matchesSchema(value, svc.outlineTool.output.schema)
    expect(value).toMatchObject({ status: "ok", theme: "brief", title: "周会", pageCount: 4 })
    expect(value.pages!.map((p) => p.heading)).toEqual(["周会", "本周完成", "下周计划", "谢谢"])
    expect((await calls(cliPath)).at(-1)!.argv).toEqual(["spec", "validate", join(dir, "deck.spec.json"), "--json"])

    const text = svc.outlineTool.output.render({}, value)[0]!.text
    const lines = text.split("\n")
    expect(lines[0]).toBe(`pptwise-outline:${value.outlineId} · 4 pages, theme "brief"`)
    expect(lines[2]).toBe("2. [content/points] 本周完成 (三件事)")
    expect(text).toContain("ask_user_question")
    expect(svc.outlineTool.output.presentationMeta({}, value)).toEqual({ card: "pptwise-outline", outlineId: value.outlineId })

    const bundle = await request(handler, `${route}/${value.outlineId}`)
    expect(bundle.status).toBe(200)
    expect(JSON.parse(bundle.body.toString("utf8"))).toMatchObject({ kind: "outline", pageCount: 4, pages: value.pages })
    // No pages drawn, so nothing to view and nothing to download.
    expect((await request(handler, `${route}/${value.outlineId}/html`)).status).toBe(404)
    expect((await request(handler, `${route}/${value.outlineId}/pptx`)).status).toBe(410)
  })

  it("hands an invalid spec's problems to the model and draws no card", async () => {
    const { svc, workspace } = await setup("outline-bad")
    const dir = await deck(workspace)
    await writeFile(join(dir, "deck.spec.json"), JSON.stringify({ theme: "brief", pages: [] }))
    const before = await readdir(svc.root).catch(() => [])
    const value = await svc.outlineTool.execute({ target: join(dir, "deck.spec.json") }, inSession(workspace))
    matchesSchema(value, svc.outlineTool.output.schema)
    expect(value).toEqual({ status: "invalid", errors: [{ path: "pages", message: "spec has no pages" }], warnings: [] })
    expect(svc.outlineTool.output.render({}, value)[0]!.text).toMatch(/^the spec is not valid yet: 1 problem, no outline card drawn\n- pages: spec has no pages/)
    expect(await readdir(svc.root).catch(() => [])).toEqual(before)
  })
})

describe("records from the newer tools", () => {
  it("refuses a record kind this version does not know, as damage rather than an unknown id", async () => {
    const { svc, route, handler, workspace } = await setup("record-kind")
    const { __testing } = await host()
    const id = "00000000-0000-4000-8000-000000000123"
    await mkdir(join(svc.root, id), { recursive: true })
    await writeFile(join(svc.root, id, "manifest.json"), JSON.stringify({ pages: [] }))
    await __testing.writeRecord(svc.root, id, { kind: "slideshow", target: "x", created: Date.now() })

    const answer = await request(handler, `${route}/${__testing.encodePreviewId(workspace, id)}`)
    expect(answer.status).toBe(410)
    expect(JSON.parse(answer.body.toString("utf8"))).toMatchObject({ code: "preview_damaged" })
  })

  it("reads the workspace off the session, and nothing off a call made outside one", async () => {
    const { __testing } = await host()
    expect(__testing.sessionCwd({ agent: { session: { header: { cwd: "/w" } } } })).toBe("/w")
    expect(__testing.sessionCwd({ agent: { session: { header: {} } } })).toBeUndefined()
    expect(__testing.sessionCwd(undefined)).toBeUndefined()
  })
})

/** Both sides of a path comparison go through this: the CLI child reports its
 *  cwd as the OS spells it (macOS resolves /var to /private/var, Windows keeps
 *  an 8.3 short name), so only the resolved forms are comparable. */
async function realpath(path: string): Promise<string> {
  const { realpath: resolveReal } = await import("node:fs/promises")
  return resolveReal(path)
}
