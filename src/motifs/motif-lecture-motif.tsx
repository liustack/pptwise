import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { CHALKBOARD_META, CHALKBOARD_SPEC, chalkBaseline, chalkMeta, chalkTrackedWidth, chalkWidth, chalkboardInks, chalkboardLedge, paintChalkTracked } from "../layouts/compositions/chalkboard"

/**
 * lecture-motif：夜校的黑板，lecture 2026-10 定稿（设计源
 * `design/rounds/2026-10-08-lecture/`）。
 *
 * 四种页型都画，图片页（下课页的教学楼）也在：
 *   - **木框**：x10 y10 1260×700 的 2px 框，深色木头。
 *   - **粉笔槽**：底边 y684 一条 26px 的木槽，上沿 3px 亮一档，槽里一截白粉
 *     笔（x1120）、一截黄粉笔（x1176）、一块板擦（x80，灰底加一条毡面）。
 *   - **槽上的课名**：deck 的 `organization`、`label`、`notice` 和草稿、保密
 *     标记用「 · 」连起来，10px 字距 2px，写在粉笔槽上 x170。
 *   - **右上的课时**：「3 / 18」15px 衬线粉笔灰，右端 x1216，前一个数是
 *     PowerPoint 的页码字段，挪页自己会变，后面是导出时的总页数。deck 要页
 *     码时才印。
 *
 * 木头的颜色由主题的黄粉笔推出来：色相往红偏一点、饱和度剩四成、压到很暗
 * （lecture 的 #E9C46A 推出 #5A4632），槽沿、槽上的字、板擦同一个色相
 * （`chalkboardLedge`）。木框和粉笔槽是黑板本身的结构，标 `structure`。本
 * motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行由它来印，共享页脚
 * 让位。
 *
 * 与 2026-08 的「粉笔槽细框」的关系：那时的 26px 内缩 1px 细框只是一道暗
 * 缝，缩略图里看不出是黑板。定稿把它换成木框加粉笔槽，框退到 10px，一眼
 * 是一块黑板。小字带 `chalkboard-spec` 豁免，课名和课时按 meta 档（3:1）
 * 验。零 theme id、零 hex。
 */

const FRAME = { x: 10, y: 10, w: 1260, h: 700, stroke: 2 } as const
const LEDGE = { y: 684, h: 26, lip: 3 } as const
const CHALK = { white: { x: 1120, y: 690, w: 44, h: 9 }, yellow: { x: 1176, y: 691, w: 30, h: 8 } } as const
const ERASER = { x: 80, y: 692, w: 70, h: 12, felt: 4 } as const
const COURSE = { x: 170, top: 690, size: 10, lineHeight: 16, tracking: 2, w: 900 } as const
const COUNT = { right: 1216, top: 30, size: 15, lineHeight: 24 } as const

/** What the deck asks to have written on the ledge, joined by a middle dot. A cover, a chapter or a close leaves the confidentiality mark to the cover's own mark. */
export function lectureCourse(footer: DeckFooter, content = true): string {
  return [footer.organization, footer.label, footer.notice, footer.draft, content && footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null]
    .map((part) => (part ? stripEmphasis(part).trim() : ""))
    .filter(Boolean)
    .join(" · ")
}

/** Whether this page carries the footer's marks: on a content page the page decision, elsewhere whenever the deck asks for them. */
function drawsMarks({ slide, page }: DecorProps, footer: DeckFooter): boolean {
  if (page && slide.type === "content") return page.footerRow === "motif"
  if (page && !page.metadataOn) return false
  return footerRowWanted(footerRowItems(footer))
}

export function LectureMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index } = props
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const marks = drawsMarks(props, footer)
  const inks = chalkboardInks(ctx)
  const ledge = chalkboardLedge(ctx)
  const course = marks ? lectureCourse(footer, slide.type === "content") : ""
  const courseFits = !course || chalkTrackedWidth(course, COURSE.size, COURSE.tracking, ctx) <= COURSE.w
  const place = (index ?? Math.max(0, ir.slides.indexOf(slide))) + 1
  const total = ` / ${ir.slides.length}`
  const countY = chalkBaseline(COUNT.top, COUNT.lineHeight, COUNT.size, true)
  const countFill = chalkMeta(inks.muted, inks.ground)
  const totalX = COUNT.right - chalkWidth(total, COUNT.size, ctx, { serif: true })
  return (
    <DecorPiece id="board" role="structure">
      <rect data-chalk-frame="" x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="none" stroke={ledge.wood} strokeWidth={FRAME.stroke} />
      <g data-chalk-ledge="">
        <rect x={FRAME.x} y={LEDGE.y} width={FRAME.w} height={LEDGE.h} fill={ledge.wood} />
        <rect x={FRAME.x} y={LEDGE.y} width={FRAME.w} height={LEDGE.lip} fill={ledge.lip} />
        <rect x={CHALK.white.x} y={CHALK.white.y} width={CHALK.white.w} height={CHALK.white.h} rx={3} fill={inks.chalk} fillOpacity={0.92} />
        <rect x={CHALK.yellow.x} y={CHALK.yellow.y} width={CHALK.yellow.w} height={CHALK.yellow.h} rx={3} fill={inks.yellow} fillOpacity={0.9} />
        <rect x={ERASER.x} y={ERASER.y} width={ERASER.w} height={ERASER.h} rx={2} fill={ledge.eraser} />
        <rect x={ERASER.x} y={ERASER.y} width={ERASER.w} height={ERASER.felt} rx={1} fill={ledge.felt} />
      </g>
      <g data-footer={marks ? "row" : undefined}>
        {course && courseFits ? (
          <g data-chalk-course={course}>
            {paintChalkTracked({ ctx, text: course, x: COURSE.x, y: chalkBaseline(COURSE.top, COURSE.lineHeight, COURSE.size), size: COURSE.size, tracking: COURSE.tracking, fill: chalkMeta(ledge.words, ledge.wood), attrs: { ...CHALKBOARD_META } })}
          </g>
        ) : null}
        {course && !courseFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
        {marks && footer.pageNumber ? (
          <g data-chalk-count={`${place}${total}`}>
            <text {...CHALKBOARD_SPEC} {...CHALKBOARD_META} data-field={SLIDE_NUMBER_FIELD} x={totalX} y={countY} textAnchor="end" fontFamily={ctx.fonts.heading} fontSize={COUNT.size} fill={countFill} dominantBaseline="alphabetic">
              {String(place)}
            </text>
            <text {...CHALKBOARD_SPEC} {...CHALKBOARD_META} x={totalX} y={countY} fontFamily={ctx.fonts.heading} fontSize={COUNT.size} fill={countFill} dominantBaseline="alphabetic" xmlSpace="preserve">
              {total}
            </text>
          </g>
        ) : null}
      </g>
    </DecorPiece>
  )
}
