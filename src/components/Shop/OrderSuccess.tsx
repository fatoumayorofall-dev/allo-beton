/**
 * ALLO BÉTON — COMMANDE RÉUSSIE — WORLD-CLASS 2026
 * Confetti animation, premium timeline, rich order details
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, Package, Truck, MapPin, ArrowRight,
  Star, Phone, Download, Share2, Copy, ShoppingBag,
  Clock, CreditCard, Sparkles, FileText,
} from 'lucide-react';
import { invoicesAPI, ordersAPI } from '../../services/ecommerce-api';

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';
interface Props {
  orderId?: string;
  orderNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  onNavigate: (view: View, data?: any) => void;
}

/* ── Confetti Canvas ── */
const ConfettiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f97316'];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; color: string; rotation: number;
      rotSpeed: number; opacity: number;
    }[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    let frame: number;
    let elapsed = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      elapsed++;

      particles.forEach(p => {
        p.x += p.vx;
        p.vy += 0.05; // gravity
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (elapsed > 120) p.opacity = Math.max(0, p.opacity - 0.008);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (elapsed < 300) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />;
};

const OrderSuccess: React.FC<Props> = ({ orderId, orderNumber, invoiceId: initialInvoiceId, invoiceNumber: initialInvoiceNumber, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId || '');
  const [invoiceNum, setInvoiceNum] = useState(initialInvoiceNumber || '');
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const displayNumber = orderNumber || orderId || 'N/A';

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Si pas de facture passée en props, tenter de la récupérer depuis la commande
  useEffect(() => {
    if (!invoiceId && orderId) {
      ordersAPI.getById(orderId).then(res => {
        const data = res?.data || res;
        if (data?.invoice?.id) {
          setInvoiceId(data.invoice.id);
          setInvoiceNum(data.invoice.invoice_number || '');
        }
      }).catch(() => {});
    }
  }, [orderId, invoiceId]);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(displayNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = () => {
    if (!invoiceId) return;
    setDownloadingInvoice(true);
    try {
      const url = invoicesAPI.getPdfUrl(invoiceId);
      window.open(url, '_blank');
    } catch {
      // silent
    } finally {
      setTimeout(() => setDownloadingInvoice(false), 1000);
    }
  };

  const steps = [
    { icon: CheckCircle, label: 'Commande confirmée', desc: 'Votre commande a été validée', done: true, active: true },
    { icon: CreditCard, label: 'Paiement reçu', desc: 'En attente de vérification', done: false, active: true },
    { icon: Package, label: 'Préparation', desc: 'Sous 24h ouvrées', done: false, active: false },
    { icon: Truck, label: 'Livraison', desc: 'Livraison sur votre chantier', done: false, active: false },
    { icon: MapPin, label: 'Livrée', desc: 'Réception confirmée', done: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {showConfetti && <ConfettiCanvas />}

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Success header */}
        <div className="text-center mb-12 animate-[fadeInUp_0.6s_ease-out]">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/25 animate-[scaleIn_0.5s_ease-out]">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Commande <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">confirmée !</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Merci pour votre commande. Un email de confirmation a été envoyé avec tous les détails.
          </p>
        </div>

        {/* Order number card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8 animate-[fadeInUp_0.7s_ease-out]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Numéro de commande</p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                #{displayNumber}
                <button onClick={copyOrderNumber}
                  className={`p-2 rounded-lg transition-all ${copied ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'}`}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {invoiceId && (
                <button
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-orange-600 hover:from-indigo-400 hover:to-orange-500 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {downloadingInvoice ? 'Ouverture...' : 'Ma Facture'}
                </button>
              )}
              <button
                onClick={() => onNavigate('dashboard')}
                className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all border border-gray-200">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Invoice card */}
        {invoiceId && (
          <div className="bg-gradient-to-r from-indigo-50 to-orange-50 rounded-2xl border border-indigo-100 p-6 mb-8 animate-[fadeInUp_0.75s_ease-out]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-orange-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-900">Facture générée automatiquement</p>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                  {invoiceNum ? `N° ${invoiceNum}` : 'Facture disponible'}
                </p>
                <p className="text-[11px] text-indigo-400 mt-0.5">
                  Vous pouvez télécharger votre facture dès maintenant ou la retrouver dans votre espace client.
                </p>
              </div>
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloadingInvoice ? '...' : 'Télécharger'}
              </button>
            </div>
          </div>
        )}

        {/* Order Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8 animate-[fadeInUp_0.8s_ease-out]">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" /> Suivi de commande
          </h2>
          <div className="relative">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4 mb-6 last:mb-0">
                {/* Vertical line + circle */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    step.done
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/20'
                      : step.active
                        ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-600/20 animate-pulse'
                        : 'bg-gray-100'
                  }`}>
                    <step.icon className={`w-5 h-5 ${step.done || step.active ? 'text-white' : 'text-gray-300'}`} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 ${step.done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
                {/* Text */}
                <div className="pt-1.5 pb-2">
                  <p className={`text-sm font-bold ${step.done ? 'text-emerald-600' : step.active ? 'text-orange-700' : 'text-gray-400'}`}>{step.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-[fadeInUp_0.9s_ease-out]">
          {[
            {
              icon: Truck,
              gradient: 'from-teal-500 to-emerald-500',
              shadow: 'shadow-teal-500/20',
              title: 'Livraison estimée',
              desc: '24 à 48h ouvrées',
              detail: 'Dakar et environs',
            },
            {
              icon: Phone,
              gradient: 'from-orange-600 to-orange-700',
              shadow: 'shadow-orange-600/20',
              title: 'Une question ?',
              desc: '+221 33 860 12 34',
              detail: 'Du lundi au samedi',
            },
            {
              icon: Star,
              gradient: 'from-violet-500 to-purple-500',
              shadow: 'shadow-violet-500/20',
              title: 'Satisfaction',
              desc: '98% clients satisfaits',
              detail: 'Note 4.9/5',
            },
          ].map(card => (
            <div key={card.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg ${card.shadow} group-hover:scale-110 transition-transform`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">{card.title}</p>
              <p className="text-sm text-gray-600 font-semibold mt-0.5">{card.desc}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{card.detail}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-[fadeInUp_1s_ease-out]">
          <button onClick={() => onNavigate('dashboard')}
            className="group px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-md">
            <ShoppingBag className="w-4 h-4" /> Suivre ma commande
          </button>
          <button onClick={() => onNavigate('catalog')}
            className="group px-6 py-3.5 bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-orange-600/25">
            Continuer mes achats <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Thank you footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-100">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-xs font-bold text-orange-700">Merci de votre confiance</span>
          </div>
          <p className="text-gray-400 text-sm">
            L'équipe <span className="font-bold text-gray-600">Allo Béton</span> vous remercie pour votre commande.<br />
            Nous mettons tout en œuvre pour assurer une livraison rapide et fiable.
          </p>
        </div>
      </div>

    </div>
  );
};

export default OrderSuccess;
