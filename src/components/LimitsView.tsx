import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted } from '../utils/formatters';
import type { ExpenseLimit, LimitResetFrequency } from '../types';
import {
  getCurrentLimitPeriod,
  getDaysUntilNextReset,
  formatPeriodRange,
  computeLimitHistory,
} from '../utils/limitUtils';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Calendar,
  History,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const LimitsView: React.FC = () => {
  const { expenses, limits, categories, addLimit, updateLimit, deleteLimit, resetLimitPeriodNow } = useExpenses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<ExpenseLimit | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');
  const [resetFrequency, setResetFrequency] = useState<LimitResetFrequency>('aylik');
  const [resetDay, setResetDay] = useState<string>('1');
  const [customResetDate, setCustomResetDate] = useState<string>('');

  // History modal states
  const [selectedHistoryLimit, setSelectedHistoryLimit] = useState<ExpenseLimit | null>(null);
  const [expandedPeriodKey, setExpandedPeriodKey] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setEditingLimit(null);
    setName('');
    setTargetAmount('');
    setDescription('');
    setResetFrequency('aylik');
    setResetDay('1');
    setCustomResetDate('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (limit: ExpenseLimit) => {
    setEditingLimit(limit);
    setName(limit.name);
    setTargetAmount(limit.targetAmount.toString());
    setDescription(limit.description || '');
    setResetFrequency(limit.resetFrequency || 'aylik');
    setResetDay(String(limit.resetDay || 1));
    setCustomResetDate(limit.nextResetDate || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericTarget = parseFloat(targetAmount);

    if (!name.trim()) {
      alert('Lütfen limit adını giriniz.');
      return;
    }

    if (isNaN(numericTarget) || numericTarget <= 0) {
      alert('Lütfen geçerli bir limit tutarı giriniz.');
      return;
    }

    const parsedResetDay = Math.min(Math.max(parseInt(resetDay, 10) || 1, 1), 31);

    const payload = {
      name: name.trim(),
      targetAmount: numericTarget,
      description: description.trim() || undefined,
      resetFrequency,
      resetDay: resetFrequency === 'aylik' ? parsedResetDay : undefined,
      nextResetDate: resetFrequency === 'ozel' ? customResetDate || undefined : undefined,
    };

    if (editingLimit) {
      updateLimit({
        ...editingLimit,
        ...payload,
      });
    } else {
      addLimit(payload);
    }

    setIsModalOpen(false);
  };

  const handleManualReset = (limit: ExpenseLimit) => {
    const confirmReset = confirm(
      `🔔 "${limit.name}" limitini şimdi sıfırlamak istiyor musunuz?\n\n` +
      `Mevcut dönemin harcamaları (${formatCurrency(limit.spentAmount)}) geçmiş kaydı olarak arşivlenecek ve yeni limit dönemi bugünden itibaren 0 TL olarak başlayacaktır.`
    );
    if (confirmReset) {
      resetLimitPeriodNow(limit.id);
    }
  };

  // Preview next reset date in modal
  const previewPeriod = getCurrentLimitPeriod({
    resetFrequency,
    resetDay: parseInt(resetDay, 10) || 1,
    nextResetDate: customResetDate || undefined,
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Bütçe & Limit Yönetimi</h2>
            <p className="text-xs text-slate-400">
              Kişi (Örn: Enes 5.000 TL) veya harcama türüne özel yenilenen bütçe limitleri tanımlayın
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Limit Tanımla</span>
        </button>
      </div>

      {/* Limits Grid */}
      {limits.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">Henüz bir limit tanımlanmadı</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Örneğin "Enes Bütçesi" için aylık 5.000 TL limit tanımlayabilir, her ayın 1'inde veya 15'inde otomatik sıfırlanmasını sağlayabilir ve geçmiş aşım kayıtlarını inceleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {limits.map(limit => {
            const todayStr = new Date().toISOString().split('T')[0];
            const periodInfo = getCurrentLimitPeriod(limit, todayStr);
            const curStart = limit.currentPeriodStart || periodInfo.currentPeriodStart;
            const curEnd = periodInfo.currentPeriodEnd;
            const nextReset = limit.nextResetDate || periodInfo.nextResetDate;
            const resetDaysInfo = getDaysUntilNextReset(nextReset, todayStr);

            const remaining = limit.targetAmount - limit.spentAmount;
            const percentage = Math.min(100, Math.round((limit.spentAmount / limit.targetAmount) * 100));
            const isOverLimit = limit.spentAmount > limit.targetAmount;

            const allHistory = computeLimitHistory(limit, expenses);
            const historyCount = allHistory.length;

            // Bar color logic
            let barColor = 'bg-emerald-500';
            if (percentage >= 80 && percentage < 100) barColor = 'bg-amber-500';
            if (isOverLimit) barColor = 'bg-rose-500';

            return (
              <div
                key={limit.id}
                className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative group hover:border-slate-700 transition-all shadow-md"
              >
                {/* 1. Header: Title & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{limit.name}</h3>
                    {limit.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{limit.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(limit)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Limiti Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${limit.name}" limitini silmek istediğinize emin misiniz?`)) {
                          deleteLimit(limit.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Limiti Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Renewal & Period Timing Info Pill */}
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
                      <RotateCcw className="w-3 h-3 text-purple-400" />
                      {limit.resetFrequency === 'haftalik'
                        ? 'Haftalık Yenilenir'
                        : limit.resetFrequency === 'ozel'
                        ? 'Belirli Tarihte Yenilenir'
                        : limit.resetFrequency === 'yok'
                        ? 'Sabit Limit (Sıfırlanmaz)'
                        : `Aylık (Her ayın ${limit.resetDay || 1}'i)`}
                    </span>

                    {limit.resetFrequency !== 'yok' && nextReset && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                        {resetDaysInfo.text}
                      </span>
                    )}
                  </div>

                  {limit.resetFrequency !== 'yok' && curStart && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                      <span>Mevcut Dönem:</span>
                      <span className="text-slate-300 font-medium">{formatPeriodRange(curStart, curEnd)}</span>
                    </div>
                  )}
                </div>

                {/* 3. Amounts Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400">Dönem Harcaması:</span>
                    <p className="text-sm font-bold text-rose-400">{formatCurrency(limit.spentAmount)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Hedef Bütçe:</span>
                    <p className="text-sm font-bold text-slate-200">{formatCurrency(limit.targetAmount)}</p>
                  </div>
                </div>

                {/* 4. Progress Bar & Status */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Bütçe Kullanımı:</span>
                    <span className={`font-bold ${isOverLimit ? 'text-rose-400' : 'text-slate-200'}`}>
                      %{percentage}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                {/* 5. Remaining / Over Limit Status Alert */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  {isOverLimit ? (
                    <div className="flex items-center space-x-1.5 text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 w-full">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Limit {formatCurrency(Math.abs(remaining))} aşıldı!</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-full">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Kalan Limit: {formatCurrency(remaining)}</span>
                    </div>
                  )}
                </div>

                {/* 6. Footer Actions: History & Manual Reset */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryLimit(limit)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-semibold transition-all"
                    title="Bu limitin geçmiş dönemlerdeki aşım ve bütçe kayıtlarını inceleyin"
                  >
                    <History className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dönem Geçmişi ({historyCount})</span>
                  </button>

                  {limit.resetFrequency !== 'yok' && (
                    <button
                      type="button"
                      onClick={() => handleManualReset(limit)}
                      className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                      title="Mevcut dönemi geçmişe arşivleyip bugünden itibaren 0 TL ile yeni bir dönem başlat"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="text-[11px]">Sıfırla</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Limit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700 p-6 bg-slate-900 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" />
                <span>{editingLimit ? 'Limiti Düzenle' : 'Yeni Limit Tanımla'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Limit Adı (Örn: Enes, Market, Cep Harçlığı) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Limit adı yazın..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-purple-500/40 focus:border-purple-400 rounded-xl text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Hedef Limit Tutarı (TL) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-purple-500/40 focus:border-purple-400 rounded-xl text-sm text-white outline-none"
                />
              </div>

              {/* Yenilenme (Reset) Döngüsü Seçenekleri */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-purple-500/30 space-y-3">
                <label className="block text-xs font-semibold text-purple-300">
                  Limit Yenilenme (Sıfırlanma) Döngüsü
                </label>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResetFrequency('aylik')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      resetFrequency === 'aylik'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Aylık (Belirli Gün)
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetFrequency('haftalik')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      resetFrequency === 'haftalik'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Haftalık (Pazartesi)
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetFrequency('ozel')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      resetFrequency === 'ozel'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Belirli Tarihte
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetFrequency('yok')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      resetFrequency === 'yok'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Sürekli (Yenilenmez)
                  </button>
                </div>

                {/* Aylık Seçildiğinde: Yenilenme Günü */}
                {resetFrequency === 'aylik' && (
                  <div className="space-y-1.5 pt-1 border-t border-purple-500/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Yenilenme Günü:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Her ayın</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={resetDay}
                          onChange={e => setResetDay(e.target.value)}
                          className="w-14 px-2 py-1 bg-slate-800 border border-purple-500/50 text-purple-300 font-bold text-center text-xs rounded-lg outline-none"
                        />
                        <span className="text-[11px] text-slate-300 font-semibold">. günü</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Örn: 1 seçilirse ayın 1'inde, 15 seçilirse maaş günü olan her ayın 15'inde bütçe sıfırlanıp yeni döneme geçer.
                    </p>
                  </div>
                )}

                {/* Özel Tarih Seçildiğinde */}
                {resetFrequency === 'ozel' && (
                  <div className="space-y-1.5 pt-1 border-t border-purple-500/20">
                    <label className="block text-xs text-slate-300">Sıfırlanma / Bitiş Tarihi:</label>
                    <input
                      type="date"
                      value={customResetDate}
                      onChange={e => setCustomResetDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-purple-500/50 text-xs rounded-lg text-white outline-none"
                    />
                  </div>
                )}

                {/* Önizleme Rozeti */}
                {resetFrequency !== 'yok' && previewPeriod.nextResetDate && (
                  <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Sonraki Yenilenme:
                    </span>
                    <span className="text-purple-200 font-bold">
                      {formatDateFormatted(previewPeriod.nextResetDate)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Açıklama <span className="text-slate-500">(İsteğe Bağlı)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ek açıklama..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  {editingLimit ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Limit History Modal (Geçmiş Dönem ve Bütçe Aşım Kayıtları) */}
      {selectedHistoryLimit && (() => {
        const historyRecords = computeLimitHistory(selectedHistoryLimit, expenses);
        const overLimitCount = historyRecords.filter(r => r.isOverLimit).length;
        const withinBudgetCount = historyRecords.filter(r => !r.isOverLimit).length;
        const totalNetDifference = historyRecords.reduce((sum, r) => sum + r.difference, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-slate-700 p-5 sm:p-6 bg-slate-900 text-slate-100 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>"{selectedHistoryLimit.name}" Limit Geçmişi</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Geçmiş dönemlerdeki bütçe hedefleri ve harcama aşım kayıtları
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedHistoryLimit(null);
                    setExpandedPeriodKey(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Toplam Dönem</span>
                  <span className="text-base font-black text-white">{historyRecords.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block uppercase font-semibold">Bütçe İçi</span>
                  <span className="text-base font-black text-emerald-400">{withinBudgetCount} Dönem</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 block uppercase font-semibold">Limit Aşımı</span>
                  <span className="text-base font-black text-rose-400">{overLimitCount} Dönem</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Net Tasarruf</span>
                  <span className={`text-base font-black ${totalNetDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalNetDifference >= 0 ? `+${formatCurrency(totalNetDifference)}` : formatCurrency(totalNetDifference)}
                  </span>
                </div>
              </div>

              {/* History Records List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {historyRecords.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                    <History className="w-10 h-10 text-slate-600 mx-auto opacity-70" />
                    <h4 className="text-sm font-semibold text-slate-300">Henüz geçmiş bir dönem kaydı yok</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Bu limit için ilk dönem tamamlandığında veya kart üzerindeki "Sıfırla" butonuyla yeni döneme geçtiğinizde tamamlanan dönemler burada listelenecektir.
                    </p>
                  </div>
                ) : (
                  historyRecords.map(record => {
                    const isExpanded = expandedPeriodKey === record.id;
                    const percentage = Math.min(100, Math.round((record.spentAmount / record.targetAmount) * 100));
                    
                    // Bu döneme ait harcamalar
                    const periodExpenses = expenses.filter(e => {
                      if (e.limitId !== selectedHistoryLimit.id) return false;
                      if (e.isTheoretical || e.paymentType === 'teorik') return false;
                      return e.date >= record.periodStart && e.date <= record.periodEnd;
                    }).sort((a, b) => b.date.localeCompare(a.date));

                    return (
                      <div
                        key={record.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          record.isOverLimit
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-slate-800/70 border-slate-700/70'
                        }`}
                      >
                        {/* Period Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {formatPeriodRange(record.periodStart, record.periodEnd)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {record.isOverLimit ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                {formatCurrency(Math.abs(record.difference))} Aşıldı (%{percentage})
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                {formatCurrency(record.difference)} Tasarruf (%{percentage})
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedPeriodKey(isExpanded ? null : record.id)}
                              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Harcama detaylarını göster / gizle"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Amounts & Progress Row */}
                        <div className="mt-2.5 pt-2 border-t border-slate-700/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Dönem Harcaması</span>
                            <span className="font-bold text-rose-400">{formatCurrency(record.spentAmount)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Dönem Limiti</span>
                            <span className="font-bold text-slate-200">{formatCurrency(record.targetAmount)}</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1 text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 block">Kayıt Sayısı</span>
                            <span className="font-semibold text-purple-300">{record.expenseCount} Harcama</span>
                          </div>
                        </div>

                        {/* Expandable Expense Items List */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-300 block">
                              Bu Dönemde Yapılan Harcamalar:
                            </span>

                            {periodExpenses.length === 0 ? (
                              <p className="text-xs text-slate-500 py-2">Detaylı harcama kaydı bulunamadı.</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {periodExpenses.map(exp => {
                                  const cat = categories.find(c => c.id === exp.categoryId);
                                  return (
                                    <div
                                      key={exp.id}
                                      className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center space-x-2 min-w-0">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: cat?.color || '#a855f7' }}
                                        />
                                        <span className="text-slate-200 font-medium truncate">
                                          {exp.title || 'Harcama'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 shrink-0">
                                          {formatDateFormatted(exp.date)}
                                        </span>
                                      </div>
                                      <span className="font-bold text-slate-100 ml-2 shrink-0">
                                        {formatCurrency(exp.amount)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHistoryLimit(null);
                    setExpandedPeriodKey(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Kapat
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
