const router = require('express').Router();
const { appointments: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { appointment, serviceRecord } = require('../validators/schemas');
const { protect } = require('../middleware/auth');

router.use(protect());
router.get('/', h(c.list));
router.post('/estimate', protect('customer'), validateBody(appointment.estimate), h(c.estimate));
router.post('/', protect('customer'), validateBody(appointment.create), h(c.create));
router.get('/:id', h(c.get));
router.get('/:id/actions', h(c.actions));
router.put('/:id', validateBody(appointment.update, { partial: true }), h(c.update));
router.patch('/:id/status', protect('admin', 'advisor', 'technician'), validateBody(appointment.status), h(c.status));
router.patch('/:id/reschedule', protect('customer', 'admin', 'advisor'), validateBody(appointment.reschedule), h(c.reschedule));
router.patch('/:id/cancel', protect('customer', 'admin', 'advisor'), validateBody(appointment.cancel), h(c.cancel));
router.get('/:id/service-record', h(c.getRecord));
router.put('/:id/service-record', protect('admin', 'advisor', 'technician'), validateBody(serviceRecord.update, { partial: true }), h(c.updateRecord));

module.exports = router;
