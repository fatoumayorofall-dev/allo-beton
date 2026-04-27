import React, { useState, useEffect } from 'react';
import {
  Edit3, Save, RotateCcw, Plus, Trash2, Search, X, RefreshCw,
  CheckCircle, AlertTriangle, Calendar, Hash, FileText, ArrowUpRight,
  ArrowDownRight, Zap, Lightbulb
} from 'lucide-react';

const API = 'http://localhost:3001/api/comptabilite';

function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

interface LigneEcriture {
  id: string;
  compte_code: string;
  compte_libelle?: string;
  libelle: string;
  debit: number;
  credit: number;
}

export const SaisieStandardTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [journalCode, setJournalCode] = useState('VT');
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().split('T')[0]);
  const [numeroPiece, setNumeroPiece] = useState('');
  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
    { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
  ]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [showCompteSearch, setShowCompteSearch] = useState<string | null>(null);
  const [searchCompte, setSearchCompte] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/journaux`, { headers: headers() })
      .then(r => r.json())
      .then(d => setJournaux(d.data || [
        { code: 'VT', libelle: 'Ventes' },
        { code: 'AC', libelle: 'Achats' },
        { code: 'BQ', libelle: 'Banque' },
        { code: 'CA', libelle: 'Caisse' },
        { code: 'OD', libelle: 'Opérations diverses' },
        { code: 'AN', libelle: 'À nouveaux' },
      ]));

    fetch(`${API}/plan-comptable?is_detail=true`, { headers: headers() })
      .then(r => r.json())
      .then(d => setComptes(d.data || []));
  }, [exercice]);

  const totalDebit = lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const ecart = totalDebit - totalCredit;
  const isEquilibre = Math.abs(ecart) < 0.01;

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now().toString(), compte_code: '', libelle: '', debit: 0, credit: 0 }]);
  };

  const removeLigne = (id: string) => {
    if (lignes.length > 2) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const updateLigne = (id: string, field: keyof LigneEcriture, value: any) => {
    setLignes(lignes.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'compte_code') {
          const compte = comptes.find(c => c.code === value);
          if (compte) updated.compte_libelle = compte.libelle;
        }
        return updated;
      }
      return l;
    }));
  };

  const selectCompte = (ligneId: string, compte: any) => {
    updateLigne(ligneId, 'compte_code', compte.code);
    setShowCompteSearch(null);
    setSearchCompte('');
  };

  const filteredComptes = comptes.filter(c =>
    c.code.includes(searchCompte) ||
    c.libelle?.toLowerCase().includes(searchCompte.toLowerCase())
  ).slice(0, 10);

  const handleSave = async () => {
    if (!isEquilibre) {
      setMessage({ type: 'error', text: 'L\'écriture n\'est pas équilibrée !' });
      return;
    }

    const validLignes = lignes.filter(l => l.compte_code && (l.debit > 0 || l.credit > 0));
    if (validLignes.length < 2) {
      setMessage({ type: 'error', text: 'Minimum 2 lignes avec montants requis' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/ecritures`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          journal_code: journalCode,
          date_ecriture: dateEcriture,
          numero_piece: numeroPiece,
          lignes: validLignes.map(l => ({
            compte_code: l.compte_code,
            libelle: l.libelle || lignes[0].libelle,
            debit: l.debit,
            credit: l.credit
          }))
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Écriture enregistrée avec succès' });
        setLignes([
          { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
          { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
        ]);
        setNumeroPiece('');
      } else {
        throw new Error('Erreur serveur');
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleClear = () => {
    if (confirm('Effacer toutes les lignes ?')) {
      setLignes([
        { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
        { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
      ]);
      setNumeroPiece('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Message de feedback */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* En-tête de saisie - Style professionnel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barre de titre */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500 rounded-lg shadow-lg">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Saisie Standard</h3>
                <p className="text-slate-300 text-sm">Écriture comptable multi-lignes • Exercice {exercice}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white border border-slate-500"
              >
                <RotateCcw className="w-4 h-4" />
                Effacer
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isEquilibre}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer (F9)
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire d'en-tête */}
        <div className="p-5 bg-gradient-to-b from-slate-50 to-white">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Journal</label>
              <select
                value={journalCode}
                onChange={e => setJournalCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              >
                {journaux.map(j => (
                  <option key={j.code} value={j.code}>{j.code} - {j.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Date</label>
              <input
                type="date"
                value={dateEcriture}
                onChange={e => setDateEcriture(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">N° Pièce</label>
              <input
                type="text"
                value={numeroPiece}
                onChange={e => setNumeroPiece(e.target.value)}
                placeholder="FAC-001"
                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Exercice</label>
              <div className="px-3 py-2.5 bg-orange-50 border-2 border-orange-200 rounded-lg text-sm font-bold text-orange-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {exercice}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Équilibre</label>
              <div className={`px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border-2 ${
                isEquilibre
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
              }`}>
                {isEquilibre ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {isEquilibre ? 'Équilibré ✓' : `Écart: ${fmt(ecart)} FCFA`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grille de saisie - Style professionnel */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700">
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-14">N°</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-40">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  Compte
                </div>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-56">Intitulé du compte</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Libellé de l'écriture
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-emerald-300 uppercase tracking-wider w-36">
                <div className="flex items-center justify-end gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Débit
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-rose-300 uppercase tracking-wider w-36">
                <div className="flex items-center justify-end gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Crédit
                </div>
              </th>
              <th className="px-4 py-3.5 w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((ligne, idx) => (
              <tr key={ligne.id} className={`hover:bg-orange-50/60 transition-all duration-150 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold text-xs">
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3 relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={ligne.compte_code}
                      onChange={e => updateLigne(ligne.id, 'compte_code', e.target.value)}
                      onFocus={() => setShowCompteSearch(ligne.id)}
                      placeholder="Compte..."
                      className="w-full px-3 py-2 font-mono text-sm font-semibold border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-orange-300 transition-colors"
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {showCompteSearch === ligne.id && (
                    <div className="absolute left-0 top-full mt-2 bg-white border-2 border-orange-200 rounded-xl shadow-2xl z-50 w-[420px] max-h-80 overflow-hidden">
                      <div className="p-3 border-b bg-gradient-to-r from-orange-50 to-indigo-50 sticky top-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                          <input
                            type="text"
                            value={searchCompte}
                            onChange={e => setSearchCompte(e.target.value)}
                            placeholder="Rechercher par code ou libellé..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredComptes.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>Aucun compte trouvé</p>
                          </div>
                        ) : (
                          filteredComptes.map(c => (
                            <button
                              key={c.code}
                              onClick={() => selectCompte(ligne.id, c)}
                              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-orange-50 text-left transition-colors border-b border-slate-100 last:border-0"
                            >
                              <span className="font-mono text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">{c.code}</span>
                              <span className="text-slate-700 font-medium truncate flex-1">{c.libelle}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500 px-2">{filteredComptes.length} compte(s)</span>
                        <button
                          onClick={() => setShowCompteSearch(null)}
                          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm truncate block max-w-[220px] ${ligne.compte_libelle || comptes.find(c => c.code === ligne.compte_code)?.libelle ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}`}>
                    {ligne.compte_libelle || comptes.find(c => c.code === ligne.compte_code)?.libelle || 'Sélectionner un compte...'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={ligne.libelle}
                    onChange={e => updateLigne(ligne.id, 'libelle', e.target.value)}
                    placeholder="Libellé de l'opération"
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-orange-300 transition-colors placeholder:text-slate-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={ligne.debit || ''}
                    onChange={e => updateLigne(ligne.id, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm text-right font-mono font-semibold border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 hover:border-emerald-400 transition-colors"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={ligne.credit || ''}
                    onChange={e => updateLigne(ligne.id, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm text-right font-mono font-semibold border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/50 hover:border-rose-400 transition-colors"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => removeLigne(ligne.id)}
                    disabled={lignes.length <= 2}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-all"
                    title="Supprimer la ligne"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-t-2 border-slate-300">
              <td colSpan={4} className="px-4 py-4">
                <button
                  onClick={addLigne}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors font-semibold border border-orange-200"
                >
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 rounded">Ins</kbd>
                </button>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="text-xs text-slate-500 mb-1 font-medium">Total Débit</div>
                <span className="font-mono font-bold text-xl text-emerald-600">{fmt(totalDebit)}</span>
                <span className="text-xs text-slate-400 ml-1">FCFA</span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="text-xs text-slate-500 mb-1 font-medium">Total Crédit</div>
                <span className="font-mono font-bold text-xl text-rose-600">{fmt(totalCredit)}</span>
                <span className="text-xs text-slate-400 ml-1">FCFA</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Raccourcis clavier - Style professionnel */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-xl px-5 py-4 flex flex-wrap items-center gap-4 text-xs shadow-lg">
        <div className="flex items-center gap-2 text-slate-400 font-semibold border-r border-slate-600 pr-4">
          <Zap className="w-4 h-4 text-amber-400" />
          Raccourcis clavier
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-slate-600 rounded font-mono shadow-sm border border-slate-500">F2</kbd>
            <span className="text-slate-300">Nouveau</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-slate-600 rounded font-mono shadow-sm border border-slate-500">F3</kbd>
            <span className="text-slate-300">Recherche</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-slate-600 rounded font-mono shadow-sm border border-slate-500">F7</kbd>
            <span className="text-slate-300">Effacer</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-emerald-600 rounded font-mono shadow-sm border border-emerald-500">F9</kbd>
            <span className="text-emerald-300 font-semibold">Enregistrer</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-slate-600 rounded font-mono shadow-sm border border-slate-500">Ins</kbd>
            <span className="text-slate-300">+ Ligne</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-rose-600/80 rounded font-mono shadow-sm border border-rose-500">Suppr</kbd>
            <span className="text-rose-300">- Ligne</span>
          </span>
        </div>
      </div>

      {/* Aide rapide */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Lightbulb className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h4 className="font-semibold text-orange-800 mb-1">Conseil de saisie</h4>
          <p className="text-sm text-orange-700">
            Tapez les premiers chiffres du compte pour afficher les suggestions.
            L'écriture doit être équilibrée (Total Débit = Total Crédit) pour être enregistrée.
          </p>
        </div>
      </div>
    </div>
  );
};
