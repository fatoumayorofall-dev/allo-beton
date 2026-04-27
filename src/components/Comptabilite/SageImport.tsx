/**
 * ALLO BÉTON — IMPORT SAGE SAARI
 * Composant React complet pour importer les données Sage
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, Database, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, RotateCcw, Download, Eye,
  Users, Package, BookOpen, CreditCard, Building2, FileText,
  Loader2, ChevronDown, ChevronUp, Settings
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api/sage-import';

// Types de données supportés avec icônes et couleurs
const DATA_TYPES: Record<string, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  plan_comptable: { label: 'Plan Comptable', icon: <BookOpen size={18} />, color: 'blue', description: '8 classes SYSCOHADA' },
  journaux: { label: 'Journaux', icon: <FileText size={18} />, color: 'purple', description: 'Journaux comptables' },
  ecritures: { label: 'Écritures', icon: <FileSpreadsheet size={18} />, color: 'green', description: 'Écritures comptables' },
  clients: { label: 'Clients', icon: <Users size={18} />, color: 'cyan', description: 'Tiers clients' },
  fournisseurs: { label: 'Fournisseurs', icon: <Building2 size={18} />, color: 'orange', description: 'Tiers fournisseurs' },
  articles: { label: 'Articles', icon: <Package size={18} />, color: 'pink', description: 'Produits & Articles' },
  reglements: { label: 'Règlements', icon: <CreditCard size={18} />, color: 'emerald', description: 'Paiements reçus/émis' },
};

function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

export function SageImport() {
  const [step, setStep] = useState<'upload' | 'analyze' | 'config' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [options, setOptions] = useState({ overwrite: false, dryRun: true, dataType: 'auto' });
  const [expandedErrors, setExpandedErrors] = useState<string[]>([]);

  // Charger les stats au montage
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  };

  // Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleFileSelect = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'txt'].includes(ext || '')) {
      setError('Format non supporté. Utilisez .csv, .xlsx, .xls ou .txt');
      return;
    }
    setFile(f);
    setError('');
    setAnalysis(null);
    setImportResults(null);
  };

  // Étape 1 : Analyser le fichier
  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options.dataType !== 'auto') formData.append('forceType', options.dataType);

      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAnalysis(data);
        setStep('analyze');
      } else {
        setError(data.error || 'Erreur lors de l\'analyse');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Lancer l'import
  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setStep('importing');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', String(options.overwrite));
      formData.append('dryRun', String(options.dryRun));
      formData.append('dataType', options.dataType);

      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImportResults(data);
        setStep('results');
        if (!options.dryRun) fetchStats();
      } else {
        setError(data.error || 'Erreur lors de l\'import');
        setStep('config');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      setStep('config');
    } finally {
      setLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setImportResults(null);
    setError('');
    setOptions({ overwrite: false, dryRun: true, dataType: 'auto' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-500 rounded-xl text-white">
              <Database size={24} />
            </div>
            Import Sage SAARI
          </h1>
          <p className="text-gray-500 mt-1">Migration complète de vos données Sage vers Allo Béton</p>
        </div>
        {step !== 'upload' && (
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
            <RotateCcw size={16} /> Nouveau fichier
          </button>
        )}
      </div>

      {/* Stats actuelles */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">📊 Base de données actuelle</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Object.entries(stats).map(([key, val]) => (
              <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{String(val)}</div>
                <div className="text-xs text-gray-500 capitalize">{key}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['upload', 'analyze', 'config', 'importing', 'results'].map((s, i) => {
          const labels = ['📁 Fichier', '🔍 Analyse', '⚙️ Config', '🔄 Import', '✅ Résultats'];
          const isActive = step === s;
          const isDone = ['upload', 'analyze', 'config', 'importing', 'results'].indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              {i > 0 && <ArrowRight size={14} className="text-gray-300" />}
              <span className={`px-3 py-1 rounded-full ${isActive ? 'bg-orange-100 text-orange-700 font-medium' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {labels[i]}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════ ÉTAPE 1 : UPLOAD ═══════════════════ */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Zone de drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
              ${dragOver ? 'border-green-500 bg-green-50' : file ? 'border-green-400 bg-green-50/50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/30'}`}
            onClick={() => document.getElementById('sage-file-input')?.click()}
          >
            <input
              id="sage-file-input"
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="text-green-600" size={32} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} Ko</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="text-gray-400" size={32} />
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Glissez votre fichier Sage ici</p>
                  <p className="text-sm text-gray-500">ou cliquez pour parcourir</p>
                </div>
                <div className="flex justify-center gap-3 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-100 rounded">.csv</span>
                  <span className="px-2 py-1 bg-gray-100 rounded">.xlsx</span>
                  <span className="px-2 py-1 bg-gray-100 rounded">.xls</span>
                  <span className="px-2 py-1 bg-gray-100 rounded">.txt</span>
                </div>
              </div>
            )}
          </div>

          {/* Sélection type de données */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Settings size={16} /> Type de données à importer
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setOptions(o => ({ ...o, dataType: 'auto' }))}
                className={`p-3 rounded-lg border text-left transition-all ${options.dataType === 'auto' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-sm font-medium">🤖 Auto-détection</div>
                <div className="text-xs text-gray-500">Détection intelligente</div>
              </button>
              {Object.entries(DATA_TYPES).map(([key, dt]) => (
                <button
                  key={key}
                  onClick={() => setOptions(o => ({ ...o, dataType: key }))}
                  className={`p-3 rounded-lg border text-left transition-all ${options.dataType === key ? `border-${dt.color}-500 bg-${dt.color}-50 ring-1 ring-${dt.color}-500` : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="text-sm font-medium flex items-center gap-1.5">{dt.icon} {dt.label}</div>
                  <div className="text-xs text-gray-500">{dt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bouton Analyser */}
          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-medium hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
              {loading ? 'Analyse en cours...' : 'Analyser le fichier'}
            </button>
          )}

          {/* Guide formats */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-medium text-amber-800 flex items-center gap-2">
              <AlertTriangle size={16} /> Comment exporter depuis Sage SAARI ?
            </h3>
            <div className="mt-3 space-y-2 text-sm text-amber-700">
              <p><strong>Plan comptable :</strong> Sage → Structure → Plan comptable → Exporter (CSV/Excel)</p>
              <p><strong>Écritures :</strong> Sage → Traitement → Journaux → Imprimer/Exporter → Format CSV</p>
              <p><strong>Clients/Fournisseurs :</strong> Sage → Structure → Plan tiers → Exporter</p>
              <p><strong>Articles :</strong> Sage → Structure → Plan articles → Exporter</p>
              <p><strong>Complet :</strong> Sage → Fichier → Exporter → Toutes les données → Format Excel</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ ÉTAPE 2 : ANALYSE ═══════════════════ */}
      {step === 'analyze' && analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📋 Résultat de l'analyse</h3>

            {analysis.analysis.multiSheet ? (
              // Multi-onglets
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Fichier Excel avec <strong>{Object.keys(analysis.analysis.sheets).length}</strong> onglets détectés :
                </p>
                {Object.entries(analysis.analysis.sheets).map(([name, sheet]: [string, any]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-800">📄 {name}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sheet.type !== 'inconnu' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {DATA_TYPES[sheet.type]?.label || 'Non reconnu'} ({sheet.confidence}%)
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {sheet.totalRows} lignes · {sheet.mappedFields} champs mappés
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Fichier simple
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs text-orange-600 font-medium">Type détecté</div>
                    <div className="text-lg font-bold text-orange-900">{DATA_TYPES[analysis.analysis.type]?.label || analysis.analysis.type}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 font-medium">Confiance</div>
                    <div className="text-lg font-bold text-green-900">{analysis.analysis.confidence > 5 ? 'Élevée' : analysis.analysis.confidence > 2 ? 'Moyenne' : 'Faible'}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-purple-600 font-medium">Lignes</div>
                    <div className="text-lg font-bold text-purple-900">{analysis.analysis.totalRows?.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs text-amber-600 font-medium">Champs mappés</div>
                    <div className="text-lg font-bold text-amber-900">{analysis.analysis.mappedFields} / {analysis.analysis.totalFields}</div>
                  </div>
                </div>

                {/* Mapping des colonnes */}
                {Object.keys(analysis.analysis.mapping).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🔗 Correspondance des colonnes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(analysis.analysis.mapping).map(([allo, sage]) => (
                        <div key={allo} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-orange-600 font-mono">{String(sage)}</span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="text-green-600 font-medium">{allo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colonnes non mappées */}
                {analysis.analysis.unmappedColumns?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Colonnes ignorées ({analysis.analysis.unmappedColumns.length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.analysis.unmappedColumns.map((col: string) => (
                        <span key={col} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{col}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aperçu des données */}
                {analysis.analysis.preview?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">👁️ Aperçu des données (premières lignes)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            {Object.keys(analysis.analysis.preview[0]).map(col => (
                              <th key={col} className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.analysis.preview.slice(0, 5).map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-orange-50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="border border-gray-200 px-2 py-1 text-gray-600 max-w-[200px] truncate">{String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Passer à la config */}
          <button
            onClick={() => setStep('config')}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
          >
            <ArrowRight size={18} /> Configurer l'import
          </button>
        </div>
      )}

      {/* ═══════════════════ ÉTAPE 3 : CONFIG ═══════════════════ */}
      {step === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">⚙️ Options d'import</h3>

            <div className="space-y-3">
              {/* Dry Run */}
              <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.dryRun}
                  onChange={(e) => setOptions(o => ({ ...o, dryRun: e.target.checked }))}
                  className="w-5 h-5 rounded text-orange-600"
                />
                <div>
                  <div className="font-medium text-orange-900">🧪 Mode simulation (recommandé)</div>
                  <div className="text-xs text-orange-700">Vérifie les données sans rien modifier en base. Désactivez pour un import réel.</div>
                </div>
              </label>

              {/* Overwrite */}
              <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.overwrite}
                  onChange={(e) => setOptions(o => ({ ...o, overwrite: e.target.checked }))}
                  className="w-5 h-5 rounded text-amber-600"
                />
                <div>
                  <div className="font-medium text-amber-900">⚠️ Écraser les doublons</div>
                  <div className="text-xs text-amber-700">Met à jour les enregistrements existants. Sans cette option, les doublons sont ignorés.</div>
                </div>
              </label>
            </div>

            {!options.dryRun && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Attention :</strong> L'import réel modifiera votre base de données. Assurez-vous d'avoir vérifié l'analyse.
                  {options.overwrite && ' Les données existantes seront écrasées.'}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('analyze')}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
            >
              ← Retour à l'analyse
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                options.dryRun 
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-700 hover:to-emerald-600'
              }`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {options.dryRun ? 'Lancer la simulation' : 'Lancer l\'import réel'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ ÉTAPE 4 : IMPORT EN COURS ═══════════════════ */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 size={48} className="mx-auto text-orange-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-900">Import en cours...</p>
          <p className="text-sm text-gray-500 mt-2">
            {options.dryRun ? 'Simulation en cours, aucune modification en base' : 'Insertion des données dans Allo Béton'}
          </p>
        </div>
      )}

      {/* ═══════════════════ ÉTAPE 5 : RÉSULTATS ═══════════════════ */}
      {step === 'results' && importResults && (
        <div className="space-y-6">
          {/* Bannière résultat */}
          <div className={`rounded-xl p-6 ${importResults.dryRun ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-3">
              {importResults.dryRun ? (
                <Eye size={24} className="text-orange-600" />
              ) : (
                <CheckCircle size={24} className="text-green-600" />
              )}
              <div>
                <h3 className={`text-lg font-bold ${importResults.dryRun ? 'text-orange-900' : 'text-green-900'}`}>
                  {importResults.dryRun ? '🧪 Simulation terminée' : '✅ Import terminé avec succès'}
                </h3>
                <p className={`text-sm ${importResults.dryRun ? 'text-orange-700' : 'text-green-700'}`}>
                  {importResults.dryRun 
                    ? 'Aucune donnée modifiée. Relancez sans le mode simulation pour importer.' 
                    : 'Les données Sage ont été importées dans Allo Béton.'}
                </p>
              </div>
            </div>
          </div>

          {/* Résultats détaillés */}
          {importResults.result?.resultats ? (
            // Import multi/complet
            Object.entries(importResults.result.resultats).map(([module, result]: [string, any]) => (
              <ResultCard key={module} module={module} result={result} expandedErrors={expandedErrors} setExpandedErrors={setExpandedErrors} />
            ))
          ) : importResults.result ? (
            // Import simple
            <ResultCard module={importResults.type || 'import'} result={importResults.result} expandedErrors={expandedErrors} setExpandedErrors={setExpandedErrors} />
          ) : null}

          {/* Totaux */}
          {importResults.result?.total_importe !== undefined && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{importResults.result.total_importe}</div>
                  <div className="text-sm text-green-600">Total importé</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{importResults.result.total_erreurs}</div>
                  <div className="text-sm text-red-600">Erreurs</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {importResults.dryRun && (
              <button
                onClick={() => {
                  setOptions(o => ({ ...o, dryRun: false }));
                  setStep('config');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} /> Passer à l'import réel
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Importer un autre fichier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant carte de résultat par module
function ResultCard({ module, result, expandedErrors, setExpandedErrors }: any) {
  const dt = DATA_TYPES[result.type] || { label: module, icon: <Database size={18} />, color: 'gray' };
  const hasErrors = result.errors?.length > 0;
  const isExpanded = expandedErrors.includes(module);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {dt.icon}
          <span className="font-medium text-gray-900">{dt.label}</span>
        </div>
        {result.status === 'ignoré' && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Ignoré</span>
        )}
      </div>

      {result.status !== 'ignoré' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {result.imported !== undefined && (
            <div className="p-2 bg-green-50 rounded text-center">
              <div className="font-bold text-green-700">{result.imported}</div>
              <div className="text-xs text-green-600">Importés</div>
            </div>
          )}
          {result.updated !== undefined && result.updated > 0 && (
            <div className="p-2 bg-orange-50 rounded text-center">
              <div className="font-bold text-orange-700">{result.updated}</div>
              <div className="text-xs text-orange-600">Mis à jour</div>
            </div>
          )}
          {result.skipped !== undefined && (
            <div className="p-2 bg-gray-50 rounded text-center">
              <div className="font-bold text-gray-700">{result.skipped}</div>
              <div className="text-xs text-gray-600">Ignorés</div>
            </div>
          )}
          {hasErrors && (
            <div
              onClick={() => setExpandedErrors((prev: string[]) => prev.includes(module) ? prev.filter((e: string) => e !== module) : [...prev, module])}
              className="p-2 bg-red-50 rounded text-center cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="font-bold text-red-700 flex items-center justify-center gap-1">
                {result.errors.length}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              <div className="text-xs text-red-600">Erreurs</div>
            </div>
          )}
        </div>
      )}

      {/* Erreurs détaillées */}
      {hasErrors && isExpanded && (
        <div className="mt-3 max-h-40 overflow-y-auto">
          {result.errors.slice(0, 20).map((err: any, i: number) => (
            <div key={i} className="text-xs text-red-600 py-1 border-b border-red-100 last:border-0">
              {err.line ? `Ligne ${err.line}: ` : ''}{err.error}
            </div>
          ))}
          {result.errors.length > 20 && (
            <div className="text-xs text-red-500 mt-1">... et {result.errors.length - 20} autres erreurs</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SageImport;
