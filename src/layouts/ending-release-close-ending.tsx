import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { asciiDigitsToHan } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * release-close-ending（第八波 pinOnly）：发布即结尾。居中发布句取 heading，
 * 下一行取 contact.website 或 subheading（板上是地址），底句取 org 与 date。
 * 构图抄 `.issues/design-boards/wave8/b4/Stage.dc.html` ending：标题 y330 /
 * 64px，地址 y420 / 24px，底句 y600 / 17px。
 *
 * 进共享池。零 theme id、零 baked hex。不放二维码，不写 Thank you，空
 * heading 不编造「今天，开放下载」。CJK 不加 letter-spacing。渲染不画省略
 * 号。底色走主题 `defaultBackgrounds.ending`，本文件不自绘满版。
 */

const CENTER_X = 640

const TITLE_Y = 330
const TITLE_SIZE = 64
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 960

const ADDRESS_Y = 420
const ADDRESS_SIZE = 24
const ADDRESS_MAX_W = 960
const ADDRESS_MIN_PT = 14

const FOOT_Y = 600
const FOOT_SIZE = 17
const FOOT_MAX_W = 960
const FOOT_MIN_PT = 16

/** Fit 链可能给末字补上省略号。渲染侧砍掉，不画 … 或 ...。 */
function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function addressSource(slide: SvgTemplateProps["slide"], meta: SvgTemplateProps["ir"]["meta"]): string {
  const website = meta.contact?.website?.trim() ?? ""
  if (website) return website
  return stripEmphasis(slide.subheading ?? "").trim()
}

function datePaint(date: string | undefined, cjk: boolean): string | undefined {
  const raw = date?.trim()
  if (!raw) return undefined
  if (cjk && /^\d{4}$/.test(raw)) return asciiDigitsToHan(raw)
  return raw
}

function footSource(meta: SvgTemplateProps["ir"]["meta"], cjk: boolean): string | null {
  const org = meta.organization?.trim()
  const date = datePaint(meta.date, cjk)
  const parts = [org, date].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(" · ") : null
}

export function ReleaseCloseEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const cjk = hasCjk(`${slide.heading ?? ""}${ir.meta.organization ?? ""}`)
  const addressRaw = addressSource(slide, ir.meta)
  const footRaw = footSource(ir.meta, cjk)

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
    bold: true,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)

  const address = addressRaw
    ? fitSvgLine(addressRaw, {
        maxWidth: ADDRESS_MAX_W,
        fontSize: ADDRESS_SIZE,
        minFontSize: ADDRESS_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const addressPaint = address ? cutMarks(address.text) : ""

  const foot = footRaw
    ? fitSvgLine(footRaw, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: FOOT_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const footPaint = foot ? cutMarks(foot.text) : ""

  return (
    <>
      {showTitle &&
        title.lines.map((line, i) => {
          const paint = cutMarks(line)
          if (!paint) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={CENTER_X}
              y={TITLE_Y + i * title.lineHeight}
              textAnchor="middle"
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            >
              {paint}
            </text>
          )
        })}

      {address && addressPaint && (
        <text
          data-truncated={address.truncated ? "1" : undefined}
          x={CENTER_X}
          y={ADDRESS_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={address.fontSize}
          fill={accessibleInk(colors.accent, bg, address.fontSize)}
          dominantBaseline="alphabetic"
        >
          {addressPaint}
        </text>
      )}

      {foot && footPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {footPaint}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-release-close-ending.tsx: pinOnly release close. Centered
  // heading, website or subheading address, org · date foot. No QR, no
  // thank-you. Empty heading invents no 今天，开放下载.
  id: "release-close-ending",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
