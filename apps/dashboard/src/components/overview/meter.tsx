import { formatBytes, formatNumber } from '../../lib/format';

export type MeterKind = 'bytes' | 'count';

export function formatMeter(kind: MeterKind, value: number): string {
  return kind === 'bytes' ? formatBytes(value) : formatNumber(value);
}

/** Share of a limit, 0-100. Unlimited (Infinity) and zero limits have no share. */
export function share(used: number, limit: number): number | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return Math.min(100, (used / limit) * 100);
}

function pctLabel(pct: number): string {
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}

/** Word that backs the bar so status is never colour or length alone. */
function limitWord(pct: number | null): string | null {
  if (pct === null) return null;
  if (pct >= 100) return 'At limit';
  if (pct >= 80) return 'Near limit';
  return null;
}

/**
 * Account-level meter row: label, bar, "used of limit", percent.
 * The bar is `role="meter"` with a text value; the numbers are always visible.
 */
export function MeterRow({
  label,
  scope,
  used,
  limit,
  kind,
}: {
  label: string;
  scope: string;
  used: number;
  limit: number;
  kind: MeterKind;
}) {
  const pct = share(used, limit);
  const usedText = formatMeter(kind, used);
  const limitText = Number.isFinite(limit) ? formatMeter(kind, limit) : null;
  const text = limitText ? `${usedText} of ${limitText}` : `${usedText}, no limit on this plan`;
  const word = limitWord(pct);

  return (
    <li className="rounded-md bg-card px-4 py-3.5 md:grid md:min-h-[52px] md:grid-cols-[96px_minmax(0,1fr)_170px_72px] md:items-center md:gap-5">
      <span className="text-sm">{label}</span>
      {pct === null ? (
        <span className="hidden md:block" aria-hidden="true" />
      ) : (
        <div
          className="my-2 h-1.5 overflow-hidden rounded-full bg-secondary md:my-0"
          role="meter"
          aria-label={`${label}, ${scope}`}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          aria-valuetext={text}
        >
          <i className="block h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className="block font-mono text-sm tabular-nums md:text-right">{text}</span>
      <span className="block text-sm tabular-nums text-muted-foreground md:text-right">
        {pct === null ? 'Unlimited' : word ?? pctLabel(pct)}
        {pct !== null && word ? ` · ${pctLabel(pct)}` : null}
      </span>
    </li>
  );
}

/** Compact per-project line: label, thin bar, value. Bar = share of the plan limit. */
export function MiniLine({
  project,
  label,
  used,
  limit,
  kind,
}: {
  project: string;
  label: string;
  used: number;
  limit: number;
  kind: MeterKind;
}) {
  const pct = share(used, limit);
  const value = formatMeter(kind, used);
  const valueText = pct === null ? value : `${value}, ${pctLabel(pct)} of the plan limit`;

  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)_72px] items-center gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {pct === null ? (
        <span aria-hidden="true" />
      ) : (
        <div
          className="h-1 overflow-hidden rounded-full bg-secondary"
          role="meter"
          aria-label={`${project} ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={valueText}
        >
          <i className="block h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className="text-right font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}
