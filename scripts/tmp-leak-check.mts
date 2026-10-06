/**
 * Runs a command against a private, empty temp directory and reports what it
 * left behind there.
 *
 *   tsx scripts/tmp-leak-check.mts -- vitest run
 *   tsx scripts/tmp-leak-check.mts --report-only --json=out.json -- pnpm e2e
 *
 * TMPDIR (POSIX) and TEMP/TMP (Windows) all point at the private directory,
 * so every `os.tmpdir()` in the command and in the children that inherit its
 * environment lands there and nowhere else. Whatever is still in it after
 * the command exits is a leak that belongs to this command and no other
 * process on the machine: a shared temp directory cannot tell you that,
 * because other runs write to it at the same time.
 *
 * The exit code is the command's own when it fails. When it passes, any
 * leftover `pptwise-*` entry fails the check, unless `--report-only` asks for
 * the counts alone. The private directory is removed either way.
 */
import { spawn } from "node:child_process"
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

/** The `mkdtemp` prefix of a temp entry: the name without the six random
 *  characters mkdtemp appends after the prefix's trailing separator. */
export function leakPrefix(name: string): string {
  return /^(.+?)[-_.][A-Za-z0-9]{6}$/.exec(name)?.[1] ?? name
}

/** Entry counts by prefix, largest first. */
export function groupByPrefix(names: readonly string[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const name of names) {
    const prefix = leakPrefix(name)
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

interface Options {
  reportOnly: boolean
  json: string | null
  command: string[]
}

function parseArgs(argv: readonly string[]): Options {
  const split = argv.indexOf("--")
  if (split === -1 || split === argv.length - 1) {
    throw new Error("usage: tmp-leak-check.mts [--report-only] [--json=<file>] -- <command> [args...]")
  }
  const flags = argv.slice(0, split)
  const options: Options = { reportOnly: false, json: null, command: argv.slice(split + 1) }
  for (const flag of flags) {
    if (flag === "--report-only") options.reportOnly = true
    else if (flag.startsWith("--json=")) options.json = flag.slice("--json=".length)
    else throw new Error(`tmp-leak-check: unknown flag ${flag}`)
  }
  return options
}

function run(command: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  const [file, ...args] = command
  // pnpm, vitest and tsx are .cmd shims on Windows, which only a shell runs.
  // A shell takes one command line, so the words are joined unquoted there.
  const child =
    process.platform === "win32"
      ? spawn(command.join(" "), { stdio: "inherit", env, shell: true })
      : spawn(file!, args, { stdio: "inherit", env })
  // Ctrl-C reaches the child through the terminal on its own. Staying alive
  // until it exits is what lets the private directory be removed afterwards.
  const ignoreInterrupt = () => {}
  const forwardTerminate = (signal: NodeJS.Signals) => child.kill(signal)
  process.on("SIGINT", ignoreInterrupt)
  process.on("SIGTERM", forwardTerminate)
  process.on("SIGHUP", forwardTerminate)
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", (code, signal) => {
      process.off("SIGINT", ignoreInterrupt)
      process.off("SIGTERM", forwardTerminate)
      process.off("SIGHUP", forwardTerminate)
      resolve(code ?? (signal ? 1 : 0))
    })
  })
}

// A Unix socket path is capped near 104 bytes on macOS, and tsx opens its
// IPC socket under `os.tmpdir()`. The macOS temp directory already takes 49
// of those bytes, and this check nests the vitest run root inside its own
// directory, which pushed tsx's socket over the cap. /tmp keeps the nesting
// short. Windows uses named pipes, whose names do not follow the temp path.
function privateTmpParent(): string {
  return process.platform === "win32" ? tmpdir() : "/tmp"
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2))
  const privateTmp = mkdtempSync(join(privateTmpParent(), "pptwise-leak-check-"))
  try {
    const env = { ...process.env, TMPDIR: privateTmp, TEMP: privateTmp, TMP: privateTmp }
    const status = await run(options.command, env)
    const left = readdirSync(privateTmp)
    const groups = groupByPrefix(left)
    const leaked = left.filter((name) => name.startsWith("pptwise-"))
    console.log(`\ntmp-leak-check: ${options.command.join(" ")} exited ${status}, left ${left.length} temp entries`)
    for (const [prefix, count] of groups) console.log(`  ${String(count).padStart(6)}  ${prefix}`)
    if (options.json) {
      writeFileSync(options.json, `${JSON.stringify({ command: options.command, status, total: left.length, groups: Object.fromEntries(groups) }, null, 2)}\n`)
    }
    if (status !== 0) return status
    if (leaked.length > 0 && !options.reportOnly) {
      console.error(`tmp-leak-check: ${leaked.length} pptwise-* entries left in the temp directory`)
      return 1
    }
    return 0
  } finally {
    rmSync(privateTmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  process.exitCode = await main()
}
