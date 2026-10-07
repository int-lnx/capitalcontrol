import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FolderTree, Plus, Trash2, ChevronRight, X, Edit2, Check } from 'lucide-react';
import { PieChart } from './PieChart';

export const CategoryManagerView: React.FC = () => {
  const {
    categories,
    expenses,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
  } = useExpenses();

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [selectedCatForSub, setSelectedCatForSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Düzenleme modları state'leri
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');

  const [editingSubKey, setEditingSubKey] = useState<string | null>(null); // "catId_subId"
  const [editSubName, setEditSubName] = useState('');

  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  const handleAddMainCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      iconName: 'Folder',
      subcategories: [],
    });

    setNewCatName('');
  };

  const handleStartEditCat = (cat: (typeof categories)[0]) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color || '#3b82f6');
  };

  const handleSaveEditCat = (catId: string) => {
    if (!editCatName.trim()) return;
    updateCategory(catId, {
      name: editCatName.trim(),
      color: editCatColor,
    });
    setEditingCatId(null);
  };

  const handleAddSubCategory = (categoryId: string) => {
    if (!newSubName.trim()) return;
    addSubCategory(categoryId, newSubName.trim());
    setNewSubName('');
    setSelectedCatForSub(null);
  };

  const handleStartEditSub = (categoryId: string, subId: string, currentName: string) => {
    setEditingSubKey(`${categoryId}_${subId}`);
    setEditSubName(currentName);
  };

  const handleSaveEditSub = (categoryId: string, subId: string) => {
    if (!editSubName.trim()) return;
    updateSubCategory(categoryId, subId, editSubName.trim());
    setEditingSubKey(null);
  };

  // Pie chart calculation for categories
  const categoryChartData = categories.map(cat => {
    const totalSpent = expenses
      .filter(e => e.categoryId === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      id: cat.id,
      label: cat.name,
      value: totalSpent,
      color: cat.color,
    };
  }).filter(c => c.value > 0);

  // Uncategorized
  const uncatSpent = expenses.filter(e => !e.categoryId).reduce((s, e) => s + e.amount, 0);
  if (uncatSpent > 0) {
    categoryChartData.push({
      id: 'uncategorized',
      label: 'Kategorisiz / Genel',
      value: uncatSpent,
      color: '#64748b',
    });
  }

  return (
    <div className="space-y-5">
      
      {/* 1. PIE CHART EN ÜSTTE */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-teal-400" />
          <span>Kategori Bazlı Harcama Dağılımı (Yüzdesel)</span>
        </h3>
        <PieChart
          data={categoryChartData}
          selectedLabel={selectedCategoryFilter ? categories.find(c => c.id === selectedCategoryFilter)?.name : undefined}
          onSliceClick={(_label, id) => setSelectedCategoryFilter(prev => (prev === id ? null : (id || null)))}
          title="Kategori Harcama Payı"
        />
      </div>

      {/* 2. Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Kategori & Alt Kategori Yönetimi</h2>
            <p className="text-xs text-slate-400">
              Harcamalarınızı gruplamak için ana kategoriler ve detaylı alt kategoriler oluşturun, düzenleyin veya silin
            </p>
          </div>
        </div>
      </div>

      {/* Add New Category Box */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Yeni Ana Kategori Ekle</span>
        </h3>

        <form onSubmit={handleAddMainCategory} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Örn: Sağlık, Araç, Eğlence..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            className="flex-1 min-w-[200px] px-3.5 py-2 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl text-sm text-white outline-none"
          />

          {/* Color Picker Buttons */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewCatColor(color)}
                className={`w-6 h-6 rounded-lg transition-transform ${
                  newCatColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            Kategori Oluştur
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300">
          Mevcut Kategoriler ({categories.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(category => {
            const isEditingCat = editingCatId === category.id;

            return (
              <div
                key={category.id}
                className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative ${
                  selectedCategoryFilter === category.id
                    ? 'border-teal-500 bg-slate-800/90'
                    : 'border-slate-800'
                }`}
              >
                {/* Main Category Header / Edit Bar */}
                {isEditingCat ? (
                  <div className="space-y-2.5 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-teal-500 rounded-xl text-sm text-white font-bold outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCat(category.id)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
                        title="Kaydet"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Renk Seçici Düzenleme */}
                    <div className="flex items-center space-x-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditCatColor(color)}
                          className={`w-5 h-5 rounded-md transition-transform ${
                            editCatColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-4 h-4 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      />
                      <h4 className="text-base font-bold text-white truncate">{category.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {category.subcategories.length} Alt Kategori
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEditCat(category)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                        title="Kategoriyi Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${category.name}" kategorisini ve alt kategorilerini silmek istediğinize emin misiniz?`)) {
                            deleteCategory(category.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Kategoriyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Subcategories List */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Alt Kategoriler:</span>
                  </div>

                  {category.subcategories.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-1">Henüz alt kategori eklenmedi</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {category.subcategories.map(sub => {
                        const isEditingThisSub = editingSubKey === `${category.id}_${sub.id}`;

                        if (isEditingThisSub) {
                          return (
                            <div
                              key={sub.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-900 border border-teal-500 rounded-lg"
                            >
                              <input
                                type="text"
                                value={editSubName}
                                onChange={e => setEditSubName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEditSub(category.id, sub.id);
                                }}
                                className="w-24 bg-transparent text-xs text-white outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditSub(category.id, sub.id)}
                                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubKey(null)}
                                className="p-0.5 text-slate-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sub.id}
                            className="group/sub text-xs px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 flex items-center space-x-1.5 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{sub.name}</span>
                            <div className="flex items-center space-x-0.5 opacity-70 group-hover/sub:opacity-100 ml-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditSub(category.id, sub.id, sub.name)}
                                className="p-0.5 text-slate-400 hover:text-teal-300 transition-colors"
                                title="Alt Kategoriyi Düzenle"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${sub.name}" alt kategorisini silmek istediğinize emin misiniz?`)) {
                                    deleteSubCategory(category.id, sub.id);
                                  }
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Alt Kategoriyi Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Subcategory Trigger / Form */}
                {selectedCatForSub === category.id ? (
                  <div className="pt-2 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Alt kategori adı..."
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddSubCategory(category.id);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubCategory(category.id)}
                      className="px-3 py-1.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCatForSub(null)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCatForSub(category.id)}
                    className="pt-1 text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Alt Kategori Ekle</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
