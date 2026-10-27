import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { BookingMode, ServiceItem, VEHICLE_TYPE_LABELS, VehicleType } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { BookingModePipe, DurationPipe, InrPipe } from '../../shared/pipes/pipes';

const ICONS = ['wrench', 'engine', 'disc', 'tyre', 'battery', 'snow', 'sparkle', 'car', 'scan', 'plus', 'truck', 'shield'];

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, SpinnerComponent, ModalComponent, FieldErrorComponent, IconComponent, InrPipe, DurationPipe, BookingModePipe],
  template: `
    <div class="page-header">
      <div><h1>Service catalog</h1><p>Add, edit, enable/disable or remove services. Prices are sample estimates for a car (other vehicle types use the price factors in Settings).</p></div>
      <button type="button" class="btn btn-primary" (click)="openNew()"><app-icon name="plus" [size]="18" /> Add service</button>
    </div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Search services" aria-label="Search" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <select class="select" aria-label="Category" [ngModel]="cat()" (ngModelChange)="cat.set($event)"><option value="">All categories</option>@for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }</select>
      <select class="select" aria-label="Availability" [ngModel]="avail()" (ngModelChange)="avail.set($event)"><option value="">All</option><option value="on">Enabled</option><option value="off">Disabled</option></select>
    </div>
    @if (loading()) { <app-spinner /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Service</th><th>Category</th><th>Booking</th><th class="text-right">From</th><th>Duration</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (s of filtered(); track s.id) {
            <tr>
              <td><div class="flex"><app-icon [name]="s.icon" [size]="18" /><b>{{ s.name }}</b>@if (s.popular) { <span class="badge badge-accent">Popular</span> }</div></td>
              <td class="small">{{ s.category }}</td><td class="small">{{ s.bookingMode | bookingMode }}</td>
              <td class="text-right">{{ s.priceFrom | inr }}</td><td>{{ s.durationMinutes | duration }}</td>
              <td><label class="checkbox"><input type="checkbox" [checked]="s.available" (change)="toggle(s)" [attr.aria-label]="'Enable ' + s.name" /> {{ s.available ? 'Enabled' : 'Disabled' }}</label></td>
              <td><div class="actions"><button type="button" class="btn btn-outline btn-sm" (click)="openEdit(s)">Edit</button><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(s)">Remove</button></div></td>
            </tr>
          }
        </tbody>
      </table></div>
      <p class="small muted mt-1">{{ filtered().length }} of {{ items().length }} services</p>
    }
    <app-modal [open]="formOpen()" [title]="editId ? 'Edit service' : 'Add service'" [width]="820" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-grid">
          <div class="field full"><label for="s-name">Service name *</label><input id="s-name" class="input" formControlName="name" /><app-field-error [control]="form.controls.name" label="Name" /></div>
          <div class="field"><label for="s-cat">Category *</label><select id="s-cat" class="select" formControlName="category">@for (c of allCategories(); track c) { <option [value]="c">{{ c }}</option> }</select></div>
          <div class="field"><label for="s-mode">Booking mode *</label><select id="s-mode" class="select" formControlName="bookingMode"><option value="direct">Book directly (fixed estimate)</option><option value="inspection">Requires workshop inspection</option><option value="request">Request / third-party assistance</option></select></div>
          <div class="field full"><label for="s-desc">Description *</label><textarea id="s-desc" class="textarea" rows="3" formControlName="description"></textarea><app-field-error [control]="form.controls.description" label="Description" /></div>
          <div class="field"><label for="s-price">Starting price (₹, sample estimate) *</label><input id="s-price" type="number" class="input" formControlName="priceFrom" min="0" /><app-field-error [control]="form.controls.priceFrom" label="Price" /></div>
          <div class="field"><label for="s-dur">Estimated duration (minutes) *</label><input id="s-dur" type="number" class="input" formControlName="durationMinutes" min="10" /><app-field-error [control]="form.controls.durationMinutes" label="Duration" /></div>
          <div class="field"><label for="s-icon">Icon</label><select id="s-icon" class="select" formControlName="icon">@for (i of icons; track i) { <option [value]="i">{{ i }}</option> }</select></div>
          <div class="field"><span class="label">Options</span><label class="checkbox"><input type="checkbox" formControlName="available" /> Available for booking</label><label class="checkbox"><input type="checkbox" formControlName="popular" /> Show as popular</label></div>
          <div class="field full"><span class="label">Vehicle types supported *</span>
            <div class="flex flex-wrap">@for (t of vehicleTypes; track t.value) { <label class="checkbox"><input type="checkbox" [checked]="selectedTypes().includes(t.value)" (change)="toggleType(t.value)" /> {{ t.label }}</label> }</div>
            @if (!selectedTypes().length) { <span class="field-error">Select at least one vehicle type</span> }</div>
          <div class="field"><label for="s-inc">Inclusions (one per line)</label><textarea id="s-inc" class="textarea" rows="4" formControlName="inclusions"></textarea></div>
          <div class="field"><label for="s-exc">Exclusions (one per line)</label><textarea id="s-exc" class="textarea" rows="4" formControlName="exclusions"></textarea></div>
          <div class="field"><label for="s-ben">Benefits (one per line)</label><textarea id="s-ben" class="textarea" rows="4" formControlName="benefits"></textarea></div>
          <div class="field"><label for="s-faq">FAQs (one per line: Question | Answer)</label><textarea id="s-faq" class="textarea" rows="4" formControlName="faqs"></textarea></div>
        </div>
        @if (formError()) { <div class="alert alert-danger mt-2">{{ formError() }}</div> }
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="formOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save service' }}</button></div>
      </form>
    </app-modal>
  `,
})
export class AdminServicesComponent implements OnInit {
  private readonly api = inject(CatalogService);
  private readonly settingsApi = inject(SettingsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly icons = ICONS;
  readonly vehicleTypes = (Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }));
  readonly items = signal<ServiceItem[]>([]);
  readonly loading = signal(true);
  readonly allCategories = signal<string[]>([]);
  readonly q = signal('');
  readonly cat = signal('');
  readonly avail = signal('');
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly selectedTypes = signal<VehicleType[]>([]);
  editId: string | null = null;
  readonly categories = computed(() => [...new Set(this.items().map((s) => s.category))]);
  readonly filtered = computed(() => {
    const q = this.q().toLowerCase();
    return this.items().filter((s) => (!this.cat() || s.category === this.cat()) && (!this.avail() || (this.avail() === 'on') === s.available) && (!q || s.name.toLowerCase().includes(q)));
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    category: ['General Maintenance', Validators.required],
    bookingMode: ['direct' as BookingMode, Validators.required],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    priceFrom: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [60, [Validators.required, Validators.min(10)]],
    icon: ['wrench'],
    available: [true],
    popular: [false],
    inclusions: [''],
    exclusions: [''],
    benefits: [''],
    faqs: [''],
  });

  ngOnInit(): void {
    this.settingsApi.publicSettings().subscribe({ next: (s) => this.allCategories.set(s.serviceCategories), error: () => undefined });
    this.load();
  }

  load(): void {
    this.api.list({ all: 'true', limit: 200 }).subscribe({
      next: (p) => {
        this.items.set(p.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  toggleType(t: VehicleType): void {
    this.selectedTypes.update((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  }

  openNew(): void {
    this.editId = null;
    this.form.reset();
    this.selectedTypes.set(['car', 'motorcycle', 'suv', 'van', 'lcv']);
    this.formError.set('');
    this.formOpen.set(true);
  }

  openEdit(s: ServiceItem): void {
    this.editId = s.id;
    this.form.reset({
      name: s.name, category: s.category, bookingMode: s.bookingMode, description: s.description, priceFrom: s.priceFrom, durationMinutes: s.durationMinutes,
      icon: s.icon, available: s.available, popular: s.popular, inclusions: s.inclusions.join('\n'), exclusions: s.exclusions.join('\n'), benefits: s.benefits.join('\n'),
      faqs: s.faqs.map((f) => `${f.q} | ${f.a}`).join('\n'),
    });
    this.selectedTypes.set([...s.vehicleTypes]);
    this.formError.set('');
    this.formOpen.set(true);
  }

  private lines(v: string): string[] {
    return v.split('\n').map((x) => x.trim()).filter(Boolean);
  }

  save(): void {
    if (this.form.invalid || !this.selectedTypes().length) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: Partial<ServiceItem> = {
      name: v.name, category: v.category, bookingMode: v.bookingMode, description: v.description, priceFrom: Number(v.priceFrom), durationMinutes: Number(v.durationMinutes),
      icon: v.icon, available: v.available, popular: v.popular, vehicleTypes: this.selectedTypes(), inclusions: this.lines(v.inclusions), exclusions: this.lines(v.exclusions), benefits: this.lines(v.benefits),
      faqs: this.lines(v.faqs).map((l) => { const [q, ...a] = l.split('|'); return { q: q.trim(), a: a.join('|').trim() }; }).filter((f) => f.q && f.a),
    };
    this.saving.set(true);
    const req = this.editId ? this.api.update(this.editId, body) : this.api.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success('Service saved');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(e));
      },
    });
  }

  toggle(s: ServiceItem): void {
    this.api.setAvailable(s.id, !s.available).subscribe({
      next: (u) => {
        this.items.update((l) => l.map((x) => (x.id === s.id ? u : x)));
        this.toast.success(u.available ? 'Service enabled' : 'Service disabled');
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }

  async remove(s: ServiceItem): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Remove service?', message: `"${s.name}" will be permanently removed from the catalog. Existing appointments keep their snapshot. Services in active appointments cannot be removed - disable them instead.`, confirmText: 'Remove', danger: true }))) return;
    this.api.remove(s.id).subscribe({ next: () => { this.toast.success('Service removed'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
