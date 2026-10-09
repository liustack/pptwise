import { describe, expect, it } from "vitest"
import { prefixOf, textRoom } from "./text-room"

describe("the room a face gives an author's text, counted in that text", () => {
  it("counts a Chinese text in characters, blanks left out, and any other text in words", () => {
    expect(textRoom("云觅科技 2026 年复盘", () => false)).toEqual({
      limit: 0,
      count: 11,
      unit: "characters",
      held: "",
    })
    expect(textRoom("Same store growth is back", () => false)).toEqual({
      limit: 0,
      count: 5,
      unit: "words",
      held: "",
    })
  })

  it("quotes the prefix the face holds, where one unit more it does not", () => {
    const asked: string[] = []
    const room = textRoom(
      "Internationalization Responsibilities Accountabilities",
      (prefix) => {
        asked.push(prefix)
        return prefix.length <= 40
      }
    )
    expect(room).toEqual({
      limit: 2,
      count: 3,
      unit: "words",
      held: "Internationalization Responsibilities",
    })
    expect(asked).toContain("Internationalization Responsibilities")
  })

  it("hands the face a prefix with its emphasis markers kept around what stays", () => {
    expect(prefixOf("增速**回到正区间**而且", 4)).toBe("增速**回到**")
    expect(prefixOf("Growth is **back above** zero", 3)).toBe(
      "Growth is **back**"
    )
    expect(
      textRoom("增速**回到正区间**", (prefix) => prefix.length < 8).held
    ).toBe("增速回")
  })
})
