import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const AUTH_ENDPOINTS = /\/auth\/(login|refresh|register|logout|forgot-password|reset-password)$/;

/**
 * - Adds the Bearer token and the CSRF app header to API calls (and sends cookies).
 * - On 401 (expired access token) refreshes once and retries the original request.
 * - Redirects to the change-password page when the API requires it.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);

  const prepare = (r: HttpRequest<unknown>, token: string | null) =>
    r.clone({
      withCredentials: true,
      setHeaders: { 'X-Requested-With': 'AutoCarePro', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  const isAuthCall = AUTH_ENDPOINTS.test(req.url.split('?')[0]);

  return next(prepare(req, auth.accessToken())).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && !isAuthCall && auth.accessToken()) {
          return auth.refreshAccessToken().pipe(
            switchMap((token) => next(prepare(req, token))),
            catchError((refreshErr: unknown) => {
              auth.clearSession();
              router.navigate(['/login'], { queryParams: { expired: 1 } });
              return throwError(() => refreshErr);
            }),
          );
        }
        if (err.status === 403 && err.error?.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
          router.navigate(['/change-password']);
        }
      }
      return throwError(() => err);
    }),
  );
};
