import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "../layouts/registry"
import { __resetRegisteredThemes, registerTheme } from "./definitions"
import { CONSULTING_TOKENS } from "./builtin/consulting"

const twoColumn = LAYOUT_REGISTRY["two-column"]!
let originalParams: LayoutDefinition["params"]

function file(id: string, params?: Record<string, string | number | boolean>) {
  return {
    version: 2 as const,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: { points: { face: "two-column", ...(params ? { params } : {}) } },
      ending: { face: "poster-ending" },
    },
  }
}

beforeEach(() => {
  originalParams = twoColumn.params
  twoColumn.params = {
    gutter: { type: "number", min: 16, max: 64 },
    columns: { type: "number", integer: true, min: 1, max: 2 },
    emphasis: { type: "string", values: ["primary", "accent"] },
    compact: { type: "boolean" },
  }
})

afterEach(() => {
  twoColumn.params = originalParams
  __resetRegisteredThemes()
})

describe("registerTheme menu parameter gate", () => {
  it("accepts a content menu entry backed by an image takeover face", () => {
    const input = file("photo-takeover")
    expect(() => registerTheme({
      ...input,
      menu: {
        ...input.menu,
        content: { photo: { face: "image-split" } },
      },
    })).not.toThrow()
  })

  it("accepts values inside the selected face declarations", () => {
    expect(() => registerTheme(file("params-ok", {
      gutter: 32,
      columns: 2,
      emphasis: "accent",
      compact: true,
    }))).not.toThrow()
  })

  it("rejects an undeclared parameter on the selected face", () => {
    expect(() => registerTheme(file("params-unknown", { mystery: 1 }))).toThrow(
      /menu\.content\.points\.params\.mystery.*not declared by layout "two-column"/i,
    )
  })

  it.each([
    ["wrong type", { gutter: "wide" }, /gutter.*expected number/i],
    ["below minimum", { gutter: 8 }, /gutter.*below minimum 16/i],
    ["above maximum", { gutter: 80 }, /gutter.*above maximum 64/i],
    ["non-integer", { columns: 1.5 }, /columns.*expected an integer/i],
    ["outside string values", { emphasis: "muted" }, /emphasis.*allowed values: primary, accent/i],
  ])("rejects %s", (_label, params, message) => {
    expect(() => registerTheme(file(`params-${String(_label).replaceAll(" ", "-")}`, params))).toThrow(message)
  })

  it("rejects any parameter when a face declares no adjustable parameters", () => {
    twoColumn.params = undefined
    expect(() => registerTheme(file("params-closed", { gutter: 32 }))).toThrow(
      /layout "two-column" declares no adjustable parameters/i,
    )
  })
})
