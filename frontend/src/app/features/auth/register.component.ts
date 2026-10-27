import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { indianPhone, matchFields, passwordScore, passwordStrength } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="auth-wrap">
      <div class="auth-side"><div><h2>Your garage, online</h2><p>Save your vehicles, book services, follow work in real time and keep every invoice in one place.</p></div></div>
      <div class="auth-main">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Create your account</h1>
          <p class="muted">It takes less than a minute.</p>
          @if (error()) {
            <div class="alert alert-danger mb-2" role="alert">{{ error() }} @if (duplicate()) { <a routerLink="/login">Sign in</a> }</div>
          }
          <div class="stack">
            <div class="field"><label for="r-name">Full name <span class="req">*</span></label><input id="r-name" class="input" formControlName="fullName" autocomplete="name" /><app-field-error [control]="form.controls.fullName" label="Full name" /></div>
            <div class="field"><label for="r-email">Email address <span class="req">*</span></label><input id="r-email" class="input" type="email" formControlName="email" autocomplete="email" /><app-field-error [control]="form.controls.email" label="Email" /></div>
            <div class="field"><label for="r-phone">Mobile number <span class="req">*</span></label><input id="r-phone" class="input" formControlName="phone" autocomplete="tel" placeholder="e.g. 98765 43210" /><app-field-error [control]="form.controls.phone" label="Phone" /></div>
            <div class="field">
              <label for="r-pw">Password <span class="req">*</span></label>
              <div class="input-group">
                <input id="r-pw" class="input" [type]="showPw() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" />
                <button type="button" class="btn btn-ghost btn-icon addon" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'" (click)="showPw.set(!showPw())"><app-icon [name]="showPw() ? 'eyeOff' : 'eye'" [size]="18" /></button>
              </div>
              <div class="strength" [class]="'strength s' + score()" aria-hidden="true">@for (i of [1, 2, 3, 4]; track i) { <span [class.on]="i <= score()"></span> }</div>
              <span class="hint">8+ characters with upper-case, lower-case, a number and a symbol.</span>
              <app-field-error [control]="form.controls.password" label="Password" />
            </div>
            <div class="field"><label for="r-cpw">Confirm password <span class="req">*</span></label><input id="r-cpw" class="input" [type]="showPw() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" /><app-field-error [control]="form.controls.confirmPassword" label="Confirm password" /></div>
            <div class="field"><label for="r-addr">Address <span class="muted small">(optional)</span></label><textarea id="r-addr" class="textarea" rows="2" formControlName="address" autocomplete="street-address"></textarea></div>
            <label class="checkbox"><input type="checkbox" formControlName="acceptTerms" /> <span>I accept the <a routerLink="/terms" target="_blank">terms, cancellation and privacy policy</a>.</span></label>
            <app-field-error [control]="form.controls.acceptTerms" label="Terms" />
            <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="submitting()">{{ submitting() ? 'Creating account…' : 'Create account' }}</button>
            <p class="small muted text-center">Already have an account? <a routerLink="/login">Sign in</a></p>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly error = signal('');
  readonly duplicate = signal(false);
  readonly showPw = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), Validators.pattern(/^[\p{L} .'-]+$/u)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      phone: ['', [Validators.required, indianPhone]],
      password: ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
      address: ['', [Validators.maxLength(300)]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: [matchFields('password', 'confirmPassword')] },
  );

  private readonly pw = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly score = computed(() => passwordScore(this.pw() ?? ''));

  submit(): void {
    if (this.submitting()) return;
    this.error.set('');
    this.duplicate.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.toast.success(r.message);
        this.router.navigate(['/login'], { queryParams: { registered: 1 } });
      },
      error: (e) => {
        this.submitting.set(false);
        this.duplicate.set(apiErrorCode(e) === 'DUPLICATE_ACCOUNT');
        Object.entries(apiErrorDetails(e)).forEach(([k, v]) => this.form.get(k)?.setErrors({ server: v }));
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
