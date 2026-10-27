import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Converts any HTTP/client error into a user-friendly message. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return `Cannot reach the AutoCare Pro server at ${environment.apiUrl}. Please make sure the backend is running.`;
    const msg = err.error?.error?.message;
    if (msg) return msg;
    if (err.status === 401) return 'Please sign in to continue.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 404) return 'The requested item was not found.';
    if (err.status >= 500) return 'The server had a problem. Please try again.';
    return `Request failed (${err.status}).`;
  }
  return 'Something went wrong. Please try again.';
}

/** Field-level validation errors returned by the API (422). */
export function apiErrorDetails(err: unknown): Record<string, string> {
  if (err instanceof HttpErrorResponse && err.error?.error?.details && typeof err.error.error.details === 'object') {
    return err.error.error.details as Record<string, string>;
  }
  return {};
}

export function apiErrorCode(err: unknown): string | null {
  return err instanceof HttpErrorResponse ? err.error?.error?.code ?? null : null;
}
