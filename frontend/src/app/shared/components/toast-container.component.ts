import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast t-' + t.type" role="alert">
          <app-icon [name]="t.type === 'success' ? 'check' : t.type === 'error' ? 'alert' : 'info'" [size]="18" />
          <span>{{ t.message }}</span>
          <button type="button" aria-label="Dismiss" (click)="toast.dismiss(t.id)"><app-icon name="x" [size]="16" /></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; right: 16px; bottom: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; max-width: min(420px, calc(100vw - 32px)); }
    .toast { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; background: var(--navy-800); color: #fff; box-shadow: var(--shadow-lg); font-size: .93rem; animation: in .2s var(--ease); border-left: 4px solid var(--accent); }
    .t-success { border-left-color: #22c55e; } .t-error { border-left-color: #ef4444; } .t-warning { border-left-color: #f59e0b; } .t-info { border-left-color: #60a5fa; }
    .toast span { flex: 1; }
    button { background: none; border: 0; color: #cbd5e1; cursor: pointer; padding: 0; }
    @keyframes in { from { opacity: 0; transform: translateY(8px); } }
  `],
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);
}
