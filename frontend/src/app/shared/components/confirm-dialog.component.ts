import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../core/services/confirm.service';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.state(); as s) {
      <app-modal [open]="true" [title]="s.title" [width]="460" (closed)="cancel()">
        <p>{{ s.message }}</p>
        @if (s.requireReason) {
          <div class="field">
            <label for="confirm-reason">{{ s.reasonLabel || 'Reason' }} <span class="req">*</span></label>
            <textarea id="confirm-reason" class="textarea" [(ngModel)]="reason" name="reason" maxlength="500"></textarea>
            @if (touched() && reason.trim().length < 3) { <span class="field-error">Please enter at least 3 characters.</span> }
          </div>
        }
        <div class="form-actions">
          <button type="button" class="btn btn-outline" (click)="cancel()">{{ s.cancelText || 'Cancel' }}</button>
          <button type="button" class="btn" [class.btn-danger]="s.danger" [class.btn-primary]="!s.danger" (click)="ok(!!s.requireReason)">{{ s.confirmText || 'Confirm' }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly svc = inject(ConfirmService);
  protected reason = '';
  protected readonly touched = signal(false);

  cancel(): void {
    this.svc.close({ confirmed: false, reason: '' });
    this.reset();
  }

  ok(requireReason: boolean): void {
    if (requireReason && this.reason.trim().length < 3) {
      this.touched.set(true);
      return;
    }
    this.svc.close({ confirmed: true, reason: this.reason.trim() });
    this.reset();
  }

  private reset(): void {
    this.reason = '';
    this.touched.set(false);
  }
}
