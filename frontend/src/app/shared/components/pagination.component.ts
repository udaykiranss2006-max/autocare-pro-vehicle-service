import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PageMeta } from '../../core/models/models';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) {
      @if (m.totalPages > 1) {
        <nav class="pg" aria-label="Pagination">
          <span class="muted small">Page {{ m.page }} of {{ m.totalPages }} · {{ m.total }} records</span>
          <div class="flex gap-sm">
            <button type="button" class="btn btn-outline btn-sm" [disabled]="m.page <= 1" (click)="pageChange.emit(m.page - 1)">Previous</button>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="m.page >= m.totalPages" (click)="pageChange.emit(m.page + 1)">Next</button>
          </div>
        </nav>
      }
    }
  `,
  styles: ['.pg { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }'],
})
export class PaginationComponent {
  readonly meta = input<PageMeta | null>(null);
  readonly pageChange = output<number>();
}
