"""Procedural astronaut primitives extracted from the former preview; no old animation is executed."""
import json, math, pathlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent
D=json.loads((ROOT/'scene-data.json').read_text())
OBSERVER_BASIS=np.array([[0,0,1],[0,1,0],[1,0,0]],float)
def rgb(h):
    h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],float)

def geometry_sphere(size, rows=8, cols=12):
    pts=[]; normals=[]; inds=[]
    size=np.array(size,float)
    for r in range(rows+1):
        phi=r/rows*math.pi
        for c in range(cols+1):
            th=c/cols*math.tau
            u=np.array([math.sin(phi)*math.cos(th),math.cos(phi),math.sin(phi)*math.sin(th)])
            pts.append(u*size/2); n=u/size; normals.append(n/np.linalg.norm(n))
    for r in range(rows):
        for c in range(cols):
            a=r*(cols+1)+c; b=a+cols+1
            inds.extend([[a,a+1,b],[a+1,b+1,b]])
    return np.array(pts),np.array(normals),np.array(inds)

def geometry_box(size):
    v=np.array([[x,y,z] for x in [-1,1] for y in [-1,1] for z in [-1,1]])*np.array(size)/2
    faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
    ps=[]; ns=[]; ix=[]
    for f in faces:
        p=v[f]; n=np.cross(p[1]-p[0],p[2]-p[0]); n/=np.linalg.norm(n); j=len(ps)
        ps.extend(p); ns.extend([n]*4); ix.extend([[j,j+1,j+2],[j,j+2,j+3]])
    return np.array(ps),np.array(ns),np.array(ix)

PARTS=[]
for part in D['parts']:
    p,n,i=(geometry_box(part['size']) if part['shape']=='box' else geometry_sphere(part['size']))
    PARTS.append((part,p,n,i))
