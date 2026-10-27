/**
 * Sample service catalog. Prices are SAMPLE ESTIMATES in INR (base price for a car; the vehicle-type
 * factor in settings adjusts it) and are editable by the administrator.
 * Row: [name, description, priceFrom, minutes, bookingMode, vehicleTypes, icon, popular, inclusions[]]
 */
const ALL = ['car', 'motorcycle', 'suv', 'van', 'lcv'];
const FOUR = ['car', 'suv', 'van', 'lcv'];
const CARSUV = ['car', 'suv'];
const CAR_BIKE = ['car', 'motorcycle', 'suv'];

const categories = {
  'General Maintenance': {
    icon: 'wrench',
    benefits: ['Longer engine life', 'Better fuel efficiency', 'Fewer unexpected breakdowns'],
    exclusions: ['Replacement of worn parts beyond the listed items (quoted separately)', 'Repairs discovered during inspection'],
    rows: [
      ['Periodic Maintenance Service', 'Scheduled service covering the essential checks, fluids and filters your vehicle needs at regular intervals.', 3499, 180, 'direct', ALL, true, ['Engine oil and filter change', 'Air filter cleaning', '30-point inspection', 'Fluid top-ups', 'Washing']],
      ['General Inspection', 'A quick but thorough visual and functional inspection to spot developing problems early.', 499, 45, 'direct', ALL, false, ['Visual inspection of engine bay', 'Brake and tyre check', 'Lights and horn check', 'Inspection report']],
      ['Engine Oil and Oil Filter Change', 'Drain old oil and refill with the grade recommended for your engine, with a new oil filter.', 1999, 60, 'direct', ALL, true, ['Engine oil drain and refill', 'New oil filter', 'Drain plug washer', 'Oil level check']],
      ['Air Filter Replacement', 'Replace a clogged engine air filter to restore airflow, performance and mileage.', 699, 30, 'direct', ALL, false, ['Air box cleaning', 'New air filter fitment', 'Intake inspection']],
      ['Cabin Filter Replacement', 'Fresh cabin filter for cleaner air inside the vehicle and better AC airflow.', 799, 30, 'direct', FOUR, false, ['Old filter removal', 'Filter housing cleaning', 'New cabin filter fitment']],
      ['Fluid Checks and Top-Ups', 'Check and top up coolant, brake fluid, power steering, washer and battery fluids.', 399, 30, 'direct', ALL, false, ['Coolant level check', 'Brake fluid check', 'Washer fluid top-up', 'Leak spot check']],
      ['Preventive Maintenance Package', 'Comprehensive preventive care designed to catch wear before it turns into costly repairs.', 4999, 240, 'direct', ALL, false, ['Periodic service items', 'Brake cleaning and adjustment', 'Suspension check', 'Battery health check', 'Wheel balancing']],
      ['Manufacturer-Recommended Maintenance', 'Service performed as per the manufacturer schedule for your model and odometer reading.', 4499, 240, 'inspection', ALL, false, ['Schedule-based checklist', 'Recommended fluids and filters', 'Service log update']],
    ],
  },
  'Engine and Mechanical Repairs': {
    icon: 'engine',
    benefits: ['Restored performance', 'Diagnosis by trained technicians', 'Transparent estimates before work'],
    exclusions: ['Major parts are quoted after diagnosis', 'Machining by external vendors where required'],
    rows: [
      ['Engine Diagnostics', 'Identify misfires, noises, smoke or warning lights using scan tools and hands-on testing.', 999, 60, 'direct', ALL, true, ['OBD scan where supported', 'Compression check if needed', 'Fault report and estimate']],
      ['Engine Repair', 'Repair of engine faults such as leaks, mounts, gaskets and internal wear. Final price after inspection.', 4999, 480, 'inspection', ALL, false, ['Detailed inspection', 'Repair estimate approval', 'Repair and test drive']],
      ['Cooling System and Radiator Repair', 'Fix overheating, coolant leaks and radiator problems to protect your engine.', 1499, 120, 'inspection', ALL, false, ['Pressure test', 'Radiator and hose check', 'Coolant flush if required', 'Thermostat check']],
      ['Clutch Inspection and Replacement', 'Diagnose slipping, hard or noisy clutches and replace the clutch kit when worn.', 1499, 300, 'inspection', ALL, false, ['Clutch play and slip test', 'Clutch kit replacement (if approved)', 'Road test']],
      ['Transmission Inspection and Repair', 'Manual and automatic transmission diagnosis covering shifting, noises and leaks.', 1999, 240, 'inspection', FOUR, false, ['Gear shift diagnosis', 'Transmission oil check', 'Leak inspection', 'Repair estimate']],
      ['Fuel System Maintenance', 'Clean injectors and throttle body, and check the fuel delivery system for smoother running.', 1799, 90, 'direct', ALL, false, ['Throttle body cleaning', 'Fuel injector cleaning', 'Fuel filter check']],
      ['Exhaust System Inspection and Repair', 'Inspect and repair exhaust leaks, damaged silencers and loose mountings.', 799, 90, 'inspection', ALL, false, ['Exhaust leak check', 'Mounting inspection', 'Silencer check']],
      ['Belt and Hose Replacement', 'Replace cracked or worn drive belts and hoses before they fail on the road.', 1299, 120, 'inspection', ALL, false, ['Belt tension and wear check', 'Hose condition check', 'Replacement of approved parts']],
    ],
  },
  'Brake Services': {
    icon: 'disc',
    benefits: ['Safer, shorter stopping', 'Quieter braking', 'Genuine or OEM-equivalent parts'],
    exclusions: ['Brake parts are charged separately unless stated', 'Hydraulic unit repairs'],
    rows: [
      ['Brake Inspection', 'Check pads, discs, drums, fluid and lines for wear and leaks.', 399, 45, 'direct', ALL, true, ['Pad and shoe thickness check', 'Disc and drum check', 'Brake fluid check', 'Test drive']],
      ['Brake Pad Replacement', 'Replace worn front or rear brake pads and clean the caliper assembly.', 1999, 90, 'direct', ALL, true, ['Old pad removal', 'Caliper cleaning and lubrication', 'New pad fitment', 'Bedding-in test']],
      ['Brake Disc Inspection and Replacement', 'Measure disc thickness and run-out; resurface or replace warped and worn discs.', 2999, 120, 'inspection', ALL, false, ['Disc thickness measurement', 'Run-out check', 'Resurfacing or replacement']],
      ['Brake Fluid Replacement', 'Flush old, moisture-contaminated brake fluid and refill with fresh fluid.', 999, 60, 'direct', ALL, false, ['Complete fluid flush', 'Bleeding of all wheels', 'Pedal feel check']],
      ['ABS Diagnostics', 'Diagnose ABS warning lights, sensors and modulator faults.', 1199, 60, 'direct', ALL, false, ['ABS fault code scan', 'Wheel speed sensor check', 'Wiring check']],
    ],
  },
  'Tyre and Wheel Services': {
    icon: 'tyre',
    benefits: ['Even tyre wear', 'Better handling and comfort', 'Improved mileage'],
    exclusions: ['Tyre and tube cost is extra', 'Rim straightening by specialist vendors'],
    rows: [
      ['Tyre Inspection and Replacement', 'Inspect tread depth, sidewalls and age; replace tyres with the right size and load rating.', 499, 60, 'direct', ALL, false, ['Tread depth check', 'Sidewall inspection', 'Tyre fitment (tyre cost extra)', 'Pressure setting']],
      ['Wheel Balancing', 'Computerised wheel balancing to remove vibrations at speed.', 599, 45, 'direct', ALL, true, ['Computerised balancing', 'Weights fitment', 'Pressure check']],
      ['Wheel Alignment', 'Computerised wheel alignment to correct pulling and uneven tyre wear.', 899, 60, 'direct', FOUR, true, ['Alignment check', 'Camber, caster and toe adjustment', 'Print-out where supported']],
      ['Puncture Repair', 'Tubeless or tube puncture repair with leak check.', 199, 30, 'direct', ALL, false, ['Puncture location', 'Plug or patch repair', 'Leak test']],
      ['Tyre Rotation', 'Rotate tyres to equalise wear and extend tyre life.', 399, 30, 'direct', FOUR, false, ['Tyre rotation', 'Pressure setting', 'Wheel nut torque check']],
      ['Wheel and Rim Inspection', 'Check rims for bends, cracks and corrosion.', 299, 30, 'direct', ALL, false, ['Rim run-out check', 'Crack and corrosion check', 'Report']],
    ],
  },
  'Battery and Electrical Services': {
    icon: 'battery',
    benefits: ['Reliable starting', 'Fewer electrical surprises', 'Accurate diagnosis'],
    exclusions: ['Battery and electrical parts cost extra', 'Aftermarket wiring rectification is quoted separately'],
    rows: [
      ['Battery Health Check', 'Test battery voltage, cranking ability and charging system.', 199, 20, 'direct', ALL, true, ['Battery load test', 'Terminal cleaning', 'Charging voltage check']],
      ['Battery Replacement', 'Supply-and-fit or fit-only battery replacement with old battery disposal.', 499, 30, 'direct', ALL, false, ['Old battery removal', 'New battery fitment (battery cost extra)', 'Terminal protection']],
      ['Alternator Inspection', 'Check alternator output and belt condition when batteries keep draining.', 599, 45, 'direct', ALL, false, ['Output test', 'Belt check', 'Wiring check']],
      ['Starter Motor Inspection', 'Diagnose clicking or slow cranking and inspect the starter motor and relay.', 699, 60, 'inspection', ALL, false, ['Cranking test', 'Starter relay check', 'Repair estimate']],
      ['Lighting Repairs', 'Repair or replace headlamps, tail lamps, indicators and interior lights.', 299, 45, 'direct', ALL, false, ['Bulb and fuse check', 'Lamp replacement (parts extra)', 'Headlamp aim check']],
      ['Electrical System Diagnostics', 'Trace faults in power windows, central locking, gauges and other circuits.', 999, 90, 'inspection', ALL, false, ['Circuit diagnosis', 'Fuse and relay check', 'Fault report']],
      ['Wiring Inspection', 'Inspect harnesses for damage, rodent bites and unsafe aftermarket wiring.', 799, 60, 'inspection', ALL, false, ['Harness visual inspection', 'Rodent damage check', 'Safety report']],
    ],
  },
  'Air Conditioning': {
    icon: 'snow',
    benefits: ['Faster, stronger cooling', 'Fresher cabin air', 'Protects the compressor'],
    exclusions: ['Compressor and major AC parts are quoted separately'],
    rows: [
      ['AC Inspection', 'Check vent temperature, pressures, belt and condenser condition.', 499, 45, 'direct', FOUR, false, ['Vent temperature test', 'Pressure check', 'Condenser inspection']],
      ['AC Gas Refill', 'Evacuate and recharge refrigerant to the specified quantity.', 1999, 90, 'direct', FOUR, true, ['Vacuum test', 'Refrigerant recharge', 'Cooling performance test']],
      ['AC Leak Detection', 'Find refrigerant leaks using UV dye or electronic detection.', 999, 60, 'direct', FOUR, false, ['Leak detection', 'Seal and hose inspection', 'Repair estimate']],
      ['Compressor Inspection', 'Diagnose compressor noise, clutch and cooling issues.', 899, 60, 'inspection', FOUR, false, ['Compressor clutch check', 'Noise diagnosis', 'Repair estimate']],
      ['Cabin Cooling System Maintenance', 'Clean evaporator and vents for better cooling and fresher air.', 1499, 90, 'direct', FOUR, false, ['Evaporator foam cleaning', 'Vent disinfection', 'Cabin filter check']],
    ],
  },
  'Cleaning and Detailing': {
    icon: 'sparkle',
    benefits: ['Showroom-like finish', 'Protects paint and interiors', 'Higher resale value'],
    exclusions: ['Removal of permanent stains or paint defects is not guaranteed'],
    rows: [
      ['Exterior Wash', 'Foam wash, rinse and hand dry with tyre dressing.', 399, 45, 'direct', ALL, true, ['Foam wash', 'Hand dry', 'Tyre dressing']],
      ['Interior Cleaning', 'Vacuuming, dashboard wipe-down and glass cleaning.', 699, 60, 'direct', FOUR, false, ['Vacuuming', 'Dashboard cleaning', 'Glass cleaning']],
      ['Full Vehicle Detailing', 'Complete interior and exterior detailing for a near-showroom finish.', 3999, 300, 'direct', ALL, true, ['Exterior decontamination', 'Machine polish', 'Interior deep clean', 'Protective dressing']],
      ['Interior Deep Cleaning', 'Shampooing of seats, carpets and roof liner with stain treatment.', 2499, 240, 'direct', FOUR, false, ['Seat and carpet shampoo', 'Roof liner cleaning', 'Odour treatment']],
      ['Polishing and Waxing', 'Machine polishing to reduce swirl marks, finished with protective wax.', 1999, 180, 'direct', ALL, false, ['Paint decontamination', 'Machine polishing', 'Wax protection']],
      ['Paint Protection Services', 'Ceramic coating or paint protection film consultation and application.', 9999, 480, 'inspection', CAR_BIKE, false, ['Paint condition assessment', 'Surface preparation', 'Coating application']],
    ],
  },
  'Bodywork and Exterior Repairs': {
    icon: 'car',
    benefits: ['Colour-matched finish', 'Restored looks and value', 'Workmanship you can inspect'],
    exclusions: ['Final price depends on damage assessment', 'Insurance approvals are handled separately'],
    rows: [
      ['Dent Repair', 'Paintless dent removal or conventional repair depending on damage.', 1499, 180, 'inspection', ALL, false, ['Damage assessment', 'Dent removal', 'Finish check']],
      ['Scratch Removal', 'Polish-out of light scratches or touch-up of deeper ones.', 999, 120, 'inspection', ALL, false, ['Scratch depth check', 'Polish or touch-up', 'Finish check']],
      ['Paint Repair', 'Panel painting with computerised colour matching.', 2999, 1440, 'inspection', ALL, false, ['Panel preparation', 'Colour matching', 'Paint and clear coat']],
      ['Bumper Repair', 'Repair cracked or misaligned bumpers, or replace when beyond repair.', 1999, 240, 'inspection', FOUR, false, ['Bumper assessment', 'Plastic welding or replacement', 'Painting if required']],
      ['Windshield Inspection and Replacement', 'Inspect chips and cracks; repair or replace the windshield.', 999, 180, 'inspection', FOUR, false, ['Chip and crack assessment', 'Repair or replacement (glass extra)', 'Seal check']],
      ['Mirror and Glass Replacement', 'Replace damaged side mirrors, door glass and quarter glass.', 799, 120, 'inspection', FOUR, false, ['Damage assessment', 'Glass or mirror replacement (parts extra)', 'Function check']],
    ],
  },
  'Inspection and Diagnostics': {
    icon: 'scan',
    benefits: ['Clear, written findings', 'Buy and travel with confidence', 'Prioritised repair list'],
    exclusions: ['Repairs are quoted separately', 'Inspection is not a guarantee against future faults'],
    rows: [
      ['Computerised Vehicle Diagnostics', 'Full scan of electronic control units with a written fault report.', 999, 60, 'direct', ALL, true, ['ECU scan where supported', 'Live data review', 'Fault report']],
      ['Pre-Purchase Inspection', 'Independent check of a used vehicle before you buy it.', 1999, 120, 'direct', ALL, false, ['Body and paint check', 'Engine and transmission check', 'Road test', 'Written report']],
      ['Pre-Trip Inspection', 'Get road-trip ready with checks on tyres, brakes, fluids and lights.', 699, 60, 'direct', ALL, false, ['Tyre and spare check', 'Brake check', 'Fluid levels', 'Lights and wipers']],
      ['Comprehensive Vehicle Health Check', 'A 75-point health check with photos and a prioritised recommendations list.', 1499, 90, 'direct', ALL, true, ['75-point checklist', 'Battery test', 'Underbody inspection', 'Recommendations report']],
      ['Roadworthiness Inspection', 'Check safety-critical items before a fitness test or long use.', 999, 60, 'direct', ALL, false, ['Brakes and steering', 'Lights and signals', 'Emissions-related checks', 'Report']],
    ],
  },
  'Additional Services': {
    icon: 'plus',
    benefits: ['Convenience', 'Single point of contact', 'Transparent confirmation'],
    exclusions: ['Subject to availability and confirmation', 'Third-party charges where applicable'],
    rows: [
      ['Pickup and Drop-Off Request', 'Request vehicle pickup from and drop-off to your address. Subject to availability and confirmation.', 299, 30, 'request', ALL, false, ['Pickup scheduling', 'Vehicle condition note at pickup', 'Drop-off after service']],
      ['Roadside Assistance Request', 'Request help for minor on-road issues. Our team calls back to confirm availability; this is not an emergency service.', 999, 60, 'request', ALL, false, ['Call-back from advisor', 'On-site help where available', 'Towing arranged via partners (extra)']],
      ['Emergency Breakdown Assistance Request', 'Breakdown help request handled by staff or a partner. For emergencies involving injury, call local emergency services first.', 1499, 60, 'request', ALL, false, ['Priority call-back', 'Partner towing coordination', 'Workshop intake']],
      ['Vehicle Accessory Installation', 'Installation of accessories such as cameras, lights, music systems and seat covers.', 499, 90, 'inspection', ALL, false, ['Fitment consultation', 'Installation', 'Function test']],
      ['Fleet Maintenance Enquiry', 'Enquire about maintenance plans for company or delivery fleets.', 0, 30, 'request', ALL, false, ['Requirement discussion', 'Custom quotation', 'Scheduling plan']],
      ['Insurance Repair Enquiry', 'Get help with accident repairs and coordination with your insurer. Claim approval is decided by the insurer.', 0, 30, 'request', ALL, false, ['Damage assessment', 'Estimate for insurer', 'Claim documentation help']],
    ],
  },
};

const MODE_FAQ = {
  direct: { q: 'Is the price fixed?', a: 'The price shown is a sample starting estimate. Any extra work or parts found necessary are quoted and done only after your approval.' },
  inspection: { q: 'Why is a workshop inspection required?', a: 'The final price depends on the condition of your vehicle. We inspect first, share an estimate and start work only after your approval.' },
  request: { q: 'Is my request confirmed immediately?', a: 'No. This is a request. Our team or partner will contact you to confirm availability, timing and any charges.' },
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buildCatalog() {
  const out = [];
  let n = 1;
  for (const [category, def] of Object.entries(categories)) {
    for (const [name, description, priceFrom, durationMinutes, bookingMode, vehicleTypes, popular, inclusions] of def.rows) {
      const now = new Date().toISOString();
      out.push({
        id: `svc_${String(n).padStart(3, '0')}`,
        slug: slugify(name),
        name,
        category,
        description,
        icon: def.icon,
        priceFrom,
        priceIsSampleEstimate: true,
        durationMinutes,
        benefits: def.benefits,
        inclusions,
        exclusions: def.exclusions,
        vehicleTypes,
        bookingMode,
        available: true,
        popular,
        faqs: [MODE_FAQ[bookingMode], { q: 'How long does it take?', a: `Typically around ${durationMinutes >= 60 ? `${Math.round((durationMinutes / 60) * 10) / 10} hour(s)` : `${durationMinutes} minutes`}, depending on vehicle condition and workshop load.` }],
        createdAt: now,
        updatedAt: now,
      });
      n += 1;
    }
  }
  return out;
}

module.exports = { buildCatalog };
