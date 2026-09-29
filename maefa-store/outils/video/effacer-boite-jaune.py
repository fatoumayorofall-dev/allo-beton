# Rend illisible la boîte jaune du fournisseur (et son nom) : grande zone jaune détectée image par image,
# floutée et ramenée à un beige neutre. Les petites pièces dorées du sac (anse, plaque) ne sont pas touchées.
import cv2, numpy as np, subprocess, sys
FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
src, dst = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)   # OpenCV applique la rotation du téléphone
ok, f = cap.read(); H, W = f.shape[:2]
p = subprocess.Popen([FF,'-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','30','-i','-','-c:v','libx264','-crf','14','-pix_fmt','yuv420p',dst], stdin=subprocess.PIPE)
while ok:
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    y = ((hsv[...,0] >= 20) & (hsv[...,0] <= 38) & (hsv[...,1] > 110) & (hsv[...,2] > 110)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(y)
    big = np.zeros_like(y)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] > 6000: big[lab == k] = 1
    if big.any():
        m = cv2.dilate(big, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
        soft = cv2.GaussianBlur(m.astype(np.float32), (41, 41), 0)[..., None]
        blur = cv2.GaussianBlur(f, (0, 0), 18)
        bh = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV); bh[...,1] = (bh[...,1] * 0.22).astype(np.uint8); bh[...,2] = np.clip(bh[...,2].astype(int) + 10, 0, 255).astype(np.uint8)
        calm = cv2.cvtColor(bh, cv2.COLOR_HSV2BGR)
        f = (f * (1 - soft) + calm * soft).astype(np.uint8)
    p.stdin.write(f.tobytes()); ok, f = cap.read()
p.stdin.close(); p.wait(); print('ok', dst, W, H)
