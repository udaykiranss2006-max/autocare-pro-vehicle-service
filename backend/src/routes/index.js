const router = require('express').Router();
const admin = require('./adminRoutes');

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));
router.use('/auth', require('./authRoutes'));
router.use('/services', require('./serviceRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/service-records', require('./recordRoutes'));
router.use('/invoices', require('./recordRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/dashboard', admin.dashboard);
router.use('/reports', admin.reports);
router.use('/settings', admin.settings);
router.use('/workshops', admin.workshops);
router.use('/offers', admin.offers);
router.use('/technicians', admin.technicians);
router.use('/users', admin.users);
router.use('/profile', admin.profile);
router.use('/contact', admin.contact);

module.exports = router;
