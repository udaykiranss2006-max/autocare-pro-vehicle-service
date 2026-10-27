const { env } = require('../config/env');
const authService = require('../services/authService');
const { ok, created } = require('../utils/response');
const { publicUser } = require('../utils/sanitize');

const COOKIE = 'acp_rt';

function setRefreshCookie(res, token, session) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure || env.isProd,
    sameSite: 'strict',
    path: '/api/auth',
    ...(session.remember ? { expires: new Date(session.expiresAt) } : {}), // session cookie unless "remember me"
  });
}
const clearRefreshCookie = (res) => res.clearCookie(COOKIE, { path: '/api/auth', httpOnly: true, sameSite: 'strict', secure: env.cookieSecure || env.isProd });

const sessionBody = (r) => ({ user: r.user, accessToken: r.accessToken, expiresIn: env.accessTokenTtl });

module.exports = {
  register: async (req, res) => created(res, { user: await authService.register(req.body), message: 'Account created successfully. Please sign in.' }),

  login: async (req, res) => {
    const result = await authService.login(req.body, req.get('user-agent'));
    setRefreshCookie(res, result.refreshToken, result.session);
    ok(res, sessionBody(result));
  },

  refresh: async (req, res) => {
    try {
      const result = await authService.refresh(req.cookies[COOKIE], req.get('user-agent'));
      setRefreshCookie(res, result.refreshToken, result.session);
      ok(res, sessionBody(result));
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  },

  logout: async (req, res) => {
    await authService.logout(req.cookies[COOKIE]);
    clearRefreshCookie(res);
    ok(res, { message: 'Signed out' });
  },

  me: async (req, res) => ok(res, { user: publicUser(req.user) }),

  forgotPassword: async (req, res) => ok(res, await authService.forgotPassword(req.body.email)),

  resetPassword: async (req, res) => ok(res, await authService.resetPassword(req.body)),

  changePassword: async (req, res) => {
    const result = await authService.changePassword(req.user, req.body, req.get('user-agent'));
    setRefreshCookie(res, result.refreshToken, result.session);
    ok(res, { ...sessionBody(result), message: 'Password changed successfully' });
  },
};
