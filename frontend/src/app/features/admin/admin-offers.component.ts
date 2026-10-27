import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, CatalogService } from '../../core/services/data.services';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Offer, ServiceItem } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { DayPipe, InrPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, ModalComponent, FieldErrorComponent, IconComponent, InrPipe, DayPipe],
  template: `
    <div class="page-header">
      <div><h1>Offers &amp; packages</h1><p>Offers apply a % discount via a code. Packages apply a bundle price automatically when all their services are booked together.</p></div>
      <button type="button" class="btn btn-primary" (click)="open()"><app-icon name="plus" [size]="16" /> New offer / package</button>
    </div>
    @if (loading()) { <app-spinner /> }
    @else {
      <div class="grid grid-auto">
        @for (o of items(); track o.id) {
          <div class="card">
            <div class="flex between"><span class="badge" [class.badge-accent]="o.kind === 'offer'" [class.badge-info]="o.kind === 'package'">{{ o.kind }}</span><span class="badge" [class.badge-success]="o.active" [class.badge-cancelled]="!o.active">{{ o.active ? 'Active' : 'Inactive' }}</span></div>
            <h3 class="mt-1">{{ o.title }}</h3>
            <p class="small muted">{{ o.description }}</p>
            <p class="small">@if (o.kind === 'offer') { <b>{{ o.discountPercent }}% off</b> · code <span class="mono">{{ o.code || '—' }}</span> } @else { Package price <b>{{ o.packagePrice | inr }}</b> }</p>
            <p class="small muted">{{ serviceNames(o) }}</p>
            @if (o.validUntil) { <p class="small">Valid until {{ o.validUntil | day }}</p> }
            <div class="flex"><button type="button" class="btn btn-outline btn-sm" (click)="open(o)">Edit</button><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(o)">Delete</button></div>
          </div>
        } @empty { <p class="muted">No offers yet.</p> }
      </div>
    }
    <app-modal [open]="formOpen()" [title]="editId ? 'Edit' : 'New offer / package'" [width]="720" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid">
          <div class="field"><label for="o-k">Type</label><select id="o-k" class="select" formControlName="kind"><option value="offer">Offer (discount code)</option><option value="package">Package (bundle price)</option></select></div>
          <div class="field"><label for="o-t">Title *</label><input id="o-t" class="input" formControlName="title" /><app-field-error [control]="form.controls.title" label="Title" /></div>
          <div class="field full"><label for="o-d">Description *</label><textarea id="o-d" class="textarea" rows="2" formControlName="description"></textarea><app-field-error [control]="form.controls.description" label="Description" /></div>
          @if (form.controls.kind.value === 'offer') {
            <div class="field"><label for="o-c">Code</label><input id="o-c" class="input mono" formControlName="code" placeholder="e.g. MONSOON15" /></div>
            <div class="field"><label for="o-p">Discount %</label><input id="o-p" type="number" min="0" max="90" class="input" formControlName="discountPercent" /></div>
          } @else {
            <div class="field"><label for="o-pp">Package price (₹, for a car)</label><input id="o-pp" type="number" min="0" class="input" formControlName="packagePrice" /></div>
          }
          <div class="field"><label for="o-v">Valid until</label><input id="o-v" type="date" class="input" formControlName="validUntil" /></div>
          <div class="field"><span class="label">Status</span><label class="checkbox"><input type="checkbox" formControlName="active" /> Active</label></div>
          <div class="field full"><span class="label">Applies to services {{ form.controls.kind.value === 'offer' ? '(leave empty for all services)' : '(all must be booked together)' }}</span>
            <div class="svc-pick">@for (s of services(); track s.id) { <label class="checkbox small"><input type="checkbox" [checked]="selected().includes(s.id)" (change)="toggle(s.id)" /> {{ s.name }}</label> }</div>
          </div>
        </div>
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="formOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">Save</button></div>
      </form>
    </app-modal>
  `,
  styles: ['.svc-pick { max-height: 220px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; }'],
})
export class AdminOffersComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly catalog = inject(CatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly items = signal<Offer[]>([]);
  readonly services = signal<ServiceItem[]>([]);
  readonly selected = signal<string[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  editId: string | null = null;
  readonly form = this.fb.nonNullable.group({
    kind: ['offer' as 'offer' | 'package'], title: ['', [Validators.required, Validators.minLength(3)]], description: ['', Validators.required],
    code: [''], discountPercent: [10], packagePrice: [0], validUntil: [''], active: [true],
  });

  ngOnInit(): void {
    this.catalog.list({ limit: 200 }).subscribe({ next: (p) => this.services.set(p.items), error: () => undefined });
    this.load();
  }

  load(): void {
    this.api.offers(true).subscribe({ next: (o) => { this.items.set(o); this.loading.set(false); }, error: (e) => { this.toast.error(apiErrorMessage(e)); this.loading.set(false); } });
  }

  serviceNames(o: Offer): string {
    if (!o.serviceIds.length) return 'All services';
    return o.serviceIds.map((id) => this.services().find((s) => s.id === id)?.name ?? id).join(', ');
  }

  toggle(id: string): void {
    this.selected.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  open(o?: Offer): void {
    this.editId = o?.id ?? null;
    this.form.reset({ kind: o?.kind ?? 'offer', title: o?.title ?? '', description: o?.description ?? '', code: o?.code ?? '', discountPercent: o?.discountPercent ?? 10, packagePrice: o?.packagePrice ?? 0, validUntil: o?.validUntil ?? '', active: o?.active ?? true });
    this.selected.set([...(o?.serviceIds ?? [])]);
    this.formOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.kind === 'package' && this.selected().length < 2) { this.toast.warning('A package needs at least two services'); return; }
    const body: Partial<Offer> = {
      kind: v.kind, title: v.title, description: v.description, code: v.kind === 'offer' ? v.code : '', discountPercent: v.kind === 'offer' ? Number(v.discountPercent) : 0,
      packagePrice: v.kind === 'package' ? Number(v.packagePrice) : null, validUntil: v.validUntil || null, active: v.active, serviceIds: this.selected(),
    };
    this.saving.set(true);
    const req = this.editId ? this.api.updateOffer(this.editId, body) : this.api.createOffer(body);
    req.subscribe({ next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success('Saved'); this.load(); }, error: (e) => { this.saving.set(false); this.toast.error(apiErrorMessage(e)); } });
  }

  async remove(o: Offer): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete?', message: `Delete "${o.title}"?`, danger: true, confirmText: 'Delete' }))) return;
    this.api.removeOffer(o.id).subscribe({ next: () => { this.toast.success('Deleted'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
