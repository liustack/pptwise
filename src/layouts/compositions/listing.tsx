import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CONSOLE_SPEC, baselineIn, consoleInks, consoleMeta, consoleSmall, consoleText, monoWidth, paintPanel } from "./console"

type Code = Extract<Component, { type: "code" }>

/*
 * listing: a code block as a terminal window, the console setting's way of
 * quoting the exact text. terminal's 2026-10 board, its quotes page (p05),
 * where four postmortems speak in their own words.
 *
 * The window is a well sunk into the page inside the edge ink, under a 36px
 * title bar on the surface that names it (`title`) in mono on the left and its
 * language on the right when it is not plain text. Every line stands on a 33px
 * pitch, its number right-aligned in a gutter in the quiet ink, its words in
 * mono: a comment (a line opening with `#`, `//` or `--`) at 15px in the muted
 * ink, a quoted line (opening with a quotation mark) at 16px in the mark, any
 * other line at 16px in the headline ink, and the lines the author marks
 * (`highlight_lines`) bold in the warning ink. A blank line keeps its number
 * and its pitch.
 *
 * Takes: one `code`, alone on the page, in the console setting.
 *
 * Declines: a line wider than the window, and more lines than the band holds
 * at a 28px pitch.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.mono`.
 */

const BAR = { h: 36, label: { top: 8, box: 20, size: 13 }, padX: 20 } as const
const LINES = { top: 52, pitch: 33, minPitch: 28, box: 30, size: 16, comment: 15, foot: 20 } as const
const GUTTER = { right: 56, text: 76 } as const

type LineKind = "comment" | "quote" | "plain"

function lineKind(line: string): LineKind {
  const lead = line.trimStart()
  if (/^(#|\/\/|--)/u.test(lead)) return "comment"
  if (/^["“'‘「『]/u.test(lead)) return "quote"
  return "plain"
}

/** A language worth naming in the title bar: not plain text. */
function namedLanguage(code: Code): string | null {
  const language = code.language.trim()
  return language && !/^(text|plain|plaintext|txt)$/iu.test(language) ? language : null
}

export const listingComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "console" || components.length !== 1) return null
  const code = components[0]!
  if (code.type !== "code") return null
  const lines = code.code.split("\n")
  const textW = rect.w - GUTTER.text - BAR.padX
  if (lines.some((line) => monoWidth(line, lineKind(line) === "comment" ? LINES.comment : LINES.size) > textW)) return null
  const room = rect.h - LINES.top - LINES.foot
  const pitch = Math.min(LINES.pitch, Math.floor(room / Math.max(1, lines.length)))
  if (pitch < LINES.minPitch) return null
  const inks = consoleInks(ctx)
  const marked = new Set(code.highlight_lines ?? [])
  const title = code.title?.trim()
  const language = namedLanguage(code)
  const label = baselineIn(rect.y + BAR.label.top, BAR.label.box, BAR.label.size)
  if (title && language && monoWidth(title, BAR.label.size) + monoWidth(language, BAR.label.size) + 24 > rect.w - BAR.padX * 2) return null
  if (title && monoWidth(title, BAR.label.size) > rect.w - BAR.padX * 2) return null
  return (
    <g {...compositionTag("listing")} {...blockTag(ctx, code)}>
      {paintPanel(rect, inks.well, inks.edge)}
      <rect x={rect.x + 1} y={rect.y + 1} width={rect.w - 2} height={BAR.h - 2} fill={inks.surface} />
      <rect x={rect.x + 1} y={rect.y + BAR.h - 1} width={rect.w - 2} height={1} fill={inks.edge} />
      {title ? (
        <text {...CONSOLE_SPEC} data-code-title="" x={rect.x + BAR.padX} y={label} fontFamily={ctx.fonts.mono} fontSize={BAR.label.size} fill={consoleText(inks.muted, inks.surface, BAR.label.size)} dominantBaseline="alphabetic">
          {title}
        </text>
      ) : null}
      {language ? (
        <text {...CONSOLE_SPEC} x={rect.x + rect.w - BAR.padX} y={label} textAnchor="end" fontFamily={ctx.fonts.mono} fontSize={BAR.label.size} fill={consoleText(inks.muted, inks.surface, BAR.label.size)} dominantBaseline="alphabetic">
          {language}
        </text>
      ) : null}
      {lines.map((line, i) => {
        const top = rect.y + LINES.top + i * pitch
        const kind = lineKind(line)
        const isMarked = marked.has(i + 1)
        const size = kind === "comment" && !isMarked ? LINES.comment : LINES.size
        const ink = isMarked ? inks.warning : kind === "comment" ? inks.muted : kind === "quote" ? inks.mark : inks.text
        return (
          <g key={i} data-line-kind={isMarked ? "marked" : kind}>
            <text
              {...CONSOLE_SPEC}
              data-gutter="1"
              data-contrast-tier="meta"
              x={rect.x + GUTTER.right}
              y={baselineIn(top, LINES.box, LINES.comment)}
              textAnchor="end"
              fontFamily={ctx.fonts.mono}
              fontSize={LINES.comment}
              fill={consoleMeta(inks.dim, inks.well)}
              dominantBaseline="alphabetic"
            >
              {i + 1}
            </text>
            {line.trim() ? (
              <text
                {...consoleSmall(size)}
                x={rect.x + GUTTER.text}
                y={baselineIn(top, LINES.box, size)}
                fontFamily={ctx.fonts.mono}
                fontSize={size}
                fontWeight={isMarked ? "700" : undefined}
                fill={consoleText(ink, inks.well, size)}
                dominantBaseline="alphabetic"
                xmlSpace="preserve"
              >
                {line}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
