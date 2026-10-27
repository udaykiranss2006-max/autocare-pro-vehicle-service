const { contactMessages } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const notificationService = require('./notificationService');

async function create(data) {
  const msg = await contactMessages.insertRecord({ ...data, phone: data.phone || '', status: 'new' });
  await notificationService.notifyRoles(['admin', 'advisor'], { type: 'contact', title: 'New contact message', message: `${data.name}: ${data.subject}`, link: '/admin/messages' });
  return { id: msg.id, message: 'Thanks! Your message has been received. Our team will get back to you.' };
}

async function list(query) {
  let items = await contactMessages.findAll();
  if (query.status) items = items.filter((m) => m.status === query.status);
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(items, query, 100);
}

async function setStatus(id, status) {
  if (!['new', 'handled'].includes(status)) throw ApiError.validation({ status: 'Status must be new or handled' });
  const m = await contactMessages.updateRecord(id, { status });
  if (!m) throw ApiError.notFound('Message not found');
  return m;
}

module.exports = { create, list, setStatus };
