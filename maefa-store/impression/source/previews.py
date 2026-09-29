import pymupdf, json, os, sys
D=os.path.dirname(os.path.abspath(__file__)); O=os.path.join(D,'out'); A=os.path.join(O,'apercus')
os.makedirs(A, exist_ok=True)
G=sys.argv[1] if len(sys.argv)>1 else None
if not G:
    for f in os.listdir(A): os.remove(os.path.join(A,f))
for d in json.load(open(os.path.join(O,f'liste-{G}.json' if G else 'liste.json'))):
    doc=pymupdf.open(os.path.join(O,d['file'])); bleed=float(d['fondsPerdus'].split()[0]) if d['fondsPerdus']!='aucun' else 0
    for i,pg in enumerate(doc):
        w_mm=pg.rect.width/72*25.4; dpi=int(min(300, 1600/(w_mm/25.4)))
        b=bleed/25.4*72; clip=pymupdf.Rect(b,b,pg.rect.width-b,pg.rect.height-b)
        name=d['file'][:-4]+((('-recto','-verso')[i] if len(doc)==2 else f'-p{i+1}') if len(doc)>1 else '')+'.png'
        pg.get_pixmap(dpi=dpi, clip=clip).save(os.path.join(A,name))
print('aperçus', len(os.listdir(A)))
