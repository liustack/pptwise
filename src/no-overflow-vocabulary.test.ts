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
 * A changelog entry describes what shipped when it shipped, so past sections
 * keep their wording. Only the sections at or above the release this branch
 * is cutting have to describe today — and until that section exists, the
 * changeset that will become it is scanned in its place.
 */
function currentChangelogLines(): { line: string; number: number }[] {
  const path = join(ROOT, "CHANGELOG.md")
  if (!existsSync(path)) return []
  const lines = readFileSync(path, "utf8").split("\n")
  const out: { line: string; number: number }[] = []
  let current: readonly [number, number, number] | null = null
  lines.forEach((line, i) => {
    const heading = /^##\s+(\d+)\.(\d+)\.(\d+)\s*$/.exec(line)
    if (heading) {
      current = [Number(heading[1]), Number(heading[2]), Number(heading[3])] as const
      return
    }
    if (!current) return
    const [a, b, c] = current
    const [x, y, z] = CURRENT_RELEASE
    const atOrAbove = a > x || (a === x && (b > y || (b === y && c >= z)))
    if (atOrAbove) out.push({ line, number: i + 1 })
  })
  return out
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
    for (const { line, number } of currentChangelogLines()) {
      if (pattern.test(line)) hits.push(`CHANGELOG.md:${number}: ${line.trim().slice(0, 100)}`)
    }
    expect(hits).toEqual([])
  })
})
