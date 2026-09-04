# Gallery evals calibration report

Date: 2026-08-22. Wave 8 replay: 2026-08-23.
Pre-fix SHA: `321748d` (the `fix/gallery-review-r1` workspace HEAD at review time).
Post-fix SHA: `8b4c001` (local main after r1 merged). r2 is **not** on this tree.
Wave 8 HEAD SHA: `2e8aa03` (main after all four wave 8 theme batches).
Human set: 44 `rework` page ids restored from `.issues/2026-08-22-gallery-review-r1/fix-list.md`, not a localStorage export. Mapping: every id exists exactly at that SHA.
L2 model: local `grok` CLI, `--no-subagents`, `--json-schema` `pptwise-gallery-verdicts/3`.
Raw L2: `evals/gallery/calibration/pre-fix-l2.json` (first frozen pass), `pre-fix-l2-replay.json` (new L1+rubric on the same SVGs), `post-fix-l2.json` (HEAD renders at `8b4c001`), `wave8-pre-l2.json` (wave 8 L1+L2 on the same 44 defective SVGs), `wave8-head-l2.json` (wave 8 HEAD of those ids).

This auditor does **not** replace a human pass. The 80% bar was not moved.

## Scores

Hit = `rework` or `limit`. Unfinished L2 notes (`Placeholder`, `in progress`, `before scoring`) and runner errors are **not** hits.

| Gate | Pre-fix, first frozen L2 | Pre-fix, new L1+rubric | Post-fix HEAD (`8b4c001`) | Wave 8, same 44 SVGs | Wave 8 HEAD (`2e8aa03`) |
| --- | --- | --- | --- | --- | --- |
| L1 | 12/44 (27%) | 14/44 (32%) | 9/44 | 44/44 (`depth-contract` on every SVG from before the depth groups). 14/44 besides that | 8/44 (12px floor) |
| L2 | 31/44 (70.5%) | 38/42 trusted (2 runner fakes) | 18/39 trusted (3 errors, 2 fakes) | **39/44 trusted** | 18/43 trusted (1 runner fake) |
| Combined (L1 or trusted L2) | **31/44 (70.5%)** | **38/44 (86.4%)** | 18/44 (many leftovers are the 12px floor) | **44/44**. 39/44 if `depth-contract` is ignored | 18/44 leftover |
| Meets 80% (35/44) | no | **yes** | n/a (this column is leftover vs false alarm, not recall) | **yes** | n/a (leftover vs false alarm, not recall) |
| L2 dual-run classification drift (3 pages × 2) | 0/3 (0%), under 5% | not re-run | not re-run | not re-run | not re-run |
| Planted miss-class set | n/a | L1 6/6, L2 10/10 | same gate, ran first | L1 10/10, L2 14/14 (depth plants added after the first report) | same gate, ran first |
| Pre-fix clone | `git clone --shared` into `/tmp/pptwise-gallery-cal-321748d` | same SVGs in `/tmp/pptwise-gallery-cal-svgs` | HEAD `renderMatrix` of the same 44 ids | same 321748d SVGs (local copy `/private/tmp/pptfast-gallery-cal-svgs`) | HEAD `renderMatrix` of the same 44 ids |
| Fixture bytes | 0.82MB (budget 15MB) | planted PNG few-shots ~0.26MB extra under `rubric/examples/` | same | unchanged | unchanged |
| Offline render | corpus assets are `data:` JPEGs, `findRemoteAssetRef` is null | unchanged | unchanged | unchanged | unchanged |

First frozen L2 on pre-fix SVGs is still 70.5%. That is the number that missed the bar. After teaching L1 and the rubric, the **same 44 defective SVGs** replay at 38/44 (86.4%). The bar stayed at 80%.

L1 hits on pre-fix are no longer a subset of L2. New L1 overlap fires on `theme--arena--zh--p01` and `layout--corner-wedge--zh`.

## Five miss classes

| Class | Disposition | Pre-fix (defective SVG) | HEAD (r1 in) |
| --- | --- | --- | --- |
| Underline as strikethrough | L1 code `strikethrough` plus gravity rubric few-shot | Planted gold line through x-height is L1-hard. Real `banner-chapter` gold rule sits **under** the kicker (y≈471 vs baseline 460), so L1 is clean and trusted L2 on zh is `pass`. en/mixed still hit gravity (title lockup centered), not strike. | zh/en `pass`. mixed still `rework` for vertical centering. |
| Text overflow | L1 boxless card overflow plus text rubric | `theme--lecture--zh--p04` trusted L2 `rework` (cards past the chalkboard). `layout--image-top--en` trusted L2 `pass` (estimator and vision both say the English title fits). | lecture runner-fake this round. image-top `pass`. |
| Text overlap | L1 ink-box overlap plus text rubric | arena and corner-wedge L1 `overlap` and L2 `rework` (70px title on 34px kicker). | both L1-clean and L2 `pass`. |
| Chip radius mismatch | rubric only (theme-independence) plus few-shot | all three `comparison-pill-panels` trusted L2 `rework` (square card, stadium pill). | all three trusted L2 `pass` (square chips). |
| Rotated type | rubric only plus few-shot | `theme--playbill--zh--p01` trusted L2 `rework` (sticker clockwise, type the other way). | p01 and p04 trusted L2 `pass`. |

Hanging quotation marks are not L1 overlap (punctuation-only strings are skipped).

## What L2 catches on pre-fix

The five-dot progress motif still fires on thesis, asymmetric-triptych, callout, banner-heading, quote-stage, image-split, rail-numbered. That decoration is real at SHA `321748d`.

New, taught hits on the old miss list: pill radius, playbill counter-rotate, arena overlap, lecture cards past the board, vermilion round pills, bulletin gravity. See the orig-13 table below.

## Orig 13 (human rework, first L2 `pass`)

| Page | Human issue | New pre-fix L1 | New pre-fix L2 | HEAD |
| --- | --- | --- | --- | --- |
| theme--bulletin--zh--p01 | pale banner square | clean | rework (banner vertically centered) | rework, same gravity note, not the pale square |
| comparison-pill-panels zh/en/mixed | rounded chips on square cards | clean | rework (stadium pill on square card) | pass |
| theme--playbill--zh--p01 | date type not with the sticker | clean | rework (rotate opposite the chip) | pass |
| layout--banner-chapter zh | underline as strikethrough | clean | **pass** (rule is under the kicker, not through x-height) | pass |
| layout--banner-chapter en/mixed | same | clean | rework (centered lockup, gravity) | en pass, mixed still gravity |
| theme--arena--zh--p01 | title overlap | overlap | rework (title ink on subtitle) | pass |
| layout--image-top--en | English overflow | clean | **pass** | pass |
| theme--ember--zh--p05 | missing left column | clean | **pass** | L1 font-size on flowchart labels |
| theme--lecture--zh--p04 | cards overflowing | clean | rework (shells past the board) | runner fake this round |
| component--cycle-hub-spoke--zh | spoke lines wrong | clean | **pass** | pass |

Honest leftover misses on the defective SVGs: banner-chapter zh (the gold line is a real underline), image-top en, ember p05, hub-spoke spokes. Four pages. Combined 38/44 still clears 35.

## Post-fix leftovers (not false alarms on already-clean pages)

r1 removed the five-dot motif, the crayon star on several pages, the pill stadium, the playbill counter-rotate, and the arena/corner-wedge overlap. Trusted L2 `pass` on those pages. That is the "fixed pages stay quiet" check.

What still flags on HEAD:

| Kind | Pages | Note |
| --- | --- | --- |
| 12px floor | banner-heading en, two-column en, ember p05, five-forces en, people-cards zh, rail-numbered zh/en/mixed | Same leftover the first report named. Captions and shrunk card copy. |
| Footer rule through `07` | vermilion p07 | L1 `strikethrough` + `edge-stick`. Real leftover, not the old pill issue. |
| Blue-orange / missing crayon language | crayon p01/p04/p07 | p01 `limit` (star gone, hand-drawn language gone). p04/p07 still pair vivid blue with gold-orange. |
| Gravity on a centered poster | thesis p01, bulletin p01, banner-chapter mixed, quote-stage zh/en/mixed | Rubric allows a named center-axis poster. L2 still scores several as hanging. |
| People-card type + blue-orange | people-cards zh | Role labels under 12px, gold vs blue avatars. |

Runner failed on HEAD (not scored): `layout--asymmetric-triptych--en`, `theme--lecture--zh--p04`, `component--five-forces--zh`, `component--row-cards--mixed`, `component--cycle-petal-wheel--zh`. Siblings that did finish are `pass` for triptych and row-cards.

## Dual-run

Three pre-fix pages, two L2 calls each, from the first frozen pass:

- `layout--two-column--en` rework/rework
- `component--cycle-petal-wheel--zh` rework/rework
- `component--people-cards--zh` rework/rework

0/3 drifted. Sample is small. It does not contradict the ≤5% rule.

## Gap to 80%

First frozen combined was 31/44. Need 35. Teaching L1 overlap and the five miss-class rubric, then replaying the **same** defective SVGs, reached 38/44. The four extra did not come from moving the bar.

HEAD combined 18/44 is leftover defects plus the 12px floor, not a claim that recall collapsed.

## Wave 8 replay (2026-08-23)

Replay after all 24 themes locked their four page types. Same method as `evals/gallery/calibration/post-fix.mts`. Planted ran first and had to hit 100% or the round would have been thrown away. The 80% bar stayed at 35/44. It still holds.

Planted: L1 10/10 (every plant that declares an L1 code), L2 14/14 (the standing set, including the four depth plants that landed after the first report).

The 44 defective SVGs are still the SHA `321748d` files. Current L1 flags `depth-contract` on all of them, because those files predate the bg/mid/fg groups. That is a real L1 finding on old bytes, so combined is 44/44. It is also a new check, not one of the original five miss classes. Stripping `depth-contract`, L1 is still 14/44, the same count as the post-rubric column. Trusted L2 on those SVGs is 39/44 (88.6%). Combined without `depth-contract` is 39/44. Both sit above 35.

Five trusted L2 `pass` on the defective SVGs (L1 still hits via `depth-contract`):

- `layout--banner-chapter` zh/en/mixed: gold rule sits under the baseline. Same legal-underline leftover as before.
- `theme--ember--zh--p05`: missing left column still not named.
- `component--cycle-hub-spoke--zh`: spoke geometry still not named.

`layout--image-top--en` is no longer in that leftover set. Trusted L2 is now `rework` (English title leaving the bar).

Wave 8 HEAD of the same 44 ids is leftover vs false alarm, not recall. Combined 18/44 trusted, in the same band as the `8b4c001` column (18/44). L1 is 8/44, all `font-size` (the 12px floor: `banner-heading` en, `two-column` en, ember p05, `five-forces` en, `people-cards` zh, `rail-numbered` zh/en/mixed). Trusted L2 leftover besides that floor:

| Kind | Pages | Note |
| --- | --- | --- |
| 12px floor | banner-heading en, two-column en, ember p05, five-forces en, people-cards zh, rail-numbered zh/en/mixed | Same leftover the first report named. |
| Gravity on a centered poster | crayon p01, bulletin p01, playbill p01, banner-chapter zh/en/mixed, quote-stage en/mixed, arena p01 | Rubric allows a named center-axis poster. L2 still scores several as hanging. `quote-stage` zh and `thesis` p01 now `pass`. |
| Blue-orange | crayon p07 | Vivid orange kicker/sun with a vivid blue star. p01 is gravity, not the old star. p04 `pass`. |
| Runner fake | `layout--asymmetric-triptych--zh` | 11s `Placeholder while inspecting`. en/mixed siblings `pass`. Not scored as a hit. |

Fixed pages stay quiet on HEAD: callout (no left bar), `comparison-pill-panels` (square chips), lecture p04 (cards on the board), image-top / image-split, corner-wedge (no title-on-subtitle), vermilion p07 (no stadium pill).

## CI

`pnpm check` runs L1 unit tests (synthetic and planted SVG defects) and the live-corpus "L1 completes" smoke. L2 is skipped when `CI=true`, with reason `CI=true`. Planted L2 is a local gate: `CI= pnpm exec tsx evals/gallery/calibration/post-fix.mts`. Replay L2 only with `CI= pnpm exec tsx evals/gallery/calibration/l2-pass.mts`. A later replay that must not clobber the frozen stores can set `PPTWISE_CAL_PRE_L2` / `PPTWISE_CAL_POST_L2` / `PPTWISE_CAL_HEAD_SHA`.
