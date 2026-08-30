import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "../layouts/registry"
import { __resetRegisteredThemes, registerTheme } from "./definitions"
import { CONSULTING_TOKENS } from "./builtin/consulting"

const twoColumn = LAYOUT_REGISTRY["two-column"]!
const ORPHAN_TAKEOVER_ID = "orphan-takeover"
let originalParams: LayoutDefinition["params"]
let originalSuppressMotif: LayoutDefinition["suppressMotif"]

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
  originalSuppressMotif = twoColumn.suppressMotif
  twoColumn.params = {
    gutter: { type: "number", min: 16, max: 64 },
    columns: { type: "number", integer: true, min: 1, max: 2 },
    emphasis: { type: "string", values: ["primary", "accent"] },
    compact: { type: "boolean" },
  }
})

afterEach(() => {
  twoColumn.params = originalParams
  twoColumn.suppressMotif = originalSuppressMotif
  delete LAYOUT_REGISTRY[ORPHAN_TAKEOVER_ID]
  __resetRegisteredThemes()
})

describe("registerTheme menu parameter gate", () => {
  it("rejects motif decor on a face that suppresses motifs", () => {
    twoColumn.suppressMotif = true
    const input = file("suppressed-motif")

    expect(() => registerTheme({
      ...input,
      menu: {
        ...input.menu,
        content: {
          points: {
            face: "two-column",
            decor: { kind: "motif", id: "gauge-motif" },
          },
        },
      },
    })).toThrow(/menu\.content\.points\.decor.*suppresses motifs/i)
  })

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

  it("rejects a takeover face with no renderer dispatcher", () => {
    LAYOUT_REGISTRY[ORPHAN_TAKEOVER_ID] = {
      id: ORPHAN_TAKEOVER_ID,
      kind: "takeover",
      slideTypes: ["content"],
      slots: [],
    }
    const input = file("orphan-takeover")

    expect(() => registerTheme({
      ...input,
      menu: {
        ...input.menu,
        content: { photo: { face: ORPHAN_TAKEOVER_ID } },
      },
    })).toThrow(/menu\.content\.photo\.face.*no renderer dispatcher/i)
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
