function ok(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}
const created = (res, data) => ok(res, data, undefined, 201);
module.exports = { ok, created };
