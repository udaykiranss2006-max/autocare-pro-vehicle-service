const { users, vehicles, appointments, serviceRecords, notifications, reviews, settings } = require('../repositories');
const { nowInTz, addDays } = require('../utils/time');
const { round2 } = require('../utils/money');
const { publicUser } = require('../utils/sanitize');
const { ACTIVE_STATUSES, WORK_STATUSES } = require('../config/constants');
const appointmentService = require('./appointmentService');

const brief = (a) => ({
  id: a.id,
  reference: a.reference,
  date: a.date,
  time: a.time,
  status: a.status,
  customerName: a.customerSnapshot.fullName,
  vehicle: `${a.vehicleSnapshot.brand} ${a.vehicleSnapshot.model}`,
  registrationNumber: a.vehicleSnapshot.registrationNumber,
  services: a.services.map((s) => s.name),
  workshopName: a.workshopName,
  technicianName: a.technicianName,
  estimatedTotal: a.estimatedTotal,
  estimatedCompletionAt: a.estimatedCompletionAt,
  createdAt: a.createdAt,
});

const byDateTime = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

async function today() {
  const s = await settings.get();
  return nowInTz(s.business.timezone).date;
}

async function customer(user) {
  const d = await today();
  const appts = await appointments.findAll((a) => a.customerId === user.id);
  const myVehicles = await vehicles.findAll((v) => v.ownerId === user.id);
  const records = await serviceRecords.findAll((r) => r.customerId === user.id && r.status === 'finalized');
  const notes = (await notifications.findAll((n) => n.userId === user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming = appts.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= d).sort(byDateTime);
  const reminders = records
    .filter((r) => r.nextServiceDate && r.nextServiceDate >= d && r.nextServiceDate <= addDays(d, 30))
    .map((r) => ({ vehicle: `${r.vehicleSnapshot.brand} ${r.vehicleSnapshot.model}`, registrationNumber: r.vehicleSnapshot.registrationNumber, nextServiceDate: r.nextServiceDate }));
  return {
    profile: publicUser(user),
    stats: {
      totalAppointments: appts.length,
      upcomingAppointments: upcoming.length,
      completedServices: appts.filter((a) => a.status === 'completed').length,
      pendingRequests: appts.filter((a) => a.status === 'pending').length,
      inWorkshop: appts.filter((a) => WORK_STATUSES.includes(a.status)).length,
      vehicleCount: myVehicles.length,
      unreadNotifications: notes.filter((n) => !n.read).length,
    },
    spending: {
      totalInvoiced: round2(records.reduce((sum, r) => sum + r.total, 0)),
      outstanding: round2(records.reduce((sum, r) => sum + (r.invoice?.balance || 0), 0)),
      upcomingEstimate: round2(upcoming.reduce((sum, a) => sum + a.estimatedTotal, 0)),
      invoiceCount: records.length,
    },
    upcoming: upcoming.slice(0, 5).map(brief),
    active: appts.filter((a) => WORK_STATUSES.includes(a.status)).map(brief),
    recentHistory: records
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 5)
      .map((r) => ({ id: r.id, appointmentRef: r.appointmentRef, completedAt: r.completedAt, vehicle: `${r.vehicleSnapshot.brand} ${r.vehicleSnapshot.model}`, services: r.servicesPerformed.map((x) => x.name), total: r.total, invoiceNumber: r.invoice?.number })),
    notifications: notes.slice(0, 5),
    maintenanceReminders: reminders,
  };
}

async function admin() {
  const d = await today();
  const [allUsers, allVehicles, appts, records, allReviews] = await Promise.all([users.findAll(), vehicles.findAll(), appointments.findAll(), serviceRecords.findAll((r) => r.status === 'finalized'), reviews.findAll()]);
  const popular = {};
  appts.filter((a) => a.status !== 'cancelled').forEach((a) => a.services.forEach((s) => { popular[s.name] = (popular[s.name] || 0) + 1; }));
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(d, i - 6)).map((day) => ({
    date: day,
    bookings: appts.filter((a) => a.createdAt.slice(0, 10) === day).length,
    revenue: round2(records.filter((r) => r.completedAt.slice(0, 10) === day).reduce((s, r) => s + r.total, 0)),
  }));
  const statusBreakdown = {};
  appts.forEach((a) => { statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1; });
  const approved = allReviews.filter((r) => r.status === 'approved');
  return {
    stats: {
      totalCustomers: allUsers.filter((u) => u.role === 'customer').length,
      activeCustomers: allUsers.filter((u) => u.role === 'customer' && u.active).length,
      totalVehicles: allVehicles.length,
      todaysAppointments: appts.filter((a) => a.date === d && a.status !== 'cancelled').length,
      pendingAppointments: appts.filter((a) => a.status === 'pending').length,
      inProgress: appts.filter((a) => WORK_STATUSES.includes(a.status)).length,
      completedServices: appts.filter((a) => a.status === 'completed').length,
      cancelledAppointments: appts.filter((a) => a.status === 'cancelled').length,
      estimatedRevenue: round2(records.reduce((s, r) => s + r.total, 0)),
      recordedPayments: round2(records.reduce((s, r) => s + (r.invoice?.amountReceived || 0), 0)),
      outstandingBalance: round2(records.reduce((s, r) => s + (r.invoice?.balance || 0), 0)),
      pendingReviews: allReviews.filter((r) => r.status === 'pending').length,
      averageRating: approved.length ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10 : null,
      unassignedActive: appts.filter((a) => ACTIVE_STATUSES.includes(a.status) && !a.technicianId).length,
    },
    popularServices: Object.entries(popular).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    recentBookings: [...appts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(brief),
    upcoming: appts.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= d).sort(byDateTime).slice(0, 6).map(brief),
    statusBreakdown,
    last7Days: last7,
  };
}

async function staff(user) {
  const d = await today();
  const all = await appointments.findAll();
  let mine;
  if (user.role === 'technician') {
    const profile = await appointmentService.technicianProfileFor(user);
    mine = profile ? all.filter((a) => a.technicianId === profile.id) : [];
  } else {
    mine = all;
  }
  const open = mine.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const todays = mine.filter((a) => a.date === d && a.status !== 'cancelled').sort(byDateTime);
  const assignedIds = new Set(mine.map((a) => a.id));
  const doneRecords = await serviceRecords.findAll((r) => assignedIds.has(r.appointmentId) && r.status === 'finalized');
  return {
    role: user.role,
    linkedTechnicianProfile: user.role === 'technician' ? Boolean(await appointmentService.technicianProfileFor(user)) : null,
    stats: {
      assignedOpen: open.length,
      todaysWorkload: todays.length,
      inProgress: mine.filter((a) => a.status === 'in_progress').length,
      waitingForParts: mine.filter((a) => a.status === 'waiting_for_parts').length,
      checkedIn: mine.filter((a) => a.status === 'checked_in').length,
      completedTotal: mine.filter((a) => a.status === 'completed').length,
      pendingConfirmation: user.role === 'technician' ? null : mine.filter((a) => a.status === 'pending').length,
      unassigned: user.role === 'technician' ? null : open.filter((a) => !a.technicianId).length,
    },
    today: todays.map(brief),
    activeJobs: open.filter((a) => WORK_STATUSES.includes(a.status)).sort(byDateTime).map(brief),
    completedSummary: doneRecords
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 8)
      .map((r) => ({ id: r.id, appointmentRef: r.appointmentRef, completedAt: r.completedAt, vehicle: `${r.vehicleSnapshot.brand} ${r.vehicleSnapshot.model}`, labourHours: r.labourItems.reduce((s, l) => s + l.hours, 0), partsCount: r.parts.length, total: r.total })),
  };
}

module.exports = { customer, admin, staff };
