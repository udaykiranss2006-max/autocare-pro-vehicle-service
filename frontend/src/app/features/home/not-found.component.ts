import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar.component';
import { FooterComponent } from '../../shared/components/footer.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <section class="section">
      <div class="container text-center">
        <span class="eyebrow">Error 404</span>
        <h1>We couldn't find that page</h1>
        <p class="muted">The link may be broken or the page may have moved.</p>
        <div class="flex" style="justify-content:center">
          <a routerLink="/" class="btn btn-primary">Go home</a>
          <a routerLink="/services" class="btn btn-outline">Browse services</a>
        </div>
      </div>
    </section>
    <app-footer />
  `,
})
export class NotFoundComponent {}
