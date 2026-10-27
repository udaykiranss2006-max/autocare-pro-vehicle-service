import { Pipe, PipeTransform } from '@angular/core';
import { AppointmentStatus, BOOKING_MODE_LABELS, BookingMode, STATUS_LABELS, VEHICLE_TYPE_LABELS, VehicleType } from '../../core/models/models';
import { formatDate } from '../../core/utils/date';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₹1,23,456 formatting (Indian digit grouping). */
@Pipe({ name: 'inr', standalone: true })
export class InrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return inr.format(Number(value));
  }
}

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: AppointmentStatus | string | null | undefined): string {
    return value ? STATUS_LABELS[value as AppointmentStatus] ?? value : '-';
  }
}

@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (!minutes && minutes !== 0) return '-';
    if (minutes < 60) return `${minutes} min`;
    if (minutes >= 1440) {
      const days = Math.round((minutes / 1440) * 10) / 10;
      return `${days} day${days === 1 ? '' : 's'}`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
}

@Pipe({ name: 'vehicleType', standalone: true })
export class VehicleTypePipe implements PipeTransform {
  transform(value: VehicleType | string | null | undefined): string {
    return value ? VEHICLE_TYPE_LABELS[value as VehicleType] ?? value : '-';
  }
}

@Pipe({ name: 'bookingMode', standalone: true })
export class BookingModePipe implements PipeTransform {
  transform(value: BookingMode | string): string {
    return BOOKING_MODE_LABELS[value as BookingMode] ?? value;
  }
}

/** Formats YYYY-MM-DD (or ISO) as e.g. 27 Oct 2026 without timezone shifts. */
@Pipe({ name: 'day', standalone: true })
export class DayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDate(value);
  }
}

@Pipe({ name: 'dateTime', standalone: true })
export class DateTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }
}

@Pipe({ name: 'paymentStatus', standalone: true })
export class PaymentStatusPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const map: Record<string, string> = { unpaid: 'Unpaid', partially_paid: 'Partially paid', paid: 'Paid (recorded)', paid_demo: 'Paid - DEMO only' };
    return value ? map[value] ?? value : '-';
  }
}

export const SHARED_PIPES = [InrPipe, StatusLabelPipe, DurationPipe, VehicleTypePipe, BookingModePipe, DayPipe, DateTimePipe, PaymentStatusPipe] as const;
