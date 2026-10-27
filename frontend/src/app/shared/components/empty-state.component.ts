import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="ic"><app-icon [name]="icon()" [size]="28" /></div>
      <h3>{{ title() }}</h3>
      @if (message()) { <p class="muted">{{ message() }}</p> }
      <ng-content />
    </div>
  `,
  styles: [`
    .empty { text-align: center; padding: 48px 20px; border: 1px dashed #cfd6e0; border-radius: var(--radius); background: #fbfcfe; }
    .ic { width: 60px; height: 60px; border-radius: 50%; background: var(--accent-50); color: var(--accent); display: grid; place-items: center; margin: 0 auto 14px; }
    h3 { margin-bottom: 6px; }
    p { max-width: 420px; margin: 0 auto 16px; }
  `],
})
export class EmptyStateComponent {
  readonly icon = input('info');
  readonly title = input('Nothing here yet');
  readonly message = input('');
}
