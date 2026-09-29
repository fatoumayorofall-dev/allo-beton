#!/bin/bash
# Assemble les sous-images (60/s) en 30 i/s avec flou de mouvement, puis ajoute la musique.
set -e
D=$(dirname "$0"); FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
OUT=/home/user/allo-beton/maefa-store/marketing
$FF -loglevel error -y -framerate 60 -i $D/sub/%05d.jpg \
  -vf "tmix=frames=2:weights='1 1',select='eq(mod(n\,2)\,1)',setpts=N/(30*TB),format=yuv420p" -r 30 \
  -c:v libx264 -preset slow -crf 18 -maxrate 6000k -bufsize 12000k -movflags +faststart $D/film3d.mp4
$FF -loglevel error -y -i $D/film3d.mp4 -i $D/../motion3/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT/maefa-film-3d.mp4
ls -la $OUT
