import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService, AppointmentService, WorkshopService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsService } from '../../core/services/settings.service';
import { Appointment, AppointmentStatus, Availability, ServiceRecord, STATUS_LABELS, Technician, Workshop } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, todayIn } from '../../core/utils/date';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, DayPipe, DurationPipe, InrPipe, StatusLabelPipe, VehicleTypePipe } from '../../shared/pipes/pipes';

const ACTION_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Mark pending',
  confirmed: 'Confirm appointment',
  checked_in: 'Check in vehicle',
  in_progress: 'Start / resume work',
  waiting_for_parts: 'Waiting for parts',
  completed: 'Complete & generate invoice',
  cancelled: 'Cancel',
};
const WORK = ['checked_in', 'in_progress', 'waiting_for_parts'];

/** Work-order page shared by admin (/admin/appointments/:id) and staff (/staff/appointments/:id). */
@Component({
  selector: 'app-appointment-manage',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, SpinnerComponent, StatusBadgeComponent, ModalComponent, IconComponent, InrPipe, DayPipe, DateTimePipe, DurationPipe, StatusLabelPipe, VehicleTypePipe],
  templateUrl: './appointment-manage.component.html',
  styleUrl: './appointment-manage.component.css',
})
export class AppointmentManageComponent implements OnInit {
  private readonly api = inject(AppointmentService);
  private readonly admin = inject(AdminService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly settingsApi = inject(SettingsService);
  protected readonly auth = inject(AuthService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly basePath = this.router.url.startsWith('/staff') ? '/staff' : '/admin';
  readonly a = signal<Appointment | null>(null);
  readonly record = signal<ServiceRecord | null>(null);
  readonly transitions = signal<AppointmentStatus[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly technicians = signal<Technician[]>([]);
  readonly staff = signal<{ id: string; fullName: string; role: string }[]>([]);
  readonly workshops = signal<Workshop[]>([]);
  readonly gst = signal(18);
  readonly rescheduleOpen = signal(false);
  readonly slots = signal<Availability | null>(null);
  readonly today = todayIn();
  readonly maxDate = addDays(this.today, 90);
  readonly isManager = computed(() => ['admin', 'advisor'].includes(this.auth.role() ?? ''));
  readonly inWork = computed(() => WORK.includes(this.a()?.status ?? ''));
  readonly historyDesc = computed(() => [...(this.a()?.statusHistory ?? [])].reverse());
  readonly advisors = computed(() => this.staff().filter((s) => s.role === 'advisor' || s.role === 'admin'));

  readonly assign = this.fb.nonNullable.group({ advisorId: [''], technicianId: [''], estimatedCompletionAt: [''], pickupStatus: ['not_requested'] });
  internalNote = '';
  readonly rs = this.fb.nonNullable.group({ workshopId: ['', Validators.required], date: ['', Validators.required], time: ['', Validators.required], reason: [''] });
  readonly work: FormGroup = this.fb.group({
    checklist: this.fb.array<FormGroup>([]),
    labourItems: this.fb.array<FormGroup>([]),
    parts: this.fb.array<FormGroup>([]),
    discountType: ['flat'],
    discountValue: [0, [Validators.min(0)]],
    discountReason: [''],
    technicianNotes: ['', Validators.maxLength(2000)],
    odometerAtService: [0, [Validators.min(0)]],
    nextServiceDate: [''],
    nextServiceOdometer: [null as number | null],
  });

  get checklist(): FormArray<FormGroup> { return this.work.get('checklist') as FormArray<FormGroup>; }
  get labour(): FormArray<FormGroup> { return this.work.get('labourItems') as FormArray<FormGroup>; }
  get parts(): FormArray<FormGroup> { return this.work.get('parts') as FormArray<FormGroup>; }

  ngOnInit(): void {
    this.settingsApi.publicSettings().subscribe({ next: (s) => this.gst.set(s.tax.gstPercent), error: () => undefined });
    if (this.isManager()) {
      this.admin.technicians({ active: 'true' }).subscribe({ next: (t) => this.technicians.set(t), error: () => undefined });
      this.admin.staffDirectory().subscribe({ next: (s) => this.staff.set(s), error: () => undefined });
      this.workshopApi.list().subscribe({ next: (w) => this.workshops.set(w), error: () => undefined });
    }
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.get(id).subscribe({
      next: (a) => {
        this.setAppointment(a);
        this.loading.set(false);
        this.loadActions();
        this.loadRecord();
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  private setAppointment(a: Appointment): void {
    this.a.set(a);
    this.assign.reset({
      advisorId: a.advisorId ?? '',
      technicianId: a.technicianId ?? '',
      estimatedCompletionAt: a.estimatedCompletionAt ? this.toLocalInput(a.estimatedCompletionAt) : '',
      pickupStatus: a.pickup.status,
    });
  }

  loadActions(): void {
    const a = this.a();
    if (!a) return;
    this.api.actions(a.id).subscribe({ next: (r) => this.transitions.set(r.transitions), error: () => this.transitions.set([]) });
  }

  loadRecord(): void {
    const a = this.a();
    if (!a || !['checked_in', 'in_progress', 'waiting_for_parts', 'completed'].includes(a.status)) {
      this.record.set(null);
      return;
    }
    this.api.getRecord(a.id).subscribe({
      next: (r) => {
        this.record.set(r);
        if (r) this.fillWork(r);
      },
      error: () => this.record.set(null),
    });
  }

  private fillWork(r: ServiceRecord): void {
    this.checklist.clear();
    r.checklist.forEach((c) => this.checklist.push(this.fb.group({ label: [c.label], done: [c.done] })));
    this.labour.clear();
    r.labourItems.forEach((l) => this.labour.push(this.labourGroup(l.description, l.hours, l.rate)));
    this.parts.clear();
    r.parts.forEach((p) => this.parts.push(this.partGroup(p.name, p.partNumber ?? '', p.quantity, p.unitPrice)));
    this.work.patchValue({
      discountType: r.discount?.type ?? 'flat',
      discountValue: r.discount?.value ?? 0,
      discountReason: r.discount?.reason ?? '',
      technicianNotes: r.technicianNotes,
      odometerAtService: r.odometerAtService,
      nextServiceDate: r.nextServiceDate ?? '',
      nextServiceOdometer: r.nextServiceOdometer,
    });
    this.work.markAsPristine();
    if (r.status === 'finalized') this.work.disable();
    else this.work.enable();
  }

  labourGroup(description = '', hours = 1, rate = 600): FormGroup {
    return this.fb.group({ description: [description, [Validators.required, Validators.maxLength(200)]], hours: [hours, [Validators.required, Validators.min(0)]], rate: [rate, [Validators.required, Validators.min(0)]] });
  }

  partGroup(name = '', partNumber = '', quantity = 1, unitPrice = 0): FormGroup {
    return this.fb.group({ name: [name, [Validators.required, Validators.maxLength(200)]], partNumber: [partNumber], quantity: [quantity, [Validators.required, Validators.min(0.01)]], unitPrice: [unitPrice, [Validators.required, Validators.min(0)]] });
  }

  addLabour(): void { this.labour.push(this.labourGroup()); this.work.markAsDirty(); }
  addPart(): void { this.parts.push(this.partGroup()); this.work.markAsDirty(); }
  removeAt(arr: FormArray, i: number): void { arr.removeAt(i); this.work.markAsDirty(); }

  /** Live preview only - the backend recalculates every total. */
  preview(): { labour: number; parts: number; subtotal: number; discount: number; tax: number; total: number } {
    const v = this.work.getRawValue();
    const labour = (v.labourItems as { hours: number; rate: number }[]).reduce((s, l) => s + Number(l.hours) * Number(l.rate), 0);
    const parts = (v.parts as { quantity: number; unitPrice: number }[]).reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0);
    const subtotal = labour + parts;
    let discount = v.discountType === 'percent' ? (subtotal * Math.min(Number(v.discountValue) || 0, 100)) / 100 : Number(v.discountValue) || 0;
    discount = Math.min(discount, subtotal);
    const tax = ((subtotal - discount) * this.gst()) / 100;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return { labour: r2(labour), parts: r2(parts), subtotal: r2(subtotal), discount: r2(discount), tax: r2(tax), total: r2(subtotal - discount + tax) };
  }

  saveWork(): void {
    const a = this.a();
    if (!a) return;
    if (this.work.invalid) {
      this.work.markAllAsTouched();
      this.toast.warning('Please fix the highlighted work-record fields');
      return;
    }
    const v = this.work.getRawValue();
    const body: Record<string, unknown> = {
      checklist: v.checklist,
      labourItems: (v.labourItems as { description: string; hours: number; rate: number }[]).map((l) => ({ description: l.description, hours: Number(l.hours), rate: Number(l.rate) })),
      parts: (v.parts as { name: string; partNumber: string; quantity: number; unitPrice: number }[]).map((p) => ({ name: p.name, partNumber: p.partNumber, quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })),
      technicianNotes: v.technicianNotes,
      odometerAtService: Number(v.odometerAtService) || 0,
      nextServiceDate: v.nextServiceDate || null,
      nextServiceOdometer: v.nextServiceOdometer ? Number(v.nextServiceOdometer) : null,
    };
    if (this.isManager()) body['discount'] = { type: v.discountType, value: Number(v.discountValue) || 0, reason: v.discountReason };
    this.busy.set(true);
    this.api.updateRecord(a.id, body as Partial<ServiceRecord>).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.record.set(r);
        this.fillWork(r);
        this.toast.success('Work record saved');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(apiErrorMessage(e));
      },
    });
  }

  actionLabel(s: AppointmentStatus): string {
    const cur = this.a()?.status;
    if (s === 'in_progress' && cur === 'waiting_for_parts') return 'Resume work';
    if (s === 'in_progress') return 'Start work';
    return ACTION_LABELS[s];
  }

  async changeStatus(s: AppointmentStatus): Promise<void> {
    const a = this.a();
    if (!a || this.busy()) return;
    let note = '';
    if (s === 'cancelled') {
      const r = await this.confirmSvc.ask({ title: 'Cancel appointment?', message: `The customer will be notified that ${a.reference} was cancelled.`, confirmText: 'Cancel appointment', cancelText: 'Keep', danger: true, requireReason: true, reasonLabel: 'Cancellation reason (shared with the customer)' });
      if (!r.confirmed) return;
      note = r.reason;
    } else if (s === 'completed') {
      if (this.work.dirty) {
        this.toast.warning('Save the work record before completing.');
        return;
      }
      const ok = await this.confirmSvc.confirm({ title: 'Complete service?', message: 'This finalizes the work record and generates an invoice from the recorded labour and parts. It cannot be edited afterwards.', confirmText: 'Complete & invoice' });
      if (!ok) return;
    } else if (s === 'waiting_for_parts') {
      const r = await this.confirmSvc.ask({ title: 'Waiting for parts', message: 'Add a short note for the customer (e.g. which part and expected arrival).', confirmText: 'Update status', requireReason: true, reasonLabel: 'Note' });
      if (!r.confirmed) return;
      note = r.reason;
    }
    this.busy.set(true);
    this.api.setStatus(a.id, s, note).subscribe({
      next: (u) => {
        this.busy.set(false);
        this.setAppointment(u);
        this.toast.success(`Status updated to ${STATUS_LABELS[s]}`);
        this.loadActions();
        this.loadRecord();
        if (s === 'completed') this.api.get(u.id).subscribe((full) => this.a.set(full));
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(apiErrorMessage(e));
        this.loadActions();
      },
    });
  }

  saveAssignment(): void {
    const a = this.a();
    if (!a) return;
    const v = this.assign.getRawValue();
    const body: Record<string, unknown> = {
      advisorId: v.advisorId || null,
      technicianId: v.technicianId || null,
      estimatedCompletionAt: v.estimatedCompletionAt ? new Date(v.estimatedCompletionAt).toISOString() : null,
    };
    if (a.pickup.pickupRequested || a.pickup.dropRequested) body['pickupStatus'] = v.pickupStatus;
    this.busy.set(true);
    this.api.update(a.id, body).subscribe({
      next: (u) => {
        this.busy.set(false);
        this.setAppointment(u);
        this.toast.success('Assignment saved');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(apiErrorMessage(e));
      },
    });
  }

  addNote(): void {
    const a = this.a();
    const note = this.internalNote.trim();
    if (!a || !note) return;
    this.api.update(a.id, { internalNote: note }).subscribe({
      next: (u) => {
        this.a.set(u);
        this.internalNote = '';
        this.toast.success('Internal note added');
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }

  openReschedule(): void {
    const a = this.a();
    if (!a) return;
    this.rs.reset({ workshopId: a.workshopId, date: a.date, time: '', reason: '' });
    this.rescheduleOpen.set(true);
    this.loadSlots();
  }

  loadSlots(): void {
    const { workshopId, date } = this.rs.getRawValue();
    this.rs.controls.time.setValue('');
    if (!workshopId || !date) return;
    this.workshopApi.availability(workshopId, date, this.a()?.id).subscribe({ next: (s) => this.slots.set(s), error: (e) => this.toast.error(apiErrorMessage(e)) });
  }

  submitReschedule(): void {
    const a = this.a();
    if (!a || this.rs.invalid) return;
    const v = this.rs.getRawValue();
    this.busy.set(true);
    this.api.reschedule(a.id, { date: v.date, time: v.time, workshopId: v.workshopId, reason: v.reason || undefined }).subscribe({
      next: (u) => {
        this.busy.set(false);
        this.setAppointment(u);
        this.rescheduleOpen.set(false);
        this.toast.success('Appointment rescheduled and customer notified');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(apiErrorMessage(e));
        this.loadSlots();
      },
    });
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  serviceNames(a: Appointment): string {
    return a.services.map((s) => s.name).join(', ');
  }
}
