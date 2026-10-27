import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkshopService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { DayHours, Workshop } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';

const DAYS = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' }, { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' }, { key: 'sun', label: 'Sunday' },
];

@Component({
  selector: 'app-admin-workshops',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, ModalComponent, FieldErrorComponent, IconComponent],
  template: `
    <div class="page-header">
      <div><h1>Workshop management</h1><p>Configure service centres, business hours and booking capacity.</p></div>
      <button type="button" class="btn btn-primary" (click)="open()"><app-icon name="plus" [size]="16" /> Add workshop</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else {
      <div class="grid grid-2">
        @for (w of items(); track w.id) {
          <div class="card">
            <div class="card-title"><h3>{{ w.name }}</h3><span class="badge" [class.badge-success]="w.active" [class.badge-cancelled]="!w.active">{{ w.active ? 'Accepting bookings' : 'Inactive' }}</span></div>
            <p class="small muted">{{ w.address }} · {{ w.phone }}</p>
            <p class="small"><b>{{ w.capacityPerSlot }}</b> vehicles per slot · <b>{{ w.dailyCapacity }}</b> per day</p>
            <table class="table small"><tbody>@for (d of days; track d.key) { <tr><td>{{ d.label }}</td><td class="text-right">{{ w.hours[d.key] ? w.hours[d.key]?.open + ' – ' + w.hours[d.key]?.close : 'Closed' }}</td></tr> }</tbody></table>
            @if (w.closedDates.length) { <p class="small mt-1">Closed on: {{ w.closedDates.join(', ') }}</p> }
            <div class="flex mt-2"><button type="button" class="btn btn-outline btn-sm" (click)="open(w)">Edit</button><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(w)">Delete</button></div>
          </div>
        }
      </div>
    }
    <app-modal [open]="formOpen()" [title]="editId ? 'Edit workshop' : 'Add workshop'" [width]="720" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid">
          <div class="field full"><label for="w-n">Name *</label><input id="w-n" class="input" formControlName="name" /><app-field-error [control]="form.get('name')" label="Name" /></div>
          <div class="field full"><label for="w-a">Address *</label><input id="w-a" class="input" formControlName="address" /><app-field-error [control]="form.get('address')" label="Address" /></div>
          <div class="field"><label for="w-p">Phone</label><input id="w-p" class="input" formControlName="phone" /></div>
          <div class="field"><span class="label">Status</span><label class="checkbox"><input type="checkbox" formControlName="active" /> Accepting bookings</label></div>
          <div class="field"><label for="w-c">Capacity per time slot *</label><input id="w-c" type="number" min="1" class="input" formControlName="capacityPerSlot" /></div>
          <div class="field"><label for="w-dc">Daily capacity *</label><input id="w-dc" type="number" min="1" class="input" formControlName="dailyCapacity" /></div>
        </div>
        <h4 class="mt-2">Business hours</h4>
        <div formGroupName="hours" class="hours">
          @for (d of days; track d.key) {
            <div class="hrow" [formGroupName]="d.key">
              <label class="checkbox"><input type="checkbox" formControlName="open" /> {{ d.label }}</label>
              <input type="time" class="input" formControlName="from" [attr.aria-label]="d.label + ' opening'" />
              <input type="time" class="input" formControlName="to" [attr.aria-label]="d.label + ' closing'" />
            </div>
          }
        </div>
        <div class="field mt-2"><label for="w-cd">Closed dates (YYYY-MM-DD, comma separated)</label><input id="w-cd" class="input" formControlName="closedDates" placeholder="2026-11-12, 2026-12-25" /></div>
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="formOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">Save workshop</button></div>
      </form>
    </app-modal>
  `,
  styles: ['.hours { display: grid; gap: 6px; } .hrow { display: grid; grid-template-columns: 160px 1fr 1fr; gap: 8px; align-items: center; } h4 { font-size: .85rem; }'],
})
export class AdminWorkshopsComponent implements OnInit {
  private readonly api = inject(WorkshopService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly days = DAYS;
  readonly items = signal<Workshop[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  editId: string | null = null;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    address: ['', Validators.required],
    phone: [''],
    active: [true],
    capacityPerSlot: [2, [Validators.required, Validators.min(1)]],
    dailyCapacity: [16, [Validators.required, Validators.min(1)]],
    closedDates: [''],
    hours: this.fb.group(Object.fromEntries(DAYS.map((d) => [d.key, this.fb.group({ open: [d.key !== 'sun'], from: ['09:00'], to: ['18:00'] })]))),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.list(true).subscribe({ next: (w) => { this.items.set(w); this.loading.set(false); }, error: (e) => { this.toast.error(apiErrorMessage(e)); this.loading.set(false); } });
  }

  open(w?: Workshop): void {
    this.editId = w?.id ?? null;
    const hours = Object.fromEntries(DAYS.map((d) => {
      const h: DayHours | null | undefined = w ? w.hours[d.key] : d.key === 'sun' ? null : { open: '09:00', close: '18:00' };
      return [d.key, { open: !!h, from: h?.open ?? '09:00', to: h?.close ?? '18:00' }];
    }));
    this.form.reset({ name: w?.name ?? '', address: w?.address ?? '', phone: w?.phone ?? '', active: w?.active ?? true, capacityPerSlot: w?.capacityPerSlot ?? 2, dailyCapacity: w?.dailyCapacity ?? 16, closedDates: (w?.closedDates ?? []).join(', '), hours });
    this.formOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const hours = Object.fromEntries(DAYS.map((d) => {
      const h = v.hours[d.key] as { open: boolean; from: string; to: string };
      return [d.key, h.open ? { open: h.from, close: h.to } : null];
    }));
    const body: Partial<Workshop> = {
      name: v.name, address: v.address, phone: v.phone, active: v.active, capacityPerSlot: Number(v.capacityPerSlot), dailyCapacity: Number(v.dailyCapacity), hours,
      closedDates: String(v.closedDates).split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    this.saving.set(true);
    const req = this.editId ? this.api.update(this.editId, body) : this.api.create(body);
    req.subscribe({ next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success('Workshop saved'); this.load(); }, error: (e) => { this.saving.set(false); this.toast.error(apiErrorMessage(e)); } });
  }

  async remove(w: Workshop): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete workshop?', message: `Delete ${w.name}? Workshops with active appointments cannot be deleted - set them inactive instead.`, confirmText: 'Delete', danger: true }))) return;
    this.api.remove(w.id).subscribe({ next: () => { this.toast.success('Workshop deleted'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
