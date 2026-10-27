import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Vehicle } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { VehicleTypePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, EmptyStateComponent, IconComponent, VehicleTypePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My vehicles</h1><p>Register your vehicles once and select them when booking.</p></div>
      <a routerLink="/customer/vehicles/new" class="btn btn-primary"><app-icon name="plus" [size]="18" /> Add vehicle</a>
    </div>
    @if (loading()) {
      <app-spinner />
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else {
      <div class="grid grid-auto">
        @for (v of vehicles(); track v.id) {
          <article class="card card-hover veh">
            <div class="flex between"><span class="ic"><app-icon [name]="v.type === 'motorcycle' ? 'gauge' : v.type === 'lcv' || v.type === 'van' ? 'truck' : 'car'" [size]="22" /></span><span class="badge badge-neutral">{{ v.type | vehicleType }}</span></div>
            <h3 class="mt-2 mb-0">{{ v.brand }} {{ v.model }}</h3>
            <div class="plate">{{ v.registrationNumber }}</div>
            <p class="small muted">{{ v.year }} · {{ v.fuelType }} · {{ v.odometer.toLocaleString('en-IN') }} km</p>
            <div class="flex flex-wrap mt-1">
              <a class="btn btn-outline btn-sm" [routerLink]="['/customer/vehicles', v.id]">Details &amp; history</a>
              <a class="btn btn-ghost btn-sm" [routerLink]="['/customer/vehicles', v.id, 'edit']"><app-icon name="edit" [size]="16" /> Edit</a>
              <button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(v)"><app-icon name="trash" [size]="16" /> Delete</button>
            </div>
            <a class="btn btn-primary btn-sm btn-block mt-2" routerLink="/customer/book" [queryParams]="{ vehicle: v.id }">Book service</a>
          </article>
        } @empty {
          <app-empty-state icon="car" title="No vehicles yet" message="Add your car, bike, SUV, van or LCV to start booking services.">
            <a routerLink="/customer/vehicles/new" class="btn btn-primary">Add your first vehicle</a>
          </app-empty-state>
        }
      </div>
    }
  `,
  styles: [`
    .ic { width: 44px; height: 44px; border-radius: 10px; background: var(--navy-800); color: var(--accent); display: grid; place-items: center; }
    .plate { display: inline-block; margin: 8px 0; padding: 4px 10px; border: 2px solid var(--navy-800); border-radius: 6px; font: 700 .95rem ui-monospace, monospace; letter-spacing: .08em; background: #fff; }
  `],
})
export class VehicleListComponent implements OnInit {
  private readonly api = inject(VehicleService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.list().subscribe({
      next: (p) => {
        this.vehicles.set(p.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  async remove(v: Vehicle): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete vehicle?', message: `${v.brand} ${v.model} (${v.registrationNumber}) will be removed. Past invoices remain available.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.api.remove(v.id).subscribe({
      next: () => {
        this.toast.success('Vehicle deleted');
        this.vehicles.update((list) => list.filter((x) => x.id !== v.id));
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }
}
