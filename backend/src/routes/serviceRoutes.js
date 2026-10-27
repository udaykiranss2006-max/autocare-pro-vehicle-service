const router = require('express').Router();
const { services: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { service } = require('../validators/schemas');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, h(c.list));
router.get('/categories', h(c.categories));
router.get('/:id', optionalAuth, h(c.get));
router.post('/', protect('admin'), validateBody(service.fields), h(c.create));
router.put('/:id', protect('admin'), validateBody(service.fields), h(c.update));
router.patch('/:id', protect('admin'), validateBody(service.fields, { partial: true }), h(c.update));
router.delete('/:id', protect('admin'), h(c.remove));

module.exports = router;
