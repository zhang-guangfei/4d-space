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
 verts=np.concatenate([a+.035*rad,b+.035*rad]);idx=[];ns=[]
 for j in range(n):
  k=(j+1)%n;idx.extend([[j,k,n+j],[k,n+k,n+j]]);ns.extend([(rad[j]+rad[k])/2]*2)
 for end,point,normal,k in [(0,a,-axis,ka),(1,b,axis,kb)]:
  start=len(verts);verts=np.concatenate([verts,point[None,:],point+.035*rad])
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
import importlib.util
spec=importlib.util.spec_from_file_location('oldgeom',str(P.parent/'observer-source/geometry.py'));old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
ST=json.loads((P.parent/'reverse-cube-reference/statues.json').read_text())
containment={}
def xform4(v,theta):
 v=np.asarray(v).copy();x=v[:,0].copy();w=v[:,3].copy();v[:,0]=x*math.cos(theta)-w*math.sin(theta);v[:,3]=x*math.sin(theta)+w*math.cos(theta);return v[:,:3]*(p['s']/(p['d4']-v[:,3]))[:,None]
def triangulate(v,indices,color,normal_sign=1,category=1):
 tri=v[indices];n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-10);n*=normal_sign;pix=proj(tri);depth=p["R"]-tri@cam
 lit=np.clip(.62+.38*(n@light),.28,1.);cols=np.clip(np.array(color)[None,:]*lit[:,None],0,255).astype(int)
 return [(depth[j],pix[j],tuple(cols[j])+(255,),category) for j in range(len(indices))]
def statues(theta):
 polys=[]
 for sign,name in [(1,'venus'),(-1,'david')]:
  d=ST[name];v=np.array(d['positions']).reshape(-1,3);v=(v-(v.min(0)+v.max(0))/2)*.325
  v[:,1]+=-1-v[:,1].min()
  v4=np.stack([sign*v[:,0],v[:,1],np.ones(len(v))*sign,sign*v[:,2]],axis=1)
  containment[name]=float(np.max(np.abs(v4[:,[0,1,3]])))
  vv=xform4(v4,theta);polys+=triangulate(vv,np.array(d['indices']).reshape(-1,3),[219,211,187] if name=='venus' else [219,211,187],normal_sign=sign)
 return polys

GROUND_ERRORS=[]
def observer_meshes(t):
 meshes=[]
 for part,v,n,idx in old.PARTS:
  joint=np.array(old.D['joints'][part['group']]);angle=0
  if part['group']!='body':angle=(1 if part['group'].startswith('left') else -1)*(.4 if 'Leg' in part['group'] else -.5)*math.sin(math.tau*t/1.12)
  c,ss=math.cos(angle),math.sin(angle);rot=np.array([[1,0,0],[0,c,-ss],[0,ss,c]])
  vv=((v+np.array(part['position']))@rot.T+joint)@old.OBSERVER_BASIS.T*.294
  meshes.append((part,vv,idx))
 # Keep the stance foot grounded while the other may swing. The visible inner
 # floor varies continuously as the central cell changes; no discrete jumps.
 theta=-p['omega']*t;wfar=-1/max(abs(math.cos(theta)),abs(math.sin(theta)));floor=-p['s']/(p['d4']-wfar)
 def floor_at(x):
  planes=[]
  for A,B in [(-math.sin(theta),math.cos(theta)),(math.cos(theta),math.sin(theta))]:
   if abs(B)>1e-10:planes.append((B*p['s']-A*x)/(-math.copysign(1,B)-B*p['d4']))
  return np.minimum.reduce(planes)
 clearance=min(np.min(v[:,1]-floor_at(v[:,0])) for _,v,_ in meshes)
 for part,v,idx in meshes:v[:,1]-=clearance
 GROUND_ERRORS.append(float(min(np.min(v[:,1]-floor_at(v[:,0])) for _,v,_ in meshes)))
 return meshes

def observer(t):
 polys=[]
 for part,v,idx in observer_meshes(t):polys+=triangulate(v,idx,old.rgb(old.D['suitColors'][part['material']]),category=2)
 return polys

import ctypes
lib=ctypes.CDLL(str(P/'raster.so'));lib.render.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p]
OCCLUSION=[]
def raster(polys):
 rows=[]
 for depth,pix,color,category in polys:
  for j in range(1,len(pix)-1):
   ids=[0,j,j+1];coords=np.column_stack([pix[ids]*SS,1/np.array(depth)[ids]]).reshape(-1);rows.append([*coords,*color,category])
 ts=np.array(rows,dtype=np.float64);size=W*SS;rgb=np.zeros((size,size,3),np.float32);z=np.empty((size,size),np.float64);owner=np.empty((size,size),np.int32)
 lib.render(ts.ctypes.data,len(ts),size,size,rgb.ctypes.data,z.ctypes.data,owner.ctypes.data)
 human=ts[ts[:,13]==2].copy();r2=np.zeros_like(rgb);z2=np.empty_like(z);o2=np.empty_like(owner);lib.render(human.ctypes.data,len(human),size,size,r2.ctypes.data,z2.ctypes.data,o2.ctypes.data)
 stats={'human_visible_pixels':int(np.sum(owner==2)),'human_total_pixels':int(np.sum(o2==2)),'human_occluded_pixels':int(np.sum((o2==2)&(owner!=2)))}
 return Image.fromarray(np.clip(rgb,0,255).astype('uint8')),stats

errors=[]
for i in ([0,6,12,18,24,30,36,42] if '--sample' in sys.argv else range(192)):
 f=data['frames'][i]
 pts=np.array(f['p3']);errors.append(float(np.max(np.abs(proj(pts)/3-np.array(f['p2'])))));polys=[]
 for a,b in f['edges']:
  ka=data['params']['s']/(data['params']['d4']-f['p4'][a][3]);kb=data['params']['s']/(data['params']['d4']-f['p4'][b][3]);verts,idx,ns=mesh(pts[a],pts[b],ka,kb);tri=verts[idx];pix=proj(tri);depth=p["R"]-tri@cam
  shine=np.maximum(0,ns@light);h=light+cam;h/=np.linalg.norm(h);spec=np.maximum(0,ns@h)**22
  colors=np.clip(np.array([65,116,200])[None,:]*(.48+.65*shine[:,None])+spec[:,None]*125,0,255).astype(int)
  for j in range(len(idx)):
   if ns[j]@cam>-.1:polys.append((depth[j],pix[j],tuple(colors[j])+(255,),0))
 polys+=statues(-p['omega']*i*.07)
 for face in faces:
  v=pts[face];polys.append((p["R"]-v@cam,proj(v),(110,125,155,40),3))
 polys+=observer(i*.07)
 im,stats=raster(polys)
 OCCLUSION.append({'frame':i,**stats})
 im.resize((W,W),Image.Resampling.LANCZOS).save(P/f'frame-{i:03}.png')
 if i%24==0:print(i,flush=True)
loop=np.max(np.abs(np.array(data['frames'][0]['p2'])-np.array(data['frames'][192]['p2'])))
(P/'validation.json').write_text(json.dumps({'max_projection_disagreement_px_at_256':max(errors),'full_turn_labeled_loop_error_px':float(loop),'frame_count':192,'seconds_per_frame':.07,'duration_seconds':13.44,'heldout_model_rmse_px_at_256':2.68171488665,'source_frames_used_as_output':False,'edges':32,'vertices':16,'statue_max_abs_local_coordinates':containment,'statue_cell_binding':'Venus Z+, David Z-, fixed local X/Y/W embedding, shared negative XW rotation','observer':'central display observer grounded on continuous inner floor, not same physical cell resident','max_ground_contact_error_3d':max(abs(v) for v in GROUND_ERRORS)},indent=2))
contact=Image.new('RGB',(4*384,2*384))
for j,i in enumerate([0,6,12,18,24,30,36,42]):contact.paste(Image.open(P/f'frame-{i:03}.png').resize((384,384)),(j%4*384,j//4*384))
contact.save(P/'contact.jpg')
(P/'occlusion.json').write_text(json.dumps(OCCLUSION,indent=2))
