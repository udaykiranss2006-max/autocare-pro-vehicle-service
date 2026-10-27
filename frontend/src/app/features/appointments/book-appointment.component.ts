import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppointmentService, CatalogService, VehicleService, WorkshopService } from '../../core/services/data.services';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Availability, Estimate, PublicSettings, ServiceItem, Vehicle, Workshop } from '../../core/models/models';
import { apiErrorCode, apiErrorMessage } from '../../core/utils/api-error';
import { addDays, todayIn } from '../../core/utils/date';
import { indianPhone } from '../../shared/validators/validators';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { BookingModePipe, DayPipe, DurationPipe, InrPipe, VehicleTypePipe } from '../../shared/pipes/pipes';

const STEPS = ['Vehicle', 'Services', 'Workshop', 'Date & time', 'Problem', 'Pickup', 'Review'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, SpinnerComponent, IconComponent, EmptyStateComponent, FieldErrorComponent, InrPipe, DurationPipe, DayPipe, VehicleTypePipe, BookingModePipe],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css',
})
export class BookAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vehiclesApi = inject(VehicleService);
  private readonly catalogApi = inject(CatalogService);
  private readonly workshopApi = inject(WorkshopService);
  private readonly appointmentApi = inject(AppointmentService);
  private readonly settingsApi = inject(SettingsService);
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly steps = STEPS;
  readonly step = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly vehicles = signal<Vehicle[]>([]);
  readonly catalog = signal<ServiceItem[]>([]);
  readonly workshops = signal<Workshop[]>([]);
  readonly settings = signal<PublicSettings | null>(null);
  readonly availability = signal<Availability | null>(null);
  readonly slotsLoading = signal(false);
  readonly estimate = signal<Estimate | null>(null);
  readonly estimating = signal(false);
  readonly estimateError = signal('');
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly serviceSearch = signal('');
  readonly serviceCategory = signal('');
  readonly selectedServiceIds = signal<string[]>([]);
  readonly selectedVehicleId = signal('');
  readonly today = todayIn();

  readonly form = this.fb.nonNullable.group({
    vehicleId: ['', Validators.required],
    workshopId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    problemCategory: [''],
    problemDescription: ['', Validators.maxLength(1000)],
    pickup: this.fb.nonNullable.group({
      pickupRequested: [false],
      dropRequested: [false],
      address: ['', Validators.maxLength(300)],
      contactPhone: ['', indianPhone],
    }),
    offerCode: ['', Validators.maxLength(30)],
    acceptPolicy: [false, Validators.requiredTrue],
  });

  readonly selectedVehicle = computed(() => this.vehicles().find((v) => v.id === this.selectedVehicleId()) ?? null);
  readonly compatibleServices = computed(() => {
    const v = this.selectedVehicle();
    const q = this.serviceSearch().trim().toLowerCase();
    return this.catalog().filter(
      (s) =>
        (!v || s.vehicleTypes.includes(v.type)) &&
        (!this.serviceCategory() || s.category === this.serviceCategory()) &&
        (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    );
  });
  readonly categories = computed(() => [...new Set(this.catalog().map((s) => s.category))]);
  readonly selectedServices = computed(() => this.catalog().filter((s) => this.selectedServiceIds().includes(s.id)));
  readonly dateChips = computed(() => {
    const max = this.settings()?.booking.maxAdvanceDays ?? 30;
    return Array.from({ length: Math.min(14, max + 1) }, (_, i) => {
      const date = addDays(this.today, i);
      const [y, m, d] = date.split('-').map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      return { date, day: DAY_LABELS[dow], num: d, month: new Date(Date.UTC(y, m - 1, d)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }) };
    });
  });
  readonly maxDate = computed(() => addDays(this.today, this.settings()?.booking.maxAdvanceDays ?? 60));

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    forkJoin({
      vehicles: this.vehiclesApi.list(),
      catalog: this.catalogApi.list({ limit: 200 }),
      workshops: this.workshopApi.list(),
      settings: this.settingsApi.publicSettings(),
    }).subscribe({
      next: (r) => {
        this.vehicles.set(r.vehicles.items);
        this.catalog.set(r.catalog.items);
        this.workshops.set(r.workshops);
        this.settings.set(r.settings);
        const user = this.auth.user();
        this.form.controls.pickup.patchValue({ address: user?.address ?? '', contactPhone: user?.phone ?? '' });
        if (r.workshops.length === 1) this.form.controls.workshopId.setValue(r.workshops[0].id);
        const pre = [...(qp.get('services')?.split(',') ?? []), ...(qp.get('service') ? [qp.get('service') as string] : [])].filter((id) => r.catalog.items.some((s) => s.id === id));
        if (pre.length) this.selectedServiceIds.set([...new Set(pre)]);
        const vid = qp.get('vehicle');
        if (vid && r.vehicles.items.some((v) => v.id === vid)) this.selectVehicle(vid);
        else if (r.vehicles.items.length === 1) this.selectVehicle(r.vehicles.items[0].id);
        if (qp.get('offer')) this.form.controls.offerCode.setValue(qp.get('offer') as string);
        if (this.selectedVehicleId() && pre.length) this.step.set(1);
        this.loading.set(false);
      },
      error: (e) => {
        this.loadError.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  selectedWorkshop(): Workshop | null {
    return this.workshops().find((w) => w.id === this.form.controls.workshopId.value) ?? null;
  }

  selectVehicle(id: string): void {
    this.selectedVehicleId.set(id);
    this.form.controls.vehicleId.setValue(id);
    const v = this.vehicles().find((x) => x.id === id);
    if (v) this.selectedServiceIds.update((ids) => ids.filter((sid) => this.catalog().find((s) => s.id === sid)?.vehicleTypes.includes(v.type)));
    this.estimate.set(null);
  }

  toggleService(id: string): void {
    this.selectedServiceIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 10 ? ids : [...ids, id]));
    this.estimate.set(null);
  }

  priceFor(s: ServiceItem): number {
    const v = this.selectedVehicle();
    const f = v ? this.settings()?.vehicleTypePriceFactor[v.type] ?? 1 : 1;
    return Math.round((s.priceFrom * f) / 10) * 10;
  }

  selectedTotal(): number {
    return this.selectedServices().reduce((sum, s) => sum + this.priceFor(s), 0);
  }

  selectedDuration(): number {
    return this.selectedServices().reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  selectWorkshop(id: string): void {
    this.form.controls.workshopId.setValue(id);
    this.form.controls.time.setValue('');
    this.availability.set(null);
    if (this.form.controls.date.value) this.loadSlots();
  }

  pickDate(date: string): void {
    this.form.controls.date.setValue(date);
    this.form.controls.time.setValue('');
    this.loadSlots();
  }

  loadSlots(): void {
    const { workshopId, date } = this.form.getRawValue();
    if (!workshopId || !date) return;
    this.slotsLoading.set(true);
    this.workshopApi.availability(workshopId, date).subscribe({
      next: (a) => {
        this.availability.set(a);
        this.slotsLoading.set(false);
      },
      error: (e) => {
        this.toast.error(apiErrorMessage(e));
        this.availability.set(null);
        this.slotsLoading.set(false);
      },
    });
  }

  pickTime(t: string): void {
    this.form.controls.time.setValue(t);
  }

  canProceed(i = this.step()): boolean {
    const f = this.form.getRawValue();
    switch (i) {
      case 0: return !!f.vehicleId;
      case 1: return this.selectedServiceIds().length > 0;
      case 2: return !!f.workshopId;
      case 3: return !!f.date && !!f.time;
      case 4: return this.form.controls.problemDescription.valid;
      case 5: {
        const p = f.pickup;
        return !(p.pickupRequested || p.dropRequested) || (p.address.trim().length >= 10 && this.form.controls.pickup.controls.contactPhone.valid);
      }
      default: return true;
    }
  }

  next(): void {
    if (!this.canProceed()) {
      this.form.markAllAsTouched();
      this.toast.warning(this.stepHint());
      return;
    }
    const nextStep = Math.min(this.step() + 1, STEPS.length - 1);
    this.step.set(nextStep);
    if (nextStep === 3 && this.form.controls.date.value) this.loadSlots();
    if (nextStep === 6) this.runEstimate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back(): void {
    this.step.set(Math.max(0, this.step() - 1));
  }

  goTo(i: number): void {
    for (let k = 0; k < i; k++) if (!this.canProceed(k)) return;
    this.step.set(i);
    if (i === 3) this.loadSlots();
    if (i === 6) this.runEstimate();
  }

  stepHint(): string {
    return ['Select a vehicle', 'Select at least one service', 'Select a workshop', 'Choose a date and an available time slot', 'Description is too long', 'Enter a full pickup address and a valid phone number', ''][this.step()];
  }

  runEstimate(): void {
    this.estimating.set(true);
    this.estimateError.set('');
    const offerCode = this.form.controls.offerCode.value.trim();
    this.appointmentApi.estimate({ vehicleId: this.form.controls.vehicleId.value, serviceIds: this.selectedServiceIds(), ...(offerCode ? { offerCode } : {}) }).subscribe({
      next: (e) => {
        this.estimate.set(e);
        this.estimating.set(false);
      },
      error: (err) => {
        this.estimating.set(false);
        this.estimateError.set(apiErrorMessage(err));
        if (offerCode) {
          // retry without the invalid code so the customer still sees a price
          this.form.controls.offerCode.setValue('');
          this.runEstimate();
          this.estimateError.set(apiErrorMessage(err));
        }
      },
    });
  }

  confirm(): void {
    if (this.submitting()) return;
    this.submitError.set('');
    if (this.form.invalid || !this.selectedServiceIds().length) {
      this.form.markAllAsTouched();
      this.submitError.set('Please complete all required steps and accept the policy.');
      return;
    }
    const f = this.form.getRawValue();
    const body: Record<string, unknown> = {
      vehicleId: f.vehicleId,
      serviceIds: this.selectedServiceIds(),
      workshopId: f.workshopId,
      date: f.date,
      time: f.time,
      problemCategory: f.problemCategory,
      problemDescription: f.problemDescription,
      pickup: f.pickup.pickupRequested || f.pickup.dropRequested ? f.pickup : { pickupRequested: false, dropRequested: false },
      acceptPolicy: f.acceptPolicy,
    };
    if (f.offerCode.trim()) body['offerCode'] = f.offerCode.trim();
    this.submitting.set(true);
    this.appointmentApi.create(body).subscribe({
      next: (a) => {
        this.submitting.set(false);
        this.router.navigate(['/customer/book/confirmation', a.id]);
      },
      error: (e) => {
        this.submitting.set(false);
        const code = apiErrorCode(e);
        this.submitError.set(apiErrorMessage(e));
        if (code === 'SLOT_UNAVAILABLE') {
          this.toast.error('That slot is no longer available. Please pick another time.');
          this.form.controls.time.setValue('');
          this.step.set(3);
          this.loadSlots();
        }
      },
    });
  }
}
