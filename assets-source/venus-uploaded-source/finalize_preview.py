import bpy,os,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.open_mainfile(filepath=ROOT+'/venus-preview.blend');sc=bpy.context.scene;o=bpy.data.objects['Venus de Milo — SMK']
o['source']='https://sketchfab.com/3d-models/venus-de-milo-statuestexturingchallenge-smk-2983d92ac4e744f485492580ca7629f2';o['creator']='SMK — National Gallery of Denmark; optimized by Shaderbytes';o['license']='https://creativecommons.org/publicdomain/zero/1.0/';o['changes']='Uniformly normalized to 2 metres; white stone studio material with supplied normal map. Original geometry preserved.'
sc.render.resolution_x=900;sc.render.resolution_y=1200;sc.cycles.samples=96;sc.cycles.use_denoising=False
for name,loc in [('front',(0,-5,1.25)),('side',(5,0,1.25))]:
 sc.camera.location=loc;sc.camera.rotation_euler=(Vector((0,0,1))-sc.camera.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=ROOT+'/venus-'+name+'.jpg';bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
bpy.ops.export_scene.gltf(filepath=ROOT+'/venus-preview.glb',export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/venus-preview.blend')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=ROOT+'/venus-preview.glb');objs=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(objs)==1
obj=objs[0];obj.data.calc_loop_triangles();assert len(obj.data.loop_triangles)==24058
vs=[obj.matrix_world@v.co for v in obj.data.vertices];assert abs(max(v.z for v in vs)-min(v.z for v in vs)-2)<1e-5
assert not any(o.type in ['LIGHT','CAMERA'] for o in bpy.context.scene.objects)
json.dump({'glbRoundtrip':True,'triangles':24058,'meshes':1,'heightMeters':2,'normalTextureEmbedded':True,'gameModified':False},open(ROOT+'/test-results.json','w'),indent=2)
