# Film « Maefa — Bientôt en ligne » (30 s, 1080×1920)

Motion design calé sur une musique originale à 100 BPM (1 temps = 0,6 s) :
révélation du logo → « Quelque chose de beau arrive. » → montage de 8 pièces → promesses → final « Bientôt en ligne ».

Refaire le film :
1. Copier `fonts/`, `maefa-monogramme.svg`, `maefa-nom.svg` à côté de ces fichiers ; préparer `img/` (photos sans le
   bandeau, 1080×1050) et `seq/<vidéo>/001…048.jpg` (48 images à 30 i/s, 720×700) depuis `public/produits` et `public/videos`.
2. `node build.cjs` (index.html), `node render.cjs stills 3.3 12.6 27.3` pour vérifier des images.
3. `python3 music.py` puis `fluidsynth -ni -g 0.7 -r 44100 -F raw.wav FluidR3_GM.sf2 maefa.mid`, mastering ffmpeg (loudnorm −14 LUFS).
4. `node render.cjs video 4` (4 sous-images par image pour le flou de mouvement), puis `./encode.sh`.
