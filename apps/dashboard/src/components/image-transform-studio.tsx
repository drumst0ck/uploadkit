'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Copy, ImageIcon, LoaderCircle, LockKeyhole, WandSparkles } from 'lucide-react';
import { Button } from '@uploadkitdev/ui';
import { useFiles, type FileRecord } from '../hooks/use-files';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';

interface TransformResult {
  url: string;
  expiresAt: string;
  usage: { used: number; limit: number; units: number; counted: boolean };
}

const presets = [
  { label: 'Avatar', width: 256, height: 256, fit: 'cover' as const },
  { label: 'Social', width: 1200, height: 630, fit: 'cover' as const },
  { label: 'Hero', width: 1600, height: 900, fit: 'cover' as const },
  { label: 'Thumbnail', width: 480, height: 320, fit: 'crop' as const },
];

export function ImageTransformStudio({ slug, paid }: { slug: string; paid: boolean }) {
  const { files, isLoading } = useFiles({ slug, typeFilter: 'image' });
  const [selected, setSelected] = React.useState<FileRecord | null>(null);
  const [width, setWidth] = React.useState(1200);
  const [height, setHeight] = React.useState(630);
  const [quality, setQuality] = React.useState(85);
  const [fit, setFit] = React.useState<'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'>('cover');
  const [format, setFormat] = React.useState<'auto' | 'avif' | 'webp' | 'jpeg' | 'png'>('auto');
  const [result, setResult] = React.useState<TransformResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!selected && files[0]) setSelected(files[0]);
  }, [files, selected]);

  const generate = () => {
    if (!selected || !paid) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/internal/projects/${slug}/transforms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: selected._id, width, height, fit, quality, format }),
      });
      const data = await response.json() as TransformResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Could not generate the transformation.');
        return;
      }
      setResult(data);
    });
  };

  const copyUrl = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,.6fr)]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-400">Source library</p>
              <h2 className="mt-1 text-base font-semibold">Choose an image</h2>
            </div>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {files.length} loaded
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
          )) : files.length === 0 ? (
            <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
              <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No images in this project</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload an image first, then return to the studio.</p>
              <Button asChild className="mt-5"><Link href={`/dashboard/projects/${slug}/files`}>Upload image</Link></Button>
            </div>
          ) : files.map((file) => (
            <button
              type="button"
              key={file._id}
              onClick={() => { setSelected(file); setResult(null); }}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-background text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selected?._id === file._id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-border hover:border-indigo-500/40',
              )}
            >
              {/* Images are user-provided remote URLs with arbitrary hosts, so Next Image cannot safely optimize them. */}
              <img src={file.url} alt="" className="aspect-[4/3] w-full bg-muted object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              {selected?._id === file._id ? (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-indigo-500 text-white shadow-lg"><Check className="h-3.5 w-3.5" /></span>
              ) : null}
              <span className="block min-w-0 p-3">
                <span className="block truncate text-sm font-medium">{file.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/12 text-indigo-400"><WandSparkles className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Transformation recipe</h2><p className="text-xs text-muted-foreground">Generate a signed, cacheable URL.</p></div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button key={preset.label} type="button" onClick={() => { setWidth(preset.width); setHeight(preset.height); setFit(preset.fit); }} className="rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-indigo-500/40 hover:bg-accent">
                <span className="block text-xs font-medium">{preset.label}</span>
                <span className="text-[11px] text-muted-foreground">{preset.width} × {preset.height}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Width"><input type="number" min={1} max={4096} value={width} onChange={(event) => setWidth(Number(event.target.value))} className="studio-input" /></Field>
            <Field label="Height"><input type="number" min={1} max={4096} value={height} onChange={(event) => setHeight(Number(event.target.value))} className="studio-input" /></Field>
            <Field label="Fit"><select value={fit} onChange={(event) => setFit(event.target.value as typeof fit)} className="studio-input"><option value="cover">Cover</option><option value="contain">Contain</option><option value="crop">Crop</option><option value="pad">Pad</option><option value="scale-down">Scale down</option></select></Field>
            <Field label="Format"><select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="studio-input"><option value="auto">Auto</option><option value="avif">AVIF</option><option value="webp">WebP</option><option value="jpeg">JPEG</option><option value="png">PNG</option></select></Field>
          </div>
          <label className="mt-4 block">
            <span className="mb-2 flex justify-between text-xs font-medium"><span>Quality</span><span className="font-mono text-muted-foreground">{quality}</span></span>
            <input type="range" min={1} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="w-full accent-indigo-500" />
          </label>

          {!paid ? (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
              <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><div><p className="text-sm font-medium">Available on paid plans</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Upgrade to generate production transformation URLs from the dashboard.</p></div></div>
              <Button asChild size="sm" className="mt-3 w-full"><Link href="/dashboard/billing">View plans</Link></Button>
            </div>
          ) : (
            <Button onClick={generate} disabled={!selected || pending} className="mt-5 w-full gap-2">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {pending ? 'Generating…' : 'Generate transformation'}
            </Button>
          )}
          {error ? <p role="alert" className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        {result ? (
          <section className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-card shadow-sm">
            <img src={result.url} alt={`Transformed preview of ${selected?.name ?? 'selected image'}`} className="max-h-72 w-full bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] object-contain" />
            <div className="p-4">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-400">URL ready</p><p className="text-xs text-muted-foreground">{result.usage.used.toLocaleString()} / {result.usage.limit.toLocaleString()} units this month</p></div><Button size="sm" variant="outline" onClick={copyUrl} className="gap-2">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy URL'}</Button></div>
              <code className="mt-3 block truncate rounded-lg bg-background p-3 text-[11px] text-muted-foreground">{result.url}</code>
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
