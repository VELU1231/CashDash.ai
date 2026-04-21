'use client';

import { Plus, ArrowLeft, Scan, CircleNotch, Paperclip, X } from '@phosphor-icons/react';
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
    currency: 'PHP',
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
    ]).then(([accRes, catRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      if (accRes.data?.length > 0) {
        setForm((current) => ({
          ...current,
          account_id: accRes.data[0].id,
          currency: accRes.data[0].currency,
        }));
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm({ ...form, attachment: e.target.files[0] });
    }
  };

  const handleScanReceipt = async () => {
    if (!form.attachment) {
      toast.error('Please attach a receipt image first');
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', form.attachment);

      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      const data = result.data;
      if (data) {
        setForm((current) => ({
          ...current,
          amount: data.total ? data.total.toString() : current.amount,
          transaction_date: data.date ? data.date : current.transaction_date,
          description: data.merchant ? data.merchant : current.description,
          currency: data.currency ? data.currency : current.currency,
        }));
        toast.success('Receipt scanned and fields auto-filled');
      }
    } catch (err: any) {
      toast.error(err.message || 'Scanning failed. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.account_id) {
      toast.error('Amount and account are required');
      return;
    }

    if (form.type === 'transfer') {
      if (!form.dest_account_id) {
        toast.error('Destination account is required for transfers');
        return;
      }
      if (form.account_id === form.dest_account_id) {
        toast.error('Cannot transfer to the same account');
        return;
      }
    }

    setLoading(true);
    try {
      let attachment_path = null;
      let attachment_name = null;
      let attachment_size = null;
      let attachment_type = null;

      if (form.attachment) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const fileExt = form.attachment.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, form.attachment);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error('Failed to upload attachment');
          } else {
            attachment_path = filePath;
            attachment_name = form.attachment.name;
            attachment_size = form.attachment.size;
            attachment_type = form.attachment.type;
          }
        }
      }

      const { attachment: _file, ...formData } = form;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachment_path,
          attachment_name,
          attachment_size,
          attachment_type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success('Transaction saved');
      router.push('/dashboard/transactions');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((category) => category.type === form.type);
  const typeStyles: Record<FormState['type'], string> = {
    expense: 'border-orange-500/40 bg-orange-500/10 text-orange-600',
    income: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
    transfer: 'border-blue-500/40 bg-blue-500/10 text-blue-600',
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/transactions" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Manual entry</p>
            <h1 className="text-xl font-semibold text-foreground md:text-2xl">New transaction</h1>
          </div>
        </div>

        {form.attachment && form.attachment.type.startsWith('image/') && (
          <button
            type="button"
            onClick={handleScanReceipt}
            disabled={scanning}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
          >
            {scanning ? <CircleNotch className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            Scan
          </button>
        )}
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <section className="glass-card overflow-hidden">
          <div className="grid grid-cols-3 gap-2 border-b border-border/70 p-3">
            {(['expense', 'income', 'transfer'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, type, category_id: '', dest_account_id: type === 'transfer' ? form.dest_account_id : '' })}
                className={`rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition-all ${
                  form.type === type
                    ? typeStyles[type]
                    : 'border-border/70 bg-card/60 text-muted-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-5 md:p-6">
            <div className="rounded-[28px] border border-border/70 bg-card/70 p-5">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</label>
              <div className="mt-3 flex items-end gap-3">
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm focus:outline-none"
                >
                  {['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'INR', 'SGD', 'MYR', 'THB', 'AUD', 'CAD'].map((currencyOption) => (
                    <option key={currencyOption} value={currencyOption}>{currencyOption}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight text-foreground focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-[28px] border border-border/70 bg-card/70 p-4">
              <Field label="Date">
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-right text-sm text-foreground focus:outline-none"
                />
              </Field>

              <Field label={form.type === 'transfer' ? 'From account' : 'Account'}>
                <select
                  required
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-right text-sm text-foreground focus:outline-none"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.icon} {account.name} ({account.currency})</option>
                  ))}
                </select>
              </Field>

              {form.type === 'transfer' ? (
                <Field label="To account">
                  <select
                    required
                    value={form.dest_account_id}
                    onChange={(e) => setForm({ ...form, dest_account_id: e.target.value })}
                    className="w-full border-0 bg-transparent p-0 text-right text-sm text-foreground focus:outline-none"
                  >
                    <option value="">Select destination</option>
                    {accounts.filter((account) => account.id !== form.account_id).map((account) => (
                      <option key={account.id} value={account.id}>{account.icon} {account.name} ({account.currency})</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Category">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full border-0 bg-transparent p-0 text-right text-sm text-foreground focus:outline-none"
                  >
                    <option value="">No category</option>
                    {filteredCategories.map((category) => (
                      <optgroup key={category.id} label={`${category.icon} ${category.name}`}>
                        <option value={category.id}>{category.icon} {category.name}</option>
                        {category.subcategories?.map((sub: any) => (
                          <option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Description">
                <div className="flex items-center justify-end gap-2">
                  <InlineEmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} />
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-sm text-foreground focus:outline-none"
                    placeholder="Add a label"
                  />
                </div>
              </Field>
            </div>
          </div>
        </section>

        <section className="glass-card p-4 md:p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Receipt or attachment</h2>
                <p className="text-xs text-muted-foreground">Optional image or PDF</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3.5 py-2 text-sm font-medium text-foreground">
                <Paperclip className="h-4 w-4" /> Attach
                <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {form.attachment ? (
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{form.attachment.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(form.attachment.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, attachment: null })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Attach a receipt to scan totals with AI.
              </div>
            )}
          </div>
        </section>

        <section className="glass-card p-4 md:p-5">
          <label className="mb-3 block text-sm font-semibold text-foreground">Notes</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={4}
            className="w-full rounded-[24px] border border-border/70 bg-card/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Add any extra detail here"
          />
        </section>

        <div className="flex gap-3 pb-2">
          <Link href="/dashboard/transactions" className="flex-1 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-center text-sm font-medium text-foreground">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 !justify-center !rounded-2xl !py-3 disabled:opacity-70"
          >
            {loading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" weight="bold" />}
            {loading ? 'Saving...' : 'Save transaction'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <div className="w-28 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
