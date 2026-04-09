import * as React from 'react';

interface UsageProgressBarProps {
  label: string;
  used: number;
  limit: number;
  formatFn: (value: number) => string;
}

export function UsageProgressBar({ label, used, limit, formatFn }: UsageProgressBarProps) {
  // DASH-08: handle Infinity for Enterprise tier
  const percentage =
    limit === Infinity || limit === 0 ? 0 : Math.min(100, (used / limit) * 100);

  // Color changes at thresholds: >95% red, >80% amber, otherwise indigo
  let barColor = 'bg-indigo-500';
  if (percentage > 95) barColor = 'bg-red-500';
  else if (percentage > 80) barColor = 'bg-amber-500';

  const usedStr = formatFn(used);
  const limitStr = limit === Infinity ? '∞' : formatFn(limit);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {usedStr} / {limitStr}
        </span>
      </div>

      {/* Track */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${usedStr} of ${limitStr} used`}
        />
      </div>

      {limit !== Infinity && (
        <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}% used</span>
      )}
    </div>
  );
}
