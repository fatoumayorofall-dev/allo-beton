const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

type PdfType = 'invoice' | 'quote' | 'receipt';

export async function generatePDF(params: {
  type: PdfType;
  saleId: string;
  userId?: string; // pas utilisé ici, mais conservé pour compatibilité
}) {
  const { type, saleId } = params;

  const url = `${API_BASE_URL}/pdf/sales/${saleId}?type=${encodeURIComponent(type)}`;

  // Ici on ne "génère" pas côté frontend : on prépare juste l’URL.
  return {
    success: true,
    data: {
      url,
      fileName: `${type}_${saleId}.pdf`,
    },
  };
}

export async function downloadPDF(url: string, fileName = 'document.pdf') {
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    // si le backend renvoie JSON erreur
    let message = `Erreur téléchargement PDF (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}

export async function printPDF(url: string) {
  // Ouvre le PDF dans un nouvel onglet. L’utilisateur peut imprimer depuis le navigateur.
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function emailPDF(
  _url: string,
  _email: string,
  _saleNumber: string,
  _type: PdfType
) {
  // Optionnel : tu n’as pas encore l’API backend pour l’email
  return { success: false, error: "Fonction email non implémentée côté serveur" };
}

