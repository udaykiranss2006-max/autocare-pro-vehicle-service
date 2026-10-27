import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchFields, passwordStrength } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="auth-wrap">
      <div class="auth-side"><div><h2>Choose a new password</h2><p>Reset links expire after 30 minutes and can be used once.</p></div></div>
      <div class="auth-main">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Set new password</h1>
          @if (!token) {
            <div class="alert alert-danger">This reset link is missing its token. <a routerLink="/forgot-password">Request a new link.</a></div>
          } @else {
            @if (error()) { <div class="alert alert-danger mb-2">{{ error() }} <a routerLink="/forgot-password">Request a new link</a></div> }
            <div class="stack">
              <div class="field"><label for="rp-pw">New password</label><input id="rp-pw" type="password" class="input" formControlName="password" autocomplete="new-password" /><span class="hint">8+ characters with upper-case, lower-case, a number and a symbol.</span><app-field-error [control]="form.controls.password" label="Password" /></div>
              <div class="field"><label for="rp-cpw">Confirm new password</label><input id="rp-cpw" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" /><app-field-error [control]="form.controls.confirmPassword" label="Confirm password" /></div>
              <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="submitting()">{{ submitting() ? 'Saving…' : 'Reset password' }}</button>
            </div>
          }
        </form>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  token = '';
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group(
    { password: ['', [Validators.required, passwordStrength]], confirmPassword: ['', [Validators.required]] },
    { validators: [matchFields('password', 'confirmPassword')] },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.resetPassword({ token: this.token, ...this.form.getRawValue() }).subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.router.navigate(['/login'], { queryParams: { reset: 1 } });
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
