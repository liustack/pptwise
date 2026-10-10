// @vitest-environment jsdom
//
// The overflow audit baseline over the next five of its themes
// (`__fixtures__/overflow-baseline.ts`).
import { BASELINE_THEMES, describeOverflowBaseline } from "./__fixtures__/overflow-baseline"

describeOverflowBaseline(BASELINE_THEMES.slice(5, 10))
