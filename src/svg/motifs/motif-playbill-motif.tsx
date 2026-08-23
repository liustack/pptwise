import type { DecorProps } from "./types"

/**
 * playbill-motif —— 空 motif。日期贴片改由 `cover-bill-head` 当封面前景画
 * （wave 7 板 `right:56px; top:64px; rotate(4deg)`，有日期才画）。
 * 仍注册为 playbill 的 motif id，chapter / content / ending 本来就不画贴片。
 *
 * 纪律：零 theme id、零 hex。本 motif 是 playbill 独占的单成员候选集。
 */
export function PlaybillMotif(_props: DecorProps) {
  return null
}
