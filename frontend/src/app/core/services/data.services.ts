import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AdminDashboard, AppNotification, Appointment, AppointmentStatus, Availability, ContactMessage, CustomerDashboard, Estimate, InvoiceView, Offer,
  Page, PublicSettings, ReportSummary, Review, ServiceItem, ServiceRecord, StaffDashboard, Technician, User, Vehicle, Workshop,
} from '../models/models';

type Q = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);
  list(q: Q = {}): Observable<Page<ServiceItem>> { return this.api.page<ServiceItem>('/services', q); }
  get(idOrSlug: string): Observable<ServiceItem> { return this.api.get<ServiceItem>(`/services/${encodeURIComponent(idOrSlug)}`); }
  categories(): Observable<{ name: string; count: number }[]> { return this.api.get('/services/categories'); }
  create(body: Partial<ServiceItem>): Observable<ServiceItem> { return this.api.post('/services', body); }
  update(id: string, body: Partial<ServiceItem>): Observable<ServiceItem> { return this.api.put(`/services/${id}`, body); }
  setAvailable(id: string, available: boolean): Observable<ServiceItem> { return this.api.patch(`/services/${id}`, { available }); }
  remove(id: string): Observable<unknown> { return this.api.delete(`/services/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly api = inject(ApiService);
  list(q: Q = {}): Observable<Page<Vehicle>> { return this.api.page<Vehicle>('/vehicles', { limit: 100, ...q }); }
  get(id: string): Observable<Vehicle> { return this.api.get<Vehicle>(`/vehicles/${id}`); }
  history(id: string): Observable<{ vehicle: Vehicle; appointments: { id: string; reference: string; date: string; time: string; status: AppointmentStatus; services: string[]; estimatedTotal: number }[]; records: { id: string; appointmentRef: string; completedAt: string; total: number; odometerAtService: number; nextServiceDate: string | null; services: string[]; invoiceNumber: string }[] }> {
    return this.api.get(`/vehicles/${id}/history`);
  }
  create(body: Partial<Vehicle>): Observable<Vehicle> { return this.api.post('/vehicles', body); }
  update(id: string, body: Partial<Vehicle>): Observable<Vehicle> { return this.api.put(`/vehicles/${id}`, body); }
  remove(id: string): Observable<unknown> { return this.api.delete(`/vehicles/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  private readonly api = inject(ApiService);
  list(all = false): Observable<Workshop[]> { return this.api.get<Workshop[]>('/workshops', { all }); }
  availability(id: string, date: string, excludeAppointmentId?: string): Observable<Availability> {
    return this.api.get<Availability>(`/workshops/${id}/availability`, { date, excludeAppointmentId });
  }
  create(body: Partial<Workshop>): Observable<Workshop> { return this.api.post('/workshops', body); }
  update(id: string, body: Partial<Workshop>): Observable<Workshop> { return this.api.put(`/workshops/${id}`, body); }
  remove(id: string): Observable<unknown> { return this.api.delete(`/workshops/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly api = inject(ApiService);
  list(q: Q = {}): Observable<Page<Appointment>> { return this.api.page<Appointment>('/appointments', q); }
  get(id: string): Observable<Appointment> { return this.api.get<Appointment>(`/appointments/${id}`); }
  actions(id: string): Observable<{ status: AppointmentStatus; transitions: AppointmentStatus[] }> { return this.api.get(`/appointments/${id}/actions`); }
  estimate(body: { vehicleId: string; serviceIds: string[]; offerCode?: string }): Observable<Estimate> { return this.api.post('/appointments/estimate', body); }
  create(body: Record<string, unknown>): Observable<Appointment> { return this.api.post('/appointments', body); }
  update(id: string, body: Record<string, unknown>): Observable<Appointment> { return this.api.put(`/appointments/${id}`, body); }
  setStatus(id: string, status: AppointmentStatus, note = ''): Observable<Appointment> { return this.api.patch(`/appointments/${id}/status`, { status, note }); }
  reschedule(id: string, body: { date: string; time: string; workshopId?: string; reason?: string }): Observable<Appointment> { return this.api.patch(`/appointments/${id}/reschedule`, body); }
  cancel(id: string, reason: string): Observable<Appointment> { return this.api.patch(`/appointments/${id}/cancel`, { reason }); }
  getRecord(id: string): Observable<ServiceRecord | null> { return this.api.get<ServiceRecord | null>(`/appointments/${id}/service-record`); }
  updateRecord(id: string, body: Partial<ServiceRecord>): Observable<ServiceRecord> { return this.api.put(`/appointments/${id}/service-record`, body); }
}

@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly api = inject(ApiService);
  list(q: Q = {}): Observable<Page<ServiceRecord>> { return this.api.page<ServiceRecord>('/service-records', q); }
  get(id: string): Observable<ServiceRecord> { return this.api.get(`/service-records/${id}`); }
  invoice(id: string): Observable<InvoiceView> { return this.api.get(`/service-records/${id}/invoice`); }
  recordPayment(id: string, body: { method: string; amount: number; reference?: string; note?: string }): Observable<ServiceRecord> {
    return this.api.post(`/service-records/${id}/payments`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);
  publicList(limit = 6): Observable<Page<Review>> { return this.api.page<Review>('/reviews/public', { limit }); }
  mine(): Observable<{ reviews: Review[]; pendingToReview: { id: string; reference: string; date: string; services: string[]; vehicle: string }[] }> { return this.api.get('/reviews/mine'); }
  adminList(q: Q = {}): Observable<Page<Review>> { return this.api.page<Review>('/reviews', q); }
  create(body: { appointmentId: string; rating: number; comment: string }): Observable<Review> { return this.api.post('/reviews', body); }
  update(id: string, body: { rating: number; comment: string }): Observable<Review> { return this.api.put(`/reviews/${id}`, body); }
  moderate(id: string, body: { status: string; adminResponse?: string }): Observable<Review> { return this.api.patch(`/reviews/${id}/moderate`, body); }
  remove(id: string): Observable<unknown> { return this.api.delete(`/reviews/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  readonly unread = signal(0);
  list(q: Q = {}): Observable<Page<AppNotification>> {
    return this.api.page<AppNotification>('/notifications', q).pipe(tap((p) => this.unread.set(p.meta.unreadCount ?? 0)));
  }
  refreshCount(): void {
    this.api.get<{ unreadCount: number }>('/notifications/unread-count').subscribe({ next: (r) => this.unread.set(r.unreadCount), error: () => undefined });
  }
  markRead(id: string): Observable<AppNotification> { return this.api.patch<AppNotification>(`/notifications/${id}/read`).pipe(tap(() => this.unread.update((n) => Math.max(0, n - 1)))); }
  markAllRead(): Observable<{ updated: number }> { return this.api.patch<{ updated: number }>('/notifications/read-all').pipe(tap(() => this.unread.set(0))); }
  remove(id: string): Observable<unknown> { return this.api.delete(`/notifications/${id}`); }
  broadcast(body: { title: string; message: string; audience: string }): Observable<{ sent: number }> { return this.api.post('/notifications/broadcast', body); }
  runReminders(): Observable<{ sent: number }> { return this.api.post('/notifications/run-reminders'); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);
  customer(): Observable<CustomerDashboard> { return this.api.get('/dashboard/customer'); }
  admin(): Observable<AdminDashboard> { return this.api.get('/dashboard/admin'); }
  staff(): Observable<StaffDashboard> { return this.api.get('/dashboard/staff'); }
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  // users / customers / staff
  users(q: Q = {}): Observable<Page<User>> { return this.api.page<User>('/users', q); }
  user(id: string): Observable<{ user: User; vehicles: Vehicle[]; appointments: { id: string; reference: string; date: string; time: string; status: AppointmentStatus; estimatedTotal: number }[] }> { return this.api.get(`/users/${id}`); }
  setUserActive(id: string, active: boolean): Observable<User> { return this.api.patch(`/users/${id}/status`, { active }); }
  setUserRole(id: string, role: string): Observable<User> { return this.api.patch(`/users/${id}/role`, { role }); }
  createStaff(body: Record<string, unknown>): Observable<User> { return this.api.post('/users/staff', body); }
  staffDirectory(): Observable<{ id: string; fullName: string; role: string }[]> { return this.api.get('/users/staff-directory'); }
  // technicians
  technicians(q: Q = {}): Observable<Technician[]> { return this.api.get('/technicians', q); }
  createTechnician(body: Partial<Technician>): Observable<Technician> { return this.api.post('/technicians', body); }
  updateTechnician(id: string, body: Partial<Technician>): Observable<Technician> { return this.api.put(`/technicians/${id}`, body); }
  removeTechnician(id: string): Observable<unknown> { return this.api.delete(`/technicians/${id}`); }
  // offers
  offers(all = false): Observable<Offer[]> { return this.api.get('/offers', { all }); }
  createOffer(body: Partial<Offer>): Observable<Offer> { return this.api.post('/offers', body); }
  updateOffer(id: string, body: Partial<Offer>): Observable<Offer> { return this.api.put(`/offers/${id}`, body); }
  removeOffer(id: string): Observable<unknown> { return this.api.delete(`/offers/${id}`); }
  // settings
  settings(): Observable<PublicSettings> { return this.api.get('/settings'); }
  updateSettings(body: Record<string, unknown>): Observable<PublicSettings> { return this.api.put('/settings', body); }
  // reports
  report(q: Q): Observable<ReportSummary> { return this.api.get('/reports/summary', q); }
  exportCsv(q: Q): Observable<Blob> { return this.api.download('/reports/export', q); }
  // contact
  messages(q: Q = {}): Observable<Page<ContactMessage>> { return this.api.page<ContactMessage>('/contact', q); }
  setMessageStatus(id: string, status: 'new' | 'handled'): Observable<ContactMessage> { return this.api.patch(`/contact/${id}`, { status }); }
  sendContact(body: Record<string, unknown>): Observable<{ message: string }> { return this.api.post('/contact', body); }
  // profile
  profile(): Observable<User> { return this.api.get('/profile'); }
  updateProfile(body: Partial<User>): Observable<User> { return this.api.put('/profile', body); }
}
