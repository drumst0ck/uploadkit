import { z } from 'zod';

// ─── Upload flow ──────────────────────────────────────────────────────────────

export const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1).max(100),
  routeSlug: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UploadCompleteSchema = z.object({
  fileId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Multipart ────────────────────────────────────────────────────────────────

export const MultipartInitSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1).max(100),
  routeSlug: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MultipartCompleteSchema = z.object({
  fileId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
      }),
    )
    .min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MultipartAbortSchema = z.object({
  fileId: z.string().min(1),
  uploadId: z.string().min(1),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isTest: z.boolean().optional(),
});

// ─── File Routers ─────────────────────────────────────────────────────────────

export const CreateFileRouterSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  maxFileSize: z.number().int().positive().optional(),
  maxFileCount: z.number().int().positive().optional(),
  allowedTypes: z.array(z.string().min(1)).optional(),
  webhookUrl: z.string().url().optional(),
});

export const UpdateFileRouterSchema = z.object({
  maxFileSize: z.number().int().positive().optional(),
  maxFileCount: z.number().int().positive().optional(),
  allowedTypes: z.array(z.string().min(1)).optional(),
  webhookUrl: z.string().url().nullable().optional(),
});

// ─── Files ────────────────────────────────────────────────────────────────────

export const UpdateFileMetadataSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const LogsQuerySchema = z.object({
  since: z.coerce.date(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
