import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ThemeDefinition } from "../themes/definitions"
import { FooterRow } from "./footer"
import type { PageRenderContext } from "./page-context"

/**
 * Shared brand fragment as SVG: the brand logo and the content-page footer
 * row, both part of the single-source page and so of the export.
 *
 * The logo follows the deck's `branding` posture. The footer row prints
 * only the marks the deck asked for (`footer`, or the older reading of
 * `branding: "full"`), and only on content pages: see `./footer-marks.ts`
 * for the marks and `./page-context.ts` for which pages carry the row and
 * whether this fragment or the theme's motif draws it.
 */
export function Branding({
  ir,
  slide,
  index,
  ctx,
  page,
  theme,
}: {
  ir: PptxIR
  slide: Slide
  /** This page's 0-based position in the deck, for the page number. */
  index: number
  ctx: ComponentCtx
  page: PageRenderContext
  /** The bound theme, carried by `FullSlideSvg`. */
  theme: ThemeDefinition
}) {
  const { brand, assets } = ir
  // Deck-level logo posture. Omitted = "cover-only": cover and chapter keep
  // the brand logo, content and ending carry none. Menu-level silence is
  // applied by FullSlideSvg before this fragment.
  const posture = page.branding
  if (posture === "none") return null
  const logoOn = !(posture === "cover-only" && (slide.type === "content" || slide.type === "ending"))

  const logo = logoOn && brand?.logo_asset_id ? assets.images[brand.logo_asset_id] : null
  const pos = brand?.position ?? "br"
  const logoBox =
    pos === "tl"
      ? { x: 64, y: 48 }
      : pos === "tr"
        ? { x: 1120, y: 48 }
        : pos === "bl"
          ? { x: 64, y: 630 }
          : { x: 1120, y: 630 }

  return (
    <>
      {logo?.src && !logo.error ? (
        <image
          href={logo.src}
          x={logoBox.x}
          y={logoBox.y}
          width="96"
          height="40"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}

      {/* The rule can be left to the theme (`brand.suppressFooterRule`): a
          theme that draws its own frame would otherwise show two lines
          (ink precedent, 2026-07-10). */}
      {page.footerRow === "branding" && (
        <FooterRow
          footer={page.footer}
          index={index}
          pageCount={ir.slides.length}
          ctx={ctx}
          omitOrganization={page.footerOmitsOrganization}
          rule={!theme.brand.suppressFooterRule}
        />
      )}
    </>
  )
}
