'use client';

import { ArrowLeft, Scan, CircleNotch, Paperclip, X, Camera } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { InlineEmojiPicker } from '@/components/ui/emoji-picker-mart';

type FormState = {
  type: 'expense' | 'income' | 'transfer';
  amount: string;
  currency: string;
  description: string;
  note: string;
  emoji: string;
  category_id: string;
  account_id: string;
  dest_account_id: string;
  transaction_date: string;
  attachment: File | null;
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [form, setForm] = useState<FormState>({
    type: 'expense',
    amount: '',
    currency: 'USD',
    description: '',
    note: '',
    emoji: '',
    category_id: '',
    account_id: '',
    dest_account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    attachment: null,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([accRes, catRes, profileRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      if (accRes.data?.length > 0) {
        setForm(current => ({
          ...current,
          account_id: accRes.data[0].id,
          currency: accRes.data[0].currency,
        }));
      }
      if (profileRes.data?.default_currency) {
        setForm(current => ({ ...current, currency: profileRes.data.default_currency }));
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm({ ...form, attachment: e.target.files[0] });
    }
  };

  const handleScanReceipt = async () => {
    if (!form.attachment) { toast.error('Attach a receipt first'); return; }
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', form.attachment);
      const res = await fetch('/api/ai/scan', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const data = result.data;
      if (data) {
        setForm(current => ({
          ...current,
          amount: data.total ? data.total.toString() : current.amount,
          transaction_date: data.date ? data.date : current.transaction_date,
          description: data.merchant ? data.merchant : current.description,
          currency: data.currency ? data.currency : current.currency,
        }));
        toast.success('Receipt scanned!');
      }
    } catch (err: any) { toast.error(err.message || 'Scan failed'); }
    finally { setScanning(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.account_id) { toast.error('Amount and account are required'); return; }
    if (form.type === 'transfer') {
      if (!form.dest_account_id) { toast.error('Destination account required'); return; }
      if (form.account_id === form.dest_account_id) { toast.error('Cannot transfer to same account'); return; }
    }

    setLoading(true);
    try {
      let attachment_path = null, attachment_name = null, attachment_size = null, attachment_type = null;
      if (form.attachment) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fileExt = form.attachment.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, form.attachment);
          if (uploadError) toast.error('Upload failed');
          else { attachment_path = filePath; attachment_name = form.attachment.name; attachment_size = form.attachment.size; attachment_type = form.attachment.type; }
        }
      }

      const { attachment: _file, ...formData } = form;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, attachment_path, attachment_name, attachment_size, attachment_type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Transaction saved');
      router.push('/dashboard/transactions');
    } catch (err: any) { toast.error(err.message || 'Error'); }
    finally { setLoading(false); }
  };

  const handleSaveAndContinue = async () => {
    if (!form.amount || !form.account_id) { toast.error('Amount and account are required'); return; }
    setLoading(true);
    try {
      const { attachment: _file, ...formData } = form;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Saved! Add another.');
      setForm(prev => ({ ...prev, amount: '', description: '', note: '', emoji: '', category_id: '' }));
    } catch (err: any) { toast.error(err.message || 'Error'); }
    finally { setLoading(false); }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);
  const typeColors = { expense: '#ff6b6b', income: '#10b981', transfer: '#3b82f6' };

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/transactions" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-semibold capitalize">{form.type}</h1>
        </div>
        <div className="flex items-center gap-2">
          {form.attachment && form.attachment.type.startsWith('image/') && (
            <button type="button" onClick={handleScanReceipt} disabled={scanning} className="p-2 text-primary">
              {scanning ? <CircleNotch className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Type toggle */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {(['income', 'expense', 'transfer'] as const).map(type => (
            <button key={type} type="button"
              onClick={() => setForm({ ...form, type, category_id: '', dest_account_id: type === 'transfer' ? form.dest_account_id : '' })}
              className="py-2.5 rounded-lg border text-sm font-medium capitalize transition-all"
              style={form.type === type ? { borderColor: typeColors[type], color: typeColors[type] } : { borderColor: 'hsl(var(--border) / 0.5)', color: 'hsl(var(--muted-foreground))' }}>
              {type}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="px-4">
          {/* Date */}
          <div className="underline-field">
            <label>Date</label>
            <input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
          </div>

          {/* Amount */}
          <div className="underline-field">
            <label>Amount</label>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="bg-transparent border-none outline-none text-sm text-muted-foreground">
                {['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'INR', 'SGD', 'MYR', 'THB', 'AUD', 'CAD'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input type="number" step="0.01" required value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="text-right text-lg font-semibold bg-transparent border-none outline-none w-32" />
            </div>
          </div>

          {/* Category */}
          {form.type !== 'transfer' && (
            <div className="underline-field">
              <label>Category</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="bg-transparent border-none outline-none text-right text-sm flex-1">
                <option value="">No category</option>
                {filteredCategories.map(cat => (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                    <option value={cat.id}>{cat.icon} {cat.name}</option>
                    {cat.subcategories?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Account */}
          <div className="underline-field">
            <label>{form.type === 'transfer' ? 'From' : 'Account'}</label>
            <select required value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}
              className="bg-transparent border-none outline-none text-right text-sm flex-1">
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.icon} {acc.name} ({acc.currency})</option>
              ))}
            </select>
          </div>

          {/* To (transfer only) */}
          {form.type === 'transfer' && (
            <div className="underline-field">
              <label>To</label>
              <select required value={form.dest_account_id} onChange={e => setForm({ ...form, dest_account_id: e.target.value })}
                className="bg-transparent border-none outline-none text-right text-sm flex-1">
                <option value="">Select destination</option>
                {accounts.filter(a => a.id !== form.account_id).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.icon} {acc.name} ({acc.currency})</option>
                ))}
              </select>
            </div>
          )}

          {/* Description + Emoji picker (RESTORED) */}
          <div className="underline-field">
            <label>Label</label>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <InlineEmojiPicker value={form.emoji} onChange={emoji => setForm({ ...form, emoji })} />
              <input type="text" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Add a label" className="bg-transparent border-none outline-none text-right text-sm flex-1 min-w-0" />
            </div>
          </div>
        </div>

        {/* Notes textarea (RESTORED) */}
        <div className="px-4 mt-3">
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <textarea
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border/30 bg-foreground/[0.02] px-3 py-2 text-sm focus:outline-none resize-none"
            placeholder="Add extra details, receipts, or reminders..."
          />
        </div>

        {/* Attachment */}
        <div className="px-4 mt-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Receipt / Attachment</span>
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-primary font-medium">
              <Camera className="w-4 h-4" />
              {form.attachment ? 'Change' : 'Attach'}
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          {form.attachment && (
            <div className="flex items-center justify-between py-2 border-t border-border/10">
              <div className="min-w-0">
                <p className="truncate text-sm">{form.attachment.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(form.attachment.size / 1024)} KB</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, attachment: null })} className="p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Save / Continue */}
        <div className="flex gap-3 px-4 pt-5">
          <motion.button type="submit" disabled={loading}
            className="flex-[2] py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: typeColors[form.type] }}
            whileTap={{ scale: 0.97 }}>
            {loading ? 'Saving...' : 'Save'}
          </motion.button>
          <motion.button type="button" onClick={handleSaveAndContinue} disabled={loading}
            className="flex-1 py-3.5 rounded-xl border border-border/50 text-sm font-medium text-foreground disabled:opacity-60"
            whileTap={{ scale: 0.97 }}>
            Continue
          </motion.button>
        </div>
      </form>
    </div>
  );
}
