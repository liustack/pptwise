/**
 * Scan every rendered gallery page for the crayonbox motif and prove that
 * each of its leaves stays outside the five shared content and branding
 * regions. The scanner composes the real SVG transform chain before testing
 * boxes, so translated leaves are measured where they actually paint.
 *
 * Usage: pnpm exec tsx evals/gallery/check-crayonbox-decor-collisions.mts [.gallery]
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
import { decodeManifest } from "./render"

const PROTECTED_ZONES = {
  title: { x: 96, y: 48, w: 1040, h: 122 },
  body: { x: 96, y: 200, w: 1040, h: 420 },
  footerMeta: { x: 48, y: 664, w: 1184, h: 44 },
  brLogo: { x: 1120, y: 630, w: 96, h: 40 },
  trLogo: { x: 1120, y: 48, w: 96, h: 40 },
} as const

const PIECE_SELECTOR = [
  '[data-decor] [data-decor-piece="crayonbox-sun"]',
  '[data-decor] [data-decor-piece="crayonbox-stars"]',
].join(",")

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

function localLeafBox(element: Element): DepthBox | null {
  const tag = element.tagName.toLowerCase()
  let box: DepthBox | null = null
  if (tag === "circle") {
    const radius = numberAttr(element, "r")
    box = {
      x: numberAttr(element, "cx") - radius,
      y: numberAttr(element, "cy") - radius,
      w: radius * 2,
      h: radius * 2,
    }
  } else if (tag === "line") {
    const x1 = numberAttr(element, "x1")
    const x2 = numberAttr(element, "x2")
    const y1 = numberAttr(element, "y1")
    const y2 = numberAttr(element, "y2")
    box = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    }
  } else if (tag === "text") {
    const content = (element.textContent ?? "").trim()
    if (!content) return null
    box = textInkBox({
      content,
      x: numberAttr(element, "x"),
      y: numberAttr(element, "y"),
      fontSize: Number(inheritedAttr(element, "font-size") ?? 16),
      fontFamily: inheritedAttr(element, "font-family") ?? "",
      fontWeight: inheritedAttr(element, "font-weight"),
      textAnchor: inheritedAttr(element, "text-anchor") ?? "start",
    })
  }
  if (!box) return null

  const stroke = inheritedAttr(element, "stroke")
  const strokeWidth = Number(inheritedAttr(element, "stroke-width") ?? 0)
  if (!stroke || stroke === "none" || !Number.isFinite(strokeWidth) || strokeWidth <= 0) return box
  const half = strokeWidth / 2
  return { x: box.x - half, y: box.y - half, w: box.w + strokeWidth, h: box.h + strokeWidth }
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

function motifLeaves(root: Element): { piece: string; tag: string; box: DepthBox }[] {
  const leaves: { piece: string; tag: string; box: DepthBox }[] = []
  for (const piece of Array.from(root.querySelectorAll(PIECE_SELECTOR))) {
    for (const leaf of Array.from(piece.querySelectorAll("circle,line,text"))) {
      const local = localLeafBox(leaf)
      if (!local) continue
      leaves.push({
        piece: piece.getAttribute("data-decor-piece") ?? "unknown",
        tag: leaf.tagName.toLowerCase(),
        box: transformBox(local, matrixToRoot(leaf, root)),
      })
    }
  }
  return leaves
}

await installNodePlatform()
const galleryDir = resolve(process.argv[2] ?? ".gallery")
const manifestFile = join(galleryDir, "manifest.json")
const manifest = decodeManifest(JSON.parse(readFileSync(manifestFile, "utf8")), manifestFile)
const Parser = getPlatform().domParser ?? globalThis.DOMParser
if (!Parser) throw new Error("DOMParser unavailable after installing the Node platform")

let pagesWithMotif = 0
let leavesChecked = 0
const collisions: string[] = []

for (const page of manifest.pages) {
  if (!page.file) continue
  const markup = readFileSync(join(galleryDir, page.file), "utf8")
  const root = new Parser().parseFromString(markup, "image/svg+xml").documentElement
  const leaves = motifLeaves(root)
  if (leaves.length === 0) continue
  pagesWithMotif += 1
  leavesChecked += leaves.length

  for (const leaf of leaves) {
    if (leaf.box.x <= 1216) {
      collisions.push(`${page.id}: ${leaf.piece}/${leaf.tag} crosses the x=1216 safe edge at ${leaf.box.x.toFixed(2)}`)
    }
    for (const [name, zone] of Object.entries(PROTECTED_ZONES)) {
      if (boxesIntersect(leaf.box, zone)) {
        collisions.push(`${page.id}: ${leaf.piece}/${leaf.tag} intersects ${name} at ${JSON.stringify(leaf.box)}`)
      }
    }
  }
}

if (pagesWithMotif === 0) {
  throw new Error(`crayonbox decor scan found no motif pages in ${galleryDir}`)
}
if (collisions.length > 0) {
  throw new Error(`crayonbox decor scan found ${collisions.length} collision(s)\n${collisions.join("\n")}`)
}

process.stdout.write(
  `crayonbox decor scan: ${manifest.pages.filter((page) => page.file).length} gallery pages, ` +
    `${pagesWithMotif} motif pages, ${leavesChecked} leaves, 0 collisions\n`,
)
