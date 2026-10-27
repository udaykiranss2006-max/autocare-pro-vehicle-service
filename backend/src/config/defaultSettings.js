/**
 * Default business settings. settings.json overrides these values.
 * All contact details are SAMPLE placeholders - replace them in Admin > Business Settings.
 */
const weekHours = (open, close, sunday = null) => ({
  mon: { open, close },
  tue: { open, close },
  wed: { open, close },
  thu: { open, close },
  fri: { open, close },
  sat: { open, close },
  sun: sunday,
});

module.exports = {
  business: {
    name: 'AutoCare Pro',
    tagline: 'Reliable Vehicle Care, Made Simple.',
    phone: '+91 00000 00000 (sample)',
    email: 'contact@autocarepro.example',
    address: 'Sample Address, Service Road, Your City, India (edit in settings)',
    mapEmbedUrl: '',
    isSampleData: true,
    social: { facebook: '', instagram: '', x: '', youtube: '' },
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
  booking: {
    slotMinutes: 60,
    minLeadMinutes: 120,
    maxAdvanceDays: 60,
    cancellationCutoffHours: 4,
    rescheduleCutoffHours: 4,
    maxReschedules: 2,
    cancellationPolicy:
      'Free cancellation or rescheduling up to 4 hours before the appointment. Late cancellations may be declined by the workshop. Prices are estimates; the final invoice is based on work actually performed and parts used.',
  },
  tax: { gstPercent: 18, label: 'GST' },
  registrationNumber: {
    enabled: true,
    patterns: [
      { name: 'Standard (e.g. TS09EA1234)', regex: '^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$' },
      { name: 'Bharat series (e.g. 22BH1234AA)', regex: '^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$' },
      { name: 'Delhi legacy (e.g. DL3CAF1234)', regex: '^DL[0-9]{1,2}[A-Z]{1,4}[0-9]{1,4}$' },
    ],
  },
  vehicleTypePriceFactor: { car: 1, motorcycle: 0.5, suv: 1.25, van: 1.3, lcv: 1.5 },
  problemCategories: [
    'Routine service',
    'Unusual noise',
    'Warning light on dashboard',
    'Starting problem',
    'Brakes',
    'AC / cooling',
    'Electrical',
    'Tyres / wheels',
    'Accident / body damage',
    'Other',
  ],
  payment: {
    gatewayConfigured: false,
    demoModeEnabled: true,
    note: 'No online payment gateway is configured. Payments are recorded by staff at the counter (cash / card / UPI) or in clearly labelled DEMO mode.',
  },
  workshops: [
    {
      id: 'ws_main',
      name: 'AutoCare Pro - Main Workshop (Sample)',
      address: 'Sample Plot 1, Industrial Area, Your City',
      phone: '+91 00000 00001 (sample)',
      hours: weekHours('09:00', '18:00'),
      capacityPerSlot: 3,
      dailyCapacity: 20,
      closedDates: [],
      active: true,
    },
    {
      id: 'ws_express',
      name: 'AutoCare Pro - Express Centre (Sample)',
      address: 'Sample Shop 12, Main Road, Your City',
      phone: '+91 00000 00002 (sample)',
      hours: weekHours('08:00', '20:00', { open: '10:00', close: '14:00' }),
      capacityPerSlot: 2,
      dailyCapacity: 16,
      closedDates: [],
      active: true,
    },
  ],
  offers: [],
  counters: { invoice: 0 },
};
