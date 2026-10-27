import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { PublicSettings, RegPattern, VEHICLE_TYPE_LABELS, VehicleType } from '../../core/models/models';
import { apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, FieldErrorComponent],
  template: `
    <div class="page-header"><div><h1>Business settings</h1><p>Contact details, booking rules, tax, registration-number rules and pricing factors. Workshop hours and capacity are under Workshops.</p></div></div>
    @if (loading()) { <app-spinner /> }
    @else {
      <div class="tabs">@for (t of tabs; track t.key) { <button type="button" class="tab" [class.active]="tab() === t.key" (click)="tab.set(t.key)">{{ t.label }}</button> }</div>
      @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }

      @if (tab() === 'business') {
        <form class="card" [formGroup]="business" (ngSubmit)="save('business')">
          <div class="form-grid">
            <div class="field"><label for="b-n">Business name</label><input id="b-n" class="input" formControlName="name" /></div>
            <div class="field"><label for="b-t">Tagline</label><input id="b-t" class="input" formControlName="tagline" /></div>
            <div class="field"><label for="b-p">Phone</label><input id="b-p" class="input" formControlName="phone" /></div>
            <div class="field"><label for="b-e">Email</label><input id="b-e" class="input" formControlName="email" /><app-field-error [control]="business.controls.email" label="Email" /></div>
            <div class="field full"><label for="b-a">Address</label><input id="b-a" class="input" formControlName="address" /></div>
            <div class="field full"><label for="b-m">Google Maps embed URL (optional)</label><input id="b-m" class="input" formControlName="mapEmbedUrl" placeholder="https://www.google.com/maps/embed?pb=..." /><span class="hint">Google Maps → Share → Embed a map → copy the src URL.</span></div>
            <div class="field"><label for="b-fb">Facebook URL</label><input id="b-fb" class="input" formControlName="facebook" /></div>
            <div class="field"><label for="b-ig">Instagram URL</label><input id="b-ig" class="input" formControlName="instagram" /></div>
            <div class="field"><label for="b-x">X URL</label><input id="b-x" class="input" formControlName="x" /></div>
            <div class="field"><label for="b-yt">YouTube URL</label><input id="b-yt" class="input" formControlName="youtube" /></div>
            <label class="checkbox full"><input type="checkbox" formControlName="isSampleData" /> These are sample details (shows a "sample" label on the website)</label>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="saving()">Save business details</button></div>
        </form>
      }

      @if (tab() === 'booking') {
        <form class="card" [formGroup]="booking" (ngSubmit)="save('booking')">
          <div class="form-grid">
            <div class="field"><label for="k-s">Slot length (minutes)</label><input id="k-s" type="number" class="input" formControlName="slotMinutes" /></div>
            <div class="field"><label for="k-l">Minimum notice before a slot (minutes)</label><input id="k-l" type="number" class="input" formControlName="minLeadMinutes" /></div>
            <div class="field"><label for="k-a">Booking window (days ahead)</label><input id="k-a" type="number" class="input" formControlName="maxAdvanceDays" /></div>
            <div class="field"><label for="k-c">Cancellation cutoff (hours before)</label><input id="k-c" type="number" class="input" formControlName="cancellationCutoffHours" /></div>
            <div class="field"><label for="k-r">Reschedule cutoff (hours before)</label><input id="k-r" type="number" class="input" formControlName="rescheduleCutoffHours" /></div>
            <div class="field"><label for="k-m">Max reschedules per booking</label><input id="k-m" type="number" class="input" formControlName="maxReschedules" /></div>
            <div class="field full"><label for="k-p">Cancellation policy text</label><textarea id="k-p" class="textarea" rows="4" formControlName="cancellationPolicy"></textarea></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="saving()">Save booking rules</button></div>
        </form>
      }

      @if (tab() === 'pricing') {
        <form class="card" [formGroup]="pricing" (ngSubmit)="save('pricing')">
          <h3>Tax</h3>
          <div class="form-grid">
            <div class="field"><label for="t-l">Tax label</label><input id="t-l" class="input" formControlName="taxLabel" /></div>
            <div class="field"><label for="t-p">Tax %</label><input id="t-p" type="number" step="0.01" class="input" formControlName="gstPercent" /></div>
          </div>
          <h3 class="mt-3">Vehicle-type price factors</h3>
          <p class="small muted">Catalog prices are for a car. Other vehicle types multiply that price (e.g. 0.5 = half).</p>
          <div class="form-grid">@for (t of vehicleTypes; track t.value) { <div class="field"><label [for]="'f-' + t.value">{{ t.label }}</label><input [id]="'f-' + t.value" type="number" step="0.05" class="input" [formControlName]="t.value" /></div> }</div>
          <h3 class="mt-3">Payments</h3>
          <label class="checkbox"><input type="checkbox" formControlName="demoModeEnabled" /> Allow staff to record clearly-labelled DEMO payments (no real money)</label>
          <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="saving()">Save pricing</button></div>
        </form>
      }

      @if (tab() === 'rules') {
        <div class="card">
          <h3>Registration-number validation</h3>
          <p class="small muted">Numbers are normalized (upper-case, spaces and hyphens removed) and must match at least one pattern. Leave disabled to accept any format.</p>
          <label class="checkbox mb-2"><input type="checkbox" [checked]="regEnabled()" (change)="regEnabled.set(!regEnabled())" /> Enable validation</label>
          @for (p of patterns(); track $index; let i = $index) {
            <div class="pat">
              <input class="input" [value]="p.name" (input)="updatePattern(i, 'name', $any($event.target).value)" aria-label="Pattern name" />
              <input class="input mono" [value]="p.regex" (input)="updatePattern(i, 'regex', $any($event.target).value)" aria-label="Regular expression" />
              <button type="button" class="btn btn-ghost btn-sm text-danger" (click)="removePattern(i)">Remove</button>
            </div>
          }
          <button type="button" class="btn btn-outline btn-sm" (click)="addPattern()">Add pattern</button>
          <h3 class="mt-3">Problem categories</h3>
          <textarea class="textarea" rows="6" [value]="categories()" (input)="categories.set($any($event.target).value)" aria-label="Problem categories, one per line"></textarea>
          <span class="hint">One per line. Shown in step 5 of the booking wizard.</span>
          <div class="form-actions"><button class="btn btn-primary" type="button" [disabled]="saving()" (click)="saveRules()">Save rules</button></div>
        </div>
      }
    }
  `,
  styles: ['.pat { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 8px; margin-bottom: 8px; } .card h3 { font-size: 1.05rem; }'],
})
export class AdminSettingsComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly publicSettings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly tabs = [{ key: 'business', label: 'Business details' }, { key: 'booking', label: 'Booking rules' }, { key: 'pricing', label: 'Tax & pricing' }, { key: 'rules', label: 'Validation & categories' }];
  readonly vehicleTypes = (Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }));
  readonly tab = signal('business');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly regEnabled = signal(true);
  readonly patterns = signal<RegPattern[]>([]);
  readonly categories = signal('');
  private current: PublicSettings | null = null;

  readonly business = this.fb.nonNullable.group({ name: ['', Validators.required], tagline: [''], phone: [''], email: ['', Validators.email], address: [''], mapEmbedUrl: [''], facebook: [''], instagram: [''], x: [''], youtube: [''], isSampleData: [true] });
  readonly booking = this.fb.nonNullable.group({ slotMinutes: [60], minLeadMinutes: [120], maxAdvanceDays: [60], cancellationCutoffHours: [4], rescheduleCutoffHours: [4], maxReschedules: [2], cancellationPolicy: [''] });
  readonly pricing = this.fb.nonNullable.group({ taxLabel: ['GST'], gstPercent: [18], car: [1], motorcycle: [0.5], suv: [1.25], van: [1.3], lcv: [1.5], demoModeEnabled: [true] });

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (s) => { this.apply(s); this.loading.set(false); },
      error: (e) => { this.error.set(apiErrorMessage(e)); this.loading.set(false); },
    });
  }

  private apply(s: PublicSettings): void {
    this.current = s;
    this.business.reset({ ...s.business, facebook: s.business.social?.['facebook'] ?? '', instagram: s.business.social?.['instagram'] ?? '', x: s.business.social?.['x'] ?? '', youtube: s.business.social?.['youtube'] ?? '' });
    this.booking.reset(s.booking);
    this.pricing.reset({ taxLabel: s.tax.label, gstPercent: s.tax.gstPercent, car: s.vehicleTypePriceFactor['car'], motorcycle: s.vehicleTypePriceFactor['motorcycle'], suv: s.vehicleTypePriceFactor['suv'], van: s.vehicleTypePriceFactor['van'], lcv: s.vehicleTypePriceFactor['lcv'], demoModeEnabled: s.payment.demoModeEnabled ?? true });
    this.regEnabled.set(s.registrationNumber.enabled);
    this.patterns.set(s.registrationNumber.patterns.map((p) => ({ ...p })));
    this.categories.set(s.problemCategories.join('\n'));
  }

  save(section: 'business' | 'booking' | 'pricing'): void {
    let body: Record<string, unknown>;
    if (section === 'business') {
      const v = this.business.getRawValue();
      body = { business: { name: v.name, tagline: v.tagline, phone: v.phone, email: v.email, address: v.address, mapEmbedUrl: v.mapEmbedUrl, isSampleData: v.isSampleData, timezone: this.current?.business.timezone ?? 'Asia/Kolkata', currency: 'INR', social: { facebook: v.facebook, instagram: v.instagram, x: v.x, youtube: v.youtube } } };
    } else if (section === 'booking') {
      const v = this.booking.getRawValue();
      body = { booking: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, k === 'cancellationPolicy' ? val : Number(val)])) };
    } else {
      const v = this.pricing.getRawValue();
      body = { tax: { label: v.taxLabel, gstPercent: Number(v.gstPercent) }, vehicleTypePriceFactor: { car: Number(v.car), motorcycle: Number(v.motorcycle), suv: Number(v.suv), van: Number(v.van), lcv: Number(v.lcv) }, payment: { demoModeEnabled: v.demoModeEnabled } };
    }
    this.submit(body);
  }

  updatePattern(i: number, key: keyof RegPattern, value: string): void {
    this.patterns.update((l) => l.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }
  addPattern(): void { this.patterns.update((l) => [...l, { name: 'New pattern', regex: '^[A-Z0-9]+$' }]); }
  removePattern(i: number): void { this.patterns.update((l) => l.filter((_, idx) => idx !== i)); }

  saveRules(): void {
    for (const p of this.patterns()) {
      try { new RegExp(p.regex); } catch { this.toast.error(`Invalid regular expression: ${p.regex}`); return; }
    }
    this.submit({ registrationNumber: { enabled: this.regEnabled(), patterns: this.patterns() }, problemCategories: this.categories().split('\n').map((c) => c.trim()).filter(Boolean) });
  }

  private submit(body: Record<string, unknown>): void {
    this.saving.set(true);
    this.error.set('');
    this.api.updateSettings(body).subscribe({
      next: (s) => { this.saving.set(false); this.apply(s); this.publicSettings.invalidate(); this.toast.success('Settings saved'); },
      error: (e) => {
        this.saving.set(false);
        const d = apiErrorDetails(e);
        this.error.set(`${apiErrorMessage(e)} ${Object.values(d).join(' ')}`.trim());
      },
    });
  }
}
