import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, MessageCircle } from 'lucide-react';
import { Stars } from './Stars';
import { useAccount, readToken } from '../context/AccountContext';
import { fetchComments, postComment, type CommentSummary, type ProductComment } from '../services/api';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Avis et questions d'une pièce, chargés depuis le serveur (partagés entre toutes les visiteuses). */
export function useProductComments(productId: string | undefined) {
  const [comments, setComments] = useState<ProductComment[] | null>(null);
  const [summary, setSummary] = useState<CommentSummary>({ count: 0, rated: 0, average: null });
  useEffect(() => {
    if (!productId) return;
    let alive = true;
    setComments(null);
    fetchComments(productId).then(r => {
      if (!alive) return;
      if (r.ok) {
        setComments(r.data.comments);
        setSummary(r.data.summary);
      } else setComments([]);
    });
    return () => {
      alive = false;
    };
  }, [productId]);
  const add = useCallback(
    async (body: { author: string; text: string; rating: number | null }) => {
      if (!productId) return { ok: false, error: 'Pièce inconnue' };
      const r = await postComment(productId, body, readToken());
      if (!r.ok) return { ok: false, error: r.error };
      setComments(list => [r.data.comment, ...(list ?? [])]);
      setSummary(r.data.summary);
      return { ok: true };
    },
    [productId],
  );
  return { comments, summary, add };
}

const CommentForm: React.FC<{
  onSubmit: (b: { author: string; text: string; rating: number | null }) => Promise<{ ok: boolean; error?: string }>;
}> = ({ onSubmit }) => {
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (user?.firstName && !author) setAuthor(`${user.firstName}${user.lastName ? ` ${user.lastName[0]}.` : ''}`);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-outline !h-11 !px-6 mt-2" data-testid="comment-open">
        <MessageCircle className="w-4 h-4" /> Donner mon avis ou poser une question
      </button>
    );
  return (
    <form
      className="space-y-4 mt-2 p-5 bg-white border border-ink/[0.07] rounded-3xl shadow-soft"
      data-testid="comment-form"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const r = await onSubmit({ author: author.trim(), text: text.trim(), rating });
        setBusy(false);
        if (!r.ok) return setError(r.error ?? 'Une erreur est survenue');
        setOpen(false);
        setText('');
        setRating(null);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="field-label !mb-0">Votre note (facultative)</span>
        <Stars rating={rating ?? 0} size={20} onRate={setRating} />
      </div>
      <input
        required
        minLength={2}
        value={author}
        onChange={e => setAuthor(e.target.value)}
        placeholder="Prénom et initiale (ex : Awa D.)"
        aria-label="Votre prénom"
        maxLength={40}
        className="field"
      />
      <textarea
        required
        minLength={3}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder="Votre avis, ou votre question (taille, couleur, matière…)"
        aria-label="Votre message"
        className="field resize-none"
      />
      <p className="text-[11px] text-ink/60">
        Votre message sera visible par toutes les clientes. Les liens et les numéros de téléphone ne sont pas acceptés.
      </p>
      {error && (
        <p className="text-sm text-wine" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-outline !h-11 flex-1">
          Annuler
        </button>
        <button className="btn-dark !h-11 flex-1" disabled={busy} data-testid="comment-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
        </button>
      </div>
    </form>
  );
};

/** Liste des avis et questions + formulaire. */
export const ProductComments: React.FC<{ state: ReturnType<typeof useProductComments> }> = ({ state }) => {
  const { comments, summary, add } = state;
  if (!comments)
    return (
      <div className="py-6 grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-ink/40" />
      </div>
    );
  return (
    <div data-testid="product-comments">
      {summary.average !== null ? (
        <div className="flex items-center gap-4 mb-5">
          <span className="font-display text-5xl text-ink">{summary.average.toFixed(1)}</span>
          <span>
            <Stars rating={summary.average} size={15} />
            <span className="block text-xs mt-1">
              {summary.rated} note{summary.rated > 1 ? 's' : ''} · {summary.count} message{summary.count > 1 ? 's' : ''}
            </span>
          </span>
        </div>
      ) : (
        !comments.length && (
          <p className="mb-5">
            Pas encore d'avis sur cette pièce : soyez la première à donner le vôtre ou à poser une question.
          </p>
        )
      )}
      {comments.length > 0 && (
        <ul className="space-y-5 mb-6">
          {comments.slice(0, 20).map(c => (
            <li key={c.id} className="pb-5 border-b border-ink/5 last:border-0" data-testid="comment">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-ink text-[13px] inline-flex items-center gap-1.5">
                  {c.author}
                  {c.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 rounded-full px-2 py-0.5">
                      <BadgeCheck className="w-3 h-3" /> Cliente vérifiée
                    </span>
                  )}
                </strong>
                {c.rating && <Stars rating={c.rating} size={11} />}
              </div>
              <p className="mt-2 whitespace-pre-line">{c.text}</p>
              <p className="text-[11px] text-ink/60 mt-1.5">{day(c.createdAt)}</p>
              {c.reply && (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-gold/50" data-testid="comment-reply">
                  <p className="text-[12px] font-semibold text-ink">Réponse de Maefa</p>
                  <p className="mt-1 whitespace-pre-line">{c.reply.text}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <CommentForm onSubmit={add} />
    </div>
  );
};
