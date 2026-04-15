<script lang="ts">
  type Status = 'idle' | 'uploading' | 'done' | 'error';

  let status = $state<Status>('idle');
  let file = $state<File | null>(null);
  let errorMessage = $state<string | null>(null);
  let uploadedKey = $state<string | null>(null);

  function pickFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    status = 'idle';
    errorMessage = null;
    uploadedKey = null;
  }

  async function upload() {
    if (!file) return;
    status = 'uploading';
    errorMessage = null;

    try {
      const signResponse = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      });
      const sign = (await signResponse.json()) as
        | { url: string; key: string; method: 'PUT' }
        | { error: string };

      if ('error' in sign) {
        throw new Error(sign.error);
      }

      const put = await fetch(sign.url, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status} ${put.statusText}`);
      uploadedKey = sign.key;
      status = 'done';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      status = 'error';
    }
  }
</script>

<svelte:head>
  <title>UploadKit — SvelteKit demo</title>
</svelte:head>

<main>
  <h1>UploadKit — SvelteKit</h1>
  <p>
    Pick a file and it will be uploaded directly to your storage bucket using a
    presigned PUT URL issued by <code>/api/sign</code>.
  </p>

  <label class="picker">
    <input type="file" onchange={pickFile} />
    <span>{file ? file.name : 'Choose a file…'}</span>
  </label>

  <button type="button" onclick={upload} disabled={!file || status === 'uploading'}>
    {status === 'uploading' ? 'Uploading…' : 'Upload'}
  </button>

  <p class="status" data-status={status}>
    Status: <strong>{status}</strong>
    {#if uploadedKey}
      <br />Key: <code>{uploadedKey}</code>
    {/if}
    {#if errorMessage}
      <br /><span class="error">{errorMessage}</span>
    {/if}
  </p>
</main>

<style>
  main {
    max-width: 42rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family:
      ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #fafafa;
  }
  :global(body) {
    background: #0a0a0b;
    margin: 0;
  }
  h1 {
    font-size: 2rem;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
  }
  p {
    color: #a1a1aa;
    line-height: 1.6;
  }
  .picker {
    display: block;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    margin: 1.5rem 0;
    transition: border-color 200ms ease-out, background-color 200ms ease-out;
  }
  .picker:hover {
    border-color: rgba(129, 140, 248, 0.6);
    background-color: rgba(99, 102, 241, 0.05);
  }
  .picker input[type='file'] {
    display: none;
  }
  .picker span {
    color: #fafafa;
  }
  button {
    background: #6366f1;
    color: #fafafa;
    border: 0;
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 200ms ease-out;
  }
  button:hover:not(:disabled) {
    background: #818cf8;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .status {
    margin-top: 1.5rem;
    font-size: 0.9rem;
  }
  .error {
    color: #f87171;
  }
  code {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85em;
  }
</style>
