import type { DesignStory } from "../../design-story"
import * as architecture from "./architecture"
import * as blockquote from "./blockquote"
import * as bmc from "./bmc"
import * as bullets from "./bullets"
import * as callout from "./callout"
import * as chart from "./chart"
import * as chevronProcess from "./chevron-process"
import * as code from "./code"
import * as comparison from "./comparison"
import * as conceptEquation from "./concept-equation"
import * as cycle from "./cycle"
import * as dataTable from "./data-table"
import * as decisionTree from "./decision-tree"
import * as deviceMockup from "./device-mockup"
import * as fiveForces from "./five-forces"
import * as fishbone from "./fishbone"
import * as flowchart from "./flowchart"
import * as fromTo from "./from-to"
import * as gantt from "./gantt"
import * as harveyBalls from "./harvey-balls"
import * as heatmap from "./heatmap"
import * as hubSpoke from "./hub-spoke"
import * as iconCards from "./icon-cards"
import * as imageCompare from "./image-compare"
import * as imageGrid from "./image-grid"
import * as image from "./image"
import * as insightPanel from "./insight-panel"
import * as journeyMap from "./journey-map"
import * as kpiCards from "./kpi-cards"
import * as matrix from "./matrix"
import * as numberedCards from "./numbered-cards"
import * as paragraph from "./paragraph"
import * as peopleCards from "./people-cards"
import * as pest from "./pest"
import * as pictogram from "./pictogram"
import * as positioningMap from "./positioning-map"
import * as progressDonuts from "./progress-donuts"
import * as logoWall from "./logo-wall"
import * as productCards from "./product-cards"
import * as quoteWall from "./quote-wall"
import * as prosCons from "./pros-cons"
import * as rings from "./rings"
import * as roadmap from "./roadmap"
import * as rowCards from "./row-cards"
import * as sankey from "./sankey"
import * as scorecard from "./scorecard"
import * as staircase from "./staircase"
import * as segmentedWheel from "./segmented-wheel"
import * as steps from "./steps"
import * as swimlane from "./swimlane"
import * as swot from "./swot"
import * as timeline from "./timeline"
import * as venn from "./venn"
import * as verdictBanner from "./verdict-banner"
import * as waterfall from "./waterfall"
import * as wordCloud from "./word-cloud"
import * as iceberg from "./iceberg"
import * as issueTree from "./issue-tree"
import * as orgTree from "./org-tree"
import * as pillarModel from "./pillar-model"
import * as pyramid from "./pyramid"
import * as valueChain from "./value-chain"

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
  chevron_process: chevronProcess,
  code,
  comparison,
  concept_equation: conceptEquation,
  cycle,
  data_table: dataTable,
  decision_tree: decisionTree,
  device_mockup: deviceMockup,
  fishbone,
  five_forces: fiveForces,
  flowchart,
  from_to: fromTo,
  gantt,
  heatmap,
  hub_spoke: hubSpoke,
  icon_cards: iconCards,
  image_compare: imageCompare,
  image_grid: imageGrid,
  image,
  insight_panel: insightPanel,
  journey_map: journeyMap,
  kpi_cards: kpiCards,
  matrix,
  numbered_cards: numberedCards,
  paragraph,
  people_cards: peopleCards,
  pest,
  positioning_map: positioningMap,
  progress_donuts: progressDonuts,
  logo_wall: logoWall,
  product_cards: productCards,
  quote_wall: quoteWall,
  pros_cons: prosCons,
  rings,
  roadmap,
  row_cards: rowCards,
  sankey,
  staircase,
  segmented_wheel: segmentedWheel,
  steps,
  swimlane,
  swot,
  timeline,
  venn,
  verdict_banner: verdictBanner,
  waterfall,
  org_tree: orgTree,
  issue_tree: issueTree,
  pyramid,
  iceberg,
  pillar_model: pillarModel,
  value_chain: valueChain,
  harvey_balls: harveyBalls,
  scorecard,
  pictogram,
  word_cloud: wordCloud,
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
