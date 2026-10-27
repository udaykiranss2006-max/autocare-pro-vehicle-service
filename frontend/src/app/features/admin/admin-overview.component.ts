import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.services';
import { AdminDashboard, STATUS_LABELS, AppointmentStatus } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { BarChartComponent, BarDatum } from '../../shared/components/bar-chart.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, DayPipe, InrPipe } from '../../shared/pipes/pipes';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink, MetricCardComponent, StatusBadgeComponent, SpinnerComponent, BarChartComponent, IconComponent, InrPipe, DayPipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Dashboard overview</h1><p>Live figures calculated from the JSON data store.</p></div>
      <div class="flex"><button type="button" class="btn btn-outline" (click)="load()"><app-icon name="refresh" [size]="16" /> Refresh</button><a routerLink="/admin/appointments" class="btn btn-primary">Manage appointments</a></div>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (d()) {
      <div class="stat-grid">
        <app-metric label="Registered customers" [value]="d().stats.totalCustomers" [hint]="d().stats.activeCustomers + ' active'" icon="users" />
        <app-metric label="Vehicles" [value]="d().stats.totalVehicles" icon="car" />
        <app-metric label="Today's appointments" [value]="d().stats.todaysAppointments" icon="calendar" tone="info" />
        <app-metric label="Pending" [value]="d().stats.pendingAppointments" icon="clock" tone="warning" />
        <app-metric label="In progress" [value]="d().stats.inProgress" icon="wrench" tone="accent" />
        <app-metric label="Completed services" [value]="d().stats.completedServices" icon="check" tone="success" />
        <app-metric label="Cancelled" [value]="d().stats.cancelledAppointments" icon="x" tone="danger" />
        <app-metric label="Estimated revenue" [value]="(d().stats.estimatedRevenue | inr)" [hint]="'Recorded payments ' + (d().stats.recordedPayments | inr)" icon="rupee" tone="success" />
      </div>
      @if (d().stats.unassignedActive > 0 || d().stats.pendingReviews > 0) {
        <div class="flex flex-wrap mb-3">
          @if (d().stats.unassignedActive > 0) { <a routerLink="/admin/appointments" [queryParams]="{ technicianId: 'unassigned' }" class="alert alert-warning">{{ d().stats.unassignedActive }} active appointment(s) have no technician assigned.</a> }
          @if (d().stats.pendingReviews > 0) { <a routerLink="/admin/reviews" class="alert alert-info">{{ d().stats.pendingReviews }} review(s) awaiting moderation.</a> }
        </div>
      }
      <div class="grid grid-2">
        <div class="card"><div class="card-title"><h3>Bookings · last 7 days</h3></div><app-bar-chart [data]="bookings()" orientation="vertical" ariaLabel="Bookings in the last 7 days" /></div>
        <div class="card"><div class="card-title"><h3>Revenue · last 7 days</h3><span class="small muted">from finalized invoices</span></div><app-bar-chart [data]="revenue()" orientation="vertical" [format]="fmtInr" ariaLabel="Revenue in the last 7 days" /></div>
        <div class="card"><div class="card-title"><h3>Popular services</h3></div><app-bar-chart [data]="popular()" /></div>
        <div class="card"><div class="card-title"><h3>Appointments by status</h3></div><app-bar-chart [data]="statuses()" /></div>
      </div>
      <div class="grid grid-2 mt-3">
        <div class="card">
          <div class="card-title"><h3>Recent bookings</h3><a routerLink="/admin/appointments" class="small">All</a></div>
          @for (a of d().recentBookings; track a.id) {
            <a class="row" [routerLink]="['/admin/appointments', a.id]"><div class="grow"><b>{{ a.customerName }}</b> <span class="small muted">· {{ a.vehicle }}</span><div class="small muted">{{ a.services.join(', ') }} · booked {{ a.createdAt | dateTime }}</div></div><app-status-badge [status]="a.status" /></a>
          } @empty { <p class="muted small">No bookings yet.</p> }
        </div>
        <div class="card">
          <div class="card-title"><h3>Upcoming appointments</h3></div>
          @for (a of d().upcoming; track a.id) {
            <a class="row" [routerLink]="['/admin/appointments', a.id]"><div class="when"><b>{{ a.date | day }}</b><span>{{ a.time }}</span></div><div class="grow"><b>{{ a.customerName }}</b><div class="small muted">{{ a.vehicle }} · {{ a.workshopName }}</div></div><app-status-badge [status]="a.status" /></a>
          } @empty { <p class="muted small">Nothing scheduled.</p> }
        </div>
      </div>
    }
  `,
  styles: [`
    .row { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none !important; }
    .row:last-child { border: 0; } .grow { flex: 1; min-width: 0; }
    .when { width: 96px; display: flex; flex-direction: column; font-size: .85rem; } .when span { color: var(--accent-600); font-weight: 700; }
    a.alert { text-decoration: none; }
  `],
})
export class AdminOverviewComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly d = signal<AdminDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly fmtInr = (v: number) => inr.format(v);
  readonly bookings = computed<BarDatum[]>(() => (this.d()?.last7Days ?? []).map((x) => ({ label: x.date.slice(8) + '/' + x.date.slice(5, 7), value: x.bookings })));
  readonly revenue = computed<BarDatum[]>(() => (this.d()?.last7Days ?? []).map((x) => ({ label: x.date.slice(8) + '/' + x.date.slice(5, 7), value: x.revenue })));
  readonly popular = computed<BarDatum[]>(() => (this.d()?.popularServices ?? []).map((x) => ({ label: x.name, value: x.count })));
  readonly statuses = computed<BarDatum[]>(() => Object.entries(this.d()?.statusBreakdown ?? {}).map(([k, v]) => ({ label: STATUS_LABELS[k as AppointmentStatus] ?? k, value: v })));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.admin().subscribe({
      next: (d) => {
        this.d.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
