const router = require('express').Router();
const { reviews: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { review } = require('../validators/schemas');
const { protect } = require('../middleware/auth');

router.get('/public', h(c.publicList));
router.get('/mine', protect('customer'), h(c.mine));
router.get('/', protect('admin', 'advisor'), h(c.adminList));
router.post('/', protect('customer'), validateBody(review.create), h(c.create));
router.put('/:id', protect('customer'), validateBody(review.update), h(c.update));
router.patch('/:id/moderate', protect('admin'), validateBody(review.moderate), h(c.moderate));
router.delete('/:id', protect('customer', 'admin'), h(c.remove));

module.exports = router;
