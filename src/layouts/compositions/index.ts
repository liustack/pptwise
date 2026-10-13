import type React from "react"
import { barsComposition, barsRecipe } from "./bars"
import { bridgeComposition, bridgeRecipe } from "./bridge"
import { columnsComposition, columnsRecipe } from "./columns"
import { figuresComposition, figuresRecipe } from "./figures"
import { lanesComposition, lanesRecipe } from "./lanes"
import { pairsComposition, pairsRecipe } from "./pairs"
import { railComposition, railRecipe } from "./rail"
import { recordsComposition, recordsRecipe } from "./records"
import { rowsComposition, rowsRecipe } from "./rows"
import { shareComposition, shareRecipe } from "./share"
import { shiftsComposition, shiftsRecipe } from "./shifts"
import type { Composition, CompositionId, CompositionProps } from "./shared"
import type { Recipe } from "./recipe"
import { crayonsComposition, crayonsRecipe } from "./crayons"
import { stickiesComposition, stickiesRecipe } from "./stickies"
import { waiverComposition, waiverRecipe } from "./waiver"
import { storeysComposition, storeysRecipe } from "./storeys"
import { swatchesComposition, swatchesRecipe } from "./swatches"
import { yardstickComposition, yardstickRecipe } from "./yardstick"
import { arcComposition, arcRecipe } from "./arc"
import { magnetsComposition, magnetsRecipe } from "./magnets"
import { crosscheckComposition, crosscheckRecipe } from "./crosscheck"
import { trayComposition, trayRecipe } from "./tray"
import { checkupComposition, checkupRecipe } from "./checkup"
import { backingComposition, backingRecipe } from "./backing"
import { badgesComposition, badgesRecipe } from "./badges"
import { ticksComposition, ticksRecipe } from "./ticks"
import { stackComposition, stackRecipe } from "./stack"
import { tilesComposition, tilesRecipe } from "./tiles"
import { tableComposition, tableRecipe } from "./table"
import { trackComposition, trackRecipe } from "./track"
import { treeComposition, treeRecipe } from "./tree"
import { wavesComposition, wavesRecipe } from "./waves"
import { windowComposition, windowRecipe } from "./window"
import { rosterComposition, rosterRecipe } from "./roster"
import { scoresComposition, scoresRecipe } from "./scores"
import { targetsComposition, targetsRecipe } from "./targets"
import { trendComposition, trendRecipe } from "./trend"
import { ringsComposition, ringsRecipe } from "./rings"
import { cardsComposition, cardsRecipe } from "./cards"
import { listingComposition, listingRecipe } from "./listing"
import { logComposition, logRecipe } from "./log"
import { spanComposition, spanRecipe } from "./span"
import { platesComposition, platesRecipe } from "./plates"
import { pathsComposition, pathsRecipe } from "./paths"
import { screenComposition, screenRecipe } from "./screen"
import { annexComposition, annexRecipe } from "./annex"
import { talliesComposition, talliesRecipe } from "./tallies"
import { slopesComposition, slopesRecipe } from "./slopes"
import { divergingComposition, divergingRecipe } from "./diverging"
import { citationComposition, citationRecipe } from "./citation"
import { scalesComposition, scalesRecipe } from "./scales"
import { catalogComposition, catalogRecipe } from "./catalog"
import { rotaComposition, rotaRecipe } from "./rota"
import { sumComposition, sumRecipe } from "./sum"
import { scheduleComposition, scheduleRecipe } from "./schedule"
import { checksComposition, checksRecipe } from "./checks"
import { readingsComposition, readingsRecipe } from "./readings"
import { insetComposition, insetRecipe } from "./inset"
import { docketComposition, docketRecipe } from "./docket"
import { controlledComposition, controlledRecipe } from "./controlled"
import { duelComposition, duelRecipe } from "./duel"
import { forestComposition, forestRecipe } from "./forest"
import { multiplesComposition, multiplesRecipe } from "./multiples"
import { forkComposition, forkRecipe } from "./fork"
import { rulerComposition, rulerRecipe } from "./ruler"
import { dumbbellsComposition, dumbbellsRecipe } from "./dumbbells"
import { gateComposition, gateRecipe } from "./gate"
import { watchComposition, watchRecipe } from "./watch"
import { motionComposition, motionRecipe } from "./motion"
import { calendarComposition, calendarRecipe } from "./calendar"
import { horizonComposition, horizonRecipe } from "./horizon"
import { formulaComposition, formulaRecipe } from "./formula"
import { errataComposition, errataRecipe } from "./errata"
import { breakdownComposition, breakdownRecipe } from "./breakdown"
import { benchmarkComposition, benchmarkRecipe } from "./benchmark"
import { pairedComposition, pairedRecipe } from "./paired"
import { procedureComposition, procedureRecipe } from "./procedure"
import { magnitudeComposition, magnitudeRecipe } from "./magnitude"
import { segmentsComposition, segmentsRecipe } from "./segments"
import { surveyComposition, surveyRecipe } from "./survey"
import { outlookComposition, outlookRecipe } from "./outlook"
import { phasesComposition, phasesRecipe } from "./phases"
import { objectivesComposition, objectivesRecipe } from "./objectives"
import { syllabusComposition, syllabusRecipe } from "./syllabus"
import { studiesComposition, studiesRecipe } from "./studies"
import { cohortsComposition, cohortsRecipe } from "./cohorts"
import { diptychComposition, diptychRecipe } from "./diptych"
import { estimatesComposition, estimatesRecipe } from "./estimates"
import { quizComposition, quizRecipe } from "./quiz"
import { answersComposition, answersRecipe } from "./answers"
import { casesComposition, casesRecipe } from "./cases"
import { rankingComposition, rankingRecipe } from "./ranking"
import { rulesComposition, rulesRecipe } from "./rules"
import { tiersComposition, tiersRecipe } from "./tiers"
import { methodsComposition, methodsRecipe } from "./methods"
import { blackboardComposition, blackboardRecipe } from "./blackboard"
import { expanseComposition, expanseRecipe } from "./expanse"
import { stairsComposition, stairsRecipe } from "./stairs"
import { funnelComposition, funnelRecipe } from "./funnel"
import { rivalsComposition, rivalsRecipe } from "./rivals"
import { equationComposition, equationRecipe } from "./equation"
import { spotlightComposition, spotlightRecipe } from "./spotlight"
import { betsComposition, betsRecipe } from "./bets"
import { divideComposition, divideRecipe } from "./divide"
import { locksComposition, locksRecipe } from "./locks"
import { registerComposition, registerRecipe } from "./register"
import { runwayComposition, runwayRecipe } from "./runway"
import { usesComposition, usesRecipe } from "./uses"
import { crestComposition, crestRecipe } from "./crest"
import { branchComposition, branchRecipe } from "./branch"
import { seasonComposition, seasonRecipe } from "./season"
import { makeupComposition, makeupRecipe } from "./makeup"
import { originsComposition, originsRecipe } from "./origins"
import { routeComposition, routeRecipe } from "./route"
import { spotsComposition, spotsRecipe } from "./spots"
import { wallComposition, wallRecipe } from "./wall"
import { loopComposition, loopRecipe } from "./loop"
import { stubsComposition, stubsRecipe } from "./stubs"
import { fallbacksComposition, fallbacksRecipe } from "./fallbacks"
import { timetableComposition, timetableRecipe } from "./timetable"
import { scoreboardComposition, scoreboardRecipe } from "./scoreboard"
import { allotmentComposition, allotmentRecipe } from "./allotment"
import { asksComposition, asksRecipe } from "./asks"
import { gainsComposition, gainsRecipe } from "./gains"
import { hoursComposition, hoursRecipe } from "./hours"
import { regionsComposition, regionsRecipe } from "./regions"
import { workingsComposition, workingsRecipe } from "./workings"
import { leversComposition, leversRecipe } from "./levers"
import { cyclesComposition, cyclesRecipe } from "./cycles"
import { driftComposition, driftRecipe } from "./drift"
import { partsComposition, partsRecipe } from "./parts"
import { plansComposition, plansRecipe } from "./plans"
import { precedentsComposition, precedentsRecipe } from "./precedents"
import { safeguardsComposition, safeguardsRecipe } from "./safeguards"
import { remediesComposition, remediesRecipe } from "./remedies"
import { checkpointsComposition, checkpointsRecipe } from "./checkpoints"
import { quoteComposition, quoteRecipe } from "./quote"
import { papersComposition, papersRecipe } from "./papers"
import { inquiryComposition, inquiryRecipe } from "./inquiry"
import { ladderComposition, ladderRecipe } from "./ladder"
import { reachComposition, reachRecipe } from "./reach"
import { backdropComposition, backdropRecipe } from "./backdrop"
import { thresholdsComposition, thresholdsRecipe } from "./thresholds"
import { tabulationComposition, tabulationRecipe } from "./tabulation"
import { partitionComposition, partitionRecipe } from "./partition"
import { findingsComposition, findingsRecipe } from "./findings"
import { coverageComposition, coverageRecipe } from "./coverage"
import { propositionsComposition, propositionsRecipe } from "./propositions"
import { cadenceComposition, cadenceRecipe } from "./cadence"
import { designsComposition, designsRecipe } from "./designs"
import { hazardsComposition, hazardsRecipe } from "./hazards"
import { itineraryComposition, itineraryRecipe } from "./itinerary"
import { queriesComposition, queriesRecipe } from "./queries"
import { forewordComposition, forewordRecipe } from "./foreword"
import { chronicleComposition, chronicleRecipe } from "./chronicle"
import { measuresComposition, measuresRecipe } from "./measures"
import { elapsedComposition, elapsedRecipe } from "./elapsed"
import { headlineComposition, headlineRecipe } from "./headline"
import { witnessComposition, witnessRecipe } from "./witness"
import { censusComposition, censusRecipe } from "./census"
import { contrastComposition, contrastRecipe } from "./contrast"
import { bracketComposition, bracketRecipe } from "./bracket"
import { mixComposition, mixRecipe } from "./mix"
import { twinsComposition, twinsRecipe } from "./twins"
import { parallelComposition, parallelRecipe } from "./parallel"
import { effectsComposition, effectsRecipe } from "./effects"
import { longformComposition, longformRecipe } from "./longform"
import { pledgesComposition, pledgesRecipe } from "./pledges"
import { openingComposition, openingRecipe } from "./opening"
import { strataComposition, strataRecipe } from "./strata"
import { handscrollComposition, handscrollRecipe } from "./handscroll"
import { programmeComposition, programmeRecipe } from "./programme"
import { climbComposition, climbRecipe } from "./climb"
import { soloComposition, soloRecipe } from "./solo"
import { descentComposition, descentRecipe } from "./descent"
import { doublesComposition, doublesRecipe } from "./doubles"
import { balanceComposition, balanceRecipe } from "./balance"
import { swingComposition, swingRecipe } from "./swing"
import { ebbComposition, ebbRecipe } from "./ebb"
import { facingComposition, facingRecipe } from "./facing"
import { lapseComposition, lapseRecipe } from "./lapse"
import { triptychComposition, triptychRecipe } from "./triptych"
import { mirrorComposition, mirrorRecipe } from "./mirror"
import { vitrineComposition, vitrineRecipe } from "./vitrine"
import { replyComposition, replyRecipe } from "./reply"
import { orderComposition, orderRecipe } from "./order"
import { standfirstComposition, standfirstRecipe } from "./standfirst"
import { duetComposition, duetRecipe } from "./duet"
import { collageComposition, collageRecipe } from "./collage"
import { threadComposition, threadRecipe } from "./thread"
import { lengthsComposition, lengthsRecipe } from "./lengths"
import { shadesComposition, shadesRecipe } from "./shades"
import { atelierComposition, atelierRecipe } from "./atelier"
import { paradeComposition, paradeRecipe } from "./parade"
import { lookComposition, lookRecipe } from "./look"
import { boundsComposition, boundsRecipe } from "./bounds"
import { floorplanComposition, floorplanRecipe } from "./floorplan"
import { jarsComposition, jarsRecipe } from "./jars"
import { squaresComposition, squaresRecipe } from "./squares"
import { specimenComposition, specimenRecipe } from "./specimen"
import { decadesComposition, decadesRecipe } from "./decades"
import { lensesComposition, lensesRecipe } from "./lenses"
import { haloComposition, haloRecipe } from "./halo"
import { datelineComposition, datelineRecipe } from "./dateline"
import { sliceComposition, sliceRecipe } from "./slice"
import { blanksComposition, blanksRecipe } from "./blanks"
import { cabinetComposition, cabinetRecipe } from "./cabinet"
import { revivalComposition, revivalRecipe } from "./revival"
import { nationsComposition, nationsRecipe } from "./nations"
import { genresComposition, genresRecipe } from "./genres"
import { basesComposition, basesRecipe } from "./bases"
import { agesComposition, agesRecipe } from "./ages"
import { archiveComposition, archiveRecipe } from "./archive"
import { scenesComposition, scenesRecipe } from "./scenes"
import { dailyComposition, dailyRecipe } from "./daily"
import { excerptsComposition, excerptsRecipe } from "./excerpts"
import { glyphsComposition, glyphsRecipe } from "./glyphs"
import { statuteComposition, statuteRecipe } from "./statute"
import { hushComposition, hushRecipe } from "./hush"
import { giantComposition, giantRecipe } from "./giant"
import { contourComposition, contourRecipe } from "./contour"
import { faceoffComposition, faceoffRecipe } from "./faceoff"
import { tiltComposition, tiltRecipe } from "./tilt"
import { podiumsComposition, podiumsRecipe } from "./podiums"
import { gulfComposition, gulfRecipe } from "./gulf"
import { crowdComposition, crowdRecipe } from "./crowd"
import { towerComposition, towerRecipe } from "./tower"
import { tollComposition, tollRecipe } from "./toll"
import { archesComposition, archesRecipe } from "./arches"
import { slateComposition, slateRecipe } from "./slate"
import { agendaComposition, agendaRecipe } from "./agenda"
import { confluenceComposition, confluenceRecipe } from "./confluence"
import { bracesComposition, bracesRecipe } from "./braces"
import { boughsComposition, boughsRecipe } from "./boughs"
import { factorsComposition, factorsRecipe } from "./factors"
import { subtractionsComposition, subtractionsRecipe } from "./subtractions"
import { flashcardsComposition, flashcardsRecipe } from "./flashcards"
import { risersComposition, risersRecipe } from "./risers"
import { givensComposition, givensRecipe } from "./givens"
import { derivationComposition, derivationRecipe } from "./derivation"
import { cascadeComposition, cascadeRecipe } from "./cascade"
import { exercisesComposition, exercisesRecipe } from "./exercises"
import { solutionsComposition, solutionsRecipe } from "./solutions"
import { pitfallsComposition, pitfallsRecipe } from "./pitfalls"
import { strikeoutComposition, strikeoutRecipe } from "./strikeout"
import { chronologyComposition, chronologyRecipe } from "./chronology"
import { sentenceComposition, sentenceRecipe } from "./sentence"
import { billboardComposition, billboardRecipe } from "./billboard"
import { proofComposition, proofRecipe } from "./proof"
import { asideComposition, asideRecipe } from "./aside"
import { stationsComposition, stationsRecipe } from "./stations"
import { verdictsComposition, verdictsRecipe } from "./verdicts"
import { caseworkComposition, caseworkRecipe } from "./casework"
import { resultsComposition, resultsRecipe } from "./results"
import { upliftComposition, upliftRecipe } from "./uplift"
import { appraisalComposition, appraisalRecipe } from "./appraisal"
import { shortfallsComposition, shortfallsRecipe } from "./shortfalls"
import { tenureComposition, tenureRecipe } from "./tenure"
import { credoComposition, credoRecipe } from "./credo"
import { gistComposition, gistRecipe } from "./gist"
import { reckoningComposition, reckoningRecipe } from "./reckoning"
import { creditComposition, creditRecipe } from "./credit"
import { casefileComposition, casefileRecipe } from "./casefile"
import { relayComposition, relayRecipe } from "./relay"
import { drawdownComposition, drawdownRecipe } from "./drawdown"
import { headcountComposition, headcountRecipe } from "./headcount"
import { postmortemComposition, postmortemRecipe } from "./postmortem"
import { deltasComposition, deltasRecipe } from "./deltas"
import { stretchComposition, stretchRecipe } from "./stretch"
import { sequenceComposition, sequenceRecipe } from "./sequence"
import { requestsComposition, requestsRecipe } from "./requests"

export type { Composition, CompositionId, CompositionInks, CompositionProps, CompositionSetting } from "./shared"
export { compositionTag } from "./shared"
export { describePart, describeShape, recipeCount, shapeGaps, type Recipe, type RecipePart, type RecipeShape } from "./recipe"
export { fitFixed, paintLines, type FixedTextSpec, type PaintSpec } from "./type"

/**
 * Every composition, in the order `compose` tries them. Each one recognises
 * a single content shape and declines everything else, so at most one of
 * them takes a page and the order only decides who is asked first.
 *
 * A face that wants a subset passes its own list of ids to `compose`.
 */
export const COMPOSITIONS: Readonly<Record<CompositionId, Composition>> = {
  rows: rowsComposition,
  table: tableComposition,
  waves: wavesComposition,
  tree: treeComposition,
  rail: railComposition,
  figures: figuresComposition,
  track: trackComposition,
  pairs: pairsComposition,
  columns: columnsComposition,
  bars: barsComposition,
  bridge: bridgeComposition,
  records: recordsComposition,
  stack: stackComposition,
  window: windowComposition,
  lanes: lanesComposition,
  share: shareComposition,
  tiles: tilesComposition,
  shifts: shiftsComposition,
  roster: rosterComposition,
  scores: scoresComposition,
  targets: targetsComposition,
  trend: trendComposition,
  rings: ringsComposition,
  cards: cardsComposition,
  listing: listingComposition,
  log: logComposition,
  span: spanComposition,
  plates: platesComposition,
  paths: pathsComposition,
  screen: screenComposition,
  annex: annexComposition,
  tallies: talliesComposition,
  slopes: slopesComposition,
  diverging: divergingComposition,
  citation: citationComposition,
  scales: scalesComposition,
  catalog: catalogComposition,
  rota: rotaComposition,
  sum: sumComposition,
  schedule: scheduleComposition,
  checks: checksComposition,
  readings: readingsComposition,
  inset: insetComposition,
  docket: docketComposition,
  controlled: controlledComposition,
  duel: duelComposition,
  forest: forestComposition,
  multiples: multiplesComposition,
  fork: forkComposition,
  ruler: rulerComposition,
  dumbbells: dumbbellsComposition,
  gate: gateComposition,
  watch: watchComposition,
  motion: motionComposition,
  calendar: calendarComposition,
  horizon: horizonComposition,
  formula: formulaComposition,
  errata: errataComposition,
  breakdown: breakdownComposition,
  benchmark: benchmarkComposition,
  paired: pairedComposition,
  procedure: procedureComposition,
  magnitude: magnitudeComposition,
  segments: segmentsComposition,
  survey: surveyComposition,
  outlook: outlookComposition,
  phases: phasesComposition,
  objectives: objectivesComposition,
  syllabus: syllabusComposition,
  studies: studiesComposition,
  cohorts: cohortsComposition,
  diptych: diptychComposition,
  estimates: estimatesComposition,
  quiz: quizComposition,
  answers: answersComposition,
  cases: casesComposition,
  ranking: rankingComposition,
  rules: rulesComposition,
  tiers: tiersComposition,
  methods: methodsComposition,
  blackboard: blackboardComposition,
  expanse: expanseComposition,
  stairs: stairsComposition,
  funnel: funnelComposition,
  rivals: rivalsComposition,
  equation: equationComposition,
  spotlight: spotlightComposition,
  bets: betsComposition,
  divide: divideComposition,
  locks: locksComposition,
  register: registerComposition,
  runway: runwayComposition,
  uses: usesComposition,
  crest: crestComposition,
  branch: branchComposition,
  season: seasonComposition,
  makeup: makeupComposition,
  origins: originsComposition,
  route: routeComposition,
  spots: spotsComposition,
  wall: wallComposition,
  loop: loopComposition,
  stubs: stubsComposition,
  fallbacks: fallbacksComposition,
  timetable: timetableComposition,
  scoreboard: scoreboardComposition,
  allotment: allotmentComposition,
  asks: asksComposition,
  gains: gainsComposition,
  hours: hoursComposition,
  regions: regionsComposition,
  workings: workingsComposition,
  levers: leversComposition,
  cycles: cyclesComposition,
  drift: driftComposition,
  parts: partsComposition,
  plans: plansComposition,
  precedents: precedentsComposition,
  safeguards: safeguardsComposition,
  remedies: remediesComposition,
  checkpoints: checkpointsComposition,
  quote: quoteComposition,
  papers: papersComposition,
  inquiry: inquiryComposition,
  ladder: ladderComposition,
  reach: reachComposition,
  backdrop: backdropComposition,
  thresholds: thresholdsComposition,
  tabulation: tabulationComposition,
  partition: partitionComposition,
  findings: findingsComposition,
  coverage: coverageComposition,
  propositions: propositionsComposition,
  cadence: cadenceComposition,
  designs: designsComposition,
  hazards: hazardsComposition,
  itinerary: itineraryComposition,
  queries: queriesComposition,
  foreword: forewordComposition,
  chronicle: chronicleComposition,
  measures: measuresComposition,
  elapsed: elapsedComposition,
  headline: headlineComposition,
  witness: witnessComposition,
  census: censusComposition,
  contrast: contrastComposition,
  bracket: bracketComposition,
  mix: mixComposition,
  twins: twinsComposition,
  parallel: parallelComposition,
  effects: effectsComposition,
  longform: longformComposition,
  pledges: pledgesComposition,
  opening: openingComposition,
  strata: strataComposition,
  handscroll: handscrollComposition,
  revival: revivalComposition,
  nations: nationsComposition,
  genres: genresComposition,
  bases: basesComposition,
  ages: agesComposition,
  archive: archiveComposition,
  scenes: scenesComposition,
  daily: dailyComposition,
  excerpts: excerptsComposition,
  glyphs: glyphsComposition,
  statute: statuteComposition,
  crayons: crayonsComposition,
  stickies: stickiesComposition,
  waiver: waiverComposition,
  storeys: storeysComposition,
  swatches: swatchesComposition,
  yardstick: yardstickComposition,
  arc: arcComposition,
  magnets: magnetsComposition,
  crosscheck: crosscheckComposition,
  tray: trayComposition,
  checkup: checkupComposition,
  backing: backingComposition,
  badges: badgesComposition,
  ticks: ticksComposition,
  programme: programmeComposition,
  climb: climbComposition,
  solo: soloComposition,
  descent: descentComposition,
  doubles: doublesComposition,
  balance: balanceComposition,
  swing: swingComposition,
  ebb: ebbComposition,
  facing: facingComposition,
  lapse: lapseComposition,
  triptych: triptychComposition,
  mirror: mirrorComposition,
  vitrine: vitrineComposition,
  reply: replyComposition,
  order: orderComposition,
  standfirst: standfirstComposition,
  duet: duetComposition,
  collage: collageComposition,
  thread: threadComposition,
  lengths: lengthsComposition,
  shades: shadesComposition,
  atelier: atelierComposition,
  parade: paradeComposition,
  look: lookComposition,
  bounds: boundsComposition,
  floorplan: floorplanComposition,
  jars: jarsComposition,
  squares: squaresComposition,
  specimen: specimenComposition,
  decades: decadesComposition,
  lenses: lensesComposition,
  halo: haloComposition,
  dateline: datelineComposition,
  slice: sliceComposition,
  blanks: blanksComposition,
  cabinet: cabinetComposition,
  hush: hushComposition,
  giant: giantComposition,
  contour: contourComposition,
  faceoff: faceoffComposition,
  tilt: tiltComposition,
  podiums: podiumsComposition,
  gulf: gulfComposition,
  crowd: crowdComposition,
  tower: towerComposition,
  toll: tollComposition,
  arches: archesComposition,
  slate: slateComposition,
  agenda: agendaComposition,
  confluence: confluenceComposition,
  braces: bracesComposition,
  boughs: boughsComposition,
  factors: factorsComposition,
  subtractions: subtractionsComposition,
  flashcards: flashcardsComposition,
  risers: risersComposition,
  givens: givensComposition,
  derivation: derivationComposition,
  cascade: cascadeComposition,
  exercises: exercisesComposition,
  solutions: solutionsComposition,
  pitfalls: pitfallsComposition,
  strikeout: strikeoutComposition,
  chronology: chronologyComposition,
  sentence: sentenceComposition,
  billboard: billboardComposition,
  proof: proofComposition,
  aside: asideComposition,
  stations: stationsComposition,
  verdicts: verdictsComposition,
  casework: caseworkComposition,
  results: resultsComposition,
  uplift: upliftComposition,
  appraisal: appraisalComposition,
  shortfalls: shortfallsComposition,
  tenure: tenureComposition,
  credo: credoComposition,
  gist: gistComposition,
  reckoning: reckoningComposition,
  credit: creditComposition,
  casefile: casefileComposition,
  relay: relayComposition,
  drawdown: drawdownComposition,
  headcount: headcountComposition,
  postmortem: postmortemComposition,
  deltas: deltasComposition,
  stretch: stretchComposition,
  sequence: sequenceComposition,
  requests: requestsComposition,
}

/**
 * What an author writes to get each composition (`./recipe.ts`), keyed as
 * `COMPOSITIONS` is. Each recipe sits in its composition's own file.
 */
export const RECIPES: Readonly<Record<CompositionId, Recipe>> = {
  rows: rowsRecipe,
  table: tableRecipe,
  waves: wavesRecipe,
  tree: treeRecipe,
  rail: railRecipe,
  figures: figuresRecipe,
  track: trackRecipe,
  pairs: pairsRecipe,
  columns: columnsRecipe,
  bars: barsRecipe,
  bridge: bridgeRecipe,
  records: recordsRecipe,
  stack: stackRecipe,
  window: windowRecipe,
  lanes: lanesRecipe,
  share: shareRecipe,
  tiles: tilesRecipe,
  shifts: shiftsRecipe,
  roster: rosterRecipe,
  scores: scoresRecipe,
  targets: targetsRecipe,
  trend: trendRecipe,
  rings: ringsRecipe,
  cards: cardsRecipe,
  listing: listingRecipe,
  log: logRecipe,
  span: spanRecipe,
  plates: platesRecipe,
  paths: pathsRecipe,
  screen: screenRecipe,
  annex: annexRecipe,
  tallies: talliesRecipe,
  slopes: slopesRecipe,
  diverging: divergingRecipe,
  citation: citationRecipe,
  scales: scalesRecipe,
  catalog: catalogRecipe,
  rota: rotaRecipe,
  sum: sumRecipe,
  schedule: scheduleRecipe,
  checks: checksRecipe,
  readings: readingsRecipe,
  inset: insetRecipe,
  docket: docketRecipe,
  controlled: controlledRecipe,
  duel: duelRecipe,
  forest: forestRecipe,
  multiples: multiplesRecipe,
  fork: forkRecipe,
  ruler: rulerRecipe,
  dumbbells: dumbbellsRecipe,
  gate: gateRecipe,
  watch: watchRecipe,
  motion: motionRecipe,
  calendar: calendarRecipe,
  horizon: horizonRecipe,
  formula: formulaRecipe,
  errata: errataRecipe,
  breakdown: breakdownRecipe,
  benchmark: benchmarkRecipe,
  paired: pairedRecipe,
  procedure: procedureRecipe,
  magnitude: magnitudeRecipe,
  segments: segmentsRecipe,
  survey: surveyRecipe,
  outlook: outlookRecipe,
  phases: phasesRecipe,
  objectives: objectivesRecipe,
  syllabus: syllabusRecipe,
  studies: studiesRecipe,
  cohorts: cohortsRecipe,
  diptych: diptychRecipe,
  estimates: estimatesRecipe,
  quiz: quizRecipe,
  answers: answersRecipe,
  cases: casesRecipe,
  ranking: rankingRecipe,
  rules: rulesRecipe,
  tiers: tiersRecipe,
  methods: methodsRecipe,
  blackboard: blackboardRecipe,
  expanse: expanseRecipe,
  stairs: stairsRecipe,
  funnel: funnelRecipe,
  rivals: rivalsRecipe,
  equation: equationRecipe,
  spotlight: spotlightRecipe,
  bets: betsRecipe,
  divide: divideRecipe,
  locks: locksRecipe,
  register: registerRecipe,
  runway: runwayRecipe,
  uses: usesRecipe,
  crest: crestRecipe,
  branch: branchRecipe,
  season: seasonRecipe,
  makeup: makeupRecipe,
  origins: originsRecipe,
  route: routeRecipe,
  spots: spotsRecipe,
  wall: wallRecipe,
  loop: loopRecipe,
  stubs: stubsRecipe,
  fallbacks: fallbacksRecipe,
  timetable: timetableRecipe,
  scoreboard: scoreboardRecipe,
  allotment: allotmentRecipe,
  asks: asksRecipe,
  gains: gainsRecipe,
  hours: hoursRecipe,
  regions: regionsRecipe,
  workings: workingsRecipe,
  levers: leversRecipe,
  cycles: cyclesRecipe,
  drift: driftRecipe,
  parts: partsRecipe,
  plans: plansRecipe,
  precedents: precedentsRecipe,
  safeguards: safeguardsRecipe,
  remedies: remediesRecipe,
  checkpoints: checkpointsRecipe,
  quote: quoteRecipe,
  papers: papersRecipe,
  inquiry: inquiryRecipe,
  ladder: ladderRecipe,
  reach: reachRecipe,
  backdrop: backdropRecipe,
  thresholds: thresholdsRecipe,
  tabulation: tabulationRecipe,
  partition: partitionRecipe,
  findings: findingsRecipe,
  coverage: coverageRecipe,
  propositions: propositionsRecipe,
  cadence: cadenceRecipe,
  designs: designsRecipe,
  hazards: hazardsRecipe,
  itinerary: itineraryRecipe,
  queries: queriesRecipe,
  foreword: forewordRecipe,
  chronicle: chronicleRecipe,
  measures: measuresRecipe,
  elapsed: elapsedRecipe,
  headline: headlineRecipe,
  witness: witnessRecipe,
  census: censusRecipe,
  contrast: contrastRecipe,
  bracket: bracketRecipe,
  mix: mixRecipe,
  twins: twinsRecipe,
  parallel: parallelRecipe,
  effects: effectsRecipe,
  longform: longformRecipe,
  pledges: pledgesRecipe,
  opening: openingRecipe,
  strata: strataRecipe,
  handscroll: handscrollRecipe,
  revival: revivalRecipe,
  nations: nationsRecipe,
  genres: genresRecipe,
  bases: basesRecipe,
  ages: agesRecipe,
  archive: archiveRecipe,
  scenes: scenesRecipe,
  daily: dailyRecipe,
  excerpts: excerptsRecipe,
  glyphs: glyphsRecipe,
  statute: statuteRecipe,
  crayons: crayonsRecipe,
  stickies: stickiesRecipe,
  waiver: waiverRecipe,
  storeys: storeysRecipe,
  swatches: swatchesRecipe,
  yardstick: yardstickRecipe,
  arc: arcRecipe,
  magnets: magnetsRecipe,
  crosscheck: crosscheckRecipe,
  tray: trayRecipe,
  checkup: checkupRecipe,
  backing: backingRecipe,
  badges: badgesRecipe,
  ticks: ticksRecipe,
  programme: programmeRecipe,
  climb: climbRecipe,
  solo: soloRecipe,
  descent: descentRecipe,
  doubles: doublesRecipe,
  balance: balanceRecipe,
  swing: swingRecipe,
  ebb: ebbRecipe,
  facing: facingRecipe,
  lapse: lapseRecipe,
  triptych: triptychRecipe,
  mirror: mirrorRecipe,
  vitrine: vitrineRecipe,
  reply: replyRecipe,
  order: orderRecipe,
  standfirst: standfirstRecipe,
  duet: duetRecipe,
  collage: collageRecipe,
  thread: threadRecipe,
  lengths: lengthsRecipe,
  shades: shadesRecipe,
  atelier: atelierRecipe,
  parade: paradeRecipe,
  look: lookRecipe,
  bounds: boundsRecipe,
  floorplan: floorplanRecipe,
  jars: jarsRecipe,
  squares: squaresRecipe,
  specimen: specimenRecipe,
  decades: decadesRecipe,
  lenses: lensesRecipe,
  halo: haloRecipe,
  dateline: datelineRecipe,
  slice: sliceRecipe,
  blanks: blanksRecipe,
  cabinet: cabinetRecipe,
  hush: hushRecipe,
  giant: giantRecipe,
  contour: contourRecipe,
  faceoff: faceoffRecipe,
  tilt: tiltRecipe,
  podiums: podiumsRecipe,
  gulf: gulfRecipe,
  crowd: crowdRecipe,
  tower: towerRecipe,
  toll: tollRecipe,
  arches: archesRecipe,
  slate: slateRecipe,
  agenda: agendaRecipe,
  confluence: confluenceRecipe,
  braces: bracesRecipe,
  boughs: boughsRecipe,
  factors: factorsRecipe,
  subtractions: subtractionsRecipe,
  flashcards: flashcardsRecipe,
  risers: risersRecipe,
  givens: givensRecipe,
  derivation: derivationRecipe,
  cascade: cascadeRecipe,
  exercises: exercisesRecipe,
  solutions: solutionsRecipe,
  pitfalls: pitfallsRecipe,
  strikeout: strikeoutRecipe,
  chronology: chronologyRecipe,
  sentence: sentenceRecipe,
  billboard: billboardRecipe,
  proof: proofRecipe,
  aside: asideRecipe,
  stations: stationsRecipe,
  verdicts: verdictsRecipe,
  casework: caseworkRecipe,
  results: resultsRecipe,
  uplift: upliftRecipe,
  appraisal: appraisalRecipe,
  shortfalls: shortfallsRecipe,
  tenure: tenureRecipe,
  credo: credoRecipe,
  gist: gistRecipe,
  reckoning: reckoningRecipe,
  credit: creditRecipe,
  casefile: casefileRecipe,
  relay: relayRecipe,
  drawdown: drawdownRecipe,
  headcount: headcountRecipe,
  postmortem: postmortemRecipe,
  deltas: deltasRecipe,
  stretch: stretchRecipe,
  sequence: sequenceRecipe,
  requests: requestsRecipe,
}

export const COMPOSITION_IDS = Object.keys(COMPOSITIONS) as readonly CompositionId[]

/**
 * The compositions that paint the two chart marks most hand-set plots were
 * drawn without: a series' `tone` (good or bad news in the theme's success
 * and danger inks) and a marked point in a stacked chart (the column the
 * page is about). A page whose chart carries either is offered to these
 * alone, so no plot recolours a series the author called good or bad news or
 * marks a segment where the author marked a column. The ordinary chart draws
 * both.
 */
const CHART_MARK_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["diverging", "fork"])

function asksForChartMarks(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "chart" &&
      (component.series.some((series) => series.tone !== undefined) ||
        ((component.chart_type === "stacked" || component.chart_type === "percent_stacked") &&
          component.series.some((series) => series.data.some((point) => point.emphasis === true)))),
  )
}

/**
 * The compositions that draw a chart's `tag`, the few words over it saying
 * what kind of figures it draws. A page whose chart carries one is offered to
 * these alone, so no hand-set plot leaves it off. The ordinary chart draws it
 * at the start of its legend row.
 */
const CHART_TAG_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel", "horizon", "paired", "diptych", "ranking", "bracket"])

/**
 * The compositions that keep their left column clear of the page tag a face
 * sets at the top left of the band (`tagBand`). A page with one is offered
 * to these alone; the face hands any other page the band under the tag.
 */
const TAG_BAND_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel", "forest", "fork", "gate"])

/**
 * The compositions that set the page's own tag inside the body (`pageTag`),
 * where the yearbook board cited the law a page rests on. A page with one is
 * offered to these alone; the face sets the tag itself otherwise.
 */
const PAGE_TAG_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "formula"])

/**
 * The compositions that draw what a timeline carries beyond its dated
 * milestones: the spans its axis is divided into (`periods`), and a
 * milestone's tag and source. A page whose timeline carries any of them is
 * offered to these alone, so no hand-set timeline leaves them off. The
 * ordinary timeline draws them all: the spans as a row of named spans under
 * its milestones, a source and a tag under a milestone's words.
 */
const TIMELINE_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "outlook", "checkpoints", "cadence", "handscroll", "chronology", "stations"])

function asksForTimelineDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "timeline" &&
      (component.periods !== undefined || component.milestones.some((m) => m.tag !== undefined || m.source !== undefined)),
  )
}

/**
 * The compositions that draw a callout's title and its tag. A page whose
 * callout carries either is offered to these alone, so no hand-set closing
 * line or note leaves them off. The ordinary callout sets the title bold over
 * its text and the tag under it.
 */
const CALLOUT_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "paired", "survey", "ranking", "methods", "funnel", "crest", "branch", "regions", "levers", "cycles", "checkpoints", "cadence", "nations", "lapse", "mirror", "toll", "strikeout", "casework", "shortfalls", "tenure"])

function asksForCalloutDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "callout" && (component.title !== undefined || component.tag !== undefined))
}

/**
 * The compositions that draw the short line a waterfall's bar may carry under
 * its label (`items[].note`). A page whose waterfall carries one is offered
 * to these alone; the ordinary waterfall sets every note in a line of its own
 * under the bars' names.
 */
const WATERFALL_NOTE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["formula", "credit"])

function asksForWaterfallNote(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "waterfall" && component.items.some((item) => item.note !== undefined))
}

/**
 * The compositions that draw a bar chart's reference line (`reference`), a
 * value such as a benchmark drawn dashed across the bars. A page whose chart
 * carries one is offered to these alone; the ordinary chart draws the line
 * and names it in its legend.
 */
const CHART_REFERENCE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["benchmark", "climb", "uplift"])

function asksForChartReference(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.reference !== undefined)
}

/**
 * The compositions that draw the few words a bar or a share bar's part may
 * carry after its value (`data[].note`). A page whose chart carries one is
 * offered to these alone; the ordinary chart prints every note after its
 * value.
 */
const CHART_NOTE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["magnitude", "segments", "survey", "levers", "backdrop", "partition", "chronicle", "elapsed", "solo", "descent", "ebb", "squares", "decades", "contour"])

function asksForChartNote(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.note !== undefined)))
}

/**
 * The compositions that draw a bar whose value is known only as a range
 * (`data[].upper`). A page whose chart carries one is offered to these
 * alone; the ordinary chart draws the bar solid to its low end and dashed on
 * to its high one, its label naming both ends.
 */
const CHART_RANGE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["diptych", "decades"])

function asksForChartRange(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.upper !== undefined)))
}

/**
 * The compositions that state a share bar's `emphasis_label`, the author's
 * own line for its marked run. A page whose chart carries one is offered to
 * these alone; the ordinary share bar sets it where its computed total
 * would stand.
 */
const CHART_RUN_LABEL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["breakdown", "segments", "makeup", "allotment", "ages", "archive", "slice"])

function asksForChartRunLabel(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.emphasis_label !== undefined)
}

/**
 * The compositions that mark a roadmap row whose value is not settled
 * (`rows[].basis`), such as a budget line still to be set. A page whose
 * roadmap carries one is offered to these alone, so no hand-set roadmap
 * prints a pending figure as if it were settled; the ordinary roadmap
 * underlines it dashed.
 */
const ROADMAP_BASIS_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["phases"])

/**
 * The compositions that draw what a roadmap's phases may carry beyond their
 * title, period and rows: how long each lasts (`duration`), the check held as
 * it ends (`checkpoint`) and what it covers (`points`). A page whose roadmap
 * carries any of them is offered to these alone; the ordinary roadmap adds
 * the length to the period line, the points under the title and the
 * checkpoint as a tag under them.
 */
const ROADMAP_PHASE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["syllabus", "runway", "floorplan", "tenure", "sequence"])

function asksForRoadmapPhases(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "roadmap" && component.items.some((item) => item.duration !== undefined || item.checkpoint !== undefined || item.points !== undefined),
  )
}

/**
 * The compositions that draw a table's marked column (`columns[].emphasis`)
 * and a column's icon (`columns[].icon`). A page whose table carries either
 * is offered to these alone; the ordinary table outlines the marked column
 * and sets the icon before each of its cells.
 */
const TABLE_COLUMN_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["rivals", "loop", "remedies", "tabulation", "daily"])

function asksForTableColumnMarks(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "data_table" && component.columns.some((col) => col.emphasis !== undefined || col.icon !== undefined))
}

/**
 * The compositions that draw what a gantt may carry beyond its bars and
 * their lines: the stretch its axis runs over (`range`), a row's icon and a
 * row's period. A page whose gantt carries any of them is offered to these
 * alone; the ordinary gantt runs its axis over the range, sets the icon
 * before the row's label and the period under it.
 */
const GANTT_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["bets", "timetable", "itinerary"])

function asksForGanttDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "gantt" && (component.range !== undefined || component.items.some((item) => item.icon !== undefined || item.period !== undefined)))
}

/**
 * The compositions that draw a gantt's marked spans (`bands`), each tinted
 * behind the bars and named under the axis. A page whose gantt carries one
 * is offered to these alone; the ordinary gantt tints each span and names it
 * in a line under its axis.
 */
const GANTT_BAND_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["timetable"])

function asksForGanttBands(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "gantt" && component.bands !== undefined)
}

/**
 * The compositions that draw what icon cards may carry beyond their icon,
 * title, text and tag: a title over the set (`title`) and the kind of news a
 * card is (`items[].tone`). A page whose icon cards carry either is offered
 * to these alone; the ordinary cards set the title over them and draw a
 * card's icon in the theme's ink for its news.
 */
const ICON_CARD_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["safeguards", "badges"])

function asksForIconCardDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "icon_cards" && (Boolean(component.title?.trim()) || component.items.some((item) => item.tone !== undefined)))
}

/**
 * The compositions that draw a chart's title (`title`), the name set over
 * it. A page whose chart carries one is offered to these alone; the ordinary
 * chart sets the title over it as a table does.
 */
const CHART_TITLE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["ladder", "backdrop", "thresholds", "partition", "chronicle", "measures", "headline", "census", "contrast", "bracket", "mix", "twins", "bases", "checkup", "swing", "podiums", "toll", "proof", "uplift"])

function asksForChartTitle(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && Boolean(component.title?.trim()))
}

/**
 * The compositions that draw a line chart's markers (`markers`), the dashed
 * lines where a category begins. A page whose chart carries one is offered
 * to these alone; the ordinary line draws each marker with its label over
 * the plot.
 */
const CHART_MARKER_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["thresholds"])

function asksForChartMarkers(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.markers !== undefined)
}

/**
 * The compositions that draw a scatter series joined as steps
 * (`series[].steps`). A page whose chart carries one is offered to these
 * alone; the ordinary scatter draws the staircase.
 */
const CHART_STEP_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["ladder", "handscroll"])

function asksForChartSteps(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.steps === true))
}

/**
 * The compositions that draw a milestone still to come (`status`). A page
 * whose timeline carries one is offered to these alone; the ordinary
 * timeline draws its node hollow.
 */
const MILESTONE_STATUS_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["cadence", "lapse"])

function asksForMilestoneStatus(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "timeline" && component.milestones.some((m) => m.status !== undefined))
}

/**
 * The compositions that draw a symbol before a bar's category
 * (`series[].data[].icon`). A page whose chart carries one is offered to
 * these alone; the ordinary bar on its side sets each symbol in a column of
 * its own before the names.
 */
const CHART_ICON_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["measures", "elapsed"])

function asksForChartIcons(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.icon !== undefined)))
}

/**
 * The compositions that keep a place for a category with no published value
 * (`gaps`). A page whose chart carries one is offered to these alone; the
 * ordinary bar draws a dashed outline there with its label, and the
 * ordinary line breaks there.
 */
const CHART_GAP_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["headline", "census", "contrast"])

function asksForChartGaps(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.gaps !== undefined)
}

/**
 * The compositions that draw the value ranges a bar chart on its side marks
 * (`bands`), such as what a value below zero means. A page whose chart
 * carries them is offered to these alone; the ordinary bar on its side tints
 * each range down the rows and names it in a row over the plot.
 */
const CHART_SIDE_BAND_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["effects", "decades"])

function asksForSideBands(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.chart_type === "bar" && component.direction === "horizontal" && (component.bands?.length ?? 0) > 0)
}

/**
 * The compositions that draw what a gantt marks beyond its stretches: a
 * single moment across the bars (`milestones`) and a stretch not settled
 * (`items[].basis`). A page whose gantt carries either is offered to these
 * alone; the ordinary gantt draws a moment as a line with a diamond under
 * the bars and an unsettled stretch dashed.
 */
const GANTT_MOMENT_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["itinerary"])

function asksForGanttMoments(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "gantt" && (component.milestones !== undefined || component.items.some((item) => item.basis !== undefined)))
}

/**
 * The compositions that draw a waterfall's title (`title`), the name set
 * over the bridge. A page whose waterfall carries one is offered to these
 * alone; the ordinary waterfall sets the title over it as a table does.
 */
const WATERFALL_TITLE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["waiver", "credit"])

function asksForWaterfallTitle(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "waterfall" && Boolean(component.title?.trim()))
}

/**
 * The compositions that draw a bar worked out from published figures
 * (`data[].status: "estimate"`). A page whose chart carries one is offered
 * to these alone, so no hand-set plot draws an estimate as a reported bar;
 * the ordinary chart draws it pale inside a dashed outline and names it in
 * its legend.
 */
const CHART_ESTIMATE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["checkup"])

function asksForChartEstimate(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.status === "estimate")))
}

/**
 * The compositions that draw the page's ballot (`Slide.ballot`), a box for
 * each choice beside every question. A page with one is offered to these
 * alone; the face declares the ballot dropped when none takes the page.
 */
const BALLOT_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["quiz", "asks", "requests"])

/**
 * The compositions that set the page's stamp (`Slide.stamp`) where their
 * board drew it: luxe's reply card down its torn stub. A page with one is
 * offered to these alone; the face declares the stamp dropped when none
 * takes the page.
 */
const STAMP_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["reply", "givens", "derivation", "cascade", "exercises"])

/**
 * The compositions that keep the part of a picture an author named
 * (`image.crop`, `image_grid.items[].crop`). A page whose picture carries
 * one is offered to these alone; the ordinary image and grid crop it.
 */
const IMAGE_CROP_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["collage", "thread", "shades", "atelier", "parade", "look", "specimen", "lenses", "cabinet", "tower", "confluence", "givens", "exercises", "aside", "stations", "results", "credo", "casefile", "headcount"])

function asksForImageCrop(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => (component.type === "image" && component.crop !== undefined) || (component.type === "image_grid" && component.items.some((item) => item.crop !== undefined)))
}

function asksForRoadmapBasis(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "roadmap" && component.items.some((item) => (item.rows ?? []).some((row) => row.basis !== undefined)))
}

function asksForChartTag(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.tag !== undefined)
}

/**
 * Asks each composition in `ids` in turn whether it takes these components,
 * and returns the first drawing, or `null` when none of them does.
 */
export function compose(props: CompositionProps, ids: readonly CompositionId[] = COMPOSITION_IDS): React.ReactElement | null {
  // What a composition hands on is drawn under the page's tag it has set.
  const handOn: CompositionProps["handOn"] = (components, rect) =>
    compose({ ...props, components, rect, pageTag: undefined, ballot: undefined, stamp: undefined, claim: undefined, source: undefined, kicker: undefined }, ids)
  const marked = asksForChartMarks(props.components)
  const tagged = asksForChartTag(props.components)
  const banded = (props.tagBand ?? 0) > 0
  const detailed = asksForTimelineDetail(props.components)
  const noted = asksForCalloutDetail(props.components)
  const footed = asksForWaterfallNote(props.components)
  const referenced = asksForChartReference(props.components)
  const annotated = asksForChartNote(props.components)
  const ranged = asksForChartRange(props.components)
  const labelled = asksForChartRunLabel(props.components)
  const pending = asksForRoadmapBasis(props.components)
  const phased = asksForRoadmapPhases(props.components)
  const scheduled = asksForGanttDetail(props.components)
  const seasoned = asksForGanttBands(props.components)
  const columned = asksForTableColumnMarks(props.components)
  const carded = asksForIconCardDetail(props.components)
  const captioned = asksForChartTitle(props.components)
  const thresholded = asksForChartMarkers(props.components)
  const stepped = asksForChartSteps(props.components)
  const awaited = asksForMilestoneStatus(props.components)
  const momentous = asksForGanttMoments(props.components)
  const iconed = asksForChartIcons(props.components)
  const gapped = asksForChartGaps(props.components)
  const sideBanded = asksForSideBands(props.components)
  const estimated = asksForChartEstimate(props.components)
  const bridged = asksForWaterfallTitle(props.components)
  const cropped = asksForImageCrop(props.components)
  for (const id of ids) {
    if (marked && !CHART_MARK_COMPOSITIONS.has(id)) continue
    if (detailed && !TIMELINE_DETAIL_COMPOSITIONS.has(id)) continue
    if (noted && !CALLOUT_DETAIL_COMPOSITIONS.has(id)) continue
    if (footed && !WATERFALL_NOTE_COMPOSITIONS.has(id)) continue
    if (referenced && !CHART_REFERENCE_COMPOSITIONS.has(id)) continue
    if (annotated && !CHART_NOTE_COMPOSITIONS.has(id)) continue
    if (ranged && !CHART_RANGE_COMPOSITIONS.has(id)) continue
    if (labelled && !CHART_RUN_LABEL_COMPOSITIONS.has(id)) continue
    if (pending && !ROADMAP_BASIS_COMPOSITIONS.has(id)) continue
    if (phased && !ROADMAP_PHASE_COMPOSITIONS.has(id)) continue
    if (scheduled && !GANTT_DETAIL_COMPOSITIONS.has(id)) continue
    if (seasoned && !GANTT_BAND_COMPOSITIONS.has(id)) continue
    if (columned && !TABLE_COLUMN_COMPOSITIONS.has(id)) continue
    if (carded && !ICON_CARD_DETAIL_COMPOSITIONS.has(id)) continue
    if (captioned && !CHART_TITLE_COMPOSITIONS.has(id)) continue
    if (thresholded && !CHART_MARKER_COMPOSITIONS.has(id)) continue
    if (stepped && !CHART_STEP_COMPOSITIONS.has(id)) continue
    if (awaited && !MILESTONE_STATUS_COMPOSITIONS.has(id)) continue
    if (momentous && !GANTT_MOMENT_COMPOSITIONS.has(id)) continue
    if (iconed && !CHART_ICON_COMPOSITIONS.has(id)) continue
    if (gapped && !CHART_GAP_COMPOSITIONS.has(id)) continue
    if (sideBanded && !CHART_SIDE_BAND_COMPOSITIONS.has(id)) continue
    if (estimated && !CHART_ESTIMATE_COMPOSITIONS.has(id)) continue
    if (bridged && !WATERFALL_TITLE_COMPOSITIONS.has(id)) continue
    if (cropped && !IMAGE_CROP_COMPOSITIONS.has(id)) continue
    if (tagged && !CHART_TAG_COMPOSITIONS.has(id)) continue
    if (banded && !TAG_BAND_COMPOSITIONS.has(id)) continue
    if (props.pageTag && !PAGE_TAG_COMPOSITIONS.has(id)) continue
    if (props.ballot && !BALLOT_COMPOSITIONS.has(id)) continue
    if (props.stamp && !STAMP_COMPOSITIONS.has(id)) continue
    const drawn = COMPOSITIONS[id]({ ...props, handOn })
    if (drawn) return drawn
  }
  return null
}
