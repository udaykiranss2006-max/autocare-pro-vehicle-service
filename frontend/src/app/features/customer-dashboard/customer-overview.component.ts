import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.services';
import { CustomerDashboard } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, DayPipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-customer-overview',
  standalone: true,
  imports: [RouterLink, MetricCardComponent, StatusBadgeComponent, SpinnerComponent, EmptyStateComponent, IconComponent, InrPipe, DayPipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-spinner label="Loading your dashboard…" />
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }} <button class="btn btn-sm btn-outline" type="button" (click)="load()">Retry</button></div>
    } @else if (d()) {
      <div class="page-header">
        <div><h1>Welcome back, {{ d().profile.fullName.split(' ')[0] }}</h1><p>Here's what's happening with your vehicles.</p></div>
        <div class="flex flex-wrap">
          <a routerLink="/customer/vehicles/new" class="btn btn-outline"><app-icon name="plus" [size]="18" /> Add vehicle</a>
          <a routerLink="/customer/book" class="btn btn-primary"><app-icon name="calendar" [size]="18" /> Book appointment</a>
        </div>
      </div>

      <div class="stat-grid">
        <app-metric label="Total appointments" [value]="d().stats.totalAppointments" icon="calendar" />
        <app-metric label="Upcoming" [value]="d().stats.upcomingAppointments" icon="clock" tone="info" />
        <app-metric label="In the workshop" [value]="d().stats.inWorkshop" icon="wrench" tone="accent" />
        <app-metric label="Pending requests" [value]="d().stats.pendingRequests" icon="info" tone="warning" />
        <app-metric label="Completed services" [value]="d().stats.completedServices" icon="check" tone="success" />
        <app-metric label="My vehicles" [value]="d().stats.vehicleCount" icon="car" />
      </div>

      @if (d().stats.vehicleCount === 0) {
        <div class="alert alert-info mb-3"><app-icon name="info" [size]="18" /> <span>Add your first vehicle to start booking services. <a routerLink="/customer/vehicles/new">Add a vehicle</a></span></div>
      }

      <div class="grid cols">
        <div class="stack">
          @if (d().active.length) {
            <div class="card live">
              <div class="card-title"><h3>Currently in the workshop</h3></div>
              @for (a of d().active; track a.id) {
                <a class="row" [routerLink]="['/customer/appointments', a.id]">
                  <div><b>{{ a.vehicle }}</b> <span class="muted small">{{ a.registrationNumber }}</span><div class="small muted">{{ a.services.join(', ') }}</div></div>
                  <div class="text-right"><app-status-badge [status]="a.status" />@if (a.estimatedCompletionAt) {<div class="small muted mt-1">Ready by {{ a.estimatedCompletionAt | dateTime }}</div>}</div>
                </a>
              }
            </div>
          }
          <div class="card">
            <div class="card-title"><h3>Upcoming appointments</h3><a routerLink="/customer/appointments" class="small">View all</a></div>
            @for (a of d().upcoming; track a.id) {
              <a class="row" [routerLink]="['/customer/appointments', a.id]">
                <div class="date"><b>{{ a.date | day }}</b><span>{{ a.time }}</span></div>
                <div class="grow"><b>{{ a.vehicle }}</b><div class="small muted">{{ a.services.join(', ') }} · {{ a.workshopName }}</div></div>
                <app-status-badge [status]="a.status" />
              </a>
            } @empty {
              <app-empty-state icon="calendar" title="No upcoming appointments" message="Book a service and it will show up here."><a routerLink="/customer/book" class="btn btn-primary btn-sm">Book now</a></app-empty-state>
            }
          </div>
          <div class="card">
            <div class="card-title"><h3>Recent service history</h3><a routerLink="/customer/history" class="small">Full history</a></div>
            @for (r of d().recentHistory; track r.id) {
              <a class="row" [routerLink]="['/customer/invoices', r.id]">
                <div class="grow"><b>{{ r.vehicle }}</b><div class="small muted">{{ r.services.join(', ') }} · {{ r.completedAt | dateTime }}</div></div>
                <div class="text-right"><b>{{ r.total | inr }}</b><div class="small muted">{{ r.invoiceNumber }}</div></div>
              </a>
            } @empty {
              <p class="muted small mb-0">No completed services yet.</p>
            }
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <h3>Spending summary</h3>
            <dl class="dl">
              <dt>Total invoiced</dt><dd>{{ d().spending.totalInvoiced | inr }}</dd>
              <dt>Outstanding</dt><dd [class.text-danger]="d().spending.outstanding > 0">{{ d().spending.outstanding | inr }}</dd>
              <dt>Upcoming (estimate)</dt><dd>{{ d().spending.upcomingEstimate | inr }}</dd>
              <dt>Invoices</dt><dd>{{ d().spending.invoiceCount }}</dd>
            </dl>
            <p class="small muted mt-2 mb-0">Estimates are indicative; invoices reflect actual work.</p>
          </div>
          <div class="card">
            <div class="card-title"><h3>Notifications</h3><a routerLink="/customer/notifications" class="small">{{ d().stats.unreadNotifications }} unread</a></div>
            @for (n of d().notifications; track n.id) {
              <div class="note" [class.unread]="!n.read"><b>{{ n.title }}</b><p class="small muted mb-0">{{ n.message }}</p></div>
            } @empty { <p class="muted small mb-0">You're all caught up.</p> }
          </div>
          @if (d().maintenanceReminders.length) {
            <div class="card remind">
              <h3><app-icon name="bell" [size]="18" /> Maintenance reminders</h3>
              @for (m of d().maintenanceReminders; track m.registrationNumber) {
                <p class="small mb-1"><b>{{ m.vehicle }}</b> ({{ m.registrationNumber }}) is due on {{ m.nextServiceDate | day }}.</p>
              }
              <a routerLink="/customer/book" class="btn btn-primary btn-sm mt-1">Book service</a>
            </div>
          }
          <div class="card">
            <div class="card-title"><h3>Profile</h3><a routerLink="/customer/profile" class="small">Edit</a></div>
            <dl class="dl"><dt>Name</dt><dd>{{ d().profile.fullName }}</dd><dt>Email</dt><dd>{{ d().profile.email }}</dd><dt>Phone</dt><dd>{{ d().profile.phone }}</dd></dl>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cols { grid-template-columns: 1.6fr 1fr; align-items: start; }
    .row { display: flex; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none !important; }
    .row:last-child { border-bottom: 0; } .row:hover { background: #fafbfd; }
    .grow { flex: 1; min-width: 0; }
    .date { width: 92px; flex-shrink: 0; display: flex; flex-direction: column; font-size: .88rem; } .date span { color: var(--accent-600); font-weight: 700; }
    .note { padding: 10px 0; border-bottom: 1px solid var(--border); } .note:last-child { border: 0; }
    .note.unread b::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-right: 6px; }
    .live { border-left: 4px solid var(--accent); }
    .remind { background: var(--accent-50); border-color: #ffd2b5; } .remind h3 { display: flex; gap: 6px; align-items: center; }
    .dl { grid-template-columns: 140px 1fr; }
    @media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class CustomerOverviewComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly d = signal<CustomerDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.customer().subscribe({
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
