import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppointmentService } from '../../core/services/data.services';
import { Appointment } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DayPipe, DurationPipe, InrPipe } from '../../shared/pipes/pipes';

/** Step 8. Only shown after the backend has saved the appointment (loaded from the API by id). */
@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, StatusBadgeComponent, IconComponent, DayPipe, DurationPipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (a()) {
      <div class="card conf">
        <div class="tick"><app-icon name="check" [size]="34" [stroke]="2.6" /></div>
        <h1>Booking request received</h1>
        <p class="muted">Your appointment has been saved. The workshop will review and confirm it shortly. We'll notify you in the app.</p>
        <div class="ref"><span class="small muted">Appointment reference</span><b class="mono">{{ a().reference }}</b><app-status-badge [status]="a().status" /></div>
        <dl class="dl mt-3">
          <dt>Vehicle</dt><dd>{{ a().vehicleSnapshot.brand }} {{ a().vehicleSnapshot.model }} ({{ a().vehicleSnapshot.registrationNumber }})</dd>
          <dt>Services</dt><dd>{{ serviceNames(a) }}</dd>
          <dt>Workshop</dt><dd>{{ a().workshopName }}</dd>
          <dt>Date &amp; time</dt><dd>{{ a().date | day }} at {{ a().time }}</dd>
          <dt>Est. duration</dt><dd>{{ a().estimatedDurationMinutes | duration }}</dd>
          <dt>Est. total</dt><dd>{{ a().estimatedTotal | inr }} <span class="muted small">(incl. GST, sample estimate)</span></dd>
          @if (a().pickup.pickupRequested || a().pickup.dropRequested) { <dt>Pickup/drop</dt><dd>Requested - subject to confirmation</dd> }
        </dl>
        <h3 class="mt-3">What happens next</h3>
        <ol class="next">
          <li>The workshop confirms your slot (you'll get a notification).</li>
          <li>Bring your vehicle at the scheduled time, or wait for pickup if it's approved.</li>
          <li>Track progress from <a [routerLink]="['/customer/appointments', a().id]">appointment details</a>.</li>
          <li>When work is complete, your itemised invoice appears under Invoices.</li>
        </ol>
        <div class="flex flex-wrap mt-3">
          <a class="btn btn-primary" [routerLink]="['/customer/appointments', a().id]">View appointment</a>
          <a class="btn btn-outline" routerLink="/customer">Back to dashboard</a>
        </div>
      </div>
    }
  `,
  styles: [`
    .conf { max-width: 760px; margin: 0 auto; text-align: left; }
    .tick { width: 68px; height: 68px; border-radius: 50%; background: var(--success-50); color: var(--success); display: grid; place-items: center; margin-bottom: 16px; }
    .ref { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; background: var(--bg); padding: 14px 16px; border-radius: 10px; }
    .ref b { font-size: 1.3rem; color: var(--navy-800); letter-spacing: .04em; }
    .next { padding-left: 20px; } .next li { margin-bottom: 6px; }
  `],
})
export class BookingConfirmationComponent implements OnInit {
  private readonly api = inject(AppointmentService);
  private readonly route = inject(ActivatedRoute);
  readonly a = signal<Appointment | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
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

  serviceNames(a: Appointment): string {
    return a.services.map((s) => s.name).join(', ');
  }
}
