import type { DesignStory } from "../../design-story"
import * as architecture from "./architecture"
import * as blockquote from "./blockquote"
import * as bmc from "./bmc"
import * as bullets from "./bullets"
import * as callout from "./callout"
import * as chart from "./chart"
import * as code from "./code"
import * as comparison from "./comparison"
import * as cycle from "./cycle"
import * as dataTable from "./data-table"
import * as deviceMockup from "./device-mockup"
import * as fiveForces from "./five-forces"
import * as flowchart from "./flowchart"
import * as gantt from "./gantt"
import * as heatmap from "./heatmap"
import * as hubSpoke from "./hub-spoke"
import * as iconCards from "./icon-cards"
import * as imageCompare from "./image-compare"
import * as imageGrid from "./image-grid"
import * as image from "./image"
import * as insightPanel from "./insight-panel"
import * as kpiCards from "./kpi-cards"
import * as matrix from "./matrix"
import * as numberedCards from "./numbered-cards"
import * as paragraph from "./paragraph"
import * as peopleCards from "./people-cards"
import * as pest from "./pest"
import * as progressDonuts from "./progress-donuts"
import * as rings from "./rings"
import * as roadmap from "./roadmap"
import * as rowCards from "./row-cards"
import * as sankey from "./sankey"
import * as steps from "./steps"
import * as swot from "./swot"
import * as tagRow from "./tag-row"
import * as timeline from "./timeline"
import * as verdictBanner from "./verdict-banner"
import * as waterfall from "./waterfall"

/**
 * Each component keeps its design story in the same module as its schema, so
 * the semantics a schema encodes and the copy that explains them cannot drift
 * apart. This file is only the index over those modules.
 *
 * A component's story says which relation or fact the component expresses,
 * `positioning` carries the one-line test for reaching for it, and `notFor`
 * names the component it is most often confused with.
 */
interface ComponentStoryModule {
  /**
   * The component's schema. Named here only so the index cannot be pointed
   * at a module that is not a component, and so a module missing its story
   * is still a legal entry while the copy is being written.
   */
  readonly schema: unknown
  readonly story?: DesignStory
}

const COMPONENT_STORY_MODULES: Readonly<Record<string, ComponentStoryModule>> = {
  architecture,
  blockquote,
  bmc,
  bullets,
  callout,
  chart,
  code,
  comparison,
  cycle,
  data_table: dataTable,
  device_mockup: deviceMockup,
  five_forces: fiveForces,
  flowchart,
  gantt,
  heatmap,
  hub_spoke: hubSpoke,
  icon_cards: iconCards,
  image_compare: imageCompare,
  image_grid: imageGrid,
  image,
  insight_panel: insightPanel,
  kpi_cards: kpiCards,
  matrix,
  numbered_cards: numberedCards,
  paragraph,
  people_cards: peopleCards,
  pest,
  progress_donuts: progressDonuts,
  rings,
  roadmap,
  row_cards: rowCards,
  sankey,
  steps,
  swot,
  tag_row: tagRow,
  timeline,
  verdict_banner: verdictBanner,
  waterfall,
}

/**
 * Every component id the index covers, in registry order. A drift test holds
 * this equal to the component vocabulary, so a new component cannot be added
 * without a place for its story.
 */
export const COMPONENT_STORY_TYPES: readonly string[] = Object.keys(COMPONENT_STORY_MODULES)

/** One component's design story, or `undefined` while its copy is unwritten. */
export function componentStory(type: string): DesignStory | undefined {
  return COMPONENT_STORY_MODULES[type]?.story
}
