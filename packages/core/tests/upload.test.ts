import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeUpload } from '../src/upload';

// Mock single and multipart modules
vi.mock('../src/single', () => ({
  singleUpload: vi.fn(),
}));

vi.mock('../src/multipart', () => ({
  multipartUpload: vi.fn(),
}));

import { singleUpload } from '../src/single';
import { multipartUpload } from '../src/multipart';

const mockSingleUpload = vi.mocked(singleUpload);
const mockMultipartUpload = vi.mocked(multipartUpload);

const config = { apiKey: 'uk_live_test123', baseUrl: 'https://api.uploadkit.dev' };

const mockResult = {
  id: 'f1', key: 'k', name: 'file.jpg', size: 100,
  type: 'image/jpeg', url: 'https://cdn.test/k', status: 'UPLOADED', createdAt: '',
};

function makeFile(sizeBytes: number, name = 'test.jpg', type = 'image/jpeg'): File {
  // Create a File with the given logical size (content length won't match but .size will)
  const buf = new Uint8Array(Math.min(sizeBytes, 10)).fill(0);
  const file = new File([buf], name, { type });
  // Override size property for testing thresholds without allocating huge buffers
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('executeUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls single upload path when file.size <= 10MB', async () => {
    mockSingleUpload.mockResolvedValue(mockResult);
    const file = makeFile(10 * 1024 * 1024); // exactly 10MB — boundary, uses single

    await executeUpload(config, { file, route: 'photos' });

    expect(mockSingleUpload).toHaveBeenCalledOnce();
    expect(mockMultipartUpload).not.toHaveBeenCalled();
  });

  it('calls multipart upload path when file.size > 10MB', async () => {
    mockMultipartUpload.mockResolvedValue(mockResult);
    const file = makeFile(10 * 1024 * 1024 + 1); // 1 byte over 10MB

    await executeUpload(config, { file, route: 'videos' });

    expect(mockMultipartUpload).toHaveBeenCalledOnce();
    expect(mockSingleUpload).not.toHaveBeenCalled();
  });

  it('passes config and options through to single upload', async () => {
    mockSingleUpload.mockResolvedValue(mockResult);
    const file = makeFile(1024);
    const onProgress = vi.fn();

    await executeUpload(config, { file, route: 'docs', onProgress });

    expect(mockSingleUpload).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ file, route: 'docs', onProgress }),
    );
  });

  it('passes config and options through to multipart upload', async () => {
    mockMultipartUpload.mockResolvedValue(mockResult);
    const file = makeFile(20 * 1024 * 1024);

    await executeUpload(config, { file, route: 'videos' });

    expect(mockMultipartUpload).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ file, route: 'videos' }),
    );
  });
});
