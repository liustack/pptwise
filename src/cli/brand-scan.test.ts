// @vitest-environment node
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import { afterEach, describe, expect, it } from "vitest"
import { buildThmxBytes, DEFAULT_THMX_COLORS } from "../themes/extract/__fixtures__/thmx"
import { colorNameWeight, leadFamily, parseColorValue, runBrandScan, scanBrand } from "./brand-scan"

const dirs: string[] = []

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function project(files: Record<string, string | Buffer | Uint8Array>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pptwise-brand-scan-"))
  dirs.push(root)
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    await mkdir(join(abs, ".."), { recursive: true })
    await writeFile(abs, content)
  }
  return root
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#336699" } }).png().toBuffer()
}

const WEBSITE = {
  "src/styles/globals.css": [
    ":root {",
    "  --brand-primary: #C8102E;",
    "  --background: #ffffff;",
    "  --foreground: 222 47% 11%;",
    "  --danger: #E11D48;",
    '  font-family: "Inter", system-ui, sans-serif;',
    "}",
    "h1 { color: #C8102E; font-family: 'Noto Serif SC', serif; }",
  ].join("\n"),
  "tailwind.config.ts": "export default { theme: { extend: { colors: { brand: { DEFAULT: '#C8102E' }, accent: '#1F6FEB' } } } }\n",
  "public/manifest.json": '{ "name": "Acme", "theme_color": "#C8102E" }\n',
  "public/logo.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"></svg>\n',
  // Never read: a dependency, a hidden folder, pptwise's own output, a secret.
  "node_modules/ui/brand.css": ":root { --brand: #00FF00; }\n",
  ".cache/brand.css": ":root { --brand: #00FF01; }\n",
  ".pptwise/decks/old/brand.css": ":root { --brand: #00FF02; }\n",
  ".env": "BRAND_COLOR=#00FF03\n",
  "config/brand-secrets.json": '{ "brand": "#00FF04" }\n',
}

describe("scanBrand", () => {
  it("finds the brand color, its second color, fonts, a logo and slide-sized pictures, and reads nothing it should not", async () => {
    const root = await project({ ...WEBSITE, "public/hero.png": await png(1600, 900), "public/thumb.png": await png(200, 200) })
    const report = await scanBrand(root)
    expect(report.brand).toEqual({ color: "#C8102E", second: "#1F6FEB", from: "tailwind.config.ts" })
    expect(report.colors[0]!.names).toEqual(expect.arrayContaining(["--brand-primary", "theme_color"]))
    // A state color is listed, never picked.
    expect(report.colors.find((color) => color.hex === "#E11D48")!.score).toBeLessThan(1)
    expect(report.fonts.map((font) => font.family)).toEqual(["Inter", "Noto Serif SC"])
    expect(report.logos).toEqual([{ path: "public/logo.svg", format: "svg", width: 240, height: 60, bytes: expect.any(Number), deckReady: false }])
    expect(report.images.map((image) => [image.path, image.width, image.height, image.orientation])).toEqual([["public/hero.png", 1600, 900, "landscape"]])
    const all = JSON.stringify(report)
    for (const hidden of ["#00FF00", "#00FF01", "#00FF02", "#00FF03", "#00FF04"]) expect(all).not.toContain(hidden)
    expect(report.next.themeFork).toBe("pptwise theme fork <theme> --brand '#C8102E,#1F6FEB' -o <deck-dir>/theme.json --id <id>")
    expect(report.next.themeTry).toContain("--brand '#C8102E,#1F6FEB'")
    expect(report.summary).toMatch(/^brand color #C8102E with #1F6FEB \(from tailwind\.config\.ts\), 1 logo candidate \(public\/logo\.svg\), 1 picture large enough for a slide, fonts Inter, Noto Serif SC\.$/)
  })

  it("does not follow a symlink out of the project", async () => {
    const outside = await project({ "brand.css": ":root { --brand: #00FF05; }\n" })
    const root = await project({ "src/a.css": ":root { --brand: #C8102E; }\n" })
    await symlink(outside, join(root, "src", "linked"))
    const report = await scanBrand(root)
    expect(JSON.stringify(report)).not.toContain("#00FF05")
    expect(report.brand.color).toBe("#C8102E")
  })

  it("takes the brand from an Office template, and leaves the stock Office theme out of it", async () => {
    const template = await buildThmxBytes({
      schemeName: "Acme",
      colors: { ...DEFAULT_THMX_COLORS, accent1: "156082", accent2: "E97132" },
      majorFont: "Georgia",
      minorFont: "Verdana",
    })
    const stock = await buildThmxBytes({ schemeName: "Office" })
    const root = await project({ "src/a.css": ":root { --brand: #C8102E; }\n", "templates/acme deck.potx": template, "old/q2.pptx": stock })
    const report = await scanBrand(root)
    expect(report.brand).toEqual({ color: "#156082", second: "#E97132", from: "templates/acme deck.potx" })
    expect(report.office).toEqual([
      { path: "templates/acme deck.potx", kind: "potx", bytes: expect.any(Number), scheme: "Acme", brand: "#156082", second: "#E97132", fonts: { heading: "Georgia", body: "Verdana" } },
      { path: "old/q2.pptx", kind: "pptx", bytes: expect.any(Number), scheme: "Office", brand: "#4472C4", second: "#ED7D31" },
    ])
    expect(report.next.brandExtract).toBe("pptwise brand extract 'templates/acme deck.potx' -o <deck-dir>/theme.json --id <id> --from <theme>")
    expect(report.fonts.map((font) => font.family)).toEqual(["Georgia", "Verdana"])
  })

  it("names no brand color when the project only uses colors without naming them", async () => {
    const root = await project({ "a.css": "p { color: #C8102E; }\nbody { background: #FAFAFA; }\n" })
    const report = await scanBrand(root)
    expect(report.brand).toEqual({})
    expect(report.next).toEqual({})
    expect(report.summary).toMatch(/^no brand color, no logo, 0 pictures large enough for a slide\.$/)
  })

  it("stops at its entry limit and says so", async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 30; i++) files[`f${String(i).padStart(2, "0")}.css`] = ":root { --brand: #C8102E; }\n"
    const root = await project(files)
    const report = await scanBrand(root, { limits: { maxEntries: 10 } })
    expect(report.scanned).toMatchObject({ entries: 10, truncated: true })
    expect(report.summary).toContain("The scan stopped at its limit")
  })

  it("scans the project folder by default, the one holding pptwise.config.json", async () => {
    const root = await project({ "pptwise.config.json": "{}\n", "web/a.css": ":root { --brand: #C8102E; }\n" })
    await mkdir(join(root, "decks", "q3"), { recursive: true })
    const report = await scanBrand(undefined, { cwd: join(root, "decks", "q3") })
    expect(report.root).toBe(root)
    expect(report.brand.color).toBe("#C8102E")
  })

  it("prints a short report, and the whole one with --json", async () => {
    const root = await project(WEBSITE)
    const text = await runBrandScan(root)
    expect(text).toContain("brand color: #C8102E, second color #1F6FEB (from tailwind.config.ts)")
    expect(text).toContain("logo: public/logo.svg (svg 240x60)")
    expect(text).toContain("next:\n  pptwise theme try --title")
    expect(JSON.parse(await runBrandScan(root, { json: true })).brand.color).toBe("#C8102E")
  })

  it("refuses a file in place of a folder", async () => {
    const root = await project({ "a.css": "" })
    await expect(scanBrand(join(root, "a.css"))).rejects.toThrow(/takes a folder/)
  })
})

describe("color and font parsing", () => {
  it("reads hex, rgb, hsl, oklch and the bare hsl triple of a variable", () => {
    expect(parseColorValue("#c8102e")).toBe("#C8102E")
    expect(parseColorValue("#abc")).toBe("#AABBCC")
    expect(parseColorValue("#C8102E80")).toBe("#C8102E")
    expect(parseColorValue("rgb(200, 16, 46)")).toBe("#C8102E")
    expect(parseColorValue("rgb(200 16 46 / 50%)")).toBe("#C8102E")
    expect(parseColorValue("hsl(0, 100%, 50%)")).toBe("#FF0000")
    expect(parseColorValue("0 100% 50%")).toBeNull()
    expect(parseColorValue("0 100% 50%", true)).toBe("#FF0000")
    expect(parseColorValue("oklch(62.8% 0.2577 29.23)")).toBe("#FF0000")
    expect(parseColorValue("var(--brand)")).toBeNull()
  })

  it("weighs names by how strongly they say brand", () => {
    expect(colorNameWeight("brand-primary")).toBe(6)
    expect(colorNameWeight("primary")).toBe(5)
    expect(colorNameWeight("theme_color")).toBe(4)
    expect(colorNameWeight("accent")).toBe(3)
    expect(colorNameWeight("primary-foreground")).toBe(0.25)
    expect(colorNameWeight("hero")).toBe(1)
  })

  it("takes the first real family of a stack", () => {
    expect(leadFamily('-apple-system, "Segoe UI", sans-serif')).toBe("Segoe UI")
    expect(leadFamily("var(--font-sans), Inter")).toBe("Inter")
    expect(leadFamily("system-ui, sans-serif")).toBeNull()
  })
})
