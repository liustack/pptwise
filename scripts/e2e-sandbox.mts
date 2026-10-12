/** The skill's deck sequence inside a macOS sandbox whose home folder is
 *  read-only, run against the built CLI.
 *
 *  Agent hosts often run commands with only the project folder and the
 *  system temp folder writable. Making a deck has to work there: nothing it
 *  does may write the home folder, and a `.git` the sandbox protects may
 *  only cost a note, since `.pptwise/.gitignore` keeps the folder out of git
 *  on its own.
 *
 *  Two runs, each in a fresh git repository holding one Chinese showcase
 *  deck: one where `.git` is writable (it may gain the local exclude line
 *  and nothing else), and one where the sandbox denies `.git` too (it must
 *  not change at all). Both must leave the fake home folder exactly as it
 *  was, put the final .pptx in the project's `.pptwise/<deck>/`, and leave
 *  `git status` clean.
 *
 *  macOS only: it needs `/usr/bin/sandbox-exec`. `pnpm e2e` runs it as one
 *  leg and skips it elsewhere. Run on its own to keep the logs:
 *
 *    tsx scripts/e2e-sandbox.mts --root <empty dir> [--cli dist/cli.js] [--deck showcase/lecture/zh]
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const SANDBOX_EXEC = "/usr/bin/sandbox-exec"

export function sandboxAvailable(): boolean {
  return process.platform === "darwin" && existsSync(SANDBOX_EXEC)
}

export interface SandboxLegOptions {
  /** An empty directory this leg may fill. Everything it makes goes here. */
  root: string
  /** The built CLI entry, `dist/cli.js`. */
  cli: string
  /** A deck project directory to copy in, with a `deck.spec.json`. */
  deck: string
}

export interface SandboxScenarioReport {
  name: string
  gitWritable: boolean
  commands: { args: string[]; status: number | null; stdout: string; stderr: string }[]
  pptx: string
  homeUnchanged: boolean
  gitChanges: string[]
  gitStatus: string
  log: string
}

/** One line per file under `dir`: its path, mode and content hash. Directories by path alone. */
function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name)
      const rel = relative(dir, path)
      const stat = lstatSync(path)
      if (stat.isDirectory()) {
        out.set(rel, "dir")
        walk(path)
      } else if (stat.isSymbolicLink()) {
        out.set(rel, "link")
      } else {
        out.set(rel, `${stat.mode.toString(8)} ${createHash("sha1").update(readFileSync(path)).digest("hex")}`)
      }
    }
  }
  walk(dir)
  return out
}

function changes(before: Map<string, string>, after: Map<string, string>): string[] {
  const keys = new Set([...before.keys(), ...after.keys()])
  return [...keys].filter((key) => before.get(key) !== after.get(key)).sort()
}

/** SBPL: everything allowed except writes, and writes only to the workspace and the temp folder. */
function profile(workspace: string, temp: string, gitWritable: boolean): string {
  const quote = (path: string) => JSON.stringify(path)
  return [
    "(version 1)",
    "(allow default)",
    "(deny file-write*)",
    `(allow file-write* (subpath ${quote(workspace)}) (subpath ${quote(temp)}) (literal "/dev/null") (literal "/dev/zero") (regex #"^/dev/tty") (regex #"^/dev/fd/"))`,
    ...(gitWritable ? [] : [`(deny file-write* (subpath ${quote(join(workspace, ".git"))}))`]),
    "",
  ].join("\n")
}

function git(cwd: string, args: string[]): string {
  const run = spawnSync("git", ["-c", "user.name=pptwise e2e", "-c", "user.email=e2e@pptwise.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", HOME: cwd },
  })
  if (run.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${run.stderr}`)
  return run.stdout
}

async function runScenario(opts: SandboxLegOptions, name: string, gitWritable: boolean): Promise<SandboxScenarioReport> {
  const base = join(opts.root, name)
  const home = join(base, "home")
  const workspace = join(base, "workspace")
  const temp = join(base, "tmp")
  for (const dir of [home, workspace, temp]) mkdirSync(dir, { recursive: true })
  // A home folder that already holds a pptwise config, the way a real one
  // does, so reading it is exercised and any write to it shows.
  mkdirSync(join(home, ".pptwise"))
  writeFileSync(join(home, ".pptwise", "config.json"), "{}\n")

  const deckName = "lecture-zh"
  cpSync(opts.deck, join(workspace, deckName), { recursive: true })
  git(workspace, ["init", "-q"])
  git(workspace, ["add", "-A"])
  git(workspace, ["commit", "-q", "-m", "deck"])

  const real = (path: string) => realpathSync(path)
  const profilePath = join(base, "sandbox.sb")
  writeFileSync(profilePath, profile(real(workspace), real(temp), gitWritable))

  const homeBefore = snapshot(home)
  const gitBefore = snapshot(join(workspace, ".git"))
  const spec = JSON.parse(readFileSync(join(workspace, deckName, "deck.spec.json"), "utf8")) as { filename: string }

  const sequence: string[][] = [
    ["schema", "--spec"],
    ["narratives", "--json"],
    ["themes", "--json"],
    ["theme", "try", "lecture,brief"],
    ["spec", "validate", join(deckName, "deck.spec.json")],
    ["inspect", deckName, "--page", "p01-cover"],
    ["validate", deckName],
    ["preview", deckName, "--html"],
    ["images", "list", "--deck", deckName],
    ["build", deckName, "--json"],
  ]
  const log: string[] = [`# ${name}: .git ${gitWritable ? "writable" : "read-only"}`, `profile: ${profilePath}`, ""]
  const commands: SandboxScenarioReport["commands"] = []
  for (const args of sequence) {
    const run = spawnSync(SANDBOX_EXEC, ["-f", profilePath, process.execPath, opts.cli, ...args], {
      cwd: workspace,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      // Only what a sandboxed agent would hand down: no PPTWISE_HOME, so the
      // CLI looks in the fake home's own ~/.pptwise.
      env: { HOME: home, PATH: process.env.PATH ?? "/usr/bin:/bin", TMPDIR: temp, LANG: "en_US.UTF-8" },
    })
    commands.push({ args, status: run.status, stdout: run.stdout, stderr: run.stderr })
    log.push(`$ pptwise ${args.join(" ")}`, `exit ${run.status}`)
    if (run.stderr.trim() !== "") log.push(`stderr:\n${run.stderr.trimEnd()}`)
    log.push(`stdout: ${run.stdout.length} bytes${run.stdout.length < 600 ? `\n${run.stdout.trimEnd()}` : ""}`, "")
  }

  const homeChanges = changes(homeBefore, snapshot(home))
  const gitChanges = changes(gitBefore, snapshot(join(workspace, ".git")))
  const gitStatus = git(workspace, ["status", "--porcelain", "--untracked-files=all"])
  const pptx = join(workspace, ".pptwise", deckName, `${spec.filename}.pptx`)
  log.push(
    `home changes: ${homeChanges.length === 0 ? "none" : homeChanges.join(", ")}`,
    `.git changes: ${gitChanges.length === 0 ? "none" : gitChanges.join(", ")}`,
    `exclude file: ${JSON.stringify(readFileSync(join(workspace, ".git", "info", "exclude"), "utf8").split("\n").filter((line) => line !== "" && !line.startsWith("#")))}`,
    `.pptwise/.gitignore: ${JSON.stringify(existsSync(join(workspace, ".pptwise", ".gitignore")) ? readFileSync(join(workspace, ".pptwise", ".gitignore"), "utf8") : null)}`,
    `git status --porcelain: ${gitStatus === "" ? "(clean)" : `\n${gitStatus}`}`,
    `pptx: ${pptx} ${existsSync(pptx) ? `(${lstatSync(pptx).size} bytes)` : "MISSING"}`,
  )
  const logPath = join(base, "run.log")
  writeFileSync(logPath, `${log.join("\n")}\n`)

  const fail = (message: string): never => {
    throw new Error(`e2e: sandbox leg (${name}) ${message}. Log: ${logPath}`)
  }
  for (const command of commands) {
    if (command.status !== 0) fail(`pptwise ${command.args.join(" ")} exited ${command.status}: ${command.stderr.trim()}`)
  }
  if (!existsSync(pptx)) fail(`wrote no .pptx at ${pptx}`)
  if (homeChanges.length > 0) fail(`changed the home folder: ${homeChanges.join(", ")}`)
  if (gitWritable) {
    if (gitChanges.join(",") !== "info/exclude") fail(`changed .git beyond the exclude line: ${gitChanges.join(", ")}`)
    const exclude = readFileSync(join(workspace, ".git", "info", "exclude"), "utf8")
    if (!/^\.pptwise\/$/m.test(exclude)) fail("did not add .pptwise/ to the exclude file")
  } else {
    if (gitChanges.length > 0) fail(`changed a read-only .git: ${gitChanges.join(", ")}`)
    const noted = (command: { stdout: string; stderr: string }) => /could not write \S*exclude/.test(command.stdout + command.stderr)
    if (!commands.some(noted)) fail("printed no note about the exclude file it could not write")
  }
  if (readFileSync(join(workspace, ".pptwise", ".gitignore"), "utf8") !== "*\n") fail(".pptwise/.gitignore is not `*`")
  if (gitStatus !== "") fail(`left git status dirty:\n${gitStatus}`)

  return { name, gitWritable, commands, pptx, homeUnchanged: true, gitChanges, gitStatus, log: logPath }
}

export async function runSandboxLeg(opts: SandboxLegOptions): Promise<SandboxScenarioReport[]> {
  if (!sandboxAvailable()) throw new Error("e2e: sandbox leg needs macOS sandbox-exec")
  return [await runScenario(opts, "git-writable", true), await runScenario(opts, "git-read-only", false)]
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  const args = process.argv.slice(2)
  const flag = (name: string) => {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
  }
  const root = flag("--root")
  if (root === undefined) throw new Error("--root <empty dir> is required")
  mkdirSync(root, { recursive: true })
  const reports = await runSandboxLeg({
    root: resolve(root),
    cli: resolve(flag("--cli") ?? "dist/cli.js"),
    deck: resolve(flag("--deck") ?? "showcase/lecture/zh"),
  })
  for (const report of reports) {
    console.log(`${report.name}: ${report.commands.length} commands exit 0, pptx ${report.pptx}, home unchanged, .git changes: ${report.gitChanges.join(", ") || "none"}, git status clean (log ${report.log})`)
  }
}
