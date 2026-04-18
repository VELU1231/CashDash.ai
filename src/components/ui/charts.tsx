import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Shared Custom Tooltip for Recharts ────────────────────────────────────────

export function ChartTooltip({
  active,
  payload,
  label,
  currency = 'USD',
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty Chart Placeholder ────────────────────────────────────────────────────

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Shimmer Skeleton for charts ────────────────────────────────────────────────

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded shimmer-bg" />
          <div className="h-3 w-20 rounded shimmer-bg" />
        </div>
      </div>
      <div className="shimmer-bg rounded-lg" style={{ height }} />
    </div>
  );
}

// ─── Stat Card Skeleton ─────────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg shimmer-bg" />
        <div className="h-4 w-12 rounded shimmer-bg" />
      </div>
      <div className="h-7 w-28 rounded shimmer-bg mb-2" />
      <div className="h-3 w-20 rounded shimmer-bg" />
    </div>
  );
}
