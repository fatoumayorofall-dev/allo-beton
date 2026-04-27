const express = require('express');
const router = express.Router();
const db = require('../db');
const smartEngine = require('../services/smartAccountingEngine');

// ============================================
// SMART ACCOUNTING API - COMPTABILITÉ INVISIBLE
// ============================================

// GET /api/smart-accounting/dashboard - Dashboard intelligent avec KPIs
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // CA du mois
        const [caMonth] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM sales
            WHERE created_at >= ? AND status != 'cancelled'
        `, [startOfMonth]);

        // CA de l'année
        const [caYear] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM sales
            WHERE created_at >= ? AND status != 'cancelled'
        `, [startOfYear]);

        // CA du mois dernier (pour comparaison)
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const [caLastMonth] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM sales
            WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
        `, [lastMonthStart, lastMonthEnd]);

        // Trésorerie totale (banques + caisses + mobile money)
        const [tresorerie] = await db.query(`
            SELECT
                COALESCE((SELECT SUM(balance) FROM banks WHERE status = 'active'), 0) as banques,
                COALESCE((SELECT SUM(solde_actuel) FROM caisses WHERE statut = 'active'), 0) as caisses,
                COALESCE((SELECT SUM(solde) FROM comptes_mobile_money WHERE actif = 1), 0) as mobile_money
        `);

        const tresorerieTotal = parseFloat(tresorerie[0]?.banques || 0) +
                                parseFloat(tresorerie[0]?.caisses || 0) +
                                parseFloat(tresorerie[0]?.mobile_money || 0);

        // Impayés clients
        const [impayes] = await db.query(`
            SELECT
                COUNT(*) as count,
                COALESCE(SUM(s.total_amount - COALESCE(p.paid, 0)), 0) as total
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, SUM(amount) as paid
                FROM payments
                WHERE status = 'completed'
                GROUP BY sale_id
            ) p ON s.id = p.sale_id
            WHERE s.status = 'completed'
            AND s.payment_status != 'paid'
            AND (s.total_amount - COALESCE(p.paid, 0)) > 0
        `);

        // Impayés en retard (> 30 jours)
        const [impayesRetard] = await db.query(`
            SELECT
                COUNT(*) as count,
                COALESCE(SUM(s.total_amount - COALESCE(p.paid, 0)), 0) as total
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, SUM(amount) as paid
                FROM payments
                WHERE status = 'completed'
                GROUP BY sale_id
            ) p ON s.id = p.sale_id
            WHERE s.status = 'completed'
            AND s.payment_status != 'paid'
            AND (s.total_amount - COALESCE(p.paid, 0)) > 0
            AND s.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        // TVA collectée du mois (18% UEMOA)
        const [tvaCollectee] = await db.query(`
            SELECT COALESCE(SUM(total_amount * 0.18 / 1.18), 0) as total
            FROM sales
            WHERE created_at >= ? AND status != 'cancelled'
        `, [startOfMonth]);

        // TVA déductible du mois
        const [tvaDeductible] = await db.query(`
            SELECT COALESCE(SUM(total * 0.18 / 1.18), 0) as total
            FROM purchase_orders
            WHERE created_at >= ? AND status = 'received'
        `, [startOfMonth]);

        // Évolution mensuelle (12 derniers mois)
        const [evolutionMensuelle] = await db.query(`
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') as mois,
                SUM(total_amount) as ca,
                COUNT(*) as nb_ventes
            FROM sales
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            AND status != 'cancelled'
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY mois ASC
        `);

        // Top 5 clients
        const [topClients] = await db.query(`
            SELECT
                c.id,
                c.name,
                c.company,
                COUNT(s.id) as nb_commandes,
                SUM(s.total_amount) as ca_total
            FROM customers c
            JOIN sales s ON c.id = s.customer_id
            WHERE s.status != 'cancelled'
            AND s.created_at >= ?
            GROUP BY c.id
            ORDER BY ca_total DESC
            LIMIT 5
        `, [startOfYear]);

        // Top 5 produits
        const [topProduits] = await db.query(`
            SELECT
                p.id,
                p.name,
                p.category,
                SUM(si.quantity) as quantite_vendue,
                SUM(si.quantity * si.unit_price) as ca_total
            FROM products p
            JOIN sale_items si ON p.id = si.product_id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.status != 'cancelled'
            AND s.created_at >= ?
            GROUP BY p.id
            ORDER BY ca_total DESC
            LIMIT 5
        `, [startOfYear]);

        // Calcul évolution CA
        const caMonthValue = parseFloat(caMonth[0]?.total || 0);
        const caLastMonthValue = parseFloat(caLastMonth[0]?.total || 0);
        const evolutionCA = caLastMonthValue > 0
            ? ((caMonthValue - caLastMonthValue) / caLastMonthValue * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            dashboard: {
                kpis: {
                    ca_mois: caMonthValue,
                    ca_annee: parseFloat(caYear[0]?.total || 0),
                    evolution_ca: parseFloat(evolutionCA),
                    tresorerie_totale: tresorerieTotal,
                    tresorerie_detail: {
                        banques: parseFloat(tresorerie[0]?.banques || 0),
                        caisses: parseFloat(tresorerie[0]?.caisses || 0),
                        mobile_money: parseFloat(tresorerie[0]?.mobile_money || 0)
                    },
                    impayes: {
                        total: parseFloat(impayes[0]?.total || 0),
                        count: parseInt(impayes[0]?.count || 0)
                    },
                    impayes_retard: {
                        total: parseFloat(impayesRetard[0]?.total || 0),
                        count: parseInt(impayesRetard[0]?.count || 0)
                    },
                    tva: {
                        collectee: parseFloat(tvaCollectee[0]?.total || 0),
                        deductible: parseFloat(tvaDeductible[0]?.total || 0),
                        a_payer: parseFloat(tvaCollectee[0]?.total || 0) - parseFloat(tvaDeductible[0]?.total || 0)
                    }
                },
                evolution_mensuelle: evolutionMensuelle,
                top_clients: topClients,
                top_produits: topProduits,
                date_generation: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur dashboard smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération du dashboard',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/alerts - Alertes intelligentes
router.get('/alerts', async (req, res) => {
    try {
        const alerts = [];

        // 1. Alertes retards de paiement (> 30 jours)
        const [retardsPaiement] = await db.query(`
            SELECT
                s.id,
                s.sale_number,
                c.name as client_name,
                c.company,
                s.total_amount,
                COALESCE(p.paid, 0) as paid,
                (s.total_amount - COALESCE(p.paid, 0)) as reste_du,
                DATEDIFF(NOW(), s.created_at) as jours_retard
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            LEFT JOIN (
                SELECT sale_id, SUM(amount) as paid
                FROM payments
                WHERE status = 'completed'
                GROUP BY sale_id
            ) p ON s.id = p.sale_id
            WHERE s.status = 'completed'
            AND s.payment_status != 'paid'
            AND (s.total_amount - COALESCE(p.paid, 0)) > 0
            AND s.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY jours_retard DESC
            LIMIT 10
        `);

        retardsPaiement.forEach(r => {
            alerts.push({
                type: 'retard_paiement',
                severity: r.jours_retard > 60 ? 'critical' : 'warning',
                title: `Facture ${r.sale_number} en retard`,
                message: `${r.client_name || r.company} - ${parseFloat(r.reste_du).toLocaleString()} FCFA impayés depuis ${r.jours_retard} jours`,
                data: r,
                action: {
                    label: 'Envoyer relance',
                    endpoint: `/api/notifications/send-reminder/${r.id}`
                }
            });
        });

        // 2. Alerte trésorerie faible
        const [tresorerie] = await db.query(`
            SELECT
                COALESCE((SELECT SUM(balance) FROM banks WHERE status = 'active'), 0) +
                COALESCE((SELECT SUM(solde_actuel) FROM caisses WHERE statut = 'active'), 0) +
                COALESCE((SELECT SUM(solde) FROM comptes_mobile_money WHERE actif = 1), 0) as total
        `);

        const tresoTotal = parseFloat(tresorerie[0]?.total || 0);

        // Charges mensuelles moyennes (estimation basée sur achats)
        const [chargesMensuelles] = await db.query(`
            SELECT COALESCE(AVG(monthly_total), 0) as moyenne
            FROM (
                SELECT SUM(total) as monthly_total
                FROM purchase_orders
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ) monthly
        `);

        const chargesMoy = parseFloat(chargesMensuelles[0]?.moyenne || 0);
        const moisCouverture = chargesMoy > 0 ? tresoTotal / chargesMoy : 999;

        if (moisCouverture < 2) {
            alerts.push({
                type: 'tresorerie_faible',
                severity: moisCouverture < 1 ? 'critical' : 'warning',
                title: 'Trésorerie faible',
                message: `Trésorerie de ${tresoTotal.toLocaleString()} FCFA couvre ${moisCouverture.toFixed(1)} mois de charges`,
                data: {
                    tresorerie: tresoTotal,
                    charges_mensuelles: chargesMoy,
                    mois_couverture: moisCouverture
                },
                action: {
                    label: 'Voir détails',
                    endpoint: '/comptabilite?tab=tresorerie'
                }
            });
        }

        // 3. Alertes stocks faibles
        const [stocksFaibles] = await db.query(`
            SELECT
                id, name, category, quantity, min_stock,
                CASE
                    WHEN quantity = 0 THEN 'rupture'
                    WHEN quantity <= min_stock * 0.5 THEN 'critique'
                    ELSE 'faible'
                END as niveau
            FROM products
            WHERE quantity <= min_stock AND min_stock > 0
            ORDER BY quantity ASC
            LIMIT 10
        `);

        stocksFaibles.forEach(s => {
            alerts.push({
                type: 'stock_faible',
                severity: s.niveau === 'rupture' ? 'critical' : (s.niveau === 'critique' ? 'warning' : 'info'),
                title: s.niveau === 'rupture' ? `Rupture de stock: ${s.name}` : `Stock faible: ${s.name}`,
                message: `${s.quantity} unités en stock (minimum: ${s.min_stock})`,
                data: s,
                action: {
                    label: 'Commander',
                    endpoint: `/inventory/${s.id}/restock`
                }
            });
        });

        // 4. Échéances fournisseurs proches
        const [echeancesFournisseurs] = await db.query(`
            SELECT
                po.id,
                po.order_number,
                s.name as fournisseur,
                po.total,
                po.due_date,
                DATEDIFF(po.due_date, NOW()) as jours_restants
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.status = 'received'
            AND po.payment_status != 'paid'
            AND po.due_date IS NOT NULL
            AND po.due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
            ORDER BY po.due_date ASC
            LIMIT 5
        `);

        echeancesFournisseurs.forEach(e => {
            alerts.push({
                type: 'echeance_fournisseur',
                severity: e.jours_restants <= 0 ? 'critical' : 'warning',
                title: e.jours_restants <= 0 ? `Échéance dépassée: ${e.order_number}` : `Échéance proche: ${e.order_number}`,
                message: `${e.fournisseur} - ${parseFloat(e.total).toLocaleString()} FCFA ${e.jours_restants <= 0 ? 'en retard de ' + Math.abs(e.jours_restants) + ' jours' : 'dans ' + e.jours_restants + ' jours'}`,
                data: e,
                action: {
                    label: 'Payer',
                    endpoint: `/purchases/${e.id}/pay`
                }
            });
        });

        // 5. Déclaration TVA à faire
        const today = new Date();
        const jourDuMois = today.getDate();
        if (jourDuMois >= 1 && jourDuMois <= 15) {
            const moisPrecedent = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const [declarationTVA] = await db.query(`
                SELECT id FROM declarations_tva
                WHERE periode = ? AND status = 'submitted'
            `, [moisPrecedent.toISOString().slice(0, 7)]);

            if (!declarationTVA || declarationTVA.length === 0) {
                alerts.push({
                    type: 'tva_declaration',
                    severity: jourDuMois > 10 ? 'critical' : 'warning',
                    title: 'Déclaration TVA à soumettre',
                    message: `La déclaration TVA du mois précédent doit être soumise avant le 15 du mois (J-${15 - jourDuMois})`,
                    data: {
                        periode: moisPrecedent.toISOString().slice(0, 7),
                        jours_restants: 15 - jourDuMois
                    },
                    action: {
                        label: 'Déclarer',
                        endpoint: '/comptabilite?tab=tva'
                    }
                });
            }
        }

        // 6. Ventes non comptabilisées
        const [ventesNonCompta] = await db.query(`
            SELECT COUNT(*) as count, SUM(total_amount) as total
            FROM sales s
            WHERE s.status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM ecritures_comptables ec
                WHERE ec.reference = CONCAT('VT-', s.id)
            )
        `);

        if (parseInt(ventesNonCompta[0]?.count || 0) > 0) {
            alerts.push({
                type: 'ventes_non_comptabilisees',
                severity: 'warning',
                title: 'Ventes non comptabilisées',
                message: `${ventesNonCompta[0].count} ventes (${parseFloat(ventesNonCompta[0].total || 0).toLocaleString()} FCFA) n'ont pas d'écritures comptables`,
                data: ventesNonCompta[0],
                action: {
                    label: 'Synchroniser',
                    endpoint: '/api/smart-accounting/sync'
                }
            });
        }

        // Trier par sévérité
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        res.json({
            success: true,
            alerts,
            summary: {
                total: alerts.length,
                critical: alerts.filter(a => a.severity === 'critical').length,
                warning: alerts.filter(a => a.severity === 'warning').length,
                info: alerts.filter(a => a.severity === 'info').length
            },
            date_generation: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur alertes smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération des alertes',
            details: error.message
        });
    }
});

// POST /api/smart-accounting/sync - Synchronisation automatique
router.post('/sync', async (req, res) => {
    try {
        const results = {
            ventes: { success: 0, errors: 0, details: [] },
            paiements: { success: 0, errors: 0, details: [] },
            achats: { success: 0, errors: 0, details: [] }
        };

        // Synchroniser les ventes
        const [ventesNonSync] = await db.query(`
            SELECT s.*, c.name as client_name, c.company
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM ecritures_comptables ec
                WHERE ec.reference = CONCAT('VT-', s.id)
            )
            LIMIT 100
        `);

        for (const vente of ventesNonSync) {
            try {
                await smartEngine.enregistrerVente(vente);
                results.ventes.success++;
                results.ventes.details.push({
                    id: vente.id,
                    sale_number: vente.sale_number,
                    status: 'synced'
                });
            } catch (err) {
                results.ventes.errors++;
                results.ventes.details.push({
                    id: vente.id,
                    sale_number: vente.sale_number,
                    status: 'error',
                    error: err.message
                });
            }
        }

        // Synchroniser les paiements
        const [paiementsNonSync] = await db.query(`
            SELECT p.*, s.sale_number, c.name as client_name
            FROM payments p
            JOIN sales s ON p.sale_id = s.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE p.status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM ecritures_comptables ec
                WHERE ec.reference = CONCAT('PAY-', p.id)
            )
            LIMIT 100
        `);

        for (const paiement of paiementsNonSync) {
            try {
                await smartEngine.enregistrerPaiementClient(paiement);
                results.paiements.success++;
                results.paiements.details.push({
                    id: paiement.id,
                    status: 'synced'
                });
            } catch (err) {
                results.paiements.errors++;
                results.paiements.details.push({
                    id: paiement.id,
                    status: 'error',
                    error: err.message
                });
            }
        }

        // Synchroniser les achats
        const [achatsNonSync] = await db.query(`
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.status = 'received'
            AND NOT EXISTS (
                SELECT 1 FROM ecritures_comptables ec
                WHERE ec.reference = CONCAT('AC-', po.id)
            )
            LIMIT 100
        `);

        for (const achat of achatsNonSync) {
            try {
                await smartEngine.enregistrerAchat(achat);
                results.achats.success++;
                results.achats.details.push({
                    id: achat.id,
                    order_number: achat.order_number,
                    status: 'synced'
                });
            } catch (err) {
                results.achats.errors++;
                results.achats.details.push({
                    id: achat.id,
                    order_number: achat.order_number,
                    status: 'error',
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Synchronisation terminée',
            results,
            summary: {
                total_synced: results.ventes.success + results.paiements.success + results.achats.success,
                total_errors: results.ventes.errors + results.paiements.errors + results.achats.errors
            },
            date_sync: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur sync smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la synchronisation',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/previsions - Prévisions de trésorerie
router.get('/previsions', async (req, res) => {
    try {
        const mois = parseInt(req.query.mois) || 3;

        // Trésorerie actuelle
        const [tresorerie] = await db.query(`
            SELECT
                COALESCE((SELECT SUM(balance) FROM banks WHERE status = 'active'), 0) +
                COALESCE((SELECT SUM(solde_actuel) FROM caisses WHERE statut = 'active'), 0) +
                COALESCE((SELECT SUM(solde) FROM comptes_mobile_money WHERE actif = 1), 0) as total
        `);

        let soldeActuel = parseFloat(tresorerie[0]?.total || 0);

        // Moyenne des encaissements mensuels (basé sur 6 derniers mois)
        const [encaissementsMoy] = await db.query(`
            SELECT COALESCE(AVG(monthly_total), 0) as moyenne
            FROM (
                SELECT SUM(amount) as monthly_total
                FROM payments
                WHERE status = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ) monthly
        `);

        // Moyenne des décaissements mensuels
        const [decaissementsMoy] = await db.query(`
            SELECT COALESCE(AVG(monthly_total), 0) as moyenne
            FROM (
                SELECT SUM(total) as monthly_total
                FROM purchase_orders
                WHERE status = 'received'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ) monthly
        `);

        // Créances attendues
        const [creancesAttendues] = await db.query(`
            SELECT COALESCE(SUM(s.total_amount - COALESCE(p.paid, 0)), 0) as total
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, SUM(amount) as paid
                FROM payments
                WHERE status = 'completed'
                GROUP BY sale_id
            ) p ON s.id = p.sale_id
            WHERE s.status = 'completed'
            AND s.payment_status != 'paid'
        `);

        // Dettes à payer
        const [dettesAPayer] = await db.query(`
            SELECT COALESCE(SUM(total), 0) as total
            FROM purchase_orders
            WHERE status = 'received'
            AND payment_status != 'paid'
        `);

        const encaissementMoyen = parseFloat(encaissementsMoy[0]?.moyenne || 0);
        const decaissementMoyen = parseFloat(decaissementsMoy[0]?.moyenne || 0);
        const creances = parseFloat(creancesAttendues[0]?.total || 0);
        const dettes = parseFloat(dettesAPayer[0]?.total || 0);

        // Générer les prévisions
        const previsions = [];
        let solde = soldeActuel;

        for (let i = 1; i <= mois; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);

            // Estimation des encaissements (moyenne + % des créances)
            const encaissementPrevu = encaissementMoyen + (creances * 0.3 / mois);

            // Estimation des décaissements
            const decaissementPrevu = decaissementMoyen + (dettes * 0.4 / mois);

            solde = solde + encaissementPrevu - decaissementPrevu;

            previsions.push({
                mois: date.toISOString().slice(0, 7),
                mois_label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                solde_debut: i === 1 ? soldeActuel : previsions[i-2].solde_fin,
                encaissements_prevus: encaissementPrevu,
                decaissements_prevus: decaissementPrevu,
                solde_fin: solde,
                variation: encaissementPrevu - decaissementPrevu,
                alerte: solde < decaissementMoyen
            });
        }

        res.json({
            success: true,
            previsions: {
                solde_actuel: soldeActuel,
                creances_totales: creances,
                dettes_totales: dettes,
                flux_net_mensuel_moyen: encaissementMoyen - decaissementMoyen,
                projections: previsions,
                risque: previsions.some(p => p.alerte) ? 'attention' : 'stable'
            },
            date_generation: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur prévisions smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du calcul des prévisions',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/analytics - Analyses avancées
router.get('/analytics', async (req, res) => {
    try {
        const periode = req.query.periode || '12'; // mois

        // Analyse par catégorie de produit
        const [ventesParCategorie] = await db.query(`
            SELECT
                p.category,
                COUNT(DISTINCT s.id) as nb_ventes,
                SUM(si.quantity) as quantite,
                SUM(si.quantity * si.unit_price) as ca,
                AVG(si.unit_price) as prix_moyen
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            AND s.status != 'cancelled'
            GROUP BY p.category
            ORDER BY ca DESC
        `, [periode]);

        // Analyse par mode de paiement
        const [paiementsParMode] = await db.query(`
            SELECT
                payment_method,
                COUNT(*) as count,
                SUM(amount) as total
            FROM payments
            WHERE status = 'completed'
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY payment_method
            ORDER BY total DESC
        `, [periode]);

        // Analyse saisonnalité
        const [saisonnalite] = await db.query(`
            SELECT
                MONTH(created_at) as mois,
                MONTHNAME(created_at) as mois_nom,
                SUM(total_amount) as ca,
                COUNT(*) as nb_ventes,
                AVG(total_amount) as panier_moyen
            FROM sales
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            AND status != 'cancelled'
            GROUP BY MONTH(created_at), MONTHNAME(created_at)
            ORDER BY mois
        `, [periode]);

        // Délai moyen de paiement
        const [delaiPaiement] = await db.query(`
            SELECT
                AVG(DATEDIFF(p.created_at, s.created_at)) as delai_moyen,
                MIN(DATEDIFF(p.created_at, s.created_at)) as delai_min,
                MAX(DATEDIFF(p.created_at, s.created_at)) as delai_max
            FROM payments p
            JOIN sales s ON p.sale_id = s.id
            WHERE p.status = 'completed'
            AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        `, [periode]);

        // Taux de conversion devis -> vente
        const [tauxConversion] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM quotations WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)) as nb_devis,
                (SELECT COUNT(*) FROM quotations WHERE status = 'converted' AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)) as nb_convertis
        `, [periode, periode]);

        const nbDevis = parseInt(tauxConversion[0]?.nb_devis || 0);
        const nbConvertis = parseInt(tauxConversion[0]?.nb_convertis || 0);

        // Rentabilité par client (top 10)
        const [rentabiliteClients] = await db.query(`
            SELECT
                c.id,
                c.name,
                c.company,
                COUNT(s.id) as nb_commandes,
                SUM(s.total_amount) as ca_total,
                AVG(s.total_amount) as panier_moyen,
                SUM(CASE WHEN s.payment_status = 'paid' THEN s.total_amount ELSE 0 END) as ca_encaisse,
                SUM(CASE WHEN s.payment_status != 'paid' THEN s.total_amount ELSE 0 END) as impayes
            FROM customers c
            JOIN sales s ON c.id = s.customer_id
            WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            AND s.status != 'cancelled'
            GROUP BY c.id
            ORDER BY ca_total DESC
            LIMIT 10
        `, [periode]);

        res.json({
            success: true,
            analytics: {
                periode_mois: parseInt(periode),
                ventes_par_categorie: ventesParCategorie,
                paiements_par_mode: paiementsParMode,
                saisonnalite,
                delai_paiement: {
                    moyen: parseFloat(delaiPaiement[0]?.delai_moyen || 0).toFixed(1),
                    min: parseInt(delaiPaiement[0]?.delai_min || 0),
                    max: parseInt(delaiPaiement[0]?.delai_max || 0)
                },
                taux_conversion: {
                    nb_devis: nbDevis,
                    nb_convertis: nbConvertis,
                    taux: nbDevis > 0 ? ((nbConvertis / nbDevis) * 100).toFixed(1) : 0
                },
                rentabilite_clients: rentabiliteClients
            },
            date_generation: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur analytics smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du calcul des analytics',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/rapprochement - Rapprochement bancaire intelligent
router.get('/rapprochement', async (req, res) => {
    try {
        const bankId = req.query.bank_id;

        // Mouvements bancaires non rapprochés
        const [mouvementsNonRapproches] = await db.query(`
            SELECT
                bm.*,
                b.name as bank_name
            FROM bank_movements bm
            JOIN banks b ON bm.bank_id = b.id
            WHERE bm.reconciled = 0 OR bm.reconciled IS NULL
            ${bankId ? 'AND bm.bank_id = ?' : ''}
            ORDER BY bm.date DESC
            LIMIT 50
        `, bankId ? [bankId] : []);

        // Paiements non rapprochés
        const [paiementsNonRapproches] = await db.query(`
            SELECT
                p.*,
                s.sale_number,
                c.name as client_name
            FROM payments p
            JOIN sales s ON p.sale_id = s.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE p.status = 'completed'
            AND (p.reconciled = 0 OR p.reconciled IS NULL)
            AND p.payment_method IN ('bank_transfer', 'check')
            ORDER BY p.created_at DESC
            LIMIT 50
        `);

        // Suggestions de rapprochement (matching par montant et date)
        const suggestions = [];

        for (const mouvement of mouvementsNonRapproches) {
            if (mouvement.type === 'credit' || mouvement.amount > 0) {
                // Chercher un paiement correspondant
                const matchingPaiements = paiementsNonRapproches.filter(p => {
                    const montantMatch = Math.abs(parseFloat(p.amount) - Math.abs(parseFloat(mouvement.amount))) < 1;
                    const dateMatch = Math.abs(new Date(p.created_at) - new Date(mouvement.date)) < 7 * 24 * 60 * 60 * 1000; // 7 jours
                    return montantMatch && dateMatch;
                });

                if (matchingPaiements.length > 0) {
                    suggestions.push({
                        mouvement_bancaire: mouvement,
                        paiements_suggeres: matchingPaiements,
                        confiance: matchingPaiements.length === 1 ? 'haute' : 'moyenne'
                    });
                }
            }
        }

        res.json({
            success: true,
            rapprochement: {
                mouvements_non_rapproches: mouvementsNonRapproches,
                paiements_non_rapproches: paiementsNonRapproches,
                suggestions,
                stats: {
                    nb_mouvements: mouvementsNonRapproches.length,
                    nb_paiements: paiementsNonRapproches.length,
                    nb_suggestions: suggestions.length
                }
            },
            date_generation: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur rapprochement smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du rapprochement',
            details: error.message
        });
    }
});

// POST /api/smart-accounting/rapprochement/valider - Valider un rapprochement
router.post('/rapprochement/valider', async (req, res) => {
    try {
        const { mouvement_id, paiement_id } = req.body;

        if (!mouvement_id || !paiement_id) {
            return res.status(400).json({
                success: false,
                error: 'mouvement_id et paiement_id sont requis'
            });
        }

        // Marquer le mouvement comme rapproché
        await db.query(`
            UPDATE bank_movements
            SET reconciled = 1, reconciled_at = NOW(), reconciled_payment_id = ?
            WHERE id = ?
        `, [paiement_id, mouvement_id]);

        // Marquer le paiement comme rapproché
        await db.query(`
            UPDATE payments
            SET reconciled = 1, reconciled_at = NOW(), reconciled_movement_id = ?
            WHERE id = ?
        `, [mouvement_id, paiement_id]);

        res.json({
            success: true,
            message: 'Rapprochement validé avec succès',
            mouvement_id,
            paiement_id
        });

    } catch (error) {
        console.error('Erreur validation rapprochement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la validation du rapprochement',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/journal/:code - Journal comptable
router.get('/journal/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const debut = req.query.debut || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
        const fin = req.query.fin || new Date().toISOString().slice(0, 10);

        const [ecritures] = await db.query(`
            SELECT ec.*,
                   pc.libelle as compte_libelle,
                   j.libelle as journal_libelle
            FROM ecritures_comptables ec
            LEFT JOIN plan_comptable pc ON ec.compte = pc.numero
            LEFT JOIN journaux_comptables j ON ec.journal_code = j.code
            WHERE ec.journal_code = ?
            AND ec.date_ecriture BETWEEN ? AND ?
            ORDER BY ec.date_ecriture DESC, ec.id DESC
        `, [code, debut, fin]);

        // Calcul des totaux
        let totalDebit = 0;
        let totalCredit = 0;
        ecritures.forEach(e => {
            totalDebit += parseFloat(e.debit || 0);
            totalCredit += parseFloat(e.credit || 0);
        });

        res.json({
            success: true,
            journal: {
                code,
                periode: { debut, fin },
                ecritures,
                totaux: {
                    debit: totalDebit,
                    credit: totalCredit,
                    equilibre: Math.abs(totalDebit - totalCredit) < 0.01
                }
            }
        });

    } catch (error) {
        console.error('Erreur journal smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du journal',
            details: error.message
        });
    }
});

// GET /api/smart-accounting/grand-livre/:compte - Grand livre d'un compte
router.get('/grand-livre/:compte', async (req, res) => {
    try {
        const { compte } = req.params;
        const debut = req.query.debut || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
        const fin = req.query.fin || new Date().toISOString().slice(0, 10);

        // Info du compte
        const [compteInfo] = await db.query(`
            SELECT * FROM plan_comptable WHERE numero = ?
        `, [compte]);

        // Solde initial (avant la période)
        const [soldeInitial] = await db.query(`
            SELECT
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit
            FROM ecritures_comptables
            WHERE compte = ? AND date_ecriture < ?
        `, [compte, debut]);

        const soldeDebutDebit = parseFloat(soldeInitial[0]?.total_debit || 0);
        const soldeDebutCredit = parseFloat(soldeInitial[0]?.total_credit || 0);
        const soldeDebut = soldeDebutDebit - soldeDebutCredit;

        // Mouvements de la période
        const [mouvements] = await db.query(`
            SELECT ec.*, j.libelle as journal_libelle
            FROM ecritures_comptables ec
            LEFT JOIN journaux_comptables j ON ec.journal_code = j.code
            WHERE ec.compte = ?
            AND ec.date_ecriture BETWEEN ? AND ?
            ORDER BY ec.date_ecriture ASC, ec.id ASC
        `, [compte, debut, fin]);

        // Calcul du solde progressif
        let soldeProgressif = soldeDebut;
        const mouvementsAvecSolde = mouvements.map(m => {
            soldeProgressif += parseFloat(m.debit || 0) - parseFloat(m.credit || 0);
            return {
                ...m,
                solde_progressif: soldeProgressif
            };
        });

        // Totaux de la période
        let totalDebitPeriode = 0;
        let totalCreditPeriode = 0;
        mouvements.forEach(m => {
            totalDebitPeriode += parseFloat(m.debit || 0);
            totalCreditPeriode += parseFloat(m.credit || 0);
        });

        res.json({
            success: true,
            grand_livre: {
                compte,
                compte_info: compteInfo[0] || null,
                periode: { debut, fin },
                solde_debut: soldeDebut,
                mouvements: mouvementsAvecSolde,
                totaux: {
                    debit: totalDebitPeriode,
                    credit: totalCreditPeriode
                },
                solde_fin: soldeProgressif
            }
        });

    } catch (error) {
        console.error('Erreur grand-livre smart-accounting:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du grand livre',
            details: error.message
        });
    }
});

module.exports = router;
