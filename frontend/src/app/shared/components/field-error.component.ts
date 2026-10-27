import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

const MESSAGES: Record<string, (e: any, label: string) => string> = {
  required: (_e, l) => `${l} is required`,
  requiredTrue: () => 'Please tick this box to continue',
  email: () => 'Enter a valid email address',
  minlength: (e, l) => `${l} must be at least ${e.requiredLength} characters`,
  maxlength: (e, l) => `${l} must be at most ${e.requiredLength} characters`,
  min: (e, l) => `${l} must be at least ${e.min}`,
  max: (e, l) => `${l} must be at most ${e.max}`,
  pattern: (_e, l) => `${l} has an invalid format`,
  phone: () => 'Enter a valid 10-digit Indian mobile number',
  passwordStrength: (e) => String(e),
  mismatch: () => 'Passwords do not match',
  registration: (e) => String(e),
  server: (e) => String(e),
};

/** Shows the first validation error of a control once it has been touched (default change detection). */
@Component({
  selector: 'app-field-error',
  standalone: true,
  template: `@if (message(); as m) { <span class="field-error" role="alert">{{ m }}</span> }`,
})
export class FieldErrorComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input('This field');

  message(): string | null {
    const c = this.control();
    if (!c || !c.errors || !(c.touched || c.dirty)) return null;
    const [key, val] = Object.entries(c.errors)[0];
    const fn = MESSAGES[key];
    return fn ? fn(val, this.label()) : `${this.label()} is invalid`;
  }
}
