import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { salesAPI } from '../../services/mysql-api';

interface ImportSalesProps {
  onClose: () => void;
  onImported?: () => void;
}

export const ImportSales: React.FC<ImportSalesProps> = ({ onClose, onImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState({ saleNumberHeader: '', dateHeader: '', timeHeader: '', customerId: '', vehiclePlateHeader: '', driverNameHeader: '', productTypeHeader: '', loadingLocationHeader: '', destinationHeader: '', weightHeader: '' });

  // Auto-mapping detection
  const autoDetectMapping = (headers: string[]) => {
    const newMapping = { saleNumberHeader: '', dateHeader: '', timeHeader: '', customerId: '', vehiclePlateHeader: '', driverNameHeader: '', productTypeHeader: '', loadingLocationHeader: '', destinationHeader: '', weightHeader: '' };
    
    const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
    
    headers.forEach(h => {
      const norm = normalize(h);
      if (norm.includes('facture') || norm.includes('numero') || norm.includes('sale') || norm.includes('n°')) newMapping.saleNumberHeader = h;
      if (norm.includes('date') && !norm.includes('decharge')) newMapping.dateHeader = h;
      if (norm.includes('heure') || norm.includes('time')) newMapping.timeHeader = h;
      if (norm.includes('matricule') || norm.includes('vehicle') || norm.includes('plate')) newMapping.vehiclePlateHeader = h;
      if (norm.includes('chauffeur') || norm.includes('driver') || norm.includes('conducteur')) newMapping.driverNameHeader = h;
      if (norm.includes('produit') || norm.includes('product') || norm.includes('type')) newMapping.productTypeHeader = h;
      if (norm.includes('chargement') || norm.includes('loading') || norm.includes('lieu')) newMapping.loadingLocationHeader = h;
      if (norm.includes('destination')) newMapping.destinationHeader = h;
      if (norm.includes('poids') || norm.includes('weight')) newMapping.weightHeader = h;
    });
    
    return newMapping;
  };

  const handleFile = (f?: File) => {
    setFile(f || null);
    setPreview(null);
  };

  const uploadPreview = async () => {
    if (!file) return alert('Sélectionnez un fichier CSV');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await salesAPI.importPreview(fd);
      setPreview(res.data);      // Auto-detect and apply mapping
      const detected = autoDetectMapping(res.data.headers);
      setMapping(detected);    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erreur lors de l’analyse du fichier');
    } finally {
      setLoading(false);
    }
  };

  const performImport = async () => {
    if (!preview) return alert('Aucune prévisualisation');
    // basic mapping sanity
    const payload = { rows: preview.rows, mapping };
    setLoading(true);
    try {
      const res = await salesAPI.import(payload);
      alert(`Importé: ${res.data.created.length} lignes`);
      if (onImported) onImported();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erreur lors de l’import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Importer ventes (CSV)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Fichier CSV</label>
            <input type="file" accept=".csv,.tsv,text/csv" onChange={(e) => handleFile(e.target.files?.[0])} />
            <div className="mt-2">
              <button onClick={uploadPreview} disabled={!file || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                <UploadCloud className="inline-block w-4 h-4 mr-2" /> Prévisualiser
              </button>
            </div>
          </div>

          {preview && (
            <div>
              <h3 className="font-medium mb-2">En-têtes détectés (auto-mappés)</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                {preview.headers.map((h: string) => (
                  <div key={h} className="px-2 py-1 bg-gray-100 rounded text-xs">{h}</div>
                ))}
              </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Colonne numéro de facture</label>
                  <select value={mapping.saleNumberHeader} onChange={(e) => setMapping({...mapping, saleNumberHeader: e.target.value})} className="w-full border p-2 rounded">
                    <option value="">-- choisir --</option>
                    {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm">Colonne date</label>
                  <select value={mapping.dateHeader} onChange={(e) => setMapping({...mapping, dateHeader: e.target.value})} className="w-full border p-2 rounded">
                    <option value="">-- choisir --</option>
                    {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm">Colonne heure (optionnel)</label>
                  <select value={mapping.timeHeader} onChange={(e) => setMapping({...mapping, timeHeader: e.target.value})} className="w-full border p-2 rounded">
                    <option value="">-- choisir --</option>
                    {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm">Colonne matricule (vehicle)</label>
                    <select value={mapping.vehiclePlateHeader} onChange={(e) => setMapping({...mapping, vehiclePlateHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm">Colonne nom chauffeur</label>
                    <select value={mapping.driverNameHeader} onChange={(e) => setMapping({...mapping, driverNameHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm">Colonne type de produit</label>
                    <select value={mapping.productTypeHeader} onChange={(e) => setMapping({...mapping, productTypeHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm">Colonne lieu de chargement</label>
                    <select value={mapping.loadingLocationHeader} onChange={(e) => setMapping({...mapping, loadingLocationHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm">Colonne destination</label>
                    <select value={mapping.destinationHeader} onChange={(e) => setMapping({...mapping, destinationHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm">Colonne poids</label>
                    <select value={mapping.weightHeader} onChange={(e) => setMapping({...mapping, weightHeader: e.target.value})} className="w-full border p-2 rounded">
                      <option value="">-- choisir --</option>
                      {preview.headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

              <div className="mt-4">
                <h4 className="font-medium mb-2">Aperçu (10 premières lignes)</h4>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map((h: string) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0,10).map((r: any, idx: number) => (
                        <tr key={idx} className="odd:bg-white even:bg-gray-50">
                          {preview.headers.map((h: string) => <td key={h} className="px-2 py-1">{r[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Fermer</button>
                <button onClick={performImport} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">Importer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
