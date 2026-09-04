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
 * What the corpus holds today: 26 component-band specimens, one per theme and
 * language, plus the four sample-deck pages whose narrative includes a product
 * screenshot. Pinned so a page that stops carrying a mockup, or a new one that
 * starts, has to be looked at rather than absorbed.
 */
const EXPECTED_DEVICE_PAGES = 30
const EXPECTED_DECK_PAGES = [
  "classroom--deck--p07",
  "enterprise--deck--p09",
  "luxe--deck--p07",
  "tech--deck--p07",
]

/** The browser frame's declared proportion, window bar included. */
const BROWSER_ASPECT = 1.6

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

    // Which pages carry a device comes from the IR, never from the page id.
    const devicePages = jobs
      .filter((job) => job.ir.slides[job.slideIndex]?.components.some((c) => c.type === "device_mockup"))
      .map((job) => job.id)

    expect(devicePages.length).toBe(EXPECTED_DEVICE_PAGES)
    expect(devicePages.filter((id) => !id.includes("--comp--")).sort()).toEqual(EXPECTED_DECK_PAGES)

    const offenders: string[] = []
    for (const id of devicePages) {
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
      const origin = offsetOf(frame)
      const rects = Array.from(frame.querySelectorAll("rect"))

      if (device === "browser") {
        // The window bar is a drawn path, not an attribute claim.
        const bar = Array.from(frame.querySelectorAll("path")).find((p) =>
          /^M \d[\d.]* \d[\d.]* A /.test(p.getAttribute("d") ?? ""),
        )
        if (!bar) offenders.push(`${id}: no window bar path`)
        if (frame.querySelectorAll("circle").length !== 3) offenders.push(`${id}: not three traffic lights`)
        // The address pill is a rounded rect whose radius is half its height.
        const pill = rects.find((r) => {
          const h = Number(r.getAttribute("height"))
          return h > 0 && Math.abs(Number(r.getAttribute("rx")) - h / 2) < 0.51
        })
        if (!pill) offenders.push(`${id}: no address pill`)
        // The outline proves the window's own edges, and carries its size.
        const outline = rects.find((r) => r.getAttribute("fill") === "none" && r.getAttribute("stroke"))
        if (!outline) {
          offenders.push(`${id}: no window outline`)
          continue
        }
        const w = Number(outline.getAttribute("width"))
        const h = Number(outline.getAttribute("height"))
        if (!(w > 0 && h > 0)) offenders.push(`${id}: outline ${w}x${h}`)
        if (Math.abs(w / h - BROWSER_ASPECT) > 0.12) offenders.push(`${id}: aspect ${(w / h).toFixed(2)}`)
        const x = origin.x + Number(outline.getAttribute("x"))
        const y = origin.y + Number(outline.getAttribute("y"))
        if (x < 0 || y < 0 || x + w > CANVAS_W_PX + 0.5 || y + h > CANVAS_H_PX + 0.5) {
          offenders.push(`${id}: window at ${x},${y} ${w}x${h} leaves the page`)
        }
      } else if (device === "phone") {
        const body = rects[0]
        const bodyW = Number(body?.getAttribute("width"))
        const bodyH = Number(body?.getAttribute("height"))
        if (!(bodyW > 0 && bodyH > bodyW)) offenders.push(`${id}: body ${bodyW}x${bodyH} is not portrait`)
        // A notch: wider than it is tall, sitting on the body's top edge.
        const notch = rects.find(
          (r) =>
            Number(r.getAttribute("y")) === 0 &&
            Number(r.getAttribute("width")) > Number(r.getAttribute("height")) &&
            Number(r.getAttribute("width")) < bodyW,
        )
        if (!notch) offenders.push(`${id}: no notch on the body's top edge`)
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
