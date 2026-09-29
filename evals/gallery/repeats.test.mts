// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { MIN_RUN, repeatedRuns } from "./repeats"

beforeAll(async () => {
  await installNodePlatform()
})

/** A caption set the way `show-gallery` sets one: a line per `<text>`, same x, one line height apart. */
function caption(x: number, lines: readonly string[], extra = ""): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${614 + i * 18}" font-family="Georgia" font-size="12" fill="#5B6069" letter-spacing="2"${extra}>${line}</text>`,
    )
    .join("")
}

function page(...frames: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg">${frames.map((f) => `<g>${f}</g>`).join("")}</svg>`
}

describe("repeatedRuns", () => {
  it("finds a caption printed twice when both copies wrap onto lines shorter than a run", () => {
    // Each line is seven characters, under MIN_RUN, so a scan that compares
    // one `<text>` at a time sees no run at all. This is how the six
    // show-gallery frames hid two captions printed twice.
    const lines = ["临江咨询三号团", "队的协作工作区"]
    expect(lines.every((line) => line.length < MIN_RUN)).toBe(true)
    const svg = page(caption(64, lines), caption(260, ["文档模板库在咨询", "项目中的复用位置"]), caption(848, lines))
    expect(repeatedRuns(svg)).toEqual(["临江咨询三号团队的协作工作区"])
  })

  it("does not call a wrapped caption printed once a repetition", () => {
    const svg = page(caption(64, ["临江咨询三号团", "队的协作工作区"]), caption(260, ["文档模板库在咨询", "项目中的复用位置"]))
    expect(repeatedRuns(svg)).toEqual([])
  })

  it("still finds a sentence wrapped in one place and whole in another", () => {
    const sentence = "三次重写之后首稿只留下一句台词"
    const svg = page(
      caption(64, ["三次重写之后首", "稿只留下一句台词"]),
      `<text x="96" y="200" font-size="22">${sentence}</text>`,
    )
    expect(repeatedRuns(svg)).toEqual([sentence])
  })

  it("joins only lines that read as one paragraph", () => {
    // The same two lines in two frames. Joined, they are a caption printed
    // twice. Side by side on one baseline, a line apart in another size, or
    // several line heights apart, the second is not the next line of the
    // first, and each half on its own is too short to be a run.
    const first = `<text x="64" y="614" font-size="12">临江咨询三号团</text>`
    const twice = (second: string) => repeatedRuns(page(first + second, first + second))
    expect(twice(`<text x="64" y="632" font-size="12">队的协作工作区</text>`)).toEqual(["临江咨询三号团队的协作工作区"])
    expect(twice(`<text x="260" y="614" font-size="12">队的协作工作区</text>`)).toEqual([])
    expect(twice(`<text x="64" y="632" font-size="16">队的协作工作区</text>`)).toEqual([])
    expect(twice(`<text x="64" y="668" font-size="12">队的协作工作区</text>`)).toEqual([])
  })

  it("names the longest run a repetition covers, not every piece of it", () => {
    const lines = ["Onboarding session with", "team three at Linjiang"]
    const svg = page(caption(64, lines), caption(848, lines))
    expect(repeatedRuns(svg)).toEqual(["OnboardingsessionwithteamthreeatLinjiang"])
  })
})
