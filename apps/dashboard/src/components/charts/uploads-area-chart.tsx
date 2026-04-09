'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface UploadsDataPoint {
  date: string;
  uploads: number;
}

interface TooltipPayloadItem {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-foreground shadow-xl shadow-black/40 backdrop-blur-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-indigo-300">
        {payload[0]?.value ?? 0}{' '}
        <span className="text-muted-foreground">uploads</span>
      </p>
    </div>
  );
}

function formatXAxisDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface UploadsAreaChartProps {
  data: UploadsDataPoint[];
}

export function UploadsAreaChart({ data }: UploadsAreaChartProps) {
  const shouldShowYAxis = data.length >= 6;

  return (
    // ResponsiveContainer must always wrap Recharts components (Pitfall 4 from research)
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: shouldShowYAxis ? 0 : -40, bottom: 0 }}
      >
        <defs>
          <linearGradient id="uploadsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxisDate}
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        {shouldShowYAxis && (
          <YAxis
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="uploads"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#uploadsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
