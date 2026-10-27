import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AppNotification, PageMeta } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [SpinnerComponent, EmptyStateComponent, PaginationComponent, IconComponent, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Notifications</h1><p>{{ svc.unread() }} unread · In-app notifications. Email/SMS delivery is an optional integration that requires credentials.</p></div>
      <div class="flex">
        <button type="button" class="btn btn-outline btn-sm" [class.btn-dark]="unreadOnly()" (click)="toggleUnread()">{{ unreadOnly() ? 'Show all' : 'Unread only' }}</button>
        <button type="button" class="btn btn-primary btn-sm" [disabled]="svc.unread() === 0" (click)="markAll()"><app-icon name="check" [size]="16" /> Mark all as read</button>
      </div>
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else {
      <div class="card card-flush">
        @for (n of items(); track n.id) {
          <div class="n" [class.unread]="!n.read">
            <span class="ic"><app-icon [name]="icon(n.type)" [size]="18" /></span>
            <div class="body">
              <b>{{ n.title }}</b><p class="small mb-0">{{ n.message }}</p><span class="small muted">{{ n.createdAt | dateTime }}</span>
            </div>
            <div class="acts">
              @if (n.link) { <button type="button" class="btn btn-outline btn-sm" (click)="open(n)">Open</button> }
              @if (!n.read) { <button type="button" class="btn btn-ghost btn-sm" (click)="markRead(n)">Mark read</button> }
              <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete notification" (click)="remove(n)"><app-icon name="trash" [size]="16" /></button>
            </div>
          </div>
        } @empty {
          <app-empty-state icon="bell" title="No notifications" message="Booking, status and invoice updates will appear here." />
        }
      </div>
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
  styles: [`
    .n { display: flex; gap: 14px; padding: 16px 18px; border-bottom: 1px solid var(--border); align-items: flex-start; }
    .n:last-child { border-bottom: 0; }
    .n.unread { background: #fffaf6; } .n.unread b::after { content: ' •'; color: var(--accent); }
    .ic { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-2); color: var(--navy-700); display: grid; place-items: center; flex-shrink: 0; }
    .body { flex: 1; min-width: 0; } .acts { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  `],
})
export class NotificationsComponent implements OnInit {
  protected readonly svc = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly items = signal<AppNotification[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly unreadOnly = signal(false);

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.svc.list({ page, limit: 20, unread: this.unreadOnly() ? 'true' : '' }).subscribe({
      next: (p) => {
        this.items.set(p.items);
        this.meta.set(p.meta);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  toggleUnread(): void {
    this.unreadOnly.set(!this.unreadOnly());
    this.load(1);
  }

  icon(type: string): string {
    if (type.includes('invoice') || type === 'payment') return 'file';
    if (type.includes('cancel')) return 'x';
    if (type.includes('reminder')) return 'clock';
    if (type.includes('review')) return 'star';
    if (type.includes('completed')) return 'check';
    if (type.includes('status') || type === 'assignment') return 'wrench';
    return 'bell';
  }

  /** Links are stored with customer/admin paths; map them to the current user's area. */
  open(n: AppNotification): void {
    if (!n.read) this.markRead(n);
    let link = n.link ?? '/';
    const role = this.auth.role();
    if (role === 'advisor' || role === 'technician') link = link.replace(/^\/(admin|customer)\/appointments/, '/staff/appointments');
    this.router.navigateByUrl(link);
  }

  markRead(n: AppNotification): void {
    this.svc.markRead(n.id).subscribe({ next: () => this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))), error: (e) => this.toast.error(apiErrorMessage(e)) });
  }

  markAll(): void {
    this.svc.markAllRead().subscribe({ next: () => this.items.update((l) => l.map((x) => ({ ...x, read: true }))), error: (e) => this.toast.error(apiErrorMessage(e)) });
  }

  remove(n: AppNotification): void {
    this.svc.remove(n.id).subscribe({
      next: () => {
        this.items.update((l) => l.filter((x) => x.id !== n.id));
        if (!n.read) this.svc.refreshCount();
      },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }
}
