# lesson-sheet

homeroom's ordinary content page: the step's label at the top left, the course strip at the top right, the claim bold over the pen's wavy line, the body handed to the shared compositions in the `lesson` setting, and the source small at the foot.

Code: [`src/layouts/content-lesson-sheet.tsx`](../../../src/layouts/content-lesson-sheet.tsx), with the frame (`LessonRunningHead`, `LessonTitle`, `LessonStandfirst`, `LessonSource`) in [`src/layouts/lesson-shared.tsx`](../../../src/layouts/lesson-shared.tsx) and the course strip (`CourseStrip`) in [`src/layouts/compositions/lesson.tsx`](../../../src/layouts/compositions/lesson.tsx). Used by homeroom for points, list, comparison, process, data, photo and hierarchy pages.

## homeroom, AI-at-work training sample, 2026-10

Settled on every content page. The boards and engine renders are in the composition folders each page links from the round. The round's decisions are in [rounds/2026-10-06-homeroom](../../rounds/2026-10-06-homeroom/README.md).

**What it looks like.** The page's `kicker` at 13px bold in the mark, its characters a pixel apart, at x64, y24. At the top right, ending at x1216, the deck's `course` as a row of pills 22px tall: the page's `stage` filled in the mark with its name bold in white, the others outlined in the ghost with their names muted, a quiz stage dashed. The claim bold at 30/42 from x64 across 1152px, on one line whenever it fits and broken at a comma when it does not, its last line ending at y152 either way, and the pen's wavy line under it, 108px from x64 at y162. A subheading becomes a muted standfirst at the body's top. The body runs from y196 to y640 and is offered to the compositions in this order: `objectives`, `syllabus`, `studies`, `cohorts`, `diptych`, `estimates`, `quiz`, `answers`, `cases`, `ranking`, `rules`, `tiers`, `methods`, `blackboard`. A page none of them takes is drawn by the component renderer in the same band. The source at 12/16 in the muted ink from y648, up to two lines.

**Why.** A class reads as one run of steps: every page under the same head, the step it is in where the eye starts, where the class has got to where the eye ends, and its point underlined the way a teacher underlines it.

**What it gave up.**

- A page the band cannot hold steps aside to the plain sheet, and is declined when that cannot hold it either.
- `stage` is refused by validate on a face that does not draw it, on a deck with no `course`, and when it names a stage the course does not have.
- The body takes up to five components: the two-study page sets two panels with their charts and a closing tip.
