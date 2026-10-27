import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../core/services/data.services';
import { ServiceItem, VEHICLE_TYPE_LABELS, VehicleType } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ServiceCardComponent } from '../../shared/components/service-card.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [FormsModule, ServiceCardComponent, SpinnerComponent, EmptyStateComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="banner">
      <img src="assets/images/services-banner.jpg" alt="" />
      <div class="container inner">
        <span class="eyebrow">Service catalog</span>
        <h1>Every service your vehicle needs</h1>
        <p>Search {{ all().length || 'our' }} services across maintenance, repairs, diagnostics and detailing. Prices are sample starting estimates for a car; they adjust for other vehicle types.</p>
      </div>
    </section>
    <section class="section-sm">
      <div class="container">
        <div class="filters card">
          <div class="field grow">
            <label for="svc-search">Search</label>
            <div class="input-group">
              <input id="svc-search" class="input" type="search" placeholder="e.g. brake pads, AC gas, alignment" [ngModel]="search()" (ngModelChange)="search.set($event)" />
              <span class="addon muted"><app-icon name="search" [size]="18" /></span>
            </div>
          </div>
          <div class="field">
            <label for="svc-vt">Vehicle type</label>
            <select id="svc-vt" class="select" [ngModel]="vehicleType()" (ngModelChange)="vehicleType.set($event)">
              <option value="">All vehicles</option>
              @for (v of vehicleTypes; track v.value) { <option [value]="v.value">{{ v.label }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="svc-mode">Booking</label>
            <select id="svc-mode" class="select" [ngModel]="mode()" (ngModelChange)="mode.set($event)">
              <option value="">Any</option>
              <option value="direct">Book directly</option>
              <option value="inspection">Requires inspection</option>
              <option value="request">Requests / enquiries</option>
            </select>
          </div>
          <div class="field">
            <label for="svc-sort">Sort</label>
            <select id="svc-sort" class="select" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
              <option value="category">Category</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
              <option value="duration">Shortest duration</option>
            </select>
          </div>
        </div>
        <div class="chips" role="group" aria-label="Filter by category">
          <button type="button" class="chip" [class.active]="!category()" (click)="setCategory('')">All</button>
          @for (c of categories(); track c) {
            <button type="button" class="chip" [class.active]="category() === c" (click)="setCategory(c)">{{ c }}</button>
          }
        </div>
        <div class="legend small muted">
          <span><span class="badge badge-neutral">Book</span> fixed sample estimate</span>
          <span><span class="badge badge-info">Inspection first</span> final price after workshop inspection</span>
          <span><span class="badge badge-warning">Request</span> handled by staff/partners, subject to confirmation</span>
        </div>
        @if (loading()) {
          <app-spinner label="Loading services…" />
        } @else if (error()) {
          <div class="alert alert-danger">{{ error() }}</div>
        } @else if (filtered().length === 0) {
          <app-empty-state icon="search" title="No matching services" message="Try a different search term or clear the filters.">
            <button type="button" class="btn btn-outline" (click)="reset()">Clear filters</button>
          </app-empty-state>
        } @else {
          <p class="muted small">{{ filtered().length }} service(s)</p>
          <div class="grid grid-3">
            @for (s of filtered(); track s.id) { <app-service-card [service]="s" /> }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .banner { position: relative; background: var(--navy-900); color: #c9d4e5; padding: 72px 0; overflow: hidden; }
    .banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .45; }
    .banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 20%, rgba(7,18,38,.95) 75%); }
    .inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
    .inner h1 { color: #fff; max-width: 560px; } .inner p { max-width: 520px; }
    .filters { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 14px; margin-top: -60px; position: relative; z-index: 2; box-shadow: var(--shadow); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 12px; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 20px; }
    @media (max-width: 900px) { .filters { grid-template-columns: 1fr 1fr; margin-top: -40px; } .inner { align-items: flex-start; text-align: left; } .banner::after { background: rgba(7,18,38,.75); } }
    @media (max-width: 560px) { .filters { grid-template-columns: 1fr; } }
  `],
})
export class ServicesListComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly all = signal<ServiceItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly category = signal('');
  readonly vehicleType = signal('');
  readonly mode = signal('');
  readonly sort = signal('category');
  readonly vehicleTypes = (Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] }));

  readonly categories = computed(() => [...new Set(this.all().map((s) => s.category))]);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.all().filter(
      (s) =>
        (!this.category() || s.category === this.category()) &&
        (!this.vehicleType() || s.vehicleTypes.includes(this.vehicleType() as VehicleType)) &&
        (!this.mode() || s.bookingMode === this.mode()) &&
        (!q || [s.name, s.description, s.category, ...s.inclusions].some((t) => t.toLowerCase().includes(q))),
    );
    const sorters: Record<string, (a: ServiceItem, b: ServiceItem) => number> = {
      category: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      priceAsc: (a, b) => a.priceFrom - b.priceFrom,
      priceDesc: (a, b) => b.priceFrom - a.priceFrom,
      duration: (a, b) => a.durationMinutes - b.durationMinutes,
    };
    return [...list].sort(sorters[this.sort()] ?? sorters['category']);
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.category.set(qp.get('category') ?? '');
    this.search.set(qp.get('q') ?? '');
    this.catalog.list({ limit: 200 }).subscribe({
      next: (p) => {
        this.all.set(p.items);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  setCategory(c: string): void {
    this.category.set(c);
    this.router.navigate([], { queryParams: { category: c || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  reset(): void {
    this.search.set('');
    this.vehicleType.set('');
    this.mode.set('');
    this.setCategory('');
  }
}
