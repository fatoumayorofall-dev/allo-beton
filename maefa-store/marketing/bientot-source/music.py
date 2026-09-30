# Musique originale « Maefa — Bientôt » (ut mineur → mi bémol majeur) — 100 BPM (1 temps = 0,6 s, 1 mesure = 2,4 s), 30 s.
# Mesures (0..11) : 0-1 intro kalimba | 2 drop | 2-9 groove | 10 respiration | 11 final.
import mido

TPB = 480
mid = mido.MidiFile(ticks_per_beat=TPB)
ev = []  # (tick, order, msg)

def at(beat): return int(round(beat * TPB))
def note(ch, beat, dur, pitch, vel):
    ev.append((at(beat), 1, mido.Message('note_on', channel=ch, note=pitch, velocity=max(1, min(127, int(vel))))))
    ev.append((at(beat + dur), 0, mido.Message('note_off', channel=ch, note=pitch, velocity=0)))
def cc(ch, beat, num, val): ev.append((at(beat), 0, mido.Message('control_change', channel=ch, control=num, value=int(val))))
def prog(ch, p): ev.append((0, 0, mido.Message('program_change', channel=ch, program=p)))

PIANO, STR, PAD, BASS, KAL, REV, HARP, VIB, DR = 0, 1, 2, 3, 4, 5, 6, 7, 9
for ch, p in [(PIANO, 0), (STR, 49), (PAD, 89), (BASS, 33), (KAL, 108), (REV, 119), (HARP, 46), (VIB, 11)]: prog(ch, p)
for ch, rv, vol in [(PIANO, 70, 100), (STR, 95, 92), (PAD, 90, 70), (BASS, 25, 108), (KAL, 85, 118), (REV, 60, 80), (HARP, 105, 90), (VIB, 90, 70), (DR, 35, 110)]:
    cc(ch, 0, 91, rv); cc(ch, 0, 7, vol); cc(ch, 0, 11, 127)
cc(PAD, 0, 93, 60); cc(STR, 0, 93, 40)

CH = {  # basse, voicing
    'Cm9': (36, [58, 62, 63, 67]), 'Abm7': (44, [60, 63, 67, 68]), 'Eb': (39, [58, 62, 63, 67]),
    'Bb6': (46, [58, 62, 65, 67]), 'Fm9': (41, [56, 60, 63, 67]), 'Gs': (43, [60, 62, 65, 67]),
}
BARS = ['Cm9', 'Abm7', 'Cm9', 'Abm7', 'Eb', 'Bb6', 'Cm9', 'Abm7', 'Fm9', 'Gs', 'Abm7', 'Eb']

# ── Cordes + nappe : accords tenus, « pompe » façon sidechain pendant le groove
for b, name in enumerate(BARS):
    bass, v = CH[name]; s = 4 * b
    if b == 10:  # respiration : Db puis Eb9sus (tension avant le final)
        for n in CH['Abm7'][1]: note(STR, s, 2, n, 46); note(PAD, s, 2, n - 12, 40)
        for n in CH['Gs'][1]: note(STR, s + 2, 2, n, 52); note(PAD, s + 2, 2, n - 12, 44)
        continue
    dur = 8 if b == 11 else 4
    for n in v: note(STR, s, dur, n, 52 if b < 2 else 58); note(PAD, s, dur, n - 12, 42)
    note(STR, s, dur, v[-1] + 12, 40 if b < 11 else 55)
for b in range(2, 10):
    for k in range(4):
        t = 4 * b + k
        for ch in (STR, PAD):
            cc(ch, t, 11, 62); cc(ch, t + .12, 11, 88); cc(ch, t + .25, 11, 106); cc(ch, t + .45, 11, 120)
for ch in (STR, PAD):
    for i in range(16): cc(ch, 40 + i * .25, 11, 84 + i * 2.7)
    cc(ch, 44, 11, 127)
# crescendo d'intro
for i in range(17): cc(STR, i * .5, 11, 70 + i * 3.5); cc(PAD, i * .5, 11, 70 + i * 3.5)

# ── Piano
cc(PIANO, 0, 64, 127)
for b in (0, 1):
    for i, n in enumerate(CH[BARS[b]][1]): note(PIANO, 4 * b + i * .08, 3.9, n, 44)
    note(PIANO, 4 * b, 3.9, CH[BARS[b]][0], 40)
cc(PIANO, 7.95, 64, 0)
STAB = [(0, .4, 60), (1.5, .35, 54), (2.5, .4, 58), (3.5, .3, 50)]
for b in range(2, 10):
    for (o, d, vel) in STAB:
        for n in CH[BARS[b]][1]: note(PIANO, 4 * b + o, d, n, vel)
cc(PIANO, 40, 64, 127)
for i, n in enumerate(CH['Abm7'][1]): note(PIANO, 40 + i * .1, 1.9, n, 38)
for i, n in enumerate(CH['Gs'][1]): note(PIANO, 42 + i * .1, 1.9, n, 42)
cc(PIANO, 43.95, 64, 0); cc(PIANO, 44, 64, 127)
for n in [27, 39] + CH['Eb'][1] + [70, 79]: note(PIANO, 44, 6, n, 76)
for n in CH['Eb'][1]: note(STR, 44, 6, n + 12, 66)

# ── Kalimba (motif signature)
MOT = {  # motif « Bientôt » : montée pentatonique, réponse descendante
    'Cm9': [(0, 72, .5), (.5, 75, .5), (1, 79, .75), (1.75, 77, .25), (2, 75, .5), (2.5, 79, .5), (3, 82, 1)],
    'Abm7': [(0, 79, .5), (.5, 77, .5), (1, 75, 1), (2, 72, .5), (2.5, 75, .5), (3, 72, 1)],
    'Eb': [(0, 75, .5), (.5, 79, .5), (1, 82, .75), (1.75, 84, .25), (2, 82, .5), (2.5, 79, .5), (3, 77, 1)],
    'Bb6': [(0, 74, .5), (.5, 77, .5), (1, 79, 1.5), (2.5, 77, .5), (3, 74, 1)],
}
for b in (0, 1, 4, 5, 6, 7):
    for (o, n, d) in MOT[BARS[b]]: note(KAL, 4 * b + o, d, n, 96 if b < 2 else 84)
for (o, n, d) in [(0, 72, .5), (.5, 75, .5), (1, 79, .5), (1.5, 80, 1.5), (3, 79, .5), (3.5, 74, .5)]: note(KAL, 40 + o, d, n, 72)
for i, n in enumerate([75, 79, 82, 87, 91]): note(KAL, 44 + .5 + i * .25, 3, n, 90 - i * 4)

# ── Harpe : glissandos aux grandes entrées
def gliss(beat, notes, step=.045, vel=52):
    for i, n in enumerate(notes): note(HARP, beat - step * len(notes) + i * step, 2.5, n, vel)
PENTA = [n for n in range(52, 93) if n % 12 in (0, 3, 5, 7, 10)]
gliss(8, PENTA[:14]); gliss(24, PENTA[4:18], vel=46); gliss(32, PENTA[2:16], vel=48); gliss(44, PENTA, vel=58)
# vibraphone : éclats sur la carte finale
for i, n in enumerate([79, 82, 87, 91]): note(VIB, 45 + i * .5, 2, n, 60)

# ── Montées (cymbale inversée) avant les grandes entrées
for end in (8, 24, 32, 44):
    note(REV, end - 2.25, 2.4, 60, 92); note(REV, end - 3.37, 3.5, 53, 70)

# ── Basse
for b in range(2, 10):
    r = CH[BARS[b]][0]
    for (o, d, dn, vel) in [(0, .7, 0, 104), (.75, .2, 0, 70), (1.5, .45, 12, 84), (2.5, .45, 0, 96), (3.25, .45, 7, 82)]:
        note(BASS, 4 * b + o, d, r + dn, vel)
note(BASS, 40, 2, 44, 90); note(BASS, 42, 2, 43, 92); note(BASS, 44, 6, 39, 100); note(BASS, 44, 6, 27, 80)

# ── Batterie (canal 10) : house feutrée + congas (clin d'œil au sabar)
KICK, CLAP, CHH, OHH, SHK, CRASH, MHC, OHC, LC = 36, 39, 42, 46, 82, 49, 62, 63, 64
note(DR, 8, 1, CRASH, 92); note(DR, 24, 1, CRASH, 80); note(DR, 32, 1, CRASH, 86); note(DR, 44, 2, CRASH, 100); note(DR, 44, 2, 57, 80)
for b in range(2, 10):
    s = 4 * b
    for k in range(4): note(DR, s + k, .25, KICK, 108 if k == 0 else 100)
    if b >= 3:
        for k in (1, 3): note(DR, s + k, .25, CLAP, 74)
    for k in range(4): note(DR, s + k + .5, .2, CHH, 62)
    if b >= 6:
        for k in range(4): note(DR, s + k + .25, .1, CHH, 30); note(DR, s + k + .75, .1, CHH, 34)
    if b >= 4:
        if b % 2: note(DR, s + 3.5, .4, OHH, 48)
        for i in range(16): note(DR, s + i * .25, .12, SHK, 44 if i % 2 else 30)
        for st, n, v in [(2, MHC, 58), (3, OHC, 66), (6, LC, 62), (7, OHC, 60), (10, MHC, 56), (11, OHC, 64), (14, LC, 66)]:
            note(DR, s + st * .25, .2, n, v)
# relance avant la respiration
for i, n in enumerate([LC, OHC, MHC, OHC, LC, OHC, MHC, OHC]): note(DR, 38 + i * .25, .2, n, 60 + i * 6)
note(DR, 44, .5, KICK, 115)
for k in range(8): note(DR, 40 + k * .5, .12, SHK, 26 + k * 3)

# ── Écriture
tr = mido.MidiTrack(); mid.tracks.append(tr)
tr.append(mido.MetaMessage('set_tempo', tempo=600000, time=0))
ev.sort(key=lambda e: (e[0], e[1]))
last = 0
for t, _, m in ev:
    tr.append(m.copy(time=t - last)); last = t
tr.append(mido.MetaMessage('end_of_track', time=at(52) - last if at(52) > last else 0))
mid.save(__file__.replace('music.py', 'maefa.mid'))
print('ok', len(ev), 'événements')
