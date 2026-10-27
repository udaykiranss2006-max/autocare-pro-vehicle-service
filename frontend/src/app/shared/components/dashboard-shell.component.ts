import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/data.services';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

export interface NavLink { label: string; path: string; icon: string; exact?: boolean; }
export interface NavGroup { title?: string; links: NavLink[]; }

/** Shared dashboard chrome: sidebar navigation, top bar with notifications and user menu. */
@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#dash-main">Skip to content</a>
    <div class="dash" [class.menu-open]="menuOpen()">
      <aside class="dash-sidebar" aria-label="Dashboard navigation">
        <div class="side-top">
          <a routerLink="/" aria-label="Go to website"><app-logo /></a>
          <span class="role">{{ roleLabel() }}</span>
        </div>
        <nav>
          @for (g of groups(); track $index) {
            @if (g.title) { <div class="group">{{ g.title }}</div> }
            @for (l of g.links; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!l.exact }" (click)="menuOpen.set(false)">
                <app-icon [name]="l.icon" [size]="18" /> <span>{{ l.label }}</span>
              </a>
            }
          }
          <button type="button" class="logout" (click)="auth.logout()"><app-icon name="logout" [size]="18" /> <span>Logout</span></button>
        </nav>
      </aside>
      <div class="scrim" (click)="menuOpen.set(false)"></div>
      <div class="dash-body">
        <header class="dash-topbar">
          <button type="button" class="btn btn-ghost btn-icon burger" aria-label="Open menu" (click)="menuOpen.set(true)"><app-icon name="menu" /></button>
          <div class="grow"></div>
          <a [routerLink]="notificationsPath()" class="bell" aria-label="Notifications">
            <app-icon name="bell" [size]="20" />
            @if (notifications.unread() > 0) { <span class="count">{{ notifications.unread() > 99 ? '99+' : notifications.unread() }}</span> }
          </a>
          @if (auth.user(); as u) {
            <a [routerLink]="profilePath()" class="me">
              <span class="avatar">{{ initials(u.fullName) }}</span>
              <span class="hide-mobile"><b>{{ u.fullName }}</b><small>{{ u.email }}</small></span>
            </a>
          }
        </header>
        <main id="dash-main" class="dash-main" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dash { display: flex; min-height: 100vh; }
    .dash-sidebar { width: var(--sidebar); background: var(--navy-800); color: #c6d1e2; position: fixed; inset: 0 auto 0 0; overflow-y: auto; z-index: 50; display: flex; flex-direction: column; }
    .side-top { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,.07); display: flex; flex-direction: column; gap: 10px; }
    .side-top a { text-decoration: none !important; }
    .role { font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); font-weight: 700; }
    nav { padding: 12px 10px 24px; display: flex; flex-direction: column; gap: 2px; }
    .group { font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: #6f819c; padding: 14px 12px 6px; }
    nav a, .logout { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 8px; color: #c6d1e2; font-size: .92rem; font-weight: 500; text-decoration: none !important; background: none; border: 0; cursor: pointer; font-family: inherit; text-align: left; width: 100%; }
    nav a:hover, .logout:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(242,106,27,.14); color: #fff; box-shadow: inset 3px 0 0 var(--accent); }
    .logout { margin-top: 10px; color: #f3a6a6; }
    .dash-body { flex: 1; margin-left: var(--sidebar); min-width: 0; display: flex; flex-direction: column; }
    .dash-topbar { height: 64px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; padding: 0 24px; position: sticky; top: 0; z-index: 40; }
    .grow { flex: 1; }
    .bell { position: relative; color: var(--navy-700); padding: 8px; border-radius: 8px; display: inline-flex; }
    .bell:hover { background: var(--bg-2); }
    .count { position: absolute; top: 2px; right: 0; background: var(--accent); color: #fff; font-size: .68rem; font-weight: 700; border-radius: 99px; padding: 1px 6px; min-width: 18px; text-align: center; }
    .me { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none !important; padding: 4px 8px; border-radius: 8px; }
    .me:hover { background: var(--bg-2); }
    .me b { display: block; font-size: .9rem; } .me small { display: block; color: var(--muted); font-size: .78rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--navy-700); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: .85rem; }
    .dash-main { padding: 28px; max-width: 1400px; width: 100%; outline: none; }
    .burger { display: none; }
    .scrim { display: none; }
    @media (max-width: 960px) {
      .dash-sidebar { transform: translateX(-100%); transition: transform .2s var(--ease); }
      .menu-open .dash-sidebar { transform: none; box-shadow: var(--shadow-lg); }
      .menu-open .scrim { display: block; position: fixed; inset: 0; background: rgba(7,18,38,.45); z-index: 45; }
      .dash-body { margin-left: 0; }
      .burger { display: inline-flex; }
      .dash-main { padding: 18px 14px; }
      .dash-topbar { padding: 0 12px; }
    }
  `],
})
export class DashboardShellComponent implements OnInit, OnDestroy {
  readonly groups = input.required<NavGroup[]>();
  readonly roleLabel = input('Dashboard');
  readonly notificationsPath = input('notifications');
  readonly profilePath = input('profile');
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationService);
  protected readonly menuOpen = signal(false);
  private readonly router = inject(Router);
  private timer?: ReturnType<typeof setInterval>;
  private sub?: Subscription;

  ngOnInit(): void {
    this.notifications.refreshCount();
    this.timer = setInterval(() => this.notifications.refreshCount(), 60000);
    this.sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.notifications.refreshCount());
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.sub?.unsubscribe();
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }
}
