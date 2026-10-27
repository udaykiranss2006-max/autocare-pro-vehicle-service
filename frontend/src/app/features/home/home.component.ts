import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { CatalogService, ReviewService, WorkshopService, AdminService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { Offer, PublicSettings, Review, ServiceItem, Workshop } from '../../core/models/models';
import { ServiceCardComponent } from '../../shared/components/service-card.component';
import { IconComponent } from '../../shared/components/icon.component';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { InrPipe, DayPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ServiceCardComponent, IconComponent, StarRatingComponent, SpinnerComponent, InrPipe, DayPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly workshopsApi = inject(WorkshopService);
  private readonly admin = inject(AdminService);
  private readonly settingsApi = inject(SettingsService);

  readonly loading = signal(true);
  readonly popular = signal<ServiceItem[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly avgRating = signal<number | null>(null);
  readonly reviewCount = signal(0);
  readonly offers = signal<Offer[]>([]);
  readonly workshops = signal<Workshop[]>([]);
  readonly serviceCount = signal(0);
  readonly categoryCount = signal(0);
  readonly settings = signal<PublicSettings | null>(null);
  readonly openFaq = signal<number | null>(0);
  readonly loadError = signal(false);

  readonly why = [
    { icon: 'shield', title: 'Transparent estimates', text: 'See a sample estimate before you book. Extra work is done only after your approval.' },
    { icon: 'scan', title: 'Modern diagnostics', text: 'Computerised scans and structured checklists for cars, bikes, SUVs, vans and LCVs.' },
    { icon: 'clock', title: 'Live status tracking', text: 'Follow your vehicle from check-in to completion with in-app notifications.' },
    { icon: 'file', title: 'Digital records', text: 'Every invoice, service record and reminder stays in your account.' },
  ];
  readonly steps = [
    { icon: 'car', title: 'Add your vehicle', text: 'Register your vehicle once with its registration number and odometer reading.' },
    { icon: 'list', title: 'Choose services', text: 'Pick one or more services and see the estimated price and duration.' },
    { icon: 'calendar', title: 'Pick a slot', text: 'Select a workshop, date and an available time slot. Add pickup if needed.' },
    { icon: 'check', title: 'Track & pay', text: 'Get updates as work progresses, then view your itemised invoice.' },
  ];
  readonly faqs = [
    { q: 'Are the prices on the website final?', a: 'No. Prices are sample starting estimates and vary by vehicle type. The final invoice is based on the work performed and parts used, and any additional work is done only after your approval.' },
    { q: 'Is my appointment confirmed as soon as I book?', a: 'Your booking is saved immediately and you receive a reference number. The workshop then confirms it and you are notified in the app.' },
    { q: 'Can I reschedule or cancel?', a: 'Yes, from My Appointments, up to the cutoff time set by the workshop (shown in the cancellation policy).' },
    { q: 'Do you offer pickup and drop-off?', a: 'You can request pickup and drop-off while booking. It is subject to availability and confirmation by the workshop.' },
    { q: 'Which vehicles do you service?', a: 'Cars, motorcycles and scooters, SUVs, vans and light commercial vehicles. Each service lists the vehicle types it supports.' },
    { q: 'How do I pay?', a: 'Online payment is not configured in this installation. Payments are recorded at the workshop counter (cash, card or UPI) and reflected on your invoice.' },
  ];

  ngOnInit(): void {
    const safe = <T>(o: import('rxjs').Observable<T>, fallback: T) => o.pipe(catchError(() => { this.loadError.set(true); return of(fallback); }));
    forkJoin({
      popular: safe(this.catalog.list({ popular: 'true', limit: 6 }), { items: [], meta: { page: 1, limit: 6, total: 0, totalPages: 1 } }),
      all: safe(this.catalog.categories(), []),
      reviews: safe(this.reviewsApi.publicList(6), { items: [], meta: { page: 1, limit: 6, total: 0, totalPages: 1 } }),
      offers: safe(this.admin.offers(), []),
      workshops: safe(this.workshopsApi.list(), []),
      settings: safe(this.settingsApi.publicSettings(), null),
    }).subscribe((r) => {
      this.popular.set(r.popular.items);
      this.serviceCount.set(r.all.reduce((s, c) => s + c.count, 0));
      this.categoryCount.set(r.all.length);
      this.reviews.set(r.reviews.items);
      this.avgRating.set(r.reviews.meta.averageRating ?? null);
      this.reviewCount.set(r.reviews.meta.count ?? r.reviews.items.length);
      this.offers.set(r.offers);
      this.workshops.set(r.workshops);
      this.settings.set(r.settings);
      this.loading.set(false);
    });
  }

  toggleFaq(i: number): void {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  packageLink(o: Offer): string {
    return o.serviceIds.join(',');
  }
}
