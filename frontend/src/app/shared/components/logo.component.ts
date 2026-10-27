import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.dark]="dark()">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#f26a1b" />
        <path d="M14 38l6-13a4 4 0 0 1 3.7-2.5h16.6A4 4 0 0 1 44 25l6 13" fill="none" stroke="#0b1b33" stroke-width="4.5" stroke-linecap="round" />
        <rect x="10" y="36" width="44" height="10" rx="4" fill="#0b1b33" />
        <circle cx="20" cy="48" r="4.5" fill="#fff" /><circle cx="44" cy="48" r="4.5" fill="#fff" />
      </svg>
      <span class="word">AutoCare<b>Pro</b></span>
    </span>
  `,
  styles: [`
    .logo { display: inline-flex; align-items: center; gap: 10px; color: #fff; }
    .word { font: 800 1.2rem/1 var(--font-display); letter-spacing: -.02em; }
    .word b { color: var(--accent); margin-left: 2px; }
    .dark { color: var(--navy-800); }
  `],
})
export class LogoComponent {
  readonly dark = input(false);
}
