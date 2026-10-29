exec(open('cube-parameter-inference/infer.py').read().split('OBS=[]')[0])
from scipy.optimize import least_squares
O=np.load('cube-parameter-inference/observations.npy');p0=np.load('cube-parameter-inference/params.npy');vertices=[]
for fi in range(48):
 oo=O[O[:,0]==fi];lines={}
 for ei in sorted(set(oo[:,1].astype(int))):
  pts=oo[oo[:,1]==ei,3:5];c=pts.mean(0);u,s,v=np.linalg.svd(pts-c,full_matrices=False);normal=v[1];lines[ei]=(normal,float(normal@c),len(pts))
 for vi in range(16):
  ls=[lines[ei] for ei,e in enumerate(E) if vi in e and ei in lines]
  if len(ls)<2:continue
  A=np.array([l[0] for l in ls]);b=np.array([l[1] for l in ls]);cond=np.linalg.cond(A)
  if cond>8:continue
  xy=np.linalg.lstsq(A,b,rcond=None)[0];err=np.sqrt(np.mean((A@xy-b)**2));pred=baseline(fi)[vi]
  if err>2 or np.linalg.norm(xy-pred)>10:continue
  vertices.append([fi,vi,*xy,err,cond,len(ls)])
verts=np.array(vertices);np.save('cube-parameter-inference/corner-trajectories.npy',verts)
train=verts[verts[:,0]%4!=2];test=verts[verts[:,0]%4==2]
def res(p,obs):
 out=[]
 for fi in sorted(set(obs[:,0].astype(int))):
  q=obs[obs[:,0]==fi];out.extend((project(p,fi)[q[:,1].astype(int)]-q[:,2:4]).flatten())
 return np.array(out)
models={}
for name,fix in [('perspective-both',{}),('fixed-timing',{8:0,9:1}),('3d-orthographic',{3:0}),('4d-orthographic',{4:0}),('both-orthographic',{3:0,4:0})]:
 free=[i for i in range(10) if i not in fix];
 def expand(q):
  p=p0.copy();p[free]=q
  for i,v in fix.items():p[i]=v
  return p
 r=least_squares(lambda q:res(expand(q),train),p0[free],loss='soft_l1',f_scale=1.0,max_nfev=300)
 p=expand(r.x);tr=res(p,train);te=res(p,test);models[name]={'parameters':p.tolist(),'train_coordinate_rmse':float(np.sqrt(np.mean(tr**2))),'heldout_coordinate_rmse':float(np.sqrt(np.mean(te**2))),'heldout_vertex_distance_median':float(np.median(np.linalg.norm(te.reshape(-1,2),axis=1)))}
print('vertices',len(verts), 'train',len(train),'test',len(test));print(json.dumps(models,indent=2));open('cube-parameter-inference/model-comparison.json','w').write(json.dumps({'corners':len(verts),'train_corners':len(train),'heldout_corners':len(test),'models':models},indent=2))
