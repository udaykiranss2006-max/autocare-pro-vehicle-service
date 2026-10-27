import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { NotificationsComponent } from '../notifications/notifications.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [ReactiveFormsModule, NotificationsComponent, FieldErrorComponent],
  template: `
    <div class="grid grid-2 mb-3" style="align-items:start">
      <form class="card" [formGroup]="form" (ngSubmit)="send()">
        <h3>Send announcement</h3>
        <p class="small muted">Creates an in-app notification for every selected user. Email/SMS delivery is not configured.</p>
        <div class="stack">
          <div class="field"><label for="b-a">Audience</label><select id="b-a" class="select" formControlName="audience"><option value="customers">All customers</option><option value="staff">All staff</option><option value="all">Everyone</option></select></div>
          <div class="field"><label for="b-t">Title</label><input id="b-t" class="input" formControlName="title" /><app-field-error [control]="form.controls.title" label="Title" /></div>
          <div class="field"><label for="b-m">Message</label><textarea id="b-m" class="textarea" rows="3" formControlName="message"></textarea><app-field-error [control]="form.controls.message" label="Message" /></div>
          <button type="submit" class="btn btn-primary" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Send announcement' }}</button>
        </div>
      </form>
      <div class="card">
        <h3>Reminders</h3>
        <p class="small muted">The server automatically creates upcoming-appointment reminders (confirmed bookings today/tomorrow) and maintenance reminders (next service within 7 days). Run the job now:</p>
        <button type="button" class="btn btn-outline" [disabled]="running()" (click)="run()">{{ running() ? 'Running…' : 'Run reminder job now' }}</button>
      </div>
    </div>
    <app-notifications />
  `,
})
export class AdminNotificationsComponent {
  private readonly api = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly sending = signal(false);
  readonly running = signal(false);
  readonly form = this.fb.nonNullable.group({ audience: ['customers'], title: ['', [Validators.required, Validators.minLength(3)]], message: ['', [Validators.required, Validators.minLength(3)]] });

  async send(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!(await this.confirm.confirm({ title: 'Send announcement?', message: `This notifies ${this.form.value.audience}.`, confirmText: 'Send' }))) return;
    this.sending.set(true);
    this.api.broadcast(this.form.getRawValue()).subscribe({ next: (r) => { this.sending.set(false); this.form.reset({ audience: 'customers', title: '', message: '' }); this.toast.success(`Sent to ${r.sent} user(s)`); }, error: (e) => { this.sending.set(false); this.toast.error(apiErrorMessage(e)); } });
  }

  run(): void {
    this.running.set(true);
    this.api.runReminders().subscribe({ next: (r) => { this.running.set(false); this.toast.success(`${r.sent} reminder(s) created`); }, error: (e) => { this.running.set(false); this.toast.error(apiErrorMessage(e)); } });
  }
}
