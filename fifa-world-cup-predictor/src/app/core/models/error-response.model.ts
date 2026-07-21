export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details: unknown[];
}

export interface ErrorResponse {
  error: ErrorBody;
  timestamp: string;
  path: string;
}
