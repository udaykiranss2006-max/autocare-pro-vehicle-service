import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <section class="section">
      <div class="container" style="max-width:820px">
        <span class="eyebrow">Policies</span>
        <h1>Terms, cancellation &amp; privacy</h1>
        <p class="alert alert-info">This is sample policy text for a college/demo deployment. Replace it with terms reviewed by your business before going live.</p>
        @if (settings$ | async; as s) {
          <h3 class="mt-3">Cancellation &amp; rescheduling</h3>
          <p>{{ s.booking.cancellationPolicy }}</p>
          <ul>
            <li>Online cancellation closes {{ s.booking.cancellationCutoffHours }} hours before the appointment.</li>
            <li>Online rescheduling closes {{ s.booking.rescheduleCutoffHours }} hours before the appointment, up to {{ s.booking.maxReschedules }} times per booking.</li>
          </ul>
          <h3>Estimates &amp; invoices</h3>
          <p>All prices shown online are sample estimates in Indian Rupees and vary by vehicle type. {{ s.tax.label }} at {{ s.tax.gstPercent }}% is added. The final invoice reflects work actually performed and parts used; additional work is carried out only with your approval.</p>
          <h3>Payments</h3>
          <p>{{ s.payment.note }}</p>
        }
        <h3>Pickup, drop-off and assistance requests</h3>
        <p>Pickup/drop-off, roadside and breakdown assistance are requests handled subject to availability and confirmation. For emergencies involving injury or danger, contact local emergency services first.</p>
        <h3>Your data</h3>
        <p>We store the information you provide (name, contact details, vehicles, appointments and invoices) to deliver services. Passwords are stored only as secure hashes. You can update your profile at any time.</p>
      </div>
    </section>
  `,
})
export class TermsComponent {
  protected readonly settings$ = inject(SettingsService).publicSettings();
}
