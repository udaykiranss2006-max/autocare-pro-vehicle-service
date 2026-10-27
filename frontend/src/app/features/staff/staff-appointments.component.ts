import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { AdminAppointmentsComponent } from '../admin/admin-appointments.component';

/** Technicians see only their assigned jobs (enforced by the API); advisors see all appointments. */
@Component({
  selector: 'app-staff-appointments',
  standalone: true,
  imports: [AdminAppointmentsComponent],
  template: `<app-admin-appointments basePath="/staff" [title]="title()" />`,
})
export class StaffAppointmentsComponent {
  private readonly auth = inject(AuthService);
  readonly title = computed(() => (this.auth.role() === 'technician' ? 'My assigned jobs' : 'Appointments'));
}
