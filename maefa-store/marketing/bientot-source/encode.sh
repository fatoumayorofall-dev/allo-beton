#!/bin/bash
# Assemble les sous-images (120/s) en 30 i/s avec flou de mouvement, puis ajoute la musique.
set -e
D=$(cd "$(dirname "$0")" && pwd); FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
OUT=/home/user/allo-beton/maefa-store/marketing
$FF -nostdin -loglevel error -y -framerate 120 -i $D/sub/%05d.jpg \
  -vf "tmix=frames=4:weights='1 1 1 1',select='eq(mod(n\,4)\,3)',setpts=N/(30*TB),format=yuv420p" -r 30 \
  -c:v libx264 -preset slow -crf 18 -maxrate 6000k -bufsize 12000k -movflags +faststart $D/film.mp4
$FF -nostdin -loglevel error -y -i $D/film.mp4 -i $D/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT/maefa-bientot.mp4
ls -la $OUT/maefa-bientot.mp4
