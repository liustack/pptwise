// @vitest-environment node
//
// After a gallery render, leftover files from retired components, layouts
// and themes used to sit in `.gallery/` forever because the writer only
// created files. These tests pin the prune: this run's writes are kept,
// everything else at that directory level goes away.

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import type { Job } from "./matrix"
import { pruneGalleryDir } from "./prune"
import { renderMatrix } from "./render"

await installNodePlatform()

function probeJob(): Job {
  const ir = {
    version: "5",
    filename: "prune-probe.pptx",
    theme: { id: "brief" },
    slides: [
      {
        type: "content",
        kind: "points",
        heading: "Prune probe",
        components: [{ type: "paragraph", text: "A short paragraph so the page renders." }],
      },
    ],
  } as PptxIR

  return {
    id: "brief--comp--paragraph--zh",
    section: "brief",
    sectionLabel: "Brief",
    band: "component",
    subject: "paragraph",
    component: "paragraph",
    language: "zh",
    languageLabel: "中文",
    theme: "brief",
    page: 1,
    pageCount: 1,
    slideType: "content",
    heading: "Prune probe",
    ir,
    slideIndex: 0,
  }
}

describe("renderMatrix page prune", () => {
  it("deletes leftover pages this run did not write, and keeps the ones it did", () => {
    const job = probeJob()
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-gallery-prune-"))
    const pagesDir = join(outDir, "pages")
    const realPage = join(pagesDir, `${job.id}.svg`)
    const manifest = join(outDir, "manifest.json")

    renderMatrix([job], outDir, "test")
    expect(existsSync(realPage)).toBe(true)
    expect(existsSync(manifest)).toBe(true)

    // Retired component / layout leftovers, plus a junk file. A second
    // render of only this job must treat its own manifest as the source of
    // truth — `--only=component` into a dir that already has theme or
    // layout pages is supposed to drop the other tables' files.
    writeFileSync(join(pagesDir, "brief--comp--logo-wall--zh.svg"), "<svg />\n")
    writeFileSync(join(pagesDir, "unserved--face--side-highlight.svg"), "<svg />\n")
    writeFileSync(join(pagesDir, "junk.txt"), "leftover\n")
    writeFileSync(join(outDir, "_dx-fake.png"), "png")

    renderMatrix([job], outDir, "test")

    expect(existsSync(join(pagesDir, "brief--comp--logo-wall--zh.svg"))).toBe(false)
    expect(existsSync(join(pagesDir, "unserved--face--side-highlight.svg"))).toBe(false)
    expect(existsSync(join(pagesDir, "junk.txt"))).toBe(false)
    expect(existsSync(realPage)).toBe(true)
    expect(existsSync(manifest)).toBe(true)
    // Root leftovers are gallery.mts's job, not the page writer.
    expect(existsSync(join(outDir, "_dx-fake.png"))).toBe(true)
  })
})

describe("pruneGalleryDir", () => {
  it("removes leftover root files and a stale bbox, keeping this run's names", () => {
    const dir = mkdtempSync(join(tmpdir(), "pptwise-gallery-root-"))
    mkdirSync(join(dir, "pages"))
    writeFileSync(join(dir, "pages", "keep.svg"), "<svg />\n")
    writeFileSync(join(dir, "index.html"), "ok")
    writeFileSync(join(dir, "manifest.json"), "{}\n")
    writeFileSync(join(dir, "bbox.json"), "stale")
    writeFileSync(join(dir, "_dx-fake.png"), "png")
    writeFileSync(join(dir, "speech--cover--bloom--zh.svg"), "<svg />\n")
    mkdirSync(join(dir, "mystery-nested"))
    writeFileSync(join(dir, "mystery-nested", "x"), "y")

    pruneGalleryDir(dir, new Set(["pages", "index.html", "manifest.json"]))

    expect(existsSync(join(dir, "_dx-fake.png"))).toBe(false)
    expect(existsSync(join(dir, "speech--cover--bloom--zh.svg"))).toBe(false)
    expect(existsSync(join(dir, "bbox.json"))).toBe(false)
    expect(existsSync(join(dir, "index.html"))).toBe(true)
    expect(existsSync(join(dir, "manifest.json"))).toBe(true)
    expect(existsSync(join(dir, "pages", "keep.svg"))).toBe(true)
    expect(existsSync(join(dir, "mystery-nested", "x"))).toBe(true)
  })

  it("keeps bbox.json only when this run produced it", () => {
    const dir = mkdtempSync(join(tmpdir(), "pptwise-gallery-bbox-"))
    writeFileSync(join(dir, "index.html"), "ok")
    writeFileSync(join(dir, "manifest.json"), "{}\n")
    writeFileSync(join(dir, "bbox.json"), "this-run")

    pruneGalleryDir(dir, new Set(["index.html", "manifest.json", "bbox.json"]))

    expect(existsSync(join(dir, "bbox.json"))).toBe(true)
    expect(existsSync(join(dir, "index.html"))).toBe(true)
  })
})
