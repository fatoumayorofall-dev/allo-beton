/**
 * ALLO BÉTON — Bloc Avis Clients produit
 * Affichage + stats + soumission nouvel avis
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle2, MessageCircle, ThumbsUp, Loader2, X, User } from 'lucide-react';
import { reviewsAPI, Review, ReviewStats } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';

interface Props {
  productId: string;
  productName: string;
}

const EMPTY_STATS: ReviewStats = {
  total: 0,
  average: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export const ProductReviews: React.FC<Props> = ({ productId, productName }) => {
  const { customer } = useEcommerce();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reviewsAPI.list(productId, { limit: 20 });
      if (res.success) {
        setReviews(res.data || []);
        setStats(res.stats || EMPTY_STATS);
      }
    } catch (e) {
      console.error('Erreur chargement avis:', e);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleHelpful = async (id: string) => {
    try {
      await reviewsAPI.markHelpful(id);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, helpful_count: r.helpful_count + 1 } : r))
      );
    } catch { /* silent */ }
  };

  /* ─── Composant stars ─── */
  const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={
            n <= Math.round(value)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-slate-200 text-slate-200'
          }
        />
      ))}
    </div>
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight">
            Avis clients
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {stats.total > 0
              ? `${stats.total} avis · Note moyenne ${stats.average.toFixed(1)}/5`
              : 'Soyez le premier à laisser un avis'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="shop-shine inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-orange-600/25"
        >
          <MessageCircle className="w-4 h-4" />
          Écrire un avis
        </button>
      </div>

      {/* Stats globales */}
      {stats.total > 0 && (
        <div className="grid md:grid-cols-[220px_1fr] gap-8 mb-8 p-6 bg-slate-50 rounded-2xl">
          {/* Note moyenne */}
          <div className="text-center md:border-r md:border-slate-200">
            <div className="text-5xl font-black text-slate-900 tabular-nums">
              {stats.average.toFixed(1)}
            </div>
            <div className="mt-2">
              <Stars value={stats.average} size={18} />
            </div>
            <p className="text-sm text-slate-500 mt-1.5">Sur {stats.total} avis</p>
          </div>

          {/* Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = stats.distribution[n as 1 | 2 | 3 | 4 | 5] || 0;
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600 font-medium w-8">{n}★</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-slate-500 w-10 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste avis */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="pb-6 border-b border-slate-100 last:border-b-0">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-[15px]">{r.customer_name}</span>
                    {r.verified_purchase === 1 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" />
                        Achat vérifié
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">· {formatDate(r.created_at)}</span>
                  </div>
                  <div className="mb-2">
                    <Stars value={r.rating} size={14} />
                  </div>
                  {r.title && (
                    <p className="font-bold text-slate-900 mb-1">{r.title}</p>
                  )}
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.comment}</p>

                  {/* Admin reply */}
                  {r.admin_reply && (
                    <div className="mt-3 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-3">
                      <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-1">
                        Réponse Allô Béton
                      </p>
                      <p className="text-sm text-slate-700">{r.admin_reply}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={() => handleHelpful(r.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Utile {r.helpful_count > 0 && `(${r.helpful_count})`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun avis pour ce produit pour le moment.</p>
          <p className="text-sm text-slate-400 mt-1">Votre avis compte !</p>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ReviewForm
          productId={productId}
          productName={productName}
          defaultName={
            customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : ''
          }
          defaultEmail={customer?.email || ''}
          onClose={() => {
            setShowForm(false);
            setSubmitted(false);
          }}
          onSuccess={() => {
            setSubmitted(true);
            setTimeout(() => {
              setShowForm(false);
              setSubmitted(false);
            }, 2500);
          }}
          submitted={submitted}
        />
      )}
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════
   FORMULAIRE AVIS
   ══════════════════════════════════════════════════════════════ */

interface FormProps {
  productId: string;
  productName: string;
  defaultName: string;
  defaultEmail: string;
  onClose: () => void;
  onSuccess: () => void;
  submitted: boolean;
}

const ReviewForm: React.FC<FormProps> = ({
  productId,
  productName,
  defaultName,
  defaultEmail,
  onClose,
  onSuccess,
  submitted,
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Merci de renseigner votre nom');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Votre commentaire doit contenir au moins 10 caractères');
      return;
    }

    try {
      setSubmitting(true);
      await reviewsAPI.create({
        product_id: productId,
        customer_name: name.trim(),
        customer_email: email.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h3 className="font-display text-xl font-black text-slate-900">Laisser un avis</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="font-black text-xl text-slate-900 mb-2">Merci pour votre avis !</h4>
            <p className="text-slate-500 text-sm">
              Votre avis sera publié après modération par notre équipe.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-5">
            {/* Rating stars */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Votre note <span className="text-orange-600">*</span>
              </label>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={`w-8 h-8 transition-all ${
                        n <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400 scale-110'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm font-bold text-slate-700">
                  {['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Excellent'][hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Votre nom <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                placeholder="Votre nom public"
                required
              />
            </div>

            {/* Email (optionnel) */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Email <span className="text-slate-400 font-normal normal-case">(optionnel, non publié)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                placeholder="votre@email.com"
              />
            </div>

            {/* Title (optionnel) */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Titre <span className="text-slate-400 font-normal normal-case">(optionnel)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                placeholder="Ex: Produit de qualité !"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Votre avis <span className="text-orange-600">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                minLength={10}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                placeholder="Partagez votre expérience avec ce produit..."
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                {comment.length < 10 ? `${10 - comment.length} caractères minimum` : `${comment.length} caractères`}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="shop-shine flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Envoyer mon avis'
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Votre avis sera publié après modération.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
