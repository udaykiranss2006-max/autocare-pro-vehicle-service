import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { StaffDashboard } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-overview',
  standalone: true,
  imports: [RouterLink, MetricCardComponent, StatusBadgeComponent, SpinnerComponent, EmptyStateComponent, IconComponent, DateTimePipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (d()) {
      <div class="page-header">
        <div><h1>Hello, {{ firstName() }}</h1><p>{{ d().role === 'technician' ? 'Your assigned jobs and today’s workload.' : 'Workshop activity for today.' }}</p></div>
        <div class="flex"><button type="button" class="btn btn-outline" (click)="load()"><app-icon name="refresh" [size]="16" /> Refresh</button><a routerLink="/staff/appointments" class="btn btn-primary">{{ d().role === 'technician' ? 'My jobs' : 'All appointments' }}</a></div>
      </div>
      @if (d().role === 'technician' && !d().linkedTechnicianProfile) {
        <div class="alert alert-warning mb-3">Your login is not linked to a technician profile yet, so no jobs can be assigned to you. Ask an administrator to link it under Technicians &amp; Staff.</div>
      }
      <div class="stat-grid">
        <app-metric [label]="d().role === 'technician' ? 'Open assigned jobs' : 'Open appointments'" [value]="d().stats.assignedOpen" icon="wrench" />
        <app-metric label="Today's workload" [value]="d().stats.todaysWorkload" icon="calendar" tone="info" />
        <app-metric label="Checked in" [value]="d().stats.checkedIn" icon="car" tone="navy" />
        <app-metric label="In progress" [value]="d().stats.inProgress" icon="gauge" tone="accent" />
        <app-metric label="Waiting for parts" [value]="d().stats.waitingForParts" icon="clock" tone="warning" />
        <app-metric label="Completed" [value]="d().stats.completedTotal" icon="check" tone="success" />
        @if (d().stats.pendingConfirmation !== null) { <app-metric label="Awaiting confirmation" [value]="d().stats.pendingConfirmation" icon="info" tone="warning" /> }
        @if (d().stats.unassigned !== null) { <app-metric label="No technician yet" [value]="d().stats.unassigned" icon="user" tone="danger" /> }
      </div>
      <div class="grid grid-2" style="align-items:start">
        <div class="card">
          <div class="card-title"><h3>Today</h3></div>
          @for (a of d().today; track a.id) {
            <a class="row" [routerLink]="['/staff/appointments', a.id]">
              <b class="time">{{ a.time }}</b>
              <div class="grow"><b>{{ a.vehicle }}</b> <span class="mono small muted">{{ a.registrationNumber }}</span><div class="small muted">{{ a.services.join(', ') }} · {{ a.customerName }}</div></div>
              <app-status-badge [status]="a.status" />
            </a>
          } @empty { <app-empty-state icon="calendar" title="Nothing scheduled today" /> }
        </div>
        <div class="card">
          <div class="card-title"><h3>Vehicles in the workshop</h3></div>
          @for (a of d().activeJobs; track a.id) {
            <a class="row" [routerLink]="['/staff/appointments', a.id]">
              <div class="grow"><b>{{ a.vehicle }}</b> <span class="mono small muted">{{ a.registrationNumber }}</span><div class="small muted">{{ a.services.join(', ') }}@if (a.estimatedCompletionAt) { · ETA {{ a.estimatedCompletionAt | dateTime }} }</div></div>
              <app-status-badge [status]="a.status" />
            </a>
          } @empty { <p class="muted small">No vehicles currently in progress.</p> }
        </div>
      </div>
      <div class="card mt-3">
        <div class="card-title"><h3>Completed-work summary</h3><a routerLink="/staff/completed" class="small">All completed</a></div>
        @if (d().completedSummary.length) {
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Reference</th><th>Vehicle</th><th>Completed</th><th class="text-right">Labour hrs</th><th class="text-right">Parts</th><th class="text-right">Invoice total</th></tr></thead>
            <tbody>@for (c of d().completedSummary; track c.id) { <tr><td class="mono small">{{ c.appointmentRef }}</td><td>{{ c.vehicle }}</td><td>{{ c.completedAt | dateTime }}</td><td class="text-right">{{ c.labourHours }}</td><td class="text-right">{{ c.partsCount }}</td><td class="text-right">{{ c.total | inr }}</td></tr> }</tbody>
          </table></div>
        } @else { <p class="muted small mb-0">No completed jobs yet.</p> }
      </div>
    }
  `,
  styles: ['.row { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none !important; } .row:last-child { border: 0; } .grow { flex: 1; min-width: 0; } .time { width: 52px; color: var(--accent-600); }'],
})
export class StaffOverviewComponent implements OnInit {
  private readonly api = inject(DashboardService);
  protected readonly auth = inject(AuthService);
  readonly d = signal<StaffDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void { this.load(); }

  firstName(): string {
    return (this.auth.user()?.fullName ?? '').split(' ')[0];
  }

  load(): void {
    this.loading.set(true);
    this.api.staff().subscribe({ next: (d) => { this.d.set(d); this.loading.set(false); }, error: (e) => { this.error.set(apiErrorMessage(e)); this.loading.set(false); } });
  }
}
