import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# thesis: a defense manuscript. Ivory paper, emerald ink, scholar gold for rules and dots only.
BG = "#F5F3EC"; SURF = "#FCFBF6"; EMER = "#0E6245"; EMERL = "#E3EEE7"; GOLD = "#A8861D"; GOLDL = "#F1EAD2"
INK = "#23251F"; MUTED = "#62655B"; LINE = "#DDD9C8"; INDIGO = "#3F5B8C"; PEBBLE = "#8A8471"; FAINT = "#B9B4A3"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
SERIF = "'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif"
IMG = {k: "__%s__" % k for k in ["img-archive", "img-library", "img-worker", "img-exercise", "img-grandparent", "img-notebook"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
RUN = "硕士学位论文开题报告"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=EMER, sw=1.8):
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


def font(size, lh, color=INK, weight=400, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def serif(size, lh, color=INK, weight=700, extra=""):
    return font(size, lh, color, weight, "font-family: %s; %s" % (SERIF, extra))


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400, fam="PingFang SC, sans-serif"):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def sup(n):
    return '<sup style="font-size: 10px; line-height: 0; color: %s; font-weight: 700; margin-left: 1px">%d</sup>' % (EMER, n)


def chip(x, y, t_, fg=EMER, bg=None, border=None, size=12, h=22):
    w = int(tw(t_, size, size * 0.62) + 18)
    st = "border-radius: 3px; box-sizing: border-box; text-align: center; white-space: nowrap; "
    st += ("background: %s; " % bg) if bg else ""
    st += ("border: 1px solid %s; " % border) if border else ""
    return box(x, y, w, h, st + font(size, h - (2 if border else 0), fg, 600), t_)


SECTIONS = {1: "问题与背景", 2: "文献与缺口", 3: "研究设计", 4: "计划"}


def head(pg, sec, title, size=30):
    out = box(64, 26, 600, 18, font(12, 18, MUTED, 600, "letter-spacing: 3px"), RUN)
    out += box(616, 26, 600, 18, font(12, 18, EMER, 700, "text-align: right; letter-spacing: 1px"), "§%d　%s" % (sec, SECTIONS[sec]))
    out += svg(line(64, 52, 1216, 52, GOLD, 1))
    out += box(64, 66, 1152, 84, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(size, 42, INK, 700), "<div>" + title + "</div>")
    out += pgnum(pg)
    return out


def pgnum(pg, color=MUTED):
    return box(590, 684, 100, 20, serif(13, 20, color, 400, "text-align: center"), str(pg))


def notes(items, y0=None):
    """Numbered footnotes under a short rule, as a paper sets them."""
    n = len(items)
    y = y0 if y0 is not None else 676 - n * 17
    out = svg(line(64, y - 6, 244, y - 6, PEBBLE, 0.8))
    for i, t_ in enumerate(items):
        out += box(64, y + i * 17, 1150, 17, font(11, 17, MUTED), '<span style="color:%s;font-weight:700">%d</span>　%s' % (EMER, i + 1, t_))
    return out


def caption(x, y, label, t_, w=900):
    return box(x, y, w, 20, font(13, 20, INK, 400, "white-space: nowrap"), '<b style="color:%s">%s</b>　%s' % (EMER, label, t_))


def photo(key, x, y, w, h, radius=0):
    return box(x, y, w, h, "overflow: hidden; border-radius: %dpx" % radius, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: %s; border: 1px solid %s; border-radius: 4px; box-sizing: border-box; " % (SURF, LINE) + extra, content)


pages = []

# 1 cover: a title page, the archive at the right
c = photo("img-archive", 820, 0, 460, 720)
c += box(64, 64, 600, 20, font(13, 20, MUTED, 600, "letter-spacing: 4px"), RUN)
c += svg(line(64, 96, 760, 96, GOLD, 1))
c += box(64, 190, 720, 130, serif(40, 60, EMER, 700), "渐进式延迟法定退休年龄<br>对 50 至 60 岁人群劳动参与的影响")
c += svg(line(64, 352, 124, 352, GOLD, 3))
fields = [("学科方向", "劳动经济学"), ("学位类别", "经济学硕士"), ("报告类型", "开题报告"), ("日　　期", "2026 年 10 月")]
s = ""
for i, (k, v) in enumerate(fields):
    y = 400 + i * 46
    c += box(64, y, 120, 30, font(15, 30, MUTED, 600, "letter-spacing: 2px"), k)
    c += box(196, y, 400, 30, serif(17, 30, INK, 600), v)
    s += line(196, y + 34, 600, y + 34, LINE, 1)
c += svg(s)
c += box(64, 640, 600, 20, font(11, 20, MUTED), "图为 AI 生成的示意图")
pages.append(("1 封面", c))

# 2 research question
c = head(2, 1, "研究问题：延迟退休让 50 至 60 岁的人多工作了吗")
c += photo("img-worker", 64, 170, 470, 360)
c += caption(64, 538, "图 1", "示意：车间里的老工人（AI 生成）", 470)
c += box(580, 170, 636, 84, serif(26, 42, EMER, 700), "到了原来的法定年龄、还没到新的法定年龄的人，会不会更可能在业？" + sup(1))
rows = [("对象", "受新规约束的 50 至 60 岁城镇职工"), ("问题一", "到龄以后，就业概率有没有上升"), ("问题二", "延后的时间流向就业、失业还是照料"), ("预期贡献", "首个用改革后微观数据做的因果评估")]
s = ""
for i, (k, v) in enumerate(rows):
    y = 286 + i * 60
    s += line(580, y, 1216, y, LINE)
    c += box(580, y + 14, 120, 30, font(13, 30, MUTED, 700, "letter-spacing: 1px"), k)
    c += box(700, y + 12, 516, 34, serif(18, 34, INK, 600), v)
c += svg(s + line(580, 286 + 4 * 60, 1216, 286 + 4 * 60, LINE))
c += notes(["检索截至 2026-10-06，未见用改革后微观数据做的因果研究（三路检索一致）"])
pages.append(("2 研究问题", c))

# 3 the ladder: statutory age by month of birth
c = head(3, 1, "三类人群分 15 年把法定退休年龄提高 3 至 5 岁，2039 年全部到位")
X0, X1, Y0, Y1 = 150, 820, 196, 556  # plot box
yr0, yr1, a0, a1 = 1962, 1988, 49, 64
def px(yr): return X0 + (yr - yr0) / (yr1 - yr0) * (X1 - X0)
def py(age): return Y1 - (age - a0) / (a1 - a0) * (Y1 - Y0)
s = ""
for a in range(50, 65, 5):
    s += line(X0, py(a), X1, py(a), LINE, 1)
    s += text(X0 - 10, py(a) + 4, "%d 岁" % a, 12, MUTED, "end")
for yr in range(1965, 1990, 5):
    s += line(px(yr), Y1, px(yr), Y1 + 5, PEBBLE, 1)
    s += text(px(yr), Y1 + 22, "%d" % yr, 12, MUTED, "middle")
s += text(X1, Y1 + 42, "出生年月 →", 12, MUTED, "end")
groups = [("男职工", 60, 3, 4, 1965, EMER), ("原 55 岁女职工", 55, 3, 4, 1970, INDIGO), ("原 50 岁女职工", 50, 5, 2, 1975, GOLD)]
for nm, base, up, every, start, col in groups:
    steps = up * 12
    pts = ["%.1f,%.1f" % (px(yr0), py(base)), "%.1f,%.1f" % (px(start), py(base))]
    for k in range(1, steps + 1):
        yrk = start + (k - 1) * every / 12
        pts.append("%.1f,%.1f" % (px(yrk), py(base + (k - 1) / 12)))
        pts.append("%.1f,%.1f" % (px(yrk), py(base + k / 12)))
    endyr = start + (steps - 1) * every / 12
    pts.append("%.1f,%.1f" % (px(yr1), py(base + up)))
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2.2"/>' % (" ".join(pts), col)
    s += '<circle cx="%.1f" cy="%.1f" r="4" fill="%s"/>' % (px(endyr), py(base + up), col)
c += svg(s)
c += caption(150, 170, "图 2", "改革后的法定退休年龄，按出生年月（附件 1 至 3）" + sup(1), 700)
cards = [("男职工", "60 → 63 岁", "每 4 个出生月延 1 个月<br>1965 年 1 月起，1976 年 9 月到位", EMER),
         ("原 55 岁女职工", "55 → 58 岁", "每 4 个出生月延 1 个月<br>1970 年 1 月起，1981 年 9 月到位", INDIGO),
         ("原 50 岁女职工", "50 → 55 岁", "每 2 个出生月延 1 个月<br>1975 年 1 月起，1984 年 11 月到位", GOLD)]
s = ""
for i, (nm, rng, d_, col) in enumerate(cards):
    y = 180 + i * 128
    s += rect(870, y, 4, 110, col)
    c += box(892, y, 320, 22, font(13, 22, MUTED, 700), nm)
    c += box(892, y + 24, 320, 42, serif(30, 42, INK, 700, "white-space: nowrap"), rng)
    c += box(892, y + 68, 320, 44, font(13, 21, MUTED), d_)
c += svg(s)
c += notes(["全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》及国务院《办法》附件 1 至 3（2024-09-13），2025-01-01 施行"])
pages.append(("3 政策阶梯", c))

# 4 the dose so far
c = head(4, 1, "到 2026 年底，实际最多只延迟了 5 个月和 8 个月")
dose = [("男职工 · 原 55 岁女职工", 5, 3, 36, "全程 36 个月", EMER), ("原 50 岁女职工", 8, 4, 60, "全程 60 个月", GOLD)]
s = ""
for i, (nm, d26, d25, full, fl, col) in enumerate(dose):
    y = 196 + i * 190
    c += box(64, y, 500, 24, font(15, 24, MUTED, 700), nm)
    c += box(64, y + 30, 360, 96, serif(88, 96, EMER, 700, "white-space: nowrap"), '%d<span style="font-size:28px;font-weight:600"> 个月</span>' % d26)
    BX, BW = 440, 760
    s += rect(BX, y + 70, BW, 16, "#E7E3D5", 'rx="2"')
    s += rect(BX, y + 70, BW * d26 / full, 16, col, 'rx="2"')
    s += line(BX + BW * d25 / full, y + 62, BX + BW * d25 / full, y + 94, INK, 1.2, 'stroke-dasharray="3 3"')
    s += text(BX + BW * d25 / full, y + 56, "2025 年底 %d 个月" % d25, 12, MUTED, "middle")
    s += text(BX + BW * d26 / full + 8, y + 110, "2026 年底 %d 个月" % d26, 12, INK, "start", 700)
    s += text(BX + BW, y + 110, fl, 12, MUTED, "end")
c += svg(s)
c += box(64, 580, 1152, 40, "border-left: 3px solid %s; padding-left: 16px; box-sizing: border-box; " % GOLD + font(15, 40, INK), "处理剂量小：两年内最多只走完全程的七分之一，识别上最难绕开的一条" + sup(1))
c += notes(["依据《办法》附件 1 至 3 计算：1965 年 9 月出生的男职工 2025 年 12 月退休，延迟 3 个月；1966 年 7 月出生的 2026 年 12 月退休，延迟 5 个月"])
pages.append(("4 处理剂量", c))

# 5 why it matters
c = head(5, 1, "人口在变老，参保职工与参保离退休人员之比从 2.87 降到 2.59")
c += box(64, 172, 300, 20, font(12, 20, MUTED, 700), "2025 年末" + sup(1))
c += box(64, 196, 300, 56, serif(46, 56, EMER, 700), "23.0%")
c += box(64, 252, 300, 20, font(13, 20, MUTED), "60 岁及以上人口占比")
c += box(64, 292, 300, 56, serif(46, 56, INK, 700), "−662 万")
c += box(64, 348, 300, 20, font(13, 20, MUTED), "16 至 59 岁人口，比上年")
c += photo("img-exercise", 64, 392, 300, 200)
c += box(64, 596, 300, 18, font(11, 18, MUTED), "示意：公园里晨练的中老年人（AI 生成）")
ratio = [(2015, 2.87), (2016, 2.75), (2017, 2.65), (2018, 2.55), (2019, 2.53), (2020, 2.57), (2021, 2.65), (2022, 2.69), (2023, 2.67), (2024, 2.63), (2025, 2.59)]
CX0, CX1, CY0, CY1 = 460, 1180, 216, 530
def cx(yr): return CX0 + (yr - 2015) / 10 * (CX1 - CX0)
def cy(v): return CY1 - (v - 2.4) / (3.0 - 2.4) * (CY1 - CY0)
s = ""
for v in (2.4, 2.6, 2.8, 3.0):
    s += line(CX0, cy(v), CX1, cy(v), LINE)
    s += text(CX0 - 10, cy(v) + 4, "%.1f" % v, 12, MUTED, "end")
for yr, v in ratio:
    s += text(cx(yr), CY1 + 22, str(yr), 12, MUTED, "middle")
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2.4"/>' % (" ".join("%.1f,%.1f" % (cx(y), cy(v)) for y, v in ratio), EMER)
for yr, v in ratio:
    s += '<circle cx="%.1f" cy="%.1f" r="3.5" fill="%s"/>' % (cx(yr), cy(v), EMER)
for yr, v, lab, dy in [(2015, 2.87, "2.87", -12), (2019, 2.53, "2019 最低 2.53", 22), (2022, 2.69, "2022 回升 2.69", -12), (2025, 2.59, "2.59", -12)]:
    s += text(cx(yr), cy(v) + dy, lab, 13, INK, "middle", 700)
c += svg(s)
c += caption(400, 172, "图 3", "城镇职工养老保险：参保职工 ÷ 参保离退休人员" + sup(2), 800)
c += box(400, 566, 816, 30, font(13, 30, MUTED), "不是单调下降：2019 年最低，2022 年回升，之后再降。这是两项公布人数之比，不是老年人口抚养比")
c += notes(["国家统计局《2025 年国民经济和社会发展统计公报》", "人社部 2015 至 2025 年度人力资源和社会保障事业发展统计公报，比值为计算"])
pages.append(("5 为什么重要", c))

# 6 the cliff
c = head(6, 1, "七普城镇就业人口比率在法定退休年龄附近断崖下跌")
ages = [47, 52, 57, 62, 67]
men = [88.9, 82.8, 68.2, 27.8, 19.4]
wom = [69.0, 45.7, 25.4, 13.3, 9.8]
GX0, GX1, GY0, GY1 = 140, 900, 206, 540
def gx(a): return GX0 + (a - 45) / (70 - 45) * (GX1 - GX0)
def gy(v): return GY1 - v / 100 * (GY1 - GY0)
s = ""
for v in (0, 25, 50, 75, 100):
    s += line(GX0, gy(v), GX1, gy(v), LINE)
    s += text(GX0 - 10, gy(v) + 4, "%d%%" % v, 12, MUTED, "end")
for a, lab in zip(ages, ["45-49", "50-54", "55-59", "60-64", "65-69"]):
    s += text(gx(a), GY1 + 22, lab + " 岁", 12, MUTED, "middle")
for a, lab in [(50, "女 50 岁"), (55, "女 55 岁"), (60, "男 60 岁")]:
    s += line(gx(a), GY0 - 4, gx(a), GY1, GOLD, 1.4, 'stroke-dasharray="5 4"')
    s += text(gx(a), GY0 - 10, lab, 12, GOLD, "middle", 700)
for vals, col, nm in [(men, EMER, "城镇男性"), (wom, INDIGO, "城镇女性")]:
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2.6"/>' % (" ".join("%.1f,%.1f" % (gx(a), gy(v)) for a, v in zip(ages, vals)), col)
    for a, v in zip(ages, vals):
        s += '<circle cx="%.1f" cy="%.1f" r="4" fill="%s"/>' % (gx(a), gy(v), col)
        s += text(gx(a) + 8, gy(v) - 8, "%.1f" % v, 12, col, "start", 700)
    s += text(gx(67) + 12, gy(vals[-1]) + (-22 if col == EMER else 26), nm, 13, col, "start", 700)
c += svg(s)
c += caption(140, 170, "图 4", "就业人口比率 = 就业人口 ÷ 同龄同性别人口，城镇 = 城市 + 镇" + sup(1), 760)
drops = [("城镇男性 55-59 → 60-64 岁", "−40.4", "68.2% → 27.8%，跨过 60 岁"), ("城镇女性 45-49 → 50-54 岁", "−23.3", "69.0% → 45.7%，跨过 50 岁"), ("城镇女性 50-54 → 55-59 岁", "−20.3", "45.7% → 25.4%，跨过 55 岁")]
for i, (k, v, d_) in enumerate(drops):
    y = 196 + i * 116
    c += card(950, y, 266, 104)
    c += box(968, y + 10, 240, 20, font(12, 20, MUTED, 700), k)
    c += box(968, y + 32, 240, 40, serif(32, 40, EMER if i == 0 else INK, 700), v + '<span style="font-size:13px;font-weight:500;color:%s"> 个百分点</span>' % MUTED)
    c += box(968, y + 74, 240, 20, font(12, 20, MUTED), d_)
c += box(950, 548, 266, 40, font(12, 18, MUTED), "旧制度下的横截面描述，不是因果效应，也不是劳动参与率")
c += notes(["《中国人口普查年鉴 2020》长表：表 4-1 系列就业人口 ÷ 表 1-4 系列人口，计算。就业指普查前一周为取得收入工作 1 小时以上"])
pages.append(("6 就业断崖", c))

# 7 chapter: literature, with the map of the talk
c = photo("img-library", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(245,243,236,0.97) 0%, rgba(245,243,236,0.93) 48%, rgba(245,243,236,0.35) 78%, rgba(245,243,236,0.05) 100%)")
c += box(64, 64, 600, 20, font(13, 20, MUTED, 600, "letter-spacing: 4px"), RUN)
c += box(64, 150, 400, 130, serif(120, 130, EMER, 700), "§2")
c += box(64, 296, 760, 60, serif(44, 60, INK, 700, "white-space: nowrap"), "文献：国际证据方向一致")
c += box(64, 360, 700, 30, font(18, 30, MUTED), "中国还缺改革后的因果评估")
toc = [(1, "问题与背景", "2-6", False), (2, "文献与缺口", "8-11", True), (3, "研究设计", "12-15", False), (4, "计划", "16-17", False)]
s = line(64, 430, 640, 430, GOLD, 1)
for i, (n, nm, pp, cur) in enumerate(toc):
    y = 442 + i * 40
    col = EMER if cur else MUTED
    c += box(64, y, 60, 30, serif(17, 30, col, 700), "§%d" % n)
    c += box(124, y, 400, 30, serif(17, 30, INK if cur else MUTED, 700 if cur else 400), nm)
    c += box(540, y, 100, 30, font(13, 30, col, 400, "text-align: right"), "第 %s 页" % pp)
    if cur:
        s += rect(50, y + 6, 4, 18, GOLD)
c += svg(s)
c += box(64, 640, 600, 20, font(11, 20, MUTED), "图为 AI 生成的示意图")
pages.append(("7 章节 文献", c))

# 8 comparable studies
c = head(8, 2, "六项同口径研究方向一致：资格年龄窗口内就业上升 6.3 至 21.2 个百分点")
c += svg(rect(870, 200, 170, 312, EMERL))
c += caption(64, 168, "表 1", "提高领取资格年龄后，受影响年龄窗口内的就业与退休变化（个百分点）" + sup(1), 1000)
cols = [(64, "国家 · 研究", 300), (370, "改革", 300), (680, "测量时点", 190), (880, "就业", 150), (1046, "退休", 150)]
s = line(64, 200, 1216, 200, INK, 1.4)
for x, t_, w in cols:
    al = "right" if t_ in ("就业", "退休") else "left"
    c += box(x, 206, w, 22, font(12, 22, MUTED, 700, "text-align: %s" % al), t_)
s += line(64, 232, 1216, 232, LINE)
tbl = [("奥地利 · Staubli 和 Zweimüller 2013", "男 60→62，女 55→58.25", "受影响窗口", "男 +9.8 / 女 +11.0", "−24.8 / −25.4", ""),
       ("英国 · Cribb 等 2016", "女 60→61", "60 岁", "+6.3", "−11.5", ""),
       ("法国 · Rabaté 和 Rochut 2020", "最低领取 60→61", "60 岁", "+20.9", "−47.8", ""),
       ("德国 · Geyer 和 Welteke 2021", "1952 年起出生女性 60→63", "60 岁以上", "+13.5", "−27.6", "转引"),
       ("英国 · Cribb 等 2022", "男女 65→66", "65 岁", "男 +7.4 / 女 +8.5", "未报告", "工作论文"),
       ("荷兰 · Rabaté 等 2024", "65→66 岁 4 个月", "旧年龄后 1 个月", "+21.2", "−59.5", "")]
for i, (st, ref, at, emp, ret, tag) in enumerate(tbl):
    y = 236 + i * 46
    c += box(64, y + 12, 300, 22, serif(14, 22, INK, 600, "white-space: nowrap"), st)
    c += box(370, y + 12, 300, 22, font(13, 22, INK), ref)
    c += box(680, y + 12, 190, 22, font(13, 22, MUTED), at)
    c += box(880, y + 10, 150, 26, serif(17, 26, EMER, 700, "text-align: right; white-space: nowrap"), emp)
    c += box(1046, y + 12, 150, 22, font(14, 22, INK, 400, "text-align: right"), ret)
    if tag:
        c += chip(680 + int(tw(at, 13, 8)) + 10, y + 12, tag, MUTED, None, FAINT, 11, 20)
    s += line(64, y + 46, 1216, y + 46, LINE)
c += svg(s + line(64, 512, 1216, 512, INK, 1.4))
c += box(64, 528, 1152, 54, "background: %s; border-left: 3px solid %s; box-sizing: border-box; padding: 6px 16px; " % (GOLDL, GOLD) + font(14, 21, INK), "澳大利亚（Atalay 和 Barrett 2015）结果变量是每年的退休概率，不入此表。Morris（2022）控制女性队列趋势后，对劳动参与的效应降三分之二、不再显著" + sup(2))
c += notes(["各研究期刊版。德国一行转引自 Rabaté、Jongen 和 Atav（2024）表 6，英国 2022 为 IFS 工作论文 22/07", "Atalay 和 Barrett，Review of Economics and Statistics 2015；Morris，Review of Economics of the Household 2022"])
pages.append(("8 国际证据", c))

# 9 France: where the delayed retirees went
c = head(9, 2, "法国把领取年龄提高 1 岁：退休少了 47.8 个百分点，就业只接住 20.9")
c += caption(64, 168, "图 5", "法国 2010 年改革，60 岁时各状态的变化（个百分点）" + sup(1), 900)
BX0, SC = 160, 21.0  # px per point
segs = [("就业", 20.9, EMER, "#FFFFFF"), ("失业", 13.4, GOLD, INK), ("非活动", 6.2, INDIGO, "#FFFFFF"), ("残障", 5.9, PEBBLE, "#FFFFFF"), ("病休", 1.4, FAINT, INK)]
s = ""
c += box(64, 236, 90, 40, font(14, 40, INK, 700, "text-align: right"), "退休")
s += rect(BX0, 236, 47.8 * SC, 40, "#E7E3D5")
s += rect(BX0, 236, 47.8 * SC, 40, "none", 'stroke="%s" stroke-width="1.2" stroke-dasharray="4 3"' % PEBBLE)
c += box(BX0 + 16, 236, 600, 40, serif(20, 40, INK, 700), "−47.8")
c += box(64, 300, 90, 40, font(14, 40, INK, 700, "text-align: right"), "去了哪里")
x = BX0
labels = ""
for nm, v, col, fg in segs:
    w = v * SC
    s += rect(x, 300, w - 2, 40, col)
    if w > 70:
        labels += box(int(x) + 10, 300, int(w) - 14, 40, font(14, 40, fg, 700, "white-space: nowrap"), "%s +%.1f" % (nm, v))
    x += w
s += line(x + 6, 300, x + 6, 340, PEBBLE, 1)
c += box(int(x) + 14, 300, 220, 40, font(13, 40, MUTED, 400, "white-space: nowrap"), "残障 +5.9 · 病休 +1.4")
s += '<path d="M %.1f 280 L %.1f 296" stroke="%s" stroke-width="1.2" fill="none"/>' % (BX0 + 47.8 * SC, BX0 + 47.8 * SC, PEBBLE)
c = c.replace(box(BX0 + 16, 236, 600, 40, serif(20, 40, INK, 700), "−47.8"), "")
c += svg(s) + labels + box(BX0 + 16, 236, 600, 40, serif(20, 40, INK, 700), "−47.8")
c += box(BX0, 352, 1000, 22, font(13, 22, MUTED), "五个去向相加 = 47.8：20.9 + 13.4 + 6.2 + 5.9 + 1.4")
facts = [("改革前 60 岁就业率", "28.4%"), ("就业变化的标准误", "1.1"), ("就业接住的份额", "44%")]
for i, (k, v) in enumerate(facts):
    x = 160 + i * 340
    c += box(x, 420, 300, 20, font(13, 20, MUTED, 700), k + (sup(2) if i == 2 else ""))
    c += box(x, 444, 300, 50, serif(40, 50, EMER if i == 2 else INK, 700), v)
c += box(160, 530, 1000, 50, "border-left: 3px solid %s; padding-left: 16px; box-sizing: border-box; " % GOLD + font(15, 25, INK), "延后领取养老金不等于延后工作：法国、荷兰、奥地利的大部分差额流向失业、残障和病休，这是 H2 的依据")
c += notes(["Rabaté 和 Rochut（2020），Journal of Pension Economics and Finance 19(3)，表 4、表 5", "计算：20.9 ÷ 47.8"])
pages.append(("9 法国去向", c))

# 10 China's old-threshold studies
c = head(10, 2, "中国旧制度的断点研究：单位各异，都不是新政效果")
studies = [("door-open", "退休率跳升", "雷晓燕、谭力、赵耀辉 2010", "《经济学（季刊）》", "2005 年 1% 抽样，断点回归加工具变量", "男 60 岁 +7 至 11　女 50 岁 +8 至 13", "个百分点 · 退休率"),
           ("baby", "隔代照料", "Feng 和 Zhang 2018", "Feminist Economics", "CHARLS 2011、2013，法定年龄识别", "女 +29　男 +21", "个百分点 · 照料概率"),
           ("heart-pulse", "自评健康", "Che 和 Li 2018", "China Economic Review", "CHNS，以法定年龄为工具变量", "白领 −34", "个百分点 · 「一般或差」"),
           ("shopping-basket", "消费", "Li、Shi 和 Wu 2015", "AER Papers & Proceedings", "城镇住户调查，断点回归", "−20%", "非耐用品支出")]
s = ""
for i, (ic, topic, au, jn, data, res, unit) in enumerate(studies):
    x = 64 + (i % 2) * 584
    y = 168 + (i // 2) * 196
    c += card(x, y, 568, 182)
    s += icon(ic, x + 22, y + 22, 22, EMER)
    c += box(x + 54, y + 18, 300, 30, serif(19, 30, INK, 700), topic)
    c += chip(x + 568 - 22 - int(tw(unit, 11, 7) + 18), y + 22, unit, EMER, EMERL, None, 11, 22)
    c += box(x + 22, y + 58, 520, 22, serif(14, 22, INK, 600), au + '　<span style="font-weight:400;color:%s;font-style:italic">%s</span>' % (MUTED, jn))
    c += box(x + 22, y + 82, 520, 22, font(13, 22, MUTED), data)
    c += box(x + 22, y + 116, 520, 44, serif(26, 44, EMER, 700, "white-space: nowrap"), res)
c += svg(s)
c += box(64, 568, 1152, 44, "border-left: 3px solid %s; padding-left: 16px; box-sizing: border-box; " % GOLD + font(15, 44, INK), "四项的结果变量和单位各不相同，不比大小。识别的都是旧制度下 50、55、60 岁的跳跃" + sup(1))
c += notes(["四项均为同行评审期刊版，数字已核"])
pages.append(("10 中国研究", c))

# 11 literature map
c = head(11, 2, "文献地图：改革后的中国这一行还是空白")
c += caption(64, 168, "表 2", "已有证据覆盖了什么（行：证据来源，列：问题）", 900)
cols = ["就业效应", "去向：失业、残障、病休", "机制：照料、健康、消费"]
rowsm = [("globe", "国际改革评估", ["方向一致，+6.3 至 +21.2", "法国失业 +13.4，荷兰残障 +12.7", "意大利有前瞻反应"], False),
         ("landmark", "中国旧制度断点", ["退休率跳升清楚，直接看劳动供给的少", "本次检索未见", "照料、健康、消费较多"], False),
         ("circle-help", "中国新政之后", ["空白", "空白", "只有人口预测、事前模拟和舆情分析"], True)]
s = ""
CW = 300
for j, t_ in enumerate(cols):
    c += box(300 + j * (CW + 8), 204, CW, 24, font(13, 24, MUTED, 700), t_)
for i, (ic, nm, cells, gap) in enumerate(rowsm):
    y = 236 + i * 104
    s += icon(ic, 64, y + 38, 20, EMER)
    c += box(94, y + 34, 200, 30, serif(16, 30, INK, 700), nm)
    for j, t_ in enumerate(cells):
        x = 300 + j * (CW + 8)
        empty = t_ == "空白" or t_ == "本次检索未见"
        if empty:
            s += rect(x, y, CW, 96, "none", 'stroke="%s" stroke-width="1.4" stroke-dasharray="6 4" rx="4"' % (GOLD if gap else FAINT))
            c += box(x, y, CW, 96, "display: flex; align-items: center; justify-content: center; " + serif(16, 24, GOLD if gap else MUTED, 600), t_)
        else:
            c += box(x, y, CW, 96, "background: %s; border-radius: 4px; box-sizing: border-box; padding: 14px 16px; " % (EMERL if not gap else SURF) + font(14, 22, INK), t_)
c += svg(s)
c += box(300, 548, 916, 44, "background: %s; border-radius: 4px; box-sizing: border-box; padding-left: 16px; " % GOLDL + font(15, 44, INK, 600), "研究缺口：没有用改革后微观数据做的因果评估，两套公开数据也都停在新政之前" + sup(1))
c += notes(["第 8 至 10 页所列文献，赵晓航和李建新（2025），检索截至 2026-10-06"])
pages.append(("11 文献地图", c))

# 12 hypotheses
c = head(12, 3, "三个假设：到龄就业上升，部分流向失业，隔代照料减少")
hyps = [("H1", "到龄后就业上升", "预期为正", "arrow-up-right", "到了原法定年龄、未到新年龄的人更可能在业", "第 8 页六项同口径研究"),
        ("H2", "一部分流向失业", "预期为正", "git-fork", "退休的减少不全变成就业。《办法》第七条把失业保险延到法定年龄，是一条现成通道", "Rabaté 和 Rochut（2020），《办法》第七条"),
        ("H3", "隔代照料减少", "预期为负", "arrow-down-right", "原 50 岁女职工多工作 5 年，照料时间被挤出最多", "Feng 和 Zhang（2018），封进和韩旭（2017）")]
s = ""
for i, (h, t_, sign, ic, d_, basis) in enumerate(hyps):
    y = 168 + i * 130
    W = 820
    c += card(64, y, W, 118)
    c += box(84, y + 18, 80, 60, serif(40, 60, EMER, 700), h)
    s += icon(ic, 172, y + 30, 22, GOLD, 2.2)
    c += box(204, y + 22, 400, 30, serif(20, 30, INK, 700), t_)
    c += chip(64 + W - 22 - int(tw(sign, 12, 8) + 18), y + 24, sign, EMER, EMERL, None, 12, 24)
    c += box(204, y + 56, 650, 22, font(14, 22, INK), d_)
    c += box(204, y + 84, 650, 20, font(12, 20, MUTED), "依据：" + basis)
c += svg(s)
c += photo("img-grandparent", 904, 168, 312, 378)
c += box(904, 550, 312, 18, font(11, 18, MUTED), "示意：社区里接送孙辈（AI 生成）")
c += box(64, 568, 820, 40, "border-left: 3px solid %s; padding-left: 16px; box-sizing: border-box; " % GOLD + font(14, 40, INK), "只写预期方向，不预设大小：到 2026 年底剂量只有 5 至 8 个月，效应可能小到测不出")
pages.append(("12 假设", c))

# 13 the data gate
c = head(13, 3, "两套公开数据都停在新政之前，所以要设数据闸门")
TX0, TX1 = 220, 1180
def tx(y): return TX0 + (y - 2010) / (2027 - 2010) * (TX1 - TX0)
c += caption(64, 168, "图 6", "各轮调查与新政施行的先后（实心：已公开；空心：已实施、未见发布）" + sup(1), 1000)
s = rect(tx(2025), 206, tx(2027) - tx(2025), 232, GOLDL)
for yv in range(2010, 2028, 2):
    s += line(tx(yv), 214, tx(yv), 430, LINE, 1)
    s += text(tx(yv), 452, str(yv), 12, MUTED, "middle")
lanes = [("CHARLS", "45 岁及以上及配偶", 270, [2011, 2013, 2015, 2018, 2020], [2022]),
         ("CFPS", "家庭全部成员", 370, [2010, 2012, 2014, 2016, 2018, 2020, 2022], [2024, 2026])]
for nm, who, y, pub, unpub in lanes:
    c += box(64, y - 26, 150, 26, serif(18, 26, INK, 700), nm)
    c += box(64, y + 2, 150, 20, font(12, 20, MUTED), who)
    s += line(tx(2010), y, tx(2027), y, FAINT, 1.4)
    for yv in pub:
        s += '<circle cx="%.1f" cy="%d" r="8" fill="%s"/>' % (tx(yv), y, EMER)
    for yv in unpub:
        s += '<circle cx="%.1f" cy="%d" r="8" fill="%s" stroke="%s" stroke-width="2"/>' % (tx(yv), y, BG, EMER)
s += text(tx(2022), 300, "2021-23 追踪", 11, MUTED, "middle")
s += text(tx(2024), 400, "第八轮", 11, MUTED, "middle")
s += text(tx(2026), 400, "第九轮启动", 11, MUTED, "middle")
s += line(tx(2025), 200, tx(2025), 440, GOLD, 2.2)
s += text(tx(2025) + 8, 222, "2025-01-01 新政施行", 13, INK, "start", 700)
c += svg(s)
c += box(64, 480, 1152, 104, "background: %s; border-radius: 4px; " % EMERL, "")
c += svg(icon("lock", 88, 504, 26, EMER))
c += box(132, 496, 300, 34, serif(20, 34, EMER, 700), "数据闸门：2027 年 6 月")
c += box(132, 534, 1060, 40, font(15, 22, INK), "改革后的轮次公开之前，不估新政效果，只做改革前画像和旧阈值断点基准。过闸就做相邻出生队列比较，不过闸就深化基准")
c += notes(["CHARLS 官网与数据门户（2020 年数据 2023-11-16 发布），CFPS 官网与 2022 年数据发布会（2024-11-02）、第九轮启动通知（2026-07-03），核对至 2026-10-06"])
pages.append(("13 数据闸门", c))

# 14 identification
c = head(14, 3, "识别分两层：先用旧阈值断点打基准，过闸后再比较相邻出生队列")
designs = [("设计一　旧阈值断点", "现在就能做", [("处理组", "刚过 50、55、60 岁的人"), ("对照组", "刚到这些年龄前的人"), ("关键假设", "阈值附近其他因素连续"), ("方法", "模糊断点，McCrary 密度检验")], "rd"),
           ("设计二　相邻出生队列", "过闸以后", [("处理组", "1965 年 1 月起出生的男职工等"), ("对照组", "早几个月出生、按原年龄退休"), ("关键假设", "无改革时相邻队列走势平行"), ("方法", "多期双重差分，预趋势检验")], "did")]
s = ""
for i, (nm, when, rows_, kind) in enumerate(designs):
    x = 64 + i * 584
    c += card(x, 168, 568, 430)
    c += box(x + 24, 184, 400, 30, serif(20, 30, INK, 700), nm)
    c += chip(x + 568 - 24 - int(tw(when, 12, 8) + 18), 188, when, EMER if i == 0 else GOLD, EMERL if i == 0 else GOLDL, None, 12, 24)
    # schematic
    gx0, gy0, gw, gh = x + 40, 232, 488, 150
    s += line(gx0, gy0 + gh, gx0 + gw, gy0 + gh, PEBBLE, 1.2)
    s += line(gx0, gy0, gx0, gy0 + gh, PEBBLE, 1.2)
    if kind == "rd":
        cut = gx0 + gw / 2
        s += line(cut, gy0 - 4, cut, gy0 + gh, GOLD, 1.6, 'stroke-dasharray="5 4"')
        s += line(gx0 + 10, gy0 + 30, cut - 4, gy0 + 52, EMER, 2.6)
        s += line(cut + 4, gy0 + 96, gx0 + gw - 10, gy0 + 118, EMER, 2.6)
        for k in range(10):
            xx = gx0 + 22 + k * 22
            s += '<circle cx="%.1f" cy="%.1f" r="2.6" fill="%s"/>' % (xx, gy0 + 30 + (xx - gx0 - 10) / (cut - gx0 - 14) * 22 + (k % 3 - 1) * 5, PEBBLE)
            xx2 = cut + 14 + k * 22
            s += '<circle cx="%.1f" cy="%.1f" r="2.6" fill="%s"/>' % (xx2, gy0 + 96 + (xx2 - cut) / (gw / 2) * 22 + (k % 3 - 1) * 5, PEBBLE)
        s += text(cut, gy0 - 10, "法定年龄", 12, GOLD, "middle", 700)
        s += text(gx0 + gw, gy0 + gh + 18, "年龄 →", 12, MUTED, "end")
        s += text(gx0 - 6, gy0 + 8, "在业", 12, MUTED, "end")
        s += '<path d="M %.1f %.1f L %.1f %.1f" stroke="%s" stroke-width="1.4" marker-end="url(#ar)"/>' % (cut + 30, gy0 + 54, cut + 30, gy0 + 92, INK)
        s += text(cut + 40, gy0 + 78, "跳跃 = 效应", 12, INK, "start", 700)
    else:
        mid = gx0 + gw * 0.55
        s += line(mid, gy0 - 4, mid, gy0 + gh, GOLD, 1.6, 'stroke-dasharray="5 4"')
        s += '<polyline points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="2.6"/>' % (gx0 + 10, gy0 + 110, mid, gy0 + 80, gx0 + gw - 10, gy0 + 30, EMER)
        s += '<polyline points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="2.6"/>' % (gx0 + 10, gy0 + 128, mid, gy0 + 98, gx0 + gw - 10, gy0 + 68, PEBBLE)
        s += '<polyline points="%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="1.6" stroke-dasharray="4 4"/>' % (mid, gy0 + 80, gx0 + gw - 10, gy0 + 50, EMER)
        s += text(mid, gy0 - 10, "新政施行", 12, GOLD, "middle", 700)
        s += text(gx0 + gw - 6, gy0 + 24, "新规队列", 12, EMER, "end", 700)
        s += text(gx0 + gw - 6, gy0 + 88, "相邻旧规队列", 12, PEBBLE, "end", 700)
        s += text(gx0 + gw, gy0 + gh + 18, "时间 →", 12, MUTED, "end")
    for j, (k, v) in enumerate(rows_):
        y = 410 + j * 44
        s += line(x + 24, y, x + 544, y, LINE)
        c += box(x + 24, y + 10, 100, 24, font(13, 24, MUTED, 700), k)
        c += box(x + 124, y + 10, 420, 24, font(14, 24, INK), v)
s = '<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="%s"/></marker></defs>' % INK + s
c += svg(s)
c += notes(["方法：Lee 和 Lemieux（2010），Calonico、Cattaneo 和 Titiunik（2014），McCrary（2008），Callaway 和 Sant'Anna（2021），Roth 等（2023）"])
pages.append(("14 识别策略", c))

# 15 threats
c = head(15, 3, "五个威胁里，处理剂量小最难绕开")
c += caption(64, 168, "表 3", "对识别的威胁和应对", 900)
thr = [("hourglass", "处理剂量小", "到 2026 年底最多延迟 5 至 8 个月，窗口里样本少", "先做检验力分析，报告最小可检测效应"),
       ("git-compare", "平行趋势不成立", "Morris（2022）重估澳大利亚：控制队列趋势后效应降三分之二", "多期事件研究，加入出生队列趋势"),
       ("calendar-range", "预期效应", "《决定》公布到施行只有三个半月", "检验到龄前人群 2024 年 9 月后是否提前变化"),
       ("layers", "同期政策", "弹性退休、失业保险延期、2030 年起缴费年限提高", "就业、失业、领取分开估计，样本截至 2029 年"),
       ("user-round", "身份与样本", "只约束城镇职工，原 50 岁还是 55 岁难以识别", "用职业、单位类型和参保类型重建，做敏感性分析")]
s = line(64, 200, 1216, 200, INK, 1.4)
for x, t_ in [(64, "威胁"), (330, "为什么危险"), (790, "应对")]:
    c += box(x, 206, 300, 22, font(12, 22, MUTED, 700), t_)
s += line(64, 232, 1216, 232, LINE)
for i, (ic, nm, why, do) in enumerate(thr):
    y = 236 + i * 72
    if i == 0:
        c += svg(rect(64, y, 1152, 72, GOLDL) + rect(64, y, 3, 72, GOLD))
    s += icon(ic, 82, y + 24, 20, EMER)
    c += box(112, y + 20, 210, 30, serif(16, 30, INK, 700), nm)
    c += box(330, y + 14, 440, 44, font(14, 22, INK), why)
    c += box(790, y + 14, 420, 44, font(14, 22, INK, 600), do)
    s += line(64, y + 72, 1216, y + 72, LINE)
c += svg(s + line(64, 596, 1216, 596, INK, 1.4))
c += notes(["《决定》《办法》及附件（2024-09-13），Morris（2022），Atalay 和 Barrett（2015）"])
pages.append(("15 威胁", c))

# 16 plan with the gate as a milestone and a fork
c = head(16, 4, "进度：2027 年 6 月查数据闸门，两条路都能成文")
GX0, GX1 = 330, 1200
def mx(y, m): return GX0 + ((y - 2026) * 12 + m - 10) / 20 * (GX1 - GX0)
tasks = [("book-open", "文献与改革前画像", (2026, 10), (2027, 4)), ("git-compare", "旧阈值断点基准", (2027, 2), (2027, 7)), ("sigma", "检验力分析", (2027, 4), (2027, 6)),
         ("git-fork", "设计二或深化基准", (2027, 7), (2027, 12)), ("scroll-text", "写作与答辩", (2027, 9), (2028, 5))]
s = ""
for (yy, mm, lab) in [(2026, 10, "2026-10"), (2027, 1, "2027-01"), (2027, 4, "04"), (2027, 7, "07"), (2027, 10, "10"), (2028, 1, "2028-01"), (2028, 4, "04")]:
    s += line(mx(yy, mm), 186, mx(yy, mm), 520, LINE)
    s += text(mx(yy, mm), 178, lab, 12, MUTED, "middle")
for i, (ic, nm, a, b) in enumerate(tasks):
    y = 206 + i * 62
    s += icon(ic, 64, y + 8, 18, EMER)
    c += box(92, y + 2, 236, 30, serif(14, 30, INK, 700), nm)
    c += box(92, y + 28, 236, 18, font(11, 18, MUTED), "%d-%02d 至 %d-%02d" % (a[0], a[1], b[0], b[1]))
    s += rect(mx(*a), y + 8, mx(b[0], b[1] + 1) - mx(*a), 22, EMER if i != 3 else "none", 'rx="3"' + ('' if i != 3 else ' stroke="%s" stroke-width="1.6" stroke-dasharray="5 3"' % EMER))
gx = mx(2027, 6) + (mx(2027, 7) - mx(2027, 6)) / 2
s += line(gx, 186, gx, 520, GOLD, 1.6)
s += '<path d="M %.1f 528 L %.1f 540 L %.1f 552 L %.1f 540 Z" fill="%s"/>' % (gx, gx + 12, gx, gx - 12, GOLD)
c += svg(s)
c += box(int(gx) + 20, 528, 400, 26, serif(15, 26, INK, 700), "数据闸门 · 2027 年 6 月")
c += box(64, 574, 1152, 40, "border-left: 3px solid %s; padding-left: 16px; box-sizing: border-box; " % GOLD + font(14, 40, INK), "过闸：做相邻出生队列的新政评估。不过闸：以旧阈值断点基准和检验力分析为主体成文，共 20 个月")
pages.append(("16 进度", c))

# 17 questions for the committee
c = head(17, 4, "请委员会指导四个问题")
qs = [("lock", "闸门过不了怎么办", "2027 年 6 月仍拿不到改革后数据，以基准和检验力分析为主体是否可以"),
      ("users", "对照组怎么选", "只用相邻出生队列，还是加入不受新规约束的城乡居民养老保险参保人"),
      ("target", "结果变量报几个", "就业、失业、领取养老金、隔代照料都报，还是聚焦就业一项"),
      ("user-round", "女职工身份怎么认", "原 50 岁和原 55 岁女职工，用职业和单位类型重建，是否可以接受")]
s = ""
for i, (ic, q, d_) in enumerate(qs):
    x = 64 + (i % 2) * 410
    y = 168 + (i // 2) * 214
    c += card(x, y, 398, 202)
    c += box(x + 22, y + 18, 80, 40, serif(30, 40, EMER, 700), "Q%d" % (i + 1))
    s += icon(ic, x + 398 - 46, y + 24, 22, PEBBLE)
    c += box(x + 22, y + 70, 360, 32, serif(20, 32, INK, 700), q)
    c += box(x + 22, y + 112, 354, 70, font(14, 23, MUTED), d_)
c += svg(s)
c += photo("img-notebook", 904, 168, 312, 416)
c += box(904, 588, 312, 18, font(11, 18, MUTED), "示意：笔记本上的断点草图（AI 生成）")
pages.append(("17 请指导", c))

# 18 ending
c = box(64, 64, 600, 20, font(13, 20, MUTED, 600, "letter-spacing: 4px"), RUN)
c += svg(line(64, 96, 1216, 96, GOLD, 1))
c += box(64, 150, 600, 24, font(14, 24, EMER, 700, "letter-spacing: 3px"), "本报告要点")
pts = [("一", "改革前画像和旧阈值断点基准，现在就能做"), ("二", "新政效果要等改革后数据公开，过闸再估"), ("三", "剂量只有 5 至 8 个月，先报检验力，再报系数")]
for i, (n, t_) in enumerate(pts):
    y = 200 + i * 70
    c += box(64, y, 60, 50, serif(30, 50, GOLD, 700), n)
    c += box(124, y, 1000, 50, serif(28, 50, INK, 600), t_)
c += svg(line(64, 440, 1216, 440, LINE))
c += box(64, 480, 1152, 70, serif(46, 70, EMER, 700), "恳请各位老师批评指正")
pages.append(("18 结尾", c))

assert len(pages) == TOTAL, len(pages)
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
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "thesis 开题答辩样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
