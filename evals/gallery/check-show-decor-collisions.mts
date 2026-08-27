/**
 * Scan every rendered gallery page that uses a show layout. The scan measures
 * each named decoration leaf against the page's actual text and the reserved
 * bottom-right logo box after composing the complete SVG transform chain.
 *
 * Usage: pnpm exec tsx evals/gallery/check-show-decor-collisions.mts [.gallery]
 */

import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { getPlatform } from "@/platform/registry"
import { installNodePlatform } from "@/platform/node"
import {
  IDENTITY_MATRIX,
  boxesIntersect,
  multiplyMatrices,
  parseSvgTransform,
  textInkBox,
  transformBox,
  type DepthBox,
  type SvgMatrix,
} from "@/render/depth-contract/geometry"
import type { Manifest } from "./render"

const SHOW_ARCHETYPE_SELECTOR = '[data-archetype^="show-"]'
const LOGO_BOX = { x: 1120, y: 630, w: 96, h: 40 } as const
const FOOTER_BAND = { x: 0, y: 620, w: 1280, h: 44 } as const

function inheritedAttr(element: Element, name: string): string | null {
  let current: Element | null = element
  while (current) {
    const value = current.getAttribute(name)
    if (value !== null && value !== "") return value
    current = current.parentElement
  }
  return null
}

function numberAttr(element: Element, name: string, fallback = 0): number {
  const value = Number(element.getAttribute(name) ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function matrixToRoot(element: Element, root: Element): SvgMatrix {
  const chain: Element[] = []
  let current: Element | null = element
  while (current) {
    chain.push(current)
    if (current === root) break
    current = current.parentElement
  }
  return chain.reverse().reduce(
    (matrix, node) => multiplyMatrices(matrix, parseSvgTransform(node.getAttribute("transform"))),
    IDENTITY_MATRIX,
  )
}

function localLineBox(line: Element): DepthBox {
  const x1 = numberAttr(line, "x1")
  const x2 = numberAttr(line, "x2")
  const y1 = numberAttr(line, "y1")
  const y2 = numberAttr(line, "y2")
  const strokeWidth = numberAttr(line, "stroke-width", 0)
  const half = strokeWidth / 2
  return {
    x: Math.min(x1, x2) - half,
    y: Math.min(y1, y2) - half,
    w: Math.abs(x2 - x1) + strokeWidth,
    h: Math.abs(y2 - y1) + strokeWidth,
  }
}

function textBox(text: Element, root: Element): DepthBox | null {
  const content = (text.textContent ?? "").trim()
  if (!content || !text.hasAttribute("x") || !text.hasAttribute("y")) return null
  const fontSize = Number(inheritedAttr(text, "font-size") ?? 16)
  if (!Number.isFinite(fontSize) || fontSize <= 0) return null
  const anchor = inheritedAttr(text, "text-anchor") ?? "start"
  const base = textInkBox({
    content,
    x: numberAttr(text, "x"),
    y: numberAttr(text, "y"),
    fontSize,
    fontFamily: inheritedAttr(text, "font-family") ?? "",
    fontWeight: inheritedAttr(text, "font-weight"),
    textAnchor: anchor,
  })
  const letterSpacing = Math.abs(Number(inheritedAttr(text, "letter-spacing") ?? 0))
  const extra = Number.isFinite(letterSpacing) ? Math.max(0, content.length - 1) * letterSpacing : 0
  const expanded = {
    ...base,
    x: anchor === "end" ? base.x - extra : anchor === "middle" ? base.x - extra / 2 : base.x,
    w: base.w + extra,
  }
  return transformBox(expanded, matrixToRoot(text, root))
}

function showTextBoxes(root: Element): { text: string; box: DepthBox }[] {
  return Array.from(root.querySelectorAll("text"))
    .filter((text) => text.closest("[data-decor-piece]") === null)
    .map((text) => {
      const box = textBox(text, root)
      return box ? { text: (text.textContent ?? "").trim(), box } : null
    })
    .filter((entry): entry is { text: string; box: DepthBox } => entry !== null)
}

await installNodePlatform()
const galleryDir = resolve(process.argv[2] ?? ".gallery")
const manifest = JSON.parse(readFileSync(join(galleryDir, "manifest.json"), "utf8")) as Manifest
const Parser = getPlatform().domParser ?? globalThis.DOMParser
if (!Parser) throw new Error("DOMParser unavailable after installing the Node platform")

let showPages = 0
let piecesChecked = 0
let leavesChecked = 0
let finaleBandHairlines = 0
const collisions: string[] = []

for (const page of manifest.pages) {
  if (!page.file) continue
  const markup = readFileSync(join(galleryDir, page.file), "utf8")
  const root = new Parser().parseFromString(markup, "image/svg+xml").documentElement
  const archetype = root.querySelector(SHOW_ARCHETYPE_SELECTOR)
  if (!archetype) continue
  showPages += 1
  const texts = showTextBoxes(root)
  const pieces = Array.from(archetype.querySelectorAll("[data-decor-piece]"))
  piecesChecked += pieces.length

  for (const piece of pieces) {
    const pieceId = piece.getAttribute("data-decor-piece") ?? "unknown"
    const paintedLeaves = Array.from(piece.querySelectorAll("line,rect,circle,ellipse,path,polygon,polyline,text"))
    const unsupported = paintedLeaves.filter((leaf) => leaf.tagName.toLowerCase() !== "line")
    if (unsupported.length > 0) {
      collisions.push(`${page.id}: ${pieceId} has unsupported leaves ${unsupported.map((leaf) => leaf.tagName).join(",")}`)
      continue
    }

    for (const line of paintedLeaves) {
      leavesChecked += 1
      const box = transformBox(localLineBox(line), matrixToRoot(line, root))
      const label = `${page.id}: ${pieceId}/line at ${JSON.stringify(box)}`
      for (const text of texts) {
        if (boxesIntersect(box, text.box)) collisions.push(`${label} intersects text ${JSON.stringify(text.text)}`)
      }
      if (page.slideType !== "ending" && boxesIntersect(box, LOGO_BOX)) {
        collisions.push(`${label} intersects the reserved bottom-right logo box`)
      }

      const horizontal = numberAttr(line, "y1") === numberAttr(line, "y2")
      if (pieceId === "show-finale-runway" && horizontal && boxesIntersect(box, FOOTER_BAND)) {
        const strokeWidth = numberAttr(line, "stroke-width")
        if (strokeWidth > 1.5) collisions.push(`${label} exceeds the footer-band hairline exemption`)
        else finaleBandHairlines += 1
      }
    }
  }
}

if (showPages === 0) throw new Error(`show decor scan found no show pages in ${galleryDir}`)
if (finaleBandHairlines === 0) throw new Error("show decor scan did not exercise the show-finale footer-band hairline")
if (collisions.length > 0) {
  throw new Error(`show decor scan found ${collisions.length} collision(s)\n${collisions.join("\n")}`)
}

process.stdout.write(
  `show decor scan: ${manifest.pages.filter((page) => page.file).length} gallery pages, ` +
    `${showPages} show pages, ${piecesChecked} pieces, ${leavesChecked} leaves, ` +
    `${finaleBandHairlines} footer-band hairline checks, 0 collisions\n`,
)
