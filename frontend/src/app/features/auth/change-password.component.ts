import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { matchFields, passwordStrength } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, FieldErrorComponent],
  template: `
    <div class="wrap">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Change password</h1>
        @if (forced()) {
          <div class="alert alert-warning mb-2">For security, you must replace your initial password before using AutoCare Pro.</div>
        } @else {
          <p class="muted">You'll stay signed in on this device; other sessions will be signed out.</p>
        }
        @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }
        <div class="stack">
          <div class="field"><label for="cp-cur">Current password</label><input id="cp-cur" type="password" class="input" formControlName="currentPassword" autocomplete="current-password" /><app-field-error [control]="form.controls.currentPassword" label="Current password" /></div>
          <div class="field"><label for="cp-new">New password</label><input id="cp-new" type="password" class="input" formControlName="newPassword" autocomplete="new-password" /><span class="hint">8+ characters with upper-case, lower-case, a number and a symbol.</span><app-field-error [control]="form.controls.newPassword" label="New password" /></div>
          <div class="field"><label for="cp-conf">Confirm new password</label><input id="cp-conf" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" /><app-field-error [control]="form.controls.confirmPassword" label="Confirm password" /></div>
          <div class="form-actions">
            @if (forced()) { <button type="button" class="btn btn-ghost" (click)="auth.logout()">Sign out</button> }
            <button class="btn btn-primary" type="submit" [disabled]="submitting()">{{ submitting() ? 'Saving…' : 'Update password' }}</button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: ['.wrap { max-width: 520px; margin: 40px auto; padding: 0 16px; } h1 { font-size: 1.6rem; }'],
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly forced = signal(!!this.auth.user()?.mustChangePassword);
  readonly form = this.fb.nonNullable.group(
    { currentPassword: ['', [Validators.required]], newPassword: ['', [Validators.required, passwordStrength]], confirmPassword: ['', [Validators.required]] },
    { validators: [matchFields('newPassword', 'confirmPassword')] },
  );

  submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.changePassword(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.submitting.set(false);
        this.toast.success('Password updated');
        this.form.reset();
        if (this.forced()) this.router.navigateByUrl(this.auth.homeFor(u.role));
        this.forced.set(false);
      },
      error: (e) => {
        this.submitting.set(false);
        Object.entries(apiErrorDetails(e)).forEach(([k, v]) => this.form.get(k)?.setErrors({ server: v }));
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
