import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/cn';

export interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  } | undefined;
}

export function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/20 transition-all duration-200 hover:border-border hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5">
      {/* Label + icon row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">{icon}</div>
      </div>

      {/* Big number */}
      <p className="text-2xl font-semibold text-foreground tracking-tight mb-1">
        {value}
      </p>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
