import { validateIr } from "../../validate-core"
import type { ThemeDefinition } from "../../themes/definitions"
import { generatePptxBlob } from "../generate"

/**
 * Export a deck that validate's content-page drawn gate refuses, so a test
 * can reach the export's own content-drop gate (`checkContentDropGate` in
 * `../generate.ts`) behind it.
 *
 * `generatePptx` validates first, and validate now draws every content page
 * and refuses one that would lose anything, so a deck that loses content
 * stops there with validate's message. The export gate stays as the second
 * line, and a test that pins what it says or what it lets through gets past
 * the first one here, out loud: validate with its drawn gate skipped, then
 * the export with its own gate as asked.
 */
export async function exportPastDrawnGate(
  input: unknown,
  opts?: { theme?: ThemeDefinition; allowDroppedContent?: boolean },
): Promise<Uint8Array> {
  const v = validateIr(input, { ...(opts?.theme !== undefined ? { theme: opts.theme } : {}), allowDroppedContent: true })
  if (!v.ok) throw new Error(`invalid IR: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`)
  const blob = await generatePptxBlob(v.ir!, { theme: v.theme!, allowDroppedContent: opts?.allowDroppedContent })
  return new Uint8Array(await blob.arrayBuffer())
}
