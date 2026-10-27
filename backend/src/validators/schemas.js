const { VEHICLE_TYPES, FUEL_TYPES, ALL_STATUSES, SERVICE_CATEGORIES, BOOKING_MODES, PAYMENT_METHODS } = require('../config/constants');

const PHONE_RE = /^\+91[6-9]\d{9}$/;
const normalizePhone = (v) => {
  let digits = v.replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) digits = `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) digits = `+${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) digits = `+91${digits.slice(1)}`;
  return digits;
};

function passwordStrength(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Password is too long (max 72 bytes)';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
    return 'Password must include upper-case, lower-case, a number and a symbol';
  }
  return undefined;
}

const name = { type: 'string', label: 'Full name', min: 2, max: 80, pattern: /^[\p{L} .'-]+$/u, patternMessage: 'Name can contain letters, spaces, dots, apostrophes and hyphens only' };
const phone = { type: 'string', label: 'Phone number', transform: normalizePhone, pattern: PHONE_RE, patternMessage: 'Enter a valid 10-digit Indian mobile number' };
const password = { type: 'string', label: 'Password', trim: false, check: passwordStrength };
const address = { type: 'string', label: 'Address', max: 300 };

const auth = {
  register: {
    fullName: { ...name, required: true },
    email: { type: 'email', label: 'Email', required: true },
    phone: { ...phone, required: true },
    password: { ...password, required: true },
    confirmPassword: { type: 'string', label: 'Confirm password', trim: false, required: true },
    address,
    acceptTerms: { type: 'boolean', label: 'Terms', required: true, check: (v) => (v === true ? undefined : 'You must accept the terms and conditions') },
  },
  login: {
    email: { type: 'email', label: 'Email', required: true },
    password: { type: 'string', label: 'Password', trim: false, required: true, max: 200 },
    rememberMe: { type: 'boolean', default: false },
  },
  forgot: { email: { type: 'email', label: 'Email', required: true } },
  reset: {
    token: { type: 'string', label: 'Reset token', required: true, min: 20, max: 200 },
    password: { ...password, required: true },
    confirmPassword: { type: 'string', label: 'Confirm password', trim: false, required: true },
  },
  changePassword: {
    currentPassword: { type: 'string', label: 'Current password', trim: false, required: true, max: 200 },
    newPassword: { ...password, label: 'New password', required: true },
    confirmPassword: { type: 'string', label: 'Confirm password', trim: false, required: true },
  },
};

const profile = {
  update: { fullName: { ...name }, phone: { ...phone }, address },
};

const vehicle = {
  fields: {
    type: { type: 'string', label: 'Vehicle type', required: true, enum: VEHICLE_TYPES },
    brand: { type: 'string', label: 'Brand', required: true, min: 2, max: 40 },
    model: { type: 'string', label: 'Model', required: true, min: 1, max: 60 },
    registrationNumber: { type: 'string', label: 'Registration number', required: true, uppercase: true, transform: (v) => v.replace(/[\s\-.]/g, ''), min: 4, max: 15 },
    year: { type: 'integer', label: 'Manufacturing year', required: true, min: 1950, max: new Date().getFullYear() + 1 },
    fuelType: { type: 'string', label: 'Fuel type', required: true, enum: FUEL_TYPES },
    odometer: { type: 'integer', label: 'Odometer reading', required: true, min: 0, max: 2000000 },
    vin: { type: 'string', label: 'VIN', uppercase: true, pattern: /^[A-HJ-NPR-Z0-9]{11,17}$/, patternMessage: 'VIN must be 11-17 letters/digits (no I, O, Q)' },
    notes: { type: 'string', label: 'Notes', max: 500 },
  },
};

const pickup = {
  type: 'object',
  label: 'Pickup/drop-off',
  schema: {
    pickupRequested: { type: 'boolean', default: false },
    dropRequested: { type: 'boolean', default: false },
    address: { type: 'string', label: 'Pickup address', max: 300 },
    contactPhone: { ...phone, label: 'Pickup contact phone' },
  },
};

const appointment = {
  create: {
    vehicleId: { type: 'string', label: 'Vehicle', required: true, max: 60 },
    serviceIds: { type: 'array', label: 'Services', required: true, min: 1, max: 10, unique: true, items: { type: 'string', max: 60 } },
    workshopId: { type: 'string', label: 'Workshop', required: true, max: 60 },
    date: { type: 'date', label: 'Date', required: true },
    time: { type: 'time', label: 'Time', required: true },
    problemCategory: { type: 'string', label: 'Problem category', max: 60 },
    problemDescription: { type: 'string', label: 'Problem description', max: 1000 },
    pickup,
    offerCode: { type: 'string', label: 'Offer code', uppercase: true, max: 30 },
    acceptPolicy: { type: 'boolean', label: 'Policy', required: true, check: (v) => (v ? undefined : 'Please accept the terms and cancellation policy') },
  },
  estimate: {
    vehicleId: { type: 'string', label: 'Vehicle', required: true, max: 60 },
    serviceIds: { type: 'array', label: 'Services', required: true, min: 1, max: 10, unique: true, items: { type: 'string', max: 60 } },
    offerCode: { type: 'string', label: 'Offer code', uppercase: true, max: 30 },
  },
  update: {
    advisorId: { type: 'string', label: 'Service advisor', max: 60, nullable: true },
    technicianId: { type: 'string', label: 'Technician', max: 60, nullable: true },
    estimatedCompletionAt: { type: 'string', label: 'Estimated completion', max: 40, check: (v) => (Number.isNaN(Date.parse(v)) ? 'Estimated completion must be a valid date/time' : undefined), nullable: true },
    internalNote: { type: 'string', label: 'Internal note', max: 1000 },
    customerNotes: { type: 'string', label: 'Customer notes', max: 1000 },
    problemDescription: { type: 'string', label: 'Problem description', max: 1000 },
    pickupStatus: { type: 'string', label: 'Pickup status', enum: ['requested', 'approved', 'declined', 'not_requested'] },
  },
  status: {
    status: { type: 'string', label: 'Status', required: true, enum: ALL_STATUSES },
    note: { type: 'string', label: 'Note', max: 500 },
  },
  reschedule: {
    date: { type: 'date', label: 'Date', required: true },
    time: { type: 'time', label: 'Time', required: true },
    workshopId: { type: 'string', label: 'Workshop', max: 60 },
    reason: { type: 'string', label: 'Reason', max: 500 },
  },
  cancel: { reason: { type: 'string', label: 'Cancellation reason', required: true, min: 3, max: 500 } },
};

const lineItem = {
  labour: {
    schema: {
      description: { type: 'string', label: 'Labour description', required: true, max: 200 },
      hours: { type: 'number', label: 'Hours', required: true, min: 0, max: 200 },
      rate: { type: 'number', label: 'Rate', required: true, min: 0, max: 100000 },
    },
  },
  part: {
    schema: {
      name: { type: 'string', label: 'Part name', required: true, max: 200 },
      partNumber: { type: 'string', label: 'Part number', max: 60 },
      quantity: { type: 'number', label: 'Quantity', required: true, min: 0.01, max: 1000 },
      unitPrice: { type: 'number', label: 'Unit price', required: true, min: 0, max: 1000000 },
    },
  },
  checklist: { schema: { label: { type: 'string', label: 'Checklist item', required: true, max: 200 }, done: { type: 'boolean', default: false } } },
};

const serviceRecord = {
  update: {
    labourItems: { type: 'array', label: 'Labour', max: 50, items: lineItem.labour },
    parts: { type: 'array', label: 'Parts', max: 100, items: lineItem.part },
    checklist: { type: 'array', label: 'Checklist', max: 60, items: lineItem.checklist },
    discount: {
      type: 'object',
      label: 'Discount',
      schema: {
        type: { type: 'string', label: 'Discount type', enum: ['flat', 'percent'], default: 'flat' },
        value: { type: 'number', label: 'Discount value', min: 0, max: 1000000, default: 0 },
        reason: { type: 'string', label: 'Discount reason', max: 200 },
      },
    },
    technicianNotes: { type: 'string', label: 'Technician notes', max: 2000 },
    odometerAtService: { type: 'integer', label: 'Odometer at service', min: 0, max: 2000000 },
    nextServiceDate: { type: 'date', label: 'Next service date', nullable: true },
    nextServiceOdometer: { type: 'integer', label: 'Next service odometer', min: 0, max: 2000000, nullable: true },
  },
  payment: {
    method: { type: 'string', label: 'Payment method', required: true, enum: PAYMENT_METHODS },
    amount: { type: 'number', label: 'Amount', required: true, min: 1, max: 10000000 },
    reference: { type: 'string', label: 'Reference', max: 80 },
    note: { type: 'string', label: 'Note', max: 300 },
  },
};

const strList = (label, max = 20) => ({ type: 'array', label, max, items: { type: 'string', max: 200 } });

const service = {
  fields: {
    name: { type: 'string', label: 'Service name', required: true, min: 3, max: 100 },
    category: { type: 'string', label: 'Category', required: true, enum: SERVICE_CATEGORIES },
    description: { type: 'string', label: 'Description', required: true, min: 10, max: 1000 },
    icon: { type: 'string', label: 'Icon', max: 30, default: 'wrench' },
    priceFrom: { type: 'number', label: 'Starting price', required: true, min: 0, max: 1000000 },
    durationMinutes: { type: 'integer', label: 'Estimated duration', required: true, min: 10, max: 10080 },
    benefits: strList('Benefits'),
    inclusions: strList('Inclusions', 30),
    exclusions: strList('Exclusions'),
    vehicleTypes: { type: 'array', label: 'Vehicle types', required: true, min: 1, unique: true, items: { type: 'string', enum: VEHICLE_TYPES } },
    bookingMode: { type: 'string', label: 'Booking mode', enum: BOOKING_MODES, default: 'direct' },
    available: { type: 'boolean', default: true },
    popular: { type: 'boolean', default: false },
    faqs: { type: 'array', label: 'FAQs', max: 15, items: { schema: { q: { type: 'string', label: 'Question', required: true, max: 200 }, a: { type: 'string', label: 'Answer', required: true, max: 1000 } } } },
  },
};

const review = {
  create: {
    appointmentId: { type: 'string', label: 'Appointment', required: true, max: 60 },
    rating: { type: 'integer', label: 'Rating', required: true, min: 1, max: 5 },
    comment: { type: 'string', label: 'Feedback', required: true, min: 5, max: 1000 },
  },
  update: {
    rating: { type: 'integer', label: 'Rating', required: true, min: 1, max: 5 },
    comment: { type: 'string', label: 'Feedback', required: true, min: 5, max: 1000 },
  },
  moderate: {
    status: { type: 'string', label: 'Status', required: true, enum: ['approved', 'rejected', 'pending'] },
    adminResponse: { type: 'string', label: 'Response', max: 500 },
  },
};

const technician = {
  fields: {
    name: { ...name, label: 'Name', required: true },
    phone: { ...phone },
    email: { type: 'email', label: 'Email' },
    specializations: strList('Specializations', 15),
    workshopId: { type: 'string', label: 'Workshop', required: true, max: 60 },
    experienceYears: { type: 'integer', label: 'Experience', min: 0, max: 60, default: 0 },
    active: { type: 'boolean', default: true },
    userId: { type: 'string', label: 'Login account', max: 60, nullable: true },
  },
};

const staffUser = {
  create: {
    fullName: { ...name, required: true },
    email: { type: 'email', label: 'Email', required: true },
    phone: { ...phone, required: true },
    role: { type: 'string', label: 'Role', required: true, enum: ['admin', 'advisor', 'technician'] },
    temporaryPassword: { ...password, label: 'Temporary password', required: true },
    workshopId: { type: 'string', label: 'Workshop', max: 60 },
    specializations: strList('Specializations', 15),
  },
  status: { active: { type: 'boolean', label: 'Active', required: true } },
  role: { role: { type: 'string', label: 'Role', required: true, enum: ['customer', 'admin', 'advisor', 'technician'] } },
};

const dayHours = { type: 'object', label: 'Hours', nullable: true, schema: { open: { type: 'time', label: 'Opening time', required: true }, close: { type: 'time', label: 'Closing time', required: true } } };

const workshop = {
  fields: {
    name: { type: 'string', label: 'Workshop name', required: true, min: 3, max: 100 },
    address: { type: 'string', label: 'Address', required: true, max: 300 },
    phone: { type: 'string', label: 'Phone', max: 40 },
    hours: {
      type: 'object',
      label: 'Business hours',
      required: true,
      schema: { mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours },
    },
    capacityPerSlot: { type: 'integer', label: 'Capacity per slot', required: true, min: 1, max: 100 },
    dailyCapacity: { type: 'integer', label: 'Daily capacity', required: true, min: 1, max: 1000 },
    closedDates: { type: 'array', label: 'Closed dates', max: 100, items: { type: 'date' } },
    active: { type: 'boolean', default: true },
  },
};

const offer = {
  fields: {
    title: { type: 'string', label: 'Title', required: true, min: 3, max: 100 },
    description: { type: 'string', label: 'Description', required: true, max: 500 },
    kind: { type: 'string', label: 'Type', enum: ['offer', 'package'], default: 'offer' },
    code: { type: 'string', label: 'Code', uppercase: true, max: 30, pattern: /^[A-Z0-9_-]+$/, patternMessage: 'Code can contain letters, digits, - and _' },
    discountPercent: { type: 'number', label: 'Discount %', min: 0, max: 90, default: 0 },
    packagePrice: { type: 'number', label: 'Package price', min: 0, max: 1000000, nullable: true },
    serviceIds: { type: 'array', label: 'Services', max: 20, unique: true, items: { type: 'string', max: 60 } },
    validUntil: { type: 'date', label: 'Valid until', nullable: true },
    active: { type: 'boolean', default: true },
  },
};

const contact = {
  create: {
    name: { ...name, label: 'Name', required: true },
    email: { type: 'email', label: 'Email', required: true },
    phone: { ...phone },
    subject: { type: 'string', label: 'Subject', required: true, min: 3, max: 120 },
    message: { type: 'string', label: 'Message', required: true, min: 10, max: 2000 },
  },
};

const notification = {
  broadcast: {
    title: { type: 'string', label: 'Title', required: true, min: 3, max: 120 },
    message: { type: 'string', label: 'Message', required: true, min: 3, max: 1000 },
    audience: { type: 'string', label: 'Audience', enum: ['customers', 'staff', 'all'], default: 'customers' },
  },
};

module.exports = { auth, profile, vehicle, appointment, serviceRecord, service, review, technician, staffUser, workshop, offer, contact, notification, passwordStrength, normalizePhone, PHONE_RE };
