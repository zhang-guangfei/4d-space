import numpy as np,itertools,json
from PIL import Image,ImageDraw
from scipy.ndimage import map_coordinates
from scipy.optimize import least_squares
V=np.array(list(itertools.product([-1,1],repeat=4)),float);E=np.array([(i,j) for i in range(16) for j in range(i+1,16) if np.sum(V[i]!=V[j])==1]);im=Image.open('reverse-cube-reference/original.gif');ims=[]
for i in range(48):im.seek(i);ims.append(np.array(im.convert('RGB'),dtype=float))
P=np.load('cube-reference-replica/projective.npy');M=np.vstack([P[:10].reshape(2,5),np.r_[P[10:14],1]])
def rotated(i,phase=0,rate=1):
 theta=phase+rate*np.pi/2*i/48;q=V.copy();x=q[:,0].copy();w=q[:,3].copy();q[:,0]=x*np.cos(theta)-w*np.sin(theta);q[:,3]=x*np.sin(theta)+w*np.cos(theta);return q

def baseline(i):
 q=np.c_[rotated(i),np.ones(16)]@M.T;return q[:,:2]/q[:,2,None]+128

def project(p,i,mode='perspective'):
 az,el,roll,a,b,F,cx,cy,phase,rate=p;q=rotated(i,phase,rate)
 cam=np.array([np.sin(az)*np.cos(el),np.sin(el),np.cos(az)*np.cos(el)]);right=np.array([np.cos(az),0,-np.sin(az)]);up=np.cross(cam,right)
 numer=np.stack([q[:,:3]@right,-q[:,:3]@up],1)*F
 c,s=np.cos(roll),np.sin(roll);numer=numer@np.array([[c,s],[-s,c]])
 den=1-a*(q[:,:3]@cam)-b*q[:,3]
 return numer/den[:,None]+[cx,cy]

OBS=[];offsets=np.linspace(-8,8,65);frac=np.linspace(.18,.82,13)
for fi in range(48):
 a=ims[fi];signal=a[:,:,2]-.5*a[:,:,0]-.5*a[:,:,1];points=baseline(fi)
 for ei,(ia,ib) in enumerate(E):
  pa,pb=points[ia],points[ib];direction=pb-pa;length=np.linalg.norm(direction)
  if length<17:continue
  n=np.array([-direction[1],direction[0]])/length
  rows=[]
  for t in frac:
   p=pa*(1-t)+pb*t;samples=p[None,:]+offsets[:,None]*n
   profile=map_coordinates(signal,[samples[:,1],samples[:,0]],order=1,mode='constant',cval=0)
   base=min(np.mean(profile[:5]),np.mean(profile[-5:]));peak=np.max(profile);k=np.argmax(profile)
   if peak-base<14 or abs(offsets[k])>6.5:continue
   th=base+(peak-base)*.43;l=k;r=k
   while l>0 and profile[l-1]>th:l-=1
   while r<len(profile)-1 and profile[r+1]>th:r+=1
   width=offsets[r]-offsets[l]
   if l==0 or r==64 or not 1.5<width<12:continue
   center=(offsets[l]+offsets[r])/2
   rows.append((t,center,peak-base))
  if len(rows)<5:continue
  rows=np.array(rows);coef=np.polyfit(rows[:,0]-.5,rows[:,1],1);err=rows[:,1]-np.polyval(coef,rows[:,0]-.5);good=abs(err-np.median(err))<1.3
  rows=rows[good]
  if len(rows)<4:continue
  for t,off,contrast in rows:
   p=pa*(1-t)+pb*t+off*n;OBS.append((fi,ei,t,p[0],p[1],n[0],n[1],contrast))
OBS=np.array(OBS);np.save('cube-parameter-inference/observations.npy',OBS);print('observations',len(OBS),flush=True)
train=OBS[OBS[:,0]%4!=2];test=OBS[OBS[:,0]%4==2]
def residual(p,obs):
 out=[]
 for fi in sorted(set(obs[:,0].astype(int))):
  o=obs[obs[:,0]==fi];xy=project(p,fi);ee=E[o[:,1].astype(int)];t=o[:,2];pred=xy[ee[:,0]]*(1-t[:,None])+xy[ee[:,1]]*t[:,None]
  out.extend(np.sum((pred-o[:,3:5])*o[:,5:7],1))
 return np.array(out)
p0=[.58,.31,0,.13,.33,42,125,128,0,1]
bounds=([.1,.01,-.3,.001,.02,10,95,95,-.2,.85],[1.2,.8,.3,.35,.49,120,160,160,.2,1.15])
r=least_squares(residual,p0,args=(train,),bounds=bounds,loss='soft_l1',f_scale=.8,max_nfev=1000,xtol=1e-10,ftol=1e-10,gtol=1e-10)
p=r.x;print('params',p,flush=True);print('train/test RMSE',np.sqrt(np.mean(residual(p,train)**2)),np.sqrt(np.mean(residual(p,test)**2)),flush=True)
np.save('cube-parameter-inference/params.npy',p)
report={'parameters':p.tolist(),'observations':len(OBS),'train_rmse':float(np.sqrt(np.mean(residual(p,train)**2))),'test_rmse':float(np.sqrt(np.mean(residual(p,test)**2))),'test_median_abs':float(np.median(abs(residual(p,test)))),'train_frames':[i for i in range(48) if i%4!=2],'test_frames':[i for i in range(48) if i%4==2]};open('cube-parameter-inference/report.json','w').write(json.dumps(report,indent=2))
out=Image.new('RGB',(1024,768))
for j,fi in enumerate(range(0,48,4)):
 pic=Image.fromarray(ims[fi].astype('uint8'));d=ImageDraw.Draw(pic);xy=project(p,fi)
 for e in E:d.line([tuple(v) for v in xy[e]],fill=(255,0,0),width=1)
 out.paste(pic,(j%4*256,j//4*256))
out.save('cube-parameter-inference/overlay.jpg')
