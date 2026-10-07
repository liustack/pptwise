import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# ink: a lecture hung as a scroll. Rice paper, ink, one cinnabar seal a page.
BG = "#F7F2E7"; SURF = "#FBF7EE"; INK = "#1F1C18"; INK2 = "#3A3530"; CIN = "#C3272B"; CINL = "#F3E2DC"
TAUPE = "#8A8071"; GOLD = "#B5A36F"; MUTED = "#6B645A"; LINE = "#DDD5C4"; WASH = "#E9E2D3"; FAINT = "#C8BFAE"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
KAI = "'Kaiti SC', 'STKaiti', 'KaiTi', 'BiauKai', 'Songti SC', serif"
SONG = "'Songti SC', 'Noto Serif SC', 'STSong', serif"
IMG = {k: "__%s__" % k for k in ["shadow", "river", "hands", "workshop", "carving", "school", "lanterns", "brush"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
HALL = "文化讲堂"
DATE = "二〇二六年十月"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=INK2, sw=1.5):
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


def kai(size, lh, color=INK, weight=400, extra=""):
    return font(size, lh, color, weight, "font-family: %s; %s" % (KAI, extra))


def song(size, lh, color=INK, weight=400, extra=""):
    return font(size, lh, color, weight, "font-family: %s; %s" % (SONG, extra))


def vert(x, y, w, h, t_, style):
    return box(x, y, w, h, "writing-mode: vertical-rl; text-orientation: upright; " + style, t_)


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


def seal(x, y, ch, size=40):
    """A square cinnabar seal with one character cut in white."""
    return box(x, y, size, size, "background: %s; border-radius: 3px; text-align: center; " % CIN + kai(int(size * 0.62), size, "#FFFFFF", 700), ch)


def frame(pg, volume):
    """The scroll's margins: the volume and its name upright at the left, the hall and date upright at the right."""
    out = svg(line(1210, 40, 1210, 680, LINE, 1) + line(70, 40, 70, 680, LINE, 1))
    out += vert(1222, 48, 30, 400, HALL + "　" + DATE, font(13, 30, TAUPE, 400, "letter-spacing: 6px"))
    out += vert(30, 48, 30, 400, volume, kai(15, 30, CIN, 400, "letter-spacing: 8px"))
    out += box(1170, 680, 40, 20, song(12, 20, TAUPE, 400, "text-align: right"), str(pg))
    return out


def title(t_, x=110, y=56, w=1060, h=96, size=34):
    return box(x, y, w, h, "display: flex; flex-direction: column; justify-content: flex-end; " + kai(size, 46, INK, 400), "<div>" + t_ + "</div>")


def source(t_, x=110, y=648, w=1060):
    return box(x, y, w, 30, font(11, 15, MUTED), t_)


def photo(key, x, y, w, h):
    return box(x, y, w, h, "overflow: hidden", '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: %s; border: 1px solid %s; box-sizing: border-box; " % (SURF, LINE) + extra, content)


V1 = "卷之一　先看名录"
V2 = "卷之二　名录之后是人"
V0 = "引子"
pages = []

# 1 cover: a title slip hung upright beside an ink-washed shadow-puppet screen
c = photo("shadow", 0, 0, 640, 720)
c += box(0, 0, 640, 720, "background: linear-gradient(90deg, rgba(247,242,231,0) 0%, rgba(247,242,231,0.15) 60%, rgba(247,242,231,1) 100%)")
c += box(760, 60, 120, 600, "background: %s; border: 1px solid %s; box-sizing: border-box; box-shadow: 4px 4px 0 %s; " % (SURF, LINE, WASH), "")
c += vert(780, 92, 80, 500, "非遗怎样活在今天", kai(54, 80, INK, 400, "letter-spacing: 8px"))
c += seal(800, 604, "文", 40)
c += vert(950, 92, 40, 560, "从名录，到人，再回到生活", kai(20, 40, INK2, 400, "letter-spacing: 6px"))
c += vert(1010, 100, 30, 420, HALL + "　公众讲座", font(14, 30, TAUPE, 400, "letter-spacing: 6px"))
c += vert(1060, 100, 30, 420, DATE, font(14, 30, TAUPE, 400, "letter-spacing: 6px"))
c += box(24, 680, 400, 20, font(11, 20, "#FFFFFF"), "示意图（AI 生成）")
pages.append(("1 封面", c))

# 2 the opening: three figures, the third in cinnabar
c = frame(2, V0)
c += title("名录已经很长，非遗能不能活下去，要看还有没有人在做")
figs = [("globe", "45", "项", "列入联合国教科文组织名录、名册", "截至 2025 年 12 月", INK), ("scroll-text", "1557", "项", "国家级代表性项目", "国务院 2006 至 2021 年五批公布", INK), ("user-round", "3994", "名", "国家级代表性传承人", "2025 年末，统计公报口径", CIN)]
s = ""
for i, (ic, v, u, k, n, col) in enumerate(figs):
    x = 110 + i * 360
    s += line(x, 200, x, 470, LINE if i else "none", 1)
    s += icon(ic, x + 24, 210, 22, col if col == CIN else TAUPE)
    c += box(x + 24, 246, 320, 120, kai(110 if i else 120, 120, col, 400, "white-space: nowrap; letter-spacing: -2px"), v + '<span style="font-size:24px;color:%s"> %s</span>' % (MUTED, u))
    c += box(x + 24, 378, 320, 26, kai(19, 26, INK, 400), k)
    c += box(x + 24, 408, 320, 22, font(12, 22, MUTED), n)
c += svg(s)
c += box(110, 506, 1060, 80, "border-top: 1px solid %s; padding-top: 18px; box-sizing: border-box; " % LINE + kai(22, 38, INK2, 400), "名录记下的是项目，手艺和习俗活在会做、还在做的人身上。今天先看名录，再看人，最后看它怎样回到生活。")
c += source("来源：中国非遗网（2025-12），国务院五批名录通知，2025 年文化和旅游发展统计公报")
pages.append(("2 开场", c))

# 3 the statute, set upright with upright punctuation
c = frame(3, V0)
law = ["本法所称非物质文化遗产，", "是指各族人民世代相传并视为", "其文化遗产组成部分的各种传统", "文化表现形式，以及与传统文化", "表现形式相关的实物和场所。"]
for i, ln in enumerate(law):
    c += vert(820 - i * 84, 84, 64, 560, ln, kai(34, 64, INK, 400, "letter-spacing: 4px"))
c += box(870, 90, 4, 120, "background: %s" % CIN, "")
c += vert(250, 90, 40, 300, "《非物质文化遗产法》第二条", song(18, 40, TAUPE, 400, "letter-spacing: 4px"))
c += vert(180, 90, 40, 540, "非遗不只是手艺，也包括相关的实物和场所", kai(22, 40, CIN, 400, "letter-spacing: 4px"))
c += box(110, 648, 500, 20, font(11, 20, MUTED), "2011 年 2 月 25 日通过，6 月 1 日施行")
pages.append(("3 法条", c))

# 4 the system: four tiers, people, places, a law
c = frame(4, V0)
c += title("四级名录已超过 10 万项，再加上传承人、保护区和一部专门的法")
tiers = [("国家级", "1557 项", 260, INK), ("省级", "", 380, INK2), ("市级", "", 500, TAUPE), ("县级", "", 620, FAINT)]
s = ""
for i, (nm, v, w, col) in enumerate(tiers):
    y = 200 + i * 86
    x = 130 + (620 - w) / 2
    s += '<polygon points="%.1f,%d %.1f,%d %.1f,%d %.1f,%d" fill="%s"/>' % (x, y, x + w, y, x + w + 60, y + 78, x - 60, y + 78, col)
    c += box(int(x - 40), y + 18, int(w + 80), 42, kai(22, 42, "#FFFFFF" if i < 3 else INK, 400, "text-align: center"), nm + ("　" + v if v else ""))
c += svg(s)
c += box(130, 552, 620, 26, kai(18, 26, INK2, 400, "text-align: center"), "四级代表性项目合计 10 万余项")
side = [("users", "代表性传承人", "国家级六批认定，四级合计 9 万多人"), ("map-pin", "文化生态保护区", "国家级 21 个，另有 2 个实验区"), ("scale", "非物质文化遗产法", "2011 年施行，6 章 45 条")]
s = ""
for i, (ic, k, d_) in enumerate(side):
    y = 200 + i * 112
    s += icon(ic, 830, y + 6, 22, TAUPE)
    c += box(866, y, 300, 34, kai(22, 34, INK, 400), k)
    c += box(866, y + 38, 300, 44, font(13, 22, MUTED), d_)
    s += line(830, y + 96, 1170, y + 96, LINE)
c += svg(s)
c += source("来源：非遗法（2011），国办发〔2005〕18 号，全国人大常委会执法检查报告（2024-11），中国非遗网")
pages.append(("4 体系", c))


def chapter(pg, vol, num, ttl, sub, key):
    """A hanging-scroll chapter: a tall painting panel, the volume number upright, the title beside it."""
    c = photo(key, 760, 60, 340, 600)
    c += box(760, 60, 340, 600, "box-shadow: inset 0 0 0 10px %s, inset 0 0 0 11px %s" % (SURF, LINE), "")
    c += vert(1130, 60, 50, 600, HALL + "　" + DATE, font(14, 50, TAUPE, 400, "letter-spacing: 6px"))
    c += vert(560, 120, 90, 480, num, kai(72, 90, CIN, 400, "letter-spacing: 12px"))
    c += box(110, 300, 430, 70, kai(52, 70, INK, 400), ttl)
    c += box(110, 384, 430, 30, kai(20, 30, MUTED, 400), sub)
    c += svg(line(110, 440, 260, 440, INK, 1))
    c += box(110, 680, 300, 20, font(11, 20, MUTED), "画芯为 AI 生成的示意图")
    return c


pages.append(("5 卷之一", chapter(5, V1, "卷之一", "先看名录", "联合国的名录，国家的名录", "river")))

# 6 the long scroll: UNESCO entries on a true time axis
c = frame(6, V1)
c += title("从 2001 年的昆曲到 2024 年的春节，进入联合国名录、名册的已有 45 项", size=30)
X0, X1 = 140, 1150
def tx(y): return X0 + (y - 2001) / (2025 - 2001) * (X1 - X0)
s = rect(tx(2001), 300, tx(2008) - tx(2001), 10, WASH) + rect(tx(2008), 300, tx(2025) - tx(2008), 10, FAINT)
s += text(tx(2001), 296, "宣布为代表作，名录尚未建立", 12, MUTED) + text(tx(2008), 296, "现行名录、名册", 12, MUTED)
cum = [(2008, 4), (2009, 29), (2010, 34), (2011, 36), (2012, 37), (2013, 38), (2016, 39), (2018, 40), (2020, 42), (2022, 43), (2024, 44), (2025, 45)]
def cy(v): return 560 - v / 45 * 190
pts = []
prev = None
for y, v in cum:
    if prev is not None:
        pts.append("%.1f,%.1f" % (tx(y), cy(prev)))
    pts.append("%.1f,%.1f" % (tx(y), cy(v)))
    prev = v
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2"/>' % (" ".join(pts), TAUPE)
for y, v in [(2009, 29), (2025, 45)]:
    s += text(tx(y) + 6, cy(v) - 6, "累计 %d" % v, 12, INK2, "start", 700)
nodes = [(2001, "昆曲", "首批代表作"), (2003, "古琴艺术", ""), (2005, "木卡姆、长调", ""), (2009, "一年 25 项：剪纸、书法、端午节", ""), (2010, "中医针灸、京剧", ""), (2011, "皮影戏、伊玛堪", ""), (2016, "二十四节气", ""), (2020, "太极拳", ""), (2022, "传统制茶技艺", ""), (2024, "春节", "")]
for i, (y, nm, sub) in enumerate(nodes):
    hot = y == 2024
    yy = [250, 222, 194][i % 3]
    s += line(tx(y), yy + 8, tx(y), 300, CIN if hot else FAINT, 1)
    s += '<circle cx="%.1f" cy="305" r="%d" fill="%s"/>' % (tx(y), 7 if hot else 5, CIN if hot else INK)
    s += text(tx(y), yy, nm, 15 if hot else 13, CIN if hot else INK, "middle", 700, "Kaiti SC, STKaiti, KaiTi, serif")
    s += text(tx(y), 330, str(y), 11, MUTED, "middle")
s += line(X0, 560, X1, 560, LINE)
c += svg(s)
c += box(1080, 196, 90, 40, "", "")
c += source("按首次进入计，转名录不重复计。来源：UNESCO 中国页面，全国人大常委会执法检查报告附件表四（2024-11）")
pages.append(("6 长卷", c))

# 7 Yimakan
c = frame(7, V1)
c += photo("river", 110, 60, 460, 580)
c += box(110, 620, 300, 20, font(11, 20, "#FFFFFF", 400, "padding-left: 10px"), "示意图（AI 生成）")
c += title("伊玛堪的 14 年：从 5 位到 121 名", x=620, y=60, w=550, h=120, size=38)
c += box(620, 210, 220, 130, "", "")
c += box(620, 210, 200, 120, kai(110, 120, INK2, 400), "5")
c += box(620, 330, 200, 40, font(12, 20, MUTED), "2011 年能完整说唱的传承人")
c += svg(line(760, 280, 860, 280, TAUPE, 1.4, 'marker-end="url(#ar7)"') + '<defs><marker id="ar7" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="%s"/></marker></defs>' % TAUPE)
c += box(880, 210, 280, 120, kai(110, 120, CIN, 400), "121")
c += box(880, 330, 280, 40, font(12, 20, MUTED), "2025 年 12 月的传承人")
c += box(620, 400, 550, 120, "border-top: 1px solid %s; padding-top: 18px; box-sizing: border-box; " % LINE + kai(20, 34, INK, 400), "赫哲族的说唱。2011 年列入急需保护名录，2025 年转入代表作名录，它的保护计划进入优秀实践名册。")
c += box(620, 540, 550, 22, font(12, 22, MUTED, 400, "font-style: italic"), "两个数的口径略有不同：前者是能完整说唱的人，后者是传承人")
c += source("来源：新华社（2025-12-11）文化和旅游部负责人访谈，中国非遗网", x=620, w=550)
pages.append(("7 伊玛堪", c))

# 8 international, side by side
c = frame(8, V1)
c += title("45 项在教科文组织各国页面里最多，后面是土耳其 32 项、法国 30 项")
ctry = [("中国", 45), ("土耳其", 32), ("法国", 30), ("伊朗", 27), ("西班牙", 26), ("阿塞拜疆", 24), ("日本", 23), ("韩国", 23), ("克罗地亚", 23)]
s = ""
for i, (nm, v) in enumerate(ctry):
    y = 196 + i * 44
    hot = nm == "中国"
    c += box(110, y, 110, 30, kai(18, 30, CIN if hot else INK, 400, "text-align: right"), nm)
    s += rect(236, y + 8, v * 11, 16, CIN if hot else TAUPE)
    s += text(236 + v * 11 + 8, y + 22, str(v), 14, CIN if hot else INK, "start", 700)
c += svg(s)
c += card(820, 196, 350, 300, "padding: 22px 24px; ", "")
c += box(844, 214, 300, 30, kai(20, 30, INK, 400), "怎么数的")
c += box(844, 252, 304, 230, font(14, 25, INK2), "各国页面的项数，三套名单合计。跨国联合项目在每个参与国各算一次，所以不能相加。「世界第一」是中国非遗网和新华社的说法，统计公报只写「共 45 个」，教科文组织不发布排名。")
c += source("来源：UNESCO 各国非遗页面（2026-10-06 查阅），中国非遗网，新华社（2024-12-05）")
pages.append(("8 国际", c))

# 9 ten categories: items and sub-items side by side
c = frame(9, V1)
c += title("十大门类里传统技艺最多，有 287 项，传统医药只有 23 项")
cats = [("传统技艺", 287, 629), ("传统音乐", 189, 431), ("民俗", 183, 492), ("传统戏剧", 171, 473), ("民间文学", 167, 251), ("曲艺", 145, 213), ("传统舞蹈", 144, 356), ("传统美术", 139, 417), ("传统体育、游艺与杂技", 109, 166), ("传统医药", 23, 182)]
s = text(380, 190, "项目", 12, INK, "start", 700) + text(760, 190, "子项（申报地区或单位）", 12, MUTED, "start", 700)
for i, (nm, v, sub) in enumerate(cats):
    y = 200 + i * 40
    hot = nm == "传统医药"
    c += box(110, y + 2, 260, 28, kai(17, 28, CIN if hot else INK, 400, "text-align: right"), nm)
    s += rect(380, y + 8, v * 1.2, 16, INK if nm == "传统技艺" else TAUPE)
    s += text(380 + v * 1.2 + 8, y + 21, str(v), 13, INK, "start", 700)
    s += rect(760, y + 8, sub * 0.5, 16, CIN if hot else FAINT)
    s += text(760 + sub * 0.5 + 8, y + 21, str(sub), 13, CIN if hot else MUTED, "start", 700)
c += svg(s)
c += box(760, 608, 410, 30, kai(16, 30, CIN, 400), "传统医药 23 项分出 182 个子项，平均每项 7.9 个")
c += source("来源：全国人大常委会执法检查报告附件表一（2024-11），数据来自文化和旅游部")
pages.append(("9 门类", c))

pages.append(("10 卷之二", chapter(10, V2, "卷之二", "名录之后，是人", "项目写在名录上，手艺只在人身上", "carving")))

# 11 bearers: six batches, and the totals that must not be joined
c = frame(11, V2)
c += title("国家级传承人六批相加 4010 人，<br>「总数」却有好几种口径，不能连成一条线")
bat = [(2007, 226), (2008, 551), (2009, 711), (2012, 498), (2018, 1082), (2025, 942)]
s = line(110, 520, 560, 520, INK)
for i, (y, v) in enumerate(bat):
    x = 126 + i * 72
    h = v / 1100 * 290
    s += rect(x, 520 - h, 48, h, INK2 if y != 2025 else INK)
    s += text(x + 24, 520 - h - 8, str(v), 13, INK, "middle", 700)
    s += text(x + 24, 540, str(y), 12, MUTED, "middle")
c += svg(s)
c += box(110, 196, 450, 24, kai(16, 24, INK, 400), "六批认定人数（人）")
tot = [("2023 年末", "2241", "在世", "统计公报"), ("2024 年", "3068", "前五批认定合计", "执法检查报告"), ("2025 年 5 月", "3107", "健在（共 3997 人）", "国家图书馆"), ("2025 年末", "3994", "未写是否在世", "统计公报")]
s = line(620, 220, 1170, 220, INK, 1.4)
for x, t_ in [(620, "时点"), (760, "人数"), (870, "口径"), (1040, "出处")]:
    c += box(x, 196, 140, 22, font(12, 22, MUTED, 700), t_)
for i, (a, b, k, src) in enumerate(tot):
    y = 228 + i * 62
    hot = b == "2241"
    c += box(620, y + 16, 140, 30, font(14, 30, INK), a)
    c += box(760, y + 8, 110, 46, kai(32, 46, CIN if hot else INK, 400), b)
    c += box(870, y + 16, 170, 30, font(14, 30, INK2), k)
    c += box(1040, y + 16, 130, 30, font(12, 30, MUTED), src)
    s += line(620, y + 62, 1170, y + 62, LINE)
c += svg(s)
c += box(620, 488, 550, 80, kai(17, 30, INK2, 400), "这几个数口径不同，不能接成一条增长线。在世的人，比认定过的人少得多。")
c += source("来源：文化和旅游部历批公布文件，2023 及 2025 年统计公报，执法检查报告（2024），国家图书馆记录成果展")
pages.append(("11 传承人", c))

# 12 the 2018 batch by age
c = frame(12, V2)
c += title("2018 年第五批 1082 名传承人，60 岁以上占 58.3%")
ages = [("40 岁以下", 7), ("40 至 59 岁", 444), ("60 至 69 岁", 287), ("70 至 79 岁", 237), ("80 岁以上", 107)]
s = ""
x = 110
cols = [WASH, FAINT, TAUPE, INK2, INK]
for i, (nm, v) in enumerate(ages):
    w = v / 1082 * 1060
    s += rect(x, 220, max(w - 2, 2), 70, cols[i])
    if w > 80:
        c += box(int(x) + 10, 226, int(w) - 14, 60, font(13, 20, "#FFFFFF" if i >= 2 else INK, 700), "%s<br>%d 人" % (nm, v))
    x += w
s += line(110 + 451 / 1082 * 1060, 300, 110 + 451 / 1082 * 1060, 330, CIN, 1.5)
s += line(110 + 451 / 1082 * 1060, 330, 1170, 330, CIN, 1.5)
s += text(1170, 350, "60 岁以上 631 人，占 58.3%", 15, CIN, "end", 700, "Kaiti SC, STKaiti, KaiTi, serif")
s += text(110, 312, "40 岁以下 7 人", 12, MUTED)
c += svg(s)
c += box(110, 196, 600, 22, font(12, 22, MUTED), "2018 年第五批国家级代表性传承人，按年龄（只代表这一批）")
nums = [("hourglass", "63.29", "岁", "第五批平均年龄"), ("users", "65", "岁以上", "被检查省份国家级传承人平均年龄，其中半数在 70 岁以上（全国人大，2024）"), ("sprout", "0.6", "%", "第五批里 40 岁以下的人，共 7 人")]
s = ""
for i, (ic, v, u, k) in enumerate(nums):
    xx = 110 + i * 360
    s += icon(ic, xx, 400, 20, TAUPE)
    c += box(xx + 30, 390, 320, 70, kai(58, 70, INK, 400), v + '<span style="font-size:18px;color:%s"> %s</span>' % (MUTED, u))
    c += box(xx, 470, 330, 60, font(13, 21, MUTED), k)
c += svg(s)
c += source("来源：光明日报、新京报（2018-05），全国人大常委会执法检查报告（2024-11）")
pages.append(("12 年龄", c))

# 13 the record project
c = frame(13, V2)
c += photo("hands", 110, 60, 420, 580)
c += box(110, 620, 300, 20, font(11, 20, "#FFFFFF", 400, "padding-left: 10px"), "示意图（AI 生成）")
c += title("71 人没等到自己的记录做完", x=580, y=60, w=590, h=110, size=40)
c += box(580, 196, 260, 120, kai(110, 120, CIN, 400), "71" + '<span style="font-size:22px;color:%s"> 人</span>' % MUTED)
c += box(580, 316, 260, 22, font(13, 22, INK), "记录过程中离世")
c += box(880, 196, 290, 120, kai(110, 120, INK2, 400), "397" + '<span style="font-size:22px;color:%s"> 人</span>' % MUTED)
c += box(880, 316, 290, 22, font(13, 22, INK), "完成记录后离世")
s = ""
done = 1279 / 2290 * 590
s += rect(580, 400, done - 2, 40, INK) + rect(580 + done, 400, 590 - done, 40, FAINT)
c += svg(s)
c += box(580, 372, 590, 22, font(12, 22, MUTED), "抢救性记录已开展 2290 人")
c += box(590, 400, 300, 40, font(13, 40, "#FFFFFF", 700), "已完成 1279 人，56%")
c += box(int(590 + done), 400, 300, 40, font(13, 40, INK, 700), "未完成 1011 人")
c += box(580, 470, 590, 90, "border-top: 1px solid %s; padding-top: 16px; box-sizing: border-box; " % LINE + kai(19, 32, INK2, 400), "原始素材 7.5 万多小时，口述史文稿 1.48 亿字。有的人，只留下了这些。")
c += source("截至 2025 年 5 月。来源：国家图书馆非遗记录工程成果展", x=580, w=590)
pages.append(("13 记录", c))

# 14 back into life
c = frame(14, V2)
c += title("见人见物见生活：手艺回到工坊、课堂和校园")
trio = [("workshop", "store", "工坊"), ("carving", "users", "研培"), ("school", "school", "校园")]
for i, (img, ic, cap) in enumerate(trio):
    x = 110 + i * 360
    c += photo(img, x, 186, 340, 220)
    c += svg(icon(ic, x, 418, 18, TAUPE))
    c += box(x + 26, 414, 300, 26, kai(18, 26, INK, 400), cap)
data = [("1.49", "万家", "非遗工坊，2025 年末", "统计公报", CIN), ("约 130", "万人", "工坊带动就业增收", "国新办发布会，2026-09", INK), ("5.1", "万余人次", "研培计划，149 所院校", "文化和旅游部答复，2025-12", INK), ("3369", "所", "中华优秀传统文化传承学校", "执法检查报告，2024", INK)]
for i, (v, u, k, src, col) in enumerate(data):
    x = 110 + i * 270
    c += box(x, 466, 250, 60, kai(46, 60, col, 400, "white-space: nowrap"), v + '<span style="font-size:15px;color:%s"> %s</span>' % (MUTED, u))
    c += box(x, 530, 250, 22, font(13, 22, INK), k)
    c += box(x, 554, 250, 20, font(11, 20, MUTED), src)
c += source("图为 AI 生成的示意图。平台公布的非遗短视频和电商数字是企业口径，不能当成传承变好的证据，所以不上页面")
pages.append(("14 生活", c))

# 15 the Spring Festival after listing
c = frame(15, V2)
c += photo("lanterns", 110, 60, 420, 580)
c += box(110, 620, 300, 20, font(11, 20, "#FFFFFF", 400, "padding-left: 10px"), "示意图（AI 生成）")
c += title("春节入遗后，<br>按天算出游多了 5.7%", x=580, y=60, w=590, h=110, size=40)
rows = [("2025 年春节", "8 天", "5.01", "0.626"), ("2026 年春节", "9 天", "5.96", "0.662")]
s = line(580, 220, 1170, 220, INK, 1.4)
for x, t_ in [(580, "假期"), (760, "天数"), (860, "出游（亿人次）"), (1020, "日均（亿人次）")]:
    c += box(x, 196, 160, 22, font(12, 22, MUTED, 700), t_)
for i, (a, d, v, pd) in enumerate(rows):
    y = 228 + i * 70
    hot = i == 1
    c += box(580, y + 18, 180, 30, kai(18, 30, INK, 400), a)
    c += box(760, y + 18, 100, 30, font(15, 30, INK2), d)
    c += box(860, y + 8, 150, 50, kai(36, 50, INK, 400), v)
    c += box(1020, y + 8, 150, 50, kai(36, 50, CIN if hot else INK, 400), pd)
    s += line(580, y + 70, 1170, y + 70, LINE)
c += svg(s)
c += box(580, 388, 590, 30, kai(17, 30, CIN, 400), "日均出游从 0.626 亿到 0.662 亿人次，多了 5.7%")
c += box(580, 440, 590, 120, "background: %s; padding: 16px 20px; box-sizing: border-box; " % WASH + font(14, 24, INK2), "春运是另一套数：2026 年 40 天跨区域人员流动 94.1 亿人次，含返乡和务工，不是旅游。出游增长也不能归因于入遗。")
c += source("来源：文化和旅游部（2025-02、2026-02），交通运输部（2026-04）", x=580, w=590)
pages.append(("15 春节", c))

# 16 the problems, on record
c = frame(16, V2)
c += title("问题写在官方文件里：重申报轻保护、简单模仿，还有冒牌非遗")
probs = [("file-warning", "重申报、轻保护", "「存在『重申报、轻保护』『重数量、轻质量』现象」", "全国人大执法检查报告，2024"),
         ("layers", "盲目跟风、简单模仿", "非遗和旅游融合层次不高，「存在盲目跟风、简单模仿的现象」", "同上"),
         ("hand-coins", "基层投入不足", "一些地方非遗经费连年下降，第二次全国非遗普查尚未组织实施", "同上"),
         ("shield-alert", "冒牌「非遗」", "冒用标识、虚构传承人、编造疗效：下架 197 个商品，关停 35 家店铺", "最高人民检察院典型案例，2026-03")]
s = ""
for i, (ic, t_, q, src) in enumerate(probs):
    y = 196 + i * 108
    hot = i == 3
    s += icon(ic, 110, y + 8, 22, CIN if hot else TAUPE)
    c += box(146, y, 300, 36, kai(24, 36, CIN if hot else INK, 400), t_)
    c += box(460, y + 4, 710, 50, kai(17, 28, INK2, 400), q)
    c += box(460, y + 60, 710, 20, font(11, 20, MUTED), src)
    s += line(110, y + 96, 1170, y + 96, LINE)
c += svg(s)
pages.append(("16 问题", c))

# 17 five things, five upright characters
c = frame(17, V2)
c += title("留给大家的五件事：去看，去问，去查，去记，去学")
five = [("看", "到文化馆、图书馆、非遗馆看展演，这是非遗法第三十五条交给它们的事"), ("问", "问一句：这个项目的传承人是谁，现在还在做吗"), ("查", "自称传承人的，到中国非遗网名录核对，冒牌直播可以投诉"), ("记", "经长辈同意，录下家里的年俗、方言和手艺，写清是谁、在哪、何时"), ("学", "真想学一门手艺，按年计划，别只上一节体验课")]
s = ""
for i, (ch, d_) in enumerate(five):
    x = 1170 - (i + 1) * 212
    hot = ch == "记"
    s += line(x, 196, x, 620, LINE)
    c += box(x + 20, 196, 180, 130, kai(110, 130, CIN if hot else INK, 400, "text-align: center"), ch)
    c += vert(x + 60, 350, 110, 270, d_, kai(17, 34, INK2, 400, "letter-spacing: 2px"))
c += svg(s)
c += box(110, 648, 1060, 20, font(11, 20, MUTED), "这些是建议，做了也不保证什么。依据：非遗法第十四、二十、三十五条")
pages.append(("17 五件事", c))

# 18 the colophon
c = photo("brush", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: rgba(247,242,231,0.82)")
c += vert(820, 90, 110, 580, "名录记下名字，", kai(54, 110, INK, 400, "letter-spacing: 6px"))
c += vert(700, 90, 110, 580, "手艺要靠人传下去。", kai(54, 110, INK, 400, "letter-spacing: 6px"))
c += svg(line(600, 110, 600, 630, LINE, 1))
c += vert(520, 110, 40, 400, HALL + "　公众讲座", kai(20, 40, INK2, 400, "letter-spacing: 6px"))
c += vert(470, 110, 40, 400, DATE, kai(20, 40, INK2, 400, "letter-spacing: 6px"))
c += seal(470, 530, "文", 44)
c += box(110, 600, 300, 40, font(13, 20, MUTED), "文化和自然遗产日<br>每年 6 月第二个星期六")
c += box(24, 680, 400, 20, font(11, 20, MUTED), "背景为 AI 生成的示意图")
pages.append(("18 落款", c))

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
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "ink 非遗讲座样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
