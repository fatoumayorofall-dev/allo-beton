/**
 * BASE DE CONNAISSANCES BTP - ALLO BÉTON
 * Documentation experte pour le chatbot IA
 * Couvre : Béton, Ciment, Fer, Sable, Construction, Climat tropical Sénégal
 */

import React from 'react';

// ============================================================
// 1. CLASSES DE BÉTON ET DOSAGES
// ============================================================
export const BETON_CLASSES = {
  'B15': { resistance: '15 MPa', dose_ciment: 250, usage: 'Béton de propreté, calage' },
  'B20': { resistance: '20 MPa', dose_ciment: 300, usage: 'Dallage, fondations légères' },
  'B25': { resistance: '25 MPa', dose_ciment: 350, usage: 'Béton armé, fondations, poteaux, dalles' },
  'B30': { resistance: '30 MPa', dose_ciment: 400, usage: 'Ouvrages d\'art, bâtiments multi-étages' },
  'B35': { resistance: '35 MPa', dose_ciment: 425, usage: 'Précontraint, structures exposées' },
};

// Dosages classiques pour 1 m³ de béton (kg)
export const DOSAGE_BETON_M3 = {
  B20: { ciment: 300, sable: 690, gravier: 1175, eau: 175 },
  B25: { ciment: 350, sable: 680, gravier: 1145, eau: 175 },
  B30: { ciment: 400, sable: 660, gravier: 1115, eau: 180 },
};

// ============================================================
// 2. TYPES DE CIMENT
// ============================================================
export const CIMENTS = {
  'CPA 32.5': { type: 'Portland Artificiel', classe: '32.5 MPa', usage: 'Maçonnerie courante, mortier' },
  'CPA 42.5': { type: 'Portland Artificiel', classe: '42.5 MPa', usage: 'Béton armé, structures' },
  'CPJ 32.5': { type: 'Composé Pouzzolanique', classe: '32.5 MPa', usage: 'Économique, mortier de hourdage' },
  'CPJ 42.5': { type: 'Composé Pouzzolanique', classe: '42.5 MPa', usage: 'Bâtiments standards' },
  'CHF': { type: 'Haut Fourneau', classe: 'Variable', usage: 'Milieu agressif, sulfates' },
};

// ============================================================
// 3. FER À BÉTON HA (Haute Adhérence)
// ============================================================
export const FER_HA = {
  'HA6':  { diam: 6,  poids_kg_m: 0.222, usage: 'Étriers, frettes' },
  'HA8':  { diam: 8,  poids_kg_m: 0.395, usage: 'Étriers, armatures secondaires' },
  'HA10': { diam: 10, poids_kg_m: 0.617, usage: 'Dalles, armatures principales courantes' },
  'HA12': { diam: 12, poids_kg_m: 0.888, usage: 'Poteaux, poutres, dalles épaisses' },
  'HA14': { diam: 14, poids_kg_m: 1.208, usage: 'Poutres importantes, structures' },
  'HA16': { diam: 16, poids_kg_m: 1.578, usage: 'Grandes structures, ouvrages d\'art' },
  'HA20': { diam: 20, poids_kg_m: 2.466, usage: 'Très grandes structures' },
};

// ============================================================
// 4. PRIX MOYEN MARCHÉ SÉNÉGAL (FCFA, mise à jour 2026)
// ============================================================
export const PRIX_MARCHE = {
  beton: { B15: 65000, B20: 75000, B25: 85000, B30: 95000, B35: 110000, unit: 'FCFA/m³' },
  ciment: { 'CPA 32.5': 4250, 'CPA 42.5': 4750, 'CPJ 32.5': 4100, 'CPJ 42.5': 4500, unit: 'FCFA/sac 50kg' },
  fer: { HA8: 3900, HA10: 6100, HA12: 8800, HA14: 12000, HA16: 16000, HA20: 25000, unit: 'FCFA/barre 12m' },
  sable: { mer: 8500, carriere: 12000, lavé: 15000, unit: 'FCFA/tonne' },
  gravier: { '3/8': 14000, '8/16': 13500, '15/25': 13000, unit: 'FCFA/tonne' },
  parpaing: { '15': 350, '20': 450, unit: 'FCFA/pièce' },
  hourdis: { '16+4': 950, '20+4': 1150, unit: 'FCFA/pièce' },
};

// ============================================================
// 5. PATTERNS DE QUESTIONS
// ============================================================
const KEYWORDS = {
  salutations: /^(bonjour|salut|bonsoir|hello|hi|hey|coucou|salam|asalamou|wala+m)/i,
  remerciements: /merci|thanks|thx|jerejef/i,
  aurevoir: /au revoir|bye|à bientôt|a bientot/i,
  prix: /prix|tarif|coute|coût|cout|combien|cost/i,
  calcul: /calcul|combien.*faut|quantit[eé]|dosage|m[eé]trer/i,
  dalle: /dalle|plancher|sol/i,
  fondation: /fondation|semelle|empattement/i,
  poteau: /poteau|pilier|colonne/i,
  poutre: /poutre|linteau|chaînage/i,
  mur: /\bmur\b|paroi|cloison/i,
  toit: /toit|toiture|charpente/i,
  fer: /\bfer\b|armature|barre|HA|ferraillage|treillis/i,
  ciment: /ciment|cement|sococim|dangote|portland|cpa|cpj/i,
  sable: /sable/i,
  gravier: /gravier|granulat|gravillon/i,
  beton_word: /b[eé]ton|concrete/i,
  livraison: /livr|d[eé]lai|exp[eé]di|envoi/i,
  paiement: /paie|wave|orange money|carte|virement|esp[eè]ce/i,
  contact: /contact|t[eé]l[eé]phone|appeler|num[eé]ro|whatsapp|email/i,
  cure: /cure|durci|prise|s[eé]chage|arrosage/i,
  climat: /chaleur|chaud|temp[eé]rature|saison|hivernage|climat/i,
  parpaing: /parpaing|bloc/i,
  hourdis: /hourdis|entrevous/i,
  produit: /produit|catalogue|disponible|stock/i,
};

// ============================================================
// 6. EXTRACTION DE NOMBRES ET DIMENSIONS
// ============================================================
const extractNumbers = (text: string): { surface?: number; epaisseur?: number; longueur?: number; largeur?: number; hauteur?: number; diametre?: number } => {
  const result: any = {};
  // Surface en m²
  const sm = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if (sm) result.surface = parseFloat(sm[1].replace(',', '.'));
  // Épaisseur en cm
  const em = text.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
  if (em) result.epaisseur = parseFloat(em[1].replace(',', '.'));
  // Dimensions L x l
  const lwm = text.match(/(\d+(?:[.,]\d+)?)\s*[xX*×]\s*(\d+(?:[.,]\d+)?)/);
  if (lwm) {
    result.longueur = parseFloat(lwm[1].replace(',', '.'));
    result.largeur = parseFloat(lwm[2].replace(',', '.'));
  }
  // Hauteur
  const hm = text.match(/(\d+(?:[.,]\d+)?)\s*m(?:ètre)?\s*(?:de\s*)?haut/i);
  if (hm) result.hauteur = parseFloat(hm[1].replace(',', '.'));
  // Diamètre HA
  const dm = text.match(/HA\s*(\d+)/i);
  if (dm) result.diametre = parseInt(dm[1]);
  return result;
};

// ============================================================
// 7. GÉNÉRATEUR DE RÉPONSES INTELLIGENT
// ============================================================
export const generateAnswer = (input: string): React.ReactNode => {
  const msg = input.toLowerCase().trim();
  const dims = extractNumbers(input);

  // ========== SALUTATIONS ==========
  if (KEYWORDS.salutations.test(msg)) {
    return (
      <>
        Bonjour ! 👋 Je suis l'<strong>assistant IA d'Allô Béton</strong>, expert BTP au Sénégal. Je peux vous aider sur :
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>Calculs</strong> : béton, ciment, fer, sable</li>
          <li>💰 <strong>Prix</strong> du marché en temps réel</li>
          <li>🏗️ <strong>Conseils techniques</strong> : dalles, fondations, poteaux</li>
          <li>🌡️ <strong>Climat tropical</strong> : bétonnage par temps chaud</li>
          <li>🚚 <strong>Livraison</strong> et commande</li>
        </ul>
        <p className="mt-2">Que souhaitez-vous savoir ?</p>
      </>
    );
  }

  if (KEYWORDS.remerciements.test(msg)) {
    return <>De rien ! 😊 Je suis là 24h/24 pour vous accompagner dans vos projets BTP. Bon chantier ! 🏗️</>;
  }

  if (KEYWORDS.aurevoir.test(msg)) {
    return <>Au revoir ! 👋 N'hésitez pas à revenir pour vos prochains projets. <strong>Allô Béton</strong> à votre service !</>;
  }

  // ========== CALCUL DALLE (avec dimensions) ==========
  if ((KEYWORDS.dalle.test(msg) || KEYWORDS.beton_word.test(msg)) && (dims.surface || (dims.longueur && dims.largeur))) {
    const surface = dims.surface || (dims.longueur! * dims.largeur!);
    const epaisseur = dims.epaisseur ? dims.epaisseur / 100 : 0.15;
    const volume = surface * epaisseur;
    const ciment_kg = volume * 350; // B25 standard
    const sacs = Math.ceil(ciment_kg / 50);
    const sable_t = volume * 0.68;
    const gravier_t = volume * 1.15;
    const fer_kg = volume * 80; // ~80 kg/m³ pour dalle armée
    const cout = Math.round(volume * 85000);

    return (
      <>
        🧮 <strong>Calcul complet pour {surface.toFixed(1)}m² × {(epaisseur * 100).toFixed(0)}cm :</strong>
        <div className="mt-2 bg-orange-50 rounded-lg p-2 space-y-1 text-xs">
          <div>📦 <strong>Volume béton :</strong> <span className="text-orange-700 font-bold">{volume.toFixed(2)} m³</span></div>
          <div>🪣 <strong>Ciment 50kg :</strong> {sacs} sacs ({ciment_kg.toFixed(0)} kg)</div>
          <div>🏖️ <strong>Sable :</strong> {sable_t.toFixed(2)} tonnes</div>
          <div>🪨 <strong>Gravier :</strong> {gravier_t.toFixed(2)} tonnes</div>
          <div>🔩 <strong>Fer (estim.) :</strong> {fer_kg.toFixed(0)} kg</div>
        </div>
        <p className="mt-2 text-xs">💰 <strong>Coût béton estimé :</strong> <span className="text-emerald-600 font-bold">{cout.toLocaleString('fr-FR')} FCFA</span></p>
        <p className="mt-2 text-xs italic text-slate-500">⚠️ Pour dalle armée, utilisez minimum <strong>B25</strong> avec armatures HA10 quadrillage 15x15cm</p>
      </>
    );
  }

  // ========== CLASSES DE BÉTON ==========
  if (/b\s*15|b\s*20|b\s*25|b\s*30|b\s*35|c\s*20|c\s*25|c\s*30/i.test(msg) || (msg.includes('classe') && KEYWORDS.beton_word.test(msg))) {
    return (
      <>
        🧱 <strong>Classes de béton et leurs usages :</strong>
        <div className="mt-2 space-y-1.5 text-xs">
          {Object.entries(BETON_CLASSES).map(([cls, info]) => (
            <div key={cls} className="bg-slate-50 rounded p-1.5">
              <strong className="text-orange-700">{cls}</strong> ({info.resistance}, {info.dose_ciment}kg ciment/m³)
              <br /><span className="text-slate-600">→ {info.usage}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs">💡 Pour la maison standard au Sénégal : <strong>B25</strong> est recommandé.</p>
      </>
    );
  }

  // ========== FONDATION ==========
  if (KEYWORDS.fondation.test(msg)) {
    return (
      <>
        🏗️ <strong>Conseils Fondations (climat sénégalais) :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>Semelle filante</strong> : 40-60 cm de large minimum</li>
          <li>📏 <strong>Profondeur</strong> : minimum 80 cm (hors gel non concerné, mais sols argileux)</li>
          <li>🧱 <strong>Béton</strong> : <strong>B25</strong> minimum (B30 si sol agressif)</li>
          <li>🔩 <strong>Armatures</strong> : HA12 minimum, étriers HA8 espacés 15cm</li>
          <li>💧 <strong>Béton de propreté</strong> : 5cm de B15 sous fondation</li>
          <li>⚠️ <strong>Étude de sol</strong> recommandée pour terrains sableux/argileux</li>
        </ul>
        <p className="mt-2 text-xs italic">Au Sénégal, attention aux sols sableux côtiers (Dakar, Saint-Louis) qui demandent des fondations plus larges.</p>
      </>
    );
  }

  // ========== POTEAU ==========
  if (KEYWORDS.poteau.test(msg)) {
    return (
      <>
        🏛️ <strong>Conseils Poteaux béton armé :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>Section minimale</strong> : 20×20 cm (R+1) à 25×25 cm (R+2 et plus)</li>
          <li>🧱 <strong>Béton</strong> : <strong>B25</strong> minimum (B30 pour étages)</li>
          <li>🔩 <strong>Armatures principales</strong> : 4 HA12 minimum (6 HA12 pour 25×25)</li>
          <li>🔩 <strong>Étriers</strong> : HA8 tous les 15 cm en partie courante, 7 cm en zone critique</li>
          <li>📏 <strong>Enrobage</strong> : 2.5 cm minimum (3 cm en milieu agressif)</li>
        </ul>
      </>
    );
  }

  // ========== POUTRE ==========
  if (KEYWORDS.poutre.test(msg)) {
    return (
      <>
        🏗️ <strong>Conseils Poutres :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>Hauteur</strong> : H ≈ L/10 (portée 4m → poutre 40cm)</li>
          <li>📐 <strong>Largeur</strong> : b ≈ H/2 (mini 20cm)</li>
          <li>🧱 <strong>Béton</strong> : <strong>B25</strong> minimum</li>
          <li>🔩 <strong>Armatures basses</strong> : HA12 ou HA14 (calculer selon charge)</li>
          <li>🔩 <strong>Armatures hautes</strong> : HA10 minimum</li>
          <li>🔩 <strong>Étriers</strong> : HA8 espacés 15-20 cm</li>
        </ul>
      </>
    );
  }

  // ========== CURE / DURCISSEMENT (climat tropical) ==========
  if (KEYWORDS.cure.test(msg) || KEYWORDS.climat.test(msg)) {
    return (
      <>
        🌡️ <strong>Cure du béton au Sénégal (climat chaud) :</strong>
        <div className="mt-2 bg-amber-50 rounded p-2 text-xs space-y-1">
          <div>⚠️ <strong>Au-dessus de 30°C</strong>, l'évaporation est rapide → fissures possibles</div>
          <div>💧 <strong>Arrosage</strong> : 2-3 fois/jour pendant <strong>7 jours minimum</strong></div>
          <div>🛡️ <strong>Protéger</strong> du soleil direct (bâche, sable humide)</div>
          <div>⏰ <strong>Bétonnage</strong> : tôt le matin ou en fin de journée</div>
          <div>🧊 <strong>Eau de gâchage</strong> : utiliser de l'eau fraîche</div>
        </div>
        <p className="mt-2 text-xs">📅 <strong>Délais de prise :</strong></p>
        <ul className="text-xs space-y-0.5 list-disc list-inside">
          <li>Décoffrage : 24-48h pour côtés</li>
          <li>Décoffrage planchers : 7-14 jours</li>
          <li>Résistance à 28 jours : <strong>maximale</strong></li>
        </ul>
      </>
    );
  }

  // ========== FER À BÉTON / ARMATURES ==========
  if (KEYWORDS.fer.test(msg)) {
    if (dims.diametre) {
      const fer = (FER_HA as any)[`HA${dims.diametre}`];
      if (fer) {
        const prix = (PRIX_MARCHE.fer as any)[`HA${dims.diametre}`];
        return (
          <>
            🔩 <strong>Fer HA{dims.diametre} :</strong>
            <div className="mt-2 bg-orange-50 rounded p-2 text-xs space-y-1">
              <div>📏 <strong>Diamètre :</strong> {fer.diam} mm</div>
              <div>⚖️ <strong>Poids :</strong> {fer.poids_kg_m} kg/m</div>
              <div>📦 <strong>Barre 12m :</strong> {(fer.poids_kg_m * 12).toFixed(2)} kg</div>
              {prix && <div>💰 <strong>Prix :</strong> {prix.toLocaleString('fr-FR')} FCFA/barre</div>}
              <div>🏗️ <strong>Usage :</strong> {fer.usage}</div>
            </div>
          </>
        );
      }
    }
    return (
      <>
        🔩 <strong>Fer à béton HA (Haute Adhérence) - Sénégal :</strong>
        <div className="mt-2 space-y-1 text-xs">
          {Object.entries(FER_HA).slice(0, 6).map(([k, v]) => {
            const prix = (PRIX_MARCHE.fer as any)[k];
            return (
              <div key={k} className="bg-slate-50 rounded p-1.5">
                <strong className="text-orange-700">{k}</strong> ({v.diam}mm, {v.poids_kg_m} kg/m)
                {prix && <span className="text-emerald-600 font-bold"> · {prix.toLocaleString('fr-FR')} FCFA/barre 12m</span>}
                <br /><span className="text-slate-600 text-[10px]">→ {v.usage}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ========== CIMENT ==========
  if (KEYWORDS.ciment.test(msg)) {
    return (
      <>
        📦 <strong>Types de ciment au Sénégal :</strong>
        <div className="mt-2 space-y-1 text-xs">
          {Object.entries(CIMENTS).slice(0, 4).map(([k, v]) => {
            const prix = (PRIX_MARCHE.ciment as any)[k];
            return (
              <div key={k} className="bg-slate-50 rounded p-1.5">
                <strong className="text-orange-700">{k}</strong> ({v.classe})
                {prix && <span className="text-emerald-600 font-bold"> · {prix.toLocaleString('fr-FR')} FCFA/sac</span>}
                <br /><span className="text-slate-600 text-[10px]">→ {v.usage}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs">🏭 <strong>Marques principales :</strong> Sococim, Dangote, Ciments du Sahel</p>
        <p className="mt-1 text-xs">🎁 <strong>-15%</strong> avec le code <strong>CIMENT15</strong></p>
      </>
    );
  }

  // ========== SABLE ==========
  if (KEYWORDS.sable.test(msg)) {
    return (
      <>
        🏖️ <strong>Sable - Types et prix Sénégal :</strong>
        <div className="mt-2 space-y-1 text-xs">
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Sable de mer</strong> · <span className="text-emerald-600 font-bold">8 500 FCFA/tonne</span>
            <br /><span className="text-slate-600 text-[10px]">→ Mortier léger, dépôt à laver. ⚠️ Sel : laver avant usage structurel.</span>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Sable de carrière</strong> · <span className="text-emerald-600 font-bold">12 000 FCFA/tonne</span>
            <br /><span className="text-slate-600 text-[10px]">→ Béton structurel, plus propre. <strong>Recommandé</strong>.</span>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Sable lavé</strong> · <span className="text-emerald-600 font-bold">15 000 FCFA/tonne</span>
            <br /><span className="text-slate-600 text-[10px]">→ Béton armé exigeant, finition.</span>
          </div>
        </div>
      </>
    );
  }

  // ========== GRAVIER ==========
  if (KEYWORDS.gravier.test(msg)) {
    return (
      <>
        🪨 <strong>Granulats - Granulométries :</strong>
        <div className="mt-2 space-y-1 text-xs">
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Gravier 3/8</strong> · 14 000 FCFA/t · Béton fin, finition
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Gravier 8/16</strong> · 13 500 FCFA/t · Béton structurel courant ⭐
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong className="text-orange-700">Gravier 15/25</strong> · 13 000 FCFA/t · Gros béton, fondations
          </div>
        </div>
        <p className="mt-2 text-xs">💡 Pour 1m³ de béton, prévoir <strong>~1.15 tonnes de gravier</strong>.</p>
      </>
    );
  }

  // ========== PRIX ==========
  if (KEYWORDS.prix.test(msg)) {
    if (KEYWORDS.beton_word.test(msg)) {
      return (
        <>
          💰 <strong>Prix du béton (Allô Béton) :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            {Object.entries(PRIX_MARCHE.beton).filter(([k]) => k !== 'unit').map(([k, v]) => (
              <li key={k}>
                <strong className="text-orange-700">{k}</strong> : <span className="text-emerald-600 font-bold">{(v as number).toLocaleString('fr-FR')} FCFA/m³</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">🚚 Livraison incluse à partir de 5m³ sur Dakar</p>
        </>
      );
    }
    if (KEYWORDS.ciment.test(msg)) {
      return (
        <>
          💰 <strong>Prix du ciment :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            {Object.entries(PRIX_MARCHE.ciment).filter(([k]) => k !== 'unit').map(([k, v]) => (
              <li key={k}><strong className="text-orange-700">{k}</strong> : {(v as number).toLocaleString('fr-FR')} FCFA/sac 50kg</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">🎁 <strong>-15%</strong> avec le code <strong>CIMENT15</strong></p>
        </>
      );
    }
    if (KEYWORDS.fer.test(msg)) {
      return (
        <>
          💰 <strong>Prix du fer à béton :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            {Object.entries(PRIX_MARCHE.fer).filter(([k]) => k !== 'unit').map(([k, v]) => (
              <li key={k}><strong className="text-orange-700">{k}</strong> : {(v as number).toLocaleString('fr-FR')} FCFA/barre 12m</li>
            ))}
          </ul>
        </>
      );
    }
    return (
      <>
        💰 De quel <strong>matériau</strong> souhaitez-vous le prix ?
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Béton', 'Ciment', 'Fer', 'Sable', 'Gravier', 'Parpaing'].map((m) => (
            <span key={m} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{m}</span>
          ))}
        </div>
      </>
    );
  }

  // ========== CALCUL GÉNÉRAL ==========
  if (KEYWORDS.calcul.test(msg) && !dims.surface && !dims.longueur) {
    return (
      <>
        🧮 <strong>Je peux faire vos calculs BTP !</strong> Indiquez-moi :
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>Surface</strong> en m² (ex: 50m²)</li>
          <li>📏 <strong>Épaisseur</strong> en cm (ex: 15cm)</li>
          <li>🏗️ <strong>Type d'ouvrage</strong> (dalle, fondation, poteau...)</li>
        </ul>
        <p className="mt-2 text-xs italic">Exemples :</p>
        <ul className="text-xs space-y-0.5">
          <li>• <em>"Béton pour dalle de 50m² à 15cm"</em></li>
          <li>• <em>"Ciment pour mur de 8x3m"</em></li>
          <li>• <em>"Fer pour fondation de 20m"</em></li>
        </ul>
      </>
    );
  }

  // ========== PARPAING ==========
  if (KEYWORDS.parpaing.test(msg)) {
    return (
      <>
        🧱 <strong>Parpaings (blocs béton) :</strong>
        <div className="mt-2 space-y-1 text-xs">
          <div className="bg-slate-50 rounded p-1.5">
            <strong>Parpaing 15</strong> (15×20×40 cm) · <strong className="text-emerald-600">350 FCFA/pièce</strong>
            <br /><span className="text-slate-600 text-[10px]">→ Cloisons intérieures</span>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong>Parpaing 20</strong> (20×20×40 cm) · <strong className="text-emerald-600">450 FCFA/pièce</strong>
            <br /><span className="text-slate-600 text-[10px]">→ Murs porteurs ⭐ (le plus utilisé)</span>
          </div>
        </div>
        <p className="mt-2 text-xs">📐 <strong>~12 parpaings/m²</strong> de mur (avec joints).</p>
      </>
    );
  }

  // ========== HOURDIS ==========
  if (KEYWORDS.hourdis.test(msg)) {
    return (
      <>
        🧱 <strong>Hourdis (entrevous béton) :</strong>
        <div className="mt-2 space-y-1 text-xs">
          <div className="bg-slate-50 rounded p-1.5">
            <strong>Hourdis 16+4</strong> · <strong className="text-emerald-600">950 FCFA/pièce</strong>
            <br /><span className="text-slate-600 text-[10px]">→ Plancher courant, portée jusqu'à 5m</span>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <strong>Hourdis 20+4</strong> · <strong className="text-emerald-600">1 150 FCFA/pièce</strong>
            <br /><span className="text-slate-600 text-[10px]">→ Grandes portées, étages</span>
          </div>
        </div>
        <p className="mt-2 text-xs">📐 <strong>~8 hourdis/m²</strong> de plancher.</p>
      </>
    );
  }

  // ========== LIVRAISON ==========
  if (KEYWORDS.livraison.test(msg)) {
    return (
      <>
        🚚 <strong>Service de livraison Allô Béton :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📍 <strong>Zones</strong> : Dakar, Thiès, Saint-Louis (extension prévue)</li>
          <li>⏱️ <strong>Délai</strong> : 24h à 48h après commande</li>
          <li>🚛 <strong>Camions toupie</strong> pour béton (capacité 6-8 m³)</li>
          <li>🚚 <strong>Camions plateau</strong> pour matériaux secs</li>
          <li>💰 <strong>Frais</strong> : selon distance (calculé au panier)</li>
          <li>🎁 <strong>GRATUITE</strong> dès <strong>500 000 FCFA</strong> sur Dakar</li>
        </ul>
        <p className="mt-2 text-xs">📲 Suivi en temps réel sur votre espace client.</p>
      </>
    );
  }

  // ========== PAIEMENT ==========
  if (KEYWORDS.paiement.test(msg)) {
    return (
      <>
        💳 <strong>Moyens de paiement acceptés :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📱 <strong>Wave</strong> · Le plus rapide ⭐</li>
          <li>📱 <strong>Orange Money</strong></li>
          <li>📱 <strong>Free Money</strong></li>
          <li>💳 <strong>Carte bancaire</strong> (Visa, Mastercard)</li>
          <li>🏦 <strong>Virement bancaire</strong> (B2B)</li>
          <li>💵 <strong>Espèces</strong> à la livraison</li>
          <li>📅 <strong>Crédit pro</strong> (NINEA requis)</li>
        </ul>
        <p className="mt-2 text-xs">🔒 Paiements sécurisés SSL 256-bit</p>
      </>
    );
  }

  // ========== CONTACT ==========
  if (KEYWORDS.contact.test(msg)) {
    return (
      <>
        📞 <strong>Contactez Allô Béton :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>☎️ <strong>Tél</strong> : +221 33 800 12 34</li>
          <li>💬 <strong>WhatsApp</strong> : +221 77 XXX XX XX</li>
          <li>📧 <strong>Email</strong> : contact@allobeton.sn</li>
          <li>📍 <strong>Siège</strong> : Dakar, Sénégal</li>
          <li>🕐 <strong>Horaires</strong> : Lun-Sam 8h-18h</li>
        </ul>
      </>
    );
  }

  // ========== PRODUITS / CATALOGUE ==========
  if (KEYWORDS.produit.test(msg)) {
    return (
      <>
        📦 <strong>Notre catalogue (28+ produits) :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>🧱 <strong>Béton</strong> : B15, B20, B25, B30 (prêt à l'emploi)</li>
          <li>📦 <strong>Ciment</strong> : Sococim, Dangote (CPA/CPJ 32.5/42.5)</li>
          <li>🔩 <strong>Fer</strong> : HA8 à HA20, treillis soudés</li>
          <li>🏖️ <strong>Sable</strong> : mer, carrière, lavé</li>
          <li>🪨 <strong>Granulats</strong> : 3/8, 8/16, 15/25</li>
          <li>🧱 <strong>Maçonnerie</strong> : parpaings, hourdis, briques</li>
        </ul>
      </>
    );
  }

  // ========== MUR ==========
  if (KEYWORDS.mur.test(msg)) {
    if (dims.longueur && dims.hauteur) {
      const surface = dims.longueur * dims.hauteur;
      const parpaings = Math.ceil(surface * 12.5);
      const ciment_kg = surface * 25; // ~25 kg/m² pour mortier
      const sacs = Math.ceil(ciment_kg / 50);
      return (
        <>
          🧱 <strong>Mur {dims.longueur}m × {dims.hauteur}m ({surface.toFixed(1)} m²) :</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
            <li>🧱 <strong>Parpaings 20</strong> : {parpaings} pièces</li>
            <li>🪣 <strong>Ciment</strong> : {sacs} sacs (mortier)</li>
            <li>🏖️ <strong>Sable</strong> : ~{(surface * 0.04).toFixed(2)} m³</li>
            <li>💰 <strong>Coût matériaux</strong> : ~{(parpaings * 450 + sacs * 4250).toLocaleString('fr-FR')} FCFA</li>
          </ul>
        </>
      );
    }
    return (
      <>
        🧱 <strong>Pour un mur en parpaings :</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>📐 <strong>~12 parpaings 20/m²</strong> de mur</li>
          <li>🪣 <strong>~25 kg de ciment/m²</strong> (mortier)</li>
          <li>🏖️ <strong>~0.04 m³ de sable/m²</strong></li>
          <li>🔩 <strong>Chaînage</strong> : tous les 3m horizontalement</li>
        </ul>
        <p className="mt-2 text-xs">Donnez-moi les dimensions (ex: <em>"mur 8m x 3m"</em>) pour un calcul précis.</p>
      </>
    );
  }

  // ========== RÉPONSE PAR DÉFAUT INTELLIGENTE ==========
  return (
    <>
      Je ne suis pas certain d'avoir compris... 🤔 Mais je peux vous aider sur :
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        <div className="bg-slate-50 p-1.5 rounded">📐 <strong>Calculs</strong> (béton, fer)</div>
        <div className="bg-slate-50 p-1.5 rounded">💰 <strong>Prix</strong> en FCFA</div>
        <div className="bg-slate-50 p-1.5 rounded">🏗️ <strong>Conseils</strong> techniques</div>
        <div className="bg-slate-50 p-1.5 rounded">🚚 <strong>Livraison</strong> & paiement</div>
      </div>
      <p className="mt-2 text-xs italic">Exemples de questions :</p>
      <ul className="text-xs space-y-0.5 mt-1">
        <li>• "Béton pour dalle de 50m² à 15cm"</li>
        <li>• "Quelle classe de béton pour fondation ?"</li>
        <li>• "Cure du béton par temps chaud"</li>
        <li>• "Prix du fer HA12"</li>
      </ul>
      <p className="mt-2 text-xs">Ou contactez-nous au <strong>+221 33 800 12 34</strong> 📞</p>
    </>
  );
};
