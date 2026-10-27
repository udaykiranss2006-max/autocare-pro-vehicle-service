const { notifications, users, mutateJsonFile } = require('../repositories');
const { newId } = require('../utils/id');
const { paginate } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');

/** In-app notifications. Email/SMS are optional integrations that need credentials (not configured). */
async function notifyMany(userIds, { type, title, message, link = null }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return [];
  return mutateJsonFile('notifications.json', (list) => {
    const now = new Date().toISOString();
    const created = ids.map((userId) => ({ id: newId('ntf'), userId, type, title, message, link, read: false, createdAt: now, updatedAt: now }));
    list.push(...created);
    // keep the file bounded: max 200 notifications per user
    const perUser = {};
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const u = list[i].userId;
      perUser[u] = (perUser[u] || 0) + 1;
      if (perUser[u] > 200) list.splice(i, 1);
    }
    return created;
  });
}

const notify = (userId, payload) => notifyMany([userId], payload);

async function notifyRoles(roles, payload) {
  const recipients = await users.findAll((u) => roles.includes(u.role) && u.active);
  return notifyMany(recipients.map((u) => u.id), payload);
}

async function list(user, query) {
  let items = await notifications.findAll((n) => n.userId === user.id);
  if (query.unread === 'true') items = items.filter((n) => !n.read);
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = (await notifications.findAll((n) => n.userId === user.id && !n.read)).length;
  const page = paginate(items, query, 50);
  return { items: page.items, meta: { ...page.meta, unreadCount } };
}

async function unreadCount(user) {
  return (await notifications.findAll((n) => n.userId === user.id && !n.read)).length;
}

async function markRead(user, id) {
  const n = await notifications.findById(id);
  if (!n || n.userId !== user.id) throw ApiError.notFound('Notification not found');
  return notifications.updateRecord(id, { read: true });
}

async function markAllRead(user) {
  return mutateJsonFile('notifications.json', (list) => {
    let count = 0;
    list.forEach((n) => {
      if (n.userId === user.id && !n.read) {
        n.read = true;
        n.updatedAt = new Date().toISOString();
        count += 1;
      }
    });
    return { updated: count };
  });
}

async function remove(user, id) {
  const n = await notifications.findById(id);
  if (!n || n.userId !== user.id) throw ApiError.notFound('Notification not found');
  await notifications.deleteRecord(id);
}

async function broadcast({ title, message, audience }) {
  const roles = audience === 'customers' ? ['customer'] : audience === 'staff' ? ['admin', 'advisor', 'technician'] : ['customer', 'admin', 'advisor', 'technician'];
  const created = await notifyRoles(roles, { type: 'announcement', title, message });
  return { sent: created.length };
}

module.exports = { notify, notifyMany, notifyRoles, list, unreadCount, markRead, markAllRead, remove, broadcast };
