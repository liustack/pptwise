/** End-to-end: CLI renders the examples, output must be a well-formed pptx.
 *  Requires `pnpm build` first (wired via the `e2e` npm script). */
import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import JSZip from "jszip"
import type * as Sharp from "sharp"

const OUT = ".e2e-out"
mkdirSync(OUT, { recursive: true })

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8" })
}

/** Runs `cmd args`, asserting a non-zero exit (CLI `fail()` — `process.exit(1)`
 *  after printing to stderr), and returns stderr. Throws when the command
 *  unexpectedly succeeds, or when it fails for a reason other than a normal
 *  CLI exit (e.g. the binary itself could not be spawned — no `.status`). */
function shExpectFail(cmd: string, args: string[]): string {
  try {
    execFileSync(cmd, args, { encoding: "utf8" })
  } catch (e) {
    const { status, stderr } = e as { status?: number; stderr?: string }
    if (status === undefined) throw e
    return stderr ?? ""
  }
  throw new Error(`e2e: expected "${cmd} ${args.join(" ")}" to fail, but it succeeded`)
}

/** Runs `cmd args` and returns its exit status alongside stdout/stderr,
 *  regardless of whether it succeeded — unlike `sh` (throws on any failure)
 *  and `shExpectFail` (only ever returns stderr, and requires failure). The
 *  audit leg below needs this because `pptwise audit`'s report — clean or
 *  with findings — is the command's normal output on stdout; the exit code
 *  alone is the pass/fail signal (same convention as eslint/tsc), unlike a
 *  `fail()`-routed CLI error (console.error → stderr → non-zero exit). */
function shCapture(cmd: string, args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(cmd, args, { encoding: "utf8" })
    return { status: 0, stdout, stderr: "" }
  } catch (e) {
    const { status, stdout, stderr } = e as { status?: number; stdout?: string; stderr?: string }
    if (status === undefined) throw e
    return { status, stdout: stdout ?? "", stderr: stderr ?? "" }
  }
}

// Child CLI processes inherit this env. pptwiseHome() copies ~/.pptpress or
// ~/.pptfast into ~/.pptwise when the new dir is missing, so this gate must
// never run against the developer's real home.
const e2eHome = mkdtempSync(join(tmpdir(), "pptwise-e2e-home-"))
delete process.env.PPTPRESS_HOME
delete process.env.PPTFAST_HOME
process.env.PPTWISE_HOME = e2eHome
try {

// 1) render via the built CLI
const pptxPath = join(OUT, "basic.pptx")
console.log(sh("node", ["dist/cli.js", "render", "examples/basic.json", "-o", pptxPath]))

// 2) structural assertions
const zip = await JSZip.loadAsync(readFileSync(pptxPath))
const mustExist = [
  "ppt/presentation.xml",
  "ppt/slides/slide1.xml",
  "ppt/slides/slide5.xml",
]
for (const f of mustExist) {
  if (!zip.file(f)) throw new Error(`e2e: missing ${f} in ${pptxPath}`)
}
const slide1 = await zip.file("ppt/slides/slide1.xml")!.async("string")
if (!slide1.includes("pptwise")) throw new Error("e2e: cover heading text not found in slide1.xml")

// 2a) a:ea font-slot leg (a:ea follow-up task): examples/basic.json's
//     consulting theme leads with Georgia (zero CJK glyphs), so every
//     exported run's <a:ea> must be corrected to Microsoft YaHei by
//     applyEaFontFaces (src/pptx/pptx-ea-fonts.ts) — asserted here against
//     the *built* CLI binary's real output, not a vitest mock. Unconditional
//     per the feature's own design (src/render/fonts.ts's eaFontFaceFor doc
//     comment): this holds even though basic.json's own text is all-English,
//     since the declaration doesn't depend on the run's content.
if (!/<a:latin typeface="Georgia"[^>]*\/><a:ea typeface="Microsoft YaHei"/.test(slide1)) {
  throw new Error("e2e: slide1.xml's Georgia-declared run is missing a corrected <a:ea typeface=\"Microsoft YaHei\">")
}
if (slide1.includes('<a:ea typeface="Georgia"')) {
  throw new Error("e2e: slide1.xml still carries an uncorrected <a:ea typeface=\"Georgia\"> (zero CJK glyphs)")
}
console.log("a:ea font-slot leg OK (Georgia latin run carries a corrected Microsoft YaHei ea slot)")

// 2b) package-audit leg (package-audit wave, task 1, spec §4.4/§10.4):
//     generatePptxBlob's own hard gate has no skip switch — every render in
//     this whole script (basic/branded/webp/deck-dir/structures, below)
//     already implicitly proves the gate accepted the package, since a
//     violation would have made the CLI exit non-zero with a PptwiseError
//     instead of ever writing a file. This adds direct e2e-level evidence
//     from the *built* CLI binary's own output (src/pptx/package-audit.test.ts
//     already covers the red/broken side at the vitest level, including
//     against real generatePptxBlob renders) that the invariants the gate
//     enforces genuinely hold end to end: presentation.xml's slide list and
//     the package's actual slide parts agree, and no slide has a duplicate
//     shape id.
console.log("--- package-audit leg ---")
const presentationXml = await zip.file("ppt/presentation.xml")!.async("string")
const sldIdCount = (presentationXml.match(/<p:sldId\b/g) ?? []).length
const slideKeys = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
if (sldIdCount !== slideKeys.length) {
  throw new Error(
    `e2e: package-audit leg — presentation.xml lists ${sldIdCount} slide(s) but ${pptxPath} has ${slideKeys.length} slide part(s) (the gate should have refused this before render even wrote the file)`,
  )
}
for (const slideKey of slideKeys) {
  const slideXml = await zip.file(slideKey)!.async("string")
  const ids = Array.from(slideXml.matchAll(/<p:cNvPr id="(\d+)"/g)).map((m) => m[1])
  if (new Set(ids).size !== ids.length) {
    throw new Error(`e2e: package-audit leg — ${slideKey} has a duplicate p:cNvPr id (the gate should have refused this)`)
  }
}
console.log(
  `package-audit leg OK (${pptxPath}: ${sldIdCount} slide(s) three-way consistent, no duplicate shape ids — ` +
    "the hard gate has no skip switch, so every render in this script already passed it)",
)

// 3) preview command
console.log(sh("node", ["dist/cli.js", "preview", "examples/basic.json", "-o", join(OUT, "svgs")]))

// 3b) preview --html (W7 task 2, spec §7 workflow ⑤): the self-contained
//     preview.html bundle must exist, embed every one of basic.json's 5
//     slides' SVGs exactly once, carry the keyboard-nav JS, and stay
//     self-contained — no http(s) reference anywhere except the SVG
//     namespace URI. Same filtered assertion as the unit-level check
//     (`src/cli/preview-html.test.ts`, "self-containment: no http(s)
//     reference anywhere except known SVG/XML namespace URIs") — basic.json
//     has no assets, so nothing here can fall into preview-html.ts's known
//     remote-asset limitation.
const htmlOutDir = join(OUT, "svgs-html")
console.log(
  sh("node", ["dist/cli.js", "preview", "examples/basic.json", "-o", htmlOutDir, "--html"]),
)
const previewHtmlPath = join(htmlOutDir, "preview.html")
if (!existsSync(previewHtmlPath)) throw new Error(`e2e: preview --html leg — ${previewHtmlPath} was not written`)
const previewHtml = readFileSync(previewHtmlPath, "utf8")
const svgCount = previewHtml.match(/<svg\b/g)?.length ?? 0
if (svgCount !== 5) {
  throw new Error(`e2e: preview --html leg — expected exactly 5 embedded <svg, got ${svgCount}`)
}
if (!previewHtml.includes("ArrowLeft") || !previewHtml.includes("ArrowRight")) {
  throw new Error("e2e: preview --html leg — keyboard-nav JS marker (ArrowLeft/ArrowRight) not found")
}
const KNOWN_NAMESPACE_URIS = new Set(["http://www.w3.org/2000/svg"])
const httpMatches = previewHtml.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
const unexpectedHttp = httpMatches.filter((m) => !KNOWN_NAMESPACE_URIS.has(m))
if (unexpectedHttp.length > 0) {
  throw new Error(`e2e: preview --html leg — unexpected http(s) reference(s) in preview.html: ${unexpectedHttp.join(", ")}`)
}
if (httpMatches.length === 0) {
  throw new Error("e2e: preview --html leg — expected at least the SVG namespace URI, found no http(s) substring at all")
}
console.log("preview --html leg OK (self-contained: 5 embedded svgs, keyboard-nav JS, no stray http(s) reference)")

// 3d) brand extraction leg (brand-extract wave, 裁定 5's e2e requirement):
//     programmatically built fixture zip (never a real Microsoft file) →
//     `pptwise brand extract` via the built CLI → workspace theme lookup →
//     the exported PPTX's DrawingML must carry the extracted brand colors.
//     The package-audit hard gate (leg 2b — no skip switch) already vets the
//     branded package's structure the same way it vets every other render in
//     this script; the interactive PowerPoint repair-dialog probe stays a
//     release-time manual step (docs/testing.md), same as for every leg.
console.log("--- brand extraction leg ---")
const { buildThmxBytes, DEFAULT_THMX_COLORS, PATHOLOGICAL_THMX_COLORS } = await import("../src/themes/extract/__fixtures__/thmx")
const brandFixturePath = join(OUT, "brand-fixture.pptx")
writeFileSync(brandFixturePath, Buffer.from(await buildThmxBytes({ schemeName: "E2E Brand" })))
const brandWorkspace = resolve(OUT, "brand-workspace")
mkdirSync(join(brandWorkspace, "themes"), { recursive: true })
const brandThemePath = join(brandWorkspace, "themes", "e2e-brand.theme.json")
const extractMsg = sh("node", ["dist/cli.js", "brand", "extract", brandFixturePath, "--force", "-o", brandThemePath])
console.log(extractMsg)
if (!extractMsg.includes('theme "e2e-brand"')) {
  throw new Error("e2e: brand leg — extract output does not carry the expected theme id (output-filename slug)")
}
const brandThemeFile = JSON.parse(readFileSync(brandThemePath, "utf8")) as {
  id: string
  style: { colors: { primary: string; muted: string } }
}
if (brandThemeFile.style.colors.primary !== `#${DEFAULT_THMX_COLORS.accent1}`) {
  throw new Error(
    `e2e: brand leg — extracted primary ${brandThemeFile.style.colors.primary}, expected #${DEFAULT_THMX_COLORS.accent1}`,
  )
}
const brandPptxPath = join(OUT, "brand-themed.pptx")
const brandDeck = JSON.parse(readFileSync("examples/basic.json", "utf8")) as Record<string, unknown>
brandDeck.theme = { id: "e2e-brand" }
const brandDeckPath = join(brandWorkspace, "brand-deck.json")
writeFileSync(brandDeckPath, JSON.stringify(brandDeck))
console.log(
  execFileSync("node", [resolve("dist/cli.js"), "render", "brand-deck.json", "-o", resolve(brandPptxPath)], {
    cwd: brandWorkspace,
    encoding: "utf8",
  }),
)
const brandThemedZip = await JSZip.loadAsync(readFileSync(brandPptxPath))
const brandThemedSlideXml = (
  await Promise.all(
    Object.keys(brandThemedZip.files)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .map((k) => brandThemedZip.file(k)!.async("string")),
  )
).join("")
const expectedBrandHexes = [DEFAULT_THMX_COLORS.accent1, DEFAULT_THMX_COLORS.accent2]
if (!expectedBrandHexes.some((hex) => brandThemedSlideXml.includes(hex))) {
  throw new Error(
    `e2e: brand leg — none of the extracted accent colors (${expectedBrandHexes.join(", ")}) reached the DrawingML`,
  )
}
if (!brandThemedSlideXml.includes(brandThemeFile.style.colors.muted.replace("#", ""))) {
  throw new Error("e2e: brand leg — the derived muted color did not reach the DrawingML")
}

const invalidBrandFixturePath = join(OUT, "brand-fixture-invalid.pptx")
writeFileSync(
  invalidBrandFixturePath,
  Buffer.from(await buildThmxBytes({ schemeName: "Invalid E2E Brand", colors: PATHOLOGICAL_THMX_COLORS })),
)
const invalidBrandThemePath = join(brandWorkspace, "themes", "invalid-e2e-brand.theme.json")
const invalidBrandStderr = shExpectFail("node", [
  "dist/cli.js",
  "brand",
  "extract",
  invalidBrandFixturePath,
  "-o",
  invalidBrandThemePath,
])
if (!/pptwise theme new --from <preset>/.test(invalidBrandStderr)) {
  throw new Error(`e2e: brand leg — invalid anchors did not print the manual recolor guidance: ${invalidBrandStderr}`)
}
if (existsSync(invalidBrandThemePath)) {
  throw new Error("e2e: brand leg — invalid anchors wrote a theme file before the contrast gate")
}
const uncheckedStderr = shExpectFail("node", [
  "dist/cli.js",
  "brand",
  "extract",
  brandFixturePath,
  "-o",
  invalidBrandThemePath,
  "--unchecked",
])
if (!/unknown option.*--unchecked/i.test(uncheckedStderr)) {
  throw new Error(`e2e: brand leg — retired --unchecked option was still accepted: ${uncheckedStderr}`)
}
console.log("brand extraction leg OK (fixture → extract → workspace theme lookup → brand colors in DrawingML)")

// 4) optional visual gate: LibreOffice PDF conversion (skipped when unavailable)
try {
  sh("soffice", ["--headless", "--convert-to", "pdf", "--outdir", OUT, pptxPath])
  if (!existsSync(join(OUT, "basic.pdf"))) throw new Error("no pdf produced")
  console.log("soffice PDF conversion OK")
} catch {
  console.log("soffice unavailable or failed — visual gate skipped (install LibreOffice to enable)")
}

// 5) webp asset regression leg — locks the packaged bin's sharp recode path.
//    dist/cli.js dynamic-imports "sharp" at runtime (tsup marks it external); this
//    exercises that exact path against the built CLI, not just the vitest suite.
let sharpMod: typeof Sharp.default | undefined
try {
  sharpMod = (await import("sharp")).default as unknown as typeof Sharp.default
} catch {
  console.log("sharp unavailable — webp asset leg skipped")
}
if (sharpMod) {
  // 1x1 red PNG, recoded to webp so the CLI must hit the sharp recode path
  // (png/jpeg/gif pass through untouched — webp is outside that fast path).
  const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  )
  const webpPath = join(OUT, "smoke.webp")
  await sharpMod(PNG_1PX).webp().toFile(webpPath)

  const webpDeck = {
    version: "5",
    filename: "pptwise-webp-smoke",
    theme: { id: "consulting" },
    assets: { images: { smoke: { src: "smoke.webp" } } },
    slides: [
      { type: "cover", heading: "webp smoke" },
      { type: "content", kind: "photo", heading: "Body", components: [{ type: "image", asset_id: "smoke" }] },
    ],
  }
  const webpDeckPath = join(OUT, "webp-deck.json")
  writeFileSync(webpDeckPath, JSON.stringify(webpDeck))

  const webpPptxPath = join(OUT, "webp.pptx")
  console.log(sh("node", ["dist/cli.js", "render", webpDeckPath, "-o", webpPptxPath]))

  const webpZip = await JSZip.loadAsync(readFileSync(webpPptxPath))
  for (const f of ["ppt/presentation.xml", "ppt/slides/slide1.xml", "ppt/slides/slide2.xml"]) {
    if (!webpZip.file(f)) throw new Error(`e2e: webp leg produced malformed pptx — missing ${f}`)
  }
  // The renderer silently draws an "image missing" placeholder for unresolved
  // assets instead of failing — so the zip-membership checks above pass even
  // if resolveLocalAssets/recodeWithSharp silently degrades to a no-op. Assert
  // the image was actually embedded: a media part exists, and the slide that
  // holds the image component (slide2 — see webpDeck above) references it via
  // r:embed, not just a decorative shape.
  if (!Object.keys(webpZip.files).some((k) => k.startsWith("ppt/media/"))) {
    throw new Error("e2e: webp leg — no ppt/media/* part found, image was not embedded")
  }
  const webpSlide2 = await webpZip.file("ppt/slides/slide2.xml")!.async("string")
  if (!webpSlide2.includes("r:embed")) {
    throw new Error("e2e: webp leg — slide2.xml has no r:embed reference, image was not embedded")
  }
  console.log("webp asset leg OK (sharp recode path exercised)")
}

// 6) deck project directory leg (W5 task 6): a temp plan + pages directory,
//    left with one unfilled page, must assemble as a placeholder, refuse a
//    plain render (the draft gate), render fine under --draft with the
//    placeholder as a real slide, then render normally once the page is filled.
console.log("--- deck project directory leg ---")
const deckDir = join(OUT, "deck-dir-demo")
// Start from a clean slate every run — a leftover pages/p-roadmap.json from a
// previous successful run would falsify the "starts as a placeholder" setup.
rmSync(deckDir, { recursive: true, force: true })
mkdirSync(join(deckDir, "pages"), { recursive: true })

const deckSpec = {
  version: "1",
  narrative: "boardroom-report",
  theme: "consulting",
  filename: "pptwise-e2e-deck-dir",
  pages: [
    { id: "p-cover", type: "cover", heading: "pptwise Deck Directory Demo" },
    { id: "p-goals", type: "content", kind: "points", heading: "Design goals" },
    { id: "p-roadmap", type: "content", kind: "points", heading: "Roadmap ahead" },
    { id: "p-ending", type: "ending", heading: "Thanks" },
  ],
}
writeFileSync(join(deckDir, "deck.spec.json"), JSON.stringify(deckSpec))
writeFileSync(join(deckDir, "pages", "p-cover.json"), JSON.stringify({}))
writeFileSync(
  join(deckDir, "pages", "p-goals.json"),
  JSON.stringify({
    // Short items on purpose — this spec's narrative ("boardroom-report")
    // resolves to "spacious" pacing, the tightest bullets budget
    // (PACING_BUDGETS.spacious.bullets.maxUnitsPerItem, src/scenario/index.ts).
    components: [
      {
        type: "bullets",
        items: ["Every shape stays editable", "Design tokens, not freeform drawing"],
      },
    ],
    // speaker notes (notes+preview wave, task 1) — content, not locked by the
    // spec, exported as native PowerPoint speaker notes, asserted against
    // the final render's notesSlide2.xml below.
    notes: "Emphasize that every shape stays editable in PowerPoint, not a flattened image.",
  }),
)
writeFileSync(join(deckDir, "pages", "p-ending.json"), JSON.stringify({}))
// pages/p-roadmap.json is deliberately never written yet — that spec page
// has no matching page file, so it must assemble as a placeholder.

console.log(sh("node", ["dist/cli.js", "spec", "validate", join(deckDir, "deck.spec.json")]))

const assembleOut = sh("node", ["dist/cli.js", "assemble", deckDir])
console.log(assembleOut)
if (!assembleOut.includes("(4 slides, 1 placeholder)")) {
  throw new Error(`e2e: deck-dir leg — expected assemble to report exactly 1 placeholder, got: ${assembleOut}`)
}
if (!existsSync(join(deckDir, "deck.json"))) {
  throw new Error("e2e: deck-dir leg — assemble did not write deck.json")
}

// render without --draft must refuse: one plan page (p-roadmap) is still an
// unfilled placeholder.
const draftGateStderr = shExpectFail("node", [
  "dist/cli.js",
  "render",
  deckDir,
  "-o",
  join(OUT, "deck-dir-should-not-exist.pptx"),
])
if (!/placeholder/.test(draftGateStderr) || !/--draft/.test(draftGateStderr) || !/p-roadmap/.test(draftGateStderr)) {
  throw new Error(`e2e: deck-dir leg — expected the draft-gate error naming p-roadmap, got: ${draftGateStderr}`)
}
console.log("deck-dir draft-gate leg OK (render without --draft refused)")

// render --draft must succeed, with the placeholder rendered as a real slide
// (its plan heading present, not skipped).
const draftPptxPath = join(OUT, "deck-dir-draft.pptx")
console.log(sh("node", ["dist/cli.js", "render", deckDir, "-o", draftPptxPath, "--draft"]))
const draftZip = await JSZip.loadAsync(readFileSync(draftPptxPath))
for (const f of ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/slides/slide3.xml", "ppt/slides/slide4.xml"]) {
  if (!draftZip.file(f)) throw new Error(`e2e: deck-dir leg — --draft render missing ${f}`)
}
const draftSlide3 = await draftZip.file("ppt/slides/slide3.xml")!.async("string")
if (!draftSlide3.includes("Roadmap ahead")) {
  throw new Error("e2e: deck-dir leg — placeholder page heading not found in slide3.xml under --draft")
}
console.log("deck-dir --draft leg OK (placeholder page rendered as a real slide)")

// Fill in the missing page, re-assemble (0 placeholders now), then render
// normally — no --draft needed once every page is filled.
writeFileSync(
  join(deckDir, "pages", "p-roadmap.json"),
  JSON.stringify({
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "13", label: "built-in themes" },
          { value: "33", label: "semantic component types" },
        ],
      },
    ],
  }),
)
const reassembleOut = sh("node", ["dist/cli.js", "assemble", deckDir])
console.log(reassembleOut)
if (!reassembleOut.includes("(4 slides, 0 placeholders)")) {
  throw new Error(`e2e: deck-dir leg — expected 0 placeholders after filling the page, got: ${reassembleOut}`)
}

const finalPptxPath = join(OUT, "deck-dir-final.pptx")
console.log(sh("node", ["dist/cli.js", "render", deckDir, "-o", finalPptxPath]))
const finalZip = await JSZip.loadAsync(readFileSync(finalPptxPath))
const finalSlide3 = await finalZip.file("ppt/slides/slide3.xml")!.async("string")
if (!finalSlide3.includes("13") || !finalSlide3.includes("built-in themes")) {
  throw new Error("e2e: deck-dir leg — filled page content not found in slide3.xml after the normal render")
}
console.log("deck-dir leg OK (assemble + draft gate + fill + normal render)")

// p-goals is slide 2 (cover, goals, roadmap, ending) and set `notes` above —
// must reach the exported .pptx as native speaker notes text, never onto the
// slide's own canvas XML.
if (!finalZip.file("ppt/notesSlides/notesSlide2.xml")) {
  throw new Error("e2e: deck-dir leg — missing ppt/notesSlides/notesSlide2.xml in the final render")
}
const finalNotes2 = await finalZip.file("ppt/notesSlides/notesSlide2.xml")!.async("string")
if (!finalNotes2.includes("Emphasize that every shape stays editable")) {
  throw new Error(`e2e: deck-dir leg — expected p-goals's notes text in notesSlide2.xml, got: ${finalNotes2}`)
}
const finalSlide2 = await finalZip.file("ppt/slides/slide2.xml")!.async("string")
if (finalSlide2.includes("Emphasize that every shape stays editable")) {
  throw new Error("e2e: deck-dir leg — notes text leaked onto slide2.xml's own canvas, must stay speaker-notes-only")
}
console.log("deck-dir speaker-notes leg OK (notesSlide2.xml carries p-goals's notes text, slide2.xml canvas does not)")

// 6c) removed commands are ordinary unknown commands and options.
console.log("--- old-command hard-fail leg ---")
const scenariosStderr = shExpectFail("node", ["dist/cli.js", "scenarios"])
if (!/unknown command/i.test(scenariosStderr)) {
  throw new Error(`e2e: old-command leg — expected \`pptwise scenarios\` to fail as an unknown command, got: ${scenariosStderr}`)
}
if (/pptwise narratives/.test(scenariosStderr)) {
  throw new Error(`e2e: old-command leg — \`pptwise scenarios\` must not point at \`pptwise narratives\`, got: ${scenariosStderr}`)
}
const schemaPlanStderr = shExpectFail("node", ["dist/cli.js", "schema", "--plan"])
if (!/unknown option.*--plan/i.test(schemaPlanStderr) || /pptwise schema --spec/.test(schemaPlanStderr)) {
  throw new Error(`e2e: old-command leg, expected \`pptwise schema --plan\` to be an unknown option with no replacement pointer, got: ${schemaPlanStderr}`)
}
const planValidateStderr = shExpectFail("node", ["dist/cli.js", "plan", "validate", join(deckDir, "deck.spec.json")])
if (!/unknown command.*plan/i.test(planValidateStderr) || /pptwise spec validate/.test(planValidateStderr)) {
  throw new Error(`e2e: old-command leg, expected \`pptwise plan validate\` to be an unknown command with no replacement pointer, got: ${planValidateStderr}`)
}
console.log("old-command hard-fail leg OK (removed commands and options are unknown with no replacement pointers)")

// 7) audit leg (W6 task 2, spec §7 workflow ④): a clean deck must exit 0.
//    A fixture on a normal theme (consulting, no style override) carries a
//    page that overflows a single row_cards component (6 schema-legal items,
//    each with substantial title/text/sub — measured directly against real
//    widths before writing this fixture: a full-width single column needs
//    ~676px for 6 items, well past any real content rect's ~380-471px range,
//    see docs/concepts.md's capacity section) to trip `content-dropped` via
//    row-cards.tsx's own item-level declaration, and a page with a
//    verdict_banner carrying far more text than its fixed 18px/2-line budget
//    can hold to trip `content-truncated`. Both human and --json mode exit 1.
console.log("--- audit leg ---")

const cleanAudit = shCapture("node", ["dist/cli.js", "audit", "examples/basic.json"])
console.log(cleanAudit.stdout)
if (cleanAudit.status !== 0) {
  throw new Error(
    `e2e: audit leg — expected examples/basic.json to audit clean (exit 0), got exit ${cleanAudit.status}`,
  )
}
if (!/audited 5 pages, 0 skipped, 0 findings/.test(cleanAudit.stdout)) {
  throw new Error(`e2e: audit leg — expected a clean summary line for examples/basic.json, got: ${cleanAudit.stdout}`)
}
console.log("audit clean-deck leg OK (examples/basic.json exits 0)")

// Realistic-length CJK content (not adversarial stress text) — same order of
// magnitude as docs/concepts.md's capacity-section measurement, so this
// fixture reproduces the benchmark's actual "row_cards drops items" shape
// rather than an artificially extreme one.
const ROW_CARDS_TEXT = "本季度通过精细化运营和渠道下沉实现了显著的增长，客户留存率同步提升"
const VERDICT_LONG_TEXT =
  "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明".repeat(6)

const findingsDeck = {
  version: "5",
  filename: "pptwise-e2e-audit-findings",
  theme: { id: "consulting" },
  slides: [
    { type: "cover", heading: "Audit Fixture" },
    {
      type: "content",
      kind: "points",
      id: "p-body",
      heading: "readable heading",
      components: [{ type: "paragraph", text: "some body copy on a normal consulting page" }],
    },
    {
      type: "content",
      kind: "list",
      id: "p-dropped",
      heading: "row_cards over capacity",
      components: [
        {
          type: "row_cards",
          items: [1, 2, 3, 4, 5, 6].map((n) => ({
            title: `事项标题条目编号 ${n}`,
            text: ROW_CARDS_TEXT,
            sub: "补充说明文字用于撑高卡片高度",
          })),
        },
      ],
    },
    {
      type: "content",
      kind: "points",
      id: "p-truncated",
      heading: "verdict_banner over budget",
      components: [{ type: "verdict_banner", tone: "positive", text: VERDICT_LONG_TEXT }],
    },
  ],
}
const findingsPath = join(OUT, "audit-findings.json")
writeFileSync(findingsPath, JSON.stringify(findingsDeck))

const findingsAudit = shCapture("node", ["dist/cli.js", "audit", findingsPath])
console.log(findingsAudit.stdout)
if (findingsAudit.status !== 1) {
  throw new Error(`e2e: audit leg — expected the findings fixture to exit 1, got exit ${findingsAudit.status}`)
}

// Bench-driven fix round, defect E: same fixture, same exit-1 report — a
// 6-item row_cards over capacity must surface as `content-dropped` on
// page 3 (p-dropped), and verdict_banner's over-budget text must surface as
// `content-truncated` on page 4 (p-truncated).
if (!/\[content-dropped\]/.test(findingsAudit.stdout) || !/page 3 \(p-dropped\)/.test(findingsAudit.stdout)) {
  throw new Error(
    `e2e: audit leg — expected a content-dropped finding naming page 3 (p-dropped), got: ${findingsAudit.stdout}`,
  )
}
if (!/\[content-truncated\]/.test(findingsAudit.stdout) || !/page 4 \(p-truncated\)/.test(findingsAudit.stdout)) {
  throw new Error(
    `e2e: audit leg — expected a content-truncated finding naming page 4 (p-truncated), got: ${findingsAudit.stdout}`,
  )
}
console.log("audit content-dropped/content-truncated leg OK (exit 1, both advisory codes present)")

const jsonAudit = shCapture("node", ["dist/cli.js", "audit", findingsPath, "--json"])
if (jsonAudit.status !== 1) {
  throw new Error(`e2e: audit leg — expected --json mode to also exit 1, got exit ${jsonAudit.status}`)
}
const jsonReport = JSON.parse(jsonAudit.stdout) as { findings: Array<{ code: string }> }
if (!jsonReport.findings.some((f) => f.code === "content-dropped")) {
  throw new Error(`e2e: audit leg — expected --json output to include a content-dropped finding, got: ${jsonAudit.stdout}`)
}
if (!jsonReport.findings.some((f) => f.code === "content-truncated")) {
  throw new Error(`e2e: audit leg — expected --json output to include a content-truncated finding, got: ${jsonAudit.stdout}`)
}
console.log("audit --json leg OK (machine-readable AuditReport, exit 1, content-dropped/content-truncated codes present)")

// 7b) --pixels leg (audit-v2 phase B, spec §4.3/§11.7): the one CLI surface
//     genuinely worth an e2e check for this feature — it exercises real
//     Sharp through the *built* dist/cli.js binary (installNodePlatform()'s
//     actual runtime dependency resolution), not vitest's in-process call.
//     examples/basic.json has no asset backgrounds, so this only proves the
//     pass runs and completes cleanly, not that it can find something —
//     src/audit/pixel-audit.test.ts's own real-Sharp suite already
//     covers the sampling/threshold logic end to end.
console.log("--- audit --pixels leg ---")

const pixelsAudit = shCapture("node", ["dist/cli.js", "audit", "examples/basic.json", "--pixels"])
if (pixelsAudit.status !== 0) {
  throw new Error(`e2e: audit --pixels leg — expected examples/basic.json to still audit clean (exit 0), got exit ${pixelsAudit.status}: ${pixelsAudit.stdout}`)
}
if (!/pixel-contrast check: completed/.test(pixelsAudit.stdout)) {
  throw new Error(`e2e: audit --pixels leg — expected the human summary to note the pixel-contrast check ran, got: ${pixelsAudit.stdout}`)
}

const pixelsJsonAudit = shCapture("node", ["dist/cli.js", "audit", "examples/basic.json", "--pixels", "--json"])
if (pixelsJsonAudit.status !== 0) {
  throw new Error(`e2e: audit --pixels leg — expected --pixels --json to also exit 0, got exit ${pixelsJsonAudit.status}`)
}
const pixelsReport = JSON.parse(pixelsJsonAudit.stdout) as { checks: { svg: string; pixels: string } }
if (pixelsReport.checks.pixels !== "completed") {
  throw new Error(`e2e: audit --pixels leg — expected checks.pixels "completed", got: ${JSON.stringify(pixelsReport.checks)}`)
}
console.log("audit --pixels leg OK (real Sharp through dist/cli.js, checks.pixels completed, human summary notes it)")

// 8) structure-components leg (structure-components wave 1 task 3, extended
//    by wave 2 tasks 1-3): a deck exercising all eight full-body components
//    across both waves (swot/bmc/waterfall/gantt/pest/five_forces/heatmap/
//    sankey), one per content slide, cover+ending bookending them —
//    must render to a well-formed pptx and audit clean (exit 0, 0 findings).
//    Each page states the component's semantic kind. The consulting menu
//    owns the exact face, so this leg exercises the same author-facing path
//    as a real v5 deck.
//
//    R1 evidence wave, Task T4: two more content pages, p-data-table
//    (component 33, the wave's new data_table) and p-multi-series-chart (a
//    2-series grouped bar with a legend, exercising the wave's shared-domain
//    multi-series chart fix) — appended right before the ending slide so
//    every earlier slide index (including sankey's own slide9.xml assertion
//    below) stays unchanged. Content
//    is deliberately modest (short English labels, well under data_table's
//    schema max of 8 columns/12 rows) — this leg's job is proving the full
//    CLI render -> package-audit -> CLI-audit chain accepts both new
//    behaviors end to end, not re-running T3's own dedicated 13-theme
//    stress-fixture coverage (src/audit/stress-fixtures.ts's own
//    "数据表压力测试" page already does that at schema-max scale).
console.log("--- structure-components leg ---")

const structuresDeck = {
  version: "5",
  filename: "pptwise-e2e-structure-components",
  theme: { id: "consulting" },
  slides: [
    { type: "cover", heading: "Structure Components Demo" },
    {
      type: "content",
      kind: "comparison",
      id: "p-swot",
      heading: "SWOT",
      components: [
        {
          type: "swot",
          strengths: ["Strong brand recognition", "Stable cash flow"],
          weaknesses: ["Narrow product line", "High channel dependency"],
          opportunities: ["Fast-growing emerging markets", "Favorable policy window"],
          threats: ["New entrants triggering price wars", "Rising raw material costs"],
        },
      ],
    },
    {
      type: "content",
      kind: "hierarchy",
      id: "p-bmc",
      heading: "Business Model Canvas",
      components: [
        {
          // Keep the nine canvas cells compact enough for the hierarchy face.
          type: "bmc",
          key_partners: ["Suppliers", "Resellers"],
          key_activities: ["R&D"],
          key_resources: ["Engineers"],
          value_propositions: ["One-stop", "Lower cost"],
          customer_relationships: ["Support"],
          channels: ["Direct", "Partners"],
          customer_segments: ["Mid-market"],
          cost_structure: ["R&D", "Cloud"],
          revenue_streams: ["Subscription", "Services"],
        },
      ],
    },
    {
      type: "content",
      kind: "data",
      id: "p-waterfall",
      heading: "Revenue Bridge",
      components: [
        {
          type: "waterfall",
          unit: "k",
          items: [
            { label: "Opening", value: 500, kind: "total" },
            { label: "New sales", value: 220 },
            { label: "Churn", value: -150 },
            { label: "Upsell", value: 80 },
            { label: "Refunds", value: -40 },
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "process",
      id: "p-gantt",
      heading: "Project Timeline",
      components: [
        {
          type: "gantt",
          axis_labels: ["W1", "W4", "W7", "W10"],
          items: [
            { label: "Design", start: 0, end: 3 },
            { label: "Build", start: 2, end: 7 },
            { label: "Test", start: 6, end: 9 },
            { label: "Launch", start: 9, end: 10 },
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "comparison",
      id: "p-pest",
      heading: "PEST Analysis",
      components: [
        {
          type: "pest",
          political: { items: ["Tightening data-privacy regulation", "Rising trade tariffs"] },
          economic: { title: "Macro Economy", items: ["Falling interest rates", "Consumer confidence rebound"] },
          social: { items: ["Generational shift in habits", "Normalized remote work"] },
          technological: { items: ["Rapid generative-AI adoption", "Falling edge-compute cost"] },
        },
      ],
    },
    {
      type: "content",
      kind: "hierarchy",
      id: "p-five-forces",
      heading: "Porter's Five Forces",
      components: [
        {
          type: "five_forces",
          rivalry: { items: ["Top 3 players hold 60%+ share", "Persistent price competition"], intensity: "high" },
          new_entrants: { items: ["High licensing barrier to entry"], intensity: "low" },
          supplier_power: { items: ["Supply shortage"], intensity: "medium" },
          buyer_power: { items: ["Concentration"], intensity: "medium" },
          substitutes: { items: ["Free open-source alternatives"], intensity: "high" },
        },
      ],
    },
    {
      type: "content",
      kind: "data",
      id: "p-heatmap",
      heading: "Regional Performance Heatmap",
      components: [
        {
          type: "heatmap",
          x_labels: ["Q1", "Q2", "Q3", "Q4"],
          y_labels: ["North", "South", "East"],
          values: [
            [12, 45, 78, 33],
            [-20, 5, 60, 90],
            [50, 50, 50, 50],
          ],
          show_values: true,
          x_title: "Quarter",
          y_title: "Region",
        },
      ],
    },
    {
      type: "content",
      kind: "process",
      id: "p-sankey",
      heading: "Energy Flow",
      components: [
        {
          type: "sankey",
          nodes: [
            { id: "coal", label: "Coal" },
            { id: "gas", label: "Gas" },
            { id: "renewables", label: "Renewables" },
            { id: "grid", label: "Grid" },
            { id: "homes", label: "Homes" },
            { id: "industry", label: "Industry" },
          ],
          links: [
            { from: "coal", to: "grid", value: 30 },
            { from: "gas", to: "grid", value: 50 },
            { from: "renewables", to: "grid", value: 20 },
            { from: "grid", to: "homes", value: 55 },
            { from: "grid", to: "industry", value: 45 },
          ],
        },
      ],
    },
    // R1 evidence wave, Task T4 — these two are appended here after sankey
    // and before ending.
    {
      type: "content",
      kind: "data",
      id: "p-data-table",
      heading: "Regional Performance",
      components: [
        {
          type: "data_table",
          columns: [
            { key: "region", label: "Region" },
            { key: "q1", label: "Q1", align: "right" },
            { key: "q2", label: "Q2", align: "right" },
            { key: "yoy", label: "YoY", align: "right" },
          ],
          rows: [
            { cells: { region: "North", q1: "120", q2: "138", yoy: "+15%" } },
            { cells: { region: "South", q1: "98", q2: "104", yoy: "+6%" } },
            { cells: { region: "East", q1: "76", q2: "81", yoy: "+7%" } },
            { cells: { region: "West", q1: "142", q2: "150", yoy: "+6%" } },
            { cells: { region: "Total", q1: "436", q2: "473", yoy: "+8%" }, emphasis: "total" },
          ],
          source: "Internal finance system, FY26 Q2 close",
        },
      ],
    },
    {
      type: "content",
      kind: "data",
      id: "p-multi-series-chart",
      heading: "Revenue vs Target",
      components: [
        {
          type: "chart",
          chart_type: "bar",
          series: [
            {
              name: "Revenue",
              data: [{ x: "Q1", y: 120 }, { x: "Q2", y: 138 }, { x: "Q3", y: 145 }, { x: "Q4", y: 160 }],
            },
            {
              name: "Target",
              data: [{ x: "Q1", y: 110 }, { x: "Q2", y: 130 }, { x: "Q3", y: 140 }, { x: "Q4", y: 150 }],
            },
          ],
        },
      ],
    },
    { type: "ending", heading: "Thanks" },
  ],
}
const structuresPath = join(OUT, "structures.json")
writeFileSync(structuresPath, JSON.stringify(structuresDeck))

console.log(sh("node", ["dist/cli.js", "validate", structuresPath]))

const structuresPptxPath = join(OUT, "structures.pptx")
console.log(sh("node", ["dist/cli.js", "render", structuresPath, "-o", structuresPptxPath]))
const structuresZip = await JSZip.loadAsync(readFileSync(structuresPptxPath))
for (const f of ["ppt/presentation.xml", "ppt/slides/slide1.xml", "ppt/slides/slide12.xml"]) {
  if (!structuresZip.file(f)) throw new Error(`e2e: structure-components leg — missing ${f} in ${structuresPptxPath}`)
}
// Sankey differentiation check (plan task 3): its own slide (p-sankey, the
// 9th content slide -> slide9.xml, cover is slide1) must carry zero <p:pic>
// and at least one <a:custGeom> — native editable flow bands, never a
// rasterized image (the direct counterpoint to the official pptx skill's
// "no native form, ship as an image" classification for this exact chart type).
const sankeySlideXml = await structuresZip.file("ppt/slides/slide9.xml")!.async("string")
if (sankeySlideXml.includes("<p:pic>")) {
  throw new Error("e2e: structure-components leg — sankey slide unexpectedly contains <p:pic> (should be zero, native vectors only)")
}
if (!/<a:custGeom>/.test(sankeySlideXml)) {
  throw new Error("e2e: structure-components leg — sankey slide has no <a:custGeom> (expected its flow bands to export as native vector paths)")
}
console.log("structure-components render leg OK (12-slide pptx, all parts present, sankey slide is zero-p:pic/native-custGeom)")

const structuresAudit = shCapture("node", ["dist/cli.js", "audit", structuresPath])
console.log(structuresAudit.stdout)
if (structuresAudit.status !== 0) {
  throw new Error(
    `e2e: structure-components leg — expected the swot/bmc/waterfall/gantt/pest/five_forces/heatmap/sankey/data_table/chart deck to audit clean (exit 0), got exit ${structuresAudit.status}: ${structuresAudit.stdout}`,
  )
}
if (!/audited 12 pages, 0 skipped, 0 findings/.test(structuresAudit.stdout)) {
  throw new Error(`e2e: structure-components leg — expected a clean summary line, got: ${structuresAudit.stdout}`)
}
console.log("structure-components audit leg OK (exit 0, 0 findings)")

// 9) dual-threshold severity leg (borrow wave, Task 2 — validate quality-gate
//    severity recalibration): a warn-only deck (missing heading — editorial,
//    not content-loss) must still validate/render successfully with a
//    "warning: ..." note, exit 0. A bullet item past the new geometric error
//    ceiling (CAPACITY.bullets.itemOverflowUnits = 50, src/audit/
//    capacity.ts — genuinely gets truncated at render) must still hard-block
//    both commands, exit 1. Exercises the *built* dist/cli.js binary, not
//    just the vitest-level src/api.test.ts/src/cli/commands.test.ts coverage
//    of the same behavior.
console.log("--- dual-threshold severity leg ---")

const warnOnlyDeck = {
  version: "5",
  filename: "pptwise-e2e-warn-only",
  theme: { id: "tech" },
  slides: [
    { type: "cover" }, // missing heading — warn only since Task 2
    { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "hello" }] },
  ],
}
const warnOnlyPath = join(OUT, "warn-only.json")
writeFileSync(warnOnlyPath, JSON.stringify(warnOnlyDeck))

const warnValidateOut = sh("node", ["dist/cli.js", "validate", warnOnlyPath])
console.log(warnValidateOut)
if (!/^OK — 2 slides/.test(warnValidateOut)) {
  throw new Error(`e2e: dual-threshold leg — expected OK for the warn-only deck, got: ${warnValidateOut}`)
}
if (!/warning: page 1/.test(warnValidateOut)) {
  throw new Error(
    `e2e: dual-threshold leg — expected a "warning: page 1" line for the missing heading, got: ${warnValidateOut}`,
  )
}
console.log("dual-threshold warn-only validate leg OK (exit 0, warning line present)")

const warnOnlyPptxPath = join(OUT, "warn-only.pptx")
const warnRenderOut = sh("node", ["dist/cli.js", "render", warnOnlyPath, "-o", warnOnlyPptxPath])
console.log(warnRenderOut)
if (!existsSync(warnOnlyPptxPath)) {
  throw new Error("e2e: dual-threshold leg — render did not write the warn-only deck's pptx")
}
if (!/warning: page 1/.test(warnRenderOut)) {
  throw new Error(`e2e: dual-threshold leg — expected render's own warning line, got: ${warnRenderOut}`)
}
console.log("dual-threshold warn-only render leg OK (exit 0, file written, warning line present)")

// 51 = CAPACITY.bullets.itemOverflowUnits (50) + 1 — kept as a literal here
// since this script only shells out to the built CLI, it does not import
// src/ directly.
const bulletOverflowDeck = {
  version: "5",
  filename: "pptwise-e2e-bullet-overflow",
  theme: { id: "tech" },
  slides: [
    { type: "cover", heading: "Overflow" },
    { type: "content", kind: "points", heading: "Body", components: [{ type: "bullets", items: ["测".repeat(51)] }] },
  ],
}
const bulletOverflowPath = join(OUT, "bullet-overflow.json")
writeFileSync(bulletOverflowPath, JSON.stringify(bulletOverflowDeck))

const overflowValidateStderr = shExpectFail("node", ["dist/cli.js", "validate", bulletOverflowPath])
if (!/exceeds/.test(overflowValidateStderr)) {
  throw new Error(
    `e2e: dual-threshold leg — expected the bullet-overflow deck's validate to fail naming "exceeds", got: ${overflowValidateStderr}`,
  )
}
console.log("dual-threshold bullet-overflow validate leg OK (exit 1, geometric ceiling message present)")

const overflowOutPath = join(OUT, "bullet-overflow-should-not-exist.pptx")
const overflowRenderStderr = shExpectFail("node", [
  "dist/cli.js",
  "render",
  bulletOverflowPath,
  "-o",
  overflowOutPath,
])
if (!/exceeds/.test(overflowRenderStderr)) {
  throw new Error(
    `e2e: dual-threshold leg — expected the bullet-overflow deck's render to fail naming "exceeds", got: ${overflowRenderStderr}`,
  )
}
if (existsSync(overflowOutPath)) {
  throw new Error("e2e: dual-threshold leg — render must not write a file when validate hard-blocks")
}
console.log("dual-threshold bullet-overflow render leg OK (exit 1, no file written)")

// workspace-artifacts wave: omit -o, land under <cwd>/.pptwise/<slug>/, print
// the absolute path. Run in os.tmpdir() so this repo's exclude file is not
// touched (the cwd here is a git worktree).
console.log("--- workspace default-path leg ---")
const ws = mkdtempSync(join(tmpdir(), "pptwise-e2e-ws-"))
copyFileSync("examples/basic.json", join(ws, "hello.json"))
const cli = resolve("dist/cli.js")
const wsRender = execFileSync("node", [cli, "render", "hello.json"], { cwd: ws, encoding: "utf8" })
const wsPptx = join(ws, ".pptwise", "hello", "hello.pptx")
if (!existsSync(wsPptx)) {
  throw new Error(`e2e: workspace default-path leg — expected ${wsPptx} after render without -o`)
}
if (!wsRender.includes(wsPptx)) {
  throw new Error(`e2e: workspace default-path leg — render did not print the absolute path ${wsPptx}, got: ${wsRender}`)
}
const wsPreview = execFileSync("node", [cli, "preview", "hello.json", "--html"], { cwd: ws, encoding: "utf8" })
const wsDir = join(ws, ".pptwise", "hello")
const wsFiles = readdirSync(wsDir).sort()
const expectedWsFiles = [
  "001-cover.svg",
  "002-chapter.svg",
  "003-content.svg",
  "004-content.svg",
  "005-ending.svg",
  "hello.pptx",
  "manifest.json",
  "preview.html",
]
if (wsFiles.join(",") !== expectedWsFiles.join(",")) {
  throw new Error(`e2e: workspace default-path leg — expected ${expectedWsFiles.join(", ")}, got ${wsFiles.join(", ")}`)
}
const wsHtml = join(wsDir, "preview.html")
if (!wsPreview.includes(wsHtml)) {
  throw new Error(`e2e: workspace default-path leg — preview did not print ${wsHtml}, got: ${wsPreview}`)
}
rmSync(ws, { recursive: true, force: true })
console.log(`workspace default-path leg OK (${wsDir} tree: ${wsFiles.join(", ")})`)

// Stock-photo workspace assets: an image that lives only under
// `.pptwise/<deck>/assets/` must render, twice, to identical bytes, with no
// network. The CLI binary path is the gate — same as the webp leg.
console.log("--- workspace stock-asset render leg ---")
const stockRoot = mkdtempSync(join(tmpdir(), "pptwise-e2e-stock-"))
const PNG_1PX_STOCK = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
const stockIr = {
  version: "5",
  filename: "stock",
  theme: { id: "consulting" },
  slides: [
    { type: "cover", heading: "Stock" },
    {
      type: "content",
      kind: "photo",
      heading: "Hero",
      components: [{ type: "image", asset_id: "hero" }],
    },
    { type: "ending", heading: "End" },
  ],
}
writeFileSync(join(stockRoot, "stock.json"), JSON.stringify(stockIr))
mkdirSync(join(stockRoot, ".pptwise", "stock", "assets"), { recursive: true })
writeFileSync(join(stockRoot, ".pptwise", "stock", "assets", "hero.png"), PNG_1PX_STOCK)
const stockA = join(stockRoot, "a.pptx")
const stockB = join(stockRoot, "b.pptx")
execFileSync("node", [cli, "render", "stock.json", "-o", stockA], { cwd: stockRoot, encoding: "utf8" })
execFileSync("node", [cli, "render", "stock.json", "-o", stockB], { cwd: stockRoot, encoding: "utf8" })
const stockBytesA = readFileSync(stockA)
const stockBytesB = readFileSync(stockB)
if (!stockBytesA.equals(stockBytesB)) {
  throw new Error("e2e: workspace stock-asset leg — two renders of the same workspace-only image were not byte-identical")
}
const stockZip = await JSZip.loadAsync(stockBytesA)
if (!Object.keys(stockZip.files).some((k) => k.startsWith("ppt/media/"))) {
  throw new Error("e2e: workspace stock-asset leg — no ppt/media/* part, workspace image was not embedded")
}
rmSync(stockRoot, { recursive: true, force: true })
console.log("workspace stock-asset render leg OK")

console.log("e2e OK")
} finally {
  rmSync(e2eHome, { recursive: true, force: true })
}
