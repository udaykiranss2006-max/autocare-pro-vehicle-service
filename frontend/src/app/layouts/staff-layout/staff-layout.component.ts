import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardShellComponent, NavGroup } from '../../shared/components/dashboard-shell.component';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `<app-dashboard-shell [groups]="groups()" [roleLabel]="roleLabel()" notificationsPath="/staff/notifications" profilePath="/staff/profile" />`,
})
export class StaffLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly roleLabel = computed(() => (this.auth.role() === 'technician' ? 'Technician' : this.auth.role() === 'admin' ? 'Admin (staff view)' : 'Service Advisor'));
  readonly groups = computed<NavGroup[]>(() => [
    { links: [{ label: 'Today', path: '/staff', icon: 'home', exact: true }] },
    {
      title: 'Work',
      links: [
        { label: this.auth.role() === 'technician' ? 'My Assigned Jobs' : 'All Appointments', path: '/staff/appointments', icon: 'wrench' },
        { label: 'Completed Work', path: '/staff/completed', icon: 'check' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Notifications', path: '/staff/notifications', icon: 'bell' },
        { label: 'My Profile', path: '/staff/profile', icon: 'user' },
        { label: 'Change Password', path: '/staff/change-password', icon: 'lock' },
      ],
    },
  ]);
}
