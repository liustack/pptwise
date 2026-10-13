/**
 * The conclusion `pptwise build` hands back: one object that says whether the
 * deck is done, and when it is not, where each problem sits and what to do
 * about it.
 *
 * An agent used to run assemble, validate, audit, preview and render as five
 * commands, read five differently shaped outputs, and decide for itself which
 * of them meant "not yet". Every one of those outputs already said what was
 * wrong and how to fix it. This module only gathers them into one list, each
 * entry carrying the page it is on, the file and field an author edits to
 * fix it, and the check's own message, unchanged, as the instruction.
 *
 * Pure: no filesystem, no rendering. `runBuild` (`./commands.ts`) does the
 * work and hands the pieces here.
 */
import type { ValidationIssue } from "../api"
import type { AuditFinding } from "../audit/deck-audit"
import type { PptxIR } from "../ir"
import type { BuildAlternatives } from "./build-alternatives"
import { PAGE_FILL_FIELDS } from "../spec/assemble"
import { PAGES_DIRNAME, SPEC_FILENAME } from "./deck-dir"

/** Which check raised a problem. */
export type BuildStage = "assemble" | "validate" | "audit" | "render"

export interface BuildIssue {
  stage: BuildStage
  /** 1-based page number, when the problem is on one page. */
  page?: number
  /** The page's id in the spec, when it has one. */
  pageId?: string
  /**
   * The file an author edits to fix it, relative to the deck project:
   * `pages/<id>.json` for page content, `deck.spec.json` for what the spec
   * locks. Absent for a bare IR file and for deck-wide problems.
   */
  file?: string
  /** The field inside that page, as validate names it (`components.0.items`). */
  field?: string
  /** The audit finding's code. */
  code?: string
  /** The check's own words: what is wrong, and how to fix it when it knows. */
  message: string
  /** The audit finding's own detail, when it carries one. */
  detail?: Record<string, unknown>
}

export interface BuildPreviewPage {
  page: number
  id?: string
  type: string
  /** Absolute path of the page's SVG. */
  file: string
}

export interface BuildPreview {
  dir: string
  /** The self-contained review page `preview --html` writes. */
  html: string
  /** The page manifest `preview --html` writes. */
  manifest: string
  pages: BuildPreviewPage[]
}

/** `builtin` for a factory preset, `file` for a theme file the lookup found, `pack` for an installed content pack's theme. */
export type BuildThemeSource = "builtin" | "file" | "pack"

/** A content page drawn by a stand-in kind, because the bound menu lacks its own (`../render/kind-landing.ts`). */
export interface BuildDrawnAs {
  page: number
  pageId?: string
  /** The page's own kind. */
  kind: string
  /** The offered kind whose face drew it. */
  drawnAs: string
}

/** How one page met the theme's signature drawings (`../layouts/signature.ts`). */
export interface BuildSignaturePage {
  page: number
  pageId?: string
  /** The page file to rewrite, in a deck project. */
  file?: string
  /** The drawing that drew the page, or null when its face drew it the ordinary way. */
  drawnBy: string | null
  /**
   * On a page drawn the ordinary way, the drawing it is nearest: its look,
   * how to write for it, and what to change on the page. `changes` is empty when
   * the page has the recipe and the drawing still declined its words.
   */
  nearest?: { id: string; look: string; write: string; changes: string[] }
}

/**
 * The theme's signature drawings across the deck: the pages whose face
 * offers one, and which of them it drew. Hints, never problems: a page the
 * content cannot write to a recipe stays as it is drawn.
 */
export interface BuildSignature {
  /** Pages in the deck. */
  pages: number
  /** Pages whose face offers a signature drawing. */
  offered: number
  /** Of those, the pages one drew. */
  drawn: number
  /** Each page whose face offers one, in page order. */
  perPage: BuildSignaturePage[]
}

export interface BuildReport {
  /** `ok` only when the deck passed every check and the .pptx was written. */
  status: "ok" | "needs_revision"
  /** The deck project directory or IR file built. */
  target: string
  theme?: string
  pageCount?: number
  /** Whether the audit ran. It is skipped while any page is unfilled. */
  audited: boolean
  /** Every problem that kept the .pptx from being written. */
  errors: BuildIssue[]
  /** validate's warnings. They never block the .pptx. */
  warnings: BuildIssue[]
  /** The drawn pages, whenever validate passed. */
  preview: BuildPreview | null
  /** The deck's one .pptx, written only when `status` is `ok`. */
  pptx: string | null
  /** Where the bound theme came from. Absent when the deck binds none. */
  themeSource?: BuildThemeSource
  /** Pages the bound theme draws as another kind. Facts, not problems: present only when there is one. */
  drawnAs?: BuildDrawnAs[]
  /**
   * The theme this deck's pages were written for, when this build drew them
   * under another and left something off or drew a page short
   * (`./written-for.ts`). Each such page is in `warnings`.
   */
  writtenFor?: string
  /** The deck's own pages drawn in other themes, when this build drew them (`./build-alternatives.ts`). */
  alternatives?: BuildAlternatives
  /** The theme's signature drawings across the deck, whenever its pages were drawn. */
  signature?: BuildSignature
  notes: string[]
}

/** The top field of a validate path below its slide: `components` of `components.0.items`. */
function topField(field: string): string {
  return field.split(/[.[]/)[0] ?? field
}

/** Where to edit a field of page `pageId` in a deck project. */
function sourceFile(pageId: string | undefined, field: string | undefined): string | undefined {
  if (pageId === undefined) return undefined
  if (field !== undefined && (PAGE_FILL_FIELDS as readonly string[]).includes(topField(field))) {
    return `${PAGES_DIRNAME}/${pageId}.json`
  }
  return SPEC_FILENAME
}

/** One validate finding, placed on its page, file and field. */
export function validateIssue(issue: ValidationIssue, isDir: boolean): BuildIssue {
  const slidePath = /^slides\.(\d+)(?:\.(.+))?$/.exec(issue.path)
  const field = slidePath ? slidePath[2] : issue.path || undefined
  const file = isDir && slidePath ? sourceFile(issue.slideId, field) : undefined
  return {
    stage: "validate",
    ...(issue.page !== undefined ? { page: issue.page } : {}),
    ...(issue.slideId !== undefined ? { pageId: issue.slideId } : {}),
    ...(file !== undefined ? { file } : {}),
    ...(field !== undefined ? { field } : {}),
    message: issue.message,
  }
}

/** One audit finding, placed on its page. Audit names no field: the message says which block. */
export function auditIssue(finding: AuditFinding, isDir: boolean): BuildIssue {
  return {
    stage: "audit",
    page: finding.page,
    ...(finding.slideId !== undefined ? { pageId: finding.slideId } : {}),
    ...(finding.slideId !== undefined && isDir ? { file: `${PAGES_DIRNAME}/${finding.slideId}.json` } : {}),
    code: finding.code,
    message: finding.message,
    ...(finding.detail !== undefined ? { detail: finding.detail } : {}),
  }
}

/** A page assemble left as a placeholder because nobody wrote it yet. */
export function placeholderIssues(ir: PptxIR, isDir: boolean): BuildIssue[] {
  const issues: BuildIssue[] = []
  ir.slides.forEach((slide, i) => {
    if (!slide.placeholder) return
    const file = slide.id !== undefined && isDir ? `${PAGES_DIRNAME}/${slide.id}.json` : undefined
    issues.push({
      stage: "validate",
      page: i + 1,
      ...(slide.id !== undefined ? { pageId: slide.id } : {}),
      ...(file !== undefined ? { file } : {}),
      message: file !== undefined ? `this page is not written yet. Write ${file}` : "this page is not written yet",
    })
  })
  return issues
}

/**
 * An assemble failure, one issue per line. Assemble refuses a deck project
 * with one message. A line about one spec or page-file problem names the page
 * as `page "<id>"`, under an `invalid spec (N issues):` header when the spec
 * itself is what failed. When the assembled pages fail the IR schema, the
 * message opens with `assembled deck did not produce valid IR:` and each line
 * names the slide as `slides.<index>.<field>`, which `pageIds` (the spec's
 * page ids in order, when the spec could be read) turns back into a page.
 */
export function assembleIssues(message: string, pageIds: readonly string[] = []): BuildIssue[] {
  const lines = message.split("\n").map((line) => line.trim()).filter((line) => line !== "")
  const specFailed = lines.length > 0 && /^invalid spec \(\d+ issues?\):$/.test(lines[0]!)
  const irFailed = lines.length > 0 && /^assembled deck did not produce valid IR:$/.test(lines[0]!)
  const body = specFailed || irFailed ? lines.slice(1) : lines
  return body.map((line): BuildIssue => {
    const slide = irFailed ? /^slides\.(\d+)\.([^:\s]+): (.*)$/.exec(line) : null
    if (slide) {
      const index = Number(slide[1])
      const pageId = pageIds[index]
      const field = slide[2]!
      const file = sourceFile(pageId, field)
      return {
        stage: "assemble",
        page: index + 1,
        ...(pageId !== undefined ? { pageId } : {}),
        ...(file !== undefined ? { file } : {}),
        field,
        message: slide[3]!,
      }
    }
    const page = /^page "([^"]+)"/.exec(line)
    const specField = /— pages\.(\d+)\.([^:\s]+):/.exec(line)
    const file = specFailed || specField ? SPEC_FILENAME : page ? `${PAGES_DIRNAME}/${page[1]}.json` : undefined
    return {
      stage: "assemble",
      ...(specField ? { page: Number(specField[1]) + 1 } : {}),
      ...(page ? { pageId: page[1]! } : {}),
      ...(file !== undefined ? { file } : {}),
      ...(specField ? { field: specField[2]! } : {}),
      message: line,
    }
  })
}

/** `signature layouts: 7 of the 9 pages that can take one (12 pages in all)`. */
export function signatureSummary(signature: BuildSignature): string {
  const all = signature.offered === signature.pages ? "" : ` (${signature.pages} pages in all)`
  return `signature layouts: ${signature.drawn} of the ${signature.offered} page${signature.offered === 1 ? "" : "s"} that can take one${all}`
}

/** One hint for a page drawn the ordinary way: the nearest drawing and what the page lacks for it. */
export function signatureHint(entry: BuildSignaturePage): string {
  const page = entry.pageId !== undefined ? `page ${entry.page} (${entry.pageId})` : `page ${entry.page}`
  const near = entry.nearest
  if (near === undefined) return `${page}: drawn plain`
  const changes = near.changes.length > 0 ? `to change: ${near.changes.join(", ")}` : "it has the recipe and the drawing still declined it: the words run long, or say something the drawing does not set"
  return `${page}: drawn plain, nearest ${near.id} (${near.look}). write: ${near.write}. ${changes}`
}

function where(issue: BuildIssue): string {
  const parts: string[] = []
  if (issue.page !== undefined) parts.push(issue.pageId !== undefined ? `page ${issue.page} (${issue.pageId})` : `page ${issue.page}`)
  else if (issue.pageId !== undefined) parts.push(`page "${issue.pageId}"`)
  if (issue.file !== undefined) parts.push(issue.field !== undefined ? `${issue.file} ${issue.field}` : issue.file)
  else if (issue.field !== undefined) parts.push(issue.field)
  return parts.length > 0 ? `${parts.join(" — ")}: ` : ""
}

function issueLine(issue: BuildIssue): string {
  const code = issue.code !== undefined ? `[${issue.code}] ` : ""
  return `${where(issue)}${code}${issue.message} (${issue.stage})`
}

/** The human report `pptwise build` prints without `--json`. */
export function formatBuildReport(report: BuildReport): string {
  const lines: string[] = []
  if (report.status === "ok") {
    const theme = report.theme !== undefined ? `, theme "${report.theme}"` : ""
    lines.push(`OK: ${report.pageCount} page${report.pageCount === 1 ? "" : "s"}${theme}, audit clean`)
  } else {
    const n = report.errors.length
    lines.push(`needs revision: ${n} problem${n === 1 ? "" : "s"}, no .pptx written`)
    for (const issue of report.errors) lines.push(`  ${issueLine(issue)}`)
  }
  if (report.writtenFor !== undefined) {
    lines.push(
      `note: this deck's pages were written for theme "${report.writtenFor}". Theme "${report.theme}" leaves off or cuts what the warnings below name. The sources keep all of it: building under "${report.writtenFor}" draws it whole, and rewriting those pages to fit "${report.theme}" makes them this theme's.`,
    )
  }
  for (const issue of report.warnings) lines.push(`warning: ${issueLine(issue)}`)
  for (const landed of report.drawnAs ?? []) {
    const page = landed.pageId !== undefined ? `page ${landed.page} (${landed.pageId})` : `page ${landed.page}`
    lines.push(`note: ${page}: theme "${report.theme}" draws this "${landed.kind}" page as "${landed.drawnAs}", the nearest kind whose face takes it`)
  }
  if (report.signature !== undefined && report.signature.offered > 0) {
    lines.push(signatureSummary(report.signature))
    const plain = report.signature.perPage.filter((entry) => entry.drawnBy === null)
    for (const entry of plain) lines.push(`  hint: ${signatureHint(entry)}`)
    if (plain.length > 0) lines.push("  hints only: rewrite a page where its content holds the recipe, and leave it plain where it does not. Never add content to fit")
  }
  if (report.alternatives !== undefined && report.alternatives.themes.length > 0) {
    const named = report.alternatives.themes.map((theme, i) => `${i + 1} ${theme.theme}`).join(", ")
    lines.push(`alternatives: the deck's own pages in ${named} (${report.alternatives.dir}). To switch, change "theme" in ${SPEC_FILENAME} and build again.`)
  }
  if (report.preview !== null) lines.push(`preview: ${report.preview.html}`)
  if (report.pptx !== null) lines.push(`pptx: ${report.pptx}`)
  lines.push(...report.notes)
  return lines.join("\n")
}
