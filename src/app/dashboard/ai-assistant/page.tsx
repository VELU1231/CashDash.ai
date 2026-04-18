'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Loader2, CheckCircle2, XCircle, Sparkles,
  Calendar, DollarSign, MessageSquare, Trash2, Info,
  Pencil, Save, X, ChevronDown
} from 'lucide-react';
import { formatCurrency, formatDate, CURRENCIES } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIChatMessage, ParsedTransaction } from '@/types';
import { format } from 'date-fns';

const EXAMPLE_PROMPTS = [
  "Today I spent ₱150 on lunch and ₱50 on jeep fare",
  "I spent $4.50 on coffee and $12 on groceries",
  "Received ₱25,000 salary today",
  "Paid ₱2,500 electric bill",
  "Bus fare ₱25, dinner ₱320, movie ₱280",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your CashDash AI assistant. Tell me what you spent today and I'll log your transactions.\n\nTry: **\"Today I spent ₱150 on lunch and ₱50 on bus fare\"**",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('PHP');
  // Pending transactions awaiting user confirmation
  const [pendingTxs, setPendingTxs] = useState<ParsedTransaction[]>([]);
  const [pendingMsgId, setPendingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTxs]);

  // ─── Send message → Parse only (no auto-save) ──────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setPendingTxs([]);
    setPendingMsgId(null);

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, currency, parseOnly: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');

      const { parsed } = data;
      const txs: ParsedTransaction[] = parsed?.transactions || [];

      let responseContent: string;
      const msgId = crypto.randomUUID();

      if (txs.length > 0) {
        responseContent = `I found **${txs.length} transaction${txs.length > 1 ? 's' : ''}**. Review below and click **Save** when ready:`;
        setPendingTxs(txs);
        setPendingMsgId(msgId);
      } else {
        responseContent = "I couldn't find any transactions in that message. Try something like: \"I spent ₱100 on coffee\"";
      }

      const assistantMsg: AIChatMessage = {
        id: msgId,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        parsed_transactions: txs,
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (parsed?.suggestions?.length > 0) {
        toast.info(parsed.suggestions[0], { duration: 5000 });
      }
    } catch {
      const errorMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, something went wrong. Make sure the AI service is running and try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
      toast.error('AI parsing failed');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, currency]);

  // ─── Confirm & Save pending transactions ──────────────────────────────────
  const confirmAndSave = async () => {
    if (pendingTxs.length === 0 || saving) return;
    setSaving(true);

    try {
      const payload = pendingTxs.map(tx => ({
        type: tx.category_type,
        amount: (tx.amount / 100).toFixed(2), // API expects dollars, not cents
        currency: tx.currency,
        description: tx.description,
        category_name: tx.category_name,
        transaction_date: tx.transaction_date,
        confidence: tx.confidence,
      }));

      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      // Update the assistant message to show success
      setMessages(prev => prev.map(m =>
        m.id === pendingMsgId
          ? { ...m, content: `✅ Saved **${data.count} transaction${data.count !== 1 ? 's' : ''}** successfully!`, created_transactions: data.created }
          : m
      ));

      toast.success(`${data.count} transaction${data.count !== 1 ? 's' : ''} saved!`);
      setPendingTxs([]);
      setPendingMsgId(null);
    } catch {
      toast.error('Failed to save transactions');
    } finally {
      setSaving(false);
    }
  };

  // ─── Discard pending ──────────────────────────────────────────────────────
  const discardPending = () => {
    setPendingTxs([]);
    setPendingMsgId(null);
    setMessages(prev => prev.map(m =>
      m.id === pendingMsgId
        ? { ...m, content: 'Transactions discarded. Tell me what else you spent!' }
        : m
    ));
  };

  // ─── Edit a pending transaction ───────────────────────────────────────────
  const updatePendingTx = (index: number, field: keyof ParsedTransaction, value: string | number) => {
    setPendingTxs(prev => prev.map((tx, i) => {
      if (i !== index) return tx;
      if (field === 'amount') return { ...tx, amount: Math.round(parseFloat(String(value)) * 100) };
      return { ...tx, [field]: value };
    }));
  };

  const removePendingTx = (index: number) => {
    setPendingTxs(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setPendingTxs([]);
    setPendingMsgId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared! Tell me what you spent and I'll log it for you.",
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Tell me what you spent · review before saving</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <motion.button
            onClick={clearChat}
            className="p-2 rounded-lg border border-input hover:bg-muted transition-colors text-muted-foreground"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Info banner */}
      <motion.div
        className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4 flex items-start gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>How it works:</strong> Describe your spending naturally → AI parses amounts, categories & dates → <strong>you review & confirm</strong> → saved to your account.
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Brain className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">CashDash AI</span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </span>
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {line.split(/\*\*(.+?)\*\*/).map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>

                {/* Show saved transactions summary */}
                {msg.created_transactions && msg.created_transactions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.created_transactions.map((tx: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate flex-1">{tx.description}</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(tx.amount, tx.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-muted-foreground/50">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analyzing your spending...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Pending Transactions Confirmation Panel ─── */}
      <AnimatePresence>
        {pendingTxs.length > 0 && (
          <motion.div
            className="mb-3 rounded-2xl border border-primary/20 bg-card shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Review & Confirm ({pendingTxs.length})</span>
              </div>
              <button onClick={discardPending} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Discard all
              </button>
            </div>

            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {pendingTxs.map((tx, i) => (
                <EditableTransactionRow
                  key={i}
                  tx={tx}
                  index={i}
                  onUpdate={updatePendingTx}
                  onRemove={removePendingTx}
                />
              ))}
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Total: <strong className="text-foreground">
                  {formatCurrency(pendingTxs.reduce((s, t) => s + t.amount, 0), pendingTxs[0]?.currency || currency)}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={discardPending}
                  className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <motion.button
                  onClick={confirmAndSave}
                  disabled={saving || pendingTxs.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : `Save ${pendingTxs.length} transaction${pendingTxs.length > 1 ? 's' : ''}`}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example prompts */}
      {messages.length <= 2 && pendingTxs.length === 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-input bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        <div className="flex items-end gap-2 p-3 rounded-2xl border border-input bg-background shadow-soft focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you spent... (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground max-h-32 scrollbar-thin"
            rows={1}
            disabled={loading || saving}
          />
          <motion.button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || saving}
            className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          AI may make mistakes. Always review parsed transactions before saving.
        </p>
      </div>
    </div>
  );
}

// ─── Editable Transaction Row ────────────────────────────────────────────────

function EditableTransactionRow({
  tx,
  index,
  onUpdate,
  onRemove,
}: {
  tx: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: keyof ParsedTransaction, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Type badge */}
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
        tx.category_type === 'income'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {tx.category_type === 'income' ? 'IN' : 'OUT'}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={tx.description}
            onChange={e => onUpdate(index, 'description', e.target.value)}
            className="w-full px-2 py-1 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{tx.description}</span>
            <span className="text-xs text-muted-foreground">→ {tx.category_name}</span>
          </div>
        )}
      </div>

      {/* Amount */}
      {editing ? (
        <input
          type="number"
          step="0.01"
          value={(tx.amount / 100).toFixed(2)}
          onChange={e => onUpdate(index, 'amount', parseFloat(e.target.value) || 0)}
          className="w-20 px-2 py-1 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <span className={`text-sm font-semibold shrink-0 ${
          tx.category_type === 'income' ? 'text-emerald-600' : 'text-red-500'
        }`}>
          {tx.category_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
        </span>
      )}

      {/* Date */}
      <span className="text-[10px] text-muted-foreground shrink-0">
        {formatDate(tx.transaction_date, 'MMM d')}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setEditing(!editing)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={editing ? 'Done editing' : 'Edit'}
        >
          {editing ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onRemove(index)}
          className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
