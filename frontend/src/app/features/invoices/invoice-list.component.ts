import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecordService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { PageMeta, ServiceRecord } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe, InrPipe, PaymentStatusPipe } from '../../shared/pipes/pipes';

/** Invoice list for customers (own) and admins (all). */
@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, EmptyStateComponent, PaginationComponent, InrPipe, DateTimePipe, PaymentStatusPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Invoices &amp; receipts</h1><p>Itemised invoices generated from recorded service work.</p></div></div>
    <div class="toolbar">
      <input class="input grow" type="search" placeholder="Search invoice no., reference or vehicle" aria-label="Search" [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="load(1)" />
      <select class="select" aria-label="Payment status" [ngModel]="payment()" (ngModelChange)="payment.set($event); load(1)">
        <option value="">All payment statuses</option><option value="unpaid">Unpaid</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="paid_demo">Paid (demo)</option>
      </select>
      <button type="button" class="btn btn-outline" (click)="load(1)">Search</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (items().length === 0) { <app-empty-state icon="file" title="No invoices yet" message="Invoices are created when a service is completed." /> }
    @else {
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Invoice</th><th>Date</th>@if (isAdmin()) {<th>Customer</th>}<th>Vehicle</th><th class="text-right">Total</th><th>Payment</th><th></th></tr></thead>
        <tbody>
          @for (r of items(); track r.id) {
            <tr>
              <td class="mono">{{ r.invoice?.number }}<br /><span class="small muted">{{ r.appointmentRef }}</span></td>
              <td>{{ r.completedAt | dateTime }}</td>
              @if (isAdmin()) {<td>{{ r.customerName }}</td>}
              <td>{{ r.vehicleSnapshot.brand }} {{ r.vehicleSnapshot.model }}<br /><span class="small muted mono">{{ r.vehicleSnapshot.registrationNumber }}</span></td>
              <td class="text-right"><b>{{ r.total | inr }}</b>@if ((r.invoice?.balance ?? 0) > 0) {<br /><span class="small text-danger">Due {{ r.invoice?.balance | inr }}</span>}</td>
              <td><span class="badge" [class.badge-success]="r.invoice?.paymentStatus === 'paid'" [class.badge-warning]="r.invoice?.paymentStatus === 'unpaid' || r.invoice?.paymentStatus === 'partially_paid'" [class.badge-info]="r.invoice?.paymentStatus === 'paid_demo'">{{ r.invoice?.paymentStatus | paymentStatus }}</span></td>
              <td class="text-right"><a class="btn btn-outline btn-sm" [routerLink]="[base(), r.id]">View / print</a></td>
            </tr>
          }
        </tbody>
      </table></div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class InvoiceListComponent implements OnInit {
  private readonly api = inject(RecordService);
  private readonly auth = inject(AuthService);
  readonly isAdmin = computed(() => this.auth.role() === 'admin');
  readonly base = computed(() => (this.isAdmin() ? '/admin/invoices' : '/customer/invoices'));
  readonly items = signal<ServiceRecord[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly search = signal('');
  readonly payment = signal('');
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.list({ status: 'finalized', search: this.search(), paymentStatus: this.payment(), page, limit: 15 }).subscribe({
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
