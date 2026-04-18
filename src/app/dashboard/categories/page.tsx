'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Plus, Edit3, Trash2, Tag, ChevronDown, ChevronRight
} from 'lucide-react';
import { ACCOUNT_COLORS } from '@/lib/utils';
import { toast } from 'sonner';
import type { Category, CategoryFormData, CategoryType } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>({
    name: '', type: 'expense', icon: '📁', color: '#6366f1', parent_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
      // Auto-expand all by default
      const expanded: Record<string, boolean> = {};
      (data.data || []).forEach((c: Category) => { expanded[c.id] = true; });
      setExpandedParents(expanded);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  const saveCategory = async () => {
    if (!form.name.trim()) { toast.error('Category name required'); return; }
    setSaving(true);
    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          parent_id: form.parent_id === '' ? null : form.parent_id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingCategory ? 'Category updated' : 'Category created');
      fetchCategories(); // Re-fetch to get correct nested structure
      setShowForm(false);
      setEditingCategory(null);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Transactions using it will lose their category.')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Category deleted');
      fetchCategories();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setForm({ name: '', type: 'expense', icon: '📁', color: '#6366f1', parent_id: '' });
  };

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedByType = categories.reduce((groups, cat) => {
    if (!groups[cat.type]) groups[cat.type] = [];
    groups[cat.type].push(cat);
    return groups;
  }, {} as Record<string, Category[]>);

  // Flatten for parent dropdown (only parents of the same type)
  const getParentOptions = (type: CategoryType) => {
    return categories.filter(c => c.type === type); // they are already top-level from API
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage income and expense categories (supports sub-categories)</p>
        </div>
        <motion.button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" /> Add Category
        </motion.button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 h-64 shimmer-bg" />
          <div className="rounded-xl border border-border bg-card p-5 h-64 shimmer-bg" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-border bg-card shadow-soft">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No categories yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first category to start organizing transactions</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['expense', 'income', 'transfer'].map(type => {
            const typeCats = groupedByType[type] || [];
            if (typeCats.length === 0) return null;
            return (
              <div key={type} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-emerald-500' : type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <h2 className="font-semibold capitalize text-lg">{type} Categories</h2>
                </div>
                <div className="p-3 flex-1">
                  <div className="space-y-1">
                    {typeCats.map(parent => (
                      <div key={parent.id}>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group transition-colors">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleExpand(parent.id)}
                              className={`p-0.5 rounded hover:bg-muted ${!parent.subcategories?.length ? 'invisible' : ''}`}
                            >
                              {expandedParents[parent.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${parent.color}20` }}>
                              {parent.icon}
                            </div>
                            <span className="font-medium">{parent.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setForm({ name: '', type: parent.type, icon: '🏷️', color: parent.color, parent_id: parent.id }); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Add Sub-category">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditingCategory(parent); setForm({ name: parent.name, type: parent.type, icon: parent.icon, color: parent.color, parent_id: '' }); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteCategory(parent.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedParents[parent.id] && parent.subcategories && parent.subcategories.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="pl-9 overflow-hidden"
                            >
                              {parent.subcategories.map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group transition-colors mt-1 relative">
                                  <div className="absolute left-[-12px] top-1/2 w-4 h-px bg-border -translate-y-1/2" />
                                  <div className="absolute left-[-12px] top-0 bottom-1/2 w-px bg-border" />
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ background: `${sub.color}20` }}>
                                      {sub.icon}
                                    </div>
                                    <span className="text-sm">{sub.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingCategory(sub as any); setForm({ name: sub.name, type: parent.type, icon: sub.icon, color: sub.color, parent_id: parent.id }); setShowForm(true); }}
                                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteCategory(sub.id)}
                                      className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-5">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Groceries" autoFocus />
              </div>
              
              {!form.parent_id && !editingCategory?.parent_id && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['expense', 'income', 'transfer'].map(t => (
                      <button key={t} onClick={() => setForm({ ...form, type: t as CategoryType })}
                        className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-primary/50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Parent Category (Optional)</label>
                <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">None (Top-Level)</option>
                  {getParentOptions(form.type).filter(c => c.id !== editingCategory?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Nesting allows you to create sub-categories.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Icon (Emoji)</label>
                  <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                    maxLength={2} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_COLORS.slice(0, 8).map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-5 h-5 rounded-full transition-all ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-primary' : 'hover:scale-110'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingCategory(null); }} className="flex-1 px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={saveCategory} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
