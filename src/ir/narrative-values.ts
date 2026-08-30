// Import-free vocabulary leaf shared by the IR, narrative resolver, theme
// menu, and layout registry without introducing a dependency cycle.
export const STRATEGY_VALUES = ["pyramid", "storytelling", "instructional", "showcase", "briefing"] as const
export const PACING_VALUES = ["dense", "balanced", "spacious"] as const
export const AUDIENCE_VALUES = ["executive", "technical", "customer", "public"] as const

/**
 * The complete page-kind vocabulary for content slides. A kind is the
 * semantic posture shared by a spec and a theme menu. It is not a layout,
 * pacing hint, component type, or inferred property of filled content.
 */
export const KIND_VALUES = [
  /** Points advance an ordered argument whose sequence matters, unlike a reorderable list. */
  "points",
  /** List presents peer items whose order may change, unlike the progression carried by points. */
  "list",
  /** Comparison places alternatives side by side, rather than expressing sequence or containment. */
  "comparison",
  /** Process shows directed steps, a timeline, or a cycle, not merely an ordered argument. */
  "process",
  /** Data makes a set of numbers or a table the subject, while fact reserves the page for one number. */
  "data",
  /** Photo makes the image itself the content, while evidence uses an exhibit to support a claim. */
  "photo",
  /** Statement gives the author's own proposition a full page, unlike words attributed to another speaker. */
  "statement",
  /** Quote borrows another speaker's words, unlike an unattributed authorial statement. */
  "quote",
  /** Fact builds impact around one number, while data reveals structure across a numeric set. */
  "fact",
  /** Evidence pairs one assertion with one exhibit, so the exhibit serves the claim rather than standing alone. */
  "evidence",
  /** Hierarchy expresses containment, levels, or composition, not temporal flow or two-sided contrast. */
  "hierarchy",
] as const
