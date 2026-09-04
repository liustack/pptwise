// @vitest-environment node
//
// Constitutional nail: a `device_mockup` page never loses its device.
//
// The frame — a browser's window bar, traffic lights and address pill, a
// phone's bezel and notch — is the whole component. Take it away and a product
// screenshot is just a picture pasted on a slide, which is the exact gap the
// component was added to close. Four takeover faces used to accept a
// `device_mockup` as "one picture" and paint the screen contents alone, so on
// most themes the component quietly rendered as an `image` and nothing on the
// page said so.
//
// Pages are found by looking at what each job's slide actually contains, not
// by matching output ids: the id filter this started as read `--comp--` and
// silently skipped the four sample-deck pages that carry a mockup too. And the
// assertions look for the drawn window, not for the marker the same
// implementation writes about itself — a bare picture wrapped in a
// `data-device-mockup` group would satisfy a marker check and show no device.
//
// Counting nodes is not enough either. Setting every fill and stroke inside
// the frame to `none` leaves the whole structure in place — the bar path, the
// three dots, the pill, the outline — while the page shows a bare screenshot
// and nothing around it. So each part has to carry paint that would actually
// land: a fill or a stroke that is not `none`, opacity above zero, and an area
// to put it in.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { CANVAS_H_PX, CANVAS_W_PX } from "@/constants"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

/**
 * What the corpus holds today: 26 component-band specimens per device — the
 * component band draws this type twice, once as a browser window and once as a
 * phone — plus the four sample-deck pages whose narrative includes a product
 * screenshot. Pinned per device, because a corpus that covered only browsers
 * left the phone branch of both the component and this test unexecuted.
 */
const EXPECTED_DEVICE_PAGES = 56
const EXPECTED_BY_DEVICE = { browser: 30, phone: 26 }
const EXPECTED_DECK_PAGES = [
  "classroom--deck--p07",
  "enterprise--deck--p09",
  "luxe--deck--p07",
  "tech--deck--p07",
]

/** The browser frame's declared proportion, window bar included. */
const BROWSER_ASPECT = 1.6

/**
 * What is left of an element's opacity once every ancestor has had its say,
 * and zero as soon as anything in the chain is hidden outright.
 *
 * Reading only the element's own attributes proved a local property, not a
 * visible one: setting `opacity="0"` on the `[data-device-mockup]` group hid
 * the bar, the dots, the pill, the outline, the body and the notch on all 56
 * pages while every one of them still reported paint.
 */
function effectiveOpacity(el: Element): number {
  let opacity = 1
  for (let node: Element | null = el; node; node = node.parentElement) {
    const display = node.getAttribute("display")
    const visibility = node.getAttribute("visibility")
    if (display === "none" || visibility === "hidden" || visibility === "collapse") return 0
    const own = node.getAttribute("opacity")
    if (own !== null) opacity *= Number(own)
  }
  return opacity
}

/** Whether this element would put ink on the page at all. */
function paints(el: Element): boolean {
  const num = (name: string, fallback: number) => {
    const raw = el.getAttribute(name)
    return raw === null ? fallback : Number(raw)
  }
  if (effectiveOpacity(el) <= 0) return false
  const fill = el.getAttribute("fill")
  // No `fill` attribute at all means SVG's own default, which is black.
  const filled = fill !== "none" && num("fill-opacity", 1) > 0
  const stroke = el.getAttribute("stroke")
  const stroked =
    stroke !== null && stroke !== "none" && num("stroke-opacity", 1) > 0 && num("stroke-width", 1) > 0
  return filled || stroked
}

/** Whether this element has somewhere to put that ink. */
function hasArea(el: Element): boolean {
  if (el.tagName === "circle") return Number(el.getAttribute("r")) > 0
  if (el.tagName === "path") {
    const numbers = (el.getAttribute("d") ?? "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    if (numbers.length < 4) return false
    const xs = numbers.filter((_, i) => i % 2 === 0)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    return Math.max(...xs) - Math.min(...xs) > 0 && Math.max(...ys) - Math.min(...ys) > 0
  }
  return Number(el.getAttribute("width")) > 0 && Number(el.getAttribute("height")) > 0
}

/** Drawn: present, with paint, and with an area to paint. */
function drawn(el: Element | undefined): boolean {
  return el !== undefined && el !== null && paints(el) && hasArea(el)
}

function parse(svg: string): Element {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  return new Parser().parseFromString(svg, "image/svg+xml").documentElement
}

/** Absolute page offset of an element, accumulating ancestor translates. */
function offsetOf(el: Element): { x: number; y: number } {
  let x = 0
  let y = 0
  for (let node: Element | null = el; node; node = node.parentElement) {
    const m = (node.getAttribute("transform") ?? "").match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)
    if (m) {
      x += Number(m[1])
      y += Number(m[2])
    }
  }
  return { x, y }
}

describe("every device_mockup page in the corpus shows its frame", () => {
  it("draws a real window or bezel on each one", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-device-frame-"))
    const { svgs } = renderMatrix(jobs, outDir, "device-frame")

    // Which pages carry a device comes from the IR, never from the page id,
    // and the authored component travels with it so the assertions can ask
    // what this page actually declared rather than assume.
    const devicePages = new Map<string, { device: string; url?: string }>()
    for (const job of jobs) {
      const mockup = job.ir.slides[job.slideIndex]?.components.find((c) => c.type === "device_mockup")
      if (mockup && mockup.type === "device_mockup") {
        devicePages.set(job.id, { device: mockup.device, url: mockup.url })
      }
    }

    expect(devicePages.size).toBe(EXPECTED_DEVICE_PAGES)
    const byDevice = { browser: 0, phone: 0 }
    for (const { device } of devicePages.values()) byDevice[device as "browser" | "phone"]++
    expect(byDevice).toEqual(EXPECTED_BY_DEVICE)
    expect([...devicePages.keys()].filter((id) => !id.includes("--comp--")).sort()).toEqual(EXPECTED_DECK_PAGES)

    const offenders: string[] = []
    for (const [id, authored] of devicePages) {
      const svg = svgs.get(id)
      if (!svg) {
        offenders.push(`${id}: not rendered`)
        continue
      }
      const root = parse(svg)
      const frame = root.querySelector("[data-device-mockup]")
      if (!frame) {
        offenders.push(`${id}: no device frame`)
        continue
      }
      const device = frame.getAttribute("data-device-mockup")
      if (device !== authored.device) {
        offenders.push(`${id}: authored ${authored.device}, drew ${device}`)
        continue
      }
      const origin = offsetOf(frame)
      const rects = Array.from(frame.querySelectorAll("rect"))

      if (device === "browser") {
        // The window bar is a drawn path carrying paint, not an attribute claim.
        const bar = Array.from(frame.querySelectorAll("path")).find((p) =>
          /^M \d[\d.]* \d[\d.]* A /.test(p.getAttribute("d") ?? ""),
        )
        if (!drawn(bar)) offenders.push(`${id}: no painted window bar`)
        const dots = Array.from(frame.querySelectorAll("circle"))
        if (dots.length !== 3) offenders.push(`${id}: ${dots.length} traffic lights`)
        if (!dots.every(drawn)) offenders.push(`${id}: traffic lights carry no paint`)
        // The address pill exists only when the page authored a url — the
        // schema makes it optional, and a browser without one is legal.
        if (authored.url !== undefined) {
          const pill = rects.find((r) => {
            const h = Number(r.getAttribute("height"))
            return h > 0 && Math.abs(Number(r.getAttribute("rx")) - h / 2) < 0.51
          })
          if (!drawn(pill)) offenders.push(`${id}: no painted address pill`)
          if (!(root.textContent ?? "").includes(authored.url)) offenders.push(`${id}: url not on the page`)
        }
        // The outline proves the window's own edges, and carries its size.
        const outline = rects.find((r) => r.getAttribute("fill") === "none" && r.getAttribute("stroke"))
        if (!drawn(outline)) {
          offenders.push(`${id}: no painted window outline`)
          continue
        }
        const w = Number(outline!.getAttribute("width"))
        const h = Number(outline!.getAttribute("height"))
        if (Math.abs(w / h - BROWSER_ASPECT) > 0.12) offenders.push(`${id}: aspect ${(w / h).toFixed(2)}`)
        const x = origin.x + Number(outline!.getAttribute("x"))
        const y = origin.y + Number(outline!.getAttribute("y"))
        if (x < 0 || y < 0 || x + w > CANVAS_W_PX + 0.5 || y + h > CANVAS_H_PX + 0.5) {
          offenders.push(`${id}: window at ${x},${y} ${w}x${h} leaves the page`)
        }
      } else if (device === "phone") {
        const body = rects[0]
        const bodyW = Number(body?.getAttribute("width"))
        const bodyH = Number(body?.getAttribute("height"))
        if (!drawn(body)) offenders.push(`${id}: no painted phone body`)
        if (!(bodyH > bodyW)) offenders.push(`${id}: body ${bodyW}x${bodyH} is not portrait`)
        // A notch: wider than it is tall, sitting on the body's top edge.
        const notch = rects.find(
          (r) =>
            Number(r.getAttribute("y")) === 0 &&
            Number(r.getAttribute("width")) > Number(r.getAttribute("height")) &&
            Number(r.getAttribute("width")) < bodyW,
        )
        if (!drawn(notch)) offenders.push(`${id}: no painted notch on the body's top edge`)
        const x = origin.x + Number(body?.getAttribute("x") ?? 0)
        const y = origin.y + Number(body?.getAttribute("y") ?? 0)
        if (x < 0 || y < 0 || x + bodyW > CANVAS_W_PX + 0.5 || y + bodyH > CANVAS_H_PX + 0.5) {
          offenders.push(`${id}: phone at ${x},${y} ${bodyW}x${bodyH} leaves the page`)
        }
      } else {
        offenders.push(`${id}: unknown device "${device}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})
