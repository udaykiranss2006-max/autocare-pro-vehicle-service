import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-stars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="stars" [class.editable]="editable()" [attr.role]="editable() ? 'radiogroup' : 'img'" [attr.aria-label]="'Rating ' + value() + ' of 5'">
      @for (n of [1, 2, 3, 4, 5]; track n) {
        @if (editable()) {
          <button type="button" [class.on]="n <= value()" [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')" [attr.aria-checked]="n === value()" role="radio" (click)="changed.emit(n)">★</button>
        } @else {
          <span [class.on]="n <= value()">★</span>
        }
      }
    </span>
  `,
  styles: [`
    .stars { display: inline-flex; gap: 2px; font-size: 1.05rem; line-height: 1; }
    .stars span, .stars button { color: #d4d9e1; }
    .stars .on { color: #f5a524; }
    .editable button { background: none; border: 0; font-size: 1.8rem; cursor: pointer; padding: 2px; transition: transform .1s; }
    .editable button:hover { transform: scale(1.15); }
  `],
})
export class StarRatingComponent {
  readonly value = input(0);
  readonly editable = input(false);
  readonly changed = output<number>();
}
