const router = require('express').Router();
const { vehicles: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { vehicle } = require('../validators/schemas');
const { protect } = require('../middleware/auth');

router.use(protect('customer', 'admin', 'advisor', 'technician'));
router.get('/', h(c.list));
router.post('/', protect('customer'), validateBody(vehicle.fields), h(c.create));
router.get('/:id', h(c.get));
router.get('/:id/history', h(c.history));
router.put('/:id', protect('customer', 'admin', 'advisor'), validateBody(vehicle.fields), h(c.update));
router.delete('/:id', protect('customer', 'admin'), h(c.remove));

module.exports = router;
