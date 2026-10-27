import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="auth-wrap">
      <div class="auth-side"><div><h2>Welcome back</h2><p>Track your appointments, view invoices and book your next service in a few clicks.</p></div></div>
      <div class="auth-main">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Sign in</h1>
          <p class="muted">Customers, staff and administrators sign in here.</p>
          @if (notice()) { <div class="alert alert-info mb-2">{{ notice() }}</div> }
          @if (error()) { <div class="alert alert-danger mb-2" role="alert">{{ error() }}</div> }
          <div class="stack">
            <div class="field">
              <label for="l-email">Email address</label>
              <input id="l-email" class="input" type="email" formControlName="email" autocomplete="username" />
              <app-field-error [control]="form.controls.email" label="Email" />
            </div>
            <div class="field">
              <label for="l-pw">Password</label>
              <div class="input-group">
                <input id="l-pw" class="input" [type]="showPw() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
                <button type="button" class="btn btn-ghost btn-icon addon" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'" (click)="showPw.set(!showPw())">
                  <app-icon [name]="showPw() ? 'eyeOff' : 'eye'" [size]="18" />
                </button>
              </div>
              <app-field-error [control]="form.controls.password" label="Password" />
            </div>
            <div class="flex between">
              <label class="checkbox"><input type="checkbox" formControlName="rememberMe" /> Remember me on this device</label>
              <a routerLink="/forgot-password" class="small">Forgot password?</a>
            </div>
            <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="submitting()">{{ submitting() ? 'Signing in…' : 'Sign in' }}</button>
            <p class="small muted text-center">New to AutoCare Pro? <a routerLink="/register">Create an account</a></p>
            <p class="small muted">"Remember me" keeps you signed in for up to 7 days using a secure, httpOnly cookie. Don't use it on shared computers.</p>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly error = signal('');
  readonly showPw = signal(false);
  readonly notice = signal(this.initialNotice());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  private initialNotice(): string {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('expired')) return 'Your session expired. Please sign in again.';
    if (q.get('loggedOut')) return 'You have been signed out.';
    if (q.get('registered')) return 'Account created. Please sign in.';
    if (q.get('reset')) return 'Password updated. Please sign in with your new password.';
    if (q.get('returnUrl')) return 'Please sign in to continue.';
    return '';
  }

  submit(): void {
    if (this.submitting()) return;
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.toast.success(`Welcome, ${user.fullName.split(' ')[0]}!`);
        if (user.mustChangePassword) {
          this.router.navigate(['/change-password']);
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const home = this.auth.homeFor(user.role);
        // Only follow internal returnUrls that belong to the user's area (prevents open redirects).
        const safe = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && returnUrl.startsWith(home) ? returnUrl : home;
        this.router.navigateByUrl(safe);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
