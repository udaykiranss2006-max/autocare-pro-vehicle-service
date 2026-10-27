const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  ADVISOR: 'advisor',
  TECHNICIAN: 'technician',
});
const STAFF_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.TECHNICIAN];
const MANAGER_ROLES = [ROLES.ADMIN, ROLES.ADVISOR];

const STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_PARTS: 'waiting_for_parts',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const ALL_STATUSES = Object.values(STATUS);
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  waiting_for_parts: 'Waiting for Parts',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Allowed status transitions (validated on the backend). */
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['waiting_for_parts', 'completed'],
  waiting_for_parts: ['in_progress'],
  completed: [],
  cancelled: [],
};

/** Transitions a technician is allowed to perform on appointments assigned to them. */
const TECHNICIAN_TRANSITIONS = {
  checked_in: ['in_progress'],
  in_progress: ['waiting_for_parts', 'completed'],
  waiting_for_parts: ['in_progress'],
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_progress', 'waiting_for_parts'];
const WORK_STATUSES = ['checked_in', 'in_progress', 'waiting_for_parts'];

const VEHICLE_TYPES = ['car', 'motorcycle', 'suv', 'van', 'lcv'];
const VEHICLE_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle / Scooter',
  suv: 'SUV',
  van: 'Van',
  lcv: 'Light Commercial Vehicle',
};
const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'lpg', 'electric', 'hybrid'];

const SERVICE_CATEGORIES = [
  'General Maintenance',
  'Engine and Mechanical Repairs',
  'Brake Services',
  'Tyre and Wheel Services',
  'Battery and Electrical Services',
  'Air Conditioning',
  'Cleaning and Detailing',
  'Bodywork and Exterior Repairs',
  'Inspection and Diagnostics',
  'Additional Services',
];

/** direct = book with a fixed estimate; inspection = final price after workshop inspection;
 *  request = request/enquiry handled by staff or a third party, subject to confirmation. */
const BOOKING_MODES = ['direct', 'inspection', 'request'];

const PAYMENT_METHODS = ['cash', 'card_at_counter', 'upi_at_counter', 'demo'];

module.exports = {
  ROLES,
  STAFF_ROLES,
  MANAGER_ROLES,
  STATUS,
  ALL_STATUSES,
  STATUS_LABELS,
  TRANSITIONS,
  TECHNICIAN_TRANSITIONS,
  ACTIVE_STATUSES,
  WORK_STATUSES,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  FUEL_TYPES,
  SERVICE_CATEGORIES,
  BOOKING_MODES,
  PAYMENT_METHODS,
};
