import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar.component';
import { FooterComponent } from '../../shared/components/footer.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <app-navbar />
    <main id="main" tabindex="-1" style="outline:none"><router-outlet /></main>
    <app-footer />
  `,
})
export class PublicLayoutComponent {}
