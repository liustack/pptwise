/**
 * Redraws the README's sample pictures under `assets/gallery/` from the
 * showcase decks, one command for both languages:
 *
 *   pnpm build && pnpm tsx scripts/readme-gallery.mts
 *
 * It renders with the built CLI in `dist/` (so build first), the same
 * `pptwise preview` a user runs, and rasterises the SVG pages with sharp.
 * Per language (`en` for README.md, `zh` for README.zh-CN.md) it writes:
 *
 *   mosaic-<lang>.webp            every theme on one sheet, 4 x 6 pages
 *   <theme>-<page>-<lang>.webp    the featured single pages, 1280 x 720
 *
 * The page picks live in MOSAIC and FEATURED below. A page number is the
 * same page in both languages, since each theme's zh and en decks share one
 * page order. Anything else left in `assets/gallery/` is removed, so a
 * changed pick never leaves an orphan behind. The README markup is written
 * by hand: rerun this after a theme's sample changes, then check the README
 * alt text and links still describe the pages.
 *
 * The pictures are for GitHub only. `assets/` is not in package.json
 * `files`, so none of this reaches the npm package.
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp, { type Sharp } from "sharp"

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)))
const CLI = join(ROOT, "dist/cli.js")
const OUT = join(ROOT, "assets/gallery")
const LANGS = ["en", "zh"] as const
type Lang = (typeof LANGS)[number]

interface Pick {
  theme: string
  /** 1-based page number in the showcase deck. */
  page: number
}

/** One page per theme, read left to right, top to bottom. */
const MOSAIC: Pick[] = [
  { theme: "ember", page: 1 },
  { theme: "profile", page: 1 },
  { theme: "luxe", page: 1 },
  { theme: "proposal", page: 1 },
  { theme: "journal", page: 1 },
  { theme: "stage", page: 4 },
  { theme: "crayon", page: 1 },
  { theme: "terminal", page: 3 },
  { theme: "museum", page: 1 },
  { theme: "almanac", page: 1 },
  { theme: "rally", page: 1 },
  { theme: "thesis", page: 7 },
  { theme: "ink", page: 1 },
  { theme: "ledger", page: 3 },
  { theme: "recap", page: 1 },
  { theme: "runway", page: 1 },
  { theme: "bulletin", page: 1 },
  { theme: "clinic", page: 1 },
  { theme: "lecture", page: 1 },
  { theme: "swiss", page: 2 },
  { theme: "homeroom", page: 1 },
  { theme: "vermilion", page: 13 },
  { theme: "memo", page: 1 },
  { theme: "brief", page: 4 },
]

/** The single pages shown large under the mosaic, two to a row. */
const FEATURED: Pick[] = [
  { theme: "profile", page: 11 },
  { theme: "luxe", page: 13 },
  { theme: "recap", page: 3 },
  { theme: "stage", page: 9 },
  { theme: "proposal", page: 3 },
  { theme: "rally", page: 18 },
  { theme: "runway", page: 12 },
  { theme: "ink", page: 15 },
]

const COLS = 4
const TILE_W = 640
const TILE_H = 360
const GAP = 12
const BACKGROUND = "#9a9a96"
const MOSAIC_BUDGET = 1.5 * 1024 * 1024
const PAGE_BUDGET = 250 * 1024

function fail(message: string): never {
  console.error(`readme-gallery: ${message}`)
  process.exit(1)
}

/** Encodes at the highest quality that fits the byte budget. */
async function webpWithin(image: Sharp, budget: number, label: string): Promise<Buffer> {
  for (let quality = 86; quality >= 50; quality -= 4) {
    const out = await image.clone().webp({ quality, effort: 6 }).toBuffer()
    if (out.length <= budget) return out
  }
  fail(`${label} does not fit ${Math.round(budget / 1024)} KB even at quality 50`)
}

/** Renders one showcase deck with the built CLI and returns its SVG pages in order. */
function renderDeck(work: string, theme: string, lang: Lang): string[] {
  const deck = join(ROOT, "showcase", theme, lang)
  if (!existsSync(deck)) fail(`no showcase deck at showcase/${theme}/${lang}`)
  const dir = join(work, `${theme}-${lang}`)
  execFileSync("node", [CLI, "preview", deck, "-o", dir, "--no-git-ignore"], { stdio: "ignore" })
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort()
    .map((f) => join(dir, f))
}

function pageSvg(pages: Map<string, string[]>, pick: Pick, lang: Lang): Buffer {
  const files = pages.get(`${pick.theme}-${lang}`)!
  const file = files[pick.page - 1]
  if (!file) fail(`${pick.theme} ${lang} has ${files.length} pages, no page ${pick.page}`)
  return readFileSync(file)
}

async function main(): Promise<void> {
  if (!existsSync(CLI)) fail("dist/cli.js is missing, run pnpm build first")
  const themes = new Set(MOSAIC.map((p) => p.theme))
  const showcase = readdirSync(join(ROOT, "showcase"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const missing = showcase.filter((t) => !themes.has(t))
  if (missing.length > 0) fail(`the mosaic leaves out ${missing.join(", ")}`)
  if (MOSAIC.length !== themes.size) fail("the mosaic shows a theme twice")
  if (MOSAIC.length % COLS !== 0) fail(`the mosaic needs a multiple of ${COLS} pages`)

  const work = mkdtempSync(join(tmpdir(), "pptwise-readme-gallery-"))
  try {
    const pages = new Map<string, string[]>()
    for (const lang of LANGS) {
      for (const theme of new Set([...themes, ...FEATURED.map((p) => p.theme)])) {
        pages.set(`${theme}-${lang}`, renderDeck(work, theme, lang))
      }
    }

    mkdirSync(OUT, { recursive: true })
    const written = new Set<string>()
    const write = (name: string, data: Buffer): void => {
      writeFileSync(join(OUT, name), data)
      written.add(name)
      console.log(`${name}  ${(data.length / 1024).toFixed(0)} KB`)
    }

    for (const lang of LANGS) {
      const rows = MOSAIC.length / COLS
      const tiles = await Promise.all(
        MOSAIC.map(async (pick, i) => ({
          input: await sharp(pageSvg(pages, pick, lang), { density: 144 })
            .resize(TILE_W, TILE_H)
            .png()
            .toBuffer(),
          left: GAP + (i % COLS) * (TILE_W + GAP),
          top: GAP + Math.floor(i / COLS) * (TILE_H + GAP),
        })),
      )
      const sheet = sharp({
        create: {
          width: GAP + COLS * (TILE_W + GAP),
          height: GAP + rows * (TILE_H + GAP),
          channels: 3,
          background: BACKGROUND,
        },
      }).composite(tiles)
      const name = `mosaic-${lang}.webp`
      write(name, await webpWithin(sharp(await sheet.png().toBuffer()), MOSAIC_BUDGET, name))

      for (const pick of FEATURED) {
        const page = sharp(pageSvg(pages, pick, lang), { density: 144 }).resize(1280, 720)
        const name = `${pick.theme}-${String(pick.page).padStart(2, "0")}-${lang}.webp`
        write(name, await webpWithin(page, PAGE_BUDGET, name))
      }
    }

    for (const name of readdirSync(OUT)) {
      if (!written.has(name)) rmSync(join(OUT, name))
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

await main()
