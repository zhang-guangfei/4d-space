import bpy,os,json,bmesh
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'..','david-uploaded-source','david-preview.blend'));sc=bpy.context.scene
for o in list(sc.objects):
 if o.type=='MESH' and o.name in ['Mball.001','Cube','Sphere.001']:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.obj_import(filepath=ROOT+'/mesh/retopo_2.obj',forward_axis='NEGATIVE_Z',up_axis='Y')
objs=[o for o in bpy.context.selected_objects if o.type=='MESH'];assert len(objs)==1
o=objs[0];o.name='Venus de Milo — SMK'
vs=[o.matrix_world@v.co for v in o.data.vertices];lo=Vector(tuple(min(v[i] for v in vs) for i in range(3)));hi=Vector(tuple(max(v[i] for v in vs) for i in range(3)));cen=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));s=2/(hi.z-lo.z)
for v in o.data.vertices:v.co=(o.matrix_world@v.co-cen)*s
o.matrix_world.identity()
mat=bpy.data.materials.new('Venus white stone');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.38,.35,1);bs.inputs['Roughness'].default_value=.52;bs.inputs['Specular IOR Level'].default_value=.3
o.data.materials.clear();o.data.materials.append(mat)
for p in o.data.polygons:p.use_smooth=True
nt=mat.node_tree
normal=nt.nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(ROOT+'/unpacked/textures/retopo_2_Default_nmap.jpg');normal.image.colorspace_settings.name='Non-Color'
nm=nt.nodes.new('ShaderNodeNormalMap');nt.links.new(normal.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
o.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(o.data)
meta={'name':'Venus de Milo','sourceLibraryFileId':'libfile_aef21a224f1c819193bc43305c8369da','sourceVersion':0,'vertices':len(o.data.vertices),'triangles':len(o.data.loop_triangles),'heightMeters':2,'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'source':'https://sketchfab.com/3d-models/venus-de-milo-statuestexturingchallenge-smk-2983d92ac4e744f485492580ca7629f2','license':'CC0','geometryChanges':'Only uniform size normalization; original arms/drapery/base retained','gameModified':False}
bm.free();json.dump(meta,open(ROOT+'/asset-metadata.json','w'),indent=2);print('META',meta,flush=True)
sc.render.resolution_x=600;sc.render.resolution_y=800;sc.cycles.samples=24;sc.camera.data.ortho_scale=2.3
for name,loc in [('front',(0,-5,1.25)),('back',(0,5,1.25))]:
 sc.camera.location=loc;sc.camera.rotation_euler=(Vector((0,0,1))-sc.camera.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=ROOT+'/check-'+name+'.jpg';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/venus-preview.blend')
