'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Loader2, CheckCircle2, XCircle, RefreshCw,
  Sparkles, ArrowLeftRight, Tag, Calendar, DollarSign,
  MessageSquare, Trash2, Copy, Info
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
  "Change coffee to ₱80",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your CashDash AI assistant. Tell me what you spent today and I'll automatically log your transactions.\n\nTry: **\"Today I spent ₱150 on lunch and ₱50 on bus fare\"**",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('PHP');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, currency }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to parse');

      const { parsed, created, error: parseError } = data;

      let responseContent = '';
      if (parseError) {
        responseContent = `I couldn't parse that. Try: "I spent ₱150 on coffee and ₱50 on bus"`;
      } else if (created?.length > 0) {
        responseContent = `✅ I logged **${created.length} transaction${created.length > 1 ? 's' : ''}** for you!`;
        if (parsed?.suggestions?.length > 0) {
          responseContent += `\n\n💡 ${parsed.suggestions[0]}`;
        }
      } else if (parsed?.transactions?.length > 0) {
        responseContent = `I found ${parsed.transactions.length} transaction(s) but couldn't save them. Please check your accounts are set up.`;
      } else {
        responseContent = "I couldn't find any transactions in that message. Try something like: \"I spent ₱100 on coffee\"";
      }

      const assistantMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        parsed_transactions: parsed?.transactions || [],
        created_transactions: created || [],
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (created?.length > 0) {
        toast.success(`${created.length} transaction${created.length > 1 ? 's' : ''} logged!`);
      }
    } catch (err) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
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
            <p className="text-xs text-muted-foreground">Powered by Ollama · Tell me what you spent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency selector */}
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
          <strong>How it works:</strong> Just describe your spending naturally. The AI extracts amounts, categories, and dates — then saves everything automatically. Works in any language or currency!
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
                  {/* Render markdown-like bold */}
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {line.split(/\*\*(.+?)\*\*/).map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>

                {/* Parsed transactions preview */}
                {msg.parsed_transactions && msg.parsed_transactions.length > 0 && (
                  <motion.div
                    className="mt-2 space-y-1.5"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {msg.parsed_transactions.map((tx, i) => (
                      <ParsedTransactionCard key={i} tx={tx} saved={!!msg.created_transactions?.length} />
                    ))}
                  </motion.div>
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
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analyzing...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 2 && (
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
            disabled={loading}
          />
          <motion.button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          AI may make mistakes. Review transactions before using for accounting.
        </p>
      </div>
    </div>
  );
}

function ParsedTransactionCard({ tx, saved }: { tx: ParsedTransaction; saved: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-card text-xs"
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {saved
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          : <XCircle className="w-3.5 h-3.5 text-yellow-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium">{tx.description}</span>
        <span className="text-muted-foreground ml-1.5">→ {tx.category_name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-semibold ${tx.category_type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
          {tx.category_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
        </span>
        <span className="text-muted-foreground">{formatDate(tx.transaction_date, 'MMM d')}</span>
      </div>
    </motion.div>
  );
}
