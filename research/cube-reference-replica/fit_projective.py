import numpy as np,itertools,json
from PIL import Image,ImageDraw
from scipy.ndimage import distance_transform_edt,map_coordinates
from scipy.optimize import minimize
V=np.array(list(itertools.product([-1,1],repeat=4)),float);E=np.array([(i,j) for i in range(16) for j in range(i+1,16) if np.sum(V[i]!=V[j])==1]);T=np.linspace(0,1,25)
im=Image.open('reverse-cube-reference/original.gif');ims=[];masks=[];targets=[];dts=[];timings=[]
for i in range(im.n_frames):
 im.seek(i);a=np.array(im.convert('RGB'));ims.append(a);timings.append(im.info.get('duration',0));mask=(a[:,:,2]>100)&(a[:,:,2]>a[:,:,0]*1.25)&(a[:,:,1]>70);masks.append(mask);dts.append(distance_transform_edt(~mask));y,x=np.where(mask);targets.append(np.stack([x,y],1)[::12])
p=np.load('reverse-cube-reference/fit.npy');az,el,dist,d4,f,phi,sign,cx,cy,roll=p
cam=np.array([np.sin(az)*np.cos(el),np.sin(el),np.cos(az)*np.cos(el)]);right=np.array([np.cos(az),0,-np.sin(az)]);up=np.cross(cam,right)
P=np.zeros((3,5));P[2,:3]=-(d4-1)/(dist*d4)*cam;P[2,3]=-1/d4;P[2,4]=1;P[0,:3]=f*(d4-1)/(dist*d4)*right;P[1,:3]=-f*(d4-1)/(dist*d4)*up
c,s=np.cos(roll),np.sin(roll);P[:2]=np.array([[c,-s],[s,c]])@P[:2];P[0]+= (cx-128)*P[2];P[1]+=(cy-128)*P[2]
init=np.r_[P[:2].flatten(),P[2,:4],0]
rot=[]
for i in range(48):
 theta=np.pi/2*i/48;q=V.copy();x=q[:,0].copy();w=q[:,3].copy();q[:,0]=x*np.cos(theta)-w*np.sin(theta);q[:,3]=x*np.sin(theta)+w*np.cos(theta);rot.append(np.c_[q,np.ones(16)])
def points(p,i):
 mat=np.vstack([p[:10].reshape(2,5),np.r_[p[10:14],1]]);q=rot[i];res=q@mat.T;return res[:,:2]/res[:,2,None]+128
N=0
def frameerror(p,i,detail=False):
 xy=points(p,i);a=xy[E[:,0]];b=xy[E[:,1]];samples=(a[:,None,:]*(1-T)[None,:,None]+b[:,None,:]*T[None,:,None]).reshape(-1,2)
 forward=np.mean(map_coordinates(dts[i],[samples[:,1],samples[:,0]],order=1,mode='constant',cval=100)**2)
 tar=targets[i];ab=b-a;delta=tar[:,None,:]-a[None,:,:];t=np.clip((delta*ab).sum(2)/(ab*ab).sum(1)[None,:],0,1);d=delta-t[:,:,None]*ab[None,:,:];rev=np.min((d*d).sum(2),1)
 return forward+np.mean(np.maximum(np.sqrt(rev)-2.5,0)**2)
def fun(p):return np.mean([frameerror(p,i) for i in range(0,48,3)])
print('baseline',fun(init),flush=True)
r=minimize(fun,init,method='Powell',options={'maxiter':80,'xtol':1e-5,'ftol':1e-5});print('fit',r.fun,r.x,flush=True);np.save('cube-reference-replica/projective.npy',r.x)
res=[frameerror(r.x,i) for i in range(48)];print('all48',np.mean(res),max(res));open('cube-reference-replica/fit-report.json','w').write(json.dumps({'baseline':float(fun(init)),'mean48':float(np.mean(res)),'max48':float(max(res)),'perframe':res,'timings_ms':timings,'parameters':r.x.tolist()},indent=2))
a=Image.new('RGB',(1024,768))
for j,i in enumerate(range(0,48,4)):
 pic=Image.fromarray(ims[i]);d=ImageDraw.Draw(pic);xy=points(r.x,i)
 for e in E:d.line([tuple(v) for v in xy[e]],fill=(255,30,20),width=1)
 a.paste(pic,(j%4*256,j//4*256))
a.save('cube-reference-replica/geometry-overlay.jpg')
