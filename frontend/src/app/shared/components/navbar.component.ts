import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="nav">
      <div class="container bar">
        <a routerLink="/" class="brand" aria-label="AutoCare Pro home"><app-logo /></a>
        <nav class="links" [class.open]="open()" aria-label="Main navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="open.set(false)">Home</a>
          <a routerLink="/services" routerLinkActive="active" (click)="open.set(false)">Services</a>
          <a routerLink="/about" routerLinkActive="active" (click)="open.set(false)">About</a>
          <a routerLink="/contact" routerLinkActive="active" (click)="open.set(false)">Contact</a>
          <span class="sep"></span>
          @if (auth.user(); as u) {
            <a [routerLink]="auth.homeFor(u.role)" class="btn btn-outline-light btn-sm" (click)="open.set(false)"><app-icon name="user" [size]="16" /> My dashboard</a>
          } @else {
            <a routerLink="/login" class="login" (click)="open.set(false)">Sign in</a>
          }
          <a routerLink="/customer/book" class="btn btn-primary btn-sm" (click)="open.set(false)">Book appointment</a>
        </nav>
        <button type="button" class="burger" [attr.aria-expanded]="open()" aria-label="Toggle menu" (click)="open.set(!open())">
          <app-icon [name]="open() ? 'x' : 'menu'" [size]="24" />
        </button>
      </div>
    </header>
  `,
  styles: [`
    .nav { position: sticky; top: 0; z-index: 100; background: rgba(11,27,51,.96); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,.06); }
    .bar { display: flex; align-items: center; justify-content: space-between; height: 68px; }
    .brand { color: #fff; text-decoration: none !important; }
    .links { display: flex; align-items: center; gap: 6px; }
    .links a:not(.btn) { color: #c9d4e5; font-weight: 500; font-size: .95rem; padding: 8px 12px; border-radius: 6px; text-decoration: none; }
    .links a:not(.btn):hover, .links a.active { color: #fff; background: rgba(255,255,255,.07); }
    .links a.active { box-shadow: inset 0 -2px 0 var(--accent); border-radius: 6px 6px 0 0; }
    .sep { width: 1px; height: 22px; background: rgba(255,255,255,.15); margin: 0 6px; }
    .links .btn { margin-left: 4px; }
    .burger { display: none; background: none; border: 0; color: #fff; cursor: pointer; padding: 6px; }
    @media (max-width: 900px) {
      .burger { display: block; }
      .links { display: none; position: absolute; top: 68px; left: 0; right: 0; flex-direction: column; align-items: stretch; background: var(--navy-800); padding: 12px 20px 20px; gap: 4px; border-bottom: 1px solid rgba(255,255,255,.08); }
      .links.open { display: flex; }
      .sep { display: none; }
      .links .btn { margin: 6px 0 0; }
    }
  `],
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly open = signal(false);
}
