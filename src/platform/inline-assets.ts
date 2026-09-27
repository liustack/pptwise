/**
 * 导出前的资产内联：把 ir.assets.images 里的 http(s) 图片取回并替换为
 * data URL。预览用 <image href=签名URL> 由浏览器直接加载，而 pptxgenjs 的
 * addImage 需要真实字节（data URI）——单源重构时丢了这一步，URL 资产在
 * 导出产物里整体缺失（页面只剩遮罩，视觉上是黑/灰底）。
 *
 * 只处理被页面引用的资产（`@/ir/asset-references` 的 `assetReferences`）：
 * 没有任何页面、背景、主题默认背景或品牌 logo 指向的资产原样留在
 * ir.assets.images 里，不下载、不解码、不重编码。没人画它，它的字节也不会进
 * ppt/media。主题默认背景也能指向资产，所以这里要拿到绑定的主题定义
 * （与 generatePptxBlob 用的是同一份按值传入的定义）。
 *
 * 失败语义与 image-export 一致：显式抛错，不生成残缺文档。
 *
 * 另做 Office 安全 MIME 归一化：webp 等非 png/jpeg/gif 资产（典型是
 * ref:upload 上传图的 1600w webp 预览变体）重编码为 PNG——pptxgenjs 把
 * data URL 的 MIME 原样写进 pptx，PowerPoint 打不开 webp。
 */
import type { PptxIR } from "@/ir"
import { assetReferences } from "@/ir/asset-references"
import { dataUriMime, decodeDataUriBytes, FORMAT_BY_MIME, MIME_BY_SNIFFED_FORMAT, sniffImageFormat } from "@/ir/asset-sniff"
import { PptwiseError } from "../errors"
import type { ThemeDefinition } from "../themes/definitions"
import { decodeImageInBrowser, hasBrowserImageDecoder } from "./browser"
import { type DecodedImageSize, getPlatform } from "./registry"

/**
 * 手工构造 data URL（不走 FileReader）：MIME 取 Content-Type，兜底 image/png。
 * pptxgenjs 依赖 data URL 的 MIME 头识别媒体类型，不能容忍 octet-stream。
 */
function bytesToDataUrl(bytes: Uint8Array, contentType: string | null): string {
  const mime = contentType?.split(";")[0] || "image/png"
  let bin = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mime};base64,${btoa(bin)}`
}

/** How long one remote asset may take, from the request to its last byte.
 *  The URL comes from IR a model wrote, and a server that never answers
 *  must not hold the render forever. */
export const FETCH_TIMEOUT_MS = 30_000

const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/**
 * The bytes of one remote asset, or a plain-language reason there are none.
 * Only `http` and `https` sources are fetched. A source with no scheme is a
 * relative URL and goes to the platform fetch unchanged (a browser resolves
 * it against the page). The download is bounded in time and in size: a
 * declared `content-length` above {@link MAX_DECODE_BYTES} is refused before
 * the body is read, and a body that grows past it without declaring its
 * size is cancelled once it crosses the line. The Node CLI's proxy path
 * buffers the whole response before handing it over (`../cli/proxy-fetch`),
 * so behind a proxy only the time bound applies during the download.
 */
async function fetchRemoteAsset(src: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const scheme = SCHEME.exec(src)?.[1]?.toLowerCase()
  if (scheme !== undefined && scheme !== "http" && scheme !== "https") {
    throw new Error(`the source uses "${scheme}:", and only http and https sources are fetched`)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const timedOut = () => new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000} s`)
  try {
    const resp = await (getPlatform().fetch ?? globalThis.fetch)(src, { signal: controller.signal })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const declared = Number(resp.headers.get("content-length") ?? NaN)
    if (Number.isFinite(declared) && declared > MAX_DECODE_BYTES) {
      await resp.body?.cancel()
      throw tooLarge(`declares ${mb(declared)} MB`)
    }
    return { bytes: await readCapped(resp), contentType: resp.headers.get("content-type") }
  } catch (e) {
    throw controller.signal.aborted ? timedOut() : e
  } finally {
    clearTimeout(timer)
  }
}

function tooLarge(what: string): Error {
  return new Error(`${what}, above the ${mb(MAX_DECODE_BYTES)} MB limit for one slide image`)
}

async function readCapped(resp: Response): Promise<Uint8Array> {
  if (!resp.body) return new Uint8Array(await resp.arrayBuffer())
  const reader = resp.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_DECODE_BYTES) {
      await reader.cancel()
      throw tooLarge(`sent more than ${mb(MAX_DECODE_BYTES)} MB`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/** 收集所有被页面背景引用的 asset id（仅这些参与背景压缩）：页面自己的
 *  slide.background，或页面没写背景时兜底的主题默认背景。 */
export function backgroundAssetIds(ir: PptxIR, theme: ThemeDefinition): Set<string> {
  const ids = new Set<string>()
  for (const slide of ir.slides) {
    const bg = slide.background ?? theme.style.defaultBackgrounds[slide.type]
    if (bg.kind === "asset" && bg.asset_id) ids.add(bg.asset_id)
  }
  return ids
}

/** 背景图重编码阈值：小于此字节数不值得有损压缩。 */
const COMPRESS_MIN_BYTES = 400 * 1024
/** 背景图重编码目标：全幅铺图 + 遮罩场景，JPEG 0.85 视觉无感。 */
const COMPRESS_QUALITY = 0.85
const COMPRESS_MAX_W = 1920

/**
 * data URL → 已解码 HTMLImageElement。jsdom 等无解码环境 onload 永不触发——
 * 3s 超时报错，绝不挂死导出。调用方自行决定失败语义（压缩=回退原图，
 * mime 归一化=fail-loud）。
 */
async function decodeDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("decode timeout")), 3000)
    img.onload = () => {
      clearTimeout(timer)
      resolve()
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error("image decode failed"))
    }
    img.src = dataUrl
  })
  return img
}

/** pptxgenjs/PowerPoint 安全的位图 MIME；其余（webp/avif 等）导出前必须重编码。 */
const OFFICE_SAFE_MIME = new Set(["image/png", "image/jpeg", "image/gif"])

function dataUrlMime(dataUrl: string): string {
  const semi = dataUrl.indexOf(";")
  return semi > 5 ? dataUrl.slice(5, semi) : ""
}

/**
 * 非 Office 安全 MIME 的资产（典型：上传图的 1600w webp 预览变体，走
 * ref:upload 进 IR）重编码为 PNG。这是正确性变换而非优化：pptxgenjs 会把
 * data URL 的 MIME 原样写进 pptx，PowerPoint 打不开 webp——失败必须抛错，
 * 与本文件「显式抛错，不生成残缺文档」的语义一致。
 */
async function reencodeToPng(dataUrl: string): Promise<string> {
  const canvas = document.createElement("canvas")
  const ctx2d = canvas.getContext("2d")
  if (!ctx2d || typeof canvas.toDataURL !== "function") {
    throw new Error("canvas unavailable, cannot re-encode")
  }
  const img = await decodeDataUrlImage(dataUrl)
  if (!img.naturalWidth) throw new Error("image decode failed")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx2d.drawImage(img, 0, 0)
  const png = canvas.toDataURL("image/png")
  if (!png.startsWith("data:image/png")) throw new Error("PNG encode failed")
  return png
}

/** 资产 src 若是非 Office 安全 MIME 的 data URL → PNG；其余原样返回。 */
async function normalizeAssetDataUrl(id: string, dataUrl: string): Promise<string> {
  const mime = dataUrlMime(dataUrl)
  if (!mime.startsWith("image/") || OFFICE_SAFE_MIME.has(mime)) return dataUrl
  try {
    const recode = getPlatform().recodeImageToPng
    return recode ? await recode(dataUrl) : await reencodeToPng(dataUrl)
  } catch (e) {
    throw new PptwiseError(
      `background/illustration asset "${id}" format conversion failed (${mime}→png: ${e instanceof Error ? e.message : String(e)}), cannot produce a complete PPT — please retry or regenerate the image`,
    )
  }
}

/**
 * 大体积 PNG 背景重编码为 JPEG（graphic_create 产 1920×1080 无损 PNG
 * 常见 2-5MB，作为遮罩下的背景无须无损）。canvas 不可用（如测试环境）
 * 或重编码失败/更大时原样返回——只做优化，不改变正确性。
 */
export async function maybeCompressBackground(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/png;base64,")) return dataUrl
  const approxBytes = (dataUrl.length - 22) * 0.75
  if (approxBytes < COMPRESS_MIN_BYTES) return dataUrl
  try {
    const canvas = document.createElement("canvas")
    const ctx2d = canvas.getContext("2d")
    if (!ctx2d || typeof canvas.toDataURL !== "function") return dataUrl
    const img = await decodeDataUrlImage(dataUrl)
    if (!img.naturalWidth) return dataUrl
    const scale = Math.min(1, COMPRESS_MAX_W / img.naturalWidth)
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height)
    const jpeg = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY)
    return jpeg.startsWith("data:image/jpeg") && jpeg.length < dataUrl.length
      ? jpeg
      : dataUrl
  } catch {
    return dataUrl
  }
}

/**
 * Upper bound on the encoded bytes of one image asset, checked before any
 * decoder touches it. 25 MB is far above anything a slide needs (a 4K JPEG
 * photo is 2 to 5 MB, a lossless 1920×1080 PNG background 2 to 5 MB, and
 * PowerPoint itself gets sluggish well before that) and still small enough
 * that a decoder's raw pixel buffer, which can be ten times the encoded
 * size, stays affordable. Anything larger is either the wrong file or a
 * decompression bomb, and both are refused with a message rather than fed
 * to Sharp or `createImageBitmap`.
 */
export const MAX_DECODE_BYTES = 25 * 1024 * 1024

const mb = (n: number) => (n / (1024 * 1024)).toFixed(1)

function describeAsset(id: string, pages: string[], url?: string): string {
  const origin = url ? `, fetched from ${url}` : ""
  return `asset "${id}" (used on ${pages.join(", ")}${origin})`
}

/**
 * The decoder this environment can verify images with: the installed
 * platform's `decodeImage` (Sharp after `installNodePlatform()`), else the
 * browser's `createImageBitmap` when one exists, else nothing. "Nothing" is
 * an export error in {@link assertDecodableImage}, never a silent pass.
 */
function imageDecoder(): ((bytes: Uint8Array) => Promise<DecodedImageSize>) | undefined {
  return getPlatform().decodeImage ?? (hasBrowserImageDecoder() ? decodeImageInBrowser : undefined)
}

/**
 * The one gate every image asset passes on its way into the export chain,
 * whether it arrived as a local `data:` URI or was just fetched from an
 * `http(s)://` URL (fix/decode-assets-before-export). Earlier seams
 * (`validateIr`'s `checkAssetBytes`, `cli/load-ir.ts`'s `resolveLocalAssets`,
 * and this module's own fetched-bytes check) only sniffed magic bytes, so an
 * 8-byte PNG signature with no image body passed every check and landed in
 * `ppt/media/*` as a picture PowerPoint could not open. The package audit
 * proves a media part exists, not that it decodes.
 *
 * Order: header sniff and declared-MIME check first (cheap, and they give
 * the more specific message), then the byte cap, then a real decode through
 * {@link imageDecoder}. Every failure names the asset id and the pages that
 * reference it, so the author knows which picture to replace and where it
 * would have appeared.
 */
async function assertDecodableImage(id: string, pages: string[], dataUrl: string, url?: string): Promise<void> {
  const who = describeAsset(id, pages, url)
  const bytes = decodeDataUriBytes(dataUrl)
  if (bytes === null || bytes.length === 0) {
    throw new PptwiseError(
      `${who} is a zero-byte or undecodable image, cannot produce a complete PPT: re-export or regenerate the image`,
    )
  }
  const sniffed = sniffImageFormat(bytes)
  if (sniffed === null) {
    throw new PptwiseError(
      `${who} has a corrupt or unrecognized image header (expected PNG, JPEG, WebP, or GIF), cannot produce a complete PPT: re-export or regenerate the image`,
    )
  }
  const declaredMime = dataUriMime(dataUrl)
  const declaredFormat = FORMAT_BY_MIME[declaredMime]
  if (declaredFormat && declaredFormat !== sniffed) {
    throw new PptwiseError(
      `${who} declares "${declaredMime}" but its bytes are actually ${MIME_BY_SNIFFED_FORMAT[sniffed]}, cannot produce a complete PPT: fix the declared type or re-export the image as ${declaredMime}`,
    )
  }
  if (bytes.length > MAX_DECODE_BYTES) {
    throw new PptwiseError(
      `${who} is ${mb(bytes.length)} MB, above the ${mb(MAX_DECODE_BYTES)} MB limit for one slide image, cannot produce a complete PPT: downscale or recompress the image`,
    )
  }
  const decode = imageDecoder()
  if (!decode) {
    throw new PptwiseError(
      `cannot verify image assets: no image decoder is available in this environment, so ${who} would ship unchecked. In Node, install the optional dependency "sharp" (npm i sharp) and call installNodePlatform() from "@liustack/pptwise/node" (the pptwise CLI does this automatically). In a browser, createImageBitmap is required`,
    )
  }
  try {
    await decode(bytes)
  } catch (e) {
    throw new PptwiseError(
      `${who} could not be decoded as an image (${e instanceof Error ? e.message.split("\n")[0] : String(e)}), cannot produce a complete PPT: re-export or regenerate the image`,
    )
  }
}

/** `theme` is the deck's bound theme, by value: its default backgrounds
 *  count as references too. */
export async function inlinePptxAssets(ir: PptxIR, theme: ThemeDefinition): Promise<PptxIR> {
  const entries = Object.entries(ir.assets?.images ?? {})
  if (entries.length === 0) return ir
  const bgIds = backgroundAssetIds(ir, theme)
  const refs = assetReferences(ir, theme)

  const images: Record<string, (typeof entries)[number][1]> = {}
  await Promise.all(
    entries.map(async ([id, asset]) => {
      const pages = refs.get(id)
      // 未被任何页面引用的资产不参与导出：不取回、不解码，原样保留。
      if (!asset.src || !pages) {
        images[id] = asset
        return
      }
      if (asset.src.startsWith("data:")) {
        await assertDecodableImage(id, pages, asset.src)
        const normalized = await normalizeAssetDataUrl(id, asset.src)
        images[id] = bgIds.has(id)
          ? { ...asset, src: await maybeCompressBackground(normalized) }
          : normalized === asset.src
            ? asset
            : { ...asset, src: normalized }
        return
      }
      let dataUrl: string
      try {
        const { bytes, contentType } = await fetchRemoteAsset(asset.src)
        dataUrl = bytesToDataUrl(bytes, contentType)
      } catch (e) {
        throw new PptwiseError(
          `background/illustration asset "${id}" fetch failed (${e instanceof Error ? e.message : String(e)}), cannot produce a complete PPT — please retry or regenerate the image`,
        )
      }
      await assertDecodableImage(id, pages, dataUrl, asset.src)
      dataUrl = await normalizeAssetDataUrl(id, dataUrl)
      images[id] = {
        ...asset,
        src: bgIds.has(id) ? await maybeCompressBackground(dataUrl) : dataUrl,
      }
    }),
  )
  return { ...ir, assets: { ...ir.assets, images } }
}
