#!/usr/bin/env python3
"""Pack supplemental full outfit art, never modify canonical source files.
Only alpha cleanup, frame cropping/alignment and lossless encoding are performed.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def clean(image):
    image = image.convert('RGBA')
    pixels = list(image.getdata())
    # Imported targets have saturated red/green/blue registration flecks outside
    # their black outlines. Flood only edge-connected flecks; garment logos and
    # trim enclosed within the illustrated silhouette remain intact.
    mask = Image.new('L', image.size)
    mask.putdata([255 if a < 64 or (max(r,g,b)>235 and sorted((r,g,b))[1]<55) else 0 for r,g,b,a in pixels])
    ImageDraw.floodfill(mask, (0,0), 128)
    outside = list(mask.getdata())
    image.putdata([(r,g,b,0 if a<64 or o==128 else a) for (r,g,b,a),o in zip(pixels,outside)])
    alpha = image.getchannel('A')
    component = alpha.point(lambda a:255 if a>=64 else 0)
    values = list(component.getdata())
    cx,cy = image.width/2,image.height/2
    candidates = (i for i,a in enumerate(values) if a)
    seed = min(candidates,key=lambda i:(i%image.width-cx)**2+(i//image.width-cy)**2)
    ImageDraw.floodfill(component,(seed%image.width,seed//image.width),128)
    connected = list(component.getdata())
    image.putalpha(Image.frombytes('L',image.size,bytes(a if c==128 else 0 for a,c in zip(alpha.getdata(),connected))))
    box = image.getchannel('A').getbbox()
    if not box: raise ValueError('Empty character cell')
    if box[0]==0 or box[1]==0 or box[2]==image.width or box[3]==image.height:
        raise ValueError(f'Character touches cell edge: {box}, {image.size}')
    return image.crop(box)

def main():
    args = argparse.ArgumentParser()
    args.add_argument('manifest', type=Path)
    parsed = args.parse_args()
    source = json.loads(parsed.manifest.read_text())
    original = json.loads((ROOT/'public/game-v2/actions/benji/frames.json').read_text())
    records = []
    for item in source:
        who, *rest = item['id'].split('/')
        raw = Image.open(item['path']).convert('RGBA')
        frames = []
        split_x,split_y = raw.width//2,raw.height//2
        def separator(axis):
            length=raw.width if axis==0 else raw.height
            mask=raw.getchannel('A').point(lambda a:255 if a>=128 else 0)
            counts=[]
            for j in range(round(length*.4),round(length*.6)):
                strip=mask.crop((j,0,j+1,raw.height) if axis==0 else (0,j,raw.width,j+1))
                counts.append((j,strip.histogram()[255]))
            least=min(c for _,c in counts);runs=[];run=[]
            for j,c in counts:
                if c==least:run.append(j)
                elif run:runs.append(run);run=[]
            if run:runs.append(run)
            best=max(runs,key=len);return (best[0]+best[-1])//2
        if rest[-1]=='directions': split_x,split_y=separator(0),separator(1)
        if rest[-1]!='directions':
            boxes = original[rest[-1]]['frames']
            split_x=round((max(boxes[i][0]+boxes[i][2] for i in [0,2])+min(boxes[i][0] for i in [1,3]))/2*raw.width/1254)
            split_y=round((max(boxes[i][1]+boxes[i][3] for i in [0,1])+min(boxes[i][1] for i in [2,3]))/2*raw.height/1254)
        xs,ys=[0,split_x,raw.width],[0,split_y,raw.height]
        for i in range(4):
            x,y = i%2,i//2
            cell = raw.crop((xs[x],ys[y],xs[x+1],ys[y+1]))
            frames.append(clean(cell))
        outputs = []
        if rest[-1]=='directions':
            kit = rest[0] if who=='benji' else {'court-og':'blue-fresh','nitro':'white-224','strike':'white-224'}[who]
            for face,body in zip(['front','back','left','right'],frames):
                body = body.resize((round(body.width*480/body.height),480),Image.Resampling.LANCZOS)
                if body.width>480: raise ValueError('Direction body is too wide')
                out = Image.new('RGBA',(512,512));out.alpha_composite(body,((512-body.width)//2,16))
                path = ROOT/f'public/game-v2/basketball/outfits/{who}/{kit}/{face}.png'
                path.parent.mkdir(parents=True,exist_ok=True);out.save(path,optimize=True)
                outputs.append(str(path.relative_to(ROOT)))
        else:
            kit,action = rest
            out = Image.new('RGBA',(1254,1254))
            for body,(x,y,w,h) in zip(frames,original[action]['frames']):
                aspect = (body.width/body.height)/(w/h)
                if not .85 < aspect < 1.15: raise ValueError(f'Pose aspect drift {item["id"]}: {aspect}')
                # Register to the already-tested pose extent/palm coordinates.
                out.alpha_composite(body.resize((w,h),Image.Resampling.LANCZOS),(x,y))
            path = ROOT/f'public/game-v2/basketball/actions/benji/{kit}/{action}.webp'
            path.parent.mkdir(parents=True,exist_ok=True);out.save(path,lossless=True,method=6)
            outputs.append(str(path.relative_to(ROOT)))
        records.append({'id':item['id'],'raw_sha256':hashlib.sha256(Path(item['path']).read_bytes()).hexdigest(),
            'prompt':item.get('prompt','Initial black Fresh rear shooting edit using the original pose sheet and approved jersey reference.'),
            'files':[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in outputs]})
    dest = ROOT/'public/game-v2/basketball/ASSET_PROVENANCE.json'
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        prior={r['id']:r for r in json.loads(dest.read_text())['outfits']}
        prior.update({r['id']:r for r in records});records=list(prior.values())
    dest.write_text(json.dumps({'method':'built-in image_gen; supplemental full outfit edits; deterministic alpha/crop/registration', 'outfits':records},indent=2)+'\n')
    print(f'PASS: {len(records)*4} full-body frames packed; canonical files untouched')

if __name__=='__main__': main()
