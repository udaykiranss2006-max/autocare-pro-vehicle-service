import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { PublicSettings, Workshop } from '../../core/models/models';
import { WorkshopService } from '../../core/services/data.services';
import { apiErrorDetails, apiErrorMessage } from '../../core/utils/api-error';
import { indianPhone } from '../../shared/validators/validators';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <section class="section">
      <div class="container cols">
        <div>
          <span class="eyebrow">Contact</span>
          <h1>We're here to help</h1>
          <p class="muted">Questions about a service, a quote or an existing appointment? Send us a message and our team will respond.</p>
          @if (settings(); as s) {
            <div class="card mt-3 stack">
              <p class="ci"><app-icon name="phone" /> <span><b>Phone</b><br />{{ s.business.phone }}</span></p>
              <p class="ci"><app-icon name="mail" /> <span><b>Email</b><br />{{ s.business.email }}</span></p>
              <p class="ci"><app-icon name="pin" /> <span><b>Address</b><br />{{ s.business.address }}</span></p>
              @if (s.business.isSampleData) { <div class="alert alert-warning small">Sample contact information. The administrator can replace it in Business Settings.</div> }
            </div>
          }
          <h3 class="mt-3">Business hours</h3>
          @for (w of workshops(); track w.id) {
            <div class="card mb-2">
              <b>{{ w.name }}</b>
              <table class="table small mt-1"><tbody>
                @for (d of days; track d.key) {
                  <tr><td>{{ d.label }}</td><td class="text-right">{{ w.hours[d.key] ? w.hours[d.key]?.open + ' – ' + w.hours[d.key]?.close : 'Closed' }}</td></tr>
                }
              </tbody></table>
            </div>
          }
          @if (mapUrl(); as m) {
            <iframe class="map" [src]="m" title="Workshop location map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          } @else {
            <p class="muted small">Map integration appears here once the administrator adds a Google Maps embed URL.</p>
          }
        </div>
        <form class="card form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h2>Send a message</h2>
          @if (sent()) { <div class="alert alert-success mb-2">{{ sent() }}</div> }
          @if (error()) { <div class="alert alert-danger mb-2">{{ error() }}</div> }
          <div class="form-grid">
            <div class="field"><label for="c-name">Name <span class="req">*</span></label><input id="c-name" class="input" formControlName="name" autocomplete="name" /><app-field-error [control]="form.controls.name" label="Name" /></div>
            <div class="field"><label for="c-email">Email <span class="req">*</span></label><input id="c-email" type="email" class="input" formControlName="email" autocomplete="email" /><app-field-error [control]="form.controls.email" label="Email" /></div>
            <div class="field"><label for="c-phone">Phone</label><input id="c-phone" class="input" formControlName="phone" autocomplete="tel" placeholder="10-digit mobile" /><app-field-error [control]="form.controls.phone" label="Phone" /></div>
            <div class="field"><label for="c-subject">Subject <span class="req">*</span></label><input id="c-subject" class="input" formControlName="subject" /><app-field-error [control]="form.controls.subject" label="Subject" /></div>
            <div class="field full"><label for="c-msg">Message <span class="req">*</span></label><textarea id="c-msg" class="textarea" rows="6" formControlName="message"></textarea><app-field-error [control]="form.controls.message" label="Message" /></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit" [disabled]="submitting()">{{ submitting() ? 'Sending…' : 'Send message' }}</button></div>
        </form>
      </div>
    </section>
  `,
  styles: [`
    .cols { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; align-items: start; }
    .ci { display: flex; gap: 12px; margin: 0; } .ci app-icon { color: var(--accent); margin-top: 2px; }
    .map { width: 100%; height: 280px; border: 0; border-radius: var(--radius); margin-top: 12px; }
    .form { position: sticky; top: 90px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .form { position: static; } }
  `],
})
export class ContactComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly settingsApi = inject(SettingsService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly settings = signal<PublicSettings | null>(null);
  readonly workshops = signal<Workshop[]>([]);
  readonly mapUrl = signal<SafeResourceUrl | null>(null);
  readonly submitting = signal(false);
  readonly sent = signal('');
  readonly error = signal('');
  readonly days = [
    { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' }, { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' }, { key: 'sun', label: 'Sunday' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [indianPhone]],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.settingsApi.publicSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        // Only Google Maps embed URLs are accepted by the backend validator.
        if (s.business.mapEmbedUrl && /^https:\/\/(www\.)?google\.com\/maps\/embed\?/.test(s.business.mapEmbedUrl)) {
          this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(s.business.mapEmbedUrl));
        }
      },
      error: () => undefined,
    });
    this.workshopApi.list().subscribe({ next: (w) => this.workshops.set(w), error: () => undefined });
  }

  submit(): void {
    this.sent.set('');
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.admin.sendContact(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.sent.set(r.message);
        this.toast.success('Message sent');
        this.form.reset();
        this.submitting.set(false);
      },
      error: (e) => {
        const d = apiErrorDetails(e);
        Object.entries(d).forEach(([k, v]) => this.form.get(k)?.setErrors({ server: v }));
        this.error.set(apiErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
