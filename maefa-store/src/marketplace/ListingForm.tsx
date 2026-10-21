import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Clapperboard, ImagePlus, Loader2, X } from 'lucide-react';
import {
  createListing,
  updateListing,
  uploadPhoto,
  uploadVideo,
  type ListingInput,
  type PriceMode,
  type MpCategory,
  type MyListing,
} from './api';
import { shrinkPhoto } from './photo';

/** Ajout ou modification d'un article par le vendeur (photos prises au téléphone). */
export const ListingForm: React.FC<{
  categories: MpCategory[];
  initial?: MyListing;
  onDone: (l: MyListing) => void;
  onCancel: () => void;
}> = ({ categories, initial, onDone, onCancel }) => {
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [video, setVideo] = useState<string | null>(initial?.video ?? null);
  const [videoBusy, setVideoBusy] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [priceMode, setPriceMode] = useState<PriceMode>(initial?.priceMode ?? 'affiche');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [condition, setCondition] = useState<'neuf' | 'occasion'>(initial?.condition ?? 'neuf');
  const [stock, setStock] = useState(
    initial?.stock === null || initial?.stock === undefined ? '' : String(initial.stock),
  );
  const [variantLabel, setVariantLabel] = useState(initial?.variantLabel ?? '');
  const [variants, setVariants] = useState((initial?.variants ?? []).join(', '));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const list = [...files].slice(0, 6 - photos.length);
    setUploading(n => n + list.length);
    for (const f of list) {
      const r = await uploadPhoto(await shrinkPhoto(f));
      setUploading(n => n - 1);
      if (r.ok) setPhotos(p => [...p, r.data.url].slice(0, 6));
      else setError(r.error);
    }
  };
  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 40 * 1024 * 1024)
      return setError('Vidéo trop lourde : 40 Mo au plus (environ 1 minute). Filmez plus court.');
    setError('');
    setVideoBusy(true);
    const r = await uploadVideo(file);
    setVideoBusy(false);
    if (r.ok) setVideo(r.data.url);
    else setError(r.error);
  };
  const moveTo = (i: number, d: -1 | 1) =>
    setPhotos(p => {
      const n = [...p];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body: ListingInput = {
      title: title.trim(),
      price: Number(price.replace(/\s/g, '')),
      priceMode,
      category,
      condition,
      photos,
      video,
      stock: stock.trim() === '' ? null : Number(stock),
      variantLabel: variants.trim() ? variantLabel.trim() : '',
      variants: variants
        .split(/[,;]/)
        .map(v => v.trim())
        .filter(Boolean),
      description,
    };
    const r = initial ? await updateListing(initial.id, body) : await createListing(body);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDone(r.data.listing);
  };

  return (
    <form
      onSubmit={save}
      className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-4"
      data-testid="mp-listing-form"
    >
      <h2 className="font-display text-2xl">{initial ? "Modifier l'article" : 'Nouvel article'}</h2>
      <div>
        <p className="field-label">Photos (6 au plus, la première est la principale)</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p} className="relative w-24 h-24 rounded-xl overflow-hidden bg-ivory">
              <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos(ps => ps.filter(x => x !== p))}
                aria-label={`Retirer la photo ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 grid place-items-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 inset-x-1 flex justify-between">
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => moveTo(i, -1)}
                    aria-label="Avancer"
                    className="w-6 h-6 rounded-full bg-white/90 grid place-items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span />
                )}
                {i < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveTo(i, 1)}
                    aria-label="Reculer"
                    className="w-6 h-6 rounded-full bg-white/90 grid place-items-center"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div key={`u${i}`} className="w-24 h-24 rounded-xl bg-ivory grid place-items-center">
              <Loader2 className="w-5 h-5 animate-spin text-ink/40" />
            </div>
          ))}
          {photos.length + uploading < 6 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-ink/20 grid place-items-center text-ink/60 text-xs"
            >
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="w-6 h-6" /> Ajouter
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            data-testid="mp-photo-input"
            onChange={e => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div>
        <p className="field-label">Vidéo (facultative, façon TikTok : 1 minute au plus)</p>
        {video ? (
          <div className="flex items-center gap-3">
            <video src={video} muted playsInline className="w-24 h-32 rounded-xl object-cover bg-black" />
            <button
              type="button"
              onClick={() => setVideo(null)}
              className="h-10 px-4 rounded-full border border-ink/15 text-sm"
            >
              Retirer la vidéo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={videoBusy}
            className="h-12 px-5 rounded-xl border-2 border-dashed border-ink/20 text-sm text-ink/70 inline-flex items-center gap-2"
          >
            {videoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
            {videoBusy ? 'Envoi de la vidéo…' : 'Ajouter une vidéo'}
          </button>
        )}
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          hidden
          data-testid="mp-video-input"
          onChange={e => {
            addVideo(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="text-[11px] text-ink/60 mt-1">
          Les articles avec vidéo apparaissent dans le fil « Pour vous » et se vendent mieux.
        </p>
      </div>
      <label className="block">
        <span className="field-label">Titre *</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={90}
          placeholder="Ex. : Robe wax longue, taille ajustable"
          className="field"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Prix (F CFA) *</span>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="12000"
            className="field"
          />
        </label>
        <label className="block">
          <span className="field-label">Quantité en stock</span>
          <input
            value={stock}
            onChange={e => setStock(e.target.value)}
            inputMode="numeric"
            placeholder="Vide = pas de limite"
            className="field"
          />
        </label>
      </div>
      <fieldset className="space-y-2" data-testid="mp-price-mode">
        <legend className="field-label">Affichage du prix</legend>
        {(
          [
            ['affiche', 'Afficher le prix', 'Les clients voient le prix et commandent directement.'],
            [
              'negocier',
              'Prix caché, à négocier',
              'Les clients voient une fourchette (ex. : 20 000 – 30 000 F) et vous font une offre dans la messagerie. Ils commandent au prix convenu.',
            ],
          ] as [PriceMode, string, string][]
        ).map(([id, label, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={priceMode === id}
            onClick={() => setPriceMode(id)}
            data-testid={`mp-price-${id}`}
            className={`w-full text-left p-3 rounded-2xl border-2 ${priceMode === id ? 'border-ink bg-ivory' : 'border-ink/10'}`}
          >
            <span className="font-semibold text-sm">{label}</span>
            <span className="block text-xs text-ink/70 mt-0.5">{text}</span>
          </button>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Rayon *</span>
          <select value={category} onChange={e => setCategory(e.target.value)} className="field">
            <option value="">Choisir…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="field-label">État *</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['neuf', 'occasion'] as const).map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={condition === c}
                onClick={() => setCondition(c)}
                className={`h-12 rounded-xl border text-sm font-semibold ${condition === c ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
              >
                {c === 'neuf' ? 'Neuf' : 'Occasion'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <label className="block">
          <span className="field-label">Choix</span>
          <input
            value={variantLabel}
            onChange={e => setVariantLabel(e.target.value)}
            placeholder="Taille"
            className="field"
          />
        </label>
        <label className="block">
          <span className="field-label">Possibilités (séparées par des virgules)</span>
          <input
            value={variants}
            onChange={e => setVariants(e.target.value)}
            placeholder="S, M, L, XL"
            className="field"
          />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          maxLength={1500}
          placeholder="Matière, dimensions, état, conseils…"
          className="field resize-none"
        />
      </label>
      <p className="text-xs text-ink/65 bg-ivory rounded-xl p-3">
        Chaque article est vérifié avant d'être visible. Refusés : contrefaçons (faux logos de grandes marques), objets
        interdits, photos qui ne montrent pas le vrai article.
      </p>
      {error && (
        <p className="text-sm text-wine" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onCancel} className="btn-outline !h-12">
          Annuler
        </button>
        <button disabled={busy || uploading > 0 || videoBusy} className="btn-dark !h-12" data-testid="mp-listing-save">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Enregistrer' : 'Envoyer pour vérification'}
        </button>
      </div>
    </form>
  );
};
