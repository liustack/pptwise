# museum, Moon soil science talk sample, 2026-10-08

The round that redrew museum to one approved board: an eighteen-page Chinese and English weekend science talk at a museum, 「从月球背面带回来的土」 ("Soil from the Far Side of the Moon"), in which the lunar samples Chang'e-5 and Chang'e-6 brought back are shown as exhibits, one at a time. It runs the way a visit runs: the catalogue cover, a floor plan of four halls and seven exhibits, the foyer (two missions and two jars, then the haul set beside Apollo's and Luna's as squares to scale), the first hall (a basalt about 2 billion years old beside its label, the water in the soil on one log scale, beads and new minerals under the microscope), the second hall (the far side's 2.8-billion-year basalt beside its label, the oldest fragment in a pool of light, the mantle's water and oxygen on one log scale), and the third hall (two missions and their papers at their true distance in time, where the 3,666.3 grams went, five questions still open on blank labels, what to read on a label next time), and the lights going down. It made museum a darkened gallery: the hall's name small in copper over a seam at the top of every page, a quiet serif claim across the whole measure, the exhibits in pools of warm light and their photographs cut round like objects under a lamp, each exhibit's label on a board with a copper edge, and the page number on a door plate. It settled a content page that hands its body to the compositions in a new `placard` setting, eleven new compositions, a cover, a chapter page, a close and a new motif.

## Source

- `design-gen.py` writes every board page as absolutely positioned HTML at 1280 by 720. It is the only source of the boards' geometry. Its photograph references are placeholders the design tool filled in, so the script records the boards rather than rebuilding them outside that tool.
- The `museum.board.png` files in the part folders are those pages rendered at 1280 by 720 in a browser with the sample's photographs. The `museum.engine.png` files are `pptwise preview` of the Chinese showcase deck ([showcase/museum/zh](../../../showcase/museum/zh/)), rasterized with `rsvg-convert`. The board and the engine show the same deck, so the words match as well as the drawing, except where the decisions below say otherwise.
- The board was set in Songti SC and PingFang. `rsvg-convert` has no SimSun and no Microsoft YaHei, the faces the deck names, and sets the preview in Times New Roman, Songti and PingFang. PowerPoint's PDF export of the sample sets it in Times New Roman, SimSun and Microsoft YaHei.

## The design system

Every museum page follows these, not only the pages the sample uses. [docs/design-museum.md](../../../docs/design-museum.md) states them for the next round.

1. The hall and the door plate: at the top left the hall the page stands in, 11px in copper tracked 4px (the page's `kicker`, 「第一展厅 · 月球正面的土」), a seam across the page under it on y58. At the bottom left the talk's own label, 10px in the dim tracked 2px (the deck's `organization` and the footer's `label`). At the bottom right the page number at 14px in the serif inside a 60 by 28 frame, like the plate on a gallery's door.
2. The serif claim: 32/44 in the heading serif at its regular weight across x64 to x1216, on one line whenever it fits, a point or two smaller if that keeps it there, broken at a comma or a colon when it does not, its last line ending on y154 whether it has one line or two.
3. A pool of warm light: an exhibit stands in a round glow of the paper with a quarter of the copper in it, fading to nothing at its rim, 14 to 20% at its centre. PowerPoint draws it as a round gradient.
4. The label: a board a step lighter than the hall with a 2px copper edge along its top, the exhibit's number small and tracked in copper (「展品 1」, written by the author), its name in the serif, its age or date in a lit copper, a few lines of fact in old paper, a seam, a small copper label and the line it reads aloud in the serif (「它让我们知道」), and the source at its foot.
5. Copper once a page: the one thing a page is about. Everything else is warm paper, old paper, a dimmer old paper for captions and sources, and seams.
6. Colours: the brown-black hall `#211A12`, the label board `#2B241A`, the case `#322A1E`, copper `#BE7A28`, warm paper `#F4ECD8`, old paper `#C2B394`, the dim about `#8E826A` (the old paper two thirds of the way from the hall), the lit copper about `#DC9F57` (the copper fifteen points lighter), the warm light about `#E7D0AC`, seams `#403628`.
7. Photographs illustrate rather than prove: a sample jar under a lamp, a basalt thin section, a basalt fragment on velvet, impact and volcanic glass beads, a crystal, a display case with a blank label. None shows a face, readable text or a logo. Each page says it is an AI illustration and not a photograph of a sample.

## Pages and the parts they settled

| board page | part | folder |
| :-- | :-- | :-- |
| every content page | motif `museum-motif` (new) | [motifs/museum-motif](../../motifs/museum-motif/) |
| every content page | face `placard-sheet` (new), compositions in the `placard` setting (new), the page's `kicker` as its hall | [faces/placard-sheet](../../faces/placard-sheet/) |
| p01 cover | face `placard-cover` (new) | [faces/placard-cover](../../faces/placard-cover/) |
| p02 the floor plan | composition `floorplan` (new) | [compositions/floorplan](../../compositions/floorplan/) |
| p03 two jars | composition `jars` (new) | [compositions/jars](../../compositions/jars/) |
| p04 beside Apollo | composition `squares` (new) | [compositions/squares](../../compositions/squares/) |
| p05, p09, p13 the halls | face `placard-chapter` (new) | [faces/placard-chapter](../../faces/placard-chapter/) |
| p06, p10 an exhibit and its label | composition `specimen` (new), round pictures (new) | [compositions/specimen](../../compositions/specimen/) |
| p07, p12 ranges on a log scale | composition `decades` (new) | [compositions/decades](../../compositions/decades/) |
| p08 under the microscope | composition `lenses` (new) | [compositions/lenses](../../compositions/lenses/) |
| p11 the oldest fragment | composition `halo` (new) | [compositions/halo](../../compositions/halo/) |
| p14 the papers in time | composition `dateline` (new) | [compositions/dateline](../../compositions/dateline/) |
| p15 where the soil went | composition `slice` (new) | [compositions/slice](../../compositions/slice/) |
| p16 what we still don't know | composition `blanks` (new) | [compositions/blanks](../../compositions/blanks/) |
| p17 next time | composition `cabinet` (new) | [compositions/cabinet](../../compositions/cabinet/) |
| p18 the lights going down | face `placard-ending` (new) | [faces/placard-ending](../../faces/placard-ending/) |

The compositions read the `placard` setting from the face that offers them (`CompositionSetting` in [`src/layouts/compositions/shared.tsx`](../../../src/layouts/compositions/shared.tsx)). The inks, the glow, round photographs, captions and the claim and source columns are in [`placard.tsx`](../../../src/layouts/compositions/placard.tsx), the hall sign, the door plate, the claim and the source in [`placard-shared.tsx`](../../../src/layouts/placard-shared.tsx). Text is fitted and painted by the lineup setting's helpers with this setting's exemption. Every ink comes from the theme's tokens: the page for the hall, the surface for the label board, the primary for the case, the text and the muted for the paper, the border for the seams, the accent for the copper. The tests draw each composition on museum and on runway and crayon, two pale themes that share nothing with it, and each face on runway and crayon.

## Decisions

Where the engine departs from the board, it does so on purpose, for these reasons.

1. The heading face is Times New Roman with SimSun. Museum's heading was SimSun alone, whose Latin figures PowerPoint sets monospaced, so 「1,731」 printed as 「1, 731」. The board was set in Songti SC, whose figures Times New Roman matches closely.
2. The hall sign, the talk's label and the door plate are the theme's motif, `museum-motif`, because the page number belongs to the footer row and only a motif paints it in a place of its own. Museum carried no motif since 2026-08, when its corner pins and its tick were struck as decoration. These carry no decoration, only words, one seam and a frame, as a structural piece (`data-decor-role="structure"`). The cover, the chapter pages and the close draw their own hall sign.
3. The page number is PowerPoint's slide-number field, which keeps counting when pages move, so it reads 「2」 where the board printed 「02」. A field cannot be padded. The chapter face draws the door plate itself, as the board did.
4. A pool of light is a circle filled with a radial gradient from the warm light to nothing. The export moves every stop in by 1/√2, because DrawingML's circle path ends on the circle through the shape's corners and SVG's default ends on the inscribed one. Before, the glow stopped short of nothing in PowerPoint and showed a hard rim.
5. A round photograph is cut by a clip of one circle, which the exportable subset now admits, and PowerPoint draws it with its ellipse geometry. The microscope's dotted copper stage (`stroke-dasharray="1 18"`) and the log scale's dotted lines print as PowerPoint's nearest preset dash.
6. The floor plan (p02) is a `roadmap`: each room a phase, what it holds its `period`, its exhibits its `points`, numbered across the visit. A room with no exhibits shows its one `icon` where the board drew a rocket and a moon. The rooms' widths follow what they hold: a room of two exhibits or more is 300px and the others share the rest (252px where the board drew 250 and 254). The source, 「虚线为参观路线」, stands at the board's place for that line at the source's size.
7. The two jars (p03) are a `kpi_cards` of two, each sample's tag naming the side its plate stands for, over a `comparison` whose columns are the two samples. Each particular is set after its row's name, small and dim (「往返」, 「取样」), which the board left off: every word an author writes is drawn.
8. The squares (p04) name what they count, the chart's series, small over them (「带回的月球样品」), which the board left off. A figure that does not fit beside the squares gives up to three tenths of its size (the English 「About 104 times」).
9. An exhibit's number, name, age, facts and line (p06, p10) are a `kpi_cards` of one (its `tag` the number, its value and unit the age, its label the name), a `bullets` and a `paragraph` that opens with 「它让我们知道：」. The line breaks at its comma, as the board broke it.
10. On the log scales (p07, p12) a range's second line is the second line of its category (`"撞击玻璃珠\n太阳风来源，不到 15 年补满一次"`) and where it comes from is its `note`. The scale is named by the series and its unit, and says it is a log scale. The board's 「28.5 至 170 以上」 is 「28.5 至 170」 with 「上限至少 170」 under the name, as the paper puts it. On p12 the unmarked ranges are both old paper, where the board set Chang'e-5's in paper.
11. The microscope (p08): the board's line under the impact beads, 「约 3000 颗里取样分析」, belongs to the volcanic beads' study. The page says what the impact beads' study did, 「约 1 克月壤里挑出 117 颗，测了 32 颗」 (Nature Geoscience, 2023).
12. The oldest fragment (p11) is a `fact` page with a claim and one figure: the figure in a pool of light, the claim under it as the line it answers to. A deck project could not set it before: the old fact face declined a page with both.
13. The mantle (p12): the board's note under the far side's oxygen figure, 「5 克月壤里筛出 578 颗颗粒」, belongs to the water study. The page says 「嫦娥六号，23 块玄武岩碎屑」 (Nature Communications, 2025).
14. The timeline (p14) lays its events at their true dates, the missions (`highlight`) as copper lamps. Two papers of 2021 are 「Science、Nature」, in the order they came out, so no two labels repeat.
15. Where the soil went (p15) is a share bar of two parts: the marked one in copper, its line the chart's `emphasis_label`, the rest named small inside the bar, which the board left unnamed. The card whose title names the marked part gets the copper edge.
16. The blank labels (p16) are `numbered_cards` whose items all carry the same `sub`, the verdict still open (「尚无定论」). The engine writes each label's number in the deck's language (「问题 1」, "Question 1"). A label whose line takes two lines moves its verdict down.
17. The close (p18) keeps every line the author broke its subheading into.
18. Every photograph is an AI illustration made for the talk. None shows a face, readable text, a flag or a logo, and each page says so.
