/**
 * Refresh the two unassigned-theme SVG byte nails:
 *   src/render/__fixtures__/emphasis-unassigned-bytes.json
 *   src/render/heading-treatments/__fixtures__/unassigned-bytes.json
 *
 *   pnpm fixtures:unassigned-bytes
 *
 * Pins sha256 of `renderSlideSvg` over the same matrices the colocated
 * tests walk. Run after an intended renderer change. Never edit hashes by
 * hand.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { installNodePlatform } from "../src/platform/node"
import {
  computeEmphasisUnassignedPages,
  EMPHASIS_UNASSIGNED_BYTES_URL,
} from "../src/render/emphasis-unassigned-bytes"
import {
  computeHeadingUnassignedPages,
  HEADING_UNASSIGNED_ALGORITHM,
  HEADING_UNASSIGNED_BYTES_URL,
  HEADING_UNASSIGNED_CAPTURED_AT,
} from "../src/render/heading-treatments/unassigned-bytes"

installNodePlatform()

const emphasisPages = computeEmphasisUnassignedPages()
const emphasisPath = fileURLToPath(EMPHASIS_UNASSIGNED_BYTES_URL)
writeFileSync(emphasisPath, `${JSON.stringify({ pages: emphasisPages }, null, 2)}\n`)
console.log(`wrote ${Object.keys(emphasisPages).length} page hashes to ${emphasisPath}`)

const headingPages = computeHeadingUnassignedPages()
const headingPath = fileURLToPath(HEADING_UNASSIGNED_BYTES_URL)
writeFileSync(
  headingPath,
  `${JSON.stringify(
    {
      capturedAt: HEADING_UNASSIGNED_CAPTURED_AT,
      algorithm: HEADING_UNASSIGNED_ALGORITHM,
      pages: headingPages,
    },
    null,
    2,
  )}\n`,
)
console.log(`wrote ${Object.keys(headingPages).length} page hashes to ${headingPath}`)
