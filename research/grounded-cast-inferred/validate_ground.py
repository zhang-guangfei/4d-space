from pathlib import Path
import numpy as np,math,json
P=Path(__file__).resolve().parent
ns={'__file__':str(P/'render.py')};src=(P/'render.py').read_text().split('\nerrors=[]')[0];exec(src,ns)
p=ns['p'];st=ns['ST'];observer=ns['observer_meshes'];proj=ns['proj'];xform=ns['xform4'];rows=[]
for name,d in st.items():
 v=np.array(d['positions']).reshape(-1,3);v=(v-(v.min(0)+v.max(0))/2)*.325;v[:,1]+=-1-v[:,1].min();rows.append({'name':name,'lowest_local_y':float(v[:,1].min()),'max_local_y':float(v[:,1].max()),'max_abs_free_coord':float(np.abs(v).max()),'support_clearance':float(v[:,1].min()+1)})
for i in range(193):observer(i*.07)
# Continuous contact locus / placement near all quarter-cell transitions.
cont=[]
for j in range(4):
 t=(math.pi/4+j*math.pi/2)/p['omega'];a=observer(t-1e-7);b=observer(t+1e-7);cont.append(float(max(np.max(np.abs(proj(v)-proj(w))) for (_,v,_),(_,w,_) in zip(a,b))))
# Every rod sampled end ring has exactly the common three-dimensional radius.
rad=[]
for f in ns['data']['frames'][:192]:
 pts=np.array(f['p3'])
 for ia,ib in f['edges']:
  a,b=pts[ia],pts[ib];v,_,_=ns['mesh'](a,b,1,1);rad.extend(np.linalg.norm(v[:32]-a,axis=1));rad.extend(np.linalg.norm(v[32:64]-b,axis=1))
out={'statues':rows,'observer_minimum_clearance_max_abs':float(np.max(np.abs(ns['GROUND_ERRORS']))),'observer_switch_screen_delta_px_at_768_over_2e_minus7sec':cont,'rod_radius_min':float(min(rad)),'rod_radius_max':float(max(rad)),'observer_rule':'continuous actual projected inner-floor envelope; stance vertex contact, other foot allowed to lift','statue_ground_rule':'cell local y=-1 transformed identically with all other vertices'}
(P/'ground-validation.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
