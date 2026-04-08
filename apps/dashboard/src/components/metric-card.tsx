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
    <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-5 transition-colors hover:border-white/[0.10]">
      {/* Label + icon row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">{label}</span>
        <span className="text-zinc-600">{icon}</span>
      </div>

      {/* Big number */}
      <p className="text-2xl font-semibold text-white tracking-tight mb-1">
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
