import { FormControl, FormGroup } from '@angular/forms';
import { indianPhone, matchFields, passwordStrength, registrationNumber } from './validators';

describe('custom validators', () => {
  it('passwordStrength rejects weak and accepts strong passwords', () => {
    expect(passwordStrength(new FormControl('weak'))).toBeTruthy();
    expect(passwordStrength(new FormControl('Str0ng!Pass'))).toBeNull();
  });
  it('indianPhone accepts 10-digit mobiles with optional +91', () => {
    expect(indianPhone(new FormControl('98765 43210'))).toBeNull();
    expect(indianPhone(new FormControl('+919876543210'))).toBeNull();
    expect(indianPhone(new FormControl('12345'))).toEqual({ phone: true });
  });
  it('matchFields flags mismatching confirmation', () => {
    const g = new FormGroup({ a: new FormControl('x'), b: new FormControl('y') }, { validators: [matchFields('a', 'b')] });
    expect(g.get('b')?.errors?.['mismatch']).toBeTrue();
    g.get('b')?.setValue('x');
    expect(g.get('b')?.errors).toBeNull();
  });
  it('registrationNumber uses configured patterns', () => {
    const v = registrationNumber(() => [{ name: 'Std', regex: '^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$' }]);
    expect(v(new FormControl('ts 09 ea 1234'))).toBeNull();
    expect(v(new FormControl('BAD'))).toBeTruthy();
  });
});
