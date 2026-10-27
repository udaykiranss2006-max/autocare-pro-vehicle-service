import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentStatus, PageMeta, User, Vehicle } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { DateTimePipe, DayPipe, InrPipe } from '../../shared/pipes/pipes';

type Detail = { user: User; vehicles: Vehicle[]; appointments: { id: string; reference: string; date: string; time: string; status: AppointmentStatus; estimatedTotal: number }[] };

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, PaginationComponent, ModalComponent, StatusBadgeComponent, DateTimePipe, DayPipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Customer management</h1><p>Search customers, view their vehicles and appointments, activate or deactivate accounts.</p></div></div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Name, email or phone" aria-label="Search customers" [(ngModel)]="search" (keyup.enter)="load(1)" />
      <select class="select" aria-label="Account status" [(ngModel)]="active" (change)="load(1)"><option value="">All accounts</option><option value="true">Active</option><option value="false">Deactivated</option></select>
      <button type="button" class="btn btn-outline" (click)="load(1)">Search</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) { <app-empty-state icon="users" title="No customers found" message="Customers appear here after they register." /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Customer</th><th>Phone</th><th>Vehicles</th><th>Appointments</th><th>Registered</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (u of items(); track u.id) {
            <tr>
              <td><b>{{ u.fullName }}</b><br /><span class="small muted">{{ u.email }}</span></td>
              <td>{{ u.phone }}</td><td>{{ u.vehicleCount }}</td><td>{{ u.appointmentCount }}</td><td>{{ u.createdAt | dateTime }}</td>
              <td><span class="badge" [class.badge-success]="u.active" [class.badge-danger]="!u.active">{{ u.active ? 'Active' : 'Deactivated' }}</span></td>
              <td><div class="actions"><button type="button" class="btn btn-outline btn-sm" (click)="view(u)">View</button>
                <button type="button" class="btn btn-sm" [class.btn-danger]="u.active" [class.btn-success]="!u.active" (click)="toggle(u)">{{ u.active ? 'Deactivate' : 'Activate' }}</button></div></td>
            </tr>
          }
        </tbody>
      </table></div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
    <app-modal [open]="!!detail()" [title]="detail()?.user?.fullName ?? ''" [width]="760" (closed)="detail.set(null)">
      @if (detail(); as d) {
        <dl class="dl"><dt>Email</dt><dd>{{ d.user.email }}</dd><dt>Phone</dt><dd>{{ d.user.phone }}</dd><dt>Address</dt><dd>{{ d.user.address || '-' }}</dd><dt>Last sign-in</dt><dd>{{ d.user.lastLoginAt ? (d.user.lastLoginAt | dateTime) : '-' }}</dd></dl>
        <h4 class="mt-2">Vehicles</h4>
        @for (v of d.vehicles; track v.id) { <p class="small mb-1">{{ v.brand }} {{ v.model }} · <span class="mono">{{ v.registrationNumber }}</span> · {{ v.odometer }} km</p> } @empty { <p class="small muted">No vehicles</p> }
        <h4 class="mt-2">Recent appointments</h4>
        @for (a of d.appointments; track a.id) {
          <div class="flex between small mb-1"><a [routerLink]="['/admin/appointments', a.id]" class="mono" (click)="detail.set(null)">{{ a.reference }}</a><span>{{ a.date | day }} {{ a.time }}</span><app-status-badge [status]="a.status" /><span>{{ a.estimatedTotal | inr }}</span></div>
        } @empty { <p class="small muted">No appointments</p> }
      }
    </app-modal>
  `,
})
export class AdminCustomersComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly items = signal<User[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detail = signal<Detail | null>(null);
  search = '';
  active = '';

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.users({ role: 'customer', search: this.search, active: this.active, page, limit: 20 }).subscribe({
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

  view(u: User): void {
    this.api.user(u.id).subscribe({ next: (d) => this.detail.set(d), error: (e) => this.toast.error(apiErrorMessage(e)) });
  }

  async toggle(u: User): Promise<void> {
    const ok = await this.confirm.confirm({
      title: u.active ? 'Deactivate account?' : 'Activate account?',
      message: u.active ? `${u.fullName} will be signed out and unable to sign in until reactivated.` : `${u.fullName} will be able to sign in again.`,
      confirmText: u.active ? 'Deactivate' : 'Activate',
      danger: u.active,
    });
    if (!ok) return;
    this.api.setUserActive(u.id, !u.active).subscribe({
      next: (upd) => {
        this.items.update((l) => l.map((x) => (x.id === u.id ? { ...x, active: upd.active } : x)));
        this.toast.success(upd.active ? 'Account activated' : 'Account deactivated');
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }
}
