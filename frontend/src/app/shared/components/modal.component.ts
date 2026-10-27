import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="backdrop" (click)="closed.emit()"></div>
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="title()" [style.max-width.px]="width()">
        <header>
          <h3>{{ title() }}</h3>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Close dialog" (click)="closed.emit()"><app-icon name="x" /></button>
        </header>
        <div class="body"><ng-content /></div>
      </div>
    }
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(7,18,38,.55); z-index: 900; animation: f .15s ease; }
    .modal { position: fixed; z-index: 901; left: 50%; top: 50%; transform: translate(-50%,-50%); width: calc(100% - 32px); max-height: calc(100vh - 48px); overflow: auto; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); animation: p .18s var(--ease); }
    header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: #fff; z-index: 1; }
    header h3 { margin: 0; }
    .body { padding: 22px; }
    @keyframes f { from { opacity: 0; } }
    @keyframes p { from { opacity: 0; transform: translate(-50%,-46%); } }
  `],
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly width = input(560);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.closed.emit();
  }
}
