"""Bake original chapter-two surface maps using NumPy, Pillow, DejaVu and Noto CJK."""
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import numpy as np
from pathlib import Path
import random, math
out=Path(__file__).resolve().parents[1] / 'dist' / 'chapter2' / 'art'
out.mkdir(parents=True, exist_ok=True)
rng=np.random.default_rng(84)
rand=random.Random(85)
def noise(w,h,gridx,gridy):
    tile=np.uint8(rng.uniform(0,255,(gridy,gridx)))
    return np.asarray(Image.fromarray(tile).resize((w,h),Image.Resampling.BICUBIC)).astype('float32')/255
# Transverse panorama. A ringed ice giant is lit from the upper left.
w,h=2688,650
u,v=np.meshgrid(np.arange(w),np.arange(h)); lon=(u/w-.5)*2*math.pi
elev=(.515-v/h)*1.15
dirs=np.stack((np.sin(lon)*np.cos(elev),np.sin(elev),np.cos(lon)*np.cos(elev)),axis=-1)
cloud=noise(w,h,61,18)*.53+noise(w,h,162,47)*.29+noise(w,h,571,117)*.18
haze=np.exp(-((elev-.025-.12*np.sin(lon*1.2+1.05))/.115)**2)*(cloud**2)
color=np.zeros((h,w,3))+[7,16,26]
color+=haze[:,:,None]*[38,55,64]
for i in range(2900):
    x,y=rand.randrange(w),rand.randrange(h)
    v0=rand.uniform(22,140)*(1-0.2*cloud[y,x]); color[y,x]+=[v0*.72,v0*.93,v0]
    if v0>118 and x>0 and y>0 and x<w-1 and y<h-1:
        color[y,x-1:x+2]+=v0*.18;color[y-1:y+2,x]+=v0*.21
center=np.array([1.45,-.27,6.4]); R=1.43
dot=dirs@center; dist=dot*dot-(center@center-R*R); t=dot-np.sqrt(np.maximum(0,dist))
inside=(dist>=0)&(dot>0)
P=(dirs*t[:,:,None]-center)/R
light=np.array([-.68,.62,-.39]); light=light/np.linalg.norm(light)
mu=np.maximum(0.,P@light); rim=np.maximum(0.,1+np.sum(P*dirs,axis=2))
axis=np.array([.21,.89,-.36]); axis/=np.linalg.norm(axis)
lat=np.sum(P*axis,axis=-1); tex=noise(w,h,355,91)
strip=.65+.12*np.sin(lat*17+tex*1.2)+.065*np.sin(lat*59+.8*np.cos(lat*10))+.045*np.sin(lat*131+tex)
surface=np.array([8,19,31])+mu[:,:,None]**.65*strip[:,:,None]*[105,164,179]
surface+=((rim**4)*(.15+mu*.85))[:,:,None]*[62,111,133]
color=np.where(inside[:,:,None],surface,color)
# Trace annulus around same planet; gate front/back via nearest ray intersection.
den=dirs@axis
tr=np.divide(center@axis,den,out=np.full_like(den,1000),where=np.abs(den)>1e-6)
rp=dirs*tr[:,:,None]-center
r=np.linalg.norm(rp,axis=-1)/R
ring=(tr>0)&(r>1.34)&(r<2.57)&(~inside|(tr<t))
detail=.35+.32*(.5+.5*np.sin(r*118+.35*np.sin(r*38)))+.14*np.sin(r*27)
detail*=1-.89*np.exp(-((r-1.96)/.049)**2)
detail*=np.clip((r-1.34)*9,0,1)*np.clip((2.57-r)*6,0,1)
shadow=np.where((rp@light<0)&(np.linalg.norm(rp-(rp@light)[:,:,None]*light,axis=-1)<R),.17,1.)
ring_col=np.array([98,149,155])+np.sin(r*14)[:,:,None]*[17,7,-2]
a=(ring*detail*shadow)[:,:,None]
color=color*(1-a)+ring_col*a
Image.fromarray(np.uint8(np.clip(color,0,255))).save(out/'terminator.webp',quality=90,method=6)
# Surface atlas, inset gutters preserve mipmaps. Grayscale responds to in-game coatings.
n=256; atlas=Image.new('RGB',(n*4,n))
for i in range(4):
    arr=rng.normal(.0,2.9,(n,n))+rng.normal(0,1.1,(n,1)); base=[213,204,187,193][i]
    im=Image.fromarray(np.uint8(np.clip(base+arr,0,255))).convert('RGB');d=ImageDraw.Draw(im)
    def shade(x):return(x,x,x)
    if i<3:
        for j in range(200):
            x,y=rand.randrange(n),rand.randrange(n)
            d.line((x,y,x+rand.randrange(1,8),y-1),fill=shade(rand.randrange(base-16,base+12)))
    if i==1:
        for y in range(9,n,12):
            d.line((6,y,n-7,y),fill=shade(111),width=2);d.line((6,y+2,n-7,y+2),fill=shade(235))
    if i==2:
        for x,y in [(13,13),(n-13,13),(13,n-13),(n-13,n-13)]:
            d.ellipse((x-3,y-3,x+3,y+3),fill=shade(92));d.line((x-1,y+1,x+1,y-1),fill=shade(174))
        d.line((26,1,26,15,13,29,1,29),fill=shade(99),width=2);d.line((225,n-1,225,n-16,246,n-40,n-1,n-40),fill=shade(115),width=2)
        d.line((63,8,186,8),fill=shade(152))
    if i==3:
        for y in range(-12,n,14):
            for x in range(-12,n,14):
                x0=x+int(7*(y//14%2));d.line((x0,y+4,x0+4,y),fill=shade(120),width=3);d.line((x0+1,y+5,x0+5,y+1),fill=shade(218))
    atlas.paste(im,(i*n,0))
atlas.save(out/'hull.webp',quality=86,method=6)
# Original in-world wayfinding plates, not HUD overlays.
titles=['ECHO DOCK','DEAD LETTER','FOLD BRIDGE','TIDAL SPHERE','SNOW CRYSTAL','FREIGHT GRID','MIRROR LOCK','DOUBLE ANCHOR','FIELD CLINIC','RETURN SIGNAL']
cn=['回声泊位','密封信匣','折页天桥','潮汐球','八面体雪线','四维货栈','反手钥匙','双环锚','无创取芯','空白回执']
cw,ch=512,176
labels=Image.new('RGB',(cw*2,ch*8),(14,30,38))
bold='/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'
mono='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
zh='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font=lambda path,size: ImageFont.truetype(path,size)
for i in range(16):
    plaque=Image.new('RGB',(cw,ch),(17,34,44));g=ImageDraw.Draw(plaque)
    g.line((11,6,500,6), fill=(88,127,132),width=2);g.rectangle((11,20,17,153),fill=(230,166,73))
    if i<10:
        g.text((34,13),f'{i+1:02d}',fill=(238,216,175),font=font(bold,81))
        g.text((149,22),cn[i],fill=(209,225,219),font=font(zh,40));g.text((151,82),titles[i],fill=(152,195,195),font=font(mono,22))
        g.text((34,126),'FOLD STATION   /   INBOARD',fill=(133,159,158),font=font(mono,18))
    elif i<14:
        g.text((32,1),f'W / {i-9:02}',fill=(214,235,228),font=font(bold,79))
        g.text((34,112),'SLICE DATUM    —    LOCAL XYZ',fill=(153,187,193),font=font(mono,19))
    else:
        g.text((34,16),['CARGO','AIRLOCK'][i-14],fill=(230,191,125),font=font(bold,56))
        g.text((35,103),'SERVICE ACCESS  /  KEEP CLEAR',fill=(180,185,167),font=font(mono,18))
    labels.paste(plaque,((i%2)*cw,(i//2)*ch))
labels.save(out/'plates.webp',quality=91,method=6)
# Bake side-window and gantry shading onto the UV field of the dock floor.
# Each proxy matches a class of opaque parts from scene-yard.mjs.
w,h=512,768
def uv(x,z):return ((x+7.1)/14.2*w,(z+10.5)/21*h)
occs=[]
def shadowblock(x,y,z,dx,dy,dz):
 occs.append((x,y,z,dx,dy,dz))
for z in [-9.5,-4.5,.5,5.5,10.4]:
 shadowblock(0,5.96,z,10.65,.45,.84)
 for s in [-1,1]:
  shadowblock(s*6.73,2.1,z,.79,4.15,.95)
  shadowblock(s*5.77,4.95,z,.84,1.62,.82)
  shadowblock(s*5.2,5.58,z,1.62,.49,1.35)
for s in [-1,1]:
 shadowblock(s*2.55,6.4,-1,.94,.37,23)
 shadowblock(s*6.91,4.98,0,.92,.89,22)
 shadowblock(s*7,.66,0,.5,1.32,22)
total=np.zeros((h,w))
for ux,uz in [(.59,.43),(.61,.46),(.65,.40),(.71,.43),(.68,.37),(.63,.35),(.61,.40),(.71,.39)]:
 im=Image.new('L',(w,h),255); draw=ImageDraw.Draw(im)
 for x,y,z,dx,dy,dz in occs:
  pts=[]
  for i in [-1,1]:
   for j in [-1,1]:
    for k in [-1,1]:
     px=x+i*dx*.5 + (y+j*dy*.5)*ux
     pz=z+k*dz*.5 + (y+j*dy*.5)*uz
     pts.append(uv(px,pz))
  def cross(o,a,b):return(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
  pts=sorted(set(pts)); lo=[]; hi=[]
  for q in pts:
   while len(lo)>=2 and cross(lo[-2],lo[-1],q)<=0:lo.pop()
   lo.append(q)
  for q in reversed(pts):
   while len(hi)>=2 and cross(hi[-2],hi[-1],q)<=0:hi.pop()
   hi.append(q)
  draw.polygon(lo[:-1]+hi[:-1],fill=0)
 total+=np.asarray(im)/8
Image.fromarray(np.uint8(total)).filter(ImageFilter.GaussianBlur(1.3)).save(out/'sunfall.webp',quality=90)
