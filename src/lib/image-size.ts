/**
 * A picture's own pixel size, read from its data URI. Shared by the export
 * (`pptx/svg2pptx/image.ts`, which needs it for pptxgenjs's crop arithmetic)
 * and the renderer (`render/cropped-image.tsx`, which places a cropped
 * picture by its natural shape). Pure and synchronous: no decoder, only the
 * header bytes.
 */

/**
 * 从 data URI 头同步嗅探图片原始像素尺寸（png/jpeg/gif——导出链在
 * pptx-inline-assets 已把其他格式重编码为 png）。识别不了返回 null。
 *
 * 为什么需要：pptxgenjs 的 sizing 用「addImage 的 w/h（应传图片原始尺寸）
 * 与 sizing.w/h（目标框）」的比值算 srcRect 裁剪量——两者传同值会得到
 * 零裁剪（srcRect 全 0），图仍被拉伸（2026-07-09 实拍 XML 证据）。
 */
export function dataUriDimensions(uri: string): { w: number; h: number } | null {
  const m = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.exec(uri)
  if (!m) return null
  // JPEG 的 SOF 段可能在 EXIF 之后，解码前 256KB 足够覆盖真实病例
  const b64 = uri.slice(m[0].length, m[0].length + 262144)
  let bytes: Uint8Array
  try {
    const bin = atob(b64.slice(0, b64.length - (b64.length % 4)))
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    return null
  }
  const be16 = (i: number) => (bytes[i] << 8) | bytes[i + 1]
  const be32 = (i: number) =>
    ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0
  // PNG: 8 字节签名 + IHDR（宽高在 16/20，big-endian 32 位）
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { w: be32(16), h: be32(20) }
  }
  // GIF: "GIF" + 宽高在 6/8（little-endian 16 位）
  if (bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { w: bytes[6] | (bytes[7] << 8), h: bytes[8] | (bytes[9] << 8) }
  }
  // WebP: "RIFF" .... "WEBP", then a VP8 / VP8L / VP8X chunk. The preview
  // sees a WebP asset as it is; the export recodes it to PNG first.
  if (bytes.length > 30 && bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    const chunk = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!)
    if (chunk === "VP8X") return { w: 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)), h: 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)) }
    if (chunk === "VP8L") {
      const b = bytes.subarray(21, 25)
      return { w: 1 + (b[0]! | ((b[1]! & 0x3f) << 8)), h: 1 + ((b[1]! >> 6) | (b[2]! << 2) | ((b[3]! & 0x0f) << 10)) }
    }
    if (chunk === "VP8 ") return { w: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff, h: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff }
    return null
  }
  // JPEG: 扫描 SOF0/1/2 标记（高在 +5、宽在 +7，big-endian 16 位）
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++
        continue
      }
      const marker = bytes[i + 1]
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { w: be16(i + 7), h: be16(i + 5) }
      }
      i += 2 + be16(i + 2)
    }
  }
  return null
}

