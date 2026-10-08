import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# runway: a show's running order. Show-white paper, show black, one drop of crimson; the pictures argue, the words caption.
BG = "#F2F0EB"; SURF = "#FAF9F5"; INK = "#141414"; TEXT = "#191919"; MUTED = "#646460"; LINE = "#D9D6CE"; CRIMSON = "#B0483C"; FAINT = "#A8A59C"
SERIF = "'Didot', 'Bodoni 72', 'Songti SC', 'STSong', serif"
SANS = "'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
KEYS = ["ch-fabric", "ch-inspire", "dressform", "gradient", "hero", "look0203", "look04", "look0507", "mood-fray", "mood-ghost", "mood-indigo", "mood-knee", "mood-mend", "mood-seam", "panels", "samples", "sort", "unpick"]
IMG = {k: "__%s__" % k.replace("-", "_") for k in KEYS}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
SHOW = "毕业设计 · 再穿一次"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=INK, sw=1.5):
    s = size / 24
    return '<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (x, y, s, color, sw, _icon_svg(name))


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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + bg + "; color: " + TEXT + "; font-family: " + SANS + """">
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


def font(size, lh, color=TEXT, weight=400, extra="", family=SANS):
    return "font-family: %s; font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (family, size, lh, color, weight, extra)


def serif(size, lh, color=TEXT, weight=400, extra=""):
    return font(size, lh, color, weight, extra, SERIF)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def line(x1, y1, x2, y2, c=LINE, w=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f"%s/>' % (x1, y1, x2, y2, c, w, d)


def photo(key, x, y, w, h, pos="50% 50%"):
    return box(x, y, w, h, "overflow: hidden; ", '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover; object-position: %s">' % (w, h, pos))


def window(key, x, y, w, h, iw, ih, ox, oy):
    """One figure of a group picture: the picture scaled to iw x ih and shifted so only that figure shows."""
    return box(x, y, w, h, "overflow: hidden; ", '<img src="' + IMG[key] + '" alt="" style="display: block; position: relative; left: %dpx; top: %dpx; width: %dpx; height: %dpx">' % (ox, oy, iw, ih))


def cap(x, y, w, t_, align="left", color=MUTED):
    return box(x, y, w, 16, font(10, 16, color, 400, "text-align: %s; letter-spacing: 0.5px" % align), t_)


def masthead(pg, section, dark=False):
    """The show's running order across the top: the show on the left, the section in small caps, the page as an exit number."""
    c_ = "#EDEAE3" if dark else INK
    m_ = "#A8A59C" if dark else MUTED
    out = box(64, 30, 500, 16, font(10, 16, c_, 600, "letter-spacing: 4px"), SHOW)
    out += box(560, 30, 500, 16, font(10, 16, m_, 400, "letter-spacing: 4px; text-align: right"), section)
    out += svg(line(64, 54, 1216, 54, c_, 1))
    out += box(1100, 30, 116, 16, serif(13, 16, c_, 400, "text-align: right"), "%02d" % pg)
    return out


def title(t_, y=78, h=80, x=64, w=1152, size=34):
    return box(x, y, w, h, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(size, size + 10, INK, 400), "<div>" + t_ + "</div>")


def source(t_, y=670, x=64, w=1000):
    return box(x, y, w, 30, font(10, 14, MUTED), t_)


pages = []

# 1 cover: a magazine cover, the long patchwork coat walking away, the name set huge across it
c = photo("hero", 0, 0, 1280, 720, "50% 30%")
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(20,20,20,0.82) 0%, rgba(20,20,20,0.35) 46%, rgba(20,20,20,0) 70%)")
c += box(64, 48, 600, 18, font(11, 18, "#F2F0EB", 600, "letter-spacing: 8px"), "毕业设计　服装设计 · 本科")
c += svg(line(64, 76, 560, 76, "#F2F0EB", 1))
c += box(56, 300, 720, 190, serif(150, 180, "#F2F0EB", 400, "letter-spacing: -2px"), "再穿一次")
c += box(64, 500, 600, 26, font(17, 26, "#F2F0EB", 400, "letter-spacing: 2px"), "把回收的旧牛仔裤拆开，再做成一个系列")
c += box(64, 544, 400, 18, font(11, 18, CRIMSON, 600, "letter-spacing: 6px"), "七个造型")
c += cap(980, 690, 236, "LOOK 01（AI 生成示意）", "right", "#D9D6CE")
pages.append(("1 封面", c, BG))

# 2 the order of the review, set like a running order: big numbers, hairlines, no cards
c = masthead(2, "出场顺序")
c += title("答辩分五段：从一条旧裤子讲到一个系列")
order = [("01", "为什么是旧牛仔", "旧纺织品的规模，一条牛仔裤的水", "factory"), ("02", "灵感", "把磨白、褶痕和口袋印当成图案", "palette"), ("03", "面料", "拆线、分档、拼接，做出新面料", "scissors"),
         ("04", "系列", "七个造型，按色阶从深走到浅", "shirt"), ("05", "边界", "做到了什么，做不到什么", "scale")]
s = ""
for i, (n, t_, d_, ic) in enumerate(order):
    x = 64 + i * 232
    s += line(x, 284, x + 212, 284, INK, 1.2)
    c += box(x, 298, 212, 110, serif(96, 110, CRIMSON if i == 3 else INK, 400), n)
    s += icon(ic, x, 430, 22, INK, 1.4)
    c += box(x, 464, 212, 32, serif(24, 32, INK, 400), t_)
    c += box(x, 502, 200, 44, font(13, 22, MUTED), d_)
c += svg(s)
pages.append(("2 出场顺序", c, BG))

# 3 why old denim: a statement and three figures laid out like an editor's standfirst
c = masthead(3, "为什么是旧牛仔")
c += box(64, 120, 1000, 150, serif(52, 72, INK, 400), '旧衣不缺，<br>缺的是让它<span style="color:%s">再被用一次</span>的办法' % CRIMSON)
figs = [("约 2200", "万吨", "2020 年全国废旧纺织品产生量，当年循环利用率约 20%"), ("25%　30%", "", "国家定下的 2025 年、2030 年循环利用率目标"), ("易拆解", "", "同一份文件要求提高纺织品易拆解、易分类、易回收性")]
s = ""
for i, (v, u, d_) in enumerate(figs):
    x = 64 + i * 390
    s += line(x, 420, x + 360, 420, INK, 1)
    c += box(x, 436, 360, 64, serif(50, 64, INK, 400), v + ('<span style="font-size:18px; font-family: %s"> %s</span>' % (SANS, u) if u else ""))
    c += box(x, 512, 340, 50, font(13, 22, MUTED), d_)
c += svg(s)
c += source("来源：发改委等《关于加快推进废旧纺织品循环利用的实施意见》（发改环资〔2022〕526 号），发改委网站专家解读（2022 年 4 月）")
pages.append(("3 为什么", c, BG))

# 4 the water a new pair has already cost: two figures side by side, never added
c = masthead(4, "为什么是旧牛仔")
c += title("一条牛仔裤在被剪开之前，已经付过一次水的代价")
c += svg(line(640, 210, 640, 560, LINE, 1))
for x, v, u, d_, src, col in ((64, "3,781", "升", "一条 Levi's 501 从棉田到报废的净耗水", "Levi's 生命周期评估，2015，企业口径", CRIMSON), (704, "10,850", "升", "每 1000 克牛仔裤的全球平均虚拟水", "Chapagain 等，UNESCO-IHE，2005", INK)):
    c += box(x, 236, 540, 170, serif(150, 170, col, 400, "letter-spacing: -3px"), v + '<span style="font-size:28px; font-family: %s"> %s</span>' % (SANS, u))
    c += box(x, 420, 520, 28, font(17, 28, INK, 500), d_)
    c += box(x, 452, 520, 20, font(12, 20, MUTED), src)
c += box(64, 560, 1100, 22, font(13, 22, MUTED), "两套算法口径不同：一个按一条裤子的全生命周期，一个按每千克的虚拟水。并排看，不相加，不比大小")
c += source("来源：Levi Strauss & Co.《The Life Cycle of a Jean》（2015），Chapagain 等《The water footprint of cotton consumption》（2005）")
pages.append(("4 水的代价", c, BG))


def chapter(pg, num, ttl, sub, key, pos="50% 50%"):
    c = photo(key, 0, 0, 1280, 720, pos)
    c += box(0, 0, 1280, 720, "background: linear-gradient(0deg, rgba(20,20,20,0.78) 0%, rgba(20,20,20,0.15) 55%, rgba(20,20,20,0.25) 100%)")
    c += masthead(pg, "第 %s 部分" % num.lstrip("0"), True)
    c += box(56, 360, 600, 240, serif(240, 240, "#F2F0EB", 400, "letter-spacing: -6px"), num)
    c += box(560, 470, 660, 60, serif(48, 60, "#F2F0EB", 400, "text-align: right"), ttl)
    c += box(560, 540, 660, 26, font(15, 26, "#E4E1D9", 400, "text-align: right"), sub)
    c += cap(980, 690, 236, "AI 生成示意", "right", "#D9D6CE")
    return c


pages.append(("5 灵感", chapter(5, "01", "灵感：穿过的痕迹", "磨白、褶痕、口袋印，都是被穿过的证据", "ch-inspire"), BG))

# 6 the moodboard: an uneven collage, big and small, captions as numbers
c = masthead(6, "灵感")
c += title("情绪板：把磨损当成图案", y=62, h=60, size=30)
tiles = [("mood-ghost", 64, 140, 380, 360, "1 口袋印"), ("mood-knee", 456, 140, 250, 200, "2 膝盖磨白"), ("mood-seam", 456, 352, 250, 148, "3 明线卷边"),
         ("mood-fray", 718, 140, 230, 260, "4 毛边"), ("mood-mend", 960, 140, 256, 260, "5 补丁"), ("mood-indigo", 718, 412, 498, 200, "6 靛蓝色阶")]
for k, x, y, w, h, t_ in tiles:
    c += photo(k, x, y, w, h)
    c += box(x + 8, y + h - 24, w - 16, 18, font(10, 18, "#FFFFFF", 600, "letter-spacing: 1px; text-shadow: 0 0 6px rgba(0,0,0,0.6)"), t_)
c += box(64, 516, 640, 90, serif(26, 40, INK, 400), "被穿过的地方，<br>就是这个系列的图案")
c += source("图片均为 AI 生成示意", y=680)
pages.append(("6 情绪板", c, BG))

pages.append(("7 面料", chapter(7, "02", "面料：拆、分、拼", "主面料全部取自回收的旧牛仔裤", "ch-fabric", "50% 40%"), BG))

# 8 five steps: numbers along a hairline, three process pictures under the middle steps
c = masthead(8, "面料")
c += title("一条旧裤子变成面料，要走五步")
steps = [("清洗晾干", "先洗净晾干，再看哪里破、哪里能用"), ("拆线", "沿缝线拆，不剪断，保住整块面积"), ("展平熨烫", "前片、后片、腰头、口袋布分开压平"), ("分档", "按深浅分成三档，同一档放一起"), ("排料拼接", "先拼成整幅面料，再按样板裁")]
s = line(64, 214, 1216, 214, INK, 1.2)
for i, (t_, d_) in enumerate(steps):
    x = 64 + i * 232
    s += '<circle cx="%d" cy="214" r="5" fill="%s"/>' % (x + 6, INK)
    c += box(x, 228, 220, 50, serif(40, 50, INK, 400), "%02d" % (i + 1))
    c += box(x, 282, 214, 28, font(17, 28, INK, 600), t_)
    c += box(x, 312, 206, 44, font(12, 20, MUTED), d_)
c += svg(s)
for i, (k, t_) in enumerate((("unpick", "02 沿缝线拆开"), ("panels", "03 分部位压平"), ("sort", "04 按深浅分档"))):
    x = 296 + i * 232
    c += photo(k, x, 380, 220, 230)
    c += cap(x, 616, 220, t_)
c += source("过程图均为 AI 生成示意", y=680)
pages.append(("8 五步", c, BG))

# 9 why unpick, not shred: the two fibre lengths drawn to scale
c = masthead(9, "面料")
c += title("打碎重纺会让纤维短三分之一，所以这次只拆不打碎")
K = 28
s = ""
for i, (v, lab, src, col) in enumerate(((28.3, "原生棉纤维的上四分位长度", "Arafat & Uddin，Heliyon，2022", INK), (18.9, "消费后回收棉纤维的上四分位长度", "同一试验", CRIMSON))):
    y = 250 + i * 170
    c += box(64, y - 20, 300, 90, serif(76, 90, col, 400), "%.1f" % v + '<span style="font-size:20px; font-family: %s"> 毫米</span>' % SANS)
    s += line(400, y + 30, 400 + v * K, y + 30, col, 6)
    s += line(400, y + 18, 400, y + 42, INK, 1) + line(400 + v * K, y + 18, 400 + v * K, y + 42, INK, 1)
    c += box(400, y + 52, 700, 22, font(14, 22, INK, 500), lab)
    c += box(400, y + 76, 700, 20, font(11, 20, MUTED), src)
s += line(400 + 18.9 * K, 420, 400 + 18.9 * K, 280, CRIMSON, 1, "3 4")
c += svg(s)
c += box(64, 580, 1100, 24, font(14, 24, INK), '同一试验里，30 支环锭纱最多只能掺 <span style="color:%s; font-family: %s; font-size: 18px">25%%</span> 回收棉。所以这个系列在面料层面再造，纤维不打碎' % (CRIMSON, SERIF))
c += source("来源：Arafat & Uddin，Heliyon（2022），纺纱厂工业规模试验。「短约三分之一」为计算：(28.3 − 18.9) ÷ 28.3。线段按长度等比例画")
pages.append(("9 纤维", c, BG))

# 10 grading: the swatch strip full width, the three shades bracketed over it
c = masthead(10, "面料")
c += title("按深浅把裁片分成三档", y=62, h=60, size=30)
c += photo("gradient", 64, 220, 1152, 300, "50% 50%")
s = ""
for i, (x1, x2, nm, d_) in enumerate(((64, 440, "深档", "腰头背面、口袋下面，少见光的地方"), (452, 828, "中档", "大腿和小腿正面的大块裁片"), (840, 1216, "浅档", "膝盖、臀部、褶痕，反复磨白的地方"))):
    s += line(x1, 200, x2, 200, INK, 1.2) + line(x1, 194, x1, 206, INK, 1.2) + line(x2, 194, x2, 206, INK, 1.2)
    c += box(x1, 150, 376, 40, serif(28, 40, INK, 400), nm)
    c += box(x1, 534, 376, 44, font(13, 22, MUTED), d_)
c += svg(s)
c += cap(64, 590, 600, "同一批旧裤拆出的裁片，从深到浅排开（AI 生成示意）")
pages.append(("10 分档", c, BG))

# 11 three joins: the samples large, the three methods beside them
c = masthead(11, "面料")
c += title("三种拼法，各管一类部位")
c += photo("samples", 64, 190, 470, 440)
c += cap(64, 636, 470, "拼接小样（AI 生成示意）")
joins = [("平接压明线", "用在肩、腰、裆等受力处。结实，但明线多、费工", "ruler"), ("叠拼留毛边", "用在衣身大面和下摆，深浅两层都看得见", "layers"), ("窄条拼", "把太小的碎片也用上。拼缝最多，最费时", "scissors")]
s = ""
for i, (t_, d_, ic) in enumerate(joins):
    y = 200 + i * 140
    s += line(590, y, 1216, y, INK, 1)
    c += box(590, y + 14, 80, 60, serif(48, 60, INK, 400), "%d" % (i + 1))
    s += icon(ic, 660, y + 30, 22, INK, 1.4)
    c += box(700, y + 22, 500, 34, serif(26, 34, INK, 400), t_)
    c += box(700, y + 64, 500, 44, font(14, 22, MUTED), d_)
c += svg(s)
pages.append(("11 拼法", c, BG))

# 12 the collection: the seven looks in a single running line, numbered like a show's exits
c = masthead(12, "第 3 部分")
c += box(64, 76, 400, 160, serif(150, 160, INK, 400, "letter-spacing: -4px"), "03")
c += box(480, 112, 736, 48, serif(40, 48, INK, 400), "系列：七个造型")
c += box(480, 168, 736, 26, font(15, 26, MUTED), "按色阶出场，从深走到浅")
wins = [("hero", 240, 360, -43, 0), ("look0203", 400, 400, -24, -20), ("look0203", 400, 400, -222, -20), ("look04", 240, 360, -43, 0),
        ("look0507", 470, 470, -2, -55), ("look0507", 470, 470, -158, -55), ("look0507", 470, 470, -314, -55)]
for i, (k, iw, ih, ox, oy) in enumerate(wins):
    x = 64 + i * 166
    c += window(k, x, 262, 154, 360, iw, ih, ox, oy)
    c += box(x, 630, 154, 24, serif(18, 24, CRIMSON if i == 0 else INK, 400), "LOOK %02d" % (i + 1))
c += cap(64, 680, 600, "AI 生成示意，第 2 与第 3、第 5 至第 7 号为同一张合影的局部")
pages.append(("12 出场", c, BG))


def look(pg, nums, ttl, key, pos, rows, capt):
    c = photo(key, 0, 0, 560, 720, pos)
    c += box(600, 30, 616, 16, font(10, 16, INK, 600, "letter-spacing: 4px"), SHOW)
    c += box(600, 30, 616, 16, serif(13, 16, INK, 400, "text-align: right"), "%02d" % pg)
    c += svg(line(600, 54, 1216, 54, INK, 1))
    c += box(600, 76, 616, 140, serif(130, 140, CRIMSON if nums.startswith("01") else INK, 400, "letter-spacing: -4px"), nums)
    c += box(604, 214, 600, 20, font(11, 20, MUTED, 400, "letter-spacing: 6px"), "LOOK")
    c += box(600, 246, 616, 56, serif(40, 52, INK, 400), ttl)
    s = ""
    for i, (k_, v_) in enumerate(rows):
        y = 340 + i * 82
        s += line(600, y, 1216, y, LINE, 1)
        c += box(600, y + 12, 120, 20, font(11, 20, MUTED, 400, "letter-spacing: 3px"), k_)
        c += box(720, y + 10, 496, 52, font(16, 26, INK), v_)
    c += svg(s)
    c += cap(600, 680, 616, capt)
    return c


pages.append(("13 LOOK 01", look(13, "01", "渐变拼片长风衣", "hero", "50% 30%", [("面料", "几条旧裤的大块裁片，按色阶斜向排开"), ("工艺", "受力处平接压明线，衣身叠拼留毛边"), ("色阶", "肩上深档，往下一档档变浅到下摆")], "LOOK 01（AI 生成示意）"), BG))
pages.append(("14 LOOK 02 03", look(14, "02 03", "腰头和裤腿，换个位置再用", "look0203", "50% 50%", [("LOOK 02", "腰头横拼短夹克，侧缝外翻的阔腿裤"), ("LOOK 03", "裤腿裁成长条，深浅交替拼成长裙"), ("共同点", "保留原来的腰头、侧缝和黄色明线")], "LOOK 02（左）与 LOOK 03（右）（AI 生成示意）"), BG))
pages.append(("15 LOOK 04", look(15, "04", "色阶长裙", "look04", "50% 40%", [("面料", "横向布条按色阶排，上深下浅"), ("工艺", "布条之间叠拼，边缘不锁"), ("廓形", "无袖长裙，裙摆落到地面")], "LOOK 04 背面（AI 生成示意）"), BG))
pages.append(("16 LOOK 05 06 07", look(16, "05–07", "毛边、口袋印和工装", "look0507", "50% 50%", [("LOOK 05", "拼接衬衫，过肩和袖口的毛边露在外面"), ("LOOK 06", "连衣裙，拆掉口袋后的深色印子排成图案"), ("LOOK 07", "工装连体裤，中深档拼身，浅档做口袋")], "从左到右：LOOK 05、06、07（AI 生成示意）"), BG))

# 17 the limits, stated before anyone asks: two ruled columns, ticks and crosses
c = masthead(17, "边界")
c += title('这个系列示范了一种做法，<span style="color:%s">没有解决环境问题</span>' % CRIMSON)
cols = [(64, "做到了", "check", [("旧牛仔的颜色、磨痕和缝线留了下来", "面料层级再造，纤维没有被打碎"), ("来源不一的旧裤靠分档拼成一个系列", "靠深、中、浅三档色差分级"), ("整理出一套拆、分、拼的做法", "三种拼法各管一类部位")]),
        (664, "做不到", "x", [("劳动密集、来料不稳，难以规模化", "艾伦·麦克阿瑟基金会对这类做法的判断"), ("环境账没有核算，不能说省了水", "清洗、辅料、边角料都有代价"), ("全国一年回收约 555 万吨，系列按条用", "2025 年数据，中国物资再生协会")])]
s = ""
for x, head_, ic, items in cols:
    s += line(x, 200, x + 552, 200, INK, 1.4)
    c += box(x, 210, 552, 36, serif(26, 36, INK, 400), head_)
    for i, (t_, d_) in enumerate(items):
        y = 268 + i * 92
        s += icon(ic, x, y + 2, 20, CRIMSON if ic == "x" else INK, 1.8)
        c += box(x + 34, y, 518, 28, font(16, 28, INK, 500), t_)
        c += box(x + 34, y + 30, 518, 22, font(12, 22, MUTED), d_)
        s += line(x, y + 74, x + 552, y + 74, LINE, 1)
c += svg(s)
c += box(64, 568, 1152, 40, "border-top: 1px solid %s; border-bottom: 1px solid %s; " % (INK, INK) + serif(20, 40, INK, 400, "text-align: center; letter-spacing: 2px"), "能说的是方法，不能说的是环境收益")
c += source("来源：艾伦·麦克阿瑟基金会《A New Textiles Economy》（2017），中国物资再生协会（2025 年回收量）")
pages.append(("17 边界", c, BG))

# 18 the bow: black stage, thanks, the show's name in small caps
c = box(64, 30, 600, 16, font(10, 16, "#EDEAE3", 600, "letter-spacing: 4px"), SHOW)
c += svg(line(64, 54, 1216, 54, "#EDEAE3", 1))
c += box(64, 230, 1152, 150, serif(110, 150, "#F2F0EB", 400, "text-align: center; letter-spacing: 6px"), "谢谢各位老师")
c += svg(line(600, 420, 680, 420, CRIMSON, 2))
c += box(64, 446, 1152, 28, font(15, 28, "#C9C6BE", 400, "text-align: center; letter-spacing: 6px"), "再穿一次 · 答辩结束，请老师提问")
pages.append(("18 谢幕", c, INK))

assert len(pages) == TOTAL, len(pages)
boards = {}; order_ = []; cells = []
for i, (ttl, inner, bg) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(ttl, inner, bg))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(ttl + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 引擎当前"}; order_.append(cur)
    loc = inner.replace("<!--BG-->", "")
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (bg, TEXT, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "runway 毕业设计答辩样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
