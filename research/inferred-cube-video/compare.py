from PIL import Image,ImageDraw
import numpy as np,json,pathlib
from scipy.ndimage import distance_transform_edt
P=pathlib.Path(__file__).parent;gif=Image.open(P.parent/'reverse-cube-reference/original.gif');rows=[];sheet=Image.new('RGB',(256*6,256*4))
for i in range(48):
 gif.seek(i);ref=gif.convert('RGB');gen=Image.open(P/f'frame-{i:03}.png').resize((256,256),Image.Resampling.LANCZOS);a=np.array(ref).astype(float);b=np.array(gen).astype(float)
 ma=(a[:,:,2]>a[:,:,0]*1.2)&(a[:,:,2]>55);mb=(b[:,:,2]>b[:,:,0]*1.2)&(b[:,:,2]>55);da=distance_transform_edt(~ma);db=distance_transform_edt(~mb)
 rows.append({'frame':i,'rgb_rmse':float(np.sqrt(np.mean((a-b)**2))),'symmetric_blue_mask_distance_px':float((da[mb].mean()+db[ma].mean())/2)})
 if i%6==0:
  k=i//6;r=k//2;c=k%2*3;sheet.paste(ref,(c*256,r*256));sheet.paste(gen,((c+1)*256,r*256));sheet.paste(Image.blend(ref,gen,.5),((c+2)*256,r*256))
sheet.save(P/'reference-comparison.jpg');(P/'render-comparison.json').write_text(json.dumps({'all48frames':rows,'mean_rgb_rmse':float(np.mean([r['rgb_rmse'] for r in rows])),'mean_symmetric_blue_mask_distance_px':float(np.mean([r['symmetric_blue_mask_distance_px'] for r in rows])),'caveat':'Blue-mask area distance measures rendered visible coverage, not true vertex error. Thickness/light/occlusion contribute.'},indent=2))
print((P/'render-comparison.json').read_text()[-400:])
