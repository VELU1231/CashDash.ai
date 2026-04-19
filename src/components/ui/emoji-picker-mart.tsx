'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smiley } from '@phosphor-icons/react';

// Dynamic import to avoid SSR issues with emoji-mart
import dynamic from 'next/dynamic';

const EmojiPickerNoSSR = dynamic(
  () => import('@emoji-mart/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="w-[352px] h-[435px] flex items-center justify-center"><span className="text-xs text-muted-foreground">Loading emojis...</span></div> }
);

// We import data statically since it's JSON
import data from '@emoji-mart/data';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  /** Label shown above the button */
  label?: string;
  /** Size of the preview emoji */
  size?: 'sm' | 'md' | 'lg';
}

export function EmojiPicker({ value, onChange, label, size = 'md' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const sizeClass = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  }[size];

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium mb-1 block">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${sizeClass} rounded-xl border border-input bg-background hover:bg-muted/50 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20`}
        title="Choose emoji"
      >
        {value || <Smiley className="w-5 h-5 text-muted-foreground" weight="light" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute z-50 mt-2"
            style={{ left: 0, top: '100%' }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
              <EmojiPickerNoSSR
                data={data}
                onEmojiSelect={(emoji: any) => {
                  onChange(emoji.native);
                  setOpen(false);
                }}
                theme="auto"
                previewPosition="none"
                skinTonePosition="search"
                maxFrequentRows={2}
                navPosition="bottom"
                perLine={9}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline Emoji Button (for forms) ──────────────────────────────────────────

interface InlineEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function InlineEmojiPicker({ value, onChange, className }: InlineEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className={`relative inline-block ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Add emoji"
      >
        {value ? (
          <span className="text-lg">{value}</span>
        ) : (
          <Smiley className="w-5 h-5" weight="light" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute z-50 mt-1"
            style={{ right: 0, top: '100%' }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
              <EmojiPickerNoSSR
                data={data}
                onEmojiSelect={(emoji: any) => {
                  onChange(emoji.native);
                  setOpen(false);
                }}
                theme="auto"
                previewPosition="none"
                skinTonePosition="search"
                maxFrequentRows={1}
                navPosition="bottom"
                perLine={8}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
