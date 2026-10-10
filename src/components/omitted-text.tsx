/**
 * The mark a text leaves when its block had no line for it at all: an
 * empty element, never painted, declaring the cut (`data-truncated`) with
 * the words that were left out (`data-omitted`), so the cut reads back to
 * the field they came from (`../render/cut-fields.ts`) and is weighed by
 * that field's tier (`../ir/truncation-tiers.ts`). A mark on the card
 * around the text named nothing, since the card's own words are other
 * fields.
 */
export function OmittedText({ text }: { text: string | undefined }) {
  if (text === undefined) return null
  return <g data-truncated="1" data-omitted={text} />
}
