"""Bake original colour and shadow plates for the Echo Field. Run offline."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

out = Path(__file__).resolve().parents[1] / 'dist' / 'chapter2' / 'art'
out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(84)

def noise(w, h, nx, ny):
    # Periodic longitude prevents a seam when the player turns around.
    grid = rng.uniform(0, 255, (ny, nx)).astype('uint8')
    padded = np.concatenate([grid[:, -1:], grid, grid[:, :1]], axis=1)
    image = Image.fromarray(padded).resize((w+2*w//nx,h),Image.Resampling.BICUBIC)
    return np.asarray(image.crop((w//nx,0,w//nx+w,h)),dtype=float)/255

# Distant horizon: the same scratched sheet returns on successively dislocated
# contours. Nearer architecture and the traversable cut are ordinary 3D solids.
w, h = 2048, 768
u, v = np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
az, el = (u-.5)*2*math.pi, (.5-v)*math.pi
grain = noise(w,h,56,26)*.59 + noise(w,h,208,78)*.28 + noise(w,h,641,239)*.13
axis = .19*np.sin(az*2+.45)+.13*np.sin(az-.9)-.045
drift = el-axis
warm = (.5+.5*np.cos(az+.31))**1.8
halo = np.exp(-(drift/.36)**2)
peak = np.exp(-((az+.32)/.47)**2 - ((el-.105)/.25)**2)
color = np.empty((h,w,3))
color[:] = [10,14,28]
color += halo[:,:,None] * (np.array([37,45,59]) + warm[:,:,None]*[49,6,-17])
color += peak[:,:,None]*[73,47,24]
color += (halo*(grain-.46)*27)[:,:,None]*[.9,.82,1.1]
# Stratified dark ridges and long hairline filaments. The ridges have a cut
# edge on one side and a broad diffusion band on the other.
for i in range(6):
    rim = axis + (i-2.3)*.051 + .013*np.sin(3*az+i*.87) + .009*np.cos(5*az-.7*i)
    d = el-rim
    body = np.exp(-((d+.03)/.021)**2)
    color -= body[:,:,None]*(6+3*grain[:,:,None])*[1,.9,.83]
    contour=np.exp(-(d/(.0019+i*.00020))**2)
    line=contour*(.47+.4*np.sin(az*2+i)**2)
    color += line[:,:,None]*(np.array([24,32,28])+warm[:,:,None]*[42,1,-7])
# Fine ordered rays travel between the ridges. No point star or planetary body.
for i in range(20):
    trace=.38*np.sin(az+(i%3)*.19+.8)+.11*np.sin(az*2+.32)+(i-9)*.013
    d=el-trace
    mask=np.clip(.37+.6*np.cos(az*2-.32*i),0,1)
    width=.00065+(i%4)*.0003
    color+=(np.exp(-(d/width)**2)*mask)[:,:,None]*[26,39,39]
# The poles converge to one colour for every azimuth.
weight=np.clip((1.52-np.abs(el))/.44,0,1)
color = np.array([10,14,26]) + (color-[10,14,26])*weight[:,:,None]
color += rng.normal(0,.60,(h,w,1))
Image.fromarray(np.uint8(np.clip(color,0,255))).save(out/'field-horizon.webp',quality=91,method=6)

# Four neutral micro-surfaces: polished stratum, laminated edge, enamel on
# the travellers' equipment, and fine-grip tread. All can share one material.
n=256; atlas=Image.new('RGB',(n*4,n));yy,xx=np.mgrid[:n,:n]
for i in range(4):
    streak=xx*.056+yy*.013+1.8*np.sin(yy*.025)
    arr = rng.normal(0,2,(n,n))+[220,198,203,193][i]
    if i==0:
        arr += 3*np.sin(streak) -4*np.maximum(0,np.cos(streak*2.1))**10
    elif i==1:
        arr += 12*np.cos(yy*.58)+3*np.sin(streak)
    elif i==2:
        arr += 1.2*np.sin(yy*.41)
    else:
        arr -= 14*(np.mod(xx+yy,15)<2)
    atlas.paste(Image.fromarray(np.uint8(np.clip(arr,0,255))).convert('RGB'),(n*i,0))
atlas.save(out/'hull.webp',quality=84,method=6)

# Soft shadows of the fixed slanted piers and border lip. More distant field
# strata can change in W; their shadows are deliberately excluded from this bake.
w,h=512,768
def uv(x,z): return ((x+7.1)/14.2*w, (z+10.5)/21*h)
total=np.zeros((h,w))
for ux,uz in [(.59,.43),(.61,.46),(.65,.4),(.71,.43),(.68,.37),(.63,.35),(.61,.4),(.71,.39)]:
    image=Image.new('L',(w,h),255); draw=ImageDraw.Draw(image)
    for s in [-1,1]:
        for i in range(4):
            z=-8+i*5.3; height=3.8+(i%3)*1.75
            a=[s*6.8,z+.89]; b=[s*7.3+height*ux,z+1.7+height*uz]
            draw.line([uv(*a),uv(*b)],fill=29,width=25)
        draw.line([uv(s*6.21,-9.8),uv(s*6.21,9.8)],fill=41,width=12)
    total+=np.asarray(image)/8
Image.fromarray(np.uint8(total)).filter(ImageFilter.GaussianBlur(1.8)).save(out/'sunfall.webp',quality=90)
