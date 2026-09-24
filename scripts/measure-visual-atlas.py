# Re-measures atlas rects from the PNG pixels (reference for src/data/visual-atlas.ts).
# Dev-only; not part of the build. Requires: pip install pillow numpy scipy
# Usage: python3 scripts/measure-visual-atlas.py > atlas-measurements.json
import json, numpy as np
from PIL import Image
from scipy import ndimage

def runs(v, minlen):
    out=[];start=None
    for i,x in enumerate(v):
        if x and start is None: start=i
        if not x and start is not None:
            if i-start>=minlen: out.append((start,i))
            start=None
    if start is not None and len(v)-start>=minlen: out.append((start,len(v)))
    return out

def cards(f):
    a=np.array(Image.open(f).convert('RGBA'))[:,:,3]
    op=a>128
    rows=runs(op.mean(axis=1)>0.02,20)
    out=[]
    for y0,y1 in rows:
        band=op[y0:y1]
        r=[]
        for x0,x1 in runs(band.mean(axis=0)>0.5,20):
            vr=runs(op[y0:y1,x0:x1].mean(axis=1)>0.5,10)
            r.append([int(x0),int(y0+vr[0][0]),int(x1-x0),int(vr[-1][1]-vr[0][0])])
        out.append(r)
    return out

def sprites():
    a=np.array(Image.open('blackjak-sprite-sheet.png').convert('RGBA'))[:,:,3]
    mask=a>32
    lab,n=ndimage.label(mask)
    sizes=ndimage.sum(mask,lab,range(1,n+1))
    coms=ndimage.center_of_mass(mask,lab,range(1,n+1))
    big=[i+1 for i,s in enumerate(sizes) if s>3000]
    owner=np.zeros(n+1,int)
    for b in big: owner[b]=b
    bigc={b:coms[b-1] for b in big}
    objs=ndimage.find_objects(lab)
    for i in range(1,n+1):
        if owner[i] or sizes[i-1]<40: continue
        cy,cx=coms[i-1]
        # nearest big component by pixel distance approximated via bbox distance
        best=None
        for b in big:
            s=objs[b-1]
            dy=max(s[0].start-cy,0,cy-s[0].stop); dx=max(s[1].start-cx,0,cx-s[1].stop)
            d=dx*dx+dy*dy
            if best is None or d<best[0]: best=(d,b)
        if best[0]<=40*40: owner[i]=best[1]
    own=owner[lab]
    boxes={}
    for b in big:
        ys,xs=np.where(own==b)
        boxes[b]=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
    # resolve overlaps with min-cost cut
    keys=sorted(big,key=lambda b:(round(boxes[b][1]/250),boxes[b][0]))
    changed=True
    while changed:
        changed=False
        for i in range(len(keys)):
            for j in range(i+1,len(keys)):
                A,B=boxes[keys[i]],boxes[keys[j]]
                ox=min(A[2],B[2])-max(A[0],B[0]); oy=min(A[3],B[3])-max(A[1],B[1])
                if ox<=0 or oy<=0: continue
                # cut along axis with smaller overlap
                axis=0 if ox<=oy else 1
                lo,hi=(A,B) if (A[axis]<=B[axis]) else (B,A)
                klo=keys[i] if lo is A else keys[j]; khi=keys[j] if lo is A else keys[i]
                cands=range(hi[axis],lo[axis+2]+1)
                mlo=(own==klo); mhi=(own==khi)
                plo=mlo.sum(axis=0 if axis==0 else 1); phi=mhi.sum(axis=0 if axis==0 else 1)
                clo=np.concatenate([[0],np.cumsum(plo)]); chi=np.concatenate([[0],np.cumsum(phi)])
                best=min(cands,key=lambda c:(clo[-1]-clo[c])+chi[c])
                lo[axis+2]=int(best); hi[axis]=int(best)
                changed=True
    order=sorted(big,key=lambda b:(0 if boxes[b][1]<200 else 1 if boxes[b][1]<500 else 2,boxes[b][0]))
    res=[]
    for b in order:
        x0,y0,x1,y1=boxes[b]
        lost=int(((own==b).sum())-(own[y0:y1,x0:x1]==b).sum())
        res.append({'rect':[x0,y0,x1-x0,y1-y0],'clippedPx':lost,'totalPx':int((own==b).sum())})
    return res

out={'sprites':sprites()}
for f in ['standard','jak-theme','inspire-theme']:
    out[f]=cards(f'blackjak-cards-{f}.png')
print(json.dumps(out))
