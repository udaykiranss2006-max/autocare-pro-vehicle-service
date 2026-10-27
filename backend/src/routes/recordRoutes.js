const router = require('express').Router();
const { records: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { serviceRecord } = require('../validators/schemas');
const { protect } = require('../middleware/auth');

// /api/service-records  (also mounted as /api/invoices for invoice-centric clients)
router.use(protect());
router.get('/', h(c.list));
router.get('/:id', h(c.get));
router.get('/:id/invoice', h(c.invoice));
router.post('/:id/payments', protect('admin', 'advisor'), validateBody(serviceRecord.payment), h(c.payment));

module.exports = router;
