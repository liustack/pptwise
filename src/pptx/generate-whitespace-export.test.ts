// @vitest-environment node
//
// Whitespace survives into the file, not just into the JS run.
//
// `svg2pptx/text.ts` resolves an SVG `<text>` into runs and keeps every space
// an `xml:space="preserve"` line declares, and `text.test.ts` asserts that far
// and no further. The contract a reader cares about is the characters inside
// `<a:t>` in the package, so this unzips a real export and reads them.
//
// **On `xml:space="preserve"`: not needed on `a:t`, and not schema-legal
// there.** ECMA-376 declares the attribute where whitespace is at risk and
// nowhere else. WordprocessingML's `w:t` is `CT_Text`, a `simpleContent`
// extension of `ST_String` carrying an explicit
// `<xsd:attribute ref="xml:space" use="optional"/>` documented as "Content
// Contains Significant Whitespace" — a run there needs the attribute because
// WordprocessingML defines whitespace-collapsing semantics and this is the
// declared opt-out. DrawingML's `a:t` has neither: `CT_RegularTextRun` is
//
//     <xsd:complexType name="CT_RegularTextRun">
//       <xsd:sequence>
//         <xsd:element name="rPr" type="CT_TextCharacterProperties" minOccurs="0"/>
//         <xsd:element name="t" type="xsd:string" minOccurs="1" maxOccurs="1"/>
//       </xsd:sequence>
//     </xsd:complexType>
//
// (ECMA-376 Part 1 §21.1.2.3.11 / §A.4.1, `dml-textRun.xsd`). A plain
// `xsd:string` element declares no attributes at all, so DrawingML states no
// collapsing rule to opt out of and permits no `xml:space` on `a:t` — adding
// one makes the part schema-invalid, which is the opposite of hardening for a
// package this repo runs a PowerPoint repair probe against. XML itself never
// strips character data in element content, so the spaces written here are
// the spaces read back.
//
// So the assertion is on the characters, which is the thing that has to be
// true either way, and it holds whether or not a future pptxgenjs starts
// emitting the attribute.
import { beforeAll, describe, expect, it } from "vitest"
import JSZip from "jszip"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "../platform/node"

beforeAll(() => {
  installNodePlatform()
})

const INDENTED = "def f():\n    raise Error()\n        deeper()"

function codeDeck(): PptxIR {
  return {
    version: "5",
    filename: "whitespace.pptx",
    theme: { id: "tech" },
    meta: {},
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "points",
        heading: "缩进",
        components: [{ type: "code", language: "python", code: INDENTED }],
      },
    ],
  } as unknown as PptxIR
}

async function slideXml(): Promise<string> {
  const { generatePptxBlob } = await import("./generate")
  const zip = await JSZip.loadAsync(await (await generatePptxBlob(codeDeck())).arrayBuffer())
  const paths = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
  expect(paths.length).toBeGreaterThan(0)
  return (await Promise.all(paths.map((p) => zip.files[p]!.async("string")))).join("\n")
}

describe("indentation reaches the exported package", () => {
  it("keeps a code line's leading spaces inside its own a:t", async () => {
    const xml = await slideXml()
    const runs = [...xml.matchAll(/<a:t(?: [^>]*)?>([^<]*)<\/a:t>/g)].map((m) => m[1]!)
    // The exact character counts the source carries: four spaces on one line,
    // eight on the next. Not "contains the text somewhere" — the point of the
    // test is the spaces, so it counts them.
    expect(runs).toContain("    raise Error()")
    expect(runs).toContain("        deeper()")
  }, 30000)

  it("writes a:t the way DrawingML declares it, with no xml:space attribute", async () => {
    // The other half of the same verdict: `a:t` is a plain `xsd:string`
    // element with no attributes declared, so the attribute would make the
    // part schema-invalid. If a future dependency starts emitting one, this
    // fails and the verdict above gets re-read rather than silently reversed.
    const xml = await slideXml()
    expect(xml).toMatch(/<a:t>/)
    expect(xml).not.toMatch(/<a:t\s[^>]*xml:space/)
  }, 30000)
})
