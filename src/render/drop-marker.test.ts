// @vitest-environment node
//
// Every unit a page declares it dropped is one the drop table names.
//
// `data-dropped-kind` is a string a render site writes by hand, and nothing
// in the type system checks it against `DropKind`. `parseDropKind` used to
// read any kind it did not know as the page-level unit, so memo's cover,
// which writes `stamp` when its seal cannot hold the words, reached the
// export refusal and the audit as "1 content block", and its author went
// looking for a block of the body that was never missing. Four kinds were
// written that the table did not name: `stamp`, `footnote`, `heading` and
// `tag`, and a fifth, `content`, meant the page-level unit under a name of
// its own.
//
// So this file reads every kind the source writes, and holds each to the
// table, and holds the readers to fail on a kind the table does not name
// rather than call it something else. The page-field sweep
// (`page-fields-drawn.test.tsx`) holds every kind its renders carry to the
// table too.
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { generatePptx, validateIr } from "@/api"
import { auditDeck } from "@/audit/deck-audit"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { dropPhrase, isDropKind, parseDropKind } from "./drop-marker"

beforeAll(() => {
  installNodePlatform()
})

const SRC = join(import.meta.dirname, "..")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === "__fixtures__" ? [] : sourceFiles(path)
    // Markup is written in JSX, and only there: the `.ts` files that name
    // the attribute read it back (`cli/commands.ts` matches it with a regex).
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx") ? [path] : []
  })
}

/** Every kind a source file writes into `data-dropped-kind`, as a literal or inside the expression that picks one. */
function writtenKinds(text: string): string[] {
  const kinds: string[] = []
  for (const m of text.matchAll(/data-dropped-kind=(?:"([^"]*)"|\{([^}]*)\})/gu)) {
    if (m[1] !== undefined) kinds.push(m[1])
    else for (const quoted of m[2]!.matchAll(/"([^"]*)"/gu)) kinds.push(quoted[1]!)
  }
  return kinds
}

describe("the units a page declares it dropped", () => {
  it("are every one of them named by the drop table", () => {
    const unnamed: string[] = []
    let seen = 0
    for (const file of sourceFiles(SRC)) {
      for (const kind of writtenKinds(readFileSync(file, "utf8"))) {
        seen++
        if (!isDropKind(kind)) unnamed.push(`${relative(SRC, file)}: ${kind}`)
      }
    }
    // The scan has to find the writers to vouch for them.
    expect(seen).toBeGreaterThan(100)
    expect(unnamed).toEqual([])
  })

  it("are read back as written, and a kind the table does not name fails instead of becoming content blocks", () => {
    expect(parseDropKind("stamp")).toBe("stamp")
    expect(parseDropKind(null)).toBe("component")
    expect(() => parseDropKind("content")).toThrow(/data-dropped-kind "content"/u)
    expect(dropPhrase("stamp", 1)).toBe("1 stamp")
    expect(dropPhrase("footnote", 2)).toBe("2 footnotes")
    expect(dropPhrase("heading", 1)).toBe("1 heading")
    expect(dropPhrase("tag", 1)).toBe("1 tag")
  })
})

/** memo's cover with a stamp too wide for its seal: the face declares it dropped rather than cut it. */
function memoCoverWithAStampItCannotPress(): PptxIR {
  const raw = {
    version: "5",
    filename: "memo-stamp-dropped",
    theme: { id: "memo" },
    meta: {},
    assets: { images: {} },
    slides: [
      {
        type: "cover",
        heading: "关于第四季度预算的决定",
        stamp: { text: "经董事会全体成员审议并一致表决通过后立即执行", date: "2026-10-09" },
      },
    ],
  }
  const v = validateIr(raw)
  expect(v.errors).toEqual([])
  return v.ir!
}

describe("a dropped stamp", () => {
  it("is refused at export as a stamp", async () => {
    await expect(generatePptx(memoCoverWithAStampItCannotPress())).rejects.toThrow(/page 1: 1 stamp\b/u)
  })

  it("is reported by the audit as a stamp", () => {
    const findings = auditDeck(memoCoverWithAStampItCannotPress()).findings.filter((f) => f.code === "content-dropped")
    expect(findings.map((f) => f.message)).toEqual([expect.stringMatching(/^1 stamp is missing from the rendered slide/u)])
  })
})
