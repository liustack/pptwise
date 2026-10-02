import { describe, expect, it } from "vitest"
import JSZip from "jszip"
import type { PptxIR, Slide } from "@/ir"
import {
  patchSlideNumberFieldsInXml,
  SLIDE_NUMBER_FIELD_ID,
  SLIDE_NUMBER_OBJECT_PREFIX,
  slideNumberObjectName,
} from "./pptx-slide-number"

/**
 * The footer's page number leaves the SVG as plain text and reaches the file
 * as PowerPoint's own slide-number field, so the number follows the page
 * when slides move. These tests pin the XML shape of that field and where
 * it may appear: content pages of a deck that asked for page numbers, and
 * nowhere else.
 */

const RUN =
  '<a:r><a:rPr lang="zh-CN" sz="1200" dirty="0"><a:solidFill><a:srgbClr val="5B6069"/></a:solidFill><a:latin typeface="Georgia"/><a:ea typeface="SimSun"/></a:rPr><a:t>3</a:t></a:r>'

function shape(name: string, body: string): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="7" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="r"/>${body}<a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>`
}

describe("patchSlideNumberFieldsInXml", () => {
  it("turns the marked box's one run into a slide-number field, keeping its properties and number", () => {
    const xml = `<p:spTree>${shape("Text 1", RUN)}${shape(slideNumberObjectName(2), RUN)}</p:spTree>`
    const out = patchSlideNumberFieldsInXml(xml)
    expect(out).toContain(
      `<a:fld id="${SLIDE_NUMBER_FIELD_ID}" type="slidenum"><a:rPr lang="zh-CN" sz="1200" dirty="0"><a:solidFill><a:srgbClr val="5B6069"/></a:solidFill><a:latin typeface="Georgia"/><a:ea typeface="SimSun"/></a:rPr><a:t>3</a:t></a:fld>`,
    )
    // The ordinary text box next to it is untouched.
    expect(out.startsWith(`<p:spTree>${shape("Text 1", RUN)}`)).toBe(true)
    expect(out.match(/<a:r>/g)).toHaveLength(1)
  })

  it("is idempotent", () => {
    const xml = `<p:spTree>${shape(slideNumberObjectName(0), RUN)}</p:spTree>`
    const once = patchSlideNumberFieldsInXml(xml)
    expect(patchSlideNumberFieldsInXml(once)).toBe(once)
  })

  it("leaves a slide without a marked box alone", () => {
    const xml = `<p:spTree>${shape("Text 1", RUN)}</p:spTree>`
    expect(patchSlideNumberFieldsInXml(xml)).toBe(xml)
  })

  it("fails loud on a marked box that is not exactly one run", () => {
    const two = `<p:spTree>${shape(slideNumberObjectName(0), RUN + RUN)}</p:spTree>`
    expect(() => patchSlideNumberFieldsInXml(two)).toThrow(/expected exactly one/)
    const none = `<p:spTree>${shape(slideNumberObjectName(0), "")}</p:spTree>`
    expect(() => patchSlideNumberFieldsInXml(none)).toThrow(/holds 0 runs/)
  })
})

function deck(footer?: PptxIR["footer"]): PptxIR {
  const content = (heading: string): Slide => ({
    type: "content",
    kind: "points",
    heading,
    components: [{ type: "bullets", items: ["客流向核心商圈集中", "租金成本连续两年上涨"] }],
  })
  return {
    version: "5",
    filename: "slide-number.pptx",
    theme: { id: "swiss" },
    meta: { organization: "华东区域运营中心" },
    assets: { images: {} },
    ...(footer ? { footer } : {}),
    slides: [
      { type: "cover", heading: "2026 年门店网络调整方案", components: [] },
      content("三项调整的理由"),
      { type: "chapter", heading: "调整路径", components: [] },
      content("分三步关店"),
      { type: "ending", heading: "谢谢", components: [] },
    ],
  }
}

async function slideXmls(ir: PptxIR): Promise<string[]> {
  const { generatePptxBlob } = await import("./generate")
  const zip = await JSZip.loadAsync(await (await generatePptxBlob(ir)).arrayBuffer())
  return Promise.all(ir.slides.map((_s, i) => zip.file(`ppt/slides/slide${i + 1}.xml`)!.async("string")))
}

describe("exported page numbers", () => {
  it("content pages carry one slide-number field in a text box; cover, chapter and ending carry none", async () => {
    const ir = deck({ page_number: true })
    const xmls = await slideXmls(ir)
    ir.slides.forEach((slide, i) => {
      const fields = xmls[i]!.match(/<a:fld [^>]*type="slidenum"[^>]*>[\s\S]*?<\/a:fld>/g) ?? []
      if (slide.type !== "content") {
        expect(fields, `slide ${i + 1} (${slide.type})`).toHaveLength(0)
        expect(xmls[i]).not.toContain(SLIDE_NUMBER_OBJECT_PREFIX)
        return
      }
      expect(fields, `slide ${i + 1}`).toHaveLength(1)
      const field = fields[0]!
      expect(field).toContain(`id="${SLIDE_NUMBER_FIELD_ID}"`)
      // The field keeps the run's own properties, fonts included, and shows
      // this page's number until PowerPoint recomputes it.
      expect(field).toMatch(/<a:rPr [^>]*>[\s\S]*<a:latin typeface="[^"]+"[^>]*\/><a:ea typeface="[^"]+"[^>]*\/>[\s\S]*<\/a:rPr><a:t>/)
      expect(field).toContain(`<a:t>${i + 1}</a:t>`)
      // It sits in an ordinary text box named for its slide, not in a
      // placeholder, and that box holds nothing else.
      const box = xmls[i]!.slice(xmls[i]!.lastIndexOf("<p:sp>", xmls[i]!.indexOf(field)), xmls[i]!.indexOf("</p:sp>", xmls[i]!.indexOf(field)))
      expect(box).toContain(`name="${slideNumberObjectName(i)}"`)
      expect(box).not.toContain("<p:ph")
      expect(box).not.toContain("<a:r>")
    })
  })

  it("a deck that asks for no page numbers exports no field", async () => {
    for (const xml of await slideXmls(deck())) {
      expect(xml).not.toContain('type="slidenum"')
      expect(xml).not.toContain(SLIDE_NUMBER_OBJECT_PREFIX)
    }
  })
})
