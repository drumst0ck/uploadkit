'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Code2,
  History,
  ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Search,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@uploadkitdev/ui';
import { useFiles, type FileRecord } from '../hooks/use-files';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';

interface TransformResult {
  url: string;
  expiresAt: string | null;
  delivery: 'signed' | 'public';
  transform: {
    width?: number;
    height?: number;
    fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
    quality: number;
    format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
  };
  usage: { used: number; limit: number; units: number; counted: boolean };
}

interface TransformHistoryItem {
  id: string;
  fileName: string;
  units: number;
  createdAt: string;
}

interface ImageTransformStudioProps {
  slug: string;
  paid: boolean;
  initialFile: FileRecord | null;
  initialUsage: { used: number; limit: number };
  initialHistory: TransformHistoryItem[];
}

const presets = [
  { label: 'Avatar', width: 256, height: 256, fit: 'cover' as const },
  { label: 'Social', width: 1200, height: 630, fit: 'cover' as const },
  { label: 'Hero', width: 1600, height: 900, fit: 'cover' as const },
  { label: 'Thumbnail', width: 480, height: 320, fit: 'crop' as const },
];

export function ImageTransformStudio({
  slug,
  paid,
  initialFile,
  initialUsage,
  initialHistory,
}: ImageTransformStudioProps) {
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1] ?? '';
  const { files, isLoading, nextCursor, hasMore, totalCount } = useFiles({
    slug,
    typeFilter: 'image',
    search: deferredSearch,
    cursor: currentCursor,
  });
  const visibleFiles = initialFile
    && !files.some((file) => file._id === initialFile._id)
    && !deferredSearch
    ? [initialFile, ...files]
    : files;

  const [selected, setSelected] = React.useState<FileRecord | null>(initialFile);
  const [width, setWidth] = React.useState<number | ''>(1200);
  const [height, setHeight] = React.useState<number | ''>(630);
  const [quality, setQuality] = React.useState(85);
  const [fit, setFit] = React.useState<'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'>('cover');
  const [format, setFormat] = React.useState<'auto' | 'avif' | 'webp' | 'jpeg' | 'png'>('auto');
  const [delivery, setDelivery] = React.useState<'signed' | 'public'>('public');
  const [result, setResult] = React.useState<TransformResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState<'url' | 'html' | null>(null);
  const [displayWidth, setDisplayWidth] = React.useState<number | ''>(1200);
  const [displayHeight, setDisplayHeight] = React.useState<number | ''>(630);
  const [altText, setAltText] = React.useState(initialFile ? defaultAlt(initialFile.name) : '');
  const [usage, setUsage] = React.useState(initialUsage);
  const [history, setHistory] = React.useState(initialHistory);

  React.useEffect(() => {
    if (!selected && visibleFiles[0]) {
      setSelected(visibleFiles[0]);
      setAltText(defaultAlt(visibleFiles[0].name));
    }
  }, [selected, visibleFiles]);

  const generate = () => {
    if (!selected || !paid || (width === '' && height === '')) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/internal/projects/${slug}/transforms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: selected._id,
            ...(width === '' ? {} : { width }),
            ...(height === '' ? {} : { height }),
            fit,
            quality,
            format,
            delivery,
          }),
        });
        const data = await response.json() as TransformResult & { error?: string };
        if (!response.ok) {
          setError(data.error ?? 'Could not generate the transformation.');
          return;
        }
        setResult(data);
        setDisplayWidth(data.transform.width ?? '');
        setDisplayHeight(data.transform.height ?? '');
        setUsage({ used: data.usage.used, limit: data.usage.limit });
        if (data.usage.counted) {
          setHistory((current) => [{
            id: `${selected._id}-${Date.now()}`,
            fileName: selected.name,
            units: data.usage.units,
            createdAt: new Date().toISOString(),
          }, ...current].slice(0, 6));
        }
      } catch {
        setError('The transformation service could not be reached. Try again.');
      }
    });
  };

  const copyText = async (value: string, kind: 'url' | 'html') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError('Your browser could not copy to the clipboard.');
    }
  };

  const htmlSnippet = result
    ? buildImageHtml({
        url: result.url,
        alt: altText,
        width: displayWidth,
        height: displayHeight,
      })
    : '';

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,.6fr)]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-400">Source library</p>
                <h2 className="mt-1 text-base font-semibold">Choose an image</h2>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {totalCount.toLocaleString()} image{totalCount === 1 ? '' : 's'}
              </span>
            </div>
            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCursorStack([]); }} placeholder="Search images…" className="studio-input pl-9" aria-label="Search source images" />
            </label>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            {isLoading ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            )) : visibleFiles.length === 0 ? (
              <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
                <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">{search ? 'No images match your search' : 'No images in this project'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{search ? 'Try a different name.' : 'Upload an image first, then return to the studio.'}</p>
                {!search ? <Button asChild className="mt-5"><Link href={`/dashboard/projects/${slug}/files`}>Upload image</Link></Button> : null}
              </div>
            ) : visibleFiles.map((file) => (
              <button
                type="button"
                key={file._id}
                onClick={() => { setSelected(file); setResult(null); setError(null); setAltText(defaultAlt(file.name)); }}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-background text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  selected?._id === file._id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-border hover:border-indigo-500/40',
                )}
              >
                <img src={file.url} alt="" className="aspect-[4/3] w-full bg-muted object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                {selected?._id === file._id ? <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-indigo-500 text-white shadow-lg"><Check className="h-3.5 w-3.5" /></span> : null}
                <span className="block min-w-0 p-3"><span className="block truncate text-sm font-medium">{file.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatBytes(file.size)}</span></span>
              </button>
            ))}
          </div>

          {visibleFiles.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>Page {cursorStack.length + 1}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={cursorStack.length === 0 || isLoading} onClick={() => setCursorStack((current) => current.slice(0, -1))} aria-label="Previous images"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasMore || !nextCursor || isLoading} onClick={() => nextCursor && setCursorStack((current) => [...current, nextCursor])} aria-label="Next images"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-indigo-400" /><h2 className="text-sm font-semibold">Recent transformations</h2></div>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Your generated variants will appear here.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{item.fileName}</p><time dateTime={item.createdAt} suppressHydrationWarning className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div>
                  <span className="shrink-0 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-400">{item.units} unit{item.units === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/12 text-indigo-400"><WandSparkles className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Transformation recipe</h2><p className="text-xs text-muted-foreground">Generate a signed, cacheable URL.</p></div>
          </div>

          <div className="mb-5 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between text-xs"><span className="font-medium">Monthly usage</span><span className="font-mono text-muted-foreground">{usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${Math.min(100, usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0)}%` }} /></div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button key={preset.label} type="button" onClick={() => { setWidth(preset.width); setHeight(preset.height); setFit(preset.fit); }} className="rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-indigo-500/40 hover:bg-accent">
                <span className="block text-xs font-medium">{preset.label}</span><span className="text-[11px] text-muted-foreground">{preset.width} × {preset.height}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Width"><input type="number" min={1} max={4096} value={width} placeholder="Auto" onChange={(event) => setWidth(event.target.value === '' ? '' : Number(event.target.value))} className="studio-input" /></Field>
            <Field label="Height"><input type="number" min={1} max={4096} value={height} placeholder="Auto" onChange={(event) => setHeight(event.target.value === '' ? '' : Number(event.target.value))} className="studio-input" /></Field>
            <Field label="Fit"><select value={fit} onChange={(event) => setFit(event.target.value as typeof fit)} className="studio-input"><option value="cover">Cover</option><option value="contain">Contain</option><option value="crop">Crop</option><option value="pad">Pad</option><option value="scale-down">Scale down</option></select></Field>
            <Field label="Format"><select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="studio-input"><option value="auto">Auto</option><option value="avif">AVIF</option><option value="webp">WebP</option><option value="jpeg">JPEG</option><option value="png">PNG</option></select></Field>
            <div className="col-span-2"><Field label="Delivery"><select value={delivery} onChange={(event) => setDelivery(event.target.value as typeof delivery)} className="studio-input"><option value="public">Public · stable URL</option><option value="signed">Signed · expires</option></select></Field></div>
          </div>
          <label className="mt-4 block"><span className="mb-2 flex justify-between text-xs font-medium"><span>Quality</span><span className="font-mono text-muted-foreground">{quality}</span></span><input type="range" min={1} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="w-full accent-indigo-500" /></label>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">This recipe uses <strong className="text-foreground">{format === 'auto' ? 3 : 1} unit{format === 'auto' ? 's' : ''}</strong>. {delivery === 'public' ? 'Public URLs stay stable for production embeds.' : 'Signed URLs expire and must be refreshed by your backend.'}</p>

          {!paid ? (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><div><p className="text-sm font-medium">Available on paid plans</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Upgrade to generate production transformation URLs from the dashboard.</p></div></div><Button asChild size="sm" className="mt-3 w-full"><Link href="/dashboard/billing">View plans</Link></Button></div>
          ) : (
            <Button onClick={generate} disabled={!selected || pending || (width === '' && height === '')} className="mt-5 w-full gap-2">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{pending ? 'Generating…' : 'Generate transformation'}</Button>
          )}
          {error ? <p role="alert" className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        {result ? (
          <section className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-card shadow-sm">
            <img src={result.url} alt={`Transformed preview of ${selected?.name ?? 'selected image'}`} className="max-h-72 w-full bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] object-contain" />
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-semibold text-emerald-400">{result.delivery === 'public' ? 'Stable URL ready' : 'Signed URL ready'}</p><p className="text-xs text-muted-foreground">{result.usage.used.toLocaleString()} / {result.usage.limit.toLocaleString()} units this month</p></div>
                <Button size="sm" variant="outline" onClick={() => void copyText(result.url, 'url')} className="gap-2">{copied === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === 'url' ? 'Copied' : 'Copy URL'}</Button>
              </div>
              <code className="block truncate rounded-lg bg-background p-3 text-[11px] text-muted-foreground">{result.url}</code>

              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2"><Code2 className="h-4 w-4 text-indigo-400" /><div><h3 className="text-sm font-semibold">HTML embed</h3><p className="text-[11px] text-muted-foreground">Choose how large the image should appear in your layout.</p></div></div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Display width"><input type="number" min={1} value={displayWidth} placeholder="Auto" onChange={(event) => setDisplayWidth(event.target.value === '' ? '' : Number(event.target.value))} className="studio-input" /></Field>
                  <Field label="Display height"><input type="number" min={1} value={displayHeight} placeholder="Auto" onChange={(event) => setDisplayHeight(event.target.value === '' ? '' : Number(event.target.value))} className="studio-input" /></Field>
                  <div className="col-span-2"><Field label="Alt text"><input type="text" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image" className="studio-input" /></Field></div>
                </div>
                <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-muted-foreground"><code>{htmlSnippet}</code></pre>
                {result.delivery === 'signed' ? <p className="mt-2 text-[11px] leading-relaxed text-amber-400">Generate with Public delivery before embedding permanently. This signed URL expires.</p> : null}
                <Button onClick={() => void copyText(htmlSnippet, 'html')} disabled={result.delivery !== 'public'} className="mt-3 w-full gap-2"><Code2 className="h-4 w-4" />{copied === 'html' ? 'HTML copied' : 'Copy HTML element'}</Button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground" aria-live="polite">{copied === 'html' ? 'Ready to paste into your project.' : 'Includes lazy loading, async decoding, alt text and responsive sizing.'}</p>
              </div>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

export function buildImageHtml(input: {
  url: string;
  alt: string;
  width: number | '';
  height: number | '';
}) {
  const dimensions = [
    validDisplayDimension(input.width) ? `  width="${input.width}"` : null,
    validDisplayDimension(input.height) ? `  height="${input.height}"` : null,
  ].filter((value): value is string => value !== null);
  return [
    '<img',
    `  src="${escapeHtmlAttribute(input.url)}"`,
    `  alt="${escapeHtmlAttribute(input.alt)}"`,
    ...dimensions,
    '  loading="lazy"',
    '  decoding="async"',
    '  style="max-width: 100%; height: auto;"',
    '/>',
  ].join('\n');
}

function validDisplayDimension(value: number | ''): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function defaultAlt(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replaceAll(/[-_]+/g, ' ');
}
