#!/bin/bash
# Finition « look Maefa » en 1080×1350 sur les images agrandies par l'IA
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
S=/tmp/claude-0/-home-user-allo-beton/03db409e-98b5-5c81-89bc-311e150c4545/scratchpad; R=/home/user/allo-beton/maefa-store
for f in /tmp/esr/up/*.png; do
  n=$(basename $f .png)
  case $n in sac-ndella-*|tongs-*) B=$S/four/band2.png ;; *) B=$S/four/band.png ;; esac
  case $n in sac-awa-*) G="eq=contrast=1.03:saturation=0.98" ;; *) G="eq=contrast=1.05:brightness=0.01:saturation=0.95,colorbalance=rs=0.02:bs=-0.02,vignette=PI/6" ;; esac
  $FF -loglevel error -y -i $f -i $B -i $S/four/logo-wm.png -filter_complex "[0:v]$G[v];[1:v]scale=1080:-1[b];[2:v]scale=345:-1[l];[v][b]overlay=0:H-h[v2];[v2][l]overlay=(W-w)/2:H-h-45" -frames:v 1 -q:v 2 $R/public/produits/$n.jpg
done
ls $R/public/produits | wc -l
