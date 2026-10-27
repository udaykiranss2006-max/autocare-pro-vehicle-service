import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecordService, VehicleService } from '../../core/services/data.services';
import { PageMeta, ServiceRecord, Vehicle } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe, DayPipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-service-history',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, PaginationComponent, InrPipe, DayPipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Service history</h1><p>Every completed service, with work performed and recommendations.</p></div></div>
    <div class="toolbar">
      <select class="select" aria-label="Vehicle" [ngModel]="vehicleId()" (ngModelChange)="vehicleId.set($event); load(1)">
        <option value="">All vehicles</option>
        @for (v of vehicles(); track v.id) { <option [value]="v.id">{{ v.brand }} {{ v.model }} ({{ v.registrationNumber }})</option> }
      </select>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else {
      @for (r of items(); track r.id) {
        <article class="card mb-2 rec">
          <div class="flex between flex-wrap">
            <div><h3 class="mb-0">{{ r.vehicleSnapshot.brand }} {{ r.vehicleSnapshot.model }} <span class="mono small muted">{{ r.vehicleSnapshot.registrationNumber }}</span></h3><span class="small muted">{{ r.completedAt | dateTime }} · Ref {{ r.appointmentRef }} · {{ r.odometerAtService.toLocaleString('en-IN') }} km</span></div>
            <div class="text-right"><b class="big">{{ r.total | inr }}</b><br /><a [routerLink]="['/customer/invoices', r.id]" class="small">Invoice {{ r.invoice?.number }}</a></div>
          </div>
          <div class="grid grid-3 mt-2">
            <div><h4>Services performed</h4><ul class="small">@for (s of r.servicesPerformed; track s.serviceId) { <li>{{ s.name }}</li> }</ul></div>
            <div><h4>Parts &amp; materials</h4><ul class="small">@for (p of r.parts; track $index) { <li>{{ p.name }} × {{ p.quantity }}</li> } @empty { <li class="muted">None</li> }</ul></div>
            <div><h4>Technician notes</h4><p class="small">{{ r.technicianNotes || '—' }}</p>
              @if (r.nextServiceDate || r.nextServiceOdometer) { <p class="small next">Next service: {{ r.nextServiceDate ? (r.nextServiceDate | day) : '' }} {{ r.nextServiceOdometer ? '· at ' + r.nextServiceOdometer.toLocaleString('en-IN') + ' km' : '' }}</p> }
            </div>
          </div>
        </article>
      } @empty {
        <app-empty-state icon="clock" title="No service history yet" message="Completed services and their records will appear here." />
      }
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
  styles: ['.big { font: 800 1.2rem var(--font-display); color: var(--navy-800); } h4 { font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); } ul { padding-left: 18px; margin: 0; } .next { background: var(--accent-50); padding: 6px 10px; border-radius: 6px; color: var(--accent-600); font-weight: 600; }'],
})
export class ServiceHistoryComponent implements OnInit {
  private readonly api = inject(RecordService);
  private readonly vehiclesApi = inject(VehicleService);
  readonly items = signal<ServiceRecord[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly vehicleId = signal('');
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.vehiclesApi.list().subscribe({ next: (p) => this.vehicles.set(p.items), error: () => undefined });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ vehicleId: this.vehicleId(), status: 'finalized', page, limit: 10 }).subscribe({
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
}
