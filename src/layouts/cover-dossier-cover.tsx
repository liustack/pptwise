import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { paintPhoto } from "./compositions/inset"
import {
  dossierBaseline,
  dossierInks,
  dossierMeta,
  dossierSmall,
  dossierText,
  dossierTrackedWidth,
  dossierWidth,
  heartbeatPoints,
  paintDossier,
  paintDossierLine,
  paintDossierTracked,
} from "./compositions/dossier"
import { fitDossierTitle } from "./dossier-shared"

/**
 * dossier-cover：临床评估档案的封面，clinic 2026-10 定稿（p01）重画。
 *
 * 左栏（x64 到 640）：第一行是汇报部门（deck 的 `meta.organization`，青绿
 * 粗体、字距 2px），后面跟一个间隔点和灰字的副题（`subheading`，比如「提
 * 请药事管理与药物治疗学委员会审议」）。标题 44/60 粗体，放得下就一行，放
 * 不下折两行，中文在逗号处断，底对齐在 y350。标题下一笔心搏线（accent，
 * 2.5px），从 x64 横穿到照片边。心搏线下是页面的 `fields`：议题、依据、日
 * 期，一行一栏，灰色标签、墨色值，行间细线。
 *
 * 右边整幅照片：页面的 `image` 组件，从 x704 铺到页边，上下出血，裁切填满。
 * 照片有说明（`caption`，比如「示意图：…（AI 生成）」）时，说明作一行 12px
 * 灰字落在左栏底部，放不下就截断并标记。没有照片时右边留白。不画 motif：心搏线是封面自己的。零 theme id、零 hex。
 */

const LEFT = 64
const COL_W = 576
const HEAD = { top: 64, size: 14, lineHeight: 22, tracking: 2 } as const
const TITLE = { foot: 350, size: 44, lineHeight: 60, minPt: 32, maxLines: 2 } as const
const BEAT = { y: 410, at: 0.42, stroke: 2.5 } as const
const FIELDS = { top: 470, pitch: 48, label: { top: 12, size: 13, lineHeight: 24 }, valueX: 150, value: { size: 16, lineHeight: 24, w: 490 } } as const
const PHOTO = { x: 704 } as const
const CAPTION = { top: 672, size: 12, lineHeight: 18 } as const
/** The full-width space that sets a field's note off from its value, as the board did. */
const IDEOGRAPHIC_SPACE = "\u3000"

export function DossierCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const org = ir.meta.organization?.trim() ?? ""
  const sub = slide.subheading?.trim() ?? ""
  // The tracked name keeps its spacing after its last character too, as the
  // board's letter-spacing did, then a space, a centred dot and a space.
  const orgW = org ? dossierTrackedWidth(org, HEAD.size, HEAD.tracking, ctx, true) + HEAD.tracking : 0
  const space = dossierWidth(" ", HEAD.size, ctx)
  const dotX = LEFT + orgW + space
  // The dot's advance is taken at half an em, the widest the faces that set it give it.
  const subX = org ? dotX + Math.max(dossierWidth("·", HEAD.size, ctx), HEAD.size / 2) + space : LEFT
  const subLayout = sub
    ? fitEmphasisText(sub, { maxWidth: PHOTO.x - 24 - subX, fontSize: HEAD.size, minPt: HEAD.size, maxLines: 2, lineHeightRatio: HEAD.lineHeight / HEAD.size, fontFamily: ctx.fonts.body, bold: false })
    : null
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, COL_W)
  const titleInk = dossierText(inks.ink, inks.ground, title.fontSize)
  const last = dossierBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const image = slide.components.find((component) => component.type === "image")
  const caption =
    image?.type === "image" && image.caption?.trim()
      ? fitEmphasisText(image.caption, { maxWidth: COL_W, fontSize: CAPTION.size, minPt: CAPTION.size, maxLines: 1, lineHeightRatio: CAPTION.lineHeight / CAPTION.size, fontFamily: ctx.fonts.body, bold: false })
      : null
  const photoX = image ? PHOTO.x : 1280
  const fields = slide.fields ?? []
  const values = fields.map((field) =>
    fitEmphasisText(field.note?.trim() ? `${field.value}${IDEOGRAPHIC_SPACE}${field.note}` : field.value, {
      maxWidth: FIELDS.value.w,
      fontSize: FIELDS.value.size,
      minPt: FIELDS.value.size,
      maxLines: 1,
      lineHeightRatio: FIELDS.value.lineHeight / FIELDS.value.size,
      fontFamily: ctx.fonts.body,
      bold: false,
    }),
  )
  const headBaseline = dossierBaseline(HEAD.top, HEAD.lineHeight, HEAD.size)
  return (
    <>
      {image?.type === "image" ? (
        <g {...blockTag(ctx, image)} data-dossier-cover-photo="">
          {paintPhoto(image, { x: PHOTO.x, y: 0, w: 1280 - PHOTO.x, h: 720 }, ctx)}
          {caption ? paintDossier(caption, { ctx, x: LEFT, top: CAPTION.top, fill: meta, ...(caption.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}) }) : null}
        </g>
      ) : null}
      <g data-dossier-cover-head="">
        {org ? paintDossierTracked({ ctx, text: org, x: LEFT, y: headBaseline, size: HEAD.size, tracking: HEAD.tracking, bold: true, fill: dossierText(inks.mark, inks.ground, HEAD.size) }) : null}
        {org && sub ? paintDossierLine("·", { ctx, x: dotX, top: 0, lineHeight: 0, baseline: headBaseline, size: HEAD.size, fill: meta }) : null}
        {subLayout
          ? renderEmphasisHeading(subLayout, headingEmphasisPaint(ctx, subLayout, { baseFill: meta, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
              <text
                key={i}
                {...dossierSmall(subLayout.fontSize)}
                data-truncated={subLayout.truncated && i === subLayout.lines.length - 1 ? "1" : undefined}
                x={subX}
                y={headBaseline + i * HEAD.lineHeight}
                fontFamily={ctx.fonts.body}
                fontSize={subLayout.fontSize}
                fill={meta}
                dominantBaseline="alphabetic"
              />
            ))
          : null}
      </g>
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <polyline data-dossier-heartbeat="" points={heartbeatPoints(LEFT, BEAT.y, photoX - LEFT, BEAT.at)} fill="none" stroke={inks.accent} strokeWidth={BEAT.stroke} strokeLinejoin="round" strokeLinecap="round" />
      {fields.length > 0 ? (
        <g data-dossier-fields="">
          {fields.map((field, i) => {
            const top = FIELDS.top + i * FIELDS.pitch
            const value = values[i]!
            return (
              <g key={i}>
                <rect x={LEFT} y={top} width={COL_W} height={1} fill={inks.line} />
                {paintDossierLine(field.label, { ctx, x: LEFT, top: top + FIELDS.label.top, lineHeight: FIELDS.label.lineHeight, size: FIELDS.label.size, fill: meta })}
                {paintDossier(value, {
                  ctx,
                  x: LEFT + FIELDS.valueX,
                  top: top + FIELDS.label.top,
                  fill: dossierText(inks.ink, inks.ground, FIELDS.value.size),
                  ...(value.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
                })}
              </g>
            )
          })}
          <rect x={LEFT} y={FIELDS.top + fields.length * FIELDS.pitch} width={COL_W} height={1} fill={inks.line} />
        </g>
      ) : null}
    </>
  )
}

export const layoutDef = {
  // cover-dossier-cover.tsx: clinic's assessment file cover. The submitting
  // office and what it asks for, the title, a heartbeat across, the header
  // lines (subject, evidence, date), a photograph down the right.
  id: "dossier-cover",
  kind: "standard",
  branding: "none",
  story: {
    name: "Dossier Cover",
    story:
      "The submitting office and its request head the page, the title stands bold beneath, and a heartbeat runs across to a full-height photograph. Three ruled lines say what is to be decided, on what evidence, and when.",
    positioning: "Opens a submission a committee will decide on. Choose it when the reader should know at once who is asking, for what, and what the evidence is.",
    audience: "A committee, a board or a reviewer about to read a file before a decision.",
    notFor: "Openings that should build up to a reveal or carry a full-bleed picture behind the title.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["fields"],
  suppressMotif: true,
  coverMark: { x: LEFT, y: 44 },
  headingFit: { maxWidth: COL_W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
