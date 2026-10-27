import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/data.services';
import { ToastService } from '../../core/services/toast.service';
import { ReportSummary, STATUS_LABELS } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, downloadBlob, todayIn } from '../../core/utils/date';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { BarChartComponent, BarDatum } from '../../shared/components/bar-chart.component';
import { IconComponent } from '../../shared/components/icon.component';
import { InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, MetricCardComponent, BarChartComponent, IconComponent, InrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Reports &amp; analytics</h1><p>Daily, weekly and monthly summaries calculated from bookings and finalized invoices.</p></div></div>
    <div class="card mb-3">
      <div class="toolbar mb-0">
        <div class="field"><label for="r-p">Period</label><select id="r-p" class="select" [(ngModel)]="period"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
        <div class="field"><label for="r-f">From</label><input id="r-f" type="date" class="input" [(ngModel)]="from" /></div>
        <div class="field"><label for="r-t">To</label><input id="r-t" type="date" class="input" [(ngModel)]="to" /></div>
        <div class="field"><span class="label">&nbsp;</span><button type="button" class="btn btn-primary" (click)="load()">Run report</button></div>
        <div class="grow"></div>
        <div class="field"><label for="r-x">Export CSV</label>
          <div class="flex"><select id="r-x" class="select" [(ngModel)]="exportType"><option value="appointments">Appointments</option><option value="revenue">Revenue / invoices</option><option value="customers">New customers</option></select>
          @if (exportType === 'appointments') { <select class="select" aria-label="Status filter" [(ngModel)]="exportStatus"><option value="">All statuses</option>@for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }</select> }
          <button type="button" class="btn btn-outline" [disabled]="exporting()" (click)="exportCsv()"><app-icon name="download" [size]="16" /> CSV</button></div>
        </div>
      </div>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (r()) {
      <div class="stat-grid">
        <app-metric label="Bookings" [value]="r().totals.bookings" icon="calendar" />
        <app-metric label="Completed" [value]="r().totals.completed" icon="check" tone="success" />
        <app-metric label="Cancelled" [value]="r().totals.cancelled" icon="x" tone="danger" />
        <app-metric label="Invoiced revenue" [value]="(r().totals.revenue | inr)" icon="rupee" tone="accent" />
        <app-metric label="Recorded payments" [value]="(r().totals.paymentsRecorded | inr)" icon="file" tone="info" hint="excludes demo payments" />
        <app-metric label="Average invoice" [value]="(r().totals.averageInvoice | inr)" icon="chart" />
      </div>
      <div class="grid grid-2">
        <div class="card"><h3>Bookings per {{ unit() }}</h3><app-bar-chart [data]="bookingBars()" orientation="vertical" ariaLabel="Bookings per period" /></div>
        <div class="card"><h3>Revenue per {{ unit() }}</h3><app-bar-chart [data]="revenueBars()" orientation="vertical" [format]="fmt" ariaLabel="Revenue per period" /></div>
        <div class="card"><h3>Top services</h3><app-bar-chart [data]="topBars()" /></div>
        <div class="card"><h3>Bookings by workshop</h3><app-bar-chart [data]="workshopBars()" /></div>
      </div>
      <div class="table-wrap mt-3"><table class="table">
        <thead><tr><th>Period</th><th class="text-right">Bookings</th><th class="text-right">Completed</th><th class="text-right">Cancelled</th><th class="text-right">Revenue</th><th class="text-right">Payments recorded</th></tr></thead>
        <tbody>@for (row of r().rows; track row.period) { <tr><td>{{ row.period }}</td><td class="text-right">{{ row.bookings }}</td><td class="text-right">{{ row.completed }}</td><td class="text-right">{{ row.cancelled }}</td><td class="text-right">{{ row.revenue | inr }}</td><td class="text-right">{{ row.paymentsRecorded | inr }}</td></tr> } @empty { <tr><td colspan="6" class="muted">No data in this range.</td></tr> }</tbody>
      </table></div>
    }
  `,
})
export class AdminReportsComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly statuses = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  readonly r = signal<ReportSummary | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal('');
  period = 'daily';
  to = todayIn();
  from = addDays(this.to, -29);
  exportType = 'appointments';
  exportStatus = '';
  private readonly inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  readonly fmt = (v: number) => this.inr.format(v);
  readonly unit = computed(() => ({ daily: 'day', weekly: 'week', monthly: 'month' })[this.r()?.period as 'daily' | 'weekly' | 'monthly'] ?? 'period');
  readonly bookingBars = computed<BarDatum[]>(() => (this.r()?.rows ?? []).slice(-14).map((x) => ({ label: this.short(x.period), value: x.bookings })));
  readonly revenueBars = computed<BarDatum[]>(() => (this.r()?.rows ?? []).slice(-14).map((x) => ({ label: this.short(x.period), value: x.revenue })));
  readonly topBars = computed<BarDatum[]>(() => (this.r()?.topServices ?? []).map((x) => ({ label: x.name, value: x.count })));
  readonly workshopBars = computed<BarDatum[]>(() => (this.r()?.byWorkshop ?? []).map((x) => ({ label: x.name, value: x.count })));

  ngOnInit(): void { this.load(); }

  short(p: string): string {
    return p.replace('Week of ', 'wk ').replace(/^\d{4}-/, '');
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.report({ period: this.period, from: this.from, to: this.to }).subscribe({ next: (r) => { this.r.set(r); this.loading.set(false); }, error: (e) => { this.error.set(apiErrorMessage(e)); this.loading.set(false); } });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.api.exportCsv({ type: this.exportType, from: this.from, to: this.to, status: this.exportType === 'appointments' ? this.exportStatus : '' }).subscribe({
      next: (blob) => { this.exporting.set(false); downloadBlob(blob, `${this.exportType}_${this.from}_${this.to}.csv`); this.toast.success('CSV downloaded'); },
      error: (e) => { this.exporting.set(false); this.toast.error(apiErrorMessage(e)); },
    });
  }
}
