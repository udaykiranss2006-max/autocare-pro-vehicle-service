import { Component, OnInit, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { PublicSettings, Vehicle, VehicleType } from '../../core/models/models';
import { apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { normalizeRegistration, registrationNumber } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';

/** Add / edit vehicle. Also usable inline from the booking wizard via (saved) when embedded. */
@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TitleCasePipe, FieldErrorComponent, SpinnerComponent],
  template: `
    <div class="page-header"><div><h1>{{ editId ? 'Edit vehicle' : 'Add a vehicle' }}</h1><p>Details help our technicians prepare the right parts and checks.</p></div></div>
    @if (loading()) {
      <app-spinner />
    } @else {
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate style="max-width:860px">
        @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field"><label for="v-type">Vehicle type <span class="req">*</span></label>
            <select id="v-type" class="select" formControlName="type">
              @for (t of settings()?.vehicleTypes ?? []; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
            </select><app-field-error [control]="form.controls.type" label="Vehicle type" /></div>
          <div class="field"><label for="v-reg">Registration number <span class="req">*</span></label>
            <input id="v-reg" class="input mono" formControlName="registrationNumber" placeholder="e.g. TS09EA1234" (blur)="normalizeReg()" autocomplete="off" />
            <span class="hint">Accepted: {{ patternNames() }}</span>
            <app-field-error [control]="form.controls.registrationNumber" label="Registration number" /></div>
          <div class="field"><label for="v-brand">Brand <span class="req">*</span></label><input id="v-brand" class="input" formControlName="brand" placeholder="e.g. Maruti Suzuki" /><app-field-error [control]="form.controls.brand" label="Brand" /></div>
          <div class="field"><label for="v-model">Model <span class="req">*</span></label><input id="v-model" class="input" formControlName="model" placeholder="e.g. Swift" /><app-field-error [control]="form.controls.model" label="Model" /></div>
          <div class="field"><label for="v-year">Manufacturing year <span class="req">*</span></label><input id="v-year" type="number" class="input" formControlName="year" [min]="1950" [max]="maxYear" /><app-field-error [control]="form.controls.year" label="Year" /></div>
          <div class="field"><label for="v-fuel">Fuel type <span class="req">*</span></label>
            <select id="v-fuel" class="select" formControlName="fuelType">@for (f of settings()?.fuelTypes ?? []; track f) { <option [value]="f">{{ f | titlecase }}</option> }</select></div>
          <div class="field"><label for="v-odo">Odometer reading (km) <span class="req">*</span></label><input id="v-odo" type="number" class="input" formControlName="odometer" min="0" /><app-field-error [control]="form.controls.odometer" label="Odometer" /></div>
          <div class="field"><label for="v-vin">VIN / chassis number <span class="muted small">(optional)</span></label><input id="v-vin" class="input mono" formControlName="vin" maxlength="17" /><app-field-error [control]="form.controls.vin" label="VIN" /></div>
          <div class="field full"><label for="v-notes">Notes <span class="muted small">(optional)</span></label><textarea id="v-notes" class="textarea" formControlName="notes" rows="3" placeholder="Anything we should know about this vehicle"></textarea></div>
        </div>
        <div class="form-actions">
          <a class="btn btn-outline" [routerLink]="editId ? ['/customer/vehicles', editId] : '/customer/vehicles'">Cancel</a>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : editId ? 'Save changes' : 'Add vehicle' }}</button>
        </div>
      </form>
    }
  `,
})
export class VehicleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(VehicleService);
  private readonly settingsApi = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly maxYear = new Date().getFullYear() + 1;
  readonly settings = signal<PublicSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  editId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    type: ['car' as VehicleType, Validators.required],
    brand: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    model: ['', [Validators.required, Validators.maxLength(60)]],
    registrationNumber: ['', [Validators.required, registrationNumber(() => this.settings()?.registrationNumber.enabled ? this.settings()?.registrationNumber.patterns ?? null : null)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1950), Validators.max(new Date().getFullYear() + 1)]],
    fuelType: ['petrol', Validators.required],
    odometer: [0, [Validators.required, Validators.min(0), Validators.max(2000000)]],
    vin: ['', [Validators.pattern(/^[A-HJ-NPR-Za-hj-npr-z0-9]{11,17}$/)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  patternNames(): string {
    return (this.settings()?.registrationNumber.patterns ?? []).map((p) => p.name).join(' · ') || 'any format';
  }

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id');
    this.settingsApi.publicSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.form.controls.registrationNumber.updateValueAndValidity();
        if (!this.editId) this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
    if (this.editId) {
      this.api.get(this.editId).subscribe({
        next: (v: Vehicle) => {
          this.form.patchValue({ ...v, vin: v.vin ?? '', notes: v.notes ?? '' });
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiErrorMessage(e));
          this.loading.set(false);
        },
      });
    }
  }

  normalizeReg(): void {
    const c = this.form.controls.registrationNumber;
    c.setValue(normalizeRegistration(c.value));
  }

  submit(): void {
    this.normalizeReg();
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = { ...this.form.getRawValue(), year: Number(this.form.value.year), odometer: Number(this.form.value.odometer) };
    const req = this.editId ? this.api.update(this.editId, body) : this.api.create(body);
    req.subscribe({
      next: (v) => {
        this.saving.set(false);
        this.toast.success(this.editId ? 'Vehicle updated' : 'Vehicle added');
        const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
        if (returnTo === 'book') this.router.navigate(['/customer/book'], { queryParams: { vehicle: v.id } });
        else this.router.navigate(['/customer/vehicles', v.id]);
      },
      error: (e) => {
        this.saving.set(false);
        Object.entries(apiErrorDetails(e)).forEach(([k, msg]) => this.form.get(k)?.setErrors({ server: msg }));
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
