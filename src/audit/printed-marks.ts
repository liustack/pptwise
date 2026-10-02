/*
 * Printed marks: a `**…**` run some renderer set as text instead of as
 * emphasis. The author marked a phrase and the reader got four asterisks
 * around it, with nothing on the page to say a renderer missed the mark. No
 * renderer stamps this, since the one that misses it never parsed the marks,
 * so the check reads the painted text. The deck audit and the gallery's L1
 * both ask it.
 */

/** An opening mark: two asterisks with a word right after them. */
const PRINTED_MARK_RE = /\*\*\S/u

/** Whether one line of painted text prints an emphasis mark. */
export function printsMark(text: string): boolean {
  return PRINTED_MARK_RE.test(text)
}

/** The text elements under `root` that print an emphasis mark. */
export function printedMarks(root: Element): Element[] {
  return Array.from(root.querySelectorAll("text")).filter((el) => printsMark(el.textContent ?? ""))
}
