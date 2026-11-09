import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import { FastForward, Calendar, CheckCircle2, Edit3, Trash2, X, ChevronRight, Sparkles } from 'lucide-react';
import { TagChips } from './TagChips';

const NECESSITY_BORDER_STYLES: Record<string, { border: string; bg: string; text: string; label: string }> = {
  Fizyolojik: {
    border: 'border-emerald-500/40 hover:border-emerald-400/70',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-400',
    label: 'Fizyolojik',
  },
  Temel: {
    border: 'border-blue-500/40 hover:border-blue-400/70',
    bg: 'bg-blue-950/20',
    text: 'text-blue-400',
    label: 'Temel',
  },
  Makul: {
    border: 'border-purple-500/40 hover:border-purple-400/70',
    bg: 'bg-purple-950/20',
    text: 'text-purple-300',
    label: 'Makul',
  },
  Kaçınılabilir: {
    border: 'border-amber-500/40 hover:border-amber-400/70',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    label: 'Kaçınılabilir',
  },
  İsraf: {
    border: 'border-rose-500/50 hover:border-rose-400/80',
    bg: 'bg-rose-950/25',
    text: 'text-rose-400',
    label: 'İsraf',
  },
  Tanımsız: {
    border: 'border-slate-800 hover:border-slate-700',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    label: 'Tanımsız',
  },
};

const MONTH_THEMES = [
  {
    border: 'border-amber-500/35 hover:border-amber-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-amber-950/20',
    headerBg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
    text: 'text-amber-300',
    totalText: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: 'text-amber-400',
  },
  {
    border: 'border-sky-500/35 hover:border-sky-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-sky-950/20',
    headerBg: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30',
    text: 'text-sky-300',
    totalText: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: 'text-sky-400',
  },
  {
    border: 'border-purple-500/35 hover:border-purple-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-purple-950/20',
    headerBg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
    text: 'text-purple-300',
    totalText: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: 'text-purple-400',
  },
  {
    border: 'border-teal-500/35 hover:border-teal-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-teal-950/20',
    headerBg: 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30',
    text: 'text-teal-300',
    totalText: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    icon: 'text-teal-400',
  },
  {
    border: 'border-rose-500/35 hover:border-rose-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-rose-950/20',
    headerBg: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
    text: 'text-rose-300',
    totalText: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: 'text-rose-400',
  },
  {
    border: 'border-indigo-500/35 hover:border-indigo-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-indigo-950/20',
    headerBg: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30',
    text: 'text-indigo-300',
    totalText: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: 'text-indigo-400',
  },
  {
    border: 'border-emerald-500/35 hover:border-emerald-400/50',
    panelBg: 'bg-gradient-to-br from-slate-900/90 to-emerald-950/20',
    headerBg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
    text: 'text-emerald-300',
    totalText: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: 'text-emerald-400',
  },
];

export const UpcomingPaymentsView: React.FC = () => {
  const { expenses, categories, accounts, limits, setEditingExpense, deleteExpense } = useExpenses();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const today = getTodayString();

  const [showTheoretical, setShowTheoretical] = useState<boolean>(() => {
    const saved = localStorage.getItem('masraf_upcoming_show_theoretical');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleTheoretical = () => {
    setShowTheoretical(prev => {
      const next = !prev;
      localStorage.setItem('masraf_upcoming_show_theoretical', String(next));
      return next;
    });
  };

  // Upcoming installment payments or future-dated expenses
  const upcomingExpenses = expenses
    .filter(e => {
      if (e.date <= today) return false;
      const isTheor = Boolean(e.isTheoretical || e.paymentType === 'teorik');
      if (isTheor && !showTheoretical) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalUpcoming = upcomingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const theoreticalTotal = upcomingExpenses
    .filter(e => e.isTheoretical || e.paymentType === 'teorik')
    .reduce((s, e) => s + e.amount, 0);
  const realTotal = totalUpcoming - theoreticalTotal;

  // Group upcoming by month
  const groupedByMonth = upcomingExpenses.reduce<{ [m: string]: typeof expenses }>((acc, exp) => {
    const mKey = exp.date.substring(0, 7);
    if (!acc[mKey]) acc[mKey] = [];
    acc[mKey].push(exp);
    return acc;
  }, {});

  const monthKeys = Object.keys(groupedByMonth).sort();

  // Aylar varsayılan olarak kapalı tutulabilir veya ilk ay açık başlar
  // collapsedMonths: true ise o ay kapalıdır
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>(() => {
    // İlk ay açık, geri kalan tüm aylar kapalı başlasın
    const initial: Record<string, boolean> = {};
    monthKeys.forEach((mKey, index) => {
      initial[mKey] = index !== 0;
    });
    return initial;
  });

  const toggleMonth = (mKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [mKey]: !prev[mKey],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    monthKeys.forEach(k => { next[k] = false; });
    setCollapsedMonths(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    monthKeys.forEach(k => { next[k] = true; });
    setCollapsedMonths(next);
  };

  const formatMonthTitle = (ym: string) => {
    const [year, m] = ym.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[parseInt(m, 10) - 1] || m} ${year}`;
  };

  return (
    <div className="space-y-5">
      
      {/* Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <FastForward className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Gelecek Ödemeler & Taksitler</h2>
            <p className="text-xs text-slate-400">
              Gelecek aylara yansıyacak olan tüm taksit ve planlı ödemeleriniz
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={toggleTheoretical}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  showTheoretical
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
                }`}
                title="Teorik / Varsayımsal Harcamaları Aç / Kapat"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Teorik Harcamalar: {showTheoretical ? 'Açık' : 'Kapalı'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-2.5 px-4 bg-slate-800/80 rounded-xl border border-amber-500/30 text-right w-full sm:w-auto">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Toplam Gelecek Borç / Taksit
          </span>
          <span className="text-base sm:text-lg font-black text-amber-400">
            {formatCurrency(totalUpcoming)}
          </span>
          {showTheoretical && theoreticalTotal > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              <span>Gerçek: {formatCurrency(realTotal)}</span>
              <span className="mx-1">•</span>
              <span className="text-purple-300 font-medium">Teorik: {formatCurrency(theoreticalTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {upcomingExpenses.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-white">Geleceğe Yansımış Bir Taksit Yok!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Harcama eklerken "Taksitli" seçtiğinizde sonraki aylara düşen taksitleriniz otomatik burada listelenir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Quick Expand / Collapse Controls */}
          {monthKeys.length > 1 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span>{monthKeys.length} Aylık Ödeme Planı</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-300 border border-slate-700 transition-colors"
                >
                  Tümünü Aç
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-300 border border-slate-700 transition-colors"
                >
                  Tümünü Kapat
                </button>
              </div>
            </div>
          )}

          {monthKeys.map((monthKey, monthIdx) => {
            const items = groupedByMonth[monthKey];
            const monthTotal = items.reduce((s, e) => s + e.amount, 0);
            const isCollapsed = Boolean(collapsedMonths[monthKey]);
            const isOpen = !isCollapsed;
            const theme = MONTH_THEMES[monthIdx % MONTH_THEMES.length];

            return (
              <div
                key={monthKey}
                className={`glass-panel p-3 sm:p-4 rounded-2xl border transition-all ${theme.border} ${theme.panelBg} space-y-3 shadow-lg shadow-black/20`}
              >
                {/* Accordion Toggle Header */}
                <button
                  type="button"
                  onClick={() => toggleMonth(monthKey)}
                  className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none text-left ${theme.headerBg}`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`p-1 rounded-lg bg-slate-950/60 ${theme.icon}`}>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-90' : ''}`} />
                    </div>
                    <Calendar className={`w-4 h-4 ${theme.icon} shrink-0`} />
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      {formatMonthTitle(monthKey)}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${theme.badge}`}>
                      {items.length} Kayıt
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <div className={`text-xs sm:text-sm font-black ${theme.totalText}`}>
                      {formatCurrency(monthTotal)}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                {isOpen && (
                  <div className="space-y-2 animate-in fade-in zoom-in-[0.99] duration-150">
                    {items.map(exp => {
                      const category = categories.find(c => c.id === exp.categoryId);
                      const subcategory = category?.subcategories.find(s => s.id === exp.subcategoryId);
                      const account = accounts.find(a => a.id === exp.accountId);
                      const limit = limits.find(l => l.id === exp.limitId);
                      const rawLvl = (exp.necessity || 'Tanımsız') as string;
                      const styleInfo = NECESSITY_BORDER_STYLES[rawLvl] || NECESSITY_BORDER_STYLES['Tanımsız'];

                      const isMenuOpen = activeMenuId === exp.id;

                      return (
                        <div key={exp.id} className="relative select-none group">
                          <div
                            onClick={() => setEditingExpense(exp)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setActiveMenuId(exp.id);
                            }}
                            className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${styleInfo.border} ${styleInfo.bg} hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-950/20 active:scale-[0.99] cursor-pointer backdrop-blur-sm flex flex-col gap-2`}
                            title="Harcamayı düzenlemek için tıklayın (Yaptığınız değişiklikler tüm seriyi günceller)"
                          >
                            {/* Top Row: Category (Left), Middle Info, Amount & Installment (Right) */}
                            <div className="flex items-start justify-between gap-2">
                              
                              {/* 1. LEFT: Compact Category Pill + Necessity badge stacked */}
                              <div className="flex flex-col items-start gap-1 flex-shrink-0 w-20 sm:w-24">
                                {category ? (
                                  <div
                                    className="px-2 py-0.5 rounded-lg text-slate-950 font-bold text-[10px] sm:text-[11px] max-w-full truncate shadow-sm"
                                    style={{ backgroundColor: category.color || '#3b82f6' }}
                                  >
                                    {category.name}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                                    Genel
                                  </span>
                                )}

                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-slate-900/60 ${styleInfo.text} border-current/30 truncate max-w-full`}>
                                  {styleInfo.label}
                                </span>
                              </div>

                              {/* 2. MIDDLE: Title, Description, Account & Subcategory */}
                              <div className="flex-1 min-w-0 space-y-0.5 px-1">
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <h4 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                                    {exp.title || 'Taksitli Ödeme'}
                                  </h4>
                                  {subcategory && (
                                    <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                                      ({subcategory.name})
                                    </span>
                                  )}
                                  {account && (
                                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                      {account.name}
                                    </span>
                                  )}
                                  {limit && (
                                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                      {limit.name}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                  <span>Vade: {formatDateFormatted(exp.date)}</span>
                                </div>
                              </div>

                              {/* 3. RIGHT: Amount & Underneath Payment Details */}
                              <div className="flex flex-col items-end flex-shrink-0 text-right">
                                <span className={`text-xs sm:text-base font-extrabold ${theme.totalText}`}>
                                  {formatCurrency(exp.amount)}
                                </span>

                                <div className="mt-0.5 flex flex-col items-end">
                                  {exp.paymentType === 'teorik' || exp.isTheoretical ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                      {exp.isUnlimitedRecurrence ? 'Teorik (Sürekli)' : `${exp.installmentNumber || 1}. Teorik`}
                                    </span>
                                  ) : exp.paymentType === 'tekrarlayan' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                      {exp.isUnlimitedRecurrence ? 'Sürekli Tekrar' : `${exp.installmentNumber || 1}. Tekrar`}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      {exp.installmentNumber ? `${exp.installmentNumber}. / ${exp.installmentCount} Taksit` : `${exp.installmentCount || 1} Taksit`}
                                    </span>
                                  )}
                                  {exp.totalAmount && exp.paymentType === 'taksitli' && (
                                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                                      (Top: {formatCurrency(exp.totalAmount)})
                                    </span>
                                  )}
                                  {exp.askApproval && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 mt-0.5">
                                      Günü Gelince Sorulacak
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Bottom Row: Tags extending full width with wrap/scroll */}
                            {exp.tags && exp.tags.length > 0 && (
                              <div className="w-full flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-800/40">
                                <TagChips tags={exp.tags} size="xs" />
                              </div>
                            )}
                          </div>

                          {/* Long-press / context action menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-10 right-2 z-50 flex items-center space-x-1 p-1 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl"
                            >
                              <button
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Düzenle</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Bu taksiti silmek istiyor musunuz?')) {
                                    deleteExpense(exp.id);
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Sil</span>
                              </button>
                              <button onClick={() => setActiveMenuId(null)} className="p-1 text-slate-400">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Hint */}
      <div className="text-center py-1 text-[10px] text-slate-500">
        💡 İpucu: Gelecek bir harcamayı değiştirmek için karta <b>tıklayın</b>. Burada yapılan değişiklikler tüm taksit / tekrar serisine yansıtılır.
      </div>

    </div>
  );
};
