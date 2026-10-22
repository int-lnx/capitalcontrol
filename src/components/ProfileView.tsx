import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { exportFinancialDataToExcel } from '../utils/excelExport';
import { getTodayString } from '../utils/formatters';
import {
  User,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Database,
  Calendar,
  Layers,
  Tag,
  PiggyBank,
  LogIn,
  LogOut,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { expenses, categories, accounts, limits, tagParents, resetToDefaultData } = useExpenses();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const todayStr = getTodayString();

  const pastAndTodayExpenses = expenses.filter(e => e.date <= todayStr);
  const futureExpenses = expenses.filter(e => e.date > todayStr);

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      exportFinancialDataToExcel({
        expenses,
        categories,
        accounts,
        limits,
        tagParents,
        todayStr,
      });
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profil Başlık Kartı */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Profil'}
              className="w-20 h-20 rounded-2xl border-2 border-emerald-500/40 shadow-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-lg">
              {user?.displayName ? user.displayName[0].toUpperCase() : <User className="w-10 h-10" />}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {user?.displayName || 'Misafir Kullanıcı'}
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              {user?.email || 'Yerel depolama (Çevrimdışı / LocalStorage)'}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {user ? 'Google ile Eşitlendi' : 'Yerel Mod'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Toplam {expenses.length} Kayıt
              </span>
            </div>
          </div>

          <div className="mt-2 sm:mt-0">
            {user ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02]"
              >
                <LogIn className="w-4 h-4" />
                Google ile Giriş Yap
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dışarı Aktarma (Excel Export) Bölümü - Öne Çıkan Ana Alan */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Finansal Verileri Dışa Aktar (Excel)</h3>
                <p className="text-xs text-slate-400">
                  Tüm geçmiş ve gelecek harcamalarınızı, kategori ve etiket özetlerini çoklu sayfalı .xlsx olarak indirin.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
              exportSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
            } disabled:opacity-50`}
          >
            {exportSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 text-white" />
                <span>Rapor İndirildi!</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>{isExporting ? 'Oluşturuluyor...' : 'Excel (.xlsx) Olarak İndir'}</span>
              </>
            )}
          </button>
        </div>

        {/* Excel İçerik Detayları Bilgi Kartları */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Dışa Aktarılacak Excel Çalışma Kitabı Sayfaları:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Sayfa 1 */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Database className="w-4 h-4" />
                <span>1. Loglar</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tarih sırasına göre en yeniden en eskiye sıralanmış, tüm başlık, açıklama, kategori, hesap, limit ve etiket bilgilerini içeren bireysel geçmiş kayıtlar ({pastAndTodayExpenses.length} kayıt).
              </p>
            </div>

            {/* Sayfa 2 */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Calendar className="w-4 h-4" />
                <span>2. Gelecek Harcamalar</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gelecek taksitler ve tekrarlayan seriler tek tek satırlar yerine seri bazında genel açıklama, taksit ve kalan/sınırsız tekrar durumuyla tek satırda özetlenir.
              </p>
            </div>

            {/* Sayfa 3 */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <Layers className="w-4 h-4" />
                <span>3. Kategori Özet</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Her satır bir ay. Sol başta ay ve <strong>Toplam Harcama</strong> yer alır, sağında en çok harcama yapılan ilk 50 kategorinin aylık dağılımı listelenir.
              </p>
            </div>

            {/* Sayfa 4 */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <Tag className="w-4 h-4" />
                <span>4. Etiket Özet</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Her satır bir ay. Sol başta ay ve <strong>Toplam Harcama</strong> yer alır, sağında en çok harcanan ilk 50 etiketin aylık tutar dağılımı yer alır.
              </p>
            </div>

            {/* Sayfa 5 */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-1.5 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <PiggyBank className="w-4 h-4" />
                <span>5. Tasarruf ve Gereklilik Özet</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ay ay toplam harcama, tasarruf potansiyeli (kaçınılabilir ve israf toplamı), tasarruf yüzdesi ile her gereklilik derecesinin (Fizyolojik, Temel, Makul, vb.) tutarsal ve oransal dağılımı.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* İstatistik & Veri Yönetimi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Veri İstatistikleri */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Sistem Veri İstatistikleri
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Geçmiş / Güncel Log</span>
              <span className="text-base font-bold text-slate-200">{pastAndTodayExpenses.length}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Gelecek Planlanan</span>
              <span className="text-base font-bold text-amber-400">{futureExpenses.length}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Tanımlı Kategori</span>
              <span className="text-base font-bold text-slate-200">{categories.length}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Hesap & Limit Sayısı</span>
              <span className="text-base font-bold text-slate-200">{accounts.length + limits.length}</span>
            </div>
          </div>
        </div>

        {/* Veri Sıfırlama / Fabrika Ayarları */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Veri Yönetimi
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tüm verilerinizi sıfırlayıp ilk başlangıç demo verilerine dönmek isterseniz bu seçeneği kullanabilirsiniz.
            </p>
          </div>

          <div>
            {showResetConfirm ? (
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 space-y-2">
                <p className="text-xs text-rose-300 font-medium">
                  Tüm yerel ve bulut verileriniz sıfırlanacaktır. Emin misiniz?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetToDefaultData();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Evet, Sıfırla
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-medium transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Varsayılan Verilere Dön (Sıfırla)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
