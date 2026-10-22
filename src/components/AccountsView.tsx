import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import type { Account, CustomAccountTotal } from '../types';
import { CreditCard, Plus, Edit2, Trash2, X, Wallet, Landmark, Layers, Check, Calculator, Info } from 'lucide-react';

interface AccountsViewProps {
  initialTab?: 'accounts' | 'totals';
}

export const AccountsView: React.FC<AccountsViewProps> = ({ initialTab = 'accounts' }) => {
  const {
    accounts,
    expenses,
    customTotals,
    categories,
    addAccount,
    updateAccount,
    deleteAccount,
    addCustomTotal,
    updateCustomTotal,
    deleteCustomTotal,
    setEditingExpense,
    deleteExpense,
  } = useExpenses();

  // Tab State: 'accounts' (Hesaplarım) | 'totals' (Toplamlar) controlled via initialTab from Header
  const activeTab = initialTab;

  // Selected account for drill-down detail view (veya 'unassigned' for Hesap Dışı)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('banka');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('₺');

  // Custom Total Modal State
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [editingTotal, setEditingTotal] = useState<CustomAccountTotal | null>(null);
  const [totalName, setTotalName] = useState('');
  const [totalDescription, setTotalDescription] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [totalColor, setTotalColor] = useState('#3b82f6');

  const TOTAL_COLORS = [
    { label: 'Mavi', hex: '#3b82f6', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { label: 'Yeşil', hex: '#10b981', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { label: 'Mor', hex: '#8b5cf6', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { label: 'Turuncu', hex: '#f59e0b', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { label: 'Pembe', hex: '#ec4899', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
    { label: 'Turkuaz', hex: '#06b6d4', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  ];

  // Harcamalar arasında herhangi bir hesaba bağlanmamış (Hesap Dışı) olanlar
  const unassignedExpenses = expenses.filter(e => !e.accountId);
  const unassignedTotalSpent = unassignedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Seçili hesabın harcamaları
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const isViewingUnassigned = selectedAccountId === 'unassigned';
  const detailExpenses = isViewingUnassigned
    ? unassignedExpenses
    : expenses.filter(e => e.accountId === selectedAccountId);
  const detailTotalSpent = detailExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Genel Toplam Hesaplamaları (Para birimlerine göre gruplanmış)
  const generalTotalsByCurrency = accounts.reduce((acc, curr) => {
    const cur = curr.currency || '₺';
    acc[cur] = (acc[cur] || 0) + curr.balance;
    return acc;
  }, {} as Record<string, number>);

  // Türlerine göre hesap toplamları
  const bankTotal = accounts.filter(a => a.type === 'banka').reduce((sum, a) => sum + a.balance, 0);
  const cashTotal = accounts.filter(a => a.type === 'nakit').reduce((sum, a) => sum + a.balance, 0);
  const cardTotal = accounts.filter(a => a.type === 'kredi_karti').reduce((sum, a) => sum + a.balance, 0);

  const handleOpenAddAccountModal = () => {
    setEditingAccount(null);
    setName('');
    setType('banka');
    setBalance('0');
    setCurrency('₺');
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccountModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(account.balance.toString());
    setCurrency(account.currency);
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericBalance = parseFloat(balance);

    if (!name.trim()) {
      alert('Lütfen hesap adını giriniz.');
      return;
    }

    if (isNaN(numericBalance)) {
      alert('Lütfen geçerli bir bakiye giriniz.');
      return;
    }

    if (editingAccount) {
      updateAccount({
        ...editingAccount,
        name: name.trim(),
        type,
        balance: numericBalance,
        currency,
      });
    } else {
      addAccount({
        name: name.trim(),
        type,
        balance: numericBalance,
        currency,
        color: '#3b82f6',
      });
    }

    setIsAccountModalOpen(false);
  };

  // Custom Total Modal Handlers
  const handleOpenAddTotalModal = () => {
    setEditingTotal(null);
    setTotalName('');
    setTotalDescription('');
    setSelectedAccountIds([]);
    setTotalColor('#3b82f6');
    setIsTotalModalOpen(true);
  };

  const handleOpenEditTotalModal = (total: CustomAccountTotal) => {
    setEditingTotal(total);
    setTotalName(total.name);
    setTotalDescription(total.description || '');
    setSelectedAccountIds([...total.accountIds]);
    setTotalColor(total.color || '#3b82f6');
    setIsTotalModalOpen(true);
  };

  const toggleAccountSelection = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      setSelectedAccountIds(selectedAccountIds.filter(id => id !== accountId));
    } else {
      setSelectedAccountIds([...selectedAccountIds, accountId]);
    }
  };

  const handleTotalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalName.trim()) {
      alert('Lütfen toplam grubu için bir ad giriniz.');
      return;
    }

    if (selectedAccountIds.length === 0) {
      alert('Lütfen bu toplama dahil edilecek en az bir hesap seçiniz.');
      return;
    }

    if (editingTotal) {
      updateCustomTotal({
        ...editingTotal,
        name: totalName.trim(),
        description: totalDescription.trim() || undefined,
        accountIds: selectedAccountIds,
        color: totalColor,
      });
    } else {
      addCustomTotal({
        name: totalName.trim(),
        description: totalDescription.trim() || undefined,
        accountIds: selectedAccountIds,
        color: totalColor,
      });
    }

    setIsTotalModalOpen(false);
  };

  const getAccountIcon = (accType: Account['type']) => {
    switch (accType) {
      case 'nakit':
        return <Wallet className="w-5 h-5 text-emerald-400" />;
      case 'banka':
        return <Landmark className="w-5 h-5 text-blue-400" />;
      case 'kredi_karti':
        return <CreditCard className="w-5 h-5 text-purple-400" />;
      default:
        return <CreditCard className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
            {activeTab === 'accounts' ? (
              <CreditCard className="w-5 h-5" />
            ) : (
              <Calculator className="w-5 h-5 text-teal-400" />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {activeTab === 'accounts' ? 'Hesap & Banka Takibi' : 'Hesap Toplamları & Özel Gruplar'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'accounts'
                ? 'Cüzdan, banka hesapları ve kredi kartlarınızı yönetin, harcamalarınızı ilgili hesaba bağlayın'
                : 'Tüm hesaplarınızın genel toplamını veya belirli hesapları birleştiren özel toplamları takip edin'}
            </p>
          </div>
        </div>

        {/* Action Button based on active tab */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {activeTab === 'accounts' ? (
            <button
              onClick={handleOpenAddAccountModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yeni Hesap Ekle</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddTotalModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Özel Toplam Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------- HESAP DETAY SAYFASI (TIKLANINCA AÇILAN) ----------------- */}
      {selectedAccountId !== null ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header of Detail View */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 bg-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedAccountId(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold border border-slate-700"
                  title="Tüm Hesaplara Geri Dön"
                >
                  <span>← Geri</span>
                </button>

                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                  {isViewingUnassigned ? (
                    <Wallet className="w-5 h-5 text-slate-400" />
                  ) : (
                    getAccountIcon(selectedAccount?.type || 'banka')
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{isViewingUnassigned ? 'Hesap Dışı Harcamalar' : selectedAccount?.name}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {isViewingUnassigned
                        ? 'Genel Harcamalar'
                        : selectedAccount?.type === 'nakit'
                        ? 'Nakit Cüzdan'
                        : selectedAccount?.type === 'banka'
                        ? 'Banka Hesabı'
                        : selectedAccount?.type === 'kredi_karti'
                        ? 'Kredi Kartı'
                        : 'Diğer'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isViewingUnassigned
                      ? 'Herhangi bir hesaba atanmamış genel harcamaların dökümü'
                      : `Bu hesaba yansıtılan toplam ${detailExpenses.length} adet harcama kaydı`}
                  </p>
                </div>
              </div>

              {!isViewingUnassigned && selectedAccount && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpenEditAccountModal(selectedAccount)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Düzenle</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bakiye ve Harcama Özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
              {!isViewingUnassigned && selectedAccount && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-xs text-slate-400">Güncel Hesap Bakiyesi:</span>
                  <p className={`text-2xl font-black mt-0.5 ${selectedAccount.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                  </p>
                </div>
              )}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <span className="text-xs text-slate-400">Bu Hesaptan Yapılan Toplam Harcama:</span>
                <p className="text-2xl font-black mt-0.5 text-rose-400">
                  {formatCurrency(detailTotalSpent, selectedAccount?.currency || '₺')}
                </p>
              </div>
            </div>
          </div>

          {/* İlgili Harcamaların Listesi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>Bu Hesaba Ait Harcamalar ({detailExpenses.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Tarihe göre yeniden eskiye sıralı
              </span>
            </div>

            {detailExpenses.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-900/30">
                <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Bu hesaba ait henüz harcama kaydı bulunmuyor.</p>
                <p className="text-xs text-slate-500">Harcama eklerken veya düzenlerken bu hesabı seçtiğinizde burada listelenecektir.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...detailExpenses]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(exp => {
                    const category = categories.find(c => c.id === exp.categoryId);
                    return (
                      <div
                        key={exp.id}
                        className="glass-card p-3.5 sm:p-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 flex items-center justify-between gap-3 transition-all group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* Kategori / İkon */}
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${category?.color || '#64748b'}20`,
                              borderColor: `${category?.color || '#64748b'}40`,
                              color: category?.color || '#94a3b8',
                            }}
                          >
                            <CreditCard className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                                {exp.title || category?.name || 'Harcama'}
                              </h5>
                              {exp.paymentType === 'taksitli' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  {exp.installmentNumber ? `${exp.installmentNumber}/${exp.installmentCount || ''}` : 'Taksitli'}
                                </span>
                              )}
                              {exp.paymentType === 'tekrarlayan' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                  {exp.installmentNumber ? `${exp.installmentNumber}. Tekrar` : 'Tekrarlı'}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{exp.date}</span>
                              {category && (
                                <>
                                  <span>•</span>
                                  <span style={{ color: category.color }}>{category.name}</span>
                                </>
                              )}
                              {exp.necessity && exp.necessity !== 'Tanımsız' && (
                                <>
                                  <span>•</span>
                                  <span className="text-teal-400">{exp.necessity}</span>
                                </>
                              )}
                              {exp.tags && exp.tags.length > 0 && (
                                <span className="hidden sm:inline-flex gap-1 text-slate-500">
                                  {exp.tags.map(t => `#${t}`).join(' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tutar & İşlemler */}
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-sm sm:text-base font-black text-rose-400">
                            -{formatCurrency(exp.amount, selectedAccount?.currency || '₺')}
                          </span>

                          <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                            <button
                              onClick={() => setEditingExpense(exp)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title="Harcamayı Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bu harcamayı silmek istediğinize emin misiniz?')) {
                                  deleteExpense(exp.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                              title="Harcamayı Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ----------------- TAB 1: HESAPLAR LİSTESİ ----------------- */
        activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Hesap Dışı Kartı */}
              <div
                onClick={() => setSelectedAccountId('unassigned')}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-4 relative cursor-pointer hover:border-slate-600 hover:scale-[1.01] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 group-hover:border-slate-500 transition-colors">
                      <Wallet className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                        <span>Hesap Dışı</span>
                        <span className="text-[10px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">Harcamaları Gör →</span>
                      </h3>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                        Otomatik / Genel Harcamalar
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                    {unassignedExpenses.length} Harcama
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">Toplam Masraf Payı:</span>
                  <p className="text-2xl font-black mt-0.5 text-slate-200">
                    {formatCurrency(unassignedTotalSpent)}
                  </p>
                </div>
              </div>

              {/* Gerçek Hesaplar */}
              {accounts.map(acc => {
                const accExpensesCount = expenses.filter(e => e.accountId === acc.id).length;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative group hover:border-blue-500/50 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 group-hover:border-blue-400/50 transition-colors">
                          {getAccountIcon(acc.type)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Harcamaları Gör →</span>
                          </h3>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            {acc.type === 'nakit' ? 'Nakit Cüzdan' : acc.type === 'banka' ? 'Banka Hesabı' : acc.type === 'kredi_karti' ? 'Kredi Kartı' : 'Diğer'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-medium mr-1">
                          {accExpensesCount} Harcama
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAccountModal(acc);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Hesabı Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`"${acc.name}" hesabını silmek istediğinize emin misiniz?`)) {
                              deleteAccount(acc.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Hesabı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-end justify-between">
                      <div>
                        <span className="text-xs text-slate-400">Güncel Bakiye:</span>
                        <p className={`text-2xl font-black mt-0.5 ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                      </div>
                      <span className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform font-bold">
                        Detaylar & Harcamalar →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ----------------- TAB 2: TOPLAMLAR ----------------- */}
      {activeTab === 'totals' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* 1. Sistem Genel Toplamları (Tüm Hesaplar) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>Genel Hesaplar Toplamı</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Kayıtlı tüm {accounts.length} hesabın anlık toplamı
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Para birimi bazında genel toplamlar */}
              {Object.keys(generalTotalsByCurrency).length > 0 ? (
                Object.entries(generalTotalsByCurrency).map(([cur, sum]) => (
                  <div
                    key={`gen-tot-${cur}`}
                    className="glass-card p-5 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-slate-900/60 to-slate-900/40 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-teal-300">Tüm Hesaplar ({cur})</span>
                      <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        <Wallet className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-black text-white">
                      {formatCurrency(sum, cur)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {accounts.filter(a => (a.currency || '₺') === cur).length} adet hesap dahil
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                  Henüz bakiye hesaplanacak bir hesap bulunmuyor.
                </div>
              )}

              {/* Tür bazında hızlı özet kartları (Banka & Nakit) */}
              <div className="glass-card p-5 rounded-2xl border border-blue-500/20 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-300">Banka Hesapları Toplamı</span>
                  <Landmark className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-200">
                  {formatCurrency(bankTotal)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {accounts.filter(a => a.type === 'banka').length} banka hesabı
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-300">Nakit Cüzdanlar Toplamı</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-200">
                  {formatCurrency(cashTotal)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {accounts.filter(a => a.type === 'nakit').length} nakit hesabı
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-purple-500/20 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-300">Kredi Kartları Bakiyesi</span>
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <div className={`text-2xl font-black ${cardTotal >= 0 ? 'text-purple-200' : 'text-rose-400'}`}>
                  {formatCurrency(cardTotal)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {accounts.filter(a => a.type === 'kredi_karti').length} kredi kartı
                </div>
              </div>
            </div>
          </div>

          {/* 2. Kullanıcı Tarafından Tanımlanan Özel Toplamlar */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Özel Hesap Toplamları</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Belirli hesapları (örneğin sadece Akbank ve Nakit) seçerek oluşturduğunuz bağımsız toplamlar
                </p>
              </div>

              <button
                onClick={handleOpenAddTotalModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Özel Toplam</span>
              </button>
            </div>

            {customTotals.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-900/30">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Henüz Özel Toplam Tanımlamadınız</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Örneğin "Acil Durum Fonu (Nakit + Garanti)" veya "Günlük Harcama Hesapları" gibi dilediğiniz hesapları birleştirerek toplam bakiyelerini tek bir kartta takip edebilirsiniz.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddTotalModal}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
                >
                  İlk Özel Toplamı Oluştur
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {customTotals.map(totalItem => {
                  // Seçili hesapları bul
                  const includedAccounts = accounts.filter(a => totalItem.accountIds.includes(a.id));
                  
                  // Para birimlerine göre toplam hesapla
                  const currencyTotals = includedAccounts.reduce((acc, curr) => {
                    const cur = curr.currency || '₺';
                    acc[cur] = (acc[cur] || 0) + curr.balance;
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div
                      key={totalItem.id}
                      className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative group hover:border-blue-500/40 transition-all bg-slate-900/70"
                    >
                      {/* Kart Başlığı ve İşlemler */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="p-2.5 rounded-xl border"
                            style={{
                              backgroundColor: `${totalItem.color || '#3b82f6'}20`,
                              borderColor: `${totalItem.color || '#3b82f6'}50`,
                              color: totalItem.color || '#3b82f6',
                            }}
                          >
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{totalItem.name}</h4>
                            {totalItem.description ? (
                              <p className="text-[11px] text-slate-400 line-clamp-1">{totalItem.description}</p>
                            ) : (
                              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                                {includedAccounts.length} Hesap Dahil
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditTotalModal(totalItem)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Özel Toplamı Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${totalItem.name}" özel toplamını silmek istediğinize emin misiniz?`)) {
                                deleteCustomTotal(totalItem.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Özel Toplamı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Toplam Bakiye Gösterimi */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-xs text-slate-400">Toplam Bakiye:</span>
                        {Object.keys(currencyTotals).length > 0 ? (
                          <div className="space-y-1 mt-0.5">
                            {Object.entries(currencyTotals).map(([cur, amountVal]) => (
                              <p
                                key={`val-${cur}`}
                                className={`text-2xl font-black ${
                                  amountVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {formatCurrency(amountVal, cur)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-slate-500 mt-1">
                            0.00 ₺ (Seçili hesap bulunamadı)
                          </p>
                        )}
                      </div>

                      {/* Dahil Edilen Hesap Rozetleri */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Dahil Edilen Hesaplar ({includedAccounts.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {includedAccounts.length > 0 ? (
                            includedAccounts.map(acc => (
                              <span
                                key={`badge-${acc.id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/80"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>{acc.name}</span>
                                <span className="text-slate-400 text-[10px]">({formatCurrency(acc.balance, acc.currency)})</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-amber-400 italic">
                              ⚠️ Bu toplama dahil edilen hesaplar silinmiş olabilir. Düzenleyip güncelleyin.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- MODAL 1: HESAP EKLE / DÜZENLE ----------------- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700 p-6 bg-slate-900 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <span>{editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</span>
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-blue-400 mb-1">
                  Hesap Adı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Akbank Ana Hesap, Nakit Cüzdan..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-blue-500/40 focus:border-blue-400 rounded-xl text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hesap Türü</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as Account['type'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="nakit">Nakit Cüzdan</option>
                    <option value="banka">Banka Hesabı</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Para Birimi</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="₺">₺ (TRY)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mevcut Bakiye
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  {editingAccount ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 2: ÖZEL TOPLAM EKLE / DÜZENLE ----------------- */}
      {isTotalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700 p-6 bg-slate-900 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-teal-400" />
                <span>{editingTotal ? 'Özel Toplamı Düzenle' : 'Yeni Özel Toplam Oluştur'}</span>
              </h3>
              <button
                onClick={() => setIsTotalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTotalSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Özel Toplam Adı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Akbank + Nakit Toplamı, Likit Varlıklar..."
                  value={totalName}
                  onChange={e => setTotalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-teal-500/40 focus:border-teal-400 rounded-xl text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Açıklama (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Günlük harcamalarda kullanılabilecek nakit ve vadesiz hesaplar"
                  value={totalDescription}
                  onChange={e => setTotalDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none"
                />
              </div>

              {/* Renk Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Grup Rengi
                </label>
                <div className="flex items-center gap-2">
                  {TOTAL_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setTotalColor(c.hex)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        totalColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {totalColor === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dahil Edilecek Hesapların Seçimi */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-teal-300">
                    Dahil Edilecek Hesapları Seçin <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {selectedAccountIds.length} hesap seçildi
                  </span>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-amber-400">
                    Önce Hesaplar sekmesinden hesap eklemelisiniz.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {accounts.map(acc => {
                      const isSelected = selectedAccountIds.includes(acc.id);
                      return (
                        <div
                          key={`select-acc-${acc.id}`}
                          onClick={() => toggleAccountSelection(acc.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-teal-500/15 border-teal-500/50 text-white shadow-sm'
                              : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-teal-500 border-teal-400 text-slate-950 font-bold'
                                : 'border-slate-600 bg-slate-800'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center space-x-2">
                              {getAccountIcon(acc.type)}
                              <span className="text-xs font-semibold">{acc.name}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-xs font-bold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatCurrency(acc.balance, acc.currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Anlık Seçili Hesaplar Toplamı Önizleme */}
              {selectedAccountIds.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-teal-400" />
                    <span>Seçilenlerin Önizleme Toplamı:</span>
                  </span>
                  <div className="font-black text-emerald-400 text-sm">
                    {(() => {
                      const selAccs = accounts.filter(a => selectedAccountIds.includes(a.id));
                      const curTotals = selAccs.reduce((acc, curr) => {
                        const cur = curr.currency || '₺';
                        acc[cur] = (acc[cur] || 0) + curr.balance;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(curTotals)
                        .map(([cur, amt]) => formatCurrency(amt, cur))
                        .join(' + ');
                    })()}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTotalModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  {editingTotal ? 'Güncelle' : 'Toplamı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

