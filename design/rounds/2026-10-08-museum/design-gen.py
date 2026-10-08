import json, os, re, datetime, math
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# museum: the gallery lights are off and the labels are still lit. Brown-black hall, one copper label, warm paper words.
BG = "#211A12"; SURF = "#2B241A"; CASE = "#30281D"; COPPER = "#BE7A28"; COPPERL = "#D9A15A"; PAPER = "#F4ECD8"; MUTED = "#C2B394"; LINE = "#403628"; DIM = "#8F8268"
SERIF = "'Songti SC', 'STSong', 'Noto Serif SC', Georgia, serif"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
KEYS = ["basalt", "beads", "crystal", "fragment", "jar", "vitrine", "volcanic"]
IMG = {k: "__%s__" % k for k in KEYS}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
TALK = "周末科普讲座 · 从月球背面带回来的土"

_cat = open('/Users/leon/projects/pptwise/src/icons/catalog.ts').read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=COPPER, sw=1.5):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + PAPER + "; font-family: " + SANS + """">
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


def font(size, lh, color=PAPER, weight=400, extra="", family=SANS):
    return "font-family: %s; font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (family, size, lh, color, weight, extra)


def serif(size, lh, color=PAPER, weight=400, extra=""):
    return font(size, lh, color, weight, extra, SERIF)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def line(x1, y1, x2, y2, c=LINE, w=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f"%s/>' % (x1, y1, x2, y2, c, w, d)


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400, fam="PingFang SC, sans-serif"):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def spot(cx, cy, r, op=0.22):
    """A pool of light on the gallery floor: warm, soft, nothing hard-edged."""
    return box(cx - r, cy - r, 2 * r, 2 * r, "border-radius: 50%%; background: radial-gradient(circle, rgba(244,220,170,%.2f) 0%%, rgba(244,220,170,0) 70%%)" % op)


def photo(key, x, y, w, h, pos="50% 50%", round_=False):
    st = "overflow: hidden; " + ("border-radius: 50%; " if round_ else "")
    return box(x, y, w, h, st, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover; object-position: %s">' % (w, h, pos))


def cap(x, y, w, t_, align="left"):
    return box(x, y, w, 16, font(10, 16, DIM, 400, "text-align: %s; letter-spacing: 0.5px" % align), t_)


def hall(pg, room):
    """The hall sign top left, the room number bottom right like a gallery door plate."""
    out = box(64, 34, 700, 18, font(11, 18, COPPER, 500, "letter-spacing: 4px"), room)
    out += svg(line(64, 58, 1216, 58, LINE, 1))
    out += box(64, 678, 700, 18, font(10, 18, DIM, 400, "letter-spacing: 2px"), TALK)
    out += box(1156, 672, 60, 28, "border: 1px solid %s; " % LINE + serif(14, 26, MUTED, 400, "text-align: center"), "%02d" % pg)
    return out


def title(t_, y=74, h=80, x=64, w=1152, size=32):
    return box(x, y, w, h, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(size, size + 12, PAPER, 400), "<div>" + t_ + "</div>")


def label(x, y, w, no, name, era, lines, learn, src, h=None):
    """An exhibit label: copper number, the object's name, its age or date, a few lines of fact, what it taught us, the source in small print."""
    out = box(x, y, w, h, "background: %s; border-top: 2px solid %s; padding: 22px 26px 18px; box-sizing: border-box; " % (SURF, COPPER), "")
    out += box(x + 26, y + 20, w - 52, 18, font(11, 18, COPPER, 600, "letter-spacing: 4px"), no)
    out += box(x + 26, y + 44, w - 52, 40, serif(26, 36, PAPER, 400), name)
    out += box(x + 26, y + 86, w - 52, 22, serif(15, 22, COPPERL, 400), era)
    yy = y + 122
    for l_ in lines:
        out += box(x + 26, yy, w - 52, 22, font(13, 22, MUTED), l_)
        yy += 24
    yy += 10
    out += svg(line(x + 26, yy, x + w - 26, yy, LINE, 1))
    out += box(x + 26, yy + 12, 120, 18, font(11, 18, COPPER, 600, "letter-spacing: 2px"), "它让我们知道")
    out += box(x + 26, yy + 36, w - 52, 96, serif(22, 34, PAPER, 400), learn)
    out += box(x + 26, (y + h - 40) if h else yy + 110, w - 52, 30, font(10, 15, DIM), src)
    return out


pages = []

# 1 cover: the jar in its pool of light, the title set like the wall text at a show's entrance
c = photo("jar", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(33,26,18,0.95) 0%, rgba(33,26,18,0.7) 38%, rgba(33,26,18,0.05) 70%)")
c += box(64, 64, 600, 20, font(12, 20, COPPER, 500, "letter-spacing: 6px"), "周末科普讲座")
c += svg(line(64, 94, 200, 94, COPPER, 1))
c += box(64, 300, 720, 140, serif(64, 76, PAPER, 400), "从月球背面<br>带回来的土")
c += box(64, 470, 600, 28, font(17, 28, MUTED), "嫦娥五号、嫦娥六号的月球样品，一件一件看")
c += box(64, 610, 400, 20, serif(14, 20, DIM, 400, "letter-spacing: 6px"), "二〇二六年十月")
c += cap(900, 690, 316, "样品瓶示意（AI 生成，非样品实拍）", "right")
pages.append(("1 封面", c))

# 2 the guide: a floor plan, four rooms, seven numbered exhibits on a dotted walk
c = hall(2, "导览")
c += title("今天走四个展厅，看七件展品")
rooms = [(64, 200, 250, 380, "序厅", "两次任务，和阿波罗、月球号比一比", []), (330, 200, 300, 380, "第一展厅", "月球正面的土", [(1, "玄武岩"), (2, "玻璃珠里的水"), (3, "玻璃珠和新矿物")]),
         (646, 200, 300, 380, "第二展厅", "月球背面的土", [(4, "28 亿年的玄武岩"), (5, "最老的那块碎屑"), (6, "月幔")]), (962, 200, 254, 380, "第三展厅", "去向和问题", [(7, "展柜里的月壤")])]
s = ""
pts = []
for x, y, w, h, nm, d_, objs in rooms:
    s += '<rect x="%d.5" y="%d.5" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1"/>' % (x, y, w, h, SURF, LINE)
    s += '<rect x="%d" y="%d" width="40" height="4" fill="%s"/>' % (x + w // 2 - 20, y + h - 2, BG)
    c += box(x + 22, y + 20, w - 44, 30, serif(22, 30, PAPER, 400), nm)
    c += box(x + 22, y + 54, w - 44, 40, font(12, 20, MUTED), d_)
    for j, (n, t_) in enumerate(objs):
        oy = y + 130 + j * 80
        s += '<circle cx="%d" cy="%d" r="16" fill="%s"/>' % (x + 40, oy, COPPER)
        s += text(x + 40, oy + 5, str(n), 14, BG, "middle", 700, "Songti SC, serif")
        c += box(x + 66, oy - 11, w - 86, 22, font(14, 22, PAPER), t_)
        pts.append((x + 40, oy))
    if not objs:
        s += icon("rocket", x + 22, y + 118, 28, COPPER, 1.4) + icon("moon", x + 62, y + 118, 28, COPPER, 1.4)
path = "M 189 330 L %d 330 " % (pts[0][0] - 16) + " ".join("L %d %d" % p for p in pts)
s += '<path d="%s" fill="none" stroke="%s" stroke-width="1.4" stroke-dasharray="2 5" opacity="0.8"/>' % (path, COPPER)
c = c.replace(title("今天走四个展厅，看七件展品"), title("今天走四个展厅，看七件展品") + svg(s), 1)
c += box(64, 606, 600, 20, font(11, 20, DIM, 400, "letter-spacing: 2px"), "虚线为参观路线")
pages.append(("2 导览", c))

# 3 two jars: the near side and the far side, the masses large, the drill share marked as estimated
c = hall(3, "序厅")
c += title("两次任务，两罐土：一罐来自正面，一罐来自背面")
s = ""
for i, (nm, side, mass, where, dates, split, mx) in enumerate((("嫦娥五号", "正面", "1,731", "风暴洋北部，北纬约 43 度", "2020-11-24 发射　12-17 返回　共 23 天", "表取约 1,480 克　钻取约 250 克（推算）", 64),
                                                              ("嫦娥六号", "背面", "1,935.3", "南极–艾特肯盆地里的阿波罗盆地", "2024-05-03 发射　06-25 返回　约 53 天", "表取约 1,610 克　钻取约 325 克（推算）", 664))):
    cx = mx + 70
    s += '<circle cx="%d" cy="290" r="54" fill="%s" stroke="%s" stroke-width="1"/>' % (cx, CASE, LINE)
    s += '<circle cx="%d" cy="290" r="54" fill="none" stroke="%s" stroke-width="1" stroke-dasharray="1 4"/>' % (cx, DIM)
    lx, ly = (cx - 20, 262) if i == 0 else (cx + 6, 330)
    s += '<circle cx="%d" cy="%d" r="6" fill="%s"/>' % (lx, ly, COPPER) + '<circle cx="%d" cy="%d" r="12" fill="none" stroke="%s" stroke-width="1"/>' % (lx, ly, COPPER)
    s += text(cx, 368, "月球" + side, 12, MUTED, "middle")
    c += box(mx + 160, 220, 400, 28, serif(22, 28, PAPER, 400), nm)
    c += box(mx + 160, 252, 400, 22, font(13, 22, MUTED), where)
    c += box(mx + 160, 278, 420, 110, serif(84, 110, COPPER if i else PAPER, 400), mass + '<span style="font-size:24px; font-family:%s"> 克</span>' % SANS)
    s += line(mx, 410, mx + 552, 410, LINE, 1)
    c += box(mx, 424, 552, 22, font(13, 22, MUTED), dates)
    c += box(mx, 452, 552, 22, font(13, 22, MUTED), split)
c += svg(s + line(640, 220, 640, 480, LINE, 1))
c += box(64, 520, 1152, 26, serif(17, 26, PAPER, 400), '两罐合计 3,666.3 克。嫦娥六号带回的是<span style="color:%s">人类第一份月背样品</span>' % COPPER)
c += box(64, 560, 1152, 22, font(12, 22, DIM), "钻取量官方没有公布，是用总量减去表取量推算的")
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：国家航天局样品交接公告（2020-12、2024-06），国家天文台报告（2022），National Science Review（2024）")
pages.append(("3 两罐土", c))

# 4 next to Apollo: areas to scale, the little one barely a speck
c = hall(4, "序厅")
c += title("论重量不到阿波罗的百分之一，论地点是第一次到月背")
K = 360 / math.sqrt(382000)
s = ""
for nm, g, x, col, lab in (("阿波罗 6 次载人登月", 382000, 64, CASE, "约 382 千克"), ("嫦娥五号 + 六号", 3666.3, 460, COPPER, "3.67 千克"), ("月球号 3 次无人采样", 300, 560, DIM, "约 0.3 千克")):
    side = math.sqrt(g) * K
    s += '<rect x="%d" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="%s" stroke-width="1"/>' % (x, 560 - side, side, side, col, LINE if col == CASE else col)
s += text(64, 588, "阿波罗 6 次载人登月", 13, PAPER) + text(64, 606, "约 382 千克", 12, MUTED)
s += line(475, 530, 475, 420, COPPER, 1) + text(484, 426, "嫦娥五号＋六号", 13, COPPERL) + text(484, 444, "3.67 千克", 12, MUTED)
s += line(568, 552, 568, 470, DIM, 1) + text(577, 476, "月球号 3 次", 13, MUTED) + text(577, 494, "约 0.3 千克", 12, DIM)
c += svg(s)
c += box(780, 210, 436, 130, serif(110, 130, PAPER, 400), '约 104<span style="font-size:30px; font-family:%s"> 倍</span>' % SANS)
c += box(784, 344, 420, 24, font(14, 24, MUTED), "阿波罗总量是两次嫦娥合计的倍数")
c += svg(line(784, 392, 900, 392, COPPER, 1))
c += box(780, 412, 436, 110, serif(64, 80, COPPER, 400), '第 1 次')
c += box(784, 492, 420, 48, font(14, 24, MUTED), "此前所有采样返回，都在月球正面")
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：NASA 月球样品馆藏与 NSSDC 着陆表，国家航天局。方块面积按质量等比例画。月球号为约数，分项相加 321 至 326 克，看月球 20 号按 50 克还是 55 克计")
pages.append(("4 对照", c))


def chapter(pg, no, nm, sub):
    c = spot(900, 380, 360, 0.16)
    c += box(64, 34, 700, 18, font(11, 18, COPPER, 500, "letter-spacing: 4px"), no)
    c += svg(line(64, 58, 1216, 58, LINE, 1))
    c += box(64, 250, 900, 40, font(14, 24, COPPER, 500, "letter-spacing: 10px"), no)
    c += box(64, 290, 1000, 100, serif(68, 96, PAPER, 400), nm)
    c += svg(line(64, 416, 184, 416, COPPER, 1.4))
    c += box(64, 436, 900, 28, font(16, 28, MUTED, 400, "letter-spacing: 2px"), sub)
    c += box(1156, 672, 60, 28, "border: 1px solid %s; " % LINE + serif(14, 26, MUTED, 400, "text-align: center"), "%02d" % pg)
    return c


pages.append(("5 第一展厅", chapter(5, "第一展厅", "月球正面的土", "嫦娥五号　2020 年　风暴洋北部")))


def exhibit(pg, room, ttl, key, pos, capt, no, name, era, lines, learn, src):
    c = hall(pg, room)
    c += title(ttl)
    c += spot(330, 420, 300, 0.2)
    c += photo(key, 120, 190, 420, 420, pos, True)
    c += svg('<circle cx="330" cy="400" r="214" fill="none" stroke="%s" stroke-width="1"/>' % LINE)
    c += cap(120, 626, 420, capt, "center")
    c += label(660, 182, 556, no, name, era, lines, learn, src, 470)
    return c


pages.append(("6 展品 1", exhibit(6, "第一展厅 · 月球正面的土", "约 20 亿年的玄武岩：月球的火山熄得比原以为晚", "basalt", "50% 50%", "玄武岩薄片显微示意（AI 生成，非样品实拍）",
                                  "展品 1", "嫦娥五号玄武岩", "约 20 亿年", ["两篇论文：20.30 亿年，19.63 亿年", "当时的月球磁场：2 至 4 微特斯拉，很弱，还在"],
                                  "月球的火山活动，<br>比此前已知的又延续了约 8 至 9 亿年", "来源：Li 等（Nature，2021），Che 等（Science，2021），Cai 等（Science Advances，2025）")))

# 7 which water: ranges on one log scale, each from its own paper
c = hall(7, "第一展厅 · 月球正面的土")
c += title("说月壤里有水，先问是哪里的水")
X0, X1 = 380, 1150
lx = lambda v: X0 + (math.log10(max(v, 0.5)) - math.log10(0.5)) / (math.log10(5000) - math.log10(0.5)) * (X1 - X0)
rows = [("颗粒最外约 100 纳米", "太阳风注入的氢", 1116, 2516, "PNAS，2022", False), ("撞击玻璃珠", "太阳风来源，不到 15 年补满一次", 0.5, 1909, "Nature Geoscience，2023", True),
        ("整片月壤，几种方法", "", 28.5, 170, "Nature Communications，2022", False), ("嫦娥五号的月幔源区", "岩浆里带上来的", 1, 5, "Nature，2021", False)]
s = ""
for t_ in (1, 10, 100, 1000):
    s += line(lx(t_), 200, lx(t_), 530, LINE, 1, "1 4") + text(lx(t_), 552, "{:,}".format(t_), 11, DIM, "middle")
s += text(X1, 572, "微克每克（对数刻度）", 11, DIM, "end")
for i, (nm, d_, a, b, src, hot) in enumerate(rows):
    y = 226 + i * 78
    c += box(64, y - 14, 300, 26, serif(17, 26, PAPER if not hot else COPPERL, 400), nm)
    if d_:
        c += box(64, y + 14, 300, 20, font(11, 20, DIM), d_)
    col = COPPER if hot else MUTED
    s += '<rect x="%.1f" y="%d" width="%.1f" height="10" rx="5" fill="%s"/>' % (lx(a), y - 5, max(lx(b) - lx(a), 10), col)
    lab = ("0" if a < 1 else "{:g}".format(a)) + " 至 " + "{:,}".format(b) + (" 以上" if b == 170 else "")
    s += text(lx(b) + 12, y + 4, lab, 13, PAPER if hot else MUTED, "start", 500)
    s += text(lx(b) + 12, y + 22, src, 10, DIM, "start")
c += svg(s)
c += box(64, 590, 1100, 26, serif(16, 26, PAPER, 400), "它们都是锁在矿物和玻璃里的氢和羟基，不是能喝的水")
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：PNAS（2022），Nature Geoscience（2023），Nature Communications（2022），Nature（2021）。撞击玻璃珠下限为 0，画在刻度起点")
pages.append(("7 哪里的水", c))

# 8 under the microscope: three round fields of view, each with its line
c = hall(8, "第一展厅 · 月球正面的土")
c += title("显微镜下：玻璃珠和三种新矿物")
s = ""
for i, (k, nm, d_) in enumerate((("beads", "撞击玻璃珠", "约 3000 颗里取样分析"), ("volcanic", "火山玻璃珠", "其中 3 颗是火山喷出的，约 1.2 亿年"), ("crystal", "嫦娥石", "约 10 微米的单晶，一种含钇的磷酸盐"))):
    cx = 240 + i * 400
    c += spot(cx, 330, 190, 0.16)
    c += photo(k, cx - 140, 190, 280, 280, "50% 50%", True)
    s += '<circle cx="%d" cy="330" r="150" fill="none" stroke="%s" stroke-width="1"/>' % (cx, LINE)
    s += '<circle cx="%d" cy="330" r="150" fill="none" stroke="%s" stroke-width="2" stroke-dasharray="1 18" opacity="0.7"/>' % (cx, COPPER)
    c += box(cx - 170, 496, 340, 30, serif(22, 30, COPPERL if i == 1 else PAPER, 400, "text-align: center"), nm)
    c += box(cx - 170, 530, 340, 44, font(13, 22, MUTED, 400, "text-align: center"), d_)
c += svg(s)
c += box(64, 590, 1152, 26, serif(16, 26, PAPER, 400, "text-align: center"), '2026 年又批准镁嫦娥石、铈嫦娥石，从嫦娥五号样品里一共认出 <span style="color:%s">3 种新矿物</span>' % COPPER)
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：Science（2024），国家航天局（2022-09、2026-09），国际矿物学协会新矿物通讯。三张显微图均为 AI 生成示意，非样品实拍")
pages.append(("8 显微镜下", c))

pages.append(("9 第二展厅", chapter(9, "第二展厅", "月球背面的土", "嫦娥六号　2024 年　南极–艾特肯盆地")))

pages.append(("10 展品 4", exhibit(10, "第二展厅 · 月球背面的土", "约 28 亿年前，月球背面也喷发过", "fragment", "50% 60%", "玄武岩碎屑示意（AI 生成，非样品实拍）",
                                   "展品 4", "嫦娥六号主体玄武岩", "约 28 亿年", ["三篇论文：28.07、28.23、28.30 亿年", "当时的月球磁场：5 至 21 微特斯拉，比 20 亿年前强"],
                                   "月背约 28 亿年前喷发过，<br>那时月球的磁场减弱之后又回升过", "来源：Zhang 等（Nature，2024），Cui 等（Science，2024），Che 等（Science，2025），Cai 等（Nature，2024）")))

# 11 the oldest: one number in the light, the label honest that it is one fragment
c = spot(640, 340, 380, 0.18)
c += box(64, 34, 700, 18, font(11, 18, COPPER, 500, "letter-spacing: 4px"), "第二展厅 · 月球背面的土")
c += svg(line(64, 58, 1216, 58, LINE, 1))
c += box(64, 150, 1152, 20, font(12, 20, COPPER, 600, "letter-spacing: 6px; text-align: center"), "展品 5")
c += box(64, 200, 1152, 190, serif(170, 190, COPPER, 400, "text-align: center"), '42.03<span style="font-size:52px"> 亿年</span>')
c += svg(line(580, 420, 700, 420, LINE, 1))
c += box(240, 444, 800, 32, serif(22, 32, PAPER, 400, "text-align: center"), "一块高铝玄武岩碎屑，返回样品里最老的玄武岩")
c += box(240, 486, 800, 26, font(14, 26, MUTED, 400, "text-align: center"), "目前只有这一块作证据，说明月背约 42 亿年前已有火山活动")
c += box(240, 600, 800, 20, font(10, 20, DIM, 400, "text-align: center"), "来源：Zhang 等（Nature，2024）")
c += box(64, 678, 700, 18, font(10, 18, DIM, 400, "letter-spacing: 2px"), TALK)
c += box(1156, 672, 60, 28, "border: 1px solid %s; " % LINE + serif(14, 26, MUTED, 400, "text-align: center"), "11")
pages.append(("11 最老", c))

# 12 the mantle: near and far ranges on one log axis, the overlap shown, plus how reduced
c = hall(12, "第二展厅 · 月球背面的土")
c += title("月背的月幔可能更干，也更「还原」")
X0, X1 = 200, 1150
lx = lambda v: X0 + (math.log10(v) - math.log10(0.5)) / (math.log10(500) - math.log10(0.5)) * (X1 - X0)
s = ""
for t_ in (1, 10, 100):
    s += line(lx(t_), 206, lx(t_), 392, LINE, 1, "1 4") + text(lx(t_), 412, str(t_), 11, DIM, "middle")
s += text(X1, 432, "月幔源区含水，微克每克（对数刻度）", 11, DIM, "end")
bars = [("月球正面样品，总体", 1, 200, MUTED, 230), ("嫦娥五号", 1, 5, PAPER, 290), ("嫦娥六号（背面）", 1, 1.5, COPPER, 350)]
for nm, a, b, col, y in bars:
    c += box(64, y - 12, 140, 24, font(13, 24, col if col != MUTED else MUTED, 500), nm)
    s += '<rect x="%.1f" y="%d" width="%.1f" height="10" rx="5" fill="%s"/>' % (lx(a), y - 5, max(lx(b) - lx(a), 12), col)
    s += text(lx(b) + 12, y + 5, "{:g} 至 {:g}".format(a, b), 13, col, "start", 500)
s += '<rect x="%.1f" y="214" width="%.1f" height="170" fill="%s" opacity="0.12"/>' % (lx(1), lx(1.5) - lx(1), COPPER)
c += svg(s)
c += box(64, 456, 1152, 24, font(13, 24, MUTED), "铜色竖带是嫦娥六号的范围，落在正面范围的最低端，和嫦娥五号的估计有重叠。论文的说法是「可能更干」")
c += svg(line(64, 500, 1216, 500, LINE, 1))
for i, (nm, v, d_) in enumerate((("正面", "−0.80 ± 0.64", "阿波罗与嫦娥五号玄武岩"), ("背面", "−1.93 ± 0.58", "嫦娥六号，5 克月壤里筛出 578 颗颗粒"))):
    x = 64 + i * 580
    c += box(x, 516, 200, 20, font(11, 20, COPPER, 600, "letter-spacing: 3px"), "氧逸度 ΔIW · " + nm)
    c += box(x, 540, 300, 50, serif(36, 50, COPPER if i else PAPER, 400), v)
    c += box(x + 300, 556, 260, 22, font(12, 22, DIM), d_)
c += box(64, 596, 1152, 22, font(12, 22, MUTED), "「更还原」指岩浆形成时可用的氧更少")
c += box(64, 632, 1100, 30, font(10, 15, DIM), "来源：He 等（Nature，2025），Zhang 等（Nature Communications，2025），Hu 等（Nature，2021）")
pages.append(("12 月幔", c))

pages.append(("13 第三展厅", chapter(13, "第三展厅", "土的去向，和留下的问题", "样品去了哪里　还有什么不知道　下次来看什么")))

# 14 a timeline: missions as copper lamps, papers as small labels hung from the line
c = hall(14, "第三展厅 · 去向和问题")
c += title("2020 到 2026 年：两次任务，一串论文")
ev = [("2020-12", "嫦娥五号返回", "约 1,731 克", True), ("2021-10", "20 亿年玄武岩", "Nature、Science", False), ("2022-09", "嫦娥石发布", "新矿物", False), ("2023-03", "玻璃珠里的水", "Nature Geoscience", False),
      ("2024-06", "嫦娥六号返回", "1,935.3 克", True), ("2024-11", "月背玄武岩", "Nature、Science", False), ("2025-04", "月背月幔的水", "Nature", False), ("2026-04", "两种新矿物", "共 3 种新矿物", False)]
x0, x1 = 96, 1184
d0 = 2020 + 11 / 12; d1 = 2026 + 3 / 12
xof = lambda d: x0 + (d - d0) / (d1 - d0) * (x1 - x0)
s = line(x0 - 20, 380, x1 + 20, 380, MUTED, 1.2)
for yr in range(2021, 2027):
    s += line(xof(yr), 374, xof(yr), 386, MUTED, 1) + text(xof(yr), 404, str(yr), 11, DIM, "middle")
for i, (d, nm, sub, big) in enumerate(ev):
    yy, mm = d.split("-")
    x = xof(int(yy) + (int(mm) - 1) / 12)
    up = i % 2 == 0
    if big:
        s += '<circle cx="%.1f" cy="380" r="12" fill="%s"/>' % (x, COPPER) + '<circle cx="%.1f" cy="380" r="22" fill="none" stroke="%s" stroke-width="1" opacity="0.6"/>' % (x, COPPER)
    else:
        s += '<circle cx="%.1f" cy="380" r="5" fill="%s"/>' % (x, PAPER)
    ty = 236 if up else 436
    s += line(x, 380 + (-24 if up else 24), x, ty + (68 if up else -4), LINE, 1)
    c += box(int(x - 80), ty, 160, 18, font(11, 18, COPPER if big else DIM, 500, "text-align: center; letter-spacing: 1px"), d)
    c += box(int(x - 80), ty + 20, 160, 26, serif(16 if not big else 18, 26, COPPERL if big else PAPER, 400, "text-align: center"), nm)
    c += box(int(x - 80), ty + 46, 160, 18, font(11, 18, MUTED, 400, "text-align: center"), sub)
c += svg(s)
c += box(64, 556, 1152, 26, serif(16, 26, PAPER, 400), "月背样品返回不到 5 个月，第一批年龄结果就发表了")
c += box(64, 630, 1100, 30, font(10, 15, DIM), "论文按首次在线时间，只列今天讲到的。铜色大点为任务返回")
pages.append(("14 时间线", c))

# 15 where it went: one bar of 3,666.3 g, the 4% sliver in copper, three labels for the three paths
c = hall(15, "第三展厅 · 去向和问题")
c += title("约 148 克发给了科研团队，约占两次总量的 4%")
W = 1088
s = '<rect x="64" y="210" width="%d" height="56" fill="%s" stroke="%s" stroke-width="1"/>' % (W + 64, CASE, LINE)
sl = (148 / 3666.3) * (W + 64)
s += '<rect x="64" y="210" width="%.1f" height="56" fill="%s"/>' % (sl, COPPER)
s += text(64 + sl + 14, 244, "约 148 克　约 4%", 16, COPPERL, "start", 600, "Songti SC, serif")
s += text(1216, 290, "两次合计 3,666.3 克", 12, MUTED, "end")
c += svg(s)
for i, (ic, nm, d_) in enumerate((("microscope", "科研借用", "国内分十批，多按毫克发放。国际首批 6 国 7 家机构获得 2.18 克"), ("gift", "赠送", "俄罗斯、法国各获赠 1.5 克。2026 年 9 月赠予联合国一份月背月壤"), ("landmark", "公益展出", "国家博物馆 2021 年入藏 100 克，北京天文馆 2024 年起展出 0.6 克"))):
    x = 64 + i * 392
    c += box(x, 336, 368, 220, "background: %s; border-top: 2px solid %s" % (SURF, COPPER if i == 0 else LINE), "")
    c += svg(icon(ic, x + 24, 362, 24, COPPER, 1.4))
    c += box(x + 24, 400, 320, 32, serif(22, 32, PAPER, 400), nm)
    c += box(x + 24, 442, 320, 96, font(14, 24, MUTED), d_)
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：国家航天局发放公告（2021–2026），央视（2025-08），国家博物馆，北京天文馆。约 148 克按官方累计数计算")
pages.append(("15 去向", c))

# 16 what we still don't know: five blank labels with dashed edges, each a question
c = hall(16, "第三展厅 · 去向和问题")
c += title("我们还不知道的五件事")
qs = [("月球为什么到 20 亿年前还有岩浆", "源区不富产热元素，也不湿"), ("月背火山是两期，还是一直在喷", "42 亿年和 28 亿年之间，样品说不了"), ("南极–艾特肯盆地有多老", "嫦娥六号给出约 42.5 亿年，另一研究约 43.3 亿年"),
      ("磁场靠什么撑到 20 亿年前", "底部的岩浆洋、岁差，或者别的机制"), ("月背月幔为什么极度亏损", "天生如此，还是被大撞击抽走了熔体")]
s = ""
for i, (q, d_) in enumerate(qs):
    x = 64 + (i % 3) * 392 if i < 3 else 260 + (i - 3) * 392
    y = 196 if i < 3 else 412
    s += '<rect x="%d.5" y="%d.5" width="368" height="192" fill="none" stroke="%s" stroke-width="1" stroke-dasharray="4 4"/>' % (x, y, MUTED)
    c += box(x + 24, y + 20, 200, 18, font(11, 18, COPPER, 600, "letter-spacing: 3px"), "问题 %d" % (i + 1))
    c += box(x + 24, y + 46, 320, 64, serif(20, 32, PAPER, 400), q)
    c += box(x + 24, y + 118, 320, 44, font(12, 22, MUTED), d_)
    c += box(x + 24, y + 160, 320, 18, font(10, 18, DIM, 400, "letter-spacing: 2px"), "尚无定论")
c += svg(s)
c += box(64, 630, 1100, 30, font(10, 15, DIM), "来源：Nature（2021、2024、2025），National Science Review（2025），Nature Astronomy（2024）")
pages.append(("16 未知", c))

# 17 next visit: the case on the right, five things to read off a label, pointed at a blank label
c = hall(17, "第三展厅 · 去向和问题")
c += photo("vitrine", 760, 72, 456, 560, "50% 45%")
c += cap(760, 640, 456, "展柜示意（AI 生成），展签留白", "right")
c += title("下次来馆里看月壤，留意展签上的这几处", w=660)
tips = [("看出处", "哪次任务，正面还是背面"), ("看取法", "表取还是钻取"), ("看颜色", "嫦娥六号的比五号略浅"), ("看克数", "展出的多以克计"), ("找显微镜", "颗粒多数不到 10 微米")]
s = ""
for i, (k, d_) in enumerate(tips):
    y = 210 + i * 76
    c += box(64, y, 60, 50, serif(36, 50, COPPER, 400), str(i + 1))
    c += box(130, y + 2, 200, 28, serif(20, 28, PAPER, 400), k)
    c += box(130, y + 32, 560, 22, font(13, 22, MUTED), d_)
    s += line(130, y + 64, 690, y + 64, LINE, 1)
c += svg(s)
c += box(64, 600, 660, 30, font(10, 15, DIM), "依据：国家天文台报告（2022），National Science Review（2022、2024），国家博物馆、北京天文馆公开信息")
pages.append(("17 下次来", c))

# 18 closing: the hall lights down, one label still lit
c = spot(640, 360, 320, 0.14)
c += box(64, 34, 700, 18, font(11, 18, COPPER, 500, "letter-spacing: 4px"), "周末科普讲座")
c += svg(line(64, 58, 1216, 58, LINE, 1))
c += box(64, 270, 1152, 90, serif(64, 90, PAPER, 400, "text-align: center; letter-spacing: 4px"), "土很少，问题很多")
c += svg(line(600, 392, 680, 392, COPPER, 1.4))
c += box(64, 416, 1152, 28, font(16, 28, MUTED, 400, "text-align: center; letter-spacing: 4px"), "谢谢各位，下面是提问时间")
c += box(64, 600, 1152, 20, serif(13, 20, DIM, 400, "text-align: center; letter-spacing: 6px"), "二〇二六年十月")
pages.append(("18 结尾", c))

assert len(pages) == TOTAL, len(pages)
boards = {}; order_ = []; cells = []
for i, (ttl, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(ttl, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(ttl + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, PAPER, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "museum 月壤科普讲座样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
