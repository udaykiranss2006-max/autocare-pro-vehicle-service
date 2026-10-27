import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService, AppointmentService, WorkshopService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { Appointment, PageMeta, STATUS_LABELS, Technician, Workshop } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, todayIn } from '../../core/utils/date';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DayPipe, InrPipe } from '../../shared/pipes/pipes';

interface CalDay { date: string; inMonth: boolean; items: Appointment[]; }

/** Appointment list + month calendar. Reused by staff (advisor) with basePath /staff. */
@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, StatusBadgeComponent, EmptyStateComponent, PaginationComponent, IconComponent, DayPipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>{{ title() }}</h1><p>Search, filter and open appointments to confirm, assign, update or close them.</p></div>
      <div class="flex">
        <button type="button" class="btn btn-sm" [class.btn-dark]="view() === 'list'" [class.btn-outline]="view() !== 'list'" (click)="setView('list')"><app-icon name="list" [size]="16" /> List</button>
        <button type="button" class="btn btn-sm" [class.btn-dark]="view() === 'calendar'" [class.btn-outline]="view() !== 'calendar'" (click)="setView('calendar')"><app-icon name="calendar" [size]="16" /> Calendar</button>
      </div>
    </div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Reference, customer, phone, registration, service" aria-label="Search" [(ngModel)]="search" (keyup.enter)="load(1)" />
      <select class="select" aria-label="Status" [(ngModel)]="status" (change)="load(1)">
        <option value="">All statuses</option>
        @for (s of statusOptions; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
      </select>
      @if (workshops().length > 1) {
        <select class="select" aria-label="Workshop" [(ngModel)]="workshopId" (change)="load(1)"><option value="">All workshops</option>@for (w of workshops(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select>
      }
      @if (technicians().length) {
        <select class="select" aria-label="Technician" [(ngModel)]="technicianId" (change)="load(1)"><option value="">All technicians</option><option value="unassigned">Unassigned</option>@for (t of technicians(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }</select>
      }
      @if (view() === 'list') {
        <input class="input" type="date" aria-label="From date" [(ngModel)]="from" (change)="load(1)" />
        <input class="input" type="date" aria-label="To date" [(ngModel)]="to" (change)="load(1)" />
      }
      <button type="button" class="btn btn-outline" (click)="load(1)">Apply</button>
      <button type="button" class="btn btn-ghost" (click)="clear()">Clear</button>
    </div>

    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (view() === 'list') {
      @if (items().length === 0) { <app-empty-state icon="calendar" title="No appointments match" message="Adjust the filters to see more results." /> }
      @else {
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Reference</th><th>When</th><th>Customer</th><th>Vehicle</th><th class="hide-mobile">Services</th><th>Technician</th><th>Status</th><th class="text-right hide-mobile">Estimate</th><th></th></tr></thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td class="mono small">{{ a.reference }}</td>
                <td class="nowrap">{{ a.date | day }}<br /><span class="small muted">{{ a.time }} · {{ a.workshopName.split(' - ')[1] || a.workshopName }}</span></td>
                <td>{{ a.customerSnapshot.fullName }}<br /><span class="small muted">{{ a.customerSnapshot.phone }}</span></td>
                <td>{{ a.vehicleSnapshot.brand }} {{ a.vehicleSnapshot.model }}<br /><span class="small mono muted">{{ a.vehicleSnapshot.registrationNumber }}</span></td>
                <td class="hide-mobile small">{{ names(a) }}</td>
                <td>{{ a.technicianName || '—' }}</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td class="text-right hide-mobile">{{ a.estimatedTotal | inr }}</td>
                <td class="text-right"><a class="btn btn-outline btn-sm" [routerLink]="[basePath(), 'appointments', a.id]">Manage</a></td>
              </tr>
            }
          </tbody>
        </table></div>
        <app-pagination [meta]="meta()" (pageChange)="load($event)" />
      }
    } @else {
      <div class="card">
        <div class="flex between mb-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="shiftMonth(-1)" aria-label="Previous month"><app-icon name="chevronLeft" /></button>
          <h3 class="mb-0">{{ monthLabel() }}</h3>
          <button type="button" class="btn btn-ghost btn-sm" (click)="shiftMonth(1)" aria-label="Next month"><app-icon name="chevronRight" /></button>
        </div>
        <div class="cal">
          @for (d of weekdays; track d) { <div class="wd">{{ d }}</div> }
          @for (c of calendar(); track c.date) {
            <div class="day" [class.out]="!c.inMonth" [class.today]="c.date === today">
              <span class="num">{{ dayNum(c.date) }}</span>
              @for (a of c.items.slice(0, 4); track a.id) {
                <a class="ev" [class]="'ev st-' + a.status" [routerLink]="[basePath(), 'appointments', a.id]" [title]="a.reference + ' · ' + a.customerSnapshot.fullName">{{ a.time }} {{ a.vehicleSnapshot.model }}</a>
              }
              @if (c.items.length > 4) { <span class="more small">+{{ c.items.length - 4 }} more</span> }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
    .wd { font-size: .75rem; font-weight: 700; color: var(--muted); text-transform: uppercase; text-align: center; padding: 6px 0; }
    .day { min-height: 108px; border: 1px solid var(--border); border-radius: 6px; padding: 4px; display: flex; flex-direction: column; gap: 3px; background: #fff; overflow: hidden; }
    .day.out { background: #f8fafc; opacity: .6; }
    .day.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .num { font-size: .78rem; font-weight: 700; color: var(--navy-700); }
    .ev { font-size: .72rem; padding: 2px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none !important; background: var(--bg-2); color: var(--charcoal); border-left: 3px solid var(--muted-2); }
    .st-pending { border-left-color: #d97706; } .st-confirmed { border-left-color: #2563eb; } .st-checked_in { border-left-color: #4f46e5; }
    .st-in_progress { border-left-color: var(--accent); } .st-waiting_for_parts { border-left-color: #be185d; } .st-completed { border-left-color: var(--success); } .st-cancelled { opacity: .5; text-decoration: line-through !important; }
    .more { color: var(--muted); }
    @media (max-width: 720px) { .day { min-height: 70px; } .ev { font-size: .62rem; } }
  `],
})
export class AdminAppointmentsComponent implements OnInit {
  private readonly api = inject(AppointmentService);
  private readonly admin = inject(AdminService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly basePath = input('/admin');
  readonly title = input('Appointment management');
  readonly statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly today = todayIn();
  readonly view = signal<'list' | 'calendar'>('list');
  readonly items = signal<Appointment[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly workshops = signal<Workshop[]>([]);
  readonly technicians = signal<Technician[]>([]);
  readonly month = signal(this.today.slice(0, 7));
  search = '';
  status = '';
  workshopId = '';
  technicianId = '';
  from = '';
  to = '';

  readonly monthLabel = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  });

  readonly calendar = computed<CalDay[]>(() => {
    const [y, m] = this.month().split('-').map(Number);
    const first = `${this.month()}-01`;
    const dow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
    const start = addDays(first, -dow);
    const days: CalDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(start, i);
      days.push({ date, inMonth: date.startsWith(this.month()), items: this.items().filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time)) });
    }
    return days;
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.technicianId = qp.get('technicianId') ?? '';
    this.status = qp.get('status') ?? '';
    this.workshopApi.list().subscribe({ next: (w) => this.workshops.set(w), error: () => undefined });
    if (this.auth.role() !== 'technician') this.admin.technicians({ active: 'true' }).subscribe({ next: (t) => this.technicians.set(t), error: () => undefined });
    this.load(1);
  }

  setView(v: 'list' | 'calendar'): void {
    this.view.set(v);
    this.load(1);
  }

  shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month.set(d.toISOString().slice(0, 7));
    this.load(1);
  }

  clear(): void {
    this.search = this.status = this.workshopId = this.technicianId = this.from = this.to = '';
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set('');
    const cal = this.view() === 'calendar';
    const q = {
      search: this.search,
      status: this.status,
      workshopId: this.workshopId,
      technicianId: this.technicianId,
      from: cal ? addDays(`${this.month()}-01`, -7) : this.from,
      to: cal ? addDays(`${this.month()}-01`, 42) : this.to,
      page: cal ? 1 : page,
      limit: cal ? 500 : 20,
      sort: cal ? 'asc' : 'desc',
    };
    this.api.list(q).subscribe({
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

  dayNum(date: string): number {
    return Number(date.slice(8));
  }

  names(a: Appointment): string {
    return a.services.map((s) => s.name).join(', ');
  }
}
