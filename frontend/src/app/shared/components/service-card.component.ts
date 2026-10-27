import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceItem } from '../../core/models/models';
import { DurationPipe, InrPipe, VehicleTypePipe } from '../pipes/pipes';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [RouterLink, IconComponent, InrPipe, DurationPipe, VehicleTypePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = service();
    <article class="card card-hover svc">
      <div class="head">
        <span class="ic"><app-icon [name]="s.icon" [size]="22" /></span>
        <div class="tags">
          @if (s.popular) { <span class="badge badge-accent">Popular</span> }
          @if (s.bookingMode === 'inspection') { <span class="badge badge-info" title="Final price after workshop inspection">Inspection first</span> }
          @if (s.bookingMode === 'request') { <span class="badge badge-warning" title="Handled as a request, subject to confirmation">Request</span> }
          @if (!s.available) { <span class="badge badge-cancelled">Unavailable</span> }
        </div>
      </div>
      <span class="cat">{{ s.category }}</span>
      <h3><a [routerLink]="['/services', s.slug]">{{ s.name }}</a></h3>
      <p class="desc">{{ s.description }}</p>
      @if (!compact()) {
        <ul class="incl">
          @for (i of s.inclusions.slice(0, 3); track i) { <li><app-icon name="check" [size]="14" /> {{ i }}</li> }
        </ul>
        <div class="types">
          @for (t of s.vehicleTypes; track t) { <span class="vt">{{ t | vehicleType }}</span> }
        </div>
      }
      <div class="foot">
        <div>
          <span class="from">{{ s.priceFrom > 0 ? 'From' : 'Price' }}</span>
          <span class="price">{{ s.priceFrom > 0 ? (s.priceFrom | inr) : 'On enquiry' }}</span>
          <span class="dur"><app-icon name="clock" [size]="13" /> ~{{ s.durationMinutes | duration }}</span>
        </div>
        <a class="btn btn-primary btn-sm" [routerLink]="['/customer/book']" [queryParams]="{ service: s.id }" [attr.aria-disabled]="!s.available">{{ s.bookingMode === 'request' ? 'Request' : 'Book' }}</a>
      </div>
    </article>
  `,
  styles: [`
    .svc { display: flex; flex-direction: column; height: 100%; padding: 20px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .ic { width: 46px; height: 46px; border-radius: 12px; background: var(--navy-800); color: var(--accent); display: grid; place-items: center; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .cat { font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
    h3 { margin: 4px 0 8px; font-size: 1.08rem; }
    h3 a { color: var(--navy-800); }
    .desc { color: var(--muted); font-size: .9rem; margin-bottom: 12px; }
    .incl { list-style: none; padding: 0; margin: 0 0 12px; font-size: .86rem; display: flex; flex-direction: column; gap: 4px; }
    .incl li { display: flex; gap: 6px; align-items: center; color: var(--charcoal); }
    .incl app-icon { color: var(--success); }
    .types { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
    .vt { font-size: .72rem; background: var(--bg-2); color: var(--charcoal); padding: 2px 8px; border-radius: 99px; }
    .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; border-top: 1px solid var(--border); padding-top: 14px; }
    .from { display: block; font-size: .72rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
    .price { display: block; font: 800 1.2rem/1.2 var(--font-display); color: var(--navy-800); }
    .dur { display: inline-flex; gap: 4px; align-items: center; font-size: .8rem; color: var(--muted); }
  `],
})
export class ServiceCardComponent {
  readonly service = input.required<ServiceItem>();
  readonly compact = input(false);
}
