// @vitest-environment node
//
// The scrub, kept scrubbed.
//
// A slide paints no overflow count, and `data-dropped-silent` is not a
// protocol any more — but a comment that still describes either one sends the
// next person to reimplement what was removed. That is not hypothetical: the
// commit that retired the visible count left five active comments calling the
// deleted attribute current, and a release note promising a `+N` the renderer
// no longer draws.
//
// Scope is deliberate. Product source, scripts, the shipped skill and the
// agent guide are checked, because those are what a person reads before
// writing code. Two places are excluded by name:
//
//   - `CHANGELOG.md`, whose past entries describe what shipped at the time
//     and must not be rewritten. The current release states the reversal.
//   - the L1 calibration fixtures under `evals/gallery/calibration/` and the
//     planted defect SVGs under `evals/gallery/planted/`, which exist to
//     carry the banned strings so the reviewers that catch them can be
//     measured against a human verdict.
//
// Test files may name the phrase in a test title that asserts its absence.

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)))

const ROOTS = ["src", "scripts", "skills", "evals", "docs", "AGENTS.md", "README.md", "README.zh-CN.md"]

/** Carries the banned strings on purpose — see this file's own header. */
const EXCLUDED = [
  "evals/gallery/calibration/",
  "evals/gallery/planted/",
  "CHANGELOG.md",
  // This file has to spell the banned strings out to look for them.
  "src/no-overflow-vocabulary.test.ts",
]

const EXTENSIONS = [".ts", ".tsx", ".mts", ".md", ".js", ".mjs"]

/** A painted overflow count, in any of the shapes the ban covers. */
const BANNED: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /\+N\b/, why: "a slide never paints an overflow count" },
  { pattern: /\bN more\b/, why: "a slide never paints an overflow count" },
  { pattern: /data-dropped-silent/, why: "there is one drop attribute, `data-dropped`" },
]

function files(): string[] {
  const out: string[] = []
  const walk = (path: string) => {
    const stats = statSync(path)
    if (stats.isFile()) {
      if (EXTENSIONS.some((ext) => path.endsWith(ext))) out.push(path)
      return
    }
    for (const entry of readdirSync(path)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue
      walk(join(path, entry))
    }
  }
  for (const entry of ROOTS) walk(join(ROOT, entry))
  return out.filter((path) => {
    const rel = relative(ROOT, path)
    return !EXCLUDED.some((prefix) => rel.startsWith(prefix))
  })
}

/**
 * A line is exempt only when it is a test title asserting the phrase is gone.
 * `it("… paints no +N …")` is the shape that stays legal, and it has to say
 * so: a bare mention in a title is not enough.
 */
function exemptTestTitle(line: string): boolean {
  return /\b(it|test|describe)\(/.test(line) && /\b(no|not|never|free of|absent|without)\b/i.test(line)
}

describe("the retired overflow vocabulary stays retired", () => {
  const scanned = files()

  it("scans the product surface, not an empty list", () => {
    expect(scanned.length).toBeGreaterThan(200)
    expect(scanned.some((p) => p.endsWith("AGENTS.md"))).toBe(true)
    expect(scanned.some((p) => p.includes("skills/"))).toBe(true)
  })

  it.each(BANNED)("no live mention of $pattern — $why", ({ pattern }) => {
    const hits: string[] = []
    for (const path of scanned) {
      const lines = readFileSync(path, "utf8").split("\n")
      lines.forEach((line, i) => {
        if (!pattern.test(line)) return
        if (exemptTestTitle(line)) return
        hits.push(`${relative(ROOT, path)}:${i + 1}: ${line.trim().slice(0, 100)}`)
      })
    }
    expect(hits).toEqual([])
  })
})
