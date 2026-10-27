import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { PublicSettings, ServiceItem, VehicleType } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { BookingModePipe, DurationPipe, InrPipe, VehicleTypePipe } from '../../shared/pipes/pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ServiceCardComponent } from '../../shared/components/service-card.component';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [RouterLink, IconComponent, SpinnerComponent, ServiceCardComponent, InrPipe, DurationPipe, VehicleTypePipe, BookingModePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-spinner label="Loading service…" />
    } @else if (error()) {
      <div class="container section"><div class="alert alert-danger">{{ error() }}</div><a routerLink="/services" class="btn btn-outline mt-2">Back to services</a></div>
    } @else if (svc()) {
      <section class="head">
        <div class="container">
          <nav class="crumbs small" aria-label="Breadcrumb"><a routerLink="/services">Services</a> / <span>{{ svc().category }}</span></nav>
          <div class="hrow">
            <span class="ic"><app-icon [name]="svc().icon" [size]="30" /></span>
            <div>
              <h1>{{ svc().name }}</h1>
              <p>{{ svc().description }}</p>
              <div class="flex flex-wrap">
                <span class="badge" [class.badge-success]="svc().bookingMode === 'direct'" [class.badge-info]="svc().bookingMode === 'inspection'" [class.badge-warning]="svc().bookingMode === 'request'">{{ svc().bookingMode | bookingMode }}</span>
                @if (!svc().available) { <span class="badge badge-cancelled">Currently unavailable</span> }
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="section-sm">
        <div class="container layout">
          <div class="stack">
            <div class="card">
              <h3>What's included</h3>
              <ul class="ticks">@for (i of svc().inclusions; track i) { <li><app-icon name="check" [size]="16" /> {{ i }}</li> }</ul>
              @if (svc().exclusions.length) {
                <h3 class="mt-3">Not included</h3>
                <ul class="ticks ex">@for (i of svc().exclusions; track i) { <li><app-icon name="x" [size]="16" /> {{ i }}</li> }</ul>
              }
            </div>
            <div class="card">
              <h3>Benefits</h3>
              <ul class="ticks">@for (b of svc().benefits; track b) { <li><app-icon name="star" [size]="16" /> {{ b }}</li> }</ul>
            </div>
            <div class="card">
              <h3>Frequently asked questions</h3>
              @for (f of svc().faqs; track f.q) { <div class="faq"><b>{{ f.q }}</b><p class="muted mb-0">{{ f.a }}</p></div> }
            </div>
          </div>
          <aside class="card side">
            <span class="muted small">{{ svc().priceFrom > 0 ? 'Starting estimate (car)' : 'Pricing' }}</span>
            <div class="price">{{ svc().priceFrom > 0 ? (svc().priceFrom | inr) : 'On enquiry' }}</div>
            <p class="muted small">Sample estimate excl. GST. Final price depends on vehicle and work performed.</p>
            @if (settings(); as st) {
              @if (svc().priceFrom > 0) {
                <table class="table small">
                  <tbody>
                    @for (t of svc().vehicleTypes; track t) {
                      <tr><td>{{ t | vehicleType }}</td><td class="text-right"><b>{{ priceFor(s, t, st) | inr }}</b></td></tr>
                    }
                  </tbody>
                </table>
              }
            }
            <p class="flex small mt-2"><app-icon name="clock" [size]="16" /> Estimated duration ~{{ svc().durationMinutes | duration }}</p>
            <p class="flex small"><app-icon name="car" [size]="16" /> {{ svc().vehicleTypes.length }} vehicle type(s) supported</p>
            @if (svc().bookingMode === 'request') { <div class="alert alert-warning small">This is a request. Our team will contact you to confirm availability and charges.</div> }
            @if (svc().bookingMode === 'inspection') { <div class="alert alert-info small">Requires workshop inspection. You approve the final estimate before work starts.</div> }
            <a class="btn btn-primary btn-block btn-lg mt-2" routerLink="/customer/book" [queryParams]="{ service: svc().id }" [attr.aria-disabled]="!svc().available">{{ svc().bookingMode === 'request' ? 'Send request' : 'Book this service' }}</a>
          </aside>
        </div>
      </section>
      @if (related().length) {
        <section class="section-sm">
          <div class="container"><h2>Related services</h2><div class="grid grid-3">@for (r of related(); track r.id) { <app-service-card [service]="r" [compact]="true" /> }</div></div>
        </section>
      }
    }
  `,
  styles: [`
    .head { background: var(--navy-800); color: #c9d4e5; padding: 40px 0 44px; }
    .crumbs a { color: #9fb0c8; } .crumbs { margin-bottom: 18px; }
    .hrow { display: flex; gap: 20px; align-items: flex-start; }
    .ic { width: 64px; height: 64px; border-radius: 16px; background: var(--accent); color: #fff; display: grid; place-items: center; flex-shrink: 0; }
    h1 { color: #fff; font-size: clamp(1.6rem, 3vw, 2.4rem); } .hrow p { max-width: 680px; }
    .layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
    .ticks { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .ticks li { display: flex; gap: 8px; align-items: center; } .ticks app-icon { color: var(--success); } .ex app-icon { color: var(--danger); }
    .faq { padding: 12px 0; border-bottom: 1px solid var(--border); } .faq:last-child { border: 0; }
    .side { position: sticky; top: 88px; }
    .price { font: 800 2rem/1.2 var(--font-display); color: var(--navy-800); margin: 4px 0; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .side { position: static; } }
  `],
})
export class ServiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly settingsApi = inject(SettingsService);
  readonly svc = signal<ServiceItem | null>(null);
  readonly related = signal<ServiceItem[]>([]);
  readonly settings = signal<PublicSettings | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.settingsApi.publicSettings().subscribe({ next: (s) => this.settings.set(s), error: () => undefined });
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug') ?? '';
      this.loading.set(true);
      this.catalog.get(slug).subscribe({
        next: (s) => {
          this.svc.set(s);
          this.loading.set(false);
          this.catalog.list({ category: s.category, limit: 4 }).subscribe((p) => this.related.set(p.items.filter((x) => x.id !== s.id).slice(0, 3)));
        },
        error: (e) => {
          this.error.set(apiErrorMessage(e));
          this.loading.set(false);
        },
      });
    });
  }

  priceFor(s: ServiceItem, t: VehicleType, st: PublicSettings): number {
    return Math.round((s.priceFrom * (st.vehicleTypePriceFactor[t] ?? 1)) / 10) * 10;
  }
}
