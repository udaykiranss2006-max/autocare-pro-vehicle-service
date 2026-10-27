import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { FieldErrorComponent } from '../../shared/components/field-error.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="auth-wrap">
      <div class="auth-side"><div><h2>Forgot your password?</h2><p>We'll help you get back into your account securely.</p></div></div>
      <div class="auth-main">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Reset password</h1>
          <p class="muted">Enter the email address of your account.</p>
          @if (done()) {
            <div class="alert alert-success">{{ done() }}</div>
            <div class="alert alert-warning mt-2 small">
              Email delivery is not configured in this installation. In development, the reset link is printed in the backend terminal
              (DEV_SHOW_RESET_LINK=true). Configure an email provider for production.
            </div>
            <a routerLink="/login" class="btn btn-outline mt-2">Back to sign in</a>
          } @else {
            @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }
            <div class="stack">
              <div class="field"><label for="f-email">Email address</label><input id="f-email" type="email" class="input" formControlName="email" autocomplete="email" /><app-field-error [control]="form.controls.email" label="Email" /></div>
              <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="submitting()">{{ submitting() ? 'Sending…' : 'Send reset link' }}</button>
              <a routerLink="/login" class="small text-center">Back to sign in</a>
            </div>
          }
        </form>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly submitting = signal(false);
  readonly done = signal('');
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: (r) => {
        this.done.set(r.message);
        this.submitting.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
