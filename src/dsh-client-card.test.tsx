// @vitest-environment jsdom
//
// The DSH preview card, mounted for real.
//
// `dsh/client.js` is a hand-written lazy-CJS bundle: the shell puts
// `window.__ModuleLoader__` up, the file registers a factory, and the factory
// gets `require` at materialization time. This suite reproduces that handshake
// with the real `react`, pulls the card component out through a fake `slots`
// service, and drives it the way a person would — clicks, arrow keys, export.
//
// The sibling suite in this repo only ever called the exported pure helpers,
// which meant deleting the placeholder branch or re-filtering the pages left
// every test green. Everything below is written so that breaking the behaviour
// it names turns it red.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest"
import type { Node as TsNode } from "typescript"
import { render, screen, fireEvent, waitFor, cleanup, act, within } from "@testing-library/react"
import * as React from "react"
import * as ReactDOM from "react-dom"

interface Page {
  id?: string
  page?: number
  type?: string
  svg: string | null
  findings?: unknown[]
}

interface Bundle {
  title?: string
  slide?: { width: number; height: number }
  pages: Page[]
  draft?: boolean
}

type CardProps = { block: unknown }
type Card = React.ComponentType<CardProps>

let makeCard: (options?: { reactDom?: boolean; key?: string }) => Card
let makeTesting: () => { isZip: (blob: Blob) => Promise<boolean> }

interface TailEntry { callId: string; tool: string; kind: string; id: string; target: string; version: number; priorId: string | null }
type TailProps = { turn: { turn: number }; useArtifacts: (turn: string) => TailEntry[] | undefined; editPage?: (n: number) => void }
interface TailKit {
  Tail: React.ComponentType<TailProps>
  definition: {
    kind: string
    match: (event: unknown) => { id: string; role: string } | null
    start: (context: unknown, match: unknown, reader: unknown) => unknown
    update: (context: unknown, match: unknown) => unknown
    buildViewNode: (context: unknown) => { data: TailEntry; location: unknown; anchorSeq: number; visibility: string } | null
  }
  registeredDefinitions: unknown[]
  inject: (sessionId: string) => { editPage: (n: number) => void; keyedHooks: { artifacts: (turn: string) => unknown } }
  testing: { editPageIn: (sessions: unknown, sessionId: string, n: number) => void; deckKey: (target: string) => string }
  /** The tool cards from the same plugin instance, so they see its sidebar. */
  seats: Map<string, Card>
  /** What the plugin asked DSH's right sidebar to open. */
  opened: { address: string; options: { kind?: string; params?: { page?: number; version?: number } } }[]
  /** The sidebar tab type it registered, when there was a sidebar. */
  tabTypes: { id: string; kind: string; patterns: string[]; canOpen: (address: string) => boolean; title: (address: string) => string }[]
  PaneTab?: React.ComponentType<{ useTabInfo: () => TabInfo }>
  PaneTitle?: React.ComponentType<{ useTabInfo: () => TabInfo }>
}
interface TabInfo {
  sidebar: { expanded: boolean; fullscreen: boolean }
  tab: { title: string; navigation: { address: string; params?: { page?: number; version?: number }; revision: number }; actions: { close: () => void } }
}
let makeTail: (session?: { conversation?: unknown; snapshot?: unknown; sidebar?: boolean; primitives?: Record<string, unknown> | null }) => TailKit

beforeAll(async () => {
  let captured: { factory: (require: (id: string) => unknown) => unknown } | null = null
  ;(window as unknown as { __ModuleLoader__: unknown }).__ModuleLoader__ = {
    load(mod: { factory: (require: (id: string) => unknown) => unknown }) {
      captured = mod
    },
  }
  // @ts-expect-error the plugin's browser half is untyped plain JS on purpose
  await import("../dsh/client.js")
  const mod = captured as unknown as { factory: (require: (id: string) => unknown) => unknown } | null
  if (!mod) throw new Error("dsh/client.js never registered a module")

  makeTesting = () =>
    (
      mod.factory((id: string) => (id === "react" ? React : {})) as {
        __testing: { isZip: (blob: Blob) => Promise<boolean> }
      }
    ).__testing

  // The module body only evaluates once; the factory may run per test.
  // `react-dom` is in the shell's module table from 0.1.x on, and the card
  // asks for it to lift the viewer out of the chat column. `reactDom: false`
  // is a shell whose table does not have it.
  makeCard = (options = {}) => {
    const exportsObj = mod.factory((id: string) => {
      if (id === "react") return React
      if (id === "react-dom" && options.reactDom !== false) return ReactDOM
      if (id === "@deepseek-ai/dsh-client-ui-primitives") return {}
      throw new Error("unexpected require: " + id)
    }) as { apply: (ctx: unknown) => void; inject: string[] }

    const seats = new Map<string, Card>()
    exportsObj.apply({
      slots: {
        inject(_name: string, run: () => Generator<unknown>) {
          for (const _ of run()) {
            /* drain: the registration happens inside */
          }
        },
        register(descriptor: { name: string; key: string }, component: Card) {
          expect(descriptor.name).toBe("tool.call.toolview")
          seats.set(descriptor.key, component)
          return () => {}
        },
      },
    })
    // One seat per tool, and the build shares the deck card because its
    // result carries the same preview stamp.
    expect([...seats.keys()].sort()).toEqual(["pptwise_build", "pptwise_outline", "pptwise_preview", "pptwise_themes"])
    expect(seats.get("pptwise_build")).toBe(seats.get("pptwise_preview"))
    const found = seats.get(options.key ?? "pptwise_preview")
    if (!found) throw new Error("the plugin registered no card")
    return found
  }

  // The session-scope half: a ctx whose scoped `inject` hands over slots,
  // the Conversation service and the session registry, the way the web
  // shell does once a session is open.
  makeTail = (session = {}) => {
    const exportsObj = mod.factory((id: string) => {
      if (id === "react") return React
      if (id === "react-dom") return ReactDOM
      // DSH's primitives: the given stand-ins, an empty module by default,
      // and a module table without them when `primitives` is null.
      if (id === "@deepseek-ai/dsh-client-ui-primitives" && session.primitives !== null) return session.primitives ?? {}
      throw new Error("unexpected require: " + id)
    }) as { apply: (ctx: unknown) => void; __testing: TailKit["testing"] & { artifactDefinition: TailKit["definition"] } }
    const registeredDefinitions: unknown[] = []
    const seats = new Map<string, Card>()
    const opened: TailKit["opened"] = []
    const tabTypes: TailKit["tabTypes"] = []
    const panes = new Map<string, React.ComponentType<{ useTabInfo: () => TabInfo }>>()
    let tail: { component: TailKit["Tail"]; descriptor: { inject: TailKit["inject"]; name: string } } | undefined
    const binding = { ctx: { get: (name: string) => (name === "conversation" ? session.conversation : undefined) } }
    const scope = {
      effect: (fn: () => unknown) => fn(),
      slots: {
        inject(_name: string, run: () => Generator<unknown>) {
          for (const _ of run()) {
            /* drain */
          }
        },
        register(descriptor: { name: string; key?: string; inject: TailKit["inject"] }, component: TailKit["Tail"]) {
          if (descriptor.name === "conversation.chat.turnTail") tail = { component, descriptor }
          if (descriptor.name === "tool.call.toolview") seats.set(descriptor.key!, component as unknown as Card)
          if (descriptor.name.startsWith("sidebar.right.pane.tab")) {
            expect(descriptor.key).toBe("@liustack/pptwise:viewer")
            panes.set(descriptor.name, component as unknown as React.ComponentType<{ useTabInfo: () => TabInfo }>)
          }
          return () => {}
        },
      },
      sidebarRight: {
        openResource: (address: string, options: TailKit["opened"][number]["options"]) => {
          opened.push({ address, options })
        },
        mounted: { getSnapshot: () => "s1" },
      },
      sidebarRightTabs: {
        register: (definition: TailKit["tabTypes"][number]) => {
          tabTypes.push(definition)
          return () => {}
        },
      },
      uiConversation: {
        events: { register: (definition: unknown) => { registeredDefinitions.push(definition); return () => {} } },
        binding: () => ({ target: () => ({ getSnapshot: () => session.snapshot }) }),
      },
      sessions: { binding: (id: string) => (id === "s1" ? binding : undefined) },
    }
    exportsObj.apply({
      slots: scope.slots,
      inject(names: string[], cb: (scope: unknown) => void) {
        if (names.includes("uiConversation")) cb(scope)
        // A shell without the right sidebar never applies the viewer's half.
        if (names.includes("sidebarRight") && session.sidebar) cb(scope)
      },
    })
    if (!tail) throw new Error("the plugin registered no turn tail")
    return {
      Tail: tail.component,
      definition: exportsObj.__testing.artifactDefinition,
      registeredDefinitions,
      inject: tail.descriptor.inject,
      testing: exportsObj.__testing,
      seats,
      opened,
      tabTypes,
      PaneTab: panes.get("sidebar.right.pane.tab"),
      PaneTitle: panes.get("sidebar.right.pane.tab.title"),
    }
  }
})

/** A page whose markup made it into the bundle — one the strip can draw. */
function page(n: number, type = "content"): Page {
  return {
    id: "p" + n,
    page: n,
    type,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" id="root${n}"><rect id="r${n}"/></svg>`,
  }
}

/**
 * A page past the end of the strip: metadata only, no markup. The host half
 * inlines the first `THUMBNAIL_STRIP_PAGES` pages and sends the rest like
 * this, since the viewer that shows them is a whole html page of its own.
 */
function beyondStrip(n: number, type = "content"): Page {
  return { id: "p" + n, page: n, type, svg: null }
}

function bundleOf(pages: Page[], title = "Quarterly deck"): Bundle {
  return { title, slide: { width: 1280, height: 720 }, pages }
}

/**
 * A tool-call block carrying the structured payload (native mode).
 *
 * `pages` puts the host half's own summary phrasing in the result text. That
 * sentence is the only thing left about the deck once the rendered files are
 * gone, so a card with no bundle reads its page count back out of it.
 */
function blockWith(bundle: Bundle | null, previewId: string | null, facts: { pages?: number } = {}) {
  const summary = `deck ready${facts.pages === undefined ? "" : `\nrendered ${facts.pages} pages to /tmp/out`}`
  return {
    content: previewId ? [{ text: `${summary}\npptwise-preview:${previewId}\n` }] : [{ text: summary }],
    meta: bundle ? { card: "pptwise-preview", bundle } : undefined,
  }
}

/**
 * The plugin's host half, for the one thing this suite cannot fake: the exact
 * sentence the card parses a dead deck's page count out of.
 */
async function loadHostHalf(): Promise<{ modelSummary: (value: unknown) => string }> {
  // @ts-expect-error untyped on purpose, same as its own suite imports it
  const mod = await import("../dsh/preview-tool.js")
  return mod.__testing
}

/**
 * The browser half's own exported helpers, for the checks a rendered card
 * cannot show — the export's byte sniffing has no visible surface of its own.
 */
function clientTesting(): { isZip: (blob: Blob) => Promise<boolean> } {
  return makeTesting()
}

/**
 * A response shaped the way the plugin's own route writes one.
 *
 * Every answer the host half sends carries `x-pptwise-preview: 1`, and the card
 * refuses to read a verdict off a response without it — a bare 404 could have
 * come from a proxy, or from a shell that never loaded this plugin at all.
 * Building the mocks through here is what keeps this suite testing the card's
 * real contract rather than a looser one that would also accept a stranger's
 * 404 as proof a deck is gone.
 */
function routeAnswer(init: {
  status: number
  json?: unknown
  blob?: Blob
  stamped?: boolean
  code?: string
}) {
  const stamped = init.stamped !== false
  return {
    ok: init.status >= 200 && init.status < 300,
    status: init.status,
    headers: {
      get: (name: string) => (stamped && name.toLowerCase() === "x-pptwise-preview" ? "1" : null),
    },
    // Failures carry a machine-readable code beside the sentence, which is how
    // the card tells a deleted preview from a damaged one — both are 410, so
    // the status cannot say it and the prose must not have to.
    json: async () => init.json ?? (init.code ? { code: init.code, error: "…" } : null),
    blob: async () => init.blob ?? pptxBytes(),
  }
}

/**
 * Bytes that begin like a zip, which is what a .pptx is.
 *
 * The export button checks this before saving, so a mock that returns an
 * arbitrary blob would be testing the failure path by accident.
 */
function pptxBytes(): Blob {
  return new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])])
}

/** A 200 whose body is not a deck at all — the `pptx.json` incident, reproduced. */
function notADeck(): Blob {
  return new Blob(["<!doctype html><title>Sign in</title>"])
}

/** The thumbnails: Frame renders a clickable div with an explicit role. */
function thumbnails(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[role="button"]'))
}

/**
 * The full-screen viewer, when it is open: the deck pane.
 *
 * Looked for in the whole document, not the card's container: without DSH's
 * sidebar the pane is portalled onto `document.body` so that no ancestor of
 * the card can clip it.
 */
function viewer(container: HTMLElement) {
  return container.ownerDocument.querySelector("[data-pptwise-viewer]") as HTMLElement | null
}

/** Wait for the viewer to show deck `id`, on page `n`. */
async function viewerOn(container: HTMLElement, id: string, n: number) {
  await waitFor(() => {
    const pane = viewer(container)
    expect(pane).toHaveAttribute("data-pptwise-viewer", id)
    expect(pane).toHaveAttribute("data-page", String(n))
  })
}

let fetchMock: ReturnType<typeof vi.fn>
let anchorClicks: { href: string; download: string }[]

beforeEach(() => {
  anchorClicks = []
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    anchorClicks.push({ href: this.href, download: this.download })
  })
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:deck"),
  })
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() })
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("dsh preview card — the thumbnail strip", () => {
  it("draws only the pages that arrived with markup, and still counts the rest", () => {
    const Card = makeCard()
    const pages = [page(1, "cover"), page(2), beyondStrip(3)]
    const { container } = render(<Card block={blockWith(bundleOf(pages), "abc")} />)

    // Two frames for three pages. Drawing the third would put an empty box in
    // the strip, which reads as a broken slide rather than as the end of a
    // teaser.
    expect(thumbnails(container)).toHaveLength(2)
    expect(container.querySelectorAll("svg")).toHaveLength(2)
    // The deck's real length is what the header reports, not the strip's.
    expect(screen.getByText("3 pages")).toBeInTheDocument()
    // And nothing on screen calls a page too big to show: the viewer has
    // every page, so a page without a thumbnail is not a page anybody lost.
    expect(screen.queryByText(/too large/i)).toBeNull()
  })

  it("stops the strip at twelve however much markup it is handed", () => {
    // The strip is a fixed-length teaser. Every page here carries markup —
    // a host half more generous than this one, or one whose cap has been
    // raised and this one's has not — and the strip still stops where it
    // says it stops, rather than growing into a scrollbar with the deck.
    const Card = makeCard()
    const pages = Array.from({ length: 20 }, (_x, i) => page(i + 1))
    const { container } = render(<Card block={blockWith(bundleOf(pages), "abc")} />)

    expect(thumbnails(container)).toHaveLength(12)
    expect(screen.getByText("20 pages")).toBeInTheDocument()
  })

  it("titles each thumbnail with the deck's own numbering", () => {
    const Card = makeCard()
    const pages = [page(1, "cover"), page(2), page(3, "ending")]
    const { container } = render(<Card block={blockWith(bundleOf(pages), "abc")} />)

    expect(thumbnails(container).map((el) => el.getAttribute("title"))).toEqual([
      "cover 1",
      "content 2",
      "ending 3",
    ])
  })

  it("namespaces every id it mounts, so two slides in one DOM cannot cross-wire", () => {
    // Each slide is a standalone document whose ids only have to be unique
    // inside itself; several of them in one page share an id space, so a
    // `url(#glow)` on slide 3 would resolve against slide 1's definition of
    // it. Writing `props.svg` straight into `innerHTML` looks identical in a
    // test that only counts <svg> elements — this one reads the ids.
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "abc")} />)

    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id)
    expect(ids).toEqual(["pft0-root1", "pft0-r1", "pft1-root2", "pft1-r2"])
    // The raw ids must be gone, not merely joined by prefixed copies.
    expect(container.querySelector("#root1")).toBeNull()
    expect(container.querySelector("#r2")).toBeNull()
  })

  it("renders nothing at all when the block carries no recognisable payload", () => {
    const Card = makeCard()
    const { container } = render(<Card block={{ content: [{ text: "no preview here" }] }} />)
    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("survives a block with no content and no meta", () => {
    const Card = makeCard()
    expect(() => render(<Card block={{}} />)).not.toThrow()
    expect(() => render(<Card block={null} />)).not.toThrow()
  })
})

describe("dsh preview card — the viewer", () => {
  const nine = () => [
    page(1, "cover"),
    page(2),
    page(3),
    page(4),
    page(5),
    page(6),
    page(7),
    page(8),
    page(9, "ending"),
  ]

  /**
   * The bundle route answering that the deck is still there.
   *
   * Every way into the viewer asks first (see `openViewer` in client.js), so
   * a test that clicks "Preview" without this is testing a card whose id the
   * harness has just disowned.
   */
  function routeIsAlive(bundle: Bundle = bundleOf(nine())) {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/pptx")
        ? routeAnswer({ status: 200 })
        : routeAnswer({ status: 200, json: JSON.parse(JSON.stringify(bundle)) }),
    )
  }

  /** Open the viewer from the card's Open button and wait until it shows a page. */
  async function openViewer(id = "abc") {
    routeIsAlive()
    const Card = makeCard()
    const view = render(<Card block={blockWith(bundleOf(nine()), id)} />)
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(view.container, id, 1)
    return view
  }

  /** The page the viewer is on, read off the page it shows rather than its own attribute. */
  function shownPage(container: HTMLElement) {
    const slide = viewer(container)!.querySelector(".pw-slide")!
    return /\/page\/(\d+)$/.exec(slide.getAttribute("src") ?? "")?.[1]
  }

  it("checks the id is still live before opening, instead of walking into a wall", async () => {
    // The failure this exists for: a browser tab left open across a harness
    // restart. The card is drawing a bundle it fetched minutes ago and the
    // record behind the id is gone. The deck stays on screen, because those
    // thumbnails are real; what goes is the promise that clicking them leads
    // anywhere.
    fetchMock.mockResolvedValue(routeAnswer({ status: 404 }))
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf(nine()), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))

    expect(await screen.findByText("gone")).toBeInTheDocument()
    expect(viewer(container)).toBeNull()
    // The strip survives: it is the deck, and it is already in the browser.
    expect(container.querySelectorAll("svg")).toHaveLength(9)
    // ...and no way back in is left lying around: no Open button, and the
    // thumbnails give up their button role rather than sit there looking
    // clickable.
    expect(screen.queryByText("Preview")).toBeNull()
    expect(thumbnails(container)).toHaveLength(0)
    fireEvent.click(container.querySelectorAll("svg")[0]!)
    expect(viewer(container)).toBeNull()
  })

  it("shows one page at a time from the page route, with Page N of M and every page below", async () => {
    const { container } = await openViewer("abc123")
    const pane = viewer(container)!

    expect(pane.querySelector(".pw-slide")!.getAttribute("src")).toBe("/pptwise/preview/abc123/page/1")
    expect(within(pane).getByText("Page 1 of 9")).toBeInTheDocument()
    const strip = Array.from(pane.querySelectorAll("[data-viewer-thumb]"))
    expect(strip).toHaveLength(9)
    expect(strip[8]!.querySelector("img")!.getAttribute("src")).toBe("/pptwise/preview/abc123/page/9")
    expect(strip[0]).toHaveAttribute("aria-current", "true")
    // No iframe, so nothing in the pane has a document of its own to swallow keys.
    expect(document.querySelector("iframe")).toBeNull()
  })

  it("takes the keyboard the moment it opens", async () => {
    // The bug this replaced: the old viewer was an iframe nobody focused, so
    // ←/→ went to the chat's document and the deck never moved until the
    // reader clicked into it.
    const { container } = await openViewer()
    expect(document.activeElement).toBe(viewer(container))
  })

  it("pages with ←/→, PageUp/PageDown, Space and Shift+Space, and jumps with Home and End", async () => {
    const { container } = await openViewer()
    const pane = () => viewer(container)!
    const press = (key: string, extra: Record<string, unknown> = {}) => fireEvent.keyDown(document.activeElement!, { key, ...extra })

    press("ArrowRight")
    expect(shownPage(container)).toBe("2")
    press("PageDown")
    expect(shownPage(container)).toBe("3")
    press(" ")
    expect(shownPage(container)).toBe("4")
    press(" ", { shiftKey: true })
    expect(shownPage(container)).toBe("3")
    press("PageUp")
    expect(shownPage(container)).toBe("2")
    press("ArrowLeft")
    expect(shownPage(container)).toBe("1")
    // The first page stays put rather than wrapping round.
    press("ArrowLeft")
    expect(shownPage(container)).toBe("1")
    press("End")
    expect(shownPage(container)).toBe("9")
    expect(within(pane()).getByText("Page 9 of 9")).toBeInTheDocument()
    press("ArrowRight")
    expect(shownPage(container)).toBe("9")
    press("Home")
    expect(shownPage(container)).toBe("1")
    // A shortcut with a modifier belongs to the browser or the harness.
    press("ArrowRight", { metaKey: true })
    expect(shownPage(container)).toBe("1")
  })

  it("pages with the previous and next areas and the strip, and keeps the keyboard afterwards", async () => {
    const { container } = await openViewer()
    const pane = viewer(container)!
    const prev = pane.querySelector('[data-side="prev"]') as HTMLButtonElement
    const next = pane.querySelector('[data-side="next"]') as HTMLButtonElement
    expect(prev).toBeDisabled()

    fireEvent.click(next)
    expect(shownPage(container)).toBe("2")
    expect(prev).not.toBeDisabled()
    fireEvent.click(prev)
    expect(shownPage(container)).toBe("1")

    fireEvent.click(pane.querySelector('[data-viewer-thumb="7"]')!)
    expect(shownPage(container)).toBe("7")
    expect(pane.querySelector('[data-viewer-thumb="7"]')).toHaveAttribute("aria-current", "true")
    expect(within(pane).getByText("Page 7 of 9")).toBeInTheDocument()
    // A click hands the keyboard back to the pane, so the next arrow still pages.
    expect(document.activeElement).toBe(pane)
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" })
    expect(shownPage(container)).toBe("8")
    fireEvent.click(pane.querySelector('[data-viewer-thumb="9"]')!)
    expect(next).toBeDisabled()
  })

  it("pages on a sideways trackpad swipe, once per swipe", async () => {
    const { container } = await openViewer()
    const stage = viewer(container)!.querySelector(".pw-stage")!
    fireEvent.wheel(stage, { deltaX: 80, deltaY: 4 })
    expect(shownPage(container)).toBe("2")
    // The rest of the same swipe's burst does not page again.
    fireEvent.wheel(stage, { deltaX: 90, deltaY: 2 })
    expect(shownPage(container)).toBe("2")
    // A vertical scroll is not a swipe.
    stage.removeAttribute("data-swiped-at")
    fireEvent.wheel(stage, { deltaX: 50, deltaY: 120 })
    expect(shownPage(container)).toBe("2")
    fireEvent.wheel(stage, { deltaX: -80, deltaY: 0 })
    expect(shownPage(container)).toBe("1")
  })

  it("opens the viewer on the thumbnail that was clicked", async () => {
    // Clicking page five and landing on page one is the kind of small lie
    // that makes a strip feel decorative.
    routeIsAlive()
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf(nine()), "abc")} />)
    fireEvent.click(thumbnails(container)[4]!)
    await viewerOn(container, "abc", 5)
    expect(shownPage(container)).toBe("5")
    expect(screen.getByText("Page 5 of 9")).toBeInTheDocument()
  })

  it("opens from the keyboard on the thumbnail that has focus", async () => {
    // A thumbnail is a div with `role="button"` and `tabIndex`, which promises
    // the keyboard behaviour a real <button> would have given for free.
    for (const key of ["Enter", " "]) {
      routeIsAlive()
      const Card = makeCard()
      const { container, unmount } = render(<Card block={blockWith(bundleOf(nine()), "abc")} />)
      const thumb = thumbnails(container)[2]!
      expect(thumb).toHaveAttribute("tabIndex", "0")

      fireEvent.keyDown(thumb, { key })
      await viewerOn(container, "abc", 3)
      unmount()
      cleanup()
    }
  })

  it("ignores the keys that are not an activation", () => {
    routeIsAlive()
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf(nine()), "abc")} />)
    fireEvent.keyDown(thumbnails(container)[2]!, { key: "a" })
    fireEvent.keyDown(thumbnails(container)[2]!, { key: "Tab" })
    expect(viewer(container)).toBeNull()
  })

  it("closes on Escape, where the keyboard already is", async () => {
    const { container } = await openViewer()
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    expect(viewer(container)).toBeNull()
  })

  it("closes on the Close button", async () => {
    const { container } = await openViewer()
    fireEvent.click(screen.getByText("Close"))
    expect(viewer(container)).toBeNull()
  })

  it("closes on a click on the surround, but never on one on the deck", async () => {
    const { container } = await openViewer()
    const layer = document.querySelector("[data-pptwise-layer]") as HTMLElement
    expect(layer).toBeTruthy()

    // A click that started on the pane bubbles to the same element and must
    // not be mistaken for one on the surround — that would dismiss the viewer
    // every time somebody clicked the deck they came to read.
    fireEvent.click(viewer(container)!.querySelector(".pw-slide")!)
    expect(viewer(container)).not.toBeNull()

    fireEvent.click(layer)
    expect(viewer(container)).toBeNull()
  })

  it("draws itself from DSH's design variables, with no light or dark switch of its own", async () => {
    const { container } = await openViewer()
    const css = document.querySelector("#pptwise-dsh-style")!.textContent ?? ""
    // DSH's tokens, and DSH's own dark-theme switch: nothing here picks a colour.
    expect(css).toContain("var(--dsw-alias-bg-layer-1)")
    expect(css).toContain("var(--dsw-alias-border-l1)")
    expect(css).toContain("body[data-ds-dark-theme]")
    expect(css).not.toMatch(/#000\b|#fff\b|background:#/)
    const pane = viewer(container)!
    expect(within(pane).queryByText(/^(Light|Dark)$/)).toBeNull()
    // One sheet however many viewers open.
    fireEvent.click(screen.getByText("Close"))
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "abc", 1)
    expect(document.querySelectorAll("#pptwise-dsh-style")).toHaveLength(1)
  })

  it("keeps the download inside the viewer", async () => {
    await openViewer("abc123")

    const buttons = await screen.findAllByText("Download .pptx")
    expect(buttons).toHaveLength(2) // one on the card, one in the viewer
    fireEvent.click(buttons[1]!)

    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/abc123/pptx")
  })

  it("opens on the page body, where the chat column's work group cannot crop it", async () => {
    // DSH 0.1.7 and later put the card in a collapsible work group whose body
    // has a max-height, scrolls, and fades its edges with a mask. A mask crops
    // fixed descendants too, so a viewer drawn inside the card opened as a
    // small window in the chat column. The wrapper below copies that body's
    // rules, and the viewer must not end up anywhere under it.
    routeIsAlive()
    const Card = makeCard()
    const { container } = render(
      <div
        data-testid="work-group-body"
        style={{ maxHeight: 400, overflowY: "auto", maskImage: "linear-gradient(#000, transparent)" }}
      >
        <Card block={blockWith(bundleOf(nine()), "abc")} />
      </div>,
    )
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "abc", 1)

    const layer = viewer(container)!.closest("[data-pptwise-layer]") as HTMLElement
    expect(layer.parentElement).toBe(document.body)
    expect(screen.getByTestId("work-group-body").contains(layer)).toBe(false)
    expect(container.contains(viewer(container))).toBe(false)

    // Still part of the card: closing it takes the layer off the body.
    fireEvent.click(screen.getByText("Close"))
    expect(viewer(container)).toBeNull()
    expect(document.querySelector("[data-pptwise-layer]")).toBeNull()
  })

  it("opens inside the card on a shell whose module table has no react-dom", async () => {
    // Not a supported DSH today, but the card must still open a viewer rather
    // than lose it, which is what every build drew before the work group.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    routeIsAlive()
    const Card = makeCard({ reactDom: false })
    const { container } = render(<Card block={blockWith(bundleOf(nine()), "abc")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "abc", 1)

    expect(container.contains(viewer(container))).toBe(true)
    expect(warn.mock.calls.some(([line]) => String(line).includes("react-dom unavailable"))).toBe(true)
    fireEvent.click(screen.getByText("Close"))
    expect(viewer(container)).toBeNull()
  })

  it("offers no viewer at all without a preview id, rather than an empty one", () => {
    // The viewer is a route keyed by that id. A button that opened a 404
    // would be worse than no button.
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1)]), null)} />)

    expect(screen.queryByText("Preview")).toBeNull()
    expect(thumbnails(container)).toHaveLength(0)
    expect(viewer(container)).toBeNull()
    // The deck is still on screen: drawing the strip needs no id.
    expect(container.querySelectorAll("svg")).toHaveLength(1)
  })
})

describe("dsh preview card — the export button", () => {
  it("saves a deck whose title already ends in .pptx under one extension", async () => {
    // The title is the IR's `filename`, and authors often write the extension
    // into it. The browser used to save `Q3 review.pptx.pptx`.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200 }))
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)], "Q3 review.pptx"), "abc123")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(anchorClicks[0]!.download).toBe("Q3 review.pptx")

    cleanup()
    anchorClicks.length = 0
    const Draft = makeCard()
    render(<Draft block={blockWith({ ...bundleOf([page(1)], "Q3 review.PPTX"), draft: true }, "abc124")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(anchorClicks[0]!.download).toBe("Q3 review-draft.pptx")
  })

  it("fetches the pptx route and hands the browser a real .pptx", async () => {
    fetchMock.mockResolvedValue(routeAnswer({ status: 200 }))
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), "abc123")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))

    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/abc123/pptx")
    expect(anchorClicks[0]!.download).toBe("Quarterly deck.pptx")
    expect(anchorClicks[0]!.href).toContain("blob:deck")
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it("says the deck is gone instead of saving the error body as a file", async () => {
    // The real incident: a bare <a download> on a dead id saved the 404 JSON
    // and called it `pptx.json`.
    fetchMock.mockResolvedValue(routeAnswer({ status: 404, blob: notADeck() }))
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), "missing")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))

    expect(await screen.findByText("Unavailable")).toBeInTheDocument()
    expect(anchorClicks).toEqual([])
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it("offers a retry after a failure that was not about the deck, rather than retiring itself", async () => {
    // The bug: every failed download latched this button to "expired", so one
    // 502 from a restarting harness — or a request that never left the tab —
    // disabled the export of a deck sitting on disk the whole time, for the
    // life of the page. Collapse `verdictOf` back to `!res.ok` and this goes
    // red on the first assertion.
    for (const failure of [
      { name: "5xx", mock: () => fetchMock.mockResolvedValue(routeAnswer({ status: 502 })) },
      { name: "rejected fetch", mock: () => fetchMock.mockRejectedValue(new Error("offline")) },
    ]) {
      fetchMock.mockReset()
      failure.mock()
      const Card = makeCard()
      const view = render(<Card block={blockWith(bundleOf([page(1)]), "abc")} />)

      fireEvent.click(await screen.findByText("Download .pptx"))
      expect(await screen.findByText("Retry download"), failure.name).toBeInTheDocument()
      expect(anchorClicks).toEqual([])
      // Still a button, and still wired: the whole point of not calling this
      // gone is that clicking again is the obvious next move.
      const attempts = fetchMock.mock.calls.length
      fetchMock.mockResolvedValue(routeAnswer({ status: 200 }))
      fireEvent.click(screen.getByText("Retry download"))
      expect(fetchMock.mock.calls.length, failure.name).toBe(attempts + 1)
      await waitFor(() => expect(anchorClicks).toHaveLength(1))
      expect(await screen.findByText("Download .pptx"), failure.name).toBeInTheDocument()

      anchorClicks.length = 0
      view.unmount()
    }
  })

  it("refuses to save a 200 whose body is not a deck", async () => {
    // The `pptx.json` incident, in its second form. The first version saved a
    // 404 body because it never looked at the status; this checks the status
    // and would still have saved a login page, a proxy notice or an error
    // document served with 200 — the failure mode a captive portal or a
    // misrouted request produces. A .pptx is a zip, so its first four bytes are
    // the claim worth checking. Drop `isZip` and this goes red by handing the
    // user an HTML file named `Quarterly deck.pptx`.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200, blob: notADeck() }))
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), "abc123")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))

    expect(await screen.findByText("Retry download")).toBeInTheDocument()
    expect(anchorClicks).toEqual([])
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    // Not `gone` either: the route answered 200, so it has said nothing about
    // the deck being missing, and the next click is allowed to try again.
    expect(screen.queryByText("gone")).toBeNull()
  })

  it("recognises the bytes of a real export", async () => {
    // The other half, so the check above cannot pass by rejecting everything.
    const helpers = clientTesting()
    expect(await helpers.isZip(pptxBytes())).toBe(true)
    expect(await helpers.isZip(notADeck())).toBe(false)
    expect(await helpers.isZip(new Blob([new Uint8Array([0x50, 0x4b])]))).toBe(false)
    expect(await helpers.isZip(undefined as unknown as Blob)).toBe(false)
  })

  it("is absent when the result carries no preview id", () => {
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), null)} />)
    expect(screen.queryByText("Download .pptx")).toBeNull()
  })

  it("says Unavailable before the click, once the card already knows", async () => {
    // Offering `Download .pptx` for a deck the card has just been told is
    // gone is an invitation to a failure it can already predict. The label is
    // the same word the button reaches on its own after a failed click, so
    // the two ways of learning it do not read as two different states.
    fetchMock.mockResolvedValue(routeAnswer({ status: 410 }))
    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))

    expect(await screen.findByText("Unavailable")).toBeInTheDocument()
    expect(screen.queryByText("Download .pptx")).toBeNull()
    // And clicking it starts nothing: the route already gave its answer.
    const calls = fetchMock.mock.calls.length
    fireEvent.click(screen.getByText("Unavailable"))
    expect(fetchMock.mock.calls).toHaveLength(calls)
  })
})

describe("dsh preview card — fetching by id (Code Mode)", () => {
  function respondWith(bundles: Record<string, Bundle>) {
    fetchMock.mockImplementation(async (url: string) => {
      const id = /\/pptwise\/preview\/([^/]+)$/.exec(url)?.[1]
      const found = id ? bundles[id] : undefined
      if (!found) return routeAnswer({ status: 404 })
      return routeAnswer({ status: 200, json: JSON.parse(JSON.stringify(found)) })
    })
  }

  it("pulls the bundle from the plugin route when the block has no structured payload", async () => {
    respondWith({ A: bundleOf([page(1), beyondStrip(2)], "Deck A") })
    const Card = makeCard()
    render(<Card block={blockWith(null, "A")} />)

    expect(await screen.findByText("Deck A")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/A")
    expect(screen.getByText("2 pages")).toBeInTheDocument()
  })

  it("draws a top-level call's deck from the route too, since its meta carries only the id", async () => {
    // The host half's `presentationMeta` is now `{ card, previewId }`: the
    // bundle left the tool's value so it stops reaching the model under Code
    // Mode, and meta is projected from that value. A native-mode card must
    // still draw, and it does it the Code Mode way.
    respondWith({ A: bundleOf([page(1), page(2)], "Deck A") })
    const Card = makeCard()
    const block = {
      content: [{ text: "pptwise-preview:A · rendered 2 pages to /tmp/out" }],
      meta: { card: "pptwise-preview", previewId: "A" },
    }
    const { container } = render(<Card block={block} />)

    expect(await screen.findByText("Deck A")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/A")
    expect(container.querySelectorAll("svg")).toHaveLength(2)
  })

  it("re-fetches and stops showing the old deck when the same instance moves to another preview", async () => {
    respondWith({ A: bundleOf([page(1)], "Deck A"), B: bundleOf([page(1), page(2)], "Deck B") })
    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(null, "A")} />)
    expect(await screen.findByText("Deck A")).toBeInTheDocument()

    rerender(<Card block={blockWith(null, "B")} />)

    // Caching on "have I fetched anything yet" left the card pinned to A.
    expect(await screen.findByText("Deck B")).toBeInTheDocument()
    expect(screen.queryByText("Deck A")).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/B")
  })

  it("says the preview expired when the route 404s, instead of vanishing", async () => {
    // The reported failure, in one test. A transcript reopened after the
    // harness has forgotten the id used to render exactly nothing: no strip,
    // no buttons, no line of text — the tool call looked like it had never
    // produced anything. Under Code Mode the bundle is not in the session log
    // and cannot be recovered, so the honest answer is not a deck: it is the
    // fact that there was one, how long it was, and why it will not open.
    respondWith({})
    const Card = makeCard()
    render(<Card block={blockWith(null, "missing", { pages: 9 })} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/missing"))
    expect(await screen.findByText("gone")).toBeInTheDocument()
    expect(screen.getByText("9 pages")).toBeInTheDocument()
    expect(screen.getByText(/no longer on disk/)).toBeInTheDocument()
    // Nothing that promises a deck it cannot show.
    expect(screen.queryByText("Preview")).toBeNull()
  })

  it("reads the page count out of the summary the host half actually writes", async () => {
    // The degraded card's one fact comes from prose, so the prose is pinned:
    // this is `modelSummary`'s real output, not a hand-written lookalike, and
    // rewording it in preview-tool.js turns this red.
    const summary = (await loadHostHalf()).modelSummary({
      previewId: "S1",
      pageCount: 9,
      outDir: "/tmp/out",
      findingCount: 0,
      audited: true,
    })

    respondWith({})
    const Card = makeCard()
    render(<Card block={{ content: [{ text: summary }] }} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/S1"))
    expect(await screen.findByText("9 pages")).toBeInTheDocument()
  })

  it("does not carry one deck's expiry over to the next one it renders", async () => {
    // The same React instance is reused as the block it renders changes. A
    // verdict remembered without the id it was about would expire a live deck
    // on the strength of a dead one that happened to render here first — and
    // it shows in the gap, so the gap is what this test holds open: B's
    // answer is withheld until after the assertions that matter.
    let answerB = (_value: unknown) => {}
    const pendingB = new Promise((resolve) => {
      answerB = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/B") ? pendingB : routeAnswer({ status: 404 }),
    )
    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(null, "A", { pages: 4 })} />)
    expect(await screen.findByText("gone")).toBeInTheDocument()

    rerender(<Card block={blockWith(null, "B", { pages: 2 })} />)

    // B has been asked and has not answered. Until it does, this card knows
    // nothing about B — least of all that it has expired.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/B"))
    expect(screen.queryByText("gone")).toBeNull()
    expect(container).toBeEmptyDOMElement()

    answerB(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)], "Deck B") }))

    expect(await screen.findByText("Deck B")).toBeInTheDocument()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.getByText("Preview")).toBeInTheDocument()
  })

  it("still admits the deck existed when the summary carried no page count", async () => {
    // A result text this card cannot mine for a page count is no reason to
    // pretend the call never happened — the id in it is proof enough.
    respondWith({})
    const Card = makeCard()
    render(<Card block={blockWith(null, "missing")} />)

    expect(await screen.findByText("gone")).toBeInTheDocument()
    expect(screen.queryByText(/\d+ pages/)).toBeNull()
  })

  it("keeps a 410 apart from a harness it could not reach at all", async () => {
    // A 410 is the route answering: the deck survived only in part. A rejected
    // fetch is no answer at all — the harness may simply not be up yet — and
    // reporting that as a missing deck would leave a wrong verdict on screen
    // long after its cause passed.
    fetchMock.mockResolvedValue(routeAnswer({ status: 410 }))
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 3 })} />)
    expect(await screen.findByText("gone")).toBeInTheDocument()
  })

  it("does not retire a deck because one request came back 5xx", async () => {
    // The bug, at the level a person sees it. A 502 from a harness that is
    // restarting says nothing about the deck, and this card used to answer it
    // with a `gone` badge over files that were on disk the whole time —
    // permanently, because nothing ever re-asked. Widen the check back to
    // `!r.ok` and this goes red on the badge.
    for (const status of [500, 502, 503]) {
      fetchMock.mockReset()
      fetchMock.mockResolvedValue(routeAnswer({ status }))
      const Card = makeCard()
      const view = render(<Card block={blockWith(null, "A", { pages: 3 })} />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/A"))
      expect(await screen.findByText("Retry"), String(status)).toBeInTheDocument()
      expect(screen.queryByText("gone"), String(status)).toBeNull()
      expect(screen.queryByText(/no longer on disk/), String(status)).toBeNull()
      // ...and the deck is not silently forgotten either: the transcript still
      // says how long it was, and the row says what to do about it.
      expect(screen.getByText("3 pages"), String(status)).toBeInTheDocument()
      view.unmount()
    }
  })

  it("offers a retry that actually retries, rather than only calling itself retryable", async () => {
    // The gap this closes: the card recorded a 5xx as `unreachable` — correct —
    // and then rendered nothing at all, so "retryable" was a property of an
    // internal variable and not of anything a person could do. The effect will
    // not re-run on its own, so with no button the only way back was reloading
    // the whole page.
    fetchMock.mockResolvedValue(routeAnswer({ status: 503 }))
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 3 })} />)

    const retry = await screen.findByText("Retry")
    expect(retry).toHaveAttribute("title", expect.stringMatching(/try again/i))
    const before = fetchMock.mock.calls.length

    // The harness comes back between the two clicks, which is the whole
    // scenario: nothing about the deck ever changed.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200, json: bundleOf([page(1), page(2), page(3)], "Deck A") }))
    fireEvent.click(retry)

    expect(await screen.findByText("Deck A")).toBeInTheDocument()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(before)
    expect(screen.getByText("Preview")).toBeInTheDocument()
    expect(screen.queryByText("Retry")).toBeNull()
  })

  it("says refused rather than unreachable when the route answered and said no", async () => {
    // 401/403 are the route answering. Offering "try again" for a closed door
    // is a button that cannot work, so the sentence has to be different even
    // though the deck's standing is untouched in both cases.
    fetchMock.mockResolvedValue(routeAnswer({ status: 403 }))
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 3 })} />)

    expect(await screen.findByText(/refused this request/)).toBeInTheDocument()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
  })

  it("keeps quiet when a 404 could have come from anywhere but this route", async () => {
    // An unstamped 404 is the shape of a plugin whose route never registered,
    // or a proxy answering first. The card must not read a verdict off it — and
    // must not invent a missing deck out of a response that was never about one.
    fetchMock.mockResolvedValue(routeAnswer({ status: 404, stamped: false }))
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 3 })} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/A"))
    expect(await screen.findByText("Retry")).toBeInTheDocument()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
    // Treated as "could not reach it", which is the honest reading and leaves
    // a way forward.
  })

  it("still opens a deck it already has when a later request comes back 5xx", async () => {
    // The half of "retryable" that has an affordance. The strip is already in
    // the browser, so a 502 on the pre-open check must leave the Open button
    // and the thumbnails alive — otherwise one bad response takes away the
    // only way to try again.
    const pages = [page(1, "cover"), page(2), page(3)]
    fetchMock.mockResolvedValue(routeAnswer({ status: 503 }))
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf(pages), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})
    expect(viewer(container)).toBeNull()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.getByText("Preview")).toBeInTheDocument()
    expect(thumbnails(container)).toHaveLength(3)

    // ...and the retry the card left available actually works.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200, json: bundleOf(pages) }))
    fireEvent.click(await screen.findByText("Preview"))
    await waitFor(() => expect(viewer(container)).not.toBeNull())
  })

  it("survives a fetch that rejects, and offers the same way out", async () => {
    // A rejected promise, not a non-ok response: the harness restarting
    // mid-render, or the route not registered at all. Without its own catch
    // this is an unhandled rejection inside an effect, and the export
    // button's catch is a different function that never sees it.
    // Listened for on `process`, not on `window`: the promise is a native one
    // created by this file, so jsdom's own event never fires for it and a
    // window listener would sit there proving nothing. Remove the `.catch` in
    // the effect and this goes red.
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on("unhandledRejection", onRejection)
    try {
      fetchMock.mockRejectedValue(new Error("connection refused"))
      const Card = makeCard()
      render(<Card block={blockWith(null, "A")} />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/A"))
      // Two turns: `unhandledRejection` is only decided once the microtask
      // queue has drained and nobody has attached a handler.
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      expect(rejections).toEqual([])
      // A request that never landed says nothing about the deck, so the card
      // claims nothing about it — and still leaves a button.
      expect(screen.queryByText("gone")).toBeNull()
      expect(await screen.findByText("Retry")).toBeInTheDocument()
    } finally {
      process.off("unhandledRejection", onRejection)
    }
  })

  it("does not keep asking after a failure it cannot recover from", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"))
    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(null, "A")} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    rerender(<Card block={blockWith(null, "A")} />)
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("dsh preview card — a deck with unfilled pages", () => {
  function draftBundle(): Bundle {
    return { ...bundleOf([page(1), page(2)]), draft: true }
  }

  it("says so on the card, because the export goes out anyway", () => {
    // The host half renders these with `--draft` rather than letting the
    // download button fail forever (see preview-tool.js's `execute`). That
    // trade only holds while the card admits the deck is unfinished.
    const Card = makeCard()
    render(<Card block={blockWith(draftBundle(), "abc")} />)
    expect(screen.getByText("draft")).toBeInTheDocument()
  })

  it("says how many pages are written so far, build by build", () => {
    const Card = makeCard({ key: "pptwise_build" })
    const pages = [page(1, "cover"), { ...page(2), placeholder: true }, { ...page(3), placeholder: true }]
    const { container } = render(<Card block={blockWith({ ...bundleOf(pages), draft: true }, "abc")} />)
    expect(container.querySelector("[data-written]")!.textContent).toBe("1 of 3 pages written")
  })

  it("keeps quiet about drafts on a finished deck", () => {
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1)]), "abc")} />)
    expect(screen.queryByText("draft")).toBeNull()
    expect(container.querySelector("[data-written]")).toBeNull()
  })

  it("saves the file under a name that says draft too", async () => {
    // The card is a conversation the file will outlive: it gets mailed and
    // opened by people who never saw the badge.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200 }))
    const Card = makeCard()
    render(<Card block={blockWith(draftBundle(), "abc123")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))

    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(anchorClicks[0]!.download).toBe("Quarterly deck-draft.pptx")
  })
})

describe("dsh preview card — a preview whose bookkeeping is damaged", () => {
  /**
   * Every assertion below is about what a person reads on screen.
   *
   * The previous round shipped a server-side `PreviewDamaged`, its own message
   * and its own tests — and all of those tests asserted JSON. None of them
   * drove this card, so the distinction never reached a user: the card mapped
   * every 410 to `gone` and told people their deck had been deleted. Asserting
   * an internal value and calling the behaviour verified is the mistake this
   * suite exists to stop making.
   */
  const damaged = () => routeAnswer({ status: 410, code: "preview_damaged" })

  it("never tells the user a damaged preview was deleted", async () => {
    fetchMock.mockResolvedValue(damaged())
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 9 })} />)

    expect(await screen.findByText("damaged")).toBeInTheDocument()
    // The three phrasings that would all be false here.
    expect(screen.queryByText(/deleted/)).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
    expect(screen.queryByText("gone")).toBeNull()
    // ...and what it says instead is the true thing, plus the page count the
    // transcript still carries.
    expect(screen.getByText(/present but unreadable/)).toBeInTheDocument()
    expect(screen.getByText("9 pages")).toBeInTheDocument()
  })

  it("keeps the thumbnails it already has, because the deck really was rendered", async () => {
    // Damaged bookkeeping is not a missing deck. The strip is already in the
    // browser and it is the deck, so throwing it away would destroy the one
    // thing that still works to make a point about a file the user cannot see.
    fetchMock.mockResolvedValue(damaged())
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1), page(2), page(3)]), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))

    expect(await screen.findByText("damaged")).toBeInTheDocument()
    expect(container.querySelectorAll("svg")).toHaveLength(3)
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
  })

  it("stops pretending the same request will work next time", async () => {
    fetchMock.mockResolvedValue(damaged())
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))
    await screen.findByText("damaged")

    // No viewer, no way back into one, and no Retry: nothing about clicking
    // again would change what the route reads off the disk.
    expect(viewer(container)).toBeNull()
    expect(screen.queryByText("Preview")).toBeNull()
    expect(screen.queryByText("Retry")).toBeNull()
    expect(thumbnails(container)).toHaveLength(0)
    // The export says which kind of unavailable, not the generic one.
    expect(screen.getByText("Damaged")).toBeInTheDocument()
    expect(screen.queryByText("Unavailable")).toBeNull()
  })
})

describe("dsh preview card — a route that refuses", () => {
  /**
   * `refused` used to exist as a name and nothing else: `isRetryable` said it
   * was not retryable and no rendering path ever called `isRetryable`. So the
   * card offered a Retry button on a 403, the viewer swallowed one silently,
   * and the download reported it as a network problem. Three behaviours for
   * one verdict, none of them the one that was designed.
   */
  const refused = () => routeAnswer({ status: 403 })

  it("offers no retry it cannot honour, when there is no deck in hand", async () => {
    fetchMock.mockResolvedValue(refused())
    const Card = makeCard()
    render(<Card block={blockWith(null, "A", { pages: 3 })} />)

    expect(await screen.findByText(/refused this request/)).toBeInTheDocument()
    expect(screen.getByText("refused")).toBeInTheDocument()
    // The button that would send the identical request to the same closed door.
    expect(screen.queryByText("Retry")).toBeNull()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
  })

  it("says so when the viewer is refused, instead of doing nothing visible", async () => {
    // The click that used to be swallowed whole: the modal did not open, the
    // card said nothing, the button stayed, and the only feedback available was
    // clicking it again.
    fetchMock.mockResolvedValue(refused())
    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))

    expect(await screen.findByText("refused")).toBeInTheDocument()
    expect(screen.getByText(/refused this request/)).toBeInTheDocument()
    expect(viewer(container)).toBeNull()
    // The deck stays on screen; the promise that clicking leads anywhere does not.
    expect(container.querySelectorAll("svg")).toHaveLength(2)
    expect(screen.queryByText("Preview")).toBeNull()
    expect(screen.queryByText("Retry")).toBeNull()
  })

  it("calls a refused download refused, not a network problem", async () => {
    for (const status of [401, 403]) {
      fetchMock.mockReset()
      fetchMock.mockResolvedValue(routeAnswer({ status }))
      const Card = makeCard()
      const view = render(<Card block={blockWith(bundleOf([page(1)]), "abc")} />)

      fireEvent.click(await screen.findByText("Download .pptx"))

      expect(await screen.findByText("Refused"), String(status)).toBeInTheDocument()
      // The two things it used to say instead: a retry it could not honour, and
      // a sentence blaming the network for a door the route closed on purpose.
      expect(screen.queryByText("Retry download"), String(status)).toBeNull()
      expect(screen.getByText("Refused").title, String(status)).toMatch(/refused this request/)
      expect(anchorClicks).toEqual([])
      view.unmount()
    }
  })
})

describe("dsh preview card — one button, many decks", () => {
  it("does not carry a dead download from one deck onto the next", async () => {
    // Introduced by the verdict model itself: the card keys its bundle and its
    // verdict by preview id, and the export button kept a plain `useState`. One
    // React instance is reused as the block it renders changes, so deck A's
    // 410 latched the button and deck B — a live deck, on disk, with a working
    // export — rendered `Unavailable` for the rest of the session.
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/A/") ? routeAnswer({ status: 410, code: "preview_missing" }) : routeAnswer({ status: 200 }),
    )
    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Unavailable")).toBeInTheDocument()

    rerender(<Card block={blockWith(bundleOf([page(1), page(2)]), "B")} />)

    // B has been asked nothing yet, so the button offers what it always offers.
    expect(await screen.findByText("Download .pptx")).toBeInTheDocument()
    expect(screen.queryByText("Unavailable")).toBeNull()
    // ...and it works, which is the half that says the state really did reset
    // rather than merely being hidden.
    fireEvent.click(await screen.findByText("Download .pptx"))
    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/B/pptx")
  })

  it("does not carry a transient download failure across decks either", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/A/") ? routeAnswer({ status: 502 }) : routeAnswer({ status: 200 }),
    )
    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Retry download")).toBeInTheDocument()

    rerender(<Card block={blockWith(bundleOf([page(1)]), "B")} />)
    expect(await screen.findByText("Download .pptx")).toBeInTheDocument()
    expect(screen.queryByText("Retry download")).toBeNull()
  })
})

describe("dsh preview card — one instance, decks going past", () => {
  /**
   * A card is a long-lived React instance that watches decks scroll by, and
   * every round of this work has broken the same way: a piece of state, or an
   * async write, that could not say which preview it was about. The host's
   * bundle cache, then the export button's status, then the viewer. These tests
   * are about the class, not any one of them.
   */
  it("does not open deck B's viewer because deck A's check came back", async () => {
    // The race, produced rather than asserted about. A's pre-open check is
    // still in flight when the instance moves to B; A then succeeds. The modal
    // used to open on the strength of that success — pointed at B, whose id had
    // never been checked at all. The check that exists to stop the viewer
    // walking into a wall was walking it into a different one.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)
    fireEvent.click(await screen.findByText("Preview"))
    // In flight, nothing open yet.
    await act(async () => {})
    expect(viewer(container)).toBeNull()

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    answerA(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)], "Deck A") }))
    await act(async () => {})

    // B is on screen and B was never asked, so nothing may be open.
    expect(screen.getByText("Deck B")).toBeInTheDocument()
    expect(viewer(container)).toBeNull()
    // ...and A's bundle did not overwrite B's either.
    expect(screen.queryByText("Deck A")).toBeNull()
  })

  it("does not let deck A's verdict retire deck B", async () => {
    // The same race with the other outcome: A comes back 410 after the card has
    // moved on. B is live, and must not inherit A's obituary.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await act(async () => {})

    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
    expect(screen.getByText("Preview")).toBeInTheDocument()
  })

  it("closes the viewer when the deck under it changes", async () => {
    // The un-keyed half of the same state. With the modal open on A, moving the
    // instance to B kept it open — and pointed it at B, a deck the user had not
    // asked to see and the card had not checked.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)]) }))
    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)

    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "A", 1)

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    await act(async () => {})
    expect(viewer(container)).toBeNull()
  })

  it("does not carry one deck's start page onto another", async () => {
    // `#page=` lived in unkeyed state too: open A on page 2, switch to B, open
    // B — and B opened on page 2 because that number belonged to nobody.
    fetchMock.mockResolvedValue(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)]) }))
    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)

    fireEvent.click(thumbnails(container)[1]!)
    await viewerOn(container, "A", 2)

    rerender(<Card block={blockWith(bundleOf([page(1), page(2)], "Deck B"), "B")} />)
    await act(async () => {})
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "B", 1)
  })

  it("does not let a stale answer close the viewer the user is looking at", async () => {
    // The consequence that isolates the ownership check on the viewer write,
    // and the reason it is load-bearing rather than decorative. `viewer` is
    // replaced wholesale, not compared and ignored like `checked` and
    // `fetched` — so a late response does not merely fail to open something,
    // it overwrites what is open. A is in flight, the card moves to B, B's
    // viewer opens, and then A lands: without the check A's write replaces the
    // viewer state and B's modal, open in front of the user, disappears.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await viewerOn(container, "B", 1)

    // A finally answers, minutes late and about a deck nobody is looking at.
    answerA(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)], "Deck A") }))
    await act(async () => {})

    expect(viewer(container)).not.toBeNull()
    await viewerOn(container, "B", 1)
  })
})

describe("dsh preview card — the store", () => {
  it("keeps state in one place, checked against the syntax tree rather than the text", async () => {
    // A TRIPWIRE, NOT A PROOF — and the difference is worth stating plainly,
    // because the previous version of this test claimed more than it could do.
    //
    // It was a string match on `useState(`, which `react.useState ('x')`,
    // `const h = react.useState; h()`, `react['useState']()`, `useReducer`, a
    // `useRef` holding deck state, or a direct call to the setter all walk
    // straight past. It went red for the one mutation written to match it,
    // which proved the mutation was killable and nothing else.
    //
    // This version parses the file and asks questions of the tree, which
    // closes some of those holes. It does NOT close all of them, and the ones
    // it misses are worth naming rather than leaving to be discovered:
    //
    //  - `const h = useState` then `h()`  — the callee is `h`, not `useState`
    //  - `react['use' + 'State']()`       — the name is not a literal
    //  - `useSyncExternalStore` or `useRef` reached through an alias
    //  - `useOptimistic` and any hook added to React after this was written
    //  - `const set = store[1]` then `set()` outside `commit`
    //  - passing the setter to a function defined elsewhere
    //  - a mutable object at module scope, or captured in a factory closure
    //
    // The root cause is that this inspects call expressions by their final
    // name; it has no symbol resolution and no data flow. Closing that needs a
    // type-aware lint rule, which is a bigger commitment than this file has
    // earned so far.
    //
    // So: a tripwire for the shapes that have actually gone wrong, not a proof.
    // Its value is that a new bypass has to be invented rather than stumbled
    // into — and that is all it should ever be described as.
    const { readFile } = await import("node:fs/promises")
    const { join } = await import("node:path")
    const ts = await import("typescript")
    const path = join(process.cwd(), "dsh", "client.js")
    const tree = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.ES2020, true)

    /** The nearest named function around a node, for "where is this call?". */
    const enclosingFunction = (node: TsNode): string => {
      for (let at = node.parent; at; at = at.parent) {
        if (ts.isFunctionDeclaration(at) && at.name) return at.name.text
        if (ts.isVariableDeclaration(at.parent ?? at) && ts.isIdentifier((at.parent as never as { name: unknown }).name as never)) {
          return ((at.parent as never as { name: { text: string } }).name).text
        }
      }
      return "<top level>"
    }

    /** Every call in the file, as `{ callee, insideFunction }`. */
    const calls: { callee: string; inside: string }[] = []
    const walk = (node: TsNode): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression
        let name = ""
        if (ts.isIdentifier(callee)) name = callee.text
        else if (ts.isPropertyAccessExpression(callee)) name = callee.name.text
        else if (ts.isElementAccessExpression(callee)) {
          const arg = callee.argumentExpression
          name = ts.isStringLiteral(arg) ? arg.text : `${callee.expression.getText()}[${arg.getText()}]`
        }
        calls.push({ callee: name, inside: enclosingFunction(node) })
      }
      ts.forEachChild(node, walk)
    }
    walk(tree)

    // One state container per card, whatever spelling is used to reach it:
    // the deck card's store, the theme wall's one fetch, the one fetch the
    // newer cards share, and the page the full-screen viewer is on.
    expect(calls.filter((c) => c.callee === "useState").map((c) => c.inside).sort()).toEqual([
      "DeckViewer",
      "DraftDesk",
      "PptwisePreviewCard",
      "PptwiseThemesCard",
      "useRouteBundle",
    ])
    // No second one under another name.
    for (const hook of ["useReducer", "useSyncExternalStore", "useDeferredValue"]) {
      expect(calls.filter((c) => c.callee === hook), hook).toHaveLength(0)
    }
    // `useRef` only where it holds a DOM node. A ref holding deck state is the
    // shape that broke under a discarded render.
    const refs = calls.filter((c) => c.callee === "useRef").map((c) => c.inside)
    expect(refs.sort()).toEqual(["Slide", "useAutoFocus"])
    // `commit` touches one entry and does not survey the store. A capacity rule
    // is the shape that turned an isolated write into a cross-deck effect: a
    // late answer re-inserted its own entry and pushed the deck on screen out,
    // resetting a download that was in progress. Put a budget back in `commit`
    // on its own and no behaviour test can see it, because `maintainStore`
    // prunes to a single entry and a budget of eight is never reached — the
    // mutation has to strip the prune out as well before anything moves (round
    // 8, E1). That is what the assertion below is for: it fails on the half
    // that behaviour cannot reach.
    const commitBody = (() => {
      let found = ""
      const find = (node: TsNode): void => {
        if (ts.isFunctionDeclaration(node) && node.name?.text === "commit") found = node.getText()
        ts.forEachChild(node, find)
      }
      find(tree)
      return found
    })()
    expect(commitBody).not.toBe("")
    for (const survey of ["Object.keys", "while (", "for (", ".length >", "delete next["]) {
      expect(commitBody, survey).not.toContain(survey)
    }

    // The setter is called in exactly two functions, and both are named for the
    // job: `maintainStore` creates and drops entries on commit, `commit`
    // updates the one that exists. A third would be a writer nobody decided on.
    const writes = calls.filter((c) => /^store\[1\]$/.test(c.callee))
    expect(writes.length).toBeGreaterThan(0)
    expect([...new Set(writes.map((w) => w.inside))].sort()).toEqual(["commit", "maintainStore"])
    // And nothing aliases the hook out of `react` to dodge the count above.
    const aliased = tree.getText().match(/=\s*react\s*(\.\s*useState|\[\s*['"]useState['"]\s*\])/g) ?? []
    expect(aliased).toHaveLength(1)
  })

  it("drops a stale answer instead of letting it erase the deck on screen", async () => {
    // The correction to last round's reasoning, and the reason it matters. I
    // argued this guard was defence-in-depth because a stale verdict carries
    // deck A's id and the render compares ids before using it. That is true of
    // *reading* and irrelevant to *writing*: the verdict lives in one slot, so
    // A's late write does not get ignored — it overwrites whatever B had put
    // there. B was settled as `gone`, and A's arrival un-settles it, putting
    // the Open button back on a deck the route has already disowned.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 410, code: "preview_missing" }),
    )

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})

    rerender(<Card block={blockWith(bundleOf([page(1), page(2)], "Deck B"), "B")} />)
    fireEvent.click(await screen.findByText("Preview"))
    expect(await screen.findByText("gone")).toBeInTheDocument()
    expect(screen.queryByText("Preview")).toBeNull()

    // A answers at last, about a deck nobody is looking at.
    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await act(async () => {})

    // B is still settled. Without the check in `commit`, A's write lands in the
    // same slot, B's verdict is erased, and `Open` comes back.
    expect(screen.getByText("gone")).toBeInTheDocument()
    expect(screen.queryByText("Preview")).toBeNull()
  })

  it("does not let a stale download answer cancel the download in progress", async () => {
    // The fourth defect of the class, and the one that arrived in the round
    // whose whole subject was sweeping the class up. A's download is in flight,
    // the card moves to B, B's download starts and the button reads `Saving…` —
    // then A's 410 lands, resets the shared status, and B's button goes back to
    // `Download .pptx` mid-request, inviting a second submission of a download
    // that is already running.
    let answerA = (_value: unknown) => {}
    let answerB = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    const pendingB = new Promise((resolve) => {
      answerB = resolve
    })
    fetchMock.mockImplementation(async (url: string) => (url.includes("/A/") ? pendingA : pendingB))

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    await act(async () => {})

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Saving…")).toBeInTheDocument()

    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await act(async () => {})

    // B is still saving. Its request has not come back and nothing about A can
    // say otherwise.
    expect(screen.getByText("Saving…")).toBeInTheDocument()
    expect(screen.queryByText("Download .pptx")).toBeNull()
    expect(screen.queryByText("Unavailable")).toBeNull()

    answerB(routeAnswer({ status: 200 }))
    await waitFor(() => expect(anchorClicks).toHaveLength(1))
  })
})

describe("dsh preview card — renders that never commit", () => {
  /**
   * The defect this exists for was introduced by the fix for the previous one,
   * which is the fifth time that has happened and the reason the mechanism
   * changed rather than the care taken.
   *
   * Ownership used to be read out of a ref assigned during render. React
   * forbids that, and the reason is exactly this: a render can happen and be
   * thrown away. Under a transition, React renders the next deck to see
   * whether it can show it; if that render suspends, nothing is committed and
   * the previous deck stays on screen. The ref had already moved, so the deck
   * the user was still looking at was locked out of its own state — every
   * answer about it now looked stale and was dropped.
   */
  it("lets the deck on screen finish its own download when the next one never commits", async () => {
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/A/") ? pendingA : routeAnswer({ status: 200 }),
    )

    // A component that suspends for ever: rendering it produces no commit.
    const Never = () => {
      throw new Promise(() => {})
    }
    const Card = makeCard()

    const { rerender } = render(
      <React.Suspense fallback={<div>loading</div>}>
        <Card block={blockWith(bundleOf([page(1)]), "A")} />
      </React.Suspense>,
    )
    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Saving…")).toBeInTheDocument()

    // React starts rendering B and never gets to commit it. On screen, A.
    await act(async () => {
      React.startTransition(() => {
        rerender(
          <React.Suspense fallback={<div>loading</div>}>
            <Card block={blockWith(bundleOf([page(1)]), "B")} />
            <Never />
          </React.Suspense>,
        )
      })
    })

    // A answers. It is the deck that is committed, so its own answer must reach
    // it. With ownership read from a render-time ref, the discarded B render had
    // already claimed the pointer and this stayed `Saving…` for ever.
    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await waitFor(() => {
      expect(screen.queryByText("Saving…")).toBeNull()
      expect(screen.getByText("Unavailable")).toBeInTheDocument()
    })
  })

  it("decides ownership without writing anything during a render", async () => {
    // The property behind the test above, checked against the source so a
    // future fix cannot reintroduce a render-phase mutable write and still
    // pass. React forbids writing `ref.current` during a render, and this file
    // did it anyway — the two surviving refs hold DOM nodes and are assigned by
    // React, never by this code.
    const { readFile } = await import("node:fs/promises")
    const { join } = await import("node:path")
    const source = await readFile(join(process.cwd(), "dsh", "client.js"), "utf8")

    expect(source).not.toMatch(/\.current\s*(\.\s*\w+\s*)?=[^=]/)
  })
})

describe("dsh preview card — decks that have left the screen", () => {
  it("does not let a late answer about a departed deck disturb the one on screen", async () => {
    // The reachable half of the eviction counterexample. A's download is in
    // flight when the card moves to B; B starts its own; A answers late. B must
    // still be saving.
    //
    // Note what this test can and cannot do, because getting that wrong is how
    // three rounds of tests passed against their own mutations. The original
    // counterexample needed nine decks' worth of entries so that a late write
    // could push the current one out of a capacity-bounded store. The store has
    // no capacity now and keeps only the deck on screen, so those entries
    // cannot exist and the scenario is unreachable — the fix removed the
    // precondition, not just the effect. What guards *that* is the structural
    // assertion in "keeps state in one place", which fails if `commit` ever
    // starts iterating or trimming the store again.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    const pendingForever = new Promise(() => {})
    fetchMock.mockImplementation(async (url: string) => (url.includes("/A/") ? pendingA : pendingForever))

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    await act(async () => {})

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Saving…")).toBeInTheDocument()

    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await act(async () => {})

    expect(screen.getByText("Saving…")).toBeInTheDocument()
    expect(screen.queryByText("Download .pptx")).toBeNull()
    expect(screen.queryByText("gone")).toBeNull()
    expect(screen.queryByText("Unavailable")).toBeNull()
  })

  it("ignores a departed deck's answer rather than recreating its state", async () => {
    // The other half of the rule: `commit` never creates an entry. A response
    // that lands while its deck has no entry is genuinely stale, and the place
    // that shows is when the card comes BACK to that deck — with the rule, it
    // asks again; without it, a verdict appears out of a reply the card had
    // already decided not to be listening for.
    //
    // The first version of this test asserted only that the other deck was
    // untouched, which is true either way once eviction is gone. It passed
    // against the mutation, which is the failure mode this suite keeps having
    // to be rescued from: asserting the safe neighbour instead of the effect.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(null, "A", { pages: 4 })} />)
    await act(async () => {})

    rerender(<Card block={blockWith(null, "B", { pages: 2 })} />)
    expect(await screen.findByText("Deck B")).toBeInTheDocument()

    // A answers long after it left the screen, with a whole deck.
    answerA(routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck A as it was") }))
    await act(async () => {})
    expect(screen.getByText("Deck B")).toBeInTheDocument()

    // Now come back to A. The route has moved on since; A must ask it rather
    // than draw a deck assembled from a reply that landed while it had no
    // entry. A bundle is the right thing to check for: a stale *verdict* would
    // be masked by the refetch that follows it, so an earlier version of this
    // test could not see the difference at all.
    const before = fetchMock.mock.calls.length
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck A now") }))
    rerender(<Card block={blockWith(null, "A", { pages: 4 })} />)
    await act(async () => {})

    expect(fetchMock.mock.calls.length).toBeGreaterThan(before)
    expect(await screen.findByText("Deck A now")).toBeInTheDocument()
    expect(screen.queryByText("Deck A as it was")).toBeNull()
  })
})

describe("dsh preview card — an answer that arrives while nothing is on screen", () => {
  it("keeps a reply out of a store that is empty, rather than letting it move in", async () => {
    // The same rule as "ignores a departed deck's answer", through the one
    // sequence where a created entry would survive to be read. `maintainStore`
    // leaves a store alone when it already holds exactly the deck being
    // rendered — so if a late reply is allowed to *create* the entry for A
    // while the card is showing no preview at all, that entry is the only one
    // there, and coming back to A finds it settled and draws it. `commit`
    // refusing to create is the whole of what keeps that reply out.
    //
    // The card being between previews is not exotic: `previewId` is parsed out
    // of the tool's own result text, and the card renders with it null for
    // every block that has not got one.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async () => pendingA)

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(null, "A", { pages: 4 })} />)
    await act(async () => {})

    // A block with no preview in it at all: the store now holds nothing.
    rerender(<Card block={{ content: [{ text: "no preview here" }] }} />)
    await act(async () => {})

    // A answers into that emptiness, with a whole deck.
    answerA(routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck A as it was") }))
    await act(async () => {})

    // Back to A. It has to ask the route, not read a reply it was not listening
    // for by the time it arrived.
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck A now") }))
    rerender(<Card block={blockWith(null, "A", { pages: 4 })} />)

    expect(await screen.findByText("Deck A now")).toBeInTheDocument()
    expect(screen.queryByText("Deck A as it was")).toBeNull()
  })
})

describe("dsh preview card — a deck the card comes back to", () => {
  /**
   * The seventh defect of the class, and the first one about time rather than
   * about which deck.
   *
   * Entries are addressed by preview id, and `commit` refuses to write into an
   * id that has no entry — which retired every late answer from a deck that had
   * left the screen. But leaving is not permanent: a card that goes A → B → A
   * builds a *second* entry under the same id, with none of the first one's
   * bookkeeping. The old A request, still in flight from the first stay, then
   * found an entry under its own id and was applied to it: a viewer the user
   * had asked for minutes ago, opening by itself over a deck they had only just
   * come back to.
   */
  it("does not open a viewer for an Open the user clicked on a previous visit", async () => {
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { container, rerender } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})
    expect(viewer(container)).toBeNull()

    // Away, which drops A's entry…
    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    await act(async () => {})
    // …and back, which builds a new one under the same id.
    rerender(<Card block={blockWith(bundleOf([page(1), page(2)]), "A")} />)
    await act(async () => {})
    expect(viewer(container)).toBeNull()

    // The first stay's request finally answers.
    answerA(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)]) }))
    await act(async () => {})

    // Nothing opened. The user is looking at the deck they came back to, not at
    // a modal they asked for before they left.
    expect(viewer(container)).toBeNull()
    expect(screen.getByText("Preview")).toBeInTheDocument()
  })

  it("does not mark the export unavailable because the previous visit's download failed", async () => {
    // The download lane has the same shape and its own visible damage: come
    // back to a deck that is perfectly fine and find its export already
    // labelled `Unavailable`, on the strength of a request from a visit the
    // user has left behind.
    let answerA = (_value: unknown) => {}
    const pendingA = new Promise((resolve) => {
      answerA = resolve
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/A/") ? pendingA : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    fireEvent.click(await screen.findByText("Download .pptx"))
    expect(await screen.findByText("Saving…")).toBeInTheDocument()

    rerender(<Card block={blockWith(bundleOf([page(1)], "Deck B"), "B")} />)
    await act(async () => {})
    rerender(<Card block={blockWith(bundleOf([page(1)]), "A")} />)
    // A fresh visit: nothing is downloading, so the button offers the download.
    expect(await screen.findByText("Download .pptx")).toBeInTheDocument()

    answerA(routeAnswer({ status: 410, code: "preview_missing" }))
    await act(async () => {})

    expect(screen.getByText("Download .pptx")).toBeInTheDocument()
    expect(screen.queryByText("Unavailable")).toBeNull()
    expect(screen.queryByText(/no longer on disk/)).toBeNull()
  })

  it("draws nothing from the bundle the previous visit was told about", async () => {
    // Code Mode, where the bundle itself arrives by request — and the ordering
    // rule cannot help here, because the stale answer lands *first*. The high
    // water mark it would have been measured against went out with the old
    // entry, so on the second visit there is nothing left to say this reply is
    // older than the one still in flight.
    const answers: ((value: unknown) => void)[] = []
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/A")
        ? new Promise((resolve) => {
            answers.push(resolve)
          })
        : routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck B") }),
    )

    const Card = makeCard()
    const { rerender } = render(<Card block={blockWith(null, "A", { pages: 4 })} />)
    await act(async () => {})
    expect(answers).toHaveLength(1)

    rerender(<Card block={blockWith(null, "B", { pages: 2 })} />)
    expect(await screen.findByText("Deck B")).toBeInTheDocument()

    // Back to A, which asks the route for itself. That request is still out.
    rerender(<Card block={blockWith(null, "A", { pages: 4 })} />)
    await act(async () => {})
    expect(answers).toHaveLength(2)

    // The first visit's request answers, ahead of the one this visit made.
    answers[0]!(routeAnswer({ status: 200, json: bundleOf([page(1)], "Deck A as it was") }))
    await act(async () => {})
    expect(screen.queryByText("Deck A as it was")).toBeNull()

    // This visit's own answer is the one that decides.
    answers[1]!(routeAnswer({ status: 410, code: "preview_missing" }))
    expect(await screen.findByText("gone")).toBeInTheDocument()
    expect(screen.queryByText("Deck A as it was")).toBeNull()
  })
})

describe("dsh preview card — two requests for the same deck", () => {
  it("does not let an older answer overturn a newer one", async () => {
    // Round five called this "two requests for the same preview race each
    // other, last writer wins — intended". It is not: last to *arrive* is not
    // most *recent*, and `alive` after `gone` is not a race, it is time running
    // backwards. The second Open answered 410 and settled the card; the first,
    // older request then answered 200 and un-settled it, reopening the viewer
    // on a deck the route had just disowned.
    const answers: ((value: unknown) => void)[] = []
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          answers.push(resolve)
        }),
    )

    const Card = makeCard()
    const { container } = render(<Card block={blockWith(bundleOf([page(1), page(2)]), "abc")} />)

    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})
    expect(answers).toHaveLength(2)

    // The newer request answers first: this deck is gone.
    answers[1]!(routeAnswer({ status: 410, code: "preview_missing" }))
    expect(await screen.findByText("gone")).toBeInTheDocument()

    // The older one answers afterwards, with news from before that.
    answers[0]!(routeAnswer({ status: 200, json: bundleOf([page(1), page(2)]) }))
    await act(async () => {})

    expect(screen.getByText("gone")).toBeInTheDocument()
    expect(viewer(container)).toBeNull()
    expect(screen.queryByText("Preview")).toBeNull()
  })

  it("keeps the download's ordering separate from the deck's", async () => {
    // Two lanes, because one ticket space would let a slow export make a fresh
    // verdict look stale, or a fresh verdict discard the export's own outcome.
    const deckAnswers: ((value: unknown) => void)[] = []
    const downloadAnswers: ((value: unknown) => void)[] = []
    fetchMock.mockImplementation(
      (url: string) =>
        new Promise((resolve) => {
          ;(url.endsWith("/pptx") ? downloadAnswers : deckAnswers).push(resolve)
        }),
    )

    const Card = makeCard()
    render(<Card block={blockWith(bundleOf([page(1)]), "abc")} />)

    fireEvent.click(await screen.findByText("Download .pptx"))
    await act(async () => {})
    fireEvent.click(await screen.findByText("Preview"))
    await act(async () => {})

    // The deck answers second but with a later ticket; the download's own
    // outcome, ticketed earlier, must still land in its own lane.
    deckAnswers[0]!(routeAnswer({ status: 200, json: bundleOf([page(1)]) }))
    await act(async () => {})
    downloadAnswers[0]!(routeAnswer({ status: 200 }))
    // Both copies of the button — the card's and the viewer's, which the deck
    // answer opened — are back to offering the download rather than stuck on
    // `Saving…` because a newer deck ticket discarded the export's outcome.
    await waitFor(() => {
      expect(anchorClicks).toHaveLength(1)
      expect(screen.getAllByText("Download .pptx").length).toBeGreaterThan(0)
      expect(screen.queryByText("Saving…")).toBeNull()
    })
  })
})

describe("dsh build card", () => {
  it("shows a build that needs revision without offering a .pptx it never wrote", async () => {
    const Card = makeCard({ key: "pptwise_build" })
    const bundle = { ...bundleOf([page(1, "cover"), page(2)], "weekly"), exportable: false }
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundle }))
    const block = {
      content: [{ text: "pptwise-preview:bbb · rendered 2 pages · needs revision: 1 problem, no .pptx written\n- page 2 (why) pages/why.json: too many (validate)" }],
    }
    const { container } = render(<Card block={block} />)

    await waitFor(() => expect(thumbnails(container)).toHaveLength(2))
    expect(screen.getByText("needs revision")).toBeInTheDocument()
    expect(screen.queryByText("Download .pptx")).toBeNull()
    fireEvent.click(screen.getByText("Preview"))
    await waitFor(() => expect(viewer(container)).not.toBeNull())
    // The viewer opens on the drawn pages, still with no download in it.
    expect(screen.queryByText("Download .pptx")).toBeNull()
  })

  it("offers the download for a build that passed", async () => {
    const Card = makeCard({ key: "pptwise_build" })
    const bundle = { ...bundleOf([page(1, "cover")], "weekly"), exportable: true }
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundle }))
    const block = { content: [{ text: "pptwise-preview:ccc · rendered 1 page · build passed: every check is clean" }] }
    const { container } = render(<Card block={block} />)

    await waitFor(() => expect(thumbnails(container)).toHaveLength(1))
    expect(screen.getByText("Download .pptx")).toBeInTheDocument()
    expect(screen.queryByText("needs revision")).toBeNull()
  })
})

describe("dsh theme wall card", () => {
  function wall(ids: string[]) {
    return {
      kind: "themes",
      title: "Q3 review",
      slide: { width: 1280, height: 720 },
      themes: ids.map((id, n) => ({
        id,
        label: id.toUpperCase(),
        pages: [
          { type: "cover", file: `${id}-cover.svg`, svg: `<svg id="c${n}"><rect id="x"/></svg>` },
          { type: "content", kind: "points", file: `${id}-content.svg`, svg: `<svg id="p${n}"/>` },
        ],
      })),
    }
  }
  const block = { content: [{ text: 'pptwise-themes:0123abcd-0000 · drew 3 themes for "Q3 review"' }] }

  it("draws every theme as a column of its cover and content page, fetched by the stamped id", async () => {
    const Card = makeCard({ key: "pptwise_themes" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: wall(["brief", "swiss", "memo"]) }))
    const { container } = render(<Card block={block} />)

    await waitFor(() => expect(thumbnails(container)).toHaveLength(6))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/0123abcd-0000")
    expect(Array.from(container.querySelectorAll("[data-theme]")).map((el) => el.getAttribute("data-theme"))).toEqual([
      "brief",
      "swiss",
      "memo",
    ])
    expect(screen.getByText("3 themes")).toBeInTheDocument()
    // Numbered in the order the result tells the model, so "2" in the
    // question panel is the second column here.
    expect(
      Array.from(container.querySelectorAll("[data-theme]")).map((el) => el.querySelector("[data-theme-number]")?.textContent),
    ).toEqual(["1", "2", "3"])
    // Each mounted page keeps its ids to itself.
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    // No download anywhere: a wall has no deck behind it.
    expect(screen.queryByText("Download .pptx")).toBeNull()
  })

  it("opens the contact sheet full size, still without a download", async () => {
    const Card = makeCard({ key: "pptwise_themes" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: wall(["brief"]) }))
    const { container } = render(<Card block={block} />)

    await waitFor(() => expect(thumbnails(container)).toHaveLength(2))
    fireEvent.click(thumbnails(container)[1]!)
    const wallPane = () => document.querySelector("[data-pptwise-wall]") as HTMLElement | null
    await waitFor(() => expect(wallPane()?.querySelectorAll("[data-theme]")).toHaveLength(1))
    expect(wallPane()).toHaveAttribute("data-pptwise-wall", "0123abcd-0000")
    expect(document.activeElement).toBe(wallPane())
    expect(within(wallPane()!).getByText("1")).toHaveAttribute("data-theme-number", "1")
    expect(screen.queryByText("Download .pptx")).toBeNull()
    fireEvent.click(screen.getByText("Close"))
    await waitFor(() => expect(wallPane()).toBeNull())
  })

  it("says the wall is gone when the route has never heard of it", async () => {
    const Card = makeCard({ key: "pptwise_themes" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 404, code: "preview_unknown" }))
    render(<Card block={block} />)

    await waitFor(() => expect(screen.getByText(/Run pptwise_themes again/)).toBeInTheDocument())
  })

  it("renders nothing for a result with no wall stamp", () => {
    const Card = makeCard({ key: "pptwise_themes" })
    const { container } = render(<Card block={{ content: [{ text: "pptwise theme try failed" }] }} />)
    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("dsh outline card", () => {
  const outline = {
    kind: "outline",
    ok: true,
    theme: "brief",
    title: "周会",
    pageCount: 4,
    pages: [
      { page: 1, id: "cover", type: "cover", heading: "周会" },
      { page: 2, id: "done", type: "content", kind: "points", heading: "本周完成", summary: "三件事" },
      { page: 3, id: "next", type: "content", kind: "points", heading: "下周计划" },
      { page: 4, id: "end", type: "ending", heading: "谢谢" },
    ],
  }
  const block = { content: [{ text: 'pptwise-outline:0123abcd-0001 · 4 pages, theme "brief"' }] }

  it("lists every page as a row, number, page type, heading and what it says, fetched by the stamped id", async () => {
    const Card = makeCard({ key: "pptwise_outline" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: outline }))
    const { container } = render(<Card block={block} />)

    await waitFor(() => expect(container.querySelectorAll("li[data-page]")).toHaveLength(4))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/0123abcd-0001")
    const rows = Array.from(container.querySelectorAll("li[data-page]")).map((li) => li.textContent)
    expect(rows[0]).toBe("1Cover周会")
    expect(rows[1]).toBe("2Content本周完成三件事")
    expect(rows[3]).toBe("4Ending谢谢")
    expect(screen.getByText("4 pages")).toBeInTheDocument()
    expect(screen.getByText("Theme brief")).toBeInTheDocument()
    // Only a list: no viewer and no download, there are no pages yet.
    expect(screen.queryByText("Preview")).toBeNull()
    expect(screen.queryByText("Download .pptx")).toBeNull()
  })

  it("sizes the page type column to its longest label, shared by every row", async () => {
    // A fixed width sized for two Chinese characters let "Content" run into
    // the heading. jsdom does no layout, so this pins the rule that avoids it:
    // the list owns the columns and each row follows them.
    const Card = makeCard({ key: "pptwise_outline" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: outline }))
    const { container } = render(<Card block={block} />)
    await waitFor(() => expect(container.querySelectorAll("li[data-page]")).toHaveLength(4))
    const css = document.querySelector("#pptwise-dsh-style")!.textContent ?? ""
    expect(css).toMatch(/\.pw-rows\{[^}]*grid-template-columns:22px max-content minmax\(0,1fr\)/)
    expect(css).toMatch(/\.pw-row\{[^}]*grid-template-columns:subgrid/)
  })

  it("says the outline is no longer there when the route has never heard of it", async () => {
    const Card = makeCard({ key: "pptwise_outline" })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 404, code: "preview_unknown" }))
    render(<Card block={block} />)
    await waitFor(() => expect(screen.getByText(/no longer in the preview folder/)).toBeInTheDocument())
  })

  it("renders nothing for a result with no outline stamp, such as an invalid spec", () => {
    const Card = makeCard({ key: "pptwise_outline" })
    const { container } = render(<Card block={{ content: [{ text: "the spec is not valid yet: 1 problem" }] }} />)
    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("dsh draft desk — bookkeeping from the session log", () => {
  const turn1 = { kind: "turn", turn: { turn: 1 } }
  function ctxOf(matches: { event: unknown; role: string; location?: unknown }[], state?: unknown) {
    const withLocation = matches.map((m) => ({ location: turn1, ...m }))
    return { key: "k", kind: "pptwise-artifact", id: "c1", matches: withLocation, start: withLocation.find((m) => m.role === "start"), state, current: new Map() }
  }

  it("follows a top-level build from its call to the stamped result", () => {
    const { definition, registeredDefinitions } = makeTail()
    expect(registeredDefinitions).toEqual([definition])
    const call = { type: "tool/call", seq: 10, data: { callId: "c1", name: "pptwise_build", arguments: JSON.stringify({ target: "weekly/" }), turn: 1 } }
    const result = {
      type: "tool/result",
      seq: 11,
      data: { message: { source: { callId: "c1" }, content: [{ type: "text", text: "pptwise-preview:aaaa-1111 · rendered 4 pages" }] }, turn: 1 },
    }
    expect(definition.match(call)).toEqual({ id: "c1", role: "start" })
    expect(definition.match(result)).toEqual({ id: "c1", role: "update" })
    // Results of other tools, and pptwise results without a stamp, are not ours.
    expect(definition.match({ type: "tool/call", data: { callId: "x", name: "bash", arguments: "{}" } })).toBeNull()
    expect(definition.match({ type: "tool/result", data: { message: { source: { callId: "x" }, content: [{ text: "ok" }] } } })).toBeNull()

    const state = definition.start({}, {}, { previous: () => undefined })
    const node = definition.buildViewNode(ctxOf([{ event: call, role: "start" }, { event: result, role: "update" }], state))!
    expect(node.visibility).toBe("hidden")
    expect(node.anchorSeq).toBe(10)
    expect(node.location).toBe(turn1)
    expect(node.data).toEqual({ callId: "c1", tool: "pptwise_build", kind: "deck", id: "aaaa-1111", target: "weekly/", version: 1, priorId: null })
  })

  it("follows a Code Mode sub-call through its dispatch pair, with object arguments", () => {
    const { definition } = makeTail()
    const start = { type: "tool/ptc-dispatch-start", seq: 20, data: { rootCallId: "r", parentCallId: "r", subCallId: "r:ptc:2", name: "pptwise_outline", arguments: { target: "weekly" } } }
    const done = {
      type: "tool/ptc-dispatch",
      seq: 21,
      data: { rootCallId: "r", parentCallId: "r", subCallId: "r:ptc:2", name: "pptwise_outline", arguments: { target: "weekly" }, isError: false, content: [{ type: "text", text: 'pptwise-outline:bbbb-2222 · 4 pages, theme "brief"' }] },
    }
    expect(definition.match(start)).toEqual({ id: "r:ptc:2", role: "start" })
    expect(definition.match(done)).toEqual({ id: "r:ptc:2", role: "update" })
    const node = definition.buildViewNode(ctxOf([{ event: start, role: "start" }, { event: done, role: "update" }], {}))!
    expect(node.data).toMatchObject({ kind: "outline", id: "bbbb-2222", version: 1 })
    // A call that failed stamps nothing and leaves no node.
    expect(definition.buildViewNode(ctxOf([{ event: start, role: "start" }], {}))).toBeNull()
  })

  // A build call and its result, placed in a turn the way DSH places them.
  function build(id: string, target: string, turn: number) {
    const location = { kind: "step", turn: { turn }, step: { turn, step: 1 } }
    return [
      { event: { type: "tool/call", seq: 1, data: { callId: id, name: "pptwise_build", arguments: JSON.stringify({ target }) } }, role: "start", location },
      { event: { type: "tool/result", seq: 2, data: { message: { source: { callId: id }, content: [{ text: `pptwise-preview:${id}-deck` }] } } }, role: "update", location },
    ]
  }

  it("counts versions per deck by turn, and points at the last deck of an earlier turn", () => {
    const { definition, testing } = makeTail()
    expect(testing.deckKey("/ws/weekly/")).toBe("weekly")
    expect(testing.deckKey("weekly/deck.spec.json")).toBe("weekly")
    // Turn 1 builds "weekly", turn 2 builds another deck, turn 3 "weekly" again.
    const s1 = definition.start({}, {}, { previous: () => undefined })
    const s2 = definition.start({}, {}, { previous: () => ({ state: s1, matches: build("one", "weekly", 1) }) })
    const s3 = definition.start({}, {}, { previous: () => ({ state: s2, matches: build("two", "/abs/other", 2) }) })
    const node = definition.buildViewNode(ctxOf(build("three", "/ws/weekly/", 3), s3))!
    expect(node.data).toMatchObject({ id: "three-deck", version: 2, priorId: "one-deck" })
    const s4 = definition.start({}, {}, { previous: () => ({ state: s3, matches: build("three", "weekly", 3) }) })
    const other = definition.buildViewNode(ctxOf(build("four", "other", 4), s4))!
    expect(other.data).toMatchObject({ version: 2, priorId: "two-deck" })
  })

  it("gives every build in one turn that turn's version, so a first turn is version 1 however often it built", () => {
    // What a real turn did: a draft that needed revision, the clean build,
    // then a preview of it. The user was handed one deck, version 1, with
    // nothing earlier to compare it to.
    const { definition } = makeTail()
    const s1 = definition.start({}, {}, { previous: () => undefined })
    const s2 = definition.start({}, {}, { previous: () => ({ state: s1, matches: build("draft", "launch/", 1) }) })
    const s3 = definition.start({}, {}, { previous: () => ({ state: s2, matches: build("clean", "launch/", 1) }) })
    for (const [id, state] of [["draft", s1], ["clean", s2], ["again", s3]] as const) {
      expect(definition.buildViewNode(ctxOf(build(id, "launch/", 1), state))!.data).toMatchObject({ version: 1, priorId: null })
    }
    // The next turn's edit is version 2, compared with what turn 1 ended on,
    // and stays version 2 through its own rebuilds.
    const s4 = definition.start({}, {}, { previous: () => ({ state: s3, matches: build("again", "launch/", 1) }) })
    expect(definition.buildViewNode(ctxOf(build("edit", "launch/", 2), s4))!.data).toMatchObject({ version: 2, priorId: "again-deck" })
    const s5 = definition.start({}, {}, { previous: () => ({ state: s4, matches: build("edit", "launch/", 2) }) })
    expect(definition.buildViewNode(ctxOf(build("edit2", "launch/", 2), s5))!.data).toMatchObject({ version: 2, priorId: "again-deck" })
  })
})

describe("dsh draft desk — the card under the turn", () => {
  function hashed(n: number, hash: string, type = "content") {
    return { ...page(n, type), slideId: "s" + n, hash }
  }
  const entry = (over: Partial<TailEntry> = {}): TailEntry => ({
    callId: "c",
    tool: "pptwise_build",
    kind: "deck",
    id: "new-0001",
    target: "weekly",
    version: 2,
    priorId: "old-0001",
    ...over,
  })

  it("shows the version, page count and the pages changed since the last version, matched by slide id", async () => {
    const { Tail } = makeTail()
    const now = { ...bundleOf([hashed(1, "a", "cover"), hashed(2, "B2"), hashed(4, "d")], "weekly"), exportable: true }
    const before = bundleOf([hashed(1, "a", "cover"), hashed(2, "b"), hashed(3, "c")], "weekly")
    fetchMock.mockImplementation(async (url: string) => routeAnswer({ status: 200, json: url.includes("old-0001") ? before : now }))
    const { container } = render(<Tail turn={{ turn: 1 }} useArtifacts={() => [entry()]} editPage={vi.fn()} />)

    await waitFor(() => expect(container.querySelector("[data-desk-diff]")).not.toBeNull())
    expect(container.querySelector("[data-desk-version]")!.textContent).toBe("Version 2")
    expect(screen.getByText("3 pages")).toBeInTheDocument()
    expect(container.querySelector("[data-desk-diff]")!.textContent).toBe("2 pages changed · 1 pages removed")
    const marks = Array.from(container.querySelectorAll("[data-desk-page]")).map((el) => el.getAttribute("data-desk-mark"))
    expect(marks).toEqual([null, "changed", "added"])
    expect(screen.getByText("Download .pptx")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Compare with last version"))
    const compare = await waitFor(() => {
      const el = document.querySelector("[data-pptwise-compare]")
      if (!el) throw new Error("no compare view")
      return el
    })
    const rows = Array.from(compare.querySelectorAll("[data-compare-row]")).map((el) => el.getAttribute("data-compare-row"))
    expect(rows).toEqual(["changed", "added", "removed"])
    const srcs = Array.from(compare.querySelectorAll("img")).map((img) => img.getAttribute("src"))
    expect(srcs).toEqual([
      "/pptwise/preview/old-0001/page/2",
      "/pptwise/preview/new-0001/page/2",
      "/pptwise/preview/new-0001/page/3",
      "/pptwise/preview/old-0001/page/3",
    ])
    fireEvent.click(screen.getByText("Close"))
    await waitFor(() => expect(document.querySelector("[data-pptwise-compare]")).toBeNull())
  })

  it("marks nothing and offers no comparison on the first version", async () => {
    const { Tail } = makeTail()
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf([hashed(1, "a", "cover"), hashed(2, "b")]) }))
    const { container } = render(<Tail turn={{ turn: 1 }} useArtifacts={() => [entry({ version: 1, priorId: null })]} />)
    await waitFor(() => expect(container.querySelectorAll("[data-desk-page]")).toHaveLength(2))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(container.querySelector("[data-desk-diff]")).toBeNull()
    expect(screen.queryByText("Compare with last version")).toBeNull()
  })

  it("says how many pages are written while some are still placeholders, and has no download for a build that needs revision", async () => {
    const { Tail } = makeTail()
    const pages = [hashed(1, "a", "cover"), { ...hashed(2, "b"), placeholder: true }, hashed(3, "c")]
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: { ...bundleOf(pages), draft: true, exportable: false } }))
    const { container } = render(<Tail turn={{ turn: 1 }} useArtifacts={() => [entry({ version: 1, priorId: null })]} />)
    await waitFor(() => expect(container.querySelector("[data-desk-written]")).not.toBeNull())
    expect(container.querySelector("[data-desk-written]")!.textContent).toBe("2 of 3 pages written")
    expect(screen.getByText("Needs revision, no .pptx yet")).toBeInTheDocument()
    expect(screen.queryByText("Download .pptx")).toBeNull()
  })

  it("draws every page, the ones past the strip from the page route, and opens full screen on the page clicked", async () => {
    const { Tail } = makeTail()
    const pages = Array.from({ length: 14 }, (_, i) => (i < 12 ? hashed(i + 1, "h" + i) : { ...beyondStrip(i + 1), slideId: "s" + (i + 1), hash: "h" + i }))
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf(pages) }))
    const { container } = render(<Tail turn={{ turn: 1 }} useArtifacts={() => [entry({ version: 1, priorId: null })]} />)
    await waitFor(() => expect(container.querySelectorAll("[data-desk-page]")).toHaveLength(14))
    expect(container.querySelector('[data-desk-page="14"] img')!.getAttribute("src")).toBe("/pptwise/preview/new-0001/page/14")
    fireEvent.click(container.querySelector('[data-desk-page="3"] [role="button"]')!)
    await viewerOn(container, "new-0001", 3)
    expect(document.activeElement).toBe(viewer(container))
  })

  it("hands the page number to the composer when the user asks to edit that page", async () => {
    const { Tail } = makeTail()
    const editPage = vi.fn()
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf([hashed(1, "a", "cover"), hashed(2, "b")]) }))
    const { container } = render(<Tail turn={{ turn: 1 }} useArtifacts={() => [entry({ version: 1, priorId: null })]} editPage={editPage} />)
    await waitFor(() => expect(container.querySelector('[data-desk-edit="2"]')).not.toBeNull())
    fireEvent.click(container.querySelector('[data-desk-edit="2"]')!)
    expect(editPage).toHaveBeenCalledWith(2)
  })

  it("prefills the composer with the page and gives it the keyboard, keeping what was typed", () => {
    const calls: string[] = []
    let draft = ""
    const input = {
      state: { getSnapshot: () => ({ draft }) },
      setDraft: (text: string) => { calls.push("set:" + text); draft = text },
      focus: () => calls.push("focus"),
    }
    const conversation = { input: { for: () => input } }
    const kit = makeTail({ conversation })
    kit.inject("s1").editPage(3)
    expect(calls).toEqual(["set:Page 3: ", "focus"])
    draft = "make it shorter  "
    kit.inject("s1").editPage(5)
    expect(calls.slice(2)).toEqual(["set:make it shorter\nPage 5: ", "focus"])
    // The same page again only gives the composer the keyboard back.
    kit.inject("s1").editPage(5)
    expect(calls.slice(4)).toEqual(["focus"])
    draft = "Page 3: "
    kit.inject("s1").editPage(3)
    expect(calls.slice(5)).toEqual(["focus"])
  })

  it("reads this turn's nodes from the chat target, keyed by the turn number", () => {
    const seen: unknown[] = []
    const snapshot = { nodes: { turnDataSource: (turn: number, kind: string) => { seen.push([turn, kind]); return "source" } } }
    const kit = makeTail({ snapshot })
    expect(kit.inject("s1").keyedHooks.artifacts("4")).toBe("source")
    expect(seen).toEqual([[4, "pptwise-artifact"]])
  })

  it("falls back to the turn's outline or theme wall when the turn drew no deck, and to nothing for a turn without pptwise", async () => {
    const { Tail } = makeTail()
    fetchMock.mockImplementation(async () =>
      routeAnswer({ status: 200, json: { kind: "outline", theme: "brief", pages: [{ page: 1, id: "c", type: "cover", heading: "Hi" }] } }),
    )
    const { container } = render(
      <Tail turn={{ turn: 1 }} useArtifacts={() => [entry({ kind: "outline", tool: "pptwise_outline", id: "out-1", version: 1, priorId: null })]} />,
    )
    await waitFor(() => expect(container.querySelectorAll("li[data-page]")).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledWith("/pptwise/preview/out-1")
    cleanup()
    const empty = render(<Tail turn={{ turn: 2 }} useArtifacts={() => []} />)
    expect(empty.container).toBeEmptyDOMElement()
  })
})

describe("dsh full screen — DSH's right sidebar", () => {
  function hashed(n: number, hash: string, type = "content") {
    return { ...page(n, type), slideId: "s" + n, hash }
  }
  const deck = () => bundleOf([hashed(1, "a", "cover"), hashed(2, "b"), hashed(3, "c"), hashed(4, "d"), hashed(5, "e"), hashed(6, "f", "ending")], "weekly")
  const entry: TailEntry = { callId: "c", tool: "pptwise_build", kind: "deck", id: "new-0001", target: "weekly", version: 1, priorId: null }

  /** A tab's live information, the way the sidebar hands it to a body. */
  function tabInfo(address: string, params: { page?: number; version?: number } | undefined, revision: number, close = vi.fn()): TabInfo {
    return { sidebar: { expanded: true, fullscreen: false }, tab: { title: "Slides", navigation: { address, params, revision }, actions: { close } } }
  }

  it("registers a tab type for pptwise addresses, with a body and a title under its id", () => {
    const kit = makeTail({ sidebar: true })
    expect(kit.tabTypes).toHaveLength(1)
    const type = kit.tabTypes[0]!
    expect(type).toMatchObject({ id: "@liustack/pptwise:viewer", kind: "pptwise", patterns: ["dsh-resource://pptwise/**"] })
    expect(type.canOpen("dsh-resource://pptwise/deck/new-0001")).toBe(true)
    expect(type.canOpen("dsh-resource://pptwise/compare/new-0001/old-0001")).toBe(true)
    expect(type.canOpen("dsh-resource://pptwise/deck/../etc")).toBe(false)
    expect(type.title("dsh-resource://pptwise/themes/w-1")).toBe("Themes")
    expect(kit.PaneTab).toBeDefined()
    expect(kit.PaneTitle).toBeDefined()
  })

  it("opens a desk thumbnail in the sidebar on its page, with no layer of the card's own", async () => {
    const kit = makeTail({ sidebar: true })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: deck() }))
    const { container } = render(<kit.Tail turn={{ turn: 1 }} useArtifacts={() => [entry]} />)
    await waitFor(() => expect(container.querySelectorAll("[data-desk-page]")).toHaveLength(6))

    fireEvent.click(container.querySelector('[data-desk-page="4"] [role="button"]')!)
    expect(kit.opened).toEqual([{ address: "dsh-resource://pptwise/deck/new-0001", options: { kind: "pptwise", params: { page: 4 } } }])
    fireEvent.click(screen.getByText("Preview"))
    expect(kit.opened[1]!.options.params).toEqual({ page: 1 })
    await act(async () => {})
    expect(document.querySelector("[data-pptwise-layer]")).toBeNull()
  })

  it("hands the tool card's Open to the sidebar once the route says the deck is there", async () => {
    const kit = makeTail({ sidebar: true })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: deck() }))
    const Card = kit.seats.get("pptwise_build")!
    const { container } = render(<Card block={blockWith(deck(), "new-0001")} />)
    fireEvent.click(thumbnails(container)[2]!)
    await waitFor(() => expect(kit.opened).toHaveLength(1))
    expect(kit.opened[0]).toEqual({ address: "dsh-resource://pptwise/deck/new-0001", options: { kind: "pptwise", params: { page: 3 } } })
    await act(async () => {})
    expect(document.querySelector("[data-pptwise-layer]")).toBeNull()
    // Opening again opens again: the hand-over left nothing behind to block it.
    fireEvent.click(screen.getByText("Preview"))
    await waitFor(() => expect(kit.opened).toHaveLength(2))
    expect(kit.opened[1]!.options.params).toEqual({ page: 1 })
  })

  it("shows the page the tab was opened on, takes the keyboard, and moves when the chat opens another page", async () => {
    const kit = makeTail({ sidebar: true })
    const PaneTab = kit.PaneTab!
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: deck() }))
    const close = vi.fn()
    const address = "dsh-resource://pptwise/deck/new-0001"
    const { container, rerender } = render(<PaneTab useTabInfo={() => tabInfo(address, { page: 4 }, 1, close)} />)
    await viewerOn(container, "new-0001", 4)
    expect(screen.getByText("Page 4 of 6")).toBeInTheDocument()
    expect(document.activeElement).toBe(viewer(container))

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" })
    await viewerOn(container, "new-0001", 5)

    // The user clicks page 2 in the chat while the tab is open: the sidebar
    // reveals the same tab with a new revision and the page it carried.
    document.body.focus()
    rerender(<PaneTab useTabInfo={() => tabInfo(address, { page: 2 }, 2, close)} />)
    await viewerOn(container, "new-0001", 2)
    expect(document.activeElement).toBe(viewer(container))

    // Esc closes the tab through the sidebar, the way its own close does.
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    expect(close).toHaveBeenCalledTimes(1)
    // The tab already has DSH's close button, so the pane draws none of its own.
    expect(screen.queryByText("Close")).toBeNull()
  })

  it("starts a message about the page on screen from inside the tab", async () => {
    const calls: string[] = []
    const input = { state: { getSnapshot: () => ({ draft: "" }) }, setDraft: (text: string) => calls.push("set:" + text), focus: () => calls.push("focus") }
    const kit = makeTail({ sidebar: true, conversation: { input: { for: () => input } } })
    const PaneTab = kit.PaneTab!
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: deck() }))
    const { container } = render(<PaneTab useTabInfo={() => tabInfo("dsh-resource://pptwise/deck/new-0001", { page: 3 }, 1)} />)
    await viewerOn(container, "new-0001", 3)
    fireEvent.click(within(viewer(container)!).getByText("Edit this page"))
    expect(calls).toEqual(["set:Page 3: ", "focus"])
  })

  it("titles the tab with the deck's own title", async () => {
    const kit = makeTail({ sidebar: true })
    const PaneTitle = kit.PaneTitle!
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: deck() }))
    render(<PaneTitle useTabInfo={() => tabInfo("dsh-resource://pptwise/deck/new-0001", undefined, 1)} />)
    expect(await screen.findByText("weekly")).toBeInTheDocument()
  })

  it("opens the comparison in the sidebar too", async () => {
    const kit = makeTail({ sidebar: true })
    const now = bundleOf([hashed(1, "a", "cover"), hashed(2, "B2")], "weekly")
    const before = bundleOf([hashed(1, "a", "cover"), hashed(2, "b")], "weekly")
    fetchMock.mockImplementation(async (url: string) => routeAnswer({ status: 200, json: url.includes("old-0001") ? before : now }))
    render(<kit.Tail turn={{ turn: 1 }} useArtifacts={() => [{ ...entry, version: 2, priorId: "old-0001" }]} />)
    fireEvent.click(await screen.findByText("Compare with last version"))
    expect(kit.opened).toEqual([
      { address: "dsh-resource://pptwise/compare/new-0001/old-0001", options: { kind: "pptwise", params: { version: 2 } } },
    ])
    cleanup()
    const PaneTab = kit.PaneTab!
    render(<PaneTab useTabInfo={() => tabInfo("dsh-resource://pptwise/compare/new-0001/old-0001", { version: 2 }, 1)} />)
    const compare = await waitFor(() => {
      const el = document.querySelector("[data-pptwise-compare]")
      if (!el?.querySelector("[data-compare-row]")) throw new Error("no rows yet")
      return el
    })
    expect(within(compare as HTMLElement).getByText("Version 1 → version 2")).toBeInTheDocument()
    expect(document.activeElement).toBe(compare)
  })
})

describe("dsh cards — DSH's own look", () => {
  function hashed(n: number, hash: string, type = "content") {
    return { ...page(n, type), slideId: "s" + n, hash }
  }
  /** Stand-ins for DSH's primitives that say who drew them. */
  const primitives = {
    Button: ({ variant, size, icon: _icon, children, ...rest }: { variant: string; size: string; icon?: unknown; children?: React.ReactNode }) => (
      <button type="button" data-dsh="Button" data-variant={variant} data-size={size} {...rest}>
        {children}
      </button>
    ),
    Tag: ({ tone, children }: { tone: string; children?: React.ReactNode }) => (
      <span data-dsh="Tag" data-tone={tone}>
        {children}
      </span>
    ),
    FileTypeIcon: ({ kind }: { kind: string }) => <span data-dsh="FileTypeIcon" data-kind={kind} />,
  }
  const entry: TailEntry = { callId: "c", tool: "pptwise_build", kind: "deck", id: "new-0001", target: "weekly", version: 2, priorId: "old-0001" }

  it("draws its buttons, tags and file icon with DSH's own components", async () => {
    const kit = makeTail({ primitives })
    const now = bundleOf([hashed(1, "a", "cover"), hashed(2, "B2"), hashed(3, "c")], "weekly")
    const before = bundleOf([hashed(1, "a", "cover"), hashed(2, "b"), hashed(3, "c")], "weekly")
    fetchMock.mockImplementation(async (url: string) => routeAnswer({ status: 200, json: url.includes("old-0001") ? before : now }))
    const { container } = render(<kit.Tail turn={{ turn: 1 }} useArtifacts={() => [entry]} editPage={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('[data-desk-mark="changed"]')).not.toBeNull())

    for (const label of ["Preview", "Download .pptx", "Compare with last version"]) {
      const button = screen.getByText(label).closest("button")!
      expect(button, label).toHaveAttribute("data-dsh", "Button")
      expect(button, label).toHaveAttribute("data-size", "sm")
    }
    expect(container.querySelector('[data-dsh="FileTypeIcon"]')).toHaveAttribute("data-kind", "ppt")
    expect(screen.getByText("Version 2").closest('[data-dsh="Tag"]')).toHaveAttribute("data-tone", "neutral")
  })

  it("marks a changed page with one tag in its caption, and nothing else there", async () => {
    // The thick outline that used to ring a changed page read as a selection,
    // and the caption carried a button that ran into the next tile.
    const kit = makeTail({ primitives })
    const now = bundleOf([hashed(1, "a", "cover"), hashed(2, "B2"), hashed(3, "c"), hashed(4, "d")], "weekly")
    const before = bundleOf([hashed(1, "a", "cover"), hashed(2, "b"), hashed(3, "c")], "weekly")
    fetchMock.mockImplementation(async (url: string) => routeAnswer({ status: 200, json: url.includes("old-0001") ? before : now }))
    const { container } = render(<kit.Tail turn={{ turn: 1 }} useArtifacts={() => [entry]} editPage={vi.fn()} />)
    await waitFor(() => expect(container.querySelector("[data-desk-diff]")).not.toBeNull())

    // The header says two pages changed, and exactly two tiles carry a tag.
    expect(container.querySelector("[data-desk-diff]")!.textContent).toBe("2 pages changed")
    const tagged = Array.from(container.querySelectorAll("[data-desk-page]")).filter((tile) => tile.querySelector('.pw-cap [data-dsh="Tag"]'))
    expect(tagged.map((tile) => tile.getAttribute("data-desk-page"))).toEqual(["2", "4"])
    expect(container.querySelector('[data-desk-page="2"] .pw-cap [data-dsh="Tag"]')).toHaveAttribute("data-tone", "info")
    expect(container.querySelector('[data-desk-page="4"] .pw-cap [data-dsh="Tag"]')).toHaveAttribute("data-tone", "success")
    for (const tile of Array.from(container.querySelectorAll("[data-desk-page]"))) {
      const caption = tile.querySelector(".pw-cap")!
      // Page number plus at most the tag: no button, no third thing.
      expect(caption.querySelector("button")).toBeNull()
      expect(caption.children.length).toBeLessThanOrEqual(2)
      expect((tile.querySelector(".pw-thumb") as HTMLElement).style.outline).toBe("")
    }
    // "Edit this page" sits over the tile, and only the stylesheet decides when it shows.
    const edit = container.querySelector('[data-desk-edit="2"]')!
    expect(edit.closest(".pw-shot")).not.toBeNull()
    const css = document.querySelector("#pptwise-dsh-style")!.textContent ?? ""
    expect(css).toContain(".pw-shot:hover .pw-edit,.pw-shot:focus-within .pw-edit{opacity:1")
    // A caption can never push past its tile: it clips, it does not wrap.
    expect(css).toMatch(/\.pw-cap\{[^}]*overflow:hidden[^}]*white-space:nowrap/)
  })

  it("draws stand-ins on the same tokens when the shell has no primitives", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const kit = makeTail({ primitives: null })
    fetchMock.mockImplementation(async () => routeAnswer({ status: 200, json: bundleOf([hashed(1, "a", "cover")], "weekly") }))
    render(<kit.Tail turn={{ turn: 1 }} useArtifacts={() => [{ ...entry, version: 1, priorId: null }]} />)
    const open = (await screen.findByText("Preview")).closest("button")!
    expect(open).toHaveClass("pw-btn")
    expect(open).toHaveAttribute("data-variant", "outline")
    expect(warn.mock.calls.some(([line]) => String(line).includes("DSH primitives unavailable"))).toBe(true)
  })
})
