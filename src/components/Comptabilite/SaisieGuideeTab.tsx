import React from 'react';

const fakeData = [
  { id: 1, date: '2026-04-13', compte: '606100', libelle: 'Achat fournitures', debit: 0, credit: 200 },
  { id: 2, date: '2026-04-13', compte: '701000', libelle: 'Vente béton', debit: 1500, credit: 0 },
];

export const SaisieGuideeTab: React.FC<{ exercice: number }> = ({ exercice }) => (
  <div>
    <h3 className="text-xl font-bold mb-4">Saisie Guidée — Exercice {exercice}</h3>
    <table className="min-w-full bg-white border">
      <thead>
        <tr>
          <th>Date</th>
          <th>Compte</th>
          <th>Libellé</th>
          <th>Débit</th>
          <th>Crédit</th>
        </tr>
      </thead>
      <tbody>
        {fakeData.map(row => (
          <tr key={row.id}>
            <td>{row.date}</td>
            <td>{row.compte}</td>
            <td>{row.libelle}</td>
            <td>{row.debit}</td>
            <td>{row.credit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
