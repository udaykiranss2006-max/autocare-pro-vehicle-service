const PRIVATE_USER_FIELDS = ['passwordHash', 'resetTokenHash', 'resetTokenExpiresAt', 'failedLoginCount', 'lockUntil', 'passwordVersion'];

function publicUser(user) {
  if (!user) return null;
  const copy = { ...user };
  PRIVATE_USER_FIELDS.forEach((f) => delete copy[f]);
  return copy;
}

module.exports = { publicUser };
