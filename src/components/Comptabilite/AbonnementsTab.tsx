import React from 'react';

const fakeData = [
  { id: 1, date: '2026-04-13', compte: '512000', libelle: 'Abonnement logiciel', montant: 120 },
  { id: 2, date: '2026-04-13', compte: '625100', libelle: 'Abonnement internet', montant: 80 },
];

export const AbonnementsTab: React.FC<{ exercice: number }> = ({ exercice }) => (
  <div>
    <h3 className="text-xl font-bold mb-4">Abonnements — Exercice {exercice}</h3>
    <table className="min-w-full bg-white border">
      <thead>
        <tr>
          <th>Date</th>
          <th>Compte</th>
          <th>Libellé</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        {fakeData.map(row => (
          <tr key={row.id}>
            <td>{row.date}</td>
            <td>{row.compte}</td>
            <td>{row.libelle}</td>
            <td>{row.montant}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
