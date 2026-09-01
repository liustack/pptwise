import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
import type { Slide } from "@/ir"
import { CANVAS_H_PX, CANVAS_W_PX } from "../../constants"

export type SvgDepth = "bg" | "mid" | "fg"

export interface SvgDepthLayers {
  bg: ReactNode[]
  mid: ReactNode[]
  fg: ReactNode[]
}

interface PartitionOptions {
  slideType: Slide["type"]
}

type ElementProps = Record<string, unknown> & { children?: ReactNode }

const CONTAINER_TAGS = new Set(["a", "g", "switch"])
const GHOST_LABEL = /^(?:0?\d{1,3}(?:\s*[/.]\s*\d{1,3})?|Q[1-4]|№\s*\d{1,3}|NO\.?\s*\d{1,3}|[IVXLCDM]{1,8})$/i

function emptyLayers(): SvgDepthLayers {
  return { bg: [], mid: [], fg: [] }
}

function append(target: SvgDepthLayers, source: SvgDepthLayers): void {
  target.bg.push(...source.bg)
  target.mid.push(...source.mid)
  target.fg.push(...source.fg)
}

function push(target: SvgDepthLayers, depth: SvgDepth, node: ReactNode): void {
  target[depth].push(node)
}

function numberProp(props: ElementProps, name: string, fallback = 0): number {
  const value = props[name]
  if (value === undefined || value === null || value === "") return fallback
  return Number(value)
}

function isFullCanvasPaint(type: string, props: ElementProps): boolean {
  if (type !== "rect" && type !== "image") return false
  return (
    numberProp(props, "x") <= 0 &&
    numberProp(props, "y") <= 0 &&
    numberProp(props, "width") >= CANVAS_W_PX &&
    numberProp(props, "height") >= CANVAS_H_PX
  )
}

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (!isValidElement<ElementProps>(node)) return ""
  return Children.toArray(node.props.children).map(textContent).join("")
}

function isGhostText(props: ElementProps, slideType: Slide["type"]): boolean {
  const fontSize = numberProp(props, "fontSize")
  if (fontSize < 140) return false
  const label = textContent(props.children).trim()
  if (!GHOST_LABEL.test(label)) return false

  const opacity = Math.min(numberProp(props, "opacity", 1), numberProp(props, "fillOpacity", 1))
  const declaredBleed = props["data-bleed"] !== undefined
  const ghostQuarter = fontSize >= 400 && /^Q[1-4]$/i.test(label)
  return declaredBleed || ghostQuarter || opacity <= 0.2 || slideType === "chapter"
}

/**
 * A node React will walk as a list.
 *
 * `ReactNode` admits any `Iterable`, not only `Array`: a component may return
 * a `Set`, a generator, or anything else with `Symbol.iterator`, and React
 * renders every entry. Reading "a list" as "an Array" left those returns
 * matching neither the array branch nor `isValidElement`, so they fell
 * through to empty layers and every node in them left the page in silence,
 * which is the same defect the array branch exists to close.
 *
 * Strings are iterable and are not lists: they are handled as text above.
 */
function asNodeList(node: ReactNode): ReactNode[] | null {
  if (Array.isArray(node)) return node
  if (node === null || typeof node !== "object") return null
  const iterable = node as unknown as Iterable<ReactNode>
  if (typeof iterable[Symbol.iterator] !== "function") return null
  return Array.from(iterable)
}

function executeFunctionElement(element: ReactElement<ElementProps>): ReactNode | null {
  if (typeof element.type !== "function") return null
  if ("isReactComponent" in (element.type.prototype ?? {})) return null
  const component = element.type as unknown as (props: ElementProps) => ReactNode
  const returned = component(element.props)
  // A generator is walked once and then it is empty, and this return value is
  // walked twice: once to decide whether it is a background paint cluster,
  // once to partition it. Materialising here is what keeps the second walk
  // from finding nothing.
  return asNodeList(returned) ?? returned
}

interface PaintClusterEvidence {
  hasFullCanvasPaint: boolean
  hasText: boolean
}

function inspectPaintCluster(node: ReactNode, evidence: PaintClusterEvidence): void {
  if (node === null || node === undefined || typeof node === "boolean") return
  if (typeof node === "string" || typeof node === "number") return
  const list = asNodeList(node)
  if (list) {
    Children.forEach(list, (child) => inspectPaintCluster(child, evidence))
    return
  }
  if (!isValidElement<ElementProps>(node)) return

  if (node.type === Fragment) {
    Children.forEach(node.props.children, (child) => inspectPaintCluster(child, evidence))
    return
  }
  const executed = executeFunctionElement(node)
  if (executed !== null) {
    inspectPaintCluster(executed, evidence)
    return
  }
  if (typeof node.type !== "string") return
  if (node.type === "text") evidence.hasText = true
  if (isFullCanvasPaint(node.type, node.props)) evidence.hasFullCanvasPaint = true
  Children.forEach(node.props.children, (child) => inspectPaintCluster(child, evidence))
}

function isBackgroundPaintCluster(node: ReactNode): boolean {
  const evidence: PaintClusterEvidence = { hasFullCanvasPaint: false, hasText: false }
  inspectPaintCluster(node, evidence)
  return evidence.hasFullCanvasPaint && !evidence.hasText
}

function partitionChildren(
  children: ReactNode,
  options: PartitionOptions,
  defaultDepth: SvgDepth = "fg",
): SvgDepthLayers {
  const layers = emptyLayers()
  Children.forEach(children, (child) => append(layers, partitionNode(child, options, defaultDepth)))
  return layers
}

function cloneContainerForDepth(
  element: ReactElement<ElementProps>,
  depth: SvgDepth,
  children: ReactNode[],
): ReactElement<ElementProps> {
  const key = element.key === null ? depth : `${String(element.key)}-${depth}`
  const keyedChildren = children.map((child, index) => (
    <Fragment key={`${depth}-${index}`}>{child}</Fragment>
  ))
  return cloneElement(element, { key }, keyedChildren)
}

function partitionNode(
  node: ReactNode,
  options: PartitionOptions,
  defaultDepth: SvgDepth = "fg",
): SvgDepthLayers {
  const layers = emptyLayers()
  if (node === null || node === undefined || typeof node === "boolean") return layers
  if (typeof node === "string" || typeof node === "number") {
    push(layers, defaultDepth, node)
    return layers
  }
  // A component may return a list rather than a single element — `ink`'s
  // vertical quote setting returns one `<text>` per glyph. Walking into it is
  // not an optimisation: without this branch the list is not a valid element,
  // falls through to `return layers`, and every node in it is dropped from
  // the page with nothing said. That cost `ink` its quote attribution for as
  // long as the skin has existed.
  const list = asNodeList(node)
  if (list) return partitionChildren(list, options, defaultDepth)
  if (!isValidElement<ElementProps>(node)) return layers

  if (node.type === Fragment) return partitionChildren(node.props.children, options, defaultDepth)

  const executed = executeFunctionElement(node)
  if (executed !== null) {
    if (isBackgroundPaintCluster(executed)) push(layers, "bg", executed)
    else append(layers, partitionNode(executed, options, defaultDepth))
    return layers
  }

  if (typeof node.type !== "string") {
    push(layers, defaultDepth, node)
    return layers
  }

  const declaredDepth = node.props["data-depth"]
  if (declaredDepth === "bg" || declaredDepth === "mid" || declaredDepth === "fg") {
    // Routing hint only. The page-level wrappers in FullSlideSvg own the
    // three `data-depth` groups. Leaving the hint on the routed node makes
    // L1 see four-plus groups and fail the exact bg/mid/fg contract.
    push(layers, declaredDepth, cloneElement(node, { "data-depth": undefined }))
    return layers
  }

  const role = node.props["data-decor-role"]
  if (role === "structure") {
    push(layers, "fg", node)
    return layers
  }
  if (role === "identity") {
    push(layers, "mid", node)
    return layers
  }

  if (node.props["data-decor"] !== undefined) {
    if (CONTAINER_TAGS.has(node.type)) {
      const children = partitionChildren(node.props.children, options, "mid")
      for (const child of children.bg) push(layers, "bg", child)
      for (const child of children.fg) push(layers, "fg", child)
      // Keep the motif marker even when every piece lifted to fg or the
      // motif yielded. Tests and the audit walk key off `data-decor`.
      push(layers, "mid", cloneContainerForDepth(node, "mid", children.mid))
      return layers
    }
    push(layers, "mid", node)
    return layers
  }
  if (isFullCanvasPaint(node.type, node.props)) {
    push(layers, "bg", node)
    return layers
  }
  if (node.type === "text" && isGhostText(node.props, options.slideType)) {
    push(layers, "mid", node)
    return layers
  }

  if (CONTAINER_TAGS.has(node.type)) {
    const children = partitionChildren(node.props.children, options, defaultDepth)
    if (children.bg.length === 0 && children.mid.length === 0 && children.fg.length === 0) {
      push(layers, defaultDepth, node)
      return layers
    }
    for (const depth of ["bg", "mid", "fg"] as const) {
      if (children[depth].length > 0) push(layers, depth, cloneContainerForDepth(node, depth, children[depth]))
    }
    return layers
  }

  push(layers, defaultDepth, node)
  return layers
}

/**
 * Split one rendered page body into semantic SVG depth layers. Layouts only
 * describe their own visual tree. This function owns the cross-layout paint
 * order and is the only place that may route a node between depth groups.
 */
export function partitionSvgDepth(node: ReactNode, options: PartitionOptions): SvgDepthLayers {
  return partitionNode(node, options)
}
