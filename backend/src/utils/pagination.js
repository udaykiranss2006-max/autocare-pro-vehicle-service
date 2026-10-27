function paginate(items, query = {}, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 10));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), meta: { page, limit, total, totalPages } };
}

function includesText(haystackParts, needle) {
  if (!needle) return true;
  const n = String(needle).toLowerCase().trim();
  return haystackParts.some((p) => p !== undefined && p !== null && String(p).toLowerCase().includes(n));
}

module.exports = { paginate, includesText };
