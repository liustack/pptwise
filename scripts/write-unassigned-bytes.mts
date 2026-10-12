/**
 * Refresh the unassigned-theme SVG byte nail:
 *   src/render/__fixtures__/emphasis-unassigned-bytes.json
 *
 *   pnpm fixtures:unassigned-bytes
 *
 * Pins sha256 of `renderSlideSvg` over the same matrix the colocated
 * test walks. Run after an intended renderer change. Never edit hashes by
 * hand.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { installNodePlatform } from "../src/platform/node"
import {
  computeEmphasisUnassignedPages,
  EMPHASIS_UNASSIGNED_BYTES_URL,
} from "../src/render/emphasis-unassigned-bytes"

installNodePlatform()

const emphasisPages = computeEmphasisUnassignedPages()
const emphasisPath = fileURLToPath(EMPHASIS_UNASSIGNED_BYTES_URL)
writeFileSync(emphasisPath, `${JSON.stringify({ pages: emphasisPages }, null, 2)}\n`)
console.log(`wrote ${Object.keys(emphasisPages).length} page hashes to ${emphasisPath}`)

