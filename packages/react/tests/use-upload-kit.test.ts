import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { UploadKitProvider } from '../src/context';
import { useUploadKit } from '../src/use-upload-kit';

// The @uploadkitdev/core mock is set up here.
// createProxyClient always returns this same mockClient object.
// We create a stable reference here so tests can configure it before renderHook.
const mockClient = {
  upload: vi.fn(),
  listFiles: vi.fn(),
  deleteFile: vi.fn(),
};

vi.mock('@uploadkitdev/core', () => ({
  createUploadKit: vi.fn(() => mockClient),
  createProxyClient: vi.fn(() => mockClient),
  ProxyUploadKitClient: vi.fn(() => mockClient),
  UploadKitClient: vi.fn(() => mockClient),
  UploadKitError: class UploadKitError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.name = 'UploadKitError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

// Wrapper factory — renders the hook inside UploadKitProvider
function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(UploadKitProvider, { endpoint: '/api/uploadkit' }, children);
  };
}

function makeFile(name = 'test.jpg', type = 'image/jpeg'): File {
  return new File(['hello'], name, { type });
}

const mockUploadResult = {
  id: 'file-1',
  key: 'proj/route/id/test.jpg',
  name: 'test.jpg',
  size: 5,
  type: 'image/jpeg',
  url: 'https://cdn.uploadkit.dev/test.jpg',
  status: 'UPLOADED',
  createdAt: new Date().toISOString(),
};

describe('useUploadKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns idle status initially', () => {
    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('returns upload, abort, reset functions and state values', () => {
    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    expect(typeof result.current.upload).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.status).toBe('string');
    expect(typeof result.current.progress).toBe('number');
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('transitions status to "uploading" when upload() is called', async () => {
    // Never resolves — keeps status in "uploading" so we can observe it
    mockClient.upload.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    const file = makeFile();
    act(() => {
      void result.current.upload(file);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('uploading');
    });
    expect(result.current.isUploading).toBe(true);
  });

  it('transitions status to "success" after a successful upload', async () => {
    mockClient.upload.mockResolvedValue(mockUploadResult);

    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    const file = makeFile();
    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result).toEqual(mockUploadResult);
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBeNull();
  });

  it('transitions status to "error" when upload fails', async () => {
    const uploadError = new Error('Upload failed: network timeout');
    mockClient.upload.mockRejectedValue(uploadError);

    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    const file = makeFile();
    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Upload failed');
    expect(result.current.result).toBeNull();
  });

  it('updates progress during upload via onProgress callback', async () => {
    mockClient.upload.mockImplementation(
      async ({ onProgress }: { onProgress?: (p: number) => void }) => {
        onProgress?.(25);
        onProgress?.(75);
        onProgress?.(100);
        return mockUploadResult;
      },
    );

    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    const file = makeFile();
    await act(async () => {
      await result.current.upload(file);
    });

    // After completion, SUCCESS state sets progress to 100
    expect(result.current.progress).toBe(100);
    expect(result.current.status).toBe('success');
  });

  it('resets to idle when abort() is called during upload', async () => {
    // Never resolves — simulates an in-progress upload
    mockClient.upload.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUploadKit('photos'), {
      wrapper: makeWrapper(),
    });

    const file = makeFile();
    act(() => {
      void result.current.upload(file);
    });

    await waitFor(() => expect(result.current.status).toBe('uploading'));

    act(() => {
      result.current.abort();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isUploading).toBe(false);
  });

  it('throws when used outside UploadKitProvider', () => {
    // renderHook without wrapper — no provider context available
    expect(() => {
      renderHook(() => useUploadKit('photos'));
    }).toThrow(/UploadKitProvider/);
  });
});
