import React from 'react';
import type { MainTabType } from '../types';
import { BookOpen, BarChart3, Wallet } from 'lucide-react';

interface BottomNavProps {
  activeMainTab: MainTabType;
  onSelectMainTab: (tab: MainTabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeMainTab, onSelectMainTab }) => {
  const mainTabs: { id: MainTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'records', label: 'Kayıtlar', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'status', label: 'Durum', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'accounts', label: 'Hesaplar', icon: <Wallet className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around py-0.5 px-3">
        {mainTabs.map(tab => {
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectMainTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-emerald-500/15 shadow-sm border border-emerald-500/30' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[10px] mt-0.2 leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
