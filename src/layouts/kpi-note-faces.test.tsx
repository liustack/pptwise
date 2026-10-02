// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { parseSvgRoot } from "../render/serialize"
import { CANONICAL_THEME_IDS } from "../themes"
import { getThemeDefinition } from "../themes/definitions"

/*
 * `kpi_cards.items[].note` is a line the author wrote under a figure. Every
 * face a theme's menu sends a figure page to either paints it or hands the
 * page to something that does: the ordinary card, the bento cell, or a face
 * of its own with a place for it. None may take the figure and leave the
 * note behind.
 */

const NOTES = ["6 月末共 63,987 家", "152.16 亿元", "上市后首次下滑"]

function page(kind: "fact" | "data", items: number): Slide {
  return {
    type: "content",
    kind,
    heading: "门店一年多了 20.7%",
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "+20.7%", label: "门店数同比", note: NOTES[0]! },
          { value: "+2.3%", label: "上半年收入同比", note: NOTES[1]! },
          { value: "−14.7%", label: "上半年期内利润同比", note: NOTES[2]! },
        ].slice(0, items),
      },
    ],
  } as Slide
}

function texts(ir: PptxIR): string {
  const root = parseSvgRoot(renderSlideSvg(ir, 0))
  return Array.from(root.querySelectorAll("text"))
    .map((t) => t.textContent ?? "")
    .join("|")
}

describe("every face a figure page reaches paints the figure's note", () => {
  const cases = CANONICAL_THEME_IDS.flatMap((theme) => {
    const menu = getThemeDefinition(theme).menu.content
    return (["fact", "data"] as const)
      .filter((kind) => menu[kind] !== undefined)
      .flatMap((kind) => [1, 3].map((items) => [theme, kind, items] as const))
  })

  it.each(cases)("%s %s page with %i figure(s)", (theme, kind, items) => {
    const ir = {
      version: "5",
      filename: "kpi-note",
      theme: { id: theme },
      meta: {},
      assets: { images: {} },
      slides: [page(kind, items)],
    } as PptxIR
    const printed = texts(ir)
    for (const note of NOTES.slice(0, items)) expect(printed, `${theme} ${kind}`).toContain(note)
  })
})
