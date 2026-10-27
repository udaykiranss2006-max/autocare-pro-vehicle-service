import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RegPattern } from '../../core/models/models';

/** Mirrors the backend rule: 8+ chars with upper, lower, digit and symbol (max 72 bytes for bcrypt). */
export const passwordStrength: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  if (!v) return null;
  if (v.length < 8) return { passwordStrength: 'Password must be at least 8 characters' };
  if (new TextEncoder().encode(v).length > 72) return { passwordStrength: 'Password is too long' };
  if (!/[a-z]/.test(v) || !/[A-Z]/.test(v) || !/\d/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
    return { passwordStrength: 'Use upper-case, lower-case, a number and a symbol' };
  }
  return null;
};

export function passwordScore(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(4, Math.max(0, s - 1));
}

/** Group validator: sets { mismatch } on the confirm control when values differ. */
export function matchFields(field: string, confirm: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field);
    const b = group.get(confirm);
    if (!a || !b) return null;
    const errors = { ...(b.errors || {}) };
    if (b.value && a.value !== b.value) {
      b.setErrors({ ...errors, mismatch: true });
      return { mismatch: true };
    }
    if (errors['mismatch']) {
      delete errors['mismatch'];
      b.setErrors(Object.keys(errors).length ? errors : null);
    }
    return null;
  };
}

export const indianPhone: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').replace(/[\s\-()]/g, '');
  if (!v) return null;
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(v) ? null : { phone: true };
};

export function normalizeRegistration(v: string): string {
  return String(v ?? '').toUpperCase().replace(/[\s\-.]/g, '');
}

/** Configurable Indian registration-number validator (patterns come from the backend settings). */
export function registrationNumber(getPatterns: () => RegPattern[] | null): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = normalizeRegistration(c.value);
    if (!v) return null;
    const patterns = getPatterns();
    if (!patterns || patterns.length === 0) return null;
    const ok = patterns.some((p) => {
      try {
        return new RegExp(p.regex).test(v);
      } catch {
        return false;
      }
    });
    return ok ? null : { registration: `Use a valid format: ${patterns.map((p) => p.name).join(' / ')}` };
  };
}
