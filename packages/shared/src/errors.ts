export class UploadKitError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly suggestion?: string;

  constructor(code: string, message: string, statusCode = 400, suggestion?: string) {
    super(message);
    this.name = 'UploadKitError';
    this.code = code;
    this.statusCode = statusCode;
    if (suggestion !== undefined) {
      this.suggestion = suggestion;
    }
  }
}

export class NotFoundError extends UploadKitError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} '${id}' not found`, 404);
  }
}

export class UnauthorizedError extends UploadKitError {
  constructor(message = 'Invalid or missing API key') {
    super('UNAUTHORIZED', message, 401, 'Check your API key at app.uploadkit.dev');
  }
}

export class RateLimitError extends UploadKitError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', `Rate limit exceeded. Retry after ${retryAfter} seconds`, 429);
  }
}

export class TierLimitError extends UploadKitError {
  constructor(limit: string) {
    super(
      'TIER_LIMIT_EXCEEDED',
      `You have exceeded your ${limit} limit`,
      403,
      'Upgrade your plan at app.uploadkit.dev/billing',
    );
  }
}
