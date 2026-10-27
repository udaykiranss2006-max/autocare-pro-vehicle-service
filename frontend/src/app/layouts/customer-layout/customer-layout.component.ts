import { Component } from '@angular/core';
import { DashboardShellComponent, NavGroup } from '../../shared/components/dashboard-shell.component';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `<app-dashboard-shell [groups]="groups" roleLabel="Customer" notificationsPath="/customer/notifications" profilePath="/customer/profile" />`,
})
export class CustomerLayoutComponent {
  readonly groups: NavGroup[] = [
    { links: [{ label: 'Overview', path: '/customer', icon: 'home', exact: true }] },
    {
      title: 'Service',
      links: [
        { label: 'Book Appointment', path: '/customer/book', icon: 'calendar' },
        { label: 'My Appointments', path: '/customer/appointments', icon: 'list' },
        { label: 'My Vehicles', path: '/customer/vehicles', icon: 'car' },
        { label: 'Service History', path: '/customer/history', icon: 'clock' },
        { label: 'Invoices & Receipts', path: '/customer/invoices', icon: 'file' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Notifications', path: '/customer/notifications', icon: 'bell' },
        { label: 'Reviews & Ratings', path: '/customer/reviews', icon: 'star' },
        { label: 'My Profile', path: '/customer/profile', icon: 'user' },
        { label: 'Change Password', path: '/customer/change-password', icon: 'lock' },
      ],
    },
  ];
}
