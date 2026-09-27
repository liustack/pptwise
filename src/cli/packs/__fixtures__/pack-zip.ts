/**
 * Builds pack archives in code for the pack tests: a `pack.json` plus
 * complete v2 theme files copied from a factory preset, with hooks to add
 * the hostile entries (`..` paths, symlinks, absolute names) the installer
 * must refuse. Shared by the install, sync, and theme-lookup tests so a
 * pack only needs describing once.
 */
import { createHash } from "node:crypto"
import JSZip from "jszip"
import { themeFileFromPreset } from "../../theme-resolve"
import type { ThemeFile } from "../../../themes/schema"

export interface PackFixture {
  id: string
  version: string
  title?: string
  engine?: string
  /** Theme ids to include, each a copy of `from` (default `brief`). */
  themes?: string[]
  from?: string
  /** Replaces the manifest fields after defaults are filled. */
  manifest?: Record<string, unknown>
  /** Runs last, for entries a test adds or swaps. */
  edit?: (zip: JSZip) => void
}

export function packTheme(id: string, from = "brief"): ThemeFile {
  return themeFileFromPreset(from, { id, label: `Pack ${id}` })
}

export function themeEntryPath(id: string): string {
  return `themes/${id}.theme.json`
}

export async function buildPackZip(fixture: PackFixture): Promise<Buffer> {
  const zip = new JSZip()
  const themes = fixture.themes ?? []
  for (const id of themes) {
    zip.file(themeEntryPath(id), JSON.stringify(packTheme(id, fixture.from), null, 2))
  }
  const manifest = {
    pack: 1,
    id: fixture.id,
    version: fixture.version,
    title: fixture.title ?? `Pack ${fixture.id}`,
    engine: fixture.engine ?? ">=0.0.0",
    themes: themes.map(themeEntryPath),
    ...fixture.manifest,
  }
  zip.file("pack.json", JSON.stringify(manifest, null, 2))
  fixture.edit?.(zip)
  return zip.generateAsync({ type: "nodebuffer", platform: "UNIX" })
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}
