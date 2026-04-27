import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus, Search, Phone, Building2, Eye, Edit, Trash2,
  Users, RefreshCw, MapPin, AlertCircle, Wallet,
  ShoppingCart, Calendar, TrendingUp, Filter, ChevronDown,
  Banknote, PiggyBank, MessageSquare, Upload, AlertTriangle, Zap,
  LayoutGrid, List, FileSpreadsheet, FileDown, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Customer } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { customersAPI } from '../../services/mysql-api';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';

interface CustomersListProps {
  onCreateCustomer: () => void;
  onViewCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

// Types de clients avec couleurs
const CUSTOMER_TYPES = {
  occasionnel: { label: 'Occasionnel', color: 'bg-cyan-100 text-cyan-700', icon: Zap },
  simple: { label: 'Simple', color: 'bg-gray-100 text-gray-600', icon: Users },
  quotataire: { label: 'Quotataire', color: 'bg-violet-100 text-violet-700', icon: PiggyBank },
  revendeur: { label: 'Revendeur', color: 'bg-amber-100 text-amber-700', icon: ShoppingCart },
};

export const CustomersList: React.FC<CustomersListProps> = ({
  onCreateCustomer,
  onViewCustomer,
  onEditCustomer
}) => {
  const { customers, loading, error, refreshCustomers } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'occasionnel' | 'simple' | 'quotataire' | 'revendeur' | 'debt' | 'prepaid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'purchases' | 'balance' | 'recent'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const ITEMS_PER_PAGE = 20;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Charger les settings au montage
  React.useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const formatMoney = (amount: number): string => {
    return formatCurrency(amount, settings || undefined);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Jamais';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredAndSortedCustomers = useMemo(() => {
    let result = customers || [];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((c) => {
        const name = (c?.name || '').toLowerCase();
        const email = (c?.email || '').toLowerCase();
        const company = (c?.company || '').toLowerCase();
        const phone = (c?.phone || '').toLowerCase();
        const city = (c?.city || '').toLowerCase();
        return name.includes(term) || email.includes(term) || company.includes(term) || phone.includes(term) || city.includes(term);
      });
    }

    // Filtrer par type
    if (filterType === 'debt') {
      result = result.filter((c) => Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0) > 0);
    } else if (filterType === 'prepaid') {
      result = result.filter((c) => Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0) > 0);
    } else if (filterType !== 'all') {
      result = result.filter((c) => (c?.customerType || c?.customer_type || 'simple') === filterType);
    }

    // Trier
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'purchases':
          return Number(b?.totalPurchases || 0) - Number(a?.totalPurchases || 0);
        case 'balance':
          // Trier par solde (prépayé pour quotataires, dette pour autres)
          const aType = a?.customerType || a?.customer_type || 'simple';
          const bType = b?.customerType || b?.customer_type || 'simple';
          const aBalance = aType === 'quotataire' ? Number(a?.prepaidBalance || a?.prepaid_balance || 0) : Number(a?.balance || a?.debt || 0);
          const bBalance = bType === 'quotataire' ? Number(b?.prepaidBalance || b?.prepaid_balance || 0) : Number(b?.balance || b?.debt || 0);
          return bBalance - aBalance;
        case 'recent':
          const dateA = (a?.lastPurchaseDate || a?.last_purchase_date) ? new Date(String(a.lastPurchaseDate || a.last_purchase_date)).getTime() : 0;
          const dateB = (b?.lastPurchaseDate || b?.last_purchase_date) ? new Date(String(b.lastPurchaseDate || b.last_purchase_date)).getTime() : 0;
          return dateB - dateA;
        default:
          return (a?.name || '').localeCompare(b?.name || '');
      }
    });

    return result;
  }, [customers, searchTerm, filterType, sortBy]);

  // Réinitialiser la pagination lors d’un changement de filtre/recherche/tri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedCustomers, currentPage]);

  const stats = useMemo(() => {
    const all = customers || [];
    const occasionnels = all.filter((c) => (c?.customerType || c?.customer_type) === 'occasionnel');
    const simples = all.filter((c) => (c?.customerType || c?.customer_type || 'simple') === 'simple');
    const quotataires = all.filter((c) => (c?.customerType || c?.customer_type) === 'quotataire');
    const revendeurs = all.filter((c) => (c?.customerType || c?.customer_type) === 'revendeur');

    // Alertes
    const overCreditLimit = all.filter((c) => {
      const debt = Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0);
      const limit = Number(c?.creditLimit ?? c?.credit_limit ?? 0);
      return limit > 0 && debt > limit;
    });
    const lowPrepaid = quotataires.filter((c) => {
      const prepaid = Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0);
      return prepaid > 0 && prepaid < 10000;
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactive = all.filter((c) => {
      const lastPurchase = c?.lastPurchaseDate || c?.last_purchase_date;
      if (!lastPurchase) return true;
      return new Date(lastPurchase) < thirtyDaysAgo;
    });

    return {
      totalCustomers: all.length,
      // Comptes par type
      occasionnelCount: occasionnels.length,
      simpleCount: simples.length,
      quotataireCount: quotataires.length,
      revendeurCount: revendeurs.length,
      // Dettes (clients simples/revendeurs)
      totalDebt: all.reduce((sum: number, c) => sum + Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0), 0),
      withDebtCount: all.filter((c) => Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0) > 0).length,
      // Soldes prépayés (quotataires)
      totalPrepaid: all.reduce((sum: number, c) => sum + Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0), 0),
      withPrepaidCount: all.filter((c) => Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0) > 0).length,
      // CA Total
      totalPurchases: all.reduce((sum: number, c) => sum + Number(c?.totalPurchases || 0), 0),
      // Alertes
      overCreditLimit,
      lowPrepaid,
      inactive,
    };
  }, [customers]);

  const getCustomerType = (customer: Customer) => {
    const type = customer?.customerType || customer?.customer_type || 'simple';
    return CUSTOMER_TYPES[type as keyof typeof CUSTOMER_TYPES] || CUSTOMER_TYPES.simple;
  };

  const getStatusColor = (customer: Customer) => {
    const type = customer?.customerType || customer?.customer_type || 'simple';
    const debt = Number(customer?.balance ?? customer?.debt ?? customer?.current_balance ?? 0);
    const prepaid = Number(customer?.prepaidBalance ?? customer?.prepaid_balance ?? 0);
    
    if (type === 'quotataire' && prepaid <= 0) return 'border-l-orange-400';
    if (debt > 0) return 'border-l-red-400';
    if (type === 'quotataire') return 'border-l-emerald-400';
    return 'border-l-gray-200';
  };

  const handleDelete = async (customer: Customer) => {
    setConfirmDelete(customer);
  };

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Allo Béton SaaS';
    wb.created = new Date();
    wb.modified = new Date();
    wb.company = 'Allo Béton';

    // ===== PALETTE PREMIUM =====
    const NAVY = '0F172A';
    const NAVY_MED = '1E293B';
    const SLATE_700 = '334155';
    const SLATE_500 = '64748B';
    const SLATE_200 = 'E2E8F0';
    const SLATE_100 = 'F1F5F9';
    const SLATE_50 = 'F8FAFC';
    const BLUE_600 = '2563EB';
    const BLUE_100 = 'DBEAFE';
    const BLUE_50 = 'EFF6FF';
    const EMERALD_700 = '047857';
    const EMERALD_600 = '059669';
    const EMERALD_100 = 'D1FAE5';
    const EMERALD_50 = 'ECFDF5';
    const RED_600 = 'DC2626';
    const RED_500 = 'EF4444';
    const RED_100 = 'FEE2E2';
    const RED_50 = 'FEF2F2';
    const AMBER_600 = 'D97706';
    const AMBER_100 = 'FEF3C7';
    const AMBER_50 = 'FFFBEB';
    const VIOLET_600 = '7C3AED';
    const VIOLET_100 = 'EDE9FE';
    const TEAL_600 = '0D9488';
    const TEAL_100 = 'CCFBF1';
    const INDIGO_600 = '4F46E5';
    const ROSE_600 = 'E11D48';
    const WHITE = 'FFFFFF';

    const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: SLATE_200 } };
    const med: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: SLATE_200 } };
    const borders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };
    const bordersThick: Partial<ExcelJS.Borders> = { top: med, bottom: med, left: med, right: med };

    const s = (cell: ExcelJS.Cell, opts: { f?: Partial<ExcelJS.Font>; bg?: string; a?: Partial<ExcelJS.Alignment>; b?: Partial<ExcelJS.Borders>; nf?: string }) => {
      if (opts.f) cell.font = opts.f as ExcelJS.Font;
      if (opts.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
      if (opts.a) cell.alignment = opts.a as ExcelJS.Alignment;
      if (opts.b) cell.border = opts.b;
      if (opts.nf) cell.numFmt = opts.nf;
    };

    // Totaux calculés
    const totalDebt = filteredAndSortedCustomers.reduce((sum, c) => sum + Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0), 0);
    const totalPrepaid = filteredAndSortedCustomers.reduce((sum, c) => sum + Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0), 0);
    const totalCA = filteredAndSortedCustomers.reduce((sum, c) => sum + Number(c?.totalPurchases || 0), 0);
    const totalOrders = filteredAndSortedCustomers.reduce((sum, c) => sum + Number(c?.totalOrders || 0), 0);
    const dateExport = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dateFull = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    // ==========================================
    // FEUILLE 1 : LISTE DES CLIENTS
    // ==========================================
    const ws = wb.addWorksheet('Clients', {
      properties: { defaultRowHeight: 20, tabColor: { argb: BLUE_600 } },
      pageSetup: {
        orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddHeader: '&C&B&12Allo Béton — Liste des Clients',
        oddFooter: '&LConfidentiel&C&P / &N&R&D',
      },
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    ws.columns = [
      { width: 6 },   // A: N°
      { width: 28 },  // B: Nom
      { width: 16 },  // C: Téléphone
      { width: 28 },  // D: Email
      { width: 24 },  // E: Entreprise
      { width: 16 },  // F: Ville
      { width: 15 },  // G: Type
      { width: 16 },  // H: Dette
      { width: 18 },  // I: Solde Prépayé
      { width: 18 },  // J: CA Total
      { width: 12 },  // K: Commandes
      { width: 14 },  // L: Dernier Achat
    ];

    // Ligne 1 : Bandeau titre
    ws.mergeCells('A1:L1');
    const t1 = ws.getCell('A1');
    t1.value = `LISTE DES CLIENTS  —  Allo Béton  —  ${dateExport}`;
    s(t1, { f: { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } }, bg: NAVY, a: { horizontal: 'center', vertical: 'middle' } });
    ws.getRow(1).height = 42;

    // Ligne 2 : Métriques
    ws.mergeCells('A2:L2');
    const t2 = ws.getCell('A2');
    t2.value = `${filteredAndSortedCustomers.length} client(s)  ·  CA Total: ${formatMoney(stats.totalPurchases)}  ·  Dettes: ${formatMoney(stats.totalDebt)}  ·  Prépayé: ${formatMoney(stats.totalPrepaid)}`;
    s(t2, { f: { name: 'Calibri', size: 10, color: { argb: SLATE_500 } }, bg: BLUE_50, a: { horizontal: 'center', vertical: 'middle' } });
    ws.getRow(2).height = 26;

    // Ligne 3 : accent
    ws.mergeCells('A3:L3');
    s(ws.getCell('A3'), { bg: BLUE_600 });
    ws.getRow(3).height = 3;

    // Ligne 4 : En-têtes
    const headers = ['N°', 'Nom', 'Téléphone', 'Email', 'Entreprise', 'Ville', 'Type', 'Dette (F CFA)', 'Solde Prépayé', 'CA Total (F CFA)', 'Cmd', 'Dernier Achat'];
    const hRow = ws.addRow(headers);
    hRow.height = 28;
    hRow.eachCell((cell, col) => {
      const isRight = col >= 8 && col <= 10;
      const isCentered = [1, 7, 11, 12].includes(col);
      s(cell, {
        f: { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } },
        bg: NAVY_MED,
        a: { horizontal: isRight ? 'right' : (isCentered ? 'center' : 'left'), vertical: 'middle', wrapText: true },
        b: { top: { style: 'medium', color: { argb: BLUE_600 } }, bottom: { style: 'medium', color: { argb: BLUE_600 } }, left: thin, right: thin },
      });
    });

    // Auto-filtre
    ws.autoFilter = { from: 'A4', to: 'L4' };

    // Données clients
    filteredAndSortedCustomers.forEach((c, i) => {
      const type = c?.customerType || c?.customer_type || 'simple';
      const typeLabel = CUSTOMER_TYPES[type as keyof typeof CUSTOMER_TYPES]?.label || type;
      const debt = Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0);
      const prepaid = Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0);
      const lastDate = c?.lastPurchaseDate || c?.last_purchase_date;

      const row = ws.addRow([
        i + 1, c.name || '', c.phone || '', c.email || '', c.company || '', c.city || '',
        typeLabel, debt, prepaid, Number(c.totalPurchases || 0), Number(c.totalOrders || 0),
        lastDate ? new Date(lastDate).toLocaleDateString('fr-FR') : '—'
      ]);
      row.height = 22;

      const bgc = i % 2 === 0 ? WHITE : SLATE_50;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        s(cell, { f: { name: 'Calibri', size: 10, color: { argb: SLATE_700 } }, bg: bgc, b: borders, a: { vertical: 'middle', horizontal: 'left' } });

        if (col === 1) s(cell, { f: { name: 'Calibri', size: 9, color: { argb: SLATE_500 } }, a: { horizontal: 'center', vertical: 'middle' } });
        if (col === 2) s(cell, { f: { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY } }, a: { horizontal: 'left', vertical: 'middle' } });
        if (col === 7) {
          const tc: Record<string, { b: string; c: string }> = {
            'Occasionnel': { b: 'E0F2FE', c: '0369A1' }, 'Simple': { b: SLATE_100, c: SLATE_500 },
            'Quotataire': { b: VIOLET_100, c: VIOLET_600 }, 'Revendeur': { b: AMBER_100, c: AMBER_600 },
          };
          const t = tc[typeLabel] || tc['Simple'];
          s(cell, { f: { name: 'Calibri', size: 9, bold: true, color: { argb: t.c } }, bg: t.b, a: { horizontal: 'center', vertical: 'middle' } });
        }
        if (col === 8) {
          s(cell, { nf: '#,##0', a: { horizontal: 'right', vertical: 'middle' } });
          if (debt > 0) s(cell, { f: { name: 'Calibri', size: 10, bold: true, color: { argb: RED_600 } }, bg: RED_50 });
        }
        if (col === 9) {
          s(cell, { nf: '#,##0', a: { horizontal: 'right', vertical: 'middle' } });
          if (prepaid > 0) s(cell, { f: { name: 'Calibri', size: 10, bold: true, color: { argb: EMERALD_700 } }, bg: EMERALD_50 });
        }
        if (col === 10) s(cell, { f: { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY_MED } }, nf: '#,##0', a: { horizontal: 'right', vertical: 'middle' } });
        if (col === 11) s(cell, { a: { horizontal: 'center', vertical: 'middle' } });
        if (col === 12) s(cell, { f: { name: 'Calibri', size: 9, color: { argb: SLATE_500 } }, a: { horizontal: 'center', vertical: 'middle' } });
      });
    });

    // Séparateur accent
    const sepRow = ws.addRow([]);
    sepRow.height = 3;
    for (let c = 1; c <= 12; c++) s(sepRow.getCell(c), { bg: BLUE_600 });

    // Ligne TOTAUX
    const totRow = ws.addRow(['', '  TOTAUX', '', '', '', '', `${filteredAndSortedCustomers.length} clients`, totalDebt, totalPrepaid, totalCA, totalOrders, '']);
    totRow.height = 30;
    totRow.eachCell({ includeEmpty: true }, (cell, col) => {
      s(cell, { f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: NAVY, b: bordersThick, a: { vertical: 'middle', horizontal: 'left' } });
      if (col === 2) s(cell, { f: { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } }, a: { horizontal: 'left', vertical: 'middle' } });
      if (col === 7) s(cell, { a: { horizontal: 'center', vertical: 'middle' } });
      if (col >= 8 && col <= 10) s(cell, { nf: '#,##0', a: { horizontal: 'right', vertical: 'middle' } });
      if (col === 11) s(cell, { a: { horizontal: 'center', vertical: 'middle' } });
    });

    // Formatage conditionnel natif Excel : dette > 0
    ws.addConditionalFormatting({
      ref: `H5:H${4 + filteredAndSortedCustomers.length}`,
      rules: [{
        type: 'cellIs', operator: 'greaterThan', priority: 1,
        formulae: [0],
        style: { font: { bold: true, color: { argb: 'FF' + RED_600 } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF' + RED_50 } } },
      }],
    });
    ws.addConditionalFormatting({
      ref: `I5:I${4 + filteredAndSortedCustomers.length}`,
      rules: [{
        type: 'cellIs', operator: 'greaterThan', priority: 2,
        formulae: [0],
        style: { font: { bold: true, color: { argb: 'FF' + EMERALD_700 } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF' + EMERALD_50 } } },
      }],
    });

    // ==========================================
    // FEUILLE 2 : TABLEAU DE BORD
    // ==========================================
    const dash = wb.addWorksheet('Tableau de Bord', {
      properties: { defaultRowHeight: 20, tabColor: { argb: INDIGO_600 } },
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
      views: [{ showGridLines: false }],
    });

    // ===== COLONNES : espacement uniforme =====
    // B:C = paire KPI 1, D = gap, E:F = paire KPI 2, G = gap centre, H:I = paire KPI 3, J = gap, K:L = paire KPI 4
    // Sections tableau : B-F gauche (5 colonnes), H-L droite (5 colonnes)
    dash.columns = [
      { width: 2 },   // A: marge
      { width: 18 },  // B
      { width: 18 },  // C
      { width: 8 },   // D: espacement / colonne %
      { width: 18 },  // E
      { width: 18 },  // F
      { width: 8 },   // G: séparateur central
      { width: 18 },  // H
      { width: 18 },  // I
      { width: 8 },   // J: espacement / colonne statut
      { width: 18 },  // K
      { width: 18 },  // L
    ];

    // Fond blanc global (pas de grille visible)
    for (let r = 1; r <= 50; r++) for (let c = 1; c <= 12; c++) s(dash.getCell(r, c), { bg: WHITE });

    // ---- BANDEAU TITRE ----
    dash.mergeCells('A1:L1');
    const dt1 = dash.getCell('A1');
    dt1.value = '     TABLEAU DE BORD  —  ALLO BÉTON';
    s(dt1, { f: { name: 'Calibri', size: 20, bold: true, color: { argb: WHITE } }, bg: NAVY, a: { horizontal: 'left', vertical: 'middle' } });
    dash.getRow(1).height = 54;

    dash.mergeCells('A2:L2');
    const dt2 = dash.getCell('A2');
    dt2.value = `Rapport généré le ${dateFull}  ·  ${stats.totalCustomers} clients enregistrés`;
    s(dt2, { f: { name: 'Calibri', size: 10, color: { argb: SLATE_500 } }, bg: SLATE_50, a: { horizontal: 'center', vertical: 'middle' } });
    dash.getRow(2).height = 26;

    dash.mergeCells('A3:L3');
    s(dash.getCell('A3'), { bg: BLUE_600 });
    dash.getRow(3).height = 4;
    dash.getRow(4).height = 12;

    // ---- 4 CARTES KPI ----
    const kpis = [
      { title: 'TOTAL CLIENTS', val: String(stats.totalCustomers), sub: `dont ${stats.withDebtCount} avec dette`, col: BLUE_600, light: BLUE_100, bg50: BLUE_50, icon: '👥' },
      { title: 'CHIFFRE D\'AFFAIRES', val: formatMoney(totalCA), sub: `${totalOrders} commandes au total`, col: EMERALD_600, light: EMERALD_100, bg50: EMERALD_50, icon: '💰' },
      { title: 'TOTAL DETTES', val: formatMoney(totalDebt), sub: `${stats.withDebtCount} client(s) concerné(s)`, col: RED_600, light: RED_100, bg50: RED_50, icon: '📉' },
      { title: 'SOLDES PRÉPAYÉS', val: formatMoney(totalPrepaid), sub: `${stats.withPrepaidCount} quotataire(s)`, col: TEAL_600, light: TEAL_100, bg50: 'F0FDFA', icon: '🏦' },
    ];
    const kpiPairs = [['B', 'C'], ['E', 'F'], ['H', 'I'], ['K', 'L']];

    // Ligne 5 : en-tête KPI
    dash.getRow(5).height = 30;
    kpis.forEach((k, i) => {
      const [c1, c2] = kpiPairs[i];
      dash.mergeCells(`${c1}5:${c2}5`);
      const cell = dash.getCell(`${c1}5`);
      cell.value = `  ${k.icon}  ${k.title}`;
      s(cell, {
        f: { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }, bg: k.col,
        a: { horizontal: 'left', vertical: 'middle' },
        b: { top: { style: 'medium', color: { argb: k.col } }, bottom: thin, left: { style: 'medium', color: { argb: k.col } }, right: { style: 'medium', color: { argb: k.col } } },
      });
    });

    // Ligne 6 : valeur principale
    dash.getRow(6).height = 48;
    kpis.forEach((k, i) => {
      const [c1, c2] = kpiPairs[i];
      dash.mergeCells(`${c1}6:${c2}6`);
      const cell = dash.getCell(`${c1}6`);
      cell.value = k.val;
      s(cell, {
        f: { name: 'Calibri', size: 22, bold: true, color: { argb: k.col } }, bg: k.bg50,
        a: { horizontal: 'center', vertical: 'middle' },
        b: { left: { style: 'medium', color: { argb: k.col } }, right: { style: 'medium', color: { argb: k.col } } },
      });
    });

    // Ligne 7 : sous-texte
    dash.getRow(7).height = 24;
    kpis.forEach((k, i) => {
      const [c1, c2] = kpiPairs[i];
      dash.mergeCells(`${c1}7:${c2}7`);
      const cell = dash.getCell(`${c1}7`);
      cell.value = k.sub;
      s(cell, {
        f: { name: 'Calibri', size: 9, italic: true, color: { argb: SLATE_500 } }, bg: k.light,
        a: { horizontal: 'center', vertical: 'middle' },
        b: { bottom: { style: 'medium', color: { argb: k.col } }, left: { style: 'medium', color: { argb: k.col } }, right: { style: 'medium', color: { argb: k.col } } },
      });
    });

    dash.getRow(8).height = 14;

    // ---- RÉPARTITION PAR TYPE (gauche B-F) ----
    let rw = 9;
    dash.mergeCells(`B${rw}:F${rw}`);
    s(dash.getCell(`B${rw}`), {
      f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: INDIGO_600,
      a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick,
    });
    dash.getCell(`B${rw}`).value = '  📊  RÉPARTITION PAR TYPE';
    dash.getRow(rw).height = 32;

    // Sous-en-têtes répartition
    rw = 10;
    dash.getRow(rw).height = 24;
    s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '6366F1', a: { horizontal: 'left', vertical: 'middle' }, b: borders });
    dash.getCell(`B${rw}`).value = '  Type';
    s(dash.getCell(`C${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '6366F1', a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`C${rw}`).value = 'Clients';
    s(dash.getCell(`D${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '6366F1', a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`D${rw}`).value = '%';
    dash.mergeCells(`E${rw}:F${rw}`);
    s(dash.getCell(`E${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '6366F1', a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`E${rw}`).value = 'Répartition';

    const types = [
      { label: 'Occasionnel', count: stats.occasionnelCount, col: '0EA5E9', bg: 'E0F2FE' },
      { label: 'Simple', count: stats.simpleCount, col: SLATE_500, bg: SLATE_100 },
      { label: 'Quotataire', count: stats.quotataireCount, col: VIOLET_600, bg: VIOLET_100 },
      { label: 'Revendeur', count: stats.revendeurCount, col: AMBER_600, bg: AMBER_100 },
    ];
    const maxBar = Math.max(...types.map(t => t.count), 1);

    types.forEach((td, i) => {
      rw = 11 + i;
      dash.getRow(rw).height = 26;
      const pct = stats.totalCustomers > 0 ? ((td.count / stats.totalCustomers) * 100).toFixed(1) : '0.0';
      const barLen = Math.round((td.count / maxBar) * 16);
      const bar = '\u2593'.repeat(barLen) + '\u2591'.repeat(16 - barLen);
      const rowBg = i % 2 === 0 ? WHITE : SLATE_50;

      s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: td.col } }, bg: td.bg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`B${rw}`).value = `  \u25CF ${td.label}`;

      s(dash.getCell(`C${rw}`), { f: { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } }, bg: rowBg, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
      dash.getCell(`C${rw}`).value = td.count;

      s(dash.getCell(`D${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: td.col } }, bg: rowBg, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
      dash.getCell(`D${rw}`).value = `${pct}%`;

      dash.mergeCells(`E${rw}:F${rw}`);
      s(dash.getCell(`E${rw}`), { f: { name: 'Consolas', size: 10, color: { argb: td.col } }, bg: rowBg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`E${rw}`).value = ` ${bar}`;
    });

    // Total répartition
    rw = 15;
    dash.getRow(rw).height = 26;
    dash.mergeCells(`B${rw}:D${rw}`);
    s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }, bg: NAVY_MED, a: { horizontal: 'right', vertical: 'middle' }, b: bordersThick });
    dash.getCell(`B${rw}`).value = `Total : ${stats.totalCustomers} clients  `;
    dash.mergeCells(`E${rw}:F${rw}`);
    s(dash.getCell(`E${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }, bg: NAVY_MED, a: { horizontal: 'center', vertical: 'middle' }, b: bordersThick });
    dash.getCell(`E${rw}`).value = '100%';

    // ---- ALERTES (droite H-L) ----
    rw = 9;
    dash.mergeCells(`H${rw}:L${rw}`);
    s(dash.getCell(`H${rw}`), {
      f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: RED_600,
      a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick,
    });
    dash.getCell(`H${rw}`).value = '  \u26A0\uFE0F  ALERTES & SURVEILLANCE';
    dash.getRow(9).height = 32;

    // Sous-en-têtes alertes
    rw = 10;
    s(dash.getCell(`H${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: RED_500, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
    dash.getCell(`H${rw}`).value = '  Indicateur';
    s(dash.getCell(`I${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: RED_500, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`I${rw}`).value = 'Nb';
    dash.mergeCells(`J${rw}:L${rw}`);
    s(dash.getCell(`J${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: RED_500, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`J${rw}`).value = 'Statut';
    dash.getRow(10).height = 24;

    const alertItems = [
      { label: 'Dépassement crédit', n: stats.overCreditLimit.length, crit: stats.overCreditLimit.length > 0, tag: '\uD83D\uDD34 CRITIQUE', tagOk: '\u2705 OK', tc: RED_600, tb: RED_100, ob: EMERALD_100, oc: EMERALD_700 },
      { label: 'Soldes prépayés bas', n: stats.lowPrepaid.length, crit: stats.lowPrepaid.length > 0, tag: '\uD83D\uDFE0 ATTENTION', tagOk: '\u2705 OK', tc: AMBER_600, tb: AMBER_100, ob: EMERALD_100, oc: EMERALD_700 },
      { label: 'Clients inactifs (+30j)', n: stats.inactive.length, crit: stats.inactive.length > 5, tag: '\uD83D\uDFE1 SURVEILLER', tagOk: '\u2705 OK', tc: AMBER_600, tb: AMBER_50, ob: EMERALD_100, oc: EMERALD_700 },
      { label: 'Clients avec dette', n: stats.withDebtCount, crit: stats.withDebtCount > 0, tag: '\uD83D\uDD34 DETTE', tagOk: '\u2705 AUCUNE', tc: RED_600, tb: RED_100, ob: EMERALD_100, oc: EMERALD_700 },
    ];

    alertItems.forEach((al, i) => {
      rw = 11 + i;
      dash.getRow(rw).height = 26;
      const rowBg = i % 2 === 0 ? WHITE : SLATE_50;

      s(dash.getCell(`H${rw}`), { f: { name: 'Calibri', size: 10, color: { argb: SLATE_700 } }, bg: rowBg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`H${rw}`).value = `  ${al.label}`;

      s(dash.getCell(`I${rw}`), { f: { name: 'Calibri', size: 13, bold: true, color: { argb: al.crit ? al.tc : al.oc } }, bg: rowBg, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
      dash.getCell(`I${rw}`).value = al.n;

      dash.mergeCells(`J${rw}:L${rw}`);
      s(dash.getCell(`J${rw}`), {
        f: { name: 'Calibri', size: 10, bold: true, color: { argb: al.crit ? al.tc : al.oc } },
        bg: al.crit ? al.tb : al.ob, a: { horizontal: 'center', vertical: 'middle' }, b: borders,
      });
      dash.getCell(`J${rw}`).value = al.crit ? al.tag : al.tagOk;
    });

    dash.getRow(16).height = 14;

    // ---- TOP 10 CA (gauche B-F) ----
    rw = 17;
    dash.mergeCells(`B${rw}:F${rw}`);
    s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: TEAL_600, a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick });
    dash.getCell(`B${rw}`).value = '  \uD83C\uDFC6  TOP 10 — CHIFFRE D\'AFFAIRES';
    dash.getRow(rw).height = 32;

    // Sous-en-têtes Top 10 CA : #, Client (C:D fusionné), CA, %
    rw = 18;
    dash.getRow(rw).height = 24;
    s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '14B8A6', a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`B${rw}`).value = '#';
    dash.mergeCells(`C${rw}:D${rw}`);
    s(dash.getCell(`C${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '14B8A6', a: { horizontal: 'left', vertical: 'middle' }, b: borders });
    dash.getCell(`C${rw}`).value = '  Client';
    s(dash.getCell(`E${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '14B8A6', a: { horizontal: 'right', vertical: 'middle' }, b: borders });
    dash.getCell(`E${rw}`).value = 'CA (F CFA)';
    s(dash.getCell(`F${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: '14B8A6', a: { horizontal: 'right', vertical: 'middle' }, b: borders });
    dash.getCell(`F${rw}`).value = '% CA';

    const topCA = [...(customers || [])].sort((a, b) => Number(b?.totalPurchases || 0) - Number(a?.totalPurchases || 0)).slice(0, 10);
    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

    topCA.forEach((c, i) => {
      rw = 19 + i;
      dash.getRow(rw).height = 24;
      const ca = Number(c?.totalPurchases || 0);
      const pctCA = totalCA > 0 ? ((ca / totalCA) * 100).toFixed(1) : '0.0';
      const bg = i % 2 === 0 ? WHITE : SLATE_50;

      s(dash.getCell(`B${rw}`), { f: { name: 'Calibri', size: 11, bold: i < 3, color: { argb: i < 3 ? AMBER_600 : SLATE_500 } }, bg: i < 3 ? AMBER_50 : bg, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
      dash.getCell(`B${rw}`).value = i < 3 ? medals[i] : String(i + 1);

      dash.mergeCells(`C${rw}:D${rw}`);
      s(dash.getCell(`C${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY } }, bg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`C${rw}`).value = `  ${c.name || ''}`;

      s(dash.getCell(`E${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: TEAL_600 } }, bg, a: { horizontal: 'right', vertical: 'middle' }, b: borders, nf: '#,##0' });
      dash.getCell(`E${rw}`).value = ca;

      s(dash.getCell(`F${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: INDIGO_600 } }, bg, a: { horizontal: 'right', vertical: 'middle' }, b: borders });
      dash.getCell(`F${rw}`).value = `${pctCA}%`;
    });

    // ---- TOP 10 DETTE (droite H-L) ----
    rw = 17;
    dash.mergeCells(`H${rw}:L${rw}`);
    s(dash.getCell(`H${rw}`), { f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: ROSE_600, a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick });
    dash.getCell(`H${rw}`).value = '  \uD83D\uDEA8  TOP 10 — DÉBITEURS';
    dash.getRow(17).height = 32;

    // Sous-en-têtes Top 10 Debt : #, Client (I:J fusionné), Dette, Niveau
    rw = 18;
    s(dash.getCell(`H${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: 'F43F5E', a: { horizontal: 'center', vertical: 'middle' }, b: borders });
    dash.getCell(`H${rw}`).value = '#';
    dash.mergeCells(`I${rw}:J${rw}`);
    s(dash.getCell(`I${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: 'F43F5E', a: { horizontal: 'left', vertical: 'middle' }, b: borders });
    dash.getCell(`I${rw}`).value = '  Client';
    s(dash.getCell(`K${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: 'F43F5E', a: { horizontal: 'right', vertical: 'middle' }, b: borders });
    dash.getCell(`K${rw}`).value = 'Dette (F CFA)';
    s(dash.getCell(`L${rw}`), { f: { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }, bg: 'F43F5E', a: { horizontal: 'left', vertical: 'middle' }, b: borders });
    dash.getCell(`L${rw}`).value = 'Niveau';

    const topDebt = [...(customers || [])]
      .map(c => ({ ...c, debtVal: Number(c?.balance ?? c?.debt ?? c?.current_balance ?? 0) }))
      .filter(c => c.debtVal > 0)
      .sort((a, b) => b.debtVal - a.debtVal)
      .slice(0, 10);
    const maxDebt = topDebt.length > 0 ? topDebt[0].debtVal : 1;

    topDebt.forEach((c, i) => {
      rw = 19 + i;
      dash.getRow(rw).height = 24;
      const bg = i % 2 === 0 ? WHITE : SLATE_50;
      const barLen = Math.round((c.debtVal / maxDebt) * 14);
      const debtBar = '\u2593'.repeat(barLen) + '\u2591'.repeat(14 - barLen);

      s(dash.getCell(`H${rw}`), { f: { name: 'Calibri', size: 10, bold: i < 3, color: { argb: i < 3 ? RED_600 : SLATE_500 } }, bg: i < 3 ? RED_50 : bg, a: { horizontal: 'center', vertical: 'middle' }, b: borders });
      dash.getCell(`H${rw}`).value = i < 3 ? medals[i] : String(i + 1);

      dash.mergeCells(`I${rw}:J${rw}`);
      s(dash.getCell(`I${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY } }, bg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`I${rw}`).value = `  ${c.name || ''}`;

      s(dash.getCell(`K${rw}`), { f: { name: 'Calibri', size: 10, bold: true, color: { argb: RED_600 } }, bg, a: { horizontal: 'right', vertical: 'middle' }, b: borders, nf: '#,##0' });
      dash.getCell(`K${rw}`).value = c.debtVal;

      s(dash.getCell(`L${rw}`), { f: { name: 'Consolas', size: 9, color: { argb: RED_500 } }, bg, a: { horizontal: 'left', vertical: 'middle' }, b: borders });
      dash.getCell(`L${rw}`).value = debtBar;
    });

    // ---- INDICATEURS DE SANTÉ ----
    const healthRow = Math.max(30, 19 + Math.max(topCA.length, topDebt.length)) + 1;
    dash.getRow(healthRow).height = 14;

    const hrw = healthRow + 1;
    dash.mergeCells(`B${hrw}:L${hrw}`);
    s(dash.getCell(`B${hrw}`), { f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: NAVY, a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick });
    dash.getCell(`B${hrw}`).value = '  \uD83D\uDCCB  INDICATEURS DE SANTÉ DU PORTEFEUILLE';
    dash.getRow(hrw).height = 32;

    const healthMetrics: { label: string; value: string; col: string; bg: string }[] = [
      { label: 'CA moyen / client', value: stats.totalCustomers > 0 ? formatMoney(Math.round(totalCA / stats.totalCustomers)) : '0', col: BLUE_600, bg: BLUE_50 },
      { label: 'Dette moyenne', value: stats.withDebtCount > 0 ? formatMoney(Math.round(totalDebt / stats.withDebtCount)) : '0', col: RED_600, bg: RED_50 },
      { label: 'Taux clients actifs', value: `${stats.totalCustomers > 0 ? (((stats.totalCustomers - stats.inactive.length) / stats.totalCustomers) * 100).toFixed(0) : 0}%`, col: EMERALD_600, bg: EMERALD_50 },
      { label: 'Taux endettement', value: `${stats.totalCustomers > 0 ? ((stats.withDebtCount / stats.totalCustomers) * 100).toFixed(0) : 0}%`, col: AMBER_600, bg: AMBER_50 },
    ];

    const hm1 = hrw + 1;
    dash.getRow(hm1).height = 24;
    const hm2 = hrw + 2;
    dash.getRow(hm2).height = 36;
    healthMetrics.forEach((m, i) => {
      const [c1, c2] = kpiPairs[i];
      dash.mergeCells(`${c1}${hm1}:${c2}${hm1}`);
      s(dash.getCell(`${c1}${hm1}`), {
        f: { name: 'Calibri', size: 9, bold: true, color: { argb: m.col } }, bg: m.bg,
        a: { horizontal: 'center', vertical: 'middle' },
        b: { top: { style: 'medium', color: { argb: m.col } }, left: { style: 'thin', color: { argb: m.col } }, right: { style: 'thin', color: { argb: m.col } } },
      });
      dash.getCell(`${c1}${hm1}`).value = m.label;

      dash.mergeCells(`${c1}${hm2}:${c2}${hm2}`);
      s(dash.getCell(`${c1}${hm2}`), {
        f: { name: 'Calibri', size: 16, bold: true, color: { argb: m.col } }, bg: WHITE,
        a: { horizontal: 'center', vertical: 'middle' },
        b: { bottom: { style: 'medium', color: { argb: m.col } }, left: { style: 'thin', color: { argb: m.col } }, right: { style: 'thin', color: { argb: m.col } } },
      });
      dash.getCell(`${c1}${hm2}`).value = m.value;
    });

    // Pied de page
    const footRow = hm2 + 2;
    dash.mergeCells(`A${footRow}:L${footRow}`);
    s(dash.getCell(`A${footRow}`), { f: { name: 'Calibri', size: 8, italic: true, color: { argb: SLATE_500 } }, bg: SLATE_50, a: { horizontal: 'center', vertical: 'middle' } });
    dash.getCell(`A${footRow}`).value = `Allo Béton \u00A9 ${new Date().getFullYear()}  —  Document confidentiel  —  Généré automatiquement le ${dateFull}`;
    dash.getRow(footRow).height = 22;

    // ==========================================
    // FEUILLE 3 : STATISTIQUES DÉTAILLÉES
    // ==========================================
    const ws2 = wb.addWorksheet('Statistiques', {
      properties: { defaultRowHeight: 22, tabColor: { argb: EMERALD_600 } },
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    ws2.columns = [{ width: 34 }, { width: 24 }];

    ws2.mergeCells('A1:B1');
    s(ws2.getCell('A1'), { f: { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } }, bg: NAVY, a: { horizontal: 'center', vertical: 'middle' } });
    ws2.getCell('A1').value = 'STATISTIQUES DÉTAILLÉES';
    ws2.getRow(1).height = 42;

    ws2.mergeCells('A2:B2');
    s(ws2.getCell('A2'), { f: { name: 'Calibri', size: 10, color: { argb: SLATE_500 } }, bg: SLATE_50, a: { horizontal: 'center', vertical: 'middle' } });
    ws2.getCell('A2').value = `Données au ${dateExport}`;
    ws2.getRow(2).height = 24;

    ws2.mergeCells('A3:B3');
    s(ws2.getCell('A3'), { bg: BLUE_600 });
    ws2.getRow(3).height = 3;
    ws2.addRow([]);

    const addSection = (title: string, color: string, emoji: string, items: [string, number | string][]) => {
      const sh = ws2.addRow([`  ${emoji}  ${title}`, '']);
      ws2.mergeCells(`A${sh.number}:B${sh.number}`);
      sh.height = 30;
      s(sh.getCell(1), { f: { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }, bg: color, a: { horizontal: 'left', vertical: 'middle' }, b: bordersThick });
      items.forEach(([label, value], idx) => {
        const r = ws2.addRow([`    ${label}`, value]);
        r.height = 24;
        const bg = idx % 2 === 0 ? WHITE : SLATE_50;
        s(r.getCell(1), { f: { name: 'Calibri', size: 10, color: { argb: SLATE_700 } }, bg, b: borders, a: { horizontal: 'left', vertical: 'middle' } });
        s(r.getCell(2), { f: { name: 'Calibri', size: 11, bold: true, color: { argb: NAVY } }, bg, b: borders, nf: typeof value === 'number' ? '#,##0' : undefined, a: { horizontal: 'right', vertical: 'middle' } });
      });
      ws2.addRow([]);
    };

    addSection('RÉPARTITION PAR TYPE', INDIGO_600, '\uD83D\uDCCA', [
      ['Total clients', stats.totalCustomers],
      ['Clients occasionnels', stats.occasionnelCount],
      ['Clients simples', stats.simpleCount],
      ['Clients quotataires', stats.quotataireCount],
      ['Clients revendeurs', stats.revendeurCount],
    ]);

    addSection('FINANCES', EMERALD_600, '\uD83D\uDCB0', [
      ['Total dettes (F CFA)', totalDebt],
      ['Clients avec dette', stats.withDebtCount],
      ['Total soldes prépayés (F CFA)', totalPrepaid],
      ['Clients avec prépayé', stats.withPrepaidCount],
      ['CA Total (F CFA)', totalCA],
      ['Total commandes', totalOrders],
      ['CA moyen / client', stats.totalCustomers > 0 ? Math.round(totalCA / stats.totalCustomers) : 0],
    ]);

    addSection('ALERTES', RED_600, '\u26A0\uFE0F', [
      ['Dépassement crédit', stats.overCreditLimit.length],
      ['Soldes prépayés bas', stats.lowPrepaid.length],
      ['Clients inactifs (+30j)', stats.inactive.length],
      ['Taux clients actifs', `${stats.totalCustomers > 0 ? (((stats.totalCustomers - stats.inactive.length) / stats.totalCustomers) * 100).toFixed(1) : 0}%`],
      ['Taux endettement', `${stats.totalCustomers > 0 ? ((stats.withDebtCount / stats.totalCustomers) * 100).toFixed(1) : 0}%`],
    ]);

    // ==========================================
    // TÉLÉCHARGER
    // ==========================================
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `clients_allo_beton_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Allo Béton SaaS';
    wb.company = 'Allo Béton';

    const NAVY = '0F172A';
    const NAVY_MED = '1E293B';
    const BLUE_600 = '2563EB';
    const AMBER_BG = 'FEF3C7';
    const AMBER_TEXT = 'B45309';
    const SLATE_200 = 'E2E8F0';
    const SLATE_100 = 'F1F5F9';
    const SLATE_50 = 'F8FAFC';
    const SLATE_500 = '64748B';
    const WHITE = 'FFFFFF';

    const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: SLATE_200 } };
    const borders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };

    const ws = wb.addWorksheet('Import Clients', {
      properties: { defaultRowHeight: 22, tabColor: { argb: BLUE_600 } },
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    ws.columns = [
      { width: 28 }, { width: 16 }, { width: 28 }, { width: 24 }, { width: 16 }, { width: 18 },
    ];

    // Titre
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'MODÈLE D\'IMPORT CLIENTS  —  Allo Béton';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } } as ExcelJS.Font;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 42;

    // Accent
    ws.mergeCells('A2:F2');
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_600 } };
    ws.getRow(2).height = 3;

    // Instructions
    ws.mergeCells('A3:F3');
    const instrCell = ws.getCell('A3');
    instrCell.value = '\u26A0  Remplissez vos données à partir de la ligne 7 (après les exemples grisés). La colonne "Nom" est obligatoire. Les lignes d\'exemple seront ignorées automatiquement.';
    instrCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: AMBER_TEXT } } as ExcelJS.Font;
    instrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } };
    instrCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    instrCell.border = borders;
    ws.getRow(3).height = 34;

    // En-têtes
    const hdrRow = ws.addRow(['Nom (*)', 'Téléphone', 'Email', 'Entreprise', 'Ville', 'Type']);
    hdrRow.height = 28;
    hdrRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } } as ExcelJS.Font;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MED } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'medium', color: { argb: BLUE_600 } }, bottom: { style: 'medium', color: { argb: BLUE_600 } }, left: thin, right: thin };
    });

    // Exemples (lignes 5-6)
    const examples = [
      ['Moussa Diop', '771234567', 'moussa@email.com', 'Diop BTP SARL', 'Dakar', 'simple'],
      ['Awa Ndiaye', '769876543', '', 'Ndiaye Construction', 'Thiès', 'quotataire'],
    ];
    examples.forEach((ex) => {
      const r = ws.addRow(ex);
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: SLATE_500 } } as ExcelJS.Font;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_100 } };
        cell.border = borders;
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Lignes vides pour saisie (lignes 7-24)
    for (let i = 0; i < 18; i++) {
      const r = ws.addRow(['', '', '', '', '', '']);
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = borders;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : SLATE_50 } };
        cell.alignment = { vertical: 'middle' };
      });
    }

    ws.addRow([]);
    ws.addRow([]);

    // Section types disponibles
    ws.mergeCells(`A${ws.lastRow!.number + 1}:B${ws.lastRow!.number + 1}`);
    const typesTitle = ws.getCell(`A${ws.lastRow!.number}`);
    typesTitle.value = 'TYPES DE CLIENTS DISPONIBLES';
    typesTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } } as ExcelJS.Font;
    typesTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    typesTitle.alignment = { horizontal: 'left', vertical: 'middle' };
    typesTitle.border = borders;

    const typesList: [string, string, string, string][] = [
      ['occasionnel', 'Client de passage, sans compte', 'E0F2FE', '0369A1'],
      ['simple', 'Client régulier avec crédit (par défaut)', SLATE_100, SLATE_500],
      ['quotataire', 'Client avec solde prépayé / quota', 'EDE9FE', '7C3AED'],
      ['revendeur', 'Revendeur avec tarifs spéciaux', 'ECFDF5', '059669'],
    ];
    typesList.forEach(([name, desc, bg, fg]) => {
      const r = ws.addRow([name, desc]);
      r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: fg } } as ExcelJS.Font;
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(1).border = borders;
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: SLATE_500 } } as ExcelJS.Font;
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(2).border = borders;
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Validation de données sur colonne Type
    for (let rowNum = 5; rowNum <= 24; rowNum++) {
      ws.getCell(`F${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"occasionnel,simple,quotataire,revendeur"'],
        showErrorMessage: true,
        errorTitle: 'Type invalide',
        error: 'Choisissez parmi : occasionnel, simple, quotataire, revendeur',
      };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'modele_import_clients_allo_beton.xlsx');
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportResult(null);
    setShowImportModal(true);

    try {
      let dataRows: string[][] = [];
      let headerRow: string[] = [];

      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls') {
        // Lire fichier Excel
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Trouver la ligne d'en-tête (celle contenant "Nom")
        let headerIdx = -1;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i].map(c => String(c).toLowerCase());
          if (row.some(c => c.includes('nom'))) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          setImportResult({ success: 0, errors: ['Colonne "Nom" introuvable dans le fichier. Utilisez le modèle fourni.'] });
          setImportLoading(false);
          return;
        }

        headerRow = jsonData[headerIdx].map(c => String(c).trim());
        dataRows = jsonData.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim()));
      } else {
        // Lire CSV
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setImportResult({ success: 0, errors: ['Fichier vide ou format invalide'] });
          setImportLoading(false);
          return;
        }
        headerRow = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        dataRows = lines.slice(1).map(l => l.split(',').map(v => v.replace(/^"|"$/g, '').trim()));
      }

      // Mapper les colonnes (flexible)
      const headerLower = headerRow.map(h => h.toLowerCase());
      const nameIdx = headerLower.findIndex(h => h.includes('nom'));
      const phoneIdx = headerLower.findIndex(h => h.includes('tél') || h.includes('tel') || h.includes('phone'));
      const emailIdx = headerLower.findIndex(h => h.includes('email') || h.includes('mail'));
      const companyIdx = headerLower.findIndex(h => h.includes('entreprise') || h.includes('société') || h.includes('company'));
      const cityIdx = headerLower.findIndex(h => h.includes('ville') || h.includes('city'));
      const typeIdx = headerLower.findIndex(h => h.includes('type'));

      if (nameIdx === -1) {
        setImportResult({ success: 0, errors: ['Colonne "Nom" introuvable. Vérifiez le format ou téléchargez le modèle.'] });
        setImportLoading(false);
        return;
      }

      const results = { success: 0, errors: [] as string[] };
      const validTypes = ['occasionnel', 'simple', 'quotataire', 'revendeur'];

      for (let i = 0; i < dataRows.length; i++) {
        const values = dataRows[i].map(v => String(v).trim());
        const name = values[nameIdx] || '';

        // Ignorer les lignes d'exemple ou vides
        if (!name || name.toLowerCase().startsWith('exemple')) continue;

        let customerType = typeIdx >= 0 ? values[typeIdx]?.toLowerCase() : 'simple';
        if (!validTypes.includes(customerType)) customerType = 'simple';

        try {
          await customersAPI.create({
            name,
            phone: phoneIdx >= 0 ? values[phoneIdx] || null : null,
            email: emailIdx >= 0 ? values[emailIdx] || null : null,
            company: companyIdx >= 0 ? values[companyIdx] || null : null,
            city: cityIdx >= 0 ? values[cityIdx] || null : null,
            customer_type: customerType,
          });
          results.success++;
        } catch (e: any) {
          results.errors.push(`Ligne ${i + 1} (${name}): ${e.message || 'Erreur'}`);
        }
      }

      setImportResult(results);
      if (results.success > 0) {
        await refreshCustomers();
      }
    } catch (e: any) {
      setImportResult({ success: 0, errors: [e.message || 'Erreur de lecture du fichier'] });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(confirmDelete.id);
    setDeleteError(null);
    try {
      const result = await customersAPI.delete(confirmDelete.id);
      if (result.success) {
        await refreshCustomers();
        setConfirmDelete(null);
      } else {
        setDeleteError(result.error || 'Erreur lors de la suppression');
      }
    } catch (e: any) {
      setDeleteError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Modal de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmer la suppression</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Êtes-vous sûr de vouloir supprimer le client <strong>"{confirmDelete.name}"</strong> ?
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {deleteError}
              </div>
            )}
            
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleteLoading === confirmDelete.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading === confirmDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel/CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Import de clients</h3>
                <p className="text-sm text-gray-500">
                  {importLoading ? 'Import en cours...' : 'Résultat de l\'import'}
                </p>
              </div>
            </div>

            {importLoading ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-sm text-gray-500">Lecture et import du fichier...</p>
              </div>
            ) : importResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{importResult.success}</p>
                    <p className="text-xs font-medium text-emerald-600 mt-1">Client{importResult.success > 1 ? 's' : ''} importé{importResult.success > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{importResult.errors.length}</p>
                    <p className="text-xs font-medium text-red-500 mt-1">Erreur{importResult.errors.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Détail des erreurs :</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600 py-0.5 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {err}
                      </p>
                    ))}
                  </div>
                )}

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">💡 Conseil :</p>
                  <p className="text-xs text-orange-600">Utilisez le modèle Excel pour un import sans erreur. Colonnes acceptées : Nom (obligatoire), Téléphone, Email, Entreprise, Ville, Type.</p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 underline underline-offset-2"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Télécharger le modèle Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600">Glissez un fichier ou cliquez pour sélectionner</p>
                  <p className="text-xs text-gray-400 mt-1">Formats acceptés : .xlsx, .xls, .csv</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Télécharger le modèle d'import Excel
                </button>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                onClick={() => { setShowImportModal(false); setImportResult(null); }}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-indigo-700 shadow-sm transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(59,130,246,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-indigo-400 to-violet-400 absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Clients</h1>
              <p className="text-sm text-gray-400 mt-0.5">{stats.totalCustomers} clients enregistrés</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => refreshCustomers()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
              <RefreshCw className="w-4 h-4" />Actualiser
            </button>
            <button onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${showAnalytics ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}>
              <BarChart3 className="w-4 h-4" />{showAnalytics ? 'Liste' : 'Analytics'}
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              title="Exporter en Excel">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />Exporter Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm cursor-pointer"
            title="Importer Excel ou CSV">
            <Upload className="w-4 h-4 text-orange-500" />Importer
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
          <button onClick={onCreateCustomer}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-indigo-700 transition-all shadow-md shadow-orange-200/30">
            <Plus className="w-4 h-4" />Nouveau Client
          </button>
        </div>
      </div>
    </div>

      {showAnalytics ? (
        <ModuleAnalytics module="customers" title="Analytics Clients" />
      ) : (
      <>
      {/* Alertes clients */}
      {(stats.overCreditLimit.length > 0 || stats.lowPrepaid.length > 0) && (
        <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-200/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Alertes clients</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.overCreditLimit.length > 0 && (
              <div className="bg-white/80 rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">{stats.overCreditLimit.length} client(s) dépassent leur limite de crédit</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.overCreditLimit.slice(0, 5).map((c) => (
                    <button key={c.id} onClick={() => onViewCustomer(c)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors">
                      {c.name}
                    </button>
                  ))}
                  {stats.overCreditLimit.length > 5 && (
                    <span className="text-xs text-red-500">+{stats.overCreditLimit.length - 5} autres</span>
                  )}
                </div>
              </div>
            )}
            {stats.lowPrepaid.length > 0 && (
              <div className="bg-white/80 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <PiggyBank className="w-4 h-4" />
                  <span className="text-sm font-medium">{stats.lowPrepaid.length} quotataire(s) avec solde faible (&lt;10 000 F)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.lowPrepaid.slice(0, 5).map((c) => (
                    <button key={c.id} onClick={() => onViewCustomer(c)}
                      className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 transition-colors">
                      {c.name} ({formatMoney(Number(c?.prepaidBalance ?? c?.prepaid_balance ?? 0))})
                    </button>
                  ))}
                  {stats.lowPrepaid.length > 5 && (
                    <span className="text-xs text-amber-500">+{stats.lowPrepaid.length - 5} autres</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Occasionnels', value: stats.occasionnelCount.toString(), icon: Zap, fill: 'bg-gradient-to-br from-cyan-50/70 to-sky-50/40', border: 'border-l-cyan-400', iconBg: 'bg-cyan-100', iconClr: 'text-cyan-600', ring: 'border-cyan-200/50', valClr: 'text-cyan-700' },
          { label: 'Simples', value: stats.simpleCount.toString(), icon: Users, fill: 'bg-gradient-to-br from-gray-50/70 to-slate-50/40', border: 'border-l-gray-400', iconBg: 'bg-gray-100', iconClr: 'text-gray-600', ring: 'border-gray-200/50', valClr: 'text-gray-900' },
          { label: 'Quotataires', value: stats.quotataireCount.toString(), icon: PiggyBank, fill: 'bg-gradient-to-br from-violet-50/70 to-purple-50/40', border: 'border-l-violet-400', iconBg: 'bg-violet-100', iconClr: 'text-violet-600', ring: 'border-violet-200/50', valClr: 'text-violet-700' },
          { label: 'Revendeurs', value: stats.revendeurCount.toString(), icon: ShoppingCart, fill: 'bg-gradient-to-br from-amber-50/70 to-yellow-50/40', border: 'border-l-amber-400', iconBg: 'bg-amber-100', iconClr: 'text-amber-600', ring: 'border-amber-200/50', valClr: 'text-amber-700' },
          { label: 'CA Total', value: formatMoney(stats.totalPurchases), icon: TrendingUp, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={`rounded-xl ${k.fill} border-l-4 ${k.border} border ${k.ring} p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${k.iconClr}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${k.valClr} leading-tight`}>{k.value}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Finances ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-all duration-200 ${stats.totalDebt > 0 ? 'bg-gradient-to-br from-red-50/70 to-rose-50/40 border-l-red-400 border border-red-200/50' : 'bg-gradient-to-br from-gray-50/70 to-slate-50/40 border-l-gray-300 border border-gray-200/50'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.totalDebt > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Wallet className={`w-5 h-5 ${stats.totalDebt > 0 ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
          </div>
          <p className={`text-xl font-bold leading-tight ${stats.totalDebt > 0 ? 'text-red-700' : 'text-gray-900'}`}>{formatMoney(stats.totalDebt)}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">Créances ({stats.withDebtCount})</p>
        </div>

        <div className={`rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-all duration-200 ${stats.totalPrepaid > 0 ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-l-emerald-400 border border-emerald-200/50' : 'bg-gradient-to-br from-gray-50/70 to-slate-50/40 border-l-gray-300 border border-gray-200/50'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.totalPrepaid > 0 ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <Banknote className={`w-5 h-5 ${stats.totalPrepaid > 0 ? 'text-emerald-600' : 'text-gray-500'}`} />
            </div>
          </div>
          <p className={`text-xl font-bold leading-tight ${stats.totalPrepaid > 0 ? 'text-emerald-700' : 'text-gray-900'}`}>{formatMoney(stats.totalPrepaid)}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">Prépayés ({stats.withPrepaidCount})</p>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Rechercher (nom, téléphone, email, entreprise, ville)..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showFilters ? 'bg-gradient-to-r from-orange-500 to-indigo-600 text-white shadow-md shadow-orange-200/30' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'}`}>
              <Filter className="w-4 h-4" /> Filtres
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100/60">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tous', count: stats.totalCustomers, active: 'bg-gradient-to-r from-orange-500 to-indigo-500 text-white shadow-md shadow-orange-200/30' },
                  { value: 'occasionnel', label: 'Occasionnels', count: stats.occasionnelCount, active: 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-200/30' },
                  { value: 'simple', label: 'Simples', count: stats.simpleCount, active: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md shadow-gray-200/30' },
                  { value: 'quotataire', label: 'Quotataires', count: stats.quotataireCount, active: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200/30' },
                  { value: 'revendeur', label: 'Revendeurs', count: stats.revendeurCount, active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/30' },
                  { value: 'debt', label: 'Avec dettes', count: stats.withDebtCount, active: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200/30' },
                  { value: 'prepaid', label: 'Avec solde', count: stats.withPrepaidCount, active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
                ].map((f) => (
                  <button key={f.value} onClick={() => setFilterType(f.value as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      filterType === f.value ? f.active : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
                    }`}>
                    <span>{f.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterType === f.value ? 'bg-white/20' : 'bg-gray-200/60'}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-gray-200/60 mx-2 hidden sm:block" />

              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Trier:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-200/80 rounded-xl text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 transition-all shadow-sm">
                <option value="name">Nom (A-Z)</option>
                <option value="purchases">Achats (plus grand)</option>
                <option value="balance">Solde/Dette</option>
                <option value="recent">Dernier achat</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filteredAndSortedCustomers.length} client{filteredAndSortedCustomers.length > 1 ? 's' : ''} trouvé{filteredAndSortedCustomers.length > 1 ? 's' : ''}</p>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vue liste"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vue cartes"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="mt-3 text-sm text-gray-500">Chargement des clients...</span>
        </div>
      ) : filteredAndSortedCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100/80 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-indigo-100 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-orange-500" />
          </div>
          <h4 className="text-base font-bold text-gray-900 mt-4">Aucun client trouvé</h4>
          <p className="text-sm text-gray-400 mt-1">{searchTerm || filterType !== 'all' ? 'Essayez de modifier vos filtres' : 'Ajoutez votre premier client'}</p>
          {!searchTerm && filterType === 'all' && (
            <button onClick={onCreateCustomer}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-200/30">
              <Plus className="w-4 h-4" /> Créer un client
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* ========== VUE CARTES ========== */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCustomers.map((customer) => {
              const customerType = getCustomerType(customer);
              const type = customer?.customerType || customer?.customer_type || 'simple';
              const TypeIcon = CUSTOMER_TYPES[type as keyof typeof CUSTOMER_TYPES]?.icon || Users;
              const isQuotataire = type === 'quotataire';
              const prepaid = Number(customer?.prepaidBalance ?? customer?.prepaid_balance ?? 0);
              const debt = Number(customer?.balance ?? customer?.debt ?? customer?.current_balance ?? 0);

              return (
                <div
                  key={customer.id}
                  onClick={() => onViewCustomer(customer)}
                  className="group bg-white rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-lg hover:border-orange-200/60 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Bandeau type en haut */}
                  <div className={`h-1.5 ${
                    type === 'quotataire' ? 'bg-gradient-to-r from-violet-500 to-purple-600' :
                    type === 'revendeur' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                    type === 'occasionnel' ? 'bg-gradient-to-r from-cyan-500 to-sky-600' :
                    'bg-gradient-to-r from-gray-300 to-slate-400'
                  }`} />

                  <div className="p-4">
                    {/* En-tête : Avatar + Nom */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 shadow-sm ${
                        type === 'quotataire' ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' :
                        type === 'revendeur' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' :
                        type === 'occasionnel' ? 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white' :
                        'bg-gradient-to-br from-gray-400 to-slate-500 text-white'
                      }`}>
                        {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate text-[14px] group-hover:text-orange-700 transition-colors">{customer.name}</p>
                        {customer.company && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <Building2 className="w-3 h-3 flex-shrink-0 text-gray-300" /> {customer.company}
                          </p>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide mt-1.5 ${customerType.color}`}>
                          <TypeIcon className="w-3 h-3" /> {customerType.label}
                        </span>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5 mb-3" onClick={e => e.stopPropagation()}>
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <a href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-600 transition-colors font-medium">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" /> {customer.phone}
                          </a>
                          <a href={`sms:${customer.phone}`}
                            className="p-0.5 text-gray-300 hover:text-emerald-500 rounded transition-colors"
                            title="SMS">
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> —
                        </p>
                      )}
                      {customer.city && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-300" /> {customer.city}
                        </p>
                      )}
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      {/* Solde/Dette */}
                      {isQuotataire ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-500 font-medium">Solde prépayé</span>
                          <span className={`text-sm font-bold tabular-nums ${prepaid > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                            {prepaid > 0 ? formatMoney(prepaid) : '0 F'}
                          </span>
                        </div>
                      ) : debt > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-red-400 font-medium">Dette</span>
                          <span className="text-sm font-bold tabular-nums text-red-600">{formatMoney(debt)}</span>
                        </div>
                      ) : null}

                      {/* CA Total */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-medium">CA Total</span>
                        <span className="text-sm font-bold tabular-nums text-gray-800">{formatMoney(customer.totalPurchases || 0)}</span>
                      </div>

                      {/* Commandes + Date */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{customer.totalOrders || 0} commande{(customer.totalOrders || 0) > 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(customer.lastPurchaseDate || customer.last_purchase_date || null)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onViewCustomer(customer)} title="Voir détails"
                        className="p-1.5 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEditCustomer(customer)} title="Modifier"
                        className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(customer)} title="Supprimer"
                        disabled={deleteLoading === customer.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                        {deleteLoading === customer.id ? (
                          <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination cartes */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3.5 mt-4">
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-gray-600">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedCustomers.length)}</span>
                {' '}sur <span className="font-medium">{filteredAndSortedCustomers.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Précédent
                </button>
                <span className="px-3.5 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-indigo-600 rounded-xl shadow-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ========== VUE TABLE ========== */
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Solde / Dette</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">CA Total</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden xl:table-cell">Dernier achat</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer, idx) => {
                  const customerType = getCustomerType(customer);
                  const statusColor = getStatusColor(customer);
                  const type = customer?.customerType || customer?.customer_type || 'simple';
                  const isQuotataire = type === 'quotataire';
                  const prepaid = Number(customer?.prepaidBalance ?? customer?.prepaid_balance ?? 0);
                  const debt = Number(customer?.balance ?? customer?.debt ?? customer?.current_balance ?? 0);

                  return (
                    <tr key={customer.id}
                      className={`group border-l-[3px] ${statusColor} transition-all duration-150 hover:bg-orange-50/40 cursor-pointer ${idx !== paginatedCustomers.length - 1 ? 'border-b border-gray-100/60' : ''}`}
                      onClick={() => onViewCustomer(customer)}>
                      {/* Client */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 shadow-sm ${
                            type === 'quotataire' ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' :
                            type === 'revendeur' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' :
                            type === 'occasionnel' ? 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white' :
                            'bg-gradient-to-br from-gray-400 to-slate-500 text-white'
                          }`}>
                            {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate text-[14px] group-hover:text-orange-700 transition-colors">{customer.name}</p>
                            {customer.company && (
                              <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                                <Building2 className="w-3 h-3 flex-shrink-0 text-gray-300" /> {customer.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5">
                              <a href={`tel:${customer.phone}`}
                                className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-orange-600 transition-colors font-medium"
                                title="Appeler">
                                <Phone className="w-3.5 h-3.5 text-emerald-500" /> {customer.phone}
                              </a>
                              <a href={`sms:${customer.phone}`}
                                className="p-1 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                                title="SMS">
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> —
                            </span>
                          )}
                          {customer.city && (
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-300" /> {customer.city}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide ${customerType.color}`}>
                          {customerType.label}
                        </span>
                      </td>

                      {/* Solde/Dette */}
                      <td className="px-4 py-3.5 text-right">
                        {isQuotataire ? (
                          <div>
                            <p className={`text-sm font-bold tabular-nums ${prepaid > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                              {prepaid > 0 ? formatMoney(prepaid) : '0 F'}
                            </p>
                            <p className="text-[10px] font-medium text-emerald-400 mt-0.5">Solde prépayé</p>
                          </div>
                        ) : (
                          <div>
                            {debt > 0 ? (
                              <>
                                <p className="text-sm font-bold tabular-nums text-red-600">{formatMoney(debt)}</p>
                                <p className="text-[10px] font-medium text-red-400 mt-0.5">Doit</p>
                              </>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* CA Total */}
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                        <p className="text-sm font-bold text-gray-800 tabular-nums">{formatMoney(customer.totalPurchases || 0)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{customer.totalOrders || 0} commande{(customer.totalOrders || 0) > 1 ? 's' : ''}</p>
                      </td>

                      {/* Dernier achat */}
                      <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          {formatDate(customer.lastPurchaseDate || customer.last_purchase_date || null)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onViewCustomer(customer)} title="Voir détails"
                            className="p-2 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">
                            <Eye className="w-[17px] h-[17px]" />
                          </button>
                          <button onClick={() => onEditCustomer(customer)} title="Modifier"
                            className="p-2 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                            <Edit className="w-[17px] h-[17px]" />
                          </button>
                          <button onClick={() => handleDelete(customer)} title="Supprimer"
                            disabled={deleteLoading === customer.id}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                            {deleteLoading === customer.id ? (
                              <div className="w-[17px] h-[17px] border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-[17px] h-[17px]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/40">
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-gray-600">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedCustomers.length)}</span>
                {' '}sur <span className="font-medium">{filteredAndSortedCustomers.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Précédent
                </button>
                <span className="px-3.5 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-indigo-600 rounded-xl shadow-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  );
};
