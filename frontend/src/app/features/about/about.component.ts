import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="page-hero">
      <div class="container">
        <span class="eyebrow">About AutoCare Pro</span>
        <h1>Honest, organised vehicle care</h1>
        <p>AutoCare Pro is a vehicle service management platform for workshops that want to serve customers transparently and efficiently.</p>
      </div>
    </section>
    <section class="section">
      <div class="container two">
        <img src="assets/images/about-technician.jpg" alt="Technician using a diagnostic tablet on an SUV" class="ph" />
        <div>
          <h2>Who we are</h2>
          <p class="muted">We help car, motorcycle, SUV, van and light-commercial-vehicle owners keep their vehicles safe and dependable. From periodic maintenance to diagnostics and bodywork, every job follows a documented process: inspection, estimate, your approval, work, quality check and a clear invoice.</p>
          <div class="grid grid-2 mt-3">
            <div class="card"><h3><app-icon name="tag" /> Mission</h3><p class="muted mb-0">Make vehicle care predictable and stress-free with transparent estimates, clear communication and quality workmanship.</p></div>
            <div class="card"><h3><app-icon name="eye" /> Vision</h3><p class="muted mb-0">A trusted neighbourhood workshop experience with the convenience of a modern digital service desk.</p></div>
          </div>
        </div>
      </div>
    </section>
    <section class="section section-dark">
      <div class="container">
        <div class="section-head"><h2>What you can expect</h2></div>
        <div class="grid grid-3">
          @for (p of pillars; track p.title) {
            <div class="pillar"><app-icon [name]="p.icon" [size]="26" /><h3>{{ p.title }}</h3><p>{{ p.text }}</p></div>
          }
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container text-center">
        <h2>Customer satisfaction, measured honestly</h2>
        <p class="muted" style="max-width:640px;margin:0 auto 24px">Customers can rate every completed service. Reviews are moderated for abuse only and published on our home page, together with the live average rating.</p>
        <div class="flex" style="justify-content:center"><a routerLink="/services" class="btn btn-primary">Explore services</a><a routerLink="/contact" class="btn btn-outline">Talk to us</a></div>
      </div>
    </section>
  `,
  styles: [`
    .page-hero { background: var(--navy-800); color: #c9d4e5; padding: 64px 0; }
    .page-hero h1 { color: #fff; } .page-hero p { max-width: 620px; font-size: 1.08rem; }
    .two { display: grid; grid-template-columns: 1fr 1.1fr; gap: 48px; align-items: center; }
    .ph { border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); aspect-ratio: 4/3; object-fit: cover; }
    .card h3 { display: flex; gap: 8px; align-items: center; } .card h3 app-icon { color: var(--accent); }
    .pillar { background: var(--navy-700); border-radius: var(--radius); padding: 24px; border: 1px solid rgba(255,255,255,.07); }
    .pillar app-icon { color: var(--accent); } .pillar h3 { margin: 12px 0 6px; } .pillar p { color: #b6c3d8; margin: 0; font-size: .94rem; }
    @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
  `],
})
export class AboutComponent {
  readonly pillars = [
    { icon: 'shield', title: 'Service quality', text: 'Checklists for every job, final quality checks and road tests where applicable.' },
    { icon: 'wrench', title: 'Technician expertise', text: 'Technicians are assigned by specialisation: engine, brakes and tyres, electrical and AC, bodywork.' },
    { icon: 'file', title: 'Clear paperwork', text: 'Itemised invoices with labour, parts, discounts and GST, plus your complete service history.' },
    { icon: 'bell', title: 'Proactive updates', text: 'Booking, confirmation, progress and completion updates arrive as in-app notifications.' },
    { icon: 'calendar', title: 'Fair scheduling', text: 'Real slot capacity per workshop so your booking is not overbooked.' },
    { icon: 'star', title: 'Accountability', text: 'Verified reviews only from customers whose service was completed.' },
  ];
}
