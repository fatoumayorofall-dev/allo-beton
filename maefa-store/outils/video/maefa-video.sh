#!/bin/bash
# Transforme une vidéo de fournisseur en vidéo « Maefa » : cadrage 4:5 sur l'article, miroir (facultatif),
# couleurs retravaillées, léger ralenti, bandeau et logo Maefa, fondus. Sans le son.
# Usage : outils/video/maefa-video.sh entree.mp4 sortie-nom [decalage_haut=110] [miroir=0|1]
#   → public/videos/sortie-nom.mp4 (+ .webm) et 3 photos public/produits/sortie-nom-1..3.jpg à trier.
# Éviter le miroir quand une écriture est visible (elle apparaîtrait à l'envers).
set -e
IN="$1"; NAME="$2"; TOP="${3:-110}"; FLIP="${4:-0}"
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$DIR/../.."
FF="${FFMPEG:-ffmpeg}"
FL=""; [ "$FLIP" = 1 ] && FL="hflip,"
read W H <<<"$($FF -i "$IN" 2>&1 | grep -oP 'Video:.* \K[0-9]{3,4}x[0-9]{3,4}' | head -1 | tr x ' ')"
CH=$(( W * 5 / 4 )); [ $CH -gt $H ] && CH=$H
D=$($FF -i "$IN" 2>&1 | grep -oP 'Duration: \K[0-9:.]+' | awk -F: '{print ($1*3600+$2*60+$3)/0.92}')
OUT_S=$(awk "BEGIN{print $D-0.5}")
$FF -loglevel error -y -i "$IN" -i "$DIR/band.png" -i "$DIR/logo-wm.png" -filter_complex \
 "[0:v]crop=$W:$CH:0:$TOP,${FL}setpts=PTS/0.92,scale=720:900:flags=lanczos,unsharp=5:5:0.5,eq=contrast=1.06:brightness=0.012:saturation=0.93,colorbalance=rs=0.03:gs=0.01:bs=-0.03:rm=0.02:bm=-0.02,vignette=PI/6[v];[v][1:v]overlay=0:H-h[v2];[v2][2:v]overlay=(W-w)/2:H-h-30,fade=t=in:st=0:d=0.4,fade=t=out:st=$OUT_S:d=0.5,format=yuv420p[o]" \
 -map "[o]" -r 30 -an -c:v libx264 -preset slow -crf 25 -movflags +faststart "$ROOT/public/videos/$NAME.mp4"
$FF -loglevel error -y -i "$ROOT/public/videos/$NAME.mp4" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -an "$ROOT/public/videos/$NAME.webm"
for k in 1 2 3; do
  $FF -loglevel error -y -ss "$(awk "BEGIN{print $D*$k/4}")" -i "$ROOT/public/videos/$NAME.mp4" -frames:v 1 -q:v 2 "$ROOT/public/produits/$NAME-$k.jpg"
done
echo "OK : public/videos/$NAME.mp4 et public/produits/$NAME-1..3.jpg"
