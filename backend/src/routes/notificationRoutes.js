const router = require('express').Router();
const { notifications: c } = require('../controllers/resourceControllers');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { notification } = require('../validators/schemas');
const { protect } = require('../middleware/auth');

router.use(protect());
router.get('/', h(c.list));
router.get('/unread-count', h(c.unreadCount));
router.patch('/read-all', h(c.markAllRead));
router.patch('/:id/read', h(c.markRead));
router.delete('/:id', h(c.remove));
router.post('/broadcast', protect('admin'), validateBody(notification.broadcast), h(c.broadcast));
router.post('/run-reminders', protect('admin'), h(c.runReminders));

module.exports = router;
