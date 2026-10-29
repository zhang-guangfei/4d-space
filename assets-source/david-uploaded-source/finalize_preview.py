import bpy,bmesh,json,os,hashlib
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.open_mainfile(filepath=ROOT+'/normalized-source.blend');sc=bpy.context.scene
for name in ['Plane','Plane.001']:
 o=bpy.data.objects.get(name);assert o is not None;bpy.data.objects.remove(o,do_unlink=True)
objs=[bpy.data.objects.get(n) for n in ['Mball.001','Cube','Sphere.001']];assert all(objs)
lo=min(v.co.z for o in objs for v in o.data.vertices);hi=max(v.co.z for o in objs for v in o.data.vertices);s=2/(hi-lo)
mat=bpy.data.materials.get('White marble — nonmetallic sculpture');bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.56,.53,.48,1);bs.inputs['Roughness'].default_value=.52;bs.inputs['Specular IOR Level'].default_value=.3
for o in objs:
 for v in o.data.vertices:v.co=Vector((v.co.x*s,v.co.y*s,(v.co.z-lo)*s))
 o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 o['source']='https://sketchfab.com/3d-models/david-statue-f0e3d5b992d54d159ee26003e239b972';o['creator']='Filip (@filip.hans.nyberg)';o['license']='https://creativecommons.org/licenses/by/4.0/';o['changes']='Removed independent plinth and complete sling object; retained uploaded body, face, hands and pose; normalized to 2 metres; marble studio material.'
 o['previewOnly']=True
bpy.ops.object.select_all(action='DESELECT')
for o in objs:o.select_set(True)
bpy.context.view_layer.objects.active=objs[0]
bpy.ops.export_scene.gltf(filepath=ROOT+'/david-preview.glb',export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
meta={'sourceLibraryFileId':'libfile_298ebc2a2d388191840cb4652cc7b66b','sourceVersion':0,'sourceSHA256':hashlib.sha256(open(ROOT+'/source/decimatedmichd.fbx','rb').read()).hexdigest(),'source':objs[0]['source'],'creator':objs[0]['creator'],'license':objs[0]['license'],'changes':objs[0]['changes'],'heightMeters':2,'components':[],'previewOnly':True,'gameModified':False,'deployed':False,'qualityStatus':'PENDING_VISUAL_REVIEW'}
for o in objs:
 o.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(o.data);meta['components'].append({'name':o.name,'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges)});bm.free()
meta['triangles']=sum(p['triangles'] for p in meta['components']);json.dump(meta,open(ROOT+'/asset-metadata.json','w'),indent=2)
for light,power,size,loc in zip([o for o in sc.objects if o.type=='LIGHT'],[580,80,330],[2.4,3,2],[(-3.4,-2.7,4.2),(3,-2,2.4),(1,3,4)]):
 light.data.energy=power;light.data.size=size;light.location=loc;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.12;sc.render.resolution_x=900;sc.render.resolution_y=1200;sc.cycles.samples=96;sc.cycles.use_denoising=False;sc.camera.data.ortho_scale=2.25
for name,loc in [('front',(0,-5,1.25)),('side',(5,0,1.25)),('back',(0,5,1.25)),('oblique',(-3,-5,1.25))]:
 sc.camera.location=loc;sc.camera.rotation_euler=(Vector((0,0,1))-sc.camera.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=ROOT+'/david-'+name+'.jpg';bpy.ops.render.render(write_still=True)
sc.camera.location=(0,-5,1.25);sc.camera.rotation_euler=(Vector((0,0,1))-sc.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/david-preview.blend');print('FINAL',meta,flush=True)
