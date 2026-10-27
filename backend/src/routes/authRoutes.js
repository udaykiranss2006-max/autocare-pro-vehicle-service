const router = require('express').Router();
const c = require('../controllers/authController');
const h = require('../utils/asyncHandler');
const { validateBody } = require('../validators/validate');
const { auth } = require('../validators/schemas');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const requireAppHeader = require('../middleware/csrf');

router.post('/register', authLimiter, validateBody(auth.register), h(c.register));
router.post('/login', authLimiter, validateBody(auth.login), h(c.login));
router.post('/refresh', requireAppHeader, h(c.refresh));
router.post('/logout', requireAppHeader, h(c.logout));
router.get('/me', authenticate, h(c.me));
router.post('/forgot-password', authLimiter, validateBody(auth.forgot), h(c.forgotPassword));
router.post('/reset-password', authLimiter, validateBody(auth.reset), h(c.resetPassword));
// change-password is allowed even when mustChangePassword is set
router.post('/change-password', authLimiter, authenticate, validateBody(auth.changePassword), h(c.changePassword));

module.exports = router;
