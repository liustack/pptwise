/**
 * The two themes a per-face `assertSubset` check runs on.
 *
 * These per-file checks are a smoke signal, not the authority. The authority
 * is `src/layouts/face-scan.test.tsx`, which renders every registered face
 * against all 24 canonical themes on that face's own registered sample and
 * runs `assertSubset` on each — 3,120 combinations, over the 1,776 the
 * per-file loops covered before they were narrowed. `evals/gallery/
 * corpus-scan.test.mts` adds a third pass over the 2,450 pages of the
 * theme x component matrix, whole slides this time rather than mounted
 * faces. Two themes beside each layout keep the failure local and fast while
 * that face's own file is being edited.
 *
 * Two themes stay, chosen for the ends of the identity band
 * (`themes/occasions.ts`): `bulletin` is `low`, the quiet institutional
 * register with the plainest tokens, and `rally` is `high`, a costume-grade
 * palette whose baked hexes several face tests also watch for.
 *
 * They are not a substitute for the sweep, and the earlier claim that a
 * theme never adds or removes a primitive was wrong: `brief` sets
 * `emphasis: "pad"` and `lecture` sets `emphasis: "underline"`, both of
 * which turn an emphasis run into a `path` that neither of these two themes
 * produces. `face-scan.test.tsx` pins six such faces by name.
 */
export const SUBSET_SAMPLE_THEME_IDS = ["bulletin", "rally"] as const
