---
"@liustack/pptwise": minor
---

A deck can carry `course`: the stages a talk runs through in order (`stages`, two to eight, each a `label` and an optional `quiz: true`), such as the parts and quizzes of a lesson. A page names the stage it belongs to with `stage`, written as that stage's label, and a face that has a place for it draws the course as a strip of pills with the page's stage lit and a quiz stage dashed. validate refuses a `stage` on a face with no place for it, a stage the course does not have, a stage on a deck with no course, a repeated stage label, and a strip wider than its room. The spec carries `course`, and page files may fill `stage`.
