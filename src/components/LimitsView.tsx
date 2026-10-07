import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import type { ExpenseLimit } from '../types';
import { ShieldAlert, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';

export const LimitsView: React.FC = () => {
  const { limits, addLimit, updateLimit, deleteLimit } = useExpenses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<ExpenseLimit | null>(null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenAddModal = () => {
    setEditingLimit(null);
    setName('');
    setTargetAmount('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (limit: ExpenseLimit) => {
    setEditingLimit(limit);
    setName(limit.name);
    setTargetAmount(limit.targetAmount.toString());
    setDescription(limit.description || '');
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

    if (editingLimit) {
      updateLimit({
        ...editingLimit,
        name: name.trim(),
        targetAmount: numericTarget,
        description: description.trim() || undefined,
      });
    } else {
      addLimit({
        name: name.trim(),
        targetAmount: numericTarget,
        description: description.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Bütçe & Limit Yönetimi</h2>
            <p className="text-xs text-slate-400">
              Kişi (Örn: Enes 5.000 TL) veya harcama türüne özel limitler tanımlayın
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
          <p className="text-xs text-slate-500">
            Örneğin "Enes" adında 5.000 TL limit oluşturabilir ve harcamalardan düşebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {limits.map(limit => {
            const remaining = limit.targetAmount - limit.spentAmount;
            const percentage = Math.min(100, Math.round((limit.spentAmount / limit.targetAmount) * 100));
            const isOverLimit = limit.spentAmount > limit.targetAmount;

            // Bar color logic
            let barColor = 'bg-emerald-500';
            if (percentage >= 80 && percentage < 100) barColor = 'bg-amber-500';
            if (isOverLimit) barColor = 'bg-rose-500';

            return (
              <div
                key={limit.id}
                className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative group"
              >
                {/* Limit Title & Action Icons */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{limit.name}</h3>
                    {limit.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{limit.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
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

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400">Harcanan:</span>
                    <p className="text-sm font-bold text-rose-400">{formatCurrency(limit.spentAmount)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Hedef Limit:</span>
                    <p className="text-sm font-bold text-slate-200">{formatCurrency(limit.targetAmount)}</p>
                  </div>
                </div>

                {/* Progress Bar & Status */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Kullanım:</span>
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

                {/* Remaining Badge */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  {isOverLimit ? (
                    <div className="flex items-center space-x-1 text-rose-400 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Limit {formatCurrency(Math.abs(remaining))} aşıldı!</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-emerald-400 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Kalan Limit: {formatCurrency(remaining)}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700 p-6 bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingLimit ? 'Limiti Düzenle' : 'Yeni Limit Tanımla'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-purple-400 mb-1">
                  Limit Adı (Örn: Enes, Market) <span className="text-rose-400">*</span>
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
                <label className="block text-xs font-semibold text-purple-400 mb-1">
                  Limit Tutarı (TL) <span className="text-rose-400">*</span>
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

    </div>
  );
};
