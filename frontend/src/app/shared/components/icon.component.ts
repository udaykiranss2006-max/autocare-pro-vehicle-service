import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;

/** Stroke icon set (24x24). */
const ICONS: Record<string, string[]> = {
  wrench: ['M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z'],
  engine: ['M4 10h2V8h4V6h4v2h3l2 2h1v6h-1l-2 2H9l-2-2H6v-2H4z', 'M2 11v4', 'M12 6V4', 'M10 4h4'],
  disc: [c(12, 12, 9), c(12, 12, 3), 'M12 3v3', 'M12 18v3'],
  tyre: [c(12, 12, 9), c(12, 12, 4), 'M12 3v5', 'M12 16v5', 'M3 12h5', 'M16 12h5'],
  battery: ['M4 8h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M21 11v4', 'M11 10l-2 3h4l-2 3'],
  snow: ['M12 2v20', 'M4.9 7l14.2 10', 'M4.9 17L19.1 7', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
  car: ['M5 16l1.5-5a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L19 16', 'M3 16h18v3H3z', c(7, 19, 1.6), c(17, 19, 1.6)],
  scan: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M7 12h3l1.5-3 2 6 1.5-3h2'],
  plus: ['M12 5v14', 'M5 12h14'],
  calendar: ['M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  clock: [c(12, 12, 9), 'M12 7v5l3 2'],
  user: [c(12, 8, 4), 'M4 21a8 8 0 0 1 16 0'],
  users: [c(9, 8, 3.5), 'M2 20a7 7 0 0 1 14 0', 'M16 4.5a3.5 3.5 0 0 1 0 7', 'M18 14a6 6 0 0 1 4 6'],
  bell: ['M6 9a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8', 'M10 21a2 2 0 0 0 4 0'],
  home: ['M3 11l9-7 9 7', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  file: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h6'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
  settings: [c(12, 12, 3), 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  logout: ['M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  check: ['M5 12l5 5L20 7'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  search: [c(11, 11, 7), 'M21 21l-4.3-4.3'],
  phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'],
  mail: ['M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M3 7l9 6 9-6'],
  pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z', c(12, 10, 2.5)],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', c(12, 12, 3)],
  eyeOff: ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9', 'M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  truck: ['M2 6h12v10H2z', 'M14 10h4l3 3v3h-7', c(6, 18, 1.8), c(17, 18, 1.8)],
  tag: ['M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z', c(8, 8, 1.4)],
  building: ['M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17', 'M15 9h4a1 1 0 0 1 1 1v11', 'M8 7h3', 'M8 11h3', 'M8 15h3', 'M2 21h20'],
  message: ['M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  lock: ['M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z', 'M8 10V7a4 4 0 0 1 8 0v3'],
  info: [c(12, 12, 9), 'M12 11v5', 'M12 8h.01'],
  alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17h.01'],
  gauge: ['M3 15a9 9 0 0 1 18 0', 'M12 15l4-5', c(12, 15, 1)],
  rupee: ['M7 4h10', 'M7 9h10', 'M9 4c4 0 5 2.5 5 5s-2 5-6 5h-1l7 6'],
  printer: ['M6 9V3h12v6', 'M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2', 'M6 14h12v7H6z'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 21h16'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: [':host { display: inline-flex; line-height: 0; flex-shrink: 0; }'],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(20);
  readonly stroke = input<number>(1.8);
  readonly paths = computed(() => ICONS[this.name()] ?? ICONS['wrench']);
}
