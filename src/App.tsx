import { useState } from 'react';
import { ExpenseProvider } from './context/ExpenseContext';
import { AuthProvider } from './context/AuthContext';
import type { MainTabType, TabType } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { TimelineView } from './components/TimelineView';
import { CalendarView } from './components/CalendarView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { UpcomingPaymentsView } from './components/UpcomingPaymentsView';
import { TagQueryView } from './components/TagQueryView';
import { CategoryManagerView } from './components/CategoryManagerView';
import { SavingsView } from './components/SavingsView';
import { AccountsView } from './components/AccountsView';
import { LimitsView } from './components/LimitsView';

import { useExpenses } from './context/ExpenseContext';

export function AppContent() {
  const { editingExpense, setEditingExpense } = useExpenses();
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('records');
  const [activeSubTab, setActiveSubTab] = useState<TabType>('timeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const isModalOpen = isAddModalOpen || Boolean(editingExpense);

  const handleSelectMainTab = (mainTab: MainTabType) => {
    setActiveMainTab(mainTab);
    // Switch to first sub-tab of the selected main tab
    if (mainTab === 'records') {
      setActiveSubTab('timeline');
    } else if (mainTab === 'status') {
      setActiveSubTab('savings');
    } else if (mainTab === 'accounts') {
      setActiveSubTab('accounts');
    }
  };

  const renderActiveView = () => {
    switch (activeSubTab) {
      // Records tabs
      case 'timeline':
        return <TimelineView />;
      case 'calendar':
        return <CalendarView />;
      case 'monthly':
        return <MonthlySummaryView />;
      case 'upcoming':
        return <UpcomingPaymentsView />;
      
      // Status tabs
      case 'tag_query':
        return <TagQueryView />;
      case 'categories':
        return <CategoryManagerView />;
      case 'savings':
        return <SavingsView />;
      
      // Accounts tabs
      case 'accounts':
        return <AccountsView />;
      case 'limits':
        return <LimitsView />;

      default:
        return <TimelineView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950">
      
      {/* Header with dynamic Sub-Tabs (Fixed at top) */}
      <Header
        activeMainTab={activeMainTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Main Container - Scrollable Middle Area (pt-26 sm:pt-28 accounts for fixed header, pb-20 accounts for fixed bottom nav) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-26 pb-20">
        {renderActiveView()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Masraf Yönetimi • Akıllı Finans & Tasarruf Portalı</p>
        </div>
      </footer>

      {/* Bottom Navigation (Kayıtlar, Durum, Hesaplar) */}
      <BottomNav
        activeMainTab={activeMainTab}
        onSelectMainTab={handleSelectMainTab}
      />

      {/* Expense Add/Edit Dialog Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExpenseProvider>
        <AppContent />
      </ExpenseProvider>
    </AuthProvider>
  );
}
