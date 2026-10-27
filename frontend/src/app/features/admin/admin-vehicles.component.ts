import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageMeta, VEHICLE_TYPE_LABELS, Vehicle, VehicleType } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe, VehicleTypePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-vehicles',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, EmptyStateComponent, PaginationComponent, DateTimePipe, VehicleTypePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Vehicle management</h1><p>All registered vehicles across customers.</p></div></div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Registration, brand, model or owner" aria-label="Search vehicles" [(ngModel)]="search" (keyup.enter)="load(1)" />
      <select class="select" aria-label="Vehicle type" [(ngModel)]="type" (change)="load(1)"><option value="">All types</option>@for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }</select>
      <button type="button" class="btn btn-outline" (click)="load(1)">Search</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) { <app-empty-state icon="car" title="No vehicles found" /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Registration</th><th>Vehicle</th><th>Type</th><th>Owner</th><th>Odometer</th><th>Added</th><th></th></tr></thead>
        <tbody>
          @for (v of items(); track v.id) {
            <tr>
              <td class="mono"><b>{{ v.registrationNumber }}</b></td><td>{{ v.brand }} {{ v.model }} ({{ v.year }})<br /><span class="small muted">{{ v.fuelType }}</span></td>
              <td>{{ v.type | vehicleType }}</td><td>{{ v.ownerName }}<br /><span class="small muted">{{ v.ownerEmail }}</span></td>
              <td>{{ v.odometer.toLocaleString('en-IN') }} km</td><td>{{ v.createdAt | dateTime }}</td>
              <td class="text-right"><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(v)">Delete</button></td>
            </tr>
          }
        </tbody>
      </table></div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class AdminVehiclesComponent implements OnInit {
  private readonly api = inject(VehicleService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly types = (Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }));
  readonly items = signal<Vehicle[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  search = '';
  type = '';

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ search: this.search, type: this.type, page, limit: 25 }).subscribe({
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

  async remove(v: Vehicle): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete vehicle?', message: `Delete ${v.registrationNumber} owned by ${v.ownerName}? Vehicles with active appointments cannot be deleted.`, confirmText: 'Delete', danger: true }))) return;
    this.api.remove(v.id).subscribe({ next: () => { this.toast.success('Vehicle deleted'); this.load(this.meta()?.page ?? 1); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
