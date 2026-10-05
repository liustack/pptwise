import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"
import { baselineIn, consoleInks, consoleText, fitMono, paintCard, paintIcon, paintMono, toneInk } from "./console"

type Device = Extract<Component, { type: "device_mockup" }>
type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * screen: a browser window beside its log lines, the console setting's way of
 * showing a screen and what it said. terminal's 2026-10 board, its
 * observability page (p14): a monitoring dashboard in a browser, and four
 * lines on who went dark and what the team does about it.
 *
 * The window is a well with rounded corners inside the edge ink, its 34px bar
 * on the surface carrying the address (`url`) in 12px mono, the screenshot
 * filling the rest. Each line beside it is a row on a hairline: its icon, who
 * or when in 13px mono, and what happened at 17px under it, up to two lines.
 * A line with a tone takes the tone's ink for its icon and its name. The line
 * the author highlights sits on the mark's tint inside an edge of it, its
 * icon, name and text in the mark, the text bold.
 *
 * Takes, in the console setting: a `device_mockup` browser, then a `row_cards`
 * of three to five items with no `sub`.
 *
 * Declines: a phone, any other shape, an address, a name or a line past its
 * room, and a band too short for the rows.
 *
 * Reads: the console inks (`./console.tsx`), the images the face hands in,
 * `fonts.body`, `fonts.mono`.
 */

const WINDOW = { top: 4, share: 640 / 1152, h: 420, radius: 8, bar: 34, url: { top: 7, box: 20, size: 12 }, pad: 20, caption: { gap: 10, box: 20, size: 12 } } as const
const LIST = { gap: 24, pitch: 106, h: 96, icon: { top: 22, size: 22, x: 20 }, name: { top: 18, box: 22, size: 13, x: 54 }, text: { top: 44, box: 24, size: 17, maxLines: 2 } } as const

export const screenComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "console" || components.length !== 2) return null
  const [device, rows] = components
  if (device?.type !== "device_mockup" || rows?.type !== "row_cards") return null
  return drawScreen(device, rows, { ctx, rect })
}

function drawScreen(device: Device, list: RowCards, { ctx, rect }: Pick<Parameters<Composition>[0], "ctx" | "rect">) {
  if (device.device !== "browser") return null
  if (list.items.length < 3 || list.items.length > 5 || list.items.some((item) => item.sub?.trim())) return null
  const inks = consoleInks(ctx)
  const w = Math.round(rect.w * WINDOW.share)
  const top = rect.y + WINDOW.top
  const caption = device.caption?.trim() ? fitMono(device.caption, { width: w, size: WINDOW.caption.size, lineHeight: WINDOW.caption.box, maxLines: 1 }) : null
  if (device.caption?.trim() && !caption) return null
  const h = Math.min(WINDOW.h, rect.h - WINDOW.top - (caption ? WINDOW.caption.gap + WINDOW.caption.box : 0))
  const url = device.url?.trim() ? fitMono(device.url, { width: w - WINDOW.pad * 2, size: WINDOW.url.size, lineHeight: WINDOW.url.box, maxLines: 1 }) : null
  if (device.url?.trim() && !url) return null
  const listX = rect.x + w + LIST.gap
  const listW = rect.x + rect.w - listX
  const pitch = Math.min(LIST.pitch, Math.floor((rect.h - WINDOW.top) / list.items.length))
  const rowH = pitch - (LIST.pitch - LIST.h)
  const textW = listW - LIST.name.x - LIST.icon.x
  const rows = list.items.map((item) => {
    const marked = item.highlight === true
    const name = fitMono(item.title, { width: textW, size: LIST.name.size, lineHeight: LIST.name.box, maxLines: 1 })
    const text = item.text?.trim() ? fitFixed(item.text, { width: textW, size: LIST.text.size, lineHeight: LIST.text.box, maxLines: LIST.text.maxLines, fontFamily: ctx.fonts.body, bold: marked }) : null
    return { item, marked, name, text, fits: name !== null && (!item.text?.trim() || text !== null) }
  })
  if (rows.some((r) => !r.fits)) return null
  if (rows.some((r) => LIST.text.top + (r.text?.lines.length ?? 0) * LIST.text.box + 8 > rowH)) return null
  const src = ctx.images?.[device.asset_id]?.src
  const alt = ctx.images?.[device.asset_id]?.alt
  const r = WINDOW.radius
  const x = rect.x
  return (
    <g {...compositionTag("screen")}>
      <g {...blockTag(ctx, device)} data-device-mockup="browser" data-device-frame="console">
        <rect x={x + 0.5} y={top + 0.5} width={w - 1} height={h - 1} rx={r} fill={inks.well} stroke={inks.edge} strokeWidth={1} />
        <path d={`M${x + 1} ${top + WINDOW.bar - 1} V${top + r} A${r - 1} ${r - 1} 0 0 1 ${x + r} ${top + 1} H${x + w - r} A${r - 1} ${r - 1} 0 0 1 ${x + w - 1} ${top + r} V${top + WINDOW.bar - 1} Z`} fill={inks.surface} />
        <rect x={x + 1} y={top + WINDOW.bar - 1} width={w - 2} height={1} fill={inks.edge} />
        {url ? paintMono(url, { ctx, x: x + WINDOW.pad, y: baselineIn(top + WINDOW.url.top, WINDOW.url.box, WINDOW.url.size), fill: consoleText(inks.muted, inks.surface, WINDOW.url.size), ground: inks.surface }) : null}
        {src ? (
          <image href={src} x={x + 1} y={top + WINDOW.bar} width={w - 2} height={h - WINDOW.bar - 1} preserveAspectRatio="xMidYMid slice" aria-label={alt || undefined} />
        ) : (
          <rect x={x + 1} y={top + WINDOW.bar} width={w - 2} height={h - WINDOW.bar - 1} fill={inks.surface} />
        )}
        {caption ? paintMono(caption, { ctx, x, y: baselineIn(top + h + WINDOW.caption.gap, WINDOW.caption.box, WINDOW.caption.size), fill: consoleText(inks.muted, inks.ground, WINDOW.caption.size), ground: inks.ground }) : null}
      </g>
      <g {...blockTag(ctx, list)}>
        {rows.map(({ item, marked, name, text }, i) => {
          const y = top + i * pitch
          const ground = marked ? inks.tint : inks.ground
          const ink = marked ? inks.mark : (toneInk(inks, item.tone) ?? inks.muted)
          return (
            <g key={i} data-line={marked ? "marked" : (item.tone ?? "")}>
              {marked ? paintCard({ x: listX, y, w: listW, h: rowH }, inks, true) : <rect x={listX} y={y + rowH} width={listW} height={1} fill={inks.edge} />}
              {item.icon ? paintIcon(item.icon, listX + LIST.icon.x, y + LIST.icon.top, LIST.icon.size, ink, ground) : null}
              {paintMono(name!, { ctx, x: listX + LIST.name.x, y: baselineIn(y + LIST.name.top, LIST.name.box, LIST.name.size), fill: consoleText(ink, ground, LIST.name.size), ground })}
              {text
                ? paintLines(text, {
                    ctx,
                    x: listX + LIST.name.x,
                    y: baselineIn(y + LIST.text.top, LIST.text.box, LIST.text.size),
                    fill: consoleText(marked ? inks.mark : inks.text, ground, LIST.text.size),
                    fontFamily: ctx.fonts.body,
                    fontWeight: marked ? "700" : "400",
                    bg: ground,
                  })
                : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}
