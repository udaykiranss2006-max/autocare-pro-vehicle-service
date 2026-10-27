import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewService } from '../../core/services/data.services';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Review } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { DayPipe } from '../../shared/pipes/pipes';

type Pending = { id: string; reference: string; date: string; services: string[]; vehicle: string };

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, EmptyStateComponent, StarRatingComponent, ModalComponent, FieldErrorComponent, DayPipe],
  template: `
    <div class="page-header"><div><h1>Reviews &amp; ratings</h1><p>Rate completed services. Reviews are published after moderation.</p></div></div>
    @if (loading()) { <app-spinner /> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @else {
      @if (pending().length) {
        <h3>Waiting for your review</h3>
        <div class="grid grid-auto mb-3">
          @for (p of pending(); track p.id) {
            <div class="card">
              <b>{{ p.vehicle }}</b><p class="small muted">{{ p.services.join(', ') }}<br />{{ p.date | day }} · {{ p.reference }}</p>
              <button type="button" class="btn btn-primary btn-sm" (click)="openNew(p)">Write a review</button>
            </div>
          }
        </div>
      }
      <h3>My reviews</h3>
      @for (r of reviews(); track r.id) {
        <div class="card mb-2">
          <div class="flex between flex-wrap">
            <div><app-stars [value]="r.rating" /> <span class="badge" [class.badge-success]="r.status === 'approved'" [class.badge-warning]="r.status === 'pending'" [class.badge-danger]="r.status === 'rejected'">{{ r.status }}</span></div>
            <span class="small muted">{{ r.createdAt | day }} · {{ r.appointmentRef }}</span>
          </div>
          <p class="mt-1">{{ r.comment }}</p>
          <p class="small muted">{{ r.serviceNames.join(', ') }} · {{ r.vehicleLabel }}</p>
          @if (r.adminResponse) { <p class="small"><b>AutoCare Pro:</b> {{ r.adminResponse }}</p> }
          <div class="flex"><button type="button" class="btn btn-outline btn-sm" (click)="openEdit(r)">Edit</button><button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(r)">Delete</button></div>
        </div>
      } @empty {
        <app-empty-state icon="star" title="No reviews yet" message="After a service is completed you can rate it here." />
      }
    }
    <app-modal [open]="formOpen()" [title]="editing() ? 'Edit review' : 'Rate your service'" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()">
        <p class="small muted">{{ target() }}</p>
        <div class="field"><span class="label">Rating</span><app-stars [value]="form.controls.rating.value" [editable]="true" (changed)="form.controls.rating.setValue($event)" /><app-field-error [control]="form.controls.rating" label="Rating" /></div>
        <div class="field mt-2"><label for="rv-c">Your feedback</label><textarea id="rv-c" class="textarea" rows="4" formControlName="comment" maxlength="1000"></textarea><app-field-error [control]="form.controls.comment" label="Feedback" /></div>
        @if (editing()) { <p class="small muted">Edited reviews are re-checked before being published again.</p> }
        <div class="form-actions"><button type="button" class="btn btn-outline" (click)="formOpen.set(false)">Cancel</button><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Submit review' }}</button></div>
      </form>
    </app-modal>
  `,
})
export class MyReviewsComponent implements OnInit {
  private readonly api = inject(ReviewService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  readonly reviews = signal<Review[]>([]);
  readonly pending = signal<Pending[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<Review | null>(null);
  readonly target = signal('');
  readonly saving = signal(false);
  private appointmentId = '';
  readonly form = this.fb.nonNullable.group({ rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]], comment: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.mine().subscribe({
      next: (r) => {
        this.reviews.set(r.reviews);
        this.pending.set(r.pendingToReview);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  openNew(p: Pending): void {
    this.editing.set(null);
    this.appointmentId = p.id;
    this.target.set(`${p.vehicle} · ${p.services.join(', ')}`);
    this.form.reset({ rating: 0, comment: '' });
    this.formOpen.set(true);
  }

  openEdit(r: Review): void {
    this.editing.set(r);
    this.target.set(`${r.vehicleLabel} · ${r.serviceNames.join(', ')}`);
    this.form.reset({ rating: r.rating, comment: r.comment });
    this.formOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue();
    const ed = this.editing();
    const req = ed ? this.api.update(ed.id, body) : this.api.create({ appointmentId: this.appointmentId, ...body });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success('Thank you! Your review was submitted for moderation.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(e));
      },
    });
  }

  async remove(r: Review): Promise<void> {
    if (!(await this.confirm.confirm({ title: 'Delete review?', message: 'This review will be permanently deleted.', danger: true, confirmText: 'Delete' }))) return;
    this.api.remove(r.id).subscribe({ next: () => { this.toast.success('Review deleted'); this.load(); }, error: (e) => this.toast.error(apiErrorMessage(e)) });
  }
}
