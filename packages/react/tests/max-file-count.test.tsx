import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UploadKitProvider } from '../src/context';
import { useUploadKit } from '../src/use-upload-kit';
import { UploadDropzone } from '../src/components/upload-dropzone';
import { UploadDropzoneGlass } from '../src/components/upload-dropzone-glass';

const mockClient = {
  upload: vi.fn(),
  getRouteConfig: vi.fn(),
};
vi.mock('@uploadkitdev/core', () => ({
  createProxyClient: vi.fn(() => mockClient),
  ProxyUploadKitClient: vi.fn(() => mockClient),
  UploadKitError: class UploadKitError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(UploadKitProvider, { endpoint: '/api/uploadkit' }, children);
const files = (n: number) => Array.from({ length: n }, (_, i) => new File(['x'], `f${i}.png`, { type: 'image/png' }));

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.upload.mockResolvedValue({ id: '1', key: 'k', name: 'f', size: 1, type: 'image/png', url: 'u', status: 'uploaded', createdAt: '' });
});

describe('maxFileCount (per-selection, client-side)', () => {
  it('useUploadKit.checkSelection rejects an over-limit selection with TOO_MANY_FILES', async () => {
    mockClient.getRouteConfig.mockResolvedValue({ maxFileCount: 2 });
    const { result } = renderHook(() => useUploadKit('media'), { wrapper });
    let ok = true;
    await act(async () => { ok = await result.current.checkSelection(files(3)); });
    expect(ok).toBe(false);
    expect(result.current.status).toBe('error');
    expect((result.current.error as Error & { code: string }).code).toBe('TOO_MANY_FILES');
    expect(result.current.error!.message).toContain('2');
    expect(mockClient.upload).not.toHaveBeenCalled();
  });

  it('useUploadKit.checkSelection accepts a selection within the limit', async () => {
    mockClient.getRouteConfig.mockResolvedValue({ maxFileCount: 2 });
    const { result } = renderHook(() => useUploadKit('media'), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.checkSelection(files(2)); });
    expect(ok).toBe(true);
    expect(result.current.status).toBe('idle');
  });

  it('has no limit when the route config omits maxFileCount', async () => {
    mockClient.getRouteConfig.mockResolvedValue({});
    const { result } = renderHook(() => useUploadKit('media'), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.checkSelection(files(10)); });
    expect(ok).toBe(true);
  });

  it.each([
    ['UploadDropzone', UploadDropzone],
    ['UploadDropzoneGlass', UploadDropzoneGlass],
  ] as const)('%s uploads nothing and reports TOO_MANY_FILES for an over-limit selection', async (_n, Comp) => {
    mockClient.getRouteConfig.mockResolvedValue({ maxFileCount: 2 });
    const onUploadError = vi.fn();
    const { container } = render(
      <Comp route="media" config={{ mode: 'auto' }} onUploadError={onUploadError} />,
      { wrapper },
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: files(3) } }); });
    await waitFor(() => expect(onUploadError).toHaveBeenCalled());
    const err = onUploadError.mock.calls[0]![0] as Error & { code: string };
    expect(err.code).toBe('TOO_MANY_FILES');
    expect(err.message).toContain('2');
    expect(mockClient.upload).not.toHaveBeenCalled();
  });

  it('UploadDropzone still uploads a selection within the limit', async () => {
    mockClient.getRouteConfig.mockResolvedValue({ maxFileCount: 2 });
    const { container } = render(<UploadDropzone route="media" config={{ mode: 'auto' }} />, { wrapper });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: files(2) } }); });
    await waitFor(() => expect(mockClient.upload).toHaveBeenCalledTimes(2));
  });
});
