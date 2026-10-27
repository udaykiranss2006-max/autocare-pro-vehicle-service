import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentStatus, Vehicle } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, DayPipe, InrPipe, VehicleTypePipe } from '../../shared/pipes/pipes';

type History = { vehicle: Vehicle; appointments: { id: string; reference: string; date: string; time: string; status: AppointmentStatus; services: string[]; estimatedTotal: number }[]; records: { id: string; appointmentRef: string; completedAt: string; total: number; odometerAtService: number; nextServiceDate: string | null; services: string[]; invoiceNumber: string }[] };

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, StatusBadgeComponent, IconComponent, InrPipe, DayPipe, DateTimePipe, VehicleTypePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div><a routerLink="/customer/vehicles" class="btn btn-outline mt-2">Back</a> }
    @else if (h()) {
      <div class="page-header">
        <div><a routerLink="/customer/vehicles" class="small">← My vehicles</a><h1>{{ h().vehicle.brand }} {{ h().vehicle.model }}</h1><p class="mono">{{ h().vehicle.registrationNumber }}</p></div>
        <div class="flex flex-wrap">
          <a class="btn btn-outline" [routerLink]="['/customer/vehicles', h().vehicle.id, 'edit']"><app-icon name="edit" [size]="16" /> Edit</a>
          <button type="button" class="btn btn-outline text-danger" (click)="remove(h().vehicle)"><app-icon name="trash" [size]="16" /> Delete</button>
          <a class="btn btn-primary" routerLink="/customer/book" [queryParams]="{ vehicle: h().vehicle.id }">Book service</a>
        </div>
      </div>
      <div class="grid grid-2" style="align-items:start">
        <div class="card">
          <h3>Vehicle details</h3>
          <dl class="dl">
            <dt>Type</dt><dd>{{ h().vehicle.type | vehicleType }}</dd>
            <dt>Year</dt><dd>{{ h().vehicle.year }}</dd>
            <dt>Fuel</dt><dd>{{ h().vehicle.fuelType }}</dd>
            <dt>Odometer</dt><dd>{{ h().vehicle.odometer.toLocaleString('en-IN') }} km</dd>
            <dt>VIN</dt><dd>{{ h().vehicle.vin || '-' }}</dd>
            <dt>Notes</dt><dd>{{ h().vehicle.notes || '-' }}</dd>
          </dl>
        </div>
        <div class="card">
          <h3>Service records</h3>
          @for (r of h().records; track r.id) {
            <div class="rec">
              <div><b>{{ r.services.join(', ') }}</b><div class="small muted">{{ r.completedAt | dateTime }} · {{ r.odometerAtService.toLocaleString('en-IN') }} km @if (r.nextServiceDate) { · next due {{ r.nextServiceDate | day }} }</div></div>
              <a [routerLink]="['/customer/invoices', r.id]" class="text-right"><b>{{ r.total | inr }}</b><div class="small">{{ r.invoiceNumber }}</div></a>
            </div>
          } @empty { <p class="muted small">No completed services yet for this vehicle.</p> }
        </div>
      </div>
      <div class="card mt-3">
        <h3>Appointments</h3>
        @if (h().appointments.length) {
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Reference</th><th>Date</th><th>Services</th><th>Status</th><th class="text-right">Estimate</th></tr></thead>
            <tbody>@for (a of h().appointments; track a.id) {
              <tr><td><a [routerLink]="['/customer/appointments', a.id]" class="mono">{{ a.reference }}</a></td><td>{{ a.date | day }} {{ a.time }}</td><td>{{ a.services.join(', ') }}</td><td><app-status-badge [status]="a.status" /></td><td class="text-right">{{ a.estimatedTotal | inr }}</td></tr>
            }</tbody>
          </table></div>
        } @else { <p class="muted small mb-0">No appointments for this vehicle.</p> }
      </div>
    }
  `,
  styles: ['.rec { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); } .rec:last-child { border: 0; }'],
})
export class VehicleDetailComponent implements OnInit {
  private readonly api = inject(VehicleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly h = signal<History | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.history(id).subscribe({
      next: (h) => {
        this.h.set(h);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  async remove(v: Vehicle): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete vehicle?', message: `Remove ${v.brand} ${v.model} (${v.registrationNumber}) from your account?`, confirmText: 'Delete', danger: true }))) return;
    this.api.remove(v.id).subscribe({
      next: () => {
        this.toast.success('Vehicle deleted');
        this.router.navigate(['/customer/vehicles']);
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }
}
