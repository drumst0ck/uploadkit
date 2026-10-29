export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Split bytes into { value, unit } for animated counters. */
export function splitBytes(bytes: number, decimals = 1): { value: number; unit: string } {
  if (bytes === 0) return { value: 0, unit: 'B' };
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return { value, unit: sizes[i] ?? 'B' };
}

/** "2 min ago", "3 hr ago", "4 days ago"; falls back to a short date after 30 days. */
export function formatRelative(date: string | Date | null | undefined, now: Date = new Date()): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const seconds = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}
