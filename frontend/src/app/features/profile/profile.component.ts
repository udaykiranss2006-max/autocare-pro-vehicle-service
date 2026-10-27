import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/models';
import { apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { indianPhone } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { DateTimePipe } from '../../shared/pipes/pipes';

/** Profile page used by all roles (email and role can only be changed by an administrator). */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, SpinnerComponent, DateTimePipe],
  template: `
    <div class="page-header"><div><h1>My profile</h1><p>Keep your contact details up to date.</p></div></div>
    @if (loading()) { <app-spinner /> }
    @else if (user()) {
      <div class="grid cols">
        <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }
          <div class="form-grid">
            <div class="field"><label for="pf-name">Full name</label><input id="pf-name" class="input" formControlName="fullName" /><app-field-error [control]="form.controls.fullName" label="Full name" /></div>
            <div class="field"><label for="pf-phone">Mobile</label><input id="pf-phone" class="input" formControlName="phone" /><app-field-error [control]="form.controls.phone" label="Phone" /></div>
            <div class="field full"><label for="pf-email">Email</label><input id="pf-email" class="input" [value]="user().email" disabled /><span class="hint">Contact the workshop to change your login email.</span></div>
            <div class="field full"><label for="pf-addr">Address</label><textarea id="pf-addr" class="textarea" rows="3" formControlName="address"></textarea></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="saving() || form.pristine">{{ saving() ? 'Saving…' : 'Save changes' }}</button></div>
        </form>
        <div class="card">
          <h3>Account</h3>
          <dl class="dl"><dt>Role</dt><dd class="cap">{{ user().role }}</dd><dt>Member since</dt><dd>{{ user().createdAt | dateTime }}</dd><dt>Last sign-in</dt><dd>{{ user().lastLoginAt ? (user().lastLoginAt | dateTime) : '-' }}</dd></dl>
          <a [routerLink]="changePasswordPath()" class="btn btn-outline mt-2">Change password</a>
        </div>
      </div>
    }
  `,
  styles: ['.cols { grid-template-columns: 1.5fr 1fr; align-items: start; } .cap { text-transform: capitalize; } @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }'],
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    phone: ['', [Validators.required, indianPhone]],
    address: ['', [Validators.maxLength(300)]],
  });

  changePasswordPath(): string {
    return `${this.auth.homeFor(this.auth.role())}/change-password`;
  }

  ngOnInit(): void {
    this.api.profile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.form.reset({ fullName: u.fullName, phone: u.phone, address: u.address ?? '' });
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.updateProfile(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.user.set(u);
        this.auth.setUser(u);
        this.form.reset({ fullName: u.fullName, phone: u.phone, address: u.address ?? '' });
        this.saving.set(false);
        this.toast.success('Profile updated');
      },
      error: (e) => {
        this.saving.set(false);
        Object.entries(apiErrorDetails(e)).forEach(([k, v]) => this.form.get(k)?.setErrors({ server: v }));
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
