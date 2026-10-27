const { appointments, vehicles, services, technicians, users, settings, serviceRecords, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId, appointmentReference } = require('../utils/id');
const { paginate, includesText } = require('../utils/pagination');
const { round2, roundRupee } = require('../utils/money');
const { nowInTz, localStamp, toIso } = require('../utils/time');
const { TRANSITIONS, TECHNICIAN_TRANSITIONS, STATUS_LABELS, ACTIVE_STATUSES, MANAGER_ROLES, VEHICLE_TYPE_LABELS } = require('../config/constants');
const workshopService = require('./workshopService');
const offerService = require('./offerService');
const notificationService = require('./notificationService');

const isManager = (u) => MANAGER_ROLES.includes(u.role);
const actor = (u) => ({ byUserId: u.id, byName: u.fullName, byRole: u.role });

async function technicianProfileFor(user) {
  if (user.role !== 'technician') return null;
  return technicians.findOne((t) => t.userId === user.id);
}

/** Access rule: customers -> own; technicians -> assigned to them; advisors/admin -> all. */
async function canAccess(user, appt) {
  if (isManager(user)) return true;
  if (user.role === 'customer') return appt.customerId === user.id;
  if (user.role === 'technician') {
    const profile = await technicianProfileFor(user);
    return Boolean(profile && appt.technicianId === profile.id);
  }
  return false;
}

/** Removes staff-only fields for customers. */
function present(user, appt) {
  if (user.role !== 'customer') return appt;
  const { internalNotes, ...rest } = appt;
  return { ...rest, statusHistory: (appt.statusHistory || []).map(({ byUserId, ...h }) => ({ ...h, byName: h.byRole === 'customer' ? h.byName : 'AutoCare Pro team' })) };
}

async function getAccessible(user, id) {
  const appt = await appointments.findById(id);
  if (!appt || !(await canAccess(user, appt))) throw ApiError.notFound('Appointment not found');
  return appt;
}

/** Server-side price & duration estimate. Never trusts client prices. */
async function estimate({ vehicleId, serviceIds, offerCode }, user) {
  const vehicle = await vehicles.findById(vehicleId);
  if (!vehicle || (user.role === 'customer' && vehicle.ownerId !== user.id)) throw ApiError.validation({ vehicleId: 'Select one of your registered vehicles' });
  const s = await settings.get();
  const catalog = await services.findAll();
  const factor = s.vehicleTypePriceFactor[vehicle.type] || 1;
  const items = serviceIds.map((id) => {
    const svc = catalog.find((c) => c.id === id);
    if (!svc || !svc.available) throw ApiError.validation({ serviceIds: 'One of the selected services is no longer available' }, 'A selected service is unavailable');
    if (!svc.vehicleTypes.includes(vehicle.type)) {
      throw ApiError.validation({ serviceIds: `${svc.name} is not offered for ${VEHICLE_TYPE_LABELS[vehicle.type]}` });
    }
    return {
      serviceId: svc.id,
      name: svc.name,
      category: svc.category,
      bookingMode: svc.bookingMode,
      durationMinutes: svc.durationMinutes,
      price: roundRupee(svc.priceFrom * factor),
    };
  });
  const offer = offerCode ? await offerService.findByCode(offerCode) : null;
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  let discount = 0;
  if (offer) {
    const eligible = offer.serviceIds && offer.serviceIds.length ? items.filter((i) => offer.serviceIds.includes(i.serviceId)) : items;
    if (!eligible.length) throw ApiError.validation({ offerCode: 'This offer does not apply to the selected services' });
    discount = round2(eligible.reduce((sum, i) => sum + i.price, 0) * (offer.discountPercent / 100));
  }
  // Packages: if every service of an active package is selected, the package price applies.
  let packageApplied = null;
  if (!offer) {
    const packages = (await offerService.list()).filter((o) => o.kind === 'package' && o.packagePrice && o.serviceIds && o.serviceIds.length);
    for (const pkg of packages) {
      const covered = items.filter((i) => pkg.serviceIds.includes(i.serviceId));
      if (covered.length === pkg.serviceIds.length) {
        const regular = covered.reduce((sum, i) => sum + i.price, 0);
        const pkgPrice = roundRupee(pkg.packagePrice * factor);
        const saving = round2(regular - pkgPrice);
        if (saving > discount) {
          discount = saving;
          packageApplied = { id: pkg.id, title: pkg.title, packagePrice: pkgPrice };
        }
      }
    }
  }
  const taxable = Math.max(0, subtotal - discount);
  const tax = round2((taxable * s.tax.gstPercent) / 100);
  return {
    vehicle,
    items,
    subtotal: round2(subtotal),
    discount,
    offer: offer ? { id: offer.id, code: offer.code, title: offer.title, discountPercent: offer.discountPercent } : null,
    packageApplied,
    taxPercent: s.tax.gstPercent,
    tax,
    total: round2(taxable + tax),
    estimatedDurationMinutes: items.reduce((sum, i) => sum + i.durationMinutes, 0),
    requiresInspection: items.some((i) => i.bookingMode !== 'direct'),
    note: 'Sample estimate. Final invoice depends on inspection, work performed and parts used.',
  };
}

function assertSlot(availability, time) {
  if (availability.closed) throw ApiError.conflict(availability.reason || 'The workshop is closed on this date', 'SLOT_UNAVAILABLE');
  const slot = availability.slots.find((sl) => sl.time === time);
  if (!slot) throw ApiError.conflict('Selected time is outside workshop business hours', 'SLOT_UNAVAILABLE');
  if (!slot.available) {
    throw ApiError.conflict(slot.reason === 'past' ? 'This time slot has already passed or is too soon to book' : 'Sorry, this time slot was just booked. Please choose another slot.', 'SLOT_UNAVAILABLE');
  }
}

async function create(user, data) {
  if (user.role !== 'customer') throw ApiError.forbidden('Appointments are booked from a customer account');
  const est = await estimate(data, user);
  const s = await settings.get();
  const workshop = await workshopService.get(data.workshopId);
  const pickup = data.pickup || { pickupRequested: false, dropRequested: false };
  if ((pickup.pickupRequested || pickup.dropRequested) && (!pickup.address || pickup.address.length < 10)) {
    throw ApiError.validation({ 'pickup.address': 'Please enter the full pickup/drop-off address' });
  }
  if (data.problemCategory && !s.problemCategories.includes(data.problemCategory)) throw ApiError.validation({ problemCategory: 'Choose a valid problem category' });

  const v = est.vehicle;
  const appt = await mutateJsonFile('appointments.json', (list) => {
    // Availability re-checked INSIDE the write lock to prevent double booking.
    const avail = workshopService.computeAvailability({ workshop, date: data.date, booking: s.booking, timezone: s.business.timezone, existing: list });
    assertSlot(avail, data.time);
    const dup = list.find((a) => a.vehicleId === v.id && a.date === data.date && ACTIVE_STATUSES.includes(a.status));
    if (dup) throw ApiError.conflict(`This vehicle already has an appointment on this date (${dup.reference}).`, 'DUPLICATE_BOOKING');
    let reference;
    do reference = appointmentReference(data.date); while (list.some((a) => a.reference === reference));
    const now = new Date().toISOString();
    const record = {
      id: newId('apt'),
      reference,
      customerId: user.id,
      customerSnapshot: { fullName: user.fullName, email: user.email, phone: user.phone },
      vehicleId: v.id,
      vehicleSnapshot: { type: v.type, brand: v.brand, model: v.model, registrationNumber: v.registrationNumber, year: v.year, fuelType: v.fuelType, odometer: v.odometer },
      services: est.items,
      workshopId: workshop.id,
      workshopName: workshop.name,
      date: data.date,
      time: data.time,
      scheduledAt: toIso(data.date, data.time, s.business.timezone),
      estimatedDurationMinutes: est.estimatedDurationMinutes,
      estimate: { subtotal: est.subtotal, discount: est.discount, offer: est.offer, packageApplied: est.packageApplied, taxPercent: est.taxPercent, tax: est.tax, total: est.total },
      estimatedTotal: est.total,
      requiresInspection: est.requiresInspection,
      problemCategory: data.problemCategory || '',
      problemDescription: data.problemDescription || '',
      pickup: {
        pickupRequested: Boolean(pickup.pickupRequested),
        dropRequested: Boolean(pickup.dropRequested),
        address: pickup.address || '',
        contactPhone: pickup.contactPhone || user.phone,
        status: pickup.pickupRequested || pickup.dropRequested ? 'requested' : 'not_requested',
      },
      status: 'pending',
      statusHistory: [{ status: 'pending', at: now, ...actor(user), note: 'Booking request submitted' }],
      advisorId: null,
      advisorName: null,
      technicianId: null,
      technicianName: null,
      estimatedCompletionAt: null,
      customerNotes: '',
      internalNotes: [],
      cancellation: null,
      rescheduleCount: 0,
      reminderSentAt: null,
      policyAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
    return record;
  });

  await notificationService.notify(user.id, {
    type: 'booking_received',
    title: 'Booking request received',
    message: `Your appointment ${appt.reference} on ${appt.date} at ${appt.time} has been received and is awaiting confirmation by the workshop.`,
    link: `/customer/appointments/${appt.id}`,
  });
  await notificationService.notifyRoles(['admin', 'advisor'], {
    type: 'new_booking',
    title: 'New booking',
    message: `${user.fullName} booked ${appt.services.map((x) => x.name).join(', ')} for ${appt.date} ${appt.time} (${appt.reference}).`,
    link: `/admin/appointments/${appt.id}`,
  });
  return appt;
}

async function list(user, query) {
  let items = await appointments.findAll();
  if (user.role === 'customer') items = items.filter((a) => a.customerId === user.id);
  else if (user.role === 'technician') {
    const profile = await technicianProfileFor(user);
    items = profile ? items.filter((a) => a.technicianId === profile.id) : [];
  }
  if (query.status) {
    const statuses = String(query.status).split(',');
    items = items.filter((a) => statuses.includes(a.status));
  }
  if (query.scope === 'upcoming') items = items.filter((a) => ACTIVE_STATUSES.includes(a.status));
  if (query.scope === 'past') items = items.filter((a) => ['completed', 'cancelled'].includes(a.status));
  if (query.from) items = items.filter((a) => a.date >= query.from);
  if (query.to) items = items.filter((a) => a.date <= query.to);
  if (query.date) items = items.filter((a) => a.date === query.date);
  if (query.workshopId) items = items.filter((a) => a.workshopId === query.workshopId);
  if (query.vehicleId) items = items.filter((a) => a.vehicleId === query.vehicleId);
  if (isManager(user) && query.technicianId) items = items.filter((a) => (query.technicianId === 'unassigned' ? !a.technicianId : a.technicianId === query.technicianId));
  if (isManager(user) && query.customerId) items = items.filter((a) => a.customerId === query.customerId);
  if (query.search) {
    items = items.filter((a) => includesText([a.reference, a.customerSnapshot.fullName, a.customerSnapshot.phone, a.vehicleSnapshot.registrationNumber, a.vehicleSnapshot.brand, a.vehicleSnapshot.model, ...a.services.map((x) => x.name)], query.search));
  }
  const dir = query.sort === 'asc' ? 1 : -1;
  items.sort((a, b) => dir * `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const page = paginate(items, query, 500);
  return { items: page.items.map((a) => present(user, a)), meta: page.meta };
}

async function get(user, id) {
  const appt = await getAccessible(user, id);
  const record = await serviceRecords.findOne((r) => r.appointmentId === id);
  const result = present(user, appt);
  if (record && (user.role !== 'customer' || record.status === 'finalized')) {
    result.serviceRecord = { id: record.id, status: record.status, total: record.total, invoiceNumber: record.invoice?.number || null, paymentStatus: record.invoice?.paymentStatus || null };
  }
  return result;
}

/** PUT: managers assign staff/notes; customers may edit their notes while not yet in the workshop. */
async function update(user, id, data) {
  const appt = await getAccessible(user, id);
  const patch = {};
  if (user.role === 'customer') {
    if (!['pending', 'confirmed'].includes(appt.status)) throw ApiError.badRequest('This appointment can no longer be edited');
    if (data.customerNotes !== undefined) patch.customerNotes = data.customerNotes;
    if (data.problemDescription !== undefined) patch.problemDescription = data.problemDescription;
  } else {
    if (['completed', 'cancelled'].includes(appt.status) && (data.advisorId !== undefined || data.technicianId !== undefined)) {
      throw ApiError.badRequest('Closed appointments cannot be reassigned');
    }
    if (data.advisorId !== undefined) {
      if (!isManager(user)) throw ApiError.forbidden('Only advisors and admins can assign advisors');
      if (data.advisorId) {
        const adv = await users.findById(data.advisorId);
        if (!adv || !['advisor', 'admin'].includes(adv.role) || !adv.active) throw ApiError.validation({ advisorId: 'Select an active service advisor' });
        patch.advisorId = adv.id;
        patch.advisorName = adv.fullName;
      } else {
        patch.advisorId = null;
        patch.advisorName = null;
      }
    }
    if (data.technicianId !== undefined) {
      if (!isManager(user)) throw ApiError.forbidden('Only advisors and admins can assign technicians');
      if (data.technicianId) {
        const tech = await technicians.findById(data.technicianId);
        if (!tech || !tech.active) throw ApiError.validation({ technicianId: 'Select an active technician' });
        patch.technicianId = tech.id;
        patch.technicianName = tech.name;
      } else {
        patch.technicianId = null;
        patch.technicianName = null;
      }
    }
    if (data.estimatedCompletionAt !== undefined) patch.estimatedCompletionAt = data.estimatedCompletionAt ? new Date(data.estimatedCompletionAt).toISOString() : null;
    if (data.pickupStatus !== undefined) {
      if (!isManager(user)) throw ApiError.forbidden();
      patch.pickup = { ...appt.pickup, status: data.pickupStatus };
    }
    if (data.customerNotes !== undefined && isManager(user)) patch.customerNotes = data.customerNotes;
    if (data.internalNote) {
      patch.internalNotes = [...(appt.internalNotes || []), { id: newId('note'), note: data.internalNote, at: new Date().toISOString(), ...actor(user) }];
    }
  }
  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update');
  const updated = await appointments.updateRecord(id, patch);

  if (patch.technicianId && patch.technicianId !== appt.technicianId) {
    const tech = await technicians.findById(patch.technicianId);
    if (tech && tech.userId) {
      await notificationService.notify(tech.userId, { type: 'assignment', title: 'New job assigned', message: `${updated.reference}: ${updated.vehicleSnapshot.brand} ${updated.vehicleSnapshot.model} on ${updated.date} ${updated.time}`, link: `/staff/appointments/${id}` });
    }
  }
  if (patch.pickup && patch.pickup.status !== appt.pickup.status && ['approved', 'declined'].includes(patch.pickup.status)) {
    await notificationService.notify(appt.customerId, { type: 'pickup', title: `Pickup/drop-off ${patch.pickup.status}`, message: `Your pickup/drop-off request for ${appt.reference} was ${patch.pickup.status}.`, link: `/customer/appointments/${id}` });
  }
  if (patch.estimatedCompletionAt && patch.estimatedCompletionAt !== appt.estimatedCompletionAt) {
    await notificationService.notify(appt.customerId, { type: 'status_update', title: 'Estimated completion updated', message: `${appt.reference} is now expected to be ready by ${new Date(patch.estimatedCompletionAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`, link: `/customer/appointments/${id}` });
  }
  return present(user, updated);
}

function allowedTransitions(user, appt, technicianProfile) {
  if (isManager(user)) return TRANSITIONS[appt.status] || [];
  if (user.role === 'technician' && technicianProfile && appt.technicianId === technicianProfile.id) return TECHNICIAN_TRANSITIONS[appt.status] || [];
  return [];
}

async function updateStatus(user, id, { status, note }) {
  const appt = await getAccessible(user, id);
  if (user.role === 'customer') throw ApiError.forbidden('Customers cannot change appointment status. Use cancel or reschedule.');
  const profile = await technicianProfileFor(user);
  const allowed = allowedTransitions(user, appt, profile);
  if (!allowed.includes(status)) {
    throw new ApiError(422, `Cannot change status from ${STATUS_LABELS[appt.status]} to ${STATUS_LABELS[status]}.`, 'INVALID_TRANSITION', { allowed });
  }
  if (status === 'cancelled' && (!note || note.length < 3)) throw ApiError.validation({ note: 'Please provide a cancellation reason' });
  if (status === 'in_progress' && !appt.technicianId) throw ApiError.validation({ technicianId: 'Assign a technician before starting work' });

  let record = null;
  if (status === 'completed') {
    // Lazy require avoids a circular import (serviceRecordService uses this module).
    record = await require('./serviceRecordService').finalizeForAppointment(user, appt);
  }

  const now = new Date().toISOString();
  const updated = await appointments.updateRecord(id, (cur) => {
    if (cur.status !== appt.status) throw ApiError.conflict('The appointment was updated by someone else. Refresh and try again.');
    const patch = { status, statusHistory: [...cur.statusHistory, { status, at: now, ...actor(user), note: note || '' }] };
    if (status === 'cancelled') patch.cancellation = { reason: note, at: now, ...actor(user) };
    if (status === 'completed') patch.completedAt = now;
    if (status === 'checked_in') patch.checkedInAt = now;
    return patch;
  });

  const link = `/customer/appointments/${id}`;
  const messages = {
    confirmed: ['Appointment confirmed', `Your appointment ${appt.reference} on ${appt.date} at ${appt.time} is confirmed. See you at ${appt.workshopName}.`, 'appointment_confirmed'],
    checked_in: ['Vehicle checked in', `Your ${appt.vehicleSnapshot.brand} ${appt.vehicleSnapshot.model} has been checked in (${appt.reference}).`, 'status_update'],
    in_progress: ['Service in progress', `Work has started on ${appt.reference}.`, 'status_update'],
    waiting_for_parts: ['Waiting for parts', `${appt.reference} is waiting for parts. We will update you as soon as work resumes.`, 'status_update'],
    completed: ['Service completed', `Your service ${appt.reference} is complete.${record ? ` Invoice ${record.invoice.number} is available.` : ''}`, 'service_completed'],
    cancelled: ['Appointment cancelled', `Appointment ${appt.reference} was cancelled by the workshop. Reason: ${note}`, 'appointment_cancelled'],
  };
  const [title, message, type] = messages[status];
  await notificationService.notify(appt.customerId, { type, title, message, link });
  if (record) {
    await notificationService.notify(appt.customerId, { type: 'invoice_available', title: 'Invoice available', message: `Invoice ${record.invoice.number} for ${appt.reference} is ready to view.`, link: `/customer/invoices/${record.id}` });
  }
  return present(user, updated);
}

function hoursUntil(appt, timezone) {
  const now = nowInTz(timezone);
  return (localStamp(appt.date, appt.time) - now.stamp) / 60;
}

async function reschedule(user, id, { date, time, workshopId, reason }) {
  const appt = await getAccessible(user, id);
  const s = await settings.get();
  if (user.role === 'technician') throw ApiError.forbidden('Technicians cannot reschedule appointments');
  const customer = user.role === 'customer';
  if (customer) {
    if (!['pending', 'confirmed'].includes(appt.status)) throw ApiError.badRequest('Only pending or confirmed appointments can be rescheduled');
    if (hoursUntil(appt, s.business.timezone) < s.booking.rescheduleCutoffHours) {
      throw ApiError.badRequest(`Online rescheduling closes ${s.booking.rescheduleCutoffHours} hours before the appointment. Please contact the workshop.`);
    }
    if ((appt.rescheduleCount || 0) >= s.booking.maxReschedules) throw ApiError.badRequest(`This appointment has already been rescheduled ${s.booking.maxReschedules} times. Please contact the workshop.`);
  } else if (!['pending', 'confirmed'].includes(appt.status)) {
    throw ApiError.badRequest('Only pending or confirmed appointments can be rescheduled');
  }
  const workshop = await workshopService.get(workshopId || appt.workshopId);
  const now = new Date().toISOString();
  const updated = await mutateJsonFile('appointments.json', (list) => {
    const idx = list.findIndex((a) => a.id === id);
    const cur = list[idx];
    if (cur.status !== appt.status) throw ApiError.conflict('The appointment was updated by someone else. Refresh and try again.');
    const avail = workshopService.computeAvailability({ workshop, date, booking: s.booking, timezone: s.business.timezone, existing: list, excludeId: id });
    assertSlot(avail, time);
    const newStatus = customer && cur.status === 'confirmed' ? 'pending' : cur.status;
    const history = [...cur.statusHistory, { status: newStatus, at: now, ...actor(user), note: `Rescheduled from ${cur.date} ${cur.time} to ${date} ${time}${reason ? ` - ${reason}` : ''}` }];
    list[idx] = {
      ...cur,
      date,
      time,
      workshopId: workshop.id,
      workshopName: workshop.name,
      scheduledAt: toIso(date, time, s.business.timezone),
      status: newStatus,
      statusHistory: history,
      rescheduleCount: (cur.rescheduleCount || 0) + (customer ? 1 : 0),
      reminderSentAt: null,
      updatedAt: now,
    };
    return list[idx];
  });
  const msg = `Appointment ${appt.reference} moved to ${date} at ${time} (${workshop.name}).`;
  if (customer) {
    await notificationService.notify(user.id, { type: 'appointment_rescheduled', title: 'Reschedule requested', message: `${msg} The workshop will confirm the new slot.`, link: `/customer/appointments/${id}` });
    await notificationService.notifyRoles(['admin', 'advisor'], { type: 'appointment_rescheduled', title: 'Customer rescheduled', message: msg, link: `/admin/appointments/${id}` });
  } else {
    await notificationService.notify(appt.customerId, { type: 'appointment_rescheduled', title: 'Appointment rescheduled', message: `${msg}${reason ? ` Reason: ${reason}` : ''}`, link: `/customer/appointments/${id}` });
  }
  return present(user, updated);
}

async function cancel(user, id, { reason }) {
  const appt = await getAccessible(user, id);
  const s = await settings.get();
  if (user.role === 'technician') throw ApiError.forbidden('Technicians cannot cancel appointments');
  if (user.role === 'customer') {
    if (!['pending', 'confirmed'].includes(appt.status)) throw ApiError.badRequest('This appointment can no longer be cancelled online');
    if (hoursUntil(appt, s.business.timezone) < s.booking.cancellationCutoffHours) {
      throw ApiError.badRequest(`Online cancellation closes ${s.booking.cancellationCutoffHours} hours before the appointment. Please contact the workshop.`);
    }
  } else if (!(TRANSITIONS[appt.status] || []).includes('cancelled')) {
    throw ApiError.badRequest(`A ${STATUS_LABELS[appt.status]} appointment cannot be cancelled`);
  }
  const now = new Date().toISOString();
  const updated = await appointments.updateRecord(id, (cur) => {
    if (cur.status !== appt.status) throw ApiError.conflict('The appointment was updated by someone else. Refresh and try again.');
    return {
      status: 'cancelled',
      cancellation: { reason, at: now, ...actor(user) },
      statusHistory: [...cur.statusHistory, { status: 'cancelled', at: now, ...actor(user), note: reason }],
    };
  });
  if (user.role === 'customer') {
    await notificationService.notify(user.id, { type: 'appointment_cancelled', title: 'Appointment cancelled', message: `You cancelled ${appt.reference}.`, link: `/customer/appointments/${id}` });
    await notificationService.notifyRoles(['admin', 'advisor'], { type: 'appointment_cancelled', title: 'Customer cancelled', message: `${appt.reference} (${appt.date} ${appt.time}) was cancelled. Reason: ${reason}`, link: `/admin/appointments/${id}` });
  } else {
    await notificationService.notify(appt.customerId, { type: 'appointment_cancelled', title: 'Appointment cancelled', message: `Appointment ${appt.reference} was cancelled by the workshop. Reason: ${reason}`, link: `/customer/appointments/${id}` });
  }
  return present(user, updated);
}

async function allowedActions(user, id) {
  const appt = await getAccessible(user, id);
  const profile = await technicianProfileFor(user);
  return { status: appt.status, transitions: user.role === 'customer' ? [] : allowedTransitions(user, appt, profile) };
}

module.exports = { estimate, create, list, get, update, updateStatus, reschedule, cancel, allowedActions, canAccess, getAccessible, technicianProfileFor, present };
