---
"@liustack/pptwise": patch
---

When `validate` refuses a cover, chapter or ending heading that is too long for its face, it now counts the heading's own characters or words and quotes the part the face holds. It used to count a stock sentence of ordinary words, so a heading of six long English words could be refused as holding "about 12 words at most".
