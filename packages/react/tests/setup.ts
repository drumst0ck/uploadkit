import '@testing-library/jest-dom';

// Mock @uploadkit/core's createUploadKit to prevent real network calls
// and avoid needing a built dist/ artifact in test environments.
// Each test can configure mockUpload behavior via vi.mocked(client.upload).
vi.mock('@uploadkit/core', () => {
  const mockUpload = vi.fn();
  const mockListFiles = vi.fn();
  const mockDeleteFile = vi.fn();

  const mockClient = {
    upload: mockUpload,
    listFiles: mockListFiles,
    deleteFile: mockDeleteFile,
  };

  return {
    createUploadKit: vi.fn(() => mockClient),
    UploadKitClient: vi.fn(() => mockClient),
    UploadKitError: class UploadKitError extends Error {
      code: string;
      statusCode: number;
      suggestion?: string;

      constructor(code: string, message: string, statusCode: number, suggestion?: string) {
        super(message);
        this.name = 'UploadKitError';
        this.code = code;
        this.statusCode = statusCode;
        this.suggestion = suggestion;
      }
    },
  };
});
