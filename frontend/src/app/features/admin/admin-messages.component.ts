import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../core/services/data.services';
import { ToastService } from '../../core/services/toast.service';
import { ContactMessage, PageMeta } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { DateTimePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [SpinnerComponent, EmptyStateComponent, PaginationComponent, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Contact messages</h1><p>Messages sent from the public contact form.</p></div></div>
    <div class="tabs">@for (t of tabs; track t.value) { <button type="button" class="tab" [class.active]="status() === t.value" (click)="status.set(t.value); load(1)">{{ t.label }}</button> }</div>
    @if (loading()) { <app-spinner /> }
    @else {
      @for (m of items(); track m.id) {
        <div class="card mb-2">
          <div class="flex between flex-wrap"><b>{{ m.subject }}</b><span class="small muted">{{ m.createdAt | dateTime }}</span></div>
          <p class="small muted mb-1">{{ m.name }} · <a [href]="'mailto:' + m.email">{{ m.email }}</a> @if (m.phone) { · {{ m.phone }} }</p>
          <p class="mb-1" style="white-space:pre-line">{{ m.message }}</p>
          <button type="button" class="btn btn-sm" [class.btn-success]="m.status === 'new'" [class.btn-outline]="m.status !== 'new'" (click)="toggle(m)">{{ m.status === 'new' ? 'Mark handled' : 'Mark as new' }}</button>
        </div>
      } @empty { <app-empty-state icon="message" title="No messages" /> }
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class AdminMessagesComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly tabs = [{ value: 'new', label: 'New' }, { value: 'handled', label: 'Handled' }, { value: '', label: 'All' }];
  readonly status = signal('new');
  readonly items = signal<ContactMessage[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void { this.load(1); }

  load(page: number): void {
    this.loading.set(true);
    this.api.messages({ status: this.status(), page, limit: 20 }).subscribe({ next: (p) => { this.items.set(p.items); this.meta.set(p.meta); this.loading.set(false); }, error: (e) => { this.toast.error(apiErrorMessage(e)); this.loading.set(false); } });
  }

  toggle(m: ContactMessage): void {
    this.api.setMessageStatus(m.id, m.status === 'new' ? 'handled' : 'new').subscribe({ next: () => this.load(this.meta()?.page ?? 1), error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
