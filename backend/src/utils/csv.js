/** Builds CSV text. Cells starting with = + - @ are prefixed to prevent spreadsheet formula injection. */
function escapeCell(value) {
  if (value === undefined || value === null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv, escapeCell };
