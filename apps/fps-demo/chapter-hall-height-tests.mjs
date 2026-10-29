/** Outermost hall ring removed in both representations. NullEngine, not GPU pixels. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildHypothesisScene} from './dist/hypotheses.js';
import {StationRenderer} from './dist/station-renderer.js';
import {MODEL_CONTENT} from './dist/model-content.js';
import {normalFor,identityTransform} from './dist/chapter-topology.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
B.RawCubeTexture=class{constructor(scene,faces,size){let texture=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);texture._texture.isCube=true;return texture;}};
const renderer=new StationRenderer(B,scene),instance={normal:normalFor('X-'),transform:identityTransform(),node:new B.TransformNode('hall miniature test',scene),materials:[],meshes:[]};
const lab=buildHypothesisScene(B,scene);
const outer=mesh=>mesh.metadata?.annular||mesh.metadata?.continuousAnnulus||/^HR\d+$/.test(mesh.metadata?.hypothesisLocalId||mesh.metadata?.localRoomId||'')||/outer annular|annular room outline/i.test(mesh.name);
try{
  const parts=renderer.createHologram(instance),mini=instance.hologram;
  assert.equal(parts.filter(outer).length,0,'miniature has no outer annulus, hidden shell or outline');
  assert.ok(!instance.materials.some(material=>material.name.includes('hypo-HR1')),'removed ring allocates no material');
  assert.deepEqual(parts.filter(mesh=>mesh.metadata?.hypothesisLocalId).map(mesh=>mesh.metadata.hypothesisLocalId).sort(),['H1','H2','H3','H4','HC']);
  assert.equal(mini.rooms.length,4);assert.equal(mini.traveler.getChildMeshes().length,2);
  for(const room of mini.rooms){near(Math.hypot(room.position.x,room.position.z),.67);near(room.position.y,.1);const size=room.getBoundingInfo().boundingBox.extendSize.scale(2);near(size.x,.32);near(size.y,.4);near(size.z,.32);}
  const miniCenter=parts.find(mesh=>mesh.metadata?.hypothesisLocalId==='HC');near(miniCenter.position.y,.1);near(miniCenter.getBoundingInfo().boundingBox.extendSize.x*2,.35);
  const tracks=parts.filter(mesh=>mesh.metadata?.motionRing);assert.equal(tracks.length,1,'miniature has one actual movement ring');const track=tracks[0];assert.equal(track.parent,mini.node);near(track.metadata.centerRadius,.67);near(track.metadata.halfWidth,.25*.67/2.35);near(track.metadata.floorY,-.075);assert.equal(track.material._colors3.baseColor.toHexString().toLowerCase(),'#407c99');const tp=track.getVerticesData('position');for(let i=0;i<tp.length;i+=3){near(tp[i+1],-.075);const r=Math.hypot(tp[i],tp[i+2]);assert.ok(Math.min(Math.abs(r-(.67-track.metadata.halfWidth)),Math.abs(r-(.67+track.metadata.halfWidth)))<1e-6);}
  const hall=lab.models['central-hall'];
  assert.equal(hall.outerRoom,undefined,'expanded model has no stale outer-room handle');
  assert.equal(hall.root.getDescendants().filter(outer).length,0,'expanded model has no outer annulus, hidden shell or outline');
  assert.equal(scene.materials.some(material=>material.name==='local room HR1'),false,'removed expanded ring allocates no material');
  assert.equal(hall.roomNodes.length,4);assert.equal(hall.player.getChildMeshes().length,4);
  assert.ok(hall.corridor&&hall.walkFloor,'inner connecting corridor and floor stay intact');
  const center=hall.root.getChildMeshes().find(mesh=>mesh.name==='central hall');assert.ok(center);near(center.position.y,.45);near(center.getBoundingInfo().boundingBox.extendSize.x*2,1.7);
  lab.select('central-hall');
  for(const t of [0,.5,1,2,3,4]){lab.setAnimationTravel(t);near(Math.hypot(hall.player.position.x,hall.player.position.z),2.35);near(hall.player.position.y,-.315);assert.ok(hall.corridor.isEnabled());assert.ok(hall.walkFloor.isEnabled());for(const {room} of hall.roomNodes){near(Math.hypot(room.position.x,room.position.z),2.35);near(room.position.y,.3);}}
  assert.ok(!/右边则是|环形房间|比较两侧房间|途中两侧/.test(Object.values(MODEL_CONTENT['central-hall']).join(' ')),'copy does not claim removed right-hand ring is visible');
  console.log('PASS outer hall ring absent from expanded model and miniature; center, four rooms, inner corridor, floor, travelers and orbit motion preserved; copy matches displayed model. CPU/NullEngine only.');
}finally{lab.dispose();instance.node.dispose(false);instance.materials.forEach(material=>material.dispose());renderer.dispose();scene.dispose();engine.dispose();}
