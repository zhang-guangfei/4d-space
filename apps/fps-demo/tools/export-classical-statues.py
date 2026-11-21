"""Offline Blender export of approved source GLBs to cacheable typed arrays.
Run from repository root:
  blender -b -t 2 --python apps/fps-demo/tools/export-classical-statues.py -- . [output-directory]
Source inputs: assets-source/. Omit the root argument to infer it from this script.
Coordinates use proper rotation (x,y,z)->(x,z,-y); no handedness reflection.
"""
import bpy, sys, os, json, struct, base64, math, shutil
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
ARGS = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ROOT = str(Path(ARGS[0]).resolve()) if ARGS else str(Path(__file__).resolve().parents[3])
SOURCE = os.path.join(ROOT,'assets-source')
OUT = str(Path(ARGS[1]).resolve()) if len(ARGS)>1 else os.path.join(ROOT,'apps/fps-demo/dist/assets/classical-statues')
os.makedirs(OUT,exist_ok=True)

def packed(values,kind):
    code={'f32':'f','u32':'I'}[kind]
    return {'type':kind,'base64':base64.b64encode(struct.pack('<'+str(len(values))+code,*values)).decode('ascii')}

def export_mesh(obj):
    mesh=obj.data; mesh.calc_loop_triangles()
    uv=mesh.uv_layers.active.data if mesh.uv_layers.active else None
    positions=[];normals=[];uvs=[];indices=[];lookup={}
    for tri in mesh.loop_triangles:
        for li in tri.loops:
            loop=mesh.loops[li];v=mesh.vertices[loop.vertex_index]
            # GLB imports split vertices at UV islands but preserve smooth custom
            # normals per face corner. Recomputing vertex normals creates false
            # faceting along these islands (up to 177 degrees on the Venus).
            n=mesh.corner_normals[li].vector; p=v.co; t=uv[li].uv if uv else (0.5,0.5)
            key=(loop.vertex_index,round(float(t[0]),7),round(float(t[1]),7),*(round(float(c),7) for c in n))
            i=lookup.get(key)
            if i is None:
                i=len(lookup);lookup[key]=i
                positions.extend((p.x,p.z,-p.y)); normals.extend((n.x,n.z,-n.y));uvs.extend(t)
            indices.append(i)
    assert all(math.isfinite(v) for v in positions+normals+uvs)
    assert max(indices)<len(positions)//3 and len(indices)%3==0
    bounds={'min':[min(positions[k::3]) for k in range(3)],'max':[max(positions[k::3]) for k in range(3)]}
    return {**{k:packed(v,'u32' if k=='indices' else 'f32') for k,v in [('positions',positions),('normals',normals),('indices',indices),('uvs',uvs)]},'vertices':len(positions)//3,'triangles':len(indices)//3,'bounds':bounds}

def transfer_smooth_normals(source, target):
    # Collapse modifies UV-island vertices independently. Sample the original
    # smooth normal field on its closest triangle instead of recomputing an
    # unrelated normal on each side of a UV seam. Geometry/UVs remain untouched.
    def decode(key):
        raw=base64.b64decode(source[key]['base64'])
        code='I' if key=='indices' else 'f'
        return list(struct.unpack('<'+str(len(raw)//4)+code,raw))
    p,n,ii=decode('positions'),decode('normals'),decode('indices')
    vertices=[Vector(p[i:i+3]) for i in range(0,len(p),3)]
    normals=[Vector(n[i:i+3]) for i in range(0,len(n),3)]
    tris=[tuple(ii[i:i+3]) for i in range(0,len(ii),3)]
    bvh=BVHTree.FromPolygons(vertices,tris,all_triangles=True)
    raw=base64.b64decode(target['positions']['base64'])
    target_positions=struct.unpack('<'+str(len(raw)//4)+'f',raw)
    result=[]
    for i in range(0,len(target_positions),3):
        point=Vector(target_positions[i:i+3]);location,_,face,_=bvh.find_nearest(point)
        a,b,c=tris[face]
        normal=barycentric_transform(location,vertices[a],vertices[b],vertices[c],normals[a],normals[b],normals[c])
        if normal.length_squared<1e-12:normal=normals[a].copy()
        normal.normalize();result.extend(normal)
    target['normals']=packed(result,'f32')

assets={}; metadata={}
for name,target in [('venus',6000),('david',8000)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path=os.path.join(SOURCE,name+'-uploaded-source',name+'-preview.glb')
    bpy.ops.import_scene.gltf(filepath=path)
    objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.join(); obj=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # Source GLBs use Blender Z-up after import. Center horizontal bounds and seat lowest point at zero.
    vs=obj.data.vertices
    lo=[min(v.co[k] for v in vs) for k in range(3)];hi=[max(v.co[k] for v in vs) for k in range(3)]
    scale=2/(hi[2]-lo[2]);cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2
    for v in vs:v.co=Vector(((v.co.x-cx)*scale,(v.co.y-cy)*scale,(v.co.z-lo[2])*scale))
    for p in obj.data.polygons:p.use_smooth=True
    obj.data.update(); high=export_mesh(obj)
    def simplify(mesh_object, triangle_count):
        bpy.context.view_layer.objects.active = mesh_object
        dec = mesh_object.modifiers.new('Statue LOD', 'DECIMATE')
        dec.ratio = triangle_count / high['triangles']
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)
        # Simplification may extrapolate beyond the floor/collision envelope.
        hb = high['bounds']
        for v in mesh_object.data.vertices:
            q = [v.co.x, v.co.z, -v.co.y]
            q = [max(hb['min'][k], min(hb['max'][k], q[k])) for k in range(3)]
            v.co = Vector((q[0], -q[2], q[1]))
        mesh_object.data.update()
        result = export_mesh(mesh_object)
        transfer_smooth_normals(high, result)
        return result
    if name == 'david':
        medium = obj.copy()
        medium.data = obj.data.copy()
        bpy.context.collection.objects.link(medium)
        mid = simplify(medium, 32000)
        bpy.data.objects.remove(medium, do_unlink=True)
    low = simplify(obj, target)
    assets[name] = {'high': high, 'low': low, 'bounds': high['bounds']}
    if name == 'david':
        assets[name]['mid'] = mid
    metadata[name]={'highTriangles':high['triangles'],'lowTriangles':low['triangles'],'bounds':high['bounds'],'up':'+Y','front':'+Z','heightMeters':2,'sourceFile':os.path.basename(path),'normalSource':'original GLB split/corner normals; distant normals sampled from original smooth field'}
    attribution=open(os.path.join(SOURCE,name+'-uploaded-source','ATTRIBUTION.md')).read().replace('This is a preview; the public game has not been changed.','This source preview was approved for game integration.').replace('This is a preview; the public game was not changed.','This source preview was approved for game integration.')
    with open(os.path.join(OUT,name+'-ATTRIBUTION.md'),'w') as f:f.write(attribution+'\n\nGame integration: source-derived mesh buffers are rotated to +Y up/+Z front, centered horizontally, and exported with shared high/distant geometry. Original split/corner normals are preserved; distant normals are sampled from the source smooth normal field rather than recomputed at UV seams. Far variants use 5,999 Venus / 8,000 David triangles and remain inside the high-detail bounds. The live station uses its portal-clipped matte marble shader, not the Blender studio lighting; the original Venus normal map is used when derivative shading is supported. See credits.html for current game attribution.\n')
    print(name,metadata[name],flush=True)
# Store contiguous typed-array streams. Reading a LOD never parses megabytes of JS.
manifest = {}
for sculpture, sculpt in assets.items():
    manifest[sculpture] = {'bounds': sculpt['bounds']}
    for lod in (k for k in ('low', 'mid', 'high') if k in sculpt):
        stream = bytearray()
        fields = {}
        for k in ('positions', 'normals', 'indices', 'uvs'):
            payload = base64.b64decode(sculpt[lod][k]['base64'])
            fields[k] = [len(stream), len(payload) // 4]
            stream.extend(payload)
        filename = sculpture + '-' + lod + '.bin'
        with open(os.path.join(OUT, filename), 'wb') as f:
            f.write(stream)
        manifest[sculpture][lod] = {'file': filename, 'fields': fields, 'triangles': sculpt[lod]['triangles']}
with open(os.path.join(OUT, 'geometry.js'), 'w') as f:
    f.write('// Generated by export-classical-statues.py. Byte offsets are little-endian.\n')
    f.write('export const ASSET_DATA = ' + json.dumps(manifest, indent=2) + ';\n')
with open(os.path.join(OUT,'metadata.json'),'w') as f:json.dump(metadata,f,indent=2)
shutil.copyfile(os.path.join(SOURCE,'venus-uploaded-source/unpacked/textures/retopo_2_Default_nmap.jpg'),os.path.join(OUT,'venus-normal.jpg'))
shutil.copyfile(os.path.join(SOURCE,'venus-uploaded-source/unpacked/textures/retopo_2_Default_ao.jpg'),os.path.join(OUT,'venus-ao.jpg'))
import runpy
runpy.run_path(str(Path(__file__).with_name('bake-david-cavity.py')))['bake'](Path(OUT))
