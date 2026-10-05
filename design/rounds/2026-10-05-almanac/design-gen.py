import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#EFE9DC"; SURF = "#F7F3E8"; OLIVE = "#4D5D39"; OCHRE = "#B25E38"; INK = "#2B2A22"; MUTED = "#656155"; LINE = "#D8D0BC"
TEAL = "#3E6B63"; KHAKI = "#8C7B54"; OTINT = "#DFE2CF"; CTINT = "#EFDCCD"; GHOST = "#C9BFA8"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
MONO = "'SF Mono', Menlo, Consolas, monospace"
IMG = {k: "__%s__" % k for k in ["port", "fasteners", "ingots", "solar", "scrap", "eaf", "dri", "wind"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(17)]
TOTAL = 17
YEARS = list(range(2026, 2035))

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=OLIVE, sw=2):
    s = size / 24
    return '<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (x, y, s, color, sw, _icon_svg(name))


def page(title, inner, w=1280, h=720):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + INK + "; font-family: " + SANS + """">
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


def font(size, lh, color=INK, weight=400, extra="", fam=None):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s%s" % (size, lh, color, weight, ("font-family: " + fam + "; ") if fam else "", extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400, mono=False):
    fam = "SF Mono, Menlo, Consolas, monospace" if mono else "PingFang SC, Microsoft YaHei, sans-serif"
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def pill(x, y, text, color=OLIVE, dashed=False, fill="transparent", fc=None, size=12):
    w = int(tw(text, size, size * 0.6) + 22)
    return box(x, y, w, 22, "border: 1px %s %s; border-radius: 11px; box-sizing: border-box; text-align: center; white-space: nowrap; background: %s; " % ("dashed" if dashed else "solid", color, fill) + font(size, 20, fc or color, 700), text)


def demo(x, y):
    return pill(x, y, "演示 · 碳价冻结在 €75.36，不是预测", OCHRE, True)


def clause(x, y, text):
    return pill(x, y, "§ " + text, KHAKI)


def yearstrip(hl, x0=860, x1=1216, y=36, extra=None):
    out = line(x0, y, x1, y, LINE, 1.5)
    step = (x1 - x0) / (len(YEARS) - 1)
    for i, yr in enumerate(YEARS):
        x = x0 + i * step
        on = yr in hl
        out += '<circle cx="%.1f" cy="%d" r="%.1f" fill="%s" stroke="%s" stroke-width="1.5"/>' % (x, y, 5 if on else 3.5, OLIVE if on else BG, OLIVE if on else GHOST)
        if i in (0, len(YEARS) - 1) or on:
            out += t(x, y - 10, str(yr), 11, OLIVE if on else MUTED, "middle", 700 if on else 400, True)
    return out


def runhead(pg, section, hl):
    out = svg(icon("sprout", 64, 24, 18, OLIVE, 1.8) + yearstrip(hl))
    out += box(90, 24, 500, 20, font(13, 20, OLIVE, 700, "letter-spacing: 2px"), section)
    out += box(64, 686, 400, 18, font(12, 18, MUTED), "可持续发展部")
    out += box(816, 686, 400, 18, font(12, 18, MUTED, 400, "text-align: right; font-variant-numeric: tabular-nums"), "%d / %d" % (pg, TOTAL))
    return out


def head(pg, section, title, hl, size=30):
    out = runhead(pg, section, hl)
    out += box(64, 58, 1152, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 42, INK, 700), "<div>" + title + "</div>")
    out += box(64, 166, 1152, 1, "background: " + LINE)
    return out


def source(t_, y=648):
    return box(64, y, 1152, 32, font(12, 16, MUTED), t_)


def photo(key, x, y, w, h, cap=None, radius=6):
    out = box(x, y, w, h, "border-radius: %dpx; overflow: hidden" % radius, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))
    if cap:
        out += box(x, y + h + 6, w, 18, font(12, 18, MUTED, 400, "font-style: italic"), cap)
    return out


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: " + SURF + "; border: 1px solid " + LINE + "; border-radius: 6px; box-sizing: border-box; " + extra, content)


def kpi(x, y, w, ic, val, lab, note=None, col=INK, h=128):
    out = card(x, y, w, h)
    out += svg(icon(ic, x + 20, y + 18, 20, OLIVE))
    out += box(x + 20, y + 44, w - 40, 44, font(34, 44, col, 700, "white-space: nowrap"), val)
    out += box(x + 20, y + 88, w - 40, 20, font(13, 20, INK, 700), lab)
    if note:
        out += box(x + 20, y + 106, w - 40, 18, font(12, 18, MUTED), note)
    return out


def contour(x0, y0, w, h, n=6, color=GHOST):
    s = ""
    for i in range(n):
        yy = y0 + i * h / n
        s += '<path d="M %d %.1f C %.1f %.1f, %.1f %.1f, %d %.1f" fill="none" stroke="%s" stroke-width="1" opacity="0.6"/>' % (x0, yy + 20, x0 + w * 0.3, yy - 18 + i * 3, x0 + w * 0.65, yy + 40 - i * 4, x0 + w, yy + 6, color)
    return s


pages = []

# 1 cover
c = photo("port", 560, 0, 720, 720, None, 0)
c += svg(contour(0, 380, 560, 300))
c += box(64, 64, 440, 22, font(14, 22, OLIVE, 700, "letter-spacing: 2px"), "可持续发展部 · 董事会 ESG 委员会汇报")
c += box(64, 150, 470, 230, "display: flex; flex-direction: column; justify-content: flex-end; " + font(50, 66, INK, 700), "<div>CBAM 开始计费：先改报实际排放</div>")
c += box(64, 396, 60, 4, "background: " + OCHRE)
s = ""
x0, x1, yy = 64, 500, 520
s += line(x0, yy, x1, yy, OLIVE, 1.5)
fac = [97.5, 95, 90, 77.5, 51.5, 39, 26.5, 14, 0]
for i, (yr, f) in enumerate(zip(YEARS, fac)):
    x = x0 + i * (x1 - x0) / 8
    s += '<circle cx="%.1f" cy="%d" r="4" fill="%s"/>' % (x, yy, OLIVE if i in (0, 8) else BG) + ('' if i in (0, 8) else '<circle cx="%.1f" cy="%d" r="4" fill="none" stroke="%s" stroke-width="1.5"/>' % (x, yy, OLIVE))
    if i in (0, 8):
        s += t(x, yy - 14, str(yr), 13, OLIVE, "middle", 700, True) + t(x, yy + 24, "%g%%" % f, 13, OCHRE if i == 8 else INK, "middle", 700, True)
c += svg(s)
c += box(64, 556, 470, 20, font(13, 20, MUTED), "免费配额（CBAM 因子）从 97.5% 退到 0")
c += box(64, 620, 470, 22, font(15, 22, INK), "2026 年 10 月")
pages.append(("1 封面", c))

# 2 ask
c = head(2, "决定", "请委员会定两件事：改报实际排放，为三条线列预算项", [2026, 2027])
ctx = [("receipt-euro", "账单已经在累计", "2026 年的进口按默认值算，热轧卷每吨约 €164，2027 年 9 月 30 日一次清缴"),
       ("file-check", "最快的降费：改报实际排放", "铝按行业均值情景，每吨从约 €144 降到约 €14，前提是过欧盟认可的核查"),
       ("sprout", "绿电和工艺：今天不减账单，长期要做", "绿电是国内考核和客户要求，工艺要赶在 2034 年免费配额清零之前定路线")]
s = ""
for i, (ic, ti, tx) in enumerate(ctx):
    y = 196 + i * 140
    if i:
        c += box(64, y - 12, 620, 1, "background: " + LINE)
    s += icon(ic, 64, y + 4, 26, OLIVE)
    c += box(108, y, 576, 30, font(21, 30, INK, 700), ti)
    c += box(108, y + 38, 590, 52, font(15, 26, MUTED), tx)
c += svg(s)
c += box(724, 196, 492, 432, "background: %s; border-radius: 8px; box-sizing: border-box" % OLIVE)
c += svg(icon("gavel", 756, 226, 28, "#FFFFFF"))
c += box(796, 226, 380, 30, font(20, 30, "#E7EBDB", 700, "letter-spacing: 2px"), "请委员会定")
asks = [("批准改报实际排放", "启动 2026 年排放核算，约定欧盟认可的核查机构"), ("列入三条预算项", "核算与核查、绿证采购、电炉和直接还原铁可研")]
for i, (a, b) in enumerate(asks):
    y = 300 + i * 150
    c += box(756, y, 60, 60, font(52, 60, "#C8D0B0", 700, "", MONO), "%d" % (i + 1))
    c += box(824, y + 4, 360, 36, font(26, 36, "#FFFFFF", 700), a)
    c += box(824, y + 46, 370, 52, font(15, 24, "#E7EBDB"), b)
    if i == 0:
        c += box(756, y + 122, 428, 1, "background: rgba(255,255,255,0.25)")
pages.append(("2 请委员会定", c))

# 3 timeline
c = head(3, "时间", "2026 年的进口，2027 年 9 月 30 日前一次申报清缴", [2026, 2027])
tx0, tx1, ay = 90, 1190, 318
def mx(yr, m, d=1): return tx0 + ((yr - 2026) * 12 + (m - 1) + (d - 1) / 30) / 23 * (tx1 - tx0)
s = rect(mx(2026, 1), ay - 4, mx(2027, 1) - mx(2026, 1), 8, OTINT, 'rx="4"') + rect(mx(2027, 1), ay - 4, mx(2027, 12) - mx(2027, 1), 8, CTINT, 'rx="4"')
s += t(mx(2026, 1), ay + 30, "2026 年：进口计入排放，不必持有证书", 13, OLIVE, "start", 700) + t(mx(2027, 1) + 6, ay + 30, "2027 年：开卖、清缴、作废", 13, OCHRE, "start", 700)
for m in range(1, 24):
    x = mx(2026 + (m - 1) // 12, (m - 1) % 12 + 1)
    s += line(x, ay - 8, x, ay + 8, GHOST, 1)
ms = [(2026, 1, 1, "2026-01-01", "正式期开始", "进口货物开始计入排放", 0, False), (2026, 4, 7, "2026-04-07", "Q1 证书价 €75.36", "2026 年按季度公布", 1, False),
      (2027, 2, 1, "2027-02-01", "证书开卖", "此后每季末须持有 50%", 0, False), (2027, 9, 30, "2027-09-30", "首次申报并清缴", "一次清完 2026 年全年", 1, True), (2027, 11, 1, "2027-11-01", "2026 年证书作废", "多买的只能年内回购", 0, False)]
for yr, m, d, ds, ti, de, tier, em in ms:
    x = mx(yr, m, d); ty = 192 + tier * 60
    end = (yr, m) >= (2027, 9)
    tx_, an = (x - 8, "end") if end else (x + 8, "start")
    s += line(x, ty + 46, x, ay - 6, OCHRE if em else OLIVE, 1.2) + '<circle cx="%.1f" cy="%d" r="%d" fill="%s"/>' % (x, ay, 9 if em else 6, OCHRE if em else OLIVE)
    s += t(tx_, ty + 6, ds, 12, MUTED, an, 400, True) + t(tx_, ty + 26, ti, 16 if em else 15, OCHRE if em else INK, an, 700) + t(tx_, ty + 44, de, 12, MUTED, an)
c += svg(s)
pr = [("Q1 2026", "€75.36", "官方公布 · 2026-04-07", False), ("Q2 2026", "€75.28", "官方公布 · 2026-07-06", False), ("Q3 2026", "€82.32", "按法定方法复算，官方待公布", True)]
for i, (q, v, n, dash) in enumerate(pr):
    x = 64 + i * 264
    c += card(x, 384, 248, 132, "border-style: %s" % ("dashed" if dash else "solid"))
    c += box(x + 20, 400, 200, 20, font(13, 20, MUTED, 700, "", MONO), q + " 证书价")
    c += box(x + 20, 422, 220, 50, font(40, 50, OCHRE if dash else INK, 700, "", MONO), v)
    c += box(x + 20, 476, 220, 20, font(12, 20, MUTED), n)
c += card(872, 384, 344, 132, "background: " + OTINT + "; border-color: " + OTINT)
c += svg(icon("landmark", 892, 404, 22, OLIVE))
c += box(924, 402, 280, 24, font(16, 24, INK, 700), "谁付")
c += box(892, 434, 304, 72, font(15, 24, INK), "法律上是欧盟的授权 CBAM 申报人，不是我们的工厂。负担归谁，看合同。")
c += clause(64, 544, "条例 (EU) 2025/2083 修订后第 6、20、22 至 24 条")
c += source("来源：条例 (EU) 2025/2083，欧盟委员会证书价格页，EEX 拍卖数据")
pages.append(("3 时间线", c))

# 4 curve
c = head(4, "账单", "默认值路径下，热轧卷每吨从约 €164 涨到 2034 年约 €312", YEARS)
cx0, cx1, cy0, cy1 = 120, 860, 210, 520
def px(i): return cx0 + i * (cx1 - cx0) / 8
def py(v): return cy1 - v / 700 * (cy1 - cy0)
series = [("碳钢螺钉螺栓", [428, 479, 532, 545, 572, 584, 597, 610, 625], KHAKI, False), ("铝板带", [232, 266, 303, 317, 346, 360, 374, 388, 404], TEAL, False),
          ("热轧卷", [164, 190, 219, 232, 259, 272, 285, 298, 312], OLIVE, True), ("未锻轧铝", [144, 169, 197, 211, 239, 252, 265, 279, 294], GHOST, False)]
s = ""
for v in [0, 200, 400, 600]:
    s += line(cx0, py(v), cx1, py(v), LINE, 1) + t(cx0 - 10, py(v) + 4, "€%d" % v, 12, MUTED, "end", 400, True)
lab_y = {"碳钢螺钉螺栓": 625, "铝板带": 404, "热轧卷": 330, "未锻轧铝": 280}
for nm, d, col, em in series:
    pts = " ".join("%.1f,%.1f" % (px(i), py(v)) for i, v in enumerate(d))
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="%d" stroke-linejoin="round"/>' % (pts, col, 4 if em else 2)
    s += '<circle cx="%.1f" cy="%.1f" r="%d" fill="%s"/>' % (px(0), py(d[0]), 5 if em else 3, col) + '<circle cx="%.1f" cy="%.1f" r="%d" fill="%s"/>' % (px(8), py(d[8]), 5 if em else 3, col)
    s += t(px(8) + 10, py(lab_y[nm]) + 5, "%s €%d" % (nm, d[8]), 13, col if col != GHOST else MUTED, "start", 700 if em else 400)
    if em:
        s += t(px(0) - 8, py(d[0]) + 22, "€164", 14, OLIVE, "start", 700, True)
for i, (yr, f) in enumerate(zip(YEARS, fac)):
    s += t(px(i), cy1 + 22, str(yr), 12, MUTED, "middle", 400, True) + t(px(i), cy1 + 50, "%g%%" % f, 12, OCHRE if f == 0 else INK, "middle", 700, True)
s += t(cx0 - 28, cy1 + 50, "CBAM 因子", 12, MUTED, "end", 700)
s += line(cx0, cy1 + 32, cx1, cy1 + 32, LINE, 1)
c += svg(s)
c += demo(120, 590)
c += kpi(1000, 196, 216, "receipt-euro", "€163.5", "热轧卷 2026 年每吨", "每出口 1 万吨约 €164 万", OCHRE, 140)
c += kpi(1000, 352, 216, "calendar-clock", "€312", "热轧卷 2034 年每吨", "免费配额退到零", INK, 140)
c += source("来源：按实施条例 (EU) 2025/2621、2025/2620，指令 2023/959 计算。2027 年起的金额是碳价冻结在 €75.36 的演示")
pages.append(("4 长期曲线", c))

# 5 waterfall
c = head(5, "账单", "€164 的来历：默认值加 10%，免费部分只按欧盟基准扣", [2026])
wb = [("中国默认值", "3.187 吨", 240.2, 0, "total"), ("加成 10%", "+0.319 吨", 24.0, 240.2, "up"), ("免费配额调整", "0.975 × 1.370 = 1.336 吨", -100.7, 264.2, "down"), ("应清缴", "2.170 吨", 163.5, 0, "total")]
bx0, by1, k = 120, 540, 1.15
s = line(100, by1, 900, by1, INK, 1.5)
for i, (lab, sub, v, base, kind) in enumerate(wb):
    x = bx0 + i * 200
    if kind == "total":
        top = by1 - v * k; h = v * k; col = OLIVE if i == 3 else KHAKI
    elif kind == "up":
        top = by1 - (base + v) * k; h = v * k; col = GHOST
    else:
        top = by1 - base * k; h = -v * k; col = OCHRE
    s += rect(x, top, 140, h, col, 'rx="2"')
    s += t(x + 70, top - 10, ("€%.1f" % v) if v > 0 else ("−€%.1f" % -v), 18, OCHRE if kind == "down" else (OLIVE if i == 3 else INK), "middle", 700, True)
    s += t(x + 70, by1 + 24, lab, 15, INK, "middle", 700) + t(x + 70, by1 + 44, sub, 12, MUTED, "middle", 400, True)
    if i < 3:
        nb = by1 - (base + v) * k if kind != "total" else top
        s += line(x + 140, nb, x + 200, nb, MUTED, 1, 'stroke-dasharray="3 3"')
c += svg(s)
c += card(940, 196, 276, 432)
c += box(964, 216, 230, 20, font(13, 20, OLIVE, 700, "letter-spacing: 2px"), "公式")
c += box(964, 244, 236, 120, font(15, 26, INK, 400, "", MONO), "n = D × (1 + m)<br>&nbsp;&nbsp;− 因子 × CSCF × BM<br>成本 = n × P")
c += box(964, 372, 228, 1, "background: " + LINE)
pv = [("D", "默认值 3.187"), ("m", "加成 10%"), ("因子", "97.5%"), ("CSCF", "100%"), ("BM", "欧盟基准 1.370"), ("P", "€75.36")]
for i, (a, b) in enumerate(pv):
    y = 384 + i * 36
    c += box(964, y, 60, 24, font(14, 24, OCHRE, 700, "", MONO), a)
    c += box(1028, y, 170, 24, font(14, 24, INK), b)
c += clause(64, 600, "条例 2025/2083 第 6(2)(c) 条 · 实施条例 2025/2620 第 6 式")
c += source("来源：实施条例 (EU) 2025/2621（默认值）、2025/2620（基准），决定 (EU) 2026/1862（CSCF）。热轧卷 7208，Q1 2026 证书价 €75.36", y=640)
pages.append(("5 瀑布", c))

# 6 miscalc
c = head(6, "账单", "常见误算按排放的 97.5% 扣免费配额，每吨少算 €150 以上", [2026])
for i, (lab, formula, res, src, ic, col, ok) in enumerate([("常见误算", "排放 × 97.5%", "约 €3.6 至 €6", "多家媒体和咨询网站", "x", MUTED, False),
                                                      ("法规公式", "0.975 × 欧盟基准 1.370", "约 €163.5", "实施条例 (EU) 2025/2620 第 6 式", "check", OLIVE, True)]):
    x = 64 + i * 600
    c += card(x, 196, 552, 300, "border-top: 4px solid %s; %s" % (col, "" if ok else "background: #F1EDE3"))
    c += svg(icon(ic, x + 24, 220, 26, col, 2.5))
    c += box(x + 62, 218, 400, 30, font(20, 30, col, 700), lab)
    c += box(x + 24, 268, 500, 20, font(13, 20, MUTED), "免费部分怎么扣")
    c += box(x + 24, 290, 500, 34, font(22, 34, INK, 700, "text-decoration: line-through; text-decoration-color: %s" % MUTED if not ok else "", MONO), formula)
    c += box(x + 24, 344, 500, 20, font(13, 20, MUTED), "2026 年热轧卷每吨")
    c += box(x + 24, 366, 500, 60, font(48, 60, OCHRE if ok else MUTED, 700, "white-space: nowrap"), res)
    c += box(x + 24, 448, 500, 24, font(13, 24, MUTED), "出处：" + src)
c += card(64, 520, 1152, 96, "background: " + OTINT + "; border-color: " + OTINT)
c += box(92, 540, 1100, 56, font(17, 28, INK), "<b>为什么差这么多：</b>扣的是「欧盟基准 × 因子」，不是「排放 × 因子」。中国默认值 3.187 远高于基准 1.370，高出的部分从第一年就全额计费。报价、预算和合同谈判一律按法规公式。")
c += source("来源：实施条例 (EU) 2025/2620 第 6 式，决定 (EU) 2026/1862（CSCF 100%），指令 2023/959")
pages.append(("6 常见误算", c))

# 7 exposure
c = head(7, "暴露", "中国是欧盟最大的 CBAM 钢铁来源，€134.6 亿里七成是制品", [2026])
c += box(64, 190, 800, 22, font(14, 22, INK, 700), "2025 年欧盟自中国进口的 CBAM 钢铁，按金额（亿欧元）")
segs = [("第 72 章钢材", 41.0, KHAKI), ("7326 其他钢制品", 34.0, OLIVE), ("7308 钢结构件", 24.1, OLIVE), ("7318 螺钉螺栓", 17.0, OLIVE), ("第 73 章其余", 18.4, OLIVE)]
tot = sum(v for _, v, _ in segs); x = 64.0; W = 1152; s = ""
for i, (nm, v, col) in enumerate(segs):
    w = W * v / tot
    s += rect(x, 262, w - 3, 70, col, 'opacity="%s"' % ("1" if i in (0, 1) else ["", "", "0.86", "0.72", "0.6"][i]))
    s += t(x + 12, 290, nm, 14, "#FFFFFF", "start", 700) + t(x + 12, 316, "%.1f" % v, 18, "#FFFFFF", "start", 700, True)
    x += w
x73 = 64 + W * 41.0 / tot
s += line(x73, 246, 1216, 246, OCHRE, 2) + line(x73, 246, x73, 256, OCHRE, 2) + line(1216, 246, 1216, 256, OCHRE, 2)
s += t((x73 + 1216) / 2, 240, "第 73 章制品 €93.5 亿，占 69.5%", 15, OCHRE, "middle", 700)
s += t(64, 356, "第 72 章 €41.0 亿，占 30.5%", 13, MUTED)
c += svg(s)
c += kpi(64, 400, 368, "ship", "907 万吨", "2025 年欧盟自中国进口 CBAM 钢铁", "金额 €134.6 亿", INK, 140)
c += kpi(456, 400, 368, "chart-column", "21.1%", "占欧盟自域外同类进口金额，排第一", "第二是土耳其 €71.8 亿", OCHRE, 140)
c += kpi(848, 400, 368, "package", "€32.5 亿", "铝：61.3 万吨，占 10.7%", "42% 是其他铝制品 7616", INK, 140)
c += source("来源：Eurostat Comext DS-045409（2026 年 9 月 15 日更新），按附件 I 编码汇总。金额为欧盟进口统计")
pages.append(("7 出口暴露", c))

# 8 products
c = head(8, "暴露", "制品的默认值是钢板的两倍：螺钉螺栓 2026 年每吨约 €428", [2026, 2034])
c += photo("fasteners", 64, 196, 480, 420, "示意图：紧固件仓库（AI 生成）")
c += box(584, 196, 400, 20, font(13, 20, INK, 700), "中国默认值，tCO₂e/吨（加成前）")
dv = [("热轧材 7208", 3.187, KHAKI), ("钢结构件 7308", 6.035, OLIVE), ("碳钢螺钉螺栓 7318 15", 6.375, OCHRE)]
s = ""
for i, (nm, v, col) in enumerate(dv):
    y = 232 + i * 58
    s += t(584, y + 18, nm, 14, INK, "start", 700 if i == 2 else 400) + rect(780, y + 2, v * 60, 26, col, 'rx="2"') + t(780 + v * 60 + 8, y + 21, "%.3f" % v, 15, col, "start", 700, True)
s += line(780 + 1.370 * 60, 222, 780 + 1.370 * 60, 404, INK, 1.2, 'stroke-dasharray="4 3"') + t(780 + 1.370 * 60 + 4, 418, "欧盟基准约 1.37", 12, MUTED)
c += svg(s)
c += kpi(584, 448, 300, "receipt-euro", "€428", "螺钉螺栓 2026 年每吨", "是热轧卷的 2.6 倍", OCHRE, 140)
c += kpi(904, 448, 312, "calendar-clock", "€625", "螺钉螺栓 2034 年每吨", None, INK, 140)
c += demo(924, 556)
c += source("来源：实施条例 (EU) 2025/2621、2026/1740、2025/2620，按 €75.36 计算。图为 AI 生成的示意图")
pages.append(("8 制品", c))

# 9 countries
c = head(9, "暴露", "按默认值，中国热轧卷每吨比土耳其多付约 €63", [2026])
ct = [("印度", 4.28), ("中国", 3.187), ("乌克兰", 2.483), ("土耳其", 2.428), ("越南", 2.35), ("韩国", 2.118)]
s = t(64, 206, "热轧扁平材 7208 默认值，tCO₂e/吨（加成前）", 13, INK, "start", 700)
gx = 180; k = 130
for i, (nm, v) in enumerate(ct):
    y = 230 + i * 58; em = nm == "中国"
    s += t(gx - 14, y + 24, nm, 16, OCHRE if em else INK, "end", 700 if em else 400) + rect(gx, y + 6, v * k, 30, OCHRE if em else GHOST, 'rx="2"') + t(gx + v * k + 10, y + 27, "%g" % v, 15, OCHRE if em else INK, "start", 700, True)
bx = gx + 1.37 * k
s += line(bx, 222, bx, 590, OLIVE, 2, 'stroke-dasharray="5 4"') + t(bx + 6, 606, "欧盟基准 1.370", 13, OLIVE, "start", 700)
c += svg(s)
c += kpi(800, 196, 416, "scale", "约 €63", "中国热轧卷 2026 年每吨比土耳其多付", "€163.5 对 €100.6", OCHRE, 140)
c += kpi(800, 352, 416, "trending-up", "2.3 倍", "中国默认值是欧盟基准 1.370 的倍数", "韩国 1.5 倍，土耳其 1.8 倍", INK, 140)
c += box(800, 512, 416, 92, font(13, 22, MUTED), "比的是「大家都用默认值」时的差距。对手改报实际值后，差距会变。")
c += source("来源：实施条例 (EU) 2025/2621、2026/1740（加成前），2025/2620。国家按 2025 年对欧进口额排序")
pages.append(("9 国别对比", c))

# 10 actual
c = head(10, "降费", "最快的降费是改报实际排放：铝按行业均值情景每吨降到约 €14", YEARS)
yrs = [("2026", 144, 14), ("2027", 169, 16), ("2028", 197, 22), ("2030", 239, 63), ("2034", 294, 118)]
s = t(64, 206, "未锻轧铝每吨证书费用（€）", 13, INK, "start", 700)
s += rect(360, 196, 12, 12, GHOST) + t(378, 207, "默认值路径", 12, MUTED) + rect(470, 196, 12, 12, OLIVE) + t(488, 207, "实际值情景 1.57", 12, MUTED)
by1 = 540; k = 1.05
for i, (yr, a, b) in enumerate(yrs):
    x = 90 + i * 128
    s += rect(x, by1 - a * k, 44, a * k, GHOST, 'rx="2"') + rect(x + 50, by1 - b * k, 44, b * k, OLIVE, 'rx="2"')
    s += t(x + 22, by1 - a * k - 8, str(a), 13, MUTED, "middle", 400, True) + t(x + 72, by1 - b * k - 8, str(b), 14 if i == 0 else 13, OLIVE, "middle", 700, True)
    s += t(x + 47, by1 + 22, yr, 13, INK, "middle", 400, True)
s += line(70, by1, 720, by1, INK, 1.5)
c += svg(s)
c += demo(64, 590)
c += photo("ingots", 760, 196, 456, 220, "示意图：原铝锭（AI 生成）")
c += card(760, 444, 456, 172, "border: 1.5px dashed " + OCHRE)
c += svg(icon("file-check", 780, 464, 22, OCHRE))
c += box(812, 462, 380, 24, font(16, 24, INK, 700), "1.57 是据报道的行业协会口径")
c += box(780, 496, 416, 52, font(14, 22, MUTED), "不是本企业实测。用实际值不加 10% 至 30% 的加成，但必须过欧盟认可的核查。")
c += pill(780, 568, "本企业实测：待核查后填入", OCHRE, True)
c += source("来源：行业协会口径（据界面 2026 年 5 月 23 日报道），实施条例 2025/2621、2025/2620。图为 AI 示意图")
pages.append(("10 实际值", c))

# 11 verify
c = head(11, "核查", "改报实际值要先过核查：首个核查年度必须实地查厂", [2026, 2027])
stp = [("calculator", "按欧盟方法核算", "实施条例 2025/2547 规定算法，钢铝只算直接排放"), ("badge-check", "找认可核查机构", "由成员国认可机构认可，欧盟以外的机构也可申请"),
       ("factory", "首年实地查厂", "首个核查年度必须现场核查，之后至少每两年一次"), ("send", "交给欧盟申报人", "2027 年 9 月 30 日前随 2026 年申报一并提交")]
s = ""
for i, (ic, ti, tx) in enumerate(stp):
    x = 64 + i * 292
    c += card(x, 196, 272, 168, "border-top: 3px solid " + (OCHRE if i == 2 else OLIVE))
    s += t(x + 20, 228, "%02d" % (i + 1), 14, OCHRE if i == 2 else OLIVE, "start", 700, True) + icon(ic, x + 228, 210, 24, OCHRE if i == 2 else OLIVE)
    c += box(x + 20, 240, 236, 30, font(19, 30, INK, 700), ti)
    c += box(x + 20, 276, 236, 76, font(14, 22, MUTED), tx)
    if i < 3:
        s += '<polygon points="%d,274 %d,280 %d,286" fill="%s"/>' % (x + 276, x + 288, x + 276, OLIVE)
c += svg(s)
rows = [("核查", "不需要", "必须由欧盟认可的机构核查"), ("加成", "2026 年 10%，2028 年起 30%", "不加"), ("抵扣中国碳价", "只能按年度默认碳价", "可扣实际已付碳价")]
c += box(64, 392, 300, 20, font(12, 20, MUTED), "")
c += box(380, 392, 380, 20, font(13, 20, MUTED, 700), "默认值申报") + box(800, 392, 416, 20, font(13, 20, OLIVE, 700), "实际值申报 ✓")
c += box(64, 416, 1152, 2, "background: " + INK)
for i, (a, b, d) in enumerate(rows):
    y = 418 + i * 60
    c += box(780, y, 436, 60, "background: " + OTINT)
    c += box(64, y + 59, 1152, 1, "background: " + LINE)
    c += box(76, y + 18, 290, 24, font(16, 24, INK, 700), a)
    c += box(380, y + 18, 380, 24, font(16, 24, MUTED), b)
    c += box(800, y + 18, 400, 24, font(16, 24, INK, 700), d)
c += source("来源：实施条例 (EU) 2025/2546、2025/2547、2025/2621，授权条例 (EU) 2025/2551，条例 2025/2083 第 9 条")
pages.append(("11 核查", c))

# 12 china price
c = head(12, "抵扣", "能拿中国碳价抵扣的很少：钢铝配额盈亏不超过 3%", [2026])
c += box(64, 196, 600, 200, font(200, 200, OCHRE, 700, "white-space: nowrap; letter-spacing: -6px"), "±3%")
c += box(64, 412, 600, 30, font(16, 30, INK, 700), "2026 年度钢铝企业配额")
c += box(64, 446, 600, 40, font(24, 40, INK, 400, "", MONO), "A = E × (1 + α)，−3% ≤ α ≤ +3%")
c += box(64, 496, 600, 52, font(15, 24, MUTED), "配额基本按核查排放等量发放，企业最多为约 3% 的排放实际花钱。")
c += clause(64, 566, "国环规气候〔2026〕1 号")
c += card(720, 196, 496, 420)
c += box(744, 216, 440, 22, font(14, 22, INK, 700), "2025 年碳价，€/吨 CO₂")
s = ""
for i, (nm, v, col, lab) in enumerate([("欧盟 EUA", 73.43, OLIVE, "€73.43"), ("中国 CEA", 7.68, OCHRE, "€7.68（62.36 元）")]):
    y = 262 + i * 80
    s += t(744, y + 18, nm, 15, INK, "start", 700) + rect(860, y, v * 4.2, 34, col, 'rx="2"') + t(860 + v * 4.2 + 8 if v < 40 else 870, y + 23, lab, 14, "#FFFFFF" if v > 40 else col, "start", 700, True)
c += svg(s)
c += box(744, 432, 440, 50, font(40, 50, INK, 700, "", MONO), "约 9.6 倍")
c += box(744, 486, 440, 22, font(13, 22, MUTED), "欧中碳价差（2025 年均价，按欧洲央行汇率折算）")
c += box(744, 522, 440, 1, "background: " + LINE)
c += pill(744, 540, "第 9 条抵扣细则：仍是草案", KHAKI, True)
c += box(744, 572, 440, 24, font(13, 22, MUTED), "用默认值申报时，只能按欧盟公布的年度默认碳价扣减")
c += source("来源：生态环境部国环规气候〔2026〕1 号（2026-09-01），生态环境部 2025 年全国碳市场数据（2026-01-01），EEX 拍卖数据，欧洲央行汇率，条例 2025/2083 第 9 条")
pages.append(("12 中国碳价", c))

# 13 green power
c = head(13, "绿电", "绿电和绿证今天不减 CBAM 账单，但国内考核已经在要", [2026, 2027])
c += photo("solar", 64, 196, 520, 260, "示意图：钢厂屋顶光伏（AI 生成）")
c += box(624, 196, 592, 22, font(14, 22, INK, 700), "电解铝每吨排放的两段（tCO₂）")
s = ""
dx = 624; k = 56
s += rect(dx, 236, 3.0 * k, 52, OCHRE, 'rx="2"') + t(dx + 12, 260, "直接排放", 14, "#FFFFFF", "start", 700) + t(dx + 12, 280, "3.0", 14, "#FFFFFF", "start", 700, True)
s += rect(dx + 3.0 * k + 3, 236, 7.0 * k, 52, GHOST, 'rx="2"') + t(dx + 3.0 * k + 15, 260, "电力间接排放（范围二）", 14, INK, "start", 700) + t(dx + 3.0 * k + 15, 280, "约 7.0，占约 70%", 14, INK, "start", 700, True)
s += line(dx, 300, dx + 3.0 * k, 300, OCHRE, 2) + t(dx, 320, "CBAM 只算这段", 13, OCHRE, "start", 700)
s += line(dx + 3.0 * k + 3, 300, dx + 10 * k + 3, 300, MUTED, 1.5, 'stroke-dasharray="4 3"') + t(dx + 3.0 * k + 3, 320, "绿电降的是这段，今天不进 CBAM 账单", 13, MUTED)
c += svg(s)
c += box(624, 344, 592, 60, font(13, 20, MUTED), "直接排放取欧盟默认值 3.000，间接 = 13,202 kWh × 0.5306 kgCO₂/kWh。Guidance No.3：不允许用绿证确定排放因子。")
c += kpi(64, 484, 376, "scale", "0", "买绿电、绿证今天能减的 CBAM 证书", "钢铝只计直接排放", OCHRE, 132)
c += kpi(452, 484, 376, "zap", "25.2% 至 70%", "2025 年各省电解铝绿电消费比例", "国内考核，按绿证核算", INK, 132)
c += kpi(840, 484, 376, "sun", "约 83 元", "每吨电解铝对应的绿证", "13.2 个 × 6.32 元，RE100 认可", INK, 132)
c += source("来源：条例 (EU) 2023/956 附件 II，Guidance No.3（2026-08-14），发改办能源〔2025〕669 号，国家能源局，生态环境部。图为 AI 示意图")
pages.append(("13 绿电", c))

# 14 routes
c = head(14, "工艺", "工艺路线是十年的事：电炉、直接还原铁、氢冶金要分开算", [2028, 2029, 2030, 2031, 2032, 2033, 2034])
for i, (k_, cap) in enumerate([("scrap", "废钢"), ("eaf", "电炉"), ("dri", "直接还原竖炉")]):
    c += photo(k_, 64 + i * 392, 196, 368, 190, cap)
c += box(64, 420, 600, 22, font(14, 22, INK, 700), "吨钢 CO₂，世界钢协全口径（不能直接代入 CBAM）")
rt = [("高炉转炉", 2.34, GHOST, "基准线"), ("直接还原铁电炉", 1.47, KHAKI, "低约 37%"), ("废钢电炉", 0.69, OLIVE, "低约 70%")]
s = ""
for i, (nm, v, col, note) in enumerate(rt):
    y = 452 + i * 42
    s += t(64, y + 20, nm, 14, INK) + rect(210, y + 4, v * 170, 26, col, 'rx="2"') + t(210 + v * 170 + 8, y + 22, "%.2f · %s" % (v, note), 14, col if col != GHOST else MUTED, "start", 700, True)
c += svg(s)
c += card(800, 420, 416, 160, "border: 1.5px dashed " + KHAKI)
c += svg(icon("atom", 820, 440, 22, KHAKI))
c += box(852, 438, 340, 24, font(16, 24, INK, 700), "氢冶金示范：减碳约 70%")
c += box(820, 472, 376, 52, font(14, 22, MUTED), "河钢张宣科技 120 万吨项目自称，比同规模长流程。")
c += pill(820, 540, "企业口径 · 据报道", KHAKI, True)
c += source("来源：世界钢铁协会 Sustainability Indicators 2025，河钢张宣科技示范项目（企业口径）。图为 AI 示意图")
pages.append(("14 工艺路线", c))

# 15 rules
c = head(15, "规则", "规则还在变：默认值复审、下游扩围、免费配额延期", [2027, 2028, 2034])
ax0, ax1, ay = 100, 1180, 330
def yx(y): return ax0 + (y - 2026) / 12 * (ax1 - ax0)
s = line(ax0, ay, ax1, ay, INK, 2)
for y in range(2026, 2039):
    s += line(yx(y), ay - 5, yx(y), ay + 5, INK, 1.2) + (t(yx(y), ay + 24, str(y), 12, MUTED, "middle", 400, True) if y in (2026, 2027, 2028, 2030, 2034, 2038) else "")
s += rect(yx(2026), ay - 18, yx(2034) - yx(2026), 10, OTINT, 'rx="3"') + t(yx(2026) + 6, ay - 24, "现行法律：免费配额 2034 年清零", 12, OLIVE, "start", 700)
s += rect(yx(2034), ay - 18, yx(2038) - yx(2034), 10, "none", 'stroke="%s" stroke-dasharray="4 3" rx="3"' % OCHRE) + t(yx(2034) + 6, ay - 24, "提案：延到 2038", 12, OCHRE, "start", 700)
c += svg(s)
rules = [(2027, "file-text", "默认值最迟复审", "加成 2028 年起升到 30%", "实施条例 (EU) 2025/2621", "已定", OLIVE, False),
         (2028, "layers", "下游扩围拟起适用", "更多钢铝制品纳入", "COM(2025) 989，三方谈判中", "谈判中", OCHRE, True),
         (2038, "hourglass", "免费配额清零拟推迟", "热轧卷 2034 年约 €297（提案情景）", "COM(2026) 616（2026-07-17）", "提案", OCHRE, True)]
s = ""
for i, (yr, ic, ti, d1, src, tag, col, dash) in enumerate(rules):
    x = 64 + i * 392
    s += line(yx(yr), ay + 6, yx(yr), 388, col, 1.2, 'stroke-dasharray="3 3"') + '<circle cx="%.1f" cy="%d" r="7" fill="%s"/>' % (yx(yr), ay, col)
    c += card(x, 392, 368, 168, "border-top: 3px solid %s; %s" % (col, "border-style: dashed solid solid solid" if dash else ""))
    s += icon(ic, x + 20, 412, 22, col)
    c += box(x + 52, 408, 120, 30, font(24, 30, INK, 700, "", MONO), str(yr))
    c += pill(x + 368 - 20 - int(tw(tag) + 22), 412, tag, col, dash)
    c += box(x + 20, 450, 330, 26, font(17, 26, INK, 700), ti)
    c += box(x + 20, 478, 330, 22, font(14, 22, MUTED), d1)
    c += box(x + 20, 524, 330, 20, font(12, 20, KHAKI), src)
c += svg(s)
c += box(64, 580, 1152, 40, font(15, 24, INK), "两件提案都还不是法律，测算仍按现行法律。每季度跟踪一次，有变化再回委员会。")
c += source("来源：欧洲议会立法观察站 2025/0419(COD)，COM(2026) 616（2026 年 7 月 17 日），实施条例 2025/2621")
pages.append(("15 规则在变", c))

# 16 roadmap
c = head(16, "路线", "路线图：2027 年 9 月 30 日前交出核查后的排放", [2026, 2027, 2028])
ph = [("2026 年四季度", "定方法、定机构", [("核算", "按欧盟方法核算 2026 年直接排放"), ("核查", "约定欧盟认可的核查机构"), ("合同", "梳理欧盟客户的 CBAM 费用条款")], "核算与核查费用", False),
      ("2027 年上半年", "实地核查", [("核查", "首个核查年度实地查厂"), ("绿电", "按国内考核比例采购绿证"), ("披露", "范围一、二排放与核查口径对齐")], "绿证采购", False),
      ("2027 年 9 月 30 日", "首次清缴", [("交付", "向申报人提交经核查的排放"), ("清缴", "申报人清缴 2026 年证书")], None, True),
      ("2028 年起", "工艺可研", [("可研", "电炉、直接还原铁路线比选")], "可研费用", False)]
s = line(64, 214, 1216, 214, OLIVE, 2)
for i, (per, ti, rows, bud, em) in enumerate(ph):
    x = 64 + i * 292; col = OCHRE if em else OLIVE
    s += '<circle cx="%d" cy="214" r="%d" fill="%s"/>' % (x + 12, 9 if em else 7, col)
    c += box(x, 228, 272, 22, font(13, 22, col, 700, "", MONO), per)
    c += card(x, 256, 272, 330, "border-top: 3px solid " + col + ("; background: " + CTINT if em else ""))
    c += box(x + 20, 272, 236, 30, font(20, 30, INK, 700), ti)
    for j, (k_, v) in enumerate(rows):
        y = 316 + j * 62
        s += rect(x + 20, y + 3, 14, 14, "none", 'stroke="%s" stroke-width="1.5" rx="2"' % col)
        c += box(x + 42, y, 210, 20, font(12, 20, MUTED, 700), k_)
        c += box(x + 42, y + 20, 214, 40, font(14, 20, INK), v)
    if bud:
        c += box(x + 20, 540, 236, 1, "background: " + LINE)
        c += box(x + 20, 548, 120, 22, font(12, 22, MUTED), "预算项")
        c += pill(x + 20 + 60, 548, bud + "：待定", KHAKI, True)
c += svg(s)
c += source("来源：条例 (EU) 2025/2083 第 6(1)、22 条，实施条例 2025/2546，财会〔2025〕34 号第二十八条")
pages.append(("16 路线图", c))

# 17 ending
c = photo("wind", 0, 0, 1280, 720, None, 0)
c += box(0, 0, 760, 720, "background: linear-gradient(90deg, rgba(239,233,220,0.97) 0%, rgba(239,233,220,0.94) 70%, rgba(239,233,220,0) 100%)")
c += svg(icon("sprout", 64, 64, 22, OLIVE, 1.8))
c += box(96, 64, 500, 22, font(14, 22, OLIVE, 700, "letter-spacing: 2px"), "决定")
c += box(64, 110, 640, 60, font(44, 60, INK, 700), "请委员会今天决定三件事")
c += box(64, 186, 60, 4, "background: " + OCHRE)
dec = [("改报实际值", "启动 2026 年排放核算和核查", True), ("绿电", "按国内考核比例列绿证采购预算", False), ("工艺", "电炉和直接还原铁可研列入预算项", False)]
s = ""
for i, (k_, v, em) in enumerate(dec):
    y = 232 + i * 108
    c += box(64, y, 600, 92, "background: %s; border-radius: 6px; box-sizing: border-box; border: 1px solid %s" % ("rgba(247,243,232,0.95)", OCHRE if em else LINE))
    s += rect(88, y + 32, 26, 26, "none", 'stroke="%s" stroke-width="2" rx="3"' % (OCHRE if em else OLIVE))
    c += box(132, y + 16, 500, 22, font(13, 22, OCHRE if em else OLIVE, 700, "letter-spacing: 2px"), k_)
    c += box(132, y + 42, 520, 32, font(22, 32, INK, 700), v)
c += svg(s)
c += box(64, 600, 600, 22, font(14, 22, MUTED), "可持续发展部 · 2026 年 10 月")
pages.append(("17 结尾", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "almanac CBAM 样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
