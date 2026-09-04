// @vitest-environment node
//
// The scrub, kept scrubbed.
//
// A slide paints no overflow count, and `data-dropped-silent` is not a
// protocol any more — but a comment that still describes either one sends the
// next person to reimplement what was removed. That is not hypothetical: the
// commit that retired the visible count left five active comments calling the
// deleted attribute current, and a release note promising a mark the renderer
// no longer draws.
//
// Two things this file has to get right, because a guard that passes for the
// wrong reason is worse than none:
//
//   - **Exclusions are files, not directories.** The fixtures that carry the
//     banned strings on purpose are three, and all three are `.json`/`.svg`,
//     which this scan does not read anyway. Excluding their whole directories
//     also skipped nine scripts, a loader, a replay module and a README that
//     are ordinary code and prose, and could reintroduce the vocabulary
//     unnoticed. They are named one by one instead.
//   - **Every scope carries its own floor.** A single global count let any
//     one scope vanish from the walk without failing anything: `src` alone is
//     871 files, so dropping `scripts`, `evals`, `docs` and both READMEs
//     still cleared a floor of 200. Each scope proves its own size.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)))

/**
 * Each scope and the smallest number of files it may contribute. The floors
 * sit under today's counts with room for ordinary churn, and any scope that
 * silently stops being walked falls under its own.
 */
const SCOPES: readonly { path: string; min: number }[] = [
  { path: "src", min: 600 },
  { path: "scripts", min: 8 },
  { path: "skills", min: 10 },
  { path: "evals", min: 50 },
  { path: "docs", min: 10 },
  { path: ".changeset", min: 1 },
  { path: "AGENTS.md", min: 1 },
  { path: "README.md", min: 1 },
  { path: "README.zh-CN.md", min: 1 },
]

/**
 * Fixtures that carry a banned string as their subject matter: two recorded
 * human verdicts about a page that painted a mark, and one planted defect SVG
 * the reviewers are scored against. Named individually so that a new file
 * beside them is scanned like any other.
 */
const EXCLUDED_FILES: readonly string[] = [
  "evals/gallery/calibration/human-verdicts.json",
  "evals/gallery/calibration/pre-fix-l2-replay.json",
  "evals/gallery/planted/overflow-1.svg",
  // This file has to spell the banned strings out to look for them.
  "src/no-overflow-vocabulary.test.ts",
]

const EXTENSIONS = [".ts", ".tsx", ".mts", ".md", ".js", ".mjs"]

/** The release this branch ships. Entries at or above it describe today. */
const CURRENT_RELEASE = [0, 31, 0] as const

/** The package a pending changeset has to name to count as this release's. */
const PACKAGE_NAME = "@liustack/pptwise"

const BANNED: readonly { name: string; pattern: RegExp; why: string }[] = [
  { name: "+N", pattern: /\+N\b/, why: "a slide never paints an overflow count" },
  { name: "N more", pattern: /\bN more\b/, why: "a slide never paints an overflow count" },
  { name: "data-dropped-silent", pattern: /data-dropped-silent/, why: "there is one drop attribute" },
]

function filesUnder(scope: string): string[] {
  const out: string[] = []
  const walk = (path: string) => {
    const stats = statSync(path)
    if (stats.isFile()) {
      if (EXTENSIONS.some((ext) => path.endsWith(ext))) out.push(path)
      return
    }
    for (const entry of readdirSync(path)) {
      if (entry === "node_modules") continue
      walk(join(path, entry))
    }
  }
  walk(join(ROOT, scope))
  return out.filter((path) => !EXCLUDED_FILES.includes(relative(ROOT, path)))
}

/**
 * Every second-level heading this changelog uses, as a version or as nothing.
 *
 * Both shapes are in the file today: `## 0.30.0` for the entries changesets
 * writes, and `## 0.4.0 (2026-07-20)` for the four hand-written ones at the
 * bottom. A parser that knew only the first read a dated heading as body text
 * and kept attributing its lines to whatever section came before, which is
 * how a scan can be looking at the wrong release without saying so.
 * `## Unreleased` is a heading and not a version, and it correctly ends the
 * section above it.
 */
function headingVersion(line: string): readonly [number, number, number] | null | undefined {
  if (!/^##\s+\S/.test(line)) return undefined
  const version = /^##\s+v?(\d+)\.(\d+)\.(\d+)\b/.exec(line)
  if (!version) return null
  return [Number(version[1]), Number(version[2]), Number(version[3])] as const
}

function atOrAboveTarget(v: readonly [number, number, number]): boolean {
  const [a, b, c] = v
  const [x, y, z] = CURRENT_RELEASE
  return a > x || (a === x && (b > y || (b === y && c >= z)))
}

/**
 * A changelog entry describes what shipped when it shipped, so past sections
 * keep their wording. Only the sections at or above the release this branch
 * is cutting have to describe today.
 *
 * `found` is separate from the lines: a scan that reads no current section is
 * not a clean scan, it is a scan of nothing, and until the release is cut
 * there is no such section to read. What stands in for it is the pending
 * changeset, which `pendingChangesets` accounts for.
 */
function parseChangelog(text: string | null): { found: boolean; lines: { line: string; number: number }[] } {
  if (text === null) return { found: false, lines: [] }
  const out: { line: string; number: number }[] = []
  let current: readonly [number, number, number] | null = null
  let found = false
  text.split("\n").forEach((line, i) => {
    const heading = headingVersion(line)
    if (heading !== undefined) {
      current = heading
      if (heading && atOrAboveTarget(heading)) found = true
      return
    }
    if (current && atOrAboveTarget(current)) out.push({ line, number: i + 1 })
  })
  return { found, lines: out }
}

function currentChangelog(): { found: boolean; lines: { line: string; number: number }[] } {
  const path = join(ROOT, "CHANGELOG.md")
  return parseChangelog(existsSync(path) ? readFileSync(path, "utf8") : null)
}

/**
 * Changesets waiting to become the next entry: a markdown file under
 * `.changeset` that is not the directory's own permanent README and that
 * names this package in its front matter.
 *
 * The `.changeset` floor alone could never prove this. `README.md` lives
 * there forever, so a scope minimum of one was satisfied by the directory
 * being empty of actual changesets — the release note this guard exists to
 * check could be deleted and every assertion would stay green.
 */
function selectChangesets(entries: readonly { name: string; text: string }[]): string[] {
  return entries
    .filter((e) => e.name.endsWith(".md") && e.name.toLowerCase() !== "readme.md")
    .filter((e) => e.text.includes(PACKAGE_NAME))
    .map((e) => e.name)
}

function pendingChangesets(): string[] {
  const dir = join(ROOT, ".changeset")
  if (!existsSync(dir)) return []
  return selectChangesets(
    readdirSync(dir).map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") })),
  )
}

function exemptTestTitle(line: string): boolean {
  return /\b(it|test|describe)\(/.test(line) && /\b(no|not|never|free of|absent|without)\b/i.test(line)
}

describe("the retired overflow vocabulary stays retired", () => {
  it("covers every scope a reader learns the protocol from", () => {
    // Pinned, so a scope cannot leave the walk quietly. Adding a scope is a
    // one-line change here; removing one has to be argued for in a diff.
    expect(SCOPES.map((s) => s.path).sort()).toEqual([
      ".changeset",
      "AGENTS.md",
      "README.md",
      "README.zh-CN.md",
      "docs",
      "evals",
      "scripts",
      "skills",
      "src",
    ])
  })

  it.each(SCOPES)("scans $path, and it is not empty", ({ path, min }) => {
    expect(existsSync(join(ROOT, path)), `${path} is missing — fix the scope list`).toBe(true)
    expect(filesUnder(path).length).toBeGreaterThanOrEqual(min)
  })

  it("has a release note to check: a current changelog section, or a pending changeset", () => {
    // Without this the third banned-word check can scan nothing at all and
    // still pass: before the release is cut the changelog has no section at
    // or above it, and `.changeset` clears its own floor on the permanent
    // README alone. One of the two has to actually be there.
    const changelog = currentChangelog()
    const pending = pendingChangesets()
    expect(
      changelog.found || pending.length > 0,
      `no CHANGELOG section at or above ${CURRENT_RELEASE.join(".")} and no pending changeset naming ${PACKAGE_NAME}`,
    ).toBe(true)
    if (!changelog.found) expect(pending.length).toBeGreaterThan(0)
  })

  it("excludes only files that exist, so a stale name cannot hide a live one", () => {
    for (const file of EXCLUDED_FILES) {
      expect(existsSync(join(ROOT, file)), `${file} is excluded but missing`).toBe(true)
    }
  })

  it.each(BANNED)("no live mention of $name — $why", ({ pattern }) => {
    const hits: string[] = []
    for (const { path } of SCOPES) {
      for (const file of filesUnder(path)) {
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (!pattern.test(line) || exemptTestTitle(line)) return
            hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 100)}`)
          })
      }
    }
    for (const { line, number } of currentChangelog().lines) {
      if (pattern.test(line)) hits.push(`CHANGELOG.md:${number}: ${line.trim().slice(0, 100)}`)
    }
    expect(hits).toEqual([])
  })
})

// The parser and the pending-source rule, on the shapes that made the check
// pass while reading nothing.
describe("the release-note scan knows what it is reading", () => {
  const DATED = ["## 0.31.0 (2026-09-04)", "", "- ships the thing"].join("\n")
  const OLD_ONLY = ["## 0.30.0", "", "- an entry that describes 0.30.0"].join("\n")

  it("reads nothing, and says so, when the changelog is missing", () => {
    const parsed = parseChangelog(null)
    expect(parsed.found).toBe(false)
    expect(parsed.lines).toEqual([])
  })

  it("recognizes a dated heading as the version it names", () => {
    // `## 0.4.0 (2026-07-20)` is in this repo's changelog four times. Read as
    // body text it never ends the section above it, so the scan silently
    // attributes its lines to the wrong release.
    const parsed = parseChangelog(DATED)
    expect(parsed.found).toBe(true)
    expect(parsed.lines.map((l) => l.line)).toContain("- ships the thing")
    const older = parseChangelog(["## 0.31.0", "- current", "## 0.4.0 (2026-07-20)", "- ancient"].join("\n"))
    expect(older.lines.map((l) => l.line)).toEqual(["- current"])
  })

  it("reports no current section when every entry predates the target", () => {
    const parsed = parseChangelog(OLD_ONLY)
    expect(parsed.found).toBe(false)
    expect(parsed.lines).toEqual([])
  })

  it("does not count the permanent README as a pending changeset", () => {
    const readmeOnly = [{ name: "README.md", text: `changesets for ${PACKAGE_NAME}` }]
    expect(selectChangesets(readmeOnly)).toEqual([])
    const withOne = [...readmeOnly, { name: "brisk-pans-shave.md", text: `---\n"${PACKAGE_NAME}": minor\n---\n` }]
    expect(selectChangesets(withOne)).toEqual(["brisk-pans-shave.md"])
    // A changeset for some other package is not this release's note either.
    const foreign = [...readmeOnly, { name: "other.md", text: `---\n"@someone/else": patch\n---\n` }]
    expect(selectChangesets(foreign)).toEqual([])
  })

  it("would fail the release-note assertion when neither source exists", () => {
    // The combination the assertion above exists to reject, evaluated
    // directly: no current section, and nothing pending but the README.
    const changelog = parseChangelog(OLD_ONLY)
    const pending = selectChangesets([{ name: "README.md", text: PACKAGE_NAME }])
    expect(changelog.found || pending.length > 0).toBe(false)
  })
})
