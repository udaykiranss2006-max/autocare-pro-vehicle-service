import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, WorkshopService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Technician, User, Workshop } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { indianPhone, passwordStrength } from '../../shared/validators/validators';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DateTimePipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-technicians',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, ModalComponent, FieldErrorComponent, IconComponent, DateTimePipe],
  template: `
    <div class="page-header">
      <div><h1>Technicians &amp; staff</h1><p>Technician profiles (used for job assignment) and staff login accounts.</p></div>
      <div class="flex"><button type="button" class="btn btn-outline" (click)="openTech()"><app-icon name="plus" [size]="16" /> Technician profile</button><button type="button" class="btn btn-primary" (click)="staffOpen.set(true)"><app-icon name="user" [size]="16" /> Create staff account</button></div>
    </div>
    @if (loading()) { <app-spinner /> }
    @else {
      <h3>Technician profiles</h3>
      <div class="table-wrap mb-3"><table class="table">
        <thead><tr><th>Name</th><th>Specializations</th><th>Workshop</th><th>Experience</th><th>Active jobs</th><th>Login</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (t of techs(); track t.id) {
            <tr>
              <td><b>{{ t.name }}</b></td><td class="small">{{ t.specializations.join(', ') || '-' }}</td><td class="small">{{ workshopName(t.workshopId) }}</td>
              <td>{{ t.experienceYears }} yrs</td><td>{{ t.activeJobs }}</td><td class="small">{{ t.userId ? linkedName(t.userId) : 'Not linked' }}</td>
              <td><span class="badge" [class.badge-success]="t.active" [class.badge-cancelled]="!t.active">{{ t.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="actions"><button type="button" class="btn btn-outline btn-sm" (click)="openTech(t)">Edit</button><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="removeTech(t)">Delete</button></div></td>
            </tr>
          } @empty { <tr><td colspan="8" class="muted">No technician profiles yet.</td></tr> }
        </tbody>
      </table></div>
      <h3>Staff accounts</h3>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (u of staff(); track u.id) {
            <tr>
              <td><b>{{ u.fullName }}</b>@if (u.mustChangePassword) { <span class="badge badge-warning">must change password</span> }</td><td>{{ u.email }}</td>
              <td><select class="select" [value]="u.role" (change)="changeRole(u, $any($event.target).value)" [attr.aria-label]="'Role of ' + u.fullName"><option value="admin">Admin</option><option value="advisor">Service advisor</option><option value="technician">Technician</option><option value="customer">Customer</option></select></td>
              <td class="small">{{ u.lastLoginAt ? (u.lastLoginAt | dateTime) : 'never' }}</td>
              <td><span class="badge" [class.badge-success]="u.active" [class.badge-danger]="!u.active">{{ u.active ? 'Active' : 'Deactivated' }}</span></td>
              <td class="text-right"><button type="button" class="btn btn-sm" [class.btn-danger]="u.active" [class.btn-success]="!u.active" (click)="toggleUser(u)">{{ u.active ? 'Deactivate' : 'Activate' }}</button></td>
            </tr>
          }
        </tbody>
      </table></div>
    }

    <app-modal [open]="techOpen()" [title]="techEditId ? 'Edit technician' : 'New technician profile'" (closed)="techOpen.set(false)">
      <form [formGroup]="tf" (ngSubmit)="saveTech()">
        <div class="form-grid">
          <div class="field"><label for="t-n">Name *</label><input id="t-n" class="input" formControlName="name" /><app-field-error [control]="tf.controls.name" label="Name" /></div>
          <div class="field"><label for="t-w">Workshop *</label><select id="t-w" class="select" formControlName="workshopId">@for (w of workshops(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select></div>
          <div class="field"><label for="t-p">Phone</label><input id="t-p" class="input" formControlName="phone" /><app-field-error [control]="tf.controls.phone" label="Phone" /></div>
          <div class="field"><label for="t-e">Experience (years)</label><input id="t-e" type="number" class="input" formControlName="experienceYears" min="0" /></div>
          <div class="field full"><label for="t-s">Specializations (comma separated)</label><input id="t-s" class="input" formControlName="specializations" placeholder="Engine, Brakes, AC" /></div>
          <div class="field full"><label for="t-u">Linked login account (technician role)</label><select id="t-u" class="select" formControlName="userId"><option value="">Not linked</option>@for (u of technicianUsers(); track u.id) { <option [value]="u.id">{{ u.fullName }} ({{ u.email }})</option> }</select><span class="hint">Technicians only see jobs assigned to their linked profile.</span></div>
          <label class="checkbox"><input type="checkbox" formControlName="active" /> Active (available for assignment)</label>
        </div>
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="techOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">Save</button></div>
      </form>
    </app-modal>

    <app-modal [open]="staffOpen()" title="Create staff account" (closed)="staffOpen.set(false)">
      <form [formGroup]="sf" (ngSubmit)="saveStaff()">
        <div class="alert alert-info small mb-2">The staff member must change this temporary password at first sign-in. Share it securely.</div>
        <div class="form-grid">
          <div class="field"><label for="sf-n">Full name *</label><input id="sf-n" class="input" formControlName="fullName" /><app-field-error [control]="sf.controls.fullName" label="Name" /></div>
          <div class="field"><label for="sf-r">Role *</label><select id="sf-r" class="select" formControlName="role"><option value="advisor">Service advisor</option><option value="technician">Technician</option><option value="admin">Administrator</option></select></div>
          <div class="field"><label for="sf-e">Email *</label><input id="sf-e" class="input" type="email" formControlName="email" /><app-field-error [control]="sf.controls.email" label="Email" /></div>
          <div class="field"><label for="sf-p">Phone *</label><input id="sf-p" class="input" formControlName="phone" /><app-field-error [control]="sf.controls.phone" label="Phone" /></div>
          <div class="field full"><label for="sf-pw">Temporary password *</label><input id="sf-pw" class="input" type="text" formControlName="temporaryPassword" autocomplete="new-password" /><app-field-error [control]="sf.controls.temporaryPassword" label="Password" /></div>
          @if (sf.controls.role.value === 'technician') {
            <div class="field"><label for="sf-w">Workshop</label><select id="sf-w" class="select" formControlName="workshopId">@for (w of workshops(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select></div>
            <div class="field"><label for="sf-s">Specializations</label><input id="sf-s" class="input" formControlName="specializations" placeholder="comma separated" /></div>
          }
        </div>
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="staffOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">Create account</button></div>
      </form>
    </app-modal>
  `,
})
export class AdminTechniciansComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly techs = signal<Technician[]>([]);
  readonly staff = signal<User[]>([]);
  readonly technicianUsers = signal<User[]>([]);
  readonly workshops = signal<Workshop[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly techOpen = signal(false);
  readonly staffOpen = signal(false);
  techEditId: string | null = null;

  readonly tf = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], workshopId: ['', Validators.required], phone: ['', indianPhone], experienceYears: [0], specializations: [''], userId: [''], active: [true] });
  readonly sf = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]], role: ['advisor', Validators.required], email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, indianPhone]], temporaryPassword: ['', [Validators.required, passwordStrength]], workshopId: [''], specializations: [''],
  });

  ngOnInit(): void {
    this.workshopApi.list(true).subscribe({ next: (w) => this.workshops.set(w), error: () => undefined });
    this.load();
  }

  load(): void {
    this.api.technicians().subscribe({ next: (t) => { this.techs.set(t); this.loading.set(false); }, error: (e) => { this.toast.error(apiErrorMessage(e)); this.loading.set(false); } });
    this.api.users({ role: 'admin,advisor,technician', limit: 100 }).subscribe({
      next: (p) => {
        this.staff.set(p.items);
        this.technicianUsers.set(p.items.filter((u) => u.role === 'technician'));
      },
      error: () => undefined,
    });
  }

  workshopName(id: string): string {
    return this.workshops().find((w) => w.id === id)?.name ?? id;
  }

  linkedName(id: string): string {
    return this.staff().find((u) => u.id === id)?.email ?? 'Linked account';
  }

  openTech(t?: Technician): void {
    this.techEditId = t?.id ?? null;
    this.tf.reset({ name: t?.name ?? '', workshopId: t?.workshopId ?? this.workshops()[0]?.id ?? '', phone: t?.phone ?? '', experienceYears: t?.experienceYears ?? 0, specializations: (t?.specializations ?? []).join(', '), userId: t?.userId ?? '', active: t?.active ?? true });
    this.techOpen.set(true);
  }

  saveTech(): void {
    if (this.tf.invalid) { this.tf.markAllAsTouched(); return; }
    const v = this.tf.getRawValue();
    const body: Partial<Technician> = { name: v.name, workshopId: v.workshopId, phone: v.phone, experienceYears: Number(v.experienceYears) || 0, specializations: v.specializations.split(',').map((s: string) => s.trim()).filter(Boolean), userId: v.userId || null, active: v.active };
    this.saving.set(true);
    const req = this.techEditId ? this.api.updateTechnician(this.techEditId, body) : this.api.createTechnician(body);
    req.subscribe({ next: () => { this.saving.set(false); this.techOpen.set(false); this.toast.success('Technician saved'); this.load(); }, error: (e) => { this.saving.set(false); this.toast.error(apiErrorMessage(e)); } });
  }

  async removeTech(t: Technician): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete technician profile?', message: `Delete ${t.name}? Technicians with active jobs cannot be deleted - deactivate them instead.`, danger: true, confirmText: 'Delete' }))) return;
    this.api.removeTechnician(t.id).subscribe({ next: () => { this.toast.success('Technician deleted'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }

  saveStaff(): void {
    if (this.sf.invalid) { this.sf.markAllAsTouched(); return; }
    const v = this.sf.getRawValue();
    this.saving.set(true);
    this.api.createStaff({ ...v, workshopId: v.workshopId || undefined, specializations: v.specializations.split(',').map((s: string) => s.trim()).filter(Boolean) }).subscribe({
      next: () => { this.saving.set(false); this.staffOpen.set(false); this.sf.reset(); this.toast.success('Staff account created'); this.load(); },
      error: (e) => { this.saving.set(false); this.toast.error(apiErrorMessage(e)); },
    });
  }

  async changeRole(u: User, role: string): Promise<void> {
    if (role === u.role) return;
    if (!(await this.confirm.confirm({ title: 'Change role?', message: `Change ${u.fullName} from ${u.role} to ${role}? They will be signed out.`, confirmText: 'Change role' }))) { this.load(); return; }
    this.api.setUserRole(u.id, role).subscribe({ next: () => { this.toast.success('Role updated'); this.load(); }, error: (e) => { this.toast.error(apiErrorMessage(e)); this.load(); } });
  }

  async toggleUser(u: User): Promise<void> {
    if (!(await this.confirm.confirm({ title: u.active ? 'Deactivate staff account?' : 'Activate staff account?', message: `${u.fullName} (${u.email})`, danger: u.active, confirmText: u.active ? 'Deactivate' : 'Activate' }))) return;
    this.api.setUserActive(u.id, !u.active).subscribe({ next: () => { this.toast.success('Account updated'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
