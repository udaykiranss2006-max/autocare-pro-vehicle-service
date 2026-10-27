import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, AsyncPipe, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="container cols">
        <div>
          <app-logo />
          <p class="about">Vehicle maintenance, repairs and diagnostics with transparent estimates and real-time service tracking.</p>
          @if (settings$ | async; as s) {
            <div class="social" aria-label="Social links">
              @for (k of socialKeys; track k) {
                @if (s.business.social[k]) { <a [href]="s.business.social[k]" target="_blank" rel="noopener noreferrer">{{ k }}</a> }
                @else { <span class="soc-off" title="Configure in Admin > Business Settings">{{ k }}</span> }
              }
            </div>
          }
        </div>
        <div>
          <h4>Explore</h4>
          <a routerLink="/services">All services</a>
          <a routerLink="/about">About us</a>
          <a routerLink="/contact">Contact</a>
          <a routerLink="/terms">Terms &amp; cancellation policy</a>
        </div>
        <div>
          <h4>Your account</h4>
          <a routerLink="/customer/book">Book appointment</a>
          <a routerLink="/customer/appointments">Track my service</a>
          <a routerLink="/register">Create account</a>
          <a routerLink="/login">Sign in</a>
        </div>
        <div>
          <h4>Contact</h4>
          @if (settings$ | async; as s) {
            <p class="ci"><app-icon name="phone" [size]="16" /> {{ s.business.phone }}</p>
            <p class="ci"><app-icon name="mail" [size]="16" /> {{ s.business.email }}</p>
            <p class="ci"><app-icon name="pin" [size]="16" /> {{ s.business.address }}</p>
            @if (s.business.isSampleData) { <p class="sample">Sample contact details - editable by the administrator.</p> }
          }
        </div>
      </div>
      <div class="container bottom">
        <span>© {{ year }} AutoCare Pro. All rights reserved.</span>
        <span>Prices shown are sample estimates in INR.</span>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: var(--navy-900); color: #9fb0c8; padding: 56px 0 0; font-size: .93rem; }
    .cols { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 32px; }
    h4 { color: #fff; margin-bottom: 14px; font-size: .95rem; }
    .cols a { display: block; color: #9fb0c8; padding: 4px 0; }
    .cols a:hover { color: #fff; }
    .about { margin-top: 14px; max-width: 300px; }
    .ci { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 8px; }
    .sample { font-size: .78rem; color: #6f819c; font-style: italic; }
    .social { display: flex; gap: 12px; text-transform: capitalize; }
    .social a { display: inline; }
    .soc-off { color: #52627c; }
    .bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,.08); margin-top: 40px; padding: 18px 20px; font-size: .82rem; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class FooterComponent {
  protected readonly settings$ = inject(SettingsService).publicSettings();
  protected readonly socialKeys = ['facebook', 'instagram', 'x', 'youtube'];
  protected readonly year = new Date().getFullYear();
}
