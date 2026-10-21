import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, HandCoins, Loader2, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { answerOffer, fetchChat, fetchChats, sendChat, sendOffer, type Chat, type ChatMessage } from './api';
import { MP, mpPath } from './config';
import { F, ago, priceText } from './format';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';

const OFFER_STATUS: Record<NonNullable<ChatMessage['offer']>['status'], string> = {
  en_attente: 'En attente de réponse',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  remplacee: 'Remplacée par une nouvelle offre',
};

const LoginFirst = () => (
  <div className="max-w-md mx-auto px-4 py-20 text-center">
    <MessageCircle className="w-12 h-12 mx-auto text-ink/30" strokeWidth={1.3} />
    <p className="font-display text-3xl mt-4">Messages</p>
    <p className="text-sm text-ink/70 mt-2">Connectez-vous pour discuter avec les vendeurs et les clients.</p>
    <Link
      to={mpPath(`/compte?retour=${encodeURIComponent(mpPath('/discussions'))}`)}
      className="btn-dark mt-6 inline-flex !h-12 !px-6"
    >
      Me connecter
    </Link>
  </div>
);

/** Mes discussions : comme acheteur (avec les boutiques) et comme vendeur (avec les clients). */
function ChatList() {
  const [chats, setChats] = useState<Chat[] | null>(null);
  useEffect(() => {
    fetchChats().then(r => setChats(r.ok ? r.data.chats : []));
  }, []);
  if (!chats)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-3" data-testid="mp-chats">
      <h1 className="font-display text-3xl">Messages</h1>
      {!chats.length && (
        <p className="text-sm text-ink/70">
          Aucune discussion. Sur un article, touchez « Écrire au vendeur » pour poser une question ou proposer un prix.
        </p>
      )}
      {chats.map(c => (
        <Link
          key={c.id}
          to={mpPath(`/discussions/${c.id}`)}
          className="flex items-center gap-3 bg-white rounded-2xl border border-ink/[0.06] p-3"
          data-testid="mp-chat-item"
        >
          {c.listing?.photo && <img src={c.listing.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />}
          <span className="flex-1 min-w-0">
            <span className="flex items-center justify-between gap-2">
              <strong className="truncate">{c.with}</strong>
              <span className="text-xs text-ink/50 shrink-0">{c.last && ago(c.last.at)}</span>
            </span>
            <span className="block text-xs text-ink/60 truncate">
              {c.role === 'vendeur' ? 'Votre article : ' : ''}
              {c.listing?.title}
            </span>
            <span className={`block text-sm truncate ${c.unread ? 'font-semibold' : 'text-ink/70'}`}>
              {c.last?.text}
            </span>
          </span>
          {c.deal && <span className="text-[11px] font-semibold text-emerald-800 shrink-0">Prix convenu</span>}
          {c.unread > 0 && (
            <span className="min-w-6 h-6 px-1.5 rounded-full bg-wine text-white text-xs font-bold grid place-items-center">
              {c.unread}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** Une discussion : messages, offres de prix (proposer, accepter, refuser, contre-offre), prix convenu. */
function ChatThread({ id }: { id: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [chat, setChat] = useState<Chat | null | 'absent'>(null);
  const [text, setText] = useState('');
  const [offering, setOffering] = useState(params.get('offre') === '1');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(() => fetchChat(id).then(r => setChat(c => (r.ok ? r.data.chat : c ? c : 'absent'))), [id]);
  useEffect(() => {
    load();
    // Nouveaux messages toutes les 6 secondes tant que la discussion est ouverte
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);
  const count = chat && chat !== 'absent' ? (chat.messages?.length ?? 0) : 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  usePageTitle(`Messages · ${MP.name}`);

  if (chat === null)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (chat === 'absent')
    return <p className="max-w-md mx-auto px-4 py-20 text-center text-ink/70">Discussion introuvable.</p>;

  const act = async (fn: () => Promise<{ ok: true; data: { chat: Chat } } | { ok: false; error: string }>) => {
    setBusy(true);
    setError('');
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setChat(r.data.chat);
    return true;
  };
  const me = chat.role;
  const l = chat.listing;
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col min-h-[calc(100vh-10rem)]" data-testid="mp-chat">
      <button
        onClick={() => navigate(mpPath('/discussions'))}
        className="inline-flex items-center gap-1 text-sm text-ink/70"
      >
        <ChevronLeft className="w-4 h-4" /> Messages
      </button>
      {l && (
        <Link
          to={mpPath(`/annonce/${l.id}`)}
          className="mt-2 flex items-center gap-3 bg-white rounded-2xl border border-ink/[0.06] p-3"
        >
          {l.photo && <img src={l.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />}
          <span className="min-w-0">
            <strong className="block">{chat.with}</strong>
            <span className="block text-sm truncate">{l.title}</span>
            <span className="block text-xs text-ink/60">
              {me === 'vendeur' && l.price !== null
                ? `Votre prix : ${F(l.price)}${l.negotiable ? ' (caché, à négocier)' : ''}`
                : priceText(l)}
            </span>
          </span>
        </Link>
      )}
      {chat.deal && (
        <div className="mt-3 rounded-2xl bg-emerald-50 text-emerald-950 p-3 text-sm" data-testid="mp-chat-deal">
          <p className="font-semibold">Prix convenu : {F(chat.deal.amount)}</p>
          <p className="text-xs mt-0.5">
            Valable jusqu'au{' '}
            {new Date(chat.deal.until).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            , pour {chat.deal.qty} article.
          </p>
          {me === 'acheteur' && l && (
            <Link
              to={mpPath(`/annonce/${l.id}`)}
              className="btn-dark !h-10 !px-5 mt-2 inline-flex"
              data-testid="mp-chat-buy"
            >
              Commander à ce prix
            </Link>
          )}
        </div>
      )}

      <div className="flex-1 mt-4 space-y-2" aria-live="polite">
        {!chat.messages?.length && (
          <p className="text-sm text-ink/60 text-center py-6">
            {me === 'acheteur'
              ? 'Posez votre question ou proposez un prix au vendeur.'
              : 'Aucun message pour le moment.'}
          </p>
        )}
        {chat.messages?.map(m => {
          const mine = m.from === me;
          if (m.system)
            return (
              <p key={m.id} className="text-center text-xs text-ink/60 py-1">
                {m.text}
              </p>
            );
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-ink text-ivory rounded-br-sm' : 'bg-white border border-ink/[0.08] rounded-bl-sm'}`}
                data-testid={m.offer ? 'mp-chat-offer' : 'mp-chat-message'}
              >
                {m.offer ? (
                  <>
                    <p className="text-xs opacity-75">{mine ? 'Votre offre' : 'Offre reçue'}</p>
                    <p className="text-xl font-bold">{F(m.offer.amount)}</p>
                    <p className="text-xs opacity-75">{OFFER_STATUS[m.offer.status]}</p>
                    {!mine && m.offer.status === 'en_attente' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={() => act(() => answerOffer(chat.id, m.id, true))}
                          className="h-9 px-4 rounded-full bg-emerald-700 text-white font-semibold"
                          data-testid="mp-offer-yes"
                        >
                          Accepter
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => act(() => answerOffer(chat.id, m.id, false))}
                          className="h-9 px-4 rounded-full border border-ink/20 font-semibold"
                          data-testid="mp-offer-no"
                        >
                          Refuser
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setOffering(true)}
                          className="h-9 px-4 rounded-full border border-ink/20 font-semibold"
                        >
                          Contre-offre
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                )}
                <p className={`text-[10px] mt-1 ${mine ? 'text-ivory/60' : 'text-ink/45'}`}>{ago(m.at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-20 sm:bottom-2 mt-3 bg-[#faf7f5] pt-2 pb-2 space-y-2">
        {error && (
          <p className="text-sm text-wine" role="alert">
            {error}
          </p>
        )}
        {offering ? (
          <form
            className="flex gap-2"
            onSubmit={async e => {
              e.preventDefault();
              const n = Number(amount.replace(/\s/g, ''));
              if (await act(() => sendOffer(chat.id, n))) {
                setAmount('');
                setOffering(false);
              }
            }}
          >
            <input
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d\s]/g, ''))}
              inputMode="numeric"
              placeholder="Votre prix (F CFA)"
              aria-label="Montant de l'offre"
              className="field flex-1"
              autoFocus
              data-testid="mp-offer-amount"
            />
            <button disabled={busy || !amount} className="btn-dark !h-12 !px-5" data-testid="mp-offer-send">
              Proposer
            </button>
            <button type="button" onClick={() => setOffering(false)} className="h-12 px-3 text-sm text-ink/60">
              Annuler
            </button>
          </form>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={async e => {
              e.preventDefault();
              if (await act(() => sendChat(chat.id, text))) setText('');
            }}
          >
            <button
              type="button"
              onClick={() => setOffering(true)}
              aria-label="Proposer un prix"
              className="h-12 px-3 rounded-full border border-ink/15 inline-flex items-center gap-1 text-sm font-semibold shrink-0"
              data-testid="mp-offer-open"
            >
              <HandCoins className="w-4 h-4" /> Prix
            </button>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={500}
              placeholder="Votre message…"
              aria-label="Votre message"
              className="field flex-1"
              data-testid="mp-chat-input"
            />
            <button
              disabled={busy || !text.trim()}
              aria-label="Envoyer"
              className="btn-dark !h-12 !w-12 !px-0"
              data-testid="mp-chat-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        <p className="text-[11px] text-ink/55 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Restez dans l'application : numéros et liens sont bloqués, c'est ce
          qui vous protège (paiement à la livraison, avis, garantie).
        </p>
      </div>
    </div>
  );
}

export default function MpChats() {
  const { id } = useParams();
  const { status } = useAccount();
  usePageTitle(`Messages · ${MP.name}`);
  if (status === 'loading')
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (status !== 'user') return <LoginFirst />;
  return id ? <ChatThread id={id} /> : <ChatList />;
}
