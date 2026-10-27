const { appointments, serviceRecords, users } = require('../repositories');
const { dayNumber, addDays, weekdayKey } = require('../utils/time');
const { round2 } = require('../utils/money');
const { toCsv } = require('../utils/csv');
const ApiError = require('../utils/ApiError');

function bucketOf(dateStr, period) {
  if (period === 'monthly') return dateStr.slice(0, 7);
  if (period === 'weekly') {
    const offset = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(weekdayKey(dateStr));
    return `Week of ${addDays(dateStr, -offset)}`;
  }
  return dateStr;
}

function range(query) {
  const to = query.to || new Date().toISOString().slice(0, 10);
  const from = query.from || addDays(to, -29);
  if (dayNumber(from) > dayNumber(to)) throw ApiError.validation({ from: 'Start date must be before end date' });
  if (dayNumber(to) - dayNumber(from) > 731) throw ApiError.validation({ from: 'Reports are limited to 2 years' });
  return { from, to };
}

async function summary(query) {
  const period = ['daily', 'weekly', 'monthly'].includes(query.period) ? query.period : 'daily';
  const { from, to } = range(query);
  const appts = await appointments.findAll((a) => a.date >= from && a.date <= to);
  const records = await serviceRecords.findAll((r) => r.status === 'finalized' && r.completedAt.slice(0, 10) >= from && r.completedAt.slice(0, 10) <= to);
  const buckets = {};
  const get = (k) => (buckets[k] = buckets[k] || { period: k, bookings: 0, completed: 0, cancelled: 0, revenue: 0, paymentsRecorded: 0 });
  appts.forEach((a) => {
    const b = get(bucketOf(a.date, period));
    b.bookings += 1;
    if (a.status === 'completed') b.completed += 1;
    if (a.status === 'cancelled') b.cancelled += 1;
  });
  records.forEach((r) => {
    const b = get(bucketOf(r.completedAt.slice(0, 10), period));
    b.revenue = round2(b.revenue + r.total);
    b.paymentsRecorded = round2(b.paymentsRecorded + (r.invoice?.amountReceived || 0));
  });
  const rows = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  const serviceCounts = {};
  appts.filter((a) => a.status !== 'cancelled').forEach((a) => a.services.forEach((s) => { serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1; }));
  const workshopCounts = {};
  appts.forEach((a) => { workshopCounts[a.workshopName] = (workshopCounts[a.workshopName] || 0) + 1; });
  return {
    period,
    from,
    to,
    rows,
    totals: {
      bookings: appts.length,
      completed: appts.filter((a) => a.status === 'completed').length,
      cancelled: appts.filter((a) => a.status === 'cancelled').length,
      revenue: round2(records.reduce((s, r) => s + r.total, 0)),
      paymentsRecorded: round2(records.reduce((s, r) => s + (r.invoice?.amountReceived || 0), 0)),
      averageInvoice: records.length ? round2(records.reduce((s, r) => s + r.total, 0) / records.length) : 0,
    },
    topServices: Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    byWorkshop: Object.entries(workshopCounts).map(([name, count]) => ({ name, count })),
  };
}

async function exportCsv(query) {
  const type = query.type || 'appointments';
  const { from, to } = range(query);
  if (type === 'appointments') {
    let rows = await appointments.findAll((a) => a.date >= from && a.date <= to);
    if (query.status) rows = rows.filter((a) => a.status === query.status);
    rows.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return {
      filename: `appointments_${from}_${to}.csv`,
      csv: toCsv(rows, [
        { label: 'Reference', key: 'reference' },
        { label: 'Date', key: 'date' },
        { label: 'Time', key: 'time' },
        { label: 'Status', key: 'status' },
        { label: 'Customer', value: (a) => a.customerSnapshot.fullName },
        { label: 'Phone', value: (a) => a.customerSnapshot.phone },
        { label: 'Vehicle', value: (a) => `${a.vehicleSnapshot.brand} ${a.vehicleSnapshot.model}` },
        { label: 'Registration', value: (a) => a.vehicleSnapshot.registrationNumber },
        { label: 'Services', value: (a) => a.services.map((s) => s.name).join('; ') },
        { label: 'Workshop', key: 'workshopName' },
        { label: 'Technician', key: 'technicianName' },
        { label: 'Estimated total (INR)', key: 'estimatedTotal' },
      ]),
    };
  }
  if (type === 'revenue') {
    const rows = (await serviceRecords.findAll((r) => r.status === 'finalized' && r.completedAt.slice(0, 10) >= from && r.completedAt.slice(0, 10) <= to)).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    return {
      filename: `revenue_${from}_${to}.csv`,
      csv: toCsv(rows, [
        { label: 'Invoice', value: (r) => r.invoice?.number },
        { label: 'Appointment', key: 'appointmentRef' },
        { label: 'Completed', value: (r) => r.completedAt.slice(0, 10) },
        { label: 'Labour (INR)', key: 'labourTotal' },
        { label: 'Parts (INR)', key: 'partsTotal' },
        { label: 'Discount (INR)', value: (r) => r.discount?.amount || 0 },
        { label: 'Tax (INR)', key: 'taxAmount' },
        { label: 'Total (INR)', key: 'total' },
        { label: 'Payment status', value: (r) => r.invoice?.paymentStatus },
        { label: 'Recorded payments (INR, excl. demo)', value: (r) => r.invoice?.amountReceived || 0 },
      ]),
    };
  }
  if (type === 'customers') {
    const rows = await users.findAll((u) => u.role === 'customer' && u.createdAt.slice(0, 10) >= from && u.createdAt.slice(0, 10) <= to);
    return {
      filename: `customers_${from}_${to}.csv`,
      csv: toCsv(rows, [
        { label: 'Name', key: 'fullName' },
        { label: 'Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Active', value: (u) => (u.active ? 'yes' : 'no') },
        { label: 'Registered', value: (u) => u.createdAt.slice(0, 10) },
      ]),
    };
  }
  throw ApiError.validation({ type: 'Report type must be appointments, revenue or customers' });
}

module.exports = { summary, exportCsv };
