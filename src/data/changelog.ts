export interface RevisionNote {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const REVISION_HISTORY: RevisionNote[] = [
  {
    version: '2.07',
    date: 'Kasım 2026',
    title: 'Sürüm & Revizyon Notları Ekranı',
    highlights: [
      'Başlıktaki rev. numarasına tıklandığında açılan güncel ve geçmiş revizyon notları pop-up penceresi eklendi.',
      'Sürüm geçmişi özetleri ve tarihleri listelendi.'
    ],
  },
  {
    version: '2.06',
    date: 'Kasım 2026',
    title: 'Tasarruf Filtresi ve Etiket Arama Çubuğu',
    highlights: [
      'Durum sekmesinde "Toplam Tasarruf Edilebilir" kutusuna tıklanarak İsraf + Kaçınılabilir + Fırsat kayıtlarını filtreleme özelliği eklendi.',
      'Etiket Dağılımı sekmesine anlık etiket arama çubuğu ve hızlı bağlama/yönetim paneli entegre edildi.'
    ],
  },
  {
    version: '2.05',
    date: 'Kasım 2026',
    title: 'Toplu İşlem Modülü ve Masraf Ayrım Kopyalama',
    highlights: [
      'Log kayıtlarında çoklu seçim yapıldığında altta beliren Floating İşlem Çubuğu (Sil, Düzenle, İptal, Tümünü Seç) eklendi.',
      'Toplu Düzenleme Pop-up ekranı ile seçili kayıtlara kategori, etiket, limit, tasarruf seviyesi, hesap ve tarih atama desteği.',
      'Harcama ayrımında (Split Mode) mevcut kategori, limit ve etiket bilgilerinin yeni ayrıma bağımsız olarak kopyalanması sağlandı.'
    ],
  },
  {
    version: '2.04',
    date: 'Kasım 2026',
    title: 'Kaçan Fırsat Log Çeşidi',
    highlights: [
      'Yeni "Fırsat" log türü eklendi (bakiyeden para düşmeyen, kaçırılan tasarruf farkı kaydı).',
      'Durum -> Tasarruf Analizinde "Kaçan Fırsatlar" ayrı satırda ve toplam tasarruf edilebilir tutara dahil edildi.'
    ],
  },
  {
    version: '2.03',
    date: 'Kasım 2026',
    title: 'Limit Yenilenme Tarihleri ve Aşım Kayıtları',
    highlights: [
      'Bütçe limitlerine haftalık, aylık veya özel periyotlu otomatik sıfırlanma/yenilenme tarihleri eklendi.',
      'Limit geçmişi ve dönem aşım kayıtları takip modülü eklendi.'
    ],
  },
  {
    version: '2.02',
    date: 'Kasım 2026',
    title: 'Teorik Harcama ve Gelecek Projeksiyonu',
    highlights: [
      'Sınırsız tekrarlanan harcamaların gelecek ödemeler takviminde projeksiyon olarak listelenmesi.',
      'Varsayımsal giderler için "Teorik Harcama" türü ve Durum sekmesinde gelecek dönem grafiksel görünümü eklendi.'
    ],
  },
  {
    version: '2.01',
    date: 'Kasım 2026',
    title: 'Etiket Ağacı ve Akordiyon Görünümü',
    highlights: [
      'Etiket bağlama ve hiyerarşik ağaç önizleme penceresi.',
      'Etiket girişinde anlık öneri ve tamamlama sistemi.',
      'Durum sekmesinde seçilen dönemin üst sekmeler arasında kalıcı hale getirilmesi.',
      'Gelecek Ödemeler ekranında aylık akordiyon (açılır/kapanır) tasarımı.'
    ],
  },
  {
    version: '2.00',
    date: 'Kasım 2026',
    title: 'Tekrarlı Ödeme Sınırlandırması ve Revizyon Standardı',
    highlights: [
      '28 çeken aylarda tekrarlı harcamaların ayın son gününü aşmayacak şekilde sınırlandırılması.',
      'Revizyon numaralandırma standardı başlatıldı.'
    ],
  },
  {
    version: '1.40',
    date: 'Ekim 2026',
    title: 'Bağlı Etiket Altyapısı',
    highlights: [
      'Üst ve alt etiket ilişkisi (parent-child) mimarisi.',
      'Pasta grafiği altında etiket kartlarına uzun basıldığında yönetim aksiyonları menüsü.'
    ],
  },
  {
    version: '1.30',
    date: 'Ekim 2026',
    title: 'Harcama Ayırma (Split Mode)',
    highlights: [
      'Tek bir harcamayı birden fazla kategori ve etikete parçalayabilme desteği.',
      'Ayrım sekmeleri ve otomatik tutar dengeleme.'
    ],
  },
  {
    version: '1.20',
    date: 'Ekim 2026',
    title: 'Tasarruf ve İhtiyaç Seviyesi Analizi',
    highlights: [
      'Harcamaların Fizyolojik, Temel, Makul, Kaçınılabilir ve İsraf seviyelerine ayrılması.',
      'Tasarruf potansiyeli göstergesi ve gereklilik pasta grafiği.'
    ],
  },
  {
    version: '1.10',
    date: 'Ekim 2026',
    title: 'Onay Mekanizması ve Hesap Entegrasyonu',
    highlights: [
      'Taksitli ve tekrarlı harcamalar için günü gelince onay mekanizması.',
      'Hesap/kart bakiyeleri ve limit aşım bildirimleri.'
    ],
  },
  {
    version: '1.00',
    date: 'Ekim 2026',
    title: 'İlk Kararlı Sürüm',
    highlights: [
      'Kayıtlar (Zaman Çizelgesi & Takvim), Kategori Yönetimi ve Firebase Firestore bulut senkronizasyonu.'
    ],
  },
];

