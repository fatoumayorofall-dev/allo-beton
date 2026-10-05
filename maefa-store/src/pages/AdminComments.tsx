import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { Stars } from '../components/Stars';
import { useStore } from '../context/StoreContext';
import { deleteComment, fetchAdminComments, patchComment, type AdminComment } from '../services/api';

/**
 * Avis et questions des clientes : la gérante répond (la réponse est visible sous le message),
 * masque un message déplacé ou le supprime.
 */
export const CommentsTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { products, notify } = useStore();
  const [list, setList] = useState<AdminComment[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(() => fetchAdminComments(pin).then(r => setList(r.ok ? r.data.comments : [])), [pin]);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (c: AdminComment, patch: { status?: 'publie' | 'masque'; reply?: string }) => {
    setBusy(c.id);
    const r = await patchComment(pin, c.id, patch);
    setBusy('');
    if (!r.ok) return notify(r.error, 'error');
    setList(l => (l ?? []).map(x => (x.id === c.id ? r.data.comment : x)));
    if (patch.reply !== undefined) notify(patch.reply ? 'Réponse publiée' : 'Réponse retirée');
  };
  const remove = async (c: AdminComment) => {
    if (!window.confirm('Supprimer définitivement ce message ?')) return;
    const r = await deleteComment(pin, c.id);
    if (!r.ok) return notify(r.error, 'error');
    setList(l => (l ?? []).filter(x => x.id !== c.id));
  };

  if (!list)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  const name = (id: string) => products.find(p => p.id === id)?.name ?? id;
  const unanswered = list.filter(c => !c.reply && c.status === 'publie').length;

  return (
    <div className="space-y-5" data-testid="comments-tab">
      <div className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
        <h2 className="font-display text-3xl">Avis et questions</h2>
        <p className="text-sm text-ink/70 mt-2 max-w-2xl">
          Ce que les clientes écrivent sous les pièces, visible par toutes. Répondez aux questions : une réponse rapide
          rassure toutes celles qui lisent. {unanswered > 0 && <strong>{unanswered} sans réponse.</strong>}
        </p>
      </div>
      {!list.length && <p className="text-sm text-ink/70 px-2">Aucun message pour le moment.</p>}
      {list.map(c => (
        <article
          key={c.id}
          className={`bg-white rounded-[1.5rem] border p-5 space-y-3 ${c.status === 'masque' ? 'border-ink/10 opacity-60' : 'border-ink/[0.06]'}`}
          data-testid="admin-comment"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <strong>{c.author}</strong>
              {c.verified && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
                  <BadgeCheck className="w-3 h-3" /> Cliente vérifiée
                </span>
              )}
              <span className="text-ink/60">
                {' '}
                · {name(c.productId)} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </p>
            {c.rating && <Stars rating={c.rating} size={12} />}
          </div>
          <p className="text-sm whitespace-pre-line">{c.text}</p>
          <textarea
            value={drafts[c.id] ?? c.reply?.text ?? ''}
            onChange={e => setDrafts(d => ({ ...d, [c.id]: e.target.value }))}
            rows={2}
            maxLength={600}
            placeholder="Votre réponse (visible sous le message)"
            aria-label={`Réponse à ${c.author}`}
            className="field-sm w-full resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => update(c, { reply: drafts[c.id] ?? c.reply?.text ?? '' })}
              disabled={busy === c.id}
              data-testid="comment-reply-save"
              className="px-4 h-10 rounded-full bg-ink text-ivory text-sm font-semibold"
            >
              Publier la réponse
            </button>
            <button
              onClick={() => update(c, { status: c.status === 'publie' ? 'masque' : 'publie' })}
              disabled={busy === c.id}
              data-testid="comment-toggle"
              className="px-4 h-10 rounded-full border border-ink/15 text-sm inline-flex items-center gap-2"
            >
              {c.status === 'publie' ? (
                <>
                  <EyeOff className="w-4 h-4" /> Masquer
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Republier
                </>
              )}
            </button>
            <button
              onClick={() => remove(c)}
              className="px-4 h-10 rounded-full border border-wine/30 text-wine text-sm inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};

export default CommentsTab;
