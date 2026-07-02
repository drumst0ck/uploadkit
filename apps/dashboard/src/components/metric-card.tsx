'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/cn';
import { CountUp } from './react-bits/count-up';
import { SpotlightCard } from './react-bits/spotlight-card';

export interface MetricCardProps {
  label: string;
  /** Raw numeric value — animated via CountUp on mount */
  value: number;
  /** Optional unit suffix (e.g. "GB", "MB"). Rendered after the number, no space. */
  suffix?: string;
  /** Decimal places to show. Defaults to 0 for integers, 1 for floats. */
  decimals?: number;
  /** Separator for thousands grouping. Default "," */
  separator?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  } | undefined;
  /** Stagger delay (seconds) — enables cascading reveal when multiple cards render */
  delay?: number;
}

export function MetricCard({
  label,
  value,
  suffix = '',
  decimals,
  separator = ',',
  icon,
  trend,
  delay = 0,
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <SpotlightCard
      spotlightColor="rgba(129, 140, 248, 0.18)"
      className="rounded-2xl border border-border bg-card p-3.5 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 sm:p-5"
    >
      {/* Label + icon row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs leading-tight text-muted-foreground sm:text-sm">{label}</span>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 sm:h-8 sm:w-8">
          {icon}
        </div>
      </div>

      {/* Big animated number */}
      <p className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        <CountUp
          to={value}
          duration={1.6}
          delay={delay}
          separator={separator}
          {...(decimals !== undefined ? { decimals } : {})}
        />
        {suffix && (
          <span className="ml-1 text-sm font-medium text-muted-foreground sm:text-base">
            {suffix}
          </span>
        )}
      </p>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div
          className={cn(
            'hidden items-center gap-1 text-xs sm:flex',
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
    </SpotlightCard>
  );
}
