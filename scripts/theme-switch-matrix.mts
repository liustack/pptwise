/**
 * `pnpm theme-switch`: every showcase sample rebound to every built-in
 * theme and built, the way a user switches a deck's theme: one name changed
 * in `deck.spec.json`, nothing else touched.
 *
 * A maintainer's tool. It proves the promise `docs/deck-projects.md` makes
 * (a theme change is a name change) and lists every page whose kind the new
 * theme's menu lacks, with the kind that drew it instead.
 *
 *   pnpm theme-switch                         # every sample, every theme
 *   pnpm theme-switch --decks=memo/zh,brief/en
 *   pnpm theme-switch --themes=crayon,clinic
 *   pnpm theme-switch --bare-boundaries       # covers, chapters and endings without their page files' fill
 *   pnpm theme-switch --json                  # one JSON report on stdout
 *
 * Exits 1 when any build does not pass. Builds run in a temporary folder,
 * removed on exit, so the showcase is only read.
 */
import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runBuild } from "../src/cli/commands"
import { BUILTIN_THEME_IDS } from "../src/ir"
import { installNodePlatform } from "../src/platform/node"
import { validateSpec } from "../src/spec"
import { getThemeDefinition } from "../src/themes/definitions"

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)))
const SHOWCASE = join(ROOT, "showcase")

function flag(name: string): string | undefined {
  const hit = process.argv
    .slice(2)
    .find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return undefined
  const eq = hit.indexOf("=")
  return eq === -1 ? "" : hit.slice(eq + 1)
}

function list(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw === "") return undefined
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

async function showcaseDecks(): Promise<string[]> {
  const decks: string[] = []
  for (const theme of (await readdir(SHOWCASE, { withFileTypes: true })).filter(
    (e) => e.isDirectory()
  )) {
    for (const lang of await readdir(join(SHOWCASE, theme.name), {
      withFileTypes: true,
    })) {
      if (lang.isDirectory()) decks.push(`${theme.name}/${lang.name}`)
    }
  }
  return decks.sort()
}

export interface SwitchLanding {
  page: string
  from: string
  to: string
}

export interface SwitchResult {
  deck: string
  theme: string
  status: "ok" | "needs_revision"
  ms: number
  landings: SwitchLanding[]
  errors: string[]
}

/** Copy `deck` into `work`, bind it to `theme`, build it there, and say what landed where. */
export async function switchAndBuild(
  deck: string,
  theme: string,
  work: string,
  opts: { bareBoundaries?: boolean } = {}
): Promise<SwitchResult> {
  const dir = join(work, deck.replace("/", "-"), theme)
  await cp(join(SHOWCASE, deck), dir, {
    recursive: true,
    filter: (src) => !src.endsWith("deck.json"),
  })
  const specPath = join(dir, "deck.spec.json")
  const spec = JSON.parse(await readFile(specPath, "utf8")) as {
    theme: string
    pages: { id: string; type: string }[]
  }
  spec.theme = theme
  if (opts.bareBoundaries) {
    // Covers, chapters and endings keep only what the spec gives them, so
    // the run measures the content pages, where kinds land.
    for (const page of spec.pages) {
      if (page.type !== "content")
        await writeFile(join(dir, "pages", `${page.id}.json`), "{}\n")
    }
  }
  await writeFile(specPath, JSON.stringify(spec, null, 2))
  const started = performance.now()
  const { output } = await runBuild(dir, {
    json: true,
    cwd: dir,
    gitIgnore: false,
  })
  const ms = Math.round(performance.now() - started)
  const report = JSON.parse(output) as {
    status: "ok" | "needs_revision"
    errors: {
      page?: number
      pageId?: string
      field?: string
      message: string
    }[]
    drawnAs?: { pageId: string; kind: string; drawnAs: string }[]
  }
  const landings = (report.drawnAs ?? []).map((d) => ({
    page: d.pageId,
    from: d.kind,
    to: d.drawnAs,
  }))
  // A spec that failed before build drew anything still names its landings.
  if (report.drawnAs === undefined) {
    const v = validateSpec(spec, { theme: getThemeDefinition(theme) })
    for (const landing of v.landings ?? [])
      landings.push({
        page: landing.pageId,
        from: landing.kind,
        to: landing.lands[0]!,
      })
  }
  return {
    deck,
    theme,
    status: report.status,
    ms,
    landings,
    errors: report.errors.map(
      (e) =>
        `${e.pageId ?? (e.page !== undefined ? `page ${e.page}` : "deck")}${
          e.field ? ` ${e.field}` : ""
        }: ${e.message}`
    ),
  }
}

async function main(): Promise<void> {
  installNodePlatform()
  const decks = list(flag("decks")) ?? (await showcaseDecks())
  const themes = list(flag("themes")) ?? [...BUILTIN_THEME_IDS]
  const work = await mkdtemp(join(tmpdir(), "pptwise-theme-switch-"))
  const results: SwitchResult[] = []
  try {
    for (const deck of decks) {
      for (const theme of themes) {
        const result = await switchAndBuild(deck, theme, work, {
          bareBoundaries: flag("bare-boundaries") !== undefined,
        })
        results.push(result)
        if (flag("json") === undefined) {
          const landed = result.landings
            .map((l) => `${l.page} ${l.from}->${l.to}`)
            .join(", ")
          console.log(
            `${result.status === "ok" ? "ok  " : "FAIL"} ${deck} -> ${theme} (${
              result.ms
            } ms)${landed ? ` · ${landed}` : ""}`
          )
          for (const error of result.errors) console.log(`       ${error}`)
        }
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  const failed = results.filter((r) => r.status !== "ok")
  if (flag("json") !== undefined)
    console.log(JSON.stringify({ results }, null, 2))
  else
    console.log(
      `\n${results.length - failed.length}/${results.length} builds passed`
    )
  if (failed.length > 0) process.exitCode = 1
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main()
