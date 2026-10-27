import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../core/services/data.services';
import { Appointment, PageMeta } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DayPipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, StatusBadgeComponent, EmptyStateComponent, PaginationComponent, IconComponent, DayPipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My appointments</h1><p>Track status, reschedule or cancel upcoming bookings.</p></div>
      <a routerLink="/customer/book" class="btn btn-primary"><app-icon name="calendar" [size]="18" /> New booking</a>
    </div>
    <div class="tabs" role="tablist">
      @for (t of tabs; track t.value) {
        <button type="button" role="tab" class="tab" [class.active]="scope() === t.value" [attr.aria-selected]="scope() === t.value" (click)="setScope(t.value)">{{ t.label }}</button>
      }
    </div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Search by reference, vehicle or service" aria-label="Search" [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="load(1)" />
      <button type="button" class="btn btn-outline" (click)="load(1)">Search</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) {
      <app-empty-state icon="calendar" title="No appointments found" message="When you book a service, it will appear here."><a routerLink="/customer/book" class="btn btn-primary">Book a service</a></app-empty-state>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Reference</th><th>Date &amp; time</th><th>Vehicle</th><th class="hide-mobile">Services</th><th>Status</th><th class="text-right hide-mobile">Estimate</th><th></th></tr></thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td class="mono">{{ a.reference }}</td>
                <td class="nowrap">{{ a.date | day }}<br /><span class="muted small">{{ a.time }}</span></td>
                <td>{{ a.vehicleSnapshot.brand }} {{ a.vehicleSnapshot.model }}<br /><span class="muted small mono">{{ a.vehicleSnapshot.registrationNumber }}</span></td>
                <td class="hide-mobile small">{{ names(a) }}</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td class="text-right hide-mobile">{{ a.estimatedTotal | inr }}</td>
                <td class="text-right"><a class="btn btn-outline btn-sm" [routerLink]="['/customer/appointments', a.id]">View</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class MyAppointmentsComponent implements OnInit {
  private readonly api = inject(AppointmentService);
  readonly tabs = [{ value: 'upcoming', label: 'Upcoming & active' }, { value: 'past', label: 'Past' }, { value: '', label: 'All' }];
  readonly scope = signal('upcoming');
  readonly search = signal('');
  readonly items = signal<Appointment[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load(1);
  }

  setScope(s: string): void {
    this.scope.set(s);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ scope: this.scope(), search: this.search(), page, limit: 10, sort: this.scope() === 'upcoming' ? 'asc' : 'desc' }).subscribe({
      next: (p) => {
        this.items.set(p.items);
        this.meta.set(p.meta);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  names(a: Appointment): string {
    return a.services.map((s) => s.name).join(', ');
  }
}
