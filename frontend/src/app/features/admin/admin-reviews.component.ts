import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageMeta, Review } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { DateTimePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, EmptyStateComponent, PaginationComponent, StarRatingComponent, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><div><h1>Reviews &amp; feedback</h1><p>Approve reviews to publish them on the home page. Only customers with completed services can submit reviews.</p></div></div>
    <div class="tabs">
      @for (t of tabs; track t.value) { <button type="button" class="tab" [class.active]="status === t.value" (click)="status = t.value; load(1)">{{ t.label }}</button> }
    </div>
    @if (loading()) { <app-spinner /> }
    @else if (items().length === 0) { <app-empty-state icon="star" title="No reviews here" /> }
    @else {
      @for (r of items(); track r.id) {
        <div class="card mb-2">
          <div class="flex between flex-wrap">
            <div class="flex"><app-stars [value]="r.rating" /><b>{{ r.customerName }}</b><span class="small muted">· {{ r.appointmentRef }} · {{ r.createdAt | dateTime }}</span>@if (r.edited) { <span class="badge badge-neutral">edited</span> }</div>
            <span class="badge" [class.badge-success]="r.status === 'approved'" [class.badge-warning]="r.status === 'pending'" [class.badge-danger]="r.status === 'rejected'">{{ r.status }}</span>
          </div>
          <p class="mt-1 mb-1">{{ r.comment }}</p>
          <p class="small muted">{{ r.serviceNames.join(', ') }} · {{ r.vehicleLabel }}</p>
          <div class="field"><label class="small" [for]="'resp-' + r.id">Public response (optional)</label><input [id]="'resp-' + r.id" class="input" [(ngModel)]="responses[r.id]" maxlength="500" /></div>
          <div class="flex flex-wrap mt-1">
            <button type="button" class="btn btn-success btn-sm" (click)="moderate(r, 'approved')">Approve</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="moderate(r, 'rejected')">Reject</button>
            <button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(r)">Delete</button>
          </div>
        </div>
      }
      <app-pagination [meta]="meta()" (pageChange)="load($event)" />
    }
  `,
})
export class AdminReviewsComponent implements OnInit {
  private readonly api = inject(ReviewService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly tabs = [{ value: 'pending', label: 'Awaiting moderation' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: '', label: 'All' }];
  readonly items = signal<Review[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  status = 'pending';
  responses: Record<string, string> = {};

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.adminList({ status: this.status, page, limit: 20 }).subscribe({
      next: (p) => {
        this.items.set(p.items);
        this.meta.set(p.meta);
        this.responses = Object.fromEntries(p.items.map((r) => [r.id, r.adminResponse ?? '']));
        this.loading.set(false);
      },
      error: (e) => { this.toast.error(apiErrorMessage(e)); this.loading.set(false); },
    });
  }

  moderate(r: Review, status: 'approved' | 'rejected'): void {
    this.api.moderate(r.id, { status, adminResponse: this.responses[r.id] }).subscribe({
      next: () => { this.toast.success(`Review ${status}`); this.load(this.meta()?.page ?? 1); },
      error: (e) => this.toast.error(apiErrorMessage(e)),
    });
  }

  async remove(r: Review): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete review?', message: 'This permanently deletes the review.', danger: true, confirmText: 'Delete' }))) return;
    this.api.remove(r.id).subscribe({ next: () => { this.toast.success('Review deleted'); this.load(1); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
