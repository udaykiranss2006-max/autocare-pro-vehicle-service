const { users } = require('../repositories');
const { publicUser } = require('../utils/sanitize');
const ApiError = require('../utils/ApiError');

async function get(user) {
  return publicUser(await users.findById(user.id));
}

async function update(user, data) {
  const patch = {};
  ['fullName', 'phone', 'address'].forEach((k) => {
    if (data[k] !== undefined && data[k] !== '') patch[k] = data[k];
  });
  if (data.address === '') patch.address = '';
  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update');
  return publicUser(await users.updateRecord(user.id, patch));
}

module.exports = { get, update };
