import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  /** When set, the user must type a reason (returned via `reason`). */
  requireReason?: boolean;
  reasonLabel?: string;
}
export interface ConfirmState extends ConfirmOptions { resolve: (r: ConfirmResult) => void; }
export interface ConfirmResult { confirmed: boolean; reason: string; }

/** Promise-based confirmation dialog rendered by <app-confirm-dialog> (see AppComponent). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(options: ConfirmOptions): Promise<ConfirmResult> {
    return new Promise((resolve) => this.state.set({ ...options, resolve }));
  }

  async confirm(options: ConfirmOptions): Promise<boolean> {
    return (await this.ask(options)).confirmed;
  }

  close(result: ConfirmResult): void {
    const s = this.state();
    this.state.set(null);
    s?.resolve(result);
  }
}
