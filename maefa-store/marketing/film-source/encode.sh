#!/bin/bash
# Assemble les sous-images (120/s) en 30 i/s avec flou de mouvement, puis ajoute musique et voix.
set -e
D=$(dirname "$0"); FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
OUT=/home/user/allo-beton/maefa-store/marketing
$FF -loglevel error -y -framerate 120 -i $D/sub/%05d.jpg \
  -vf "tmix=frames=4:weights='1 1 1 1',select='eq(mod(n\,4)\,3)',setpts=N/(30*TB),format=yuv420p" -r 30 \
  -c:v libx264 -preset slow -crf 19 -maxrate 5000k -bufsize 10000k -movflags +faststart $D/film.mp4
$FF -loglevel error -y -i $D/film.mp4 -i $D/mix-voix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT/maefa-film-voix.mp4
$FF -loglevel error -y -i $D/film.mp4 -i $D/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT/maefa-film-musique.mp4
ls -la $OUT
