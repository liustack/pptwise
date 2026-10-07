import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# crayon: a box of crayons on drawing paper. Rounded, hand-drawn, not one cold grey.
BG = "#FFF9F0"; SURF = "#FFFFFF"; INK = "#1E2340"; MUTED = "#6E655A"; LINE = "#F0E6D6"
BLUE = "#0B87C7"; SKY = "#14B4FF"; ORANGE = "#FF6A12"; GREEN = "#15D157"; DGREEN = "#0E8437"; YELLOW = "#FFD100"
RED = "#F25C54"; PURPLE = "#7452E0"; ORANGE_INK = "#C24E00"
TINT = {RED: "#FDE4E2", ORANGE: "#FFE8D9", YELLOW: "#FFF4C2", GREEN: "#DDF7E6", SKY: "#DCF2FF", PURPLE: "#ECE6FF", BLUE: "#DCF2FF"}
SANS = "'Yuanti SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["playground", "blocks", "nap", "lunch", "gate", "books", "crayons"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
LABEL = "全园新学期家长会 · 2026 年秋季学期"

_cat = open('/Users/leon/projects/pptwise/src/icons/catalog.ts').read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=INK, sw=2.2):
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
""" + inner.replace("<!--BG-->", "") + """
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


def font(size, lh, color=INK, weight=500, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=600):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="PingFang SC, sans-serif">%s</text>' % (x, y, size, fill, anchor, weight, s)


def crayon_line(x1, y, x2, color, w=8):
    """A crayon stroke: three slightly offset passes, the way wax catches paper."""
    out = ""
    for dy, op, sw in [(0, 0.95, w), (-2, 0.45, w * 0.6), (2, 0.35, w * 0.5)]:
        out += '<path d="M %.1f %.1f Q %.1f %.1f %.1f %.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round" fill="none" opacity="%.2f"/>' % (x1, y + dy, (x1 + x2) / 2, y + dy - 3, x2, y + dy + 1, color, sw, op)
    return out


def drawn_box(x, y, w, h, color, fill=SURF, r=22, sw=2.6):
    """A rounded card outlined twice, slightly off, as if traced by hand."""
    s = '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%d" fill="%s" stroke="%s" stroke-width="%.1f"/>' % (x, y, w, h, r, fill, color, sw)
    s += '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%d" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.35"/>' % (x + 2, y + 1.5, w - 3, h - 2, r + 2, color, sw * 0.7)
    return s


def sun(cx, cy, r=26, color=YELLOW):
    s = '<circle cx="%d" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="4"/>' % (cx, cy, r, color)
    import math
    for k in range(8):
        a = k * math.pi / 4
        s += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (cx + math.cos(a) * (r + 8), cy + math.sin(a) * (r + 8), cx + math.cos(a) * (r + 18), cy + math.sin(a) * (r + 18), color)
    return s


def star(cx, cy, r, color):
    import math
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append("%.1f,%.1f" % (cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return '<polygon points="%s" fill="%s"/>' % (" ".join(pts), color)


SECT = {1: ("新规定", SKY, "scale"), 2: ("孩子会长成什么样", GREEN, "sprout"), 3: ("家园共育", ORANGE, "heart-handshake"), 4: ("安全小贴士", RED, "shield-check"), 5: ("请您配合", PURPLE, "list-checks")}


def head(pg, sec, title):
    nm, col, ic = SECT[sec]
    tw_ = len(nm) * 15 + 52
    out = box(64, 34, tw_, 34, "background: %s; border-radius: 17px; " % col + font(15, 34, "#FFFFFF" if col == PURPLE else INK, 800, "padding-left: 40px; box-sizing: border-box"), nm)
    out += svg(icon(ic, 76, 42, 18, "#FFFFFF" if col == PURPLE else INK) + sun(1210, 64, 14, YELLOW) + star(1172, 112, 7, ORANGE) + star(1222, 118, 5, PURPLE))
    out += box(64, 82, 1080, 64, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, INK, 900), "<div>" + title + "</div>")
    out += svg(crayon_line(64, 156, 200, col, 7))
    out += box(64, 684, 600, 20, font(12, 20, MUTED, 600), LABEL)
    out += box(1180, 676, 36, 36, "background: %s; border-radius: 18px; text-align: center; " % TINT[col] + font(14, 36, INK, 800), str(pg))
    return out + "<!--BG-->"


def under(c, s):
    """Put drawings under the text that follows the header."""
    return c.replace("<!--BG-->", svg(s) + "<!--BG-->", 1)


def source(t_, y=648, x=64, w=1100):
    return box(x, y, w, 30, font(11, 16, MUTED, 500), t_)


def photo(key, x, y, w, h, r=22, frame=None):
    st = "overflow: hidden; border-radius: %dpx; " % r
    if frame:
        st += "box-shadow: 0 0 0 5px %s; " % frame
    return box(x, y, w, h, st, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def cap(x, y, w, t_):
    return box(x, y, w, 18, font(11, 18, MUTED, 600), t_)


pages = []

# 1 cover: a welcome sign on drawing paper, the playground in a crayon frame
c = svg(sun(1150, 110, 36) + star(640, 200, 12, ORANGE) + star(640, 610, 9, SKY) + star(90, 600, 8, GREEN))
c += box(64, 80, 230, 38, "background: %s; border-radius: 19px; text-align: center; " % SKY + font(16, 38, INK, 800), "全园新学期家长会")
c += box(64, 160, 620, 180, font(64, 86, INK, 900), "新学期好！<br>我们一起陪孩子长大")
c += svg(crayon_line(64, 352, 420, ORANGE, 10))
c += box(64, 378, 560, 60, font(20, 30, MUTED, 600), "新规定、孩子的成长、在家怎么配合、安全，今天一次说清")
c += box(64, 466, 300, 34, font(22, 34, BLUE, 900), "2026 年秋季学期")
c += photo("playground", 700, 170, 500, 360, 30, ORANGE)
c += cap(700, 544, 400, "示意图：户外活动（AI 生成）")
pages.append(("1 封面", c))

# 2 agenda: five crayons
c = head(2, 1, "今天和您聊五件事")
items = [(SKY, "scale", "新规定", "学前教育法，大班免保教费"), (GREEN, "sprout", "孩子会长成什么样", "五大领域，在园的一天"), (ORANGE, "heart-handshake", "家园共育", "睡眠、屏幕、户外、吃饭、视力"), (RED, "shield-check", "安全小贴士", "接送、校车、玩水、走失"), (PURPLE, "list-checks", "请您配合", "五件小事，下次见面")]
s = ""
for i, (col, ic, t_, d_) in enumerate(items):
    x = 70 + i * 228
    s += '<polygon points="%d,%d %d,%d %d,%d" fill="%s"/>' % (x + 70, 196, x + 40, 236, x + 100, 236, col)
    s += '<polygon points="%d,%d %d,%d %d,%d" fill="%s" opacity="0.55"/>' % (x + 70, 196, x + 62, 208, x + 78, 208, INK)
    s += '<rect x="%d" y="236" width="140" height="380" rx="14" fill="%s"/>' % (x, col)
    s += '<rect x="%d" y="286" width="140" height="10" fill="%s" opacity="0.25"/>' % (x, INK)
    s += '<rect x="%d" y="560" width="140" height="10" fill="%s" opacity="0.25"/>' % (x, INK)
    fg = "#FFFFFF" if col == PURPLE else INK
    s += icon(ic, x + 54, 312, 32, fg, 2.4)
    c += box(x, 246, 140, 36, font(26, 36, fg, 900, "text-align: center"), "%02d" % (i + 1))
    c += box(x + 10, 360, 120, 120, font(20, 28, fg, 900, "text-align: center"), t_)
    c += box(x + 8, 466, 124, 84, font(14, 21, fg, 700, "text-align: center"), d_)
c = under(c, s)
pages.append(("2 五件事", c))

# 3 the law: six sticky notes with their article numbers
c = head(3, 1, "《学前教育法》施行，这六条和您有关")
notes = [(SKY, "ban", "入园不考试", "除必要的体检外，不得组织任何考试或测试", "第十五条"), (YELLOW, "stethoscope", "特殊体质要告知", "孩子有特异体质、特定疾病，家长及时告诉幼儿园", "第十五条"), (GREEN, "monitor-smartphone", "控制屏幕时间", "家园一起教孩子合理用电子产品，控制时间", "第二十条"),
         (ORANGE, "puzzle", "不教小学课程", "以游戏为基本活动，不得教小学阶段的课程", "第五十六、五十九条"), (PURPLE, "receipt", "收费要公示", "伙食费专款专用，收费和退费规则向家长公示", "第六十九条"), (RED, "messages-square", "常沟通", "幼儿园主动交流，家长积极配合、支持", "第五十八条")]
s = ""
rots = [-1.5, 1.2, -0.8, 1.0, -1.2, 0.8]
for i, (col, ic, t_, d_, art) in enumerate(notes):
    x = 70 + (i % 3) * 370
    y = 186 + (i // 3) * 222
    c += box(x, y, 340, 196, "background: %s; border-radius: 6px; transform: rotate(%.1fdeg); box-shadow: 2px 3px 0 rgba(30,35,64,0.08); " % (TINT[col], rots[i]), "")
    c += box(x + 130, y - 12, 80, 24, "background: rgba(255,255,255,0.75); transform: rotate(%.1fdeg); " % (-rots[i] * 2), "")
    s += icon(ic, x + 24, y + 30, 28, INK)
    c += box(x + 64, y + 28, 260, 34, font(22, 34, INK, 900), t_)
    c += box(x + 24, y + 76, 296, 70, font(15, 24, INK, 500), d_)
    c += box(x + 24, y + 150, 200, 26, "background: #FFFFFF; border-radius: 13px; text-align: center; width: %dpx; " % (len(art) * 13 + 24) + font(12, 26, INK, 700), art)
c += svg(s)
c += source("来源：《中华人民共和国学前教育法》，2024 年 11 月 8 日通过，2025 年 6 月 1 日施行")
pages.append(("3 新法", c))

# 4 free preschool: what is free, what is not
c = head(4, 1, "大班免的是保育教育费，伙食费等照常交")
s = drawn_box(64, 190, 520, 290, DGREEN, TINT[GREEN]) + drawn_box(616, 190, 520, 290, ORANGE, TINT[ORANGE])
s += '<circle cx="110" cy="236" r="26" fill="%s"/>' % DGREEN + icon("check", 96, 222, 28, "#FFFFFF", 3)
s += '<circle cx="662" cy="236" r="26" fill="%s"/>' % ORANGE + icon("x", 648, 222, 28, INK, 3)
c += svg(s)
c += box(150, 216, 400, 40, font(26, 40, DGREEN, 900), "免")
c += box(702, 216, 400, 40, font(26, 40, INK, 900), "不免")
free = ["公办园大班：保育教育费全部免除", "民办园大班：参照当地同类型公办园标准减免", "从 2025 年秋季学期起"]
nofree = ["伙食费、住宿费、杂费，照常交", "民办园高出公办标准的部分，可以继续收", "小班、中班：国家文件目前只写到大班"]
for i, t_ in enumerate(free):
    c += box(96, 290 + i * 58, 470, 50, font(18, 26, INK, 600), "· " + t_)
for i, t_ in enumerate(nofree):
    c += box(648, 290 + i * 58, 470, 50, font(18, 26, INK, 600), "· " + t_)
c += box(64, 500, 300, 120, "background: %s; border-radius: 22px; padding: 16px 22px; box-sizing: border-box; " % YELLOW, "")
c += box(86, 512, 280, 56, font(44, 56, INK, 900), '1400<span style="font-size:18px"> 万名</span>')
c += box(86, 572, 270, 40, font(13, 20, INK, 700), "2025 年惠及的孩子（2026 年政府工作报告）")
c += box(390, 500, 746, 120, "background: %s; border-radius: 22px; box-sizing: border-box; padding: 16px 24px; " % SURF, "")
c += box(414, 512, 700, 24, font(14, 24, MUTED, 800), "官方举的例子：民办园怎么算")
eq = [("800 元", "民办园每月收费", INK), ("−", "", MUTED), ("500 元", "同类公办园标准，免", DGREEN), ("=", "", MUTED), ("300 元", "家长交差额", ORANGE_INK)]
x = 414
for v, k, col in eq:
    w = 150 if k else 40
    c += box(x, 540, w, 44, font(34 if k else 30, 44, col, 900, "text-align: center"), v)
    if k:
        c += box(x, 586, w, 20, font(12, 20, MUTED, 600, "text-align: center"), k)
    x += w
c += source("来源：国务院办公厅《关于逐步推行免费学前教育的意见》（国办发〔2025〕27 号），国新办吹风会 2025-08-07，2026 年政府工作报告。全国没有统一的减免金额", y=640)
pages.append(("4 免费", c))

# 5 fewer children, more places
c = head(5, 1, "在园孩子五年少了三分之一，毛入园率反而升到 92.9%")
yrs = [2020, 2021, 2022, 2023, 2024, 2025]
kids = [4818.26, 4805.21, 4627.55, 4092.98, 3583.99, 3225.52]
gross = [85.2, 88.1, 89.7, 91.1, 92.0, 92.9]
X0 = 120
s = ""
for i, (y, v) in enumerate(zip(yrs, kids)):
    x = X0 + i * 110
    h = v / 5000 * 190
    s += '<rect x="%d" y="%.1f" width="70" height="%.1f" rx="12" fill="%s"/>' % (x, 480 - h, h, SKY)
    s += '<rect x="%d" y="%.1f" width="70" height="%.1f" rx="12" fill="none" stroke="%s" stroke-width="2" opacity="0.4" transform="translate(2 1)"/>' % (x, 480 - h, h, BLUE)
    s += text(x + 35, 480 - h - 10, "%d 万" % round(v), 13, INK, "middle", 800)
    s += text(x + 35, 502, str(y), 13, MUTED, "middle", 700)
gy = lambda g: 196 + (93 - g) * 7.5
pts = " ".join("%.1f,%.1f" % (X0 + 35 + i * 110, gy(g)) for i, g in enumerate(gross))
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' % (pts, ORANGE)
for i, g in enumerate(gross):
    s += '<circle cx="%.1f" cy="%.1f" r="7" fill="%s" stroke="#FFFFFF" stroke-width="2"/>' % (X0 + 35 + i * 110, gy(g), ORANGE)
    s += text(X0 + 35 + i * 110, gy(g) - 14, "%.1f%%" % g, 12 if i < 5 else 15, ORANGE_INK, "middle", 800 if i < 5 else 900)
s += '<rect x="120" y="530" width="14" height="14" rx="4" fill="%s"/>' % SKY + text(142, 542, "在园幼儿（万人）", 13, INK, "start", 700)
s += '<line x1="300" y1="537" x2="328" y2="537" stroke="%s" stroke-width="5" stroke-linecap="round"/>' % ORANGE + text(336, 542, "学前三年毛入园率", 13, INK, "start", 700)
c += svg(s)
cards = [("trending-down", "−33.1%", "在园幼儿，2020 到 2025 年", SKY), ("hand-heart", "91.49%", "普惠园在园幼儿占比，2025 年", GREEN)]
s = ""
for i, (ic, v, k, col) in enumerate(cards):
    y = 196 + i * 170
    s += drawn_box(860, y, 300, 150, col, TINT[col])
    s += icon(ic, 884, y + 22, 24, INK)
    c += box(884, y + 52, 260, 56, font(44, 56, INK, 900), v)
    c += box(884, y + 110, 260, 22, font(13, 22, INK, 700), k)
c = under(c, s)
c += source("来源：教育部《全国教育事业发展统计公报》2020 至 2025 年。毛入园率的分母是 3～5 岁人口，普惠覆盖率按在园幼儿算")
pages.append(("5 大环境", c))


def chapter(pg, num, col, ttl, sub, key):
    c = svg(sun(1140, 120, 40) + star(620, 140, 12, PURPLE) + star(580, 600, 9, SKY))
    c += box(80, 220, 200, 170, "background: %s; border-radius: 34px; transform: rotate(-4deg); text-align: center; " % col + font(110, 170, INK if col != PURPLE else "#FFFFFF", 900), num)
    c += svg(crayon_line(90, 420, 270, col, 9))
    c += box(80, 450, 560, 64, font(46, 64, INK, 900), ttl)
    c += box(80, 520, 560, 60, font(20, 30, MUTED, 600), sub)
    c += photo(key, 680, 170, 520, 380, 30, col)
    c += box(1180, 676, 36, 36, "background: %s; border-radius: 18px; text-align: center; " % TINT[col] + font(14, 36, INK, 800), str(pg))
    return c


pages.append(("6 章节 成长", chapter(6, "01", GREEN, "孩子会长成什么样", "教育部《3-6 岁儿童学习与发展指南》的五大领域", "blocks")))

# 7 five domains, five crayons
c = head(7, 2, "五个领域一起长，3 岁到 6 岁这样变化")
doms = [(RED, "heart", "健康", "在帮助下穿脱衣服、鞋袜", "会自己系鞋带"), (ORANGE, "message-circle", "语言", "愿意在熟悉的人面前说话", "能有序、连贯地讲清一件事"), (YELLOW, "users", "社会", "对幼儿园好奇，喜欢上幼儿园", "和同伴起冲突，能自己商量解决"),
        (GREEN, "shapes", "科学", "手口一致地点数 5 个以内", "用实物做 10 以内的加减"), (SKY, "palette", "艺术", "爱涂涂画画、粘粘贴贴", "用多种工具和材料表达想象")]
s = ""
for i, (col, ic, nm, a, b) in enumerate(doms):
    x = 64 + i * 230
    s += '<rect x="%d" y="186" width="214" height="430" rx="24" fill="%s"/>' % (x, TINT[col])
    s += '<rect x="%d" y="186" width="214" height="86" rx="24" fill="%s"/>' % (x, col)
    s += '<rect x="%d" y="250" width="214" height="22" fill="%s"/>' % (x, col)
    s += icon(ic, x + 22, 208, 30, INK, 2.4)
    c += box(x + 62, 204, 140, 40, font(28, 40, INK, 900), nm)
    c += box(x + 18, 290, 180, 22, font(13, 22, MUTED, 800), "小班 3～4 岁")
    c += box(x + 18, 314, 180, 90, font(17, 27, INK, 600), a)
    s += '<path d="M %d 430 L %d 452 L %d 430" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' % (x + 92, x + 107, x + 122, col if col != YELLOW else "#E0B500")
    c += box(x + 18, 470, 180, 22, font(13, 22, MUTED, 800), "大班 5～6 岁")
    c += box(x + 18, 494, 180, 100, font(17, 27, INK, 800), b)
c = under(c, s)
c += source("来源：教育部《3-6 岁儿童学习与发展指南》（教基二〔2012〕4 号）。年龄段末期的大致期望，不是考核线")
pages.append(("7 五大领域", c))

# 8 no single ruler
c = photo("books", 0, 0, 1280, 720, 0)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(255,249,240,0.97) 0%, rgba(255,249,240,0.92) 55%, rgba(255,249,240,0.5) 100%)")
c += box(64, 34, 220, 34, "background: %s; border-radius: 17px; padding-left: 40px; box-sizing: border-box; " % GREEN + font(15, 34, INK, 800), "孩子会长成什么样")
c += svg(icon("sprout", 76, 42, 18, INK))
s = '<rect x="80" y="170" width="380" height="54" rx="10" fill="%s"/>' % YELLOW
for k in range(13):
    s += '<line x1="%d" y1="170" x2="%d" y2="%d" stroke="%s" stroke-width="2.5"/>' % (96 + k * 28, 96 + k * 28, 192 if k % 2 else 200, INK)
s += '<line x1="70" y1="236" x2="470" y2="160" stroke="%s" stroke-width="10" stroke-linecap="round" opacity="0.9"/>' % RED
c += svg(s)
c += box(64, 270, 900, 160, font(56, 78, INK, 900), "不用一把尺子量孩子，<br>也不抢跑小学内容")
c += svg(crayon_line(64, 448, 520, GREEN, 10))
c += box(64, 478, 860, 80, font(20, 32, INK, 600), "「切忌用一把『尺子』衡量所有幼儿。」「严禁『拔苗助长』式的超前教育和强化训练。」")
c += box(64, 566, 860, 26, font(14, 26, MUTED, 600), "教育部《3-6 岁儿童学习与发展指南》。法律也写了：幼儿园不得教授小学阶段的课程（第五十九条）")
c += box(64, 684, 600, 20, font(11, 20, MUTED, 600), "背景为 AI 生成的示意图")
c += box(1180, 676, 36, 36, "background: %s; border-radius: 18px; text-align: center; " % TINT[GREEN] + font(14, 36, INK, 800), "8")
pages.append(("8 一把尺子", c))

# 9 a day at kindergarten, on a sun's arc
c = head(9, 2, "在园的一天：户外每天不少于 2 小时")
import math
cx, cy, R, RY = 640, 540, 380, 300
s = '<path d="M %d %d A %d %d 0 0 1 %d %d" fill="none" stroke="%s" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round"/>' % (cx - R, cy, R, RY, cx + R, cy, YELLOW)
stops = [(180, "door-open", "入园", "由您或您委托的成年人送来", SKY, False), (148, "utensils", "正餐", "两餐间隔 3.5～4 小时", ORANGE, False), (90, "sun", "户外", "每天不少于 2 小时，其中体育不少于 1 小时", GREEN, True), (32, "bed", "午睡", "一般 2 小时左右", PURPLE, False), (0, "footprints", "离园", "交到您或您委托的人手里", RED, False)]
for ang, ic, nm, d_, col, hot in stops:
    a = math.radians(ang)
    x = cx + R * math.cos(a); y = cy - RY * math.sin(a)
    rr = 44 if hot else 32
    s += '<circle cx="%.1f" cy="%.1f" r="%d" fill="%s" stroke="#FFFFFF" stroke-width="4"/>' % (x, y, rr, col)
    s += icon(ic, x - rr * 0.5, y - rr * 0.5, rr, "#FFFFFF" if col == PURPLE else INK, 2.4)
    if hot:
        c += box(int(x - 170), int(y + rr + 8), 340, 32, font(22, 32, INK, 900, "text-align: center"), nm)
        c += box(int(x - 170), int(y + rr + 40), 340, 24, font(15, 24, INK, 700, "text-align: center"), d_)
    elif ang > 90:
        c += box(int(x - rr - 182), int(y - 34), 170, 30, font(18, 30, INK, 900, "text-align: right"), nm)
        c += box(int(x - rr - 182), int(y - 4), 170, 44, font(13, 21, MUTED, 600, "text-align: right"), d_)
    else:
        c += box(int(x + rr + 12), int(y - 34), 170, 30, font(18, 30, INK, 900), nm)
        c += box(int(x + rr + 12), int(y - 4), 170, 44, font(13, 21, MUTED, 600), d_)
c = under(c, s)
c += photo("playground", 370, 410, 170, 116, 16) + photo("blocks", 555, 410, 170, 116, 16) + photo("nap", 740, 410, 170, 116, 16)
c += cap(370, 534, 540, "示意图：户外、搭积木、午睡室（AI 生成）")
c += source("来源：《幼儿园工作规程》（教育部令第 39 号）第十三、十八、二十三条，户外是规定。午睡时长出自《3-6 岁儿童学习与发展指南》，是建议")
pages.append(("9 在园一天", c))

pages.append(("10 章节 共育", chapter(10, "02", ORANGE, "家园共育", "在家这样做：睡眠、屏幕、户外、吃饭、视力、入园适应", "gate")))

# 11 fridge magnets
c = head(11, 3, "贴在冰箱上的三件事：睡够、少屏、多出门")
s = '<rect x="64" y="186" width="1100" height="440" rx="30" fill="#EEF2F6"/>'
s += '<rect x="64" y="186" width="1100" height="440" rx="30" fill="none" stroke="#D5DCE4" stroke-width="3"/>'
mags = [(SKY, "moon", "睡够觉", "按时上床，按时起床。午睡也算在一天的睡眠里", "10～13 小时（爱卫办、营养学会、WHO）\n11～12 小时（教育部指南）"), (ORANGE, "tv", "少看屏", "每天累计不超过 1 小时，越少越好。睡前不看", "卫健委、营养学会、WHO 都这样建议"), (GREEN, "sun", "多出门", "天天到户外跑一跑。在园每天 2 小时，周末也别落下", "户外是护眼的第一件事")]
rots = [-2.5, 1.5, -1.2]
for i, (col, ic, t_, d_, n) in enumerate(mags):
    x = 110 + i * 350
    c += box(x, 220, 310, 360, "background: %s; border-radius: 10px; transform: rotate(%.1fdeg); box-shadow: 3px 5px 0 rgba(30,35,64,0.10); " % (SURF, rots[i]), "")
    s2 = '<circle cx="%d" cy="226" r="20" fill="%s"/>' % (x + 155, col)
    s += ""
    c += svg(s2)
    c += box(x + 30, 270, 260, 60, "display: flex; align-items: center; gap: 12px; " + font(34, 60, INK, 900), t_)
    c += svg(icon(ic, x + 240, 282, 34, col if col != YELLOW else "#E0B500", 2.6))
    c += box(x + 30, 344, 260, 100, font(17, 28, INK, 600), d_)
    c += box(x + 30, 470, 262, 80, font(13, 21, MUTED, 600), n.replace("\n", "<br>"))
c = svg(s) + c
c += source("来源：教育部 2012 年指南，全国爱卫办 2025，中国营养学会 2022，WHO 2019，国家卫健委 2021 年两份文件，《幼儿园工作规程》")
pages.append(("11 冰箱贴", c))

# 12 who says what
c = head(12, 3, "睡多久、看屏多久、户外多久：几家机构的建议")
cols = [(64, "机构（适用年龄）", 280), (360, "睡眠", 230), (606, "看屏幕", 300), (922, "户外和活动", 280)]
rows = [("school", "教育部指南，3～6 岁", "11～12 小时，午睡约 2 小时", "连续不超过 15、20、30 分钟，按年龄段", "户外一般不少于 2 小时", False),
        ("stethoscope", "国家卫健委两份文件，学龄前", "未涉及", "每次 20 分钟（眼保健规范）或 15 分钟以内（近视防控指南）", "每天 2 小时以上", False),
        ("moon", "全国爱卫办，学龄前", "10～13 小时", "未涉及", "未涉及", False),
        ("apple", "中国营养学会，2～5 岁", "10～13 小时，含午睡 1～2 小时", "每天累计不超过 1 小时", "户外至少 120 分钟", False),
        ("sun", "WHO，3～4 岁", "10～13 小时", "不超过 1 小时，越少越好", "各种活动至少 180 分钟", False),
        ("clipboard-check", "《幼儿园工作规程》，在园", "未涉及", "未涉及", "户外不少于 2 小时，含体育 1 小时", True)]
s = '<rect x="64" y="186" width="1152" height="40" rx="12" fill="%s"/>' % TINT[ORANGE]
for x, t_, w in cols:
    c += box(x + 14, 194, w, 24, font(14, 24, INK, 900), t_)
for i, (ic, who, sl, sc, out, rule) in enumerate(rows):
    y = 234 + i * 64
    if rule:
        s += '<rect x="64" y="%d" width="1152" height="58" rx="14" fill="%s"/>' % (y, TINT[GREEN])
    s += icon(ic, 78, y + 18, 20, INK)
    c += box(108, y + 6, 240, 46, font(14, 22, INK, 800), who)
    if rule:
        c += box(108, y + 32, 60, 20, "background: %s; border-radius: 10px; text-align: center; " % DGREEN + font(11, 20, "#FFFFFF", 900), "规定")
    for (x, _, w), v in zip(cols[1:], [sl, sc, out]):
        muted = v == "未涉及"
        c += box(x + 14, y + 6, w - 20, 46, font(14, 22, MUTED if muted else INK, 500 if muted else 700), v)
    s += '<line x1="64" y1="%d" x2="1216" y2="%d" stroke="%s" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>' % (y + 61, y + 61, LINE)
c = under(c, s)
c += box(64, 622, 1152, 22, font(13, 22, INK, 700), "只有《幼儿园工作规程》是规定，其余都是建议。WHO 只覆盖 3～4 岁，营养学会覆盖 2～5 岁")
c += source("来源：教育部 2012 年指南，国家卫健委 2021 年两份文件，全国爱卫办 2025，中国营养学会 2022，WHO 2019，教育部令第 39 号", y=650)
pages.append(("12 机构对照", c))

# 13 eating well
c = head(13, 3, "吃得好：每天喝奶、喝白水，少盐，不喝含糖饮料")
c += photo("lunch", 64, 186, 440, 420, 26, YELLOW)
c += cap(64, 616, 440, "示意图：午餐（AI 生成）")
food = [(SKY, "milk", "350～500", "克", "每天喝奶", "2～5 岁一样"), (GREEN, "glass-water", "600～800", "毫升", "每天喝白水", "4～5 岁 700～800"), (ORANGE, "cooking-pot", "＜2 / ＜3", "克", "每天的盐", "2～3 岁 / 4～5 岁"), (PURPLE, "salad", "12 种以上", "", "每天吃的食物种类", "每周 25 种以上")]
s = ""
for i, (col, ic, v, u, k, n) in enumerate(food):
    x = 540 + (i % 2) * 336
    y = 186 + (i // 2) * 214
    s += drawn_box(x, y, 316, 196, col, TINT[col])
    s += icon(ic, x + 22, y + 22, 28, INK)
    c += box(x + 22, y + 60, 290, 56, font(40, 56, INK, 900, "white-space: nowrap"), v + ('<span style="font-size:16px"> %s</span>' % u if u else ""))
    c += box(x + 22, y + 120, 280, 26, font(17, 26, INK, 800), k)
    c += box(x + 22, y + 148, 280, 22, font(13, 22, MUTED, 600), n)
c = under(c, s)
c += source("来源：中国营养学会《中国学龄前儿童膳食指南（2022）》，适用于满 2 周岁到满 6 周岁前", x=540, w=670)
pages.append(("13 吃得好", c))

# 14 eyesight
c = head(14, 3, "6 岁孩子近视率 12.7%，护眼先从多出门开始")
bars = [("2018（推算）", 14.5, SKY, True), ("2020", 14.3, SKY, False), ("2022", 12.7, ORANGE, False)]
s = ""
for i, (lab, v, col, est) in enumerate(bars):
    x = 110 + i * 200
    h = v / 16 * 300
    s += '<rect x="%d" y="%.1f" width="130" height="%.1f" rx="18" fill="%s"%s/>' % (x, 530 - h, h, col, ' opacity="0.55"' if est else "")
    if est:
        s += '<rect x="%d" y="%.1f" width="130" height="%.1f" rx="18" fill="none" stroke="%s" stroke-width="3" stroke-dasharray="8 6"/>' % (x, 530 - h, h, BLUE)
    s += text(x + 65, 530 - h - 14, "%.1f%%" % v, 24 if col == ORANGE else 20, INK, "middle", 900)
    s += text(x + 65, 556, lab, 14, MUTED, "middle", 700)
s += '<line x1="90" y1="530" x2="720" y2="530" stroke="%s" stroke-width="3" stroke-linecap="round"/>' % LINE
c += svg(s)
c += box(110, 580, 600, 22, font(13, 22, MUTED, 600), "全国 6 岁儿童近视率。2018 年由「比 2018 年下降 1.8 个百分点」推算")
c += svg(drawn_box(780, 186, 380, 420, GREEN, TINT[GREEN]) + sun(836, 250, 18, "#E0B500"))
c += box(896, 228, 250, 44, font(24, 44, INK, 900), "每天出门 2 小时")
c += box(810, 300, 330, 90, font(16, 27, INK, 600), "卫健委建议 4～6 岁孩子每天在室外活动 2 小时以上，这是保护远视储备的主要办法")
c += box(810, 410, 330, 26, font(15, 26, INK, 800), "体检时看看视力：")
c += box(810, 440, 330, 60, font(16, 28, INK, 600), "4 岁一般能到 0.6 以上<br>5 岁及以上能到 0.8 以上")
c += box(810, 530, 330, 60, font(13, 21, MUTED, 600), "每半年测一次视力（《幼儿园工作规程》第十九条）")
c += source("来源：国家卫健委 2024-05-31 发布会，教育部 2023-06-16 近视防控问答，国卫办妇幼发〔2021〕11 号")
pages.append(("14 视力", c))

# 15 settling in
c = head(15, 3, "入园头几周孩子真有压力，陪着慢慢分开有研究支持")
c += photo("gate", 64, 186, 420, 300, 26, SKY)
c += cap(64, 496, 420, "示意图：入园（AI 生成）")
res = [("15 月龄，70 名", "妈妈离开后头 9 天，压力激素明显升高。陪伴过渡的天数越多，依恋越安全", "Ahnert 等，Child Development 2004"), ("平均 3.27 岁，168 名", "进入新托育环境的 10 周里，园内压力激素在上升", "Bernard 等，Child Development 2015")]
s = ""
for i, (who, t_, src) in enumerate(res):
    y = 186 + i * 170
    s += drawn_box(520, y, 330, 154, PURPLE, TINT[PURPLE])
    s += icon("book-open", 542, y + 20, 22, INK)
    c += box(574, y + 16, 260, 30, font(16, 30, INK, 900), who)
    c += box(542, y + 54, 290, 72, font(14, 23, INK, 600), t_)
    c += box(542, y + 126, 290, 20, font(11, 20, MUTED, 600), src)
c += box(520, 530, 330, 60, font(13, 21, MUTED, 600), "研究对象和年龄各不相同。没有「几天适应好」的官方标准")
tips = ["头几天陪一陪，再慢慢拉长分开的时间", "留意孩子的饮食、睡眠和游戏", "多带孩子接触不同的人和环境", "不哭不等于已经适应，多和老师聊"]
c += box(886, 186, 330, 40, font(20, 40, INK, 900), "家长可以这样做")
s += crayon_line(886, 232, 1040, ORANGE, 6)
for i, t_ in enumerate(tips):
    y = 252 + i * 84
    s += '<rect x="886" y="%d" width="30" height="30" rx="7" fill="#FFFFFF" stroke="%s" stroke-width="3"/>' % (y, ORANGE)
    s += '<path d="M %d %d L %d %d L %d %d" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' % (892, y + 15, 899, y + 22, 911, y + 7, DGREEN)
    c += box(930, y - 2, 286, 72, font(16, 26, INK, 700), t_)
c = under(c, s)
c += source("来源：Ahnert 等，Child Development 2004。Bernard 等，Child Development 2015。教育部《3-6 岁儿童学习与发展指南》")
pages.append(("15 入园适应", c))

# 16 safety tips as round badges
c = head(16, 4, "安全小贴士：接送、校车、吃饭、玩水、走失")
tips = [(SKY, "hand-heart", "接送", "由监护人或委托的成年人接送。换人请提前告诉老师"), (YELLOW, "bus", "校车", "幼儿专用校车，照管人员全程跟车，孩子全部下车才离开"), (GREEN, "utensils", "吃饭", "园所负责人每餐陪餐，每样饭菜留样不少于 125 克、冷藏 48 小时"), (RED, "waves", "玩水", "溺水是 1～14 岁孩子伤害死亡的首位原因。什么都替代不了大人看着"), (PURPLE, "map-pin", "走失", "教孩子记住家庭住址、电话和爸妈的名字，走失了找警察")]
s = ""
for i, (col, ic, t_, d_) in enumerate(tips):
    x = 64 + i * 230
    hot = t_ == "玩水"
    s += '<circle cx="%d" cy="270" r="%d" fill="%s"/>' % (x + 107, 72 if hot else 62, col)
    s += '<circle cx="%d" cy="270" r="%d" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="3 9"/>' % (x + 107, 58 if hot else 50)
    s += icon(ic, x + 107 - 22, 248, 44, "#FFFFFF" if col == PURPLE else INK, 2.6)
    c += box(x, 360, 214, 40, font(26, 40, RED if hot else INK, 900, "text-align: center"), t_)
    c += box(x + 6, 410, 202, 140, font(15, 25, INK, 600, "text-align: center"), d_)
c += svg(s)
c += source("来源：《幼儿园工作规程》，《校车安全管理条例》（国务院令第 617 号），《学校食品安全与营养健康管理规定》，中国疾控中心，《3-6 岁儿童学习与发展指南》")
pages.append(("16 安全", c))

# 17 the checklist
c = head(17, 5, "请您配合的五件小事")
chk = [("stethoscope", "孩子有过敏、特异体质或疾病，及时告诉老师", "学前教育法第十五条"), ("hand-heart", "由您或您委托的成年人接送，换人提前说", "规程第十三条"), ("receipt", "需要在园吃药，请先写好委托", "规程第二十条"), ("ban", "不用提前学拼音、识字、算术，多陪孩子玩", "教基厅函〔2018〕57 号"), ("calendar", "来参加家长会和家长开放日", "规程第五十三条")]
s = ""
for i, (ic, t_, src) in enumerate(chk):
    y = 186 + i * 82
    s += '<rect x="80" y="%d" width="46" height="46" rx="10" fill="#FFFFFF" stroke="%s" stroke-width="4"/>' % (y + 4, PURPLE)
    s += '<rect x="83" y="%d" width="46" height="46" rx="12" fill="none" stroke="%s" stroke-width="2" opacity="0.4"/>' % (y + 6, PURPLE)
    s += icon(ic, 150, y + 14, 26, PURPLE)
    c += box(192, y + 6, 720, 36, font(22, 36, INK, 800), t_)
    c += box(192, y + 44, 400, 20, font(12, 20, MUTED, 600), src)
c += svg(s)
c += photo("crayons", 930, 186, 286, 400, 26, PURPLE)
c += cap(930, 596, 286, "示意图：蜡笔（AI 生成）")
c += box(80, 606, 820, 36, "background: %s; border-radius: 18px; padding-left: 20px; box-sizing: border-box; " % TINT[PURPLE] + font(16, 36, INK, 800), "拿不准的事，先在班级群里问一句")
pages.append(("17 打勾清单", c))

# 18 see you next time
c = photo("crayons", 0, 0, 1280, 720, 0)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(255,249,240,0.97) 0%, rgba(255,249,240,0.9) 55%, rgba(255,249,240,0.4) 100%)")
c += svg(sun(1150, 110, 36) + star(700, 120, 12, ORANGE))
c += box(64, 80, 160, 38, "background: %s; border-radius: 19px; text-align: center; " % PURPLE + font(16, 38, "#FFFFFF", 800), "下次见")
c += box(64, 150, 800, 80, font(58, 80, INK, 900), "下次见面：家长开放日")
c += svg(crayon_line(64, 246, 420, SKY, 10)) + "<!--BG-->"
nxt = [(SKY, "calendar", "家长开放日", "来班里看看孩子的一天，日期提前在班级群通知"), (GREEN, "messages-square", "班级群", "每周食谱和通知都发在这里"), (ORANGE, "users", "家长委员会", "欢迎报名，一起商量园里的事")]
s = ""
for i, (col, ic, t_, d_) in enumerate(nxt):
    y = 290 + i * 96
    s += drawn_box(64, y, 640, 80, col, "#FFFFFF", 20)
    s += '<circle cx="110" cy="%d" r="24" fill="%s"/>' % (y + 40, col) + icon(ic, 98, y + 28, 24, INK)
    c += box(150, y + 10, 520, 30, font(22, 30, INK, 900), t_)
    c += box(150, y + 42, 520, 26, font(15, 26, MUTED, 600), d_)
c = under(c, s)
c += box(64, 600, 300, 54, "background: %s; border-radius: 27px; text-align: center; " % ORANGE + font(20, 54, INK, 900), "有事随时找老师")
c += box(1180, 676, 36, 36, "background: %s; border-radius: 18px; text-align: center; " % TINT[PURPLE] + font(14, 36, INK, 800), "18")
pages.append(("18 下次见", c))

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
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc.replace("<!--BG-->", "")))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "crayon 家长会样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
