/** Pure deck-project assembly and disassembly. Selection stays in render. */
import { PptwiseError } from "../errors"
import { PptxIRSchema, type BackgroundSpec, type Component, type PptxIR, type Slide } from "../ir"
import { formatInvalidSpecError, validateSpec, type DeckSpec, type PageSpec } from "./index"

/** Fillable fields stored in one `pages/<id>.json` record. */
export interface PageContent {
  components?: Component[]
  background?: BackgroundSpec
  image_side?: "left" | "right"
  footnote?: string
  notes?: string
}

export interface AssembleResult {
  ir: PptxIR
}

const LOCKED_KEYS = ["type", "kind", "heading"] as const

function buildSlide(page: PageSpec, content: PageContent | undefined): Record<string, unknown> {
  const locked = {
    id: page.id,
    type: page.type,
    heading: page.heading,
    ...(page.type === "content" ? { kind: page.kind } : {}),
  }
  if (content === undefined) {
    return {
      ...locked,
      placeholder: true,
      ...(page.summary !== undefined ? { subheading: page.summary } : {}),
    }
  }
  return {
    ...locked,
    ...(page.type !== "content" && page.summary !== undefined ? { subheading: page.summary } : {}),
    ...(content.components !== undefined ? { components: content.components } : {}),
    ...(content.background !== undefined ? { background: content.background } : {}),
    ...(content.image_side !== undefined ? { image_side: content.image_side } : {}),
    ...(content.footnote !== undefined ? { footnote: content.footnote } : {}),
    ...(content.notes !== undefined ? { notes: content.notes } : {}),
  }
}

/**
 * Assemble spec-owned semantics with page content. No layout, seed, beat, or
 * other selection result is derived or written into the IR.
 */
export function assembleDeck(spec: unknown, pages: Record<string, PageContent>): AssembleResult {
  const validated = validateSpec(spec)
  if (!validated.ok) throw new PptwiseError(formatInvalidSpecError(validated.errors))
  const deckSpec = validated.spec!

  for (const page of deckSpec.pages) {
    const raw = pages[page.id]
    if (raw === undefined) continue
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new PptwiseError(`page "${page.id}": page content must be an object`)
    }
    for (const key of LOCKED_KEYS) {
      if (Object.hasOwn(raw, key)) {
        throw new PptwiseError(`page "${page.id}": "${key}" is locked by the spec. Remove it from the page file`)
      }
    }
  }

  const specIds = new Set(deckSpec.pages.map((page) => page.id))
  const orphanIds = Object.keys(pages).filter((id) => !specIds.has(id))
  if (orphanIds.length > 0) {
    throw new PptwiseError(
      `orphan page id${orphanIds.length === 1 ? "" : "s"} ${orphanIds
        .map((id) => `"${id}"`)
        .join(", ")}. Delete the page file or add the page to the spec`,
    )
  }

  const rawIr = {
    version: "5" as const,
    ...(deckSpec.narrative !== undefined ? { narrative: deckSpec.narrative } : {}),
    theme: { id: deckSpec.theme },
    ...(deckSpec.filename !== undefined ? { filename: deckSpec.filename } : {}),
    ...(deckSpec.brand !== undefined ? { brand: deckSpec.brand } : {}),
    ...(deckSpec.branding !== undefined ? { branding: deckSpec.branding } : {}),
    meta: deckSpec.meta,
    slides: deckSpec.pages.map((page) => buildSlide(page, pages[page.id])),
  }
  const parsed = PptxIRSchema.safeParse(rawIr)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n")
    throw new PptwiseError(`assembled deck did not produce valid IR:\n${detail}`)
  }
  return { ir: parsed.data }
}

const UNTITLED_HEADING = "Untitled"

/** Reconstruct the editable spec and page records representable by an IR. */
export function disassembleDeck(ir: PptxIR): {
  spec: DeckSpec
  pages: Record<string, PageContent>
} {
  const pages: Record<string, PageContent> = {}
  const pageSpecs: PageSpec[] = ir.slides.map((slide, index) => {
    const id = slide.id ?? `p-${index + 1}-${slide.type}`
    const heading = slide.heading !== undefined && slide.heading.trim() !== "" ? slide.heading : UNTITLED_HEADING
    const pageSpec = {
      id,
      type: slide.type,
      heading,
      ...(slide.type === "content" ? { kind: slide.kind } : {}),
      ...((slide.placeholder === true || slide.type !== "content") && slide.subheading !== undefined
        ? { summary: slide.subheading }
        : {}),
    } as PageSpec
    if (slide.placeholder !== true) pages[id] = extractPageContent(slide)
    return pageSpec
  })

  return {
    spec: {
      version: "1",
      ...(ir.narrative !== undefined ? { narrative: ir.narrative } : {}),
      theme: ir.theme.id,
      filename: ir.filename,
      ...(ir.brand !== undefined ? { brand: ir.brand } : {}),
      ...(ir.branding !== undefined ? { branding: ir.branding } : {}),
      meta: ir.meta,
      pages: pageSpecs,
    },
    pages,
  }
}

function extractPageContent(slide: Slide): PageContent {
  const content: PageContent = {}
  if (slide.components.length > 0) content.components = slide.components
  if (slide.background !== undefined) content.background = slide.background
  if (slide.image_side !== undefined) content.image_side = slide.image_side
  if (slide.footnote !== undefined) content.footnote = slide.footnote
  if (slide.notes !== undefined) content.notes = slide.notes
  return content
}
