/** Dashboard, reports, settings, workshops, offers, technicians, users, profile, contact. */
const express = require('express');
const C = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const schemas = require('../validators/schemas');
const { protect, optionalAuth } = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimit');

const dashboard = express.Router();
dashboard.get('/customer', protect('customer'), h(C.dashboard.customer));
dashboard.get('/admin', protect('admin'), h(C.dashboard.admin));
dashboard.get('/staff', protect('advisor', 'technician', 'admin'), h(C.dashboard.staff));

const reports = express.Router();
reports.use(protect('admin'));
reports.get('/summary', h(C.reports.summary));
reports.get('/export', h(C.reports.export));

const settings = express.Router();
settings.get('/public', h(C.settings.publicSettings));
settings.get('/', protect('admin'), h(C.settings.get));
settings.put('/', protect('admin'), h(C.settings.update));

const workshops = express.Router();
workshops.get('/', optionalAuth, h(C.workshops.list));
workshops.get('/:id', h(C.workshops.get));
workshops.get('/:id/availability', h(C.workshops.availability));
workshops.post('/', protect('admin'), validateBody(schemas.workshop.fields), h(C.workshops.create));
workshops.put('/:id', protect('admin'), validateBody(schemas.workshop.fields), h(C.workshops.update));
workshops.delete('/:id', protect('admin'), h(C.workshops.remove));

const offers = express.Router();
offers.get('/', optionalAuth, h(C.offers.list));
offers.post('/', protect('admin'), validateBody(schemas.offer.fields), h(C.offers.create));
offers.put('/:id', protect('admin'), validateBody(schemas.offer.fields), h(C.offers.update));
offers.delete('/:id', protect('admin'), h(C.offers.remove));

const technicians = express.Router();
technicians.get('/', protect('admin', 'advisor'), h(C.technicians.list));
technicians.post('/', protect('admin'), validateBody(schemas.technician.fields), h(C.technicians.create));
technicians.put('/:id', protect('admin'), validateBody(schemas.technician.fields), h(C.technicians.update));
technicians.delete('/:id', protect('admin'), h(C.technicians.remove));

const users = express.Router();
users.get('/staff-directory', protect('admin', 'advisor'), h(C.users.staffDirectory));
users.get('/', protect('admin'), h(C.users.list));
users.post('/staff', protect('admin'), validateBody(schemas.staffUser.create), h(C.users.createStaff));
users.get('/:id', protect('admin', 'advisor'), h(C.users.get));
users.patch('/:id/status', protect('admin'), validateBody(schemas.staffUser.status), h(C.users.setStatus));
users.patch('/:id/role', protect('admin'), validateBody(schemas.staffUser.role), h(C.users.setRole));

const profile = express.Router();
profile.get('/', protect(), h(C.profile.get));
profile.put('/', protect(), validateBody(schemas.profile.update, { partial: true }), h(C.profile.update));

const contact = express.Router();
contact.post('/', contactLimiter, validateBody(schemas.contact.create), h(C.contact.create));
contact.get('/', protect('admin', 'advisor'), h(C.contact.list));
contact.patch('/:id', protect('admin', 'advisor'), h(C.contact.setStatus));

module.exports = { dashboard, reports, settings, workshops, offers, technicians, users, profile, contact };
