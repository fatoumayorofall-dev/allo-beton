/**
 * Vidéo des lives, sans service extérieur :
 *  - le téléphone de la vendeuse enregistre des morceaux de 3 s, chacun lisible seul, et les envoie ;
 *  - le téléphone de la cliente les lit à la suite, sans coupure (Media Source, mode « séquence »),
 *    ou un par un si le navigateur ne sait pas faire autrement.
 */
import { liveSegmentUrl, uploadLiveSegment } from './api';

/** Durée d'un morceau : court = peu de retard ; long = moins d'envois */
export const SEGMENT_MS = 3000;
/**
 * Qualité choisie par la vendeuse : données utilisées par heure de live (envoi chez elle, réception chez
 * chaque spectatrice). « Économie » pour un réseau faible, « HD » sur wifi.
 */
export const QUALITIES = {
  eco: { label: 'Économie', video: 250_000, width: 360, height: 640, perHour: '≈ 120 Mo/h' },
  normale: { label: 'Normale', video: 450_000, width: 480, height: 854, perHour: '≈ 200 Mo/h' },
  hd: { label: 'HD', video: 900_000, width: 720, height: 1280, perHour: '≈ 400 Mo/h' },
} as const;
export type Quality = keyof typeof QUALITIES;
const AUDIO_BPS = 32_000;
const RECORD_MIMES = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
];

export const canGoLive = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!pickRecordMime();
export function pickRecordMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return RECORD_MIMES.find(m => MediaRecorder.isTypeSupported(m)) ?? null;
}

/** Caméra et micro du téléphone (avant ou arrière), en format portrait */
export const openCamera = (facing: 'user' | 'environment', quality: Quality = 'normale') =>
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: facing,
      width: { ideal: QUALITIES[quality].width },
      height: { ideal: QUALITIES[quality].height },
      frameRate: { ideal: 24, max: 30 },
    },
    audio: { echoCancellation: true, noiseSuppression: true },
  });

export type RecorderEvent =
  | { kind: 'envoye'; seq: number; viewers: number }
  | { kind: 'lent' }
  | { kind: 'erreur'; error: string }
  | { kind: 'termine'; error: string };

export class LiveRecorder {
  private stream: MediaStream | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private current: MediaRecorder | null = null;
  private queue: Blob[] = [];
  private sending = false;
  private readonly mime = pickRecordMime() ?? 'video/webm';

  constructor(
    private readonly liveId: string,
    private readonly onEvent: (e: RecorderEvent) => void,
    private quality: Quality = 'normale',
  ) {}
  /** Qualité changée pendant le live : utilisée dès le morceau suivant */
  setQuality(q: Quality) {
    this.quality = q;
  }

  start(stream: MediaStream) {
    this.stream = stream;
    this.running = true;
    this.segment();
  }
  /** Caméra changée : utilisée dès le morceau suivant */
  setStream(stream: MediaStream) {
    this.stream = stream;
  }
  stop() {
    this.running = false;
    clearTimeout(this.timer);
    if (this.current && this.current.state !== 'inactive') this.current.stop();
  }

  /** Un morceau = un enregistrement complet ; le suivant démarre avant l'arrêt du précédent (pas de trou) */
  private segment() {
    if (!this.stream) return;
    const rec = new MediaRecorder(this.stream, {
      mimeType: this.mime,
      videoBitsPerSecond: QUALITIES[this.quality].video,
      audioBitsPerSecond: AUDIO_BPS,
    });
    const parts: Blob[] = [];
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => parts.length && this.push(new Blob(parts, { type: this.mime }));
    rec.start();
    this.current = rec;
    this.timer = setTimeout(() => {
      if (this.running) this.segment();
      rec.stop();
    }, SEGMENT_MS);
  }

  private push(blob: Blob) {
    this.queue.push(blob);
    // Réseau trop lent : on garde les morceaux les plus récents (le direct d'abord)
    if (this.queue.length > 3) {
      this.queue.splice(0, this.queue.length - 2);
      this.onEvent({ kind: 'lent' });
    }
    this.send();
  }
  private async send() {
    if (this.sending) return;
    this.sending = true;
    while (this.queue.length) {
      const r = await uploadLiveSegment(this.liveId, this.queue.shift()!);
      if (r.ok) this.onEvent({ kind: 'envoye', seq: r.data.seq, viewers: r.data.viewers });
      else if ([403, 404, 409].includes(r.status)) {
        this.stop();
        this.queue = [];
        this.onEvent({ kind: 'termine', error: r.error });
      } else this.onEvent({ kind: 'erreur', error: r.error });
    }
    this.sending = false;
  }
}

/** « video/webm;codecs=vp8,opus » → « video/webm; codecs="vp8,opus" » (forme attendue par Media Source) */
export const mseType = (mime: string) =>
  mime.replace(/;\s*codecs="?([^"]+)"?/i, (_m, c: string) => `; codecs="${c.replace(/\s+/g, '')}"`);

export type PlayerState = 'chargement' | 'lecture' | 'illisible';

/** Lecture d'un live : suit le dernier morceau reçu par le serveur et reste près du direct. */
export class LivePlayer {
  private next = 0;
  private latest = 0;
  private busy = false;
  private stopped = false;
  private mode: 'mse' | 'simple' | 'aucun' = 'aucun';
  private sb: SourceBuffer | null = null;
  private queue: string[] = [];
  private ready: Promise<void>;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly liveId: string,
    private readonly mime: string,
    private readonly onState: (s: PlayerState) => void,
  ) {
    this.ready = this.init();
  }

  private async init() {
    const type = mseType(this.mime);
    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(type)) {
      const ms = new MediaSource();
      this.video.src = URL.createObjectURL(ms);
      await new Promise(r => ms.addEventListener('sourceopen', r, { once: true }));
      this.sb = ms.addSourceBuffer(type);
      this.sb.mode = 'sequence';
      this.mode = 'mse';
    } else if (this.video.canPlayType(this.mime.split(';')[0])) {
      this.mode = 'simple';
      this.video.addEventListener('ended', () => this.playQueued());
    } else {
      this.onState('illisible');
    }
  }

  /** Nouveau morceau annoncé par le serveur */
  setLatest(seq: number) {
    this.latest = seq;
    // On commence un morceau avant le dernier (un peu de réserve) ; trop en retard : on saute au direct
    if (!this.next || this.latest - this.next > 4) this.next = Math.max(1, seq - 1);
    this.pump();
  }
  destroy() {
    this.stopped = true;
    for (const u of this.queue) URL.revokeObjectURL(u);
    this.video.removeAttribute('src');
    this.video.load();
  }

  private async pump() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      await this.ready;
      while (!this.stopped && this.mode !== 'aucun' && this.next && this.next <= this.latest) {
        const res = await fetch(liveSegmentUrl(this.liveId, this.next)).catch(() => null);
        if (!res?.ok) {
          // Morceau déjà effacé (trop de retard) : on reprend au direct ; pas encore là : on attend
          if (res?.status === 404 && this.next < this.latest - 1) this.next = this.latest - 1;
          else break;
          continue;
        }
        const buf = await res.arrayBuffer();
        this.next += 1;
        if (this.mode === 'mse') await this.append(buf);
        else this.enqueue(buf);
      }
    } catch {
      // Données illisibles par Media Source : lecture morceau par morceau
      if (this.mode === 'mse' && this.video.canPlayType(this.mime.split(';')[0])) {
        this.mode = 'simple';
        this.sb = null;
        this.video.removeAttribute('src');
        this.video.addEventListener('ended', () => this.playQueued());
      } else this.onState('illisible');
    }
    this.busy = false;
  }

  private async append(buf: ArrayBuffer) {
    const sb = this.sb!;
    await new Promise<void>((resolve, reject) => {
      sb.addEventListener('updateend', () => resolve(), { once: true });
      sb.addEventListener('error', () => reject(new Error('lecture')), { once: true });
      sb.appendBuffer(buf);
    });
    const v = this.video;
    const end = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
    // Rester près du direct (moins de 7 s de retard)
    if (end - v.currentTime > 7) v.currentTime = end - 2;
    // Ne pas garder plus de 30 s de vidéo en mémoire
    if (v.currentTime > 40 && !sb.updating)
      await new Promise<void>(resolve => {
        sb.addEventListener('updateend', () => resolve(), { once: true });
        sb.remove(0, v.currentTime - 30);
      });
    if (v.paused) v.play().catch(() => {});
    this.onState('lecture');
  }

  private enqueue(buf: ArrayBuffer) {
    this.queue.push(URL.createObjectURL(new Blob([buf], { type: this.mime.split(';')[0] })));
    if (this.queue.length > 3) URL.revokeObjectURL(this.queue.shift()!);
    if (this.video.paused || this.video.ended) this.playQueued();
  }
  private playQueued() {
    const u = this.queue.shift();
    if (!u) return;
    const old = this.video.src;
    this.video.src = u;
    this.video.play().catch(() => {});
    if (old.startsWith('blob:')) URL.revokeObjectURL(old);
    this.onState('lecture');
  }
}
