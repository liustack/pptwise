/**
 * Keeps a GitHub Release body under GitHub's cap.
 *
 * The Release workflow posts this version's CHANGELOG section as the release
 * notes, and GitHub refuses a body over 125,000 characters. 0.41.0 gathered
 * months of changesets into one section of about 148,000, so npm got the
 * package and the release step failed with HTTP 422. A section that long is
 * cut at the last bullet that fits and ends with a link to the full section
 * in CHANGELOG.md at the tag. A section that fits is left exactly as it is.
 *
 *   tsx scripts/fit-release-notes.mts <notes-file> <version> <heading>
 *
 * rewrites the notes file in place. `heading` is the section's own heading
 * text (`0.41.0 - 2026-10-10`), which the link's anchor is made from.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

/** GitHub's limit is 125,000. The margin covers the closing note itself and
 *  any difference in how the two sides count characters. */
export const NOTES_LIMIT = 120_000

/** The anchor GitHub gives a markdown heading: lower case, punctuation other
 *  than hyphens dropped, spaces turned into hyphens. */
export function headingAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-")
}

export function fitReleaseNotes(notes: string, version: string, heading: string, limit = NOTES_LIMIT): string {
  if (notes.length <= limit) return notes
  const link = `https://github.com/liustack/pptwise/blob/v${version}/CHANGELOG.md#${headingAnchor(heading)}`
  const tail = `\n\n---\n\nThese notes are cut short: GitHub caps a release at 125,000 characters. The full list is in [CHANGELOG.md](${link}).\n`
  const room = limit - tail.length
  const cut = notes.lastIndexOf("\n- ", room)
  if (cut <= 0) throw new Error(`no bullet boundary in the first ${room} characters of the ${version} notes`)
  return notes.slice(0, cut).trimEnd() + tail
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, version, heading] = process.argv.slice(2)
  if (!file || !version || !heading) throw new Error("usage: fit-release-notes.mts <notes-file> <version> <heading>")
  const notes = readFileSync(file, "utf8")
  const fitted = fitReleaseNotes(notes, version, heading)
  if (fitted !== notes) {
    writeFileSync(file, fitted)
    console.log(`release notes cut from ${notes.length} to ${fitted.length} characters`)
  }
}
