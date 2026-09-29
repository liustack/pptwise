/**
 * One command per release: `pnpm release` (add `--dry-run` to see the plan).
 *
 * The version comes from the pending changesets, as it always has. What this
 * adds is the order, because a release done by hand is how `main` once went
 * out pinning a version npm did not have yet, and every new install broke
 * until it landed:
 *
 *   1. Refuse early, while nothing has happened: a dirty tree, a branch other
 *      than main, a main that is behind origin, no pending changeset, a tag
 *      that already exists here or on origin.
 *   2. Bump (`pnpm release:version`), date the new CHANGELOG heading, and run
 *      the quick gates. A failure here restores the tree.
 *   3. Commit and tag on main, then push the tag alone. The tag starts
 *      `.github/workflows/release.yml`, the one place that publishes. It runs
 *      the full gates before `npm publish` and cuts the GitHub Release.
 *   4. Push main only once npm answers with the new version. `main` is what
 *      users install from (pptwise.com hands agents `INSTALL.md` on main,
 *      which pins this version), so it must never get ahead of npm.
 *
 * Step 1 checks that main can fast-forward before the tag goes out, so the
 * push in step 4 lands the same tree the tag released.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { PKG_NAME, readPackageVersion, repoRoot } from "./stamp.mts"

/** The body under `## <version>` (a date may follow it), up to the next `## `. */
export function changelogSection(changelog: string, version: string): string | undefined {
  const escaped = version.replace(/\./g, "\\.")
  const match = new RegExp(`^## ${escaped}(?: [^\\n]*)?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(changelog)
  return match?.[1]?.trim()
}

/** Adds ` - <date>` to the bare `## <version>` heading changesets writes. */
export function datedHeading(changelog: string, version: string, date: string): string {
  const escaped = version.replace(/\./g, "\\.")
  return changelog.replace(new RegExp(`^## ${escaped}$`, "m"), `## ${version} - ${date}`)
}

interface ChangesetStatus {
  releases: { name: string; newVersion: string }[]
}

/** The version the pending changesets will give this package, if any. */
export function plannedVersion(status: ChangesetStatus, pkgName: string): string | undefined {
  return status.releases.find((release) => release.name === pkgName)?.newVersion
}

const run = (cmd: string, args: string[]): string =>
  execFileSync(cmd, args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
const runLoud = (cmd: string, args: string[]): void => {
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit" })
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function stop(message: string): never {
  console.error(`\nRelease stopped: ${message}\n`)
  process.exit(1)
}

function pendingChangesets(): string[] {
  const dir = join(repoRoot, ".changeset")
  return readdirSync(dir).filter(
    (name) =>
      name.endsWith(".md") &&
      name.toLowerCase() !== "readme.md" &&
      readFileSync(join(dir, name), "utf8").includes(PKG_NAME),
  )
}

function changesetPlan(): string | undefined {
  const dir = mkdtempSync(join(tmpdir(), "pptwise-release-"))
  try {
    const out = join(dir, "status.json")
    run("pnpm", ["exec", "changeset", "status", `--output=${out}`])
    return plannedVersion(JSON.parse(readFileSync(out, "utf8")) as ChangesetStatus, PKG_NAME)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * The `gh run list` arguments for the release run of one commit. Matching by
 * the tag's name alone finds a retracted tag's older, failed run when the
 * same tag is pushed again, and the release then stops on that stale result.
 */
export function releaseRunListArgs(tag: string, sha: string): string[] {
  return ["run", "list", "--workflow", "release.yml", "--branch", tag, "--commit", sha, "--limit", "1", "--json", "databaseId", "--jq", ".[0].databaseId // empty"]
}

async function waitForReleaseRun(tag: string, sha: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const id = run("gh", releaseRunListArgs(tag, sha))
    if (id) return id
    await sleep(5000)
  }
  stop(`no release.yml run appeared for ${tag}. Check the Actions tab.`)
}

/** npm serves package metadata through a CDN with `cache-control: max-age=300`,
 *  so a version published a moment ago can stay invisible for up to five
 *  minutes. Seven minutes of polling covers that, and `--prefer-online` keeps
 *  the local npm cache from adding its own staleness on top. */
async function waitForNpm(version: string): Promise<boolean> {
  for (let i = 0; i < 84; i++) {
    try {
      if (run("npm", ["view", `${PKG_NAME}@${version}`, "version", "--prefer-online"]) === version) return true
    } catch {
      // Not visible yet: the registry takes a moment after the upload.
    }
    await sleep(5000)
  }
  return false
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run")

  // 1. Refuse early, while nothing has happened yet.
  if (run("git", ["status", "--porcelain"])) stop("the working tree has uncommitted changes. Commit them first.")
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"])
  if (branch !== "main") stop(`on branch ${branch}, not main.`)
  run("git", ["fetch", "origin", "main"])
  try {
    run("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"])
  } catch {
    stop("local main is behind or diverged from origin/main. Pull first.")
  }
  if (pendingChangesets().length === 0) stop("no pending changeset names this package. Add one with `npx changeset`.")
  const next = changesetPlan()
  if (!next) stop("the pending changesets release nothing for this package.")
  const tag = `v${next}`
  if (run("git", ["tag", "--list", tag])) stop(`tag ${tag} already exists here.`)
  if (run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`])) stop(`tag ${tag} already exists on origin.`)

  console.log(`Releasing ${PKG_NAME} ${readPackageVersion()} -> ${next}`)
  if (dryRun) {
    console.log("Dry run: every check passed. Nothing was changed.")
    return
  }

  // 2. Bump and gate. Any failure puts the tree back the way it was.
  try {
    runLoud("pnpm", ["release:version"])
    if (readPackageVersion() !== next) throw new Error(`package.json says ${readPackageVersion()}, the plan said ${next}`)
    const changelogPath = join(repoRoot, "CHANGELOG.md")
    const date = new Date().toISOString().slice(0, 10)
    const changelog = datedHeading(readFileSync(changelogPath, "utf8"), next, date)
    writeFileSync(changelogPath, changelog)
    const notes = changelogSection(changelog, next)
    if (!notes || notes.length < 20) throw new Error(`CHANGELOG.md has no real entry for ${next}`)
    runLoud("pnpm", ["typecheck"])
    runLoud("pnpm", ["lint"])
    runLoud("pnpm", ["exec", "vitest", "run", "scripts/stamp.test.mts", "src/version-sync.test.ts", "scripts/release.test.mts"])
  } catch (error) {
    run("git", ["checkout", "--", "."])
    stop(`${error instanceof Error ? error.message : String(error)}. The tree is restored.`)
  }

  // 3. From here on it is real.
  run("git", ["commit", "-am", `chore(release): version ${next}`])
  run("git", ["tag", "-a", tag, "-m", tag])
  run("git", ["push", "origin", `refs/tags/${tag}`])
  console.log(`\nTag ${tag} pushed. Waiting for the release workflow (full gates, npm, GitHub Release).`)

  const runId = await waitForReleaseRun(tag, run("git", ["rev-parse", "HEAD"]))
  try {
    runLoud("gh", ["run", "watch", runId, "--exit-status"])
  } catch {
    stop(
      `the release workflow failed (run ${runId}). main was not pushed, so installs are unaffected.\n` +
        `Fix the cause, then either re-run that workflow for ${tag}, or retract it and start over:\n` +
        `  git push origin :refs/tags/${tag} && git tag -d ${tag} && git reset --hard HEAD~1`,
    )
  }
  if (!(await waitForNpm(next))) {
    stop(`the workflow passed but npm does not answer ${PKG_NAME}@${next} yet. Push main once it does: git push origin main`)
  }

  // 4. npm has it, so main may now pin it.
  run("git", ["push", "origin", "main"])
  console.log(`\n${PKG_NAME}@${next} is on npm and main is pushed.`)
  console.log(`https://github.com/liustack/pptwise/releases/tag/${tag}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main()
}
