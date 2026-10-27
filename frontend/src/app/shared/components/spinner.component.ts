import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" [class.inline]="inline()" role="status" aria-live="polite">
      <span class="spin" [style.width.px]="size()" [style.height.px]="size()"></span>
      @if (label()) { <span class="lbl">{{ label() }}</span> }
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px 0; color: var(--muted); }
    .wrap.inline { flex-direction: row; padding: 0; display: inline-flex; gap: 8px; }
    .spin { border: 3px solid rgba(11,27,51,.12); border-top-color: var(--accent); border-radius: 50%; animation: s .8s linear infinite; display: inline-block; }
    .lbl { font-size: .92rem; }
    @keyframes s { to { transform: rotate(360deg); } }
  `],
})
export class SpinnerComponent {
  readonly size = input(32);
  readonly label = input('Loading…');
  readonly inline = input(false);
}
