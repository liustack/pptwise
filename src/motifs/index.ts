import type { Motif, MotifId } from "./types"
import { CornerOrnamentMotif } from "./motif-corner-ornament-motif"
import { RailMotif } from "./motif-rail-motif"
import { BannerMotif } from "./motif-banner-motif"
import { PosterMotif } from "./motif-poster-motif"
import { ToneAdaptiveMotif } from "./motif-tone-adaptive-motif"
import { ConstellationMotif } from "./motif-constellation-motif"
import { RallyMotif } from "./motif-rally-motif"
import { ProposalMotif } from "./motif-proposal-motif"
import { HomeroomMotif } from "./motif-homeroom-motif"
import { InkMotif } from "./motif-ink-motif"
import { LuxeMotif } from "./motif-luxe-motif"
import { BulletinMotif } from "./motif-bulletin-motif"
import { ClinicMotif } from "./motif-clinic-motif"
import { AlmanacMotif } from "./motif-almanac-motif"
import { EmberMotif } from "./motif-ember-motif"
import { VermilionMotif } from "./motif-vermilion-motif"
import { CrayonMotif } from "./motif-crayon-motif"
import { LectureMotif } from "./motif-lecture-motif"
import { SwissMotif } from "./motif-swiss-motif"
import { MemoMotif } from "./motif-memo-motif"
import { GaugeMotif } from "./motif-gauge-motif"
import { CrayonboxMotif } from "./motif-crayonbox-motif"
import { FolioMotif } from "./motif-folio-motif"
import { RunwayMotif } from "./motif-runway-motif"
import { MuseumMotif } from "./motif-museum-motif"

export type { Motif, MotifId } from "./types"

// Wave 3 motif 注册表：六 motif id（每主题一个）已随各自的 content 任务
// 全部迁完，terminal 的 constellation-motif 是最后一个（Wave 3 Task 22）——收紧
// 回完整 Record，不再是 Partial 过渡态（沿用 chapter 页型在 Wave 2 收尾任务
// 的同一模式，见 index-chapter.ts）。
export const MOTIFS: Record<MotifId, Motif> = {
  "corner-ornament-motif": CornerOrnamentMotif,
  "rail-motif": RailMotif,
  "banner-motif": BannerMotif,
  "poster-motif": PosterMotif,
  "constellation-motif": ConstellationMotif,
  "tone-adaptive-motif": ToneAdaptiveMotif,
  "rally-motif": RallyMotif,
  "homeroom-motif": HomeroomMotif,
  "ink-motif": InkMotif,
  "luxe-motif": LuxeMotif,
  "bulletin-motif": BulletinMotif,
  "clinic-motif": ClinicMotif,
  "almanac-motif": AlmanacMotif,
  "ember-motif": EmberMotif,
  "vermilion-motif": VermilionMotif,
  "crayon-motif": CrayonMotif,
  "lecture-motif": LectureMotif,
  "swiss-motif": SwissMotif,
  "memo-motif": MemoMotif,
  "gauge-motif": GaugeMotif,
  "crayonbox-motif": CrayonboxMotif,
  "folio-motif": FolioMotif,
  "proposal-motif": ProposalMotif,
  "runway-motif": RunwayMotif,
  "museum-motif": MuseumMotif,
}
