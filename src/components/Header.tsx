import React from 'react';
import type { MainTabType, TabType } from '../types';
import {
  Wallet,
  Calendar,
  CalendarDays,
  BarChart2,
  FastForward,
  Tag,
  ShieldAlert,
  CreditCard,
  FolderTree,
  Sparkles,
  Plus,
  RotateCcw,
  LogIn,
  LogOut,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeMainTab: MainTabType;
  activeSubTab: TabType;
  setActiveSubTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMainTab,
  activeSubTab,
  setActiveSubTab,
  onOpenAddModal,
}) => {
  const { resetToDefaultData, isCloudSyncing } = useExpenses();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const today = new Date();
  const todayFormatted = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  // Sub-tabs controlled dynamically by the selected bottom main tab
  const subTabsByMain: Record<MainTabType, { id: TabType; label: string; icon: React.ReactNode }[]> = {
    records: [
      { id: 'timeline', label: `Günlük Akış (${todayFormatted})`, icon: <Calendar className="w-3.5 h-3.5" /> },
      { id: 'upcoming', label: 'Gelecek Ödemeler', icon: <FastForward className="w-3.5 h-3.5 text-amber-400" /> },
      { id: 'calendar', label: 'Takvim', icon: <CalendarDays className="w-3.5 h-3.5" /> },
      { id: 'monthly', label: 'Aylık Toplamlar', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    ],
    status: [
      { id: 'savings', label: 'Tasarruf & İhtiyaç', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
      { id: 'tag_query', label: 'Etiket Dağılımı', icon: <Tag className="w-3.5 h-3.5" /> },
      { id: 'categories', label: 'Kategoriler & Pasta', icon: <FolderTree className="w-3.5 h-3.5" /> },
    ],
    accounts: [
      { id: 'accounts', label: 'Hesaplar & Bakiyeler', icon: <CreditCard className="w-3.5 h-3.5" /> },
      { id: 'limits', label: 'Limitler & Bütçeler', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    ],
  };

  const currentSubTabs = subTabsByMain[activeMainTab] || [];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main top bar - Compact vertical height */}
        <div className="flex items-center justify-between h-13 gap-2 py-1.5">
          
          {/* Logo & App Title */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <Wallet className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent truncate leading-tight">
                Masraf Yönetimi
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 leading-none">
                <span className="hidden sm:inline">Finans Portalı</span>
                {user && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-400 font-medium">
                    {isCloudSyncing ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-teal-400" />
                        <span>Bulut eşitleniyor...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-2.5 h-2.5 text-teal-400" />
                        <span>Buluta bağlı</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Auth */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Google Auth Button */}
            {loading ? (
              <div className="px-2 py-1 rounded-lg bg-slate-800/50 text-slate-400 text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2 py-0.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Kullanıcı'}
                    className="w-5 h-5 rounded-full border border-teal-500/40"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] flex items-center justify-center font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] text-slate-200 font-medium hidden md:inline max-w-[100px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => signOut()}
                  title="Çıkış Yap"
                  className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors ml-0.5"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700/90 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                title="Google ile Giriş Yap"
              >
                <LogIn className="w-3 h-3 text-teal-400" />
                <span className="hidden sm:inline">Google ile Giriş</span>
                <span className="sm:hidden">Giriş</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm('Tüm verileri varsayılana sıfırlamak istediğinize emin misiniz?')) {
                  resetToDefaultData();
                }
              }}
              title="Demo verileri sıfırla"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Harcama Ekle</span>
              <span className="xs:hidden">Ekle</span>
            </button>
          </div>
        </div>

        {/* Dynamic Sub Tab Navigation based on Bottom Main Tab - Tight & Compact */}
        <div className="flex space-x-1 overflow-x-auto py-1 no-scrollbar border-t border-slate-800/50">
          {currentSubTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                if (tab.id === 'timeline') {
                  setTimeout(() => {
                    const todayEl = document.getElementById('today-journal-anchor');
                    if (todayEl) {
                      todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] sm:text-xs">{tab.label}</span>
            </button>
          ))}
        </div>

      </div>
    </header>
  );
};
