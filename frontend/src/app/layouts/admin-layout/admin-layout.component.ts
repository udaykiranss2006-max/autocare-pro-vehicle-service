import { Component } from '@angular/core';
import { DashboardShellComponent, NavGroup } from '../../shared/components/dashboard-shell.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `<app-dashboard-shell [groups]="groups" roleLabel="Administrator" notificationsPath="/admin/notifications" profilePath="/admin/profile" />`,
})
export class AdminLayoutComponent {
  readonly groups: NavGroup[] = [
    { links: [{ label: 'Dashboard Overview', path: '/admin', icon: 'home', exact: true }] },
    {
      title: 'Operations',
      links: [
        { label: 'Appointments', path: '/admin/appointments', icon: 'calendar' },
        { label: 'Service Records', path: '/admin/records', icon: 'wrench' },
        { label: 'Invoices & Receipts', path: '/admin/invoices', icon: 'file' },
        { label: 'Customers', path: '/admin/customers', icon: 'users' },
        { label: 'Vehicles', path: '/admin/vehicles', icon: 'car' },
      ],
    },
    {
      title: 'Business',
      links: [
        { label: 'Service Catalog', path: '/admin/services', icon: 'list' },
        { label: 'Technicians & Staff', path: '/admin/technicians', icon: 'user' },
        { label: 'Workshops', path: '/admin/workshops', icon: 'building' },
        { label: 'Offers & Packages', path: '/admin/offers', icon: 'tag' },
        { label: 'Reviews & Feedback', path: '/admin/reviews', icon: 'star' },
        { label: 'Contact Messages', path: '/admin/messages', icon: 'message' },
      ],
    },
    {
      title: 'Insights & settings',
      links: [
        { label: 'Reports & Analytics', path: '/admin/reports', icon: 'chart' },
        { label: 'Notifications', path: '/admin/notifications', icon: 'bell' },
        { label: 'Business Settings', path: '/admin/settings', icon: 'settings' },
        { label: 'Admin Profile', path: '/admin/profile', icon: 'user' },
      ],
    },
  ];
}
