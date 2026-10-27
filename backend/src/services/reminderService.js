const { appointments, serviceRecords, settings } = require('../repositories');
const { nowInTz, addDays } = require('../utils/time');
const notificationService = require('./notificationService');

/** Generates in-app reminders (upcoming appointments + recommended maintenance). Idempotent. */
async function runReminders() {
  const s = await settings.get();
  const today = nowInTz(s.business.timezone).date;
  const tomorrow = addDays(today, 1);
  let sent = 0;

  const due = await appointments.findAll((a) => a.status === 'confirmed' && (a.date === today || a.date === tomorrow) && !a.reminderSentAt);
  for (const a of due) {
    await appointments.updateRecord(a.id, { reminderSentAt: new Date().toISOString() });
    await notificationService.notify(a.customerId, {
      type: 'appointment_reminder',
      title: 'Upcoming appointment reminder',
      message: `Reminder: ${a.reference} is scheduled ${a.date === today ? 'today' : 'tomorrow'} at ${a.time} at ${a.workshopName}.`,
      link: `/customer/appointments/${a.id}`,
    });
    sent += 1;
  }

  const horizon = addDays(today, 7);
  const maint = await serviceRecords.findAll((r) => r.status === 'finalized' && r.nextServiceDate && r.nextServiceDate <= horizon && r.nextServiceDate >= today && !r.maintenanceReminderSentAt);
  for (const r of maint) {
    await serviceRecords.updateRecord(r.id, { maintenanceReminderSentAt: new Date().toISOString() });
    await notificationService.notify(r.customerId, {
      type: 'maintenance_reminder',
      title: 'Maintenance due soon',
      message: `Your ${r.vehicleSnapshot.brand} ${r.vehicleSnapshot.model} (${r.vehicleSnapshot.registrationNumber}) is due for its next service on ${r.nextServiceDate}.`,
      link: '/customer/book',
    });
    sent += 1;
  }
  return { sent };
}

function start(intervalMinutes) {
  const tick = () => runReminders().catch((err) => console.error('[reminders]', err.message));
  setTimeout(tick, 5000).unref();
  return setInterval(tick, intervalMinutes * 60000).unref();
}

module.exports = { runReminders, start };
