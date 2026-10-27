import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecordService } from '../../core/services/data.services';
import { PageMeta, ServiceRecord } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-completed',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, EmptyStateComponent, PaginationComponent, DateTimePipe, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Completed work</h1><p>Finalized work records you are authorized to see.</p></div></div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) { <app-empty-state icon="check" title="No completed work yet" /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Reference</th><th>Vehicle</th><th>Completed</th><th>Labour</th><th>Parts</th><th class="text-right">Total</th><th></th></tr></thead>
        <tbody>
          @for (r of items(); track r.id) {
            <tr><td class="mono small">{{ r.appointmentRef }}</td><td>{{ r.vehicleSnapshot.brand }} {{ r.vehicleSnapshot.model }}</td><td>{{ r.completedAt | dateTime }}</td>
              <td class="small">{{ hours(r) }} h</td><td class="small">{{ r.parts.length }} item(s)</td><td class="text-right">{{ r.total | inr }}</td>
              <td class="text-right"><a class="btn btn-outline btn-sm" [routerLink]="['/staff/appointments', r.appointmentId]">Open</a></td></tr>
          }
        </tbody>
      </table></div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class StaffCompletedComponent implements OnInit {
  private readonly api = inject(RecordService);
  readonly items = signal<ServiceRecord[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void { this.load(1); }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ status: 'finalized', page, limit: 20 }).subscribe({ next: (p) => { this.items.set(p.items); this.meta.set(p.meta); this.loading.set(false); }, error: (e) => { this.error.set(apiErrorMessage(e)); this.loading.set(false); } });
  }

  hours(r: ServiceRecord): number {
    return r.labourItems.reduce((s, l) => s + l.hours, 0);
  }
}
