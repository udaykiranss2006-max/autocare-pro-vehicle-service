import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_LABELS, AppointmentStatus } from '../../core/models/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge badge-dot" [class]="'badge badge-dot badge-' + status()" role="status">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<AppointmentStatus | string>();
  readonly label = computed(() => STATUS_LABELS[this.status() as AppointmentStatus] ?? this.status());
}
