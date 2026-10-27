import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarDatum { label: string; value: number; }

/** Lightweight, dependency-free horizontal or vertical bar chart. */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <p class="muted small">No data yet.</p>
    } @else if (orientation() === 'horizontal') {
      <ul class="h" role="list">
        @for (d of data(); track d.label) {
          <li>
            <span class="lbl" [title]="d.label">{{ d.label }}</span>
            <span class="track"><span class="bar" [style.width.%]="pct(d.value)"></span></span>
            <span class="val">{{ format()(d.value) }}</span>
          </li>
        }
      </ul>
    } @else {
      <div class="v" role="img" [attr.aria-label]="ariaLabel()">
        @for (d of data(); track d.label) {
          <div class="col">
            <span class="val">{{ format()(d.value) }}</span>
            <span class="vtrack"><span class="vbar" [style.height.%]="pct(d.value)"></span></span>
            <span class="lbl">{{ d.label }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .h { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .h li { display: grid; grid-template-columns: minmax(90px, 40%) 1fr auto; gap: 10px; align-items: center; font-size: .88rem; }
    .h .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--charcoal); }
    .track { height: 10px; background: var(--bg-2); border-radius: 99px; overflow: hidden; }
    .bar { display: block; height: 100%; background: linear-gradient(90deg, var(--navy-600), var(--accent)); border-radius: 99px; transition: width .4s var(--ease); }
    .val { font-weight: 700; color: var(--navy-800); font-size: .85rem; }
    .v { display: flex; gap: 8px; align-items: flex-end; height: 200px; }
    .col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
    .vtrack { flex: 1; width: 100%; max-width: 44px; background: var(--bg-2); border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }
    .vbar { width: 100%; background: linear-gradient(0deg, var(--navy-700), var(--accent)); border-radius: 6px 6px 0 0; transition: height .4s var(--ease); min-height: 2px; }
    .col .lbl { font-size: .75rem; color: var(--muted); white-space: nowrap; }
    .col .val { font-size: .75rem; }
  `],
})
export class BarChartComponent {
  readonly data = input<BarDatum[]>([]);
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly format = input<(v: number) => string>((v: number) => String(v));
  readonly ariaLabel = input('Bar chart');
  private readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
  pct(v: number): number {
    return Math.round((v / this.max()) * 100);
  }
}
