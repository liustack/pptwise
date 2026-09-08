/**
 * The two themes a per-face `assertSubset` check runs on.
 *
 * `assertSubset` reads the vocabulary of SVG primitives a renderer emits.
 * A theme supplies colours, fonts, and menu parameters — it never adds or
 * removes a primitive — so sweeping all 24 canonical themes through one
 * face's subset check re-renders the same element tree 24 times to reach
 * the same verdict. Seventy-four face tests did exactly that.
 *
 * Two themes stay, chosen for the ends of the identity band
 * (`themes/occasions.ts`): `bulletin` is `low`, the quiet institutional
 * register with the plainest tokens, and `rally` is `high`, a costume-grade
 * palette whose baked hexes several face tests also watch for. A face that
 * emits an unexportable primitive emits it under both.
 *
 * The full 24-theme sweep did not disappear — it moved to
 * `evals/gallery/corpus-scan.test.mts`, which already paints the whole
 * 24-theme × 62-component matrix once and now runs `assertSubset` over
 * every page of it. Export safety is a hard gate, so it is checked on more
 * pages than before, not fewer.
 */
export const SUBSET_SAMPLE_THEME_IDS = ["bulletin", "rally"] as const
