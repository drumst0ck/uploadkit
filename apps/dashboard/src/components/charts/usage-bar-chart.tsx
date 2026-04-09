'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatBytes } from '../../lib/format';

export interface UsageBarDataPoint {
  period: string;  // "YYYY-MM"
  storageUsed: number;
  bandwidth: number;
  uploads: number;
}

interface TooltipPayloadItem {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-card px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1.5 font-medium text-zinc-300">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="flex justify-between gap-4">
          <span className="text-zinc-500">{item.name}</span>
          <span>
            {item.name === 'Uploads'
              ? item.value.toLocaleString()
              : formatBytes(item.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface UsageBarChartProps {
  data: UsageBarDataPoint[];
}

export function UsageBarChart({ data }: UsageBarChartProps) {
  // Sort oldest-first for left-to-right chronological display
  const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sorted}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tickFormatter={formatPeriodLabel}
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          yAxisId="bytes"
          tickFormatter={(v: number) => formatBytes(v, 0)}
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tickFormatter={(v: number) => v.toLocaleString()}
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#a1a1aa', fontSize: 11 }}>{value}</span>
          )}
        />
        <Bar
          yAxisId="bytes"
          dataKey="storageUsed"
          name="Storage"
          fill="#6366f1"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          yAxisId="bytes"
          dataKey="bandwidth"
          name="Bandwidth"
          fill="#8b5cf6"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          yAxisId="count"
          dataKey="uploads"
          name="Uploads"
          fill="#10b981"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
