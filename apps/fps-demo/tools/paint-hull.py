"""Paint the single non-tiling 6 m bulkhead plate atlas used by all portal instances."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random
import math

dest = Path(__file__).resolve().parents[1] / 'dist' / 'assets'
rng = random.Random(433)
size = 1024
img = Image.new('RGB', (size, size), '#192b37')
d = ImageDraw.Draw(img)
font = ImageFont.load_default(size=22)
stamp = ImageFont.load_default(size=12)

def panel(points, color):
    d.polygon(points, fill=color)
    d.line(points + [points[0]], fill='#101e28', width=6)
    d.line(points[:3], fill='#83969b', width=3)

def bolt(x,y):
    d.ellipse((x-4,y-3,x+4,y+5),fill='#273943')
    d.ellipse((x-3,y-4,x+3,y+2),fill='#93a2a6')
    d.line((x-2,y+1,x+1,y-2),fill='#3a4650',width=2)

# Chaseways at the perimeter, bolted strakes, and replaceable service panels.
panel([(22,26),(243,26),(276,61),(276,182),(234,217),(22,217)], '#536873')
panel([(294,26),(726,26),(726,149),(692,180),(330,180),(294,145)], '#58707d')
panel([(749,26),(1002,26),(1002,215),(793,215),(749,173)], '#617780')
panel([(20,240),(221,240),(269,279),(269,770),(233,808),(20,808)], '#768992')
panel([(1004,240),(813,240),(764,287),(764,764),(810,808),(1004,808)], '#677f8a')
panel([(23,831),(225,831),(270,873),(270,1001),(23,1001)], '#546d79')
panel([(292,873),(332,831),(695,831),(735,870),(735,1002),(292,1002)], '#677f89')
panel([(759,871),(807,831),(1002,831),(1002,1002),(759,1002)], '#516a77')
panel([(235,236),(286,190),(730,190),(788,238),(754,280),(754,775),(711,819),(311,819),(274,776),(274,278)], '#7d9096')
for x in [32,228,312,703,787,989]:
    for y in [40,161,848,988]:
        bolt(x,y)
for x in [36,222,818,982]:
    for y in [259,516,785]:
        bolt(x,y)
for base in [(45,317),(824,620)]:
    x,y=base
    d.rounded_rectangle((x-4,y-5,x+141,y+70),radius=7,fill='#394e58')
    for i in range(6):
        d.line((x+5,y+i*11,x+130,y+i*11),fill='#24353e',width=5)
        d.line((x+6,y+i*11+3,x+130,y+i*11+3),fill='#60747c',width=2)
for y in [86,941]:
    d.rounded_rectangle((365,y,660,y+13),radius=6,fill='#182c3b')
    d.rectangle((377,y+4,636,y+7),fill='#adc9be')
for x,y in [(52,125),(834,903)]:
    d.text((x,y),'HATCH  /  06',font=font,fill='#b6c9c8')
    d.text((x,y+28),'PRESSURE BULKHEAD',font=stamp,fill='#9fbbbc')
    d.line((x,y-8,x+64,y-8),fill='#db9763',width=3)
for x in [30,985]:
    for y in range(277,808,42):
        d.line((x,y,x+9,y),fill='#a3b9bc',width=2)
# Per-texel finish and ambient contact shading are baked; no fullscreen AO pass.
pix=img.load()
for y in range(size):
    for x in range(size):
        edge=min(x,y,size-1-x,size-1-y)
        t=min(1,edge/119)
        occlusion=(.73+.27*min(1,edge/48))*(.66+.34*t*t*(3-2*t))
        u,v=(x/size-.5)*6,(.5-y/size)*6
        wash=math.exp(-1.2*((u-1.2)**2+(v-2)**2))
        tint=(1+.40*wash,1+.28*wash,1+.14*wash)
        grain=rng.gauss(0,1.65)
        pix[x,y]=tuple(max(0,min(255,int(c*occlusion*tint[i]+grain))) for i,c in enumerate(pix[x,y]))
img.save(dest/'pressure-hull.jpg',quality=90,subsampling=0,optimize=True)
icon=Image.new('RGBA',(64,64),'#12202a')
d=ImageDraw.Draw(icon)
for offset,color in [(0,'#e4b27c'),(10,'#a6e5d9')]:
    poly=[(12+offset,20-offset//2),(34+offset,12-offset//2),(52+offset,25-offset//2),(30+offset,35-offset//2)]
    d.line(poly+[poly[0]],fill=color,width=3)
    for x,y in [poly[0],poly[2],poly[3]]:d.line([(x,y),(x,y+17)],fill=color,width=3)
    d.line([(poly[0][0],poly[0][1]+17),(poly[3][0],poly[3][1]+17),(poly[2][0],poly[2][1]+17)],fill=color,width=3)
icon.save(dest/'codex-icon.png')
