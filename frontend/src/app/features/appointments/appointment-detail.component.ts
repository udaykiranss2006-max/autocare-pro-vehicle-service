import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppointmentService, WorkshopService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsService } from '../../core/services/settings.service';
import { Appointment, AppointmentStatus, Availability, PublicSettings, Workshop } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, todayIn } from '../../core/utils/date';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, DayPipe, DurationPipe, InrPipe, PaymentStatusPipe, StatusLabelPipe, VehicleTypePipe } from '../../shared/pipes/pipes';

const PROGRESS: AppointmentStatus[] = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent, StatusBadgeComponent, ModalComponent, IconComponent, InrPipe, DayPipe, DateTimePipe, DurationPipe, StatusLabelPipe, VehicleTypePipe, PaymentStatusPipe],
  template: `
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div><a routerLink="/customer/appointments" class="btn btn-outline mt-2">Back</a> }
    @else if (a()) {
      <div class="page-header">
        <div><a routerLink="/customer/appointments" class="small">← My appointments</a><h1 class="mono">{{ a().reference }}</h1><p>{{ a().date | day }} at {{ a().time }} · {{ a().workshopName }}</p></div>
        <div class="flex flex-wrap">
          <app-status-badge [status]="a().status" />
          @if (canChange()) {
            <button type="button" class="btn btn-outline" (click)="openReschedule()"><app-icon name="calendar" [size]="16" /> Reschedule</button>
            <button type="button" class="btn btn-danger" (click)="cancel()"><app-icon name="x" [size]="16" /> Cancel</button>
          }
          @if (a().status === 'completed') { <a routerLink="/customer/reviews" class="btn btn-primary"><app-icon name="star" [size]="16" /> Rate service</a> }
        </div>
      </div>

      @if (a().status !== 'cancelled') {
        <div class="card progress mb-3" aria-label="Service progress">
          @for (s of progress; track s; let i = $index) {
            <div class="pstep" [class.done]="progressIndex() >= i" [class.cur]="progressIndex() === i"><span class="dot"></span><span class="small">{{ s | statusLabel }}</span></div>
          }
          @if (a().status === 'waiting_for_parts') { <div class="alert alert-warning small w-full">Waiting for parts. We'll update you when work resumes.</div> }
        </div>
      } @else {
        <div class="alert alert-danger mb-3">Cancelled{{ a().cancellation ? ' on ' + (a().cancellation.at | dateTime) + ' - ' + a().cancellation.reason : '' }}</div>
      }

      <div class="grid cols">
        <div class="stack">
          <div class="card">
            <h3>Booking details</h3>
            <dl class="dl">
              <dt>Vehicle</dt><dd>{{ a().vehicleSnapshot.brand }} {{ a().vehicleSnapshot.model }} · {{ a().vehicleSnapshot.type | vehicleType }}<br /><span class="mono small">{{ a().vehicleSnapshot.registrationNumber }}</span></dd>
              <dt>Workshop</dt><dd>{{ a().workshopName }}</dd>
              <dt>Scheduled</dt><dd>{{ a().date | day }} at {{ a().time }}</dd>
              <dt>Est. duration</dt><dd>{{ a().estimatedDurationMinutes | duration }}</dd>
              <dt>Est. completion</dt><dd>{{ a().estimatedCompletionAt ? (a().estimatedCompletionAt | dateTime) : 'Will be shared by the workshop' }}</dd>
              <dt>Service advisor</dt><dd>{{ a().advisorName || 'To be assigned' }}</dd>
              <dt>Technician</dt><dd>{{ a().technicianName || 'To be assigned' }}</dd>
              <dt>Problem</dt><dd>{{ a().problemCategory || 'Routine service' }}@if (a().problemDescription) {<br /><span class="muted small">{{ a().problemDescription }}</span>}</dd>
              <dt>Pickup / drop</dt><dd>@if (a().pickup.pickupRequested || a().pickup.dropRequested) { {{ a().pickup.pickupRequested ? 'Pickup' : '' }} {{ a().pickup.dropRequested ? 'Drop-off' : '' }} · <b>{{ a().pickup.status }}</b><br /><span class="small muted">{{ a().pickup.address }}</span> } @else { Not requested }</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Services &amp; estimate</h3>
            <div class="table-wrap"><table class="table">
              <tbody>
                @for (s of a().services; track s.serviceId) { <tr><td>{{ s.name }}</td><td class="text-right">{{ s.price | inr }}</td></tr> }
                <tr><td class="text-right muted">Subtotal</td><td class="text-right">{{ a().estimate.subtotal | inr }}</td></tr>
                @if (a().estimate.discount > 0) { <tr><td class="text-right text-success">Discount</td><td class="text-right text-success">− {{ a().estimate.discount | inr }}</td></tr> }
                <tr><td class="text-right muted">GST ({{ a().estimate.taxPercent }}%)</td><td class="text-right">{{ a().estimate.tax | inr }}</td></tr>
                <tr><td class="text-right"><b>Estimated total</b></td><td class="text-right"><b>{{ a().estimatedTotal | inr }}</b></td></tr>
              </tbody>
            </table></div>
            <p class="small muted mt-1 mb-0">Sample estimate. The final invoice depends on the work performed.</p>
            @if (a().serviceRecord; as r) {
              <div class="alert alert-success mt-2"><app-icon name="file" [size]="18" /> <span>Invoice {{ r.invoiceNumber }} · {{ r.total | inr }} · {{ r.paymentStatus | paymentStatus }} <a [routerLink]="['/customer/invoices', r.id]">View invoice</a></span></div>
            }
          </div>
        </div>
        <div class="card">
          <h3>Status history</h3>
          <ul class="timeline">
            @for (h of historyDesc(); track $index) {
              <li><b>{{ h.status | statusLabel }}</b> <span class="muted small">· {{ h.at | dateTime }}</span><div class="small muted">by {{ h.byName }}@if (h.note) { - {{ h.note }} }</div></li>
            }
          </ul>
        </div>
      </div>

      <app-modal [open]="rescheduleOpen()" title="Reschedule appointment" (closed)="rescheduleOpen.set(false)">
        <form [formGroup]="rs" (ngSubmit)="submitReschedule()">
          <p class="small muted">Allowed up to {{ settings()?.booking?.rescheduleCutoffHours }} hours before your slot ({{ a().rescheduleCount }}/{{ settings()?.booking?.maxReschedules }} used). A confirmed booking returns to Pending until the workshop re-confirms.</p>
          <div class="form-grid">
            <div class="field"><label for="rs-ws">Workshop</label><select id="rs-ws" class="select" formControlName="workshopId" (change)="loadSlots()">@for (w of workshops(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select></div>
            <div class="field"><label for="rs-date">New date</label><input id="rs-date" type="date" class="input" formControlName="date" [min]="today" [max]="maxDate()" (change)="loadSlots()" /></div>
          </div>
          @if (slots(); as av) {
            @if (av.closed) { <div class="alert alert-warning mt-2">{{ av.reason }}</div> }
            @else {
              <div class="slots mt-2">
                @for (s of av.slots; track s.time) {
                  <button type="button" class="btn btn-sm" [class.btn-primary]="rs.controls.time.value === s.time" [class.btn-outline]="rs.controls.time.value !== s.time" [disabled]="!s.available" (click)="rs.controls.time.setValue(s.time)">{{ s.time }}</button>
                }
              </div>
            }
          }
          <div class="field mt-2"><label for="rs-reason">Reason (optional)</label><input id="rs-reason" class="input" formControlName="reason" maxlength="300" /></div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" (click)="rescheduleOpen.set(false)">Close</button>
            <button type="submit" class="btn btn-primary" [disabled]="rs.invalid || saving()">{{ saving() ? 'Saving…' : 'Confirm new time' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
  styles: [`
    .cols { grid-template-columns: 1.5fr 1fr; align-items: start; }
    .progress { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
    .pstep { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 80px; color: var(--muted); position: relative; }
    .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--bg-2); border: 2px solid var(--border); }
    .pstep.done .dot { background: var(--success); border-color: var(--success); } .pstep.done { color: var(--navy-800); }
    .pstep.cur .dot { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 5px var(--accent-50); }
    .slots { display: flex; flex-wrap: wrap; gap: 6px; }
    @media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class AppointmentDetailComponent implements OnInit {
  private readonly api = inject(AppointmentService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly settingsApi = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly progress = PROGRESS;
  readonly a = signal<Appointment | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly settings = signal<PublicSettings | null>(null);
  readonly workshops = signal<Workshop[]>([]);
  readonly rescheduleOpen = signal(false);
  readonly slots = signal<Availability | null>(null);
  readonly saving = signal(false);
  readonly today = todayIn();
  readonly maxDate = computed(() => addDays(this.today, this.settings()?.booking.maxAdvanceDays ?? 60));
  readonly canChange = computed(() => ['pending', 'confirmed'].includes(this.a()?.status ?? ''));
  readonly progressIndex = computed(() => {
    const s = this.a()?.status;
    if (s === 'waiting_for_parts') return 3;
    return PROGRESS.indexOf(s as AppointmentStatus);
  });
  readonly historyDesc = computed(() => [...(this.a()?.statusHistory ?? [])].reverse());

  readonly rs = this.fb.nonNullable.group({ workshopId: ['', Validators.required], date: ['', Validators.required], time: ['', Validators.required], reason: [''] });

  ngOnInit(): void {
    this.settingsApi.publicSettings().subscribe({ next: (s) => this.settings.set(s), error: () => undefined });
    this.workshopApi.list().subscribe({ next: (w) => this.workshops.set(w), error: () => undefined });
    this.load();
  }

  load(): void {
    this.api.get(this.route.snapshot.paramMap.get('id') ?? '').subscribe({
      next: (a) => {
        this.a.set(a);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
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
    this.saving.set(true);
    const v = this.rs.getRawValue();
    this.api.reschedule(a.id, { date: v.date, time: v.time, workshopId: v.workshopId, reason: v.reason || undefined }).subscribe({
      next: (u) => {
        this.a.set(u);
        this.saving.set(false);
        this.rescheduleOpen.set(false);
        this.toast.success('Appointment rescheduled. The workshop will confirm the new slot.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(e));
        this.loadSlots();
      },
    });
  }

  async cancel(): Promise<void> {
    const a = this.a();
    if (!a) return;
    const r = await this.confirmSvc.ask({
      title: 'Cancel appointment?',
      message: `Cancel ${a.reference} on ${a.date} at ${a.time}? ${this.settings()?.booking.cancellationPolicy ?? ''}`,
      confirmText: 'Cancel appointment',
      cancelText: 'Keep it',
      danger: true,
      requireReason: true,
      reasonLabel: 'Cancellation reason',
    });
    if (!r.confirmed) return;
    this.api.cancel(a.id, r.reason).subscribe({
      next: (u) => {
        this.a.set(u);
        this.toast.success('Appointment cancelled');
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }
}
