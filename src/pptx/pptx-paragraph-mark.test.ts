import { describe, expect, it } from "vitest"
import JSZip from "jszip"
import { applyParagraphMarkFonts, patchParagraphMarksInXml } from "./pptx-paragraph-mark"

const FONTS =
  '<a:latin typeface="Georgia" pitchFamily="34" charset="0"/><a:ea typeface="Microsoft YaHei" pitchFamily="34" charset="-122"/><a:cs typeface="Georgia" pitchFamily="34" charset="-120"/>'

function paragraph(mark: string): string {
  return (
    '<a:p><a:pPr algn="l" indent="0" marL="0"><a:buNone/></a:pPr>' +
    `<a:r><a:rPr lang="en-US" sz="13200" dirty="0"><a:solidFill><a:srgbClr val="1E2A4A"/></a:solidFill>${FONTS}</a:rPr><a:t>$154</a:t></a:r>` +
    `<a:r><a:rPr lang="en-US" sz="3300" dirty="0">${FONTS}</a:rPr><a:t>a year</a:t></a:r>` +
    `${mark}</a:p>`
  )
}

describe("patchParagraphMarksInXml", () => {
  it("gives a bare mark the first run's three font slots, keeping its attributes", () => {
    const out = patchParagraphMarksInXml(paragraph('<a:endParaRPr lang="en-US" sz="13200" dirty="0"/>'))
    expect(out).toContain(`<a:endParaRPr lang="en-US" sz="13200" dirty="0">${FONTS}</a:endParaRPr></a:p>`)
  })

  it("patches each paragraph from its own runs", () => {
    const other = paragraph('<a:endParaRPr lang="en-US" dirty="0"/>').replaceAll("Georgia", "Consolas")
    const out = patchParagraphMarksInXml(paragraph('<a:endParaRPr lang="en-US" dirty="0"/>') + other)
    expect(out.match(/<a:endParaRPr[^>]*>(<a:latin typeface="[^"]+")/g)).toEqual([
      '<a:endParaRPr lang="en-US" dirty="0"><a:latin typeface="Georgia"',
      '<a:endParaRPr lang="en-US" dirty="0"><a:latin typeface="Consolas"',
    ])
  })

  it("is idempotent and leaves paragraphs without a font alone", () => {
    const once = patchParagraphMarksInXml(paragraph('<a:endParaRPr lang="en-US" dirty="0"/>'))
    expect(patchParagraphMarksInXml(once)).toBe(once)
    const bare = '<a:p><a:fld id="x" type="slidenum"><a:rPr lang="en-US"/><a:t>3</a:t></a:fld><a:endParaRPr lang="en-US"/></a:p>'
    expect(patchParagraphMarksInXml(bare)).toBe(bare)
  })
})

describe("applyParagraphMarkFonts", () => {
  it("rewrites slide parts only", async () => {
    const zip = new JSZip()
    const xml = paragraph('<a:endParaRPr lang="en-US" dirty="0"/>')
    zip.file("ppt/slides/slide1.xml", xml)
    zip.file("ppt/slideLayouts/slideLayout1.xml", xml)
    const blob = new Blob([await zip.generateAsync({ type: "arraybuffer" })])
    const out = await JSZip.loadAsync(await (await applyParagraphMarkFonts(blob)).arrayBuffer())
    expect(await out.file("ppt/slides/slide1.xml")!.async("string")).toContain(`dirty="0">${FONTS}</a:endParaRPr>`)
    expect(await out.file("ppt/slideLayouts/slideLayout1.xml")!.async("string")).toBe(xml)
  })
})
