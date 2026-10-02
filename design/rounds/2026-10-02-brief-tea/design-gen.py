import json, os, datetime
ROOT=os.path.dirname(os.path.abspath(__file__)); P=os.path.join(ROOT,'project')
NAVY="#1E2A4A"; Y="#F5C518"; BG="#F7F6F2"; SURF="#FFFFFF"; INK="#1C1E23"; MUTED="#5B6069"; LINE="#DDDCD4"; GREY="#8C8F94"
FONT="Georgia, 'Songti SC', 'STSong', 'Source Han Serif SC', serif"
STREET="/_blob/94e5cf4bad6e8a0efd4af13e13e14ad1"
CUR=["d8f6515a36016df1652f10975a31a91c","c4e72c0c36e19634a73d0a0a9fd37b42","a11cce26691127c61982aab067140c94","8029dbcb3e518db31461aad5ba500f44","d5f077ed3965a5a5d8157f56b7e8c20d","3c5bcfa969dc4146b8abf457063dd8c5","d85d5e378f97d19960400e9a96b267bc","094f6526de91b49ce46961d2447c7f82","dd31f934caec9bf6cfd2021d01feb641","f3f0ed84e55e15c0c50d0d55f2bd7b66","b73341019aeb34fe5252ea16b8230383","0059c229547f810413a8a5dc128cadee"]

def pad(t): return '<span style="background: linear-gradient(transparent 60%, '+Y+' 60%, '+Y+' 94%, transparent 94%); padding: 0 3px; white-space: nowrap">'+t+'</span>'
def page(title, inner, bg=BG, color=INK, w=1280, h=720):
    return """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>"""+title+"""</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="position: relative; width: """+str(w)+"px; height: "+str(h)+"px; overflow: hidden; background: "+bg+"; color: "+color+"; font-family: "+FONT+"""">
"""+inner+"""
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":"""+str(w)+""","height":"""+str(h)+"""}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
"""
def box(x,y,w,h,style="",content=""):
    s="position: absolute; left: %dpx; top: %dpx; width: %dpx; "%(x,y,w)
    if h is not None: s+="height: %dpx; "%h
    return '<div style="'+s+style+'">'+content+'</div>\n'
def head(h): return box(96,56,1000,104,"display: flex; flex-direction: column; justify-content: flex-end; font-size: 36px; line-height: 46px; color: "+NAVY,h)+box(96,172,1088,1,"background: "+NAVY)
def source(t,y=624,x=96,w=1088): return box(x,y,w,24,"font-size: 16px; line-height: 24px; color: "+MUTED,t)
def svg(body): return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="'+FONT+'">'+body+'</svg>\n'
def t(x,y,s,size=16,fill=MUTED,anchor="start",weight="400"): return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%s">%s</text>'%(x,y,size,fill,anchor,weight,s)
def navy_block(x,y,w,h,text,size=24):
    return box(x,y,w,h,"background: "+NAVY+"; box-sizing: border-box; padding: 0 40px; display: flex; align-items: center; font-size: %dpx; line-height: 1.55; color: #FFFFFF"%size,text)
def rail(x, items):
    """items: list of (label, value_html, sub)"""
    out=box(x-40,200,1,400,"background: "+LINE)
    y=212
    for i,(lab,val,sub) in enumerate(items):
        if i: out+=box(x,y-16,1184-x,1,"background: "+LINE)
        out+=box(x,y,1184-x,24,"font-size: 16px; line-height: 24px; color: "+MUTED,lab)
        out+=box(x,y+30,1184-x,64,"font-size: 52px; line-height: 64px; color: "+NAVY+"; white-space: nowrap",val)
        out+=box(x,y+100,1184-x,52,"font-size: 17px; line-height: 26px; color: "+INK,sub)
        y+=200
    return out
def bars(x0,x1,base,top,vmax,groups,legend=None,unit=""):
    """groups: list of (label, [(value, color, emphasized)])"""
    H=base-top; s=""
    for v in [0, vmax/2, vmax]:
        yy=base-v/vmax*H
        s+='<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="%s" stroke-width="1"/>'%(x0,yy,x1,yy,LINE if v else GREY)
        s+=t(x0-12,yy+6,("%g"%v)+unit,16,MUTED,"end")
    slot=(x1-x0)/len(groups)
    for i,(lab,vals) in enumerate(groups):
        n=len(vals); bw=min(84, (slot*0.72)/n); cx=x0+slot*(i+0.5); start=cx-bw*n/2-(n-1)*4/2
        for j,(v,col,em) in enumerate(vals):
            bx=start+j*(bw+4); bh=v/vmax*H
            s+='<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'%(bx,base-bh,bw,bh,col)
            s+=t(bx+bw/2,base-bh-10,("%g"%v),17,NAVY if em else MUTED,"middle","700" if em else "400")
        s+=t(cx,base+28,lab,16,INK,"middle")
    if legend:
        lx=x0
        for name,col in legend:
            s+='<rect x="%d" y="%d" width="14" height="14" fill="%s"/>'%(lx,top-34,col)+t(lx+22,top-21,name,16,MUTED)
            lx+=22+len(name)*16+28
    return svg(s)

pages=[]
# 1 cover
c=box(96,196,64,6,"background: "+Y)
c+=box(96,226,900,32,"font-size: 22px; line-height: 32px; color: "+MUTED,"新茶饮上市公司 2026 年中报复盘与 2027 年计划建议")
c+=box(96,272,960,168,"font-size: 68px; line-height: 80px; color: "+NAVY,"开店潮之后，增长靠什么")
c+=box(96,520,1088,1,"background: "+NAVY)
for i,s_ in enumerate(["多开店换不来同样的收入和利润","补贴抬高的单量正在回落","新品类和新时段最先见效"]):
    x=96+i*368
    c+=box(x,540,336,24,"font-size: 16px; line-height: 24px; color: "+MUTED,"0"+str(i+1))
    c+=box(x,568,320,64,"font-size: 22px; line-height: 32px; color: "+INK,s_)
pages.append(("1 封面",c))
# 2 statement
c=box(96,176,64,6,"background: "+NAVY)+box(96,206,960,132,"font-size: 54px; line-height: 66px; color: "+NAVY,"增长要靠单店，不再靠开店")
c+=box(96,320,900,240,"font-size: 26px; line-height: 44px; color: "+INK,"上半年，规模最大的蜜雪门店同比多了 20.7%，收入只多 2.3%，期内利润降了 14.7%。连锁新茶饮门店已连续两年净减少，2025 年外卖补贴推高的单量今年正在回落，目前只有咖啡、早餐这类新品类和新时段已经见效。"+pad("2027 年计划应以同店增长为第一指标。"))
c+=source("来源：蜜雪集团 2026 年中期业绩（2026 年 8 月），灼识咨询《2026 新茶饮行业白皮书》（2026 年 3 月）")
pages.append(("2 观点",c))
# 3 industry chart + rail
c=head("连锁新茶饮已连续两年关店多于开店")
c+=bars(150,830,568,262,20,[("2023 年",[(17.3,GREY,False),(15.3,NAVY,True)]),("2024 年",[(14.6,GREY,False),(15.7,NAVY,True)]),("2025 年",[(10.3,GREY,False),(13.3,NAVY,True)])],legend=[("新开",GREY),("关闭",NAVY)],unit="")
c+=box(96,206,200,24,"font-size: 16px; line-height: 24px; color: "+MUTED,"")
c+=box(96,236,52,24,"font-size: 16px; line-height: 24px; color: "+MUTED+"; text-align: right","万家")
c+=rail(912,[("2025 年净减",pad("29,434 家"),"新开 103,135 家，关闭 132,569 家"),("对比 2024 年","2.5 倍","2024 年净减 11,613 家")])
c+=source("来源：灼识咨询《2026 新茶饮行业白皮书》（2026 年 3 月），基于窄门餐眼等数据，仅含地级市以上连锁新茶饮门店")
pages.append(("3 行业开关店",c))
# 4 photo
c='<img src="'+STREET+'" alt="街边茶饮店示意图" style="position: absolute; left: 0; top: 0; width: 600px; height: 720px; object-fit: cover">'
c+=box(672,150,512,110,"font-size: 40px; line-height: 52px; color: "+NAVY,"广州一年少了<br>2,326 家茶饮店")
c+=box(672,286,48,6,"background: "+Y)
rows=[("广州","14,355 → 12,029 家"),("深圳","9,113 → 7,814 家"),("20 个城市","全部净减少"),("关店数","普遍是新开数的 1.5 到 2 倍")]
for i,(a,b) in enumerate(rows):
    y=324+i*64
    c+=box(672,y,512,1,"background: "+LINE)
    c+=box(672,y+18,120,30,"font-size: 17px; line-height: 30px; color: "+MUTED,a)
    c+=box(800,y+18,384,30,"font-size: 22px; line-height: 30px; color: "+INK,b)
c+=box(672,580,512,1,"background: "+LINE)
c+=box(672,600,512,48,"font-size: 16px; line-height: 24px; color: "+MUTED,"来源：窄门餐眼，咖门整理（2026 年 8 月）。2025 年 7 月与 2026 年 7 月对比。图为示意图。")
pages.append(("4 城市照片页",c))
# 5 kpi
c=head("蜜雪门店一年多了 20.7%，上半年收入只多 2.3%")
k=[("门店数同比","+20.7%","6 月末共 63,987 家",False),("上半年收入同比","+2.3%","152.16 亿元",False),("上半年期内利润同比","−14.7%","上市后首次下滑",True)]
for i,(a,v,b,em) in enumerate(k):
    x=96+i*376
    if i: c+=box(x-28,212,1,168,"background: "+LINE)
    c+=box(x,212,320,24,"font-size: 16px; line-height: 24px; color: "+MUTED,a)
    c+=box(x,244,320,84,"font-size: 72px; line-height: 84px; color: "+NAVY+"; white-space: nowrap",v)
    c+=box(x,336,320,28,"font-size: 18px; line-height: 28px; color: "+INK,b)
c+=box(96,420,1088,1,"background: "+LINE)
c+=box(96,452,1000,96,"font-size: 30px; line-height: 46px; color: "+NAVY,"“集团和蜜雪冰城主品牌的店均营业额都出现"+pad("双位数下滑")+"。”")
c+=box(96,552,1000,26,"font-size: 17px; line-height: 26px; color: "+MUTED,"蜜雪集团 CEO 张渊，2026 年中期业绩会")
c+=source("来源：蜜雪集团 2026 年中期业绩及业绩会（2026 年 8 月）。收入主要是向加盟商销售原料、包材和设备")
pages.append(("5 三个数字",c))
# 6 chagee
c=head("霸王茶姬单店月均 GMV 两年少了 37%")
c+=bars(150,830,568,262,60,[("2024 年二季度",[(53.8,NAVY,True)]),("2025 年二季度",[(40.4,NAVY,True)]),("2026 年二季度",[(33.8,NAVY,True)])])
c+=box(96,236,52,24,"font-size: 16px; line-height: 24px; color: "+MUTED+"; text-align: right","万元")
c+=rail(912,[("两年变化",pad("−37%"),"53.8 万元 → 33.8 万元"),("大中华区同店 GMV","−16.1%","2026 年二季度同比")])
c+=source("来源：霸王茶姬 2025 年及 2026 年二季度业绩（2025 年 8 月、2026 年 8 月）")
pages.append(("6 单店 GMV",c))
# 7 guming
c=head("古茗单店杯量去年涨了 18.8%，今年上半年没再涨")
c+=bars(150,830,568,262,500,[("2023 年",[(417,GREY,False)]),("2024 年",[(384,GREY,False)]),("2025 年",[(456,GREY,False)]),("2025 上半年",[(439,NAVY,True)]),("2026 上半年",[(440,NAVY,True)])],legend=[("全年",GREY),("上半年",NAVY)])
c+=box(96,236,52,24,"font-size: 16px; line-height: 24px; color: "+MUTED+"; text-align: right","杯")
c+=rail(912,[("2026 上半年",pad("440 杯"),"去年同期 439 杯"),("公司怎么说","",""),])
c+=box(912,440,272,120,"font-size: 20px; line-height: 32px; color: "+NAVY,"“外卖平台补贴减少构成拖累，咖啡和早餐抵消了一部分。”")
c+=source("来源：古茗年度及中期业绩（2025 年 3 月至 2026 年 8 月）")
pages.append(("7 单店杯量",c))
# 8 timeline
c=head("监管从约谈走到立规矩，补贴拉单量的路在收窄")
ms=[("2025 年 5 月 13 日","五部门约谈平台","约谈京东、美团、饿了么",False),("2025 年 7 月 18 日","市场监管总局再约谈","要求平台理性参与竞争",False),("2025 年 12 月初","外卖平台国标实施","促销成本不得转嫁商户",True),("2026 年 1 月 9 日","反垄断调查评估","评估外卖平台的市场竞争状况",False),("2026 年 6 月 17 日","补贴规范征求意见","不得强制商户出补贴",False)]
s=('<line x1="96" y1="300" x2="1184" y2="300" stroke="%s" stroke-width="2"/>'%NAVY)
col=1088/5
for i,(d,ti,de,hl) in enumerate(ms):
    x=96+i*col
    if hl: s+='<circle cx="%.1f" cy="300" r="11" fill="%s" stroke="%s" stroke-width="2"/>'%(x+8,Y,NAVY)
    else: s+='<circle cx="%.1f" cy="300" r="7" fill="%s"/>'%(x+8,NAVY)
c+=svg(s)
for i,(d,ti,de,hl) in enumerate(ms):
    x=int(96+i*col)
    c+=box(x,244,int(col)-12,24,"font-size: 16px; line-height: 24px; color: "+MUTED,d)
    c+=box(x,332,int(col)-20,64,"font-size: 22px; line-height: 30px; color: "+NAVY,ti)
    c+=box(x,400,int(col)-20,52,"font-size: 16px; line-height: 24px; color: "+INK,de)
c+=navy_block(96,496,1088,104,"平台也在收手：阿里称 2025 年三季度是闪购投入高点，10 月起单均亏损比七八月降了一半。",24)
c+=source("来源：市场监管总局、新华网等（2025 年 5 月至 2026 年 6 月），阿里巴巴电话会（界面新闻，2026 年 1 月）")
pages.append(("8 监管时间线",c))
# 9 four paths table
c=head("四条新路里，只有新品类和新时段守住了单店")
cols=["新品类和新时段","供应链","经营模式","出海"]
rowsd=[("谁在做",["古茗","蜜雪集团","霸王茶姬","霸王茶姬"]),("做到哪一步",["约 94% 门店配咖啡机","今年投入约 16 亿元","直营店增至 883 家","海外门店增至 399 家"]),("单店表现",["补贴退坡下杯量持平","店均营业额双位数下滑","大中华区同店 GMV −16.1%","海外同店 GMV −15.1%"]),("接下来看",["咖啡日均能否到 120 杯","能否换回店均营业额","同店能否止跌","单店能否跑通"])]
LX=96; CX=272; CW=(1184-CX-3*16)/4
c+=box(CX,200,int(CW),316,"background: "+SURF)
for j,name in enumerate(cols):
    x=int(CX+j*(CW+16))
    if j==0: c+=box(x,200,int(CW),52,"background: "+NAVY+"; box-sizing: border-box; padding: 0 18px; display: flex; align-items: center; font-size: 19px; color: #FFFFFF",name)
    else: c+=box(x,200,int(CW),52,"box-sizing: border-box; padding: 0 4px; display: flex; align-items: center; font-size: 19px; color: "+MUTED,name)
for i,(lab,cells) in enumerate(rowsd):
    y=252+i*66
    c+=box(LX,y,1088,1,"background: "+LINE) if i else ""
    c+=box(LX,y+16,170,30,"font-size: 16px; line-height: 24px; color: "+MUTED,lab)
    for j,cell in enumerate(cells):
        x=int(CX+j*(CW+16))
        st="font-size: 17px; line-height: 24px; color: "+(NAVY+"; font-weight: 700" if j==0 else INK)
        c+=box(x+(18 if j==0 else 4),y+16,int(CW)-30,48,st,cell)
c+=navy_block(96,540,1088,64,"补贴退坡的半年里，古茗单店杯量没有掉，公司把原因归于咖啡和早餐。",22)
c+=source("来源：古茗、蜜雪集团、霸王茶姬 2026 年中期及季度业绩与业绩会（2026 年 8 月）")
pages.append(("9 四条新路",c))
# 10 big number + supporting facts
c=head("咖啡正在成为茶饮店的第二条腿")
c+=box(96,236,600,180,"font-size: 176px; line-height: 180px; color: "+NAVY+"; white-space: nowrap","20%+")
c+=box(96,430,420,10,"background: "+Y)
c+=box(96,472,580,80,"font-size: 28px; line-height: 40px; color: "+INK,"2026 年上半年，咖啡收入占古茗收入的比例")
c+=box(760,212,1,388,"background: "+LINE)
for i,(v,b) in enumerate([("约 94%","古茗门店已配咖啡机（2026 年 6 月）"),("120 杯","古茗咖啡单店日均目标（2026 年，2025 年末约 80 杯）")]):
    y=232+i*196
    if i: c+=box(800,y-24,384,1,"background: "+LINE)
    c+=box(800,y,384,64,"font-size: 52px; line-height: 64px; color: "+NAVY,v)
    c+=box(800,y+72,384,56,"font-size: 17px; line-height: 26px; color: "+INK,b)
c+=source("来源：古茗 2026 年中期业绩及业绩会（2026 年 8 月）")
pages.append(("10 大数字",c))
# 11 plan table
c=head("2027 年计划按单店定，而不是按门店数定")
rows2=[("第一指标","门店净增数","同店增长和单店杯量"),("销量基数","沿用 2025 年补贴期的单量","按 2026 年补贴退坡后的单量"),("投入重点","新店拓展","咖啡、早餐和供应链"),("出海节奏","按开店目标推进","单店模型跑通后再加速"),("代价","单店继续被摊薄","短期门店增速放慢")]
AX,AW,BX,BW=380,360,776,408
c+=box(BX,200,BW,316,"background: "+SURF)
c+=box(AX,200,AW,52,"display: flex; align-items: center; font-size: 22px; color: "+MUTED,"按门店数定")
c+=box(BX,200,BW,52,"background: "+NAVY+"; box-sizing: border-box; padding: 0 24px; display: flex; align-items: center; font-size: 22px; color: #FFFFFF","按单店定")
for i,(l,a,b) in enumerate(rows2):
    y=252+i*52
    if i: c+=box(96,y,1088,1,"background: "+LINE)
    c+=box(96,y+14,260,26,"font-size: 17px; line-height: 26px; color: "+MUTED,l)
    c+=box(AX,y+12,AW-16,28,"font-size: 20px; line-height: 28px; color: "+INK,a)
    c+=box(BX+24,y+12,BW-48,28,"font-size: 20px; line-height: 28px; color: "+NAVY+"; font-weight: 700",b)
c+=navy_block(96,540,1088,64,"蜜雪管理层在 8 月业绩会上表示，以后不再把门店数量当第一目标。",22)
c+=source("来源：蜜雪集团 2026 年中期业绩会（全天候科技记录，2026 年 8 月）")
pages.append(("11 两种定法",c))
# 12 ending
c=box(96,120,64,6,"background: "+NAVY)+box(96,150,1040,132,"font-size: 54px; line-height: 66px; color: "+NAVY,"2027 年第一考核指标，改为"+pad("同店增长"))
c+=box(96,368,1088,1,"background: "+NAVY)
for i,s_ in enumerate(["按退坡后单量重做销量基数","咖啡和早餐单列预算和目标","出海先过单店测算再定店数"]):
    x=96+i*368
    c+=box(x,392,336,24,"font-size: 16px; line-height: 24px; color: "+MUTED,"0"+str(i+1))
    c+=box(x,420,330,72,"font-size: 24px; line-height: 34px; color: "+INK,s_)
pages.append(("12 结尾",c))

boards={}; order=[]
for i,(title,inner) in enumerate(pages):
    name="Main.dc.html" if i==0 else "d%02d.dc.html"%(i+1)
    open(os.path.join(P,name),'w').write(page(title,inner))
    boards[name]={"x":0,"y":i*840,"w":1280,"h":720,"title":title+" · 设计稿"}; order.append(name)
    cur="c%02d.dc.html"%(i+1)
    open(os.path.join(P,cur),'w').write(page(title+" 当前",'<img src="/_blob/'+CUR[i]+'" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur]={"x":1360,"y":i*840,"w":1280,"h":720,"title":title+" · 引擎当前"}; order.append(cur)
canvas={"v":3,"createdOnFiles":{"v":1,"at":datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},"title":"brief 茶饮样例设计稿","launch":{"view":"canvas"},"pages":[],"boards":boards,"order":order,"notes":{},"designSystems":[]}
pc=os.path.join(P,'canvas.json')
if os.path.exists(pc): canvas["createdOnFiles"]=json.load(open(pc))["createdOnFiles"]
json.dump(canvas,open(pc,'w'),ensure_ascii=False,indent=1)
print(len(order))
