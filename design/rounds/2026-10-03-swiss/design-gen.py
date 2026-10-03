import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

RED = "#D7282F"; INK = "#101010"; MUTED = "#5F5F5C"; BG = "#F7F7F5"; SURF = "#FFFFFF"; LINE = "#E3E3E0"; GREY = "#BDBDB8"
GREY2 = "#8A8A86"; TINT = "#FBE7E8"; PANEL = "#EDEDEA"
FONT = "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif"
PHOTO = "/_blob/1ccce45713f8fac3652943e8c82f7c57"
CUR = ["/_blob/" + i for i in ['49c5e662823d9c1c849a9803e8554b2c', '88d5da8812a26b2baf24c419a3776b06', '56b18ce981c0abd305a07446ee9f2412', '3427fd7c10e562d0feca36f1fff0dbd3', '0312d13b7888da5ed76ea52ec9b39309', '941b9c6745b3727cd2f25081ae60e23c', 'd118b5934c02c822cfd7224f3c175ea7', '93d9f1d388bc2dd2cf12e8542b968cdb', '0b310294369704842e990c52d25ab329', '60c36535c4d0470b7c17e51f07cc7057', '52f49db8788227c2770185db54106599', 'bafd6f77c2309354aed445fdf4c32ee7', '7fb63f5176858ec507e2928bd7e46c1a', '0d78c3a386f6e2377f1e7a03a18290ad']]


def page(title, inner, bg=BG, w=1280, h=720):
    return """<!doctype html>
<html lang="zh-CN">
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + bg + "; color: " + INK + "; font-family: " + FONT + """">
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


def topbar():
    return box(0, 0, 1280, 8, "background: " + RED)


def head(kicker_no, kicker, title):
    out = topbar()
    out += box(80, 44, 30, 22, font(15, 22, RED, 700), kicker_no)
    out += box(108, 44, 900, 22, font(15, 22, MUTED), kicker)
    out += box(80, 70, 1120, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, INK, 700), title)
    out += box(80, 180, 1120, 2, "background: " + INK)
    return out


def source(t, x=80, y=652, w=1120):
    return box(x, y, w, 40, font(14, 20, MUTED), t)


def svg(body, defs=""):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + FONT.replace("'", "") + '"><defs>' + defs + '</defs>' + body + '</svg>\n'


def t(x, y, s, size=16, fill=MUTED, anchor="start", weight=400):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


HATCH = '<pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="' + TINT + '"/><rect width="3" height="8" fill="' + RED + '"/></pattern>'


def rail(x, y0, items, w=360, step=136):
    """items: (label, value, sub, emphasized)"""
    out = box(x - 40, y0, 1, step * len(items) - 24, "background: " + INK)
    for i, (lab, val, sub, em) in enumerate(items):
        y = y0 + i * step
        if i:
            out += box(x, y - 16, w, 1, "background: " + LINE)
        out += box(x, y, w, 22, font(16, 22, MUTED), lab)
        out += box(x, y + 28, w, 60, font(52, 60, RED if em else INK, 700, "white-space: nowrap; letter-spacing: -1px"), val)
        if sub:
            out += box(x, y + 92, w, 22, font(16, 22, INK), sub)
    return out


def legend(x, y, items):
    s = ""
    for name, fill in items:
        s += rect(x, y - 12, 14, 14, fill) + t(x + 22, y, name, 15, MUTED)
        x += 22 + len(name) * 15 + 30
    return s


def bracket(a, b, label, col, lift=40):
    (x1, t1), (x2, t2) = a, b; yb = min(t1, t2) - lift
    return ('<path d="M%.1f %.1f V%.1f H%.1f V%.1f" fill="none" stroke="%s" stroke-width="2"/>' % (x1, t1 - 34, yb, x2, t2 - 34, col)
            + t((x1 + x2) / 2, yb - 10, label, 20, col, "middle", 700))


pages = []
CH = {1: "全球：太阳能接住了增量", 2: "中国：全球转型的支点", 3: "2026：还没有定局"}

# 1 cover
c = topbar()
c += box(80, 72, 700, 24, font(16, 24, INK, 700), "能源研究团队")
c += box(800, 72, 400, 24, font(16, 24, MUTED, 400, "text-align: right"), "2026 年 10 月")
c += box(80, 104, 1120, 1, "background: " + INK)
c += box(80, 420, 1120, 110, "display: flex; flex-direction: column; justify-content: flex-end; " + font(88, 106, INK, 700, "letter-spacing: -1px"), "2025 年全球电力年度报告")
c += box(80, 558, 120, 8, "background: " + RED)
c += box(80, 590, 1120, 36, font(26, 36, INK), "没有危机的年份里，清洁电力首次接住全部新增用电")
pages.append(("1 封面", c))

# 2 statement + three figures
c = topbar()
c += box(80, 104, 1120, 140, "display: flex; flex-direction: column; justify-content: flex-end; " + font(56, 70, INK, 700), "清洁电力接住了全部增量，但还没有定局")
c += box(80, 284, 1120, 2, "background: " + INK)
figs = [("全球用电增量", "8490", "亿千瓦时，+2.8%", False), ("清洁电力增量", "8870", "亿千瓦时，太阳能占 6360", True), ("化石发电变化", "−380", "亿千瓦时，电力排放持平", False)]
for i, (lab, val, sub, em) in enumerate(figs):
    x = 80 + i * 376
    if i:
        c += box(x - 24, 324, 1, 230, "background: " + LINE)
    c += box(x, 324, 340, 24, font(17, 24, MUTED), lab)
    c += box(x, 360, 340, 110, font(104, 110, RED if em else INK, 700, "letter-spacing: -3px; white-space: nowrap"), val)
    c += box(x, 484, 330, 28, font(19, 28, INK), sub)
c += source("来源：Ember《Global Electricity Review 2026》（2026 年 4 月）。2025 年与 2024 年相比")
pages.append(("2 结论", c))


# chapter pages with section index
def chapter(no, title, sub, items):
    c = topbar()
    c += box(80, 72, 400, 260, font(240, 260, RED, 700, "letter-spacing: -8px"), "0" + str(no))
    c += box(560, 104, 640, 116, "display: flex; flex-direction: column; justify-content: flex-end; " + font(48, 58, INK, 700), title)
    c += box(560, 228, 640, 30, font(20, 30, MUTED), sub)
    c += box(560, 300, 640, 2, "background: " + INK)
    y = 318
    for pg, it in items:
        c += box(560, y, 64, 28, font(17, 28, RED, 700), pg)
        c += box(624, y, 576, 56, font(19, 28, INK), it)
        y += 72
        c += box(560, y - 12, 640, 1, "background: " + LINE)
    return c


pages.append(("3 章节：全球", chapter(1, "全球：太阳能接住了增量", "2025 年全球电力的供需与排放",
                                    [("04", "清洁电力多发 8870 亿千瓦时，盖过了全部用电增量"), ("05", "太阳能一年多发 30%，一项覆盖了四分之三的用电增量"), ("06", "电力排放没有下降，只是持平")])))

# 4 waterfall full width
c = head("1", CH[1], "清洁电力多发 8870 亿千瓦时，盖过了全部用电增量")
base, k = 600, 0.036
s = t(80, 220, "亿千瓦时", 15, MUTED)
s += '<line x1="80" y1="%d" x2="1200" y2="%d" stroke="%s"/>' % (base, base, GREY2)
items = [("太阳能", 6360, RED), ("风电", 2050, RED), ("核电", 350, RED), ("水电及其他", 110, RED), ("化石能源", -380, GREY), ("用电增量", 8490, None)]
slot = 1120 / 6; bw = 120; run = 0; prev = None
for i, (lab, v, col) in enumerate(items):
    cx = 80 + slot * (i + 0.5); x = cx - bw / 2
    if col is None:
        top = base - v * k; s += rect(x, top, bw, v * k, INK); s += t(cx, top - 12, "8490", 22, INK, "middle", 700)
    else:
        a, b = run, run + v
        y1, y2 = base - max(a, b) * k, base - min(a, b) * k
        s += rect(x, y1, bw, max(y2 - y1, 2), col)
        lab_y = y1 - 12 if v > 0 else y2 + 26
        s += t(cx, lab_y, ("+" if v > 0 else "−") + str(abs(v)), 20, RED if col == RED else MUTED, "middle", 700 if col == RED else 400)
        if prev is not None:
            s += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-dasharray="3 3"/>' % (prev, base - a * k, x, base - a * k, GREY2)
        run = b
    prev = x + bw
    s += t(cx, base + 30, lab, 17, INK, "middle")
x1 = 80 + slot * 0.5 - bw / 2; x2 = 80 + slot * 3.5 + bw / 2; yb = base - 8870 * k - 30
s += '<path d="M%.1f %.1f V%.1f H%.1f V%.1f" fill="none" stroke="%s" stroke-width="2"/>' % (x1, yb + 14, yb, x2, yb + 14, RED)
s += t((x1 + x2) / 2, yb - 10, "清洁电力合计 +8870", 20, RED, "middle", 700)
c += svg(s)
c += source("来源：Ember（2026 年 4 月）。2025 年全球发电量同比增减，「水电及其他」含生物质，由清洁电力合计减去前三项得出")
pages.append(("4 增量瀑布", c))

# 5 solar bars + rail
c = head("1", CH[1], "太阳能一年多发 30%，一项覆盖了四分之三的用电增量")
base, H, vmax = 596, 300, 3.0
s = t(80, 220, "全球太阳能发电量，万亿千瓦时", 15, MUTED)
s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s"/>' % (base, base, GREY2)
yrs = [("2015 年", 0.26), ("2022 年", 1.33), ("2024 年", 2.14), ("2025 年", 2.78)]
slot = 680 / 4; bw = 104; tops = []
for i, (lab, v) in enumerate(yrs):
    cx = 80 + slot * (i + 0.5); h = v / vmax * H; top = base - h; tops.append((cx, top))
    last = i == 3
    s += rect(cx - bw / 2, top, bw, h, RED if last else INK)
    s += t(cx, top - 12, "%g" % v, 20, RED if last else INK, "middle", 700)
    s += t(cx, base + 30, lab, 17, INK, "middle")
s += bracket(tops[2], tops[3], "+30%", RED, 48)
c += svg(s)
c += rail(840, 214, [("用电增量由太阳能覆盖", "75%", "6360 / 8490 亿千瓦时", False), ("可再生能源发电份额", "33.8%", "煤电 33.0%。IEA 认为两者持平", False)], step=170)
c += source("来源：Ember（2026 年 4 月），IEA（2026 年 4 月、7 月）")
pages.append(("5 太阳能", c))

# 6 fact: giant number + two supporting
c = head("1", CH[1], "电力排放没有下降，只是持平")
c += box(80, 222, 700, 24, font(17, 24, MUTED), "2025 年全球电力行业排放变化")
c += box(72, 262, 700, 200, font(176, 200, INK, 700, "letter-spacing: -6px; white-space: nowrap"), "−0.04%")
c += box(80, 500, 640, 60, font(20, 30, INK), "2024 年是 +1.7%。IEA 的估算同样是持平，约 139 亿吨二氧化碳")
c += box(800, 222, 1, 340, "background: " + INK)
for i, (lab, val, sub, em) in enumerate([("电力碳强度", "458", "克二氧化碳当量/千瓦时，比 2024 年低 2.7%", False),
                                         ("能源相关二氧化碳总排放", "+0.4%", "近 384 亿吨，仍创新高", True)]):
    y = 222 + i * 176
    if i:
        c += box(840, y - 20, 360, 1, "background: " + LINE)
    c += box(840, y, 360, 24, font(16, 24, MUTED), lab)
    c += box(840, y + 30, 360, 64, font(56, 64, RED if em else INK, 700, "letter-spacing: -1px"), val)
    c += box(840, y + 100, 360, 52, font(17, 26, INK), sub)
c += source("来源：Ember（2026 年 4 月），IEA《Global Energy Review 2026》（2026 年 4 月）。Ember 为二氧化碳当量口径，IEA 为二氧化碳口径")
pages.append(("6 排放大数字", c))

pages.append(("7 章节：中国", chapter(2, "中国：全球转型的支点", "装机、发电与储能",
                                    [("08", "中国风光一年新增 4.3 亿千瓦，装机已超过火电"), ("09", "中国火电发电量降了 0.7%，太阳能发电增长近四成"), ("10", "储能一年新增 1.12 亿千瓦，一半以上装在中国")])))

# 8 share bar + yearly additions + figures
c = head("2", CH[2], "中国风光一年新增 4.3 亿千瓦，装机已超过火电")
c += box(80, 212, 800, 24, font(16, 24, MUTED), "2025 年末全国发电装机 38.9 亿千瓦，按电源分")
segs = [("太阳能", 12.02, RED, "#FFFFFF"), ("风电", 6.40, "#E77C80", "#FFFFFF"), ("火电", 15.39, INK, "#FFFFFF"), ("水电", 4.48, GREY2, "#FFFFFF"), ("核电", 0.62, GREY, INK)]
tot = sum(v for _, v, _, _ in segs); x = 80; s = ""
for name, v, fill, ink in segs:
    w = v / tot * 1120
    s += rect(x, 248, w - 2, 72, fill)
    if w > 90:
        s += t(x + 14, 278, name, 17, ink, "start", 700) + t(x + 14, 304, "%.2f 亿千瓦" % v, 16, ink)
    x += w
s += t(80, 350, "风电和太阳能 18.42 亿千瓦，占 47.3%", 18, RED, "start", 700)
s += t(80 + (12.02 + 6.40) / tot * 1120, 350, "火电 15.39 亿千瓦，占 39.6%", 18, INK, "start", 700)
# yearly additions mini bars
s += t(80, 410, "风电和太阳能年度新增，亿千瓦", 15, MUTED)
add = [("2022 年", 1.2), ("2023 年", 2.9), ("2024 年", 3.6), ("2025 年", 4.3)]
base = 600
for i, (lab, v) in enumerate(add):
    cx = 140 + i * 150; h = v / 4.5 * 150
    s += rect(cx - 44, base - h, 88, h, RED if i == 3 else INK)
    s += t(cx, base - h - 10, "%g" % v, 19, RED if i == 3 else INK, "middle", 700)
    s += t(cx, base + 26, lab, 16, INK, "middle")
s += '<line x1="80" y1="%d" x2="700" y2="%d" stroke="%s"/>' % (base, base, GREY2)
c += svg(s)
c += box(780, 410, 1, 210, "background: " + INK)
for i, (lab, val, sub) in enumerate([("风光占全国发电装机", "47.3%", "比火电多约 3 亿千瓦"), ("可再生能源新增占全部新增", "83%", "全年新增 4.52 亿千瓦")]):
    y = 410 + i * 110
    if i:
        c += box(820, y - 12, 380, 1, "background: " + LINE)
    c += box(820, y, 380, 22, font(16, 22, MUTED), lab)
    c += box(820, y + 24, 160, 52, font(44, 52, INK, 700), val)
    c += box(980, y + 40, 220, 24, font(16, 24, INK), sub)
c += source("来源：国家统计局 2025 年统计公报（2026 年 2 月），国家能源局（2026 年 1 月、2 月）。并网口径")
pages.append(("8 中国装机", c))

# 9 table
c = head("2", CH[2], "中国火电发电量降了 0.7%，太阳能发电增长近四成")
cols = [("电源", 80, 260, "left"), ("全口径发电量，万亿千瓦时", 340, 300, "right"), ("全口径同比", 660, 240, "right"), ("规上工业同比", 920, 280, "right")]
for lab, x, w, al in cols:
    c += box(x, 202, w - 16, 26, font(16, 26, MUTED, 400, "text-align: " + al), lab)
c += box(80, 232, 1120, 2, "background: " + INK)
rows = [("火电", "6.33", "−0.7%", "−1.0%", ""), ("水电", "1.46", "+2.5%", "+2.8%", ""), ("核电", "0.49", "+7.6%", "+7.7%", ""), ("风电", "1.13", "+13.1%", "+9.7%", ""),
        ("太阳能", "1.17", "+39.8%", "+24.4%", "em"), ("合计", "10.58", "+4.8%", "+2.2%", "total")]
y = 234
for i, (a, b, d, e, kind) in enumerate(rows):
    if kind == "em":
        c += box(80, y, 1120, 48, "background: " + TINT)
    if kind == "total":
        c += box(80, y, 1120, 2, "background: " + INK)
    elif i:
        c += box(80, y, 1120, 1, "background: " + LINE)
    for (lab, x, w, al), v in zip(cols, (a, b, d, e)):
        col = RED if kind == "em" and lab != "电源" else INK
        wt = 700 if kind in ("em", "total") else 400
        c += box(x + (16 if al == "left" else 0), y + 10, w - 16 - (16 if al == "left" else 0), 28, font(20, 28, col, wt, "text-align: " + al), v)
    y += 48
c += box(80, 548, 1120, 64, "background: " + PANEL)
c += box(108, 566, 1060, 28, font(19, 28, INK), "大量分布式光伏不在规上统计里，规上口径会低估太阳能的增长，本报告用全口径")
c += source("来源：国家统计局 2025 年统计公报（2026 年 2 月）、2025 年 12 月工业生产数据（2026 年 1 月）")
pages.append(("9 中国发电表", c))

# 10 photo top + three figures
c = '<img src="' + PHOTO + '" alt="光伏电站旁的储能集装箱（示意图）" style="position: absolute; left: 0; top: 0; width: 1280px; height: 330px; object-fit: cover">'
c += topbar()
c += box(80, 356, 1120, 46, font(34, 46, INK, 700), "储能一年新增 1.12 亿千瓦，一半以上装在中国")
c += box(80, 418, 1120, 2, "background: " + INK)
f3 = [("全球新型储能新增", "1.12 亿千瓦", "同比 +48%", True), ("装在中国", "54%", "美国 16%", False), ("储能电池包均价", "70 美元/千瓦时", "同比 −45%", False)]
for i, (lab, val, sub, em) in enumerate(f3):
    x = 80 + i * 376
    if i:
        c += box(x - 24, 444, 1, 160, "background: " + LINE)
    c += box(x, 444, 340, 24, font(17, 24, MUTED), lab)
    c += box(x, 476, 352, 60, font(46, 60, RED if em else INK, 700, "white-space: nowrap; letter-spacing: -1px"), val)
    c += box(x, 544, 340, 28, font(19, 28, INK), sub)
c += source("来源：BNEF（2025 年 12 月、2026 年 5 月）。新型储能，不含抽水蓄能。图为示意图")
pages.append(("10 储能照片页", c))

pages.append(("11 章节：2026", chapter(3, "2026：还没有定局", "今年以来的变化与接下来的看点",
                                     [("12", "2026 年以来，太阳能继续向前，气价和消纳带来逆风"), ("13", "全球光伏新增预计在 2026 年下降，二十多年来首次")])))

# 12 two-lane timeline + closing
c = head("3", CH[3], "2026 年以来，太阳能继续向前，气价和消纳带来逆风")
axis = 400; x0, cw = 180, 170
ev = [("上半年", "太阳能占比过 10%", "去年同期 8.9%", "g", False), ("上半年", "煤电占比 49.7%", "半年首次低于一半", "c", False),
      ("上半年", "风光利用率走低", "风电 90.9%，光伏 91.4%", "c", False), ("7 月", "IEA：煤电回升 1.4%", "气价冲击，部分转回煤电", "g", True),
      ("7 月底", "光伏装机超过煤电", "占总装机 31.5%", "c", False), ("8 月", "规上火电 −4.3%", "降幅比 7 月扩大", "c", False)]
s = '<line x1="%d" y1="%d" x2="1200" y2="%d" stroke="%s" stroke-width="2"/>' % (x0 - 8, axis, axis, INK)
c += box(80, 214, 90, 24, font(17, 24, RED, 700), "全球")
c += box(80, 428, 90, 24, font(17, 24, RED, 700), "中国")
for i, (d, ti, de, lane, em) in enumerate(ev):
    x = x0 + i * cw; cx = x + 8
    if lane == "g":
        s += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (cx, 218, cx, axis, RED if em else GREY2); ty = 214
    else:
        s += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (cx, axis, cx, 566, GREY2); ty = 428
    s += '<circle cx="%d" cy="%d" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (cx, axis, RED if em else BG, RED if em else INK)
    c += box(x + 22, ty, cw - 16, 22, font(15, 22, RED if em else MUTED, 700 if em else 400), d)
    c += box(x + 22, ty + 26, cw - 16, 24, font(16, 24, RED if em else INK, 700, "white-space: nowrap"), ti)
    c += box(x + 22, ty + 56, cw - 22, 66, font(15, 22, MUTED), de)
c += svg(s)
c += box(80, 584, 1120, 52, "background: " + PANEL)
c += box(104, 596, 1080, 28, font(19, 28, INK), "气价是全球的变量，消纳是中国的变量，两者决定清洁电力能否再次接住全部增量")
c += source("来源：Ember（2026 年 8 月），国家能源局（2026 年 7 月、9 月），国家统计局（2026 年 9 月），IEA（2026 年 7 月）", y=656)
pages.append(("12 2026 时间线", c))

# 13 forecast bars + rail
c = head("3", CH[3], "全球光伏新增预计在 2026 年下降，二十多年来首次")
base, H, vmax = 596, 300, 7.5
s = legend(80, 214, [("实际", INK), ("预测", "url(#hatch)")])
s += t(80, 246, "全球光伏新增，亿千瓦", 15, MUTED)
s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s"/>' % (base, base, GREY2)
yrs = [("2023 年", 4.52, False), ("2024 年", 5.95, False), ("2025 年", 6.64, False), ("2026 年", 6.12, True)]
slot = 680 / 4; bw = 104; tops = []
for i, (lab, v, fc) in enumerate(yrs):
    cx = 80 + slot * (i + 0.5); h = v / vmax * H; top = base - h; tops.append((cx, top))
    s += rect(cx - bw / 2, top, bw, h, "url(#hatch)" if fc else INK)
    s += t(cx, top - 12, ("%g" % v) + ("（预测）" if fc else ""), 20, RED if fc else INK, "middle", 700)
    s += t(cx, base + 30, lab, 17, INK, "middle")
s += bracket(tops[2], tops[3], "−8%", RED, 48)
c += svg(s, HATCH)
c += rail(840, 214, [("中国 1 至 7 月光伏新增同比", "−61%", "", False), ("2025 年全球可再生能源投资同比", "−9.5%", "能源转型总投资仍 +8%", False)], step=170)
c += source("来源：SolarPower Europe（2026 年 6 月），国家能源局（2026 年 8 月），BNEF（2026 年 1 月）。2026 年为预测")
pages.append(("13 光伏放缓", c))

# 14 ending
c = topbar()
c += box(80, 72, 900, 24, font(16, 24, MUTED), "清洁电力能否连续第二年接住增量，取决于这三件事")
c += box(80, 104, 1120, 1, "background: " + INK)
c += box(80, 150, 1120, 140, "display: flex; flex-direction: column; justify-content: flex-end; " + font(64, 76, INK, 700), "2026 年要盯的三件事")
c += box(80, 330, 1120, 2, "background: " + INK)
ends = [("气价", "IEA 预计 2026 年煤电回升 1.4%"), ("消纳", "中国风光利用率降到约 91%"), ("储能", "BNEF 预计 2026 年新增 <span style=\"white-space: nowrap\">1.58 亿千瓦</span>")]
for i, (a, b) in enumerate(ends):
    x = 80 + i * 376
    c += box(x, 360, 340, 80, font(72, 80, RED, 700, "letter-spacing: -2px"), "0" + str(i + 1))
    c += box(x, 452, 340, 40, font(30, 40, INK, 700), a)
    c += box(x, 500, 320, 64, font(20, 30, INK), b)
pages.append(("14 结尾", c))

boards = {}; order = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order.append(cur)
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, FONT, inner.replace(PHOTO, "../up/photo.jpg")))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "swiss 电力年报样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order))
