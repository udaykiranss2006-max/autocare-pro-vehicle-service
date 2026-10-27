import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecordService } from '../../core/services/data.services';
import { PageMeta, ServiceRecord } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe, InrPipe, PaymentStatusPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-records',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, PaginationComponent, InrPipe, DateTimePipe, PaymentStatusPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Service records</h1><p>Work records (draft while in the workshop, finalized on completion), with labour, parts and totals.</p></div></div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Reference, invoice, registration" aria-label="Search" [(ngModel)]="search" (keyup.enter)="load(1)" />
      <select class="select" aria-label="Record status" [(ngModel)]="status" (change)="load(1)"><option value="">All</option><option value="draft">Draft (in workshop)</option><option value="finalized">Finalized</option></select>
      <input class="input" type="date" aria-label="From" [(ngModel)]="from" (change)="load(1)" /><input class="input" type="date" aria-label="To" [(ngModel)]="to" (change)="load(1)" />
      <button type="button" class="btn btn-outline" (click)="load(1)">Apply</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) { <app-empty-state icon="wrench" title="No service records" /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Appointment</th><th>Customer</th><th>Vehicle</th><th>Technician</th><th>Labour / parts</th><th class="text-right">Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (r of items(); track r.id) {
            <tr>
              <td class="mono small">{{ r.appointmentRef }}<br /><span class="muted">{{ (r.completedAt || r.createdAt) | dateTime }}</span></td>
              <td>{{ r.customerName }}</td><td>{{ r.vehicleSnapshot.brand }} {{ r.vehicleSnapshot.model }}<br /><span class="mono small muted">{{ r.vehicleSnapshot.registrationNumber }}</span></td>
              <td>{{ r.technicianName || '—' }}</td><td class="small">{{ r.labourTotal | inr }} / {{ r.partsTotal | inr }}</td><td class="text-right"><b>{{ r.total | inr }}</b></td>
              <td>@if (r.status === 'finalized') { <span class="badge badge-success">{{ r.invoice?.number }}</span><br /><span class="small">{{ r.invoice?.paymentStatus | paymentStatus }}</span> } @else { <span class="badge badge-warning">Draft</span> }</td>
              <td><div class="actions"><a class="btn btn-outline btn-sm" [routerLink]="['/admin/appointments', r.appointmentId]">Work order</a>@if (r.status === 'finalized') { <a class="btn btn-ghost btn-sm" [routerLink]="['/admin/invoices', r.id]">Invoice</a> }</div></td>
            </tr>
          }
        </tbody>
      </table></div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class AdminRecordsComponent implements OnInit {
  private readonly api = inject(RecordService);
  readonly items = signal<ServiceRecord[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  search = '';
  status = '';
  from = '';
  to = '';

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ search: this.search, status: this.status, from: this.from, to: this.to, page, limit: 20 }).subscribe({
      next: (p) => { this.items.set(p.items); this.meta.set(p.meta); this.loading.set(false); },
      error: (e) => { this.error.set(apiErrorMessage(e)); this.loading.set(false); },
    });
  }
}
