'use client';

import '@uploadkit/react/styles.css';
import * as React from 'react';
import {
  UploadKitProvider,
  UploadButton,
  UploadDropzone,
  UploadModal,
} from '@uploadkit/react';
import type { UploadResult } from '@uploadkit/core';

const API_KEY = 'uk_live_WttgyjwOh-KsZOevVoi80VPpP21zKgl8';
const BASE_URL = 'http://localhost:3002';

export default function PlaygroundPage() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [results, setResults] = React.useState<UploadResult[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleComplete = (result: UploadResult | UploadResult[]) => {
    const items = Array.isArray(result) ? result : [result];
    setResults((prev) => [...prev, ...items]);
  };

  const handleError = (error: Error) => {
    setErrors((prev) => [...prev, error.message]);
  };

  return (
    <UploadKitProvider apiKey={API_KEY} baseUrl={BASE_URL}>
      <div className="space-y-12">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Component Playground</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Test all upload components against the live API.
          </p>
          <code className="mt-2 inline-block rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground">
            API Key: {API_KEY.slice(0, 20)}...
          </code>
        </div>

        {/* UploadButton */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">UploadButton</h2>
            <p className="text-sm text-muted-foreground">Single file upload with a button click.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Default</p>
              <UploadButton
                route="default"
                onUploadComplete={handleComplete}
                onUploadError={handleError}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Outline</p>
              <UploadButton
                route="default"
                variant="outline"
                onUploadComplete={handleComplete}
                onUploadError={handleError}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ghost</p>
              <UploadButton
                route="default"
                variant="ghost"
                onUploadComplete={handleComplete}
                onUploadError={handleError}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Small</p>
              <UploadButton
                route="default"
                size="sm"
                onUploadComplete={handleComplete}
                onUploadError={handleError}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Large</p>
              <UploadButton
                route="default"
                size="lg"
                onUploadComplete={handleComplete}
                onUploadError={handleError}
              />
            </div>
          </div>
        </section>

        {/* UploadDropzone */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">UploadDropzone</h2>
            <p className="text-sm text-muted-foreground">Drag and drop area with multi-file support.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Default (any file, max 3)</p>
              <UploadDropzone
                route="default"
                maxFiles={3}
                onUploadComplete={(r) => setResults((prev) => [...prev, ...r])}
                onUploadError={handleError}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Images only (max 5MB)</p>
              <UploadDropzone
                route="default"
                accept={['image/jpeg', 'image/png', 'image/webp']}
                maxSize={5 * 1024 * 1024}
                maxFiles={5}
                onUploadComplete={(r) => setResults((prev) => [...prev, ...r])}
                onUploadError={handleError}
              />
            </div>
          </div>
        </section>

        {/* UploadModal */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">UploadModal</h2>
            <p className="text-sm text-muted-foreground">Full-screen modal with dropzone inside.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:bg-indigo-700"
          >
            Open Upload Modal
          </button>
          <UploadModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            route="default"
            maxFiles={10}
            onUploadComplete={(r) => {
              setResults((prev) => [...prev, ...r]);
              setModalOpen(false);
            }}
            onUploadError={handleError}
          />
        </section>

        {/* Results log */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Upload Results</h2>
          {results.length === 0 && errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet. Try one of the components above.</p>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={`${r.key}-${i}`}
                  className="rounded-lg border border-border bg-card p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                      Uploaded
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Key: <code className="font-mono">{r.key}</code></div>
                    <div>Size: {(r.size / 1024).toFixed(1)} KB</div>
                    <div>Type: {r.type}</div>
                    <div>
                      URL: <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {errors.map((err, i) => (
                <div
                  key={`err-${i}`}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400"
                >
                  Error: {err}
                </div>
              ))}
            </div>
          )}

          {(results.length > 0 || errors.length > 0) && (
            <button
              type="button"
              onClick={() => { setResults([]); setErrors([]); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear log
            </button>
          )}
        </section>
      </div>
    </UploadKitProvider>
  );
}
