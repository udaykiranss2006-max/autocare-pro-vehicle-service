/** Thin HTTP controllers: translate requests into service calls and format responses. */
const { ok, created } = require('../utils/response');
const S = {
  catalog: require('../services/catalogService'),
  vehicle: require('../services/vehicleService'),
  appointment: require('../services/appointmentService'),
  record: require('../services/serviceRecordService'),
  review: require('../services/reviewService'),
  notification: require('../services/notificationService'),
  dashboard: require('../services/dashboardService'),
  report: require('../services/reportService'),
  settings: require('../services/settingsService'),
  workshop: require('../services/workshopService'),
  offer: require('../services/offerService'),
  technician: require('../services/technicianService'),
  user: require('../services/userService'),
  profile: require('../services/profileService'),
  contact: require('../services/contactService'),
  reminder: require('../services/reminderService'),
};
const { MANAGER_ROLES, STAFF_ROLES } = require('../config/constants');
const { validate } = require('../validators/validate');

const isStaffUser = (req) => req.user && STAFF_ROLES.includes(req.user.role);
const sendPage = (res, page) => ok(res, page.items, page.meta);

const services = {
  list: async (req, res) => sendPage(res, await S.catalog.list(req.query, { includeUnavailable: req.user && MANAGER_ROLES.includes(req.user.role) && req.query.all === 'true' })),
  categories: async (_req, res) => ok(res, await S.catalog.categories()),
  get: async (req, res) => ok(res, await S.catalog.get(req.params.id, { includeUnavailable: isStaffUser(req) })),
  create: async (req, res) => created(res, await S.catalog.create(req.body)),
  update: async (req, res) => ok(res, await S.catalog.update(req.params.id, req.body)),
  remove: async (req, res) => {
    await S.catalog.remove(req.params.id);
    ok(res, { deleted: true, id: req.params.id });
  },
};

const vehicles = {
  list: async (req, res) => sendPage(res, await S.vehicle.list(req.user, req.query)),
  get: async (req, res) => ok(res, await S.vehicle.get(req.user, req.params.id)),
  history: async (req, res) => ok(res, await S.vehicle.history(req.user, req.params.id)),
  create: async (req, res) => created(res, await S.vehicle.create(req.user, req.body)),
  update: async (req, res) => ok(res, await S.vehicle.update(req.user, req.params.id, req.body)),
  remove: async (req, res) => {
    await S.vehicle.remove(req.user, req.params.id);
    ok(res, { deleted: true });
  },
};

const appointments = {
  list: async (req, res) => sendPage(res, await S.appointment.list(req.user, req.query)),
  estimate: async (req, res) => {
    const { vehicle, ...est } = await S.appointment.estimate(req.body, req.user);
    ok(res, est);
  },
  create: async (req, res) => created(res, await S.appointment.create(req.user, req.body)),
  get: async (req, res) => ok(res, await S.appointment.get(req.user, req.params.id)),
  actions: async (req, res) => ok(res, await S.appointment.allowedActions(req.user, req.params.id)),
  update: async (req, res) => ok(res, await S.appointment.update(req.user, req.params.id, req.body)),
  status: async (req, res) => ok(res, await S.appointment.updateStatus(req.user, req.params.id, req.body)),
  reschedule: async (req, res) => ok(res, await S.appointment.reschedule(req.user, req.params.id, req.body)),
  cancel: async (req, res) => ok(res, await S.appointment.cancel(req.user, req.params.id, req.body)),
  getRecord: async (req, res) => ok(res, await S.record.getForAppointment(req.user, req.params.id)),
  updateRecord: async (req, res) => ok(res, await S.record.updateForAppointment(req.user, req.params.id, req.body)),
};

const records = {
  list: async (req, res) => sendPage(res, await S.record.list(req.user, req.query)),
  get: async (req, res) => ok(res, await S.record.get(req.user, req.params.id)),
  invoice: async (req, res) => ok(res, await S.record.invoice(req.user, req.params.id)),
  payment: async (req, res) => ok(res, await S.record.recordPayment(req.user, req.params.id, req.body)),
};

const reviews = {
  publicList: async (req, res) => sendPage(res, await S.review.publicList(req.query)),
  mine: async (req, res) => ok(res, await S.review.mine(req.user)),
  adminList: async (req, res) => sendPage(res, await S.review.adminList(req.query)),
  create: async (req, res) => created(res, await S.review.create(req.user, req.body)),
  update: async (req, res) => ok(res, await S.review.update(req.user, req.params.id, req.body)),
  moderate: async (req, res) => ok(res, await S.review.moderate(req.user, req.params.id, req.body)),
  remove: async (req, res) => {
    await S.review.remove(req.user, req.params.id);
    ok(res, { deleted: true });
  },
};

const notifications = {
  list: async (req, res) => sendPage(res, await S.notification.list(req.user, req.query)),
  unreadCount: async (req, res) => ok(res, { unreadCount: await S.notification.unreadCount(req.user) }),
  markRead: async (req, res) => ok(res, await S.notification.markRead(req.user, req.params.id)),
  markAllRead: async (req, res) => ok(res, await S.notification.markAllRead(req.user)),
  remove: async (req, res) => {
    await S.notification.remove(req.user, req.params.id);
    ok(res, { deleted: true });
  },
  broadcast: async (req, res) => ok(res, await S.notification.broadcast(req.body)),
  runReminders: async (_req, res) => ok(res, await S.reminder.runReminders()),
};

const dashboard = {
  customer: async (req, res) => ok(res, await S.dashboard.customer(req.user)),
  admin: async (_req, res) => ok(res, await S.dashboard.admin()),
  staff: async (req, res) => ok(res, await S.dashboard.staff(req.user)),
};

const reports = {
  summary: async (req, res) => ok(res, await S.report.summary(req.query)),
  export: async (req, res) => {
    const { filename, csv } = await S.report.exportCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
  },
};

const settings = {
  publicSettings: async (_req, res) => ok(res, await S.settings.getPublic()),
  get: async (_req, res) => ok(res, await S.settings.getAll()),
  update: async (req, res) => ok(res, await S.settings.update(req.body)),
};

const workshops = {
  list: async (req, res) => ok(res, await S.workshop.list({ includeInactive: req.user && req.user.role === 'admin' && req.query.all === 'true' })),
  get: async (req, res) => ok(res, await S.workshop.get(req.params.id)),
  availability: async (req, res) => {
    const { date } = validate(req.query, { date: { type: 'date', label: 'Date', required: true } });
    ok(res, await S.workshop.availability(req.params.id, date, req.query.excludeAppointmentId || null));
  },
  create: async (req, res) => created(res, await S.workshop.create(req.body)),
  update: async (req, res) => ok(res, await S.workshop.update(req.params.id, req.body)),
  remove: async (req, res) => {
    await S.workshop.remove(req.params.id);
    ok(res, { deleted: true });
  },
};

const offers = {
  list: async (req, res) => ok(res, await S.offer.list({ includeInactive: req.user && req.user.role === 'admin' && req.query.all === 'true' })),
  create: async (req, res) => created(res, await S.offer.create(req.body)),
  update: async (req, res) => ok(res, await S.offer.update(req.params.id, req.body)),
  remove: async (req, res) => {
    await S.offer.remove(req.params.id);
    ok(res, { deleted: true });
  },
};

const technicians = {
  list: async (req, res) => ok(res, await S.technician.list(req.query)),
  create: async (req, res) => created(res, await S.technician.create(req.body)),
  update: async (req, res) => ok(res, await S.technician.update(req.params.id, req.body)),
  remove: async (req, res) => {
    await S.technician.remove(req.params.id);
    ok(res, { deleted: true });
  },
};

const users = {
  list: async (req, res) => sendPage(res, await S.user.list(req.query)),
  staffDirectory: async (_req, res) => {
    const page = await S.user.list({ role: 'admin,advisor,technician', active: 'true', limit: 100 });
    ok(res, page.items.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })));
  },
  get: async (req, res) => ok(res, await S.user.get(req.params.id)),
  setStatus: async (req, res) => ok(res, await S.user.setActive(req.user, req.params.id, req.body.active)),
  setRole: async (req, res) => ok(res, await S.user.setRole(req.user, req.params.id, req.body.role)),
  createStaff: async (req, res) => created(res, await S.user.createStaff(req.body)),
};

const profile = {
  get: async (req, res) => ok(res, await S.profile.get(req.user)),
  update: async (req, res) => ok(res, await S.profile.update(req.user, req.body)),
};

const contact = {
  create: async (req, res) => created(res, await S.contact.create(req.body)),
  list: async (req, res) => sendPage(res, await S.contact.list(req.query)),
  setStatus: async (req, res) => ok(res, await S.contact.setStatus(req.params.id, req.body && req.body.status)),
};

module.exports = { services, vehicles, appointments, records, reviews, notifications, dashboard, reports, settings, workshops, offers, technicians, users, profile, contact };
