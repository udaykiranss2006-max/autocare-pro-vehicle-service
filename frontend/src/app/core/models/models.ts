export type Role = 'customer' | 'admin' | 'advisor' | 'technician';
export type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'waiting_for_parts' | 'completed' | 'cancelled';
export type VehicleType = 'car' | 'motorcycle' | 'suv' | 'van' | 'lcv';
export type BookingMode = 'direct' | 'inspection' | 'request';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount?: number;
  averageRating?: number | null;
  count?: number;
}
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  role: Role;
  active: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  vehicleCount?: number;
  appointmentCount?: number;
}

export interface Session {
  user: User;
  accessToken: string;
  expiresIn: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  type: VehicleType;
  brand: string;
  model: string;
  registrationNumber: string;
  year: number;
  fuelType: string;
  odometer: number;
  vin?: string;
  notes?: string;
  createdAt: string;
}

export interface Faq { q: string; a: string; }

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  priceFrom: number;
  durationMinutes: number;
  benefits: string[];
  inclusions: string[];
  exclusions: string[];
  vehicleTypes: VehicleType[];
  bookingMode: BookingMode;
  available: boolean;
  popular: boolean;
  faqs: Faq[];
}

export interface DayHours { open: string; close: string; }
export interface Workshop {
  id: string;
  name: string;
  address: string;
  phone?: string;
  hours: Record<string, DayHours | null>;
  capacityPerSlot: number;
  dailyCapacity: number;
  closedDates: string[];
  active: boolean;
}

export interface Slot { time: string; remaining: number; available: boolean; reason: string | null; }
export interface Availability {
  workshopId: string;
  date: string;
  closed: boolean;
  reason: string | null;
  open: string | null;
  close: string | null;
  slots: Slot[];
}

export interface EstimateItem {
  serviceId: string;
  name: string;
  category: string;
  bookingMode: BookingMode;
  durationMinutes: number;
  price: number;
}
export interface Estimate {
  items: EstimateItem[];
  subtotal: number;
  discount: number;
  offer: { id: string; code: string; title: string; discountPercent: number } | null;
  packageApplied: { id: string; title: string; packagePrice: number } | null;
  taxPercent: number;
  tax: number;
  total: number;
  estimatedDurationMinutes: number;
  requiresInspection: boolean;
  note: string;
}

export interface StatusHistoryEntry { status: AppointmentStatus; at: string; byUserId?: string; byName: string; byRole: Role; note: string; }
export interface InternalNote { id: string; note: string; at: string; byName: string; byRole: Role; }

export interface Appointment {
  id: string;
  reference: string;
  customerId: string;
  customerSnapshot: { fullName: string; email: string; phone: string };
  vehicleId: string;
  vehicleSnapshot: { type: VehicleType; brand: string; model: string; registrationNumber: string; year: number; fuelType: string; odometer: number };
  services: EstimateItem[];
  workshopId: string;
  workshopName: string;
  date: string;
  time: string;
  scheduledAt: string;
  estimatedDurationMinutes: number;
  estimate: { subtotal: number; discount: number; offer: Estimate['offer']; packageApplied?: Estimate['packageApplied']; taxPercent: number; tax: number; total: number };
  estimatedTotal: number;
  requiresInspection: boolean;
  problemCategory: string;
  problemDescription: string;
  pickup: { pickupRequested: boolean; dropRequested: boolean; address: string; contactPhone: string; status: 'requested' | 'approved' | 'declined' | 'not_requested' };
  status: AppointmentStatus;
  statusHistory: StatusHistoryEntry[];
  advisorId: string | null;
  advisorName: string | null;
  technicianId: string | null;
  technicianName: string | null;
  estimatedCompletionAt: string | null;
  customerNotes: string;
  internalNotes?: InternalNote[];
  cancellation: { reason: string; at: string; byName: string; byRole: Role } | null;
  rescheduleCount: number;
  completedAt?: string;
  createdAt: string;
  serviceRecord?: { id: string; status: string; total: number; invoiceNumber: string | null; paymentStatus: string | null };
}

export interface LabourItem { description: string; hours: number; rate: number; amount?: number; }
export interface PartItem { name: string; partNumber?: string; quantity: number; unitPrice: number; amount?: number; }
export interface ChecklistItem { label: string; done: boolean; }
export interface Payment { id: string; method: string; amount: number; reference: string; note: string; isDemo: boolean; verification: string; recordedBy: { name: string }; recordedAt: string; }

export interface ServiceRecord {
  id: string;
  appointmentId: string;
  appointmentRef: string;
  customerId: string;
  customerName?: string;
  vehicleId: string;
  vehicleSnapshot: Appointment['vehicleSnapshot'];
  technicianName: string | null;
  servicesPerformed: { serviceId: string; name: string }[];
  checklist: ChecklistItem[];
  labourItems: LabourItem[];
  parts: PartItem[];
  labourTotal: number;
  partsTotal: number;
  subtotal: number;
  discount: { type: 'flat' | 'percent'; value: number; amount: number; reason?: string };
  taxPercent: number;
  taxAmount: number;
  total: number;
  technicianNotes: string;
  odometerAtService: number;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  status: 'draft' | 'finalized';
  completedAt: string | null;
  invoice: { number: string; issuedAt: string; paymentStatus: string; amountPaid: number; amountReceived?: number; balance: number; payments: Payment[] } | null;
  createdAt: string;
}

export interface InvoiceView {
  record: ServiceRecord;
  appointment: { reference: string; date: string; time: string; services: EstimateItem[] } | null;
  customer: { fullName: string; email: string; phone: string; address?: string } | null;
  business: PublicSettings['business'];
  workshop: { name: string; address: string; phone?: string } | null;
  tax: { gstPercent: number; label: string };
  paymentNote: string;
}

export interface Review {
  id: string;
  appointmentId?: string;
  appointmentRef: string;
  customerDisplayName: string;
  customerName?: string;
  serviceNames: string[];
  vehicleLabel: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse: string;
  edited?: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Offer {
  id: string;
  kind: 'offer' | 'package';
  title: string;
  description: string;
  code: string;
  discountPercent: number;
  packagePrice: number | null;
  serviceIds: string[];
  validUntil: string | null;
  active: boolean;
}

export interface Technician {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  specializations: string[];
  workshopId: string;
  experienceYears: number;
  active: boolean;
  userId: string | null;
  activeJobs?: number;
}

export interface RegPattern { name: string; regex: string; }

export interface PublicSettings {
  business: { name: string; tagline: string; phone: string; email: string; address: string; mapEmbedUrl: string; isSampleData: boolean; timezone: string; currency: string; social: Record<string, string> };
  booking: { slotMinutes: number; minLeadMinutes: number; maxAdvanceDays: number; cancellationCutoffHours: number; rescheduleCutoffHours: number; maxReschedules: number; cancellationPolicy: string };
  tax: { gstPercent: number; label: string };
  registrationNumber: { enabled: boolean; patterns: RegPattern[] };
  problemCategories: string[];
  vehicleTypePriceFactor: Record<string, number>;
  payment: { gatewayConfigured: boolean; note: string; demoModeEnabled?: boolean };
  vehicleTypes: { value: VehicleType; label: string }[];
  fuelTypes: string[];
  serviceCategories: string[];
  statusLabels: Record<string, string>;
}

export interface AppointmentBrief {
  id: string;
  reference: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  customerName: string;
  vehicle: string;
  registrationNumber: string;
  services: string[];
  workshopName: string;
  technicianName: string | null;
  estimatedTotal: number;
  estimatedCompletionAt: string | null;
  createdAt: string;
}

export interface CustomerDashboard {
  profile: User;
  stats: { totalAppointments: number; upcomingAppointments: number; completedServices: number; pendingRequests: number; inWorkshop: number; vehicleCount: number; unreadNotifications: number };
  spending: { totalInvoiced: number; outstanding: number; upcomingEstimate: number; invoiceCount: number };
  upcoming: AppointmentBrief[];
  active: AppointmentBrief[];
  recentHistory: { id: string; appointmentRef: string; completedAt: string; vehicle: string; services: string[]; total: number; invoiceNumber: string }[];
  notifications: AppNotification[];
  maintenanceReminders: { vehicle: string; registrationNumber: string; nextServiceDate: string }[];
}

export interface AdminDashboard {
  stats: {
    totalCustomers: number; activeCustomers: number; totalVehicles: number; todaysAppointments: number; pendingAppointments: number; inProgress: number;
    completedServices: number; cancelledAppointments: number; estimatedRevenue: number; recordedPayments: number; outstandingBalance: number;
    pendingReviews: number; averageRating: number | null; unassignedActive: number;
  };
  popularServices: { name: string; count: number }[];
  recentBookings: AppointmentBrief[];
  upcoming: AppointmentBrief[];
  statusBreakdown: Record<string, number>;
  last7Days: { date: string; bookings: number; revenue: number }[];
}

export interface StaffDashboard {
  role: Role;
  linkedTechnicianProfile: boolean | null;
  stats: { assignedOpen: number; todaysWorkload: number; inProgress: number; waitingForParts: number; checkedIn: number; completedTotal: number; pendingConfirmation: number | null; unassigned: number | null };
  today: AppointmentBrief[];
  activeJobs: AppointmentBrief[];
  completedSummary: { id: string; appointmentRef: string; completedAt: string; vehicle: string; labourHours: number; partsCount: number; total: number }[];
}

export interface ReportSummary {
  period: string;
  from: string;
  to: string;
  rows: { period: string; bookings: number; completed: number; cancelled: number; revenue: number; paymentsRecorded: number }[];
  totals: { bookings: number; completed: number; cancelled: number; revenue: number; paymentsRecorded: number; averageInvoice: number };
  topServices: { name: string; count: number }[];
  byWorkshop: { name: string; count: number }[];
}

export interface ContactMessage { id: string; name: string; email: string; phone: string; subject: string; message: string; status: 'new' | 'handled'; createdAt: string; }

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  waiting_for_parts: 'Waiting for Parts',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle / Scooter',
  suv: 'SUV',
  van: 'Van',
  lcv: 'Light Commercial Vehicle',
};

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  direct: 'Book directly',
  inspection: 'Requires workshop inspection',
  request: 'Request - subject to confirmation',
};
