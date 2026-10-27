import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Role, Session, User } from '../models/models';

/**
 * Session strategy:
 *  - short-lived JWT access token kept ONLY in memory (never in localStorage)
 *  - long-lived refresh token in an httpOnly, SameSite=Strict cookie set by the API (rotated on use)
 *  - on page load we call /auth/refresh to restore the session
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;
  private token: string | null = null;
  private refresh$: Observable<string> | null = null;

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  accessToken(): string | null {
    return this.token;
  }

  homeFor(role: Role | null | undefined): string {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'advisor':
      case 'technician':
        return '/staff';
      case 'customer':
        return '/customer';
      default:
        return '/';
    }
  }

  private setSession(s: Session): void {
    this.token = s.accessToken;
    this.user.set(s.user);
  }

  clearSession(): void {
    this.token = null;
    this.user.set(null);
  }

  /** Used at app start-up. Never throws. */
  restoreSession(): Promise<void> {
    return firstValueFrom(
      this.refreshAccessToken().pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      ),
    );
  }

  refreshAccessToken(): Observable<string> {
    if (!this.refresh$) {
      this.refresh$ = this.http.post<ApiResponse<Session>>(`${this.api}/auth/refresh`, {}).pipe(
        tap((r) => this.setSession(r.data)),
        map((r) => r.data.accessToken),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    }
    return this.refresh$;
  }

  login(body: { email: string; password: string; rememberMe: boolean }): Observable<User> {
    return this.http.post<ApiResponse<Session>>(`${this.api}/auth/login`, body).pipe(
      tap((r) => this.setSession(r.data)),
      map((r) => r.data.user),
    );
  }

  register(body: Record<string, unknown>): Observable<{ user: User; message: string }> {
    return this.http.post<ApiResponse<{ user: User; message: string }>>(`${this.api}/auth/register`, body).pipe(map((r) => r.data));
  }

  forgotPassword(email: string): Observable<{ message: string; emailDeliveryConfigured: boolean }> {
    return this.http.post<ApiResponse<{ message: string; emailDeliveryConfigured: boolean }>>(`${this.api}/auth/forgot-password`, { email }).pipe(map((r) => r.data));
  }

  resetPassword(body: { token: string; password: string; confirmPassword: string }): Observable<{ message: string }> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.api}/auth/reset-password`, body).pipe(map((r) => r.data));
  }

  changePassword(body: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<User> {
    return this.http.post<ApiResponse<Session>>(`${this.api}/auth/change-password`, body).pipe(
      tap((r) => this.setSession(r.data)),
      map((r) => r.data.user),
    );
  }

  /** Re-reads the profile (e.g. after editing). */
  reloadMe(): Observable<User> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.api}/auth/me`).pipe(
      map((r) => r.data.user),
      tap((u) => this.user.set(u)),
    );
  }

  setUser(u: User): void {
    this.user.set(u);
  }

  logout(): void {
    this.http
      .post(`${this.api}/auth/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clearSession();
        this.router.navigate(['/login'], { queryParams: { loggedOut: 1 } });
      });
  }
}
