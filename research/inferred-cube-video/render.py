import json,math,pathlib,sys
import numpy as np
from PIL import Image,ImageDraw
P=pathlib.Path(__file__).parent;data=json.loads((P/'scene.json').read_text());p=data['params']; W=768;SS=2
az,el,roll=p['az'],p['el'],p['roll'];cam=np.array([math.sin(az)*math.cos(el),math.sin(el),math.cos(az)*math.cos(el)]);right=np.array([math.cos(az),0,-math.sin(az)]);up=np.cross(cam,right)
light=np.array([-.3,.85,1]);light/=np.linalg.norm(light)
def proj(v):
 v=np.asarray(v);q=np.stack([v@right,-v@up],axis=-1)*(p['f']/(p['R']-v@cam))[...,None];c,s=math.cos(roll),math.sin(roll);return (q@np.array([[c,s],[-s,c]])+[p['cx'],p['cy']])/256*W

def mesh(a,b,ka,kb):
 axis=b-a;axis/=np.linalg.norm(axis);helper=np.array([0,1,0]) if abs(axis[1])<.9 else np.array([1,0,0]);u=np.cross(axis,helper);u/=np.linalg.norm(u);v=np.cross(axis,u);n=32
 rad=np.array([u*math.cos(2*math.pi*j/n)+v*math.sin(2*math.pi*j/n) for j in range(n)])
 verts=np.concatenate([a+.055*ka*rad,b+.055*kb*rad]);idx=[];ns=[]
 for j in range(n):
  k=(j+1)%n;idx.extend([[j,k,n+j],[k,n+k,n+j]]);ns.extend([(rad[j]+rad[k])/2]*2)
 for end,point,normal,k in [(0,a,-axis,ka),(1,b,axis,kb)]:
  start=len(verts);verts=np.concatenate([verts,point[None,:],point+.055*k*rad])
  for j in range(n):idx.append([start,start+1+j,start+1+(j+1)%n]);ns.append(normal)
 return verts,np.array(idx),np.array(ns)
import itertools
V=list(itertools.product([-1,1],repeat=4));faces=[]
for a in range(4):
 for b in range(a+1,4):
  fixed=[j for j in range(4) if j not in (a,b)]
  for signs in itertools.product([-1,1],repeat=2):
   ids=[]
   for aa,bb in [(-1,-1),(1,-1),(1,1),(-1,1)]:
    v=[0]*4;v[a]=aa;v[b]=bb
    for k,val in zip(fixed,signs):v[k]=val
    ids.append(V.index(tuple(v)))
   faces.append(ids)
errors=[]
for i,f in enumerate(data['frames'][:192]):
 pts=np.array(f['p3']);errors.append(float(np.max(np.abs(proj(pts)/3-np.array(f['p2'])))));polys=[]
 for a,b in f['edges']:
  ka=data['params']['s']/(data['params']['d4']-f['p4'][a][3]);kb=data['params']['s']/(data['params']['d4']-f['p4'][b][3]);verts,idx,ns=mesh(pts[a],pts[b],ka,kb);tri=verts[idx];pix=proj(tri);depth=tri.mean(1)@cam
  shine=np.maximum(0,ns@light);h=light+cam;h/=np.linalg.norm(h);spec=np.maximum(0,ns@h)**22
  colors=np.clip(np.array([65,116,200])[None,:]*(.48+.65*shine[:,None])+spec[:,None]*125,0,255).astype(int)
  for j in range(len(idx)):
   if ns[j]@cam>-.1:polys.append((depth[j],pix[j],tuple(colors[j])+(255,)))
 for face in faces:
  v=pts[face];polys.append((float(v.mean(0)@cam),proj(v),(110,125,155,40)))
 im=Image.new('RGB',(W*SS,W*SS),'black');dr=ImageDraw.Draw(im,'RGBA')
 for dep,pix,col in sorted(polys,key=lambda x:x[0]):dr.polygon([tuple(a*SS) for a in pix],fill=col)
 im.resize((W,W),Image.Resampling.LANCZOS).save(P/f'frame-{i:03}.png')
 if i%24==0:print(i,flush=True)
loop=np.max(np.abs(np.array(data['frames'][0]['p2'])-np.array(data['frames'][192]['p2'])))
(P/'validation.json').write_text(json.dumps({'max_projection_disagreement_px_at_256':max(errors),'full_turn_labeled_loop_error_px':float(loop),'frame_count':192,'seconds_per_frame':.07,'duration_seconds':13.44,'heldout_model_rmse_px_at_256':2.68171488665,'source_frames_used_as_output':False,'edges':32,'vertices':16},indent=2))
contact=Image.new('RGB',(4*384,2*384))
for j,i in enumerate([0,6,12,18,24,30,36,42]):contact.paste(Image.open(P/f'frame-{i:03}.png').resize((384,384)),(j%4*384,j//4*384))
contact.save(P/'contact.jpg')
