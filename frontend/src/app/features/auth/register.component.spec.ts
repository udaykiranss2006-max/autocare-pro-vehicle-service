import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [RegisterComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }));
  it('is invalid when empty and does not submit', () => {
    const c = TestBed.createComponent(RegisterComponent).componentInstance;
    c.submit();
    expect(c.form.invalid).toBeTrue();
    expect(c.submitting()).toBeFalse();
  });
  it('becomes valid with correct data', () => {
    const c = TestBed.createComponent(RegisterComponent).componentInstance;
    c.form.setValue({ fullName: 'Asha Rao', email: 'asha@example.com', phone: '9876543210', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass', address: '', acceptTerms: true });
    expect(c.form.valid).toBeTrue();
  });
});
