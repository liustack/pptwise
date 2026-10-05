// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import JSZip from "jszip"
import { afterEach, describe, expect, it } from "vitest"
import { forkTheme } from "../../src/cli/theme-fork"
import { themeFileFromPreset } from "../../src/cli/theme-resolve"
import {
  loadArtifact,
  loadQuestionMetas,
  normalizedPptxSha1,
  renderModelReport,
  renderSummaryReport,
  runScoring,
  scoreModel,
  scoreQuestion,
  type QuestionMeta,
  type QuestionScore,
} from "./score.mts"

const FIXTURES = join(import.meta.dirname, "fixtures")
const QUESTIONS_DIR = join(FIXTURES, "questions")
const RESULTS_DIR = join(FIXTURES, "results")
// Mirrors score.mts's own REPO_ROOT (resolved off this file's own
// directory, one level up from tests/bench/) — used to assert the notes-column
// relativization actually strips the machine-specific absolute prefix.
const REPO_ROOT = resolve(import.meta.dirname, "../..")

// ── normalizedPptxSha1 — the determinism comparison method itself ──
//
// These three tests build synthetic zips directly (bypassing generatePptx)
// so the proof that this is a genuine byte comparison — not a vacuous
// always-equal or always-different check — never depends on real render
// timing or wall-clock behavior.

async function makeZipBytes(files: Record<string, string | Buffer>): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  return zip.generateAsync({ type: "uint8array" })
}

describe("normalizedPptxSha1", () => {
  it("ignores a docProps/core.xml difference — the one known clock-dependent zip part", async () => {
    const a = await makeZipBytes({ "docProps/core.xml": "<t>2026-01-01</t>", "ppt/presentation.xml": "<p>x</p>" })
    const b = await makeZipBytes({ "docProps/core.xml": "<t>2099-12-31</t>", "ppt/presentation.xml": "<p>x</p>" })
    expect(await normalizedPptxSha1(a)).toBe(await normalizedPptxSha1(b))
  })

  it("is sensitive to a one-character difference anywhere outside docProps/core.xml — a genuine content comparison", async () => {
    const a = await makeZipBytes({ "docProps/core.xml": "<t>same</t>", "ppt/slides/slide1.xml": "<a>1</a>" })
    const b = await makeZipBytes({ "docProps/core.xml": "<t>same</t>", "ppt/slides/slide1.xml": "<a>2</a>" })
    expect(await normalizedPptxSha1(a)).not.toBe(await normalizedPptxSha1(b))
  })

  it("is sensitive to binary (non-UTF8) content, not just text parts — real decks embed binary image assets", async () => {
    const a = await makeZipBytes({
      "docProps/core.xml": "same",
      "ppt/media/image1.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]),
    })
    const b = await makeZipBytes({
      "docProps/core.xml": "same",
      "ppt/media/image1.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x02]), // one byte flipped
    })
    expect(await normalizedPptxSha1(a)).not.toBe(await normalizedPptxSha1(b))
  })
})

// ── loadQuestionMetas ──

describe("loadQuestionMetas", () => {
  it("reads the fixture question bank sorted by id", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    expect(metas.map((m) => m.id)).toEqual(["fx01", "fx02", "fx03"])
    expect(metas[0]!.coverage?.expects_components).toEqual(["bullets", "kpi_cards"])
  })
})

// ── scoreQuestion — all-green fixtures ──

describe("scoreQuestion — green-model (all clean)", () => {
  it("fx01: clean bare IR — validates clean, audits clean, renders deterministically, partial coverage hit", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx01")!
    const score = await scoreQuestion("fx01", join(RESULTS_DIR, "green-model", "fx01"), meta)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.validateErrorCount).toBe(0)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(true)
    expect(score.renderError).toBeUndefined()
    expect(score.deterministic).toBe(true)
    // fx01's artifact uses "bullets" only — "kpi_cards" is expected but absent.
    expect(score.coverageHits).toEqual(["bullets"])
    expect(score.self).toEqual({ tokens: 1234, duration_seconds: 42.5, model: "fixture-green" })
  })

  it("fx02: clean deck-project artifact assembles via readDeckDir and scores clean", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx02")!
    const score = await scoreQuestion("fx02", join(RESULTS_DIR, "green-model", "fx02"), meta)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.validateErrorCount).toBe(0)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(true)
    expect(score.deterministic).toBe(true)
    // "kpi_cards" is used and expected — "chart" is expected but absent.
    expect(score.coverageHits).toEqual(["kpi_cards"])
    expect(score.self).toEqual({ tokens: 900, duration_seconds: 30, model: "fixture-green" })
  })

  it("fx03 (green): clean bare IR using row_cards, no self-reported meta present", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx03")!
    const score = await scoreQuestion("fx03", join(RESULTS_DIR, "green-model", "fx03"), meta)
    expect(score.validatePass).toBe(true)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(true)
    expect(score.deterministic).toBe(true)
    expect(score.coverageHits).toEqual(["row_cards"])
    expect(score.self).toBeUndefined()
  })
})

// ── scoreQuestion — degraded fixtures ──

describe("scoreQuestion — degraded-model (validate-failing / audit-positive / broken JSON)", () => {
  it("fx01 (degraded): malformed JSON scores a fail with a reason, never throws", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx01")!
    const score = await scoreQuestion("fx01", join(RESULTS_DIR, "degraded-model", "fx01"), meta)
    expect(score.reason).toMatch(/malformed JSON/)
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
    expect(score.coverageHits).toEqual([])
    // notes-column reproducibility across machines: the embedded path is
    // repo-root-relative, not the machine-specific absolute path.
    expect(score.reason).not.toContain(REPO_ROOT)
    // In the platform's own separator: the scorer strips the root prefix and
    // leaves the rest of the path as the filesystem spelled it.
    expect(score.reason).toContain(join("tests", "bench", "fixtures", "results", "degraded-model", "fx01", "broken.json"))
  })

  it("fx02 (degraded): unknown theme id fails validateIr — validatePass false, errors > 0, render also fails", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx02")!
    const score = await scoreQuestion("fx02", join(RESULTS_DIR, "degraded-model", "fx02"), meta)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(false)
    expect(score.validateErrorCount).toBeGreaterThan(0)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(false)
    expect(score.renderError).toBeDefined()
    expect(score.deterministic).toBeNull()
  })

  it("fx03 (degraded): validates clean but auditDeck flags a real low-contrast finding (steps on ledger)", async () => {
    // This fixture needs a low-contrast source that is real, theme-stable
    // and out of scope for whatever fix round is running — and it has now
    // outlived two of them. It started as kpi_cards' hardcoded delta-arrow
    // red on luxe (fixed via `accessibleInk`, see kpi.tsx's `deltaColor`),
    // then became `code.tsx`'s gutter gray (2026-08-15 visual review: the
    // gray was fine, the tier was wrong — line numbers are meta tier now,
    // see `code.tsx`'s own `LINE_NUM_COLOR` comment).
    //
    // Then `architecture`'s primary-on-panel pairing on `ledger`, until the
    // 2026-10 terminal round checked its layer inks against their band.
    //
    // Now `steps` on `ledger`: its step numbers are painted in a fill colour
    // that sits 1.05:1 on the chevron under them, the same root cause
    // architecture had (a dark theme's primary is a fill, not an ink). When
    // that is fixed too, the next real source goes here.
    // `kpi_cards` stays in the fixture for `coverageHits` below.
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const meta = metas.find((m) => m.id === "fx03")!
    const score = await scoreQuestion("fx03", join(RESULTS_DIR, "degraded-model", "fx03"), meta)
    expect(score.validatePass).toBe(true)
    expect(score.auditFindingCount).toBeGreaterThan(0)
    expect(score.renderOk).toBe(true)
    expect(score.coverageHits).toEqual(["kpi_cards"])
  })
})

describe("scoreQuestion — missing artifact", () => {
  it("a question directory that was never created scores a fail with a reason, never throws", async () => {
    const score = await scoreQuestion("fx99", join(RESULTS_DIR, "green-model", "fx99"), undefined)
    expect(score.reason).toMatch(/no result directory/)
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
  })
})

// ── loadArtifact's two remaining unexercised failure branches (task-2
// review, Minor finding 2): a readDeckDir/assembleDeck structural-assembly
// error, and the "ambiguous artifact" (>1 candidate *.json) case. Both
// fixtures use standalone fx97/fx98 ids that are not part of the
// tests/bench/fixtures/questions bank (same pattern as fx99 above) so they don't
// perturb the green/degraded-model aggregate counts asserted elsewhere.

describe("scoreQuestion — deck-project structural-assembly failure", () => {
  it("a page file that redeclares a plan-locked field fails readDeckDir's assembleDeck step, scores a fail with a reason, never throws", async () => {
    const score = await scoreQuestion("fx98", join(RESULTS_DIR, "degraded-model", "fx98"), undefined)
    expect(score.reason).toMatch(/deck project directory failed to assemble/)
    expect(score.reason).toMatch(/"heading" is locked by the spec/)
    expect(score.validatePass).toBe(false)
    expect(score.validateErrorCount).toBe(0)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
    expect(score.coverageHits).toEqual([])
    // relativized, not the machine-specific absolute path
    expect(score.reason).not.toContain(REPO_ROOT)
  })
})

describe("scoreQuestion — ambiguous artifact", () => {
  it("a result directory with more than one candidate *.json file scores a fail with a reason naming both, never throws", async () => {
    const score = await scoreQuestion("fx97", join(RESULTS_DIR, "degraded-model", "fx97"), undefined)
    expect(score.reason).toMatch(/ambiguous artifact/)
    expect(score.reason).toContain("alt.json")
    expect(score.reason).toContain("answer.json")
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
    expect(score.coverageHits).toEqual([])
    // relativized, not the machine-specific absolute path
    expect(score.reason).not.toContain(REPO_ROOT)
    expect(score.reason).toContain(join("tests", "bench", "fixtures", "results", "degraded-model", "fx97"))
  })
})

// ── scoreQuestion — local asset resolution (defect H, 2026-07-20 bench-driven
// fixes wave): a relative assets.images[id].src must resolve against the
// artifact's own directory, the same way real CLI `render` resolves it
// (`resolveLocalAssets`, `../../src/cli/load-ir.ts`, called with `baseDir`
// = the IR file's directory for a bare IR, or `readDeckDir`'s own `deckDir`
// for a deck-project directory — both equal `resultDir` here). Before this
// fix, `generatePptx` received the unresolved relative src untouched,
// `inlinePptxAssets` tried to `fetch()` it as a URL, and the render failed —
// misscoring a renderable artifact as `renderOk: false`. Both artifact
// shapes get their own standalone fixture (fx96 bare IR, fx95 deck-project)
// since `loadArtifact` dispatches between two entirely different code paths
// (a raw `*.json` parse vs. `readDeckDir`) that both needed the fix.

describe("scoreQuestion — bare IR with a relative local asset path resolves and renders (defect H)", () => {
  it("fx96: assets.images.pic.src is a relative 'assets/pic.png' — resolves against resultDir and renders deterministically", async () => {
    const score = await scoreQuestion("fx96", join(RESULTS_DIR, "green-model", "fx96"), undefined)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    expect(score.renderError).toBeUndefined()
    expect(score.deterministic).toBe(true)
  })
})

describe("scoreQuestion — deck-project directory with a relative local asset path resolves and renders (defect H)", () => {
  it("fx95: assets/pic.png scanned by readDeckDir stays relative until the scorer resolves it against deckDir (== resultDir)", async () => {
    const score = await scoreQuestion("fx95", join(RESULTS_DIR, "green-model", "fx95"), undefined)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    expect(score.renderError).toBeUndefined()
    expect(score.deterministic).toBe(true)
  })
})

// ── coverage: background-asset blind spot (T0b fix 3, bench-evidence) ──
//
// extractComponentTypes used to scan only slides[].components[].type — a
// slide whose "image" expectation is satisfied by a full-bleed background
// photo (background.kind === "asset", src/ir/index.ts's BackgroundSpec)
// rather than an explicit `image` component scored as a coverage miss even
// though the deck genuinely used a photo (q06/q12 false negatives,
// .issues/notes/quality-evidence.md item 3). Standalone fx94 fixture
// (not part of the shared questions/ bank — same "isolated fx9x id + inline
// meta" pattern fx95/fx96/fx97/fx98/fx99 above use) so this doesn't perturb
// the main bank's aggregate-count assertions elsewhere in this file.

describe("scoreQuestion — background-asset coverage detection (T0b fix 3)", () => {
  it("fx94: a background-asset cover photo counts as an 'image' coverage hit even with zero image components", async () => {
    const meta: QuestionMeta = { id: "fx94", coverage: { expects_components: ["image"] } }
    const score = await scoreQuestion("fx94", join(RESULTS_DIR, "green-model", "fx94"), meta)
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    // The fixture's only slide-level image expression is background.kind ===
    // "asset" — zero components[].type entries anywhere in the deck — so
    // this hit can only come from the background scan, not the pre-existing
    // components[] walk.
    expect(score.coverageHits).toEqual(["image"])
  })

  it("fx94: an expectation not satisfied by either components[] or a background asset still misses, same as before", async () => {
    const meta: QuestionMeta = { id: "fx94", coverage: { expects_components: ["image", "kpi_cards"] } }
    const score = await scoreQuestion("fx94", join(RESULTS_DIR, "green-model", "fx94"), meta)
    expect(score.coverageHits).toEqual(["image"])
  })
})

// ── report generation shape ──

describe("renderModelReport / renderSummaryReport", () => {
  it("produces a per-model report with one row per question and an aggregates section", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const report = await scoreModel("green-model", join(RESULTS_DIR, "green-model"), metas)
    const md = renderModelReport(report.modelTag, report.scores)
    expect(md).toContain("# pptwise benchmark report — green-model")
    expect(md).toContain("| fx01 |")
    expect(md).toContain("| fx02 |")
    expect(md).toContain("| fx03 |")
    expect(md).toContain("## Aggregates")
    expect(md).toContain("questions scored: 3")
    // no timestamp in the report body (reproducibility, AGENTS.md)
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  })

  it("produces a cross-model summary with one row per model, sorted", async () => {
    const metas = await loadQuestionMetas(QUESTIONS_DIR)
    const green = await scoreModel("green-model", join(RESULTS_DIR, "green-model"), metas)
    const degraded = await scoreModel("degraded-model", join(RESULTS_DIR, "degraded-model"), metas)
    const md = renderSummaryReport([green, degraded])
    expect(md).toContain("# pptwise benchmark — cross-model summary")
    const degradedLine = md.split("\n").find((l) => l.startsWith("| degraded-model"))!
    const greenLine = md.split("\n").find((l) => l.startsWith("| green-model"))!
    expect(degradedLine).toBeDefined()
    expect(greenLine).toBeDefined()
    // degraded-model's validate pass rate must be strictly lower than green-model's
    const rate = (line: string) => Number(line.split("|")[3]!.trim().replace("%", ""))
    expect(rate(degradedLine)).toBeLessThan(rate(greenLine))
    // alphabetical: "degraded-model" < "green-model"
    expect(md.indexOf(degradedLine)).toBeLessThan(md.indexOf(greenLine))
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  })
})

// ── tool rejections vs tool errors — harness refusals are not the model's fault ──

describe("tool rejection accounting", () => {
  let tmp: string

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  })

  function score(id: string, self: QuestionScore["self"]): QuestionScore {
    return {
      id,
      validatePass: true,
      validateErrorCount: 0,
      auditFindingCount: 0,
      renderOk: true,
      deterministic: true,
      coverageHits: [],
      expectedComponents: [],
      self,
    }
  }

  it("scoreQuestion reads tool_calls / tool_rejections / tool_errors from a harness-written meta.json", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-rejections-"))
    const resultDir = join(tmp, "q01")
    mkdirSync(resultDir, { recursive: true })
    writeFileSync(
      join(resultDir, "meta.json"),
      JSON.stringify({ tool_calls: 12, tool_rejections: 3, tool_errors: 2, duration_seconds: 9 }),
    )
    const s = await scoreQuestion("q01", resultDir, { id: "q01" })
    expect(s.self?.tool_calls).toBe(12)
    expect(s.self?.tool_rejections).toBe(3)
    expect(s.self?.tool_errors).toBe(2)
  })

  it("the per-model report carries the two counts as separate columns and separate aggregate lines", () => {
    const md = renderModelReport("m", [
      score("q01", { tool_calls: 10, tool_rejections: 2, tool_errors: 1 }),
      score("q02", { tool_calls: 4, tool_rejections: 0, tool_errors: 3 }),
      score("q03", undefined),
    ])
    const header = md.split("\n").find((l) => l.startsWith("| id |"))!
    expect(header).toContain("| toolCalls | toolRejections | toolErrors |")
    expect(md.split("\n").find((l) => l.startsWith("| q01 |"))).toContain("| 10 | 2 | 1 |")
    expect(md).toContain("- tool rejections (harness refused the call, not counted against the model): 2 across 1 of 2 questions with a tool loop")
    expect(md).toContain("- tool errors (call ran, reported failure): 4 across 2 of 2 questions with a tool loop")
  })

  it("the cross-model summary keeps rejections and errors in separate columns", () => {
    const md = renderSummaryReport([
      { modelTag: "m", scores: [score("q01", { tool_calls: 10, tool_rejections: 2, tool_errors: 1 })] },
    ])
    const header = md.split("\n").find((l) => l.startsWith("| model |"))!
    expect(header).toContain("| tool rejections | tool errors |")
    expect(md.split("\n").find((l) => l.startsWith("| m |"))).toContain("| 2 | 1 |")
  })
})

// ── scorer reproducibility: the double-run byte assertion ──

describe("runScoring — reproducibility", () => {
  it("two independent runs over the same fixtures produce byte-identical report content", async () => {
    const runA = await runScoring(QUESTIONS_DIR, RESULTS_DIR)
    const runB = await runScoring(QUESTIONS_DIR, RESULTS_DIR)
    expect(runA.writes.map((w) => w.path)).toEqual(runB.writes.map((w) => w.path))
    expect(runA.writes.length).toBeGreaterThan(0)
    for (let i = 0; i < runA.writes.length; i++) {
      expect(runB.writes[i]!.content).toBe(runA.writes[i]!.content)
    }
  })

  it("walks both fixture models and writes a report.md path per model plus one summary.md", async () => {
    const run = await runScoring(QUESTIONS_DIR, RESULTS_DIR)
    const paths = run.writes.map((w) => w.path).sort()
    expect(paths).toEqual(
      [
        join(RESULTS_DIR, "degraded-model", "report.md"),
        join(RESULTS_DIR, "green-model", "report.md"),
        join(RESULTS_DIR, "summary.md"),
      ].sort(),
    )
  })

  it("no report body contains an ISO timestamp or other clock-derived text", async () => {
    const run = await runScoring(QUESTIONS_DIR, RESULTS_DIR)
    for (const w of run.writes) {
      expect(w.content).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
    }
  })
})

// ── custom theme files travel with the artifact (codex review R3) ──
//
// The agentic whitelist lets a model run `theme new` / `theme fork` /
// `brand extract`, and the CLI's own validate/render resolve the resulting
// file through the three-level lookup (deck-local theme.json, workspace
// themes/, built-ins — `resolveThemeByName`, src/cli/theme-resolve.ts).
// The scorer has to resolve the same file the same way, or a deck the model
// validated and rendered cleanly in its tool loop scores "unknown theme"
// here (custom id), or — worse — silently renders under a same-named
// built-in (a forked `brief` still called `brief`). Both artifact shapes
// get a case: a bare IR with a workspace `themes/` file, and a deck project
// with a deck-local `theme.json`. `forkTheme` gives the copy a primary the
// built-in does not have, so "the file's own colors reached the render
// chain" is a checkable fact, not an inference from a passing validate.

describe("scoreQuestion — custom theme files beside the artifact (codex review R3)", () => {
  let tmp: string

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  })

  const FORK_PRIMARY = "#0B5FFF"

  function sketchTheme() {
    return forkTheme(themeFileFromPreset("brief", { id: "sketch" }), { primary: FORK_PRIMARY }, { id: "sketch" })
  }

  it("a bare IR bound to a workspace themes/ theme resolves that file's definition and scores clean", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-theme-"))
    mkdirSync(join(tmp, "themes"), { recursive: true })
    const theme = sketchTheme()
    expect(theme.style.colors.primary).toBe(FORK_PRIMARY)
    writeFileSync(join(tmp, "themes", "sketch.theme.json"), JSON.stringify(theme))
    const ir = JSON.parse(readFileSync(join(RESULTS_DIR, "green-model", "fx01", "answer.json"), "utf8")) as { theme: unknown }
    ir.theme = { id: "sketch" }
    writeFileSync(join(tmp, "deck.json"), JSON.stringify(ir))

    const loaded = await loadArtifact(tmp)
    expect("error" in loaded ? loaded.error : undefined).toBeUndefined()
    if ("error" in loaded) return
    expect(loaded.theme?.id).toBe("sketch")
    expect(loaded.theme?.style.colors.primary).toBe(FORK_PRIMARY)

    const score = await scoreQuestion("t1", tmp, { id: "t1" })
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.validateErrorCount).toBe(0)
    expect(score.renderOk).toBe(true)
    expect(score.renderError).toBeUndefined()
    expect(score.deterministic).toBe(true)
  })

  it("a deck project bound to a deck-local theme.json assembles against that file and scores clean", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-theme-"))
    cpSync(join(RESULTS_DIR, "green-model", "fx02"), tmp, { recursive: true })
    const spec = JSON.parse(readFileSync(join(tmp, "deck.spec.json"), "utf8")) as { theme: string }
    spec.theme = "sketch"
    writeFileSync(join(tmp, "deck.spec.json"), JSON.stringify(spec))
    writeFileSync(join(tmp, "theme.json"), JSON.stringify(sketchTheme()))

    const loaded = await loadArtifact(tmp)
    expect("error" in loaded ? loaded.error : undefined).toBeUndefined()
    if ("error" in loaded) return
    expect(loaded.theme?.style.colors.primary).toBe(FORK_PRIMARY)

    const score = await scoreQuestion("t2", tmp, { id: "t2" })
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.renderOk).toBe(true)
    expect(score.deterministic).toBe(true)
  })

  it("a theme file that exists but cannot be loaded is a scoring reason, never a silent fall-through to a built-in", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-theme-"))
    mkdirSync(join(tmp, "themes"), { recursive: true })
    writeFileSync(join(tmp, "themes", "brief.theme.json"), "{ not json")
    writeFileSync(join(tmp, "deck.json"), readFileSync(join(RESULTS_DIR, "green-model", "fx01", "answer.json")))

    const score = await scoreQuestion("t3", tmp, { id: "t3" })
    expect(score.reason).toMatch(/theme "brief" could not be resolved/)
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
  })
})

// ── placement.json: the runner's record of a theme lookup the CLI refused
// (codex review R9). The scorer reads it before resolving anything, so a
// broken theme file that never travelled cannot be papered over by a
// built-in of the same name. ──

describe("scoreQuestion — placement.json records a theme lookup the CLI refused (codex review R9)", () => {
  let tmp: string

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  })

  function bareIr(): void {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-placement-"))
    writeFileSync(join(tmp, "deck.json"), readFileSync(join(RESULTS_DIR, "green-model", "fx01", "answer.json")))
  }

  it("a recorded resolve error is the scoring reason, and the built-in of that name is never consulted", async () => {
    bareIr()
    const themeError = "theme file /elsewhere/workspace/brief.theme.json is not valid JSON: Expected property name"
    writeFileSync(join(tmp, "placement.json"), JSON.stringify({ themeName: "brief", stage: "resolve", themeError }))

    const loaded = await loadArtifact(tmp)
    expect("error" in loaded ? loaded.error : "resolved a theme").toContain(themeError)
    const score = await scoreQuestion("p1", tmp, { id: "p1" })
    expect(score.reason).toMatch(/theme "brief" could not be resolved/)
    expect(score.reason).toContain(themeError)
    expect(score.validatePass).toBe(false)
    expect(score.validateErrorCount).toBe(0)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
  })

  it("a recorded rebind refusal is the scoring reason verbatim", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-placement-"))
    cpSync(join(RESULTS_DIR, "green-model", "fx02"), tmp, { recursive: true })
    const spec = JSON.parse(readFileSync(join(tmp, "deck.spec.json"), "utf8")) as { theme: string }
    spec.theme = "sketch"
    writeFileSync(join(tmp, "deck.spec.json"), JSON.stringify(spec))
    const themeError = 'cannot rebind theme "brief" to "sketch": menus differ. A same-menu color fork is allowed.'
    writeFileSync(join(tmp, "placement.json"), JSON.stringify({ themeName: "sketch", stage: "rebind", themeError }))

    const score = await scoreQuestion("p2", tmp, { id: "p2" })
    expect(score.reason).toContain(themeError)
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
  })

  it("a recorded unknown-theme error stays a validate error, the way validateIr reports it on its own", async () => {
    bareIr()
    const ir = JSON.parse(readFileSync(join(tmp, "deck.json"), "utf8")) as { theme: unknown }
    ir.theme = { id: "nonesuch" }
    writeFileSync(join(tmp, "deck.json"), JSON.stringify(ir))
    writeFileSync(
      join(tmp, "placement.json"),
      JSON.stringify({ themeName: "nonesuch", stage: "resolve", themeError: 'unknown theme "nonesuch". Themes available: brief' }),
    )

    const score = await scoreQuestion("p3", tmp, { id: "p3" })
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(false)
    expect(score.validateErrorCount).toBeGreaterThan(0)
  })

  it("a placement.json that is not the runner's record is a scoring reason, not ignored", async () => {
    bareIr()
    writeFileSync(join(tmp, "placement.json"), "{ not json")
    const broken = await scoreQuestion("p4", tmp, { id: "p4" })
    expect(broken.validatePass).toBe(false)
    expect(broken.reason).toMatch(/unreadable placement\.json/)

    writeFileSync(join(tmp, "placement.json"), JSON.stringify({ themeName: "brief" }))
    const wrongShape = await scoreQuestion("p5", tmp, { id: "p5" })
    expect(wrongShape.validatePass).toBe(false)
    expect(wrongShape.reason).toMatch(/unreadable placement\.json .*no stage/)

    // the record names a theme the artifact does not bind: a harness bug, not a lookup to trust
    writeFileSync(join(tmp, "placement.json"), JSON.stringify({ themeName: "sketch", stage: "resolve", themeError: "x is not valid JSON" }))
    const wrongName = await scoreQuestion("p6", tmp, { id: "p6" })
    expect(wrongName.validatePass).toBe(false)
    expect(wrongName.reason).toMatch(/placement\.json .*records theme "sketch" but the artifact binds "brief"/)
  })

  it("placement.json is never a bare-IR candidate", async () => {
    bareIr()
    writeFileSync(join(tmp, "placement.json"), JSON.stringify({ themeName: "brief", stage: "resolve", themeError: "x is not valid JSON" }))
    const loaded = await loadArtifact(tmp)
    expect("error" in loaded ? loaded.error : "").not.toMatch(/ambiguous artifact/)
  })
})

// ── meta.json's own failure record gates scoring (codex review R20). A
// placement that threw part way can leave the result root with the IR but
// not the theme it was rendered under and no placement.json; scored as
// usual, the same-named built-in takes over and the failure vanishes. The
// runner's `status: "failed"` is read first and the question is not scored
// at all. ──

describe("scoreQuestion — a failed run's meta.json makes the question unscorable (codex review R20)", () => {
  let tmp: string

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  })

  const THESIS_PRIMARY = "#0E6245"
  const BUILTIN_BRIEF_PRIMARY = "#1E2A4A"

  it("a placement-stage failure is a runner failure with the stage and error as the reason, and the artifact is never loaded", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-runner-failed-"))
    // What a placement failure leaves behind: deck.json copied, the local
    // theme.json (id brief, menu and colors from thesis) not carried, no
    // placement.json. Scored as usual this would resolve the built-in brief.
    writeFileSync(join(tmp, "deck.json"), readFileSync(join(RESULTS_DIR, "green-model", "fx01", "answer.json")))
    const stranded = themeFileFromPreset("thesis", { id: "brief" })
    expect(stranded.style.colors.primary).toBe(THESIS_PRIMARY)
    const loaded = await loadArtifact(tmp)
    expect("error" in loaded ? loaded.error : loaded.theme?.style.colors.primary).toBe(BUILTIN_BRIEF_PRIMARY)
    const error = "Error: injected: deferred CLI module could not load"
    writeFileSync(
      join(tmp, "meta.json"),
      JSON.stringify({ mode: "agentic", rounds: 2, tool_calls: 2, tool_rejections: 0, tool_errors: 0, status: "failed", stage: "placement", error }),
    )

    const score = await scoreQuestion("r1", tmp, { id: "r1", coverage: { expects_components: ["kpi_cards"] } })
    expect(score.infraFailed).toBe(true)
    expect(score.reason).toBe(`runner failed at placement: ${error}`)
    expect(score.validatePass).toBe(false)
    expect(score.validateErrorCount).toBe(0)
    expect(score.auditFindingCount).toBe(0)
    expect(score.renderOk).toBe(false)
    expect(score.deterministic).toBeNull()
    expect(score.coverageHits).toEqual([])
    expect(score.expectedComponents).toEqual(["kpi_cards"])
    expect(score.self).toMatchObject({ status: "failed", stage: "placement", error, tool_calls: 2 })
  })

  it("a tool-loop failure is a runner failure too, not a 'no artifact found' model failure", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-runner-failed-"))
    writeFileSync(
      join(tmp, "meta.json"),
      JSON.stringify({ mode: "agentic", rounds: 1, tool_calls: 0, status: "failed", stage: "tool-loop", error: "Error: HTTP 502: bad gateway" }),
    )
    const score = await scoreQuestion("r2", tmp, { id: "r2" })
    expect(score.infraFailed).toBe(true)
    expect(score.reason).toBe("runner failed at tool-loop: Error: HTTP 502: bad gateway")
    expect(score.validatePass).toBe(false)
    expect(score.renderOk).toBe(false)
  })

  it("a completed run's meta (no status) scores as before, and a status other than failed is not a failure record", async () => {
    tmp = mkdtempSync(join(tmpdir(), "bench-score-runner-failed-"))
    writeFileSync(join(tmp, "deck.json"), readFileSync(join(RESULTS_DIR, "green-model", "fx01", "answer.json")))
    writeFileSync(join(tmp, "meta.json"), JSON.stringify({ mode: "agentic", rounds: 3, tool_calls: 2, status: "ok" }))
    const score = await scoreQuestion("r3", tmp, { id: "r3" })
    expect(score.infraFailed).toBeUndefined()
    expect(score.reason).toBeUndefined()
    expect(score.validatePass).toBe(true)
    expect(score.self?.status).toBeUndefined()
  })

  function scored(id: string, validatePass: boolean, self?: QuestionScore["self"]): QuestionScore {
    return {
      id,
      validatePass,
      validateErrorCount: validatePass ? 0 : 1,
      auditFindingCount: 0,
      renderOk: validatePass,
      deterministic: validatePass ? true : null,
      coverageHits: validatePass ? ["kpi_cards"] : [],
      expectedComponents: ["kpi_cards"],
      self,
    }
  }

  function runnerFailed(id: string, stage: string): QuestionScore {
    return {
      id,
      validatePass: false,
      validateErrorCount: 0,
      auditFindingCount: 0,
      renderOk: false,
      deterministic: null,
      coverageHits: [],
      expectedComponents: ["kpi_cards"],
      reason: `runner failed at ${stage}: Error: boom`,
      infraFailed: true,
      self: { tool_calls: 2, tool_rejections: 0, tool_errors: 0, status: "failed", stage, error: "Error: boom" },
    }
  }

  it("the per-model report counts runner failures on their own line and keeps them out of every rate", () => {
    const md = renderModelReport("m", [
      scored("q01", true, { tool_calls: 4, tool_rejections: 0, tool_errors: 0 }),
      scored("q02", false, { tool_calls: 6, tool_rejections: 0, tool_errors: 1 }),
      runnerFailed("q03", "placement"),
    ])
    const header = md.split("\n").find((l) => l.startsWith("| id |"))!
    expect(header).toContain("| runnerFailed |")
    expect(md.split("\n").find((l) => l.startsWith("| q03 |"))).toContain("| true | runner failed at placement: Error: boom |")
    // a scored question leaves the runnerFailed cell blank
    expect(md.split("\n").find((l) => l.startsWith("| q01 |"))!.endsWith("| 4 | 0 | 0 |  |  |")).toBe(true)
    expect(md).toContain("- questions scored: 2 (3 attempted)")
    expect(md).toContain("- runner failures (the harness or the API failed before the question finished, not scored): 1")
    // rates over the two scored questions only: 1 of 2 validates, 1 of 2 renders
    expect(md).toContain("- validate first-pass rate: 50.0%")
    expect(md).toContain("- render success rate: 50.0%")
    expect(md).toContain("- coverage hit rate (reporting only, never scored): 50.0%")
    // the tool-loop denominators stay over the runs that had a loop
    expect(md).toContain("- tool errors (call ran, reported failure): 1 across 1 of 2 questions with a tool loop")
  })

  it("the cross-model summary carries a runner failures column", () => {
    const md = renderSummaryReport([
      { modelTag: "m", scores: [scored("q01", true, { tool_calls: 4, tool_rejections: 0, tool_errors: 0 }), runnerFailed("q02", "tool-loop")] },
    ])
    const header = md.split("\n").find((l) => l.startsWith("| model |"))!
    expect(header).toContain("| runner failures |")
    const row = md.split("\n").find((l) => l.startsWith("| m |"))!
    expect(row).toContain("| 1 | 100.0% |")
    expect(row.trim().endsWith("| 1 |")).toBe(true)
  })
})
