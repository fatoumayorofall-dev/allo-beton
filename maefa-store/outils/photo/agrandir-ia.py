# Agrandissement ×4 par IA (Real-ESRGAN), par tuiles pour tenir en mémoire sur processeur.
import sys, glob, os, time, torch, numpy as np, spandrel
from PIL import Image
torch.set_num_threads(os.cpu_count())
m = spandrel.ModelLoader().load_from_file('/tmp/esr/RealESRGAN_x4plus.pth').eval()
def up(img, tile=256, pad=16):
    a = torch.from_numpy(np.asarray(img).astype(np.float32) / 255).permute(2, 0, 1)[None]
    _, _, H, W = a.shape; out = torch.zeros(1, 3, H * 4, W * 4)
    with torch.no_grad():
        for y in range(0, H, tile):
            for x in range(0, W, tile):
                y0, x0, y1, x1 = max(0, y - pad), max(0, x - pad), min(H, y + tile + pad), min(W, x + tile + pad)
                r = m(a[:, :, y0:y1, x0:x1])
                ty, tx = y - y0, x - x0; h, w = min(tile, H - y), min(tile, W - x)
                out[:, :, y*4:(y+h)*4, x*4:(x+w)*4] = r[:, :, ty*4:(ty+h)*4, tx*4:(tx+w)*4]
    return Image.fromarray((out[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8))
for f in sorted(glob.glob(sys.argv[1] + '/*.png')):
    dst = sys.argv[2] + '/' + os.path.basename(f)
    if os.path.exists(dst): continue
    t = time.time(); im = Image.open(f).convert('RGB')
    up(im).resize((1080, 1350), Image.LANCZOS).save(dst)
    print(os.path.basename(f), im.size, f'{time.time()-t:.0f}s', flush=True)
