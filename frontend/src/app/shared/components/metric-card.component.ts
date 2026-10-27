import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-metric',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metric" [class]="'metric tone-' + tone()">
      <div class="ic"><app-icon [name]="icon()" [size]="20" /></div>
      <div>
        <div class="val">{{ value() }}</div>
        <div class="lbl">{{ label() }}</div>
        @if (hint()) { <div class="hint">{{ hint() }}</div> }
      </div>
    </div>
  `,
  styles: [`
    .metric { display: flex; gap: 14px; align-items: flex-start; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow-sm); height: 100%; }
    .ic { width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; }
    .val { font: 800 1.55rem/1.1 var(--font-display); color: var(--navy-800); }
    .lbl { font-size: .86rem; color: var(--muted); margin-top: 4px; font-weight: 500; }
    .hint { font-size: .78rem; color: var(--muted-2); margin-top: 2px; }
    .tone-navy .ic { background: #e8eef8; color: var(--navy-700); }
    .tone-accent .ic { background: var(--accent-50); color: var(--accent-600); }
    .tone-success .ic { background: var(--success-50); color: var(--success); }
    .tone-warning .ic { background: var(--warning-50); color: var(--warning); }
    .tone-danger .ic { background: var(--danger-50); color: var(--danger); }
    .tone-info .ic { background: var(--info-50); color: var(--info); }
  `],
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('chart');
  readonly tone = input<'navy' | 'accent' | 'success' | 'warning' | 'danger' | 'info'>('navy');
  readonly hint = input('');
}
