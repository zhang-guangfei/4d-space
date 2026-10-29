exec(open('cube-parameter-inference/validate_models.py').read().split('models={}')[0])
base=np.array(json.load(open('cube-parameter-inference/model-comparison.json'))['models']['fixed-timing']['parameters']);rng=np.random.default_rng(2026);boots=[];frames=np.unique(train[:,0]);free=list(range(8))
for j in range(24):
 ids=rng.choice(frames,len(frames),replace=True);sample=np.concatenate([train[train[:,0]==i] for i in ids])
 def expand(q):return np.r_[q,0,1]
 r=least_squares(lambda q:res(expand(q),sample),base[:8],loss='soft_l1',f_scale=1,max_nfev=150);boots.append(expand(r.x))
b=np.array(boots);derived=np.c_[b[:,:3]*180/np.pi,1/b[:,4],(1-b[:,4])/b[:,3],b[:,5]/b[:,3],b[:,6:8]]
result={'names':['azimuth_deg','elevation_deg','roll_deg','d4','R_normalized_outer_halfside1','focal_px','principal_x','principal_y'],'bootstrap24_interval_5_95':np.percentile(derived,[5,95],axis=0).T.tolist(),'note':'conditional statistical intervals only; image ridge bias and model mismatch not included'}
open('cube-parameter-inference/uncertainty.json','w').write(json.dumps(result,indent=2));print(result)
