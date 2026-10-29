import fs from 'node:fs';
import {params,frame} from './cube-parameter-inference/model.mjs';
for(const [dir,reverse] of [['grounded-cast-inferred',true],['inferred-cube-video',false]]){
 const data={params,frames:Array.from({length:193},(_,i)=>frame(i*.07,{reverse}))};
 fs.writeFileSync(new URL(`./${dir}/scene.json`,import.meta.url),JSON.stringify(data));
 console.log(`Generated ${dir}: 193 samples (192 output frames + closing seam)`);
}
