import React, { useState } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { MagnifyingGlass, CaretDown, Check } from '@phosphor-icons/react';

const COMMON_ICONS = [
  'Wallet', 'CreditCard', 'CurrencyDollar', 'PiggyBank', 'Bank', 'Receipt', 
  'ShoppingCart', 'House', 'Car', 'Lightning', 'Drop', 'WifiHigh',
  'AirplaneTilt', 'ForkKnife', 'Coffee', 'TShirt', 'Heartbeat', 'Pill',
  'GraduationCap', 'Book', 'GameController', 'Ticket', 'MusicNotes', 'Popcorn',
  'Briefcase', 'ChalkboardTeacher', 'Desktop', 'DeviceMobile', 'Wrench',
  'Tag', 'FolderOpen', 'Star', 'Crown', 'Target', 'TrendUp', 'TrendDown'
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = COMMON_ICONS.filter(name => 
    name.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = (PhosphorIcons as any)[value] || null;

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-2">
          {CurrentIcon ? <CurrentIcon className="w-4 h-4" /> : <span>{value || 'Select Icon'}</span>}
          <span className="text-muted-foreground truncate max-w-[120px]">{CurrentIcon ? value : 'Select Icon'}</span>
        </div>
        <CaretDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-xl p-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-input mb-3 bg-background">
            <MagnifyingGlass className="w-3.5 h-3.5 text-muted-foreground" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons..."
              className="flex-1 bg-transparent text-xs focus:outline-none"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto no-scrollbar pb-1">
            {filteredIcons.map(iconName => {
              const IconComp = (PhosphorIcons as any)[iconName];
              if (!IconComp) return null;
              const isSelected = value === iconName;
              
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => { onChange(iconName); setOpen(false); }}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-all
                    ${isSelected ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted text-foreground'}`}
                  title={iconName}
                >
                  <IconComp className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          
          {filteredIcons.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-4">No icons found</p>
          )}
        </div>
      )}
      
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

export function IconDisplay({ name, className }: { name: string; className?: string }) {
  // If it's a Phosphor icon name, render it
  const IconComp = (PhosphorIcons as any)[name];
  if (IconComp) {
    return <IconComp className={className} />;
  }
  // Otherwise, it's legacy emoji data
  return <span className={className}>{name}</span>;
}
