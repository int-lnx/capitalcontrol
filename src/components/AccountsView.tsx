import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import type { Account } from '../types';
import { CreditCard, Plus, Edit2, Trash2, X, Wallet, Landmark } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useExpenses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('banka');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('₺');

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setName('');
    setType('banka');
    setBalance('0');
    setCurrency('₺');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(account.balance.toString());
    setCurrency(account.currency);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    setIsModalOpen(false);
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
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
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Hesap & Banka Takibi</h2>
            <p className="text-xs text-slate-400">
              Cüzdan, banka hesapları ve kredi kartlarınızı yönetin, masrafları ilgili hesaba yansıtın
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Yeni Hesap Ekle</span>
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  {getAccountIcon(acc.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    {acc.type === 'nakit' ? 'Nakit Cüzdan' : acc.type === 'banka' ? 'Banka Hesabı' : 'Kredi Kartı'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEditModal(acc)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${acc.name}" hesabını silmek istediğinize emin misiniz?`)) {
                      deleteAccount(acc.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Güncel Bakiye:</span>
              <p className={`text-2xl font-black mt-0.5 ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(acc.balance, acc.currency)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700 p-6 bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
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
                <label className="block text-xs font-semibold text-blue-400 mb-1">
                  Hesap Adı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti Ana Hesap, Nakit Cüzdan..."
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
                    <option value="nakit">Nakit</option>
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  {editingAccount ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
