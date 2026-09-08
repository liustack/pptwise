export interface EvalArgs {
  full: boolean
  l1Only: boolean
  pages?: string[]
  from?: string
  out?: string
  only?: "cross-language"
  help: boolean
}

export const HELP = `evals:gallery: L1 geometry plus optional L2 vision audit of gallery pages.

Usage:
  pnpm evals:gallery [options]

Options:
  --full                 audit every page (default: incremental, changed ∪ added vs hashes.json)
  --l1-only              skip the grok vision pass
  --pages=id,id          audit only these page ids
  --from=<dir>           use an existing gallery output (SVGs + manifest.json)
  --out=<path>           verdict JSON (default evals/gallery/verdicts/<run-id>.json)
  --only=cross-language  skip gallery audit, run the 24-theme Latin+mixed capacity sweep
  -h, --help             show this help

L2 is skipped (the run still succeeds) when CI=true, --l1-only is set, or grok is not on PATH.
Planted miss-class fixtures are replayed before the live audit. A planted miss fails the process.
Live corpus findings are written to the report and do not fail the process.
The 24-theme Latin and mixed-script capacity sweep runs after the live audit, and on its own with --only=cross-language. A ratchet mismatch fails the process.
`

function flag(argv: string[], name: string): string | undefined {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return undefined
  const eq = hit.indexOf("=")
  return eq === -1 ? "" : hit.slice(eq + 1)
}

export function parseEvalArgs(argv: string[]): EvalArgs {
  const help = argv.includes("-h") || argv.includes("--help")
  const pagesRaw = flag(argv, "pages")
  const pages = pagesRaw
    ? pagesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined
  const from = flag(argv, "from")
  const out = flag(argv, "out")
  let onlyRaw = flag(argv, "only")
  if (onlyRaw === "") {
    const idx = argv.indexOf("--only")
    const next = idx >= 0 ? argv[idx + 1] : undefined
    if (next && !next.startsWith("-")) onlyRaw = next
  }
  if (onlyRaw !== undefined && onlyRaw !== "cross-language") {
    throw new Error(`evals:gallery: unknown --only value "${onlyRaw}". Use --only=cross-language.`)
  }
  const only = onlyRaw === "cross-language" ? ("cross-language" as const) : undefined
  return {
    full: argv.includes("--full"),
    l1Only: argv.includes("--l1-only"),
    pages: pages && pages.length > 0 ? pages : undefined,
    from: from || undefined,
    out: out || undefined,
    only,
    help,
  }
}
