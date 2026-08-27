import type { ReactNode } from "react"

export type DecorPieceRole = "structure" | "identity"

/**
 * One named decoration piece. Paint stays on the leaves. svg2pptx ignores
 * this attribute and does not inherit fill/stroke/opacity from the group.
 *
 * `role` is the three-tier depth mark, never a guess at a hex:
 * - `structure`: page chrome (a Swiss top bar, a memo rule). Partition
 *   lifts it into the foreground. Theme color, no fade, no intensity cap.
 * - `identity`: a midground mark whose color is the theme (an ink seal).
 *   Stays under type. The intensity ceiling does not touch it.
 * Ordinary pieces omit `role` and recede under the 3:1 ceiling.
 */
export function DecorPiece({
  id,
  role,
  children,
}: {
  id: string
  role?: DecorPieceRole
  children: ReactNode
}) {
  return (
    <g
      data-decor-piece={id}
      data-decor-role={role}
      data-identity={role === "identity" ? "true" : undefined}
    >
      {children}
    </g>
  )
}
