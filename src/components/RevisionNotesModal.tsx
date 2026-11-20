import React from 'react';
import { X, History, Sparkles, CheckCircle2 } from 'lucide-react';
import { REVISION_HISTORY } from '../data/changelog';
import { APP_VERSION } from '../utils/version';

interface RevisionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RevisionNotesModal: React.FC<RevisionNotesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Sürüm & Revizyon Notları</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  rev {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Uygulama güncellemeleri ve yapılan değişikliklerin geçmişi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Revision List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
          {REVISION_HISTORY.map((rev) => {
            const isCurrent = rev.version === APP_VERSION;

            return (
              <div
                key={rev.version}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-br from-teal-950/30 to-slate-900 border-teal-500/50 shadow-md shadow-teal-950/30 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/40 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Revision Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg border ${
                        isCurrent
                          ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      rev {rev.version}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      {rev.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isCurrent && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-400 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.2 rounded-md">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Mevcut</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">{rev.date}</span>
                  </div>
                </div>

                {/* Highlights List */}
                <ul className="space-y-1 pl-1">
                  {rev.highlights.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300/90 flex items-start space-x-2 leading-relaxed"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                          isCurrent ? 'text-teal-400' : 'text-slate-500'
                        }`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Son 20 revizyon listelenmektedir.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};

