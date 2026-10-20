import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Package, Store } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { Login, NameStep } from '../pages/Account';
import { FaceIdPanel } from '../components/FaceIdPanel';
import { MP, mpPath } from './config';
import { usePageTitle } from '../utils/usePageTitle';

/**
 * Compte : connexion par numéro (code WhatsApp, code secret ou Face ID), le même compte que la boutique.
 * Après la connexion (et le prénom pour un nouveau compte), retour à la page demandée (?retour=…).
 */
export default function MpAccount() {
  usePageTitle(`Mon compte · ${MP.name}`);
  const { status, user, logout } = useAccount();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [naming, setNaming] = useState(false);
  const back = params.get('retour');
  const done = () => {
    setNaming(false);
    if (back?.startsWith(MP.base)) navigate(back, { replace: true });
  };

  if (status !== 'user' || !user || naming)
    return (
      <div className="max-w-md mx-auto px-4 pt-8" data-testid="mp-login">
        <div className="bg-white rounded-3xl border border-ink/[0.06] p-6">
          {naming ? (
            <NameStep onDone={done} />
          ) : (
            <Login brand={MP.name} onDone={isNew => (isNew ? setNaming(true) : done())} />
          )}
        </div>
      </div>
    );

  const local = user.phone.replace(/^\+221/, '');
  return (
    <div className="max-w-xl mx-auto px-4 pt-6 space-y-4" data-testid="mp-account">
      <section className="bg-white rounded-3xl border border-ink/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">Mon compte</p>
        <h1 className="font-display text-3xl mt-1">{user.firstName || 'Bienvenue'}</h1>
        <p className="text-sm text-ink/65 mt-1">+221 {local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to={mpPath('/commandes')}
            className="h-14 rounded-2xl border border-ink/10 flex items-center justify-center gap-2 font-semibold text-sm"
          >
            <Package className="w-4 h-4" /> Mes achats
          </Link>
          <Link
            to={mpPath('/vendre')}
            className="h-14 rounded-2xl border border-ink/10 flex items-center justify-center gap-2 font-semibold text-sm"
          >
            <Store className="w-4 h-4" /> Ma boutique
          </Link>
        </div>
      </section>
      <FaceIdPanel />
      <button
        onClick={logout}
        className="w-full h-12 rounded-full border border-ink/15 text-ink/70 inline-flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Me déconnecter
      </button>
    </div>
  );
}
