/**
 * Where PowerPoint puts a text box's first baseline, so `text.ts` can place
 * the box such that the baseline lands on the SVG `<text>`'s `y`.
 *
 * PowerPoint's model, measured (calibration below): a single-line paragraph
 * at 100% line spacing is 1.2 × font size tall, and the font's Windows
 * vertical extent (`OS/2.usWinAscent` + `usWinDescent`) is stretched over
 * that height, so the baseline sits at
 *
 *     top inset + 1.2 × size × winAscent / (winAscent + winDescent)
 *
 * below the box top. The ratio is a property of the face, not a constant:
 * 0.88 em for Courier New, 0.97 for Georgia, 1.03 for SimSun. The old
 * converter used a flat 0.8 em, so every export sat 0.08 to 0.23 em low
 * (20 px under a 176 px Georgia figure).
 *
 * The metric is `usWin*`, not `hhea` or `sTypo*`: Consolas is the one face
 * here where they disagree (hhea 0.743/0.257, win 0.920/0.251), and the
 * measured 0.945 em matches win (0.943), not hhea (0.891). Line gaps play no
 * part: SimSun's hhea gap is 0.14 em and the measured ratio is the gap-free
 * 1.031.
 *
 * The model only holds when every font in the line is the run's own face.
 * PowerPoint also lays out the paragraph-end mark, and pptxgenjs writes that
 * mark without a typeface, so it fell back to the theme font (Calibri) and
 * dragged every line toward Calibri's ratio. `pptx-paragraph-mark.ts` gives
 * the mark its paragraph's fonts, which is what makes this table predictive.
 *
 * Calibration, 2026-10-02, PowerPoint for Mac (PDF export, rasterized at
 * 288 dpi, baseline read off the foot of an "H" against a rule drawn at the
 * SVG baseline), 16 faces × 6 sizes (16 to 160 px). With the mark fixed, the
 * measured ratio matched this formula within 0.005 em for every face. Latin
 * text only: a CJK character inside a run whose Latin face is not a CJK face
 * draws from the `<a:ea>` face (Microsoft YaHei), which pulls the line a
 * little toward YaHei's own 0.962. That residual is under 0.003 em for
 * Georgia, Times New Roman and Cambria, and reaches 0.03 em for Tahoma and
 * Verdana, which no built-in theme exports. Not modeled.
 *
 * LibreOffice does not follow this model: it put the baseline at about 1.0 em
 * for every face in the same probe, so a LibreOffice render sits 0.03 to
 * 0.12 em off whichever way the export is tuned. PowerPoint is the target.
 *
 * The values are the `OS/2` table of the font files Office ships (Microsoft
 * PowerPoint.app's `DFonts`, macOS's Supplemental fonts for Georgia and
 * Courier New, Office's cloud cache for Segoe UI). The ratio depends only on
 * two integers per face. PowerPoint for Windows has not been probed.
 */

/** `usWinAscent` and `usWinDescent` of one face's regular style, in font units. */
interface WinMetrics {
  readonly ascent: number
  readonly descent: number
}

/** PowerPoint's single-spacing line height, as a multiple of the font size. */
const LINE_HEIGHT_EM = 1.2

function win(ascent: number, descent: number): WinMetrics {
  return { ascent, descent }
}

/** SimSun, SimHei, KaiTi and FangSong share one set of metrics (upm 256). */
const CJK_GB = win(220, 36)

/**
 * Every face `SAFE_FONTS` can export, keyed lower-case, aliases included.
 * Bold styles share their regular's win metrics in every face measured
 * (Georgia Bold, Microsoft YaHei Bold), and PowerPoint measured them the same.
 */
const WIN_METRICS: ReadonlyMap<string, WinMetrics> = new Map([
  ["arial", win(1854, 434)],
  ["calibri", win(1950, 550)],
  ["tahoma", win(2049, 423)],
  ["verdana", win(2059, 430)],
  ["segoe ui", win(2210, 514)],
  ["georgia", win(1878, 449)],
  ["times new roman", win(1825, 443)],
  ["cambria", win(1946, 455)],
  ["consolas", win(1884, 514)],
  ["courier new", win(1705, 615)],
  ["lucida console", win(1616, 432)],
  ["microsoft yahei", win(2167, 536)],
  ["微软雅黑", win(2167, 536)],
  // YaHei's Western cut, the second face of the same msyh.ttc. Its own win
  // metrics (2080, 521) would put the baseline at 0.960 em, but PowerPoint
  // for Mac set it where it sets YaHei's, regular and bold, from 9 to 200 pt
  // (2026-10-07, same rig as above, 0.24 pt PDF resolution), so it takes
  // YaHei's numbers. One size stood apart: at 25.5 pt the cut sat 0.96 pt
  // higher than YaHei, which itself sat 0.5 pt under the formula there.
  ["microsoft yahei ui", win(2167, 536)],
  ["simsun", CJK_GB],
  ["宋体", CJK_GB],
  ["simhei", CJK_GB],
  ["黑体", CJK_GB],
  ["kaiti", CJK_GB],
  ["楷体", CJK_GB],
  ["fangsong", CJK_GB],
  ["仿宋", CJK_GB],
])

/**
 * The face PowerPoint draws when a run names none, or names one it does not
 * have. A run without a typeface takes the theme's minor font, which is
 * Calibri in every deck pptxgenjs writes, and the probe's unknown face
 * ("NoSuchFaceXyz") measured exactly Calibri's ratio. The engine never
 * exports either case (`resolveFontFace` only returns `SAFE_FONTS` members),
 * so this only matters for hand-built SVG.
 */
const FALLBACK_FACE = "calibri"

/** The faces this table covers, for the completeness test against `SAFE_FONTS`. */
export const BASELINE_FACES: ReadonlySet<string> = new Set(WIN_METRICS.keys())

/**
 * The distance from a text box's top to its first baseline in PowerPoint, as
 * a fraction of the line's font size. `face` is the run's `<a:latin>` face.
 */
export function firstBaselineEm(face: string | undefined): number {
  const key = face?.replace(/['"]/g, "").trim().toLowerCase()
  const m = (key && WIN_METRICS.get(key)) || WIN_METRICS.get(FALLBACK_FACE)!
  return (LINE_HEIGHT_EM * m.ascent) / (m.ascent + m.descent)
}

/** PowerPoint's line height for one line at `fontSizePx`, in px. */
export function lineHeightPx(fontSizePx: number): number {
  return LINE_HEIGHT_EM * fontSizePx
}
