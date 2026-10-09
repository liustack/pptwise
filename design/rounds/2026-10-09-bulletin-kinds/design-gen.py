import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# bulletin: the IKB institutional wall. Three page kinds it never had: statement, fact, evidence.
IKB = "#0032A0"; WALL = "#F7F7F4"; SURF = "#FFFFFF"; PANEL = "#F0F0EC"; INK = "#17181A"; MUTED = "#5C6066"
LINE = "#DEE0DB"; GREY = "#C2C6CC"; GREY2 = "#8E939A"; TINT = "#E6EAF6"; TINT2 = "#D3DDF0"
FONT = "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif"
SHOW = os.path.join(ROOT, "..", "..", "..", "showcase", "bulletin")


def src(lang, page):
    return json.load(open(os.path.join(SHOW, lang, "pages", page + ".json")))["footnote"]


def page(title, inner, bg=WALL, color=INK, w=1280, h=720, lang="zh-CN"):
    return """<!doctype html>
<html lang=\"""" + lang + """">
<head>
<meta charset="utf-8">
<title>""" + title + """</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + bg + "; color: " + color + "; font-family: " + FONT + """">
""" + inner + """
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":""" + str(w) + ""","height":""" + str(h) + """}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
"""


def box(x, y, w, h, style="", content=""):
    s = "position: absolute; left: %dpx; top: %dpx; width: %dpx; " % (x, y, w)
    if h is not None:
        s += "height: %dpx; " % h
    return '<div style="' + s + style + '">' + content + '</div>\n'


def font(size, lh, color=INK, weight=400, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def mark(s):
    return '<span style="color: %s">%s</span>' % (IKB, s)


def motif(x=1158, y=58, c=IKB, s=(14, 10, 7), gap=5):
    out = ""; cx = x
    for v in s:
        out += box(cx, y + s[0] - v, v, v, "background: " + c)
        cx += v + gap
    return out


def head(title, x=80, w=1040, rule_w=1120):
    out = box(x, 44, w, 100, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, INK, 700), title)
    out += box(x, 163, rule_w, 1, "background: " + LINE) + box(x, 162, 96, 3, "background: " + IKB)
    return out + motif()


def source(t_, x=80, y=626, w=1120):
    # the last line sits on y666, as on every bulletin content page
    return box(x, y, w, 46, "display: flex; flex-direction: column; justify-content: flex-end; " + font(14, 20, MUTED), "<div>" + t_ + "</div>")


def svg(body, defs=""):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + FONT.replace("'", "") + '"><defs>' + defs + '</defs>' + body + '</svg>\n'


def t(x, y, s, size=16, fill=MUTED, anchor="start", weight=400):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


HATCH = '<pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="' + TINT2 + '"/><rect width="3" height="8" fill="' + IKB + '"/></pattern>'


# ---- statement: the sentence is the page. No claim header above it: the sentence takes the header's place and grows.
def statement(sentence, support, src_=None):
    # the block stands centred between the motif and the source, so a one-line sentence does not float under an empty band
    c = motif()
    inner = '<div style="width: 96px; height: 6px; background: %s"></div>' % IKB
    inner += '<div style="margin-top: 30px; width: 1080px; word-break: keep-all; %s">%s</div>' % (font(60, 80, INK, 700, "letter-spacing: -0.5px"), sentence)
    inner += '<div style="margin-top: 30px; width: 1120px; height: 1px; background: %s"></div>' % LINE
    inner += '<div style="margin-top: 22px; width: 960px; word-break: keep-all; %s">%s</div>' % (font(22, 34, MUTED), support)
    c += box(80, 110, 1120, 500, "display: flex; flex-direction: column; justify-content: center", inner)
    if src_:
        c += source(src_)
    return c


# ---- fact: the claim header, then one figure set as large as the page allows, the context in grey under a hairline.
def fact(claim, label, figure, unit, context, src_):
    c = head(claim)
    c += box(80, 212, 1120, 30, font(22, 30, INK), label)
    c += box(72, 240, 1128, 230, font(210, 230, IKB, 700, "letter-spacing: -6px; white-space: nowrap"), figure + '<span style="font-size: 60px; letter-spacing: 0; margin-left: 18px">' + unit + '</span>')
    c += box(80, 500, 1120, 1, "background: " + LINE)
    w = 1120 // len(context)
    for i, (v, l_) in enumerate(context):
        x = 80 + i * w
        if i:
            c += box(x - 24, 524, 1, 76, "background: " + LINE)
        c += box(x, 520, w - 40, 44, font(34, 44, INK, 700, "white-space: nowrap"), v)
        c += box(x, 568, w - 40, 24, font(16, 24, MUTED), l_)
    c += source(src_)
    return c


# ---- evidence: the claim header, one exhibit on a white sheet with its caption, one IKB ring on the place that proves it,
# and the reading beside it, numbered to the ring.
def evidence(claim, caption, exhibit, ring, read_label, reading, notes, src_):
    c = head(claim)
    c += box(80, 196, 740, 420, "background: %s; border: 1px solid %s; box-sizing: border-box" % (SURF, LINE))
    c += box(104, 214, 680, 22, font(15, 22, MUTED), caption)
    rx, ry, rw, rh = ring
    s = exhibit
    s += '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="10" fill="none" stroke="%s" stroke-width="2.5"/>' % (rx, ry, rw, rh, IKB)
    s += '<line x1="%.1f" y1="%.1f" x2="872" y2="%.1f" stroke="%s" stroke-width="1.5"/>' % (rx + rw, ry + 26, ry + 26, IKB)
    s += '<circle cx="884" cy="%.1f" r="13" fill="%s"/>' % (ry + 26, IKB) + t(884, ry + 32, "1", 16, "#FFFFFF", "middle", 700)
    c += svg(s, HATCH)
    c += box(908, 196, 292, 22, font(16, 22, MUTED), read_label)
    c += box(908, ry + 10, 292, 100, font(21, 32, IKB, 700, "word-break: keep-all"), reading)
    y = ry + 118
    for n in notes:
        c += box(908, y, 292, 1, "background: " + LINE)
        c += box(908, y + 14, 292, 70, font(17, 27, INK, 400, "word-break: keep-all"), n)
        y += 90
    c += source(src_)
    return c


def retail_bars(lang):
    """The exhibit for the evidence page: July to September retail, last year in grey, this year in IKB, September hatched."""
    base, H, vmax = 572, 270, 250
    s = ""
    lx = 104
    for name, fill in (("2025 年", GREY), ("2026 年", IKB), ("预测", "url(#hatch)")) if lang == "zh" else (("2025", GREY), ("2026", IKB), ("Forecast", "url(#hatch)")):
        s += rect(lx, 252, 14, 14, fill) + t(lx + 22, 264, name, 15, MUTED)
        lx += 22 + len(name) * (15 if lang == "zh" else 9) + 28
    s += '<line x1="104" y1="%d" x2="796" y2="%d" stroke="%s" stroke-width="1"/>' % (base, base, GREY2)
    groups = [("7 月", 182.6, 146.1, False), ("8 月", 199.5, 154.1, False), ("9 月", 224.1, 169, True)] if lang == "zh" else \
             [("July", 182.6, 146.1, False), ("August", 199.5, 154.1, False), ("September", 224.1, 169, True)]
    slot = 692 / 3
    for i, (lab, a, b, fc) in enumerate(groups):
        cx = 104 + slot * (i + 0.5); bw = 70
        ha = a / vmax * H; hb = b / vmax * H
        fa = "%g" % a if lang == "zh" else "%.2fm" % (a / 100)
        fb = "%g" % b if lang == "zh" else "%.2fm" % (b / 100)
        s += rect(cx - bw - 4, base - ha, bw, ha, GREY) + t(cx - bw / 2 - 4, base - ha - 10, fa, 17, MUTED, "middle")
        s += rect(cx + 4, base - hb, bw, hb, "url(#hatch)" if fc else IKB) + t(cx + bw / 2 + 4, base - hb - 10, fb, 17, IKB, "middle", 700)
        s += t(cx, base + 28, lab, 16, INK, "middle")
    return s


def players_table():
    """The exhibit for the second evidence page: Q3 sales by company, as each one reported them."""
    rows = [("极氪", "110,034 辆", "约 +108%"), ("零跑", "310,052 辆", "+78.3%"), ("蔚来公司", "109,178 辆", "+25.4%"),
            ("比亚迪", "1,323,065 辆", "+18.8%"), ("理想", "99,964 辆", "+7.2%"), ("小鹏", "118,390 辆", "+2.1%")]
    s = t(104, 272, "企业", 16, MUTED) + t(520, 272, "三季度销量", 16, MUTED, "end") + t(760, 272, "同比", 16, MUTED, "end")
    s += '<line x1="104" y1="286" x2="796" y2="286" stroke="%s" stroke-width="1"/>' % GREY2
    y = 286
    for i, (co, q3, yoy) in enumerate(rows):
        if co == "零跑":
            s += rect(104, y, 692, 46, TINT)
        w = 700 if co == "零跑" else 400
        col = IKB if co == "零跑" else INK
        s += t(120, y + 30, co, 19, col, "start", w) + t(520, y + 30, q3, 19, col, "end", w) + t(760, y + 30, yoy, 19, col, "end", w)
        y += 46
        s += '<line x1="104" y1="%d" x2="796" y2="%d" stroke="%s" stroke-width="1"/>' % (y, y, LINE)
    return s


pages = []  # (title, inner, reference render)

# zh
pages.append(("1 一句话（短）", statement("四季度目标，按三季度的" + mark("实际走势") + "重定",
                                       "6 月判断全年零售降 11%。按这个倒推，四季度要比三季度多卖约 65%，去年同期只多了 11%。",
                                       src("zh", "p09-target")), "zh-09"))
pages.append(("2 一句话（两行）", statement("份额在挪：比亚迪少了约 4.5 个点，拿走份额的是" + mark("新势力"),
                                         "8 月新势力占国内新能源零售 26.0%，同比多 5.5 个点。比亚迪从约 27.8% 降到 23.3%，吉利、长安、特斯拉中国也各让出 0.1 到 1.1 个点。",
                                         src("zh", "p06-share")), "zh-06"))
pages.append(("3 大数字（倍数）", fact("增量在海外：新能源出口 7–8 月是去年同期的 2.5 倍", "7–8 月新能源乘用车出口，是去年同期的",
                                      "2.5", "倍", [("105.8 万辆", "2026 年 7–8 月"), ("41.7 万辆", "2025 年 7–8 月"), ("58.4%", "8 月新能源占乘用车出口")],
                                      src("zh", "p05-export").replace("。图为示意图", "")), "zh-05"))
pages.append(("4 大数字（降幅）", fact("国内零售连续三个月同比降两成以上，9 月也没有旺季", "8 月乘用车国内零售，同比",
                                      "−23.6", "%", [("−20.9%", "7 月零售同比"), ("−29%", "9 月 1–27 日零售同比"), ("约 169 万辆", "9 月全月预测，同比 −24.6%")],
                                      src("zh", "p03-market")), "zh-03"))
pages.append(("5 论据（图表）", evidence("9 月也没有旺季：降幅没有收窄，反而更深", "图 1　乘用车国内零售，万辆", retail_bars("zh"), (564, 284, 240, 324),
                                       "怎么看", "9 月 1–27 日零售同比 −29%，比 7、8 月降得更深",
                                       ["去年 9 月比 8 月多卖 12%，今年按预测只多 10%", "9 月全月为乘联会 9 月 17 日的预测"],
                                       src("zh", "p03-market")), "zh-03"))
pages.append(("6 论据（表格）", evidence("零跑三季度卖了 31 万辆，量和涨幅都排第二", "表 1　三季度销量，各公司公告口径", players_table(), (104, 332, 692, 46),
                                       "怎么看", "零跑三季度 310,052 辆，同比 +78.3%",
                                       ["销量仅次于比亚迪，涨幅仅次于极氪", "各家口径不同，含出口，只看各自的同比方向"],
                                       src("zh", "p07-players")), "zh-07"))
# en
pages.append(("7 Statement EN", statement("Reset Q4 targets to " + mark("Q3&rsquo;s real trend"),
                                        "June&rsquo;s call for an 11% full-year fall needs Q4 retail about 65% above Q3. A year ago Q4 was only 11% above Q3.",
                                        src("en", "p09-target")), "en-09"))
pages.append(("8 Fact EN", fact("Growth went abroad: NEV exports up 154%", "NEV passenger car exports, July and August, year on year",
                               "+154", "%", [("1.058m", "July and August 2026"), ("0.417m", "July and August 2025"), ("58.4%", "NEV share of August exports")],
                               src("en", "p05-export").replace(". Photo is illustrative", "")), "en-05"))
pages.append(("9 Evidence EN", evidence("No September peak: the fall got deeper, not shallower", "Exhibit 1　Passenger car retail in China", retail_bars("en"), (564, 284, 240, 324),
                                       "How to read it", "September 1–27 retail fell 29% year on year, deeper than July or August",
                                       ["September 2025 beat August by 12%. This year's forecast: 10%", "Full-month September is the CPCA forecast of September 17"],
                                       src("en", "p03-market")), "en-03"))

boards = {}; order_ = []; cells = []
for i, (ttl, inner, ref) in enumerate(pages):
    lang = "en" if "EN" in ttl else "zh-CN"
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(ttl, inner, lang=lang))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(ttl + " 参照", '<img src="__REF_%s__" alt="同一份数据在 bulletin 现有页上的样子" style="display: block; width: 1280px; height: 720px">' % ref, lang=lang))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 现有页（参照）"}; order_.append(cur)
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (WALL, INK, FONT, inner))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/%s.png" style="width:1280px;height:720px"></div>' % ref)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "bulletin 一句话、大数字、论据页设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
