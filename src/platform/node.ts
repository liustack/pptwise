import { createRequire } from "node:module"
import { DOMParser as LinkedomDOMParser } from "linkedom"
import { proxyFetch } from "../cli/proxy-fetch"
import { type DecodedImageSize, findRemoteAssetRef, installPlatform, type RasterizedImage } from "./registry"
import type * as Sharp from "sharp"

/**
 * `true` when `e` looks like Node's own "module not found" shape for a
 * missing optional dependency — split out from `loadSharp` below as its own
 * pure predicate so it's directly unit-testable against synthetic error
 * objects (`node.test.ts`). Simulating a genuinely missing `sharp` package
 * through `vi.mock("sharp", ...)` doesn't work for this: vitest wraps *any*
 * exception a mock factory raises (sync throw or a rejected promise alike)
 * in its own generic "There was an error when mocking a module" message
 * (confirmed empirically while building this test, not assumed) rather than
 * letting `await import("sharp")` observe the original error — so the
 * classification logic is what gets tested directly here, while the
 * surrounding `try { await import(...) }` wiring is exercised for real by
 * every other test in this repo that successfully loads the real, installed
 * `sharp` package through this exact path.
 */
export function isMissingModuleError(e: unknown): boolean {
  const err = e as NodeJS.ErrnoException
  return err?.code === "ERR_MODULE_NOT_FOUND" || /Cannot find/.test(err?.message ?? "")
}

/**
 * Both Sharp-needing paths (this one and `recodeWithSharp` below) hit the
 * exact same "optional dependency not installed" failure mode and must
 * report it the same explicit way — spec §4.3's own requirement ("如果用户
 * 显式传入 --pixels 但 Sharp 不可用，命令必须失败并说明缺失依赖"). Threading
 * a caller-specific sentence through one shared thrower keeps that contract
 * in one place instead of two copies drifting apart.
 */
async function loadSharp(missingDepContext: string): Promise<typeof Sharp.default> {
  try {
    return (await import("sharp")).default as unknown as typeof Sharp.default
  } catch (e) {
    if (isMissingModuleError(e)) {
      throw new Error(`${missingDepContext} requires the optional dependency "sharp" (npm i sharp)`)
    }
    throw e
  }
}

async function recodeWithSharp(dataUrl: string): Promise<string> {
  const sharpMod = await loadSharp("Re-encoding non-PNG/JPEG/GIF images")
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const png = await sharpMod(Buffer.from(base64, "base64")).png().toBuffer()
  return `data:image/png;base64,${png.toString("base64")}`
}

/**
 * Node's `rasterizeSvg` (audit-v2 phase B, spec §4.3/§11.9): Sharp stays the
 * pre-authorized default (already an optional dependency, zero new
 * dependency to add) — the escape clause to `@resvg/resvg-js` only fires if
 * a real render out of this repo's own SVG subset comes back visibly wrong,
 * which `node-rasterize.test.ts`'s probe suite exists to catch. Missing
 * Sharp is an explicit failure (`loadSharp` above), never a silent skip —
 * the pixel audit's own "未检查≠通过" contract extended to a missing
 * platform capability, spec §11.7's "契约层".
 *
 * `findRemoteAssetRef` guards this the same way it guards the browser
 * implementation (`browser.ts`) — see that function's own doc comment for
 * why the guard lives once, shared, rather than trusting every caller to
 * pre-filter: a Sharp/librsvg fetch of a remote `href` would be a real
 * network request from inside `pptwise audit`, which spec §3.1/§7 promise
 * never happens.
 *
 * No explicit `density` — an empirically-verified default (this task's own
 * probe): this renderer's root `<svg>` carries a `viewBox="0 0 1280 720"`
 * with no `width`/`height` attributes, and Sharp/libvips already resolves
 * that to a 1280×720 intrinsic size with no density hint at all (confirmed
 * directly — adding an explicit `density: 96` to match this renderer's own
 * 96-px/in convention (`constants.ts`) actually *overshoots* to 1707×960,
 * since Sharp's default SVG density is 72, not 96, and only applies when a
 * physical unit is present for it to scale). `.resize(width, height, {fit:
 * "fill"})` is kept anyway as a defensive guarantee of the exact requested
 * output size regardless of the source SVG's own sizing, not because it
 * currently changes anything.
 */
async function rasterizeWithSharp(svgMarkup: string, width: number, height: number): Promise<RasterizedImage> {
  const remoteRef = findRemoteAssetRef(svgMarkup)
  if (remoteRef) {
    throw new Error(
      `rasterizeSvg: refusing to rasterize an SVG that references a remote image (${remoteRef}) — only data-URI (or other local) assets are supported, pptwise audit never makes a network request`,
    )
  }
  const sharpMod = await loadSharp("Pixel-contrast auditing (--pixels)")
  const { data, info } = await sharpMod(Buffer.from(svgMarkup, "utf-8"))
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  }
}

/**
 * Longest side of the probe decode in {@link decodeImageWithSharp}. Small
 * enough that the probe costs milliseconds even for a 6000×4000 JPEG
 * (Sharp shrinks on load), large enough that libvips still has to walk the
 * whole compressed stream to produce it.
 */
const DECODE_PROBE_PX = 16

/**
 * Node's `decodeImage` (fix/decode-assets-before-export): `metadata()` for
 * the pixel size, then a real decode down to a {@link DECODE_PROBE_PX} probe.
 * Two calls on purpose. `metadata()` alone reads only the header, and a PNG
 * cut in half still carries a perfect header: measured directly while
 * building this, `metadata()` reported 64×48 for a PNG truncated at 50%
 * while the pixel decode failed with "libpng read error". The probe is what
 * turns "starts like an image" into "opens as an image" without holding the
 * full raw bitmap in memory (a 25 MB PNG can decode to hundreds of MB of
 * pixels; the resize streams through libvips instead).
 *
 * Sharp's default `failOn: "warning"` stays in force so a truncated JPEG
 * ("premature end of JPEG image") is an error here, not a half-grey picture.
 */
export async function decodeImageWithSharp(bytes: Uint8Array): Promise<DecodedImageSize> {
  const sharpMod = await loadSharp("Verifying image assets before export")
  const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const meta = await sharpMod(input).metadata()
  if (!meta.width || !meta.height) {
    throw new Error("image header carries no pixel size")
  }
  await sharpMod(input)
    .resize({ width: DECODE_PROBE_PX, height: DECODE_PROBE_PX, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer()
  return { width: meta.width, height: meta.height }
}

/**
 * `true` when the optional `sharp` package can be resolved from this file.
 * A resolvability probe only: nothing is imported or executed here, so the
 * "runtime sharp loads in src are lazy" guard (`dsh-sharp-isolation.test.ts`)
 * still holds. It lets {@link installNodePlatform} leave `decodeImage`
 * undefined when Sharp is absent, so `inline-assets.ts` reports "cannot
 * verify image assets" with install guidance instead of a decode failure
 * that reads as if the picture itself were broken.
 */
function sharpIsResolvable(): boolean {
  try {
    createRequire(import.meta.url).resolve("sharp")
    return true
  } catch {
    return false
  }
}

/** Wire Node implementations (linkedom DOM, sharp image re-encode + SVG
 *  rasterize + real image decode) into the SDK. `decodeImage` is only
 *  installed when Sharp resolves; see {@link sharpIsResolvable}. */
export function installNodePlatform(): void {
  installPlatform({
    domParser: LinkedomDOMParser as unknown as typeof DOMParser,
    recodeImageToPng: recodeWithSharp,
    rasterizeSvg: rasterizeWithSharp,
    decodeImage: sharpIsResolvable() ? decodeImageWithSharp : undefined,
    fetch: proxyFetch,
  })
}
