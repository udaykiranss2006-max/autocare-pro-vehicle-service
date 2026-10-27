import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { RecordService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { InvoiceView } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { IconComponent } from '../../shared/components/icon.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { DateTimePipe, DayPipe, InrPipe, PaymentStatusPipe } from '../../shared/pipes/pipes';

/** Printable invoice. Payment recording is for advisors/admins; demo payments are clearly labelled. */
@Component({
  selector: 'app-invoice-view',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, ModalComponent, IconComponent, LogoComponent, InrPipe, DayPipe, DateTimePipe, PaymentStatusPipe],
  template: `
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else if (v()) {
      <div class="flex between no-print mb-2 flex-wrap">
        <button type="button" class="btn btn-ghost" (click)="back()">← Back</button>
        <div class="flex">
          @if (canRecordPayment() && (v().record.invoice?.balance ?? 0) > 0) { <button type="button" class="btn btn-outline" (click)="payOpen.set(true)"><app-icon name="rupee" [size]="16" /> Record payment</button> }
          <button type="button" class="btn btn-primary" (click)="print()"><app-icon name="printer" [size]="16" /> Print / Save PDF</button>
        </div>
      </div>
      <article class="card print-area inv">
        <header class="ih">
          <div><app-logo [dark]="true" /><p class="small muted mt-1 mb-0">{{ v().workshop?.name || v().business.name }}<br />{{ v().workshop?.address || v().business.address }}<br />{{ v().workshop?.phone || v().business.phone }} · {{ v().business.email }}</p>
            @if (v().business.isSampleData) { <p class="small sample">Sample business details</p> }</div>
          <div class="text-right"><h1>Tax invoice</h1><p class="mono mb-0"><b>{{ v().record.invoice?.number }}</b></p><p class="small muted">Issued {{ v().record.invoice?.issuedAt | dateTime }}</p>
            <span class="badge" [class.badge-success]="v().record.invoice?.paymentStatus === 'paid'" [class.badge-warning]="v().record.invoice?.paymentStatus === 'unpaid' || v().record.invoice?.paymentStatus === 'partially_paid'" [class.badge-info]="v().record.invoice?.paymentStatus === 'paid_demo'">{{ v().record.invoice?.paymentStatus | paymentStatus }}</span></div>
        </header>
        <section class="parties">
          <div><h4>Billed to</h4><p class="small mb-0"><b>{{ v().customer?.fullName }}</b><br />{{ v().customer?.email }}<br />{{ v().customer?.phone }}@if (v().customer?.address) {<br />{{ v().customer?.address }}}</p></div>
          <div><h4>Vehicle</h4><p class="small mb-0"><b>{{ v().record.vehicleSnapshot.brand }} {{ v().record.vehicleSnapshot.model }}</b><br /><span class="mono">{{ v().record.vehicleSnapshot.registrationNumber }}</span><br />Odometer: {{ v().record.odometerAtService.toLocaleString('en-IN') }} km</p></div>
          <div><h4>Service</h4><p class="small mb-0">Ref <span class="mono">{{ v().record.appointmentRef }}</span><br />Completed {{ v().record.completedAt | dateTime }}<br />Technician: {{ v().record.technicianName || '-' }}</p></div>
        </section>
        <h4>Services performed</h4>
        <p class="small">{{ servicesText() }}</p>
        <table class="table">
          <thead><tr><th>Description</th><th class="text-right">Qty / hrs</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
          <tbody>
            @if (v().record.labourItems.length) { <tr class="grp"><td colspan="4">Labour</td></tr> }
            @for (l of v().record.labourItems; track $index) { <tr><td>{{ l.description }}</td><td class="text-right">{{ l.hours }} h</td><td class="text-right">{{ l.rate | inr }}</td><td class="text-right">{{ l.amount | inr }}</td></tr> }
            @if (v().record.parts.length) { <tr class="grp"><td colspan="4">Parts &amp; materials</td></tr> }
            @for (p of v().record.parts; track $index) { <tr><td>{{ p.name }}@if (p.partNumber) { <span class="muted small">({{ p.partNumber }})</span> }</td><td class="text-right">{{ p.quantity }}</td><td class="text-right">{{ p.unitPrice | inr }}</td><td class="text-right">{{ p.amount | inr }}</td></tr> }
          </tbody>
        </table>
        <div class="totals">
          <div><span>Labour</span><span>{{ v().record.labourTotal | inr }}</span></div>
          <div><span>Parts &amp; materials</span><span>{{ v().record.partsTotal | inr }}</span></div>
          <div><span>Subtotal</span><span>{{ v().record.subtotal | inr }}</span></div>
          @if (v().record.discount.amount > 0) { <div class="text-success"><span>Discount{{ v().record.discount.reason ? ' (' + v().record.discount.reason + ')' : '' }}</span><span>− {{ v().record.discount.amount | inr }}</span></div> }
          <div><span>{{ v().tax.label }} ({{ v().record.taxPercent }}%)</span><span>{{ v().record.taxAmount | inr }}</span></div>
          <div class="grand"><span>Total</span><span>{{ v().record.total | inr }}</span></div>
          <div><span>Amount paid</span><span>{{ v().record.invoice?.amountPaid | inr }}</span></div>
          <div><b>Balance due</b><b>{{ v().record.invoice?.balance | inr }}</b></div>
        </div>
        @if (v().record.invoice?.payments?.length) {
          <h4 class="mt-3">Payments</h4>
          <table class="table small"><tbody>
            @for (p of v().record.invoice?.payments ?? []; track p.id) {
              <tr><td>{{ p.recordedAt | dateTime }}</td><td>{{ methodLabel(p.method) }} @if (p.isDemo) { <span class="badge badge-warning">DEMO</span> }</td><td>{{ p.verification }}</td><td class="text-right">{{ p.amount | inr }}</td></tr>
            }
          </tbody></table>
        }
        @if (v().record.technicianNotes) { <h4 class="mt-3">Technician notes</h4><p class="small">{{ v().record.technicianNotes }}</p> }
        @if (v().record.nextServiceDate || v().record.nextServiceOdometer) { <p class="small"><b>Next recommended service:</b> {{ v().record.nextServiceDate ? (v().record.nextServiceDate | day) : '' }} {{ v().record.nextServiceOdometer ? 'or at ' + v().record.nextServiceOdometer.toLocaleString('en-IN') + ' km' : '' }}</p> }
        <footer class="small muted mt-3">{{ v().paymentNote }} This invoice was generated by AutoCare Pro from recorded service items.</footer>
      </article>

      <app-modal [open]="payOpen()" title="Record payment" [width]="480" (closed)="payOpen.set(false)">
        <form [formGroup]="pay" (ngSubmit)="recordPayment()">
          <div class="alert alert-warning small mb-2">No payment gateway is configured. Record only payments you have actually received at the counter. "Demo" creates a clearly labelled demo entry; no money moves.</div>
          <div class="form-grid">
            <div class="field"><label for="p-m">Method</label><select id="p-m" class="select" formControlName="method"><option value="cash">Cash</option><option value="card_at_counter">Card at counter</option><option value="upi_at_counter">UPI at counter</option><option value="demo">DEMO (no real payment)</option></select></div>
            <div class="field"><label for="p-a">Amount (₹)</label><input id="p-a" type="number" class="input" formControlName="amount" min="1" [max]="v().record.invoice?.balance ?? 0" /></div>
            <div class="field full"><label for="p-r">Reference (UPI txn / receipt no.)</label><input id="p-r" class="input" formControlName="reference" maxlength="80" /></div>
          </div>
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="payOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="pay.invalid || paying()">{{ paying() ? 'Saving…' : 'Record payment' }}</button></div>
        </form>
      </app-modal>
    }
  `,
  styles: [`
    .inv { max-width: 900px; margin: 0 auto; padding: 32px; }
    .ih { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid var(--navy-800); padding-bottom: 18px; margin-bottom: 18px; }
    .ih h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .sample { color: var(--warning); font-style: italic; margin: 4px 0 0; }
    .parties { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 18px; }
    h4 { font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-bottom: 6px; }
    .grp td { background: #f8fafc; font-weight: 700; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
    .totals { margin-left: auto; max-width: 340px; margin-top: 14px; display: flex; flex-direction: column; gap: 6px; font-size: .95rem; }
    .totals div { display: flex; justify-content: space-between; gap: 20px; }
    .grand { border-top: 2px solid var(--navy-800); padding-top: 8px; font: 800 1.2rem var(--font-display); color: var(--navy-800); }
    @media (max-width: 700px) { .parties { grid-template-columns: 1fr; } .ih { flex-direction: column; } .ih .text-right { text-align: left; } .inv { padding: 18px; } }
  `],
})
export class InvoiceViewComponent implements OnInit {
  private readonly api = inject(RecordService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly v = signal<InvoiceView | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly payOpen = signal(false);
  readonly paying = signal(false);
  readonly canRecordPayment = computed(() => ['admin', 'advisor'].includes(this.auth.role() ?? ''));
  readonly pay = this.fb.nonNullable.group({ method: ['cash', Validators.required], amount: [0, [Validators.required, Validators.min(1)]], reference: [''] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.invoice(this.route.snapshot.paramMap.get('id') ?? '').subscribe({
      next: (v) => {
        this.v.set(v);
        this.pay.controls.amount.setValue(v.record.invoice?.balance ?? 0);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  servicesText(): string {
    return this.v()?.record.servicesPerformed.map((s) => s.name).join(', ') ?? '';
  }

  methodLabel(m: string): string {
    return ({ cash: 'Cash', card_at_counter: 'Card at counter', upi_at_counter: 'UPI at counter', demo: 'Demo mode' } as Record<string, string>)[m] ?? m;
  }

  print(): void {
    window.print();
  }

  back(): void {
    this.location.back();
  }

  recordPayment(): void {
    const v = this.v();
    if (!v || this.pay.invalid) return;
    this.paying.set(true);
    const body = this.pay.getRawValue();
    this.api.recordPayment(v.record.id, { ...body, amount: Number(body.amount) }).subscribe({
      next: () => {
        this.paying.set(false);
        this.payOpen.set(false);
        this.toast.success(body.method === 'demo' ? 'Demo payment recorded (no real money)' : 'Payment recorded');
        this.load();
      },
      error: (e) => {
        this.paying.set(false);
        this.toast.error(apiErrorMessage(e));
      },
    });
  }
}
