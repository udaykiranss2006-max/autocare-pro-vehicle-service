import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info' | 'warning'; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(type: Toast['type'], message: string, ms = 4500): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), ms);
  }
  success(m: string): void { this.show('success', m); }
  error(m: string): void { this.show('error', m, 7000); }
  info(m: string): void { this.show('info', m); }
  warning(m: string): void { this.show('warning', m, 6000); }
  dismiss(id: number): void { this.toasts.update((t) => t.filter((x) => x.id !== id)); }
}
